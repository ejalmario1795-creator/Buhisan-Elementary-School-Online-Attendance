const recordsTable = document.getElementById('recordsTable');
const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const totalCount = document.getElementById('totalCount');
const completeCount = document.getElementById('completeCount');
const incompleteCount = document.getElementById('incompleteCount');
const currentDateDisplay = document.getElementById('currentDateDisplay');
const currentTimeDisplay = document.getElementById('currentTimeDisplay');
const liveClock = document.getElementById('liveClock');
const liveDate = document.getElementById('liveDate');
const timezoneDisplay = document.getElementById('timezoneDisplay');
const attendanceTimezoneDisplay = document.getElementById('attendanceTimezoneDisplay');
const locationStatus = document.getElementById('locationStatus');

const nameInput = document.getElementById('employeeName');
const roleInput = document.getElementById('role');
const remarksInput = document.getElementById('remarks');

const adminUsernameInput = document.getElementById('adminUsername');
const adminPasswordInput = document.getElementById('adminPassword');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const adminLoginBox = document.getElementById('adminLoginBox');
const adminLogoutBox = document.getElementById('adminLogoutBox');
const adminStatus = document.getElementById('adminStatus');

let records = JSON.parse(localStorage.getItem('buhisanAttendanceRecordsV4')) || [];
let isAdmin = sessionStorage.getItem('buhisanAttendanceAdmin') === 'true';

// Change these before publishing if needed. For real security, use Firebase/Auth or a backend server.
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'BES-ADMIN-2026';

const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila';

function getNow() {
  return new Date();
}

function formatDate(date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: detectedTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

function formatReadableDate(date) {
  return date.toLocaleDateString('en-PH', {
    timeZone: detectedTimeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-PH', {
    timeZone: detectedTimeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

function updateClock() {
  const now = getNow();
  currentDateDisplay.textContent = formatDate(now);
  currentTimeDisplay.textContent = formatTime(now);
  liveClock.textContent = formatTime(now);
  liveDate.textContent = formatReadableDate(now);
  timezoneDisplay.textContent = detectedTimeZone;
  attendanceTimezoneDisplay.textContent = detectedTimeZone;
}

function detectLocation() {
  if (!navigator.geolocation) {
    locationStatus.textContent = 'Geolocation is not supported by this browser. Using detected time zone only.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude.toFixed(5);
      const lon = position.coords.longitude.toFixed(5);
      locationStatus.textContent = `Location allowed. Coordinates: ${lat}, ${lon}. Clock uses browser time zone: ${detectedTimeZone}.`;
    },
    () => {
      locationStatus.textContent = `Location permission not allowed. Clock uses detected browser time zone: ${detectedTimeZone}.`;
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

function saveRecords() {
  localStorage.setItem('buhisanAttendanceRecordsV4', JSON.stringify(records));
}

function validateUserFields() {
  const name = nameInput.value.trim();
  const role = roleInput.value;

  if (!name) {
    alert('Please enter the full name.');
    nameInput.focus();
    return null;
  }

  if (!role) {
    alert('Please select the role / position.');
    roleInput.focus();
    return null;
  }

  return { name, role };
}

function findDailyRecord(name, date) {
  return records.find(record =>
    record.name.toLowerCase() === name.toLowerCase() && record.date === date
  );
}

function logAttendance(logType) {
  const user = validateUserFields();
  if (!user) return;

  const now = getNow();
  const today = formatDate(now);
  const currentTime = formatTime(now);
  const timestamp = now.toISOString();
  const remarks = remarksInput.value.trim();

  let record = findDailyRecord(user.name, today);

  if (!record) {
    record = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      date: today,
      name: user.name,
      role: user.role,
      amLogin: '',
      amLogout: '',
      pmLogin: '',
      pmLogout: '',
      timeZone: detectedTimeZone,
      remarks: '',
      timestamps: {},
      adminEdits: [],
      createdAt: timestamp
    };
    records.unshift(record);
  }

  if (record[logType]) {
    alert('This log already has a recorded time and cannot be changed by a regular user. Only the admin can adjust it.');
    return;
  }

  record.role = user.role;
  record.timeZone = detectedTimeZone;
  record[logType] = currentTime;
  record.timestamps[logType] = timestamp;

  if (remarks) {
    record.remarks = record.remarks ? `${record.remarks}; ${remarks}` : remarks;
  }

  record.updatedAt = timestamp;
  saveRecords();
  renderRecords();
  remarksInput.value = '';

  const label = {
    amLogin: 'A.M. Log In',
    amLogout: 'A.M. Log Out',
    pmLogin: 'P.M. Log In',
    pmLogout: 'P.M. Log Out'
  }[logType];

  alert(`${label} recorded for ${user.name} at ${currentTime} on ${today}.`);
}

function renderRecords() {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredRecords = records.filter(record =>
    record.name.toLowerCase().includes(searchTerm) ||
    record.role.toLowerCase().includes(searchTerm) ||
    record.date.includes(searchTerm) ||
    (record.timeZone || '').toLowerCase().includes(searchTerm) ||
    (record.remarks || '').toLowerCase().includes(searchTerm)
  );

  recordsTable.innerHTML = '';

  filteredRecords.forEach(record => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(record.date)}</td>
      <td>${escapeHtml(record.name)}</td>
      <td>${escapeHtml(record.role)}</td>
      <td>${escapeHtml(record.amLogin || '-')}</td>
      <td>${escapeHtml(record.amLogout || '-')}</td>
      <td>${escapeHtml(record.pmLogin || '-')}</td>
      <td>${escapeHtml(record.pmLogout || '-')}</td>
      <td>${escapeHtml(record.timeZone || '-')}</td>
      <td>${escapeHtml(record.remarks || '-')}</td>
      <td>${getActionButtons(record)}</td>
    `;
    recordsTable.appendChild(row);
  });

  updateStats();
}

function getActionButtons(record) {
  if (!isAdmin) {
    return '<span class="admin-only-note">Admin only</span>';
  }

  return `
    <button class="edit-btn" onclick="editRecord('${record.id}')">Edit</button>
    <button class="delete-btn" onclick="deleteRecord('${record.id}')">Delete</button>
  `;
}

function updateStats() {
  totalCount.textContent = records.length;
  completeCount.textContent = records.filter(isComplete).length;
  incompleteCount.textContent = records.filter(record => !isComplete(record)).length;
}

function isComplete(record) {
  return record.amLogin && record.amLogout && record.pmLogin && record.pmLogout;
}

function requireAdmin() {
  if (!isAdmin) {
    alert('Admin access is required for this action.');
    return false;
  }
  return true;
}

function editRecord(id) {
  if (!requireAdmin()) return;

  const record = records.find(item => item.id === id);
  if (!record) return;

  const original = JSON.stringify(record);
  const date = prompt('Edit Date (YYYY-MM-DD):', record.date) ?? record.date;
  const name = prompt('Edit Name:', record.name) ?? record.name;
  const role = prompt('Edit Role / Position:', record.role) ?? record.role;
  const amLogin = prompt('Edit A.M. Log In:', record.amLogin || '') ?? record.amLogin;
  const amLogout = prompt('Edit A.M. Log Out:', record.amLogout || '') ?? record.amLogout;
  const pmLogin = prompt('Edit P.M. Log In:', record.pmLogin || '') ?? record.pmLogin;
  const pmLogout = prompt('Edit P.M. Log Out:', record.pmLogout || '') ?? record.pmLogout;
  const remarks = prompt('Edit Remarks:', record.remarks || '') ?? record.remarks;

  if (!date.trim() || !name.trim() || !role.trim()) {
    alert('Date, name, and role cannot be blank.');
    return;
  }

  record.date = date.trim();
  record.name = name.trim();
  record.role = role.trim();
  record.amLogin = amLogin.trim();
  record.amLogout = amLogout.trim();
  record.pmLogin = pmLogin.trim();
  record.pmLogout = pmLogout.trim();
  record.remarks = remarks.trim();
  record.updatedAt = getNow().toISOString();
  record.adminEdits = record.adminEdits || [];
  record.adminEdits.push({
    editedAt: record.updatedAt,
    editedBy: ADMIN_USERNAME,
    previousRecord: JSON.parse(original)
  });

  saveRecords();
  renderRecords();
  alert('Attendance record updated by admin.');
}

function deleteRecord(id) {
  if (!requireAdmin()) return;

  if (confirm('Delete this attendance record? This action is for admin only.')) {
    records = records.filter(record => record.id !== id);
    saveRecords();
    renderRecords();
  }
}

function updateAdminUI() {
  if (isAdmin) {
    adminStatus.textContent = 'Admin access is unlocked. You may edit, delete, clear, and adjust attendance records.';
    adminStatus.classList.add('unlocked');
    adminLoginBox.classList.add('hidden');
    adminLogoutBox.classList.remove('hidden');
    clearBtn.disabled = false;
  } else {
    adminStatus.textContent = 'Admin access is locked. Regular users cannot edit, delete, clear, or adjust records.';
    adminStatus.classList.remove('unlocked');
    adminLoginBox.classList.remove('hidden');
    adminLogoutBox.classList.add('hidden');
    clearBtn.disabled = true;
  }
  renderRecords();
}

function adminLogin() {
  const username = adminUsernameInput.value.trim();
  const password = adminPasswordInput.value;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    isAdmin = true;
    sessionStorage.setItem('buhisanAttendanceAdmin', 'true');
    adminUsernameInput.value = '';
    adminPasswordInput.value = '';
    updateAdminUI();
    alert('Admin logged in successfully.');
  } else {
    alert('Invalid admin username or password.');
  }
}

function adminLogout() {
  isAdmin = false;
  sessionStorage.removeItem('buhisanAttendanceAdmin');
  updateAdminUI();
  alert('Admin logged out.');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.getElementById('amLoginBtn').addEventListener('click', () => logAttendance('amLogin'));
document.getElementById('amLogoutBtn').addEventListener('click', () => logAttendance('amLogout'));
document.getElementById('pmLoginBtn').addEventListener('click', () => logAttendance('pmLogin'));
document.getElementById('pmLogoutBtn').addEventListener('click', () => logAttendance('pmLogout'));

adminLoginBtn.addEventListener('click', adminLogin);
adminLogoutBtn.addEventListener('click', adminLogout);
adminPasswordInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') adminLogin();
});

searchInput.addEventListener('input', renderRecords);

exportBtn.addEventListener('click', () => {
  if (records.length === 0) {
    alert('No records to export.');
    return;
  }

  const headers = ['Date', 'Name', 'Role', 'AM Login', 'AM Logout', 'PM Login', 'PM Logout', 'Time Zone', 'Remarks', 'Last Updated'];
  const rows = records.map(record => [
    record.date,
    record.name,
    record.role,
    record.amLogin,
    record.amLogout,
    record.pmLogin,
    record.pmLogout,
    record.timeZone,
    record.remarks,
    record.updatedAt || record.createdAt
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `buhisan-attendance-${formatDate(getNow())}.csv`;
  link.click();
});

clearBtn.addEventListener('click', () => {
  if (!requireAdmin()) return;

  if (confirm('This will permanently clear all records in this browser. Continue?')) {
    records = [];
    saveRecords();
    renderRecords();
  }
});

updateClock();
detectLocation();
setInterval(updateClock, 1000);
updateAdminUI();
