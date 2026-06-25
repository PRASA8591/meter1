import { db } from "./firebase.js";
import {
  collection, query, orderBy, getDocs,
  addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const tbody = document.querySelector("#tripTable tbody");
const btnAddRow = document.getElementById("btnAddRow");
const btnExport = document.getElementById("btnExport");
const btnSignOut = document.getElementById("btnSignOut");
const btnAdminPage = document.getElementById("btnAdminPage");
const whoami = document.getElementById("whoami");

// Filters
const btnFilterDate = document.getElementById("btnFilterDate");
const btnSearchLoc = document.getElementById("btnSearchLoc");
const btnClearFilters = document.getElementById("btnClearFilters");
const filterStart = document.getElementById("filterStart");
const filterEnd = document.getElementById("filterEnd");
const searchLocation = document.getElementById("searchLocation");
const searchUser = document.getElementById("searchUser");

// Modal refs
const modal = document.getElementById("locationsModal");
const locBox = document.getElementById("locationsOptions");
const btnApply = document.getElementById("btnLocApply");
const btnCancel = document.getElementById("btnLocCancel");

// Confirm modal
const confirmModal = document.getElementById("confirmModal");
const confirmMsg = document.getElementById("confirmMsg");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

let currentUser = null;
let locationsCache = [];
let modalRow = null;
let columnWidths = {}; // loaded from Firestore
let deleteCallback = null;
let currentFilteredTrips = [];

const countTotalTrips = document.getElementById("countTotalTrips");
const countTotalMeter = document.getElementById("countTotalMeter");
const countAvgMeter = document.getElementById("countAvgMeter");
const countTodayTrips = document.getElementById("countTodayTrips");
const countUniqueLocations = document.getElementById("countUniqueLocations");
const countUniqueUsers = document.getElementById("countUniqueUsers");
const topLocation = document.getElementById("topLocation");
const topUser = document.getElementById("topUser");
const countWeekTrips = document.getElementById("countWeekTrips");
const btnExportFiltered = document.getElementById("btnExportFiltered");

// --- Confirm Modal ---
function showDeleteConfirm(callback) {
  deleteCallback = callback;
  confirmMsg.textContent = "Are you sure you want to delete this entry?";
  confirmModal.classList.remove("hidden");
}
confirmYes.onclick = () => {
  if (deleteCallback) deleteCallback();
  confirmModal.classList.add("hidden");
  deleteCallback = null;
};
confirmNo.onclick = () => {
  confirmModal.classList.add("hidden");
  deleteCallback = null;
};

// --- Init User from localStorage ---
function initUser() {
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("userRole");

  if (!username || !role) {
    window.location.href = "index.html";
    return;
  }

  currentUser = { username, role };
  whoami.textContent = `Logged in as: ${username} (${role})`;

  if (role === "admin") {
    btnAdminPage.classList.remove("hidden");
    document.getElementById("thUser").classList.remove("hidden");
    document.getElementById("thActions").classList.remove("hidden");
    enableColumnResize();
  } else {
    btnAdminPage.classList.add("hidden");
    if (role === "viewer") {
      btnAddRow.style.display = "none";
    }
  }
}

// --- Load Locations ---
async function loadLocations() {
  const snap = await getDocs(collection(db, "locations"));
  locationsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // ✅ Sort alphabetically by name
  locationsCache.sort((a, b) => a.name.localeCompare(b.name));
}


// --- Dashboard summary helpers ---
function getWeekStart(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day + 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseDateString(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildTripSummary(trips) {
  const totalTrips = trips.length;
  const totalMeter = trips.reduce((sum, trip) => sum + (Number(trip.totalMeter) || 0), 0);
  const avgMeter = totalTrips ? Math.round(totalMeter / totalTrips) : 0;
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const todayTrips = trips.filter(trip => trip.date === todayIso).length;

  const uniqueLocations = new Set();
  const uniqueUsers = new Set();
  const locationCount = {};
  const userCount = {};
  let weekTrips = 0;
  const weekStart = getWeekStart(today);

  trips.forEach(trip => {
    (trip.locations || []).forEach(loc => {
      const name = (loc || "").trim();
      if (name) {
        uniqueLocations.add(name);
        locationCount[name] = (locationCount[name] || 0) + 1;
      }
    });
    if (trip.createdBy) {
      uniqueUsers.add(trip.createdBy);
      userCount[trip.createdBy] = (userCount[trip.createdBy] || 0) + 1;
    }
    const tripDate = parseDateString(trip.date);
    if (tripDate && tripDate >= weekStart) {
      weekTrips += 1;
    }
  });

  const bestLocation = Object.keys(locationCount).sort((a, b) => locationCount[b] - locationCount[a])[0] || "—";
  const bestUser = Object.keys(userCount).sort((a, b) => userCount[b] - userCount[a])[0] || "—";

  return {
    totalTrips,
    totalMeter,
    avgMeter,
    todayTrips,
    uniqueLocations: uniqueLocations.size,
    uniqueUsers: uniqueUsers.size,
    bestLocation,
    bestUser,
    weekTrips
  };
}

function updateDashboardSummary(trips) {
  const summary = buildTripSummary(trips);
  countTotalTrips.textContent = summary.totalTrips;
  countTotalMeter.textContent = summary.totalMeter;
  countAvgMeter.textContent = summary.avgMeter;
  countTodayTrips.textContent = summary.todayTrips;
  countUniqueLocations.textContent = summary.uniqueLocations;
  countUniqueUsers.textContent = summary.uniqueUsers;
  topLocation.textContent = summary.bestLocation;
  topUser.textContent = summary.bestUser;
  countWeekTrips.textContent = summary.weekTrips;
}

async function loadColumnWidths() {
  const ref = doc(db, "settings", "tableConfig");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    columnWidths = snap.data().columnWidths || {};
    Object.entries(columnWidths).forEach(([id, width]) => {
      const th = document.getElementById(id);
      if (th) th.style.width = width;
    });
  }
}

// --- Save Column Widths ---
async function saveColumnWidths() {
  if (currentUser.role !== "admin") return;
  await setDoc(doc(db, "settings", "tableConfig"), { columnWidths }, { merge: true });
}

// --- Column Resize (Admin Only) ---
function enableColumnResize() {
  const cols = document.querySelectorAll("#tripTable thead th");
  cols.forEach(th => {
    th.style.position = "relative";
    const resizer = document.createElement("div");
    resizer.style.width = "5px";
    resizer.style.height = "100%";
    resizer.style.position = "absolute";
    resizer.style.right = "0";
    resizer.style.top = "0";
    resizer.style.cursor = "col-resize";
    th.appendChild(resizer);

    let startX, startWidth;
    resizer.addEventListener("mousedown", e => {
      startX = e.pageX;
      startWidth = th.offsetWidth;
      document.onmousemove = e2 => {
        let newWidth = startWidth + (e2.pageX - startX);
        if (newWidth < 60) newWidth = 60;
        th.style.width = newWidth + "px";
        columnWidths[th.id] = th.style.width;
      };
      document.onmouseup = () => {
        document.onmousemove = null;
        document.onmouseup = null;
        saveColumnWidths();
      };
    });
  });
}

// --- Open Locations Modal ---
function openLocationsModal(row) {
  modalRow = row;
  locBox.innerHTML = "";
  const existing = row.children[6].querySelector("input[type=text]").value.split(",").map(s => s.trim());
  locationsCache.forEach(loc => {
    const checked = existing.includes(loc.name) ? "checked" : "";
    locBox.innerHTML += `
      <label style="display:block;margin:4px 0">
        <input type="checkbox" value="${loc.name}" ${checked}> ${loc.name}
      </label>
    `;
  });
  modal.classList.remove("hidden");
}
btnCancel.addEventListener("click", () => { modal.classList.add("hidden"); modalRow = null; });
btnApply.addEventListener("click", () => {
  if (!modalRow) return;
  const selected = Array.from(locBox.querySelectorAll("input:checked")).map(i => i.value);
  modalRow.children[6].querySelector("input[type=text]").value = selected.join(", ");
  persistRow(modalRow);
  modal.classList.add("hidden");
  modalRow = null;
});

// --- Add Row ---
async function addEditableRow(docId = null, data = {}, insertTop = false) {
  const isAdmin = currentUser.role === "admin";
  const isViewer = currentUser.role === "viewer";
  const isMine = data.createdBy === currentUser.username || !data.createdBy;

  const tr = document.createElement("tr");
  tr.dataset.id = docId || "";
  tr.dataset.createdBy = data.createdBy || currentUser.username;

  tr.innerHTML = `
    <td><input type="date" value="${data.date || ""}"></td>
    <td><input type="time" value="${data.startTime || ""}"></td>
    <td><input type="number" value="${data.startMeter ?? ""}"></td>
    <td><input type="time" value="${data.endTime || ""}"></td>
    <td><input type="number" value="${data.endMeter ?? ""}"></td>
    <td><input type="text" value="${data.totalMeter ?? ""}" readonly></td>
    <td>
      ${!isViewer ? '<button class="selectLocBtn">Select</button>' : ""}
      <input type="text" value="${(data.locations || []).join(", ")}" readonly>
    </td>
    <td class="${!isAdmin ? "hidden" : ""}">${tr.dataset.createdBy}</td>
    <td class="${!isAdmin ? "hidden" : ""}"></td>
  `;

  const sm = tr.children[2].querySelector("input");
  const em = tr.children[4].querySelector("input");
  const total = tr.children[5].querySelector("input");

  function recalc() {
    const s = parseFloat(sm.value);
    const e = parseFloat(em.value);
    total.value = (!isNaN(s) && !isNaN(e)) ? e - s : "";
    persistRow(tr);
  }
  sm.addEventListener("input", recalc);
  em.addEventListener("input", recalc);

  const locBtn = tr.querySelector(".selectLocBtn");
  if (locBtn) locBtn.addEventListener("click", () => openLocationsModal(tr));

  [0, 1, 2, 3, 4].forEach(i => {
    const inp = tr.children[i].querySelector("input");
    if (inp) inp.addEventListener("change", () => persistRow(tr));
  });

  if (isAdmin) {
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.onclick = () => showDeleteConfirm(async () => {
      if (tr.dataset.id) await deleteDoc(doc(db, "trips", tr.dataset.id));
      tr.remove();
    });
    tr.children[8].appendChild(delBtn);
  }

  if (insertTop) {
    tbody.prepend(tr);
  } else {
    tbody.appendChild(tr);
  }

  const tripComplete = data.date && data.startTime && data.startMeter !== null &&
                       data.endTime && data.endMeter !== null &&
                       (data.locations || []).length > 0;

  if (!isAdmin) {
    if (isViewer) {
      lockRow(tr);
    } else if (!isMine) {
      lockRow(tr);
    } else if (tripComplete) {
      lockRow(tr);
    }
  }

  if (!docId) {
    const payload = {
      date: "",
      startTime: "",
      startMeter: null,
      endTime: "",
      endMeter: null,
      totalMeter: null,
      locations: [],
      createdBy: currentUser.username,
      createdAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, "trips"), payload);
    tr.dataset.id = ref.id;
  }
}

// --- Save Row ---
async function persistRow(tr) {
  if (!tr.dataset.id) return;

  const cells = tr.querySelectorAll("td");

  const sVal = cells[2].querySelector("input").value;
  const eVal = cells[4].querySelector("input").value;
  const sNum = sVal ? Number(sVal) : null;
  const eNum = eVal ? Number(eVal) : null;

  const total = (!isNaN(sNum) && !isNaN(eNum)) ? eNum - sNum : null;
  cells[5].querySelector("input").value = total ?? "";

  const payload = {
    date: cells[0].querySelector("input").value || "",
    startTime: cells[1].querySelector("input").value || "",
    startMeter: sNum,
    endTime: cells[3].querySelector("input").value || "",
    endMeter: eNum,
    totalMeter: total,
    locations: (cells[6].querySelector("input[type=text]").value || "")
                .split(",").map(s => s.trim()).filter(Boolean),
    createdBy: tr.dataset.createdBy,
    updatedAt: serverTimestamp()
  };

  await updateDoc(doc(db, "trips", tr.dataset.id), payload);
}

// --- Lock Row ---
function lockRow(tr) {
  const cells = tr.querySelectorAll("td");
  Array.from(cells).forEach(td => {
    const inp = td.querySelector("input");
    if (inp) inp.setAttribute("disabled", "true");
  });
  const btn = tr.querySelector(".selectLocBtn");
  if (btn) btn.remove();
}

// --- Load Trips with filters ---
async function loadTrips() {
  tbody.innerHTML = "";
  const qAll = query(collection(db, "trips"), orderBy("createdAt", "desc"));
  const snap = await getDocs(qAll);

  const start = filterStart.value;
  const end = filterEnd.value;
  const search = searchLocation.value.toLowerCase();
  const searchByUser = (searchUser?.value || "").toLowerCase();

  currentFilteredTrips = [];

  snap.forEach(d => {
    const row = d.data();
    if (start && row.date < start) return;
    if (end && row.date > end) return;
    if (search && !((row.locations || []).some(l => l.toLowerCase().includes(search)))) return;
    if (searchByUser && !(row.createdBy || "").toLowerCase().includes(searchByUser)) return;
    currentFilteredTrips.push({ id: d.id, ...row });
    addEditableRow(d.id, row);
  });

  updateDashboardSummary(currentFilteredTrips);
}

// --- Export (Excel) ---
btnExport.addEventListener("click", async () => exportTrips(false));
btnExportFiltered.addEventListener("click", async () => exportTrips(true));

async function exportTrips(filteredOnly = false) {
  const rows = [];
  rows.push(["Date", "Start Time", "End Time", "Start Meter", "End Meter", "Total Meter", "Locations", "Created By"]);

  const trips = filteredOnly ? currentFilteredTrips : (await getDocs(query(collection(db, "trips"), orderBy("date", "asc")))).docs.map(d => d.data());

  trips.forEach(d => {
    rows.push([
      d.date || "",
      d.startTime || "",
      d.endTime || "",
      d.startMeter ?? "",
      d.endMeter ?? "",
      d.totalMeter ?? "",
      (d.locations || []).join(", "),
      d.createdBy || ""
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Trip Log");
  const fileName = filteredOnly ? "Filtered_Trip_Log.xlsx" : "Trip_Log.xlsx";
  XLSX.writeFile(wb, fileName);
}

// --- Sign out ---
btnSignOut.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// --- Admin Page ---
btnAdminPage.addEventListener("click", () => window.location.href = "admin.html");

// --- Init ---
initUser();
loadLocations().then(() => {
  loadColumnWidths().then(loadTrips);
});
btnAddRow.addEventListener("click", () => addEditableRow(null, {}, true));
btnFilterDate.addEventListener("click", () => {
  loadTrips();
});
btnClearFilters.addEventListener("click", () => {
  filterStart.value = "";
  filterEnd.value = "";
  searchLocation.value = "";
  searchUser.value = "";
  loadTrips();
});
btnSearchLoc.addEventListener("click", loadTrips);
searchUser.addEventListener("input", loadTrips);
