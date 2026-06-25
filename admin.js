// admin.js
import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const btnDashboard = document.getElementById("btnDashboard");
const btnSignOut = document.getElementById("btnSignOut");
const btnRefreshAdmin = document.getElementById("btnRefreshAdmin");
const btnExportTrips = document.getElementById("btnExportTrips");
const btnCreateUser = document.getElementById("btnCreateUser");
const newUsername = document.getElementById("newUsername");
const newPassword = document.getElementById("newPassword");
const newRole = document.getElementById("newRole");
const usersTable = document.getElementById("usersTable");
const searchUserAdmin = document.getElementById("searchUserAdmin");
const btnCreateLocation = document.getElementById("btnCreateLocation");
const newLocation = document.getElementById("newLocation");
const locationsTable = document.getElementById("locationsTable");
const searchLocationAdmin = document.getElementById("searchLocationAdmin");
const filterTripUser = document.getElementById("filterTripUser");
const searchTripLocation = document.getElementById("searchTripLocation");
const filterTripStart = document.getElementById("filterTripStart");
const filterTripEnd = document.getElementById("filterTripEnd");
const btnFilterTrips = document.getElementById("btnFilterTrips");
const tripsTable = document.getElementById("tripsTable");
const countUsers = document.getElementById("countUsers");
const countLocations = document.getElementById("countLocations");
const countTrips = document.getElementById("countTrips");
const countMeters = document.getElementById("countMeters");
const confirmModal = document.getElementById("confirmModal");
const confirmMsg = document.getElementById("confirmMsg");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
let deleteCallback = null;

function initUser() {
  const role = localStorage.getItem("userRole");
  if (role !== "admin") {
    window.location.href = "index.html";
  }
}
initUser();

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

async function loadSummary() {
  const [usersSnap, locationsSnap, tripsSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "locations")),
    getDocs(collection(db, "trips"))
  ]);

  const totalMeters = tripsSnap.docs.reduce((sum, d) => sum + (Number(d.data().totalMeter) || 0), 0);

  countUsers.textContent = usersSnap.size;
  countLocations.textContent = locationsSnap.size;
  countTrips.textContent = tripsSnap.size;
  countMeters.textContent = totalMeters;
}

async function loadUsers() {
  usersTable.innerHTML = "";
  const term = searchUserAdmin.value.trim().toLowerCase();
  const snap = await getDocs(query(collection(db, "users"), orderBy("username", "asc")));

  snap.forEach((docSnap) => {
    const user = docSnap.data();
    if (term && !user.username.toLowerCase().includes(term)) return;

    const tr = document.createElement("tr");
    tr.dataset.id = docSnap.id;
    tr.innerHTML = `
      <td>${user.username}</td>
      <td>
        <select class="userRole">
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
        </select>
      </td>
      <td><input type="password" class="passwordInput" placeholder="New password"></td>
      <td class="actions">
        <button class="saveUser">Save</button>
        <button class="deleteUser">Delete</button>
      </td>
    `;

    const roleSelect = tr.querySelector(".userRole");
    roleSelect.value = user.role || "user";

    tr.querySelector(".saveUser").addEventListener("click", async () => {
      const newRoleValue = roleSelect.value;
      const passwordValue = tr.querySelector(".passwordInput").value.trim();
      const payload = { role: newRoleValue };
      if (passwordValue) payload.password = passwordValue;
      await updateDoc(doc(db, "users", docSnap.id), payload);
      tr.querySelector(".passwordInput").value = "";
      loadUsers();
      loadSummary();
    });

    tr.querySelector(".deleteUser").addEventListener("click", () =>
      showConfirm(`Delete user "${user.username}"?`, async () => {
        await deleteDoc(doc(db, "users", docSnap.id));
        loadUsers();
        loadSummary();
      })
    );

    usersTable.appendChild(tr);
  });
}

btnCreateUser.addEventListener("click", async () => {
  const username = newUsername.value.trim();
  const password = newPassword.value.trim();
  const role = newRole.value;

  if (!username || !password) {
    return alert("Fill all fields");
  }

  const existing = await getDocs(query(collection(db, "users"), where("username", "==", username)));
  if (!existing.empty) {
    return alert("Username already exists.");
  }

  await addDoc(collection(db, "users"), {
    username,
    password,
    role,
    createdAt: serverTimestamp()
  });

  newUsername.value = "";
  newPassword.value = "";
  newRole.value = "user";
  loadUsers();
  loadSummary();
});

async function loadLocations() {
  locationsTable.innerHTML = "";
  const term = searchLocationAdmin.value.trim().toLowerCase();
  const snap = await getDocs(query(collection(db, "locations"), orderBy("name", "asc")));

  snap.forEach((docSnap) => {
    const location = docSnap.data();
    if (term && !location.name.toLowerCase().includes(term)) return;

    const tr = document.createElement("tr");
    tr.dataset.id = docSnap.id;
    tr.innerHTML = `
      <td><input type="text" class="locationName" value="${location.name}"></td>
      <td class="actions">
        <button class="saveLocation">Save</button>
        <button class="deleteLocation">Delete</button>
      </td>
    `;

    tr.querySelector(".saveLocation").addEventListener("click", async () => {
      const nextName = tr.querySelector(".locationName").value.trim();
      if (!nextName) {
        return alert("Location name cannot be empty.");
      }

      const duplicate = await getDocs(query(collection(db, "locations"), where("name", "==", nextName)));
      if (!duplicate.empty && duplicate.docs.some(d => d.id !== docSnap.id)) {
        return alert("Location already exists.");
      }

      await updateDoc(doc(db, "locations", docSnap.id), { name: nextName });
      loadLocations();
      loadSummary();
    });

    tr.querySelector(".deleteLocation").addEventListener("click", () =>
      showConfirm(`Delete location "${location.name}"?`, async () => {
        await deleteDoc(doc(db, "locations", docSnap.id));
        loadLocations();
        loadSummary();
      })
    );

    locationsTable.appendChild(tr);
  });
}

btnCreateLocation.addEventListener("click", async () => {
  const locationName = newLocation.value.trim();
  if (!locationName) {
    return alert("Enter a location name");
  }

  const existing = await getDocs(query(collection(db, "locations"), where("name", "==", locationName)));
  if (!existing.empty) {
    return alert("Location already exists.");
  }

  await addDoc(collection(db, "locations"), {
    name: locationName,
    createdAt: serverTimestamp()
  });

  newLocation.value = "";
  loadLocations();
  loadSummary();
});

searchUserAdmin.addEventListener("input", () => loadUsers());
searchLocationAdmin.addEventListener("input", () => loadLocations());

async function loadTrips() {
  tripsTable.innerHTML = "";
  const userTerm = filterTripUser.value.trim().toLowerCase();
  const locationTerm = searchTripLocation.value.trim().toLowerCase();
  const start = filterTripStart.value;
  const end = filterTripEnd.value;

  const snap = await getDocs(query(collection(db, "trips"), orderBy("date", "desc")));

  snap.forEach((docSnap) => {
    const trip = docSnap.data();
    if (userTerm && !(trip.createdBy || "").toLowerCase().includes(userTerm)) return;
    if (locationTerm && !((trip.locations || []).some(loc => loc.toLowerCase().includes(locationTerm)))) return;
    if (start && trip.date < start) return;
    if (end && trip.date > end) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${trip.date || ""}</td>
      <td>${trip.startTime || ""}</td>
      <td>${trip.endTime || ""}</td>
      <td>${trip.startMeter ?? ""}</td>
      <td>${trip.endMeter ?? ""}</td>
      <td>${trip.totalMeter ?? ""}</td>
      <td>${(trip.locations || []).join(", ")}</td>
      <td>${trip.createdBy || ""}</td>
      <td class="actions"><button class="deleteTrip">Delete</button></td>
    `;

    tr.querySelector(".deleteTrip").addEventListener("click", () =>
      showConfirm("Delete this trip entry?", async () => {
        await deleteDoc(doc(db, "trips", docSnap.id));
        loadTrips();
        loadSummary();
      })
    );

    tripsTable.appendChild(tr);
  });
}

btnFilterTrips.addEventListener("click", loadTrips);

btnExportTrips.addEventListener("click", async () => {
  const snap = await getDocs(query(collection(db, "trips"), orderBy("date", "asc")));
  const rows = [["Date", "Start Time", "End Time", "Start Meter", "End Meter", "Total Meter", "Locations", "Created By"]];

  snap.forEach((docSnap) => {
    const trip = docSnap.data();
    rows.push([
      trip.date || "",
      trip.startTime || "",
      trip.endTime || "",
      trip.startMeter ?? "",
      trip.endMeter ?? "",
      trip.totalMeter ?? "",
      (trip.locations || []).join(", "),
      trip.createdBy || ""
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Trip Log");
  XLSX.writeFile(wb, "Admin_Trip_Log.xlsx");
});

btnRefreshAdmin.addEventListener("click", () => {
  loadSummary();
  loadUsers();
  loadLocations();
  loadTrips();
});

btnDashboard.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

btnSignOut.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

loadSummary();
loadUsers();
loadLocations();
loadTrips();
