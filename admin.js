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
const btnClearTripFilters = document.getElementById("btnClearTripFilters");
const btnExportFilteredTrips = document.getElementById("btnExportFilteredTrips");
const tripsTable = document.getElementById("tripsTable");
const countUsers = document.getElementById("countUsers");
const countLocations = document.getElementById("countLocations");
const countTrips = document.getElementById("countTrips");
const countMeters = document.getElementById("countMeters");
const countAvgMeter = document.getElementById("countAvgMeter");
const countLocationsUsed = document.getElementById("countLocationsUsed");
const filteredTripCount = document.getElementById("filteredTripCount");
const filteredTripMeters = document.getElementById("filteredTripMeters");
const filterUserRole = document.getElementById("filterUserRole");
const bulkLocations = document.getElementById("bulkLocations");
const btnBulkAddLocations = document.getElementById("btnBulkAddLocations");
const tripEditModal = document.getElementById("tripEditModal");
const editTripDate = document.getElementById("editTripDate");
const editTripStartTime = document.getElementById("editTripStartTime");
const editTripStartMeter = document.getElementById("editTripStartMeter");
const editTripEndTime = document.getElementById("editTripEndTime");
const editTripEndMeter = document.getElementById("editTripEndMeter");
const editTripLocations = document.getElementById("editTripLocations");
const editTripCreatedBy = document.getElementById("editTripCreatedBy");
const saveTripEdit = document.getElementById("saveTripEdit");
const cancelTripEdit = document.getElementById("cancelTripEdit");
const confirmModal = document.getElementById("confirmModal");
const confirmMsg = document.getElementById("confirmMsg");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
let deleteCallback = null;
let currentTripEditId = null;

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

  const trips = tripsSnap.docs.map(d => d.data());
  const totalMeters = trips.reduce((sum, trip) => sum + (Number(trip.totalMeter) || 0), 0);
  const avgMeter = trips.length ? Math.round(totalMeters / trips.length) : 0;
  const uniqueLocations = new Set(trips.flatMap(trip => (trip.locations || []).map(name => name.trim()).filter(Boolean)));

  countUsers.textContent = usersSnap.size;
  countLocations.textContent = locationsSnap.size;
  countTrips.textContent = tripsSnap.size;
  countMeters.textContent = totalMeters;
  countAvgMeter.textContent = avgMeter;
  countLocationsUsed.textContent = uniqueLocations.size;
}

async function loadUsers() {
  usersTable.innerHTML = "";
  const term = searchUserAdmin.value.trim().toLowerCase();
  const selectedRole = filterUserRole.value;
  const snap = await getDocs(query(collection(db, "users"), orderBy("username", "asc")));

  snap.forEach((docSnap) => {
    const user = docSnap.data();
    if (term && !user.username.toLowerCase().includes(term)) return;
    if (selectedRole && user.role !== selectedRole) return;

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

btnBulkAddLocations.addEventListener("click", async () => {
  const raw = bulkLocations.value.trim();
  if (!raw) {
    return alert("Enter at least one location name.");
  }

  const names = Array.from(new Set(raw.split(",").map(item => item.trim()).filter(Boolean)));
  if (!names.length) {
    return alert("Enter valid location names.");
  }

  const existingSnap = await getDocs(collection(db, "locations"));
  const existingNames = new Set(existingSnap.docs.map(d => (d.data().name || "").toLowerCase()));
  let added = 0;

  for (const name of names) {
    if (existingNames.has(name.toLowerCase())) continue;
    await addDoc(collection(db, "locations"), {
      name,
      createdAt: serverTimestamp()
    });
    added += 1;
  }

  bulkLocations.value = "";
  loadLocations();
  loadSummary();
  alert(`${added} location(s) added.`);
});

searchUserAdmin.addEventListener("input", () => loadUsers());
filterUserRole.addEventListener("change", () => loadUsers());
searchLocationAdmin.addEventListener("input", () => loadLocations());

function matchesTripFilters(trip) {
  const userTerm = filterTripUser.value.trim().toLowerCase();
  const locationTerm = searchTripLocation.value.trim().toLowerCase();
  const start = filterTripStart.value;
  const end = filterTripEnd.value;

  if (userTerm && !(trip.createdBy || "").toLowerCase().includes(userTerm)) return false;
  if (locationTerm && !((trip.locations || []).some(loc => loc.toLowerCase().includes(locationTerm)))) return false;
  if (start && trip.date < start) return false;
  if (end && trip.date > end) return false;
  return true;
}

function updateTripFilterStats(count, totalMeters) {
  filteredTripCount.textContent = `Showing ${count} trip(s)`;
  filteredTripMeters.textContent = `${totalMeters} total meters`;
}

async function loadTrips() {
  tripsTable.innerHTML = "";
  const snap = await getDocs(query(collection(db, "trips"), orderBy("date", "desc")));
  let visibleCount = 0;
  let visibleMeters = 0;

  snap.forEach((docSnap) => {
    const trip = docSnap.data();
    if (!matchesTripFilters(trip)) return;

    visibleCount += 1;
    visibleMeters += Number(trip.totalMeter) || 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${trip.date || ""}</td>
      <td>${trip.startTime || ""}</td>
      <td>${trip.startMeter ?? ""}</td>
      <td>${trip.endTime || ""}</td>
      <td>${trip.endMeter ?? ""}</td>
      <td>${trip.totalMeter ?? ""}</td>
      <td>${(trip.locations || []).join(", ")}</td>
      <td>${trip.createdBy || ""}</td>
      <td class="actions">
        <button class="editTrip">Edit</button>
        <button class="deleteTrip">Delete</button>
      </td>
    `;

    tr.querySelector(".editTrip").addEventListener("click", () => openTripEditModal(docSnap.id, trip));
    tr.querySelector(".deleteTrip").addEventListener("click", () =>
      showConfirm("Delete this trip entry?", async () => {
        await deleteDoc(doc(db, "trips", docSnap.id));
        loadTrips();
        loadSummary();
      })
    );

    tripsTable.appendChild(tr);
  });

  updateTripFilterStats(visibleCount, visibleMeters);
}

btnFilterTrips.addEventListener("click", loadTrips);
btnClearTripFilters.addEventListener("click", () => {
  filterTripUser.value = "";
  searchTripLocation.value = "";
  filterTripStart.value = "";
  filterTripEnd.value = "";
  loadTrips();
});

async function exportTrips(filteredOnly = false) {
  const snap = await getDocs(query(collection(db, "trips"), orderBy("date", "asc")));
  const rows = [["Date", "Start Time", "End Time", "Start Meter", "End Meter", "Total Meter", "Locations", "Created By"]];

  snap.forEach((docSnap) => {
    const trip = docSnap.data();
    if (filteredOnly && !matchesTripFilters(trip)) return;
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
  XLSX.writeFile(wb, filteredOnly ? "Admin_Filtered_Trip_Log.xlsx" : "Admin_Trip_Log.xlsx");
}

btnExportTrips.addEventListener("click", () => exportTrips(false));
btnExportFilteredTrips.addEventListener("click", () => exportTrips(true));

function closeTripEditModal() {
  tripEditModal.classList.add("hidden");
  currentTripEditId = null;
}

function openTripEditModal(id, trip) {
  currentTripEditId = id;
  editTripDate.value = trip.date || "";
  editTripStartTime.value = trip.startTime || "";
  editTripStartMeter.value = trip.startMeter ?? "";
  editTripEndTime.value = trip.endTime || "";
  editTripEndMeter.value = trip.endMeter ?? "";
  editTripLocations.value = (trip.locations || []).join(", ");
  editTripCreatedBy.value = trip.createdBy || "";
  tripEditModal.classList.remove("hidden");
}

cancelTripEdit.addEventListener("click", closeTripEditModal);

saveTripEdit.addEventListener("click", async () => {
  if (!currentTripEditId) return;
  const payload = {
    date: editTripDate.value,
    startTime: editTripStartTime.value,
    startMeter: editTripStartMeter.value ? Number(editTripStartMeter.value) : null,
    endTime: editTripEndTime.value,
    endMeter: editTripEndMeter.value ? Number(editTripEndMeter.value) : null,
    locations: editTripLocations.value.split(",").map(item => item.trim()).filter(Boolean)
  };
  if (payload.startMeter !== null && payload.endMeter !== null) {
    payload.totalMeter = payload.endMeter - payload.startMeter;
  }
  await updateDoc(doc(db, "trips", currentTripEditId), payload);
  closeTripEditModal();
  loadTrips();
  loadSummary();
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
