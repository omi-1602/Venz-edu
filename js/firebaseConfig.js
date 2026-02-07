// Firebase configuration and initialization (Compat SDK)
// Ensure Firebase SDK scripts are included in HTML before this file.

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAhsW4GHfoYuqQw1ad-7ZMGB4GWGJmA37s",
  authDomain: "venz-edu-app.firebaseapp.com",
  projectId: "venz-edu-app",
  storageBucket: "venz-edu-app.firebasestorage.app",
  messagingSenderId: "636157043706",
  appId: "1:636157043706:web:5ed01cf9108c2ebd253a43",
};

// Initialize Firebase (Compat builds expose global `firebase` object)
firebase.initializeApp(firebaseConfig);

// Expose commonly used services
window.auth = firebase.auth();
window.db = firebase.firestore();
window.functions = firebase.functions();

// Auto-connect to local emulators when running on localhost
if (typeof window !== 'undefined' && location.hostname === 'localhost') {
  try {
    // Firestore emulator
    window.db.useEmulator('localhost', 8081);
    // If you later need functions/auth locally, uncomment below:
    // window.functions.useEmulator('localhost', 5001);
    // window.auth.useEmulator('http://localhost:9099');
    console.log('Connected to Firestore emulator at localhost:8081');
  } catch (e) {
    console.warn('Emulator connection failed:', e);
  }
}
