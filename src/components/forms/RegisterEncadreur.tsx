import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  COMMUNES_ABIDJAN, 
  CLASSES_PRIMAIRE, 
  CLASSES_COLLEGE, 
  CLASSES_LYCEE, 
  DISCIPLINES,
  Encadreur 
} from '../../types';
import { Upload, Eye, EyeOff, CheckCircle } from 'lucide-react';

const RegisterEncadreur: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    // Connexion
    email: '',
    password: '',
    
    // Informations personnelles
    profilePhoto: '',
    nom: '',
    prenoms: '',
    telephone: '',
    genre: '',
    communeResidence: '',
    dernierDiplome: '',
    experienceProfessionnelle: false,
    
    // Enseignement
    classesEnseignement: [] as string[],
    disciplines: [] as string[],
    communeIntervention: '',
    motivation: '',
    
    // Questionnaire
    profilEncadrant: {
      q1: '',
      q2: '',
      q3: '',
      q4: '',
      q5: '',
      q6: ''
    }
  });

  const allClasses = [...CLASSES_PRIMAIRE, ...CLASSES_COLLEGE, ...CLASSES_LYCEE];

  const questions = [
    {
      id: 'q1',
      question: 'Quand vous devez expliquer un concept à un élève, vous préférez :',
      options: [
        { value: 'a', text: 'Montrer un graphique ou une image' },
        { value: 'b', text: 'Donner une explication orale détaillée' },
        { value: 'c', text: 'Faire une démonstration pratique' }
      ]
    },
    {
      id: 'q2',
      question: 'En situation d\'enseignement, vous trouvez plus facile :',
      options: [
        { value: 'a', text: 'De préparer des supports visuels (diapositives, schémas)' },
        { value: 'b', text: 'De discuter et d\'interagir verbalement avec l\'élève' },
        { value: 'c', text: 'D\'organiser des activités pratiques ou des jeux de rôle' }
      ]
    },
    {
      id: 'q3',
      question: 'Quand un élève ne comprend pas un concept, vous :',
      options: [
        { value: 'a', text: 'Utilisez un schéma, un diagramme ou un visuel' },
        { value: 'b', text: 'Reformulez l\'explication ou laissez l\'élève poser des questions' },
        { value: 'c', text: 'Proposez une activité interactive ou une mise en situation concrète' }
      ]
    },
    {
      id: 'q4',
      question: 'Vous préférez travailler avec des élèves qui :',
      options: [
        { value: 'a', text: 'Regardent attentivement les supports visuels ou les démonstrations' },
        { value: 'b', text: 'Participent activement à des discussions ou des échanges' },
        { value: 'c', text: 'S\'impliquent directement dans des activités pratiques ou des expériences' }
      ]
    },
    {
      id: 'q5',
      question: 'Lors de vos sessions d\'enseignement, vous :',
      options: [
        { value: 'a', text: 'Aimez organiser les informations sous forme de graphiques et de supports visuels' },
        { value: 'b', text: 'Préférez engager l\'élève dans une discussion orale ou des échanges' },
        { value: 'c', text: 'Privilégiez les activités physiques ou pratiques pour ancrer le savoir' }
      ]
    },
    {
      id: 'q6',
      question: 'Lorsque vous présentez un nouveau sujet, vous :',
      options: [
        { value: 'a', text: 'Utilisez des visuels et des supports graphiques pour faciliter la compréhension' },
        { value: 'b', text: 'Expliquez verbalement et encouragez la discussion' },
        { value: 'c', text: 'Proposez des exercices pratiques ou des simulations' }
      ]
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name === 'telephone') {
      // Validation stricte pour le téléphone - seulement des chiffres
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          profilePhoto: event.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClassSelection = (classe: string) => {
    const isSelected = formData.classesEnseignement.includes(classe);
    let newClasses: string[];

    if (isSelected) {
      newClasses = formData.classesEnseignement.filter(c => c !== classe);
    } else {
      // Vérifier la cohérence des niveaux
      const isPrimaire = CLASSES_PRIMAIRE.includes(classe);
      const isCollege = CLASSES_COLLEGE.includes(classe);
      const isLycee = CLASSES_LYCEE.includes(classe);

      if (formData.classesEnseignement.length === 0) {
        newClasses = [classe];
      } else {
        const currentPrimaire = formData.classesEnseignement.some(c => CLASSES_PRIMAIRE.includes(c));
        const currentCollege = formData.classesEnseignement.some(c => CLASSES_COLLEGE.includes(c));
        const currentLycee = formData.classesEnseignement.some(c => CLASSES_LYCEE.includes(c));

        if ((isPrimaire && (currentCollege || currentLycee)) ||
            (isCollege && (currentPrimaire || currentLycee)) ||
            (isLycee && (currentPrimaire || currentCollege))) {
          setError('Vous ne pouvez sélectionner que des classes du même niveau (primaire, collège ou lycée)');
          return;
        }
        
        newClasses = [...formData.classesEnseignement, classe];
      }
    }

    setFormData(prev => ({
      ...prev,
      classesEnseignement: newClasses
    }));
    setError('');
  };

  const handleDisciplineSelection = (discipline: string) => {
    const isSelected = formData.disciplines.includes(discipline);
    let newDisciplines: string[];

    if (isSelected) {
      newDisciplines = formData.disciplines.filter(d => d !== discipline);
    } else {
      if (formData.disciplines.length >= 2) {
        setError('Vous ne pouvez sélectionner que 2 disciplines maximum');
        return;
      }
      newDisciplines = [...formData.disciplines, discipline];
    }

    setFormData(prev => ({
      ...prev,
      disciplines: newDisciplines
    }));
    setError('');
  };

  const handleQuestionnaireChange = (questionId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      profilEncadrant: {
        ...prev.profilEncadrant,
        [questionId]: value
      }
    }));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Vérifier que le téléphone contient seulement des chiffres et a une longueur appropriée
    return /^\d{8,15}$/.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validations
    if (!validateEmail(formData.email)) {
      setError('Veuillez entrer une adresse email valide');
      setIsLoading(false);
      return;
    }

    if (!validatePhone(formData.telephone)) {
      setError('Le numéro de téléphone doit contenir uniquement des chiffres (8 à 15 chiffres)');
      setIsLoading(false);
      return;
    }

    try {
      const encadreurData: Partial<Encadreur> = {
        ...formData,
        role: 'ENCADREUR',
        assignedStudents: [],
        maxStudents: 4,
        profilEncadrant: formData.profilEncadrant as any
      };

      const success = await register(encadreurData);
      
      if (success) {
        navigate('/registration-success', { 
          state: { 
            role: 'ENCADREUR',
            message: 'Votre inscription a été soumise avec succès ! Nous étudions votre profil et vous serez contacté dès qu\'un parent/élève correspondant à vos critères sera trouvé.'
          }
        });
      } else {
        setError('Cette adresse email existe déjà. Veuillez en choisir une autre.');
      }
    } catch (error) {
      setError('Une erreur est survenue lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceedToStep2 = formData.email && validateEmail(formData.email) && formData.password && 
                           formData.nom && formData.prenoms && formData.telephone && validatePhone(formData.telephone) &&
                           formData.genre && formData.communeResidence &&
                           formData.dernierDiplome;

  const canProceedToStep3 = formData.classesEnseignement.length > 0 && 
                           formData.communeIntervention && formData.motivation;

  const needsDisciplines = formData.classesEnseignement.some(classe => 
    CLASSES_COLLEGE.includes(classe) || CLASSES_LYCEE.includes(classe)
  );

  const canProceedToStep4 = !needsDisciplines || formData.disciplines.length > 0;

  const isQuestionnaireComplete = Object.values(formData.profilEncadrant).every(answer => answer !== '');

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((stepNum) => (
            <div
              key={stepNum}
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                step >= stepNum
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step > stepNum ? <CheckCircle className="w-5 h-5" /> : stepNum}
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Inscription Encadreur - Étape {step}/4
        </h2>
        <p className="text-gray-600 mt-2">
          {step === 1 && 'Informations de connexion et personnelles'}
          {step === 2 && 'Informations d\'enseignement'}
          {step === 3 && 'Disciplines et motivation'}
          {step === 4 && 'Profil d\'encadrant'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Informations de base */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Informations de connexion */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-4">Informations de connexion</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="votre@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Photo de profil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo de profil (optionnelle)
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {formData.profilePhoto ? (
                    <img src={formData.profilePhoto} alt="Profil" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <Upload className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Joindre une photo (JPG, PNG)</p>
                </div>
              </div>
            </div>

            {/* Informations personnelles */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  name="nom"
                  required
                  value={formData.nom}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénoms *
                </label>
                <input
                  type="text"
                  name="prenoms"
                  required
                  value={formData.prenoms}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone * (chiffres uniquement)
                </label>
                <input
                  type="tel"
                  name="telephone"
                  required
                  value={formData.telephone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 0123456789"
                />
                <p className="text-xs text-gray-500 mt-1">Saisissez uniquement des chiffres</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Genre *
                </label>
                <select
                  name="genre"
                  required
                  value={formData.genre}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  <option value="Masculin">Masculin</option>
                  <option value="Féminin">Féminin</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commune de résidence *
                </label>
                <select
                  name="communeResidence"
                  required
                  value={formData.communeResidence}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  {COMMUNES_ABIDJAN.map(commune => (
                    <option key={commune} value={commune}>{commune}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dernier diplôme *
                </label>
                <input
                  type="text"
                  name="dernierDiplome"
                  required
                  value={formData.dernierDiplome}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="experienceProfessionnelle"
                name="experienceProfessionnelle"
                checked={formData.experienceProfessionnelle}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="experienceProfessionnelle" className="text-sm font-medium text-gray-700">
                J'ai une expérience professionnelle
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Classes et Commune */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Classes à enseigner * (Sélectionner des classes du même niveau)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allClasses.map(classe => (
                  <label
                    key={classe}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.classesEnseignement.includes(classe)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.classesEnseignement.includes(classe)}
                      onChange={() => handleClassSelection(classe)}
                      className="sr-only"
                    />
                    <span className="text-sm">{classe}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commune d'intervention *
              </label>
              <select
                name="communeIntervention"
                required
                value={formData.communeIntervention}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner</option>
                {COMMUNES_ABIDJAN.map(commune => (
                  <option key={commune} value={commune}>{commune}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivation à rejoindre l'équipe *
              </label>
              <textarea
                name="motivation"
                required
                rows={4}
                value={formData.motivation}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Expliquez votre motivation..."
              />
            </div>
          </div>
        )}

        {/* Step 3: Disciplines */}
        {step === 3 && (
          <div className="space-y-6">
            {needsDisciplines && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Dans quelle discipline vous sentez-vous le mieux ? * (Maximum 2 choix)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {DISCIPLINES.map(discipline => (
                    <label
                      key={discipline}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.disciplines.includes(discipline)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.disciplines.includes(discipline)}
                        onChange={() => handleDisciplineSelection(discipline)}
                        className="sr-only"
                      />
                      <span className="text-sm">{discipline}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Disciplines sélectionnées: {formData.disciplines.length}/2
                </p>
              </div>
            )}

            {!needsDisciplines && (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  Les disciplines ne sont pas requises pour l'enseignement au primaire.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Questionnaire */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">Le Profil d'Encadrant</h3>
              <p className="text-sm text-yellow-700">
                Fondez vos réponses sur les réussites que vous avez eues en matière de soutien scolaire
              </p>
            </div>

            {questions.map((question, index) => (
              <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">
                  {index + 1}. {question.question}
                </h4>
                <div className="space-y-2">
                  {question.options.map(option => (
                    <label
                      key={option.value}
                      className="flex items-start space-x-3 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={formData.profilEncadrant[question.id as keyof typeof formData.profilEncadrant] === option.value}
                        onChange={(e) => handleQuestionnaireChange(question.id, e.target.value)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200 mt-8">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Précédent
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={
                (step === 1 && !canProceedToStep2) ||
                (step === 2 && !canProceedToStep3) ||
                (step === 3 && !canProceedToStep4)
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Suivant
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || !isQuestionnaireComplete}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Inscription...' : 'Finaliser l\'inscription'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default RegisterEncadreur;