/*
  # Fix dissociated relations not appearing in pending assignments

  1. Changes
    - Improve the dissociate_relation function to ensure it creates a new pending assignment
    - Add better error handling and transaction support
    - Fix the get_persistent_assignments function to include all necessary user details
    - Ensure proper notification messages are sent to users

  2. Benefits
    - When a relation is dissociated, it will automatically create a new pending assignment
    - Administrators will see complete information about both parties in the pending assignments list
    - The system maintains data integrity throughout the process
*/

-- Modify the dissociate_relation function to automatically create a pending assignment
CREATE OR REPLACE FUNCTION dissociate_relation(_parent_id UUID, _encadreur_id UUID, dissociated_by_user UUID)
RETURNS JSONB AS $$
DECLARE
  relation_record RECORD;
  assignment_id UUID;
  parent_record RECORD;
  encadreur_record RECORD;
BEGIN
  -- Start a transaction
  BEGIN
    -- Récupérer la relation active
    SELECT * INTO relation_record 
    FROM approved_relations 
    WHERE parent_eleve_id = _parent_id 
    AND encadreur_id = _encadreur_id 
    AND status = 'ACTIVE'
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Relation active non trouvée');
    END IF;
    
    -- Récupérer les détails complets des utilisateurs
    SELECT * INTO parent_record 
    FROM users 
    WHERE id = _parent_id
    FOR UPDATE;
    
    SELECT * INTO encadreur_record 
    FROM users 
    WHERE id = _encadreur_id
    FOR UPDATE;
    
    -- Marquer la relation comme dissociée
    UPDATE approved_relations 
    SET status = 'DISSOCIATED',
        dissociated_at = NOW(),
        dissociated_by = dissociated_by_user
    WHERE id = relation_record.id;
    
    -- Mettre à jour le parent (supprimer l'encadreur assigné)
    UPDATE users 
    SET assigned_encadreur = NULL,
        updated_at = NOW()
    WHERE id = _parent_id;
    
    -- Mettre à jour l'encadreur (retirer l'étudiant)
    UPDATE users 
    SET assigned_students = array_remove(assigned_students, _parent_id::text),
        updated_at = NOW()
    WHERE id = _encadreur_id;
    
    -- Marquer toute assignation en attente comme rejetée
    UPDATE assignments 
    SET status = 'REJECTED'
    WHERE parent_eleve_id = _parent_id 
    AND encadreur_id = _encadreur_id 
    AND status = 'PENDING';
    
    -- Créer une nouvelle assignation en attente
    INSERT INTO assignments (
      parent_eleve_id,
      encadreur_id,
      compatibility_score,
      criteria,
      assigned_by,
      status
    ) VALUES (
      _parent_id,
      _encadreur_id,
      relation_record.compatibility_score,
      relation_record.criteria,
      dissociated_by_user,
      'PENDING'
    ) RETURNING id INTO assignment_id;
    
    -- Créer des notifications
    INSERT INTO notifications (user_id, type, title, message, data) VALUES
    (_parent_id, 'ASSIGNMENT', 'Relation terminée et nouvelle assignation créée', 
     'Votre relation avec l''encadreur a été terminée. Une nouvelle assignation est en attente d''approbation.', 
     jsonb_build_object('encadreur_id', _encadreur_id, 'assignment_id', assignment_id)),
    (_encadreur_id, 'ASSIGNMENT', 'Relation terminée et nouvelle assignation créée', 
     'Votre relation avec un élève a été terminée. Une nouvelle assignation est en attente d''approbation.', 
     jsonb_build_object('parent_eleve_id', _parent_id, 'assignment_id', assignment_id));
    
    RETURN jsonb_build_object(
      'success', true, 
      'relation_id', relation_record.id, 
      'assignment_id', assignment_id
    );
  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    RAISE NOTICE 'Error in transaction: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- Improved function to get persistent assignments with complete user details
CREATE OR REPLACE FUNCTION get_persistent_assignments()
RETURNS JSONB AS $$
DECLARE
  assignments JSONB;
BEGIN
  -- Exécuter la vérification de cohérence
  PERFORM ensure_relation_consistency();
  
  -- Récupérer les assignations avec les détails complets
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
      -- Parent details
      parent.nom_apprenant as parent_nom,
      parent.prenoms_apprenant as parent_prenoms,
      parent.email as parent_email,
      parent.commune_apprenant as parent_commune,
      parent.classe_apprenant as parent_classe,
      parent.besoins as parent_besoins,
      parent.nom_parent as parent_nom_parent,
      parent.prenoms_parent as parent_prenoms_parent,
      parent.telephone as parent_telephone,
      -- Encadreur details
      encadreur.nom as encadreur_nom,
      encadreur.prenoms as encadreur_prenoms,
      encadreur.email as encadreur_email,
      encadreur.commune_intervention as encadreur_commune,
      encadreur.disciplines as encadreur_disciplines,
      encadreur.telephone as encadreur_telephone,
      encadreur.classes_enseignement as encadreur_classes,
      -- Admin details
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
          'besoins', ad.parent_besoins,
          'nomParent', ad.parent_nom_parent,
          'prenomsParent', ad.parent_prenoms_parent,
          'telephone', ad.parent_telephone
        ),
        'encadreur', jsonb_build_object(
          'id', ad.encadreur_id,
          'nom', ad.encadreur_nom,
          'prenoms', ad.encadreur_prenoms,
          'email', ad.encadreur_email,
          'commune', ad.encadreur_commune,
          'disciplines', ad.encadreur_disciplines,
          'telephone', ad.encadreur_telephone,
          'classes', ad.encadreur_classes
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

-- Verify if there are any dissociated relations without corresponding pending assignments
DO $$
DECLARE
  relation_record RECORD;
  assignment_exists BOOLEAN;
  fixed_count INTEGER := 0;
BEGIN
  FOR relation_record IN 
    SELECT * FROM approved_relations WHERE status = 'DISSOCIATED'
  LOOP
    -- Check if there's a pending assignment for this relation
    SELECT EXISTS (
      SELECT 1 FROM assignments 
      WHERE parent_eleve_id = relation_record.parent_eleve_id 
      AND encadreur_id = relation_record.encadreur_id 
      AND status = 'PENDING'
    ) INTO assignment_exists;
    
    -- If no pending assignment exists, create one
    IF NOT assignment_exists THEN
      INSERT INTO assignments (
        parent_eleve_id,
        encadreur_id,
        compatibility_score,
        criteria,
        assigned_by,
        status
      ) VALUES (
        relation_record.parent_eleve_id,
        relation_record.encadreur_id,
        relation_record.compatibility_score,
        relation_record.criteria,
        relation_record.approved_by, -- Use the original approver as the assigner
        'PENDING'
      );
      
      fixed_count := fixed_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Fixed % dissociated relations without pending assignments', fixed_count;
END $$;