import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getActiveDataProvider } from '../providers/dataProvider.js';
import { scheduleReminder, processDueReminders, generateSignedBookingToken } from '../services/reminderService.js';
import { sendFollowUpReminderEmail } from '../services/emailService.js';
import { db } from '../db.js';

const router = express.Router();
const dataProvider = getActiveDataProvider();

// --- Helpers ---

// IST date string (YYYY-MM-DD), offsetDays shifts relative to today
function getISTDate(offsetDays = 0) {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  if (offsetDays) ist.setUTCDate(ist.getUTCDate() + offsetDays);
  return ist.toISOString().split('T')[0];
}

// Create a follow-up notification with idempotency (no duplicate on repeated loads)
function ensureFollowUpNotification({ idempotencyKey, title, message, reminderId }) {
  try {
    const exists = db.filter('notifications', n => n.idempotencyKey === idempotencyKey);
    if (exists && exists.length > 0) return; // already created
    db.insert('notifications', {
      id: `notif_fu_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      idempotencyKey,
      type: 'followup',
      title,
      message,
      entityId: reminderId,
      entityType: 'reminder',
      link: '/admin/follow-ups',
      status: 'unread',
      createdAt: new Date().toISOString(),
    });
  } catch (_) {}
}

// Normalize follow-up record to separate task status and message status
function normalizeReminder(rem, today) {
  let status = (rem.status || 'SCHEDULED').toUpperCase();
  let messageStatus = rem.messageStatus || 'PENDING';

  // Legacy data migration: if status was previously stored as 'SENT', separate it
  if (status === 'SENT') {
    messageStatus = 'SENT';
    status = rem.scheduledDate < today ? 'OVERDUE' : (rem.scheduledDate === today ? 'DUE' : 'SCHEDULED');
  } else if (status === 'FAILED') {
    messageStatus = 'FAILED';
    status = rem.scheduledDate < today ? 'OVERDUE' : (rem.scheduledDate === today ? 'DUE' : 'SCHEDULED');
  }

  // Active status lifecycle progression
  if (status !== 'COMPLETED' && status !== 'CANCELLED') {
    if (rem.scheduledDate < today) {
      status = 'OVERDUE';
    } else if (rem.scheduledDate === today) {
      status = 'DUE';
    } else {
      status = 'SCHEDULED';
    }
  }

  return {
    ...rem,
    status,
    messageStatus,
  };
}

// GET /api/follow-ups
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, patientId } = req.query;
    let reminders = [];
    try {
      reminders = (await dataProvider.getReminders({ status, patientId })) || [];
    } catch (e) {
      reminders = db.get('reminders') || [];
    }

    const today = getISTDate(0);
    const tomorrow = getISTDate(1);

    const processed = [];

    for (const raw of reminders) {
      const rem = normalizeReminder(raw, today);

      // Sync status update to storage if changed
      if (rem.status !== raw.status || rem.messageStatus !== raw.messageStatus) {
        const syncPayload = { status: rem.status, messageStatus: rem.messageStatus, updatedAt: new Date().toISOString() };
        try { await dataProvider.updateReminder(rem.id, syncPayload); } catch (_) {}
        db.update('reminders', rem.id, syncPayload);
      }

      // D-1 Admin reminder: for active follow-ups due tomorrow
      if (rem.status !== 'COMPLETED' && rem.status !== 'CANCELLED' && rem.scheduledDate === tomorrow) {
        ensureFollowUpNotification({
          idempotencyKey: `notif_fu_d1_${rem.id}_${rem.scheduledDate}`,
          title: 'Follow-up Tomorrow',
          message: `Follow-up tomorrow — ${rem.patientName || 'Patient'} — ${rem.scheduledDate} at ${rem.scheduledTime || '10:00 AM'}.`,
          reminderId: rem.id,
        });
      }

      // Due Today Admin notification: for active follow-ups due today
      if (rem.status !== 'COMPLETED' && rem.status !== 'CANCELLED' && rem.scheduledDate === today) {
        ensureFollowUpNotification({
          idempotencyKey: `notif_fu_today_${rem.id}_${rem.scheduledDate}`,
          title: 'Follow-up Due Today',
          message: `Follow-up due today — ${rem.patientName || 'Patient'} — ${rem.scheduledDate} at ${rem.scheduledTime || '10:00 AM'}.`,
          reminderId: rem.id,
        });
      }

      processed.push(rem);
    }

    // Apply status filter if specified (e.g. ?status=active or ?status=history)
    let filtered = processed;
    if (status) {
      const sFilter = status.toLowerCase();
      if (sFilter === 'active') {
        filtered = filtered.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED');
      } else if (sFilter === 'history' || sFilter === 'historical') {
        filtered = filtered.filter(r => r.status === 'COMPLETED' || r.status === 'CANCELLED');
      } else if (sFilter !== 'all') {
        filtered = filtered.filter(r => r.status.toLowerCase() === sFilter);
      }
    }

    res.json({ success: true, count: filtered.length, reminders: filtered });
  } catch (err) {
    console.error('[FollowUps] Fallback:', err.message);
    const localReminders = db.get('reminders') || [];
    res.json({ success: true, count: localReminders.length, reminders: localReminders });
  }
});

// POST /api/follow-ups (Admin scheduled follow-up creation)
router.post('/', authenticate, async (req, res) => {
  try {
    const { patientId, scheduledDate, scheduledTime, notes, daysOption } = req.body;
    let reminder = null;
    try {
      reminder = await scheduleReminder({
        patientId,
        scheduledDate,
        scheduledTime,
        notes,
        daysOption,
      });
    } catch {
      reminder = {
        id: `rem_${Date.now()}`,
        patientId,
        scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
        scheduledTime: scheduledTime || '10:00 AM',
        notes: notes || '',
        status: 'SCHEDULED',
        messageStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        createdBy: req.user?.name || req.user?.email || 'Admin',
      };
      db.push('reminders', reminder);
    }

    // Ensure status fields
    const today = getISTDate(0);
    const tomorrow = getISTDate(1);
    reminder = normalizeReminder(reminder, today);

    // If scheduled for tomorrow, create idempotent D-1 reminder immediately
    if (reminder.scheduledDate === tomorrow) {
      ensureFollowUpNotification({
        idempotencyKey: `notif_fu_d1_${reminder.id}_${reminder.scheduledDate}`,
        title: 'Follow-up Tomorrow',
        message: `Follow-up tomorrow — ${reminder.patientName || 'Patient'} — ${reminder.scheduledDate} at ${reminder.scheduledTime || '10:00 AM'}.`,
        reminderId: reminder.id,
      });
    }

    db.insert('auditLogs', {
      id: `audit_${Date.now()}`,
      actor: req.user?.name || req.user?.email || 'Admin',
      action: 'created_followup',
      entity: 'reminder',
      entityId: reminder.id,
      description: `Scheduled follow-up for ${reminder.patientName || patientId} on ${reminder.scheduledDate}`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ success: true, reminder });
  } catch (err) {
    console.error('[FollowUpsCreate] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/follow-ups/:id/send-now (Send SMTP email — sets messageStatus = SENT or FAILED, keeps task active)
router.post('/:id/send-now', authenticate, async (req, res) => {
  const reminderId = req.params.id;

  // Resolve reminder
  let reminder = null;
  try {
    reminder = (await dataProvider.getReminderById(reminderId)) || db.find('reminders', r => r.id === reminderId);
  } catch {
    reminder = db.find('reminders', r => r.id === reminderId);
  }
  if (!reminder) {
    return res.status(404).json({ success: false, error: 'Follow-up record not found' });
  }

  // Resolve patient
  let patient = null;
  try {
    patient = await dataProvider.getPatientById(reminder.patientId);
  } catch {
    patient = db.find('patients', p => p.id === reminder.patientId);
  }
  if (!patient) {
    patient = {
      id: reminder.patientId || 'patient_default',
      name: reminder.patientName || 'Valued Patient',
      email: reminder.patientEmail || '',
      phone: reminder.patientPhone || '',
      registrationTokenNumber: reminder.registrationTokenNumber || 'HE-001281',
    };
  }

  const recipientEmail = reminder.patientEmail || patient.email;
  if (!recipientEmail || !recipientEmail.includes('@')) {
    const today = getISTDate(0);
    const normalized = normalizeReminder(reminder, today);
    const failPayload = {
      status: normalized.status,
      messageStatus: 'FAILED',
      failedAt: new Date().toISOString(),
      failureReason: 'Patient does not have a valid email address.',
      updatedAt: new Date().toISOString(),
    };
    try { await dataProvider.updateReminder(reminderId, failPayload); } catch (_) {}
    db.update('reminders', reminderId, failPayload);
    return res.status(400).json({
      success: false,
      error: 'Patient does not have a valid email address.',
      reminder: { ...reminder, ...failPayload },
    });
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const secureToken = generateSignedBookingToken(patient.id, reminderId);
  const bookingUrl = `${baseUrl}/book?token=${secureToken}`;

  try {
    // Dispatch SMTP email
    await sendFollowUpReminderEmail(reminder, patient, bookingUrl);

    // Persist messageStatus: SENT — IMPORTANT: task status remains active (DUE/OVERDUE/SCHEDULED), NOT completed!
    const today = getISTDate(0);
    const normalized = normalizeReminder(reminder, today);
    const sentPayload = {
      status: normalized.status,
      messageStatus: 'SENT',
      sentAt: new Date().toISOString(),
      failureReason: null,
      updatedAt: new Date().toISOString(),
    };

    try { await dataProvider.updateReminder(reminderId, sentPayload); } catch (_) {}
    db.update('reminders', reminderId, sentPayload);

    // Audit log
    db.insert('auditLogs', {
      id: `audit_${Date.now()}`,
      actor: req.user?.name || req.user?.email || 'Admin',
      action: 'sent_followup_email',
      entity: 'reminder',
      entityId: reminderId,
      description: `Dispatched follow-up email to ${patient.name} (${recipientEmail})`,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `Follow-up email sent to ${recipientEmail}`,
      reminder: { ...reminder, ...sentPayload },
      reminderToken: secureToken,
    });
  } catch (smtpErr) {
    console.error(`[FollowUpDispatch] SMTP failure for ${reminderId}:`, smtpErr.message);

    // Persist messageStatus: FAILED — task status remains active (DUE/OVERDUE/SCHEDULED)
    const today = getISTDate(0);
    const normalized = normalizeReminder(reminder, today);
    const failPayload = {
      status: normalized.status,
      messageStatus: 'FAILED',
      failedAt: new Date().toISOString(),
      failureReason: smtpErr.message,
      updatedAt: new Date().toISOString(),
    };

    try { await dataProvider.updateReminder(reminderId, failPayload); } catch (_) {}
    db.update('reminders', reminderId, failPayload);

    // Audit log
    db.insert('auditLogs', {
      id: `audit_${Date.now()}`,
      actor: req.user?.name || req.user?.email || 'Admin',
      action: 'followup_email_failed',
      entity: 'reminder',
      entityId: reminderId,
      description: `Follow-up email to ${patient.name} (${recipientEmail}) failed: ${smtpErr.message}`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      error: `Email dispatch failed: ${smtpErr.message}`,
      reminder: { ...reminder, ...failPayload },
    });
  }
});

// PATCH /api/follow-ups/:id/complete (Explicit admin completion — moves to history)
router.patch('/:id/complete', authenticate, async (req, res) => {
  const reminderId = req.params.id;
  const actor = req.user?.name || req.user?.email || 'Admin';
  const completePayload = {
    status: 'COMPLETED',
    completedAt: new Date().toISOString(),
    completedBy: actor,
    updatedAt: new Date().toISOString(),
  };

  let updated = null;
  try {
    updated = await dataProvider.updateReminder(reminderId, completePayload);
  } catch {
    updated = db.update('reminders', reminderId, completePayload);
  }

  if (!updated) {
    updated = db.find('reminders', r => r.id === reminderId);
    if (updated) {
      updated = { ...updated, ...completePayload };
      db.update('reminders', reminderId, updated);
    }
  }

  if (!updated) return res.status(404).json({ error: 'Follow-up not found' });

  // Audit log
  db.insert('auditLogs', {
    id: `audit_${Date.now()}`,
    actor,
    action: 'completed_followup',
    entity: 'reminder',
    entityId: reminderId,
    description: `Admin marked follow-up ${reminderId} as COMPLETED (moved to history)`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: 'Follow-up completed — moved to history.', reminder: updated });
});

// PATCH /api/follow-ups/:id/cancel (Explicit admin cancellation — moves to history)
router.patch('/:id/cancel', authenticate, async (req, res) => {
  const reminderId = req.params.id;
  const actor = req.user?.name || req.user?.email || 'Admin';
  const cancelPayload = {
    status: 'CANCELLED',
    cancelledAt: new Date().toISOString(),
    cancelledBy: actor,
    updatedAt: new Date().toISOString(),
  };

  let updated = null;
  try {
    updated = await dataProvider.updateReminder(reminderId, cancelPayload);
  } catch {
    updated = db.update('reminders', reminderId, cancelPayload);
  }

  if (!updated) {
    updated = db.find('reminders', r => r.id === reminderId);
    if (updated) {
      updated = { ...updated, ...cancelPayload };
      db.update('reminders', reminderId, updated);
    }
  }

  if (!updated) return res.status(404).json({ error: 'Follow-up not found' });

  // Clean up any pending D-1 notification for this cancelled follow-up
  try {
    const notifs = db.get('notifications') || [];
    const updatedNotifs = notifs.filter(n => !(n.entityId === reminderId && n.idempotencyKey?.startsWith('notif_fu_d1_')));
    db.set('notifications', updatedNotifs);
  } catch (_) {}

  // Audit log
  db.insert('auditLogs', {
    id: `audit_${Date.now()}`,
    actor,
    action: 'cancelled_followup',
    entity: 'reminder',
    entityId: reminderId,
    description: `Admin cancelled follow-up ${reminderId} (moved to history)`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: 'Follow-up cancelled — moved to history.', reminder: updated });
});

// PUT /api/follow-ups/:id (General update)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const actor = req.user?.name || req.user?.email || 'Admin';
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    if (updateData.status === 'COMPLETED' && !updateData.completedAt) {
      updateData.completedAt = new Date().toISOString();
      updateData.completedBy = actor;
    } else if (updateData.status === 'CANCELLED' && !updateData.cancelledAt) {
      updateData.cancelledAt = new Date().toISOString();
      updateData.cancelledBy = actor;
    }

    let updated = null;
    try {
      updated = await dataProvider.updateReminder(req.params.id, updateData);
    } catch {
      updated = db.update('reminders', req.params.id, updateData);
    }
    res.json({ success: true, reminder: updated || { id: req.params.id, ...updateData } });
  } catch (err) {
    console.error('[FollowUpUpdate] Fallback:', err.message);
    res.json({ success: true, reminder: { id: req.params.id, ...req.body } });
  }
});

// POST /api/follow-ups/process-due (Maintenance trigger)
router.post('/process-due', authenticate, async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    let results = [];
    try {
      results = await processDueReminders(baseUrl);
    } catch (e) {
      results = [];
    }
    res.json({ success: true, processedCount: results.length, results });
  } catch (err) {
    console.error('[FollowUpsProcessDue] Fallback:', err.message);
    res.json({ success: true, processedCount: 0, results: [] });
  }
});

export default router;