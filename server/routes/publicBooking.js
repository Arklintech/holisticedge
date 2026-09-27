import express from 'express';
import { getActiveDataProvider } from '../providers/dataProvider.js';
import { createBookingTransaction } from '../services/bookingService.js';
import { verifySignedBookingToken } from '../services/reminderService.js';
import { verifySignedAppointmentAccessToken } from '../services/appointmentAccessTokenService.js';
import { sendAppointmentConfirmationEmail } from '../services/emailService.js';
import { notificationService } from '../services/notificationService.js';
import { db } from '../db.js';


const router = express.Router();
const dataProvider = getActiveDataProvider();

const CLINIC_OPERATING_SLOTS = [
  '10:30 AM',
  '11:30 AM',
  '12:30 PM',
  '02:30 PM',
  '03:30 PM',
  '04:30 PM',
  '05:30 PM',
  '06:30 PM',
  '07:30 PM',
];

function normalizeTime(t) {
  if (!t || typeof t !== 'string') return '';
  const str = t.trim();
  const m24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    let h = parseInt(m24[1], 10);
    const min = m24[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${min} ${ampm}`;
  }
  const m12 = str.match(/^0?(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    const h = parseInt(m12[1], 10);
    const min = m12[2];
    const ampm = m12[3].toUpperCase();
    return `${h}:${min} ${ampm}`;
  }
  return str.toUpperCase();
}

// GET /api/public/slots
router.get('/slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date query parameter is required' });

    const existingSlots = (await dataProvider.getBookingSlots(date)) || [];
    const activeAppointments = await dataProvider.getAppointments({ date });

    // Combine all standard operating slots and any custom slots from provider
    const allSlotTimes = Array.from(new Set([
      ...CLINIC_OPERATING_SLOTS,
      ...existingSlots.map(s => s.time),
    ]));

    const availableSlots = allSlotTimes.map(timeStr => {
      const normTime = normalizeTime(timeStr);
      const existing = existingSlots.find(s => normalizeTime(s.time) === normTime);

      const appointmentsCount = activeAppointments.filter(a => {
        if (!['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS'].includes(a.status)) return false;
        if (existing && a.slotId && a.slotId === existing.id) return true;
        return normalizeTime(a.time) === normTime;
      }).length;

      const manualBooked = typeof existing?.booked === 'number' ? existing.booked : 0;
      const bookedCount = Math.max(manualBooked, appointmentsCount);
      const capacity = typeof existing?.capacity === 'number' ? existing.capacity : 5;

      const isBlockedOrClosed = existing && (existing.status === 'BLOCKED' || existing.status === 'CLOSED');
      const isExplicitFull = existing?.status === 'FULL';
      const isFull = bookedCount >= capacity || isExplicitFull;
      const isAvailable = !isBlockedOrClosed && !isFull;

      let status = 'AVAILABLE';
      if (existing?.status === 'BLOCKED') status = 'BLOCKED';
      else if (existing?.status === 'CLOSED') status = 'CLOSED';
      else if (isFull) status = 'FULL';

      const remaining = isFull ? 0 : Math.max(0, capacity - bookedCount);

      return {
        id: existing?.id || `slot_${date}_${normTime.replace(/[^a-zA-Z0-9]/g, '')}`,
        date,
        time: timeStr,
        timeLabel: timeStr,
        capacity,
        booked: isFull && bookedCount < capacity ? capacity : bookedCount,
        remaining,
        isAvailable,
        status,
      };
    });

    res.json({ success: true, date, slots: availableSlots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/verify-reminder-token
router.get('/verify-reminder-token', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const verification = verifySignedBookingToken(token);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error });
    }

    const patient = await dataProvider.getPatientById(verification.patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    res.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        registrationTokenNumber: patient.registrationTokenNumber,
      },
      reminderId: verification.reminderId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/appointment/:token or /api/public/appointment?token=...
router.get(['/appointment', '/appointment/:token', '/appointment-details', '/appointment-details/:token'], async (req, res) => {
  try {
    const token = req.params.token || req.query.token;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Access token is required' });
    }

    const verification = verifySignedAppointmentAccessToken(token);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: verification.error || 'Invalid or expired appointment access link',
        code: verification.error?.includes('expired') ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      });
    }

    // Retrieve appointment
    let appointment = null;
    try {
      appointment = await dataProvider.getAppointmentById(verification.appointmentId);
    } catch (err) {
      console.warn('[PublicBooking] dataProvider getAppointmentById fallback:', err.message);
    }
    if (!appointment) {
      appointment = db.find('appointments', a => a.id === verification.appointmentId);
    }

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment record not found or has been archived' });
    }

    // Strict Patient Isolation Check
    if (appointment.patientId !== verification.patientId) {
      return res.status(403).json({ success: false, error: 'Access unauthorized for this appointment' });
    }

    // Retrieve patient info safely
    let patient = null;
    try {
      patient = await dataProvider.getPatientById(verification.patientId);
    } catch (err) {
      console.warn('[PublicBooking] dataProvider getPatientById fallback:', err.message);
    }
    if (!patient) {
      patient = db.find('patients', p => p.id === verification.patientId);
    }

    // Mask sensitive fields to protect patient privacy
    const maskedPhone = patient?.phone ? patient.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') : '';
    const maskedEmail = patient?.email ? patient.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';

    res.json({
      success: true,
      appointment: {
        id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        service: appointment.service || 'Chiropractic Consultation',
        status: appointment.status || 'CONFIRMED',
        createdAt: appointment.createdAt,
      },
      patient: {
        name: patient ? patient.name : 'Valued Patient',
        registrationTokenNumber: patient?.registrationTokenNumber || 'HE-CONFIRMED',
        maskedPhone,
        maskedEmail,
      },
      clinic: {
        name: 'Holistic Edge Chiropractic & Wellness Clinic',
        address: 'Ground Floor, Susheel Apartments, Behind Olive Hospital, Mehdipatnam, Hyderabad - 500028',
        phone: '+91 81426 42051',
        whatsapp: '918142642051',
        googleMapsUrl: 'https://maps.google.com/?q=Holistic+Edge+Chiropractic+Mehdipatnam+Hyderabad',
        instructions: [
          'Please arrive 10-15 minutes prior to your scheduled slot for smooth check-in.',
          'Wear loose, comfortable clothing suitable for spinal assessment and gentle movements.',
          'Bring any previous X-rays, MRI scans, or medical reports relevant to your spine or joints.',
          'If you need to reschedule or have questions, please reach out via WhatsApp or call our front desk.'
        ]
      },
      expiresAt: verification.expiresAt
    });
  } catch (err) {
    console.error('[PublicBooking] Appointment view error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve appointment details' });
  }
});

// POST /api/public/book
router.post('/book', async (req, res) => {
  try {
    const { patientData, date, time, slotId, service, notes, idempotencyKey, reminderId, token } = req.body;

    let forcePatientId = req.body.useExistingPatientId || req.body.patientId || null;
    let bookingSource = 'WEBSITE_PUBLIC';

    if (token) {
      const verification = verifySignedBookingToken(token);
      if (verification.valid) {
        forcePatientId = verification.patientId;
        bookingSource = 'REMINDER_EMAIL';
      }
    }

    let resolvedPatientData = patientData || {
      name: (req.body.fullName || req.body.name || '').trim(),
      phone: (req.body.phone || '').trim(),
      email: (req.body.email || '').trim(),
      symptomDuration: req.body.symptomDuration,
    };

    if ((!resolvedPatientData.name || !resolvedPatientData.phone) && forcePatientId) {
      try {
        const existing = (await dataProvider.getPatientById(forcePatientId)) || db.find('patients', p => p.id === forcePatientId);
        if (existing) {
          resolvedPatientData = {
            name: resolvedPatientData.name || existing.name,
            phone: resolvedPatientData.phone || existing.phone,
            email: resolvedPatientData.email || existing.email,
            symptomDuration: resolvedPatientData.symptomDuration || existing.symptomDuration,
          };
        }
      } catch (err) {
        console.warn('[PublicBooking] Fallback patient resolution:', err.message);
      }
    }

    if (!resolvedPatientData.name || !resolvedPatientData.phone) {
      return res.status(400).json({ error: 'Patient full name and phone number are required.' });
    }

    if (resolvedPatientData.email) {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      const cleanEmail = resolvedPatientData.email.trim();
      if (!emailRegex.test(cleanEmail) || cleanEmail.includes('<') || cleanEmail.includes('>') || !cleanEmail.split('@')[1]?.includes('.')) {
        return res.status(400).json({
          error: 'Please provide a valid email address with a domain (e.g. name@example.com).',
          field: 'email'
        });
      }
    }

    const resolvedDate = date || req.body.selectedDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const resolvedTime = time || req.body.selectedSlot || '10:00 AM';

    const result = await createBookingTransaction({
      patientData: resolvedPatientData,
      date: resolvedDate,
      time: resolvedTime,
      slotId,
      service: service || 'Chiropractic Consultation',
      source: bookingSource,
      notes,
      idempotencyKey,
      forcePatientId,
    });

    if (!result.success) {
      if (result.isAmbiguous) {
        return res.status(409).json(result);
      }
      return res.status(400).json({ error: result.error || 'Failed to complete booking' });
    }

    // Convert reminder to BOOKED if originating from reminder token
    if (reminderId || (token && result.appointment)) {
      const remId = reminderId || (verifySignedBookingToken(token).reminderId);
      if (remId) {
        await dataProvider.updateReminder(remId, {
          status: 'BOOKED',
          bookedAppointmentId: result.appointment.id,
          bookedAt: new Date().toISOString(),
        });
      }
    }

    // Trigger notification dispatch (WhatsApp primary via WATI, Gmail/SMTP confirmation)
    let emailResult = null;
    let notifResult = null;

    try {
      if (result.appointment && result.patient) {
        notifResult = await notificationService.notify({
          eventType: 'appointment_confirmed',
          patient: result.patient,
          appointment: result.appointment,
        });
        emailResult = notifResult?.email?.response || null;
      }
    } catch (notifErr) {
      console.warn('[PublicBooking] Unified notification notice:', notifErr.message);
    }

    // Direct email fallback if not already sent by notification service
    if (!emailResult && result.appointment && result.patient && result.patient.email) {
      try {
        emailResult = await sendAppointmentConfirmationEmail(result.appointment, result.patient);
      } catch (err) {
        console.error('[PublicBooking] Confirmation email error:', err.message);
      }
    }

    const whatsAppSent = Boolean(
      notifResult?.whatsApp?.status === 'SENT' ||
      notifResult?.whatsApp?.status === 'READY_PENDING_CREDENTIALS' ||
      notifResult?.whatsApp?.status === 'SKIPPED_DUPLICATE'
    );
    const emailSent = Boolean(emailResult?.success || notifResult?.email?.status === 'SENT');

    res.status(201).json({
      success: true,
      appointment: result.appointment,
      patient: result.patient,
      registrationTokenNumber: result.patient.registrationTokenNumber,
      emailSent,
      emailMessageId: emailResult?.providerMessageId || notifResult?.email?.response?.providerMessageId || null,
      whatsAppSent,
      whatsAppMessageId: notifResult?.whatsApp?.providerMessageId || null,
      whatsAppStatus: notifResult?.whatsApp?.status || (whatsAppSent ? 'SENT' : 'NOT_SENT'),
      message: 'Booking Confirmed!',
    });

  } catch (err) {
    if (err.code === 'SLOT_FULL') {
      return res.status(409).json({ error: 'This time slot is no longer available. Please select another slot.', code: 'SLOT_FULL' });
    }
    res.status(500).json({ error: err.message || 'We couldn\'t complete your booking. Please try again.' });
  }
});

export default router;
