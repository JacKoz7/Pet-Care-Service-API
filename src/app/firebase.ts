// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDB2dNBvwZgpgaw0wiwL1J5Z1wfAjFlaJI",
  authDomain: "petcareservice-a7c1d.firebaseapp.com",
  projectId: "petcareservice-a7c1d",
  storageBucket: "petcareservice-a7c1d.firebasestorage.app",
  messagingSenderId: "822672338634",
  appId: "1:822672338634:web:b8432ab6f3ddfcdbc08e33",
  measurementId: "G-3MT3Z9P0JZ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
