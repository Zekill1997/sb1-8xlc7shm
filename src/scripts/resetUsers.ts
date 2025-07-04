import { databaseService } from '../services/databaseService';
import { localDB } from '../services/localDatabase';

// Script pour supprimer tous les utilisateurs non-administrateurs
export const resetAllUsers = async () => {
  console.log('🗑️ DÉBUT DE LA SUPPRESSION DE TOUS LES UTILISATEURS NON-ADMIN');
  
  try {
    // 1. Récupérer tous les utilisateurs
    console.log('📊 Récupération de tous les utilisateurs...');
    const allUsers = await databaseService.getAllUsers();
    
    const encadreurs = allUsers.filter(u => u.role === 'ENCADREUR');
    const parents = allUsers.filter(u => u.role === 'PARENT_ELEVE');
    const admins = allUsers.filter(u => u.role === 'ADMINISTRATEUR');
    
    console.log(`📊 Statistiques actuelles:`);
    console.log(`   - Encadreurs: ${encadreurs.length}`);
    console.log(`   - Parents/Élèves: ${parents.length}`);
    console.log(`   - Administrateurs: ${admins.length} (conservés)`);
    
    const totalToDelete = encadreurs.length + parents.length;
    
    if (totalToDelete === 0) {
      console.log('✅ Aucun utilisateur à supprimer');
      return { success: true, deleted: 0 };
    }
    
    let deletedCount = 0;
    
    // 2. Supprimer tous les encadreurs
    console.log(`🗑️ Suppression de ${encadreurs.length} encadreurs...`);
    for (const encadreur of encadreurs) {
      try {
        console.log(`   Suppression: ${encadreur.email}`);
        const result = await databaseService.deleteUser(encadreur.id);
        if (result.success) {
          deletedCount++;
        } else {
          console.error(`   ❌ Erreur: ${result.error}`);
        }
      } catch (error) {
        console.error(`   ❌ Erreur suppression ${encadreur.email}:`, error);
      }
    }
    
    // 3. Supprimer tous les parents/élèves
    console.log(`🗑️ Suppression de ${parents.length} parents/élèves...`);
    for (const parent of parents) {
      try {
        console.log(`   Suppression: ${parent.email}`);
        const result = await databaseService.deleteUser(parent.id);
        if (result.success) {
          deletedCount++;
        } else {
          console.error(`   ❌ Erreur: ${result.error}`);
        }
      } catch (error) {
        console.error(`   ❌ Erreur suppression ${parent.email}:`, error);
      }
    }
    
    // 4. Nettoyer toutes les données orphelines
    console.log('🧹 Nettoyage des données orphelines...');
    
    // Nettoyer la base locale
    const cleanupResult = localDB.cleanupOldData();
    console.log(`   Nettoyage: ${cleanupResult.cleaned} éléments supprimés`);
    
    // 5. Forcer une synchronisation complète
    console.log('🔄 Synchronisation finale...');
    await databaseService.forcSync();
    
    console.log(`✅ SUPPRESSION TERMINÉE:`);
    console.log(`   - ${deletedCount} utilisateurs supprimés`);
    console.log(`   - ${admins.length} administrateurs conservés`);
    console.log(`   - Base de données nettoyée et synchronisée`);
    
    return { success: true, deleted: deletedCount };
    
  } catch (error) {
    console.error('❌ ERREUR LORS DE LA SUPPRESSION:', error);
    return { success: false, error: error };
  }
};

// Exécuter immédiatement le script
resetAllUsers().then(result => {
  if (result.success) {
    console.log('🎉 RÉINITIALISATION RÉUSSIE - La base est maintenant vide et prête pour de nouveaux utilisateurs');
  } else {
    console.error('💥 ÉCHEC DE LA RÉINITIALISATION:', result.error);
  }
});