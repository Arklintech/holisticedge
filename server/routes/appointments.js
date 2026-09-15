import express from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { getActiveDataProvider } from '../providers/dataProvider.js';
import { sendAppointmentConfirmationEmail } from '../services/emailService.js';
import { notificationService } from '../services/notificationService.js';
import { scheduleReminder } from '../services/reminderService.js';

const router = express.Router();
const dataProvider = getActiveDataProvider();

// GET /api/appointments
router.get('/', async (req, res) => {
  try {
    let appointments = [];
    try {
      appointments = await dataProvider.getAppointments(req.query);
    } catch (e) {
      appointments = db.get('appointments') || [];
    }

    // Enrich appointments with patient name, phone, email
    let patients = [];
    try {
      patients = (await dataProvider.searchPatients('')) || [];
    } catch (e) {
      patients = db.get('patients') || [];
    }
    const patientsById = new Map();
    const patientsByToken = new Map();
    const localPatients = db.get('patients') || [];
    [...localPatients, ...patients].forEach(p => {
      if (p.id) patientsById.set(p.id, p);
      if (p.registrationTokenNumber) patientsByToken.set(p.registrationTokenNumber.toUpperCase(), p);
    });

    const enriched = appointments.map(a => {
      const p = patientsById.get(a.patientId) || (a.registrationTokenNumber ? patientsByToken.get(a.registrationTokenNumber.toUpperCase()) : null);
      const name = a.fullName || a.patientName || p?.name || 'Walk-in Patient';
      const phone = a.phone || a.patientPhone || p?.phone || '';
      const email = a.email || a.patientEmail || p?.email || '';
      const date = a.date || a.preferredDate || '';
      const time = a.time || a.preferredTime || '';
      return {
        ...a,
        fullName: name,
        patientName: name,
        phone,
        patientPhone: phone,
        email,
        patientEmail: email,
        preferredDate: date,
        preferredTime: time,
        date,
        time,
      };
    });

    res.json({ success: true, count: enriched.length, appointments: enriched });
  } catch (err) {
    const appointments = db.get('appointments') || [];
    res.json({ success: true, count: appointments.length, appointments });
  }
});

// GET /api/appointments/:id
router.get('/:id', async (req, res) => {
  let appt = db.find('appointments', a => a.id === req.params.id);
  if (!appt) {
    try {
      const all = await dataProvider.getAppointments();
      appt = all.find(a => a.id === req.params.id) || null;
    } catch (e) {}
  }
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  // Enrich with patient details if missing
  if (!appt.fullName || !appt.phone) {
    let patient = null;
    try {
      if (appt.patientId) {
        patient = await dataProvider.getPatientById(appt.patientId);
      }
      if (!patient && appt.registrationTokenNumber) {
        patient = await dataProvider.getPatientByRegistrationToken(appt.registrationTokenNumber);
      }
    } catch (e) {}

    appt = {
      ...appt,
      fullName: appt.fullName || appt.patientName || patient?.name || 'Walk-in Patient',
      patientName: appt.patientName || appt.fullName || patient?.name || 'Walk-in Patient',
      phone: appt.phone || appt.patientPhone || patient?.phone || '',
      patientPhone: appt.patientPhone || appt.phone || patient?.phone || '',
      email: appt.email || appt.patientEmail || patient?.email || '',
      patientEmail: appt.patientEmail || appt.email || patient?.email || '',
      preferredDate: appt.preferredDate || appt.date || '',
      preferredTime: appt.preferredTime || appt.time || '',
      date: appt.date || appt.preferredDate || '',
      time: appt.time || appt.preferredTime || '',
    };
  }

  res.json({ success: true, appointment: appt });
});

// POST /api/appointments (Public booking & Admin creation)
router.post('/', async (req, res) => {
  const {
    fullName,
    patientName,
    phone,
    email,
    service,
    condition,
    preferredDate,
    date,
    preferredTime,
    timeSlot,
    notes,
    status,
    source,
  } = req.body;

  const pName = fullName || patientName;
  const pDate = date || preferredDate;
  const pTime = timeSlot || preferredTime;

  if (!pName || !phone || !service) {
    return res.status(400).json({ error: 'Patient name, phone, and service are required.' });
  }

  if (email) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    const cleanEmail = email.trim();
    if (!emailRegex.test(cleanEmail) || cleanEmail.includes('<') || cleanEmail.includes('>') || !cleanEmail.split('@')[1]?.includes('.')) {
      return res.status(400).json({
        error: 'Please provide a valid email address with a domain (e.g. name@example.com).',
        field: 'email',
      });
    }
  }

  const apptId = `HE-APPT-${Date.now().toString().slice(-6)}`;
  const newAppt = {
    id: apptId,
    fullName: pName,
    patientName: pName,
    phone,
    email: email || '',
    service,
    condition: condition || 'General Care',
    preferredDate: pDate || new Date().toISOString().split('T')[0],
    preferredTime: pTime || '10:00 AM',
    notes: notes || '',
    status: status || 'Pending',
    source: source || 'Website',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Find or create patient for admin appointment
  let patient = db.find('patients', p => (p.phone && p.phone === phone) || (email && p.email === email));
  if (!patient) {
    const token = `HE-${Date.now().toString().slice(-6)}`;
    patient = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: pName,
      phone,
      email: email || '',
      registrationTokenNumber: token,
      patientType: 'Standard',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await dataProvider.createPatient(patient);
    } catch (e) {
      db.insert('patients', patient);
    }
  }

  newAppt.patientId = patient.id;
  newAppt.registrationTokenNumber = patient.registrationTokenNumber;

  try {
    await dataProvider.createAppointment(newAppt);
  } catch (err) {
    db.insert('appointments', newAppt);
  }

  // Trigger confirmation email if email provided
  let emailSent = false;
  if (email) {
    try {
      const emailResult = await sendAppointmentConfirmationEmail(newAppt, patient);
      emailSent = Boolean(emailResult?.success);
    } catch (err) {
      console.warn('[AdminAppointments] Confirmation email send error:', err.message);
    }
  }

  // Auto-create lead
  const leadId = `LEAD-${Date.now().toString().slice(-6)}`;
  db.insert('leads', {
    id: leadId,
    fullName: pName,
    phone,
    email: email || '',
    condition: condition || service,
    message: notes || `Booked appointment for ${pDate} (${pTime})`,
    source: source || 'Website Booking',
    status: 'Converted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Auto-create notification
  db.insert('notifications', {
    id: `notif_${Date.now()}`,
    type: 'appointment',
    title: 'New Appointment Booking',
    message: `${pName} booked ${service} for ${pDate} (${pTime})`,
    entityId: apptId,
    entityType: 'appointment',
    link: `/admin/appointments/${apptId}`,
    status: 'unread',
    createdAt: new Date().toISOString(),
  });

  // Audit log
  db.insert('auditLogs', {
    id: `audit_${Date.now()}`,
    actor: pName,
    action: 'created',
    entity: 'appointment',
    entityId: apptId,
    description: `Patient ${pName} booked ${service} via ${source || 'Website'}`,
    timestamp: new Date().toISOString(),
  });

  // Auto-schedule pre-appointment reminder (appointment date - 1 day)
  try {
    const apptDate = new Date(pDate || new Date().toISOString().split('T')[0] + 'T00:00:00');
    apptDate.setDate(apptDate.getDate() - 1);
    const reminderDate = apptDate.toISOString().split('T')[0];
    await scheduleReminder({
      patientId: patient.id,
      scheduledDate: reminderDate,
      scheduledTime: pTime || '10:00 AM',
      notes: `Pre-appointment reminder — please confirm your ${service} appointment scheduled for ${pDate || 'your booked date'}.`,
    });
    db.insert('notifications', {
      id: `notif_rem_${Date.now()}`,
      type: 'reminder',
      title: 'Pre-Appointment Reminder Scheduled',
      message: `Reminder queued for ${pName} on ${reminderDate} (1 day before ${pDate}).`,
      entityId: apptId,
      entityType: 'appointment',
      link: `/admin/follow-ups`,
      status: 'unread',
      createdAt: new Date().toISOString(),
    });
  } catch (remErr) {
    console.warn('[AppointmentsRoute] Pre-appointment reminder schedule notice:', remErr.message);
  }

  // Trigger unified notification service for confirmation (Email & WhatsApp readiness)
  try {
    await notificationService.notify({
      eventType: 'appointment_confirmed',
      patient,
      appointment: newAppt,
    });
  } catch (notifErr) {
    console.error('[AppointmentsRoute] Notification error:', notifErr.message);
  }

  res.status(201).json({ success: true, appointment: newAppt, patient, emailSent });
});

// Helper to attach metadata based on status transition
function enrichStatusPayload(body, user) {
  const payload = { ...body, updatedAt: new Date().toISOString() };
  if (!payload.status) return payload;

  const raw = payload.status.toString().trim();
  const normalized = raw.toUpperCase().replace(/[\s-]+/g, '_');
  const actor = user?.name || user?.email || 'Admin';

  if (normalized === 'COMPLETED') {
    payload.status = 'COMPLETED';
    payload.completedAt = payload.completedAt || new Date().toISOString();
    payload.completedBy = payload.completedBy || actor;
  } else if (normalized === 'CANCELLED') {
    payload.status = 'CANCELLED';
    payload.cancelledAt = payload.cancelledAt || new Date().toISOString();
    payload.cancelledBy = payload.cancelledBy || actor;
  } else if (normalized === 'NO_SHOW') {
    payload.status = 'NO_SHOW';
    payload.noShowAt = payload.noShowAt || new Date().toISOString();
    payload.noShowMarkedBy = payload.noShowMarkedBy || actor;
  } else if (normalized === 'CONFIRMED') {
    payload.status = 'CONFIRMED';
    payload.confirmedAt = payload.confirmedAt || new Date().toISOString();
    payload.confirmedBy = payload.confirmedBy || actor;
  }
  return payload;
}

// PATCH /api/appointments/:id/status
router.patch('/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const apptId = req.params.id;
  const updatePayload = enrichStatusPayload(req.body, req.user);

  // 1. Update in local db
  let updated = db.update('appointments', apptId, updatePayload);

  // 2. Persist to Google Sheets / dataProvider
  try {
    await dataProvider.updateAppointment(apptId, updatePayload);
  } catch (sheetErr) {
    console.warn('[AppointmentsRoute] Google Sheets status update notice:', sheetErr.message);
  }

  // 3. Fallback lookup if record was from Google Sheets and not yet in db.json
  if (!updated) {
    try {
      const all = await dataProvider.getAppointments();
      const existing = all.find(a => a.id === apptId);
      if (existing) {
        updated = { ...existing, ...updatePayload };
        db.insert('appointments', updated);
      }
    } catch (_) {}
  }

  if (!updated) return res.status(404).json({ error: 'Appointment not found' });

  // 4. Audit Log
  db.insert('auditLogs', {
    id: `audit_${Date.now()}`,
    actor: req.user?.name || req.user?.email || 'Admin',
    action: 'updated_status',
    entity: 'appointment',
    entityId: apptId,
    description: `Updated appointment status to ${updatePayload.status}`,
    timestamp: new Date().toISOString(),
  });

  // 5. Trigger notification event
  try {
    const patient = db.find('patients', p => p.id === updated.patientId || p.phone === updated.patientPhone);
    const eventType = updatePayload.status === 'CANCELLED' ? 'appointment_cancelled' : 'appointment_rescheduled';
    await notificationService.notify({
      eventType,
      patient,
      appointment: updated,
    });
  } catch (_) {}

  // Post-visit follow-ups are ADMIN-INITIATED via Patient → Set Follow-up workflow.
  // No automatic follow-up is created here.
  res.json({ success: true, appointment: updated });
});

// PUT & PATCH /api/appointments/:id
const handleUpdateAppointment = async (req, res) => {
  const apptId = req.params.id;
  const updatePayload = enrichStatusPayload(req.body, req.user);

  let updated = db.update('appointments', apptId, updatePayload);

  // Persist to Google Sheets / dataProvider
  try {
    await dataProvider.updateAppointment(apptId, updatePayload);
  } catch (sheetErr) {
    console.warn('[AppointmentsRoute] Google Sheets update notice:', sheetErr.message);
  }

  if (!updated) {
    try {
      const all = await dataProvider.getAppointments();
      const existing = all.find(a => a.id === apptId);
      if (existing) {
        updated = { ...existing, ...updatePayload };
        db.insert('appointments', updated);
      }
    } catch (e) {}
  }
  if (!updated) return res.status(404).json({ error: 'Appointment not found' });

  db.insert('auditLogs', {
    id: `audit_${Date.now()}`,
    actor: req.user?.name || req.user?.email || 'Admin',
    action: 'updated',
    entity: 'appointment',
    entityId: apptId,
    description: `Updated appointment fields (${Object.keys(req.body).join(', ')})`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, appointment: updated });
};

router.put('/:id', authenticate, handleUpdateAppointment);
router.patch('/:id', authenticate, handleUpdateAppointment);

// DELETE /api/appointments/:id
router.delete('/:id', authenticate, (req, res) => {
  const deleted = db.delete('appointments', req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ success: true, message: 'Appointment deleted successfully' });
});

export default router;

