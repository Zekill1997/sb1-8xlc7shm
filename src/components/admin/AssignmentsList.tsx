import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService } from '../../services/databaseService';
import { 
  CheckCircle, 
  X, 
  RefreshCw, 
  AlertCircle, 
  Users, 
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  GraduationCap,
  Target,
  Calendar,
  Percent,
  Award,
  CheckSquare,
  XSquare,
  Info
} from 'lucide-react';

interface AssignmentsListProps {
  onClose?: () => void;
  onRefresh?: () => void;
}

const AssignmentsList: React.FC<AssignmentsListProps> = ({ onClose, onRefresh }) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Forcer la synchronisation avant de charger les données
      await databaseService.forcSync();
      
      // Récupérer les assignations avec détails
      const assignmentsData = await databaseService.getAssignmentsWithDetails();
      
      // Filtrer pour n'avoir que les assignations en attente
      const pendingAssignments = assignmentsData.filter(a => a.status === 'PENDING');
      
      setAssignments(pendingAssignments);
      
      // Sélectionner la première assignation par défaut si disponible
      if (pendingAssignments.length > 0 && !selectedAssignment) {
        setSelectedAssignment(pendingAssignments[0]);
      }
      
      console.log('✅ Assignations chargées:', pendingAssignments.length);
    } catch (error) {
      console.error('❌ Erreur chargement assignations:', error);
      setError('Erreur lors du chargement des assignations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadAssignments();
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleApprove = async (assignmentId: string) => {
    if (!user) return;
    
    try {
      setIsApproving(true);
      console.log('✅ Approbation assignation:', assignmentId);
      
      const result = await databaseService.approveAssignment(assignmentId, user.id);
      
      if (result.success) {
        console.log('✅ Assignation approuvée avec succès');
        
        // Recharger les assignations
        await loadAssignments();
        
        // Notifier le parent
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('❌ Erreur approbation:', result.error);
        setError(`Erreur lors de l'approbation: ${result.error}`);
      }
    } catch (error: any) {
      console.error('❌ Erreur approbation:', error);
      setError(`Erreur lors de l'approbation: ${error.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-blue-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getCompatibilityLabel = (score: number) => {
    if (score >= 0.9) return 'Excellente';
    if (score >= 0.7) return 'Bonne';
    if (score >= 0.5) return 'Moyenne';
    return 'Faible';
  };

  const getCompatibilityBg = (score: number) => {
    if (score >= 0.9) return 'bg-green-100';
    if (score >= 0.7) return 'bg-blue-100';
    if (score >= 0.5) return 'bg-yellow-100';
    return 'bg-orange-100';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-lg">Chargement des assignations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            <Users className="w-6 h-6 mr-3 text-blue-600" />
            Assignations en attente
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-red-800">Erreur</h4>
            <p className="text-red-700">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Réessayer</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <Users className="w-6 h-6 mr-3 text-blue-600" />
              Assignations en attente
            </h3>
            <p className="text-gray-600 mt-1">
              {assignments.length} assignation(s) en attente d'approbation
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="p-8 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Aucune assignation en attente</h4>
          <p className="text-gray-600">
            Toutes les assignations ont été traitées. Vous pouvez créer de nouvelles assignations manuellement.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 h-[600px]">
          {/* Liste des assignations */}
          <div className="border-r border-gray-200 overflow-y-auto">
            <div className="divide-y divide-gray-200">
              {assignments.map(assignment => (
                <div
                  key={assignment.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedAssignment?.id === assignment.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedAssignment(assignment)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-800">
                          {assignment.parent?.prenoms} {assignment.parent?.nom}
                        </span>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                          Élève
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="font-medium text-gray-800">
                          {assignment.encadreur?.prenoms} {assignment.encadreur?.nom}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                          Encadreur
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-2 text-sm text-gray-600">
                        <MapPin className="w-3 h-3" />
                        <span>{assignment.parent?.commune}</span>
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompatibilityBg(assignment.compatibilityScore)} ${getCompatibilityColor(assignment.compatibilityScore)}`}>
                          Compatibilité: {Math.round(assignment.compatibilityScore * 100)}%
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(assignment.assignedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Détails de l'assignation */}
          <div className="overflow-y-auto p-6">
            {selectedAssignment ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-800">
                    Détails de l'assignation
                  </h4>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getCompatibilityBg(selectedAssignment.compatibilityScore)} ${getCompatibilityColor(selectedAssignment.compatibilityScore)}`}>
                    Compatibilité: {Math.round(selectedAssignment.compatibilityScore * 100)}%
                    <span className="ml-1 text-xs">({getCompatibilityLabel(selectedAssignment.compatibilityScore)})</span>
                  </div>
                </div>

                {/* Informations de l'assignation */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                    <Info className="w-4 h-4 mr-2 text-blue-600" />
                    Informations générales
                  </h5>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Date de création:</span>
                      <p className="font-medium">{formatDate(selectedAssignment.assignedAt)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Créée par:</span>
                      <p className="font-medium">{selectedAssignment.admin?.prenoms} {selectedAssignment.admin?.nom}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Commune:</span>
                      <p className="font-medium">{selectedAssignment.parent?.commune}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Statut:</span>
                      <p className="font-medium">En attente d'approbation</p>
                    </div>
                  </div>
                </div>

                {/* Critères de compatibilité */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-3 flex items-center">
                    <Percent className="w-4 h-4 mr-2 text-blue-600" />
                    Critères de compatibilité
                  </h5>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Commune identique</span>
                      {selectedAssignment.criteria?.commune ? (
                        <CheckSquare className="w-5 h-5 text-green-600" />
                      ) : (
                        <XSquare className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Disciplines compatibles</span>
                      {selectedAssignment.criteria?.disciplines ? (
                        <CheckSquare className="w-5 h-5 text-green-600" />
                      ) : (
                        <XSquare className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Classe compatible</span>
                      {selectedAssignment.criteria?.classe ? (
                        <CheckSquare className="w-5 h-5 text-green-600" />
                      ) : (
                        <XSquare className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Informations de l'élève */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h5 className="font-medium text-orange-800 mb-3 flex items-center">
                    <GraduationCap className="w-4 h-4 mr-2 text-orange-600" />
                    Informations de l'élève
                  </h5>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                       <p className="font-medium">{selectedAssignment.parent?.prenoms || ''} {selectedAssignment.parent?.nom || ''}</p>
                       <p className="text-sm text-gray-600">{selectedAssignment.parent?.classe || 'Non spécifiée'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <p className="font-medium flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                         {selectedAssignment.parent?.email || 'Non spécifié'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Commune:</span>
                        <p className="font-medium flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                         {selectedAssignment.parent?.commune || 'Non spécifiée'}
                        </p>
                      </div>
                    </div>
                    
                   {selectedAssignment.parent?.besoins && Array.isArray(selectedAssignment.parent.besoins) && selectedAssignment.parent.besoins.length > 0 && (
                      <div>
                        <span className="text-gray-600">Besoins:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedAssignment.parent.besoins.map((besoin: string) => (
                            <span key={besoin} className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                              {besoin}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informations de l'encadreur */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-3 flex items-center">
                    <Award className="w-4 h-4 mr-2 text-blue-600" />
                    Informations de l'encadreur
                  </h5>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                       <p className="font-medium">{selectedAssignment.encadreur?.prenoms || ''} {selectedAssignment.encadreur?.nom || ''}</p>
                       <p className="text-sm text-gray-600">{selectedAssignment.encadreur?.disciplines && Array.isArray(selectedAssignment.encadreur.disciplines) ? selectedAssignment.encadreur.disciplines.join(', ') : 'Aucune discipline spécifiée'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <p className="font-medium flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                         {selectedAssignment.encadreur?.email || 'Non spécifié'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Commune d'intervention:</span>
                        <p className="font-medium flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                         {selectedAssignment.encadreur?.commune || 'Non spécifiée'}
                        </p>
                      </div>
                    </div>
                    
                   {selectedAssignment.encadreur?.disciplines && Array.isArray(selectedAssignment.encadreur.disciplines) && selectedAssignment.encadreur.disciplines.length > 0 && (
                      <div>
                        <span className="text-gray-600">Disciplines:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedAssignment.encadreur.disciplines.map((discipline: string) => (
                            <span key={discipline} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {discipline}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                   
                   {selectedAssignment.encadreur?.classes && Array.isArray(selectedAssignment.encadreur.classes) && selectedAssignment.encadreur.classes.length > 0 && (
                     <div>
                       <span className="text-gray-600">Classes enseignées:</span>
                       <div className="flex flex-wrap gap-1 mt-1">
                         {selectedAssignment.encadreur.classes.map((classe: string) => (
                           <span key={classe} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                             {classe}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}
                  </div>
                </div>

                {/* Bouton d'approbation */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(selectedAssignment.id)}
                    disabled={isApproving}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApproving ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Approbation...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Approuver cette assignation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Sélectionnez une assignation pour voir les détails</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsList;