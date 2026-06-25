// auth.js
import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const rememberMeInput = document.getElementById("rememberMe");
const togglePassword = document.getElementById("togglePassword");
const forgotPasswordLink = document.getElementById("forgotPassword");
const errorBox = document.getElementById("loginError");

function setError(message) {
  errorBox.textContent = message;
  errorBox.classList.toggle("visible", Boolean(message));
}

function loadRememberedUsername() {
  const remembered = localStorage.getItem("rememberedUsername");
  if (remembered) {
    usernameInput.value = remembered;
    rememberMeInput.checked = true;
  }
}

function togglePasswordVisibility() {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    togglePassword.textContent = "🙈";
  } else {
    passwordInput.type = "password";
    togglePassword.textContent = "👁️";
  }
}

async function login(event) {
  event.preventDefault();
  setError("");

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    setError("Please enter username and password.");
    return;
  }

  try {
    const q = query(
      collection(db, "users"),
      where("username", "==", username),
      where("password", "==", password)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      setError("Invalid username or password.");
      return;
    }

    const userDoc = snap.docs[0].data();
    localStorage.setItem("username", userDoc.username);
    localStorage.setItem("userRole", userDoc.role);

    if (rememberMeInput.checked) {
      localStorage.setItem("rememberedUsername", userDoc.username);
    } else {
      localStorage.removeItem("rememberedUsername");
    }

    window.location.href = "dashboard.html";
  } catch (err) {
    console.error("Login error:", err);
    setError("Login failed. Please try again later.");
  }
}

loginForm.addEventListener("submit", login);
rememberMeInput.addEventListener("change", () => {
  if (!rememberMeInput.checked) {
    localStorage.removeItem("rememberedUsername");
  }
});

togglePassword.addEventListener("click", togglePasswordVisibility);
forgotPasswordLink.addEventListener("click", (event) => {
  event.preventDefault();
  alert("Please contact support@prasatek.site to reset your password.");
});

loadRememberedUsername();
