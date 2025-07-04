// Script pour exécuter la correction de compatibilité des communes
const { fixCommuneCompatibility } = require('./fixCommuneCompatibility');

// Exécuter le script
fixCommuneCompatibility()
  .then(() => {
    console.log('🎉 Script de correction terminé avec succès');
  })
  .catch(error => {
    console.error('❌ Erreur lors de l\'exécution du script:', error);
  });