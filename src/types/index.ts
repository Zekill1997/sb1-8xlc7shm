export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: 'ENCADREUR' | 'PARENT_ELEVE' | 'ADMINISTRATEUR';
  createdAt: string;
  isConnected?: boolean;
  connectedTo?: string;
  firebaseUid?: string;
}

export interface Encadreur extends User {
  role: 'ENCADREUR';
  profilePhoto?: string;
  nom: string;
  prenoms: string;
  telephone: string;
  genre: 'Masculin' | 'Féminin';
  communeResidence: string;
  dernierDiplome: string;
  experienceProfessionnelle: boolean;
  classesEnseignement: string[];
  disciplines: string[];
  communeIntervention: string;
  motivation: string;
  profilEncadrant: {
    q1: 'a' | 'b' | 'c';
    q2: 'a' | 'b' | 'c';
    q3: 'a' | 'b' | 'c';
    q4: 'a' | 'b' | 'c';
    q5: 'a' | 'b' | 'c';
    q6: 'a' | 'b' | 'c';
  };
  assignedStudents: string[];
  maxStudents: number;
}

export interface ParentEleve extends User {
  role: 'PARENT_ELEVE';
  profilePhoto?: string;
  nomParent: string;
  prenomsParent: string;
  telephone: string;
  profession: string;
  communeResidence: string;
  packChoisi: string;
  nomApprenant: string;
  prenomsApprenant: string;
  ageApprenant: number;
  communeApprenant: string;
  classeApprenant: string;
  besoins: string[];
  profilApprentissage: {
    q1: 'a' | 'b' | 'c';
    q2: 'a' | 'b' | 'c';
    q3: 'a' | 'b' | 'c';
    q4: 'a' | 'b' | 'c';
    q5: 'a' | 'b' | 'c';
    q6: 'a' | 'b' | 'c';
    q7: 'a' | 'b' | 'c';
    q8: 'a' | 'b' | 'c';
    q9: 'a' | 'b' | 'c';
  };
  assignedEncadreur?: string;
}

export interface Administrateur extends User {
  role: 'ADMINISTRATEUR';
  nom: string;
  prenoms: string;
}

export interface MatchingResult {
  id: string;
  parentEleveId: string;
  encadreurId: string;
  compatibilityScore: number;
  criteria: {
    commune: boolean;
    classe: boolean;
    disciplines: boolean;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface Assignment {
  id: string;
  parentEleveId: string;
  encadreurId: string;
  compatibilityScore: number;
  criteria: {
    commune: boolean;
    classe: boolean;
    disciplines: boolean;
  };
  assignedBy: string;
  assignedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'MATCHING' | 'ASSIGNMENT' | 'SYSTEM' | 'MESSAGE';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export const COMMUNES_ABIDJAN = [
  'Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi', 
  'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon'
];

export const CLASSES_PRIMAIRE = [
  'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'
];

export const CLASSES_COLLEGE = [
  '6ème', '5ème', '4ème', '3ème'
];

export const CLASSES_LYCEE = [
  'Seconde A', 'Seconde C', 'Seconde D',
  'Première A', 'Première C', 'Première D',
  'Terminale A', 'Terminale C', 'Terminale D'
];

export const DISCIPLINES = [
  'Histoire et géographie', 'Sciences (physiques)', 'Sciences (vie et terre)',
  'Mathématiques', 'Français', 'Anglais', 'Espagnol', 'Allemand',
  'Philosophie', 'Dessins d\'art', 'Musique', 'Informatique'
];

export const PACKS_TARIFAIRES = [
  {
    id: 'eveil',
    nom: 'EVEIL',
    tarif: 25000,
    seances: 2,
    duree: '1h15',
    classes: 'CP1 en 3ème'
  },
  {
    id: 'passion',
    nom: 'PASSION',
    tarif: 30000,
    seances: 2,
    duree: '1h30',
    classes: '6ème en 3ème'
  },
  {
    id: 'victoire',
    nom: 'VICTOIRE',
    tarif: 40000,
    seances: 3,
    duree: '1h30',
    classes: '6ème en 3ème'
  },
  {
    id: 'salut',
    nom: 'SALUT',
    tarif: 45000,
    seances: 2,
    duree: '2h',
    classes: '6ème en Terminale'
  },
  {
    id: 'accomplissement',
    nom: 'ACCOMPLISSEMENT',
    tarif: 50000,
    seances: 2,
    duree: '2h30',
    classes: '6ème en Terminale'
  }
];