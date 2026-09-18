import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Users, AlertCircle, Save, Check, Ban } from 'lucide-react';
import {
  bookingSlotStorage,
  formatTime24to12,
  formatTime12to24,
  type BookingSlot,
  type SlotStatus,
} from '../../services/bookingSlotStorage';
import { cn } from '../../../lib/utils';

export interface SlotFormModalProps {
  open: boolean;
  onClose: () => void;
  slot: BookingSlot | null;     // If provided, edit mode; else create mode
  defaultDate: string;          // Pre-filled date for new slot
  onSaved: (slot: BookingSlot) => void;
}

export function SlotFormModal({
  open,
  onClose,
  slot,
  defaultDate,
  onSaved,
}: SlotFormModalProps) {
  const isEdit = Boolean(slot);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [capacity, setCapacity] = useState(4);
  const [status, setStatus] = useState<SlotStatus>('OPEN');
  const [blockedReason, setBlockedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    if (slot) {
      setDate(slot.date);
      setTime(slot.time);
      setCapacity(slot.capacity);
      setStatus(slot.status);
      setBlockedReason(slot.blockedReason || '');
      setNotes(slot.notes || '');
    } else {
      const todayIso = new Date().toISOString().split('T')[0];
      setDate(defaultDate || todayIso);
      setTime('10:00');
      setCapacity(4);
      setStatus('OPEN');
      setBlockedReason('');
      setNotes('');
    }
    setError('');
  }, [open, slot, defaultDate]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Please select a date.');
      return;
    }
    if (!time) {
      setError('Please select a time.');
      return;
    }
    if (capacity < 1) {
      setError('Capacity must be at least 1 seat.');
      return;
    }

    if (isEdit && slot) {
      const res = bookingSlotStorage.update(slot.id, {
        date,
        time,
        timeLabel: formatTime24to12(time),
        capacity,
        status,
        blockedReason: status === 'BLOCKED' ? blockedReason: undefined,
        notes,
      });

      if (!res.success) {
        setError(res.error || 'Failed to update slot.');
        return;
      }

      onSaved(res.slot!);
      onClose();
    } else {
      const res = bookingSlotStorage.create({
        date,
        time,
        timeLabel: formatTime24to12(time),
        capacity,
        notes,
      });

      if (!res.success) {
        setError(res.error || 'Failed to create slot.');
        return;
      }

      onSaved(res.slot!);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E2DC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F2747] text-white flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1A1A1A]">
                {isEdit ? 'Edit Booking Slot' : 'Create New Booking Slot'}
              </h2>
              <p className="text-[11px] text-[#9E968C]">
                {isEdit ? `Modifying slot ${slot?.timeLabel}` : 'Configure date, time & patient capacity'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#FAF9F6] hover:bg-[#F0ECE4] flex items-center justify-center text-[#5A544E] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                Time * (24h)
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747]"
                required
              />
              <span className="text-[10.5px] text-[#9E968C] mt-0.5 block">
                {formatTime24to12(time)}
              </span>
            </div>
          </div>

          {/* Capacity & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                Capacity (Seats) *
              </label>
              <input
                type="number"
                min={slot ? Math.max(1, slot.booked) : 1}
                max={50}
                value={capacity}
                onChange={e => setCapacity(parseInt(e.target.value, 10) || 1)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747]"
                required
              />
              {slot && slot.booked > 0 && (
                <span className="text-[10.5px] text-amber-700 mt-0.5 block">
                  {slot.booked} already booked
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                Slot Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as SlotStatus)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] bg-white outline-none focus:border-[#0F2747]"
              >
                <option value="OPEN">Open (Accept Bookings)</option>
                <option value="CLOSED">Closed (Unavailable)</option>
                <option value="BLOCKED">Blocked (Doctor Busy)</option>
                {isEdit && <option value="FULL">Full (Max Capacity)</option>}
              </select>
            </div>
          </div>

          {/* Blocked Reason (if BLOCKED) */}
          {status === 'BLOCKED' && (
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                Reason for Blocking *
              </label>
              <input
                value={blockedReason}
                onChange={e => setBlockedReason(e.target.value)}
                placeholder="e.g. Doctor attending clinical symposium / Surgery"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747]"
              />
            </div>
          )}

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#5A544E] mb-1">
              Internal Administrative Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Reserved for Healer Mallik complex adjustment evaluations…"
              className="w-full px-3 py-2 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E2DC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E5E2DC] text-xs font-semibold text-[#5A544E] hover:bg-[#FAF9F6] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2747] text-white text-xs font-bold hover:bg-[#0B1D3A] transition-colors"
            >
              <Save size={13} />
              {isEdit ? 'Update Slot' : 'Create Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
