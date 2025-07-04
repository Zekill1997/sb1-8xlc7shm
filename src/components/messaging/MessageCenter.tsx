import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Encadreur, ParentEleve } from '../../types';
import { localDB } from '../../services/localDatabase';
import { databaseService } from '../../services/databaseService';
import { 
  Send, 
  Search, 
  User as UserIcon, 
  MessageCircle, 
  Clock,
  CheckCircle2,
  Circle,
  Shield,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
  Users,
  AlertCircle
} from 'lucide-react';

interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  createdAt: string;
  read: boolean;
  type: 'sent' | 'received';
}

interface MessageCenterProps {
  onClose?: () => void;
}

const MessageCenter: React.FC<MessageCenterProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    lastSync: new Date(),
    mode: navigator.onLine ? 'En ligne' : 'Hors ligne'
  });
  
  // Formulaire de composition
  const [composeForm, setComposeForm] = useState({
    to: '',
    subject: '',
    content: ''
  });

  // Formulaire de message groupé
  const [showGroupMessage, setShowGroupMessage] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupMessageForm, setGroupMessageForm] = useState({
    subject: '',
    content: ''
  });
  const [roleFilterGroup, setRoleFilterGroup] = useState<string>('ALL');

  useEffect(() => {
    try {
      loadMessages();
      loadUsers();
      updateSyncStatus();
    } catch (err) {
      console.error("Erreur lors de l'initialisation:", err);
      setError("Une erreur est survenue lors du chargement des données");
    }
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

  const performSync = async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      console.log('🔄 Synchronisation messages...');
      
      // Forcer la synchronisation des données
      try {
        localDB.forceSyncData();
      } catch (error) {
        console.warn('Avertissement lors de la synchronisation des données:', error);
      }
      
      await loadMessages();
      await loadUsers();
      
      console.log('✅ Synchronisation messages réussie');
    } catch (error) {
      console.error('❌ Erreur synchronisation messages:', error);
      setError("Erreur de synchronisation");
    } finally {
      setIsSyncing(false);
      updateSyncStatus();
    }
  };

  const loadMessages = async () => {
    if (!user) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('📬 Chargement messages pour:', user.email, 'Rôle:', user.role);
      
      // Forcer la synchronisation des données
      try {
        localDB.forceSyncData();
      } catch (error) {
        console.warn('Avertissement lors de la synchronisation des données:', error);
      }
      
      let messagesData: any[] = [];
      
      try {
        if (user.role === 'ADMINISTRATEUR') {
          // Pour les administrateurs, charger TOUS les messages de la plateforme
          console.log('👑 Chargement de tous les messages pour administrateur');
          messagesData = localDB.getAllMessages();
        } else {
          // Pour les autres utilisateurs, charger seulement leurs messages
          messagesData = localDB.getMessages(user.id);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
        messagesData = [];
      }
      
      console.log('✅ Messages chargés:', messagesData.length);
      setMessages(messagesData);
      setError(null);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des messages:', error);
      setMessages([]);
      setError("Erreur lors du chargement des messages");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!user) {
      setUsers([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('👥 Chargement utilisateurs pour messagerie...');
      
      // Récupérer les utilisateurs localement pour éviter les erreurs
      let allUsers: User[] = [];
      try {
        allUsers = localDB.getAllUsers();
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        allUsers = [];
      }
      
      let availableUsers: User[] = [];
      
      console.log('📊 Total utilisateurs trouvés:', allUsers.length);
      
      // Logique de filtrage selon le rôle de l'utilisateur
      if (user.role === 'ADMINISTRATEUR') {
        // Les administrateurs peuvent envoyer des messages à TOUS les utilisateurs
        availableUsers = allUsers.filter((u: User) => u.id !== user.id);
        console.log('👑 Admin peut envoyer à tous les utilisateurs:', availableUsers.length);
      } else if (user.role === 'ENCADREUR') {
        // Les encadreurs peuvent envoyer des messages aux administrateurs et à leurs élèves assignés
        const encadreur = user as Encadreur;
        const assignedStudents = encadreur.assignedStudents || [];
        availableUsers = allUsers.filter((u: User) => 
          u.id !== user.id && (
            u.role === 'ADMINISTRATEUR' || 
            (u.role === 'PARENT_ELEVE' && assignedStudents.includes(u.id))
          )
        );
        console.log('👨‍🏫 Encadreur peut envoyer à:', availableUsers.length, 'utilisateurs');
      } else if (user.role === 'PARENT_ELEVE') {
        // Les parents/élèves peuvent envoyer des messages aux administrateurs et à leur encadreur assigné
        const parent = user as ParentEleve;
        availableUsers = allUsers.filter((u: User) => 
          u.id !== user.id && (
            u.role === 'ADMINISTRATEUR' || 
            (u.role === 'ENCADREUR' && parent.assignedEncadreur === u.id)
          )
        );
        console.log('👨‍👩‍👧‍👦 Parent peut envoyer à:', availableUsers.length, 'utilisateurs');
      }
      
      setUsers(availableUsers);
      console.log('✅ Utilisateurs disponibles pour messagerie:', availableUsers.length);
      setError(null);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des utilisateurs:', error);
      setUsers([]);
      setError("Erreur lors du chargement des utilisateurs");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!composeForm.to.trim() || !composeForm.subject.trim() || !composeForm.content.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    if (!user) {
      alert('Vous devez être connecté pour envoyer un message');
      return;
    }

    // Vérification supplémentaire des permissions
    const recipient = users.find(u => u.id === composeForm.to);
    if (!recipient) {
      alert('Destinataire invalide');
      return;
    }

    // Vérifications selon le rôle
    if (user.role === 'ENCADREUR') {
      const encadreur = user as Encadreur;
      const assignedStudents = encadreur.assignedStudents || [];
      if (recipient.role === 'PARENT_ELEVE' && !assignedStudents.includes(recipient.id)) {
        alert('Vous ne pouvez envoyer des messages qu\'aux élèves qui vous sont assignés et aux administrateurs');
        return;
      }
    } else if (user.role === 'PARENT_ELEVE') {
      const parent = user as ParentEleve;
      if (recipient.role === 'ENCADREUR' && parent.assignedEncadreur !== recipient.id) {
        alert('Vous ne pouvez envoyer des messages qu\'à votre encadreur assigné et aux administrateurs');
        return;
      }
    }

    setIsLoading(true);
    try {
      console.log('📧 Envoi message:', user.email, '->', recipient.email);
      
      // Utiliser le service de base de données avec synchronisation
      const result = await databaseService.sendMessage(
        user.id,
        composeForm.to,
        composeForm.subject,
        composeForm.content
      );

      if (result.success) {
        // Créer une notification pour le destinataire
        try {
          await databaseService.createNotification(
            composeForm.to,
            'MESSAGE',
            'Nouveau message',
            `Vous avez reçu un nouveau message de ${getUserName(user.id)}`,
            { messageId: result.messageId }
          );
        } catch (error) {
          console.warn('Avertissement lors de la création de notification:', error);
        }

        // Réinitialiser le formulaire
        setComposeForm({ to: '', subject: '', content: '' });
        setActiveTab('sent');
        await loadMessages();
        
        alert('Message envoyé avec succès !');
      } else {
        alert('Erreur lors de l\'envoi du message: ' + (result.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setIsLoading(false);
    }
  };

  const sendGroupMessage = async () => {
    if (!groupMessageForm.subject.trim() || !groupMessageForm.content.trim() || selectedUsers.length === 0) {
      alert('Veuillez remplir tous les champs et sélectionner au moins un destinataire');
      return;
    }

    if (!user) {
      alert('Vous devez être connecté pour envoyer un message');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📧 Envoi message groupé à', selectedUsers.length, 'utilisateurs');
      
      let successCount = 0;
      
      // Envoyer le message à chaque utilisateur sélectionné
      for (const userId of selectedUsers) {
        try {
          const result = await databaseService.sendMessage(
            user.id,
            userId,
            groupMessageForm.subject,
            groupMessageForm.content
          );

          if (result.success) {
            // Créer une notification pour le destinataire
            try {
              await databaseService.createNotification(
                userId,
                'MESSAGE',
                'Nouveau message de l\'administration',
                `Vous avez reçu un nouveau message: ${groupMessageForm.subject}`,
                { messageId: result.messageId }
              );
            } catch (notifError) {
              console.warn('Avertissement lors de la création de notification:', notifError);
            }
            
            successCount++;
          }
        } catch (msgError) {
          console.error('Erreur lors de l\'envoi du message à', userId, ':', msgError);
        }
      }
      
      // Réinitialiser le formulaire
      setGroupMessageForm({ subject: '', content: '' });
      setSelectedUsers([]);
      setShowGroupMessage(false);
      setActiveTab('sent');
      await loadMessages();
      
      alert(`Message envoyé avec succès à ${successCount} utilisateur(s) !`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du message groupé:', error);
      alert('Erreur lors de l\'envoi du message groupé');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const result = localDB.markMessageAsRead(messageId);
      if (result.success) {
        await loadMessages();
      }
    } catch (error) {
      console.error('❌ Erreur lors du marquage comme lu:', error);
    }
  };

  const getUserName = (userId: string): string => {
    if (!userId) return 'Utilisateur inconnu';
    
    const allUsers = [...users];
    if (user) allUsers.push(user);
    
    const foundUser = allUsers.find((u) => u.id === userId);
    if (!foundUser) return 'Utilisateur inconnu';
    
    if (foundUser.role === 'ENCADREUR') {
      const encadreur = foundUser as Encadreur;
      return `${encadreur.prenoms || ''} ${encadreur.nom || ''}`.trim() || encadreur.email || 'Encadreur';
    } else if (foundUser.role === 'PARENT_ELEVE') {
      const parent = foundUser as ParentEleve;
      return `${parent.prenomsParent || ''} ${parent.nomParent || ''}`.trim() || parent.email || 'Parent/Élève';
    } else {
      return foundUser.username || foundUser.email || 'Utilisateur';
    }
  };

  const getUserRole = (userId: string): string => {
    if (!userId) return 'Inconnu';
    
    const allUsers = [...users];
    if (user) allUsers.push(user);
    
    const foundUser = allUsers.find((u) => u.id === userId);
    const roleLabels: {[key: string]: string} = {
      'ENCADREUR': 'Encadreur',
      'PARENT_ELEVE': 'Parent/Élève',
      'ADMINISTRATEUR': 'Administrateur'
    };
    return foundUser ? roleLabels[foundUser.role] || 'Inconnu' : 'Inconnu';
  };

  const getRelationshipLabel = (userId: string): string => {
    if (!user || !userId) return '';
    
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return '';

    if (targetUser.role === 'ADMINISTRATEUR') {
      return ' 👑';
    }

    if (user.role === 'ENCADREUR') {
      const encadreur = user as Encadreur;
      const assignedStudents = encadreur.assignedStudents || [];
      if (targetUser.role === 'PARENT_ELEVE' && assignedStudents.includes(targetUser.id)) {
        return ' 👨‍🎓 (Mon élève)';
      }
    } else if (user.role === 'PARENT_ELEVE') {
      const parent = user as ParentEleve;
      if (targetUser.role === 'ENCADREUR' && parent.assignedEncadreur === targetUser.id) {
        return ' 👨‍🏫 (Mon encadreur)';
      }
    }

    return '';
  };

  const formatLastSync = () => {
    try {
      const now = new Date();
      const lastSyncDate = new Date(syncStatus.lastSync);
      
      const diffMs = now.getTime() - lastSyncDate.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      
      if (diffSeconds < 60) {
        return `il y a ${diffSeconds}s`;
      } else if (diffMinutes < 60) {
        return `il y a ${diffMinutes}min`;
      } else {
        return lastSyncDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }
    } catch (error) {
      console.error('Erreur lors du formatage de la date de synchronisation:', error);
      return 'inconnu';
    }
  };

  const renderSyncStatus = () => (
    <div className="flex items-center space-x-2 text-xs text-gray-500">
      {syncStatus.isOnline ? (
        <Wifi className="w-3 h-3 text-green-500" />
      ) : (
        <WifiOff className="w-3 h-3 text-red-500" />
      )}
      <span className={syncStatus.isOnline ? 'text-green-600' : 'text-red-600'}>
        {syncStatus.isOnline ? 'En ligne' : 'Hors ligne'}
      </span>
      {isSyncing ? (
        <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
      ) : (
        <span>• Sync: {formatLastSync()}</span>
      )}
    </div>
  );

  // Filtrer les messages de manière sécurisée
  const filteredMessages = messages.filter(msg => {
    if (!searchTerm) return true;
    
    try {
      const searchLower = searchTerm.toLowerCase();
      const fromName = getUserName(msg.from).toLowerCase();
      const toName = getUserName(msg.to).toLowerCase();
      
      return (
        (msg.subject || '').toLowerCase().includes(searchLower) ||
        (msg.content || '').toLowerCase().includes(searchLower) ||
        fromName.includes(searchLower) ||
        toName.includes(searchLower)
      );
    } catch (error) {
      console.error('Erreur lors du filtrage des messages:', error);
      return true;
    }
  });

  const inboxMessages = filteredMessages.filter(msg => msg.type === 'received');
  const sentMessages = filteredMessages.filter(msg => msg.type === 'sent');

  // Filtrer les utilisateurs pour le message groupé
  const filteredGroupUsers = users.filter(u => {
    if (roleFilterGroup !== 'ALL') {
      return u.role === roleFilterGroup;
    }
    return true;
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllFilteredUsers = () => {
    if (selectedUsers.length === filteredGroupUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredGroupUsers.map(u => u.id));
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[600px] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Centre de Messages
            </h3>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Une erreur est survenue</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                loadMessages();
                loadUsers();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Centre de Messages
            {user?.role === 'ADMINISTRATEUR' && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                Accès complet à tous les messages
              </span>
            )}
            {user?.role !== 'ADMINISTRATEUR' && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {user?.role === 'ENCADREUR' 
                  ? 'Messages vers administrateurs et élèves assignés'
                  : 'Messages vers administrateurs et encadreur assigné'
                }
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-2">
            {renderSyncStatus()}
            <button
              onClick={performSync}
              disabled={isSyncing}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
              title="Synchroniser"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-4 mt-4">
          <button
            onClick={() => {
              setActiveTab('inbox');
              setShowGroupMessage(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'inbox'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Boîte de réception ({inboxMessages.filter(m => !m.read).length})
          </button>
          <button
            onClick={() => {
              setActiveTab('sent');
              setShowGroupMessage(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Messages envoyés
          </button>
          <button
            onClick={() => {
              setActiveTab('compose');
              setShowGroupMessage(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'compose' && !showGroupMessage
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Nouveau message
          </button>
          
          {user?.role === 'ADMINISTRATEUR' && (
            <button
              onClick={() => {
                setActiveTab('compose');
                setShowGroupMessage(true);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'compose' && showGroupMessage
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Message groupé
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {(activeTab === 'inbox' || activeTab === 'sent') && (
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher dans les messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'inbox' && (
              <div className="h-full flex">
                {/* Message List */}
                <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
                  {inboxMessages.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun message reçu</p>
                      <p className="text-xs text-gray-400 mt-1">Synchronisé sur tous vos appareils</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {inboxMessages.map(message => (
                        <div
                          key={message.id}
                          onClick={() => {
                            setSelectedMessage(message);
                            if (!message.read) markAsRead(message.id);
                          }}
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            !message.read ? 'bg-blue-50' : ''
                          } ${selectedMessage?.id === message.id ? 'bg-blue-100' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-800">
                                  {getUserName(message.from)}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center">
                                  {getUserRole(message.from) === 'Administrateur' && (
                                    <Shield className="w-3 h-3 mr-1 text-yellow-600" />
                                  )}
                                  ({getUserRole(message.from)})
                                  {getRelationshipLabel(message.from)}
                                </span>
                                {!message.read && (
                                  <Circle className="w-2 h-2 text-blue-600 fill-current" />
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-700 mt-1">
                                {message.subject || "Sans objet"}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {message.content || ""}
                              </p>
                              <p className="text-xs text-gray-400 mt-2 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(message.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Detail */}
                <div className="w-1/2 overflow-y-auto">
                  {selectedMessage ? (
                    <div className="p-6">
                      <div className="border-b border-gray-200 pb-4 mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">
                          {selectedMessage.subject || "Sans objet"}
                        </h4>
                        <div className="flex items-center space-x-2 mt-2 text-sm text-gray-600">
                          <span>De: {getUserName(selectedMessage.from)}</span>
                          <span className="flex items-center">
                            {getUserRole(selectedMessage.from) === 'Administrateur' && (
                              <Shield className="w-3 h-3 mr-1 text-yellow-600" />
                            )}
                            ({getUserRole(selectedMessage.from)})
                            {getRelationshipLabel(selectedMessage.from)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(selectedMessage.createdAt).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {selectedMessage.content || ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Sélectionnez un message pour le lire</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'sent' && (
              <div className="h-full overflow-y-auto">
                {sentMessages.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Send className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucun message envoyé</p>
                    <p className="text-xs text-gray-400 mt-1">Synchronisé sur tous vos appareils</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {sentMessages.map(message => (
                      <div key={message.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-800">
                                À: {getUserName(message.to)}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center">
                                {getUserRole(message.to) === 'Administrateur' && (
                                  <Shield className="w-3 h-3 mr-1 text-yellow-600" />
                                )}
                                ({getUserRole(message.to)})
                                {getRelationshipLabel(message.to)}
                              </span>
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mt-1">
                              {message.subject || "Sans objet"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {message.content || ""}
                            </p>
                            <p className="text-xs text-gray-400 mt-2 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(message.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'compose' && !showGroupMessage && (
              <div className="h-full overflow-y-auto p-6">
                {user?.role !== 'ADMINISTRATEUR' && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center text-blue-800">
                      <Shield className="w-4 h-4 mr-2" />
                      <span className="text-sm">
                        {user?.role === 'ENCADREUR' 
                          ? 'Vous pouvez envoyer des messages aux administrateurs et à vos élèves assignés.'
                          : 'Vous pouvez envoyer des messages aux administrateurs et à votre encadreur assigné.'
                        }
                      </span>
                    </div>
                  </div>
                )}

                {user?.role === 'ADMINISTRATEUR' && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center text-yellow-800">
                      <Shield className="w-4 h-4 mr-2" />
                      <span className="text-sm">
                        En tant qu'administrateur, vous pouvez envoyer des messages à tous les utilisateurs de la plateforme.
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destinataire
                      <span className="text-xs text-gray-500 ml-2">
                        ({users.length} utilisateur(s) disponible(s))
                      </span>
                    </label>
                    <select
                      value={composeForm.to}
                      onChange={(e) => setComposeForm(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner un destinataire</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {getUserName(user.id)} ({getUserRole(user.id)})
                          {getRelationshipLabel(user.id)}
                        </option>
                      ))}
                    </select>
                    {users.length === 0 && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                          Aucun destinataire disponible. 
                          <button
                            onClick={loadUsers}
                            className="ml-2 text-red-600 hover:text-red-800 underline"
                          >
                            Actualiser la liste
                          </button>
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sujet
                    </label>
                    <input
                      type="text"
                      value={composeForm.subject}
                      onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Sujet du message"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={composeForm.content}
                      onChange={(e) => setComposeForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tapez votre message ici..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setComposeForm({ to: '', subject: '', content: '' })}
                      className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={!composeForm.to || !composeForm.subject || !composeForm.content || isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isLoading ? 'Envoi...' : 'Envoyer'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'compose' && showGroupMessage && (
              <div className="h-full overflow-y-auto p-6">
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center text-purple-800">
                    <Users className="w-4 h-4 mr-2" />
                    <span className="text-sm">
                      Envoi de message groupé à plusieurs utilisateurs simultanément
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Filtres et sélection des utilisateurs */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Sélectionner les destinataires
                      </label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={roleFilterGroup}
                          onChange={(e) => setRoleFilterGroup(e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="ALL">Tous les rôles</option>
                          <option value="ENCADREUR">Encadreurs</option>
                          <option value="PARENT_ELEVE">Parents/Élèves</option>
                        </select>
                        <button
                          onClick={selectAllFilteredUsers}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          {selectedUsers.length === filteredGroupUsers.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                      {filteredGroupUsers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <p>Aucun utilisateur disponible</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {filteredGroupUsers.map(user => (
                            <div
                              key={user.id}
                              className={`p-3 hover:bg-gray-50 cursor-pointer ${
                                selectedUsers.includes(user.id) ? 'bg-purple-50' : ''
                              }`}
                              onClick={() => toggleUserSelection(user.id)}
                            >
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.includes(user.id)}
                                  onChange={() => toggleUserSelection(user.id)}
                                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="font-medium text-gray-800">
                                  {getUserName(user.id)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({getUserRole(user.id)})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedUsers.length} utilisateur(s) sélectionné(s)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sujet
                    </label>
                    <input
                      type="text"
                      value={groupMessageForm.subject}
                      onChange={(e) => setGroupMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Sujet du message groupé"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={groupMessageForm.content}
                      onChange={(e) => setGroupMessageForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Tapez votre message groupé ici..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setGroupMessageForm({ subject: '', content: '' });
                        setSelectedUsers([]);
                        setShowGroupMessage(false);
                      }}
                      className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={sendGroupMessage}
                      disabled={selectedUsers.length === 0 || !groupMessageForm.subject || !groupMessageForm.content || isLoading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isLoading ? 'Envoi...' : `Envoyer à ${selectedUsers.length} utilisateur(s)`}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MessageCenter;