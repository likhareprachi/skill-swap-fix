import { auth, db } from '../firebase/firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, set, get, child, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// DOM Elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutBtn = document.getElementById('logout-btn');
const googleBtn = document.getElementById('google-login-btn');

// Google Sign In
if (googleBtn) {
    googleBtn.addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then((result) => {
                const user = result.user;

                // Check if user exists in DB, if not create
                const userRef = ref(db, 'users/' + user.uid);
                get(userRef).then((snapshot) => {
                    if (!snapshot.exists()) {
                        set(userRef, {
                            username: user.displayName,
                            email: user.email,
                            uid: user.uid,
                            profile_picture: user.photoURL || "default_profile.png"
                        });
                    }
                    window.location.href = 'dashboard.html';
                });
            }).catch((error) => {
                console.error(error);
                alert(error.message);
            });
    });
}

// Sign Up
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = signupForm['email'].value;
        const password = signupForm['password'].value;
        const name = signupForm['name'].value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Signed in 
                const user = userCredential.user;

                // Save user data to Realtime DB
                set(ref(db, 'users/' + user.uid), {
                    username: name,
                    email: email,
                    uid: user.uid,
                    profile_picture: "default_profile.png"
                }).then(() => {
                    alert('Qeydiyyat uğurludur! (Registration Successful!)');
                    window.location.href = 'dashboard.html';
                });
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                alert(errorMessage);
            });
    });
}

// Login
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm['email'].value;
        const password = loginForm['password'].value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Signed in
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                alert(errorMessage);
            });
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error(error);
        });
    });
}

// Global Notification Listener
function initNotifications(uid) {
    const notificationBadge = document.querySelector('.notification-badge');
    if (!notificationBadge) return;

    const myNotifs = ref(db, 'notifications/' + uid);
    onValue(myNotifs, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const count = Object.values(data).filter(n => !n.seen).length;
            notificationBadge.textContent = count > 0 ? count : '';
            notificationBadge.style.display = count > 0 ? 'block' : 'none';
        } else {
            notificationBadge.style.display = 'none';
        }
    });
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        const uid = user.uid;
        initNotifications(uid);

        // If we are on login page, redirect to dashboard
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'dashboard.html';
        }
    } else {
        // User is signed out
        // If we are on protected pages, redirect to login
        if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('chat.html')) {
            window.location.href = 'login.html';
        }
    }
});
