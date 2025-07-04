-- Fix for relations disappearing in admin dashboard
-- This migration corrects the SQL error in the get_persistent_relations function

-- Improved function to get persistent relations without GROUP BY error
CREATE OR REPLACE FUNCTION get_persistent_relations()
RETURNS JSONB AS $$
DECLARE
  relations JSONB;
BEGIN
  -- Exécuter la vérification de cohérence
  PERFORM ensure_relation_consistency();
  
  -- Récupérer les relations avec les détails sans utiliser ORDER BY dans le jsonb_agg
  WITH relation_data AS (
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
      parent.nom_apprenant as parent_nom,
      parent.prenoms_apprenant as parent_prenoms,
      parent.email as parent_email,
      parent.commune_apprenant as parent_commune,
      parent.classe_apprenant as parent_classe,
      parent.besoins as parent_besoins,
      encadreur.nom as encadreur_nom,
      encadreur.prenoms as encadreur_prenoms,
      encadreur.email as encadreur_email,
      encadreur.commune_intervention as encadreur_commune,
      encadreur.disciplines as encadreur_disciplines
    FROM 
      approved_relations ar
    JOIN 
      users parent ON ar.parent_eleve_id = parent.id
    JOIN 
      users encadreur ON ar.encadreur_id = encadreur.id
    ORDER BY 
      ar.approved_at DESC
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', rd.id,
        'parentEleveId', rd.parent_eleve_id,
        'encadreurId', rd.encadreur_id,
        'approvedAt', rd.approved_at,
        'approvedBy', rd.approved_by,
        'dissociatedAt', rd.dissociated_at,
        'dissociatedBy', rd.dissociated_by,
        'compatibilityScore', rd.compatibility_score,
        'criteria', rd.criteria,
        'status', rd.status,
        'parent', jsonb_build_object(
          'id', rd.parent_eleve_id,
          'nom', rd.parent_nom,
          'prenoms', rd.parent_prenoms,
          'email', rd.parent_email,
          'commune', rd.parent_commune,
          'classe', rd.parent_classe,
          'besoins', rd.parent_besoins
        ),
        'encadreur', jsonb_build_object(
          'id', rd.encadreur_id,
          'nom', rd.encadreur_nom,
          'prenoms', rd.encadreur_prenoms,
          'email', rd.encadreur_email,
          'commune', rd.encadreur_commune,
          'disciplines', rd.encadreur_disciplines
        )
      )
    ) INTO relations
  FROM 
    relation_data rd;
  
  RETURN COALESCE(relations, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Improved function to get persistent assignments without GROUP BY error
CREATE OR REPLACE FUNCTION get_persistent_assignments()
RETURNS JSONB AS $$
DECLARE
  assignments JSONB;
BEGIN
  -- Exécuter la vérification de cohérence
  PERFORM ensure_relation_consistency();
  
  -- Récupérer les assignations avec les détails sans utiliser ORDER BY dans le jsonb_agg
  WITH assignment_data AS (
    SELECT 
      a.id,
      a.parent_eleve_id,
      a.encadreur_id,
      a.compatibility_score,
      a.criteria,
      a.assigned_by,
      a.assigned_at,
      a.status,
      parent.nom_apprenant as parent_nom,
      parent.prenoms_apprenant as parent_prenoms,
      parent.email as parent_email,
      parent.commune_apprenant as parent_commune,
      parent.classe_apprenant as parent_classe,
      parent.besoins as parent_besoins,
      encadreur.nom as encadreur_nom,
      encadreur.prenoms as encadreur_prenoms,
      encadreur.email as encadreur_email,
      encadreur.commune_intervention as encadreur_commune,
      encadreur.disciplines as encadreur_disciplines,
      admin.nom as admin_nom,
      admin.prenoms as admin_prenoms,
      admin.email as admin_email
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
      a.assigned_at DESC
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', ad.id,
        'parentEleveId', ad.parent_eleve_id,
        'encadreurId', ad.encadreur_id,
        'compatibilityScore', ad.compatibility_score,
        'criteria', ad.criteria,
        'assignedBy', ad.assigned_by,
        'assignedAt', ad.assigned_at,
        'status', ad.status,
        'parent', jsonb_build_object(
          'id', ad.parent_eleve_id,
          'nom', ad.parent_nom,
          'prenoms', ad.parent_prenoms,
          'email', ad.parent_email,
          'commune', ad.parent_commune,
          'classe', ad.parent_classe,
          'besoins', ad.parent_besoins
        ),
        'encadreur', jsonb_build_object(
          'id', ad.encadreur_id,
          'nom', ad.encadreur_nom,
          'prenoms', ad.encadreur_prenoms,
          'email', ad.encadreur_email,
          'commune', ad.encadreur_commune,
          'disciplines', ad.encadreur_disciplines
        ),
        'admin', jsonb_build_object(
          'id', ad.assigned_by,
          'nom', ad.admin_nom,
          'prenoms', ad.admin_prenoms,
          'email', ad.admin_email
        )
      )
    ) INTO assignments
  FROM 
    assignment_data ad;
  
  RETURN COALESCE(assignments, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Run the consistency check to ensure data integrity
SELECT ensure_relation_consistency();