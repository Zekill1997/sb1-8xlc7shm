import { databaseService } from '../services/databaseService';
import { User, Encadreur, ParentEleve } from '../types';

// Script pour vérifier la compatibilité des communes entre utilisateurs
export const checkCommuneCompatibility = async () => {
  console.log('🔍 VÉRIFICATION DE LA COMPATIBILITÉ DES COMMUNES');
  
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
      console.log('❌ Pas assez d\'utilisateurs pour vérifier la compatibilité');
      return;
    }
    
    // 2. Vérifier les communes pour chaque encadreur
    console.log('\n🔍 ANALYSE DES ENCADREURS:');
    for (const encadreur of encadreurs) {
      console.log(`\n👨‍🏫 Encadreur: ${encadreur.prenoms} ${encadreur.nom}`);
      console.log(`   - Email: ${encadreur.email}`);
      console.log(`   - Commune d'intervention: ${encadreur.communeIntervention || 'NON DÉFINIE'}`);
      console.log(`   - Disciplines: ${encadreur.disciplines.join(', ') || 'Aucune'}`);
      console.log(`   - Classes: ${encadreur.classesEnseignement.join(', ') || 'Aucune'}`);
      
      // Compter les parents compatibles
      const compatibleParents = parents.filter(p => 
        p.communeApprenant === encadreur.communeIntervention
      );
      
      console.log(`   - Parents/Élèves compatibles: ${compatibleParents.length}/${parents.length}`);
      
      if (compatibleParents.length > 0) {
        console.log('   - Parents/Élèves compatibles:');
        for (const parent of compatibleParents) {
          console.log(`     * ${parent.prenomsApprenant} ${parent.nomApprenant} (${parent.communeApprenant})`);
        }
      } else {
        console.log('   ❌ Aucun parent/élève compatible avec cet encadreur');
      }
    }
    
    // 3. Vérifier les communes pour chaque parent/élève
    console.log('\n🔍 ANALYSE DES PARENTS/ÉLÈVES:');
    for (const parent of parents) {
      console.log(`\n👨‍👩‍👧‍👦 Parent/Élève: ${parent.prenomsParent} ${parent.nomParent} / ${parent.prenomsApprenant} ${parent.nomApprenant}`);
      console.log(`   - Email: ${parent.email}`);
      console.log(`   - Commune de l'apprenant: ${parent.communeApprenant || 'NON DÉFINIE'}`);
      console.log(`   - Classe: ${parent.classeApprenant || 'Non définie'}`);
      console.log(`   - Besoins: ${parent.besoins.join(', ') || 'Aucun'}`);
      
      // Compter les encadreurs compatibles
      const compatibleEncadreurs = encadreurs.filter(e => 
        e.communeIntervention === parent.communeApprenant
      );
      
      console.log(`   - Encadreurs compatibles: ${compatibleEncadreurs.length}/${encadreurs.length}`);
      
      if (compatibleEncadreurs.length > 0) {
        console.log('   - Encadreurs compatibles:');
        for (const encadreur of compatibleEncadreurs) {
          console.log(`     * ${encadreur.prenoms} ${encadreur.nom} (${encadreur.communeIntervention})`);
        }
      } else {
        console.log('   ❌ Aucun encadreur compatible avec ce parent/élève');
      }
    }
    
    // 4. Vérifier les assignations existantes
    console.log('\n🔍 VÉRIFICATION DES ASSIGNATIONS EXISTANTES:');
    const assignments = await databaseService.getAssignments();
    
    if (assignments.length === 0) {
      console.log('   ℹ️ Aucune assignation en attente trouvée');
    } else {
      console.log(`   📋 ${assignments.length} assignation(s) en attente trouvée(s)`);
      
      for (const assignment of assignments) {
        const parent = parents.find(p => p.id === assignment.parentEleveId);
        const encadreur = encadreurs.find(e => e.id === assignment.encadreurId);
        
        if (!parent || !encadreur) {
          console.log(`   ❌ Assignation orpheline: ${assignment.id}`);
          continue;
        }
        
        const isCompatible = parent.communeApprenant === encadreur.communeIntervention;
        
        console.log(`\n   📎 Assignation: ${parent.prenomsApprenant} ${parent.nomApprenant} -> ${encadreur.prenoms} ${encadreur.nom}`);
        console.log(`      - Commune parent: ${parent.communeApprenant || 'NON DÉFINIE'}`);
        console.log(`      - Commune encadreur: ${encadreur.communeIntervention || 'NON DÉFINIE'}`);
        console.log(`      - Compatibilité: ${isCompatible ? '✅ Compatible' : '❌ Incompatible'}`);
        console.log(`      - Score: ${assignment.compatibilityScore * 100}%`);
      }
    }
    
    // 5. Vérifier les relations approuvées
    console.log('\n🔍 VÉRIFICATION DES RELATIONS APPROUVÉES:');
    const relations = await databaseService.getApprovedRelations();
    
    if (relations.length === 0) {
      console.log('   ℹ️ Aucune relation approuvée trouvée');
    } else {
      console.log(`   💑 ${relations.length} relation(s) approuvée(s) trouvée(s)`);
      
      for (const relation of relations) {
        const parent = parents.find(p => p.id === relation.parentEleveId);
        const encadreur = encadreurs.find(e => e.id === relation.encadreurId);
        
        if (!parent || !encadreur) {
          console.log(`   ❌ Relation orpheline: ${relation.id}`);
          continue;
        }
        
        const isCompatible = parent.communeApprenant === encadreur.communeIntervention;
        
        console.log(`\n   ❤️ Relation: ${parent.prenomsApprenant} ${parent.nomApprenant} -> ${encadreur.prenoms} ${encadreur.nom}`);
        console.log(`      - Commune parent: ${parent.communeApprenant || 'NON DÉFINIE'}`);
        console.log(`      - Commune encadreur: ${encadreur.communeIntervention || 'NON DÉFINIE'}`);
        console.log(`      - Compatibilité: ${isCompatible ? '✅ Compatible' : '❌ Incompatible'}`);
        console.log(`      - Statut: ${relation.status}`);
        console.log(`      - Score: ${relation.compatibilityScore * 100}%`);
      }
    }
    
    console.log('\n✅ VÉRIFICATION TERMINÉE');
    
  } catch (error) {
    console.error('❌ ERREUR LORS DE LA VÉRIFICATION:', error);
  }
};

// Exécuter immédiatement le script
checkCommuneCompatibility().then(() => {
  console.log('🎉 Script terminé');
});