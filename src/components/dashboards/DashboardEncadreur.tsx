import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Encadreur, ParentEleve, User } from '../../types';
import { localDB } from '../../services/localDatabase';
import Layout from '../Layout';
import MessageCenter from '../messaging/MessageCenter';
import { 
  User as UserIcon, 
  BookOpen, 
  Users, 
  Settings, 
  MessageCircle, 
  Send,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  Heart,
  Brain,
  GraduationCap,
  Target,
  MessageSquare,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';

const DashboardEncadreur: React.FC = () => {
  const { user, updateUser, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [assignedStudents, setAssignedStudents] = useState<ParentEleve[]>([]);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [showMessageCenter, setShowMessageCenter] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  
  const encadreur = user as Encadreur;

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
  }, [user?.id]);

  const performAutoSync = async () => {
    if (!user || isSyncing) return;

    try {
      setIsSyncing(true);
      console.log('🔄 Synchronisation automatique encadreur:', user.email);
      
      // Forcer la synchronisation des données
      localDB.forceSyncData();
      
      // Actualiser les données de l'utilisateur
      await refreshUser();
      
      // Recharger les données locales
      await loadData();
      
      setLastSync(new Date());
      console.log('✅ Synchronisation terminée pour encadreur:', user.email);
    } catch (error) {
      console.error('❌ Erreur synchronisation automatique encadreur:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadData = async () => {
    try {
      // Forcer la synchronisation avant de charger les données
      localDB.forceSyncData();
      
      // Charger les étudiants assignés avec synchronisation automatique
      const users: User[] = localDB.getAllUsers();
      const assigned = users.filter((u): u is ParentEleve => 
        u.role === 'PARENT_ELEVE' && (u as ParentEleve).assignedEncadreur === user?.id
      ) as ParentEleve[];
      setAssignedStudents(assigned);
      
      // Masquer le message de bienvenue si l'utilisateur a des étudiants
      if (assigned.length > 0) {
        setShowWelcomeMessage(false);
      }

      // Compter les messages non lus avec synchronisation
      const messages = localDB.getMessages(user?.id || '');
      const unread = messages.filter((msg: any) => 
        msg.type === 'received' && !msg.read
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('❌ Erreur chargement données encadreur:', error);
    }
  };

  const getProfilApprentissage = (profilApprentissage: any): string => {
    if (!profilApprentissage) return 'Non défini';
    
    const responses = Object.values(profilApprentissage);
    const aCount = responses.filter(r => r === 'a').length;
    const bCount = responses.filter(r => r === 'b').length;
    const cCount = responses.filter(r => r === 'c').length;
    
    if (aCount >= bCount && aCount >= cCount) {
      return 'Visuel - Apprend mieux avec des supports visuels, graphiques et schémas';
    } else if (bCount >= aCount && bCount >= cCount) {
      return 'Auditif - Apprend mieux en écoutant et par les explications orales';
    } else {
      return 'Kinesthésique - Apprend mieux par la pratique et les activités physiques';
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
    { id: 'students', label: 'Mes Élèves', icon: Users },
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
            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
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
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-blue-800 font-semibold">Bienvenue sur la plateforme !</h3>
              <p className="text-blue-700 mt-1">
                Merci pour votre inscription. Nous étudions votre profil afin de voir à quel(s) parent/élève nous pouvons vous connecter.
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
              <p className="text-sm text-gray-600">Élèves assignés</p>
              <p className="text-2xl font-bold text-blue-600">{assignedStudents.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Capacité maximum</p>
              <p className="text-2xl font-bold text-orange-600">{encadreur.maxStudents}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Places disponibles</p>
              <p className="text-2xl font-bold text-green-600">
                {encadreur.maxStudents - assignedStudents.length}
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Messages non lus</p>
              <p className="text-2xl font-bold text-purple-600">{unreadCount}</p>
            </div>
            <MessageCircle className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {assignedStudents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Mes Élèves Récents</h3>
          <div className="space-y-4">
            {assignedStudents.slice(0, 3).map(student => (
              <div key={student.id} className="flex items-center p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                  {student.profilePhoto ? (
                    <img 
                      src={student.profilePhoto} 
                      alt="Profil"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-5 h-5 text-orange-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">
                    {student.nomApprenant} {student.prenomsApprenant}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <GraduationCap className="w-3 h-3 mr-1" />
                      {student.classeApprenant}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {student.communeApprenant}
                    </span>
                    {student.besoins.length > 0 && (
                      <span className="flex items-center">
                        <Target className="w-3 h-3 mr-1" />
                        {student.besoins.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleCall(student.telephone)}
                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    title="Appeler"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleSMS(student.telephone)}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    title="SMS"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEmail(student.email)}
                    className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                    title="Email"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
        {/* Photo de profil */}
        <div className="text-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {encadreur.profilePhoto ? (
              <img 
                src={encadreur.profilePhoto} 
                alt="Profil"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <UserIcon className="w-12 h-12 text-blue-600" />
            )}
          </div>
        </div>

        {/* Informations de connexion */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
            <UserIcon className="w-4 h-4 mr-2" />
            Informations de connexion
          </h4>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Identifiant:</span>
              <p className="font-medium">{encadreur.username}</p>
            </div>
            <div>
              <span className="text-gray-600">Date d'inscription:</span>
              <p className="font-medium">{new Date(encadreur.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <UserIcon className="w-4 h-4 mr-2" />
            Informations personnelles
          </h4>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Nom complet:</span>
              <p className="font-medium">{encadreur.nom} {encadreur.prenoms}</p>
            </div>
            <div>
              <span className="text-gray-600">Genre:</span>
              <p className="font-medium">{encadreur.genre}</p>
            </div>
            <div>
              <span className="text-gray-600">Téléphone:</span>
              <p className="font-medium flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                {encadreur.telephone}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Email:</span>
              <p className="font-medium flex items-center">
                <Mail className="w-3 h-3 mr-1" />
                {encadreur.email}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Commune de résidence:</span>
              <p className="font-medium flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {encadreur.communeResidence}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Commune d'intervention:</span>
              <p className="font-medium flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {encadreur.communeIntervention}
              </p>
            </div>
          </div>
        </div>

        {/* Informations professionnelles */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <Award className="w-4 h-4 mr-2" />
            Informations professionnelles
          </h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600">Dernier diplôme:</span>
              <p className="font-medium">{encadreur.dernierDiplome}</p>
            </div>
            <div>
              <span className="text-gray-600">Expérience professionnelle:</span>
              <p className="font-medium">{encadreur.experienceProfessionnelle ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <span className="text-gray-600">Classes enseignées:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {encadreur.classesEnseignement.map(classe => (
                  <span key={classe} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {classe}
                  </span>
                ))}
              </div>
            </div>
            {encadreur.disciplines.length > 0 && (
              <div>
                <span className="text-gray-600">Disciplines:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {encadreur.disciplines.map(discipline => (
                    <span key={discipline} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      {discipline}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <span className="text-gray-600">Capacité maximum:</span>
              <p className="font-medium">{encadreur.maxStudents} élèves</p>
            </div>
          </div>
        </div>

        {/* Motivation */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <Heart className="w-4 h-4 mr-2" />
            Motivation
          </h4>
          <p className="text-gray-700 text-sm leading-relaxed">{encadreur.motivation}</p>
        </div>
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Mes Élèves ({assignedStudents.length})</h3>
          <div className="text-right">
            {renderSyncStatus()}
          </div>
        </div>
      </div>

      {assignedStudents.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Aucun élève assigné pour le moment
          </h3>
          <p className="text-gray-600">
            Vos élèves apparaîtront ici une fois qu'ils vous seront assignés par l'administrateur.
            Les données sont synchronisées automatiquement sur tous vos appareils.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {assignedStudents.map(student => (
            <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                    {student.profilePhoto ? (
                      <img 
                        src={student.profilePhoto} 
                        alt="Profil"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-6 h-6 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {student.nomApprenant} {student.prenomsApprenant}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <GraduationCap className="w-4 h-4 mr-1" />
                        <strong>Classe:</strong> {student.classeApprenant}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {student.communeApprenant}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  Assigné
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Informations Parent</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Nom:</span> {student.nomParent} {student.prenomsParent}</p>
                    <p><span className="text-gray-600">Téléphone:</span> {student.telephone}</p>
                    <p><span className="text-gray-600">Email:</span> {student.email}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Informations Élève</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Âge:</span> {student.ageApprenant} ans</p>
                    <p><span className="text-gray-600">Commune:</span> {student.communeApprenant}</p>
                    <p><span className="text-gray-600">Pack:</span> {student.packChoisi}</p>
                  </div>
                </div>
              </div>

              {/* Matières demandées par l'élève */}
              {student.besoins.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Matières demandées par l'élève
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {student.besoins.map(besoin => (
                      <span key={besoin} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                        {besoin}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Matières enseignées par l'encadreur */}
              {encadreur.disciplines.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Mes matières enseignées
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {encadreur.disciplines.map(discipline => (
                      <span 
                        key={discipline} 
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          student.besoins.includes(discipline) 
                            ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {discipline}
                        {student.besoins.includes(discipline) && ' ✓'}
                      </span>
                    ))}
                  </div>
                  {student.besoins.some(besoin => encadreur.disciplines.includes(besoin)) && (
                    <p className="text-sm text-green-600 mt-2 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Correspondance parfaite avec les besoins de l'élève !
                    </p>
                  )}
                </div>
              )}

              {/* Profil d'Apprentissage */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                  <Brain className="w-4 h-4 mr-2" />
                  Profil d'Apprentissage de l'élève
                </h4>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-orange-800 font-medium">
                    {getProfilApprentissage(student.profilApprentissage)}
                  </p>
                </div>
              </div>

              {/* Boutons de contact */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleCall(student.telephone)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>Appeler</span>
                </button>
                <button
                  onClick={() => handleSMS(student.telephone)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>SMS</span>
                </button>
                <button
                  onClick={() => handleEmail(student.email)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </button>
              </div>
            </div>
          ))}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
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
                notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
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
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
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
            Identifiant
          </label>
          <input
            type="text"
            value={encadreur.username}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Synchronisation automatique</h4>
          <p className="text-blue-700 text-sm mb-3">
            Vos données sont automatiquement synchronisées toutes les 30 secondes et lors de chaque action.
            Vous pouvez accéder à vos informations depuis n'importe quel appareil.
          </p>
          <button
            onClick={performAutoSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}</span>
          </button>
        </div>

        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  {encadreur.profilePhoto ? (
                    <img 
                      src={encadreur.profilePhoto} 
                      alt="Profil"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <h2 className="font-semibold text-gray-800">
                  {encadreur.prenoms} {encadreur.nom}
                </h2>
                <p className="text-sm text-gray-600">Encadreur</p>
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
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
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
            {activeTab === 'students' && renderStudents()}
            {activeTab === 'messages' && renderMessages()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardEncadreur;