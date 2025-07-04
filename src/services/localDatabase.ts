import { User, Encadreur, ParentEleve, Administrateur, Assignment, Message, Notification } from '../types';

// Interface pour la structure de la base de données locale
interface LocalDatabase {
  users: User[];
  messages: Message[];
  notifications: Notification[];
  assignments: Assignment[];
  approvedRelations: ApprovedRelation[];
  metadata: {
    version: string;
    lastUpdated: string;
    initialized: boolean;
    lastSync: string;
  };
}

// Interface pour les relations approuvées
interface ApprovedRelation {
  id: string;
  parentEleveId: string;
  encadreurId: string;
  approvedAt: string;
  approvedBy: string;
  compatibilityScore: number;
  criteria: any;
  status: 'ACTIVE' | 'DISSOCIATED';
}

// Clés de stockage
const DB_KEY = 'superapprenant_db';
const BACKUP_KEY = 'superapprenant_db_backup';
const SYNC_KEY = 'superapprenant_sync_timestamp';

// Comptes administrateur par défaut
const DEFAULT_ADMINS: Administrateur[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'ekbessan@gmail.com',
    email: 'ekbessan@gmail.com',
    password: 'agligoezekiel#@',
    role: 'ADMINISTRATEUR',
    nom: 'EKBESSAN',
    prenoms: 'Ezekiel',
    createdAt: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    username: 'superapprenant25@gmail.com',
    email: 'superapprenant25@gmail.com',
    password: 'SuperAdmin2025#',
    role: 'ADMINISTRATEUR',
    nom: 'ADMIN',
    prenoms: 'Super',
    createdAt: new Date().toISOString()
  }
];

export class LocalDatabaseService {
  private static instance: LocalDatabaseService;
  private db: LocalDatabase;
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.db = this.initializeDatabase();
    // Move validateDataIntegrity call here, after db is assigned
    this.validateDataIntegrity();
    this.startAutoSync();
  }

  public static getInstance(): LocalDatabaseService {
    if (!LocalDatabaseService.instance) {
      LocalDatabaseService.instance = new LocalDatabaseService();
    }
    return LocalDatabaseService.instance;
  }

  // Démarrer la synchronisation automatique renforcée
  private startAutoSync(): void {
    // Synchroniser toutes les 10 secondes pour une meilleure réactivité
    this.syncInterval = setInterval(() => {
      this.autoSyncData();
    }, 10000);

    // Synchroniser aussi lors des événements de visibilité
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.autoSyncData();
      }
    });

    // Synchroniser lors du focus de la fenêtre
    window.addEventListener('focus', () => {
      this.autoSyncData();
    });

    // Synchroniser lors des changements de stockage (multi-onglets)
    window.addEventListener('storage', (e) => {
      if (e.key === DB_KEY && e.newValue) {
        console.log('🔄 Changement détecté dans un autre onglet, synchronisation...');
        this.autoSyncData();
      }
    });
  }

  // Synchronisation automatique des données renforcée
  private autoSyncData(): void {
    try {
      const lastSync = localStorage.getItem(SYNC_KEY);
      const currentTime = new Date().toISOString();
      
      // Vérifier s'il y a des données plus récentes dans le localStorage
      const storedData = localStorage.getItem(DB_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData) as LocalDatabase;
        
        // Si les données stockées sont plus récentes, les charger
        if (!lastSync || new Date(parsed.metadata.lastUpdated) > new Date(lastSync)) {
          console.log('🔄 Synchronisation automatique des données détectée...');
          this.db = parsed;
          this.ensureDefaultAdmins(this.db);
          this.validateDataIntegrity();
          localStorage.setItem(SYNC_KEY, currentTime);
          
          // Déclencher un événement personnalisé pour notifier les composants
          window.dispatchEvent(new CustomEvent('dataSync', { detail: this.db }));
        }
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation automatique:', error);
    }
  }

  // Valider l'intégrité des données
  private validateDataIntegrity(): void {
    try {
      console.log('🔍 Validation de l\'intégrité des données...');
      
      // Ensure db is properly initialized before validation
      if (!this.db || !this.db.approvedRelations) {
        console.warn('⚠️ Base de données non initialisée correctement, initialisation des relations approuvées');
        if (!this.db.approvedRelations) {
          this.db.approvedRelations = [];
        }
      }
      
      // Nettoyer les relations orphelines
      this.db.approvedRelations = this.db.approvedRelations.filter(relation => {
        const parent = this.db.users.find(u => u.id === relation.parentEleveId);
        const encadreur = this.db.users.find(u => u.id === relation.encadreurId);
        return parent && encadreur;
      });

      // Vérifier la cohérence des assignations
      this.db.users.forEach(user => {
        if (user.role === 'PARENT_ELEVE') {
          const parent = user as ParentEleve;
          if (parent.assignedEncadreur) {
            const encadreur = this.db.users.find(u => u.id === parent.assignedEncadreur);
            if (!encadreur) {
              console.log('🧹 Nettoyage assignation orpheline pour parent:', parent.email);
              parent.assignedEncadreur = undefined;
            }
          }
        } else if (user.role === 'ENCADREUR') {
          const encadreur = user as Encadreur;
          if (encadreur.assignedStudents) {
            encadreur.assignedStudents = encadreur.assignedStudents.filter(studentId => {
              const student = this.db.users.find(u => u.id === studentId);
              return student && student.role === 'PARENT_ELEVE';
            });
          }
        }
      });

      console.log('✅ Validation de l\'intégrité terminée');
    } catch (error) {
      console.error('❌ Erreur validation intégrité:', error);
    }
  }

  // Initialiser la base de données
  private initializeDatabase(): LocalDatabase {
    try {
      console.log('🗄️ Initialisation de la base de données locale renforcée...');
      
      const existingData = localStorage.getItem(DB_KEY);
      
      if (existingData) {
        const parsed = JSON.parse(existingData) as LocalDatabase;
        console.log('✅ Base de données existante chargée');
        
        // Vérifier et ajouter les admins par défaut s'ils n'existent pas
        this.ensureDefaultAdmins(parsed);
        
        // Ajouter le champ approvedRelations s'il n'existe pas
        if (!parsed.approvedRelations) {
          parsed.approvedRelations = [];
        }
        
        // Mettre à jour les métadonnées
        if (!parsed.metadata.lastSync) {
          parsed.metadata.lastSync = new Date().toISOString();
        }
        
        // Don't call validateDataIntegrity here - it will be called in constructor
        
        return parsed;
      } else {
        console.log('🆕 Création d\'une nouvelle base de données');
        const newDb: LocalDatabase = {
          users: [...DEFAULT_ADMINS],
          messages: [],
          notifications: [],
          assignments: [],
          approvedRelations: [],
          metadata: {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            initialized: true,
            lastSync: new Date().toISOString()
          }
        };
        
        this.saveDatabase(newDb);
        return newDb;
      }
    } catch (error) {
      console.error('❌ Erreur initialisation base de données:', error);
      
      // Créer une base de données par défaut en cas d'erreur
      const defaultDb: LocalDatabase = {
        users: [...DEFAULT_ADMINS],
        messages: [],
        notifications: [],
        assignments: [],
        approvedRelations: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          initialized: true,
          lastSync: new Date().toISOString()
        }
      };
      
      this.saveDatabase(defaultDb);
      return defaultDb;
    }
  }

  // S'assurer que les admins par défaut existent
  private ensureDefaultAdmins(db: LocalDatabase): void {
    for (const admin of DEFAULT_ADMINS) {
      const exists = db.users.some(u => u.email === admin.email);
      if (!exists) {
        db.users.push(admin);
        console.log('➕ Admin par défaut ajouté:', admin.email);
      }
    }
  }

  // Sauvegarder la base de données avec synchronisation automatique renforcée
  private saveDatabase(db?: LocalDatabase): void {
    try {
      const dataToSave = db || this.db;
      dataToSave.metadata.lastUpdated = new Date().toISOString();
      dataToSave.metadata.lastSync = new Date().toISOString();
      
      // Removed validateDataIntegrity call to prevent recursive initialization error
      
      // Sauvegarder la base principale
      localStorage.setItem(DB_KEY, JSON.stringify(dataToSave));
      
      // Créer une sauvegarde
      localStorage.setItem(BACKUP_KEY, JSON.stringify(dataToSave));
      
      // Mettre à jour le timestamp de synchronisation
      localStorage.setItem(SYNC_KEY, dataToSave.metadata.lastSync);
      
      console.log('💾 Base de données sauvegardée et synchronisée');
      
      // Déclencher un événement de synchronisation
      window.dispatchEvent(new CustomEvent('dataSync', { detail: dataToSave }));
    } catch (error) {
      console.error('❌ Erreur sauvegarde base de données:', error);
    }
  }

  // Recharger la base de données depuis le stockage
  public reloadDatabase(): void {
    this.db = this.initializeDatabase();
    this.validateDataIntegrity();
  }

  // Forcer la synchronisation
  public forceSyncData(): void {
    this.autoSyncData();
  }

  // === GESTION DES UTILISATEURS ===

  // Créer un utilisateur avec synchronisation automatique
  public createUser(userData: Partial<User>): { success: boolean; user?: User; error?: string } {
    try {
      console.log('👤 Création utilisateur avec validation:', userData.email);
      
      // Recharger les données les plus récentes avant de créer
      this.autoSyncData();
      
      // Vérifier si l'email existe déjà
      const existingUser = this.db.users.find(u => u.email === userData.email);
      if (existingUser) {
        return { success: false, error: 'Cette adresse email est déjà utilisée.' };
      }

      const newUser: User = {
        ...userData,
        id: this.generateId(),
        username: userData.email || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as User;

      this.db.users.push(newUser);
      this.saveDatabase();
      
      console.log('✅ Utilisateur créé et synchronisé:', newUser.email);
      return { success: true, user: newUser };
    } catch (error: any) {
      console.error('❌ Erreur création utilisateur:', error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer tous les utilisateurs avec synchronisation
  public getAllUsers(): User[] {
    this.autoSyncData();
    return [...this.db.users];
  }

  // Récupérer un utilisateur par ID
  public getUserById(id: string): User | null {
    this.autoSyncData();
    return this.db.users.find(u => u.id === id) || null;
  }

  // Récupérer un utilisateur par email
  public getUserByEmail(email: string): User | null {
    this.autoSyncData();
    return this.db.users.find(u => u.email === email) || null;
  }

  // Mettre à jour un utilisateur avec synchronisation
  public updateUser(id: string, userData: Partial<User>): { success: boolean; user?: User; error?: string } {
    try {
      console.log('🔄 Mise à jour utilisateur avec validation:', id);
      
      // Synchroniser avant la mise à jour
      this.autoSyncData();
      
      const userIndex = this.db.users.findIndex(u => u.id === id);
      if (userIndex === -1) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // Mettre à jour l'utilisateur
      this.db.users[userIndex] = {
        ...this.db.users[userIndex],
        ...userData,
        id, // S'assurer que l'ID ne change pas
        updatedAt: new Date().toISOString()
      };

      this.saveDatabase();
      
      console.log('✅ Utilisateur mis à jour et synchronisé:', this.db.users[userIndex].email);
      return { success: true, user: this.db.users[userIndex] };
    } catch (error: any) {
      console.error('❌ Erreur mise à jour utilisateur:', error);
      return { success: false, error: error.message };
    }
  }

  // Supprimer un utilisateur
  public deleteUser(id: string): { success: boolean; error?: string } {
    try {
      console.log('🗑️ Suppression utilisateur:', id);
      
      // Synchroniser avant la suppression
      this.autoSyncData();
      
      const userIndex = this.db.users.findIndex(u => u.id === id);
      if (userIndex === -1) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // Supprimer l'utilisateur
      this.db.users.splice(userIndex, 1);
      
      // Nettoyer les références dans les autres tables
      this.cleanupUserReferences(id);
      
      this.saveDatabase();
      
      console.log('✅ Utilisateur supprimé et synchronisé');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur suppression utilisateur:', error);
      return { success: false, error: error.message };
    }
  }

  // === GESTION DES MESSAGES ===

  // Envoyer un message
  public sendMessage(fromUserId: string, toUserId: string, subject: string, content: string): { success: boolean; messageId?: string; error?: string } {
    try {
      console.log('📧 Envoi message:', fromUserId, '->', toUserId);
      
      // Vérifier si l'utilisateur peut envoyer un message
      if (!this.canSendMessage(fromUserId, toUserId)) {
        return { 
          success: false, 
          error: 'Vous ne pouvez envoyer des messages qu\'aux administrateurs et aux utilisateurs qui vous sont assignés' 
        };
      }

      const newMessage: Message = {
        id: this.generateId(),
        from: fromUserId,
        to: toUserId,
        subject,
        content,
        createdAt: new Date().toISOString(),
        read: false
      };

      this.db.messages.push(newMessage);
      this.saveDatabase();
      
      console.log('✅ Message envoyé et synchronisé:', newMessage.id);
      return { success: true, messageId: newMessage.id };
    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      return { success: false, error: error.message };
    }
  }

  // Vérifier si un utilisateur peut envoyer un message à un autre
  private canSendMessage(senderId: string, recipientId: string): boolean {
    // Récupérer les utilisateurs
    const sender = this.getUserById(senderId);
    const recipient = this.getUserById(recipientId);
    
    if (!sender || !recipient) {
      return false;
    }
    
    // Les administrateurs peuvent envoyer à tout le monde
    if (sender.role === 'ADMINISTRATEUR') {
      return true;
    }
    
    // Tout le monde peut envoyer aux administrateurs
    if (recipient.role === 'ADMINISTRATEUR') {
      return true;
    }
    
    // Parent/Élève -> Encadreur
    if (sender.role === 'PARENT_ELEVE' && recipient.role === 'ENCADREUR') {
      const parent = sender as ParentEleve;
      return parent.assignedEncadreur === recipientId;
    }
    
    // Encadreur -> Parent/Élève
    if (sender.role === 'ENCADREUR' && recipient.role === 'PARENT_ELEVE') {
      const encadreur = sender as Encadreur;
      return encadreur.assignedStudents.includes(recipientId);
    }
    
    // Par défaut, interdire
    return false;
  }

  // Récupérer les messages d'un utilisateur (avec accès admin complet)
  public getMessages(userId: string): any[] {
    this.autoSyncData();
    
    // Si c'est un administrateur, retourner TOUS les messages de la plateforme
    const user = this.getUserById(userId);
    if (user && user.role === 'ADMINISTRATEUR') {
      return this.db.messages
        .map(msg => ({
          ...msg,
          type: msg.from === userId ? 'sent' : 'received'
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    // Pour les autres utilisateurs, retourner seulement leurs messages
    return this.db.messages
      .filter(msg => msg.from === userId || msg.to === userId)
      .map(msg => ({
        ...msg,
        type: msg.from === userId ? 'sent' : 'received'
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Récupérer TOUS les messages pour l'administrateur (nouvelle méthode spécifique)
  public getAllMessages(): any[] {
    this.autoSyncData();
    return this.db.messages
      .map(msg => ({
        ...msg,
        fromUser: this.getUserById(msg.from),
        toUser: this.getUserById(msg.to)
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Récupérer les messages entre deux utilisateurs spécifiques
  public getMessagesBetweenUsers(user1Id: string, user2Id: string): any[] {
    this.autoSyncData();
    return this.db.messages
      .filter(msg => 
        (msg.from === user1Id && msg.to === user2Id) ||
        (msg.from === user2Id && msg.to === user1Id)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Récupérer les messages envoyés par un utilisateur spécifique
  public getMessagesSentByUser(userId: string): any[] {
    this.autoSyncData();
    return this.db.messages
      .filter(msg => msg.from === userId)
      .map(msg => ({
        ...msg,
        toUser: this.getUserById(msg.to)
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Récupérer les messages reçus par un utilisateur spécifique
  public getMessagesReceivedByUser(userId: string): any[] {
    this.autoSyncData();
    return this.db.messages
      .filter(msg => msg.to === userId)
      .map(msg => ({
        ...msg,
        fromUser: this.getUserById(msg.from)
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Marquer un message comme lu
  public markMessageAsRead(messageId: string): { success: boolean; error?: string } {
    try {
      const messageIndex = this.db.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        return { success: false, error: 'Message non trouvé' };
      }

      this.db.messages[messageIndex].read = true;
      this.saveDatabase();
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // === GESTION DES NOTIFICATIONS ===

  // Créer une notification
  public createNotification(userId: string, type: string, title: string, message: string, data?: any): { success: boolean; notificationId?: string; error?: string } {
    try {
      console.log('🔔 Création notification pour:', userId, title);
      
      const newNotification: Notification = {
        id: this.generateId(),
        userId,
        type,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
        data
      };

      this.db.notifications.push(newNotification);
      this.saveDatabase();
      
      console.log('✅ Notification créée et synchronisée:', newNotification.id);
      return { success: true, notificationId: newNotification.id };
    } catch (error: any) {
      console.error('❌ Erreur création notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer les notifications d'un utilisateur (avec accès admin complet)
  public getNotifications(userId: string): Notification[] {
    this.autoSyncData();
    
    // Si c'est un administrateur, retourner TOUTES les notifications de la plateforme
    const user = this.getUserById(userId);
    if (user && user.role === 'ADMINISTRATEUR') {
      return this.db.notifications
        .map(notif => ({
          ...notif,
          user: this.getUserById(notif.userId)
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    // Pour les autres utilisateurs, retourner seulement leurs notifications
    return this.db.notifications
      .filter(notif => notif.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Récupérer TOUTES les notifications pour l'administrateur (nouvelle méthode spécifique)
  public getAllNotifications(): any[] {
    this.autoSyncData();
    return this.db.notifications
      .map(notif => ({
        ...notif,
        user: this.getUserById(notif.userId)
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Marquer une notification comme lue
  public markNotificationAsRead(notificationId: string): { success: boolean; error?: string } {
    try {
      const notificationIndex = this.db.notifications.findIndex(n => n.id === notificationId);
      if (notificationIndex === -1) {
        return { success: false, error: 'Notification non trouvée' };
      }

      this.db.notifications[notificationIndex].read = true;
      this.saveDatabase();
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // === GESTION DES ASSIGNATIONS AMÉLIORÉE ===

  // Créer une assignation (seulement si pas déjà approuvée)
  public createAssignment(parentEleveId: string, encadreurId: string, compatibilityScore: number, criteria: any, assignedBy: string): { success: boolean; assignmentId?: string; error?: string } {
    try {
      console.log('🔗 Création assignation avec validation:', parentEleveId, '<->', encadreurId);
      
      // Vérifier s'il existe déjà une relation approuvée active
      const existingRelation = this.db.approvedRelations.find(rel => 
        rel.parentEleveId === parentEleveId && 
        rel.encadreurId === encadreurId && 
        rel.status === 'ACTIVE'
      );
      
      if (existingRelation) {
        return { success: false, error: 'Une relation active existe déjà entre ces utilisateurs' };
      }

      // Vérifier s'il existe déjà une assignation en attente
      const existingAssignment = this.db.assignments.find(a => 
        a.parentEleveId === parentEleveId && a.encadreurId === encadreurId
      );
      
      if (existingAssignment) {
        return { success: false, error: 'Une assignation en attente existe déjà' };
      }

      // Vérifier la compatibilité des communes
      const parent = this.getUserById(parentEleveId) as ParentEleve;
      const encadreur = this.getUserById(encadreurId) as Encadreur;
      
      if (!parent || !encadreur) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }
      
      if (parent.communeApprenant !== encadreur.communeIntervention) {
        return { 
          success: false, 
          error: `Incompatibilité de commune: ${parent.communeApprenant} vs ${encadreur.communeIntervention}` 
        };
      }

      const newAssignment: Assignment = {
        id: this.generateId(),
        parentEleveId,
        encadreurId,
        compatibilityScore,
        criteria,
        assignedBy,
        assignedAt: new Date().toISOString()
      };

      this.db.assignments.push(newAssignment);
      this.saveDatabase();
      
      console.log('✅ Assignation créée et synchronisée:', newAssignment.id);
      return { success: true, assignmentId: newAssignment.id };
    } catch (error: any) {
      console.error('❌ Erreur création assignation:', error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer toutes les assignations en attente (non approuvées)
  public getAssignments(): Assignment[] {
    this.autoSyncData();
    return [...this.db.assignments].sort((a, b) => 
      new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
  }

  // Récupérer toutes les relations approuvées
  public getApprovedRelations(): ApprovedRelation[] {
    this.autoSyncData();
    // Assurez-vous que les relations sont correctement triées par date d'approbation (les plus récentes d'abord)
    return [...this.db.approvedRelations].sort((a, b) => 
      new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime()
    );
  }

  // Récupérer les relations approuvées actives
  public getActiveRelations(): ApprovedRelation[] {
    return this.getApprovedRelations().filter(rel => rel.status === 'ACTIVE');
  }

  // Approuver une assignation (la déplacer vers les relations approuvées) avec validation renforcée
  public approveAssignment(assignmentId: string): { success: boolean; error?: string } {
    try {
      console.log('✅ Approbation assignation avec validation:', assignmentId);
      
      const assignment = this.db.assignments.find(a => a.id === assignmentId);
      if (!assignment) {
        return { success: false, error: 'Assignation non trouvée' };
      }

      // Vérifier que les utilisateurs existent toujours
      const parent = this.getUserById(assignment.parentEleveId) as ParentEleve;
      const encadreur = this.getUserById(assignment.encadreurId) as Encadreur;
      
      if (!parent || !encadreur) {
        return { success: false, error: 'Un des utilisateurs n\'existe plus' };
      }

      if (parent.role !== 'PARENT_ELEVE' || encadreur.role !== 'ENCADREUR') {
        return { success: false, error: 'Rôles d\'utilisateurs incorrects' };
      }

      // Vérifier la compatibilité des communes
      if (parent.communeApprenant !== encadreur.communeIntervention) {
        return { 
          success: false, 
          error: `Incompatibilité de commune: ${parent.communeApprenant} vs ${encadreur.communeIntervention}` 
        };
      }

      // Créer une relation approuvée
      const approvedRelation: ApprovedRelation = {
        id: this.generateId(),
        parentEleveId: assignment.parentEleveId,
        encadreurId: assignment.encadreurId,
        approvedAt: new Date().toISOString(),
        approvedBy: assignment.assignedBy,
        compatibilityScore: assignment.compatibilityScore,
        criteria: assignment.criteria,
        status: 'ACTIVE'
      };

      this.db.approvedRelations.push(approvedRelation);

      // Mettre à jour le parent
      const parentResult = this.updateUser(assignment.parentEleveId, {
        assignedEncadreur: assignment.encadreurId
      });
      
      if (!parentResult.success) {
        return { success: false, error: 'Erreur lors de la mise à jour du parent' };
      }

      // Mettre à jour l'encadreur
      const encadreurData = encadreur as Encadreur;
      const updatedStudents = [...new Set([...encadreurData.assignedStudents, assignment.parentEleveId])];
      
      const encadreurResult = this.updateUser(assignment.encadreurId, {
        assignedStudents: updatedStudents
      });
      
      if (!encadreurResult.success) {
        return { success: false, error: 'Erreur lors de la mise à jour de l\'encadreur' };
      }

      // Supprimer l'assignation de la liste d'attente
      this.deleteAssignment(assignmentId);

      // Créer des notifications
      this.createNotification(
        assignment.parentEleveId,
        'ASSIGNMENT',
        'Encadreur assigné !',
        'Félicitations ! Un encadreur vous a été assigné. Vous pouvez maintenant le contacter.',
        { encadreurId: assignment.encadreurId, relationId: approvedRelation.id }
      );

      this.createNotification(
        assignment.encadreurId,
        'ASSIGNMENT',
        'Nouvel élève assigné !',
        'Un nouvel élève vous a été assigné. Vous pouvez maintenant le contacter.',
        { parentEleveId: assignment.parentEleveId, relationId: approvedRelation.id }
      );

      console.log('✅ Assignation approuvée et relation créée avec succès');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur approbation assignation:', error);
      return { success: false, error: error.message };
    }
  }

  // Dissocier une relation (marquer comme dissociée) avec validation renforcée
  public dissociateRelation(parentEleveId: string, encadreurId: string): { success: boolean; error?: string } {
    try {
      console.log('💔 Dissociation relation avec validation:', parentEleveId, '<-X->', encadreurId);
      
      // Vérifier que les utilisateurs existent
      const parent = this.getUserById(parentEleveId);
      const encadreur = this.getUserById(encadreurId);
      
      if (!parent || !encadreur) {
        console.warn('⚠️ Un des utilisateurs n\'existe plus, nettoyage forcé');
      }

      // Trouver la relation active
      const relationIndex = this.db.approvedRelations.findIndex(rel => 
        rel.parentEleveId === parentEleveId && 
        rel.encadreurId === encadreurId && 
        rel.status === 'ACTIVE'
      );

      if (relationIndex !== -1) {
        // Marquer la relation comme dissociée au lieu de la supprimer
        this.db.approvedRelations[relationIndex].status = 'DISSOCIATED';
        console.log('✅ Relation marquée comme dissociée');
      }

      // Supprimer toute assignation en attente
      this.db.assignments = this.db.assignments.filter(a => 
        !(a.parentEleveId === parentEleveId && a.encadreurId === encadreurId)
      );

      // Mettre à jour le parent si il existe
      if (parent && parent.role === 'PARENT_ELEVE') {
        const parentResult = this.updateUser(parentEleveId, {
          assignedEncadreur: undefined
        });
        
        if (!parentResult.success) {
          console.warn('⚠️ Erreur mise à jour parent lors de la dissociation');
        }
      }

      // Mettre à jour l'encadreur si il existe
      if (encadreur && encadreur.role === 'ENCADREUR') {
        const encadreurData = encadreur as Encadreur;
        const updatedStudents = encadreurData.assignedStudents.filter(id => id !== parentEleveId);
        
        const encadreurResult = this.updateUser(encadreurId, {
          assignedStudents: updatedStudents
        });
        
        if (!encadreurResult.success) {
          console.warn('⚠️ Erreur mise à jour encadreur lors de la dissociation');
        }
      }

      this.saveDatabase();

      // Créer des notifications si les utilisateurs existent
      if (parent) {
        this.createNotification(
          parentEleveId,
          'ASSIGNMENT',
          'Relation terminée',
          'Votre relation avec l\'encadreur a été terminée. Vous pouvez demander un nouvel encadreur.',
          { encadreurId }
        );
      }

      if (encadreur) {
        this.createNotification(
          encadreurId,
          'ASSIGNMENT',
          'Relation terminée',
          'Votre relation avec un élève a été terminée.',
          { parentEleveId }
        );
      }

      console.log('✅ Relation dissociée avec succès et données nettoyées');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur dissociation relation:', error);
      return { success: false, error: error.message };
    }
  }

  // Supprimer une assignation
  public deleteAssignment(assignmentId: string): { success: boolean; error?: string } {
    try {
      console.log('🗑️ Suppression assignation:', assignmentId);
      
      const assignmentIndex = this.db.assignments.findIndex(a => a.id === assignmentId);
      if (assignmentIndex === -1) {
        return { success: false, error: 'Assignation non trouvée' };
      }

      this.db.assignments.splice(assignmentIndex, 1);
      this.saveDatabase();
      
      console.log('✅ Assignation supprimée');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur suppression assignation:', error);
      return { success: false, error: error.message };
    }
  }

  // === UTILITAIRES ===

  // Générer un ID unique
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Nettoyer les références d'un utilisateur supprimé
  private cleanupUserReferences(userId: string): void {
    // Supprimer les messages
    this.db.messages = this.db.messages.filter(msg => 
      msg.from !== userId && msg.to !== userId
    );

    // Supprimer les notifications
    this.db.notifications = this.db.notifications.filter(notif => 
      notif.userId !== userId
    );

    // Supprimer les assignations
    this.db.assignments = this.db.assignments.filter(assignment => 
      assignment.parentEleveId !== userId && 
      assignment.encadreurId !== userId &&
      assignment.assignedBy !== userId
    );

    // Marquer les relations comme dissociées
    this.db.approvedRelations.forEach(relation => {
      if (relation.parentEleveId === userId || relation.encadreurId === userId) {
        relation.status = 'DISSOCIATED';
      }
    });

    // Nettoyer les références dans les autres utilisateurs
    this.db.users.forEach(user => {
      if (user.role === 'ENCADREUR') {
        const encadreur = user as Encadreur;
        encadreur.assignedStudents = encadreur.assignedStudents.filter(id => id !== userId);
      } else if (user.role === 'PARENT_ELEVE') {
        const parent = user as ParentEleve;
        if (parent.assignedEncadreur === userId) {
          parent.assignedEncadreur = undefined;
        }
      }
    });
  }

  // Obtenir les statistiques de la base de données
  public getStatistics(): any {
    this.autoSyncData();
    
    const stats = {
      users: {
        total: this.db.users.length,
        encadreurs: this.db.users.filter(u => u.role === 'ENCADREUR').length,
        parents: this.db.users.filter(u => u.role === 'PARENT_ELEVE').length,
        admins: this.db.users.filter(u => u.role === 'ADMINISTRATEUR').length
      },
      messages: {
        total: this.db.messages.length,
        unread: this.db.messages.filter(m => !m.read).length
      },
      notifications: {
        total: this.db.notifications.length,
        unread: this.db.notifications.filter(n => !n.read).length
      },
      assignments: {
        total: this.db.assignments.length,
        pending: this.db.assignments.length
      },
      relations: {
        active: this.db.approvedRelations.filter(rel => rel.status === 'ACTIVE').length,
        total: this.db.approvedRelations.length,
        dissociated: this.db.approvedRelations.filter(rel => rel.status === 'DISSOCIATED').length
      },
      metadata: {
        ...this.db.metadata,
        lastSync: this.db.metadata.lastSync
      }
    };

    return stats;
  }

  // Exporter la base de données
  public exportDatabase(): string {
    this.autoSyncData();
    return JSON.stringify(this.db, null, 2);
  }

  // Importer une base de données
  public importDatabase(data: string): { success: boolean; error?: string } {
    try {
      const importedDb = JSON.parse(data) as LocalDatabase;
      
      // Valider la structure
      if (!importedDb.users || !importedDb.messages || !importedDb.notifications || !importedDb.assignments) {
        return { success: false, error: 'Structure de base de données invalide' };
      }

      // Ajouter les champs manquants si nécessaire
      if (!importedDb.approvedRelations) {
        importedDb.approvedRelations = [];
      }

      this.db = importedDb;
      this.validateDataIntegrity();
      this.saveDatabase();
      
      console.log('✅ Base de données importée avec succès et intégrité validée');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur import base de données:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtenir les détails complets d'un utilisateur pour l'administrateur avec profils questionnaires
  public getUserDetails(userId: string): any {
    this.autoSyncData();
    
    const user = this.getUserById(userId);
    if (!user) return null;

    const details: any = {
      ...user,
      messages: {
        sent: this.db.messages.filter(m => m.from === userId).length,
        received: this.db.messages.filter(m => m.to === userId).length,
        unread: this.db.messages.filter(m => m.to === userId && !m.read).length,
        sentMessages: this.getMessagesSentByUser(userId),
        receivedMessages: this.getMessagesReceivedByUser(userId)
      },
      notifications: {
        total: this.db.notifications.filter(n => n.userId === userId).length,
        unread: this.db.notifications.filter(n => n.userId === userId && !n.read).length,
        allNotifications: this.db.notifications.filter(n => n.userId === userId)
      }
    };

    if (user.role === 'ENCADREUR') {
      const encadreur = user as Encadreur;
      details.students = encadreur.assignedStudents.map(studentId => {
        const student = this.getUserById(studentId);
        return student ? {
          id: student.id,
          nom: (student as ParentEleve).nomApprenant,
          prenoms: (student as ParentEleve).prenomsApprenant,
          classe: (student as ParentEleve).classeApprenant,
          commune: (student as ParentEleve).communeApprenant
        } : null;
      }).filter(Boolean);
      
      details.relations = this.db.approvedRelations.filter(rel => 
        rel.encadreurId === userId
      );

      // Ajouter le profil d'encadrant complet
      details.profilEncadrant = encadreur.profilEncadrant || {};
    } else if (user.role === 'PARENT_ELEVE') {
      const parent = user as ParentEleve;
      if (parent.assignedEncadreur) {
        const encadreur = this.getUserById(parent.assignedEncadreur);
        details.encadreur = encadreur ? {
          id: encadreur.id,
          nom: (encadreur as Encadreur).nom,
          prenoms: (encadreur as Encadreur).prenoms,
          telephone: (encadreur as Encadreur).telephone,
          email: encadreur.email
        } : null;
      }
      
      details.relations = this.db.approvedRelations.filter(rel => 
        rel.parentEleveId === userId
      );

      // Ajouter le profil d'apprentissage complet
      details.profilApprentissage = parent.profilApprentissage || {};
    }

    return details;
  }

  // Nettoyer la base de données (supprimer les anciennes données)
  public cleanupOldData(): { success: boolean; cleaned: number; error?: string } {
    try {
      console.log('🧹 Nettoyage des anciennes données...');
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let cleaned = 0;
      
      // Supprimer les anciens messages lus
      const oldMessages = this.db.messages.filter(msg => 
        msg.read && new Date(msg.createdAt) < thirtyDaysAgo
      );
      this.db.messages = this.db.messages.filter(msg => 
        !msg.read || new Date(msg.createdAt) >= thirtyDaysAgo
      );
      cleaned += oldMessages.length;
      
      // Supprimer les anciennes notifications lues
      const oldNotifications = this.db.notifications.filter(notif => 
        notif.read && new Date(notif.createdAt) < thirtyDaysAgo
      );
      this.db.notifications = this.db.notifications.filter(notif => 
        !notif.read || new Date(notif.createdAt) >= thirtyDaysAgo
      );
      cleaned += oldNotifications.length;
      
      this.saveDatabase();
      
      console.log(`✅ Nettoyage terminé: ${cleaned} éléments supprimés`);
      return { success: true, cleaned };
    } catch (error: any) {
      console.error('❌ Erreur nettoyage:', error);
      return { success: false, cleaned: 0, error: error.message };
    }
  }

  // Arrêter la synchronisation automatique
  public stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// Instance singleton
export const localDB = LocalDatabaseService.getInstance();