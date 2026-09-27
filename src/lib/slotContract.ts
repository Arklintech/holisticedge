/**
 * Canonical Slot Availability Model & Calculation Rules (HE-QA-03)
 * Provides the single source of truth for slot capacity, booked count, and remaining availability.
 * Guarantees that the UI never displays "undefined", "NaN", or negative slot counts.
 */

export type CanonicalSlotStatus = 'OPEN' | 'FULL' | 'CLOSED' | 'BLOCKED';

export interface CanonicalSlot {
  id: string;
  date: string;
  time: string;
  timeLabel: string;
  capacity: number;
  booked: number;
  remaining: number;
  status: CanonicalSlotStatus;
  isAvailable: boolean;
  notes?: string;
  blockedReason?: string;
}

/**
 * Calculates remaining available seats with strict bounds.
 * Single source of truth: remaining = Math.max(0, capacity - booked).
 * Always returns a non-negative finite integer.
 */
export function calculateRemainingSlots(capacity: unknown, booked: unknown): number {
  const cap = typeof capacity === 'number' && !Number.isNaN(capacity) && Number.isFinite(capacity)
    ? Math.max(0, Math.floor(capacity))
    : 0;

  const bkd = typeof booked === 'number' && !Number.isNaN(booked) && Number.isFinite(booked)
    ? Math.max(0, Math.floor(booked))
    : 0;

  return Math.max(0, cap - bkd);
}

export type SlotUrgencyLevel = 'CRITICAL' | 'WARNING' | 'NORMAL' | 'FULL' | 'UNAVAILABLE';

/**
 * Canonicalizes any time string (e.g., "11:00 AM", "11:00", "02:30 PM", "2:30 PM", "14:30")
 * into a standardized 12-hour display string with uppercase AM/PM.
 */
export function canonicalizeTime(timeStr: string | null | undefined): string {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const str = timeStr.trim();
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

/**
 * Parses time string to total minutes from midnight for chronological sorting.
 */
export function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const match = timeStr.match(/^0?(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Returns slot urgency level for dynamic UI badges.
 */
export function getSlotUrgency(slot: Partial<CanonicalSlot> | null | undefined): SlotUrgencyLevel {
  if (!slot || slot.status === 'CLOSED' || slot.status === 'BLOCKED') return 'UNAVAILABLE';
  const remaining = typeof slot.remaining === 'number' && !Number.isNaN(slot.remaining)
    ? slot.remaining
    : calculateRemainingSlots(slot.capacity, slot.booked);
  if (remaining <= 0 || slot.status === 'FULL') return 'FULL';
  if (remaining === 1) return 'CRITICAL';
  if (remaining === 2) return 'WARNING';
  return 'NORMAL';
}

/**
 * Formats slot availability label for display in UI.
 * Distinctly conveys urgency when slots are about to fill (e.g. 1 or 2 slots left).
 * Guaranteed to never output "undefined slots left", "NaN", or "null".
 */
export function formatSlotAvailability(slot: Partial<CanonicalSlot> | null | undefined): string {
  if (!slot) {
    return 'Slot unavailable';
  }

  if (slot.status === 'BLOCKED') {
    return slot.blockedReason ? `Blocked (${slot.blockedReason})` : 'Slot blocked';
  }

  if (slot.status === 'CLOSED') {
    return 'Slot closed';
  }

  const remaining = typeof slot.remaining === 'number' && !Number.isNaN(slot.remaining)
    ? slot.remaining
    : calculateRemainingSlots(slot.capacity, slot.booked);

  if (remaining <= 0 || slot.status === 'FULL') {
    return 'Fully booked (0 seats left)';
  }

  if (remaining === 1) {
    return 'Only 1 slot left!';
  }

  if (remaining === 2) {
    return 'Only 2 slots left';
  }

  return `${remaining} slot${remaining === 1 ? '' : 's'} left`;
}

/**
 * Formats short badge text for compact UI elements.
 */
export function formatSlotBadgeText(slot: Partial<CanonicalSlot> | null | undefined): string {
  const urgency = getSlotUrgency(slot);
  if (urgency === 'UNAVAILABLE') return 'Unavailable';
  if (urgency === 'FULL') return 'Fully booked';
  if (urgency === 'CRITICAL') return 'Only 1 left!';
  if (urgency === 'WARNING') return 'Only 2 left';

  const remaining = typeof slot?.remaining === 'number' && !Number.isNaN(slot?.remaining)
    ? slot.remaining
    : calculateRemainingSlots(slot?.capacity, slot?.booked);

  return `${remaining} slots left`;
}

/**
 * Normalizes any incoming slot data (API DTO, Sheet row, or storage object)
 * into a verified, typed CanonicalSlot.
 */
export function normalizeSlot(raw: any): CanonicalSlot {
  if (!raw || typeof raw !== 'object') {
    return {
      id: 'unknown',
      date: '',
      time: '',
      timeLabel: '',
      capacity: 0,
      booked: 0,
      remaining: 0,
      status: 'CLOSED',
      isAvailable: false,
    };
  }

  const capacity = typeof raw.capacity === 'number' ? Math.max(0, raw.capacity) : Number(raw.capacity) || 5;
  // Handle any legacy aliases across API boundaries:
  const booked = typeof raw.booked === 'number'
    ? Math.max(0, raw.booked)
    : (raw.bookedCount !== undefined ? Number(raw.bookedCount) : (Number(raw.booked) || 0));

  const remaining = calculateRemainingSlots(capacity, booked);

  let rawStatus = String(raw.status || '').toUpperCase();
  let status: CanonicalSlotStatus = 'OPEN';

  if (rawStatus === 'BLOCKED') {
    status = 'BLOCKED';
  } else if (rawStatus === 'CLOSED') {
    status = 'CLOSED';
  } else if (remaining <= 0 || rawStatus === 'FULL') {
    status = 'FULL';
  } else {
    status = 'OPEN';
  }

  const isAvailable = status === 'OPEN' && remaining > 0;

  return {
    id: String(raw.id || ''),
    date: String(raw.date || ''),
    time: String(raw.time || ''),
    timeLabel: String(raw.timeLabel || raw.time || ''),
    capacity,
    booked,
    remaining,
    status,
    isAvailable,
    notes: raw.notes ? String(raw.notes) : undefined,
    blockedReason: raw.blockedReason ? String(raw.blockedReason) : undefined,
  };
}
