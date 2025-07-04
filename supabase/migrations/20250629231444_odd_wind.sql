-- Amélioration de la table assignments et ajout de fonctions pour récupérer les détails

-- Vérifier si la table assignments existe déjà
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignments') THEN
    -- Créer la table assignments si elle n'existe pas
    CREATE TABLE assignments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      parent_eleve_id UUID REFERENCES users(id) ON DELETE CASCADE,
      encadreur_id UUID REFERENCES users(id) ON DELETE CASCADE,
      compatibility_score DECIMAL(3,2) DEFAULT 0.0,
      criteria JSONB DEFAULT '{}',
      assigned_by UUID REFERENCES users(id),
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
    );

    -- Activer RLS sur la table
    ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

    -- Créer des politiques RLS
    CREATE POLICY "Allow public access to assignments" 
      ON assignments 
      FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;

-- Ajouter des index supplémentaires pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_assignments_parent_status 
  ON assignments(parent_eleve_id, status);

CREATE INDEX IF NOT EXISTS idx_assignments_encadreur_status 
  ON assignments(encadreur_id, status);

CREATE INDEX IF NOT EXISTS idx_assignments_assigned_at 
  ON assignments(assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_status 
  ON assignments(status);

-- Fonction pour récupérer toutes les assignations en attente avec détails
CREATE OR REPLACE FUNCTION get_pending_assignments_with_details()
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

-- Fonction pour récupérer les détails d'une assignation spécifique
CREATE OR REPLACE FUNCTION get_assignment_details(_assignment_id UUID)
RETURNS JSONB AS $$
DECLARE
  assignment_data JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'id', a.id,
      'parent_eleve_id', a.parent_eleve_id,
      'encadreur_id', a.encadreur_id,
      'compatibility_score', a.compatibility_score,
      'criteria', a.criteria,
      'assigned_by', a.assigned_by,
      'assigned_at', a.assigned_at,
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
    ) INTO assignment_data
  FROM 
    assignments a
  JOIN 
    users parent ON a.parent_eleve_id = parent.id
  JOIN 
    users encadreur ON a.encadreur_id = encadreur.id
  LEFT JOIN
    users admin ON a.assigned_by = admin.id
  WHERE 
    a.id = _assignment_id;
  
  RETURN assignment_data;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier et réparer les assignations incohérentes
CREATE OR REPLACE FUNCTION check_and_repair_assignments()
RETURNS JSONB AS $$
DECLARE
  fixed_count INTEGER := 0;
  orphaned_count INTEGER := 0;
  duplicate_count INTEGER := 0;
BEGIN
  -- 1. Supprimer les assignations orphelines (où un utilisateur n'existe plus)
  WITH orphaned_assignments AS (
    SELECT a.id
    FROM assignments a
    LEFT JOIN users parent ON a.parent_eleve_id = parent.id
    LEFT JOIN users encadreur ON a.encadreur_id = encadreur.id
    WHERE a.status = 'PENDING' AND (parent.id IS NULL OR encadreur.id IS NULL)
  )
  DELETE FROM assignments a
  USING orphaned_assignments oa
  WHERE a.id = oa.id;
  
  GET DIAGNOSTICS orphaned_count = ROW_COUNT;
  
  -- 2. Supprimer les assignations en double (garder la plus récente)
  WITH duplicates AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY parent_eleve_id, encadreur_id 
        ORDER BY assigned_at DESC
      ) as row_num
    FROM 
      assignments
    WHERE 
      status = 'PENDING'
  )
  DELETE FROM assignments a
  USING duplicates d
  WHERE a.id = d.id AND d.row_num > 1;
  
  GET DIAGNOSTICS duplicate_count = ROW_COUNT;
  
  -- 3. Marquer comme rejetées les assignations pour des relations déjà approuvées
  WITH existing_relations AS (
    SELECT 
      a.id
    FROM 
      assignments a
    JOIN 
      approved_relations ar ON a.parent_eleve_id = ar.parent_eleve_id AND a.encadreur_id = ar.encadreur_id
    WHERE 
      a.status = 'PENDING' AND ar.status = 'ACTIVE'
  )
  UPDATE assignments a
  SET 
    status = 'REJECTED'
  FROM 
    existing_relations er
  WHERE 
    a.id = er.id;
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'fixed_assignments', fixed_count,
    'orphaned_assignments', orphaned_count,
    'duplicate_assignments', duplicate_count,
    'total_repairs', fixed_count + orphaned_count + duplicate_count,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Exécuter la vérification et réparation des assignations au démarrage
SELECT check_and_repair_assignments();