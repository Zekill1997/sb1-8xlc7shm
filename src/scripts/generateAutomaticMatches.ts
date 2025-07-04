import { databaseService } from '../services/databaseService';

/**
 * Script pour générer automatiquement des correspondances entre parents/élèves et encadreurs
 * en se basant sur les critères de compatibilité définis:
 * 1. Compatibilité de commune (critère obligatoire)
 * 2. Compatibilité de disciplines (augmente le score)
 * 3. Compatibilité de classe (augmente le score)
 */
export async function generateAutomaticMatches() {
  console.log('🔄 GÉNÉRATION AUTOMATIQUE DES CORRESPONDANCES');
  
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
      console.log('❌ Pas assez d\'utilisateurs pour générer des correspondances');
      return;
    }
    
    // 2. Récupérer les assignations existantes pour éviter les doublons
    console.log('🔍 Vérification des assignations existantes...');
    const existingAssignments = await databaseService.getAssignments();
    console.log(`   - ${existingAssignments.length} assignation(s) en attente trouvée(s)`);
    
    // 3. Récupérer les relations approuvées existantes
    console.log('🔍 Vérification des relations existantes...');
    const existingRelations = await databaseService.getApprovedRelations();
    console.log(`   - ${existingRelations.length} relation(s) approuvée(s) trouvée(s)`);
    
    // 4. Trouver un administrateur pour créer les assignations
    const admin = admins[0];
    if (!admin) {
      console.error('❌ Aucun administrateur trouvé pour créer des assignations');
      return;
    }
    
    // 5. Générer les correspondances potentielles
    console.log('\n🔍 GÉNÉRATION DES CORRESPONDANCES POTENTIELLES:');
    
    // Stocker les correspondances potentielles
    const potentialMatches: any[] = [];
    
    // Pour chaque parent/élève sans encadreur assigné
    for (const parent of parents) {
      // Vérifier si le parent a déjà un encadreur assigné
      if ((parent as any).assignedEncadreur) {
        console.log(`   - ${(parent as any).prenomsApprenant || ''} ${(parent as any).nomApprenant || ''} a déjà un encadreur assigné`);
        continue;
      }
      
      // Vérifier si la commune est définie
      if (!(parent as any).communeApprenant) {
        console.log(`   - ${(parent as any).prenomsApprenant || ''} ${(parent as any).nomApprenant || ''} n'a pas de commune définie`);
        continue;
      }
      
      // Trouver les encadreurs compatibles (même commune)
      const compatibleEncadreurs = encadreurs.filter(e => {
        // Vérifier la commune (critère obligatoire)
        if ((e as any).communeIntervention !== (parent as any).communeApprenant) {
          return false;
        }
        
        // Vérifier que l'encadreur n'a pas atteint sa capacité maximale
        if ((e as any).assignedStudents && (e as any).assignedStudents.length >= (e as any).maxStudents) {
          return false;
        }
        
        // Vérifier qu'il n'y a pas déjà une assignation en attente
        const existingAssignment = existingAssignments.find(a => 
          a.parentEleveId === parent.id && a.encadreurId === e.id
        );
        if (existingAssignment) {
          return false;
        }
        
        // Vérifier qu'il n'y a pas déjà une relation approuvée
        const existingRelation = existingRelations.find(r => 
          r.parentEleveId === parent.id && r.encadreurId === e.id
        );
        if (existingRelation) {
          return false;
        }
        
        return true;
      });
      
      if (compatibleEncadreurs.length === 0) {
        console.log(`   - Aucun encadreur compatible disponible pour ${(parent as any).prenomsApprenant || ''} ${(parent as any).nomApprenant || ''}`);
        continue;
      }
      
      // Pour chaque encadreur compatible, calculer un score de compatibilité
      for (const encadreur of compatibleEncadreurs) {
        let score = 0.75; // Score de base pour la compatibilité de commune
        let criteria = { commune: true, disciplines: false, classe: false };
        
        // Vérifier la compatibilité des disciplines
        if ((parent as any).besoins && (parent as any).besoins.length > 0 && (encadreur as any).disciplines && (encadreur as any).disciplines.length > 0) {
          const matchingDisciplines = (parent as any).besoins.filter((b: string) => 
            (encadreur as any).disciplines.includes(b)
          );
          
          if (matchingDisciplines.length > 0) {
            score += 0.15 * (matchingDisciplines.length / (parent as any).besoins.length);
            criteria.disciplines = true;
          }
        }
        
        // Vérifier la compatibilité de classe
        if ((parent as any).classeApprenant && (encadreur as any).classesEnseignement && 
            (encadreur as any).classesEnseignement.includes((parent as any).classeApprenant)) {
          score += 0.10;
          criteria.classe = true;
        }
        
        // Limiter le score à 1.0
        score = Math.min(score, 1.0);
        
        // Ajouter à la liste des correspondances potentielles
        potentialMatches.push({
          parent,
          encadreur,
          score,
          criteria
        });
      }
    }
    
    // 6. Trier les correspondances par score de compatibilité (du plus élevé au plus bas)
    potentialMatches.sort((a, b) => b.score - a.score);
    
    console.log(`\n✅ ${potentialMatches.length} correspondance(s) potentielle(s) trouvée(s)`);
    
    // 7. Créer les assignations pour les meilleures correspondances
    console.log('\n🔗 CRÉATION DES ASSIGNATIONS:');
    
    let assignmentCount = 0;
    const createdAssignments = new Set(); // Pour éviter les doublons
    
    for (const match of potentialMatches) {
      // Vérifier que ni le parent ni l'encadreur n'ont déjà été assignés dans cette session
      const parentKey = match.parent.id;
      const encadreurKey = match.encadreur.id;
      const matchKey = `${parentKey}-${encadreurKey}`;
      
      if (createdAssignments.has(parentKey) || createdAssignments.has(encadreurKey)) {
        continue;
      }
      
      console.log(`   - Correspondance: ${(match.parent as any).prenomsApprenant || ''} ${(match.parent as any).nomApprenant || ''} -> ${(match.encadreur as any).prenoms || ''} ${(match.encadreur as any).nom || ''}`);
      console.log(`     - Commune: ${(match.parent as any).communeApprenant}`);
      console.log(`     - Score de compatibilité: ${(match.score * 100).toFixed(0)}%`);
      console.log(`     - Critères: ${JSON.stringify(match.criteria)}`);
      
      try {
        const result = await databaseService.createAssignmentWithCommuneCheck(
          match.parent.id,
          match.encadreur.id,
          match.score,
          match.criteria,
          admin.id
        );
        
        if (result.success) {
          console.log(`     ✅ Assignation créée avec succès! ID: ${result.assignmentId}`);
          assignmentCount++;
          
          // Marquer comme assignés pour éviter les doublons
          createdAssignments.add(parentKey);
          createdAssignments.add(encadreurKey);
        } else {
          console.log(`     ❌ Erreur: ${result.error}`);
        }
      } catch (error) {
        console.error(`     ❌ Erreur: ${error}`);
      }
    }
    
    console.log(`\n✅ GÉNÉRATION TERMINÉE: ${assignmentCount} assignation(s) créée(s)`);
    
    // 8. Afficher les utilisateurs sans commune définie
    const encadreursWithoutCommune = encadreurs.filter(e => !(e as any).communeIntervention);
    const parentsWithoutCommune = parents.filter(p => !(p as any).communeApprenant);
    
    if (encadreursWithoutCommune.length > 0 || parentsWithoutCommune.length > 0) {
      console.log('\n⚠️ UTILISATEURS SANS COMMUNE DÉFINIE:');
      
      if (encadreursWithoutCommune.length > 0) {
        console.log(`   - ${encadreursWithoutCommune.length} encadreur(s) sans commune d'intervention définie:`);
        for (const encadreur of encadreursWithoutCommune) {
          console.log(`     * ${(encadreur as any).prenoms || ''} ${(encadreur as any).nom || ''} (${encadreur.email})`);
        }
      }
      
      if (parentsWithoutCommune.length > 0) {
        console.log(`   - ${parentsWithoutCommune.length} parent(s)/élève(s) sans commune définie:`);
        for (const parent of parentsWithoutCommune) {
          console.log(`     * ${(parent as any).prenomsApprenant || ''} ${(parent as any).nomApprenant || ''} (${parent.email})`);
        }
      }
      
      console.log('\n💡 IMPORTANT: Pour ces utilisateurs, vous devez définir manuellement leur commune pour qu\'ils puissent être assignés.');
    }
    
  } catch (error) {
    console.error('❌ ERREUR LORS DE LA GÉNÉRATION DES CORRESPONDANCES:', error);
  }
}

// Pour exécuter le script directement, décommentez la ligne suivante
// generateAutomaticMatches();