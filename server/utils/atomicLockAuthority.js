import { db } from '../db.js';

class AtomicLockAuthority {
  constructor() {
    this.locks = new Map();
  }

  /**
   * Acquire a named lock with an explicit ownerId and timeout.
   * Uses an atomic Compare-And-Set (CAS) check against the central store.
   */
  async acquireLock(lockKey, ownerId, timeoutMs = 5000) {
    const now = Date.now();
    let counters = db.get('counters') || [];
    let record = counters.find(c => c.key === lockKey);

    if (!record) {
      record = {
        id: `cnt_${lockKey}`,
        key: lockKey,
        seq: 0,
        lockOwnerId: '',
        lockTimestamp: 0,
        version: 1,
      };
      db.insert('counters', record);
    }

    // Check if lock is active and held by another non-expired owner
    if (record.lockOwnerId && record.lockOwnerId !== ownerId) {
      if (now - record.lockTimestamp < timeoutMs) {
        // Active lock held by another owner: Acquisition Rejected
        return false;
      }
      // Stale lock (> timeoutMs): Recover lock
    }

    // Attempt Atomic CAS Update
    const updatedVersion = (record.version || 0) + 1;
    const updated = db.update('counters', record.id, {
      lockOwnerId: ownerId,
      lockTimestamp: now,
      version: updatedVersion,
      updatedAt: new Date(now).toISOString(),
    });

    // Verify CAS ownership
    if (updated && updated.lockOwnerId === ownerId && updated.version === updatedVersion) {
      return true;
    }

    return false;
  }

  /**
   * Release a named lock atomically if owned by ownerId.
   */
  async releaseLock(lockKey, ownerId) {
    const counters = db.get('counters') || [];
    const record = counters.find(c => c.key === lockKey);

    if (record && record.lockOwnerId === ownerId) {
      db.update('counters', record.id, {
        lockOwnerId: '',
        lockTimestamp: 0,
        version: (record.version || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }

  /**
   * Atomically reserve the next sequential HE-XXXXXX registration token.
   */
  async reserveNextRegistrationToken(ownerId = `owner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`) {
    const lockKey = 'PATIENT_REGISTRATION_TOKEN';
    const maxRetries = 35;
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;
      const acquired = await this.acquireLock(lockKey, ownerId, 5000);
      if (!acquired) {
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 25) + 15));
        continue;
      }

      try {
        let counters = db.get('counters') || [];
        let record = counters.find(c => c.key === lockKey);

        let currentSeq = record ? record.seq : 0;
        if (currentSeq === 0) {
          const patients = db.get('patients') || [];
          patients.forEach(p => {
            if (p.registrationTokenNumber && p.registrationTokenNumber.startsWith('HE-')) {
              const num = parseInt(p.registrationTokenNumber.replace('HE-', ''), 10);
              if (!isNaN(num) && num > currentSeq) currentSeq = num;
            }
          });
        }

        const nextSeq = currentSeq + 1;
        db.update('counters', record.id, {
          seq: nextSeq,
          version: (record.version || 0) + 1,
          updatedAt: new Date().toISOString(),
        });

        const reservedToken = `HE-${String(nextSeq).padStart(6, '0')}`;
        await this.releaseLock(lockKey, ownerId);
        return reservedToken;
      } catch (err) {
        await this.releaseLock(lockKey, ownerId);
        throw err;
      }
    }

    throw new Error('Failed to reserve registration token from AtomicLockAuthority after maximum retries');
  }
}

export const atomicLockAuthority = new AtomicLockAuthority();
