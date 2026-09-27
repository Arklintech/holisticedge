// ============================================================
// HOLISTIC EDGE — useBookingSlots Hook
// Reactive real-time hook for booking slots availability
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  bookingSlotStorage,
  type BookingSlot,
  type SlotStatus,
} from '../admin/services/bookingSlotStorage';

export function useBookingSlots(date: string) {
  const [slots, setSlots] = useState<BookingSlot[]>(() =>
    date ? bookingSlotStorage.getByDate(date) : bookingSlotStorage.getAll()
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!date) {
      setSlots(bookingSlotStorage.getAll());
      return;
    }

    setLoading(true);
    fetch(`/api/public/slots?date=${encodeURIComponent(date)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.success && Array.isArray(data.slots) && data.slots.length > 0) {
          bookingSlotStorage.syncFromBackend(date, data.slots);
          const liveSlots: BookingSlot[] = data.slots.map((s: any) => {
            let mappedStatus: SlotStatus = 'OPEN';
            if (s.status === 'FULL' || s.booked >= s.capacity) mappedStatus = 'FULL';
            else if (s.status === 'BLOCKED') mappedStatus = 'BLOCKED';
            else if (s.status === 'CLOSED') mappedStatus = 'CLOSED';

            return {
              id: s.id,
              date: s.date || date,
              time: s.time,
              timeLabel: s.timeLabel || s.time,
              capacity: s.capacity ?? 5,
              booked: s.booked ?? 0,
              status: mappedStatus,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'BACKEND_API',
            };
          });
          setSlots(liveSlots);
        } else {
          setSlots(bookingSlotStorage.getByDate(date));
        }
      })
      .catch(() => {
        setSlots(bookingSlotStorage.getByDate(date));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [date]);

  useEffect(() => {
    refresh();
    const unsub = bookingSlotStorage.subscribe(refresh);
    return unsub;
  }, [refresh]);

  // Derived helpers
  const availableSlots = slots.filter(s => s.status === 'OPEN' && s.booked < s.capacity);
  const fullSlots = slots.filter(s => s.status === 'FULL' || s.booked >= s.capacity);
  const closedSlots = slots.filter(s => s.status === 'CLOSED');
  const blockedSlots = slots.filter(s => s.status === 'BLOCKED');

  const totalCapacity = slots.reduce((acc, s) => acc + s.capacity, 0);
  const totalBooked = slots.reduce((acc, s) => acc + s.booked, 0);
  const remainingSeats = Math.max(0, totalCapacity - totalBooked);
  const utilizationPercent = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

  return {
    slots,
    availableSlots,
    fullSlots,
    closedSlots,
    blockedSlots,
    totalCapacity,
    totalBooked,
    remainingSeats,
    utilizationPercent,
    loading,
    refresh,
  };
}
