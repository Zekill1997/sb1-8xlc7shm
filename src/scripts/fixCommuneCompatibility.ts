import { databaseService } from '../services/databaseService';
import { User, Encadreur, ParentEleve } from '../types';

// Script pour mettre à jour les communes des utilisateurs pour assurer la compatibilité
export const fixCommuneCompatibility = async () => {
  console.log('🔧 CORRECTION DE LA COMPATIBILITÉ DES COMMUNES');
  
  try {
    // 1. Récupérer tous les utilisateurs
    console.log('📊 Récupération de tous les utilisateurs...');
    const allUsers = await databaseService.getAllUsers();
    
    const encadreurs = allUsers.filter(u => u.role === 'ENCADREUR') as Encadreur[];
    const parents = allUsers.filter(u => u.role === 'PARENT_ELEVE') as ParentEleve[];
    
    console.log(`📊 Statistiques actuelles:`);
    console.log(`   - Encadreurs: ${encadreurs.length}`);
    console.log(`   - Parents/Élèves: ${parents.length}`);
    
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
        console.log(`   - Mise à jour de ${encadreur.prenoms} ${encadreur.nom} (${encadreur.email}): commune = ${defaultCommune}`);
        
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
        console.log(`   - Mise à jour de ${parent.prenomsApprenant} ${parent.nomApprenant} (${parent.email}): commune = ${defaultCommune}`);
        
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
    
    // 4. Identifier les paires potentielles
    console.log('\n🔍 RECHERCHE DE PAIRES COMPATIBLES:');
    
    // Recharger les utilisateurs après les mises à jour
    const updatedUsers = await databaseService.getAllUsers();
    const updatedEncadreurs = updatedUsers.filter(u => u.role === 'ENCADREUR') as Encadreur[];
    const updatedParents = updatedUsers.filter(u => u.role === 'PARENT_ELEVE') as ParentEleve[];
    
    // Grouper par commune
    const communeGroups: { [commune: string]: { parents: ParentEleve[], encadreurs: Encadreur[] } } = {};
    
    // Initialiser les groupes
    for (const encadreur of updatedEncadreurs) {
      const commune = encadreur.communeIntervention;
      if (commune) {
        if (!communeGroups[commune]) {
          communeGroups[commune] = { parents: [], encadreurs: [] };
        }
        communeGroups[commune].encadreurs.push(encadreur);
      }
    }
    
    for (const parent of updatedParents) {
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
    
    // 5. Proposer des assignations pour les communes avec des paires compatibles
    console.log('\n💡 PROPOSITIONS D\'ASSIGNATIONS:');
    
    // Trouver un administrateur pour l'assignation
    const admin = updatedUsers.find(u => u.role === 'ADMINISTRATEUR');
    if (!admin) {
      console.error('❌ Aucun administrateur trouvé pour créer des assignations');
      return;
    }
    
    let assignmentCount = 0;
    
    for (const [commune, group] of Object.entries(communeGroups)) {
      if (group.parents.length > 0 && group.encadreurs.length > 0) {
        console.log(`\n   🏙️ ${commune}:`);
        
        // Limiter à 3 propositions par commune
        const maxProposals = Math.min(3, group.parents.length, group.encadreurs.length);
        
        for (let i = 0; i < maxProposals; i++) {
          const parent = group.parents[i];
          const encadreur = group.encadreurs[i];
          
          console.log(`      📎 Proposition ${i+1}: ${parent.prenomsApprenant} ${parent.nomApprenant} -> ${encadreur.prenoms} ${encadreur.nom}`);
          
          // Calculer le score de compatibilité
          let compatibilityScore = 0.75; // Score de base
          
          // Vérifier les disciplines (pour les classes collège/lycée)
          if (parent.besoins.length > 0 && encadreur.disciplines.length > 0) {
            const matchingDisciplines = parent.besoins.filter(b => 
              encadreur.disciplines.includes(b)
            );
            
            if (matchingDisciplines.length > 0) {
              compatibilityScore += 0.25 * (matchingDisciplines.length / parent.besoins.length);
            }
          }
          
          // Limiter à 1.0 maximum
          compatibilityScore = Math.min(compatibilityScore, 1.0);
          
          console.log(`         - Compatibilité: ${(compatibilityScore * 100).toFixed(0)}%`);
          
          // Créer l'assignation
          const criteria = {
            commune: true,
            disciplines: parent.besoins.some(b => encadreur.disciplines.includes(b)),
            classe: encadreur.classesEnseignement.includes(parent.classeApprenant)
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
              console.log(`         ✅ Assignation créée avec succès! ID: ${result.assignmentId}`);
              assignmentCount++;
            } else {
              console.log(`         ❌ Erreur: ${result.error}`);
            }
          } catch (error) {
            console.error(`         ❌ Erreur: ${error}`);
          }
        }
      }
    }
    
    console.log(`\n✅ CORRECTION TERMINÉE: ${assignmentCount} assignation(s) créée(s)`);
    
  } catch (error) {
    console.error('❌ ERREUR LORS DE LA CORRECTION:', error);
  }
};

// Exécuter immédiatement le script
fixCommuneCompatibility().then(() => {
  console.log('🎉 Script terminé');
});