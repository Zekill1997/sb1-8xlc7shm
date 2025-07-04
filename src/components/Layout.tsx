import React, { ReactNode, useState, useEffect } from 'react';
import { User, Phone, Mail, LogOut, Bell, MessageCircle, HelpCircle, X, RefreshCw, Wifi, WifiOff, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../services/databaseService';
import Logo from './Logo';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showHeader = true }) => {
  const { user, logout, refreshUser, getSyncStatus, forceSync } = useAuth();
  const [showSupportMenu, setShowSupportMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotificationsAndMessages();
      updateSyncStatus();
      
      // Mettre à jour le statut de sync toutes les 5 secondes
      const statusInterval = setInterval(() => {
        updateSyncStatus();
      }, 5000);

      // Écouter les événements de synchronisation
      const handleDatabaseSync = () => {
        loadNotificationsAndMessages();
        updateSyncStatus();
      };

      window.addEventListener('databaseSync', handleDatabaseSync);

      // Écouter les changements de connectivité
      const handleOnline = () => {
        updateSyncStatus();
        performAutoSync();
      };
      
      const handleOffline = () => {
        updateSyncStatus();
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
        clearInterval(statusInterval);
        window.removeEventListener('databaseSync', handleDatabaseSync);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [user]);

  const updateSyncStatus = () => {
    setSyncStatus(getSyncStatus());
  };

  const performAutoSync = async () => {
    if (!user || isSyncing) return;

    try {
      setIsSyncing(true);
      console.log('🔄 Synchronisation manuelle déclenchée');
      
      const result = await forceSync();
      if (result.success) {
        await refreshUser();
        await loadNotificationsAndMessages();
        console.log('✅ Synchronisation manuelle réussie');
      } else {
        console.warn('⚠️ Échec synchronisation:', result.error);
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation manuelle:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadNotificationsAndMessages = async () => {
    if (!user) return;

    try {
      // Utiliser le service de base de données avec synchronisation
      const allUsers = await databaseService.getAllUsers();
      const userNotifications: any[] = []; // Simuler les notifications pour l'instant
      const userMessages: any[] = []; // Simuler les messages pour l'instant

      setUnreadNotifications(userNotifications.filter(n => !n.read).length);
      setUnreadMessages(userMessages.filter(m => !m.read).length);
      setNotifications(userNotifications.slice(0, 5));
      setMessages(userMessages.slice(0, 5));
    } catch (error) {
      console.error('Erreur lors du chargement des notifications/messages:', error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const toggleSupportMenu = () => {
    setShowSupportMenu(!showSupportMenu);
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowMessages(false);
    setShowProfileMenu(false);
  };

  const handleMessageClick = () => {
    setShowMessages(!showMessages);
    setShowNotifications(false);
    setShowProfileMenu(false);
  };

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowNotifications(false);
    setShowMessages(false);
  };

  const getUserName = () => {
    if (!user) return '';
    
    if (user.role === 'PARENT_ELEVE') {
      const parent = user as any;
      return `${parent.prenomsParent} ${parent.nomParent}`;
    } else if (user.role === 'ENCADREUR') {
      const encadreur = user as any;
      return `${encadreur.prenoms} ${encadreur.nom}`;
    } else {
      const admin = user as any;
      return `${admin.prenoms} ${admin.nom}`;
    }
  };

  const getProfileRoute = () => {
    if (!user) return '#';
    
    switch (user.role) {
      case 'ENCADREUR':
        return '/dashboard/encadreur';
      case 'PARENT_ELEVE':
        return '/dashboard/parent-eleve';
      case 'ADMINISTRATEUR':
        return '/dashboard/administrateur';
      default:
        return '#';
    }
  };

  const formatLastSync = () => {
    const now = new Date();
    const diffMs = now.getTime() - syncStatus.lastSync.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 60) {
      return `il y a ${diffSeconds}s`;
    } else if (diffMinutes < 60) {
      return `il y a ${diffMinutes}min`;
    } else {
      return syncStatus.lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderSyncStatus = () => (
    <div className="flex items-center space-x-2 text-xs">
      <div className="flex items-center space-x-1">
        {syncStatus.isOnline ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-500" />
        )}
        <span className={`${syncStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}>
          {syncStatus.mode}
        </span>
      </div>
      {isSyncing ? (
        <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
      ) : (
        <span className="text-gray-500">• Sync: {formatLastSync()}</span>
      )}
    </div>
  );

  const renderNotifications = () => {
    return (
      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {renderSyncStatus()}
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Aucune notification</p>
              <p className="text-xs text-gray-400 mt-1">Synchronisé sur tous vos appareils</p>
            </div>
          ) : (
            notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-800">{notification.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    return (
      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Messages récents</h3>
            {renderSyncStatus()}
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Aucun message</p>
              <p className="text-xs text-gray-400 mt-1">Synchronisé sur tous vos appareils</p>
            </div>
          ) : (
            messages.map((message: any) => (
              <div
                key={message.id}
                className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  !message.read ? 'bg-green-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-800">
                      De: {message.fromUser?.name || 'Utilisateur'}
                    </h4>
                    <p className="text-sm text-gray-700 mt-1">{message.subject}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{message.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(message.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!message.read && (
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-1"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderProfileMenu = () => {
    return (
      <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
              {(user as any)?.profilePhoto ? (
                <img 
                  src={(user as any).profilePhoto} 
                  alt="Profil"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-800">{getUserName()}</p>
              <p className="text-sm text-gray-600">
                {user?.role === 'ENCADREUR' && 'Encadreur'}
                {user?.role === 'PARENT_ELEVE' && 'Parent/Élève'}
                {user?.role === 'ADMINISTRATEUR' && 'Administrateur'}
              </p>
            </div>
          </div>
          <div className="mt-3">
            {renderSyncStatus()}
          </div>
        </div>
        <div className="p-2">
          <a
            href={getProfileRoute()}
            onClick={() => setShowProfileMenu(false)}
            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Voir mon profil
          </a>
          <button
            onClick={performAutoSync}
            disabled={isSyncing}
            className="block w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-2">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}</span>
            </div>
          </button>
          <button
            onClick={() => {
              setShowProfileMenu(false);
              handleLogout();
            }}
            className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      {showHeader && (
        <header className="bg-white shadow-sm border-b border-blue-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-6">
                {/* Logo et nom de l'application */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 relative">
                    <div className="w-10 h-10 rounded-full bg-white shadow-md border-2 border-blue-200 overflow-hidden flex items-center justify-center">
                      <img 
                        src="/WhatsApp Image 2025-06-14 at 9.27.25 PM (1).jpeg" 
                        alt="SUPER@PPRENANT-CI Logo"
                        className="w-10 h-10 object-cover rounded-full"
                      />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-blue-600">SUPER@PPRENANT-CI</h1>
                    <p className="text-xs text-gray-500 italic">Connecter l'excellence éducative</p>
                  </div>
                </div>
                
                {/* Informations de contact */}
                <div className="hidden lg:flex flex-col text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>00225 01 60 15 50 58 | 00225 05 45 94 97 67 | 00225 07 47 26 25 77</span>
                  </div>
                  <div className="flex items-center space-x-1 mt-1">
                    <Mail className="w-3 h-3" />
                    <span>superapprenant25@gmail.com</span>
                  </div>
                </div>
              </div>
              
              {user && (
                <div className="flex items-center space-x-4">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-700">
                      Bienvenue, {getUserName()}
                    </span>
                    {renderSyncStatus()}
                  </div>
                  
                  <div className="flex items-center space-x-2 relative">
                    {/* Statut de synchronisation */}
                    <div className="relative">
                      <button 
                        onClick={performAutoSync}
                        disabled={isSyncing}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                        title="Synchroniser"
                      >
                        <Database className={`w-5 h-5 ${isSyncing ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>

                    {/* Notifications */}
                    <div className="relative">
                      <button 
                        onClick={handleNotificationClick}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative"
                      >
                        <Bell className="w-5 h-5" />
                        {unreadNotifications > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadNotifications > 9 ? '9+' : unreadNotifications}
                          </span>
                        )}
                      </button>
                      {showNotifications && renderNotifications()}
                    </div>

                    {/* Messages */}
                    <div className="relative">
                      <button 
                        onClick={handleMessageClick}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative"
                      >
                        <MessageCircle className="w-5 h-5" />
                        {unreadMessages > 0 && (
                          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
                      </button>
                      {showMessages && renderMessages()}
                    </div>
                    
                    {/* Support */}
                    <button
                      onClick={toggleSupportMenu}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                      title="Support"
                    >
                      <HelpCircle className="w-5 h-5" />
                    </button>
                    
                    {/* Profile */}
                    <div className="relative">
                      <button
                        onClick={handleProfileClick}
                        className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        {(user as any)?.profilePhoto ? (
                          <img 
                            src={(user as any).profilePhoto} 
                            alt="Profil"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                      {showProfileMenu && renderProfileMenu()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      
      <main className="flex-1">
        {children}
      </main>
      
      {/* Support Menu Modal */}
      {showSupportMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <HelpCircle className="w-5 h-5 mr-2 text-green-600" />
                  Support & Contact
                </h3>
                <button
                  onClick={() => setShowSupportMenu(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    Numéros de téléphone
                  </h4>
                  <div className="space-y-2 text-sm text-green-700">
                    <div className="flex items-center justify-between">
                      <span>00225 01 60 15 50 58</span>
                      <a 
                        href="tel:+22501601550558" 
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Appeler
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>00225 05 45 94 97 67</span>
                      <a 
                        href="tel:+22505459497667" 
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Appeler
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>00225 07 47 26 25 77</span>
                      <a 
                        href="tel:+22507472625777" 
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Appeler
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">superapprenant25@gmail.com</span>
                    <a 
                      href="mailto:superapprenant25@gmail.com" 
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Écrire
                    </a>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Heures d'ouverture</h4>
                  <p className="text-sm text-yellow-700">
                    Lundi - Vendredi: 8h00 - 18h00<br />
                    Samedi: 9h00 - 15h00<br />
                    Dimanche: Fermé
                  </p>
                </div>

                {/* Statut de synchronisation dans le support */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Statut de synchronisation</h4>
                  <div className="flex items-center justify-between">
                    {renderSyncStatus()}
                    <button
                      onClick={performAutoSync}
                      disabled={isSyncing}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    >
                      {isSyncing ? 'Synchronisation...' : 'Synchroniser'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Support Contact Button (Fixed) */}
      {!showSupportMenu && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={toggleSupportMenu}
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
            title="Contacter le support"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Overlay pour fermer les menus */}
      {(showNotifications || showMessages || showProfileMenu) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowNotifications(false);
            setShowMessages(false);
            setShowProfileMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default Layout;