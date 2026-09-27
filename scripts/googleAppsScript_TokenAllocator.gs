/**
 * HOLISTIC EDGE — GOOGLE APPS SCRIPT TOKEN ALLOCATOR
 * ==================================================
 * Dedicated Google Apps Script Web App for globally serialized patient registration
 * token allocation across all Vercel serverless function instances worldwide.
 *
 * Deployment Instructions:
 * 1. Open your Google Spreadsheet (Holistic Edge Master Data Sheet).
 * 2. Click Extensions > Apps Script.
 * 3. Paste this file content into Code.gs.
 * 4. Ensure a tab named "SYSTEM_COUNTERS" exists with headers:
 *    CounterKey | SequenceValue | LockId | LockTimestamp | UpdatedAt
 * 5. Click Deploy > New deployment.
 * 6. Select "Web App":
 *    - Execute as: Me
 *    - Who has access: Anyone (Requests are authenticated via secret token header/param)
 * 7. Copy the Web App URL and set APPS_SCRIPT_ALLOCATOR_URL in Vercel.
 * 8. Set APPS_SCRIPT_ALLOCATOR_SECRET in Vercel to match ALLOCATOR_SECRET below.
 */

var ALLOCATOR_SECRET = "HE_SECURE_TOKEN_ALLOCATOR_2026_SECRET_KEY";

function doPost(e) {
  try {
    var contents = {};
    if (e && e.postData && e.postData.contents) {
      try {
        contents = JSON.parse(e.postData.contents);
      } catch (err) {}
    }

    var providedSecret = (e && e.parameter && e.parameter.secret) || contents.secret || (e && e.headers && e.headers['x-allocator-secret']);
    if (!providedSecret || providedSecret !== ALLOCATOR_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Unauthorized: Invalid or missing allocator secret header"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Acquire Google Apps Script native lock across all global executions
    var lock = LockService.getScriptLock();
    var success = lock.waitLock(10000); // 10-second timeout

    if (!success) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Lock Timeout: Could not acquire script lock within 10 seconds"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("SYSTEM_COUNTERS");

      if (!sheet) {
        sheet = ss.insertSheet("SYSTEM_COUNTERS");
        sheet.appendRow(["CounterKey", "SequenceValue", "LockId", "LockTimestamp", "UpdatedAt"]);
      }

      var data = sheet.getDataRange().getValues();
      var patientRowIndex = -1;
      var currentSeq = 0;

      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === "PATIENT_REGISTRATION_TOKEN") {
          patientRowIndex = i + 1; // 1-based index
          currentSeq = parseInt(data[i][1], 10) || 0;
          break;
        }
      }

      // If counter row doesn't exist yet, scan PATIENTS tab for max existing sequence
      if (patientRowIndex === -1 || currentSeq === 0) {
        var patientsSheet = ss.getSheetByName("PATIENTS");
        if (patientsSheet) {
          var patientData = patientsSheet.getDataRange().getValues();
          for (var p = 1; p < patientData.length; p++) {
            var token = patientData[p][1];
            if (token && typeof token === "string" && token.indexOf("HE-") === 0) {
              var num = parseInt(token.replace("HE-", ""), 10);
              if (!isNaN(num) && num > currentSeq) {
                currentSeq = num;
              }
            }
          }
        }
      }

      var nextSeq = currentSeq + 1;
      var reservedToken = "HE-" + ("000000" + nextSeq).slice(-6);
      var nowIso = new Date().toISOString();

      if (patientRowIndex !== -1) {
        sheet.getRange(patientRowIndex, 2).setValue(nextSeq);
        sheet.getRange(patientRowIndex, 5).setValue(nowIso);
      } else {
        sheet.appendRow(["PATIENT_REGISTRATION_TOKEN", nextSeq, "", "", nowIso]);
      }

      // Flush changes immediately to Google Sheets storage engine
      SpreadsheetApp.flush();

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        token: reservedToken,
        sequence: nextSeq,
        timestamp: nowIso
      })).setMimeType(ContentService.MimeType.JSON);

    } finally {
      lock.releaseLock();
    }

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
