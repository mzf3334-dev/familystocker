import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCwcjLx1DuBU0gb2xRItfv0_xe7J9uRxqg",
  authDomain: "familystockchecker.firebaseapp.com",
  projectId: "familystockchecker",
  storageBucket: "familystockchecker.firebasestorage.app",
  messagingSenderId: "687288608084",
  appId: "1:687288608084:web:f71047934368771ff254c1",
  measurementId: "G-N0V1TZGDBT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
