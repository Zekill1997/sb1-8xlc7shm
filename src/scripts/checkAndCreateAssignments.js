const { databaseService } = require('../services/databaseService');

// Script pour vérifier la compatibilité des communes et créer des assignations
async function checkAndCreateAssignments() {
  console.log('🔍 VÉRIFICATION DE LA COMPATIBILITÉ DES COMMUNES ET CRÉATION D\'ASSIGNATIONS');
  
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
      console.log('❌ Pas assez d\'utilisateurs pour vérifier la compatibilité');
      return;
    }
    
    // 2. Identifier les paires compatibles (même commune)
    console.log('\n🔍 RECHERCHE DE PAIRES COMPATIBLES:');
    
    // Grouper par commune
    const communeGroups = {};
    
    // Initialiser les groupes pour les encadreurs avec commune définie
    for (const encadreur of encadreurs) {
      const commune = encadreur.communeIntervention;
      if (commune) {
        if (!communeGroups[commune]) {
          communeGroups[commune] = { parents: [], encadreurs: [] };
        }
        communeGroups[commune].encadreurs.push(encadreur);
      }
    }
    
    // Ajouter les parents avec commune définie
    for (const parent of parents) {
      const commune = parent.communeApprenant;
      if (commune) {
        if (!communeGroups[commune]) {
          communeGroups[commune] = { parents: [], encadreurs: [] };
        }
        communeGroups[commune].parents.push(parent);
      }
    }
    
    // Afficher les statistiques par commune
    console.log('\n📊 STATISTIQUES PAR COMMUNE:');
    
    for (const [commune, group] of Object.entries(communeGroups)) {
      console.log(`\n   🏙️ ${commune}:`);
      console.log(`      - Parents/Élèves: ${group.parents.length}`);
      console.log(`      - Encadreurs: ${group.encadreurs.length}`);
      
      if (group.parents.length > 0 && group.encadreurs.length > 0) {
        console.log(`      ✅ Compatibilité possible dans cette commune`);
      } else if (group.parents.length > 0) {
        console.log(`      ❌ Aucun encadreur disponible dans cette commune`);
      } else if (group.encadreurs.length > 0) {
        console.log(`      ❌ Aucun parent/élève disponible dans cette commune`);
      }
    }
    
    // 3. Créer des assignations pour les communes avec des paires compatibles
    console.log('\n🔗 CRÉATION D\'ASSIGNATIONS:');
    
    // Trouver un administrateur pour l'assignation
    const admin = admins[0];
    if (!admin) {
      console.error('❌ Aucun administrateur trouvé pour créer des assignations');
      return;
    }
    
    let assignmentCount = 0;
    
    for (const [commune, group] of Object.entries(communeGroups)) {
      if (group.parents.length > 0 && group.encadreurs.length > 0) {
        console.log(`\n   🏙️ ${commune}:`);
        
        // Pour chaque parent, trouver un encadreur compatible
        for (const parent of group.parents) {
          // Vérifier si le parent a déjà un encadreur assigné
          if (parent.assignedEncadreur) {
            console.log(`      - ${parent.prenomsApprenant || ''} ${parent.nomApprenant || ''} a déjà un encadreur assigné`);
            continue;
          }
          
          // Trouver les encadreurs disponibles (pas encore à capacité maximale)
          const availableEncadreurs = group.encadreurs.filter(e => 
            e.assignedStudents.length < e.maxStudents
          );
          
          if (availableEncadreurs.length === 0) {
            console.log(`      - Aucun encadreur disponible pour ${parent.prenomsApprenant || ''} ${parent.nomApprenant || ''}`);
            continue;
          }
          
          // Choisir le premier encadreur disponible
          const encadreur = availableEncadreurs[0];
          
          console.log(`      - Création d'assignation: ${parent.prenomsApprenant || ''} ${parent.nomApprenant || ''} -> ${encadreur.prenoms || ''} ${encadreur.nom || ''}`);
          
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
          
          console.log(`        - Compatibilité: ${(compatibilityScore * 100).toFixed(0)}%`);
          
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
              console.log(`        ✅ Assignation créée avec succès! ID: ${result.assignmentId}`);
              assignmentCount++;
            } else {
              console.log(`        ❌ Erreur: ${result.error}`);
            }
          } catch (error) {
            console.error(`        ❌ Erreur: ${error}`);
          }
        }
      }
    }
    
    console.log(`\n✅ OPÉRATION TERMINÉE: ${assignmentCount} assignation(s) créée(s)`);
    
    // 4. Afficher les utilisateurs sans commune définie
    const encadreursWithoutCommune = encadreurs.filter(e => !e.communeIntervention);
    const parentsWithoutCommune = parents.filter(p => !p.communeApprenant);
    
    if (encadreursWithoutCommune.length > 0 || parentsWithoutCommune.length > 0) {
      console.log('\n⚠️ UTILISATEURS SANS COMMUNE DÉFINIE (NON MODIFIÉS):');
      
      if (encadreursWithoutCommune.length > 0) {
        console.log(`   - ${encadreursWithoutCommune.length} encadreur(s) sans commune d'intervention définie:`);
        for (const encadreur of encadreursWithoutCommune) {
          console.log(`     * ${encadreur.prenoms || ''} ${encadreur.nom || ''} (${encadreur.email})`);
        }
      }
      
      if (parentsWithoutCommune.length > 0) {
        console.log(`   - ${parentsWithoutCommune.length} parent(s)/élève(s) sans commune définie:`);
        for (const parent of parentsWithoutCommune) {
          console.log(`     * ${parent.prenomsApprenant || ''} ${parent.nomApprenant || ''} (${parent.email})`);
        }
      }
      
      console.log('\n💡 CONSEIL: Pour ces utilisateurs, vous devrez définir manuellement leur commune pour qu\'ils puissent être assignés.');
    }
    
  } catch (error) {
    console.error('❌ ERREUR LORS DE L\'OPÉRATION:', error);
  }
}

// Exécuter le script
checkAndCreateAssignments()
  .then(() => {
    console.log('🎉 Script terminé');
  })
  .catch(error => {
    console.error('❌ Erreur lors de l\'exécution du script:', error);
  });