-- Fix for the missing approve_assignment_with_transaction function

-- Create the approve_assignment_with_transaction function that was referenced but missing
CREATE OR REPLACE FUNCTION approve_assignment_with_transaction(_assignment_id UUID, approved_by_user UUID)
RETURNS JSONB AS $$
DECLARE
  assignment_record RECORD;
  relation_id UUID;
  parent_commune TEXT;
  encadreur_commune TEXT;
  result JSONB;
  existing_relation_id UUID;
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
    SELECT id INTO existing_relation_id
    FROM approved_relations 
    WHERE parent_eleve_id = assignment_record.parent_eleve_id 
    AND encadreur_id = assignment_record.encadreur_id 
    AND status = 'ACTIVE'
    FOR UPDATE;
    
    IF FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Une relation active existe déjà', 'relation_id', existing_relation_id);
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
    
    -- Créer la relation approuvée avec gestion des erreurs
    BEGIN
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
    EXCEPTION WHEN unique_violation THEN
      -- Si violation de contrainte d'unicité, récupérer la relation existante
      SELECT id INTO relation_id
      FROM approved_relations
      WHERE parent_eleve_id = assignment_record.parent_eleve_id
      AND encadreur_id = assignment_record.encadreur_id;
      
      -- Réactiver la relation si elle était dissociée
      UPDATE approved_relations
      SET status = 'ACTIVE',
          approved_at = NOW(),
          approved_by = approved_by_user,
          dissociated_at = NULL,
          dissociated_by = NULL
      WHERE id = relation_id;
    END;
    
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