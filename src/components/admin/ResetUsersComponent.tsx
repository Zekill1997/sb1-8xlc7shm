import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService } from '../../services/databaseService';
import { 
  Trash2, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle,
  X,
  Users,
  Shield
} from 'lucide-react';

interface ResetUsersComponentProps {
  onClose?: () => void;
  onComplete?: () => void;
}

const ResetUsersComponent: React.FC<ResetUsersComponentProps> = ({ onClose, onComplete }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Charger les statistiques actuelles
  React.useEffect(() => {
    const currentStats = databaseService.getStatistics();
    setStats(currentStats);
  }, []);

  const resetAllUsers = async () => {
    if (!user || user.role !== 'ADMINISTRATEUR') {
      alert('Seuls les administrateurs peuvent effectuer cette action');
      return;
    }

    setIsLoading(true);
    setProgress('Initialisation de la suppression bidirectionnelle...');

    try {
      console.log('🗑️ Début de la suppression massive avec synchronisation bidirectionnelle...');

      setProgress('Suppression simultanée sur Supabase et localStorage...');
      
      // Utiliser la nouvelle méthode de suppression massive
      const result = await databaseService.deleteAllNonAdminUsers();
      
      if (result.success) {
        setProgress(`✅ Suppression terminée: ${result.deleted} utilisateurs supprimés des deux bases de données`);
        setIsComplete(true);
        
        console.log('✅ Suppression massive terminée avec succès');
        
        // Notifier la completion
        if (onComplete) {
          setTimeout(() => {
            onComplete();
          }, 2000);
        }
      } else {
        setProgress(`❌ Erreur: ${result.error}`);
      }

    } catch (error) {
      console.error('❌ Erreur lors de la suppression massive:', error);
      setProgress(`❌ Erreur: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.role !== 'ADMINISTRATEUR') {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Accès refusé</h3>
          <p className="text-gray-600">Seuls les administrateurs peuvent accéder à cette fonction.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <Trash2 className="w-6 h-6 mr-3 text-red-600" />
              Réinitialiser les utilisateurs
            </h3>
            <p className="text-gray-600 mt-1">
              Suppression bidirectionnelle (Supabase + Local)
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

      <div className="p-6">
        {/* Statistiques actuelles */}
        {stats && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Statistiques actuelles
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.users.encadreurs}</div>
                <div className="text-sm text-gray-600">Encadreurs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.users.parents}</div>
                <div className="text-sm text-gray-600">Parents/Élèves</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.users.admins}</div>
                <div className="text-sm text-gray-600">Administrateurs</div>
              </div>
            </div>
          </div>
        )}

        {!showConfirmation && !isLoading && !isComplete && (
          <div className="space-y-4">
            {/* Avertissement */}
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-red-800">
                  <h4 className="font-semibold mb-2">⚠️ SUPPRESSION BIDIRECTIONNELLE</h4>
                  <p className="text-sm mb-3">
                    Cette action va supprimer définitivement et simultanément :
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li><strong>De Supabase :</strong> Tous les comptes ENCADREUR et PARENT_ELEVE</li>
                    <li><strong>Du localStorage :</strong> Tous les comptes ENCADREUR et PARENT_ELEVE</li>
                    <li><strong>Toutes les données associées :</strong> Messages, notifications, assignations</li>
                  </ul>
                  <p className="text-sm mt-3 font-semibold">
                    ✅ Les comptes administrateurs seront conservés sur les deux bases.
                  </p>
                  <p className="text-sm mt-2 text-red-700 font-semibold">
                    🔒 La synchronisation automatique sera temporairement désactivée pour éviter la restauration des données.
                  </p>
                </div>
              </div>
            </div>

            {/* Bouton de confirmation */}
            <div className="flex justify-end space-x-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
              )}
              <button
                onClick={() => setShowConfirmation(true)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Procéder à la suppression bidirectionnelle</span>
              </button>
            </div>
          </div>
        )}

        {showConfirmation && !isLoading && !isComplete && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-yellow-800">
                  <h4 className="font-semibold mb-2">Confirmation finale</h4>
                  <p className="text-sm mb-3">
                    Êtes-vous absolument certain de vouloir supprimer tous les utilisateurs non-administrateurs des DEUX bases de données (Supabase + Local) ?
                  </p>
                  <p className="text-sm font-semibold">
                    Cette action ne peut pas être annulée !
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={resetAllUsers}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmer la suppression bidirectionnelle</span>
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Suppression bidirectionnelle en cours...</h4>
              <p className="text-gray-600">{progress}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-600 h-2 rounded-full transition-all duration-300 animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Suppression simultanée sur Supabase et localStorage...
              </p>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Suppression bidirectionnelle terminée !</h4>
              <p className="text-gray-600">{progress}</p>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="text-green-800 text-sm">
                <p className="font-semibold mb-2">✅ Actions effectuées :</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Suppression de tous les comptes ENCADREUR de Supabase</li>
                  <li>Suppression de tous les comptes PARENT_ELEVE de Supabase</li>
                  <li>Suppression de tous les comptes ENCADREUR du localStorage</li>
                  <li>Suppression de tous les comptes PARENT_ELEVE du localStorage</li>
                  <li>Nettoyage de tous les messages et notifications</li>
                  <li>Nettoyage de toutes les assignations</li>
                  <li>Synchronisation automatique temporairement désactivée</li>
                </ul>
                <p className="mt-3 font-semibold">
                  🎉 Les deux bases de données sont maintenant réinitialisées et synchronisées !
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetUsersComponent;