import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
    apiKey: "AIzaSyBt5V5cTPkT54LmXB9__0Tm1NjfftIKQS8",
    authDomain: "smarttaxi-2b1ec.firebaseapp.com",
    projectId: "smarttaxi-2b1ec",
    storageBucket: "smarttaxi-2b1ec.firebasestorage.app",
    messagingSenderId: "158247884932",
    appId: "1:158247884932:web:78f3839e26814cb7690ad1",
    measurementId: "G-8QGQX9XYLF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
