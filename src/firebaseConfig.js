import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCR8vTPzyfCveKLVnv4bYA_rGo_G7Du1mM",
  authDomain: "test-gemini-2429e.firebaseapp.com",
  projectId: "test-gemini-2429e",
  storageBucket: "test-gemini-2429e.firebasestorage.app",
  messagingSenderId: "986136828585",
  appId: "1:986136828585:web:6397acf38061d82011a7b8",
  measurementId: "G-GPWRXE3FM0"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);