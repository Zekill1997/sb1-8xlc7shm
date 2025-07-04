import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ParentEleve, Encadreur, User } from '../../types';
import { localDB } from '../../services/localDatabase';
import Layout from '../Layout';
import MessageCenter from '../messaging/MessageCenter';
import { 
  User as UserIcon, 
  BookOpen, 
  Users, 
  Settings, 
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  MessageSquare,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';

const DashboardParentEleve: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [assignedEncadreur, setAssignedEncadreur] = useState<Encadreur | null>(null);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [showMessageCenter, setShowMessageCenter] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  
  const parentEleve = user as ParentEleve;

  useEffect(() => {
    loadData();
    
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
  }, [parentEleve.assignedEncadreur, user?.id]);

  const performAutoSync = async () => {
    if (!user || isSyncing) return;

    try {
      setIsSyncing(true);
      console.log('🔄 Synchronisation automatique parent/élève:', user.email);
      
      // Forcer la synchronisation des données
      localDB.forceSyncData();
      
      // Actualiser les données de l'utilisateur
      await refreshUser();
      
      // Recharger les données locales
      await loadData();
      
      setLastSync(new Date());
      console.log('✅ Synchronisation terminée pour parent/élève:', user.email);
    } catch (error) {
      console.error('❌ Erreur synchronisation automatique parent/élève:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadData = async () => {
    try {
      // Forcer la synchronisation avant de charger les données
      localDB.forceSyncData();
      
      // Charger l'encadreur assigné avec synchronisation automatique
      if (parentEleve.assignedEncadreur) {
        const users: User[] = localDB.getAllUsers();
        const encadreur = users.find((u): u is Encadreur => 
          u.role === 'ENCADREUR' && u.id === parentEleve.assignedEncadreur
        ) as Encadreur;
        setAssignedEncadreur(encadreur);
        setShowWelcomeMessage(false);
      }

      // Compter les messages non lus avec synchronisation
      const messages = localDB.getMessages(user?.id || '');
      const unread = messages.filter((msg: any) => 
        msg.type === 'received' && !msg.read
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('❌ Erreur chargement données parent/élève:', error);
    }
  };

  const handleCall = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleSMS = (phoneNumber: string) => {
    window.open(`sms:${phoneNumber}`, '_self');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  const formatLastSync = () => {
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

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: UserIcon },
    { id: 'profile', label: 'Mon Profil', icon: BookOpen },
    { id: 'encadreur', label: 'Mon Encadreur', icon: Users },
    { 
      id: 'messages', 
      label: 'Messages', 
      icon: MessageCircle,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Statut de synchronisation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Statut de synchronisation</h3>
          <button
            onClick={performAutoSync}
            disabled={isSyncing}
            className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser'}</span>
          </button>
        </div>
        <div className="mt-2">
          {renderSyncStatus()}
        </div>
      </div>

      {showWelcomeMessage && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-orange-800 font-semibold">Bienvenue sur la plateforme !</h3>
              <p className="text-orange-700 mt-1">
                Merci pour votre inscription. Nous étudions votre profil afin de voir à quel encadreur nous pouvons vous connecter.
                Vos données sont automatiquement synchronisées sur tous vos appareils.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Statut</p>
              <p className={`text-2xl font-bold ${assignedEncadreur ? 'text-green-600' : 'text-orange-600'}`}>
                {assignedEncadreur ? 'Connecté' : 'En attente'}
              </p>
            </div>
            <CheckCircle className={`w-8 h-8 ${assignedEncadreur ? 'text-green-600' : 'text-orange-600'}`} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pack choisi</p>
              <p className="text-2xl font-bold text-blue-600 uppercase">{parentEleve.packChoisi}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Classe</p>
              <p className="text-2xl font-bold text-purple-600">{parentEleve.classeApprenant}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Messages non lus</p>
              <p className="text-2xl font-bold text-green-600">{unreadCount}</p>
            </div>
            <MessageCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {assignedEncadreur && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Votre Encadreur</h3>
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4 overflow-hidden">
              {assignedEncadreur.profilePhoto ? (
                <img 
                  src={assignedEncadreur.profilePhoto} 
                  alt="Encadreur"
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-800">
                {assignedEncadreur.nom} {assignedEncadreur.prenoms}
              </h4>
              <p className="text-sm text-gray-600">
                {assignedEncadreur.disciplines.join(', ')} • {assignedEncadreur.communeIntervention}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleCall(assignedEncadreur.telephone)}
                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                title="Appeler"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSMS(assignedEncadreur.telephone)}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                title="SMS"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleEmail(assignedEncadreur.email)}
                className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                title="Email"
              >
                <Mail className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Mon Profil Complet</h3>
        <div className="text-right">
          {renderSyncStatus()}
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Informations parent */}
        <div>
          <h4 className="font-medium text-gray-800 mb-3">Informations du parent</h4>
          <div className="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Nom complet</p>
              <p className="font-medium">{parentEleve.nomParent} {parentEleve.prenomsParent}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{parentEleve.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Téléphone</p>
              <p className="font-medium">{parentEleve.telephone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Profession</p>
              <p className="font-medium">{parentEleve.profession}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Commune de résidence</p>
              <p className="font-medium">{parentEleve.communeResidence}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pack choisi</p>
              <p className="font-medium uppercase">{parentEleve.packChoisi}</p>
            </div>
          </div>
        </div>

        {/* Informations apprenant */}
        <div>
          <h4 className="font-medium text-gray-800 mb-3">Informations de l'apprenant</h4>
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nom complet</p>
                <p className="font-medium">{parentEleve.nomApprenant} {parentEleve.prenomsApprenant}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Âge</p>
                <p className="font-medium">{parentEleve.ageApprenant} ans</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Classe</p>
                <p className="font-medium">{parentEleve.classeApprenant}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Commune</p>
                <p className="font-medium">{parentEleve.communeApprenant}</p>
              </div>
            </div>
            
            {parentEleve.besoins.length > 0 && (
              <div>
                <p className="text-sm text-gray-600">Besoins spécifiques</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parentEleve.besoins.map(besoin => (
                    <span key={besoin} className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm">
                      {besoin}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderEncadreur = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Mon Encadreur</h3>
          <div className="text-right">
            {renderSyncStatus()}
          </div>
        </div>
      </div>

      {!assignedEncadreur ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Aucun encadreur assigné pour le moment
          </h3>
          <p className="text-gray-600">
            Votre encadreur apparaîtra ici une fois qu'il vous sera assigné par l'administrateur.
            Les données sont synchronisées automatiquement sur tous vos appareils.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                {assignedEncadreur.profilePhoto ? (
                  <img 
                    src={assignedEncadreur.profilePhoto} 
                    alt="Encadreur"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {assignedEncadreur.nom} {assignedEncadreur.prenoms}
                </h3>
                <p className="text-gray-600">Votre encadreur personnel</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              Assigné
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Informations de contact</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{assignedEncadreur.telephone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{assignedEncadreur.email}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-800 mb-3">Spécialités</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Disciplines</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {assignedEncadreur.disciplines.map(discipline => (
                      <span key={discipline} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {discipline}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Classes enseignées</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {assignedEncadreur.classesEnseignement.map(classe => (
                      <span key={classe} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        {classe}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Commune d'intervention</p>
                  <p className="font-medium">{assignedEncadreur.communeIntervention}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex space-x-4">
              <button
                onClick={() => handleCall(assignedEncadreur.telephone)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Appeler</span>
              </button>
              <button
                onClick={() => handleSMS(assignedEncadreur.telephone)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>SMS</span>
              </button>
              <button
                onClick={() => handleEmail(assignedEncadreur.email)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMessages = () => {
    if (showMessageCenter) {
      return (
        <MessageCenter onClose={() => setShowMessageCenter(false)} />
      );
    }

    const notifications = localDB.getNotifications(user?.id || '')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Messages et Notifications</h3>
          <div className="flex items-center space-x-4">
            {renderSyncStatus()}
            <button
              onClick={() => setShowMessageCenter(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Centre de Messages</span>
            </button>
          </div>
        </div>
        
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Aucune notification pour le moment
            </h3>
            <p className="text-gray-600">
              Vos notifications apparaîtront ici et seront synchronisées automatiquement.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.slice(0, 5).map((notification: any) => (
              <div key={notification.id} className={`p-4 rounded-lg border ${
                notification.read ? 'bg-gray-50 border-gray-200' : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 mb-1">{notification.title}</h4>
                    <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(notification.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Paramètres du compte</h3>
        <div className="text-right">
          {renderSyncStatus()}
        </div>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom d'utilisateur
          </label>
          <input
            type="text"
            value={parentEleve.username}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nouveau mot de passe
          </label>
          <input
            type="password"
            placeholder="Laissez vide pour conserver le mot de passe actuel"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <h4 className="font-semibold text-orange-800 mb-2">Synchronisation automatique</h4>
          <p className="text-orange-700 text-sm mb-3">
            Vos données sont automatiquement synchronisées toutes les 30 secondes et lors de chaque action.
            Vous pouvez accéder à vos informations depuis n'importe quel appareil.
          </p>
          <button
            onClick={performAutoSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}</span>
          </button>
        </div>

        <button className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          Sauvegarder les modifications
        </button>
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
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 overflow-hidden">
                  {parentEleve.profilePhoto ? (
                    <img 
                      src={parentEleve.profilePhoto} 
                      alt="Profil"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-8 h-8 text-orange-600" />
                  )}
                </div>
                <h2 className="font-semibold text-gray-800">
                  {parentEleve.prenomsParent} {parentEleve.nomParent}
                </h2>
                <p className="text-sm text-gray-600">Parent/Élève</p>
                <div className="mt-2">
                  {renderSyncStatus()}
                </div>
              </div>

              <nav className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </div>
                      {tab.badge && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'encadreur' && renderEncadreur()}
            {activeTab === 'messages' && renderMessages()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardParentEleve;