import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getActiveDataProvider } from '../providers/dataProvider.js';
import { consumesCapacity } from '../services/bookingService.js';
import { db } from '../db.js';

const router = express.Router();
const dataProvider = getActiveDataProvider();

// GET /api/booking-slots
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    const slots = await dataProvider.getBookingSlots(date);
    res.json({ success: true, count: slots.length, slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/booking-slots (Add slot)
router.post('/', authenticate, async (req, res) => {
  try {
    const { date, time, capacity = 5 } = req.body;
    if (!date || !time) {
      return res.status(400).json({ error: 'Date and time are required.' });
    }

    const slotId = `slot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newSlot = {
      id: slotId,
      date,
      time,
      capacity: parseInt(capacity, 10),
      booked: 0,
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const slot = db.insert('bookingSlots', newSlot);
    res.status(201).json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/booking-slots/:id (Edit time/capacity/status)
router.put('/:id', authenticate, async (req, res) => {
  try {
    let slot = db.find('bookingSlots', s => s.id === req.params.id);
    if (!slot) {
      const newSlot = {
        id: req.params.id,
        date: req.body.date || new Date().toISOString().split('T')[0],
        time: req.body.time || '10:30 AM',
        capacity: req.body.capacity !== undefined ? parseInt(req.body.capacity, 10) : 5,
        booked: 0,
        status: req.body.status || 'AVAILABLE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      slot = db.insert('bookingSlots', newSlot);
    }

    const { capacity, status, time, date } = req.body;

    // Capacity Reduction Rule Check
    if (capacity !== undefined) {
      const requestedCapacity = parseInt(capacity, 10);
      const activeAppointments = (await dataProvider.getAppointments({ date: slot.date })).filter(
        a => (a.slotId === slot.id || a.time === slot.time) && consumesCapacity(a.status)
      );

      if (activeAppointments.length > requestedCapacity) {
        return res.status(400).json({
          error: `Cannot reduce slot capacity to ${requestedCapacity}. There are already ${activeAppointments.length} active confirmed bookings in this slot.`,
          currentActiveBookings: activeAppointments.length,
        });
      }
    }

    const updated = await dataProvider.updateBookingSlot(req.params.id, {
      ...req.body,
      capacity: capacity !== undefined ? parseInt(capacity, 10) : slot.capacity,
      updatedAt: new Date().toISOString(),
    });

    db.insert('auditLogs', {
      id: `audit_${Date.now()}`,
      actor: req.user?.name || 'Staff',
      actorId: req.user?.id || 'staff',
      action: 'update_booking_slot',
      entity: 'booking_slot',
      entityId: req.params.id,
      description: `Updated booking slot ${slot.date} ${slot.time} (Capacity: ${updated.capacity}, Status: ${updated.status})`,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, slot: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
