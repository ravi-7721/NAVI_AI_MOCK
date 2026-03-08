import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyDkVYv8qOo82E3ca5gJShb2O_aRK6DzvMU",
  authDomain: "aimockinterview-75171.firebaseapp.com",
  projectId: "aimockinterview-75171",
  storageBucket: "aimockinterview-75171.firebasestorage.app",
  messagingSenderId: "1021798319500",
  appId: "1:1021798319500:web:7bb341676e36184f1142a9",
  measurementId: "G-LG1S9V0EL4",
};

// Initialize Firebase
// make sure to call getApps() – the previous code checked the function reference rather than its result
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
