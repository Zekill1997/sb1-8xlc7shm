// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCDkenBsqtMa6j11hniK4qOY1Hi0AYGIVY",
  authDomain: "apprenant-e3404.firebaseapp.com",
  projectId: "apprenant-e3404",
  storageBucket: "apprenant-e3404.firebasestorage.app",
  messagingSenderId: "334321929916",
  appId: "1:334321929916:web:74e4b35faacf1cfcd6cab9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;