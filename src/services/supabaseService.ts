import { supabase } from '../config/supabase';
import { User, Encadreur, ParentEleve, Administrateur } from '../types';

// Service pour gérer les utilisateurs
export class UserService {
  // Créer un utilisateur
  static async createUser(userData: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('👤 Création utilisateur Supabase:', userData.email);
      
      // Pour les administrateurs, insérer directement dans la table users sans compte auth
      if (userData.role === 'ADMINISTRATEUR') {
        const userRecord = {
          id: userData.id || crypto.randomUUID(),
          username: userData.email!,
          email: userData.email!,
          role: userData.role!,
          ...this.mapUserDataToDatabase(userData)
        };

        const { data, error } = await supabase
          .from('users')
          .upsert([userRecord], { onConflict: 'email' })
          .select()
          .single();

        if (error) {
          console.error('❌ Erreur création admin:', error);
          return { success: false, error: error.message };
        }

        const user = this.mapDatabaseToUser(data);
        console.log('✅ Admin créé/mis à jour:', user.email);
        return { success: true, user };
      }

      // Pour les autres utilisateurs
      const userRecord = {
        id: crypto.randomUUID(),
        username: userData.email!,
        email: userData.email!,
        role: userData.role!,
        ...this.mapUserDataToDatabase(userData)
      };

      const { data, error } = await supabase
        .from('users')
        .insert([userRecord])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création utilisateur:', error);
        if (error.code === '23505') {
          return { success: false, error: 'Cette adresse email est déjà utilisée.' };
        }
        return { success: false, error: error.message };
      }

      const user = this.mapDatabaseToUser(data);
      console.log('✅ Utilisateur créé dans Supabase:', user.email);
      return { success: true, user };
    } catch (error: any) {
      console.error('❌ Erreur création utilisateur:', error);
      return { success: false, error: error.message };
    }
  }

  // Connexion utilisateur
  static async signIn(email: string, password: string, role?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🔐 Tentative de connexion Supabase:', email, 'Role:', role);

      // Vérifier d'abord si c'est un administrateur par défaut
      if (role === 'ADMINISTRATEUR' || email === 'ekbessan@gmail.com' || email === 'superapprenant25@gmail.com') {
        const { data: adminData, error: adminError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('role', 'ADMINISTRATEUR')
          .maybeSingle();

        if (!adminError && adminData) {
          const adminPasswords: { [key: string]: string } = {
            'ekbessan@gmail.com': 'agligoezekiel#@',
            'superapprenant25@gmail.com': 'SuperAdmin2025#'
          };

          if (adminPasswords[email] === password) {
            const user = this.mapDatabaseToUser(adminData);
            console.log('✅ Connexion admin Supabase réussie:', user.email);
            return { success: true, user };
          } else {
            return { success: false, error: 'Mot de passe incorrect pour cet administrateur' };
          }
        }
        
        if (role === 'ADMINISTRATEUR') {
          return { success: false, error: 'Administrateur non trouvé' };
        }
      }

      // Pour les autres utilisateurs
      let query = supabase
        .from('users')
        .select('*')
        .eq('email', email);

      if (role && role !== 'ADMINISTRATEUR') {
        query = query.eq('role', role);
      }

      const { data: userData, error: userError } = await query.maybeSingle();

      if (userError) {
        console.error('❌ Erreur requête utilisateur:', userError);
        return { success: false, error: 'Erreur lors de la vérification des données utilisateur' };
      }

      if (!userData) {
        return { success: false, error: 'Utilisateur non trouvé pour ce rôle' };
      }

      // Pour l'instant, on accepte tous les utilisateurs trouvés dans la base
      const user = this.mapDatabaseToUser(userData);
      console.log('✅ Connexion Supabase réussie:', user.email);
      return { success: true, user };
    } catch (error: any) {
      console.error('❌ Erreur connexion Supabase:', error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer tous les utilisateurs
  static async getAllUsers(): Promise<User[]> {
    try {
      // Test connection first
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.success) {
        console.error('❌ Supabase connection failed:', connectionTest.error);
        throw new Error(`Supabase connection failed: ${connectionTest.error}`);
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching users from Supabase:', error);
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      const users = data.map(this.mapDatabaseToUser);
      console.log('✅ Users fetched from Supabase:', users.length);
      return users;
    } catch (error) {
      console.error('❌ Error in getAllUsers:', error);
      throw error;
    }
  }

  // Mettre à jour un utilisateur
  static async updateUser(id: string, userData: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🔄 Mise à jour utilisateur Supabase:', id);
      
      const updateData = {
        ...this.mapUserDataToDatabase(userData),
        updated_at: new Date().toISOString()
      };

      // Nettoyer les valeurs undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur mise à jour utilisateur Supabase:', error);
        return { success: false, error: error.message };
      }

      const user = this.mapDatabaseToUser(data);
      console.log('✅ Utilisateur mis à jour dans Supabase:', user.email);
      return { success: true, user };
    } catch (error: any) {
      console.error('❌ Erreur mise à jour utilisateur Supabase:', error);
      return { success: false, error: error.message };
    }
  }

  // Supprimer un utilisateur avec nettoyage complet
  static async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Suppression complète utilisateur Supabase:', id);
      
      // 1. Supprimer les messages liés à cet utilisateur
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .or(`from_user_id.eq.${id},to_user_id.eq.${id}`);

      if (messagesError) {
        console.warn('⚠️ Erreur suppression messages Supabase:', messagesError);
      } else {
        console.log('✅ Messages supprimés de Supabase pour utilisateur:', id);
      }

      // 2. Supprimer les notifications liées à cet utilisateur
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', id);

      if (notificationsError) {
        console.warn('⚠️ Erreur suppression notifications Supabase:', notificationsError);
      } else {
        console.log('✅ Notifications supprimées de Supabase pour utilisateur:', id);
      }

      // 3. Supprimer les assignations liées à cet utilisateur
      const { error: assignmentsError } = await supabase
        .from('assignments')
        .delete()
        .or(`parent_eleve_id.eq.${id},encadreur_id.eq.${id},assigned_by.eq.${id}`);

      if (assignmentsError) {
        console.warn('⚠️ Erreur suppression assignations Supabase:', assignmentsError);
      } else {
        console.log('✅ Assignations supprimées de Supabase pour utilisateur:', id);
      }

      // 4. Marquer les relations comme dissociées
      const { error: relationsError } = await supabase
        .from('approved_relations')
        .update({ 
          status: 'DISSOCIATED',
          dissociated_at: new Date().toISOString(),
          dissociated_by: id
        })
        .or(`parent_eleve_id.eq.${id},encadreur_id.eq.${id}`)
        .eq('status', 'ACTIVE');

      if (relationsError) {
        console.warn('⚠️ Erreur dissociation relations Supabase:', relationsError);
      } else {
        console.log('✅ Relations dissociées dans Supabase pour utilisateur:', id);
      }

      // 5. Nettoyer les références dans les autres utilisateurs
      // Supprimer les références d'encadreur assigné
      const { error: parentUpdateError } = await supabase
        .from('users')
        .update({ assigned_encadreur: null })
        .eq('assigned_encadreur', id);

      if (parentUpdateError) {
        console.warn('⚠️ Erreur nettoyage références parent Supabase:', parentUpdateError);
      }

      // Nettoyer les listes d'étudiants assignés
      const { data: encadreurs, error: encadreursError } = await supabase
        .from('users')
        .select('id, assigned_students')
        .eq('role', 'ENCADREUR')
        .not('assigned_students', 'is', null);

      if (!encadreursError && encadreurs) {
        for (const encadreur of encadreurs) {
          if (encadreur.assigned_students && encadreur.assigned_students.includes(id)) {
            const updatedStudents = encadreur.assigned_students.filter((studentId: string) => studentId !== id);
            
            const { error: updateError } = await supabase
              .from('users')
              .update({ assigned_students: updatedStudents })
              .eq('id', encadreur.id);

            if (updateError) {
              console.warn('⚠️ Erreur nettoyage liste étudiants Supabase:', updateError);
            }
          }
        }
      }

      // 6. Finalement, supprimer l'utilisateur
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (userError) {
        console.error('❌ Erreur suppression utilisateur Supabase:', userError);
        return { success: false, error: userError.message };
      }

      console.log('✅ Utilisateur et toutes ses données supprimés de Supabase');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur suppression utilisateur Supabase:', error);
      return { success: false, error: error.message };
    }
  }

  // Mapper les données utilisateur vers le format base de données
  private static mapUserDataToDatabase(userData: Partial<User>): any {
    const mapped: any = {};

    if (userData.role === 'ENCADREUR') {
      const encadreur = userData as Partial<Encadreur>;
      if (encadreur.nom !== undefined) mapped.nom = encadreur.nom;
      if (encadreur.prenoms !== undefined) mapped.prenoms = encadreur.prenoms;
      if (encadreur.telephone !== undefined) mapped.telephone = encadreur.telephone;
      if (encadreur.genre !== undefined) mapped.genre = encadreur.genre;
      if (encadreur.communeResidence !== undefined) mapped.commune_residence = encadreur.communeResidence;
      if (encadreur.dernierDiplome !== undefined) mapped.dernier_diplome = encadreur.dernierDiplome;
      if (encadreur.experienceProfessionnelle !== undefined) mapped.experience_professionnelle = encadreur.experienceProfessionnelle;
      if (encadreur.classesEnseignement !== undefined) mapped.classes_enseignement = encadreur.classesEnseignement;
      if (encadreur.disciplines !== undefined) mapped.disciplines = encadreur.disciplines;
      if (encadreur.communeIntervention !== undefined) mapped.commune_intervention = encadreur.communeIntervention;
      if (encadreur.motivation !== undefined) mapped.motivation = encadreur.motivation;
      if (encadreur.profilEncadrant !== undefined) mapped.profil_encadrant = encadreur.profilEncadrant;
      if (encadreur.assignedStudents !== undefined) mapped.assigned_students = encadreur.assignedStudents;
      if (encadreur.maxStudents !== undefined) mapped.max_students = encadreur.maxStudents;
      if (encadreur.profilePhoto !== undefined) mapped.profile_photo = encadreur.profilePhoto;
    } else if (userData.role === 'PARENT_ELEVE') {
      const parent = userData as Partial<ParentEleve>;
      if (parent.nomParent !== undefined) mapped.nom_parent = parent.nomParent;
      if (parent.prenomsParent !== undefined) mapped.prenoms_parent = parent.prenomsParent;
      if (parent.telephone !== undefined) mapped.telephone = parent.telephone;
      if (parent.profession !== undefined) mapped.profession = parent.profession;
      if (parent.communeResidence !== undefined) mapped.commune_residence = parent.communeResidence;
      if (parent.packChoisi !== undefined) mapped.pack_choisi = parent.packChoisi;
      if (parent.nomApprenant !== undefined) mapped.nom_apprenant = parent.nomApprenant;
      if (parent.prenomsApprenant !== undefined) mapped.prenoms_apprenant = parent.prenomsApprenant;
      if (parent.ageApprenant !== undefined) mapped.age_apprenant = parent.ageApprenant;
      if (parent.communeApprenant !== undefined) mapped.commune_apprenant = parent.communeApprenant;
      if (parent.classeApprenant !== undefined) mapped.classe_apprenant = parent.classeApprenant;
      if (parent.besoins !== undefined) mapped.besoins = parent.besoins;
      if (parent.profilApprentissage !== undefined) mapped.profil_apprentissage = parent.profilApprentissage;
      if (parent.assignedEncadreur !== undefined) mapped.assigned_encadreur = parent.assignedEncadreur;
      if (parent.profilePhoto !== undefined) mapped.profile_photo = parent.profilePhoto;
    } else if (userData.role === 'ADMINISTRATEUR') {
      const admin = userData as Partial<Administrateur>;
      if (admin.nom !== undefined) mapped.nom = admin.nom;
      if (admin.prenoms !== undefined) mapped.prenoms = admin.prenoms;
    }

    return mapped;
  }

  // Mapper les données de la base vers le format utilisateur
  private static mapDatabaseToUser(data: any): User {
    const baseUser = {
      id: data.id,
      username: data.username,
      email: data.email,
      role: data.role,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    if (data.role === 'ENCADREUR') {
      return {
        ...baseUser,
        role: 'ENCADREUR',
        profilePhoto: data.profile_photo,
        nom: data.nom,
        prenoms: data.prenoms,
        telephone: data.telephone,
        genre: data.genre,
        communeResidence: data.commune_residence,
        dernierDiplome: data.dernier_diplome,
        experienceProfessionnelle: data.experience_professionnelle || false,
        classesEnseignement: data.classes_enseignement || [],
        disciplines: data.disciplines || [],
        communeIntervention: data.commune_intervention,
        motivation: data.motivation,
        profilEncadrant: data.profil_encadrant || {},
        assignedStudents: data.assigned_students || [],
        maxStudents: data.max_students || 4
      } as Encadreur;
    } else if (data.role === 'PARENT_ELEVE') {
      return {
        ...baseUser,
        role: 'PARENT_ELEVE',
        profilePhoto: data.profile_photo,
        nomParent: data.nom_parent,
        prenomsParent: data.prenoms_parent,
        telephone: data.telephone,
        profession: data.profession,
        communeResidence: data.commune_residence,
        packChoisi: data.pack_choisi,
        nomApprenant: data.nom_apprenant,
        prenomsApprenant: data.prenoms_apprenant,
        ageApprenant: data.age_apprenant,
        communeApprenant: data.commune_apprenant,
        classeApprenant: data.classe_apprenant,
        besoins: data.besoins || [],
        profilApprentissage: data.profil_apprentissage || {},
        assignedEncadreur: data.assigned_encadreur
      } as ParentEleve;
    } else {
      return {
        ...baseUser,
        role: 'ADMINISTRATEUR',
        nom: data.nom,
        prenoms: data.prenoms
      } as Administrateur;
    }
  }
}

// Service pour les messages
export class MessageService {
  static async sendMessage(fromUserId: string, toUserId: string, subject: string, content: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('📧 Envoi message Supabase:', fromUserId, '->', toUserId);
      
      // Vérifier d'abord si l'utilisateur peut envoyer un message
      const { data: canSend, error: checkError } = await supabase
        .rpc('can_send_message', {
          sender_id: fromUserId,
          recipient_id: toUserId
        });
      
      if (checkError) {
        console.error('❌ Erreur vérification permissions message:', checkError);
        return { success: false, error: 'Erreur lors de la vérification des permissions' };
      }
      
      if (!canSend) {
        return { 
          success: false, 
          error: 'Vous ne pouvez envoyer des messages qu\'aux administrateurs et aux utilisateurs qui vous sont assignés' 
        };
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          from_user_id: fromUserId,
          to_user_id: toUserId,
          subject,
          content,
          read: false
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur envoi message Supabase:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Message envoyé dans Supabase:', data.id);
      return { success: true, messageId: data.id };
    } catch (error: any) {
      console.error('❌ Erreur envoi message Supabase:', error);
      return { success: false, error: error.message };
    }
  }

  static async getMessages(userId: string): Promise<any[]> {
    try {
      console.log('📬 Récupération messages Supabase pour:', userId);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur récupération messages Supabase:', error);
        return [];
      }

      const messages = data.map(msg => ({
        id: msg.id,
        from: msg.from_user_id,
        to: msg.to_user_id,
        subject: msg.subject,
        content: msg.content,
        read: msg.read,
        createdAt: msg.created_at,
        type: msg.from_user_id === userId ? 'sent' : 'received'
      }));

      console.log('✅ Messages Supabase récupérés:', messages.length);
      return messages;
    } catch (error) {
      console.error('❌ Erreur récupération messages Supabase:', error);
      return [];
    }
  }
}

// Service pour les notifications
export class NotificationService {
  static async createNotification(userId: string, type: string, title: string, message: string, data?: any): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      console.log('🔔 Création notification Supabase pour:', userId, title);
      
      const { data: notificationData, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          type,
          title,
          message,
          data,
          read: false
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création notification Supabase:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Notification créée dans Supabase:', notificationData.id);
      return { success: true, notificationId: notificationData.id };
    } catch (error: any) {
      console.error('❌ Erreur création notification Supabase:', error);
      return { success: false, error: error.message };
    }
  }
}

// Service pour les assignations avec gestion des relations
export class AssignmentService {
  // Récupérer toutes les assignations en attente avec détails
  static async getAllAssignmentsWithDetails(): Promise<any[]> {
    try {
      console.log('📋 Récupération assignations détaillées Supabase...');
      
      // Utiliser la nouvelle fonction RPC pour récupérer les assignations persistantes
      const { data, error } = await supabase
        .rpc('get_persistent_assignments');

      if (error) {
        console.error('❌ Erreur récupération assignations persistantes Supabase:', error);
        return [];
      }

      // Convertir le résultat JSON en tableau d'objets
      const assignments = Array.isArray(data) ? data : [];
      
      console.log('✅ Assignations persistantes Supabase récupérées:', assignments.length);
      return assignments;
    } catch (error) {
      console.error('❌ Erreur récupération assignations persistantes Supabase:', error);
      return [];
    }
  }

  // Récupérer toutes les assignations en attente (version standard)
  static async getAllAssignmentsStandard(): Promise<any[]> {
    try {
      console.log('📋 Récupération assignations standard Supabase...');
      
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('status', 'PENDING')
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur récupération assignations standard Supabase:', error);
        return [];
      }

      const assignments = data.map(assignment => ({
        id: assignment.id,
        parentEleveId: assignment.parent_eleve_id,
        encadreurId: assignment.encadreur_id,
        compatibilityScore: assignment.compatibility_score,
        criteria: assignment.criteria,
        assignedBy: assignment.assigned_by,
        assignedAt: assignment.assigned_at,
        status: assignment.status,
        // Ajouter les champs originaux pour compatibilité
        parent_eleve_id: assignment.parent_eleve_id,
        encadreur_id: assignment.encadreur_id
      }));

      console.log('✅ Assignations standard Supabase récupérées:', assignments.length);
      return assignments;
    } catch (error) {
      console.error('❌ Erreur récupération assignations standard Supabase:', error);
      return [];
    }
  }

  // Approuver une assignation (utilise la fonction Supabase)
  static async approveAssignment(assignmentId: string, approvedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('✅ Approbation assignation Supabase:', assignmentId, 'par:', approvedBy);
      
      // Utiliser la fonction RPC améliorée avec transaction
      const { data, error } = await supabase
        .rpc('approve_assignment_with_transaction', {
          _assignment_id: assignmentId,
          approved_by_user: approvedBy
        });

      if (error) {
        console.error('❌ Erreur approbation Supabase:', error);
        return { success: false, error: error.message };
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'Erreur inconnue lors de l\'approbation';
        return { success: false, error: errorMsg };
      }

      console.log('✅ Assignation approuvée dans Supabase:', data.relation_id);
      
      // Vérifier et réparer les relations pour s'assurer de la cohérence
      await this.checkAndRepairRelations();
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur approbation assignation Supabase:', error);
      return { success: false, error: error.message };
    }
  }

  // Dissocier une relation (utilise la fonction Supabase)
  static async dissociateRelation(parentEleveId: string, encadreurId: string, dissociatedBy?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💔 Dissociation relation Supabase:', parentEleveId, '<-X->', encadreurId);
      
      const { data, error } = await supabase
        .rpc('dissociate_relation', {
          _parent_id: parentEleveId,
          _encadreur_id: encadreurId,
          dissociated_by_user: dissociatedBy || parentEleveId
        });

      if (error) {
        console.error('❌ Erreur dissociation relation Supabase:', error);
        return { success: false, error: error.message };
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'Erreur inconnue lors de la dissociation';
        return { success: false, error: errorMsg };
      }

      console.log('✅ Relation dissociée dans Supabase:', data.relation_id);
     console.log('✅ Nouvelle assignation créée dans Supabase:', data.assignment_id);
      
      // Vérifier et réparer les relations pour s'assurer de la cohérence
      await this.checkAndRepairRelations();
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur dissociation relation Supabase:', error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer les relations approuvées avec détails
  static async getApprovedRelations(): Promise<any[]> {
    try {
      console.log('💕 Récupération relations approuvées persistantes Supabase...');
      
      // Utiliser la nouvelle fonction RPC pour récupérer les relations persistantes
      const { data, error } = await supabase
        .rpc('get_persistent_relations');

      if (error) {
        console.error('❌ Erreur récupération relations persistantes Supabase:', error);
        throw new Error(`Erreur récupération relations persistantes Supabase: ${error.message}`);
      }

      // Convertir le résultat JSON en tableau d'objets
      const relations = Array.isArray(data) ? data : [];
      
      console.log('✅ Relations persistantes Supabase récupérées:', relations.length);
      return relations;
    } catch (error) {
      console.error('❌ Erreur récupération relations persistantes Supabase:', error);
      throw error;
    }
  }

  // Créer une assignation avec vérification de commune
  static async createAssignmentWithCommuneCheck(
    parentEleveId: string, 
    encadreurId: string, 
    compatibilityScore: number, 
    criteria: any, 
    assignedBy: string
  ): Promise<{ success: boolean; assignmentId?: string; error?: string }> {
    try {
      console.log('🔗 Création assignation avec vérification commune:', parentEleveId, '<->', encadreurId);
      
      // Utiliser la fonction RPC pour créer avec vérification de commune
      const { data, error } = await supabase
        .rpc('create_assignment_with_commune_check', {
          _parent_id: parentEleveId,
          _encadreur_id: encadreurId,
          compatibility_score: compatibilityScore,
          criteria,
          assigned_by: assignedBy
        });

      if (error) {
        console.error('❌ Erreur création assignation avec vérification commune:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error };
      }

      console.log('✅ Assignation créée avec vérification commune:', data.assignment_id);
      return { success: true, assignmentId: data.assignment_id };
    } catch (error: any) {
      console.error('❌ Erreur création assignation avec vérification commune:', error);
      return { success: false, error: error.message };
    }
  }

  // Vérifier et réparer les relations incohérentes
  static async checkAndRepairRelations(): Promise<{ success: boolean; fixed: number; error?: string }> {
    try {
      console.log('🔧 Vérification et réparation des relations Supabase...');
      
      const { data, error } = await supabase
        .rpc('check_and_repair_relations');

      if (error) {
        console.error('❌ Erreur réparation relations Supabase:', error);
        return { success: false, fixed: 0, error: error.message };
      }

      console.log('✅ Réparation relations Supabase terminée:', data);
      return { 
        success: true, 
        fixed: data.fixed_relations + data.orphaned_relations
      };
    } catch (error: any) {
      console.error('❌ Erreur réparation relations Supabase:', error);
      return { success: false, fixed: 0, error: error.message };
    }
  }

  // Vérifier et réparer les assignations incohérentes
  static async checkAndRepairAssignments(): Promise<{ success: boolean; fixed: number; error?: string }> {
    try {
      console.log('🔧 Vérification et réparation des assignations Supabase...');
      
      const { data, error } = await supabase
        .rpc('check_and_repair_assignments');

      if (error) {
        console.error('❌ Erreur réparation assignations Supabase:', error);
        return { success: false, fixed: 0, error: error.message };
      }

      console.log('✅ Réparation assignations Supabase terminée:', data);
      return { 
        success: true, 
        fixed: data.fixed_assignments + data.orphaned_assignments + data.duplicate_assignments
      };
    } catch (error: any) {
      console.error('❌ Erreur réparation assignations Supabase:', error);
      return { success: false, fixed: 0, error: error.message };
    }
  }
}