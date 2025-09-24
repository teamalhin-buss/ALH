// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDQKyBnjtay0AB-XliyT0zOZgEqiG9IdY",
  authDomain: "alh-perfume.firebaseapp.com",
  databaseURL: "https://alh-perfume-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "alh-perfume",
  storageBucket: "alh-perfume.firebasestorage.app",
  messagingSenderId: "311171449596",
  appId: "1:311171449596:web:79fe9c849edd41d1c48d79",
  measurementId: "G-0VCNB0FGGD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Analytics (optional)
let analytics;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.log('Analytics not available');
}

// Export for use in other files
export { db, app, analytics };
