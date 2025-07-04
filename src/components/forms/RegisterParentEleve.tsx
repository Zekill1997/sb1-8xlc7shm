import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  COMMUNES_ABIDJAN, 
  CLASSES_PRIMAIRE, 
  CLASSES_COLLEGE, 
  CLASSES_LYCEE, 
  DISCIPLINES,
  PACKS_TARIFAIRES,
  ParentEleve 
} from '../../types';
import { Upload, Eye, EyeOff, CheckCircle } from 'lucide-react';

const RegisterParentEleve: React.FC = () => {
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
    
    // Informations parent
    profilePhoto: '',
    nomParent: '',
    prenomsParent: '',
    telephone: '',
    profession: '',
    communeResidence: '',
    packChoisi: '',
    
    // Informations apprenant
    nomApprenant: '',
    prenomsApprenant: '',
    ageApprenant: '',
    communeApprenant: '',
    classeApprenant: '',
    besoins: [] as string[],
    
    // Questionnaire
    profilApprentissage: {
      q1: '',
      q2: '',
      q3: '',
      q4: '',
      q5: '',
      q6: '',
      q7: '',
      q8: '',
      q9: ''
    }
  });

  const allClasses = [...CLASSES_PRIMAIRE, ...CLASSES_COLLEGE, ...CLASSES_LYCEE];

  const questions = [
    {
      id: 'q1',
      question: 'Quand vous devez apprendre quelque chose de nouveau, quelle méthode préférez-vous ?',
      options: [
        { value: 'a', text: 'Lire des notes, des livres ou des documents' },
        { value: 'b', text: 'Écouter un enregistrement ou une explication' },
        { value: 'c', text: 'Pratiquer des exercices, faire des expériences' }
      ]
    },
    {
      id: 'q2',
      question: 'Lorsque vous devez mémoriser un concept, quelle approche vous semble la plus utile ?',
      options: [
        { value: 'a', text: 'Regarder des schémas, des diagrammes ou des cartes mentales' },
        { value: 'b', text: 'Lire ou écouter des explications détaillées' },
        { value: 'c', text: 'Faire des expériences pratiques pour observer le concept en action' }
      ]
    },
    {
      id: 'q3',
      question: 'Lorsque vous révisez un sujet, vous préférez :',
      options: [
        { value: 'a', text: 'Utiliser des graphiques ou des vidéos pour revoir le contenu' },
        { value: 'b', text: 'Écouter des résumés ou des discussions' },
        { value: 'c', text: 'Refaire des exercices pratiques ou des jeux de rôle' }
      ]
    },
    {
      id: 'q4',
      question: 'Lors d\'une lecture, vous êtes plus attentif à :',
      options: [
        { value: 'a', text: 'Les mots et le sens de ce qui est écrit' },
        { value: 'b', text: 'Les sons, les prononciations et les rythmes du texte' },
        { value: 'c', text: 'Les gestes ou les actions liées à ce qui est écrit' }
      ]
    },
    {
      id: 'q5',
      question: 'Quand vous apprenez quelque chose de nouveau, vous préférez :',
      options: [
        { value: 'a', text: 'Regarder des vidéos ou lire des manuels' },
        { value: 'b', text: 'Écouter des podcasts, des conférences ou des explications verbales' },
        { value: 'c', text: 'Participer à des activités pratiques ou expérimenter avec des objets' }
      ]
    },
    {
      id: 'q6',
      question: 'Quel type de révision vous convient le mieux ?',
      options: [
        { value: 'a', text: 'Lire des résumés ou des notes' },
        { value: 'b', text: 'Écouter des enregistrements ou discuter du sujet avec quelqu\'un' },
        { value: 'c', text: 'Pratiquer des exercices ou résoudre des problèmes' }
      ]
    },
    {
      id: 'q7',
      question: 'Lorsque vous devez apprendre un concept, vous préférez :',
      options: [
        { value: 'a', text: 'Lire des documents ou regarder des vidéos' },
        { value: 'b', text: 'Écouter une explication verbale' },
        { value: 'c', text: 'Essayer de manipuler ou de faire quelque chose avec vos mains' }
      ]
    },
    {
      id: 'q8',
      question: 'Pendant les révisions, vous préférez :',
      options: [
        { value: 'a', text: 'Regarder des vidéos ou des graphiques (dessin)' },
        { value: 'b', text: 'Écouter des explications' },
        { value: 'c', text: 'Réaliser des projets pratiques ou des exercices physiques' }
      ]
    },
    {
      id: 'q9',
      question: 'Vous vous rappelez mieux des informations quand :',
      options: [
        { value: 'a', text: 'Vous les lisez plusieurs fois' },
        { value: 'b', text: 'Vous les entendez plusieurs fois' },
        { value: 'c', text: 'Vous les expérimentez ou les appliquez' }
      ]
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'telephone') {
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

  const handleBesoinSelection = (besoin: string) => {
    const isSelected = formData.besoins.includes(besoin);
    let newBesoins: string[];

    if (isSelected) {
      newBesoins = formData.besoins.filter(b => b !== besoin);
    } else {
      if (formData.besoins.length >= 2) {
        setError('Vous ne pouvez sélectionner que 2 besoins maximum');
        return;
      }
      newBesoins = [...formData.besoins, besoin];
    }

    setFormData(prev => ({
      ...prev,
      besoins: newBesoins
    }));
    setError('');
  };

  const handleQuestionnaireChange = (questionId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      profilApprentissage: {
        ...prev.profilApprentissage,
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
      const parentEleveData: Partial<ParentEleve> = {
        ...formData,
        role: 'PARENT_ELEVE',
        ageApprenant: parseInt(formData.ageApprenant),
        profilApprentissage: formData.profilApprentissage as any
      };

      const success = await register(parentEleveData);
      
      if (success) {
        navigate('/registration-success', { 
          state: { 
            role: 'PARENT_ELEVE',
            message: 'Votre inscription a été soumise avec succès ! Nous étudions votre profil et vous serez contacté dès qu\'un encadreur correspondant à vos besoins sera trouvé.'
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

  // Validation pour l'étape 1
  const canProceedToStep2 = formData.email.trim() !== '' && validateEmail(formData.email) &&
                           formData.password.trim() !== '' && 
                           formData.nomParent.trim() !== '' && 
                           formData.prenomsParent.trim() !== '' && 
                           formData.telephone.trim() !== '' && validatePhone(formData.telephone) &&
                           formData.profession.trim() !== '' && 
                           formData.communeResidence !== '';

  // Validation pour l'étape 2
  const canProceedToStep3 = formData.packChoisi !== '';

  // Validation pour l'étape 3
  const canProceedToStep4 = formData.nomApprenant.trim() !== '' && 
                           formData.prenomsApprenant.trim() !== '' && 
                           formData.ageApprenant.trim() !== '' && 
                           formData.communeApprenant !== '' && 
                           formData.classeApprenant !== '';

  const needsBesoins = formData.classeApprenant && 
                      (CLASSES_COLLEGE.includes(formData.classeApprenant) || 
                       CLASSES_LYCEE.includes(formData.classeApprenant));

  const canProceedToStep4Final = canProceedToStep4 && (!needsBesoins || formData.besoins.length > 0);

  const isQuestionnaireComplete = Object.values(formData.profilApprentissage).every(answer => answer !== '');

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
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step > stepNum ? <CheckCircle className="w-5 h-5" /> : stepNum}
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-orange-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Inscription Parent/Élève - Étape {step}/4
        </h2>
        <p className="text-gray-600 mt-2">
          {step === 1 && 'Informations de connexion et du parent'}
          {step === 2 && 'Tarification et pack choisi'}
          {step === 3 && 'Informations de l\'apprenant'}
          {step === 4 && 'Profil d\'apprentissage'}
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
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-4">Informations de connexion</h3>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Joindre une photo (JPG, PNG)</p>
                </div>
              </div>
            </div>

            {/* Informations du parent */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du parent *
                </label>
                <input
                  type="text"
                  name="nomParent"
                  required
                  value={formData.nomParent}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénoms du parent *
                </label>
                <input
                  type="text"
                  name="prenomsParent"
                  required
                  value={formData.prenomsParent}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: 0123456789"
                />
                <p className="text-xs text-gray-500 mt-1">Saisissez uniquement des chiffres</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profession *
                </label>
                <input
                  type="text"
                  name="profession"
                  required
                  value={formData.profession}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commune de résidence *
              </label>
              <select
                name="communeResidence"
                required
                value={formData.communeResidence}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Sélectionner</option>
                {COMMUNES_ABIDJAN.map(commune => (
                  <option key={commune} value={commune}>{commune}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Pack tarifaire */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Pack tarifaire * (Combien pouvez-vous payer mensuellement ?)
              </label>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PACKS_TARIFAIRES.map(pack => (
                  <label
                    key={pack.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.packChoisi === pack.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-300 hover:border-orange-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="packChoisi"
                      value={pack.id}
                      checked={formData.packChoisi === pack.id}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <h4 className="font-bold text-lg text-orange-600 mb-2">
                        {pack.nom}
                      </h4>
                      <p className="text-2xl font-bold text-gray-800 mb-2">
                        {pack.tarif.toLocaleString()} F
                      </p>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>{pack.seances} séances/semaine</p>
                        <p>{pack.duree} par séance</p>
                        <p className="font-medium">{pack.classes}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Informations apprenant */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Informations de l'apprenant</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'apprenant *
                </label>
                <input
                  type="text"
                  name="nomApprenant"
                  required
                  value={formData.nomApprenant}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénoms de l'apprenant *
                </label>
                <input
                  type="text"
                  name="prenomsApprenant"
                  required
                  value={formData.prenomsApprenant}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Âge de l'apprenant *
                </label>
                <input
                  type="number"
                  name="ageApprenant"
                  required
                  min="5"
                  max="25"
                  value={formData.ageApprenant}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commune de résidence de l'apprenant *
                </label>
                <select
                  name="communeApprenant"
                  required
                  value={formData.communeApprenant}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  {COMMUNES_ABIDJAN.map(commune => (
                    <option key={commune} value={commune}>{commune}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Classe de l'apprenant *
              </label>
              <select
                name="classeApprenant"
                required
                value={formData.classeApprenant}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Sélectionner</option>
                {allClasses.map(classe => (
                  <option key={classe} value={classe}>{classe}</option>
                ))}
              </select>
            </div>

            {needsBesoins && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Quels sont vos besoins ? * (Maximum 2 choix)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {DISCIPLINES.map(discipline => (
                    <label
                      key={discipline}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.besoins.includes(discipline)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-300 hover:border-orange-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.besoins.includes(discipline)}
                        onChange={() => handleBesoinSelection(discipline)}
                        className="sr-only"
                      />
                      <span className="text-sm">{discipline}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Besoins sélectionnés: {formData.besoins.length}/2
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Questionnaire */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Profil d'Apprentissage</h3>
              <p className="text-sm text-blue-700">
                L'apprenant doit répondre en se basant sur ses réussites
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
                        checked={formData.profilApprentissage[question.id as keyof typeof formData.profilApprentissage] === option.value}
                        onChange={(e) => handleQuestionnaireChange(question.id, e.target.value)}
                        className="mt-1 text-orange-600 focus:ring-orange-500"
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
                (step === 3 && !canProceedToStep4Final)
              }
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

export default RegisterParentEleve;