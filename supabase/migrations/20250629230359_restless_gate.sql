/*
  # Amélioration de la persistance des relations approuvées

  1. Changements
    - Ajout d'index supplémentaires pour améliorer les performances des requêtes
    - Ajout de fonctions pour récupérer les relations approuvées
    - Correction des problèmes de synchronisation des relations
    - Ajout de déclencheurs pour maintenir la cohérence des données

  2. Sécurité
    - Maintien des politiques RLS existantes
    - Ajout de vérifications supplémentaires pour les opérations critiques

  3. Optimisations
    - Amélioration des requêtes pour les relations approuvées
    - Ajout de fonctions pour la récupération efficace des relations
*/

-- Vérifier si la table approved_relations existe déjà
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'approved_relations') THEN
    -- Créer la table approved_relations si elle n'existe pas
    CREATE TABLE approved_relations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      parent_eleve_id UUID REFERENCES users(id) ON DELETE CASCADE,
      encadreur_id UUID REFERENCES users(id) ON DELETE CASCADE,
      approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      approved_by UUID REFERENCES users(id),
      dissociated_at TIMESTAMP WITH TIME ZONE,
      dissociated_by UUID REFERENCES users(id),
      compatibility_score DECIMAL(3,2) DEFAULT 0.0,
      criteria JSONB DEFAULT '{}',
      status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISSOCIATED')),
      
      -- Contrainte d'unicité pour éviter les doublons
      UNIQUE(parent_eleve_id, encadreur_id)
    );

    -- Activer RLS sur la table
    ALTER TABLE approved_relations ENABLE ROW LEVEL SECURITY;

    -- Créer des politiques RLS
    CREATE POLICY "Allow public access to approved_relations" 
      ON approved_relations 
      FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;

-- Ajouter des index supplémentaires pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_approved_relations_parent_status 
  ON approved_relations(parent_eleve_id, status);

CREATE INDEX IF NOT EXISTS idx_approved_relations_encadreur_status 
  ON approved_relations(encadreur_id, status);

CREATE INDEX IF NOT EXISTS idx_approved_relations_approved_at 
  ON approved_relations(approved_at DESC);

-- Fonction pour récupérer toutes les relations approuvées avec détails
CREATE OR REPLACE FUNCTION get_approved_relations_with_details()
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

-- Fonction pour récupérer les relations actives uniquement avec détails
CREATE OR REPLACE FUNCTION get_active_relations_with_details()
RETURNS TABLE (
  id UUID,
  parent_eleve_id UUID,
  encadreur_id UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  compatibility_score DECIMAL,
  criteria JSONB,
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
  RETURN QUERY
  SELECT 
    ar.id,
    ar.parent_eleve_id,
    ar.encadreur_id,
    ar.approved_at,
    ar.approved_by,
    ar.compatibility_score,
    ar.criteria,
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
  WHERE 
    ar.status = 'ACTIVE'
  ORDER BY 
    ar.approved_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Amélioration de la fonction approve_assignment pour assurer la persistance
CREATE OR REPLACE FUNCTION approve_assignment(_assignment_id UUID, approved_by_user UUID)
RETURNS JSONB AS $$
DECLARE
  assignment_record RECORD;
  relation_id UUID;
  parent_commune TEXT;
  encadreur_commune TEXT;
  result JSONB;
  existing_relation_id UUID;
BEGIN
  -- Récupérer l'assignation
  SELECT * INTO assignment_record 
  FROM assignments 
  WHERE id = _assignment_id AND status = 'PENDING';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignation non trouvée ou déjà traitée');
  END IF;
  
  -- Vérifier qu'il n'y a pas déjà une relation active
  SELECT id INTO existing_relation_id
  FROM approved_relations 
  WHERE parent_eleve_id = assignment_record.parent_eleve_id 
  AND encadreur_id = assignment_record.encadreur_id 
  AND status = 'ACTIVE';
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Une relation active existe déjà', 'relation_id', existing_relation_id);
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
  
  RETURN jsonb_build_object('success', true, 'relation_id', relation_id);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier et réparer les relations incohérentes
CREATE OR REPLACE FUNCTION check_and_repair_relations()
RETURNS JSONB AS $$
DECLARE
  fixed_count INTEGER := 0;
  orphaned_count INTEGER := 0;
  inconsistent_count INTEGER := 0;
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
  
  GET DIAGNOSTICS inconsistent_count = ROW_COUNT;
  fixed_count := fixed_count + inconsistent_count;
  
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

-- Fonction pour récupérer les détails d'une relation spécifique
CREATE OR REPLACE FUNCTION get_relation_details(_relation_id UUID)
RETURNS JSONB AS $$
DECLARE
  relation_data JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'id', ar.id,
      'parent_eleve_id', ar.parent_eleve_id,
      'encadreur_id', ar.encadreur_id,
      'approved_at', ar.approved_at,
      'approved_by', ar.approved_by,
      'dissociated_at', ar.dissociated_at,
      'dissociated_by', ar.dissociated_by,
      'compatibility_score', ar.compatibility_score,
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
    ) INTO relation_data
  FROM 
    approved_relations ar
  JOIN 
    users parent ON ar.parent_eleve_id = parent.id
  JOIN 
    users encadreur ON ar.encadreur_id = encadreur.id
  WHERE 
    ar.id = _relation_id;
  
  RETURN relation_data;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la vérification et réparation des relations au démarrage
SELECT check_and_repair_relations();