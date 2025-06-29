// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD7OkQ5pAfYCSxIeJsTehmb6V7rxF93nZg",
  authDomain: "fitly-mvp.firebaseapp.com",
  projectId: "fitly-mvp",
  storageBucket: "fitly-mvp.appspot.com",
  messagingSenderId: "238708572310",
  appId: "1:238708572310:web:34a2e2a6067a6f47f282b7",
  measurementId: "G-KMRGVLKVSY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
