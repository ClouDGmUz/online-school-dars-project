// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCEqLvQhBC8XvEgPDa2n0t_yA2yJu-kRow",
  authDomain: "dars-51183.firebaseapp.com",
  projectId: "dars-51183",
  storageBucket: "dars-51183.firebasestorage.app",
  messagingSenderId: "454711989932",
  appId: "1:454711989932:web:2897f89cc4364c890cb109",
  measurementId: "G-P64WY0ZWQE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { auth, db };