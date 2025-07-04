const { databaseService } = require('../services/databaseService');

// Script pour mettre à jour les communes des utilisateurs et créer des assignations
async function fixCommuneCompatibility() {
  console.log('🔧 CORRECTION DE LA COMPATIBILITÉ DES COMMUNES');
  
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
    console.log(`   - Administrateurs: ${admins.length}`);
    
    if (encadreurs.length === 0 || parents.length === 0) {
      console.log('❌ Pas assez d\'utilisateurs pour effectuer des corrections');
      return;
    }
    
    // 2. Identifier les utilisateurs sans commune définie
    const encadreursWithoutCommune = encadreurs.filter(e => !e.communeIntervention);
    const parentsWithoutCommune = parents.filter(p => !p.communeApprenant);
    
    console.log(`\n🔍 UTILISATEURS SANS COMMUNE DÉFINIE:`);
    console.log(`   - Encadreurs: ${encadreursWithoutCommune.length}`);
    console.log(`   - Parents/Élèves: ${parentsWithoutCommune.length}`);
    
    // 3. Corriger les communes manquantes
    if (encadreursWithoutCommune.length > 0) {
      console.log('\n🔧 CORRECTION DES COMMUNES MANQUANTES POUR LES ENCADREURS:');
      
      // Utiliser Cocody comme commune par défaut
      const defaultCommune = 'Cocody';
      
      for (const encadreur of encadreursWithoutCommune) {
        console.log(`   - Mise à jour de ${encadreur.prenoms || ''} ${encadreur.nom || ''} (${encadreur.email}): commune = ${defaultCommune}`);
        
        try {
          await databaseService.updateUser(encadreur.id, {
            communeIntervention: defaultCommune
          });
          console.log(`     ✅ Mise à jour réussie`);
        } catch (error) {
          console.error(`     ❌ Erreur: ${error}`);
        }
      }
    }
    
    if (parentsWithoutCommune.length > 0) {
      console.log('\n🔧 CORRECTION DES COMMUNES MANQUANTES POUR LES PARENTS/ÉLÈVES:');
      
      // Utiliser Cocody comme commune par défaut
      const defaultCommune = 'Cocody';
      
      for (const parent of parentsWithoutCommune) {
        console.log(`   - Mise à jour de ${parent.prenomsApprenant || ''} ${parent.nomApprenant || ''} (${parent.email}): commune = ${defaultCommune}`);
        
        try {
          await databaseService.updateUser(parent.id, {
            communeApprenant: defaultCommune
          });
          console.log(`     ✅ Mise à jour réussie`);
        } catch (error) {
          console.error(`     ❌ Erreur: ${error}`);
        }
      }
    }
    
    // 4. Recharger les utilisateurs après les mises à jour
    console.log('\n🔄 Rechargement des utilisateurs après mises à jour...');
    const updatedUsers = await databaseService.getAllUsers();
    const updatedEncadreurs = updatedUsers.filter(u => u.role === 'ENCADREUR');
    const updatedParents = updatedUsers.filter(u => u.role === 'PARENT_ELEVE');
    
    // 5. Harmoniser les communes pour assurer la compatibilité
    console.log('\n🔧 HARMONISATION DES COMMUNES POUR ASSURER LA COMPATIBILITÉ:');
    
    // Choisir une commune commune (Cocody par défaut)
    const targetCommune = 'Cocody';
    
    console.log(`   - Commune cible pour l'harmonisation: ${targetCommune}`);
    
    // Mettre à jour les encadreurs qui n'ont pas cette commune
    const encadreursToUpdate = updatedEncadreurs.filter(e => e.communeIntervention !== targetCommune);
    
    if (encadreursToUpdate.length > 0) {
      console.log(`   - Mise à jour de ${encadreursToUpdate.length} encadreur(s)...`);
      
      for (const encadreur of encadreursToUpdate) {
        console.log(`     * ${encadreur.prenoms || ''} ${encadreur.nom || ''} (${encadreur.email}): ${encadreur.communeIntervention || 'NON DÉFINIE'} -> ${targetCommune}`);
        
        try {
          await databaseService.updateUser(encadreur.id, {
            communeIntervention: targetCommune
          });
          console.log(`       ✅ Mise à jour réussie`);
        } catch (error) {
          console.error(`       ❌ Erreur: ${error}`);
        }
      }
    }
    
    // Mettre à jour les parents qui n'ont pas cette commune
    const parentsToUpdate = updatedParents.filter(p => p.communeApprenant !== targetCommune);
    
    if (parentsToUpdate.length > 0) {
      console.log(`   - Mise à jour de ${parentsToUpdate.length} parent(s)/élève(s)...`);
      
      for (const parent of parentsToUpdate) {
        console.log(`     * ${parent.prenomsApprenant || ''} ${parent.nomApprenant || ''} (${parent.email}): ${parent.communeApprenant || 'NON DÉFINIE'} -> ${targetCommune}`);
        
        try {
          await databaseService.updateUser(parent.id, {
            communeApprenant: targetCommune
          });
          console.log(`       ✅ Mise à jour réussie`);
        } catch (error) {
          console.error(`       ❌ Erreur: ${error}`);
        }
      }
    }
    
    // 6. Recharger à nouveau les utilisateurs
    console.log('\n🔄 Rechargement final des utilisateurs...');
    const finalUsers = await databaseService.getAllUsers();
    const finalEncadreurs = finalUsers.filter(u => u.role === 'ENCADREUR');
    const finalParents = finalUsers.filter(u => u.role === 'PARENT_ELEVE');
    
    // 7. Créer des assignations entre utilisateurs compatibles
    console.log('\n🔗 CRÉATION D\'ASSIGNATIONS ENTRE UTILISATEURS COMPATIBLES:');
    
    // Trouver un administrateur pour l'assignation
    const admin = finalUsers.find(u => u.role === 'ADMINISTRATEUR');
    if (!admin) {
      console.error('❌ Aucun administrateur trouvé pour créer des assignations');
      return;
    }
    
    let assignmentCount = 0;
    
    // Pour chaque parent, trouver un encadreur compatible
    for (const parent of finalParents) {
      // Vérifier si le parent a déjà un encadreur assigné
      if (parent.assignedEncadreur) {
        console.log(`   - ${parent.prenomsApprenant || ''} ${parent.nomApprenant || ''} a déjà un encadreur assigné`);
        continue;
      }
      
      // Trouver les encadreurs compatibles (même commune)
      const compatibleEncadreurs = finalEncadreurs.filter(e => 
        e.communeIntervention === parent.communeApprenant &&
        e.assignedStudents.length < e.maxStudents
      );
      
      if (compatibleEncadreurs.length === 0) {
        console.log(`   - Aucun encadreur compatible disponible pour ${parent.prenomsApprenant || ''} ${parent.nomApprenant || ''}`);
        continue;
      }
      
      // Choisir le premier encadreur compatible
      const encadreur = compatibleEncadreurs[0];
      
      console.log(`   - Création d'assignation: ${parent.prenomsApprenant || ''} ${parent.nomApprenant || ''} -> ${encadreur.prenoms || ''} ${encadreur.nom || ''}`);
      
      // Calculer le score de compatibilité
      let compatibilityScore = 0.75; // Score de base
      
      // Vérifier les disciplines (pour les classes collège/lycée)
      if (parent.besoins && parent.besoins.length > 0 && encadreur.disciplines && encadreur.disciplines.length > 0) {
        const matchingDisciplines = parent.besoins.filter(b => 
          encadreur.disciplines.includes(b)
        );
        
        if (matchingDisciplines.length > 0) {
          compatibilityScore += 0.25 * (matchingDisciplines.length / parent.besoins.length);
        }
      }
      
      // Limiter à 1.0 maximum
      compatibilityScore = Math.min(compatibilityScore, 1.0);
      
      console.log(`     - Compatibilité: ${(compatibilityScore * 100).toFixed(0)}%`);
      
      // Créer l'assignation
      const criteria = {
        commune: true,
        disciplines: parent.besoins && encadreur.disciplines ? 
          parent.besoins.some(b => encadreur.disciplines.includes(b)) : false,
        classe: encadreur.classesEnseignement && parent.classeApprenant ? 
          encadreur.classesEnseignement.includes(parent.classeApprenant) : false
      };
      
      try {
        const result = await databaseService.createAssignmentWithCommuneCheck(
          parent.id,
          encadreur.id,
          compatibilityScore,
          criteria,
          admin.id
        );
        
        if (result.success) {
          console.log(`     ✅ Assignation créée avec succès! ID: ${result.assignmentId}`);
          assignmentCount++;
        } else {
          console.log(`     ❌ Erreur: ${result.error}`);
        }
      } catch (error) {
        console.error(`     ❌ Erreur: ${error}`);
      }
    }
    
    console.log(`\n✅ CORRECTION TERMINÉE: ${assignmentCount} assignation(s) créée(s)`);
    
  } catch (error) {
    console.error('❌ ERREUR LORS DE LA CORRECTION:', error);
  }
}

module.exports = { fixCommuneCompatibility };