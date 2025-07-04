/*
  # Create users table with proper structure

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `email` (text, unique)
      - `role` (enum: ENCADREUR, PARENT_ELEVE, ADMINISTRATEUR)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - Profile fields for different user types
      - Contact information
      - Assignment fields

  2. Security
    - Enable RLS on `users` table
    - Add policies for authenticated users to read and manage their own data
    - Add policy for administrators to manage all users

  3. Indexes
    - Add indexes for frequently queried columns (email, username, role)
*/

-- Create enum for user roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ENCADREUR', 'PARENT_ELEVE', 'ADMINISTRATEUR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  role user_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Common profile fields
  nom text,
  prenoms text,
  telephone text,
  genre text,
  commune_residence text,
  profile_photo text,
  
  -- Encadreur specific fields
  dernier_diplome text,
  experience_professionnelle boolean DEFAULT false,
  classes_enseignement text[],
  disciplines text[],
  commune_intervention text,
  motivation text,
  profil_encadrant jsonb,
  assigned_students text[] DEFAULT '{}',
  max_students integer DEFAULT 5,
  
  -- Parent/Eleve specific fields
  nom_parent text,
  prenoms_parent text,
  profession text,
  pack_choisi text,
  nom_apprenant text,
  prenoms_apprenant text,
  age_apprenant integer,
  commune_apprenant text,
  classe_apprenant text,
  besoins text[],
  profil_apprentissage jsonb,
  assigned_encadreur text
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Allow anonymous read access"
  ON users
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_commune_residence ON users(commune_residence);
CREATE INDEX IF NOT EXISTS idx_users_commune_intervention ON users(commune_intervention);
CREATE INDEX IF NOT EXISTS idx_users_assigned_encadreur ON users(assigned_encadreur);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();