const ADMIN_EMAIL = "ejalmario1795@gmail.com";
const SHEET_NAME = "Attendance Logs";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Timestamp Received",
        "Date",
        "Time",
        "Name",
        "Email",
        "Position",
        "Action",
        "Time Zone",
        "User Agent"
      ]);
    }

    sheet.appendRow([
      new Date(),
      data.date || "",
      data.time || "",
      data.name || "",
      data.email || "",
      data.position || "",
      data.action || "",
      data.timezone || "Asia/Manila",
      data.userAgent || ""
    ]);

    sendLogEmail(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendLogEmail(data) {
  const subject = "BES Attendance Log - " + (data.name || "Personnel") + " - " + (data.date || "");
  const body =
    "Buhisan Elementary School Online Attendance\n\n" +
    "Name: " + (data.name || "") + "\n" +
    "Position: " + (data.position || "") + "\n" +
    "Email: " + (data.email || "") + "\n" +
    "Date: " + (data.date || "") + "\n" +
    "Time: " + (data.time || "") + "\n" +
    "Action: " + (data.action || "") + "\n" +
    "Time Zone: " + (data.timezone || "Asia/Manila") + "\n\n" +
    "This is an automated attendance confirmation.";

  const recipients = [];
  if (data.email) recipients.push(data.email);
  recipients.push(ADMIN_EMAIL);

  MailApp.sendEmail({
    to: recipients.join(","),
    subject: subject,
    body: body
  });
}

function sendDailyAdminSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  const today = Utilities.formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd");
  const rows = values.slice(1).filter(row => String(row[1]) === today);

  let body = "Buhisan Elementary School Daily Attendance Summary\n";
  body += "Date: " + today + "\n\n";

  if (rows.length === 0) {
    body += "No attendance logs recorded today.";
  } else {
    rows.forEach(row => {
      body += row[3] + " | " + row[5] + " | " + row[6] + " | " + row[2] + "\n";
    });
  }

  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: "BES Daily Attendance Summary - " + today,
    body: body
  });
}
