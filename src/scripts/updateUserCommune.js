const { databaseService } = require('../services/databaseService');

// Script pour mettre à jour la commune d'un utilisateur
async function updateUserCommune(userEmail, commune, isEncadreur) {
  try {
    console.log(`🔄 Mise à jour de la commune pour l'utilisateur ${userEmail}...`);
    
    // Récupérer tous les utilisateurs
    const allUsers = await databaseService.getAllUsers();
    
    // Trouver l'utilisateur par email
    const user = allUsers.find(u => u.email === userEmail);
    
    if (!user) {
      console.error(`❌ Utilisateur non trouvé avec l'email: ${userEmail}`);
      return;
    }
    
    // Vérifier le rôle
    if (isEncadreur && user.role !== 'ENCADREUR') {
      console.error(`❌ L'utilisateur ${userEmail} n'est pas un encadreur`);
      return;
    }
    
    if (!isEncadreur && user.role !== 'PARENT_ELEVE') {
      console.error(`❌ L'utilisateur ${userEmail} n'est pas un parent/élève`);
      return;
    }
    
    // Préparer les données à mettre à jour
    const updateData = isEncadreur 
      ? { communeIntervention: commune }
      : { communeApprenant: commune };
    
    // Afficher les informations actuelles
    const currentCommune = isEncadreur 
      ? user.communeIntervention 
      : user.communeApprenant;
    
    console.log(`   - Utilisateur: ${user.email}`);
    console.log(`   - Rôle: ${user.role}`);
    console.log(`   - Commune actuelle: ${currentCommune || 'NON DÉFINIE'}`);
    console.log(`   - Nouvelle commune: ${commune}`);
    
    // Mettre à jour l'utilisateur
    const result = await databaseService.updateUser(user.id, updateData);
    
    if (result.success) {
      console.log('✅ Commune mise à jour avec succès!');
    } else {
      console.error(`❌ Erreur lors de la mise à jour: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ ERREUR LORS DE LA MISE À JOUR:', error);
  }
}

// Exemples d'utilisation:
// Pour mettre à jour la commune d'un encadreur:
// updateUserCommune('encadreur@example.com', 'Cocody', true);

// Pour mettre à jour la commune d'un parent/élève:
// updateUserCommune('parent@example.com', 'Cocody', false);

// Exporter la fonction pour pouvoir l'utiliser ailleurs
module.exports = { updateUserCommune };