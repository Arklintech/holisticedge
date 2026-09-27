import { getActiveDataProvider } from '../providers/dataProvider.js';
import { findOrCreatePatient } from './patientService.js';
import { db } from '../db.js';

const dataProvider = getActiveDataProvider();

export const CAPACITY_CONSUMING_STATUSES = ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS'];

export function consumesCapacity(status) {
  return CAPACITY_CONSUMING_STATUSES.includes(status);
}

// Mutex lock for slot concurrency protection
const slotLocks = new Map();

async function acquireSlotLock(dateSlotKey) {
  let lock = slotLocks.get(dateSlotKey) || Promise.resolve();
  let release;
  const nextLock = new Promise(resolve => {
    release = resolve;
  });
  slotLocks.set(dateSlotKey, nextLock);
  await lock;
  return release;
}

export async function createBookingTransaction({
  patientData,
  date,
  time,
  slotId,
  service,
  source = 'WEBSITE',
  notes = '',
  idempotencyKey = null,
  forcePatientId = null,
}) {
  if (idempotencyKey) {
    const existing = db.find('appointments', a => a.idempotencyKey === idempotencyKey);
    if (existing) {
      return { success: true, appointment: existing, isDuplicate: true };
    }
  }

  const dateSlotKey = `${date}_${time || slotId}`;
  const releaseLock = await acquireSlotLock(dateSlotKey);

  try {
    const slots = await dataProvider.getBookingSlots(date);
    let targetSlot = slots.find(s => s.id === slotId || s.time === time);

    if (!targetSlot) {
      const newSlot = {
        id: slotId || `slot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date,
        time: time || '10:00 AM',
        capacity: 5,
        booked: 0,
        status: 'AVAILABLE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      targetSlot = db.insert('bookingSlots', newSlot);
    }

    if (targetSlot.status === 'CLOSED' || targetSlot.status === 'BLOCKED') {
      throw new Error('This time slot is currently closed or blocked for bookings.');
    }

    const allDateAppointments = await dataProvider.getAppointments({ date });
    const activeSlotAppointments = allDateAppointments.filter(
      a => (a.slotId === targetSlot.id || a.time === targetSlot.time) && consumesCapacity(a.status)
    );

    const currentBookedCount = activeSlotAppointments.length;
    const capacity = targetSlot.capacity || 5;

    if (currentBookedCount >= capacity) {
      const err = new Error('This time slot is no longer available. Maximum capacity reached.');
      err.code = 'SLOT_FULL';
      throw err;
    }

    let patient;
    if (forcePatientId) {
      patient = await dataProvider.getPatientById(forcePatientId);
    } else {
      const patientResolution = await findOrCreatePatient(patientData);
      if (patientResolution.isAmbiguous) {
        if (source === 'WEBSITE_PUBLIC' || source === 'WEBSITE') {
          const matches = patientResolution.matches || [];
          const best = matches.find(p => p.name && patientData?.name && p.name.toLowerCase().trim() === patientData.name.toLowerCase().trim()) ||
                       matches.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
          if (best) {
            patient = best;
          } else {
            return {
              success: false,
              isAmbiguous: true,
              matches: patientResolution.matches,
              error: 'Multiple matching patient records found. Please resolve patient identity.',
            };
          }
        } else {
          return {
            success: false,
            isAmbiguous: true,
            matches: patientResolution.matches,
            error: 'Multiple matching patient records found. Please resolve patient identity.',
          };
        }
      } else {
        patient = patientResolution.patient;
      }
    }

    if (patientData && patientData.email && patientData.email !== patient.email) {
      patient.email = patientData.email;
      try {
        await dataProvider.updatePatient(patient.id, { email: patientData.email });
      } catch (err) {
        console.warn('[BookingService] Failed to sync patient email:', err.message);
      }
    }

    const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAppointment = {
      id: appointmentId,
      patientId: patient.id,
      registrationTokenNumber: patient.registrationTokenNumber,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientEmail: (patientData && patientData.email) || patient.email,
      date,
      time: targetSlot.time,
      slotId: targetSlot.id,
      service: service || 'Chiropractic Consultation',
      status: 'CONFIRMED',
      source,
      notes,
      idempotencyKey,
      emailStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const appointment = await dataProvider.createAppointment(newAppointment);

    const updatedBookedCount = currentBookedCount + 1;
    await dataProvider.updateBookingSlot(targetSlot.id, {
      booked: updatedBookedCount,
      status: updatedBookedCount >= capacity ? 'FULL' : 'AVAILABLE',
      updatedAt: new Date().toISOString(),
    });

    db.insert('notifications', {
      id: `notif_${Date.now()}`,
      title: 'New Online Appointment Automatically Confirmed',
      message: `${patient.name} (${patient.registrationTokenNumber}) booked for ${date} at ${targetSlot.time}`,
      type: 'appointment',
      status: 'unread',
      createdAt: new Date().toISOString(),
    });

    db.insert('auditLogs', {
      id: `audit_${Date.now()}`,
      actor: 'SYSTEM / PUBLIC_BOOKING',
      actorId: patient.id,
      action: 'APPOINTMENT_AUTO_CONFIRMED',
      entity: 'appointment',
      entityId: appointmentId,
      description: `Automatic confirmation after successful public booking for ${patient.name} (${patient.registrationTokenNumber}) on ${date} ${targetSlot.time}`,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      appointment,
      patient,
      remainingCapacity: capacity - updatedBookedCount,
    };
  } finally {
    if (typeof releaseLock === 'function') {
      releaseLock();
    }
  }
}

export async function updateAppointmentStatus(appointmentId, newStatus, actorName = 'Staff') {
  const appointment = db.find('appointments', a => a.id === appointmentId);
  if (!appointment) throw new Error('Appointment not found');

  const oldStatus = appointment.status;
  const updated = await dataProvider.updateAppointment(appointmentId, {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  });

  if (consumesCapacity(oldStatus) !== consumesCapacity(newStatus)) {
    const slots = await dataProvider.getBookingSlots(appointment.date);
    const slot = slots.find(s => s.id === appointment.slotId || s.time === appointment.time);
    if (slot) {
      const activeAppointments = (await dataProvider.getAppointments({ date: appointment.date })).filter(
        a => (a.slotId === slot.id || a.time === slot.time) && consumesCapacity(a.status)
      );
      const booked = activeAppointments.length;
      await dataProvider.updateBookingSlot(slot.id, {
        booked,
        status: booked >= (slot.capacity || 5) ? 'FULL' : slot.status === 'BLOCKED' ? 'BLOCKED' : 'AVAILABLE',
      });
    }
  }

  db.insert('auditLogs', {
    id: `audit_${Date.now()}`,
    actor: actorName,
    actorId: 'system',
    action: 'update_appointment_status',
    entity: 'appointment',
    entityId: appointmentId,
    description: `Appointment status changed from ${oldStatus} to ${newStatus}`,
    timestamp: new Date().toISOString(),
  });

  return updated;
}

