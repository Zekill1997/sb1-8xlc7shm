import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { db, storage, auth } from '../config/firebase';
import { User, Encadreur, ParentEleve, Administrateur } from '../types';

// Collections
const USERS_COLLECTION = 'users';
const MESSAGES_COLLECTION = 'messages';
const NOTIFICATIONS_COLLECTION = 'notifications';
const ASSIGNMENTS_COLLECTION = 'assignments';

// User Management
export const createUser = async (userData: Partial<User>): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, USERS_COLLECTION), {
      ...userData,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

export const updateUser = async (userId: string, userData: Partial<User>): Promise<boolean> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(docRef, userData);
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
};

// Authentication
export const registerWithEmailAndPassword = async (
  email: string, 
  password: string, 
  userData: Partial<User>
): Promise<{ success: boolean; userId?: string; error?: string }> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Create user document in Firestore
    const userId = await createUser({
      ...userData,
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || email
    });
    
    if (userId) {
      // Update Firebase Auth profile
      await updateProfile(firebaseUser, {
        displayName: userData.username
      });
      
      return { success: true, userId };
    } else {
      return { success: false, error: 'Failed to create user document' };
    }
  } catch (error: any) {
    console.error('Error registering user:', error);
    return { success: false, error: error.message };
  }
};

export const loginWithEmailAndPassword = async (
  email: string, 
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Get user data from Firestore
    const q = query(
      collection(db, USERS_COLLECTION), 
      where('firebaseUid', '==', firebaseUser.uid)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() } as User;
      return { success: true, user: userData };
    } else {
      return { success: false, error: 'User data not found' };
    }
  } catch (error: any) {
    console.error('Error logging in:', error);
    return { success: false, error: error.message };
  }
};

export const logoutUser = async (): Promise<boolean> => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error('Error logging out:', error);
    return false;
  }
};

// File Upload
export const uploadFile = async (
  file: File, 
  path: string
): Promise<string | null> => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};

export const deleteFile = async (path: string): Promise<boolean> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Messages
export const sendMessage = async (messageData: {
  from: string;
  to: string;
  subject: string;
  content: string;
}): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
      ...messageData,
      read: false,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};

export const getMessages = async (userId: string): Promise<any[]> => {
  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('to', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

export const markMessageAsRead = async (messageId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, MESSAGES_COLLECTION, messageId);
    await updateDoc(docRef, { read: true });
    return true;
  } catch (error) {
    console.error('Error marking message as read:', error);
    return false;
  }
};

// Notifications
export const createNotification = async (notificationData: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...notificationData,
      read: false,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

export const getNotifications = async (userId: string): Promise<any[]> => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

// Real-time listeners
export const subscribeToMessages = (
  userId: string, 
  callback: (messages: any[]) => void
) => {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('to', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  });
};

export const subscribeToNotifications = (
  userId: string, 
  callback: (notifications: any[]) => void
) => {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(notifications);
  });
};

// Assignments
export const createAssignment = async (assignmentData: {
  parentEleveId: string;
  encadreurId: string;
  compatibilityScore: number;
  criteria: any;
  assignedBy: string;
}): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, ASSIGNMENTS_COLLECTION), {
      ...assignmentData,
      assignedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating assignment:', error);
    return null;
  }
};

export const getAssignments = async (): Promise<any[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, ASSIGNMENTS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting assignments:', error);
    return [];
  }
};