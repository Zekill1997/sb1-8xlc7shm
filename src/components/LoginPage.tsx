import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Lock, Mail, AlertCircle, Settings, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from './Layout';
import Logo from './Logo';

const LoginPage: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const roleLabels = {
    ENCADREUR: 'Encadreur',
    PARENT_ELEVE: 'Parent/Élève',
    ADMINISTRATEUR: 'Administrateur'
  };

  const roleColors = {
    ENCADREUR: 'from-blue-600 to-blue-700',
    PARENT_ELEVE: 'from-orange-500 to-orange-600',
    ADMINISTRATEUR: 'from-yellow-500 to-yellow-600'
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Veuillez entrer une adresse email valide');
      setIsLoading(false);
      return;
    }

    try {
      // Passer le rôle spécifique pour la validation stricte
      const result = await login(formData.email, formData.password, role);
      
      if (result.success) {
        // Rediriger selon le rôle
        switch (role) {
          case 'ENCADREUR':
            navigate('/dashboard/encadreur');
            break;
          case 'PARENT_ELEVE':
            navigate('/dashboard/parent-eleve');
            break;
          case 'ADMINISTRATEUR':
            navigate('/dashboard/administrateur');
            break;
          default:
            navigate('/');
        }
      } else {
        setError(result.error || `Email ou mot de passe incorrect pour le rôle ${roleLabels[role as keyof typeof roleLabels]}`);
      }
    } catch (error) {
      setError('Une erreur est survenue lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  if (!role || !roleLabels[role as keyof typeof roleLabels]) {
    navigate('/');
    return null;
  }

  const currentRole = role as keyof typeof roleLabels;

  // Vérifier si l'erreur est liée à la confirmation d'email
  const isEmailConfirmationError = error.includes('Configuration Supabase') || 
                                   error.includes('confirmation d\'email') || 
                                   error.includes('email_not_confirmed') ||
                                   error.includes('🔧');

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </button>

          {/* Logo */}
          <div className="text-center mb-8">
            <Logo size="large" />
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Connexion {roleLabels[currentRole]}
              </h2>
              <p className="text-gray-600 mt-2">
                Connectez-vous à votre espace personnel
              </p>
              <div className="mt-2 flex items-center justify-center text-sm text-blue-600">
                <Settings className="w-4 h-4 mr-1" />
                Plateforme Supabase
              </div>
            </div>

            {error && (
              <div className={`mb-4 p-4 rounded-lg text-sm ${
                isEmailConfirmationError 
                  ? 'bg-red-50 border border-red-200 text-red-800' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                <div className="flex items-start">
                  <AlertCircle className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${
                    isEmailConfirmationError ? 'text-red-600' : 'text-red-600'
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium mb-1">
                      {isEmailConfirmationError ? 'Configuration Supabase requise' : 'Erreur de connexion'}
                    </p>
                    <p className="mb-3">{error}</p>
                    {isEmailConfirmationError && (
                      <div className="mt-3 p-4 bg-red-100 rounded-lg border border-red-300">
                        <p className="font-semibold text-red-800 mb-3 flex items-center">
                          <Settings className="w-4 h-4 mr-2" />
                          Instructions pour résoudre le problème :
                        </p>
                        <div className="space-y-3">
                          <div className="bg-white p-3 rounded border border-red-200">
                            <p className="font-medium text-red-800 mb-2">Étapes à suivre :</p>
                            <ol className="text-sm text-red-700 space-y-2 list-decimal list-inside">
                              <li>Connectez-vous à votre <strong>projet Supabase</strong></li>
                              <li>Allez dans <strong>Authentication → Settings</strong></li>
                              <li>Trouvez l'option <strong>"Enable email confirmations"</strong></li>
                              <li><strong>Désactivez</strong> cette option (toggle OFF)</li>
                              <li>Cliquez sur <strong>"Save"</strong> pour sauvegarder</li>
                              <li>Réessayez de vous connecter</li>
                            </ol>
                          </div>
                          <div className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                            <span className="text-sm text-red-700">Besoin d'aide ?</span>
                            <a 
                              href="https://supabase.com/docs/guides/auth/auth-email#disable-email-confirmations"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              Documentation Supabase
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Votre mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-gradient-to-r ${roleColors[currentRole]} text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Vous n'avez pas de compte ?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  S'inscrire
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;