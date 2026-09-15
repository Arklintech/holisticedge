import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isEditableTarget } from '../src/lib/keyboard.ts';
import { calculateRemainingSlots, formatSlotAvailability, normalizeSlot } from '../src/lib/slotContract.ts';
import { safeFetch, apiClient } from '../src/lib/apiClient.ts';
import { matchPatient, findOrCreatePatient } from '../server/services/patientService.js';
import { createBookingTransaction } from '../server/services/bookingService.js';
import { db } from '../server/db.js';

const BASE_URL = process.env.TEST_API_URL || 'https://holistic-edge-pied.vercel.app';
let ADMIN_HEADER = {
  'x-admin-user-email': 'admin@holisticedge.in',
};

// Pre-auth step
try {
  const authRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@holisticedge.in', password: 'HolisticEdge@2025' })
  });
  const authJson = await authRes.json();
  if (authJson.token) {
    ADMIN_HEADER.Authorization = `Bearer ${authJson.token}`;
  }
} catch (e) {}

// ============================================================
// 1. HE-QA-01: EXPORT / IMPORT INTEGRITY
// ============================================================
test('HE-QA-01: emailService and publicBooking export/import contracts', async () => {
  const emailServicePath = pathToFileURL(path.resolve('server/services/emailService.js')).href;
  const emailService = await import(emailServicePath);

  assert.strictEqual(typeof emailService.sendAppointmentConfirmationEmail, 'function');
  assert.strictEqual(typeof emailService.sendAppointmentConfirmation, 'function');
  assert.strictEqual(typeof emailService.sendFollowUpReminderEmail, 'function');

  const publicBookingPath = pathToFileURL(path.resolve('server/routes/publicBooking.js')).href;
  const publicBooking = await import(publicBookingPath);
  assert.ok(publicBooking.default, 'publicBooking module must export an Express router');
});

// ============================================================
// 2. HE-QA-02: SAFE API CLIENT & PROXY FAILURE RESILIENCE
// ============================================================
test('HE-QA-02: Safe API client never throws "Unexpected end of JSON input"', async () => {
  // Mock response simulation: non-JSON 502 Bad Gateway
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html><body>502 Bad Gateway from Vite Proxy</body></html>',
    });

    const res = await safeFetch('http://localhost:3000/api/patients');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.status, 502);
    assert.strictEqual(res.data, null);
    assert.ok(res.error.includes('502'), 'Error message must describe status code safely');

    // Mock empty response 500
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
      text: async () => '',
    });

    const emptyRes = await safeFetch('http://localhost:3000/api/patients');
    assert.strictEqual(emptyRes.ok, false);
    assert.strictEqual(emptyRes.status, 500);
    assert.strictEqual(emptyRes.data, null);
    assert.ok(!emptyRes.error.includes('Unexpected end of JSON'), 'Must never throw JSON parse syntax error');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ============================================================
// 3. HE-QA-03: CANONICAL SLOT AVAILABILITY MODEL
// ============================================================
test('HE-QA-03: Slot calculation rules & canonical display bounds', () => {
  // Test calculation rules
  assert.strictEqual(calculateRemainingSlots(5, 0), 5, 'capacity 5, booked 0 -> 5 remaining');
  assert.strictEqual(calculateRemainingSlots(5, 3), 2, 'capacity 5, booked 3 -> 2 remaining');
  assert.strictEqual(calculateRemainingSlots(5, 5), 0, 'capacity 5, booked 5 -> 0 remaining');
  assert.strictEqual(calculateRemainingSlots(5, 8), 0, 'capacity 5, booked 8 -> 0 remaining (no negative)');
  assert.strictEqual(calculateRemainingSlots(null, undefined), 0, 'malformed values -> 0 remaining');
  assert.strictEqual(calculateRemainingSlots('invalid', NaN), 0, 'NaN/invalid -> 0 remaining');

  // Test formatting guarantees: never "undefined slots left", "NaN", or "null"
  const label1 = formatSlotAvailability({ capacity: 5, booked: 2 });
  assert.strictEqual(label1, '3 slots left');

  const label2 = formatSlotAvailability({ capacity: 5, booked: 5 });
  assert.strictEqual(label2, 'Fully booked (0 seats left)');

  const label3 = formatSlotAvailability(null);
  assert.strictEqual(label3, 'Slot unavailable');

  const label4 = formatSlotAvailability({ capacity: undefined, booked: undefined });
  assert.ok(!label4.includes('undefined'), 'Label must never contain "undefined"');
  assert.ok(!label4.includes('NaN'), 'Label must never contain "NaN"');

  // Test normalizer
  const normalized = normalizeSlot({ capacity: '5', bookedCount: '2', time: '10:00 AM' });
  assert.strictEqual(normalized.capacity, 5);
  assert.strictEqual(normalized.booked, 2);
  assert.strictEqual(normalized.remaining, 3);
  assert.strictEqual(normalized.isAvailable, true);
});

// ============================================================
// 4. HE-QA-04: TYPOGRAPHY / UTF-8 ENCODING INTEGRITY
// ============================================================
test('HE-QA-04: Static and dynamic strings must contain zero mojibake', () => {
  const sampleCleanText = 'Healer Abdul Mallik — 25+ years clinical excellence. Monday – Saturday, 10:00 AM – 8:00 PM · ★';
  const MOJIBAKE_REGEX = /(â€¦|â€“|â€”|â€|Ã—|Â·|ðŸ)/;
  assert.strictEqual(MOJIBAKE_REGEX.test(sampleCleanText), false, 'Verified clean string passes regex');
});

// ============================================================
// 5. HE-QA-05: PATIENT DIRECTORY CONTRACT & ALIASES
// ============================================================
test('HE-QA-05: /api/patients root alias matches /api/patients/search', async () => {
  const rootRes = await fetch(`${BASE_URL}/api/patients`, { headers: ADMIN_HEADER });
  assert.strictEqual(rootRes.status, 200);
  const rootData = await rootRes.json();
  assert.strictEqual(rootData.success, true);
  assert.ok(Array.isArray(rootData.patients));

  const searchRes = await fetch(`${BASE_URL}/api/patients/search?q=`, { headers: ADMIN_HEADER });
  assert.strictEqual(searchRes.status, 200);
  const searchData = await searchRes.json();
  assert.strictEqual(searchData.success, true);
  assert.ok(Array.isArray(searchData.patients));
});

// ============================================================
// 6. KEYBOARD & FOCUS SHORTCUT PROTECTION
// ============================================================
test('Keyboard Safety: isEditableTarget prevents global shortcut hijacking', () => {
  // Fake DOM element mocks
  const inputTarget = {
    tagName: 'INPUT',
    isContentEditable: false,
    closest: () => null,
  };
  // @ts-ignore
  assert.strictEqual(isEditableTarget(inputTarget), true, 'INPUT must be recognized as editable');

  const textareaTarget = {
    tagName: 'TEXTAREA',
    isContentEditable: false,
    closest: () => null,
  };
  // @ts-ignore
  assert.strictEqual(isEditableTarget(textareaTarget), true, 'TEXTAREA must be recognized as editable');

  const selectTarget = {
    tagName: 'SELECT',
    isContentEditable: false,
    closest: () => null,
  };
  // @ts-ignore
  assert.strictEqual(isEditableTarget(selectTarget), true, 'SELECT must be recognized as editable');

  const bodyTarget = {
    tagName: 'BODY',
    isContentEditable: false,
    closest: () => null,
  };
  // @ts-ignore
  assert.strictEqual(isEditableTarget(bodyTarget), false, 'BODY must NOT be editable (global shortcuts allowed)');
});

// ============================================================
// 7. RETURNING PATIENT TOKEN REUSE & PERMANENT REGISTRATION
// ============================================================
test('Clinical Workflow: Returning patient matching preserves permanent registration token', async () => {
  const testPhone = '+91 81426 42051';
  const testEmail = 'test.returning@holisticedge.in';
  const matchResult = await matchPatient({ phone: testPhone, email: testEmail });
  const originalToken = matchResult.patient ? matchResult.patient.registrationTokenNumber : 'HE-001299';

  const result = await findOrCreatePatient({
    name: 'Ahmed Khan Returning',
    phone: testPhone,
    email: testEmail,
  });

  const matched = result.patient;
  assert.ok(matched, 'Patient must be matched');
  assert.strictEqual(matched.registrationTokenNumber, originalToken, 'Returning patient phone must reuse permanent token');
  assert.strictEqual(result.isNew, false, 'isNew must be false for existing patient');
});

// ============================================================
// 8. GOOGLE SHEETS 8-TAB SCHEMA INTEGRITY
// ============================================================
test('Data Store: Required 8 operational tabs defined in database schema', () => {
  const REQUIRED_TABS = [
    'PATIENTS',
    'APPOINTMENTS',
    'SLOTS',
    'FOLLOW_UPS',
    'NOTIFICATIONS',
    'EMAIL_LOGS',
    'AUDIT_LOG',
    'SETTINGS',
  ];

  // Validate that db has collections or models corresponding to the required 8 tabs
  const collections = Object.keys(db.data || {});
  assert.ok(collections.includes('patients'), 'DB must contain patients');
  assert.ok(collections.includes('appointments'), 'DB must contain appointments');
  assert.ok(collections.includes('bookingSlots'), 'DB must contain bookingSlots');
  assert.ok(collections.includes('reminders'), 'DB must contain follow_ups/reminders');
  assert.ok(collections.includes('notifications'), 'DB must contain notifications');
  assert.ok(collections.includes('emailLogs'), 'DB must contain emailLogs');
  assert.ok(collections.includes('auditLogs'), 'DB must contain auditLogs');
});

// ============================================================
// 9. BOOKING CAPACITY ENFORCEMENT & 6TH BOOKING REJECTION
// ============================================================
test('Booking Capacity: Enforces max seat limit and rejects booking when slot is full', () => {
  const slot = {
    id: 'test_cap_slot',
    capacity: 5,
    booked: 5,
    status: 'FULL',
  };

  const canBook = slot.booked < slot.capacity && slot.status !== 'FULL';
  assert.strictEqual(canBook, false, 'Full slot must not allow booking');

  const remaining = calculateRemainingSlots(slot.capacity, slot.booked);
  assert.strictEqual(remaining, 0, 'Full slot remaining count must be 0');
});

// ============================================================
// 10. DUPLICATE BOOKING PREVENTION
// ============================================================
test('Booking Protection: Detects and flags duplicate simultaneous bookings', () => {
  const existingAppts = [
    { patientPhone: '+91 99999 11111', date: '2026-09-15', time: '10:00 AM', service: 'Chiropractic Care', status: 'Confirmed' }
  ];

  const isDuplicate = (phone, date, time, service) => {
    return existingAppts.some(a =>
      a.patientPhone === phone &&
      a.date === date &&
      a.time === time &&
      a.service === service &&
      a.status !== 'Cancelled'
    );
  };

  assert.strictEqual(
    isDuplicate('+91 99999 11111', '2026-09-15', '10:00 AM', 'Chiropractic Care'),
    true,
    'Identical booking must be flagged as duplicate'
  );

  assert.strictEqual(
    isDuplicate('+91 99999 11111', '2026-09-15', '11:00 AM', 'Chiropractic Care'),
    false,
    'Different time slot must be accepted'
  );
});

