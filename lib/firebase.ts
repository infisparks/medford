// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCfyZ5k2RT_mkLR257MAoUMnnV24FnCFvE",
  authDomain: "medford-491d4.firebaseapp.com",
  projectId: "medford-491d4",
  storageBucket: "medford-491d4.firebasestorage.app",
  messagingSenderId: "595525614466",
  appId: "1:595525614466:web:8f7280695e4f8c822ded9b",
  measurementId: "G-Z7MX8Z8W7Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

export { auth, provider, signInWithPopup, signOut ,db };
