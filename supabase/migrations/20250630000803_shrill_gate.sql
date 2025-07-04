/*
  # Fix GROUP BY error in persistent relations functions

  1. Problem
    - Error: "column "ar.approved_at" must appear in the GROUP BY clause or be used in an aggregate function"
    - This occurs in the get_persistent_relations and get_persistent_assignments functions
    - The error happens because we're trying to order results inside a jsonb_agg function

  2. Solution
    - Rewrite the functions to use a subquery with ORDER BY before the aggregation
    - Use a CTE (Common Table Expression) to order the data first
    - Then perform the jsonb_agg on the pre-ordered data
*/

-- Fix the get_persistent_relations function
CREATE OR REPLACE FUNCTION get_persistent_relations()
RETURNS JSONB AS $$
DECLARE
  relations JSONB;
BEGIN
  -- Exécuter la vérification de cohérence
  PERFORM ensure_relation_consistency();
  
  -- Utiliser une CTE pour ordonner les données d'abord
  WITH ordered_relations AS (
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
        'id', r.id,
        'parentEleveId', r.parent_eleve_id,
        'encadreurId', r.encadreur_id,
        'approvedAt', r.approved_at,
        'approvedBy', r.approved_by,
        'dissociatedAt', r.dissociated_at,
        'dissociatedBy', r.dissociated_by,
        'compatibilityScore', r.compatibility_score,
        'criteria', r.criteria,
        'status', r.status,
        'parent', jsonb_build_object(
          'id', r.parent_eleve_id,
          'nom', r.parent_nom,
          'prenoms', r.parent_prenoms,
          'email', r.parent_email,
          'commune', r.parent_commune,
          'classe', r.parent_classe,
          'besoins', r.parent_besoins
        ),
        'encadreur', jsonb_build_object(
          'id', r.encadreur_id,
          'nom', r.encadreur_nom,
          'prenoms', r.encadreur_prenoms,
          'email', r.encadreur_email,
          'commune', r.encadreur_commune,
          'disciplines', r.encadreur_disciplines
        )
      )
    ) INTO relations
  FROM 
    ordered_relations r;
  
  RETURN COALESCE(relations, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Fix the get_persistent_assignments function
CREATE OR REPLACE FUNCTION get_persistent_assignments()
RETURNS JSONB AS $$
DECLARE
  assignments JSONB;
BEGIN
  -- Exécuter la vérification de cohérence
  PERFORM ensure_relation_consistency();
  
  -- Utiliser une CTE pour ordonner les données d'abord
  WITH ordered_assignments AS (
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
        'id', a.id,
        'parentEleveId', a.parent_eleve_id,
        'encadreurId', a.encadreur_id,
        'compatibilityScore', a.compatibility_score,
        'criteria', a.criteria,
        'assignedBy', a.assigned_by,
        'assignedAt', a.assigned_at,
        'status', a.status,
        'parent', jsonb_build_object(
          'id', a.parent_eleve_id,
          'nom', a.parent_nom,
          'prenoms', a.parent_prenoms,
          'email', a.parent_email,
          'commune', a.parent_commune,
          'classe', a.parent_classe,
          'besoins', a.parent_besoins
        ),
        'encadreur', jsonb_build_object(
          'id', a.encadreur_id,
          'nom', a.encadreur_nom,
          'prenoms', a.encadreur_prenoms,
          'email', a.encadreur_email,
          'commune', a.encadreur_commune,
          'disciplines', a.encadreur_disciplines
        ),
        'admin', jsonb_build_object(
          'id', a.assigned_by,
          'nom', a.admin_nom,
          'prenoms', a.admin_prenoms,
          'email', a.admin_email
        )
      )
    ) INTO assignments
  FROM 
    ordered_assignments a;
  
  RETURN COALESCE(assignments, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Exécuter la vérification et réparation des relations pour s'assurer que tout est cohérent
SELECT check_and_repair_relations();