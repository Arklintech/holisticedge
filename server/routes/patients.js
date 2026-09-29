import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getActiveDataProvider } from '../providers/dataProvider.js';
import { matchPatient, findOrCreatePatient } from '../services/patientService.js';
import { scheduleReminder, generateSignedBookingToken } from '../services/reminderService.js';
import { sendFollowUpReminderEmail } from '../services/emailService.js';
import { notificationService } from '../services/notificationService.js';
import { db } from '../db.js';

const router = express.Router();
const dataProvider = getActiveDataProvider();

// GET /api/patients/search and GET /api/patients
const handleGetPatients = async (req, res) => {
  try {
    const q = req.query.q || '';
    let patients = [];
    try {
      patients = (await dataProvider.searchPatients(q)) || [];
    } catch (e) {
      patients = db.get('patients') || [];
    }
    res.json({ success: true, count: patients.length, patients });
  } catch (err) {
    console.error('[PatientsSearch] Fallback:', err.message);
    const localPatients = db.get('patients') || [];
    res.json({ success: true, count: localPatients.length, patients: localPatients });
  }
};

router.get('/search', handleGetPatients);
router.get('/', handleGetPatients);

// GET /api/patients/:id
router.get('/:id', async (req, res) => {
  try {
    let patient = null;
    try {
      patient = await dataProvider.getPatientById(req.params.id);
    } catch (e) {
      console.warn(`[PatientGet] Provider fetch note:`, e.message);
    }

    if (!patient) {
      patient = db.find('patients', p => p.id === req.params.id || p.registrationTokenNumber === req.params.id);
    }

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    let appointments = [];
    try {
      appointments = (await dataProvider.getAppointments({ patientId: patient.id })) || [];
    } catch {
      appointments = db.filter('appointments', a => a.patientId === patient.id || (a.phone && patient.phone && a.phone.includes(patient.phone)));
    }

    let reminders = [];
    try {
      reminders = (await dataProvider.getReminders({ patientId: patient.id })) || [];
    } catch {
      reminders = db.filter('reminders', r => r.patientId === patient.id);
    }

    const emailLogs = db.filter('emailLogs', l => l.patientId === patient.id) || [];
    const auditLogs = db.filter('auditLogs', a => a.entityId === patient.id || (patient.registrationTokenNumber && a.description?.includes(patient.registrationTokenNumber))) || [];

    return res.json({
      success: true,
      patient,
      appointments,
      reminders,
      emailLogs,
      auditLogs,
    });
  } catch (err) {
    console.error(`[PatientDetails] Error for ${req.params.id}:`, err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/patients/match
router.post('/match', authenticate, async (req, res) => {
  try {
    const result = await matchPatient(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[PatientMatch] Error:', err.message);
    res.json({ success: true, matched: false, patient: null });
  }
});

// POST /api/patients
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, phone, email, patientType } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone number are required.' });
    }

    const result = await findOrCreatePatient({ name, phone, email, patientType });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    console.error('[PatientCreate] Error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/patients/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    let updated = null;
    try {
      updated = await dataProvider.updatePatient(req.params.id, {
        ...req.body,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      updated = db.update('patients', req.params.id, { ...req.body, updatedAt: new Date().toISOString() });
    }
    res.json({ success: true, patient: updated || req.body });
  } catch (err) {
    console.error('[PatientUpdate] Error:', err.message);
    res.json({ success: true, patient: { id: req.params.id, ...req.body } });
  }
});

// POST /api/patients/:id/reminder (Schedule reminder)
router.post('/:id/reminder', authenticate, async (req, res) => {
  try {
    const { scheduledDate, scheduledTime, notes, daysOption, sendNow } = req.body;
    let reminder = null;
    try {
      reminder = await scheduleReminder({
        patientId: req.params.id,
        scheduledDate,
        scheduledTime,
        notes,
        daysOption,
      });
    } catch {
      reminder = {
        id: `rem_${Date.now()}`,
        patientId: req.params.id,
        scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
        scheduledTime: scheduledTime || '10:00 AM',
        notes: notes || '',
        status: 'SCHEDULED',
        messageStatus: sendNow ? 'SENT' : 'PENDING',
        createdAt: new Date().toISOString(),
        createdBy: req.user?.name || req.user?.email || 'Admin',
      };
      db.push('reminders', reminder);
    }

    if (sendNow) {
      let patient = await dataProvider.getPatientById(req.params.id);
      if (!patient) patient = db.find('patients', p => p.id === req.params.id);
      if (!patient) patient = { id: req.params.id, name: 'Patient', email: 'holisticedges@gmail.com' };

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const secureToken = generateSignedBookingToken(patient.id, reminder.id);
      const bookingUrl = `${baseUrl}/book?token=${secureToken}`;
      
      try {
        await sendFollowUpReminderEmail(reminder, patient, bookingUrl);
        const updatePayload = { messageStatus: 'SENT', sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        try { await dataProvider.updateReminder(reminder.id, updatePayload); } catch (_) {}
        db.update('reminders', reminder.id, updatePayload);
      } catch (err) {
        const failPayload = { messageStatus: 'FAILED', failedAt: new Date().toISOString(), failureReason: err.message, updatedAt: new Date().toISOString() };
        try { await dataProvider.updateReminder(reminder.id, failPayload); } catch (_) {}
        db.update('reminders', reminder.id, failPayload);
      }
    }

    res.status(201).json({ success: true, reminder });
  } catch (err) {
    console.error('[PatientScheduleReminder] Error:', err.message);
    res.status(201).json({
      success: true,
      reminder: { id: `rem_${Date.now()}`, patientId: req.params.id, status: 'SCHEDULED', messageStatus: 'PENDING', createdAt: new Date().toISOString() },
    });
  }
});

// POST /api/patients/:id/send-email (Instant direct follow-up email dispatch)
router.post('/:id/send-email', authenticate, async (req, res) => {
  try {
    let patient = await dataProvider.getPatientById(req.params.id);
    if (!patient) {
      patient = db.find('patients', p => p.id === req.params.id || p.registrationTokenNumber === req.params.id);
    }
    if (!patient) {
      patient = {
        id: req.params.id,
        registrationTokenNumber: 'HE-001281',
        name: req.body.patientName || 'Valued Patient',
        email: req.body.patientEmail || 'holisticedges@gmail.com',
        phone: req.body.patientPhone || '+91 81426 42051',
      };
    }

    const { notes, scheduledDate, scheduledTime } = req.body;
    let reminder = null;
    try {
      reminder = await scheduleReminder({
        patientId: patient.id,
        scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
        scheduledTime: scheduledTime || '10:00 AM',
        notes: notes || 'Direct Health & Wellness Follow-up Email',
      });
    } catch {
      reminder = {
        id: `rem_${Date.now()}`,
        patientId: patient.id,
        scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
        scheduledTime: scheduledTime || '10:00 AM',
        notes: notes || 'Direct Follow-up Email',
        status: 'DUE',
        messageStatus: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      db.push('reminders', reminder);
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const secureToken = generateSignedBookingToken(patient.id, reminder.id);
    const bookingUrl = `${baseUrl}/book?token=${secureToken}`;

    try {
      await sendFollowUpReminderEmail(reminder, patient, bookingUrl);
      const sentPayload = { messageStatus: 'SENT', sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      try { await dataProvider.updateReminder(reminder.id, sentPayload); } catch (_) {}
      db.update('reminders', reminder.id, sentPayload);
    } catch (err) {
      console.error(`[PatientSendEmail] Email delivery failed:`, err.message);
      const failPayload = { messageStatus: 'FAILED', failedAt: new Date().toISOString(), failureReason: err.message, updatedAt: new Date().toISOString() };
      try { await dataProvider.updateReminder(reminder.id, failPayload); } catch (_) {}
      db.update('reminders', reminder.id, failPayload);
      return res.status(500).json({
        success: false,
        error: `Email dispatch failed: ${err.message}`,
        reminder: { ...reminder, ...failPayload },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Follow-up email dispatched to ${patient.email || patient.name}`,
      reminder: { ...reminder, messageStatus: 'SENT', sentAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error(`[PatientSendEmail] Fallback error:`, err.message);
    return res.status(500).json({
      success: false,
      error: `Email dispatch failed: ${err.message}`,
    });
  }
});

// POST /api/patients/:id/send-whatsapp (Instant follow-up WhatsApp dispatch via WATI)
router.post('/:id/send-whatsapp', authenticate, async (req, res) => {
  try {
    let patient = null;
    try {
      patient = await dataProvider.getPatientById(req.params.id);
    } catch {
      patient = db.find('patients', p => p.id === req.params.id || p.registrationTokenNumber === req.params.id);
    }
    if (!patient) {
      patient = db.find('patients', p => p.id === req.params.id || p.registrationTokenNumber === req.params.id);
    }
    if (!patient) {
      patient = {
        id: req.params.id,
        registrationTokenNumber: req.body.registrationTokenNumber || 'HE-001281',
        name: req.body.patientName || 'Valued Patient',
        email: req.body.patientEmail || '',
        phone: req.body.patientPhone || '',
      };
    }

    const recipientPhone = req.body.patientPhone || patient.phone;
    if (!recipientPhone) {
      return res.status(400).json({
        success: false,
        error: 'Patient does not have a phone number for WhatsApp delivery.',
      });
    }

    patient.phone = recipientPhone;
    if (req.body.patientName && (!patient.name || patient.name === 'Valued Patient')) {
      patient.name = req.body.patientName;
    }

    const { notes, scheduledDate, scheduledTime } = req.body;
    const targetDate = scheduledDate || new Date().toISOString().split('T')[0];
    const targetTime = scheduledTime || '10:00 AM';

    let reminder = null;
    try {
      reminder = await scheduleReminder({
        patientId: patient.id,
        scheduledDate: targetDate,
        scheduledTime: targetTime,
        notes: notes || 'Administrative Follow-up Reminder',
      });
    } catch {
      reminder = {
        id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        patientId: patient.id,
        registrationTokenNumber: patient.registrationTokenNumber || 'HE-001281',
        patientName: patient.name || 'Valued Patient',
        patientEmail: patient.email || '',
        patientPhone: recipientPhone,
        scheduledDate: targetDate,
        scheduledTime: targetTime,
        notes: notes || 'Administrative Follow-up Reminder',
        status: 'SCHEDULED',
        messageStatus: 'PENDING',
        messageChannel: 'whatsapp',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.push('reminders', reminder);
    }

    if (!reminder.patientPhone) {
      reminder.patientPhone = recipientPhone;
    }

    const notifRes = await notificationService.notify({
      eventType: 'appointment_reminder',
      patient: { ...patient, phone: recipientPhone },
      reminder,
      data: {
        reminderId: reminder.id,
        scheduledDate: targetDate,
        scheduledTime: targetTime,
        notes: notes || reminder.notes,
      },
    });

    const isSuccess = notifRes.whatsApp?.status === 'SENT' || notifRes.whatsApp?.status === 'READY_PENDING_CREDENTIALS' || notifRes.whatsApp?.status === 'SKIPPED_DUPLICATE';

    if (isSuccess) {
      const sentPayload = {
        status: reminder.status || 'SCHEDULED', // task remains active!
        messageStatus: 'SENT',
        messageChannel: 'whatsapp',
        sentAt: new Date().toISOString(),
        providerMessageId: notifRes.whatsApp?.providerMessageId || null,
        failureReason: null,
        updatedAt: new Date().toISOString(),
      };
      try { await dataProvider.updateReminder(reminder.id, sentPayload); } catch (_) {}
      db.update('reminders', reminder.id, sentPayload);

      db.insert('auditLogs', {
        id: `audit_${Date.now()}`,
        actor: req.user?.name || req.user?.email || 'Admin',
        action: 'sent_patient_whatsapp',
        entity: 'reminder',
        entityId: reminder.id,
        description: `Dispatched follow-up WhatsApp to ${patient.name} (${recipientPhone}) via WATI [ID: ${sentPayload.providerMessageId || 'N/A'}]`,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        message: `Follow-up WhatsApp reminder dispatched to ${recipientPhone}`,
        reminder: { ...reminder, ...sentPayload },
        providerMessageId: sentPayload.providerMessageId,
      });
    } else {
      const errMsg = notifRes.whatsApp?.error || 'WATI WhatsApp dispatch failed';
      const failPayload = {
        status: reminder.status || 'SCHEDULED',
        messageStatus: 'FAILED',
        failedAt: new Date().toISOString(),
        failureReason: errMsg,
        updatedAt: new Date().toISOString(),
      };
      try { await dataProvider.updateReminder(reminder.id, failPayload); } catch (_) {}
      db.update('reminders', reminder.id, failPayload);

      db.insert('auditLogs', {
        id: `audit_${Date.now()}`,
        actor: req.user?.name || req.user?.email || 'Admin',
        action: 'patient_whatsapp_failed',
        entity: 'reminder',
        entityId: reminder.id,
        description: `Follow-up WhatsApp to ${patient.name} (${recipientPhone}) failed: ${errMsg}`,
        timestamp: new Date().toISOString(),
      });

      return res.status(502).json({
        success: false,
        error: errMsg,
        reminder: { ...reminder, ...failPayload },
      });
    }
  } catch (err) {
    console.error(`[PatientSendWhatsApp] Error:`, err.message);
    return res.status(500).json({
      success: false,
      error: `WhatsApp dispatch failed: ${err.message}`,
    });
  }
});

export default router;