import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Temporary hardcoded config for debugging
const firebaseConfig = {
  apiKey: "AIzaSyD2T8lzdL0NnISm5P0maF8KOiGkeIqRKfg",
  authDomain: "corkt-47808.firebaseapp.com",
  projectId: "corkt-47808",
  storageBucket: "corkt-47808.firebasestorage.app",
  messagingSenderId: "377879639553",
  appId: "1:377879639553:web:cdb70454f99ef5d1083200",
};

console.log("Firebase config loaded:", firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("Firebase initialized successfully");
