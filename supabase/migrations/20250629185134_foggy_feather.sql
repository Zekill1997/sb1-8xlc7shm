/*
  # Fix ambiguous column references in create_assignment_with_commune_check function

  1. Problem
    - Function parameters `parent_id` and `encadreur_id` conflict with table column names
    - This causes "column reference is ambiguous" errors during INSERT operations

  2. Solution
    - Rename function parameters to `_parent_id` and `_encadreur_id`
    - Update all internal references to use the new parameter names
    - This eliminates the ambiguity between parameters and column names
*/

-- Drop and recreate the function with non-ambiguous parameter names
DROP FUNCTION IF EXISTS create_assignment_with_commune_check(UUID, UUID, DECIMAL, JSONB, UUID);

CREATE OR REPLACE FUNCTION create_assignment_with_commune_check(
  _parent_id UUID, 
  _encadreur_id UUID, 
  compatibility_score DECIMAL, 
  criteria JSONB, 
  assigned_by UUID
)
RETURNS JSONB AS $$
DECLARE
  parent_commune TEXT;
  encadreur_commune TEXT;
  assignment_id UUID;
BEGIN
  -- Vérifier si une assignation peut être créée
  IF NOT can_create_assignment(_parent_id, _encadreur_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Une relation ou assignation existe déjà');
  END IF;
  
  -- Récupérer les communes
  SELECT commune_apprenant INTO parent_commune 
  FROM users 
  WHERE id = _parent_id;
  
  SELECT commune_intervention INTO encadreur_commune 
  FROM users 
  WHERE id = _encadreur_id;
  
  -- Vérifier la compatibilité des communes
  IF parent_commune != encadreur_commune THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Incompatibilité de commune: ' || parent_commune || ' vs ' || encadreur_commune
    );
  END IF;
  
  -- Créer l'assignation
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
    compatibility_score,
    criteria,
    assigned_by,
    'PENDING'
  ) RETURNING id INTO assignment_id;
  
  -- Créer des notifications
  INSERT INTO notifications (user_id, type, title, message, data) VALUES
  (_parent_id, 'ASSIGNMENT', 'Assignation en attente', 
   'Une assignation avec un encadreur est en attente d''approbation.', 
   jsonb_build_object('encadreur_id', _encadreur_id, 'assignment_id', assignment_id)),
  (_encadreur_id, 'ASSIGNMENT', 'Assignation en attente', 
   'Une assignation avec un élève est en attente d''approbation.', 
   jsonb_build_object('parent_id', _parent_id, 'assignment_id', assignment_id));
  
  RETURN jsonb_build_object('success', true, 'assignment_id', assignment_id);
END;
$$ LANGUAGE plpgsql;

-- Also fix the approve_assignment function to avoid similar issues
DROP FUNCTION IF EXISTS approve_assignment(UUID, UUID);

CREATE OR REPLACE FUNCTION approve_assignment(_assignment_id UUID, approved_by_user UUID)
RETURNS JSONB AS $$
DECLARE
  assignment_record RECORD;
  relation_id UUID;
  parent_commune TEXT;
  encadreur_commune TEXT;
  result JSONB;
BEGIN
  -- Récupérer l'assignation
  SELECT * INTO assignment_record 
  FROM assignments 
  WHERE id = _assignment_id AND status = 'PENDING';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignation non trouvée ou déjà traitée');
  END IF;
  
  -- Vérifier qu'il n'y a pas déjà une relation active
  IF EXISTS (
    SELECT 1 FROM approved_relations 
    WHERE parent_eleve_id = assignment_record.parent_eleve_id 
    AND encadreur_id = assignment_record.encadreur_id 
    AND status = 'ACTIVE'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Une relation active existe déjà');
  END IF;
  
  -- Récupérer les communes
  SELECT commune_apprenant INTO parent_commune 
  FROM users 
  WHERE id = assignment_record.parent_eleve_id;
  
  SELECT commune_intervention INTO encadreur_commune 
  FROM users 
  WHERE id = assignment_record.encadreur_id;
  
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
  
  RETURN jsonb_build_object('success', true, 'relation_id', relation_id);
END;
$$ LANGUAGE plpgsql;

-- Also fix the dissociate_relation function for consistency
DROP FUNCTION IF EXISTS dissociate_relation(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION dissociate_relation(_parent_id UUID, _encadreur_id UUID, dissociated_by_user UUID)
RETURNS JSONB AS $$
DECLARE
  relation_record RECORD;
BEGIN
  -- Récupérer la relation active
  SELECT * INTO relation_record 
  FROM approved_relations 
  WHERE parent_eleve_id = _parent_id 
  AND encadreur_id = _encadreur_id 
  AND status = 'ACTIVE';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Relation active non trouvée');
  END IF;
  
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
  
  -- Créer des notifications
  INSERT INTO notifications (user_id, type, title, message, data) VALUES
  (_parent_id, 'ASSIGNMENT', 'Relation terminée', 
   'Votre relation avec l''encadreur a été terminée.', 
   jsonb_build_object('encadreur_id', _encadreur_id)),
  (_encadreur_id, 'ASSIGNMENT', 'Relation terminée', 
   'Votre relation avec un élève a été terminée.', 
   jsonb_build_object('parent_eleve_id', _parent_id));
  
  RETURN jsonb_build_object('success', true, 'relation_id', relation_record.id);
END;
$$ LANGUAGE plpgsql;

-- Fix the can_create_assignment function as well
DROP FUNCTION IF EXISTS can_create_assignment(UUID, UUID);

CREATE OR REPLACE FUNCTION can_create_assignment(_parent_id UUID, _encadreur_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Vérifier qu'il n'y a pas de relation active
  IF EXISTS (
    SELECT 1 FROM approved_relations 
    WHERE parent_eleve_id = _parent_id 
    AND encadreur_id = _encadreur_id 
    AND status = 'ACTIVE'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier qu'il n'y a pas d'assignation en attente
  IF EXISTS (
    SELECT 1 FROM assignments 
    WHERE parent_eleve_id = _parent_id 
    AND encadreur_id = _encadreur_id 
    AND status = 'PENDING'
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;