import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Encadreur, ParentEleve, Administrateur } from '../types';
import { databaseService } from '../services/databaseService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (userData: Partial<User>) => Promise<boolean>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  getDatabaseStats: () => any;
  getSyncStatus: () => { isOnline: boolean; lastSync: Date; mode: string };
  forceSync: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🔄 Initialisation de l\'application avec synchronisation...');
        
        // Vérifier si un utilisateur est connecté
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            console.log('👤 Utilisateur sauvegardé trouvé:', parsedUser.email);
            
            // Synchroniser et vérifier que l'utilisateur existe toujours
            const allUsers = await databaseService.getAllUsers();
            const currentUser = allUsers.find(u => u.id === parsedUser.id);
            
            if (currentUser) {
              console.log('✅ Utilisateur vérifié et synchronisé');
              setUser(currentUser);
              localStorage.setItem('currentUser', JSON.stringify(currentUser));
            } else {
              console.warn('⚠️ Utilisateur non trouvé après sync, déconnexion');
              localStorage.removeItem('currentUser');
            }
          } catch (error) {
            console.error('❌ Erreur parsing utilisateur sauvegardé:', error);
            localStorage.removeItem('currentUser');
          }
        } else {
          console.log('👤 Aucun utilisateur sauvegardé');
        }

        // Écouter les événements de synchronisation
        const handleDatabaseSync = (event: any) => {
          console.log('🔄 Synchronisation détectée, mise à jour utilisateur');
          if (user) {
            refreshUserData();
          }
        };

        window.addEventListener('databaseSync', handleDatabaseSync);

        // Nettoyer l'écouteur lors du démontage
        return () => {
          window.removeEventListener('databaseSync', handleDatabaseSync);
        };
      } catch (error) {
        console.error('❌ Erreur initialisation app:', error);
      } finally {
        setIsLoading(false);
        console.log('✅ Initialisation terminée - Mode: Synchronisation multi-appareils activée');
      }
    };

    initApp();
  }, []);

  const refreshUserData = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Actualisation des données utilisateur...');
      
      const allUsers = await databaseService.getAllUsers();
      const updatedUser = allUsers.find(u => u.id === user.id);
      
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        console.log('✅ Données utilisateur actualisées');
      }
    } catch (error) {
      console.error('❌ Erreur actualisation utilisateur:', error);
    }
  };

  const refreshUser = async () => {
    await refreshUserData();
  };

  const login = async (email: string, password: string, role?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Tentative de connexion avec sync:', email, 'Role:', role);
      
      const result = await databaseService.loginUser(email, password, role);
      
      if (result.success && result.user) {
        setUser(result.user);
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        console.log('✅ Connexion réussie avec synchronisation');
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la connexion:', error);
      return { success: false, error: 'Une erreur est survenue lors de la connexion' };
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Déconnexion...');
      
      setUser(null);
      localStorage.removeItem('currentUser');
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
    }
  };

  const register = async (userData: Partial<User>): Promise<boolean> => {
    try {
      console.log('📝 Inscription utilisateur avec sync:', userData.email);
      
      const result = await databaseService.createUser(userData);
      
      if (result.success) {
        console.log('✅ Inscription réussie et synchronisée automatiquement');
        
        // Créer une notification pour les administrateurs
        const allUsers = await databaseService.getAllUsers();
        const admins = allUsers.filter(u => u.role === 'ADMINISTRATEUR');
        
        for (const admin of admins) {
          await databaseService.createNotification(
            admin.id,
            'SYSTEM',
            'Nouvelle inscription',
            `Un nouvel utilisateur s'est inscrit: ${userData.email} (${userData.role})`,
            { userId: result.user?.id, userRole: userData.role }
          );
        }
        
        return true;
      } else {
        console.error('❌ Erreur inscription:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'inscription:', error);
      return false;
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    
    try {
      console.log('🔄 Mise à jour utilisateur avec sync:', user.email);
      
      const result = await databaseService.updateUser(user.id, userData);
      
      if (result.success && result.user) {
        setUser(result.user);
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        console.log('✅ Mise à jour réussie et synchronisée');
      } else {
        console.error('❌ Erreur mise à jour:', result.error);
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour utilisateur:', error);
    }
  };

  const getDatabaseStats = () => {
    return databaseService.getStatistics();
  };

  const getSyncStatus = () => {
    return databaseService.getSyncStatus();
  };

  const forceSync = async () => {
    return await databaseService.forcSync();
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      register,
      updateUser,
      refreshUser,
      isLoading,
      getDatabaseStats,
      getSyncStatus,
      forceSync
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};