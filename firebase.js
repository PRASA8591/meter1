import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCKECoalfADMZHMo6ccZzZ-w6DCUMusjsY",
  authDomain: "meter-details-730a9.firebaseapp.com",
  projectId: "meter-details-730a9",
  storageBucket: "meter-details-730a9.firebasestorage.app",
  messagingSenderId: "388802965013",
  appId: "1:388802965013:web:fd11c361f0cbfb807ca81c",
  measurementId: "G-6DP59Z3HC1"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db, analytics };
