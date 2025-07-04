import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RegistrationSuccess from './components/RegistrationSuccess';

// Dashboard imports
const DashboardEncadreur = React.lazy(() => import('./components/dashboards/DashboardEncadreur'));
const DashboardParentEleve = React.lazy(() => import('./components/dashboards/DashboardParentEleve'));
const DashboardAdministrateur = React.lazy(() => import('./components/dashboards/DashboardAdministrateur'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

// Component pour gérer la redirection conditionnelle de la page d'accueil
const HomeOrDashboard: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Si l'utilisateur est connecté, rediriger vers son dashboard
  if (user) {
    const dashboardRoute = `/dashboard/${user.role.toLowerCase().replace('_', '-')}`;
    return <Navigate to={dashboardRoute} replace />;
  }

  // Sinon, afficher la page d'accueil
  return <HomePage />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Page d'accueil avec redirection conditionnelle */}
      <Route path="/" element={<HomeOrDashboard />} />
      
      {/* Pages publiques */}
      <Route path="/login/:role" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/registration-success" element={<RegistrationSuccess />} />
      
      {/* Protected Dashboard Routes */}
      <Route 
        path="/dashboard/encadreur" 
        element={
          <ProtectedRoute requiredRole="ENCADREUR">
            <React.Suspense fallback={<LoadingSpinner />}>
              <DashboardEncadreur />
            </React.Suspense>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard/parent-eleve" 
        element={
          <ProtectedRoute requiredRole="PARENT_ELEVE">
            <React.Suspense fallback={<LoadingSpinner />}>
              <DashboardParentEleve />
            </React.Suspense>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard/administrateur" 
        element={
          <ProtectedRoute requiredRole="ADMINISTRATEUR">
            <React.Suspense fallback={<LoadingSpinner />}>
              <DashboardAdministrateur />
            </React.Suspense>
          </ProtectedRoute>
        } 
      />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;