import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Encadreur, ParentEleve, Administrateur } from '../../types';
import { localDB } from '../../services/localDatabase';
import { databaseService } from '../../services/databaseService';
import Layout from '../Layout';
import MessageCenter from '../messaging/MessageCenter';
import AdminMessaging from '../admin/AdminMessaging';
import DatabaseSync from '../admin/DatabaseSync';
import ResetUsersComponent from '../admin/ResetUsersComponent';
import UserDetails from '../admin/UserDetails';
import { generateAutomaticMatches } from '../../scripts/generateAutomaticMatches';
import { 
  Users, 
  MessageCircle, 
  Settings, 
  BarChart3, 
  UserPlus, 
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Database,
  Send,
  Eye,
  UserCheck,
  UserX,
  Heart,
  Target,
  Award,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  ExternalLink,
  Wifi,
  WifiOff,
  Zap,
  Activity,
  TrendingUp,
  Globe
} from 'lucide-react';

const DashboardAdministrateur: React.FC = () => {
  const { user, getSyncStatus, forceSync } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [approvedRelations, setApprovedRelations] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showDatabaseSync, setShowDatabaseSync] = useState(false);
  const [showResetUsers, setShowResetUsers] = useState(false);
  const [showMessageCenter, setShowMessageCenter] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    lastSync: new Date(),
    mode: navigator.onLine ? 'En ligne' : 'Hors ligne'
  });
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const admin = user as Administrateur;

  useEffect(() => {
    loadData();
    updateSyncStatus();
    
    // Synchronisation automatique toutes les 30 secondes
    const syncInterval = setInterval(() => {
      performAutoSync();
    }, 30000);

    // Écouter les événements de synchronisation
    const handleDataSync = () => {
      loadData();
      setLastSync(new Date());
    };

    window.addEventListener('dataSync', handleDataSync);

    // Écouter les changements de connectivité
    const handleOnline = () => {
      setIsOnline(true);
      performAutoSync();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Synchroniser lors du focus de la fenêtre
    const handleFocus = () => {
      performAutoSync();
    };

    window.addEventListener('focus', handleFocus);

    // Nettoyage
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('dataSync', handleDataSync);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id]);

  const updateSyncStatus = () => {
    try {
      setSyncStatus({
        isOnline: navigator.onLine,
        lastSync: new Date(),
        mode: navigator.onLine ? 'En ligne' : 'Hors ligne'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de synchronisation:', error);
    }
  };

  const performAutoSync = async () => {
    if (!user || isSyncing) return;

    try {
      setIsSyncing(true);
      console.log('🔄 Synchronisation automatique admin:', user.email);
      
      try {
        // Forcer la synchronisation des données
        await forceSync();
      } catch (error) {
        console.warn('Avertissement lors de la synchronisation des données:', error);
      }
      
      await loadData();
      setLastSync(new Date());
      console.log('✅ Synchronisation admin terminée');
    } catch (error) {
      console.error('❌ Erreur synchronisation admin:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadData = async () => {
    try {
      console.log('📊 Chargement données admin avec synchronisation...');
      setLoadError(null);
      
      // Charger les utilisateurs
      let allUsers: User[] = [];
      try {
        allUsers = await databaseService.getAllUsers();
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        allUsers = [];
      }
      
      setUsers(allUsers);
      setFilteredUsers(allUsers);
      
      // Charger les assignations avec indicateur de chargement
      setLoadingAssignments(true);
      try {
        const allAssignments = await databaseService.getAssignments();
        setAssignments(allAssignments);
        console.log('✅ Assignations chargées:', allAssignments.length);
      } catch (error) {
        console.error('Erreur lors du chargement des assignations:', error);
        setAssignments([]);
      } finally {
        setLoadingAssignments(false);
      }
      
      // Charger les relations avec indicateur de chargement
      setLoadingRelations(true);
      try {
        const allRelations = await databaseService.getApprovedRelations();
        setApprovedRelations(allRelations);
        console.log('✅ Relations chargées:', allRelations.length);
      } catch (error) {
        console.error('Erreur lors du chargement des relations:', error);
        setApprovedRelations([]);
        setLoadError("Erreur lors du chargement des relations. Veuillez réessayer.");
      } finally {
        setLoadingRelations(false);
      }
      
      console.log('✅ Données admin chargées:', {
        users: allUsers.length,
        assignments: assignments.length,
        relations: approvedRelations.length
      });
    } catch (error) {
      console.error('❌ Erreur chargement données admin:', error);
      setLoadError("Erreur lors du chargement des données. Veuillez réessayer.");
    }
  };

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(u => {
        try {
          if (u.role === 'ENCADREUR') {
            const encadreur = u as Encadreur;
            return (
              (encadreur.nom || '').toLowerCase().includes(searchLower) ||
              (encadreur.prenoms || '').toLowerCase().includes(searchLower) ||
              (encadreur.email || '').toLowerCase().includes(searchLower) ||
              (encadreur.telephone || '').includes(searchTerm) ||
              (encadreur.communeIntervention || '').toLowerCase().includes(searchLower)
            );
          } else if (u.role === 'PARENT_ELEVE') {
            const parent = u as ParentEleve;
            return (
              (parent.nomParent || '').toLowerCase().includes(searchLower) ||
              (parent.prenomsParent || '').toLowerCase().includes(searchLower) ||
              (parent.nomApprenant || '').toLowerCase().includes(searchLower) ||
              (parent.prenomsApprenant || '').toLowerCase().includes(searchLower) ||
              (parent.email || '').toLowerCase().includes(searchLower) ||
              (parent.telephone || '').includes(searchTerm) ||
              (parent.communeApprenant || '').toLowerCase().includes(searchLower)
            );
          }
          return (u.username || '').toLowerCase().includes(searchLower) || 
                 (u.email || '').toLowerCase().includes(searchLower);
        } catch (error) {
          console.error('Erreur lors du filtrage des utilisateurs:', error);
          return true;
        }
      });
    }

    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleApproveAssignment = async (assignmentId: string) => {
    try {
      console.log('✅ Approbation assignation:', assignmentId);
      
      // Vérifier que l'ID est valide
      if (!assignmentId) {
        alert('ID d\'assignation invalide');
        return;
      }
      
      // Afficher un message de chargement
      const loadingMessage = 'Approbation en cours...';
      alert(loadingMessage);
      
      // S'assurer que l'utilisateur est un administrateur et utiliser son ID
      if (!user || user.role !== 'ADMINISTRATEUR') {
        alert('Vous devez être administrateur pour approuver une assignation');
        return;
      }
      
      const result = await databaseService.approveAssignment(assignmentId, user.id);
      
      if (result.success) {
        await loadData();
        alert('Assignation approuvée avec succès !');
      } else {
        alert('Erreur lors de l\'approbation: ' + (result.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('❌ Erreur approbation:', error);
      alert('Erreur lors de l\'approbation de l\'assignation');
    }
  };

  const handleDissociateRelation = async (parentEleveId: string, encadreurId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir dissocier cette relation ?')) {
      return;
    }

    try {
      console.log('💔 Dissociation relation:', parentEleveId, '<-X->', encadreurId);
      
      const result = await databaseService.dissociateRelation(parentEleveId, encadreurId);
      
      if (result.success) {
        await loadData();
        alert('Relation dissociée avec succès !');
      } else {
        alert('Erreur lors de la dissociation: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Erreur dissociation:', error);
      alert('Erreur lors de la dissociation de la relation');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userToDelete.email} ?`)) {
      return;
    }

    try {
      console.log('🗑️ Suppression utilisateur:', userToDelete.email);
      
      const result = await databaseService.deleteUser(userId);
      
      if (result.success) {
        await loadData();
        alert('Utilisateur supprimé avec succès !');
      } else {
        alert('Erreur lors de la suppression: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Erreur suppression utilisateur:', error);
      alert('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const handleGenerateMatches = async () => {
    try {
      setIsGeneratingMatches(true);
      console.log('🔄 Génération automatique des correspondances...');
      
      await generateAutomaticMatches();
      
      // Recharger les données après la génération
      await loadData();
      
      alert('Génération des correspondances terminée avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la génération des correspondances:', error);
      alert('Erreur lors de la génération des correspondances: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingMatches(false);
    }
  };

  const getUserName = (userId: string): string => {
    if (!userId) return 'Utilisateur inconnu';
    
    const foundUser = users.find(u => u.id === userId);
    if (!foundUser) return 'Utilisateur inconnu';
    
    if (foundUser.role === 'ENCADREUR') {
      const encadreur = foundUser as Encadreur;
      return `${encadreur.prenoms || ''} ${encadreur.nom || ''}`.trim() || encadreur.email || 'Encadreur';
    } else if (foundUser.role === 'PARENT_ELEVE') {
      const parent = foundUser as ParentEleve;
      return `${parent.prenomsParent || ''} ${parent.nomParent || ''}`.trim() || parent.email || 'Parent/Élève';
    }
    return foundUser.username || foundUser.email || 'Utilisateur';
  };

  const getCommuneInfo = (user: User): string => {
    if (user.role === 'ENCADREUR') {
      const encadreur = user as Encadreur;
      return encadreur.communeIntervention || 'Non spécifiée';
    } else if (user.role === 'PARENT_ELEVE') {
      const parent = user as ParentEleve;
      return parent.communeApprenant || 'Non spécifiée';
    }
    return 'Non applicable';
  };

  const formatLastSync = () => {
    try {
      const now = new Date();
      const diffMs = now.getTime() - lastSync.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      
      if (diffSeconds < 60) {
        return `il y a ${diffSeconds}s`;
      } else if (diffMinutes < 60) {
        return `il y a ${diffMinutes}min`;
      } else {
        return lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }
    } catch (error) {
      console.error('Erreur lors du formatage de la date de synchronisation:', error);
      return 'inconnu';
    }
  };

  const renderSyncStatus = () => (
    <div className="flex items-center space-x-2 text-xs text-gray-500">
      {isOnline ? (
        <Wifi className="w-3 h-3 text-green-500" />
      ) : (
        <WifiOff className="w-3 h-3 text-red-500" />
      )}
      <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </span>
      {isSyncing ? (
        <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
      ) : (
        <span>• Sync: {formatLastSync()}</span>
      )}
    </div>
  );

  const stats = {
    totalUsers: users.length,
    encadreurs: users.filter(u => u.role === 'ENCADREUR').length,
    parents: users.filter(u => u.role === 'PARENT_ELEVE').length,
    admins: users.filter(u => u.role === 'ADMINISTRATEUR').length,
    pendingAssignments: assignments.length,
    activeRelations: approvedRelations.filter(r => r.status === 'ACTIVE').length,
    totalRelations: approvedRelations.length
  };

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'assignments', label: 'Assignations', icon: UserPlus },
    { id: 'relations', label: 'Relations', icon: Heart },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  // Fonction pour ouvrir le centre de messages de manière sécurisée
  const openMessageCenter = () => {
    try {
      console.log('📧 Ouverture centre de messages admin');
      setShowMessageCenter(true);
      setShowMessaging(false); // S'assurer qu'il n'y a pas de conflit
    } catch (error) {
      console.error('❌ Erreur ouverture centre messages:', error);
    }
  };

  // Fonction pour fermer le centre de messages
  const closeMessageCenter = () => {
    try {
      console.log('📧 Fermeture centre de messages admin');
      setShowMessageCenter(false);
    } catch (error) {
      console.error('❌ Erreur fermeture centre messages:', error);
    }
  };

  // Fonction pour ouvrir la messagerie groupée
  const openGroupMessaging = () => {
    try {
      console.log('📧 Ouverture messagerie groupée admin');
      setShowMessaging(true);
      setShowMessageCenter(false); // S'assurer qu'il n'y a pas de conflit
    } catch (error) {
      console.error('❌ Erreur ouverture messagerie groupée:', error);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Statut de synchronisation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Statut de synchronisation</h3>
          <button
            onClick={performAutoSync}
            disabled={isSyncing}
            className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser'}</span>
          </button>
        </div>
        <div className="mt-2">
          {renderSyncStatus()}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={performAutoSync}
            disabled={isSyncing}
            className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-6 h-6 text-blue-600 mb-2 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium text-blue-800">
              {isSyncing ? 'Synchronisation...' : 'Synchroniser'}
            </span>
          </button>

          <button
            onClick={openMessageCenter}
            className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <MessageCircle className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-800">Centre messages</span>
          </button>

          <button
            onClick={openGroupMessaging}
            className="flex flex-col items-center p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <Users className="w-6 h-6 text-indigo-600 mb-2" />
            <span className="text-sm font-medium text-indigo-800">Message groupé</span>
          </button>

          <button
            onClick={() => setShowDatabaseSync(true)}
            className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <Database className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-800">Export DB</span>
          </button>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Utilisateurs</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Encadreurs</p>
              <p className="text-2xl font-bold text-green-600">{stats.encadreurs}</p>
            </div>
            <BookOpen className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Parents/Élèves</p>
              <p className="text-2xl font-bold text-orange-600">{stats.parents}</p>
            </div>
            <Users className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Relations Actives</p>
              <p className="text-2xl font-bold text-purple-600">{stats.activeRelations}</p>
            </div>
            <Heart className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Accès rapides */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Gestion des utilisateurs</h4>
          <p className="text-gray-600 mb-4">Gérer tous les utilisateurs de la plateforme</p>
          <button
            onClick={() => setActiveTab('users')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voir les utilisateurs
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Centre de messages</h4>
          <p className="text-gray-600 mb-4">Envoyer des messages aux utilisateurs</p>
          <button
            onClick={openMessageCenter}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Ouvrir le centre
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Gestion des assignations</h4>
          <p className="text-gray-600 mb-4">Approuver ou gérer les assignations</p>
          <button
            onClick={() => setActiveTab('assignments')}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Voir les assignations
          </button>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Gestion des utilisateurs ({filteredUsers.length})</h3>
          <div className="text-right">
            {renderSyncStatus()}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="ALL">Tous les rôles</option>
              <option value="ENCADREUR">Encadreurs</option>
              <option value="PARENT_ELEVE">Parents/Élèves</option>
              <option value="ADMINISTRATEUR">Administrateurs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun utilisateur trouvé</h3>
            <p className="text-gray-600">Aucun utilisateur ne correspond à vos critères de recherche.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredUsers.map(user => (
              <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {(user as any).profilePhoto ? (
                        <img 
                          src={(user as any).profilePhoto} 
                          alt="Profil"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {user.role === 'ENCADREUR' ? 
                          `${(user as Encadreur).prenoms || ''} ${(user as Encadreur).nom || ''}` :
                          user.role === 'PARENT_ELEVE' ?
                          `${(user as ParentEleve).prenomsParent || ''} ${(user as ParentEleve).nomParent || ''}` :
                          `${(user as Administrateur).prenoms || ''} ${(user as Administrateur).nom || ''}`
                        }
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'ENCADREUR' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'PARENT_ELEVE' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.role === 'ENCADREUR' ? 'Encadreur' :
                           user.role === 'PARENT_ELEVE' ? 'Parent/Élève' :
                           'Administrateur'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setShowUserDetails(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Voir les détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {user.role !== 'ADMINISTRATEUR' && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer l'utilisateur"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAssignments = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Assignations en attente ({assignments.length})</h3>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              {renderSyncStatus()}
            </div>
            <button
              onClick={handleGenerateMatches}
              disabled={isGeneratingMatches}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Target className={`w-4 h-4 ${isGeneratingMatches ? 'animate-spin' : ''}`} />
              <span>{isGeneratingMatches ? 'Génération...' : 'Générer des correspondances'}</span>
            </button>
          </div>
        </div>
      </div>

      {loadingAssignments ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <RefreshCw className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Chargement des assignations...</h3>
          <p className="text-gray-600">Veuillez patienter pendant que nous récupérons les données.</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucune assignation en attente</h3>
          <p className="text-gray-600">Toutes les assignations ont été traitées.</p>
          <button
            onClick={handleGenerateMatches}
            disabled={isGeneratingMatches}
            className="mt-4 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2 mx-auto disabled:opacity-50"
          >
            <Target className={`w-4 h-4 ${isGeneratingMatches ? 'animate-spin' : ''}`} />
            <span>{isGeneratingMatches ? 'Génération...' : 'Générer des correspondances automatiques'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(assignment => (
            <div key={assignment.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Nouvelle assignation</h4>
                    <p className="text-sm text-gray-600">
                      Score de compatibilité: {(assignment.compatibilityScore * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  En attente
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Parent/Élève</h5>
                  <p className="text-gray-700">
                    {assignment.parent ? 
                      `${assignment.parent.prenoms || ''} ${assignment.parent.nom || ''}` : 
                      getUserName(assignment.parentEleveId || assignment.parent_eleve_id)}
                  </p>
                  {assignment.parent && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Classe: {assignment.parent.classe}</p>
                      <p>Commune: {assignment.parent.commune}</p>
                    </div>
                  )}
                </div>
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Encadreur</h5>
                  <p className="text-gray-700">
                    {assignment.encadreur ? 
                      `${assignment.encadreur.prenoms || ''} ${assignment.encadreur.nom || ''}` : 
                      getUserName(assignment.encadreurId || assignment.encadreur_id)}
                  </p>
                  {assignment.encadreur && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Commune: {assignment.encadreur.commune}</p>
                      <p>Disciplines: {assignment.encadreur.disciplines?.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleApproveAssignment(assignment.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approuver</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRelations = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Relations approuvées ({approvedRelations.length})</h3>
          <div className="text-right">
            {renderSyncStatus()}
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-700 mb-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{loadError}</p>
              <button 
                onClick={loadData}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingRelations ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <RefreshCw className="w-12 h-12 text-purple-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Chargement des relations...</h3>
          <p className="text-gray-600">Veuillez patienter pendant que nous récupérons les données.</p>
        </div>
      ) : approvedRelations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucune relation approuvée</h3>
          <p className="text-gray-600">Les relations approuvées apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvedRelations.map(relation => (
            <div key={relation.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    relation.status === 'ACTIVE' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Heart className={`w-6 h-6 ${
                      relation.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Relation encadreur-élève</h4>
                    <p className="text-sm text-gray-600">
                      Approuvée le {new Date(relation.approvedAt || relation.approved_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  relation.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {relation.status === 'ACTIVE' ? 'Active' : 'Dissociée'}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Parent/Élève</h5>
                  <p className="text-gray-700">
                    {relation.parent ? 
                      `${relation.parent.prenoms || ''} ${relation.parent.nom || ''}` : 
                      getUserName(relation.parentEleveId || relation.parent_eleve_id)}
                  </p>
                  {relation.parent && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Classe: {relation.parent.classe}</p>
                      <p>Commune: {relation.parent.commune}</p>
                    </div>
                  )}
                </div>
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Encadreur</h5>
                  <p className="text-gray-700">
                    {relation.encadreur ? 
                      `${relation.encadreur.prenoms || ''} ${relation.encadreur.nom || ''}` : 
                      getUserName(relation.encadreurId || relation.encadreur_id)}
                  </p>
                  {relation.encadreur && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Commune: {relation.encadreur.commune}</p>
                      <p>Disciplines: {relation.encadreur.disciplines?.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>

              {relation.status === 'ACTIVE' && (
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDissociateRelation(
                      relation.parentEleveId || relation.parent_eleve_id, 
                      relation.encadreurId || relation.encadreur_id
                    )}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Dissocier</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Paramètres de l'application</h3>
          <div className="text-right">
            {renderSyncStatus()}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Gestion des messages</h4>
          <p className="text-gray-600 mb-4">Envoyer des messages groupés aux utilisateurs</p>
          <button
            onClick={() => setShowMessaging(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Ouvrir la messagerie</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Synchronisation de données</h4>
          <p className="text-gray-600 mb-4">Exporter/Importer la base de données</p>
          <button
            onClick={() => setShowDatabaseSync(true)}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Database className="w-4 h-4" />
            <span>Gérer la base</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Réinitialisation</h4>
          <p className="text-gray-600 mb-4">Supprimer tous les utilisateurs non-administrateurs</p>
          <button
            onClick={() => setShowResetUsers(true)}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Réinitialiser</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Synchronisation automatique</h4>
          <p className="text-gray-600 mb-4">Forcer une synchronisation manuelle</p>
          <button
            onClick={performAutoSync}
            disabled={isSyncing}
            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-8 h-8 text-yellow-600" />
                </div>
                <h2 className="font-semibold text-gray-800">
                  {admin?.prenoms || ''} {admin?.nom || ''}
                </h2>
                <p className="text-sm text-gray-600">Administrateur</p>
                <div className="mt-2">
                  {renderSyncStatus()}
                </div>
              </div>

              {/* Statistiques rapides */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Statistiques</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utilisateurs:</span>
                    <span className="font-medium">{stats.totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Encadreurs:</span>
                    <span className="font-medium text-blue-600">{stats.encadreurs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Parents:</span>
                    <span className="font-medium text-orange-600">{stats.parents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Relations:</span>
                    <span className="font-medium text-green-600">{stats.activeRelations}</span>
                  </div>
                </div>
              </div>

              <nav className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'assignments' && renderAssignments()}
            {activeTab === 'relations' && renderRelations()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </div>

      {/* Barre d'actions rapides flottante */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-white rounded-full shadow-lg border border-gray-200 px-6 py-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={performAutoSync}
              disabled={isSyncing}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
              title="Synchroniser"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={openMessageCenter}
              className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
              title="Centre de messages"
            >
              <MessageCircle className="w-5 h-5" />
            </button>

            <button
              onClick={openGroupMessaging}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              title="Message groupé"
            >
              <Send className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowResetUsers(true)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Réinitialiser utilisateurs"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowDatabaseSync(true)}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
              title="Export base de données"
            >
              <Download className="w-5 h-5" />
            </button>

            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
              title="Supabase Dashboard"
            >
              <Database className="w-5 h-5" />
            </a>

            <a
              href="https://app.netlify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-teal-600 hover:bg-teal-50 rounded-full transition-colors"
              title="Netlify Dashboard"
            >
              <Globe className="w-5 h-5" />
            </a>

            <a
              href="mailto:superapprenant25@gmail.com"
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
              title="Support"
            >
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showUserDetails && selectedUserId && (
        <UserDetails
          userId={selectedUserId}
          onClose={() => {
            setShowUserDetails(false);
            setSelectedUserId(null);
          }}
          onRefresh={loadData}
        />
      )}

      {showMessaging && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <AdminMessaging onClose={() => setShowMessaging(false)} />
          </div>
        </div>
      )}

      {showDatabaseSync && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <DatabaseSync onClose={() => setShowDatabaseSync(false)} />
          </div>
        </div>
      )}

      {showResetUsers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <ResetUsersComponent 
              onClose={() => setShowResetUsers(false)}
              onComplete={() => {
                setShowResetUsers(false);
                loadData();
              }}
            />
          </div>
        </div>
      )}

      {showMessageCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <MessageCenter onClose={closeMessageCenter} />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default DashboardAdministrateur;