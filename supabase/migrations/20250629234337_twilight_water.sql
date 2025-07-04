-- Correction de l'erreur SQL dans la migration précédente
-- Cette migration corrige l'erreur: "unrecognized GET DIAGNOSTICS item at or near 'fixed_users'"

-- Fonction pour vérifier et réparer les relations incohérentes (version corrigée)
CREATE OR REPLACE FUNCTION check_and_repair_relations()
RETURNS JSONB AS $$
DECLARE
  fixed_count INTEGER := 0;
  orphaned_count INTEGER := 0;
  inconsistent_count INTEGER := 0;
  temp_count INTEGER := 0;
BEGIN
  -- 1. Réparer les relations où le parent n'a pas l'encadreur assigné correctement
  WITH inconsistent_parents AS (
    SELECT 
      ar.id as relation_id,
      ar.parent_eleve_id,
      ar.encadreur_id,
      u.assigned_encadreur
    FROM 
      approved_relations ar
    JOIN 
      users u ON ar.parent_eleve_id = u.id
    WHERE 
      ar.status = 'ACTIVE'
      AND (u.assigned_encadreur IS NULL OR u.assigned_encadreur != ar.encadreur_id::text)
  )
  UPDATE users u
  SET 
    assigned_encadreur = ip.encadreur_id::text,
    updated_at = NOW()
  FROM 
    inconsistent_parents ip
  WHERE 
    u.id = ip.parent_eleve_id;
  
  GET DIAGNOSTICS inconsistent_count = ROW_COUNT;
  fixed_count := fixed_count + inconsistent_count;
  
  -- 2. Réparer les relations où l'encadreur n'a pas l'élève dans sa liste
  WITH inconsistent_encadreurs AS (
    SELECT 
      ar.id as relation_id,
      ar.parent_eleve_id,
      ar.encadreur_id,
      u.assigned_students
    FROM 
      approved_relations ar
    JOIN 
      users u ON ar.encadreur_id = u.id
    WHERE 
      ar.status = 'ACTIVE'
      AND (u.assigned_students IS NULL OR NOT (ar.parent_eleve_id::text = ANY(u.assigned_students)))
  )
  UPDATE users u
  SET 
    assigned_students = CASE 
      WHEN u.assigned_students IS NULL THEN ARRAY[ie.parent_eleve_id::text]
      ELSE array_append(u.assigned_students, ie.parent_eleve_id::text)
    END,
    updated_at = NOW()
  FROM 
    inconsistent_encadreurs ie
  WHERE 
    u.id = ie.encadreur_id;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  fixed_count := fixed_count + temp_count;
  
  -- 3. Marquer comme dissociées les relations où un utilisateur n'existe plus
  WITH orphaned_relations AS (
    SELECT ar.id
    FROM approved_relations ar
    LEFT JOIN users parent ON ar.parent_eleve_id = parent.id
    LEFT JOIN users encadreur ON ar.encadreur_id = encadreur.id
    WHERE ar.status = 'ACTIVE' AND (parent.id IS NULL OR encadreur.id IS NULL)
  )
  UPDATE approved_relations ar
  SET 
    status = 'DISSOCIATED',
    dissociated_at = NOW(),
    dissociated_by = (SELECT id FROM users WHERE role = 'ADMINISTRATEUR' LIMIT 1)
  FROM 
    orphaned_relations or_rel
  WHERE 
    ar.id = or_rel.id;
  
  GET DIAGNOSTICS orphaned_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'fixed_relations', fixed_count,
    'orphaned_relations', orphaned_count,
    'total_repairs', fixed_count + orphaned_count,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour assurer la cohérence des relations (version corrigée)
CREATE OR REPLACE FUNCTION ensure_relation_consistency()
RETURNS JSONB AS $$
DECLARE
  fixed_relations INTEGER := 0;
  fixed_assignments INTEGER := 0;
  fixed_users INTEGER := 0;
  temp_count INTEGER := 0;
BEGIN
  -- Fix relations with missing references
  WITH orphaned_relations AS (
    SELECT ar.id
    FROM approved_relations ar
    LEFT JOIN users parent ON ar.parent_eleve_id = parent.id
    LEFT JOIN users encadreur ON ar.encadreur_id = encadreur.id
    WHERE ar.status = 'ACTIVE' AND (parent.id IS NULL OR encadreur.id IS NULL)
  )
  UPDATE approved_relations ar
  SET 
    status = 'DISSOCIATED',
    dissociated_at = NOW(),
    dissociated_by = (SELECT id FROM users WHERE role = 'ADMINISTRATEUR' LIMIT 1)
  FROM 
    orphaned_relations or_rel
  WHERE 
    ar.id = or_rel.id;
  
  GET DIAGNOSTICS fixed_relations = ROW_COUNT;
  
  -- Fix assignments with missing references
  WITH orphaned_assignments AS (
    SELECT a.id
    FROM assignments a
    LEFT JOIN users parent ON a.parent_eleve_id = parent.id
    LEFT JOIN users encadreur ON a.encadreur_id = encadreur.id
    WHERE a.status = 'PENDING' AND (parent.id IS NULL OR encadreur.id IS NULL)
  )
  UPDATE assignments a
  SET 
    status = 'REJECTED'
  FROM 
    orphaned_assignments oa
  WHERE 
    a.id = oa.id;
  
  GET DIAGNOSTICS fixed_assignments = ROW_COUNT;
  
  -- Fix user references
  -- 1. Fix parent references to encadreurs
  WITH inconsistent_parents AS (
    SELECT 
      u.id,
      ar.encadreur_id
    FROM 
      users u
    JOIN 
      approved_relations ar ON u.id = ar.parent_eleve_id
    WHERE 
      ar.status = 'ACTIVE'
      AND (u.assigned_encadreur IS NULL OR u.assigned_encadreur != ar.encadreur_id::text)
  )
  UPDATE users u
  SET 
    assigned_encadreur = ip.encadreur_id::text,
    updated_at = NOW()
  FROM 
    inconsistent_parents ip
  WHERE 
    u.id = ip.id;
  
  GET DIAGNOSTICS fixed_users = ROW_COUNT;
  
  -- 2. Fix encadreur references to students
  WITH inconsistent_encadreurs AS (
    SELECT 
      u.id,
      array_agg(ar.parent_eleve_id::text) as student_ids
    FROM 
      users u
    JOIN 
      approved_relations ar ON u.id = ar.encadreur_id
    WHERE 
      ar.status = 'ACTIVE'
    GROUP BY 
      u.id
  )
  UPDATE users u
  SET 
    assigned_students = ie.student_ids,
    updated_at = NOW()
  FROM 
    inconsistent_encadreurs ie
  WHERE 
    u.id = ie.id
    AND (u.assigned_students IS NULL OR u.assigned_students <> ie.student_ids);
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  fixed_users := fixed_users + temp_count;
  
  RETURN jsonb_build_object(
    'success', true,
    'fixed_relations', fixed_relations,
    'fixed_assignments', fixed_assignments,
    'fixed_users', fixed_users,
    'total_fixes', fixed_relations + fixed_assignments + fixed_users,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour récupérer les relations persistantes
CREATE OR REPLACE FUNCTION get_persistent_relations()
RETURNS JSONB AS $$
DECLARE
  relations JSONB;
BEGIN
  -- Exécuter la vérification de cohérence
  PERFORM ensure_relation_consistency();
  
  -- Récupérer les relations avec les détails
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', ar.id,
        'parentEleveId', ar.parent_eleve_id,
        'encadreurId', ar.encadreur_id,
        'approvedAt', ar.approved_at,
        'approvedBy', ar.approved_by,
        'dissociatedAt', ar.dissociated_at,
        'dissociatedBy', ar.dissociated_by,
        'compatibilityScore', ar.compatibility_score,
        'criteria', ar.criteria,
        'status', ar.status,
        'parent', jsonb_build_object(
          'id', parent.id,
          'nom', parent.nom_apprenant,
          'prenoms', parent.prenoms_apprenant,
          'email', parent.email,
          'commune', parent.commune_apprenant,
          'classe', parent.classe_apprenant,
          'besoins', parent.besoins
        ),
        'encadreur', jsonb_build_object(
          'id', encadreur.id,
          'nom', encadreur.nom,
          'prenoms', encadreur.prenoms,
          'email', encadreur.email,
          'commune', encadreur.commune_intervention,
          'disciplines', encadreur.disciplines
        )
      ) ORDER BY ar.approved_at DESC
    ) INTO relations
  FROM 
    approved_relations ar
  JOIN 
    users parent ON ar.parent_eleve_id = parent.id
  JOIN 
    users encadreur ON ar.encadreur_id = encadreur.id;
  
  RETURN COALESCE(relations, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour récupérer les assignations persistantes
CREATE OR REPLACE FUNCTION get_persistent_assignments()
RETURNS JSONB AS $$
DECLARE
  assignments JSONB;
BEGIN
  -- Exécuter la vérification de cohérence
  PERFORM ensure_relation_consistency();
  
  -- Récupérer les assignations avec les détails
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'parentEleveId', a.parent_eleve_id,
        'encadreurId', a.encadreur_id,
        'compatibilityScore', a.compatibility_score,
        'criteria', a.criteria,
        'assignedBy', a.assigned_by,
        'assignedAt', a.assigned_at,
        'status', a.status,
        'parent', jsonb_build_object(
          'id', parent.id,
          'nom', parent.nom_apprenant,
          'prenoms', parent.prenoms_apprenant,
          'email', parent.email,
          'commune', parent.commune_apprenant,
          'classe', parent.classe_apprenant,
          'besoins', parent.besoins
        ),
        'encadreur', jsonb_build_object(
          'id', encadreur.id,
          'nom', encadreur.nom,
          'prenoms', encadreur.prenoms,
          'email', encadreur.email,
          'commune', encadreur.commune_intervention,
          'disciplines', encadreur.disciplines
        ),
        'admin', jsonb_build_object(
          'id', admin.id,
          'nom', admin.nom,
          'prenoms', admin.prenoms,
          'email', admin.email
        )
      ) ORDER BY a.assigned_at DESC
    ) INTO assignments
  FROM 
    assignments a
  JOIN 
    users parent ON a.parent_eleve_id = parent.id
  JOIN 
    users encadreur ON a.encadreur_id = encadreur.id
  LEFT JOIN
    users admin ON a.assigned_by = admin.id
  WHERE 
    a.status = 'PENDING';
  
  RETURN COALESCE(assignments, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Exécuter la vérification et réparation des relations
SELECT check_and_repair_relations();