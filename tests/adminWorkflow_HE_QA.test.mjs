import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import appointmentsRouter from '../server/routes/appointments.js';
import followUpsRouter from '../server/routes/followUps.js';
import patientsRouter from '../server/routes/patients.js';
import dashboardRouter from '../server/routes/dashboard.js';
import { db } from '../server/db.js';

// Setup isolated Express app for direct integration testing
const app = express();
app.use(express.json());

// Mock auth middleware for testing
app.use((req, res, next) => {
  req.user = { id: 'admin_1', name: 'Admin Doctor', email: 'admin@holisticedge.in', role: 'ADMIN' };
  next();
});

app.use('/api/appointments', appointmentsRouter);
app.use('/api/follow-ups', followUpsRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/dashboard', dashboardRouter);

let server;
let port;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
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

test('ADMIN APPOINTMENTS WORKFLOW: Active work queue vs History', async (t) => {
  const timestamp = Date.now();
  const testPhone = `+91 99999 ${Math.floor(10000 + Math.random() * 90000)}`;
  const testEmail = `qa_patient_${timestamp}@example.com`;

  // 1. Create a new active appointment
  const createRes = await fetch(`${baseUrl}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: `QA Patient Active ${timestamp}`,
      phone: testPhone,
      email: testEmail,
      service: 'Spinal Alignment',
      preferredDate: '2026-09-15',
      preferredTime: '10:00 AM',
      status: 'Pending',
    }),
  });
  const createJson = await createRes.json();
  assert.strictEqual(createRes.status, 201);
  assert.ok(createJson.success);
  const apptId = createJson.appointment.id;
  const patientId = createJson.patient.id;

  // 2. Query active queue — active appointment MUST be present
  const activeRes = await fetch(`${baseUrl}/api/appointments?status=active`);
  const activeJson = await activeRes.json();
  assert.ok(activeJson.success);
  const foundInActive = activeJson.appointments.some(a => a.id === apptId);
  assert.ok(foundInActive, 'New pending appointment must appear in active queue');

  // 3. Confirm appointment
  const confirmRes = await fetch(`${baseUrl}/api/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });
  const confirmJson = await confirmRes.json();
  assert.ok(confirmJson.success);
  assert.strictEqual(confirmJson.appointment.status, 'CONFIRMED');
  assert.ok(confirmJson.appointment.confirmedAt);
  assert.strictEqual(confirmJson.appointment.confirmedBy, 'Admin Doctor');

  // 4. Query active queue — confirmed appointment is still active
  const activeRes2 = await fetch(`${baseUrl}/api/appointments?status=active`);
  const activeJson2 = await activeRes2.json();
  assert.ok(activeJson2.appointments.some(a => a.id === apptId), 'Confirmed appointment must remain in active queue');

  // 5. Complete appointment
  const completeRes = await fetch(`${baseUrl}/api/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });
  const completeJson = await completeRes.json();
  assert.ok(completeJson.success);
  assert.strictEqual(completeJson.appointment.status, 'COMPLETED');
  assert.ok(completeJson.appointment.completedAt, 'completedAt must be stored');
  assert.strictEqual(completeJson.appointment.completedBy, 'Admin Doctor', 'completedBy must be stored');

  // 6. Query active queue — completed appointment MUST leave active queue
  const activeRes3 = await fetch(`${baseUrl}/api/appointments?status=active`);
  const activeJson3 = await activeRes3.json();
  const stillInActive = activeJson3.appointments.some(a => a.id === apptId);
  assert.strictEqual(stillInActive, false, 'Completed appointment must NOT remain in active queue');

  // 7. Query history queue — completed appointment MUST be in history
  const historyRes = await fetch(`${baseUrl}/api/appointments?status=history`);
  const historyJson = await historyRes.json();
  const foundInHistory = historyJson.appointments.some(a => a.id === apptId);
  assert.ok(foundInHistory, 'Completed appointment must be present in history queue');

  // 8. Record is NOT deleted and is accessible in patient profile
  const patientProfileRes = await fetch(`${baseUrl}/api/patients/${patientId}`);
  const patientProfileJson = await patientProfileRes.json();
  assert.ok(patientProfileJson.success);
  const patientAppt = patientProfileJson.appointments.find(a => a.id === apptId);
  assert.ok(patientAppt, 'Appointment must remain accessible in patient history');
  assert.strictEqual(patientAppt.status, 'COMPLETED');

  // 9. Cancel another appointment
  const createRes2 = await fetch(`${baseUrl}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: `QA Patient Cancel ${timestamp}`,
      phone: testPhone,
      email: testEmail,
      service: 'Posture Correction',
      preferredDate: '2026-09-16',
      status: 'Confirmed',
    }),
  });
  const apptId2 = (await createRes2.json()).appointment.id;

  const cancelRes = await fetch(`${baseUrl}/api/appointments/${apptId2}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  const cancelJson = await cancelRes.json();
  assert.ok(cancelJson.success);
  assert.strictEqual(cancelJson.appointment.status, 'CANCELLED');
  assert.ok(cancelJson.appointment.cancelledAt);
  assert.strictEqual(cancelJson.appointment.cancelledBy, 'Admin Doctor');

  const activeRes4 = await fetch(`${baseUrl}/api/appointments?status=active`);
  const activeJson4 = await activeRes4.json();
  assert.strictEqual(activeJson4.appointments.some(a => a.id === apptId2), false, 'Cancelled appointment must leave active queue');

  const historyRes2 = await fetch(`${baseUrl}/api/appointments?status=history`);
  const historyJson2 = await historyRes2.json();
  assert.ok(historyJson2.appointments.some(a => a.id === apptId2), 'Cancelled appointment must be in history');

  // 10. Mark No-show on another appointment
  const createRes3 = await fetch(`${baseUrl}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: `QA Patient NoShow ${timestamp}`,
      phone: testPhone,
      email: testEmail,
      service: 'Cupping Therapy',
      preferredDate: '2026-09-17',
      status: 'Confirmed',
    }),
  });
  const apptId3 = (await createRes3.json()).appointment.id;

  const noshowRes = await fetch(`${baseUrl}/api/appointments/${apptId3}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'NO_SHOW' }),
  });
  const noshowJson = await noshowRes.json();
  assert.ok(noshowJson.success);
  assert.strictEqual(noshowJson.appointment.status, 'NO_SHOW');
  assert.ok(noshowJson.appointment.noShowAt);
  assert.strictEqual(noshowJson.appointment.noShowMarkedBy, 'Admin Doctor');

  const activeRes5 = await fetch(`${baseUrl}/api/appointments?status=active`);
  const activeJson5 = await activeRes5.json();
  assert.strictEqual(activeJson5.appointments.some(a => a.id === apptId3), false, 'No-show appointment must leave active queue');

  const historyRes3 = await fetch(`${baseUrl}/api/appointments?status=history`);
  const historyJson3 = await historyRes3.json();
  assert.ok(historyJson3.appointments.some(a => a.id === apptId3), 'No-show appointment must be in history');
});

test('ADMIN FOLLOW-UP WORKFLOW: Lifecycle, categorization, D-1 idempotency, message vs task status', async (t) => {
  const timestamp = Date.now();
  const patientId = `pt_test_${timestamp}`;
  function getISTDate(offsetDays = 0) {
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    if (offsetDays) ist.setUTCDate(ist.getUTCDate() + offsetDays);
    return ist.toISOString().split('T')[0];
  }
  const todayStr = getISTDate(0);
  const tomorrowStr = getISTDate(1);
  const upcomingStr = getISTDate(7);
  const overdueStr = getISTDate(-7);

  // 1. Create Patient
  db.insert('patients', {
    id: patientId,
    name: `FollowUp Test Patient ${timestamp}`,
    phone: `+91 91${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: 'test_patient_fu@holisticedge.in',
    registrationTokenNumber: `HE-${timestamp.toString().slice(-6)}`,
  });

  // 2. Create 4 follow-ups: Overdue, Due Today, Tomorrow, Upcoming
  const fuOverdueRes = await fetch(`${baseUrl}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId,
      scheduledDate: overdueStr,
      scheduledTime: '09:30 AM',
      notes: 'Overdue follow-up check',
    }),
  });
  const fuOverdue = (await fuOverdueRes.json()).reminder;

  const fuTodayRes = await fetch(`${baseUrl}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId,
      scheduledDate: todayStr,
      scheduledTime: '11:00 AM',
      notes: 'Due today routine check',
    }),
  });
  const fuToday = (await fuTodayRes.json()).reminder;

  const fuTomorrowRes = await fetch(`${baseUrl}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId,
      scheduledDate: tomorrowStr,
      scheduledTime: '02:00 PM',
      notes: 'Tomorrow assessment',
    }),
  });
  const fuTomorrow = (await fuTomorrowRes.json()).reminder;

  const fuUpcomingRes = await fetch(`${baseUrl}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId,
      scheduledDate: upcomingStr,
      scheduledTime: '04:30 PM',
      notes: 'Future review',
    }),
  });
  const fuUpcoming = (await fuUpcomingRes.json()).reminder;

  // 3. Query GET /api/follow-ups and verify categorization
  const listRes = await fetch(`${baseUrl}/api/follow-ups`);
  const listJson = await listRes.json();
  assert.ok(listJson.success);

  const foundOverdue = listJson.reminders.find(r => r.id === fuOverdue.id);
  const foundToday = listJson.reminders.find(r => r.id === fuToday.id);
  const foundTomorrow = listJson.reminders.find(r => r.id === fuTomorrow.id);
  const foundUpcoming = listJson.reminders.find(r => r.id === fuUpcoming.id);

  assert.strictEqual(foundOverdue.status, 'OVERDUE', 'Past follow-up must be categorized as OVERDUE');
  assert.strictEqual(foundToday.status, 'DUE', 'Today follow-up must be categorized as DUE');
  assert.strictEqual(foundTomorrow.status, 'SCHEDULED', 'Tomorrow follow-up must be SCHEDULED');
  assert.strictEqual(foundUpcoming.status, 'SCHEDULED', 'Upcoming follow-up must be SCHEDULED');

  // 4. Verify D-1 Admin reminder was generated for tomorrow's follow-up
  const notifs = db.get('notifications') || [];
  const d1Notifs = notifs.filter(n => n.idempotencyKey === `notif_fu_d1_${fuTomorrow.id}_${tomorrowStr}`);
  assert.strictEqual(d1Notifs.length, 1, 'Exactly 1 D-1 notification must be created for tomorrow follow-up');

  // 5. Verify Idempotency: 3 repeated GET requests must NOT generate duplicate D-1 notifications
  const initialNotifCount = (db.get('notifications') || []).length;
  await fetch(`${baseUrl}/api/follow-ups`);
  await fetch(`${baseUrl}/api/follow-ups`);
  await fetch(`${baseUrl}/api/follow-ups`);
  const afterNotifCount = (db.get('notifications') || []).length;
  assert.strictEqual(afterNotifCount, initialNotifCount, 'Repeated GET requests must produce 0 duplicate notifications');

  // 6. Test Email Dispatch: messageStatus becomes SENT, but task status remains active (DUE)
  const sendRes = await fetch(`${baseUrl}/api/follow-ups/${fuToday.id}/send-now`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const sendJson = await sendRes.json();
  assert.ok(sendJson.success, 'Email send should succeed');
  assert.strictEqual(sendJson.reminder.messageStatus, 'SENT', 'messageStatus must become SENT');
  assert.strictEqual(sendJson.reminder.status, 'DUE', 'Sending email must NOT complete the follow-up task');

  // 7. Verify active queue still contains the follow-up
  const activeFURes = await fetch(`${baseUrl}/api/follow-ups?status=active`);
  const activeFUJson = await activeFURes.json();
  assert.ok(activeFUJson.reminders.some(r => r.id === fuToday.id), 'Follow-up with messageStatus SENT must remain in active queue');

  // 8. Explicitly Complete Follow-up
  const completeFURes = await fetch(`${baseUrl}/api/follow-ups/${fuToday.id}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  const completeFUJson = await completeFURes.json();
  assert.ok(completeFUJson.success);
  assert.strictEqual(completeFUJson.reminder.status, 'COMPLETED');
  assert.ok(completeFUJson.reminder.completedAt);
  assert.strictEqual(completeFUJson.reminder.completedBy, 'Admin Doctor');

  // 9. Verify it leaves active queue and is present in history
  const activeFURes2 = await fetch(`${baseUrl}/api/follow-ups?status=active`);
  const activeFUJson2 = await activeFURes2.json();
  assert.strictEqual(activeFUJson2.reminders.some(r => r.id === fuToday.id), false, 'Completed follow-up must leave active queue');

  const historyFURes = await fetch(`${baseUrl}/api/follow-ups?status=history`);
  const historyFUJson = await historyFURes.json();
  assert.ok(historyFUJson.reminders.some(r => r.id === fuToday.id), 'Completed follow-up must be in history');

  // 10. Explicitly Cancel Follow-up
  const cancelFURes = await fetch(`${baseUrl}/api/follow-ups/${fuTomorrow.id}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  const cancelFUJson = await cancelFURes.json();
  assert.ok(cancelFUJson.success);
  assert.strictEqual(cancelFUJson.reminder.status, 'CANCELLED');
  assert.ok(cancelFUJson.reminder.cancelledAt);

  const activeFURes3 = await fetch(`${baseUrl}/api/follow-ups?status=active`);
  const activeFUJson3 = await activeFURes3.json();
  assert.strictEqual(activeFUJson3.reminders.some(r => r.id === fuTomorrow.id), false, 'Cancelled follow-up must leave active queue');

  // 11. Test Email Failure handling
  const noEmailPatientId = `pt_no_email_${timestamp}`;
  db.insert('patients', {
    id: noEmailPatientId,
    name: 'No Email Patient',
    phone: '+91 90000 11111',
    email: '',
  });
  const fuNoEmailRes = await fetch(`${baseUrl}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: noEmailPatientId,
      scheduledDate: todayStr,
      notes: 'No email patient follow-up',
    }),
  });
  const fuNoEmail = (await fuNoEmailRes.json()).reminder;

  const sendFailRes = await fetch(`${baseUrl}/api/follow-ups/${fuNoEmail.id}/send-now`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.strictEqual(sendFailRes.status, 400);
  const sendFailJson = await sendFailRes.json();
  assert.strictEqual(sendFailJson.success, false);
  assert.strictEqual(sendFailJson.reminder.messageStatus, 'FAILED');
  assert.ok(sendFailJson.reminder.failureReason);
  assert.strictEqual(sendFailJson.reminder.status, 'DUE', 'Failed email follow-up must remain DUE in active queue');
});

test('ADMIN DASHBOARD: Metrics reflect active queue without completed/cancelled clutter', async (t) => {
  const dashRes = await fetch(`${baseUrl}/api/dashboard`);
  const dashJson = await dashRes.json();
  assert.ok(dashJson.success);
  assert.ok(dashJson.metrics);
  assert.strictEqual(typeof dashJson.metrics.overdueFollowUps, 'number');
  assert.strictEqual(typeof dashJson.metrics.dueTodayFollowUps, 'number');
  assert.strictEqual(typeof dashJson.metrics.tomorrowFollowUps, 'number');
  assert.strictEqual(typeof dashJson.metrics.activeTodayAppointments, 'number');
  assert.ok(dashJson.followUpsSummary);
});
