  // firebaseConfig.js
  import { initializeApp } from "firebase/app";
  import { getFirestore } from "firebase/firestore";
  import { getStorage } from "firebase/storage";
  import { getAuth } from "firebase/auth";

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
  const db = getFirestore(app);
  const storage = getStorage(app);
  const auth = getAuth(app);

  export { db, storage, auth };
  