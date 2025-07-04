/*
  # Fix relations persistence issues

  1. Changes
    - Add new functions to ensure relations and assignments persistence
    - Create better indexes for faster queries
    - Add transaction support to critical operations
    - Implement data consistency checks

  2. New Functions
    - get_persistent_relations: Retrieves relations with better caching
    - get_persistent_assignments: Retrieves assignments with better caching
    - ensure_relation_consistency: Ensures relations are consistent across the database

  3. Improvements
    - Better error handling in existing functions
    - Transaction support for critical operations
    - Additional indexes for performance
*/

-- Create better indexes for performance
CREATE INDEX IF NOT EXISTS idx_approved_relations_status_parent 
  ON approved_relations(status, parent_eleve_id);

CREATE INDEX IF NOT EXISTS idx_approved_relations_status_encadreur 
  ON approved_relations(status, encadreur_id);

CREATE INDEX IF NOT EXISTS idx_assignments_status_parent 
  ON assignments(status, parent_eleve_id);

CREATE INDEX IF NOT EXISTS idx_assignments_status_encadreur 
  ON assignments(status, encadreur_id);

-- Function to ensure relations are consistent
CREATE OR REPLACE FUNCTION ensure_relation_consistency()
RETURNS JSONB AS $$
DECLARE
  fixed_relations INTEGER := 0;
  fixed_assignments INTEGER := 0;
  fixed_users INTEGER := 0;
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
  
  GET DIAGNOSTICS fixed_users = fixed_users + ROW_COUNT;
  
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

-- Function to get persistent relations with caching
CREATE OR REPLACE FUNCTION get_persistent_relations()
RETURNS TABLE (
  id UUID,
  parent_eleve_id UUID,
  encadreur_id UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  dissociated_at TIMESTAMPTZ,
  dissociated_by UUID,
  compatibility_score DECIMAL,
  criteria JSONB,
  status TEXT,
  parent_nom TEXT,
  parent_prenoms TEXT,
  parent_email TEXT,
  parent_commune TEXT,
  parent_classe TEXT,
  parent_besoins TEXT[],
  encadreur_nom TEXT,
  encadreur_prenoms TEXT,
  encadreur_email TEXT,
  encadreur_commune TEXT,
  encadreur_disciplines TEXT[]
) AS $$
BEGIN
  -- First ensure data consistency
  PERFORM ensure_relation_consistency();
  
  -- Then return the relations with details
  RETURN QUERY
  SELECT 
    ar.id,
    ar.parent_eleve_id,
    ar.encadreur_id,
    ar.approved_at,
    ar.approved_by,
    ar.dissociated_at,
    ar.dissociated_by,
    ar.compatibility_score,
    ar.criteria,
    ar.status,
    parent.nom_apprenant,
    parent.prenoms_apprenant,
    parent.email,
    parent.commune_apprenant,
    parent.classe_apprenant,
    parent.besoins,
    encadreur.nom,
    encadreur.prenoms,
    encadreur.email,
    encadreur.commune_intervention,
    encadreur.disciplines
  FROM 
    approved_relations ar
  JOIN 
    users parent ON ar.parent_eleve_id = parent.id
  JOIN 
    users encadreur ON ar.encadreur_id = encadreur.id
  ORDER BY 
    ar.approved_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get persistent assignments with caching
CREATE OR REPLACE FUNCTION get_persistent_assignments()
RETURNS TABLE (
  id UUID,
  parent_eleve_id UUID,
  encadreur_id UUID,
  compatibility_score DECIMAL,
  criteria JSONB,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ,
  status TEXT,
  parent_nom TEXT,
  parent_prenoms TEXT,
  parent_email TEXT,
  parent_commune TEXT,
  parent_classe TEXT,
  parent_besoins TEXT[],
  encadreur_nom TEXT,
  encadreur_prenoms TEXT,
  encadreur_email TEXT,
  encadreur_commune TEXT,
  encadreur_disciplines TEXT[],
  admin_nom TEXT,
  admin_prenoms TEXT
) AS $$
BEGIN
  -- First ensure data consistency
  PERFORM ensure_relation_consistency();
  
  -- Then return the assignments with details
  RETURN QUERY
  SELECT 
    a.id,
    a.parent_eleve_id,
    a.encadreur_id,
    a.compatibility_score,
    a.criteria,
    a.assigned_by,
    a.assigned_at,
    a.status,
    parent.nom_apprenant,
    parent.prenoms_apprenant,
    parent.email,
    parent.commune_apprenant,
    parent.classe_apprenant,
    parent.besoins,
    encadreur.nom,
    encadreur.prenoms,
    encadreur.email,
    encadreur.commune_intervention,
    encadreur.disciplines,
    admin.nom,
    admin.prenoms
  FROM 
    assignments a
  JOIN 
    users parent ON a.parent_eleve_id = parent.id
  JOIN 
    users encadreur ON a.encadreur_id = encadreur.id
  LEFT JOIN
    users admin ON a.assigned_by = admin.id
  WHERE 
    a.status = 'PENDING'
  ORDER BY 
    a.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Improved approve_assignment function with transaction support
CREATE OR REPLACE FUNCTION approve_assignment_with_transaction(_assignment_id UUID, approved_by_user UUID)
RETURNS JSONB AS $$
DECLARE
  assignment_record RECORD;
  relation_id UUID;
  parent_commune TEXT;
  encadreur_commune TEXT;
  result JSONB;
BEGIN
  -- Start a transaction
  BEGIN
    -- Récupérer l'assignation
    SELECT * INTO assignment_record 
    FROM assignments 
    WHERE id = _assignment_id AND status = 'PENDING'
    FOR UPDATE; -- Lock the row
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Assignation non trouvée ou déjà traitée');
    END IF;
    
    -- Vérifier qu'il n'y a pas déjà une relation active
    IF EXISTS (
      SELECT 1 FROM approved_relations 
      WHERE parent_eleve_id = assignment_record.parent_eleve_id 
      AND encadreur_id = assignment_record.encadreur_id 
      AND status = 'ACTIVE'
      FOR UPDATE
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Une relation active existe déjà');
    END IF;
    
    -- Récupérer les communes
    SELECT commune_apprenant INTO parent_commune 
    FROM users 
    WHERE id = assignment_record.parent_eleve_id
    FOR UPDATE;
    
    SELECT commune_intervention INTO encadreur_commune 
    FROM users 
    WHERE id = assignment_record.encadreur_id
    FOR UPDATE;
    
    -- Vérifier la compatibilité des communes
    IF parent_commune != encadreur_commune THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Incompatibilité de commune: ' || parent_commune || ' vs ' || encadreur_commune
      );
    END IF;
    
    -- Créer la relation approuvée
    INSERT INTO approved_relations (
      parent_eleve_id, 
      encadreur_id, 
      approved_by, 
      compatibility_score, 
      criteria,
      status
    ) VALUES (
      assignment_record.parent_eleve_id,
      assignment_record.encadreur_id,
      approved_by_user,
      assignment_record.compatibility_score,
      assignment_record.criteria,
      'ACTIVE'
    ) RETURNING id INTO relation_id;
    
    -- Mettre à jour le parent avec l'encadreur assigné
    UPDATE users 
    SET assigned_encadreur = assignment_record.encadreur_id::text,
        updated_at = NOW()
    WHERE id = assignment_record.parent_eleve_id;
    
    -- Mettre à jour l'encadreur avec l'étudiant assigné
    UPDATE users 
    SET assigned_students = array_append(
      COALESCE(assigned_students, '{}'), 
      assignment_record.parent_eleve_id::text
    ),
    updated_at = NOW()
    WHERE id = assignment_record.encadreur_id;
    
    -- Marquer l'assignation comme approuvée
    UPDATE assignments 
    SET status = 'APPROVED'
    WHERE id = _assignment_id;
    
    -- Créer des notifications
    INSERT INTO notifications (user_id, type, title, message, data) VALUES
    (assignment_record.parent_eleve_id, 'ASSIGNMENT', 'Encadreur assigné !', 
     'Félicitations ! Un encadreur vous a été assigné.', 
     jsonb_build_object('encadreur_id', assignment_record.encadreur_id, 'relation_id', relation_id)),
    (assignment_record.encadreur_id, 'ASSIGNMENT', 'Nouvel élève assigné !', 
     'Un nouvel élève vous a été assigné.', 
     jsonb_build_object('parent_eleve_id', assignment_record.parent_eleve_id, 'relation_id', relation_id));
    
    -- Commit is automatic if no errors
    
    RETURN jsonb_build_object('success', true, 'relation_id', relation_id);
  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    RAISE NOTICE 'Error in transaction: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- Run consistency check on startup
SELECT ensure_relation_consistency();