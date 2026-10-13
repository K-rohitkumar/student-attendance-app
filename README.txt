CLASSMATE STUDENT ATTENDANCE — QUICK START

WHAT IS INCLUDED
- index.html: the app screen
- styles.css: mobile-friendly design
- app.js: batches, students, attendance, exports and local storage
- manifest.json and service-worker.js: install/offline support when hosted securely

FEATURES
- Add as many batches and students as needed
- Add one student or paste multiple students (one per line; optionally use Roll No, Name)
- Toggle each student's Present/Absent status
- Mark all present, then toggle absent students
- Copy/share an absent-only report to WhatsApp
- Export absent-only text list
- Export one batch to Excel (.xlsx)
- Export all batches in one Excel workbook, with an All Students sheet and a separate sheet per batch
- Backup/restore all records as JSON
- Local-only storage; no account or server database

QUICK TEST
1. Extract this ZIP.
2. Open index.html in a modern browser.
3. Create a batch, add students and test attendance.

IMPORTANT FOR INSTALLING ON BOTH ANDROID AND IPHONE
For a proper home-screen install and reliable offline app caching, these files must be served once from a secure HTTPS website. This is a one-time hosting step; it is not yet published in the Google Play Store or Apple App Store. Opening index.html directly is suitable for a quick test, but browser security restrictions may prevent service-worker installation and some local-file behavior.

DATA SAFETY
Attendance data is stored in the browser's local storage on the device/browser where you use the app. It does not automatically sync to another phone. Use “Download full backup (JSON)” regularly and keep that backup somewhere safe. Clearing browser data may delete records.

EXCEL EXPORT
The app creates genuine .xlsx workbooks locally in the browser without requiring an internet connection or an external spreadsheet library.
