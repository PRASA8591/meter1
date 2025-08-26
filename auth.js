// auth.js
import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const btnLogin = document.getElementById("btnLogin");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorBox = document.getElementById("loginError");

// ---------------- LOGIN ----------------
btnLogin.addEventListener("click", async () => {
  errorBox.textContent = ""; // clear old errors
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    errorBox.textContent = "⚠ Please enter username and password.";
    return;
  }

  try {
    // find matching user in Firestore
    const q = query(
      collection(db, "users"),
      where("username", "==", username),
      where("password", "==", password)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      errorBox.textContent = "❌ Invalid username or password.";
      return;
    }

    // we found a user
    const userDoc = snap.docs[0].data();

    // store session
    localStorage.setItem("username", userDoc.username);
    localStorage.setItem("userRole", userDoc.role);

    // redirect to dashboard
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error("Login error:", err);
    errorBox.textContent = "⚠ Login failed. Please try again.";
  }
});
