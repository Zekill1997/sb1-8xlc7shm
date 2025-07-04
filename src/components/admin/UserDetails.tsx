import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Encadreur, ParentEleve } from '../../types';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Award, 
  BookOpen, 
  Users,
  CheckCircle,
  X,
  Shield,
  Brain,
  GraduationCap,
  Briefcase,
  Heart,
  Target,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  Activity,
  Headphones,
  MessageCircle,
  Bell,
  CreditCard,
  School
} from 'lucide-react';
import { localDB } from '../../services/localDatabase';
import { databaseService } from '../../services/databaseService';

interface UserDetailsProps {
  userId: string;
  onClose: () => void;
  onRefresh?: () => void;
}

const UserDetails: React.FC<UserDetailsProps> = ({ userId, onClose, onRefresh }) => {
  const { user } = useAuth();
  const [userDetails, setUserDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  const loadUserDetails = async () => {
    try {
      setIsLoading(true);
      
      // Forcer la synchronisation avant de charger les détails
      localDB.forceSyncData();
      
      const details = localDB.getUserDetails(userId);
      setUserDetails(details);
      
      console.log('📊 Détails utilisateur chargés:', details);
    } catch (error) {
      console.error('❌ Erreur chargement détails utilisateur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadUserDetails();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg">Chargement des détails...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Utilisateur non trouvé</h3>
            <p className="text-gray-600 mb-4">Impossible de charger les détails de cet utilisateur.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const details = userDetails;

  const getProfilAnalysis = (profil: any, type: 'encadrant' | 'apprentissage'): { type: string; description: string; icon: any; color: string } => {
    if (!profil || Object.keys(profil).length === 0) {
      return {
        type: 'Non défini',
        description: 'Aucun profil défini',
        icon: AlertCircle,
        color: 'text-gray-500'
      };
    }

    const responses = Object.values(profil);
    const aCount = responses.filter(r => r === 'a').length;
    const bCount = responses.filter(r => r === 'b').length;
    const cCount = responses.filter(r => r === 'c').length;

    if (type === 'encadrant') {
      if (aCount >= bCount && aCount >= cCount) {
        return {
          type: 'Encadreur Visuel',
          description: 'Privilégie les supports visuels, graphiques et schémas pour enseigner. Utilise des démonstrations visuelles et des supports imagés.',
          icon: Eye,
          color: 'text-blue-600'
        };
      } else if (bCount >= aCount && bCount >= cCount) {
        return {
          type: 'Encadreur Auditif',
          description: 'Excelle dans les explications orales et les discussions. Privilégie la communication verbale et les échanges interactifs.',
          icon: Headphones,
          color: 'text-green-600'
        };
      } else {
        return {
          type: 'Encadreur Kinesthésique',
          description: 'Favorise l\'apprentissage par la pratique et les activités concrètes. Utilise des méthodes interactives et expérientielles.',
          icon: Activity,
          color: 'text-orange-600'
        };
      }
    } else {
      if (aCount >= bCount && aCount >= cCount) {
        return {
          type: 'Apprenant Visuel',
          description: 'Apprend mieux avec des supports visuels, des graphiques, des schémas et des démonstrations visuelles.',
          icon: Eye,
          color: 'text-blue-600'
        };
      } else if (bCount >= aCount && bCount >= cCount) {
        return {
          type: 'Apprenant Auditif',
          description: 'Apprend mieux en écoutant, par les explications orales, les discussions et les échanges verbaux.',
          icon: Headphones,
          color: 'text-green-600'
        };
      } else {
        return {
          type: 'Apprenant Kinesthésique',
          description: 'Apprend mieux par la pratique, les activités physiques et les expériences concrètes.',
          icon: Activity,
          color: 'text-orange-600'
        };
      }
    }
  };

  const renderProfilQuestionnaire = (profil: any, questions: any[], type: 'encadrant' | 'apprentissage') => {
    if (!profil || Object.keys(profil).length === 0) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucun questionnaire complété</p>
        </div>
      );
    }

    const analysis = getProfilAnalysis(profil, type);
    const Icon = analysis.icon;

    return (
      <div className="space-y-6">
        {/* Analyse du profil */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center mb-4">
            <Icon className={`w-8 h-8 ${analysis.color} mr-3`} />
            <div>
              <h4 className="text-xl font-bold text-gray-800">{analysis.type}</h4>
              <p className="text-gray-600 text-sm">Profil basé sur {Object.keys(profil).length} réponses</p>
            </div>
          </div>
          <p className="text-gray-700 leading-relaxed">{analysis.description}</p>
        </div>

        {/* Répartition des réponses */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3">Répartition des réponses</h5>
          <div className="grid grid-cols-3 gap-4">
            {['a', 'b', 'c'].map(option => {
              const count = Object.values(profil).filter(r => r === option).length;
              const percentage = (count / Object.keys(profil).length) * 100;
              const colors = {
                a: 'bg-blue-500',
                b: 'bg-green-500',
                c: 'bg-orange-500'
              };
              const labels = {
                a: type === 'encadrant' ? 'Visuel' : 'Visuel',
                b: type === 'encadrant' ? 'Auditif' : 'Auditif',
                c: type === 'encadrant' ? 'Kinesthésique' : 'Kinesthésique'
              };
              
              return (
                <div key={option} className="text-center">
                  <div className={`w-16 h-16 ${colors[option as keyof typeof colors]} rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-2`}>
                    {count}
                  </div>
                  <p className="text-sm font-medium text-gray-700">{labels[option as keyof typeof labels]}</p>
                  <p className="text-xs text-gray-500">{percentage.toFixed(0)}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Détail des réponses */}
        <div className="space-y-4">
          <h5 className="font-semibold text-gray-800">Détail des réponses au questionnaire</h5>
          {Object.entries(profil).map(([questionId, response], index) => {
            const questionData = questions.find(q => q.id === questionId);
            if (!questionData) return null;

            const selectedOption = questionData.options.find((opt: any) => opt.value === response);
            
            return (
              <div key={questionId} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h6 className="font-medium text-gray-800 text-sm">
                    Question {index + 1}
                  </h6>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    response === 'a' ? 'bg-blue-100 text-blue-800' :
                    response === 'b' ? 'bg-green-100 text-green-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    Option {(response as string)?.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-700 text-sm mb-2">{questionData.question}</p>
                {selectedOption && (
                  <p className="text-gray-600 text-sm italic">
                    <strong>Réponse:</strong> {selectedOption.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const encadreurQuestions = [
    {
      id: 'q1',
      question: 'Quand vous devez expliquer un concept à un élève, vous préférez :',
      options: [
        { value: 'a', text: 'Montrer un graphique ou une image' },
        { value: 'b', text: 'Donner une explication orale détaillée' },
        { value: 'c', text: 'Faire une démonstration pratique' }
      ]
    },
    {
      id: 'q2',
      question: 'En situation d\'enseignement, vous trouvez plus facile :',
      options: [
        { value: 'a', text: 'De préparer des supports visuels (diapositives, schémas)' },
        { value: 'b', text: 'De discuter et d\'interagir verbalement avec l\'élève' },
        { value: 'c', text: 'D\'organiser des activités pratiques ou des jeux de rôle' }
      ]
    },
    {
      id: 'q3',
      question: 'Quand un élève ne comprend pas un concept, vous :',
      options: [
        { value: 'a', text: 'Utilisez un schéma, un diagramme ou un visuel' },
        { value: 'b', text: 'Reformulez l\'explication ou laissez l\'élève poser des questions' },
        { value: 'c', text: 'Proposez une activité interactive ou une mise en situation concrète' }
      ]
    },
    {
      id: 'q4',
      question: 'Vous préférez travailler avec des élèves qui :',
      options: [
        { value: 'a', text: 'Regardent attentivement les supports visuels ou les démonstrations' },
        { value: 'b', text: 'Participent activement à des discussions ou des échanges' },
        { value: 'c', text: 'S\'impliquent directement dans des activités pratiques ou des expériences' }
      ]
    },
    {
      id: 'q5',
      question: 'Lors de vos sessions d\'enseignement, vous :',
      options: [
        { value: 'a', text: 'Aimez organiser les informations sous forme de graphiques et de supports visuels' },
        { value: 'b', text: 'Préférez engager l\'élève dans une discussion orale ou des échanges' },
        { value: 'c', text: 'Privilégiez les activités physiques ou pratiques pour ancrer le savoir' }
      ]
    },
    {
      id: 'q6',
      question: 'Lorsque vous présentez un nouveau sujet, vous :',
      options: [
        { value: 'a', text: 'Utilisez des visuels et des supports graphiques pour faciliter la compréhension' },
        { value: 'b', text: 'Expliquez verbalement et encouragez la discussion' },
        { value: 'c', text: 'Proposez des exercices pratiques ou des simulations' }
      ]
    }
  ];

  const apprentissageQuestions = [
    {
      id: 'q1',
      question: 'Quand vous devez apprendre quelque chose de nouveau, quelle méthode préférez-vous ?',
      options: [
        { value: 'a', text: 'Lire des notes, des livres ou des documents' },
        { value: 'b', text: 'Écouter un enregistrement ou une explication' },
        { value: 'c', text: 'Pratiquer des exercices, faire des expériences' }
      ]
    },
    {
      id: 'q2',
      question: 'Lorsque vous devez mémoriser un concept, quelle approche vous semble la plus utile ?',
      options: [
        { value: 'a', text: 'Regarder des schémas, des diagrammes ou des cartes mentales' },
        { value: 'b', text: 'Lire ou écouter des explications détaillées' },
        { value: 'c', text: 'Faire des expériences pratiques pour observer le concept en action' }
      ]
    },
    {
      id: 'q3',
      question: 'Lorsque vous révisez un sujet, vous préférez :',
      options: [
        { value: 'a', text: 'Utiliser des graphiques ou des vidéos pour revoir le contenu' },
        { value: 'b', text: 'Écouter des résumés ou des discussions' },
        { value: 'c', text: 'Refaire des exercices pratiques ou des jeux de rôle' }
      ]
    },
    {
      id: 'q4',
      question: 'Lors d\'une lecture, vous êtes plus attentif à :',
      options: [
        { value: 'a', text: 'Les mots et le sens de ce qui est écrit' },
        { value: 'b', text: 'Les sons, les prononciations et les rythmes du texte' },
        { value: 'c', text: 'Les gestes ou les actions liées à ce qui est écrit' }
      ]
    },
    {
      id: 'q5',
      question: 'Quand vous apprenez quelque chose de nouveau, vous préférez :',
      options: [
        { value: 'a', text: 'Regarder des vidéos ou lire des manuels' },
        { value: 'b', text: 'Écouter des podcasts, des conférences ou des explications verbales' },
        { value: 'c', text: 'Participer à des activités pratiques ou expérimenter avec des objets' }
      ]
    },
    {
      id: 'q6',
      question: 'Quel type de révision vous convient le mieux ?',
      options: [
        { value: 'a', text: 'Lire des résumés ou des notes' },
        { value: 'b', text: 'Écouter des enregistrements ou discuter du sujet avec quelqu\'un' },
        { value: 'c', text: 'Pratiquer des exercices ou résoudre des problèmes' }
      ]
    },
    {
      id: 'q7',
      question: 'Lorsque vous devez apprendre un concept, vous préférez :',
      options: [
        { value: 'a', text: 'Lire des documents ou regarder des vidéos' },
        { value: 'b', text: 'Écouter une explication verbale' },
        { value: 'c', text: 'Essayer de manipuler ou de faire quelque chose avec vos mains' }
      ]
    },
    {
      id: 'q8',
      question: 'Pendant les révisions, vous préférez :',
      options: [
        { value: 'a', text: 'Regarder des vidéos ou des graphiques (dessin)' },
        { value: 'b', text: 'Écouter des explications' },
        { value: 'c', text: 'Réaliser des projets pratiques ou des exercices physiques' }
      ]
    },
    {
      id: 'q9',
      question: 'Vous vous rappelez mieux des informations quand :',
      options: [
        { value: 'a', text: 'Vous les lisez plusieurs fois' },
        { value: 'b', text: 'Vous les entendez plusieurs fois' },
        { value: 'c', text: 'Vous les expérimentez ou les appliquez' }
      ]
    }
  ];

  const tabs = [
    { id: 'profile', label: 'Profil', icon: UserIcon },
    { id: 'questionnaire', label: 'Questionnaire', icon: Brain },
    { id: 'activity', label: 'Activité', icon: Activity },
    { id: 'relations', label: 'Relations', icon: Users }
  ];

  const renderProfile = () => (
    <div className="space-y-6">
      {/* Informations de base */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-800">Informations personnelles</h4>
          <button
            onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
          >
            {showSensitiveInfo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showSensitiveInfo ? 'Masquer' : 'Afficher'} infos sensibles</span>
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{details.email}</p>
              </div>
            </div>

            {showSensitiveInfo && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Téléphone</p>
                  <p className="font-medium">{details.telephone || 'Non renseigné'}</p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Inscription</p>
                <p className="font-medium">{new Date(details.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {details.role === 'ENCADREUR' && (
              <>
                <div className="flex items-center space-x-3">
                  <Award className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Dernier diplôme</p>
                    <p className="font-medium">{details.dernierDiplome}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Commune d'intervention</p>
                    <p className="font-medium">{details.communeIntervention}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Élèves assignés</p>
                    <p className="font-medium">{details.assignedStudents?.length || 0} / {details.maxStudents}</p>
                  </div>
                </div>
              </>
            )}

            {details.role === 'PARENT_ELEVE' && (
              <>
                <div className="flex items-center space-x-3">
                  <Briefcase className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Profession</p>
                    <p className="font-medium">{details.profession}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Pack choisi</p>
                    <p className="font-medium uppercase">{details.packChoisi}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <School className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Classe de l'apprenant</p>
                    <p className="font-medium">{details.classeApprenant}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Informations spécifiques selon le rôle */}
        {details.role === 'ENCADREUR' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h5 className="font-semibold text-gray-800 mb-4">Compétences et spécialités</h5>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Classes enseignées</p>
                <div className="flex flex-wrap gap-2">
                  {details.classesEnseignement?.map((classe: string) => (
                    <span key={classe} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {classe}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Disciplines</p>
                <div className="flex flex-wrap gap-2">
                  {details.disciplines?.map((discipline: string) => (
                    <span key={discipline} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                      {discipline}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {details.motivation && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Motivation</p>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{details.motivation}</p>
              </div>
            )}
          </div>
        )}

        {details.role === 'PARENT_ELEVE' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h5 className="font-semibold text-gray-800 mb-4">Informations de l'apprenant</h5>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nom complet</p>
                <p className="font-medium">{details.nomApprenant} {details.prenomsApprenant}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Âge</p>
                <p className="font-medium">{details.ageApprenant} ans</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Commune</p>
                <p className="font-medium">{details.communeApprenant}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Besoins spécifiques</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {details.besoins?.map((besoin: string) => (
                    <span key={besoin} className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                      {besoin}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderQuestionnaire = () => (
    <div className="space-y-6">
      {details.role === 'ENCADREUR' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-blue-600" />
            Profil d'Encadrant
          </h4>
          {renderProfilQuestionnaire(details.profilEncadrant, encadreurQuestions, 'encadrant')}
        </div>
      )}

      {details.role === 'PARENT_ELEVE' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-green-600" />
            Profil d'Apprentissage
          </h4>
          {renderProfilQuestionnaire(details.profilApprentissage, apprentissageQuestions, 'apprentissage')}
        </div>
      )}

      {details.role === 'ADMINISTRATEUR' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Aucun questionnaire</h4>
            <p className="text-gray-600">Les administrateurs n'ont pas de questionnaire de profil.</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-6">
      {/* Messages */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
          Activité Messages
        </h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{details.messages?.sent || 0}</div>
            <div className="text-sm text-gray-600">Envoyés</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{details.messages?.received || 0}</div>
            <div className="text-sm text-gray-600">Reçus</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{details.messages?.unread || 0}</div>
            <div className="text-sm text-gray-600">Non lus</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-purple-600" />
          Notifications
        </h4>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-600">{details.notifications?.total || 0}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{details.notifications?.unread || 0}</div>
            <div className="text-sm text-gray-600">Non lues</div>
          </div>
        </div>
      </div>

      {/* Messages récents */}
      {details.messages?.receivedMessages?.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Messages récents reçus</h4>
          <div className="space-y-3">
            {details.messages.receivedMessages.slice(0, 5).map((message: any) => (
              <div key={message.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <MessageCircle className="w-4 h-4 text-blue-600 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{message.subject}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(message.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{message.content.substring(0, 100)}...</p>
                  {message.fromUser && (
                    <p className="text-xs text-gray-500 mt-1">De: {message.fromUser.name || message.fromUser.email}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderRelations = () => (
    <div className="space-y-6">
      {details.role === 'ENCADREUR' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Élèves assignés ({details.students?.length || 0})
          </h4>
          {details.students?.length > 0 ? (
            <div className="space-y-3">
              {details.students.map((student: any) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">{student.nom} {student.prenoms}</p>
                    <p className="text-sm text-gray-600">{student.classe} • {student.commune}</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Actif</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun élève assigné</p>
            </div>
          )}
        </div>
      )}

      {details.role === 'PARENT_ELEVE' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <UserIcon className="w-5 h-5 mr-2 text-orange-600" />
            Encadreur assigné
          </h4>
          {details.encadreur ? (
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{details.encadreur.nom} {details.encadreur.prenoms}</p>
                  <p className="text-sm text-gray-600">{details.encadreur.email}</p>
                  <p className="text-sm text-gray-600">{details.encadreur.telephone}</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Actif</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun encadreur assigné</p>
            </div>
          )}
        </div>
      )}

      {/* Relations historiques */}
      {details.relations?.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Historique des relations</h4>
          <div className="space-y-3">
            {details.relations.map((relation: any) => (
              <div key={relation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">
                    Relation créée le {new Date(relation.approvedAt).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-sm text-gray-500">
                    Score de compatibilité: {(relation.compatibilityScore * 100).toFixed(0)}%
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-sm ${
                  relation.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {relation.status === 'ACTIVE' ? 'Active' : 'Terminée'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                {details.profilePhoto ? (
                  <img 
                    src={details.profilePhoto} 
                    alt="Profil"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {details.role === 'ENCADREUR' ? `${details.prenoms} ${details.nom}` :
                   details.role === 'PARENT_ELEVE' ? `${details.prenomsParent} ${details.nomParent}` :
                   `${details.prenoms} ${details.nom}`}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    details.role === 'ENCADREUR' ? 'bg-blue-100 text-blue-800' :
                    details.role === 'PARENT_ELEVE' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {details.role === 'ENCADREUR' ? 'Encadreur' :
                     details.role === 'PARENT_ELEVE' ? 'Parent/Élève' :
                     'Administrateur'}
                  </span>
                  <span className="text-sm text-gray-500">ID: {details.id.substring(0, 8)}...</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Actualiser"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mt-4">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'questionnaire' && renderQuestionnaire()}
          {activeTab === 'activity' && renderActivity()}
          {activeTab === 'relations' && renderRelations()}
        </div>
      </div>
    </div>
  );
};

export default UserDetails;