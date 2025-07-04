import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-20 h-20',
    large: 'w-32 h-32'
  };

  const textSizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-3xl'
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className={`${sizeClasses[size]} relative`}>
        {/* Cercle avec ombre et bordure */}
        <div className={`${sizeClasses[size]} rounded-full bg-white shadow-lg border-4 border-blue-200 overflow-hidden flex items-center justify-center`}>
          <img 
            src="/WhatsApp Image 2025-06-14 at 9.27.25 PM (1).jpeg" 
            alt="SUPER@PPRENANT-CI Logo"
            className={`${sizeClasses[size]} object-cover rounded-full`}
          />
        </div>
      </div>
      {showText && (
        <div className="text-center">
          <h1 className={`${textSizeClasses[size]} font-bold text-blue-600`}>
            SUPER@PPRENANT-CI
          </h1>
          {size !== 'small' && (
            <p className="text-sm text-gray-600 italic mt-1">
              Connecter l'excellence éducative
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;