import React, { useState } from 'react';
import { localDB } from '../../services/localDatabase';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  Database, 
  AlertCircle, 
  CheckCircle,
  Copy,
  FileText,
  Smartphone,
  Monitor
} from 'lucide-react';

interface DatabaseSyncProps {
  onClose?: () => void;
}

const DatabaseSync: React.FC<DatabaseSyncProps> = ({ onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const stats = localDB.getStatistics();

  const handleExport = () => {
    try {
      setIsExporting(true);
      const data = localDB.exportDatabase();
      setExportData(data);
      setMessage({ type: 'success', text: 'Base de données exportée avec succès !' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de l\'export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    if (!importData.trim()) {
      setMessage({ type: 'error', text: 'Veuillez coller les données à importer' });
      return;
    }

    try {
      setIsImporting(true);
      const result = localDB.importDatabase(importData);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Base de données importée avec succès ! Rechargez la page.' });
        setImportData('');
        
        // Recharger la page après 2 secondes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de l\'import' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Format de données invalide' });
    } finally {
      setIsImporting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      setMessage({ type: 'success', text: 'Données copiées dans le presse-papiers !' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la copie' });
    }
  };

  const downloadAsFile = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `superapprenant_db_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setMessage({ type: 'success', text: 'Fichier téléchargé avec succès !' });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
      setMessage({ type: 'success', text: 'Fichier chargé, cliquez sur "Importer" pour appliquer' });
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <Database className="w-6 h-6 mr-3 text-blue-600" />
              Synchronisation de Base de Données
            </h3>
            <p className="text-gray-600 mt-1">
              Synchronisez les données entre différents appareils
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Message de statut */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-3" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-3" />
            )}
            {message.text}
          </div>
        )}

        {/* Statistiques actuelles */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Statistiques de la Base Actuelle
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.users.total}</div>
              <div className="text-gray-600">Utilisateurs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.users.encadreurs}</div>
              <div className="text-gray-600">Encadreurs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.users.parents}</div>
              <div className="text-gray-600">Parents/Élèves</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.relations.active}</div>
              <div className="text-gray-600">Relations Actives</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            Comment synchroniser entre appareils
          </h4>
          <div className="space-y-3 text-sm text-blue-700">
            <div className="flex items-start space-x-3">
              <Monitor className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Appareil Principal (celui avec toutes les données) :</strong>
                <br />1. Cliquez sur "Exporter" pour récupérer toutes les données
                <br />2. Copiez les données ou téléchargez le fichier
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Smartphone className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Autres Appareils :</strong>
                <br />1. Collez les données dans la zone d'import ou uploadez le fichier
                <br />2. Cliquez sur "Importer" pour synchroniser
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Export */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-800 flex items-center">
              <Download className="w-5 h-5 mr-2 text-green-600" />
              Exporter les Données
            </h4>
            
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isExporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExporting ? 'Export...' : 'Exporter la Base'}</span>
            </button>

            {exportData && (
              <div className="space-y-3">
                <textarea
                  value={exportData}
                  readOnly
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs font-mono"
                  placeholder="Les données exportées apparaîtront ici..."
                />
                
                <div className="flex space-x-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copier</span>
                  </button>
                  
                  <button
                    onClick={downloadAsFile}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Télécharger</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Import */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-800 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-orange-600" />
              Importer les Données
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coller les données ou uploader un fichier
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs font-mono"
                  placeholder="Collez ici les données exportées depuis un autre appareil..."
                />
              </div>

              <div className="text-center text-gray-500 text-sm">ou</div>

              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleImport}
                disabled={isImporting || !importData.trim()}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isImporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{isImporting ? 'Import...' : 'Importer et Synchroniser'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Avertissement */}
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-yellow-800 text-sm">
              <strong>Important :</strong> L'import remplacera complètement la base de données actuelle. 
              Assurez-vous d'exporter vos données actuelles avant d\'importer si vous voulez les conserver.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSync;