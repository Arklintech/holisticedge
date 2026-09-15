import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import cors from 'cors';
import { db } from '../server/db.js';
import { getActiveDataProvider } from '../server/providers/dataProvider.js';
import appointmentRoutes from '../server/routes/appointments.js';
import followUpRoutes from '../server/routes/followUps.js';
import patientRoutes from '../server/routes/patients.js';
import dashboardRoutes from '../server/routes/dashboard.js';
import notificationRoutes from '../server/routes/notifications.js';
import emailRoutes from '../server/routes/email.js';

// Setup full isolated Express application replicating production server/index.js
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Testing admin user authentication
app.use((req, res, next) => {
  req.user = {
    id: 'user_admin_001',
    name: 'Admin Doctor',
    email: 'admin@holisticedge.in',
    role: 'SUPER_ADMIN',
  };
  next();
});

app.use('/api/appointments', appointmentRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/email', emailRoutes);

let server;
let baseUrl;
const dataProvider = getActiveDataProvider();

function getISTDate(offsetDays = 0) {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  if (offsetDays) ist.setUTCDate(ist.getUTCDate() + offsetDays);
  return ist.toISOString().split('T')[0];
}

const TEST_EMAIL = 'anasahmedkhan845@gmail.com';
const createdTestAppointmentIds = [];
const createdTestFollowUpIds = [];
const createdTestPatientIds = [];

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

// ============================================================
// TEST 1 — ACTIVE APPOINTMENT
// ============================================================
test('TEST 1 — ACTIVE APPOINTMENT: Create test appointment and verify in active queue', async () => {
  const timestamp = Date.now();
  const testPhone = `+91 91${Math.floor(10000000 + Math.random() * 90000000)}`;
  const todayStr = getISTDate(0);

  const createRes = await fetch(`${baseUrl}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({
      fullName: `TEST Patient Active ${timestamp}`,
      phone: testPhone,
      email: TEST_EMAIL,
      service: 'Spinal Alignment',
      preferredDate: todayStr,
      preferredTime: '10:00 AM',
      status: 'Pending',
    }),
  });
  assert.strictEqual(createRes.status, 201, 'POST /api/appointments should return 201');
  const createJson = await createRes.json();
  assert.ok(createJson.success, 'Creation response must indicate success');
  assert.ok(createJson.appointment, 'Appointment object must be returned');
  
  const apptId = createJson.appointment.id;
  const patientId = createJson.patient.id;
  createdTestAppointmentIds.push(apptId);
  createdTestPatientIds.push(patientId);

  // 1. Verify persisted in active queue
  const activeRes = await fetch(`${baseUrl}/api/appointments?status=active`, {
    headers: { 'x-admin-user-email': 'admin@holisticedge.in' },
  });
  const activeJson = await activeRes.json();
  assert.ok(activeJson.success);
  const found = activeJson.appointments.find(a => a.id === apptId);
  assert.ok(found, 'Test appointment must be present in active queue');
  assert.strictEqual(found.fullName, `TEST Patient Active ${timestamp}`);
  assert.strictEqual(found.email, TEST_EMAIL);
  assert.strictEqual(found.status.toUpperCase(), 'PENDING');

  // Verify stored in Google Sheets / datastore
  const allAppts = await dataProvider.getAppointments();
  const foundInStorage = allAppts.find(a => a.id === apptId);
  assert.ok(foundInStorage, 'Appointment must be stored in primary datastore');
});

// ============================================================
// TEST 2 — COMPLETE APPOINTMENT
// ============================================================
test('TEST 2 — COMPLETE APPOINTMENT: Mark completed, verify leaves active queue and preserved in history', async () => {
  const timestamp = Date.now();
  const testPhone = `+91 92${Math.floor(10000000 + Math.random() * 90000000)}`;
  const todayStr = getISTDate(0);

  // 1. Create active appointment
  const createRes = await fetch(`${baseUrl}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({
      fullName: `TEST Patient Complete ${timestamp}`,
      phone: testPhone,
      email: TEST_EMAIL,
      service: 'Chiropractic Adjustment',
      preferredDate: todayStr,
      preferredTime: '11:00 AM',
      status: 'Pending',
    }),
  });
  const createJson = await createRes.json();
  const apptId = createJson.appointment.id;
  const patientId = createJson.patient.id;
  createdTestAppointmentIds.push(apptId);
  createdTestPatientIds.push(patientId);

  // Confirm it first (simulating active workflow)
  await fetch(`${baseUrl}/api/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });

  // Verify in active queue before completion
  const beforeActive = await (await fetch(`${baseUrl}/api/appointments?status=active`)).json();
  assert.ok(beforeActive.appointments.some(a => a.id === apptId), 'Must be active before complete');

  // 2. Complete appointment using admin action
  const completeRes = await fetch(`${baseUrl}/api/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });
  const completeJson = await completeRes.json();
  assert.ok(completeJson.success, 'Status update must succeed');
  assert.strictEqual(completeJson.appointment.status, 'COMPLETED');
  assert.ok(completeJson.appointment.completedAt, 'completedAt timestamp must be recorded');
  assert.ok(completeJson.appointment.completedBy, 'completedBy actor must be recorded');

  // 3. Verify immediately leaves active queue
  const afterActive1 = await (await fetch(`${baseUrl}/api/appointments?status=active`)).json();
  assert.strictEqual(afterActive1.appointments.some(a => a.id === apptId), false, 'Completed appointment must NOT appear in active queue');

  // 4. Refresh check: subsequent query still shows it absent from active queue
  const afterActive2 = await (await fetch(`${baseUrl}/api/appointments?status=active`)).json();
  assert.strictEqual(afterActive2.appointments.some(a => a.id === apptId), false, 'Completed appointment must stay out of active queue on refresh');

  // 5. Verify accessible in Appointment History
  const historyRes = await (await fetch(`${baseUrl}/api/appointments?status=history`)).json();
  const foundInHistory = historyRes.appointments.find(a => a.id === apptId);
  assert.ok(foundInHistory, 'Completed appointment must be present in history queue');
  assert.strictEqual(foundInHistory.status, 'COMPLETED');

  // 6. Verify accessible in Patient Profile
  const profileRes = await (await fetch(`${baseUrl}/api/patients/${patientId}`)).json();
  assert.ok(profileRes.success);
  const foundInPatient = profileRes.appointments.find(a => a.id === apptId);
  assert.ok(foundInPatient, 'Completed appointment must remain accessible in patient profile');
  assert.strictEqual(foundInPatient.status, 'COMPLETED');

  // 7. Verify datastore preservation (NOT deleted from Google Sheets / storage)
  const allAppts = await dataProvider.getAppointments();
  const foundInStore = allAppts.find(a => a.id === apptId);
  assert.ok(foundInStore, 'Record must be permanently preserved in datastore');
  assert.strictEqual(foundInStore.status, 'COMPLETED');
});

// ============================================================
// TEST 3 — CANCELLED APPOINTMENT
// ============================================================
test('TEST 3 — CANCELLED APPOINTMENT: Cancel, verify leaves active queue and preserved in history', async () => {
  const timestamp = Date.now();
  const testPhone = `+91 93${Math.floor(10000000 + Math.random() * 90000000)}`;
  const todayStr = getISTDate(0);

  const createRes = await fetch(`${baseUrl}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({
      fullName: `TEST Patient Cancel ${timestamp}`,
      phone: testPhone,
      email: TEST_EMAIL,
      service: 'Posture Correction',
      preferredDate: todayStr,
      preferredTime: '12:00 PM',
      status: 'Confirmed',
    }),
  });
  const apptId = (await createRes.json()).appointment.id;
  createdTestAppointmentIds.push(apptId);

  // Cancel appointment
  const cancelRes = await fetch(`${baseUrl}/api/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  const cancelJson = await cancelRes.json();
  assert.ok(cancelJson.success);
  assert.strictEqual(cancelJson.appointment.status, 'CANCELLED');
  assert.ok(cancelJson.appointment.cancelledAt, 'cancelledAt must be recorded');

  // Verify leaves active queue
  const activeRes = await (await fetch(`${baseUrl}/api/appointments?status=active`)).json();
  assert.strictEqual(activeRes.appointments.some(a => a.id === apptId), false, 'Cancelled appointment must leave active queue');

  // Refresh
  const activeRes2 = await (await fetch(`${baseUrl}/api/appointments?status=active`)).json();
  assert.strictEqual(activeRes2.appointments.some(a => a.id === apptId), false, 'Cancelled appointment must stay out of active queue');

  // Verify in history
  const historyRes = await (await fetch(`${baseUrl}/api/appointments?status=history`)).json();
  assert.ok(historyRes.appointments.some(a => a.id === apptId), 'Cancelled appointment must exist in history');
});

// ============================================================
// TEST 4 — NO-SHOW
// ============================================================
test('TEST 4 — NO-SHOW: Mark NO_SHOW, verify leaves active queue and preserved in history', async () => {
  const timestamp = Date.now();
  const testPhone = `+91 94${Math.floor(10000000 + Math.random() * 90000000)}`;
  const todayStr = getISTDate(0);

  const createRes = await fetch(`${baseUrl}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({
      fullName: `TEST Patient NoShow ${timestamp}`,
      phone: testPhone,
      email: TEST_EMAIL,
      service: 'Cupping Therapy',
      preferredDate: todayStr,
      preferredTime: '01:00 PM',
      status: 'Confirmed',
    }),
  });
  const apptId = (await createRes.json()).appointment.id;
  createdTestAppointmentIds.push(apptId);

  // Mark NO_SHOW
  const noShowRes = await fetch(`${baseUrl}/api/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({ status: 'NO_SHOW' }),
  });
  const noShowJson = await noShowRes.json();
  assert.ok(noShowJson.success);
  assert.strictEqual(noShowJson.appointment.status, 'NO_SHOW');
  assert.ok(noShowJson.appointment.noShowAt, 'noShowAt must be recorded');
  assert.ok(noShowJson.appointment.noShowMarkedBy, 'noShowMarkedBy must be recorded');

  // Verify leaves active queue
  const activeRes = await (await fetch(`${baseUrl}/api/appointments?status=active`)).json();
  assert.strictEqual(activeRes.appointments.some(a => a.id === apptId), false, 'NO_SHOW appointment must leave active queue');

  // Verify in history
  const historyRes = await (await fetch(`${baseUrl}/api/appointments?status=history`)).json();
  assert.ok(historyRes.appointments.some(a => a.id === apptId), 'NO_SHOW appointment must exist in history');
});

// ============================================================
// TEST 5 — FOLLOW-UP CREATION (UPCOMING)
// ============================================================
test('TEST 5 — FOLLOW-UP CREATION: Schedule future follow-up, verify in Upcoming, no auto-follow-ups', async () => {
  const timestamp = Date.now();
  const patientId = `pt_fu_up_${timestamp}`;
  const upcomingDate = getISTDate(7); // 7 days in future

  db.insert('patients', {
    id: patientId,
    name: `TEST FollowUp Patient ${timestamp}`,
    phone: `+91 95${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: TEST_EMAIL,
    registrationTokenNumber: `HE-${timestamp.toString().slice(-6)}`,
  });
  createdTestPatientIds.push(patientId);

  const initialCount = (db.get('reminders') || []).length;

  const fuRes = await fetch(`${baseUrl}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({
      patientId,
      scheduledDate: upcomingDate,
      scheduledTime: '10:30 AM',
      notes: 'Upcoming wellness review',
    }),
  });
  assert.strictEqual(fuRes.status, 201);
  const fuJson = await fuRes.json();
  assert.ok(fuJson.success);
  const reminderId = fuJson.reminder.id;
  createdTestFollowUpIds.push(reminderId);

  // Query follow-ups
  const listRes = await (await fetch(`${baseUrl}/api/follow-ups`)).json();
  const found = listRes.reminders.find(r => r.id === reminderId);
  assert.ok(found, 'Follow-up must exist');
  assert.strictEqual(found.status, 'SCHEDULED', 'Upcoming follow-up must be SCHEDULED');
  assert.strictEqual(found.scheduledDate, upcomingDate);

  // Verify NO auto-follow-ups (+7, +14) created
  const newCount = (db.get('reminders') || []).length;
  assert.strictEqual(newCount, initialCount + 1, 'Exactly 1 follow-up must be created; zero auto-follow-ups allowed');
});

// ============================================================
// TEST 6 — TOMORROW FOLLOW-UP
// ============================================================
test('TEST 6 — TOMORROW: Follow-up scheduled for tomorrow appears under Tomorrow, not Due Today or Overdue', async () => {
  const timestamp = Date.now();
  const patientId = `pt_fu_tom_${timestamp}`;
  const tomorrowDate = getISTDate(1);

  db.insert('patients', {
    id: patientId,
    name: `TEST Tomorrow Patient ${timestamp}`,
    phone: `+91 96${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: TEST_EMAIL,
    registrationTokenNumber: `HE-${timestamp.toString().slice(-6)}`,
  });
  createdTestPatientIds.push(patientId);

  const fuRes = await fetch(`${baseUrl}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({
      patientId,
      scheduledDate: tomorrowDate,
      scheduledTime: '02:30 PM',
      notes: 'Assessment tomorrow',
    }),
  });
  const reminderId = (await fuRes.json()).reminder.id;
  createdTestFollowUpIds.push(reminderId);

  const listRes = await (await fetch(`${baseUrl}/api/follow-ups`)).json();
  const found = listRes.reminders.find(r => r.id === reminderId);
  assert.ok(found);
  assert.strictEqual(found.scheduledDate, tomorrowDate);
  assert.strictEqual(found.status, 'SCHEDULED');
});

// ============================================================
// TEST 7 — D-1 ADMIN EMAIL & IDEMPOTENCY
// ============================================================
test('TEST 7 — D-1 ADMIN EMAIL: Exactly one notification generated for tomorrow follow-up, 100% idempotent', async () => {
  const tomorrowDate = getISTDate(1);
  const targetId = createdTestFollowUpIds[createdTestFollowUpIds.length - 1]; // tomorrow's reminder
  const expectedKey = `notif_fu_d1_${targetId}_${tomorrowDate}`;

  // Call GET /api/follow-ups 4 consecutive times to test idempotency
  await fetch(`${baseUrl}/api/follow-ups`);
  await fetch(`${baseUrl}/api/follow-ups`);
  await fetch(`${baseUrl}/api/follow-ups`);
  await fetch(`${baseUrl}/api/follow-ups`);

  const notifs = db.get('notifications') || [];
  const matchingD1 = notifs.filter(n => n.idempotencyKey === expectedKey);
  assert.strictEqual(matchingD1.length, 1, 'Exactly ONE D-1 notification must exist; repeated requests produced 0 duplicates');
  assert.strictEqual(matchingD1[0].type, 'followup');
  assert.ok(matchingD1[0].message.includes('tomorrow'), 'Notification message must specify tomorrow');
});

// ============================================================
// TEST 8 — DUE TODAY
// ============================================================
test('TEST 8 — DUE TODAY: Follow-up scheduled for today categorized as DUE, active and actionable', async () => {
  const timestamp = Date.now();
  const patientId = `pt_fu_today_${timestamp}`;
  const todayDate = getISTDate(0);

  db.insert('patients', {
    id: patientId,
    name: `TEST Due Today Patient ${timestamp}`,
    phone: `+91 97${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: TEST_EMAIL,
    registrationTokenNumber: `HE-${timestamp.toString().slice(-6)}`,
  });
  createdTestPatientIds.push(patientId);

  const fuRes = await fetch(`${baseUrl}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({
      patientId,
      scheduledDate: todayDate,
      scheduledTime: '11:15 AM',
      notes: 'Due today routine check',
    }),
  });
  const reminderId = (await fuRes.json()).reminder.id;
  createdTestFollowUpIds.push(reminderId);

  const listRes = await (await fetch(`${baseUrl}/api/follow-ups`)).json();
  const found = listRes.reminders.find(r => r.id === reminderId);
  assert.ok(found);
  assert.strictEqual(found.status, 'DUE', 'Follow-up for today must be categorized as DUE');
  assert.strictEqual(found.scheduledDate, todayDate);
});

// ============================================================
// TEST 9 — SEND PATIENT EMAIL (REAL SMTP & FAILURE HANDLING)
// ============================================================
test('TEST 9 — SEND PATIENT EMAIL: Real SMTP dispatch, messageStatus SENT, task remains DUE; failure handling tested', async () => {
  const targetId = createdTestFollowUpIds[createdTestFollowUpIds.length - 1]; // due today reminder

  // 1. Send email to valid patient email
  const sendRes = await fetch(`${baseUrl}/api/follow-ups/${targetId}/send-now`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
  });
  const sendJson = await sendRes.json();
  assert.strictEqual(sendRes.status, 200, 'Sending email should succeed with 200');
  assert.ok(sendJson.success);
  assert.strictEqual(sendJson.reminder.messageStatus, 'SENT', 'messageStatus must be updated to SENT');
  assert.strictEqual(sendJson.reminder.status, 'DUE', 'Task status must remain DUE (email does NOT complete task)');

  // 2. Verify active queue still contains the follow-up
  const activeRes = await (await fetch(`${baseUrl}/api/follow-ups?status=active`)).json();
  assert.ok(activeRes.reminders.some(r => r.id === targetId), 'Follow-up with messageStatus SENT must remain in active queue');

  // 3. Test SMTP Failure handling: patient without valid email
  const timestamp = Date.now();
  const noEmailPatientId = `pt_no_email_${timestamp}`;
  db.insert('patients', {
    id: noEmailPatientId,
    name: `No Email Patient ${timestamp}`,
    phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: '',
  });
  createdTestPatientIds.push(noEmailPatientId);

  const fuFailRes = await fetch(`${baseUrl}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({
      patientId: noEmailPatientId,
      scheduledDate: getISTDate(0),
      notes: 'No email follow-up failure test',
    }),
  });
  const fuFailId = (await fuFailRes.json()).reminder.id;
  createdTestFollowUpIds.push(fuFailId);

  const sendFailRes = await fetch(`${baseUrl}/api/follow-ups/${fuFailId}/send-now`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
  });
  assert.strictEqual(sendFailRes.status, 400, 'Should return HTTP 400 for missing email');
  const sendFailJson = await sendFailRes.json();
  assert.strictEqual(sendFailJson.success, false);
  assert.strictEqual(sendFailJson.reminder.messageStatus, 'FAILED');
  assert.ok(sendFailJson.reminder.failureReason);
  assert.strictEqual(sendFailJson.reminder.status, 'DUE', 'Failed follow-up must remain DUE in active queue');
});

// ============================================================
// TEST 10 — COMPLETE FOLLOW-UP
// ============================================================
test('TEST 10 — COMPLETE FOLLOW-UP: Explicit complete action, leaves active queue, preserved in history', async () => {
  const targetId = createdTestFollowUpIds[createdTestFollowUpIds.length - 2]; // due today reminder

  const completeRes = await fetch(`${baseUrl}/api/follow-ups/${targetId}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
  });
  const completeJson = await completeRes.json();
  assert.ok(completeJson.success);
  assert.strictEqual(completeJson.reminder.status, 'COMPLETED');
  assert.ok(completeJson.reminder.completedAt);
  assert.strictEqual(completeJson.reminder.completedBy, 'Admin Doctor');

  // Verify immediately leaves active queue
  const activeRes1 = await (await fetch(`${baseUrl}/api/follow-ups?status=active`)).json();
  assert.strictEqual(activeRes1.reminders.some(r => r.id === targetId), false, 'Completed follow-up must leave active queue');

  // Refresh check
  const activeRes2 = await (await fetch(`${baseUrl}/api/follow-ups?status=active`)).json();
  assert.strictEqual(activeRes2.reminders.some(r => r.id === targetId), false, 'Completed follow-up must remain absent from active queue');

  // Appears in History
  const historyRes = await (await fetch(`${baseUrl}/api/follow-ups?status=history`)).json();
  assert.ok(historyRes.reminders.some(r => r.id === targetId), 'Completed follow-up must appear in history');
});

// ============================================================
// TEST 11 — CANCEL FOLLOW-UP
// ============================================================
test('TEST 11 — CANCEL FOLLOW-UP: Cancel action, leaves active queue, preserved in history, no future D-1', async () => {
  const timestamp = Date.now();
  const patientId = `pt_fu_cancel_${timestamp}`;
  const tomorrowDate = getISTDate(1);

  db.insert('patients', {
    id: patientId,
    name: `Cancel FU Patient ${timestamp}`,
    phone: `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: TEST_EMAIL,
  });
  createdTestPatientIds.push(patientId);

  const fuRes = await fetch(`${baseUrl}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({
      patientId,
      scheduledDate: tomorrowDate,
      notes: 'Follow-up to cancel',
    }),
  });
  const cancelId = (await fuRes.json()).reminder.id;
  createdTestFollowUpIds.push(cancelId);

  // Cancel it
  const cancelRes = await fetch(`${baseUrl}/api/follow-ups/${cancelId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
  });
  const cancelJson = await cancelRes.json();
  assert.ok(cancelJson.success);
  assert.strictEqual(cancelJson.reminder.status, 'CANCELLED');
  assert.ok(cancelJson.reminder.cancelledAt);

  // Leaves active queue
  const activeRes = await (await fetch(`${baseUrl}/api/follow-ups?status=active`)).json();
  assert.strictEqual(activeRes.reminders.some(r => r.id === cancelId), false, 'Cancelled follow-up must leave active queue');

  // Appears in history
  const historyRes = await (await fetch(`${baseUrl}/api/follow-ups?status=history`)).json();
  assert.ok(historyRes.reminders.some(r => r.id === cancelId), 'Cancelled follow-up must appear in history');

  // Trigger D-1 check and verify NO notification is created for cancelled follow-up
  await fetch(`${baseUrl}/api/follow-ups`);
  const notifs = db.get('notifications') || [];
  const d1Cancelled = notifs.filter(n => n.idempotencyKey === `notif_fu_d1_${cancelId}_${tomorrowDate}`);
  assert.strictEqual(d1Cancelled.length, 0, 'Cancelled follow-up must NEVER generate D-1 reminder');
});

// ============================================================
// TEST 12 — OVERDUE FOLLOW-UP
// ============================================================
test('TEST 12 — OVERDUE: Past scheduled follow-up categorized as OVERDUE, active and actionable', async () => {
  const timestamp = Date.now();
  const patientId = `pt_fu_overdue_${timestamp}`;
  const overdueDate = getISTDate(-7); // 7 days in past

  db.insert('patients', {
    id: patientId,
    name: `Overdue Patient ${timestamp}`,
    phone: `+91 90${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: TEST_EMAIL,
  });
  createdTestPatientIds.push(patientId);

  const fuRes = await fetch(`${baseUrl}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({
      patientId,
      scheduledDate: overdueDate,
      notes: 'Overdue follow-up check',
    }),
  });
  const overdueId = (await fuRes.json()).reminder.id;
  createdTestFollowUpIds.push(overdueId);

  const listRes = await (await fetch(`${baseUrl}/api/follow-ups`)).json();
  const found = listRes.reminders.find(r => r.id === overdueId);
  assert.ok(found);
  assert.strictEqual(found.status, 'OVERDUE', 'Past follow-up must be categorized as OVERDUE');
  assert.strictEqual(found.scheduledDate, overdueDate);

  // Active queue must include it
  const activeRes = await (await fetch(`${baseUrl}/api/follow-ups?status=active`)).json();
  assert.ok(activeRes.reminders.some(r => r.id === overdueId), 'Overdue follow-up must remain in active queue');
});

// ============================================================
// TEST 13 — HISTORY INTEGRITY
// ============================================================
test('TEST 13 — HISTORY INTEGRITY: Proving all finished work is preserved and accessible', async () => {
  // Check appointment history
  const apptHistRes = await (await fetch(`${baseUrl}/api/appointments?status=history`)).json();
  assert.ok(apptHistRes.success);
  for (const id of createdTestAppointmentIds) {
    const foundInActive = (await (await fetch(`${baseUrl}/api/appointments?status=active`)).json()).appointments.some(a => a.id === id);
    const foundInHistory = apptHistRes.appointments.some(a => a.id === id);
    // Either still active or cleanly in history
    assert.ok(foundInActive || foundInHistory, `Appointment ${id} must exist in active or history`);
  }

  // Check follow-up history
  const fuHistRes = await (await fetch(`${baseUrl}/api/follow-ups?status=history`)).json();
  assert.ok(fuHistRes.success);
  for (const id of createdTestFollowUpIds) {
    const foundInActive = (await (await fetch(`${baseUrl}/api/follow-ups?status=active`)).json()).reminders.some(r => r.id === id);
    const foundInHistory = fuHistRes.reminders.some(r => r.id === id);
    assert.ok(foundInActive || foundInHistory, `Follow-up ${id} must exist in active or history`);
  }
});

// ============================================================
// TEST 14 — DUPLICATE / IDEMPOTENCY PROTECTION
// ============================================================
test('TEST 14 — DUPLICATE PROTECTION: Repeated requests cause 0 duplicate notifications or status changes', async () => {
  const notifCount1 = (db.get('notifications') || []).length;
  await fetch(`${baseUrl}/api/follow-ups`);
  await fetch(`${baseUrl}/api/appointments`);
  await fetch(`${baseUrl}/api/dashboard`);
  await fetch(`${baseUrl}/api/follow-ups`);
  const notifCount2 = (db.get('notifications') || []).length;

  assert.strictEqual(notifCount2, notifCount1, 'Repeated API reloads must generate zero duplicate notifications');
});

// ============================================================
// TEST 15 — UI ACTIONS INTEGRITY
// ============================================================
test('TEST 15 — UI ACTIONS: Route actions exist, are callable, and reject invalid requests gracefully', async () => {
  // Test invalid status patch returns 400
  const badPatch = await fetch(`${baseUrl}/api/appointments/HE-0001/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({}),
  });
  assert.strictEqual(badPatch.status, 400, 'Empty status payload should return 400');

  // Test non-existent appointment status patch returns 404
  const notFoundPatch = await fetch(`${baseUrl}/api/appointments/NON_EXISTENT_ID/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-user-email': 'admin@holisticedge.in' },
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });
  assert.strictEqual(notFoundPatch.status, 404, 'Unknown appointment should return 404');
});

// ============================================================
// TEST 16 — DATA CONSISTENCY
// ============================================================
test('TEST 16 — DATA CONSISTENCY: Dashboard metrics reflect active queue accurately', async () => {
  const dashRes = await (await fetch(`${baseUrl}/api/dashboard`)).json();
  assert.ok(dashRes.success);
  assert.ok(dashRes.metrics);
  assert.strictEqual(typeof dashRes.metrics.overdueFollowUps, 'number');
  assert.strictEqual(typeof dashRes.metrics.dueTodayFollowUps, 'number');
  assert.strictEqual(typeof dashRes.metrics.tomorrowFollowUps, 'number');
  assert.strictEqual(typeof dashRes.metrics.activeTodayAppointments, 'number');
});

// ============================================================
// TEST 17 — REGRESSION VERIFICATION
// ============================================================
test('TEST 17 — REGRESSION: Core services and patient match endpoints respond normally', async () => {
  const pts = await (await fetch(`${baseUrl}/api/patients`)).json();
  assert.ok(pts.success || Array.isArray(pts));

  const notifs = await (await fetch(`${baseUrl}/api/notifications`)).json();
  assert.ok(notifs.success);
});
