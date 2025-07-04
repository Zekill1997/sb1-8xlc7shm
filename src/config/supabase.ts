import { createClient } from '@supabase/supabase-js';

// Configuration Supabase avec les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Configuration Supabase:', {
  url: supabaseUrl ? 'Définie' : 'Manquante',
  key: supabaseAnonKey ? 'Définie' : 'Manquante',
  urlValue: supabaseUrl,
  keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Variables d\'environnement Supabase manquantes. Vérifiez votre fichier .env');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Définie' : 'Manquante');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Définie' : 'Manquante');
}

// Ensure URL doesn't have trailing slash et validation
const cleanUrl = supabaseUrl ? (supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl) : '';

// Configuration du client Supabase avec gestion d'erreurs renforcée
export const supabase = createClient(cleanUrl, supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'superapprenant-ci@1.0.0'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Test de connectivité Supabase avec gestion d'erreurs améliorée et timeout augmenté
export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔍 Test de connectivité Supabase...');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return { 
        success: false, 
        error: 'Variables d\'environnement Supabase manquantes' 
      };
    }

    // Validate URL format
    try {
      new URL(supabaseUrl);
    } catch {
      return {
        success: false,
        error: 'URL Supabase invalide'
      };
    }

    // Test simple de connectivité avec timeout augmenté (10 secondes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        console.error('❌ Erreur test Supabase:', error);
        return { 
          success: false, 
          error: `Erreur Supabase: ${error.message}` 
        };
      }

      console.log('✅ Connexion Supabase réussie');
      return { success: true };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return {
          success: false,
          error: 'Timeout de connexion à Supabase (10s)'
        };
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    console.error('❌ Erreur test connectivité Supabase:', error);
    
    // Messages d'erreur plus spécifiques
    let errorMessage = error.message;
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      errorMessage = 'Impossible de se connecter à Supabase. Vérifiez votre connexion internet et que l\'instance Supabase est accessible.';
    } else if (error.message.includes('Timeout') || error.name === 'AbortError') {
      errorMessage = 'Timeout de connexion à Supabase. Le service pourrait être temporairement indisponible.';
    } else if (error.message.includes('NetworkError')) {
      errorMessage = 'Erreur réseau lors de la connexion à Supabase.';
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
};

// Fonction pour vérifier le statut de Supabase avec fallback gracieux
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
    hasCredentials: !!(supabaseUrl && supabaseAnonKey),
    lastCheck: new Date(),
    error: undefined as string | undefined
  };

  if (!status.hasCredentials) {
    status.error = 'Variables d\'environnement Supabase manquantes';
    return status;
  }

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

// Types pour la base de données
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