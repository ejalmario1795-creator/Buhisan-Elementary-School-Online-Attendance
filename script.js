const form = document.getElementById('attendanceForm');
const recordsTable = document.getElementById('recordsTable');
const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const totalCount = document.getElementById('totalCount');
const presentCount = document.getElementById('presentCount');
const lateCount = document.getElementById('lateCount');
const dateInput = document.getElementById('date');

let records = JSON.parse(localStorage.getItem('buhisanAttendanceRecords')) || [];

dateInput.valueAsDate = new Date();

function saveRecords() {
  localStorage.setItem('buhisanAttendanceRecords', JSON.stringify(records));
}

function renderRecords() {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredRecords = records.filter(record =>
    record.name.toLowerCase().includes(searchTerm) ||
    record.role.toLowerCase().includes(searchTerm) ||
    record.status.toLowerCase().includes(searchTerm) ||
    record.date.includes(searchTerm)
  );

  recordsTable.innerHTML = '';

  filteredRecords.forEach((record, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${record.date}</td>
      <td>${record.name}</td>
      <td>${record.role}</td>
      <td>${record.timeIn}</td>
      <td>${record.timeOut || '-'}</td>
      <td>${record.status}</td>
      <td>${record.remarks || '-'}</td>
      <td><button class="delete-btn" onclick="deleteRecord(${index})">Delete</button></td>
    `;
    recordsTable.appendChild(row);
  });

  updateStats();
}

function updateStats() {
  totalCount.textContent = records.length;
  presentCount.textContent = records.filter(r => r.status === 'Present').length;
  lateCount.textContent = records.filter(r => r.status === 'Late').length;
}

function deleteRecord(index) {
  if (confirm('Delete this attendance record?')) {
    records.splice(index, 1);
    saveRecords();
    renderRecords();
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();

  const record = {
    name: document.getElementById('employeeName').value.trim(),
    role: document.getElementById('role').value,
    date: document.getElementById('date').value,
    timeIn: document.getElementById('timeIn').value,
    timeOut: document.getElementById('timeOut').value,
    status: document.getElementById('status').value,
    remarks: document.getElementById('remarks').value.trim(),
    createdAt: new Date().toISOString()
  };

  records.unshift(record);
  saveRecords();
  form.reset();
  dateInput.valueAsDate = new Date();
  renderRecords();
});

searchInput.addEventListener('input', renderRecords);

exportBtn.addEventListener('click', () => {
  if (records.length === 0) {
    alert('No records to export.');
    return;
  }

  const headers = ['Date', 'Name', 'Role', 'Time In', 'Time Out', 'Status', 'Remarks'];
  const rows = records.map(record => [
    record.date,
    record.name,
    record.role,
    record.timeIn,
    record.timeOut,
    record.status,
    record.remarks
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `buhisan-attendance-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
});

clearBtn.addEventListener('click', () => {
  if (confirm('This will permanently clear all records in this browser. Continue?')) {
    records = [];
    saveRecords();
    renderRecords();
  }
});

renderRecords();
