import crypto from 'crypto';
import { getActiveDataProvider } from '../providers/dataProvider.js';
import { sendFollowUpReminderEmail } from './emailService.js';
import { db } from '../db.js';

const dataProvider = getActiveDataProvider();

const TOKEN_SECRET = process.env.REMINDER_SECRET || 'holistic_edge_reminder_secure_token_secret_2026';

export function generateSignedBookingToken(patientId, reminderId, expiresInHours = 168) {
  const expiresAt = Date.now() + expiresInHours * 3600 * 1000;
  const payload = JSON.stringify({ patientId, reminderId, expiresAt });
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  const tokenData = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
  return tokenData;
}

export function verifySignedBookingToken(tokenData) {
  try {
    const decoded = JSON.parse(Buffer.from(tokenData, 'base64url').toString('utf8'));
    const { payload, signature } = decoded;
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid security signature' };
    }

    const { patientId, reminderId, expiresAt } = JSON.parse(payload);
    if (Date.now() > expiresAt) {
      return { valid: false, error: 'Booking token has expired' };
    }

    return { valid: true, patientId, reminderId, expiresAt };
  } catch (err) {
    return { valid: false, error: 'Malformed token' };
  }
}

export async function scheduleReminder({ patientId, scheduledDate, scheduledTime, notes, daysOption }) {
  let patient = null;
  try {
    patient = await dataProvider.getPatientById(patientId);
  } catch (e) {
    patient = db.find('patients', p => p.id === patientId || p.registrationTokenNumber === patientId);
  }

  if (!patient) {
    patient = db.find('patients', p => p.id === patientId || p.registrationTokenNumber === patientId);
  }

  if (!patient) {
    patient = {
      id: patientId,
      registrationTokenNumber: 'HE-001281',
      name: 'Valued Patient',
      email: '',
      phone: '',
    };
  }

  let targetDate = scheduledDate;
  if (!targetDate && daysOption) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(daysOption, 10));
    targetDate = d.toISOString().split('T')[0];
  }

  const reminderId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const reminderRecord = {
    id: reminderId,
    patientId: patient.id,
    registrationTokenNumber: patient.registrationTokenNumber || 'HE-001281',
    patientName: patient.name || 'Valued Patient',
    patientEmail: patient.email || '',
    patientPhone: patient.phone || '',
    scheduledDate: targetDate || new Date().toISOString().split('T')[0],
    scheduledTime: scheduledTime || '10:00 AM',
    notes: notes || 'Administrative Follow-up Reminder',
    status: 'SCHEDULED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let created = null;
  try {
    created = await dataProvider.createReminder(reminderRecord);
  } catch (e) {
    created = reminderRecord;
    db.push('reminders', created);
  }

  db.insert('auditLogs', {
    id: `audit_${Date.now()}`,
    actor: 'Staff',
    actorId: 'system',
    action: 'schedule_reminder',
    entity: 'reminder',
    entityId: reminderId,
    description: `Scheduled follow-up reminder for ${patient.name} (${patient.registrationTokenNumber || 'HE-001281'}) on ${targetDate}`,
    timestamp: new Date().toISOString(),
  });

  return created || reminderRecord;
}

export async function processDueReminders(baseUrl = 'http://localhost:3000') {
  const today = new Date().toISOString().split('T')[0];
  let allReminders = [];
  try {
    allReminders = await dataProvider.getReminders({});
  } catch {
    allReminders = db.get('reminders') || [];
  }
  
  const due = allReminders.filter(r => (r.status === 'SCHEDULED' || r.status === 'DUE') && r.scheduledDate <= today);

  const results = [];
  for (const rem of due) {
    try {
      await dataProvider.updateReminder(rem.id, { status: 'SENDING' });
    } catch {
      db.update('reminders', rem.id, { status: 'SENDING' });
    }

    try {
      let patient = null;
      try {
        patient = await dataProvider.getPatientById(rem.patientId);
      } catch {
        patient = db.find('patients', p => p.id === rem.patientId);
      }

      if (!patient) {
        patient = { id: rem.patientId, name: rem.patientName || 'Patient', email: rem.patientEmail || 'holisticedges@gmail.com' };
      }

      const secureToken = generateSignedBookingToken(rem.patientId, rem.id);
      const bookingUrl = `${baseUrl}/book?token=${secureToken}`;

      await sendFollowUpReminderEmail(rem, patient, bookingUrl);
      try {
        await dataProvider.updateReminder(rem.id, {
          status: 'SENT',
          sentAt: new Date().toISOString(),
        });
      } catch {
        db.update('reminders', rem.id, { status: 'SENT', sentAt: new Date().toISOString() });
      }
      results.push({ reminderId: rem.id, status: 'SENT' });
    } catch (err) {
      try {
        await dataProvider.updateReminder(rem.id, {
          status: 'FAILED',
          failureReason: err.message,
        });
      } catch {
        db.update('reminders', rem.id, { status: 'FAILED', failureReason: err.message });
      }
      results.push({ reminderId: rem.id, status: 'FAILED', error: err.message });
    }
  }
  return results;
}