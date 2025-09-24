// alh-firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDDQKyBnjtay0AB-XliyT0zOZgEqiG9IdY",
  authDomain: "alh-perfume.firebaseapp.com",
  projectId: "alh-perfume",
  storageBucket: "alh-perfume.firebasestorage.app",
  messagingSenderId: "311171449596",
  appId: "1:311171449596:web:79fe9c849edd41d1c48d79",
  measurementId: "G-0VCNB0FGGD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Google Sign-In function
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

// Helper exports
export {
  createUserWithEmailAndPassword as register,
  signInWithEmailAndPassword    as login,
  signOut                      as logout,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
};

// Firestore exports
export {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc
};