// STEP 1: Replace this URL after deploying your Google Apps Script Web App.
const GOOGLE_SCRIPT_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

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

function showToast(message){
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(function(){ toast.classList.add("hidden"); }, 3000);
}

function validateEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function submitAttendance(action){
  const name = byId("employeeName").value.trim();
  const email = byId("employeeEmail").value.trim();
  const position = byId("employeePosition").value.trim();
  const now = manilaParts();

  if (!name || !email || !position){ showToast("Please complete name, email, and position."); return; }
  if (!validateEmail(email)){ showToast("Please enter a valid email address."); return; }
  if (GOOGLE_SCRIPT_URL.indexOf("PASTE_YOUR") !== -1){
    showToast("Please set your Google Apps Script Web App URL in script.js first.");
    return;
  }

  const payload = {
    name: name,
    email: email,
    position: position,
    action: action,
    date: now.date,
    time: now.time,
    timezone: "Asia/Manila",
    userAgent: navigator.userAgent
  };

  byId("statusText").textContent = "Submitting attendance...";

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    byId("statusText").textContent = action + " submitted for " + name + " on " + now.date + " at " + now.time + ".";
    showToast("Attendance submitted successfully.");
  } catch (error) {
    byId("statusText").textContent = "Submission failed. Please check internet connection or Apps Script URL.";
    showToast("Submission failed.");
  }
}

function setup(){
  updateClock();
  setInterval(updateClock, 1000);
  document.querySelectorAll("[data-action]").forEach(function(btn){
    btn.addEventListener("click", function(){ submitAttendance(btn.getAttribute("data-action")); });
  });
}

document.addEventListener("DOMContentLoaded", setup);
