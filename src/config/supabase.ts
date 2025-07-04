import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Ensure URL doesn't have trailing slash
const cleanUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;

// Create Supabase client with proper configuration
export const supabase = createClient(cleanUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
});

// Test Supabase connectivity
export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Simple connectivity test with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error) {
      return { 
        success: false, 
        error: `Supabase error: ${error.message}` 
      };
    }

    return { success: true };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Connection timeout to Supabase (10s)'
      };
    }
    
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      return {
        success: false,
        error: 'Cannot connect to Supabase. Please check your internet connection and Supabase configuration.'
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Unknown connection error'
    };
  }
};

// Get Supabase status
export const getSupabaseStatus = async (): Promise<{
  isOnline: boolean;
  url: string;
  hasCredentials: boolean;
  lastCheck: Date;
  error?: string;
}> => {
  const status = {
    isOnline: false,
    url: cleanUrl,
    hasCredentials: true,
    lastCheck: new Date(),
    error: undefined as string | undefined
  };

  try {
    const testResult = await testSupabaseConnection();
    status.isOnline = testResult.success;
    if (!testResult.success) {
      status.error = testResult.error;
    }
  } catch (error: any) {
    status.error = error.message;
  }

  return status;
};

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          role: 'ENCADREUR' | 'PARENT_ELEVE' | 'ADMINISTRATEUR';
          created_at: string;
          updated_at: string;
          // Champs spécifiques selon le rôle
          nom?: string;
          prenoms?: string;
          telephone?: string;
          genre?: string;
          commune_residence?: string;
          dernier_diplome?: string;
          experience_professionnelle?: boolean;
          classes_enseignement?: string[];
          disciplines?: string[];
          commune_intervention?: string;
          motivation?: string;
          profil_encadrant?: any;
          assigned_students?: string[];
          max_students?: number;
          // Champs Parent/Élève
          nom_parent?: string;
          prenoms_parent?: string;
          profession?: string;
          pack_choisi?: string;
          nom_apprenant?: string;
          prenoms_apprenant?: string;
          age_apprenant?: number;
          commune_apprenant?: string;
          classe_apprenant?: string;
          besoins?: string[];
          profil_apprentissage?: any;
          assigned_encadreur?: string;
          profile_photo?: string;
        };
        Insert: {
          id?: string;
          username: string;
          email: string;
          role: 'ENCADREUR' | 'PARENT_ELEVE' | 'ADMINISTRATEUR';
          created_at?: string;
          updated_at?: string;
          nom?: string;
          prenoms?: string;
          telephone?: string;
          genre?: string;
          commune_residence?: string;
          dernier_diplome?: string;
          experience_professionnelle?: boolean;
          classes_enseignement?: string[];
          disciplines?: string[];
          commune_intervention?: string;
          motivation?: string;
          profil_encadrant?: any;
          assigned_students?: string[];
          max_students?: number;
          nom_parent?: string;
          prenoms_parent?: string;
          profession?: string;
          pack_choisi?: string;
          nom_apprenant?: string;
          prenoms_apprenant?: string;
          age_apprenant?: number;
          commune_apprenant?: string;
          classe_apprenant?: string;
          besoins?: string[];
          profil_apprentissage?: any;
          assigned_encadreur?: string;
          profile_photo?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          role?: 'ENCADREUR' | 'PARENT_ELEVE' | 'ADMINISTRATEUR';
          created_at?: string;
          updated_at?: string;
          nom?: string;
          prenoms?: string;
          telephone?: string;
          genre?: string;
          commune_residence?: string;
          dernier_diplome?: string;
          experience_professionnelle?: boolean;
          classes_enseignement?: string[];
          disciplines?: string[];
          commune_intervention?: string;
          motivation?: string;
          profil_encadrant?: any;
          assigned_students?: string[];
          max_students?: number;
          nom_parent?: string;
          prenoms_parent?: string;
          profession?: string;
          pack_choisi?: string;
          nom_apprenant?: string;
          prenoms_apprenant?: string;
          age_apprenant?: number;
          commune_apprenant?: string;
          classe_apprenant?: string;
          besoins?: string[];
          profil_apprentissage?: any;
          assigned_encadreur?: string;
          profile_photo?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          subject: string;
          content: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          subject: string;
          content: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_user_id?: string;
          to_user_id?: string;
          subject?: string;
          content?: string;
          read?: boolean;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          read: boolean;
          created_at: string;
          data?: any;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          read?: boolean;
          created_at?: string;
          data?: any;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          read?: boolean;
          created_at?: string;
          data?: any;
        };
      };
      assignments: {
        Row: {
          id: string;
          parent_eleve_id: string;
          encadreur_id: string;
          compatibility_score: number;
          criteria: any;
          assigned_by: string;
          assigned_at: string;
          status: string;
        };
        Insert: {
          id?: string;
          parent_eleve_id: string;
          encadreur_id: string;
          compatibility_score: number;
          criteria: any;
          assigned_by: string;
          assigned_at?: string;
          status?: string;
        };
        Update: {
          id?: string;
          parent_eleve_id?: string;
          encadreur_id?: string;
          compatibility_score?: number;
          criteria?: any;
          assigned_by?: string;
          assigned_at?: string;
          status?: string;
        };
      };
      approved_relations: {
        Row: {
          id: string;
          parent_eleve_id: string;
          encadreur_id: string;
          approved_at: string;
          approved_by: string;
          dissociated_at?: string;
          dissociated_by?: string;
          compatibility_score: number;
          criteria: any;
          status: string;
        };
        Insert: {
          id?: string;
          parent_eleve_id: string;
          encadreur_id: string;
          approved_at?: string;
          approved_by: string;
          dissociated_at?: string;
          dissociated_by?: string;
          compatibility_score: number;
          criteria: any;
          status?: string;
        };
        Update: {
          id?: string;
          parent_eleve_id?: string;
          encadreur_id?: string;
          approved_at?: string;
          approved_by?: string;
          dissociated_at?: string;
          dissociated_by?: string;
          compatibility_score?: number;
          criteria?: any;
          status?: string;
        };
      };
    };
  };
}

// Initialisation et test automatique au démarrage avec gestion d'erreurs et mode gracieux
let initializationAttempted = false;

export const initializeSupabase = async () => {
  if (initializationAttempted) return;
  initializationAttempted = true;

  try {
    console.log('🚀 Initialisation Supabase...');
    const status = await getSupabaseStatus();
    if (status.isOnline) {
      console.log('✅ Supabase connecté et opérationnel');
    } else {
      console.warn('⚠️ Supabase non disponible:', status.error);
      console.warn('📱 L\'application fonctionnera en mode local uniquement');
    }
  } catch (error) {
    console.warn('⚠️ Erreur lors de l\'initialisation Supabase:', error);
    console.warn('📱 L\'application fonctionnera en mode local uniquement');
  }
};

// Initialisation différée pour éviter les blocages - augmenté à 2 secondes pour laisser plus de temps
setTimeout(() => {
  initializeSupabase().catch(error => {
    console.warn('⚠️ Échec de l\'initialisation Supabase:', error);
  });
}, 2000);