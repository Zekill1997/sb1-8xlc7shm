import { supabase } from '../config/supabase';
import { testSupabaseConnection } from '../config/supabase';
import { UserService, MessageService, NotificationService, AssignmentService } from './supabaseService';
import { localDB } from './localDatabase';
import { User, Encadreur, ParentEleve, Administrateur } from '../types';

// Service principal de base de données avec Supabase comme source de vérité
export class DatabaseService {
  private static instance: DatabaseService;
  private isOnline: boolean = navigator.onLine;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: Date = new Date();
  private isSyncing: boolean = false;
  private syncInProgress: boolean = false;
  private syncQueue: Array<() => Promise<void>> = [];
  private lastRelationsData: any[] = [];
  private lastAssignmentsData: any[] = [];
  
  // Cache pour les données pendant la synchronisation
  private dataCache: {
    users: User[];
    messages: any[];
    notifications: any[];
    assignments: any[];
    relations: any[];
    lastCacheTime: Date;
  } = {
    users: [],
    messages: [],
    notifications: [],
    assignments: [],
    relations: [],
    lastCacheTime: new Date()
  };

  private constructor() {
    this.initializeService();
    this.startAutoSync();
    this.setupEventListeners();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async initializeService() {
    console.log('🚀 Initialisation service base de données - Supabase comme source de vérité');
    
    // Vérifier la connectivité Supabase
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (!error) {
        console.log('✅ Connexion Supabase établie - Mode synchronisation complète');
        this.isOnline = true;
        await this.performFullSync();
      } else {
        console.warn('⚠️ Supabase non disponible, mode local uniquement:', error.message);
        this.isOnline = false;
      }
    } catch (error) {
      console.warn('⚠️ Erreur connexion Supabase, mode local:', error);
      this.isOnline = false;
    }
  }

  private setupEventListeners() {
    // Écouter les changements de connectivité
    window.addEventListener('online', () => {
      console.log('🌐 Connexion rétablie - Synchronisation immédiate');
      this.isOnline = true;
      this.performFullSync();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Hors ligne - Mode local activé');
      this.isOnline = false;
    });

    // Synchroniser lors du focus de la fenêtre
    window.addEventListener('focus', () => {
      if (this.isOnline && !this.isSyncing) {
        this.performFullSync();
      }
    });
  }

  private startAutoSync() {
    // Synchronisation automatique toutes les 5 secondes (réduit de 15 à 5 secondes)
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.performFullSync();
      }
    }, 5000); // Réduit à 5 secondes pour une actualisation plus rapide
  }

  // Synchronisation complète avec Supabase comme source de vérité
  private async performFullSync() {
    if (this.syncInProgress) {
      console.log('⏳ Synchronisation déjà en cours, ajout à la file d\'attente');
      return new Promise<void>((resolve) => {
        this.syncQueue.push(async () => {
          await this.doSync();
          resolve();
        });
      });
    }

    this.syncInProgress = true;
    try {
      await this.doSync();
      
      // Traiter la file d'attente
      while (this.syncQueue.length > 0) {
        const nextSync = this.syncQueue.shift();
        if (nextSync) {
          await nextSync();
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async doSync() {
    if (this.isSyncing) {
      console.log('⏳ Synchronisation ignorée (en cours)');
      return;
    }

    try {
      this.isSyncing = true;
      console.log('🔄 Synchronisation complète avec Supabase...');
      
      // Utiliser le cache pendant la synchronisation pour éviter la disparition des données
      this.updateCacheFromLocal();
      
      // Synchroniser de Supabase vers local (Supabase = source de vérité)
      await this.syncFromSupabaseToLocal();
      
      // Mettre à jour le cache avec les nouvelles données
      this.updateCacheFromLocal();
      
      this.lastSyncTime = new Date();
      console.log('✅ Synchronisation complète terminée avec succès');
      
      // Notifier les composants
      window.dispatchEvent(new CustomEvent('databaseSync', { 
        detail: { 
          timestamp: this.lastSyncTime,
          success: true 
        } 
      }));
    } catch (error) {
      console.error('❌ Erreur synchronisation complète:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Mettre à jour le cache avec les données locales actuelles
  private updateCacheFromLocal() {
    try {
      this.dataCache = {
        users: localDB.getAllUsers(),
        messages: localDB.getAllMessages(),
        notifications: localDB.getAllNotifications(),
        assignments: localDB.getAssignments(),
        relations: localDB.getApprovedRelations(),
        lastCacheTime: new Date()
      };
    } catch (error) {
      console.error('❌ Erreur mise à jour cache:', error);
    }
  }

  // Synchroniser de Supabase vers localStorage (Supabase = source de vérité)
  private async syncFromSupabaseToLocal() {
    try {
      console.log('📥 Synchronisation Supabase → Local (source de vérité)...');
      
      // Test de connectivité avant synchronisation
      const connectionTest = await testSupabaseConnection();

      if (!connectionTest.success) {
        console.warn('⚠️ Supabase non accessible, synchronisation ignorée:', connectionTest.error);
        this.isOnline = false;
        return;
      }

      this.isOnline = true;
      
      // Récupérer tous les utilisateurs de Supabase
      const supabaseUsers = await UserService.getAllUsers();
      
      if (supabaseUsers.length > 0) {
        // Remplacer complètement les données locales par celles de Supabase
        const currentLocalData = localDB.exportDatabase();
        const localData = JSON.parse(currentLocalData);
        
        // Supabase devient la source de vérité
        localData.users = supabaseUsers;
        localData.metadata.lastUpdated = new Date().toISOString();
        localData.metadata.lastSync = new Date().toISOString();
        
        // Importer les données de Supabase
        const importResult = localDB.importDatabase(JSON.stringify(localData));
        
        if (importResult.success) {
          console.log('✅ Synchronisation Supabase → Local réussie:', supabaseUsers.length, 'utilisateurs');
        } else {
          console.error('❌ Erreur import local:', importResult.error);
        }
      }
      
      // Vérifier et réparer les relations incohérentes
      try {
        const repairResult = await AssignmentService.checkAndRepairRelations();
        if (repairResult.success) {
          console.log('✅ Vérification et réparation des relations terminée:', repairResult.fixed, 'relations réparées');
        }
      } catch (repairError) {
        console.warn('⚠️ Erreur lors de la réparation des relations:', repairError);
      }

      // Vérifier et réparer les assignations incohérentes
      try {
        const repairResult = await AssignmentService.checkAndRepairAssignments();
        if (repairResult.success) {
          console.log('✅ Vérification et réparation des assignations terminée:', repairResult.fixed, 'assignations réparées');
        }
      } catch (repairError) {
        console.warn('⚠️ Erreur lors de la réparation des assignations:', repairError);
      }
    } catch (error) {
      console.error('❌ Erreur sync Supabase → Local:', error);
      this.isOnline = false;
    }
  }

  // === MÉTHODES PUBLIQUES POUR L'APPLICATION ===

  // Créer un utilisateur (Supabase d'abord, puis local)
  public async createUser(userData: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('👤 Création utilisateur - Supabase d\'abord:', userData.email);
      
      // 1. Créer dans Supabase d'abord (source de vérité)
      if (this.isOnline) {
        const supabaseResult = await UserService.createUser(userData);
        if (supabaseResult.success) {
          console.log('✅ Utilisateur créé dans Supabase');
          
          // 2. Synchroniser vers local
          const localResult = localDB.createUser(supabaseResult.user!);
          if (localResult.success) {
            console.log('✅ Utilisateur synchronisé vers local');
          }
          
          // Mettre à jour le cache
          this.updateCacheFromLocal();
          
          // Déclencher une synchronisation complète
          setTimeout(() => this.performFullSync(), 500);
          
          return supabaseResult;
        } else {
          console.error('❌ Échec création Supabase:', supabaseResult.error);
          return supabaseResult;
        }
      } else {
        // Mode hors ligne - créer en local seulement
        console.log('📴 Mode hors ligne - création locale uniquement');
        const result = localDB.createUser(userData);
        
        // Mettre à jour le cache
        this.updateCacheFromLocal();
        
        return result;
      }
    } catch (error: any) {
      console.error('❌ Erreur création utilisateur:', error);
      return { success: false, error: error.message };
    }
  }

  // Connexion utilisateur (Supabase d'abord)
  public async loginUser(email: string, password: string, role?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🔐 Connexion - Supabase d\'abord:', email, 'Role:', role);
      
      // 1. Essayer la connexion Supabase d'abord
      if (this.isOnline) {
        const supabaseResult = await UserService.signIn(email, password, role);
        if (supabaseResult.success && supabaseResult.user) {
          console.log('✅ Connexion Supabase réussie');
          
          // Synchroniser vers local
          localDB.updateUser(supabaseResult.user.id, supabaseResult.user);
          
          // Mettre à jour le cache
          this.updateCacheFromLocal();
          
          return supabaseResult;
        } else {
          console.warn('⚠️ Échec connexion Supabase:', supabaseResult.error);
          return supabaseResult;
        }
      } else {
        // Mode hors ligne - utiliser local
        console.log('📴 Mode hors ligne - connexion locale');
        const localUser = localDB.getUserByEmail(email);
        if (!localUser) {
          return { success: false, error: 'Utilisateur non trouvé' };
        }

        if (role && localUser.role !== role) {
          return { success: false, error: 'Utilisateur non trouvé pour ce rôle' };
        }

        return { success: true, user: localUser };
      }
    } catch (error: any) {
      console.error('❌ Erreur connexion:', error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer tous les utilisateurs (avec cache pendant la synchronisation)
  public async getAllUsers(): Promise<User[]> {
    try {
      // Si une synchronisation est en cours, utiliser le cache
      if (this.isSyncing) {
        console.log('🔄 Utilisation du cache pour les utilisateurs pendant la synchronisation');
        return this.dataCache.users;
      }
      
      // Synchroniser d'abord si en ligne
      if (this.isOnline && !this.isSyncing) {
        await this.performFullSync();
      }
      
      return localDB.getAllUsers();
    } catch (error) {
      console.error('❌ Erreur récupération utilisateurs:', error);
      
      // En cas d'erreur, utiliser le cache si disponible
      if (this.dataCache.users.length > 0) {
        console.log('🔄 Utilisation du cache pour les utilisateurs après erreur');
        return this.dataCache.users;
      }
      
      return localDB.getAllUsers(); // Fallback local
    }
  }

  // Mettre à jour un utilisateur (Supabase d'abord)
  public async updateUser(id: string, userData: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🔄 Mise à jour utilisateur - Supabase d\'abord:', id);
      
      // 1. Mettre à jour dans Supabase d'abord
      if (this.isOnline) {
        const supabaseResult = await UserService.updateUser(id, userData);
        if (supabaseResult.success) {
          console.log('✅ Utilisateur mis à jour dans Supabase');
          
          // 2. Synchroniser vers local
          const localResult = localDB.updateUser(id, supabaseResult.user!);
          if (localResult.success) {
            console.log('✅ Utilisateur synchronisé vers local');
          }
          
          // Mettre à jour le cache
          this.updateCacheFromLocal();
          
          // Déclencher une synchronisation
          setTimeout(() => this.performFullSync(), 500);
          
          return supabaseResult;
        } else {
          console.error('❌ Échec mise à jour Supabase:', supabaseResult.error);
          return supabaseResult;
        }
      } else {
        // Mode hors ligne - mettre à jour en local
        console.log('📴 Mode hors ligne - mise à jour locale');
        const result = localDB.updateUser(id, userData);
        
        // Mettre à jour le cache
        this.updateCacheFromLocal();
        
        return result;
      }
    } catch (error: any) {
      console.error('❌ Erreur mise à jour utilisateur:', error);
      return { success: false, error: error.message };
    }
  }

  // Supprimer un utilisateur (Supabase d'abord)
  public async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Suppression utilisateur - Supabase d\'abord:', id);
      
      // 1. Supprimer de Supabase d'abord
      if (this.isOnline) {
        const supabaseResult = await UserService.deleteUser(id);
        if (supabaseResult.success) {
          console.log('✅ Utilisateur supprimé de Supabase');
          
          // 2. Supprimer du local
          const localResult = localDB.deleteUser(id);
          if (localResult.success) {
            console.log('✅ Utilisateur supprimé du local');
          }
          
          // Mettre à jour le cache
          this.updateCacheFromLocal();
          
          return { success: true };
        } else {
          console.error('❌ Échec suppression Supabase:', supabaseResult.error);
          return supabaseResult;
        }
      } else {
        // Mode hors ligne - supprimer du local
        console.log('📴 Mode hors ligne - suppression locale');
        const result = localDB.deleteUser(id);
        
        // Mettre à jour le cache
        this.updateCacheFromLocal();
        
        return result;
      }
    } catch (error: any) {
      console.error('❌ Erreur suppression utilisateur:', error);
      return { success: false, error: error.message };
    }
  }

  // Supprimer tous les utilisateurs non-administrateurs (Supabase d'abord)
  public async deleteAllNonAdminUsers(): Promise<{ success: boolean; deleted: number; error?: string }> {
    try {
      console.log('🗑️ Suppression massive - Supabase d\'abord');
      
      if (!this.isOnline) {
        console.log('📴 Mode hors ligne - suppression locale uniquement');
        // En mode hors ligne, utiliser la méthode locale
        const allUsers = localDB.getAllUsers();
        const nonAdminUsers = allUsers.filter(u => u.role !== 'ADMINISTRATEUR');
        
        let deletedCount = 0;
        for (const user of nonAdminUsers) {
          const result = localDB.deleteUser(user.id);
          if (result.success) {
            deletedCount++;
          }
        }
        
        // Mettre à jour le cache
        this.updateCacheFromLocal();
        
        return { success: true, deleted: deletedCount };
      }

      // Mode en ligne - supprimer de Supabase d'abord
      const allUsers = await UserService.getAllUsers();
      const nonAdminUsers = allUsers.filter(u => u.role !== 'ADMINISTRATEUR');
      
      console.log(`📊 Utilisateurs à supprimer de Supabase: ${nonAdminUsers.length}`);
      
      let deletedCount = 0;
      
      // Supprimer chaque utilisateur de Supabase
      for (const user of nonAdminUsers) {
        try {
          const result = await UserService.deleteUser(user.id);
          if (result.success) {
            deletedCount++;
            console.log(`✅ Supprimé de Supabase: ${user.email}`);
          } else {
            console.error(`❌ Erreur suppression Supabase ${user.email}:`, result.error);
          }
        } catch (error) {
          console.error(`❌ Erreur suppression Supabase ${user.email}:`, error);
        }
      }
      
      // Synchroniser vers local
      await this.performFullSync();
      
      console.log(`✅ Suppression massive Supabase terminée: ${deletedCount} utilisateurs`);
      return { success: true, deleted: deletedCount };
      
    } catch (error: any) {
      console.error('❌ Erreur suppression massive:', error);
      return { success: false, deleted: 0, error: error.message };
    }
  }

  // Récupérer toutes les assignations avec détails (avec cache pendant la synchronisation)
  public async getAssignmentsWithDetails(): Promise<any[]> {
    try {
      // Si une synchronisation est en cours, utiliser le cache
      if (this.isSyncing) {
        console.log('🔄 Utilisation du cache pour les assignations détaillées pendant la synchronisation');
        return this.dataCache.assignments;
      }
      
      console.log('📋 Récupération assignations détaillées - Supabase d\'abord');
      
      // Synchroniser d'abord si en ligne
      if (this.isOnline && !this.isSyncing) {
        try {
          // Utiliser AssignmentService pour récupérer de Supabase avec détails
          const supabaseAssignments = await AssignmentService.getAllAssignmentsWithDetails();
          console.log('✅ Assignations détaillées récupérées de Supabase:', supabaseAssignments.length);
          
          // Mettre à jour le cache
          this.dataCache.assignments = supabaseAssignments;
          
          return supabaseAssignments;
        } catch (error) {
          console.warn('⚠️ Erreur Supabase, fallback local:', error);
          this.isOnline = false;
        }
      }
      
      // Fallback local
      console.log('📴 Mode hors ligne - assignations locales');
      const localAssignments = localDB.getAssignments();
      
      // Mettre à jour le cache
      this.dataCache.assignments = localAssignments;
      
      return localAssignments;
    } catch (error) {
      console.error('❌ Erreur récupération assignations détaillées:', error);
      
      // En cas d'erreur, utiliser le cache si disponible
      if (this.dataCache.assignments.length > 0) {
        console.log('🔄 Utilisation du cache pour les assignations après erreur');
        return this.dataCache.assignments;
      }
      
      return localDB.getAssignments(); // Fallback local
    }
  }

  // Récupérer toutes les assignations (avec cache pendant la synchronisation)
  public async getAssignments(): Promise<any[]> {
    try {
      // Si une synchronisation est en cours, utiliser le cache
      if (this.isSyncing) {
        console.log('🔄 Utilisation du cache pour les assignations pendant la synchronisation');
        return this.dataCache.assignments.length > 0 ? this.dataCache.assignments : this.lastAssignmentsData;
      }
      
      console.log('📋 Récupération assignations - Supabase d\'abord');
      
      // Synchroniser d'abord si en ligne
      if (this.isOnline && !this.isSyncing) {
        try {
          // Utiliser AssignmentService pour récupérer de Supabase
          const supabaseAssignments = await AssignmentService.getAllAssignmentsStandard();
          console.log('✅ Assignations récupérées de Supabase:', supabaseAssignments.length);
          
          // Mettre à jour le cache et le dernier résultat
          this.dataCache.assignments = supabaseAssignments;
          this.lastAssignmentsData = supabaseAssignments;
          
          return supabaseAssignments;
        } catch (error) {
          console.warn('⚠️ Erreur Supabase, fallback local:', error);
          this.isOnline = false;
        }
      }
      
      // Fallback local
      console.log('📴 Mode hors ligne - assignations locales');
      const localAssignments = localDB.getAssignments();
      
      // Mettre à jour le cache et le dernier résultat
      this.dataCache.assignments = localAssignments;
      this.lastAssignmentsData = localAssignments;
      
      return localAssignments;
    } catch (error) {
      console.error('❌ Erreur récupération assignations:', error);
      
      // En cas d'erreur, utiliser le cache si disponible
      if (this.dataCache.assignments.length > 0) {
        console.log('🔄 Utilisation du cache pour les assignations après erreur');
        return this.dataCache.assignments;
      }
      
      if (this.lastAssignmentsData.length > 0) {
        console.log('🔄 Utilisation du dernier résultat pour les assignations après erreur');
        return this.lastAssignmentsData;
      }
      
      return localDB.getAssignments(); // Fallback local
    }
  }

  // Récupérer toutes les relations approuvées (avec cache pendant la synchronisation)
  public async getApprovedRelations(): Promise<any[]> {
    try {
      // Si une synchronisation est en cours, utiliser le cache
      if (this.isSyncing) {
        console.log('🔄 Utilisation du cache pour les relations pendant la synchronisation');
        return this.dataCache.relations.length > 0 ? this.dataCache.relations : this.lastRelationsData;
      }
      
      console.log('✅ Récupération relations approuvées - Supabase d\'abord');
      
      // Synchroniser d'abord si en ligne
      if (this.isOnline && !this.isSyncing) {
        try {
          // Utiliser AssignmentService pour récupérer de Supabase avec détails
          const supabaseRelations = await AssignmentService.getApprovedRelations();
          console.log('✅ Relations approuvées récupérées de Supabase:', supabaseRelations.length);
          
          // Mettre à jour le cache et le dernier résultat
          this.dataCache.relations = supabaseRelations;
          this.lastRelationsData = supabaseRelations;
          
          return supabaseRelations;
        } catch (error) {
          console.warn('⚠️ Erreur Supabase, fallback local:', error);
          this.isOnline = false;
        }
      }
      
      // Fallback local
      console.log('📴 Mode hors ligne - relations approuvées locales');
      const localRelations = localDB.getApprovedRelations();
      
      // Mettre à jour le cache et le dernier résultat
      this.dataCache.relations = localRelations;
      this.lastRelationsData = localRelations;
      
      return localRelations;
    } catch (error) {
      console.error('❌ Erreur récupération relations approuvées:', error);
      
      // En cas d'erreur, utiliser le cache si disponible
      if (this.dataCache.relations.length > 0) {
        console.log('🔄 Utilisation du cache pour les relations après erreur');
        return this.dataCache.relations;
      }
      
      if (this.lastRelationsData.length > 0) {
        console.log('🔄 Utilisation du dernier résultat pour les relations après erreur');
        return this.lastRelationsData;
      }
      
      return localDB.getApprovedRelations(); // Fallback local
    }
  }

  // Approuver une assignation (Supabase d'abord)
  public async approveAssignment(assignmentId: string, approvedBy: string = ''): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('✅ Approbation assignation - Supabase d\'abord:', assignmentId, 'par:', approvedBy);
      
      // Si approvedBy n'est pas fourni, utiliser un ID par défaut
      const effectiveApprovedBy = approvedBy || '550e8400-e29b-41d4-a716-446655440001'; // ID admin par défaut
      
      if (this.isOnline) {
        // Utiliser la fonction Supabase pour approuver
        const result = await AssignmentService.approveAssignment(assignmentId, effectiveApprovedBy);
        
        if (result.success) {
          console.log('✅ Assignation approuvée dans Supabase');
          
          // Synchroniser vers local
          await this.performFullSync();
          
          return { success: true };
        } else {
          console.error('❌ Erreur approbation Supabase:', result.error);
          return result;
        }
      } else {
        // Mode hors ligne - utiliser local
        console.log('📴 Mode hors ligne - approbation locale');
        const result = localDB.approveAssignment(assignmentId);
        
        // Mettre à jour le cache
        this.updateCacheFromLocal();
        
        return result;
      }
    } catch (error: any) {
      console.error('❌ Erreur approbation assignation:', error);
      return { success: false, error: error.message };
    }
  }

  // Dissocier une relation (Supabase d'abord)
  public async dissociateRelation(parentEleveId: string, encadreurId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💔 Dissociation relation - Supabase d\'abord:', parentEleveId, '<-X->', encadreurId);
      
      if (this.isOnline) {
        // Utiliser la fonction Supabase pour dissocier
        const result = await AssignmentService.dissociateRelation(parentEleveId, encadreurId);
        
        if (result.success) {
          console.log('✅ Relation dissociée dans Supabase');
          
          // Synchroniser vers local
          await this.performFullSync();
          
          return { success: true };
        } else {
          console.error('❌ Erreur dissociation Supabase:', result.error);
          return result;
        }
      } else {
        // Mode hors ligne - utiliser local
        console.log('📴 Mode hors ligne - dissociation locale');
        const result = localDB.dissociateRelation(parentEleveId, encadreurId);
        
        // Mettre à jour le cache
        this.updateCacheFromLocal();
        
        return result;
      }
    } catch (error: any) {
      console.error('❌ Erreur dissociation relation:', error);
      return { success: false, error: error.message };
    }
  }

  // Créer une assignation avec vérification de commune
  public async createAssignmentWithCommuneCheck(
    parentEleveId: string, 
    encadreurId: string, 
    compatibilityScore: number, 
    criteria: any, 
    assignedBy: string
  ): Promise<{ success: boolean; assignmentId?: string; error?: string }> {
    try {
      console.log('🔗 Création assignation avec vérification commune:', parentEleveId, '<->', encadreurId);
      
      if (this.isOnline) {
        // Utiliser la fonction Supabase pour créer avec vérification de commune
        const result = await AssignmentService.createAssignmentWithCommuneCheck(
          parentEleveId,
          encadreurId,
          compatibilityScore,
          criteria,
          assignedBy
        );
        
        if (result.success) {
          console.log('✅ Assignation créée dans Supabase avec vérification de commune');
          
          // Synchroniser vers local
          await this.performFullSync();
          
          return result;
        } else {
          console.error('❌ Erreur création assignation Supabase:', result.error);
          return result;
        }
      } else {
        // Mode hors ligne - utiliser local
        console.log('📴 Mode hors ligne - création locale');
        const result = localDB.createAssignment(parentEleveId, encadreurId, compatibilityScore, criteria, assignedBy);
        
        // Mettre à jour le cache
        this.updateCacheFromLocal();
        
        return result;
      }
    } catch (error: any) {
      console.error('❌ Erreur création assignation:', error);
      return { success: false, error: error.message };
    }
  }

  // Envoyer un message (Supabase d'abord)
  public async sendMessage(fromUserId: string, toUserId: string, subject: string, content: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('📧 Envoi message - Supabase d\'abord');
      
      if (this.isOnline) {
        // Envoyer dans Supabase d'abord
        const supabaseResult = await MessageService.sendMessage(fromUserId, toUserId, subject, content);
        if (supabaseResult.success) {
          console.log('✅ Message envoyé dans Supabase');
          
          // Synchroniser vers local
          const localResult = localDB.sendMessage(fromUserId, toUserId, subject, content);
          
          // Mettre à jour le cache
          this.updateCacheFromLocal();
          
          return supabaseResult;
        } else {
          console.error('❌ Erreur envoi Supabase:', supabaseResult.error);
          return supabaseResult;
        }
      } else {
        // Mode hors ligne - envoyer en local
        console.log('📴 Mode hors ligne - envoi local');
        const result = localDB.sendMessage(fromUserId, toUserId, subject, content);
        
        // Mettre à jour le cache
        this.updateCacheFromLocal();
        
        return result;
      }
    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      return { success: false, error: error.message };
    }
  }

  // Créer une notification (Supabase d'abord)
  public async createNotification(userId: string, type: string, title: string, message: string, data?: any): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      if (this.isOnline) {
        // Créer dans Supabase d'abord
        const supabaseResult = await NotificationService.createNotification(userId, type, title, message, data);
        if (supabaseResult.success) {
          console.log('✅ Notification créée dans Supabase');
          
          // Synchroniser vers local
          const localResult = localDB.createNotification(userId, type, title, message, data);
          
          // Mettre à jour le cache
          this.updateCacheFromLocal();
          
          return supabaseResult;
        } else {
          console.error('❌ Erreur création notification Supabase:', supabaseResult.error);
          return supabaseResult;
        }
      } else {
        // Mode hors ligne - créer en local
        console.log('📴 Mode hors ligne - notification locale');
        const result = localDB.createNotification(userId, type, title, message, data);
        
        // Mettre à jour le cache
        this.updateCacheFromLocal();
        
        return result;
      }
    } catch (error: any) {
      console.error('❌ Erreur création notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtenir les statistiques
  public getStatistics(): any {
    const localStats = localDB.getStatistics();
    return {
      ...localStats,
      sync: {
        isOnline: this.isOnline,
        lastSync: this.lastSyncTime.toISOString(),
        mode: this.isOnline ? 'Supabase (Source de vérité) + Local' : 'Local uniquement',
        isSyncing: this.isSyncing,
        cacheAge: Math.round((new Date().getTime() - this.dataCache.lastCacheTime.getTime()) / 1000) + 's'
      }
    };
  }

  // Forcer une synchronisation manuelle
  public async forcSync(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isOnline) {
        // Tester la connectivité
        try {
          const { data, error } = await supabase.from('users').select('count').limit(1);
          if (!error) {
            this.isOnline = true;
          }
        } catch (e) {
          return { success: false, error: 'Aucune connexion internet ou Supabase indisponible' };
        }
      }
      
      // Mettre à jour le cache avant la synchronisation
      this.updateCacheFromLocal();
      
      await this.performFullSync();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Obtenir le statut de synchronisation
  public getSyncStatus(): { isOnline: boolean; lastSync: Date; mode: string; isSyncing: boolean } {
    return {
      isOnline: this.isOnline,
      lastSync: this.lastSyncTime,
      mode: this.isOnline 
        ? 'Supabase (Source de vérité) + Local'
        : 'Local uniquement',
      isSyncing: this.isSyncing
    };
  }

  // Nettoyer les ressources
  public cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// Instance singleton
export const databaseService = DatabaseService.getInstance();