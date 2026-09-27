import { getActiveDataProvider } from '../providers/dataProvider.js';
import { db } from '../db.js';

const dataProvider = getActiveDataProvider();

// In-flight phone lock map to serialize concurrent creations for the exact same phone number
const inFlightPhoneLocks = new Map();

/**
 * Shared External Token Allocation Authority
 * ----------------------------------------------------
 * Reserves the next sequential HE-XXXXXX token from the central shared DataProvider
 * (SYSTEM_COUNTERS sheet in Google Sheets / atomic counter store in dev/test).
 */
export async function allocateRegistrationToken() {
  return dataProvider.allocateNextRegistrationToken();
}

export function normalizePhoneDigits(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  }
  return digits;
}

export async function matchPatient({ name, phone, email, registrationTokenNumber }) {
  // 1. HIGHEST: Exact Registration / Token Number
  if (registrationTokenNumber) {
    const byToken = await dataProvider.getPatientByRegistrationToken(registrationTokenNumber);
    if (byToken) {
      return { status: 'MATCHED_EXACT', patient: byToken, confidence: 'HIGHEST' };
    }
  }

  const cleanPhone = normalizePhoneDigits(phone);
  const cleanEmail = email ? email.toLowerCase().trim() : '';
  const cleanName = name ? name.toLowerCase().trim() : '';

  const allPatients = await dataProvider.searchPatients('');

  // 2. HIGH: Exact Verified Phone
  if (cleanPhone) {
    const phoneMatches = allPatients.filter(p => p.phone && normalizePhoneDigits(p.phone) === cleanPhone);
    if (phoneMatches.length === 1) {
      return { status: 'MATCHED_EXACT', patient: phoneMatches[0], confidence: 'HIGH' };
    } else if (phoneMatches.length > 1) {
      if (cleanEmail) {
        const exactBoth = phoneMatches.find(p => p.email && p.email.toLowerCase().trim() === cleanEmail);
        if (exactBoth) {
          return { status: 'MATCHED_EXACT', patient: exactBoth, confidence: 'HIGH_EXACT' };
        }
      }
      return { status: 'AMBIGUOUS', matches: phoneMatches, confidence: 'HIGH_AMBIGUOUS' };
    }
  }

  // 3. MEDIUM: Exact Email
  if (cleanEmail) {
    const emailMatches = allPatients.filter(p => p.email && p.email.toLowerCase().trim() === cleanEmail);
    if (emailMatches.length === 1) {
      return { status: 'MATCHED_EXACT', patient: emailMatches[0], confidence: 'MEDIUM' };
    } else if (emailMatches.length > 1) {
      if (cleanPhone) {
        const exactBoth = emailMatches.find(p => p.phone && normalizePhoneDigits(p.phone) === cleanPhone);
        if (exactBoth) {
          return { status: 'MATCHED_EXACT', patient: exactBoth, confidence: 'MEDIUM_EXACT' };
        }
      }
      return { status: 'AMBIGUOUS', matches: emailMatches, confidence: 'MEDIUM_AMBIGUOUS' };
    }
  }

  // 4. LOW: Similar Name (No auto-merge, return potential matches)
  if (cleanName) {
    const nameMatches = allPatients.filter(p => p.name && p.name.toLowerCase().trim() === cleanName);
    if (nameMatches.length > 0) {
      return { status: 'AMBIGUOUS', matches: nameMatches, confidence: 'LOW_AMBIGUOUS' };
    }
  }

  return { status: 'NO_MATCH', patient: null, confidence: 'NONE' };
}

export async function findOrCreatePatient(patientInput) {
  const cleanPhone = normalizePhoneDigits(patientInput.phone);

  if (cleanPhone && inFlightPhoneLocks.has(cleanPhone)) {
    // Wait for in-flight patient creation with exact same phone number
    await inFlightPhoneLocks.get(cleanPhone);
    const reMatch = await matchPatient(patientInput);
    if (reMatch.status === 'MATCHED_EXACT') {
      return { patient: reMatch.patient, isNew: false, isAmbiguous: false };
    }
  }

  let resolvePhoneLock;
  const phoneLockPromise = new Promise(resolve => { resolvePhoneLock = resolve; });
  if (cleanPhone) {
    inFlightPhoneLocks.set(cleanPhone, phoneLockPromise);
  }

  try {
    const matchResult = await matchPatient(patientInput);

    if (matchResult.status === 'MATCHED_EXACT') {
      return { patient: matchResult.patient, isNew: false, isAmbiguous: false };
    }

    if (matchResult.status === 'AMBIGUOUS') {
      return { patient: null, isNew: false, isAmbiguous: true, matches: matchResult.matches };
    }

    // Reserve token from central shared authority
    const registrationTokenNumber = await allocateRegistrationToken();

    // Pre-write uniqueness check
    const existingWithToken = await dataProvider.getPatientByRegistrationToken(registrationTokenNumber);
    if (existingWithToken) {
      const fallbackToken = await allocateRegistrationToken();
      const newPatient = {
        id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        registrationTokenNumber: fallbackToken,
        name: patientInput.name.trim(),
        phone: patientInput.phone.trim(),
        email: patientInput.email ? patientInput.email.trim() : '',
        patientType: patientInput.patientType || 'Standard',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const created = await dataProvider.createPatient(newPatient);
      return { patient: created, isNew: true, isAmbiguous: false };
    }

    const newPatient = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      registrationTokenNumber,
      name: patientInput.name.trim(),
      phone: patientInput.phone.trim(),
      email: patientInput.email ? patientInput.email.trim() : '',
      patientType: patientInput.patientType || 'Standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await dataProvider.createPatient(newPatient);
    return { patient: created, isNew: true, isAmbiguous: false };
  } finally {
    if (cleanPhone) {
      inFlightPhoneLocks.delete(cleanPhone);
      resolvePhoneLock();
    }
  }
}
