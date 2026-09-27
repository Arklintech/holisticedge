import test from 'node:test';
import assert from 'node:assert';
import { atomicLockAuthority } from '../server/utils/atomicLockAuthority.js';
import { findOrCreatePatient, allocateRegistrationToken } from '../server/services/patientService.js';
import { getActiveDataProvider } from '../server/providers/dataProvider.js';
import { db } from '../server/db.js';

const dataProvider = getActiveDataProvider();

test('Atomic Lock Authority & Distributed Compare-And-Set (CAS) Audit Suite', async (t) => {
  await t.test('1. Exact Lock Acquisition & Multi-Instance Isolation (A vs B)', async () => {
    const ownerA = `instance_A_${Date.now()}`;
    const ownerB = `instance_B_${Date.now()}`;
    const lockKey = `TEST_LOCK_KEY_${Date.now()}`;

    // Instance A acquires lock
    const acquiredA = await atomicLockAuthority.acquireLock(lockKey, ownerA, 5000);
    assert.strictEqual(acquiredA, true, 'Instance A must acquire lock');

    // Instance B attempts concurrent acquisition while A holds lock
    const acquiredB = await atomicLockAuthority.acquireLock(lockKey, ownerB, 5000);
    assert.strictEqual(acquiredB, false, 'Instance B must be rejected while A holds lock');

    // Instance A releases lock
    await atomicLockAuthority.releaseLock(lockKey, ownerA);

    // Now Instance B can acquire lock
    const acquiredB2 = await atomicLockAuthority.acquireLock(lockKey, ownerB, 5000);
    assert.strictEqual(acquiredB2, true, 'Instance B can acquire lock after A releases');
    await atomicLockAuthority.releaseLock(lockKey, ownerB);
  });

  await t.test('2. Multi-Second Lock Retention & Multi-Instance Rejection (Single Owner Guarantee)', async () => {
    const ownerA = `holding_instance_${Date.now()}`;
    const lockKey = `TEST_RETENTION_LOCK_${Date.now()}`;

    // Instance A acquires lock
    const acquiredA = await atomicLockAuthority.acquireLock(lockKey, ownerA, 10000);
    assert.strictEqual(acquiredA, true);

    // Keep A holding lock and run 5 independent acquisition attempts
    const attempts = ['instance_C', 'instance_D', 'instance_E', 'instance_F', 'instance_G'];
    const results = await Promise.all(attempts.map(id => atomicLockAuthority.acquireLock(lockKey, `${id}_${Date.now()}`, 10000)));

    results.forEach((res, idx) => {
      assert.strictEqual(res, false, `Attempt ${attempts[idx]} must be rejected while Instance A holds lock`);
    });

    // Release lock
    await atomicLockAuthority.releaseLock(lockKey, ownerA);
  });

  await t.test('3. Stale Lock Recovery (Crashed Owner Simulation)', async () => {
    const crashedOwner = `crashed_instance_${Date.now()}`;
    const recoveringOwner = `recovering_instance_${Date.now()}`;
    const lockKey = `TEST_STALE_LOCK_${Date.now()}`;

    // Simulate crashed owner by creating a stale lock record timestamped 6000ms in the past
    let counters = db.get('counters') || [];
    let record = counters.find(c => c.key === lockKey);
    if (!record) {
      record = { id: `cnt_${lockKey}`, key: lockKey, seq: 0, lockOwnerId: crashedOwner, lockTimestamp: Date.now() - 6000, version: 1 };
      db.insert('counters', record);
    } else {
      db.update('counters', record.id, { lockOwnerId: crashedOwner, lockTimestamp: Date.now() - 6000 });
    }

    // Recovering instance attempts acquisition with 5000ms timeout
    const acquiredRecovering = await atomicLockAuthority.acquireLock(lockKey, recoveringOwner, 5000);
    assert.strictEqual(acquiredRecovering, true, 'Recovering instance must acquire stale lock after owner crash');

    await atomicLockAuthority.releaseLock(lockKey, recoveringOwner);
  });

  await t.test('4. Forced Lock-Race Test', async () => {
    const lockKey = `RACE_LOCK_${Date.now()}`;
    const owner1 = `racer_1_${Date.now()}`;
    const owner2 = `racer_2_${Date.now()}`;

    // Force 2 independent execution paths to race for lock simultaneously
    const [res1, res2] = await Promise.all([
      atomicLockAuthority.acquireLock(lockKey, owner1, 5000),
      atomicLockAuthority.acquireLock(lockKey, owner2, 5000),
    ]);

    // Exactly one must succeed and one must fail
    const successCount = (res1 ? 1 : 0) + (res2 ? 1 : 0);
    assert.strictEqual(successCount, 1, 'In a forced lock race, exactly 1 instance must acquire lock and 1 must fail');

    const winnerId = res1 ? owner1 : owner2;
    await atomicLockAuthority.releaseLock(lockKey, winnerId);
  });

  await t.test('5. 10-Way Simultaneous Concurrency Token Reservation Test', async () => {
    const concurrentRequests = 10;
    const promises = Array.from({ length: concurrentRequests }).map(() => allocateRegistrationToken());

    const tokens = await Promise.all(promises);
    assert.strictEqual(tokens.length, concurrentRequests, 'All 10 concurrent requests must complete');

    const uniqueTokens = new Set(tokens);
    assert.strictEqual(uniqueTokens.size, concurrentRequests, '10 simultaneous reservations must produce 10 strictly unique tokens');
  });

  await t.test('6. Same-Phone Concurrent Booking Requests Test', async () => {
    const samePhone = `91944${Math.floor(100000 + Math.random() * 900000)}`;
    const sameEmail = `samephone_audit_${Date.now()}@example.com`;
    const sameName = `Same Phone Audit ${Date.now()}`;

    const [res1, res2] = await Promise.all([
      findOrCreatePatient({ name: sameName, phone: samePhone, email: sameEmail }),
      findOrCreatePatient({ name: sameName, phone: samePhone, email: sameEmail }),
    ]);

    assert.ok(res1.patient);
    assert.ok(res2.patient);
    assert.strictEqual(res1.patient.registrationTokenNumber, res2.patient.registrationTokenNumber, 'Same-phone concurrent bookings must resolve to same permanent token');
  });

  await t.test('7. Global Duplicate-Token Database Audit', async () => {
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
