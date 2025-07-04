import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Shield, UserPlus } from 'lucide-react';
import Logo from './Logo';
import Layout from './Layout';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'ENCADREUR',
      title: 'ENCADREUR',
      description: 'Partagez vos connaissances et accompagnez les apprenants',
      icon: BookOpen,
      color: 'bg-gradient-to-br from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-700 hover:to-blue-800'
    },
    {
      id: 'PARENT_ELEVE',
      title: 'PARENT/ÉLÈVE',
      description: 'Trouvez l\'encadreur idéal pour votre enfant',
      icon: Users,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      hoverColor: 'hover:from-orange-600 hover:to-orange-700'
    },
    {
      id: 'ADMINISTRATEUR',
      title: 'ADMINISTRATEUR',
      description: 'Gérez la plateforme et les utilisateurs',
      icon: Shield,
      color: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      hoverColor: 'hover:from-yellow-600 hover:to-yellow-700'
    }
  ];

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo centré avec le nom de l'application */}
            <div className="mb-8">
              <Logo size="large" />
            </div>

            {/* Contact Info */}
            <div className="mb-12 text-sm text-gray-600 space-y-1">
              <p>📞 00225 01 60 15 50 58 | 00225 05 45 94 97 67 | 00225 07 47 26 25 77</p>
              <p>✉️ superapprenant25@gmail.com</p>
            </div>

            {/* Bible Verse */}
            <div className="mb-12 bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-blue-100">
              <blockquote className="text-lg md:text-xl lg:text-2xl font-medium text-gray-800 italic leading-relaxed">
                "Instruis l'enfant selon la voie qu'il doit suivre, et quand il sera vieux, il ne s'en détournera pas"
              </blockquote>
              <cite className="block mt-4 text-sm md:text-base font-semibold text-blue-600">
                — Proverbes 22:6
              </cite>
            </div>

            {/* Role Selection */}
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8">
                Choisissez votre rôle
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {roles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.id}
                      onClick={() => navigate(`/login/${role.id}`)}
                      className={`${role.color} ${role.hoverColor} text-white p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl group`}
                    >
                      <div className="flex flex-col items-center space-y-4">
                        <div className="p-3 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                          <Icon className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-2">
                            {role.title}
                          </h3>
                          <p className="text-white/90 text-sm leading-relaxed">
                            {role.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Register Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/register')}
                className="bg-white text-gray-800 px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 flex items-center space-x-2 border border-gray-200"
              >
                <UserPlus className="w-5 h-5" />
                <span>S'inscrire</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-600 text-sm">
              © 2025 SUPER@PPRENANT-CI. Tous droits réservés.
            </p>
          </div>
        </footer>
      </div>
    </Layout>
  );
};

export default HomePage;