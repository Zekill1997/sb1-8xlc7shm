import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Home, LogIn } from 'lucide-react';
import Layout from './Layout';
import Logo from './Logo';

const RegistrationSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { role, message } = location.state || { 
    role: 'ENCADREUR', 
    message: 'Votre inscription a été soumise avec succès !' 
  };

  const roleColors = {
    ENCADREUR: 'from-blue-600 to-blue-700',
    PARENT_ELEVE: 'from-orange-500 to-orange-600',
    ADMINISTRATEUR: 'from-yellow-500 to-yellow-600'
  };

  const roleLabels = {
    ENCADREUR: 'Encadreur',
    PARENT_ELEVE: 'Parent/Élève',
    ADMINISTRATEUR: 'Administrateur'
  };

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <Logo size="large" />
          </div>

          {/* Success Icon */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Inscription Réussie !
            </h1>
            <p className="text-lg text-gray-600">
              Félicitations ! Votre inscription en tant que {roleLabels[role as keyof typeof roleLabels]} a été complétée.
            </p>
          </div>

          {/* Message */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100">
            <p className="text-gray-700 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-gray-800 mb-4">Prochaines étapes :</h3>
            <div className="text-left space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                  1
                </div>
                <p className="text-gray-700">
                  Notre équipe examine votre profil pour identifier les meilleures correspondances
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                  2
                </div>
                <p className="text-gray-700">
                  Vous recevrez une notification dès qu'une correspondance sera trouvée
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                  3
                </div>
                <p className="text-gray-700">
                  Connectez-vous à votre espace pour suivre le statut de votre inscription
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Home className="w-5 h-5" />
              <span>Retour à l'accueil</span>
            </button>
            
            <button
              onClick={() => navigate(`/login/${role}`)}
              className={`flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r ${roleColors[role as keyof typeof roleColors]} text-white rounded-lg hover:shadow-lg transform transition-all duration-300 hover:scale-105`}
            >
              <LogIn className="w-5 h-5" />
              <span>Se connecter</span>
            </button>
          </div>

          {/* Contact Info */}
          <div className="mt-12 p-6 bg-white rounded-lg shadow-sm border border-gray-100">
            <h4 className="font-semibold text-gray-800 mb-3">Besoin d'aide ?</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>📞 00225 01 60 15 50 58 | 00225 05 45 94 97 67 | 00225 07 47 26 25 77</p>
              <p>✉️ superapprenant25@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RegistrationSuccess;