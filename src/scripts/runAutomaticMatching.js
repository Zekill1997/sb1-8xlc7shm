// Script pour exécuter la génération automatique des correspondances
import { generateAutomaticMatches } from './generateAutomaticMatches.js';

console.log('🚀 Démarrage du système de génération automatique des correspondances');

// Exécuter le script
generateAutomaticMatches()
  .then(() => {
    console.log('🎉 Génération automatique des correspondances terminée avec succès');
    console.log('📝 Les assignations sont maintenant en attente d\'approbation par un administrateur');
    console.log('🔍 Connectez-vous en tant qu\'administrateur pour les approuver dans la section "Assignations"');
  })
  .catch(error => {
    console.error('❌ Erreur lors de l\'exécution du script:', error);
  });