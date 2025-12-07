// firebase-config.js
// Replace with your actual Firebase configuration

const firebaseConfig = {
  apiKey: "AIzaSyBQiYYKxQ6WxWrLjniEmUHVNiN72gpBbI8",
  authDomain: "skill-swap-1-1353a.firebaseapp.com",
  databaseURL: "https://skill-swap-1-1353a-default-rtdb.firebaseio.com",
  projectId: "skill-swap-1-1353a",
  storageBucket: "skill-swap-1-1353a.firebasestorage.app",
  messagingSenderId: "800679860696",
  appId: "1:800679860696:web:bb303753454ddbec90faad",
  measurementId: "G-XDNERSSWN4"
};

// Initialize Firebase
// Note: We are assuming the Firebase SDKs are imported in the HTML file before this script runs,
// or we are using ES modules. Given the request usually implies a simple setup, 
// strictly using ES modules with CDN links is the best modern approach without a bundler.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app); // Realtime Database
const firestore = getFirestore(app); // Firestore

export { app, auth, db, firestore };
export default app;
