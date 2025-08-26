// admin.js
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const btnDashboard = document.getElementById("btnDashboard");
const btnSignOut = document.getElementById("btnSignOut");

// User management
const btnCreateUser = document.getElementById("btnCreateUser");
const newUsername = document.getElementById("newUsername");
const newPassword = document.getElementById("newPassword");
const newRole = document.getElementById("newRole");
const usersTable = document.getElementById("usersTable");

// Location management
const btnCreateLocation = document.getElementById("btnCreateLocation");
const newLocation = document.getElementById("newLocation");
const locationsTable = document.getElementById("locationsTable");
const searchLocationAdmin = document.getElementById("searchLocationAdmin");

// Confirm modal
const confirmModal = document.getElementById("confirmModal");
const confirmMsg = document.getElementById("confirmMsg");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
let deleteCallback = null;

// ---------------- Init User ----------------
function initUser() {
  const role = localStorage.getItem("userRole");
  if (role !== "admin") {
    // 🚫 Only admin can access this page
    window.location.href = "index.html";
  }
}
initUser();

// ---------------- Confirm Modal ----------------
function showConfirm(message, callback) {
  confirmMsg.textContent = message;
  confirmModal.classList.remove("hidden");
  deleteCallback = callback;
}
confirmYes.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
  if (deleteCallback) deleteCallback();
  deleteCallback = null;
});
confirmNo.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
  deleteCallback = null;
});

// ---------------- Users ----------------
async function loadUsers() {
  usersTable.innerHTML = "";
  const snap = await getDocs(collection(db, "users"));
  snap.forEach((docSnap) => {
    const u = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td><button class="delete">Delete</button></td>
    `;
    tr.querySelector(".delete").onclick = () =>
      showConfirm(`Delete user "${u.username}"?`, async () => {
        await deleteDoc(doc(db, "users", docSnap.id));
        loadUsers();
      });
    usersTable.appendChild(tr);
  });
}

btnCreateUser.addEventListener("click", async () => {
  if (!newUsername.value || !newPassword.value) return alert("Fill all fields");
  await addDoc(collection(db, "users"), {
    username: newUsername.value,
    password: newPassword.value,
    role: newRole.value,
  });
  newUsername.value = "";
  newPassword.value = "";
  newRole.value = "user";
  loadUsers();
});

// ---------------- Locations ----------------
async function loadLocations() {
  locationsTable.innerHTML = "";
  const snap = await getDocs(collection(db, "locations"));
  snap.forEach((docSnap) => {
    const l = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${l.name}</td>
      <td><button class="delete">Delete</button></td>
    `;
    tr.querySelector(".delete").onclick = () =>
      showConfirm(`Delete location "${l.name}"?`, async () => {
        await deleteDoc(doc(db, "locations", docSnap.id));
        loadLocations();
      });
    locationsTable.appendChild(tr);
  });
}

btnCreateLocation.addEventListener("click", async () => {
  if (!newLocation.value) return alert("Enter a location name");
  await addDoc(collection(db, "locations"), {
    name: newLocation.value,
  });
  newLocation.value = "";
  loadLocations();
});

// ---------------- Location Search ----------------
searchLocationAdmin.addEventListener("input", () => {
  const term = searchLocationAdmin.value.toLowerCase();
  Array.from(locationsTable.children).forEach((tr) => {
    const name = tr.children[0].textContent.toLowerCase();
    tr.style.display = name.includes(term) ? "" : "none";
  });
});

// ---------------- Nav ----------------
btnDashboard.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});
btnSignOut.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// ---------------- Init ----------------
loadUsers();
loadLocations();
