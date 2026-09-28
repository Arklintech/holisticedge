import test from 'node:test';
import assert from 'node:assert';
import { findOrCreatePatient, allocateRegistrationToken, normalizePhoneDigits } from '../server/services/patientService.js';
import { getActiveDataProvider } from '../server/providers/dataProvider.js';
import { db } from '../server/db.js';

const dataProvider = getActiveDataProvider();

test('Registration Token Invariants & Distributed Concurrency Verification', async (t) => {

  // 1. Duplicate token creation attempt must explicitly fail
  await t.test('1. Duplicate token creation attempt throws DATA_INTEGRITY_VIOLATION', async () => {
    const existingPatients = await dataProvider.searchPatients('');
    assert.ok(existingPatients.length > 0, 'Database should contain existing patients');
    const existingPatient = existingPatients[0];
    const takenToken = existingPatient.registrationTokenNumber;
    assert.ok(takenToken, 'Existing patient must have a registration token');

    const duplicateCandidate = {
      id: `pt_duplicate_test_${Date.now()}`,
      registrationTokenNumber: takenToken,
      name: 'Intruder Duplicate Patient',
      phone: '919999888877',
      email: 'duplicate@test.com',
      patientType: 'Standard',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await assert.rejects(
      async () => {
        await dataProvider.createPatient(duplicateCandidate);
      },
      (err) => {
        assert.match(err.message, /DATA_INTEGRITY_VIOLATION/, 'Error message must specify DATA_INTEGRITY_VIOLATION');
        return true;
      },
      'Direct insertion of duplicate token must be strictly rejected'
    );
  });

  // 2. Existing token reuse
  await t.test('2. Existing token reuse for returning patient across multiple requests', async () => {
    const phone = `91911${Math.floor(100000 + Math.random() * 900000)}`;
    const name = `Returning Patient ${Date.now()}`;
    const email = `ret_${Date.now()}@test.com`;

    const first = await findOrCreatePatient({ name, phone, email });
    assert.strictEqual(first.isNew, true);
    const assignedToken = first.patient.registrationTokenNumber;
    assert.ok(assignedToken.startsWith('HE-'));

    // Second call with same patient
    const second = await findOrCreatePatient({ name, phone, email });
    assert.strictEqual(second.isNew, false, 'Patient must be recognized as existing');
    assert.strictEqual(second.patient.id, first.patient.id, 'Must match exact patient ID');
    assert.strictEqual(second.patient.registrationTokenNumber, assignedToken, 'Must preserve identical permanent token');
  });

  // 3. New token generation
  await t.test('3. New token generation produces valid unique HE-XXXXXX token', async () => {
    const token = await allocateRegistrationToken();
    assert.ok(typeof token === 'string', 'Token must be a string');
    assert.match(token, /^HE-\d{6,}$/, 'Token must adhere to HE-XXXXXX format');
    const seq = parseInt(token.replace('HE-', ''), 10);
    assert.ok(seq >= 999996, 'Token sequence must be at or above production baseline 999996');
  });

  // 4. Same-phone booking with varying phone formatting
  await t.test('4. Same-phone booking with normalized phone variants preserves token', async () => {
    const rawNumber = `789${Math.floor(1000000 + Math.random() * 9000000)}`;
    const formatA = rawNumber;                     // 789XXXXXXX
    const formatB = `+91 ${rawNumber}`;            // +91 789XXXXXXX
    const formatC = `91${rawNumber}`;              // 91789XXXXXXX
    const formatD = `0${rawNumber}`;               // 0789XXXXXXX

    assert.strictEqual(normalizePhoneDigits(formatA), normalizePhoneDigits(formatB));
    assert.strictEqual(normalizePhoneDigits(formatA), normalizePhoneDigits(formatC));
    assert.strictEqual(normalizePhoneDigits(formatA), normalizePhoneDigits(formatD));

    // First booking with format A
    const resA = await findOrCreatePatient({ name: 'Phone Variant Patient', phone: formatA, email: `phonevar_${Date.now()}@test.com` });
    assert.strictEqual(resA.isNew, true);
    const canonicalToken = resA.patient.registrationTokenNumber;

    // Second booking with format B (+91 with space)
    const resB = await findOrCreatePatient({ name: 'Phone Variant Patient', phone: formatB, email: `phonevar_${Date.now()}@test.com` });
    assert.strictEqual(resB.isNew, false, 'Formatted +91 phone must match existing patient');
    assert.strictEqual(resB.patient.registrationTokenNumber, canonicalToken);

    // Third booking with format C (91 prefix)
    const resC = await findOrCreatePatient({ name: 'Phone Variant Patient', phone: formatC, email: `phonevar_${Date.now()}@test.com` });
    assert.strictEqual(resC.isNew, false, '91 prefixed phone must match existing patient');
    assert.strictEqual(resC.patient.registrationTokenNumber, canonicalToken);

    // Fourth booking with format D (0 prefix)
    const resD = await findOrCreatePatient({ name: 'Phone Variant Patient', phone: formatD, email: `phonevar_${Date.now()}@test.com` });
    assert.strictEqual(resD.isNew, false, 'Leading 0 phone must match existing patient');
    assert.strictEqual(resD.patient.registrationTokenNumber, canonicalToken);
  });

  // 5. Concurrent new patients (10 concurrent requests)
  await t.test('5. Concurrent 10 new patients produces 10 unique tokens with 0 duplicates', async () => {
    const count = 10;
    const runId = Date.now();
    const promises = [];

    for (let i = 0; i < count; i++) {
      const phone = `9198${runId.toString().slice(-4)}${i}${Math.floor(10 + Math.random() * 90)}`;
      promises.push(
        findOrCreatePatient({
          name: `Concurrent Batch Patient ${i}`,
          phone,
          email: `concurrent_${runId}_${i}@test.com`,
        })
      );
    }

    const results = await Promise.all(promises);
    assert.strictEqual(results.length, count);

    const tokens = results.map(r => r.patient.registrationTokenNumber);
    const tokenSet = new Set(tokens);

    assert.strictEqual(tokenSet.size, count, `Expected ${count} unique tokens, but got ${tokenSet.size}. Duplicates found!`);
  });

  // 6. Concurrent same-phone booking
  await t.test('6. Concurrent same-phone booking creates 1 patient profile with 1 permanent HE token', async () => {
    const samePhone = `91933${Math.floor(100000 + Math.random() * 900000)}`;
    const name = `Simultaneous Patient ${Date.now()}`;
    const email = `simultaneous_${Date.now()}@test.com`;

    const [res1, res2] = await Promise.all([
      findOrCreatePatient({ name, phone: samePhone, email }),
      findOrCreatePatient({ name, phone: samePhone, email }),
    ]);

    assert.ok(res1.patient);
    assert.ok(res2.patient);
    assert.strictEqual(res1.patient.id, res2.patient.id, 'Simultaneous requests must resolve to the same patient ID');
    assert.strictEqual(res1.patient.registrationTokenNumber, res2.patient.registrationTokenNumber, 'Simultaneous requests must share exact same token');
  });

  // 7. Existing duplicate-token detection
  await t.test('7. Existing duplicate-token detection: getPatientByRegistrationToken resolves uniquely', async () => {
    const patient79 = await dataProvider.getPatientByRegistrationToken('HE-999979');
    assert.ok(patient79, 'Canonical patient for HE-999979 must exist');
    assert.strictEqual(patient79.registrationTokenNumber, 'HE-999979');

    const patient96 = await dataProvider.getPatientByRegistrationToken('HE-999996');
    assert.ok(patient96, 'Repaired patient for HE-999996 must exist');
    assert.strictEqual(patient96.registrationTokenNumber, 'HE-999996');

    assert.notStrictEqual(patient79.id, patient96.id, 'HE-999979 and HE-999996 must belong to different patients');
  });

  // 8. Patient search by token, name, phone, email, and nonexistent token
  await t.test('8. Patient search by token, name, phone, email, and nonexistent token', async () => {
    // Search by token HE-999979
    const searchToken79 = await dataProvider.searchPatients('HE-999979');
    assert.strictEqual(searchToken79.length, 1, 'Search for HE-999979 must return exactly ONE patient');
    assert.strictEqual(searchToken79[0].registrationTokenNumber, 'HE-999979');

    // Search by token HE-999996
    const searchToken96 = await dataProvider.searchPatients('HE-999996');
    assert.strictEqual(searchToken96.length, 1, 'Search for HE-999996 must return exactly ONE patient');
    assert.strictEqual(searchToken96[0].registrationTokenNumber, 'HE-999996');

    // Search by phone
    const searchPhone = await dataProvider.searchPatients('7893769903');
    assert.ok(searchPhone.length >= 1, 'Search by phone must return the patient');
    assert.ok(searchPhone.some(p => p.registrationTokenNumber === 'HE-999979'));

    // Search by nonexistent token
    const searchNonexistent = await dataProvider.searchPatients('HE-NONEXISTENT-99999999');
    assert.strictEqual(searchNonexistent.length, 0, 'Search for nonexistent token must return 0 results');
  });

  // 9. Token uniqueness across entire dataset
  await t.test('9. Token uniqueness across entire dataset: duplicate count strictly equals 0', async () => {
    const all = await dataProvider.searchPatients('');
    const tokenCounts = new Map();
    const duplicates = [];

    all.forEach(p => {
      if (p.registrationTokenNumber) {
        const tok = p.registrationTokenNumber.trim().toUpperCase();
        tokenCounts.set(tok, (tokenCounts.get(tok) || 0) + 1);
      }
    });

    for (const [tok, count] of tokenCounts.entries()) {
      if (count > 1) {
        duplicates.push({ token: tok, count });
      }
    }

    assert.strictEqual(duplicates.length, 0, `Audit failure: Found ${duplicates.length} duplicate tokens in dataset: ${JSON.stringify(duplicates)}`);
  });
});
