const ADMIN_USER = "admin";
const ADMIN_PASS = "BES-ADMIN-2026";
const STORAGE_KEY = "bes_attendance_records_v2";
let currentUser = null;
let isAdmin = false;

const $ = (id) => document.getElementById(id);

function manilaParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    displayDate: `${parts.month}/${parts.day}/${parts.year}`,
    time: `${parts.hour}:${parts.minute}:${parts.second} ${parts.dayPeriod}`
  };
}

function updateClock() {
  const now = manilaParts();
  $("liveDate").textContent = now.displayDate;
  $("liveClock").textContent = now.time;
}
setInterval(updateClock, 1000);
updateClock();

function getRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveRecords(records) { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2500);
}

function loginEmployee() {
  const name = $("employeeName").value.trim();
  const id = $("employeeId").value.trim();
  if (!name || !id) return showToast("Please enter employee name and ID/position.");
  currentUser = { name, id };
  isAdmin = false;
  $("loginPanel").classList.add("hidden");
  $("attendancePanel").classList.remove("hidden");
  $("adminPanel").classList.add("hidden");
  $("currentUserLabel").textContent = `${name} — ${id}`;
  renderRecords();
}

function loginAdmin() {
  const user = $("adminUsername").value.trim();
  const pass = $("adminPassword").value;
  if (user !== ADMIN_USER || pass !== ADMIN_PASS) return showToast("Invalid admin login.");
  isAdmin = true;
  currentUser = { name: "Administrator", id: "Admin" };
  $("loginPanel").classList.add("hidden");
  $("attendancePanel").classList.add("hidden");
  $("adminPanel").classList.remove("hidden");
  renderRecords();
}

function logoutAll() {
  currentUser = null;
  isAdmin = false;
  $("loginPanel").classList.remove("hidden");
  $("attendancePanel").classList.add("hidden");
  $("adminPanel").classList.add("hidden");
  renderRecords();
}

function findTodayRecord(records) {
  const today = manilaParts().date;
  return records.find(r => r.date === today && r.name === currentUser.name && r.employeeId === currentUser.id);
}

function logAttendance(action) {
  if (!currentUser || isAdmin) return;
  const now = manilaParts();
  const records = getRecords();
  let record = findTodayRecord(records);
  if (!record) {
    record = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      date: now.date,
      name: currentUser.name,
      employeeId: currentUser.id,
      amIn: "", amOut: "", pmIn: "", pmOut: "",
      timezone: "Asia/Manila",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    records.push(record);
  }
  if (record[action]) return showToast("This log already exists and cannot be changed by personnel.");
  record[action] = now.time;
  record.updatedAt = new Date().toISOString();
  saveRecords(records);
  renderRecords();
  showToast("Attendance recorded.");
}

function renderRecords() {
  const body = $("recordsBody");
  const term = ($("searchInput")?.value || "").toLowerCase();
  let records = getRecords();
  records = records.filter(r => `${r.date} ${r.name} ${r.employeeId}`.toLowerCase().includes(term));
  body.innerHTML = "";
  document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin));
  if (records.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="9">No attendance records found.</td>`;
    body.appendChild(tr);
    return;
  }
  records.sort((a,b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  for (const r of records) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${isAdmin ? editable(r.id,"date",r.date,"date") : r.date}</td>
      <td>${r.name}</td>
      <td>${r.employeeId}</td>
      <td>${isAdmin ? editable(r.id,"amIn",r.amIn) : r.amIn}</td>
      <td>${isAdmin ? editable(r.id,"amOut",r.amOut) : r.amOut}</td>
      <td>${isAdmin ? editable(r.id,"pmIn",r.pmIn) : r.pmIn}</td>
      <td>${isAdmin ? editable(r.id,"pmOut",r.pmOut) : r.pmOut}</td>
      <td>${r.timezone}</td>
      ${isAdmin ? `<td><button class="btn danger" onclick="deleteRecord('${r.id}')">Delete</button></td>` : ""}
    `;
    body.appendChild(tr);
  }
}

function editable(id, field, value, type="text") {
  return `<input class="editable" type="${type}" value="${value || ""}" onchange="updateRecord('${id}','${field}',this.value)" />`;
}

window.updateRecord = function(id, field, value) {
  if (!isAdmin) return showToast("Admin only.");
  const records = getRecords();
  const record = records.find(r => r.id === id);
  if (!record) return;
  record[field] = value;
  record.updatedAt = new Date().toISOString();
  saveRecords(records);
  showToast("Record updated by admin.");
};

window.deleteRecord = function(id) {
  if (!isAdmin) return showToast("Admin only.");
  if (!confirm("Delete this attendance record?")) return;
  saveRecords(getRecords().filter(r => r.id !== id));
  renderRecords();
  showToast("Record deleted.");
};

function exportCsv() {
  const records = getRecords();
  const headers = ["Date","Name","ID/Position","AM In","AM Out","PM In","PM Out","Time Zone"];
  const rows = records.map(r => [r.date,r.name,r.employeeId,r.amIn,r.amOut,r.pmIn,r.pmOut,r.timezone]);
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell || "").replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BES-Attendance-${manilaParts().date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

$("employeeLoginBtn").addEventListener("click", loginEmployee);
$("adminLoginBtn").addEventListener("click", loginAdmin);
$("logoutBtn").addEventListener("click", logoutAll);
$("adminLogoutBtn").addEventListener("click", logoutAll);
$("exportCsvBtn").addEventListener("click", exportCsv);
$("clearAllBtn").addEventListener("click", () => {
  if (!isAdmin) return;
  if (confirm("Clear all attendance records?")) { saveRecords([]); renderRecords(); showToast("All records cleared."); }
});
$("searchInput").addEventListener("input", renderRecords);
document.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", () => logAttendance(btn.dataset.action)));
renderRecords();
