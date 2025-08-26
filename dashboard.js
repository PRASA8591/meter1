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
const filterStart = document.getElementById("filterStart");
const filterEnd = document.getElementById("filterEnd");
const searchLocation = document.getElementById("searchLocation");

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


// --- Load Column Widths (from Firestore) ---
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
async function addEditableRow(docId = null, data = {}) {
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

  tbody.appendChild(tr);

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
  const qAll = query(collection(db, "trips"), orderBy("date", "asc"));
  const snap = await getDocs(qAll);

  const start = filterStart.value;
  const end = filterEnd.value;
  const search = searchLocation.value.toLowerCase();

  snap.forEach(d => {
    const row = d.data();
    if (start && row.date < start) return;
    if (end && row.date > end) return;
    if (search && !row.locations.some(l => l.toLowerCase().includes(search))) return;
    addEditableRow(d.id, row);
  });
}

// --- Export (Excel) ---
btnExport.addEventListener("click", async () => {
  const qAll = query(collection(db, "trips"), orderBy("date", "asc"));
  const snap = await getDocs(qAll);

  const rows = [];
  rows.push(["Date", "Start Time", "End Time", "Start Meter", "End Meter", "Total Meter", "Locations", "Created By"]);

  snap.forEach(docSnap => {
    const d = docSnap.data();
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
  XLSX.writeFile(wb, "Trip_Log.xlsx");
});

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
btnAddRow.addEventListener("click", () => addEditableRow());
btnFilterDate.addEventListener("click", loadTrips);
btnSearchLoc.addEventListener("click", loadTrips);
