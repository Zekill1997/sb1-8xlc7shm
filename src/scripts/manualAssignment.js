const { databaseService } = require('../services/databaseService');

// Script pour créer manuellement une assignation entre un parent/élève et un encadreur
async function createManualAssignment(parentEmail, encadreurEmail) {
  console.log(`🔗 CRÉATION MANUELLE D'ASSIGNATION: ${parentEmail} -> ${encadreurEmail}`);
  
  try {
    // 1. Récupérer tous les utilisateurs
    console.log('📊 Récupération des utilisateurs...');
    const allUsers = await databaseService.getAllUsers();
    
    // 2. Trouver les utilisateurs par email
    const parent = allUsers.find(u => u.email === parentEmail && u.role === 'PARENT_ELEVE');
    const encadreur = allUsers.find(u => u.email === encadreurEmail && u.role === 'ENCADREUR');
    
    if (!parent) {
      console.error(`❌ Parent/Élève non trouvé avec l'email: ${parentEmail}`);
      return;
    }
    
    if (!encadreur) {
      console.error(`❌ Encadreur non trouvé avec l'email: ${encadreurEmail}`);
      return;
    }
    
    console.log(`✅ Utilisateurs trouvés:`);
    console.log(`   - Parent/Élève: ${parent.prenomsParent || ''} ${parent.nomParent || ''} / ${parent.prenomsApprenant || ''} ${parent.nomApprenant || ''}`);
    console.log(`   - Commune: ${parent.communeApprenant || 'NON DÉFINIE'}`);
    console.log(`   - Encadreur: ${encadreur.prenoms || ''} ${encadreur.nom || ''}`);
    console.log(`   - Commune d'intervention: ${encadreur.communeIntervention || 'NON DÉFINIE'}`);
    
    // 3. Vérifier la compatibilité des communes
    if (!parent.communeApprenant || !encadreur.communeIntervention) {
      console.error(`❌ Une ou les deux communes ne sont pas définies`);
      
      // Proposer des mises à jour
      if (!parent.communeApprenant && encadreur.communeIntervention) {
        console.log(`\n💡 SOLUTION: Mettre à jour la commune de l'apprenant pour qu'elle corresponde à celle de l'encadreur`);
        console.log(`\n📝 Pour mettre à jour la commune de l'apprenant:`);
        console.log(`   await databaseService.updateUser('${parent.id}', { communeApprenant: '${encadreur.communeIntervention}' });`);
      } 
      else if (parent.communeApprenant && !encadreur.communeIntervention) {
        console.log(`\n💡 SOLUTION: Mettre à jour la commune d'intervention de l'encadreur pour qu'elle corresponde à celle de l'apprenant`);
        console.log(`\n📝 Pour mettre à jour la commune d'intervention de l'encadreur:`);
        console.log(`   await databaseService.updateUser('${encadreur.id}', { communeIntervention: '${parent.communeApprenant}' });`);
      }
      else {
        console.log(`\n💡 SOLUTION: Définir la même commune pour les deux utilisateurs`);
        console.log(`\n📝 Exemple pour définir 'Cocody' comme commune pour les deux:`);
        console.log(`   await databaseService.updateUser('${parent.id}', { communeApprenant: 'Cocody' });`);
        console.log(`   await databaseService.updateUser('${encadreur.id}', { communeIntervention: 'Cocody' });`);
      }
      
      return;
    }
    
    if (parent.communeApprenant !== encadreur.communeIntervention) {
      console.error(`❌ INCOMPATIBILITÉ DE COMMUNE: ${parent.communeApprenant} ≠ ${encadreur.communeIntervention}`);
      console.log(`\n💡 SOLUTION: Mettre à jour la commune de l'un des utilisateurs pour qu'elles correspondent`);
      
      // Proposer des mises à jour
      console.log(`\n📝 Pour mettre à jour la commune de l'apprenant:`);
      console.log(`   await databaseService.updateUser('${parent.id}', { communeApprenant: '${encadreur.communeIntervention}' });`);
      
      console.log(`\n📝 Pour mettre à jour la commune d'intervention de l'encadreur:`);
      console.log(`   await databaseService.updateUser('${encadreur.id}', { communeIntervention: '${parent.communeApprenant}' });`);
      
      return;
    }
    
    // 4. Calculer le score de compatibilité
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
    
    console.log(`✅ Compatibilité: ${(compatibilityScore * 100).toFixed(0)}%`);
    
    // 5. Créer l'assignation
    console.log('🔄 Création de l\'assignation...');
    
    // Trouver un administrateur pour l'assignation
    const admin = allUsers.find(u => u.role === 'ADMINISTRATEUR');
    if (!admin) {
      console.error('❌ Aucun administrateur trouvé pour créer l\'assignation');
      return;
    }
    
    const criteria = {
      commune: true,
      disciplines: parent.besoins && encadreur.disciplines ? 
        parent.besoins.some(b => encadreur.disciplines.includes(b)) : false,
      classe: encadreur.classesEnseignement && parent.classeApprenant ? 
        encadreur.classesEnseignement.includes(parent.classeApprenant) : false
    };
    
    const result = await databaseService.createAssignmentWithCommuneCheck(
      parent.id,
      encadreur.id,
      compatibilityScore,
      criteria,
      admin.id
    );
    
    if (result.success) {
      console.log(`✅ Assignation créée avec succès! ID: ${result.assignmentId}`);
      console.log('📝 L\'assignation est maintenant en attente d\'approbation par un administrateur');
    } else {
      console.error(`❌ Erreur lors de la création de l'assignation: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ ERREUR LORS DE LA CRÉATION DE L\'ASSIGNATION:', error);
  }
}

// Exécuter le script avec les emails des utilisateurs
// Remplacez ces emails par ceux des utilisateurs que vous souhaitez associer
const parentEmail = 'parent@example.com';
const encadreurEmail = 'encadreur@example.com';

// Pour exécuter le script, décommentez la ligne suivante et remplacez les emails
// createManualAssignment(parentEmail, encadreurEmail);

// Exporter la fonction pour pouvoir l'utiliser ailleurs
module.exports = { createManualAssignment };