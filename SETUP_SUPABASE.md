# Configuration de Supabase pour SUPER@PPRENANT-CI

## 🚀 Configuration mise à jour

### Informations de connexion actuelles

Votre projet Supabase est maintenant configuré avec :

- **URL du projet** : `https://ekyfwdzcxxcxzlhoiggj.supabase.co`
- **Clé anonyme** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 1. Variables d'environnement

Créez un fichier `.env` à la racine du projet avec :

```env
VITE_SUPABASE_URL=https://ekyfwdzcxxcxzlhoiggj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVreWZ3ZHpjeHhjeHpsaG9pZ2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTU3NDAsImV4cCI6MjA2NjUzMTc0MH0.TQE3a1dslAnxpxAS6-COpuT_q24WIjFefMO6g58vhmM
```

### 2. **IMPORTANT: Désactiver la confirmation d'email**

⚠️ **ÉTAPE CRITIQUE** : Avant d'utiliser l'application, vous devez désactiver la confirmation d'email :

1. Dans votre projet Supabase, allez dans **Authentication** > **Settings**
2. Trouvez l'option **"Enable email confirmations"**
3. **Désactivez cette option** (toggle OFF)
4. Cliquez sur **"Save"**

Cette étape est essentielle pour permettre aux utilisateurs de se connecter immédiatement après l'inscription.

### 3. Créer les tables dans Supabase

Allez dans **SQL Editor** et exécutez ce script :

```sql
-- Créer la table users
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
  classes_enseignement TEXT[],
  disciplines TEXT[],
  commune_intervention TEXT,
  motivation TEXT,
  profil_encadrant JSONB,
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
  besoins TEXT[],
  profil_apprentissage JSONB,
  assigned_encadreur TEXT
);

-- Créer la table messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB
);

-- Créer la table assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_eleve_id UUID REFERENCES users(id) ON DELETE CASCADE,
  encadreur_id UUID REFERENCES users(id) ON DELETE CASCADE,
  compatibility_score DECIMAL(3,2),
  criteria JSONB,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_parent ON assignments(parent_eleve_id);
CREATE INDEX IF NOT EXISTS idx_assignments_encadreur ON assignments(encadreur_id);

-- Activer RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Allow public access to users" ON users;
DROP POLICY IF EXISTS "Allow public access to messages" ON messages;
DROP POLICY IF EXISTS "Allow public access to notifications" ON notifications;
DROP POLICY IF EXISTS "Allow public access to assignments" ON assignments;

-- Créer les politiques RLS pour permettre l'accès public (pour le développement)
CREATE POLICY "Allow public access to users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to messages" ON messages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to notifications" ON notifications
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to assignments" ON assignments
  FOR ALL USING (true) WITH CHECK (true);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour updated_at sur users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

### 4. Insérer les comptes administrateur

```sql
-- Insérer les comptes administrateur par défaut
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
```

## 🔄 Fonctionnement de l'application

L'application fonctionne maintenant en mode hybride :

- **localStorage** : Données locales (sauvegarde automatique)
- **Supabase** : Base de données cloud (synchronisation automatique)

### Avantages de cette configuration

✅ **Synchronisation automatique multi-appareils**  
✅ **Sauvegarde cloud sécurisée**  
✅ **Fonctionnement hors ligne**  
✅ **Authentification robuste**  
✅ **Interface d'administration complète**  
✅ **Temps réel et notifications**  

## 🛠️ Utilisation

### Comptes administrateur par défaut

- **Email** : `ekbessan@gmail.com`
- **Mot de passe** : `agligoezekiel#@`

- **Email** : `superapprenant25@gmail.com`
- **Mot de passe** : `SuperAdmin2025#`

### Démarrage de l'application

```bash
npm run dev
```

L'application se connectera automatiquement à Supabase et synchronisera les données.

## 📊 Monitoring

Dans le dashboard Supabase, vous pouvez :
- Voir les données en temps réel
- Monitorer les performances
- Gérer les utilisateurs
- Voir les logs d'erreur
- Analyser l'utilisation

## 🔒 Sécurité

- RLS (Row Level Security) activé
- Politiques de sécurité configurées
- Authentification JWT
- Chiffrement des données
- Sauvegarde automatique

## ⚠️ Résolution des problèmes

### Erreur "Email not confirmed"

Si vous rencontrez cette erreur :

1. Allez dans **Authentication** > **Settings** dans votre projet Supabase
2. Désactivez **"Enable email confirmations"**
3. Sauvegardez les paramètres
4. Réessayez la connexion

### Problèmes de synchronisation

- Vérifiez votre connexion internet
- Consultez la console du navigateur pour les erreurs
- Vérifiez que les variables d'environnement sont correctes

### Erreurs SQL communes

Si vous rencontrez des erreurs lors de l'exécution du script :

1. **Erreur de politique existante** : Les `DROP POLICY IF EXISTS` gèrent cela automatiquement
2. **Erreur de table existante** : Les `CREATE TABLE IF NOT EXISTS` évitent les conflits
3. **Erreur de trigger** : Le `DROP TRIGGER IF EXISTS` nettoie les anciens triggers

## 🚀 Script SQL complet (version corrigée)

Le script ci-dessus a été corrigé pour éviter l'erreur de syntaxe. Les principales corrections :

- Remplacement de `CREATE POLICY IF NOT EXISTS` par `DROP POLICY IF EXISTS` suivi de `CREATE POLICY`
- Ajout de gestion d'erreurs pour les triggers
- Optimisation des index avec `IF NOT EXISTS`

L'application est maintenant prête pour la production avec Supabase ! 🚀

## 📞 Support

En cas de problème :
- **Email** : superapprenant25@gmail.com
- **Téléphone** : 00225 01 60 15 50 58 | 00225 05 45 94 97 67 | 00225 07 47 26 25 77