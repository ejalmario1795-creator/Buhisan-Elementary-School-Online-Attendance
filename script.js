const ADMIN_USER = "admin";
const ADMIN_PASS = "BES-ADMIN-2026";
const STORAGE_KEY = "bes_attendance_records_v3";
let currentUser = null;
let isAdmin = false;

function byId(id){ return document.getElementById(id); }

function manilaParts(dateObj){
  const date = dateObj || new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  });
  const partsArray = formatter.formatToParts(date);
  const parts = {};
  partsArray.forEach(function(p){ parts[p.type] = p.value; });
  return {
    date: parts.year + "-" + parts.month + "-" + parts.day,
    displayDate: parts.month + "/" + parts.day + "/" + parts.year,
    time: parts.hour + ":" + parts.minute + ":" + parts.second + " " + parts.dayPeriod
  };
}

function updateClock(){
  const now = manilaParts();
  byId("liveDate").textContent = now.displayDate;
  byId("liveClock").textContent = now.time;
}

function getRecords(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch(e){ return []; }
}
function saveRecords(records){ localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }

function showToast(message){
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(function(){ toast.classList.add("hidden"); }, 2500);
}

function makeId(){
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now()) + String(Math.floor(Math.random()*100000));
}

function loginEmployee(){
  const name = byId("employeeName").value.trim();
  const id = byId("employeeId").value.trim();
  if (!name || !id){ showToast("Please enter employee name and ID/position."); return; }
  currentUser = { name: name, id: id };
  isAdmin = false;
  byId("loginPanel").classList.add("hidden");
  byId("attendancePanel").classList.remove("hidden");
  byId("adminPanel").classList.add("hidden");
  byId("currentUserLabel").textContent = name + " - " + id;
  renderRecords();
}

function loginAdmin(){
  const user = byId("adminUsername").value.trim();
  const pass = byId("adminPassword").value;
  if (user !== ADMIN_USER || pass !== ADMIN_PASS){ showToast("Invalid admin login."); return; }
  isAdmin = true;
  currentUser = { name: "Administrator", id: "Admin" };
  byId("loginPanel").classList.add("hidden");
  byId("attendancePanel").classList.add("hidden");
  byId("adminPanel").classList.remove("hidden");
  renderRecords();
}

function logoutAll(){
  currentUser = null;
  isAdmin = false;
  byId("loginPanel").classList.remove("hidden");
  byId("attendancePanel").classList.add("hidden");
  byId("adminPanel").classList.add("hidden");
  renderRecords();
}

function findTodayRecord(records){
  const today = manilaParts().date;
  for (let i=0; i<records.length; i++){
    if (records[i].date === today && records[i].name === currentUser.name && records[i].employeeId === currentUser.id){
      return records[i];
    }
  }
  return null;
}

function logAttendance(action){
  if (!currentUser || isAdmin) return;
  const now = manilaParts();
  const records = getRecords();
  let record = findTodayRecord(records);
  if (!record){
    record = { id: makeId(), date: now.date, name: currentUser.name, employeeId: currentUser.id, amIn: "", amOut: "", pmIn: "", pmOut: "", timezone: "Asia/Manila", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    records.push(record);
  }
  if (record[action]){ showToast("This log already exists and cannot be changed by personnel."); return; }
  record[action] = now.time;
  record.updatedAt = new Date().toISOString();
  saveRecords(records);
  renderRecords();
  showToast("Attendance recorded.");
}

function escapeHtml(value){
  return String(value || "").replace(/[&<>'"]/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c];
  });
}

function editable(id, field, value, type){
  const inputType = type || "text";
  return '<input class="editable" type="' + inputType + '" value="' + escapeHtml(value) + '" onchange="updateRecord(\'' + id + '\',\'' + field + '\',this.value)">';
}

function renderRecords(){
  const body = byId("recordsBody");
  const search = byId("searchInput");
  const term = search ? search.value.toLowerCase() : "";
  let records = getRecords();
  records = records.filter(function(r){
    return (r.date + " " + r.name + " " + r.employeeId).toLowerCase().indexOf(term) !== -1;
  });
  body.innerHTML = "";
  document.querySelectorAll(".admin-only").forEach(function(el){ el.classList.toggle("hidden", !isAdmin); });
  if (records.length === 0){
    body.innerHTML = '<tr><td colspan="9">No attendance records found.</td></tr>';
    return;
  }
  records.sort(function(a,b){ return b.date.localeCompare(a.date) || a.name.localeCompare(b.name); });
  records.forEach(function(r){
    const tr = document.createElement("tr");
    let html = "";
    html += "<td>" + (isAdmin ? editable(r.id,"date",r.date,"date") : escapeHtml(r.date)) + "</td>";
    html += "<td>" + escapeHtml(r.name) + "</td>";
    html += "<td>" + escapeHtml(r.employeeId) + "</td>";
    html += "<td>" + (isAdmin ? editable(r.id,"amIn",r.amIn) : escapeHtml(r.amIn)) + "</td>";
    html += "<td>" + (isAdmin ? editable(r.id,"amOut",r.amOut) : escapeHtml(r.amOut)) + "</td>";
    html += "<td>" + (isAdmin ? editable(r.id,"pmIn",r.pmIn) : escapeHtml(r.pmIn)) + "</td>";
    html += "<td>" + (isAdmin ? editable(r.id,"pmOut",r.pmOut) : escapeHtml(r.pmOut)) + "</td>";
    html += "<td>" + escapeHtml(r.timezone) + "</td>";
    if (isAdmin) html += '<td><button class="btn danger" onclick="deleteRecord(\'' + r.id + '\')">Delete</button></td>';
    tr.innerHTML = html;
    body.appendChild(tr);
  });
}

window.updateRecord = function(id, field, value){
  if (!isAdmin){ showToast("Admin only."); return; }
  const records = getRecords();
  const record = records.find(function(r){ return r.id === id; });
  if (!record) return;
  record[field] = value;
  record.updatedAt = new Date().toISOString();
  saveRecords(records);
  showToast("Record updated by admin.");
};

window.deleteRecord = function(id){
  if (!isAdmin){ showToast("Admin only."); return; }
  if (!confirm("Delete this attendance record?")) return;
  const records = getRecords().filter(function(r){ return r.id !== id; });
  saveRecords(records);
  renderRecords();
  showToast("Record deleted.");
};

function csvEscape(value){ return '"' + String(value || "").replace(/"/g, '""') + '"'; }
function exportCsv(){
  function printPdf(){
  window.print();
}
  const records = getRecords();
  const rows = [["Date","Name","ID/Position","AM In","AM Out","PM In","PM Out","Time Zone"]];
  records.forEach(function(r){ rows.push([r.date,r.name,r.employeeId,r.amIn,r.amOut,r.pmIn,r.pmOut,r.timezone]); });
  const csv = rows.map(function(row){ return row.map(csvEscape).join(","); }).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "BES-Attendance-" + manilaParts().date + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

function setup(){
  updateClock();
  setInterval(updateClock, 1000);
  byId("employeeLoginBtn").addEventListener("click", loginEmployee);
  byId("adminLoginBtn").addEventListener("click", loginAdmin);
  byId("logoutBtn").addEventListener("click", logoutAll);
  byId("adminLogoutBtn").addEventListener("click", logoutAll);
  byId("exportCsvBtn").addEventListener("click", exportCsv);
  byId("printPdfBtn").addEventListener("click", printPdf);
  byId("clearAllBtn").addEventListener("click", function(){
    if (!isAdmin) return;
    if (confirm("Clear all attendance records?")){
      saveRecords([]);
      renderRecords();
      showToast("All records cleared.");
    }
  });
  byId("searchInput").addEventListener("input", renderRecords);
  document.querySelectorAll("[data-action]").forEach(function(btn){
    btn.addEventListener("click", function(){ logAttendance(btn.getAttribute("data-action")); });
  });
  renderRecords();
}

document.addEventListener("DOMContentLoaded", setup);
