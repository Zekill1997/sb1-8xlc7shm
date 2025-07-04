import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, BookOpen, UserPlus } from 'lucide-react';
import Layout from './Layout';
import Logo from './Logo';
import RegisterEncadreur from './forms/RegisterEncadreur';
import RegisterParentEleve from './forms/RegisterParentEleve';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const roles = [
    {
      id: 'ENCADREUR',
      title: 'ENCADREUR',
      description: 'Rejoignez notre équipe d\'enseignants qualifiés',
      icon: BookOpen,
      color: 'bg-gradient-to-br from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-700 hover:to-blue-800'
    },
    {
      id: 'PARENT_ELEVE',
      title: 'PARENT/ÉLÈVE',
      description: 'Inscrivez votre enfant pour un accompagnement personnalisé',
      icon: Users,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      hoverColor: 'hover:from-orange-600 hover:to-orange-700'
    }
  ];

  if (selectedRole) {
    return (
      <Layout showHeader={false}>
        <div className="min-h-screen py-8">
          <div className="max-w-4xl mx-auto px-4">
            <button
              onClick={() => setSelectedRole(null)}
              className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au choix du rôle
            </button>
            
            {selectedRole === 'ENCADREUR' && <RegisterEncadreur />}
            {selectedRole === 'PARENT_ELEVE' && <RegisterParentEleve />}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl mx-auto">
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

          {/* Role Selection */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Créer un compte
              </h2>
              <p className="text-gray-600">
                Choisissez votre rôle pour commencer l'inscription
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
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
                      <div className="flex items-center space-x-2 opacity-75">
                        <UserPlus className="w-4 h-4" />
                        <span className="text-sm">S'inscrire</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Vous avez déjà un compte ?{' '}
                <button
                  onClick={() => navigate('/')}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RegisterPage;