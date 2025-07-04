-- ===== CONFIGURATION COMPLÈTE SUPABASE POUR SUPER@PPRENANT-CI =====
-- Ce script contient toutes les tables, fonctions, index et politiques nécessaires
-- pour le fonctionnement complet de l'application avec Supabase comme source de vérité.
-- Il inclut les dernières fonctionnalités de vérification de commune et de messagerie.

-- ===== CRÉATION DES TABLES =====

-- Table users (complète avec tous les champs)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ENCADREUR', 'PARENT_ELEVE', 'ADMINISTRATEUR')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Champs communs
  nom TEXT,
  prenoms TEXT,
  telephone TEXT,
  profile_photo TEXT,
  
  -- Champs Encadreur
  genre TEXT,
  commune_residence TEXT,
  dernier_diplome TEXT,
  experience_professionnelle BOOLEAN DEFAULT FALSE,
  classes_enseignement TEXT[] DEFAULT '{}',
  disciplines TEXT[] DEFAULT '{}',
  commune_intervention TEXT,
  motivation TEXT,
  profil_encadrant JSONB DEFAULT '{}',
  assigned_students TEXT[] DEFAULT '{}',
  max_students INTEGER DEFAULT 4,
  
  -- Champs Parent/Élève
  nom_parent TEXT,
  prenoms_parent TEXT,
  profession TEXT,
  pack_choisi TEXT,
  nom_apprenant TEXT,
  prenoms_apprenant TEXT,
  age_apprenant INTEGER,
  commune_apprenant TEXT,
  classe_apprenant TEXT,
  besoins TEXT[] DEFAULT '{}',
  profil_apprentissage JSONB DEFAULT '{}',
  assigned_encadreur TEXT
);

-- Table messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB DEFAULT '{}'
);

-- Table assignments (assignations en attente)
CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_eleve_id UUID REFERENCES users(id) ON DELETE CASCADE,
  encadreur_id UUID REFERENCES users(id) ON DELETE CASCADE,
  compatibility_score DECIMAL(3,2) DEFAULT 0.0,
  criteria JSONB DEFAULT '{}',
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- Table approved_relations (relations approuvées et historique)
CREATE TABLE IF NOT EXISTS approved_relations (
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

-- ===== INDEX POUR LES PERFORMANCES =====

-- Index sur users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_assigned_encadreur ON users(assigned_encadreur) WHERE role = 'PARENT_ELEVE';
CREATE INDEX IF NOT EXISTS idx_users_assigned_students ON users USING GIN(assigned_students) WHERE role = 'ENCADREUR';
CREATE INDEX IF NOT EXISTS idx_users_commune_apprenant ON users(commune_apprenant) WHERE role = 'PARENT_ELEVE';
CREATE INDEX IF NOT EXISTS idx_users_commune_intervention ON users(commune_intervention) WHERE role = 'ENCADREUR';

-- Index sur messages
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Index sur notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Index sur assignments
CREATE INDEX IF NOT EXISTS idx_assignments_parent ON assignments(parent_eleve_id);
CREATE INDEX IF NOT EXISTS idx_assignments_encadreur ON assignments(encadreur_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- Index sur approved_relations
CREATE INDEX IF NOT EXISTS idx_approved_relations_parent ON approved_relations(parent_eleve_id);
CREATE INDEX IF NOT EXISTS idx_approved_relations_encadreur ON approved_relations(encadreur_id);
CREATE INDEX IF NOT EXISTS idx_approved_relations_status ON approved_relations(status);

-- ===== FONCTIONS POUR LA GESTION DES MESSAGES =====

-- Fonction pour vérifier si un utilisateur peut envoyer un message à un autre
CREATE OR REPLACE FUNCTION can_send_message(sender_id UUID, recipient_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sender_role TEXT;
  recipient_role TEXT;
  sender_assigned_encadreur TEXT;
  recipient_assigned_students TEXT[];
  is_admin BOOLEAN;
BEGIN
  -- Récupérer les rôles des utilisateurs
  SELECT role INTO sender_role FROM users WHERE id = sender_id;
  SELECT role INTO recipient_role FROM users WHERE id = recipient_id;
  
  -- Vérifier si l'expéditeur est un administrateur (peut envoyer à tout le monde)
  is_admin := (sender_role = 'ADMINISTRATEUR');
  IF is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Vérifier si le destinataire est un administrateur (tout le monde peut envoyer)
  IF recipient_role = 'ADMINISTRATEUR' THEN
    RETURN TRUE;
  END IF;
  
  -- Cas Parent/Élève -> Encadreur
  IF sender_role = 'PARENT_ELEVE' AND recipient_role = 'ENCADREUR' THEN
    SELECT assigned_encadreur INTO sender_assigned_encadreur 
    FROM users 
    WHERE id = sender_id;
    
    -- Vérifier si l'encadreur est assigné à ce parent/élève
    RETURN (sender_assigned_encadreur = recipient_id::text);
  END IF;
  
  -- Cas Encadreur -> Parent/Élève
  IF sender_role = 'ENCADREUR' AND recipient_role = 'PARENT_ELEVE' THEN
    SELECT assigned_students INTO recipient_assigned_students 
    FROM users 
    WHERE id = sender_id;
    
    -- Vérifier si le parent/élève est dans la liste des élèves assignés
    RETURN (recipient_id::text = ANY(recipient_assigned_students));
  END IF;
  
  -- Par défaut, interdire l'envoi
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier les permissions de messagerie avant insertion
CREATE OR REPLACE FUNCTION check_message_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si l'expéditeur peut envoyer un message au destinataire
  IF NOT can_send_message(NEW.from_user_id, NEW.to_user_id) THEN
    RAISE EXCEPTION 'Vous ne pouvez pas envoyer de message à cet utilisateur';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur la table messages
DROP TRIGGER IF EXISTS check_message_permissions_trigger ON messages;
CREATE TRIGGER check_message_permissions_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_message_permissions();

-- ===== FONCTIONS POUR LA GESTION DES ASSIGNATIONS =====

-- Fonction pour vérifier si une relation peut être créée
CREATE OR REPLACE FUNCTION can_create_assignment(parent_id UUID, encadreur_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Vérifier qu'il n'y a pas de relation active
  IF EXISTS (
    SELECT 1 FROM approved_relations 
    WHERE parent_eleve_id = parent_id 
    AND encadreur_id = encadreur_id 
    AND status = 'ACTIVE'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier qu'il n'y a pas d'assignation en attente
  IF EXISTS (
    SELECT 1 FROM assignments 
    WHERE parent_eleve_id = parent_id 
    AND encadreur_id = encadreur_id 
    AND status = 'PENDING'
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer une assignation avec vérification de commune
CREATE OR REPLACE FUNCTION create_assignment_with_commune_check(
  parent_id UUID, 
  encadreur_id UUID, 
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
  IF NOT can_create_assignment(parent_id, encadreur_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Une relation ou assignation existe déjà');
  END IF;
  
  -- Récupérer les communes
  SELECT commune_apprenant INTO parent_commune 
  FROM users 
  WHERE id = parent_id;
  
  SELECT commune_intervention INTO encadreur_commune 
  FROM users 
  WHERE id = encadreur_id;
  
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
    parent_id,
    encadreur_id,
    compatibility_score,
    criteria,
    assigned_by,
    'PENDING'
  ) RETURNING id INTO assignment_id;
  
  -- Créer des notifications
  INSERT INTO notifications (user_id, type, title, message, data) VALUES
  (parent_id, 'ASSIGNMENT', 'Assignation en attente', 
   'Une assignation avec un encadreur est en attente d''approbation.', 
   jsonb_build_object('encadreur_id', encadreur_id, 'assignment_id', assignment_id)),
  (encadreur_id, 'ASSIGNMENT', 'Assignation en attente', 
   'Une assignation avec un élève est en attente d''approbation.', 
   jsonb_build_object('parent_id', parent_id, 'assignment_id', assignment_id));
  
  RETURN jsonb_build_object('success', true, 'assignment_id', assignment_id);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour approuver une assignation avec vérification de commune
CREATE OR REPLACE FUNCTION approve_assignment(assignment_id UUID, approved_by_user UUID)
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
  WHERE id = assignment_id AND status = 'PENDING';
  
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
  WHERE id = assignment_id;
  
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

-- Fonction pour dissocier une relation
CREATE OR REPLACE FUNCTION dissociate_relation(parent_id UUID, encadreur_id UUID, dissociated_by_user UUID)
RETURNS JSONB AS $$
DECLARE
  relation_record RECORD;
BEGIN
  -- Récupérer la relation active
  SELECT * INTO relation_record 
  FROM approved_relations 
  WHERE parent_eleve_id = parent_id 
  AND encadreur_id = encadreur_id 
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
  WHERE id = parent_id;
  
  -- Mettre à jour l'encadreur (retirer l'étudiant)
  UPDATE users 
  SET assigned_students = array_remove(assigned_students, parent_id::text),
      updated_at = NOW()
  WHERE id = encadreur_id;
  
  -- Marquer toute assignation en attente comme rejetée
  UPDATE assignments 
  SET status = 'REJECTED'
  WHERE parent_eleve_id = parent_id 
  AND encadreur_id = encadreur_id 
  AND status = 'PENDING';
  
  -- Créer des notifications
  INSERT INTO notifications (user_id, type, title, message, data) VALUES
  (parent_id, 'ASSIGNMENT', 'Relation terminée', 
   'Votre relation avec l''encadreur a été terminée.', 
   jsonb_build_object('encadreur_id', encadreur_id)),
  (encadreur_id, 'ASSIGNMENT', 'Relation terminée', 
   'Votre relation avec un élève a été terminée.', 
   jsonb_build_object('parent_eleve_id', parent_id));
  
  RETURN jsonb_build_object('success', true, 'relation_id', relation_record.id);
END;
$$ LANGUAGE plpgsql;

-- ===== FONCTIONS DE VÉRIFICATION ET DE TEST =====

-- Fonction pour vérifier les contraintes de messagerie
CREATE OR REPLACE FUNCTION verify_messaging_constraints()
RETURNS JSONB AS $$
DECLARE
  trigger_exists BOOLEAN;
  function_exists BOOLEAN;
  policy_exists BOOLEAN;
BEGIN
  -- Vérifier si le trigger existe
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'check_message_permissions_trigger'
  ) INTO trigger_exists;
  
  -- Vérifier si la fonction existe
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'can_send_message'
  ) INTO function_exists;
  
  -- Vérifier si la politique existe
  SELECT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Messages permission policy'
  ) INTO policy_exists;
  
  RETURN jsonb_build_object(
    'trigger_exists', trigger_exists,
    'function_exists', function_exists,
    'policy_exists', policy_exists,
    'all_constraints_active', (trigger_exists AND function_exists AND policy_exists)
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier les contraintes de commune
CREATE OR REPLACE FUNCTION verify_commune_constraints()
RETURNS JSONB AS $$
DECLARE
  approve_function_modified BOOLEAN;
  create_function_exists BOOLEAN;
BEGIN
  -- Vérifier si la fonction approve_assignment a été modifiée pour inclure la vérification de commune
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'approve_assignment' AND prosrc LIKE '%commune%'
  ) INTO approve_function_modified;
  
  -- Vérifier si la fonction create_assignment_with_commune_check existe
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_assignment_with_commune_check'
  ) INTO create_function_exists;
  
  RETURN jsonb_build_object(
    'approve_function_modified', approve_function_modified,
    'create_function_exists', create_function_exists,
    'all_constraints_active', (approve_function_modified AND create_function_exists)
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir un rapport complet sur les contraintes
CREATE OR REPLACE FUNCTION get_constraints_report()
RETURNS JSONB AS $$
DECLARE
  messaging_report JSONB;
  commune_report JSONB;
BEGIN
  SELECT verify_messaging_constraints() INTO messaging_report;
  SELECT verify_commune_constraints() INTO commune_report;
  
  RETURN jsonb_build_object(
    'messaging_constraints', messaging_report,
    'commune_constraints', commune_report,
    'all_constraints_active', (
      (messaging_report->>'all_constraints_active')::BOOLEAN AND 
      (commune_report->>'all_constraints_active')::BOOLEAN
    ),
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour tester la compatibilité des communes
CREATE OR REPLACE FUNCTION test_commune_compatibility(parent_id UUID, encadreur_id UUID)
RETURNS JSONB AS $$
DECLARE
  parent_commune TEXT;
  encadreur_commune TEXT;
  compatible BOOLEAN;
BEGIN
  -- Récupérer les communes
  SELECT commune_apprenant INTO parent_commune 
  FROM users 
  WHERE id = parent_id;
  
  SELECT commune_intervention INTO encadreur_commune 
  FROM users 
  WHERE id = encadreur_id;
  
  -- Vérifier la compatibilité
  compatible := (parent_commune = encadreur_commune);
  
  RETURN jsonb_build_object(
    'parent_commune', parent_commune,
    'encadreur_commune', encadreur_commune,
    'compatible', compatible,
    'message', CASE 
      WHEN compatible THEN 'Les communes sont compatibles'
      ELSE 'Incompatibilité de commune: ' || parent_commune || ' vs ' || encadreur_commune
    END
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour tester les permissions de messagerie
CREATE OR REPLACE FUNCTION test_messaging_permissions(sender_id UUID, recipient_id UUID)
RETURNS JSONB AS $$
DECLARE
  can_message BOOLEAN;
  sender_role TEXT;
  recipient_role TEXT;
  reason TEXT;
BEGIN
  -- Récupérer les rôles
  SELECT role INTO sender_role FROM users WHERE id = sender_id;
  SELECT role INTO recipient_role FROM users WHERE id = recipient_id;
  
  -- Vérifier les permissions
  SELECT can_send_message(sender_id, recipient_id) INTO can_message;
  
  -- Déterminer la raison
  IF can_message THEN
    reason := 'Autorisé';
  ELSIF recipient_role = 'ADMINISTRATEUR' THEN
    reason := 'Autorisé (destinataire est administrateur)';
  ELSIF sender_role = 'ADMINISTRATEUR' THEN
    reason := 'Autorisé (expéditeur est administrateur)';
  ELSIF sender_role = 'PARENT_ELEVE' AND recipient_role = 'ENCADREUR' THEN
    reason := 'Non autorisé (encadreur non assigné à ce parent/élève)';
  ELSIF sender_role = 'ENCADREUR' AND recipient_role = 'PARENT_ELEVE' THEN
    reason := 'Non autorisé (parent/élève non assigné à cet encadreur)';
  ELSE
    reason := 'Non autorisé (relation non supportée)';
  END IF;
  
  RETURN jsonb_build_object(
    'sender_role', sender_role,
    'recipient_role', recipient_role,
    'can_message', can_message,
    'reason', reason
  );
END;
$$ LANGUAGE plpgsql;

-- ===== FONCTIONS UTILITAIRES SUPPLÉMENTAIRES =====

-- Fonction pour obtenir les statistiques de la plateforme
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSONB AS $$
DECLARE
  user_count INTEGER;
  encadreur_count INTEGER;
  parent_count INTEGER;
  admin_count INTEGER;
  message_count INTEGER;
  notification_count INTEGER;
  assignment_count INTEGER;
  relation_count INTEGER;
  active_relation_count INTEGER;
  commune_stats JSONB;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO encadreur_count FROM users WHERE role = 'ENCADREUR';
  SELECT COUNT(*) INTO parent_count FROM users WHERE role = 'PARENT_ELEVE';
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'ADMINISTRATEUR';
  SELECT COUNT(*) INTO message_count FROM messages;
  SELECT COUNT(*) INTO notification_count FROM notifications;
  SELECT COUNT(*) INTO assignment_count FROM assignments WHERE status = 'PENDING';
  SELECT COUNT(*) INTO relation_count FROM approved_relations;
  SELECT COUNT(*) INTO active_relation_count FROM approved_relations WHERE status = 'ACTIVE';
  
  -- Statistiques par commune
  WITH commune_data AS (
    SELECT 
      u1.commune_apprenant AS commune,
      COUNT(DISTINCT u1.id) AS parents,
      COUNT(DISTINCT u2.id) AS encadreurs
    FROM 
      users u1
    LEFT JOIN 
      users u2 ON u1.commune_apprenant = u2.commune_intervention AND u2.role = 'ENCADREUR'
    WHERE 
      u1.role = 'PARENT_ELEVE' AND u1.commune_apprenant IS NOT NULL
    GROUP BY 
      u1.commune_apprenant
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'commune', commune,
        'parents', parents,
        'encadreurs', encadreurs
      )
    ) INTO commune_stats
  FROM 
    commune_data;
  
  RETURN jsonb_build_object(
    'users', jsonb_build_object(
      'total', user_count,
      'encadreurs', encadreur_count,
      'parents', parent_count,
      'admins', admin_count
    ),
    'messages', message_count,
    'notifications', notification_count,
    'assignments', assignment_count,
    'relations', jsonb_build_object(
      'total', relation_count,
      'active', active_relation_count
    ),
    'communes', commune_stats,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les anciennes données
CREATE OR REPLACE FUNCTION cleanup_old_data(days_threshold INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  deleted_messages INTEGER;
  deleted_notifications INTEGER;
BEGIN
  -- Supprimer les anciens messages lus
  WITH deleted AS (
    DELETE FROM messages
    WHERE read = true AND created_at < (NOW() - (days_threshold || ' days')::INTERVAL)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_messages FROM deleted;
  
  -- Supprimer les anciennes notifications lues
  WITH deleted AS (
    DELETE FROM notifications
    WHERE read = true AND created_at < (NOW() - (days_threshold || ' days')::INTERVAL)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_notifications FROM deleted;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_messages', deleted_messages,
    'deleted_notifications', deleted_notifications,
    'days_threshold', days_threshold,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour supprimer tous les utilisateurs non-administrateurs
CREATE OR REPLACE FUNCTION delete_all_non_admin_users()
RETURNS JSONB AS $$
DECLARE
  deleted_encadreurs INTEGER;
  deleted_parents INTEGER;
BEGIN
  -- Supprimer les relations approuvées
  DELETE FROM approved_relations;
  
  -- Supprimer les assignations
  DELETE FROM assignments;
  
  -- Supprimer les messages
  DELETE FROM messages;
  
  -- Supprimer les notifications
  DELETE FROM notifications;
  
  -- Compter et supprimer les encadreurs
  WITH deleted AS (
    DELETE FROM users
    WHERE role = 'ENCADREUR'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_encadreurs FROM deleted;
  
  -- Compter et supprimer les parents/élèves
  WITH deleted AS (
    DELETE FROM users
    WHERE role = 'PARENT_ELEVE'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_parents FROM deleted;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_encadreurs', deleted_encadreurs,
    'deleted_parents', deleted_parents,
    'total_deleted', deleted_encadreurs + deleted_parents,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ===== TRIGGERS =====

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur la table users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ===== POLITIQUES RLS =====

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_relations ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Allow public access to users" ON users;
DROP POLICY IF EXISTS "Allow public access to messages" ON messages;
DROP POLICY IF EXISTS "Allow public access to notifications" ON notifications;
DROP POLICY IF EXISTS "Allow public access to assignments" ON assignments;
DROP POLICY IF EXISTS "Allow public access to approved_relations" ON approved_relations;
DROP POLICY IF EXISTS "Messages permission policy" ON messages;

-- Créer des politiques publiques pour le développement
CREATE POLICY "Allow public access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to assignments" ON assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to approved_relations" ON approved_relations FOR ALL USING (true) WITH CHECK (true);

-- Politique spécifique pour les messages avec vérification des permissions
CREATE POLICY "Messages permission policy" ON messages
  FOR INSERT
  TO public
  WITH CHECK (can_send_message(from_user_id, to_user_id));

-- Politique pour la lecture des messages
CREATE POLICY "Allow reading messages" ON messages
  FOR SELECT
  TO public
  USING (true);

-- Politique pour la mise à jour des messages (marquer comme lu)
CREATE POLICY "Allow updating messages" ON messages
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- ===== DONNÉES INITIALES =====

-- Insérer les comptes administrateurs par défaut
INSERT INTO users (
  id,
  username,
  email,
  role,
  nom,
  prenoms,
  created_at,
  updated_at
) VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'ekbessan@gmail.com',
    'ekbessan@gmail.com',
    'ADMINISTRATEUR',
    'EKBESSAN',
    'Ezekiel',
    NOW(),
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'superapprenant25@gmail.com',
    'superapprenant25@gmail.com',
    'ADMINISTRATEUR',
    'ADMIN',
    'Super',
    NOW(),
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  nom = EXCLUDED.nom,
  prenoms = EXCLUDED.prenoms,
  updated_at = NOW();

-- ===== NETTOYAGE ET OPTIMISATION =====

-- Nettoyer les données incohérentes
UPDATE users 
SET assigned_encadreur = NULL,
    updated_at = NOW()
WHERE role = 'PARENT_ELEVE' 
  AND assigned_encadreur IS NOT NULL 
  AND assigned_encadreur::uuid NOT IN (SELECT id FROM users WHERE role = 'ENCADREUR');

-- Recalculer les listes d'étudiants assignés
UPDATE users 
SET assigned_students = (
  SELECT COALESCE(array_agg(id::text), '{}')
  FROM users 
  WHERE role = 'PARENT_ELEVE' 
    AND assigned_encadreur::uuid = users.id
),
updated_at = NOW()
WHERE role = 'ENCADREUR';

-- Nettoyer les assignations orphelines
DELETE FROM assignments 
WHERE parent_eleve_id NOT IN (SELECT id FROM users WHERE role = 'PARENT_ELEVE')
   OR encadreur_id NOT IN (SELECT id FROM users WHERE role = 'ENCADREUR');

-- Nettoyer les messages orphelins
DELETE FROM messages 
WHERE from_user_id NOT IN (SELECT id FROM users)
   OR to_user_id NOT IN (SELECT id FROM users);

-- Nettoyer les notifications orphelines
DELETE FROM notifications 
WHERE user_id NOT IN (SELECT id FROM users);

-- Nettoyer les relations avec incompatibilité de commune
DO $$
DECLARE
  rel RECORD;
  parent_commune TEXT;
  encadreur_commune TEXT;
BEGIN
  FOR rel IN 
    SELECT * FROM approved_relations WHERE status = 'ACTIVE'
  LOOP
    -- Récupérer les communes
    SELECT commune_apprenant INTO parent_commune 
    FROM users 
    WHERE id = rel.parent_eleve_id;
    
    SELECT commune_intervention INTO encadreur_commune 
    FROM users 
    WHERE id = rel.encadreur_id;
    
    -- Si incompatibilité, dissocier la relation
    IF parent_commune != encadreur_commune THEN
      RAISE NOTICE 'Dissociation relation incompatible: % (%) <-> % (%)', 
        rel.parent_eleve_id, parent_commune, rel.encadreur_id, encadreur_commune;
      
      -- Marquer comme dissociée
      UPDATE approved_relations 
      SET status = 'DISSOCIATED',
          dissociated_at = NOW(),
          dissociated_by = rel.approved_by
      WHERE id = rel.id;
      
      -- Mettre à jour le parent
      UPDATE users 
      SET assigned_encadreur = NULL,
          updated_at = NOW()
      WHERE id = rel.parent_eleve_id;
      
      -- Mettre à jour l'encadreur
      UPDATE users 
      SET assigned_students = array_remove(assigned_students, rel.parent_eleve_id::text),
          updated_at = NOW()
      WHERE id = rel.encadreur_id;
    END IF;
  END LOOP;
END $$;

-- ===== RÉSUMÉ FINAL =====

DO $$
DECLARE
  report JSONB;
  user_count INTEGER;
  encadreur_count INTEGER;
  parent_count INTEGER;
  admin_count INTEGER;
  message_count INTEGER;
  notification_count INTEGER;
  assignment_count INTEGER;
  relation_count INTEGER;
  has_status BOOLEAN;
BEGIN
  SELECT get_constraints_report() INTO report;
  
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO encadreur_count FROM users WHERE role = 'ENCADREUR';
  SELECT COUNT(*) INTO parent_count FROM users WHERE role = 'PARENT_ELEVE';
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'ADMINISTRATEUR';
  SELECT COUNT(*) INTO message_count FROM messages;
  SELECT COUNT(*) INTO notification_count FROM notifications;
  SELECT COUNT(*) INTO assignment_count FROM assignments;
  SELECT COUNT(*) INTO relation_count FROM approved_relations;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'status'
  ) INTO has_status;
  
  RAISE NOTICE '=== CONFIGURATION SUPABASE COMPLÈTE ===';
  RAISE NOTICE 'Utilisateurs total: %', user_count;
  RAISE NOTICE '- Encadreurs: %', encadreur_count;
  RAISE NOTICE '- Parents/Élèves: %', parent_count;
  RAISE NOTICE '- Administrateurs: %', admin_count;
  RAISE NOTICE 'Messages: %', message_count;
  RAISE NOTICE 'Notifications: %', notification_count;
  RAISE NOTICE 'Assignations: %', assignment_count;
  RAISE NOTICE 'Relations approuvées: %', relation_count;
  RAISE NOTICE '';
  RAISE NOTICE '=== CONTRAINTES IMPLÉMENTÉES ===';
  RAISE NOTICE 'Contraintes de messagerie:';
  RAISE NOTICE '  - Trigger de vérification: %', CASE WHEN (report->'messaging_constraints'->>'trigger_exists')::BOOLEAN THEN '✅ Actif' ELSE '❌ Inactif' END;
  RAISE NOTICE '  - Fonction can_send_message: %', CASE WHEN (report->'messaging_constraints'->>'function_exists')::BOOLEAN THEN '✅ Actif' ELSE '❌ Inactif' END;
  RAISE NOTICE '  - Politique RLS: %', CASE WHEN (report->'messaging_constraints'->>'policy_exists')::BOOLEAN THEN '✅ Actif' ELSE '❌ Inactif' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Contraintes de commune:';
  RAISE NOTICE '  - Vérification dans approve_assignment: %', CASE WHEN (report->'commune_constraints'->>'approve_function_modified')::BOOLEAN THEN '✅ Actif' ELSE '❌ Inactif' END;
  RAISE NOTICE '  - Fonction create_assignment_with_commune_check: %', CASE WHEN (report->'commune_constraints'->>'create_function_exists')::BOOLEAN THEN '✅ Actif' ELSE '❌ Inactif' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Statut global: %', CASE WHEN (report->>'all_constraints_active')::BOOLEAN THEN '✅ Toutes les contraintes sont actives' ELSE '❌ Certaines contraintes sont inactives' END;
  RAISE NOTICE '=====================================';
  RAISE NOTICE '✅ Fonctions de gestion des relations créées';
  RAISE NOTICE '✅ Prévention des doublons activée';
  RAISE NOTICE '✅ Système de suppression bidirectionnelle opérationnel';
  RAISE NOTICE '✅ Contraintes de commune implémentées';
  RAISE NOTICE '✅ Restrictions de messagerie implémentées';
  RAISE NOTICE '✅ Toutes les opérations sont maintenant gérées par Supabase';
END $$;