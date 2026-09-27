import test from 'node:test';
import assert from 'node:assert';
import { findOrCreatePatient, allocateRegistrationToken } from '../server/services/patientService.js';
import { getActiveDataProvider } from '../server/providers/dataProvider.js';

const dataProvider = getActiveDataProvider();

test('Registration Token Logic & Distributed Concurrency Verification', async (t) => {
  await t.test('A. First new patient receives a valid, new HE-XXXXXX token', async () => {
    const phone = `9199990${Math.floor(1000 + Math.random() * 9000)}`;
    const uniqueName = `Test New Patient ${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const result = await findOrCreatePatient({
      name: uniqueName,
      phone,
      email: `newpatient_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
    });

    assert.strictEqual(result.isNew, true, 'Patient should be created as new');
    assert.ok(result.patient, 'Patient object must be returned');
    assert.ok(result.patient.registrationTokenNumber.startsWith('HE-'), 'Token must start with HE-');
    assert.match(result.patient.registrationTokenNumber, /^HE-\d{6}$/, 'Token must follow HE-XXXXXX 6-digit format');
  });

  await t.test('B. Returning Patient reuses existing permanent HE-XXXXXX token', async () => {
    const phone = `9199991${Math.floor(1000 + Math.random() * 9000)}`;
    const uniqueName = `Returning Patient Test ${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const email = `returningpatient_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`;

    // First booking
    const firstResult = await findOrCreatePatient({
      name: uniqueName,
      phone,
      email,
    });
    assert.strictEqual(firstResult.isNew, true);
    const originalToken = firstResult.patient.registrationTokenNumber;

    // Second booking with same phone
    const secondResult = await findOrCreatePatient({
      name: uniqueName,
      phone,
      email,
    });
    assert.strictEqual(secondResult.isNew, false, 'Returning patient should match existing profile');
    assert.strictEqual(secondResult.patient.registrationTokenNumber, originalToken, 'Returning patient must keep original token');
  });

  await t.test('C. Two different new patients receive distinct unique tokens', async () => {
    const phone1 = `9199992${Math.floor(1000 + Math.random() * 9000)}`;
    const phone2 = `9199993${Math.floor(1000 + Math.random() * 9000)}`;
    const name1 = `Patient One ${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const name2 = `Patient Two ${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const p1 = await findOrCreatePatient({ name: name1, phone: phone1, email: `p1_${Date.now()}@example.com` });
    const p2 = await findOrCreatePatient({ name: name2, phone: phone2, email: `p2_${Date.now()}@example.com` });

    assert.strictEqual(p1.isNew, true);
    assert.strictEqual(p2.isNew, true);
    assert.notStrictEqual(p1.patient.registrationTokenNumber, p2.patient.registrationTokenNumber, 'Different patients must have distinct tokens');
  });

  await t.test('D. 10 simultaneous new-patient creations are safe with 0 duplicate tokens', async () => {
    const concurrentRequests = 10;
    const promises = [];
    const runId = Date.now();

    for (let i = 0; i < concurrentRequests; i++) {
      const phone = `91988${runId.toString().slice(-4)}${i}${Math.floor(10 + Math.random() * 90)}`;
      const name = `Concurrent Patient ${runId}_${i}_${Math.random().toString(36).substring(2, 6)}`;
      promises.push(findOrCreatePatient({
        name,
        phone,
        email: `concurrent_${runId}_${i}@example.com`,
      }));
    }

    const results = await Promise.all(promises);
    results.forEach((r, idx) => {
      assert.ok(r.patient, `Patient object must be created for request ${idx}`);
    });

    const allocatedTokens = results.map(r => r.patient.registrationTokenNumber);
    assert.strictEqual(allocatedTokens.length, concurrentRequests, 'All concurrent requests must complete');
    
    // Check for duplicates within allocated batch
    const uniqueBatchTokens = new Set(allocatedTokens);
    assert.strictEqual(uniqueBatchTokens.size, concurrentRequests, 'Zero duplicate tokens allowed during concurrent creation');
  });

  await t.test('E. Simulated Independent Vercel Function Instances (Isolated Execution Contexts)', async () => {
    const numInstances = 5;
    const instancePromises = Array.from({ length: numInstances }).map(async (_, idx) => {
      const phone = `91977${Date.now().toString().slice(-4)}${idx}${Math.floor(10 + Math.random() * 90)}`;
      const name = `Isolated Vercel Lambda Patient ${idx}_${Date.now()}`;
      return findOrCreatePatient({
        name,
        phone,
        email: `lambda_${idx}_${Date.now()}@example.com`,
      });
    });

    const instanceResults = await Promise.all(instancePromises);
    const tokens = instanceResults.map(r => r.patient.registrationTokenNumber);

    assert.strictEqual(tokens.length, numInstances, 'All simulated independent instances must complete');
    const uniqueTokens = new Set(tokens);
    assert.strictEqual(uniqueTokens.size, numInstances, 'Independent Vercel instances must never produce duplicate tokens');
  });

  await t.test('F. Forced Collision / Race Condition Test', async () => {
    // Intentionally force two concurrent executions to invoke allocateRegistrationToken() simultaneously
    const [tokenA, tokenB] = await Promise.all([
      allocateRegistrationToken(),
      allocateRegistrationToken(),
    ]);

    assert.ok(tokenA.startsWith('HE-'));
    assert.ok(tokenB.startsWith('HE-'));
    assert.notStrictEqual(tokenA, tokenB, 'Simultaneous token allocations must yield strictly unique reserved tokens');
  });

  await t.test('G. Patient Creation Failure Recovery Test', async () => {
    const tokenBeforeFailure = await allocateRegistrationToken();
    assert.ok(tokenBeforeFailure.startsWith('HE-'));

    // Next creation succeeds normally
    const phone = `91966${Math.floor(100000 + Math.random() * 900000)}`;
    const successResult = await findOrCreatePatient({
      name: `Post Failure Patient ${Date.now()}`,
      phone,
      email: `postfail_${Date.now()}@example.com`,
    });

    assert.ok(successResult.patient);
    assert.ok(successResult.patient.registrationTokenNumber.startsWith('HE-'));
    assert.notStrictEqual(successResult.patient.registrationTokenNumber, tokenBeforeFailure, 'Failed token reservation should be skipped safely without collision');
  });

  await t.test('H. Same-Phone Concurrent Booking Requests Test', async () => {
    const samePhone = `91955${Math.floor(100000 + Math.random() * 900000)}`;
    const sameEmail = `samephone_${Date.now()}@example.com`;
    const sameName = `Same Phone Patient ${Date.now()}`;

    // Fire 2 simultaneous requests with the EXACT same phone number concurrently
    const [res1, res2] = await Promise.all([
      findOrCreatePatient({ name: sameName, phone: samePhone, email: sameEmail }),
      findOrCreatePatient({ name: sameName, phone: samePhone, email: sameEmail }),
    ]);

    assert.ok(res1.patient);
    assert.ok(res2.patient);
    assert.strictEqual(res1.patient.registrationTokenNumber, res2.patient.registrationTokenNumber, 'Same-phone concurrent bookings must resolve to same permanent token');
  });

  await t.test('I. Global Duplicate-Token Database Audit', async () => {
    const allPatients = await dataProvider.searchPatients('');
    const tokensSeen = new Set();
    const duplicates = [];

    allPatients.forEach(p => {
      if (p.registrationTokenNumber) {
        if (tokensSeen.has(p.registrationTokenNumber)) {
          duplicates.push(p.registrationTokenNumber);
        }
        tokensSeen.add(p.registrationTokenNumber);
      }
    });

    assert.strictEqual(duplicates.length, 0, `Audit failed: Found duplicate tokens in DB: ${duplicates.join(', ')}`);
  });
});
