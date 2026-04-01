import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBPUM3FfgwyQ3oNKmkeSbOZFpQtbwDffA0",
  authDomain: "html-to-cms.firebaseapp.com",
  projectId: "html-to-cms",
  storageBucket: "html-to-cms.firebasestorage.app",
  messagingSenderId: "1003199393073",
  appId: "1:1003199393073:web:253e4ecdf1226eae405410",
  measurementId: "G-VZEJPKZJF7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
