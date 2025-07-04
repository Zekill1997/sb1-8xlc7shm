import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Encadreur, ParentEleve } from '../../types';
import { 
  Send, 
  Search, 
  User as UserIcon, 
  MessageCircle, 
  Users,
  CheckCircle,
  X,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  BookOpen,
  Shield
} from 'lucide-react';
import { localDB } from '../../services/localDatabase';
import { databaseService } from '../../services/databaseService';

interface AdminMessagingProps {
  onClose?: () => void;
}

const AdminMessaging: React.FC<AdminMessagingProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [messageForm, setMessageForm] = useState({
    subject: '',
    content: ''
  });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      // Forcer la synchronisation avant de charger les données
      localDB.forceSyncData();
      
      // Charger tous les utilisateurs
      const allUsers = await databaseService.getAllUsers();
      
      // Exclure l'administrateur actuel
      const otherUsers = allUsers.filter(u => u.id !== user?.id);
      
      setUsers(otherUsers);
      setFilteredUsers(otherUsers);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

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

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const sendMessage = async () => {
    if (!messageForm.subject.trim() || !messageForm.content.trim()) {
      alert('Veuillez remplir le sujet et le contenu du message');
      return;
    }

    if (selectedUsers.length === 0) {
      alert('Veuillez sélectionner au moins un destinataire');
      return;
    }

    setIsSending(true);

    try {
      const allMessages = localDB.getAllMessages() || [];
      const notifications = localDB.getNotifications(user?.id || '') || [];
      const timestamp = new Date().toISOString();

      // Créer un message pour chaque utilisateur sélectionné
      for (const userId of selectedUsers) {
        // Utiliser le service de base de données avec synchronisation
        const result = await databaseService.sendMessage(
          user?.id || '',
          userId,
          messageForm.subject,
          messageForm.content
        );
        
        if (result.success) {
          // Créer une notification
          await databaseService.createNotification(
            userId,
            'MESSAGE',
            'Nouveau message de l\'administration',
            `Vous avez reçu un nouveau message: ${messageForm.subject}`,
            { messageId: result.messageId }
          );
        }
      }

      // Réinitialiser le formulaire
      setMessageForm({ subject: '', content: '' });
      setSelectedUsers([]);
      
      alert(`Message envoyé avec succès à ${selectedUsers.length} utilisateur(s) !`);
    } catch (error) {
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setIsSending(false);
    }
  };

  const getUserName = (user: User): string => {
    if (user.role === 'ENCADREUR') {
      const encadreur = user as Encadreur;
      return `${encadreur.prenoms} ${encadreur.nom}`;
    } else if (user.role === 'PARENT_ELEVE') {
      const parent = user as ParentEleve;
      return `${parent.prenomsParent} ${parent.nomParent}`;
    }
    return user.username;
  };

  const getRoleLabel = (role: string): string => {
    const labels = {
      'ENCADREUR': 'Encadreur',
      'PARENT_ELEVE': 'Parent/Élève',
      'ADMINISTRATEUR': 'Administrateur'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleColor = (role: string): string => {
    const colors = {
      'ENCADREUR': 'bg-blue-100 text-blue-800',
      'PARENT_ELEVE': 'bg-orange-100 text-orange-800',
      'ADMINISTRATEUR': 'bg-yellow-100 text-yellow-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-6xl mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <Mail className="w-6 h-6 mr-3 text-yellow-600" />
              Envoyer un message aux utilisateurs
            </h3>
            <p className="text-gray-600 mt-1">
              Sélectionnez les destinataires et rédigez votre message
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 p-6">
        {/* Section de sélection des utilisateurs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-800">
              Sélectionner les destinataires
            </h4>
            <div className="text-sm text-gray-600">
              {selectedUsers.length} sélectionné(s)
            </div>
          </div>

          {/* Filtres */}
          <div className="space-y-3">
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

            <div className="flex items-center space-x-4">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="ALL">Tous les rôles</option>
                <option value="ENCADREUR">Encadreurs</option>
                <option value="PARENT_ELEVE">Parents/Élèves</option>
              </select>

              <button
                onClick={selectAllUsers}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                {selectedUsers.length === filteredUsers.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
          </div>

          {/* Liste des utilisateurs */}
          <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun utilisateur trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedUsers.includes(user.id) ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
                    }`}
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                      />
                      
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {(user as any).profilePhoto ? (
                          <img 
                            src={(user as any).profilePhoto} 
                            alt="Profil"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-800">
                            {getUserName(user)}
                          </h5>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-600 mt-1">
                          <span className="flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {(user as any).email}
                          </span>
                          <span className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {(user as any).telephone}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {getCommuneInfo(user)}
                          </span>
                        </div>

                        {user.role === 'PARENT_ELEVE' && (
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            <span className="flex items-center">
                              <GraduationCap className="w-3 h-3 mr-1" />
                              {(user as ParentEleve).classeApprenant}
                            </span>
                          </div>
                        )}

                        {user.role === 'ENCADREUR' && (
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            <span className="flex items-center">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {(user as Encadreur).disciplines.slice(0, 2).join(', ')}
                              {(user as Encadreur).disciplines.length > 2 && '...'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section de composition du message */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-800">
            Composer le message
          </h4>

          {selectedUsers.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center text-yellow-800">
                <MessageCircle className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">
                  Ce message sera envoyé à {selectedUsers.length} destinataire(s)
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sujet du message *
              </label>
              <input
                type="text"
                value={messageForm.subject}
                onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Entrez le sujet du message"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contenu du message *
              </label>
              <textarea
                value={messageForm.content}
                onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Rédigez votre message ici..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setMessageForm({ subject: '', content: '' });
                  setSelectedUsers([]);
                }}
                className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              
              <button
                onClick={sendMessage}
                disabled={isSending || selectedUsers.length === 0 || !messageForm.subject.trim() || !messageForm.content.trim()}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Envoi...' : 'Envoyer le message'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMessaging;