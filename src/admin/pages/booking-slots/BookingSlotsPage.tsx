import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Ban,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Edit2,
  Sparkles,
  Zap,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useAdminStore } from '../../context/AdminStoreContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  bookingSlotStorage,
  type BookingSlot,
  type SlotStatus,
  DEFAULT_TIME_SLOTS,
} from '../../services/bookingSlotStorage';
import { SlotFormModal } from './SlotFormModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { cn } from '../../../lib/utils';

export function BookingSlotsPage() {
  const { showToast, logAudit } = useAdminStore();
  const { user } = useAdminAuth();

  const todayIso = useMemo(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [statusFilter, setStatusFilter] = useState<'ALL' | SlotStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<BookingSlot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookingSlot | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchCapacity, setBatchCapacity] = useState(5);

  const loadSlots = () => {
    setSlots(bookingSlotStorage.getAll());
  };

  useEffect(() => {
    loadSlots();
    const unsub = bookingSlotStorage.subscribe(loadSlots);
    return unsub;
  }, []);

  // When selectedDate changes, ensure standard slots exist and sync live from backend API
  useEffect(() => {
    if (selectedDate) {
      bookingSlotStorage.ensureScheduleForDate(selectedDate);
      loadSlots();

      setIsSyncing(true);
      fetch(`/api/public/slots?date=${encodeURIComponent(selectedDate)}`)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data && data.success && Array.isArray(data.slots) && data.slots.length > 0) {
            bookingSlotStorage.syncFromBackend(selectedDate, data.slots);
            loadSlots();
          }
        })
        .catch(err => {
          console.warn('[BookingSlotsPage] Live sync note:', err);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [selectedDate]);

  // Filtered list
  const filteredSlots = useMemo(() => {
    return slots.filter(slot => {
      const matchesDate = !selectedDate || slot.date === selectedDate;
      const matchesStatus = statusFilter === 'ALL' || slot.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        (slot.timeLabel || '').toLowerCase().includes(q) ||
        (slot.notes && slot.notes.toLowerCase().includes(q)) ||
        (slot.blockedReason && slot.blockedReason.toLowerCase().includes(q));

      return matchesDate && matchesStatus && matchesSearch;
    });
  }, [slots, selectedDate, statusFilter, searchQuery]);

  // Daily statistics for selected date
  const dayStats = useMemo(() => {
    const daySlots = selectedDate ? slots.filter(s => s.date === selectedDate) : slots;
    const total = daySlots.length;
    const open = daySlots.filter(s => s.status === 'OPEN').length;
    const full = daySlots.filter(s => s.status === 'FULL').length;
    const closed = daySlots.filter(s => s.status === 'CLOSED').length;
    const blocked = daySlots.filter(s => s.status === 'BLOCKED').length;

    const totalSeats = daySlots.reduce((acc, s) => acc + s.capacity, 0);
    const bookedSeats = daySlots.reduce((acc, s) => acc + s.booked, 0);
    const remainingSeats = Math.max(0, totalSeats - bookedSeats);
    const utilization = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;

    return { total, open, full, closed, blocked, totalSeats, bookedSeats, remainingSeats, utilization };
  }, [slots, selectedDate]);

  // Actions
  const handleToggleStatus = (slot: BookingSlot) => {
    const nextStatus: SlotStatus = slot.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    bookingSlotStorage.setStatus(slot.id, nextStatus);
    logAudit(
      nextStatus === 'OPEN' ? 'opened' : 'closed',
      'booking_slot' as any,
      slot.id,
      `${nextStatus === 'OPEN' ? 'Opened' : 'Closed'} slot ${slot.date} at ${slot.timeLabel}`
    );
    showToast('success', `Slot ${nextStatus === 'OPEN' ? 'Opened' : 'Closed'}`, `${slot.timeLabel} is now ${nextStatus.toLowerCase()}.`);

    // Sync with backend API
    fetch(`/api/booking-slots/${slot.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}`,
        'x-admin-user-email': 'admin@holisticedge.in',
      },
      body: JSON.stringify({
        date: slot.date,
        time: slot.time,
        capacity: slot.capacity,
        status: nextStatus === 'OPEN' ? 'AVAILABLE' : 'CLOSED',
      }),
    }).catch(e => console.warn('Could not sync slot status to server:', e));
  };

  const handleToggleBlock = (slot: BookingSlot) => {
    if (slot.status === 'BLOCKED') {
      bookingSlotStorage.setStatus(slot.id, 'OPEN');
      logAudit('unblocked', 'booking_slot' as any, slot.id, `Unblocked slot ${slot.date} at ${slot.timeLabel}`);
      showToast('success', 'Slot Unblocked', `${slot.timeLabel} is now open for bookings.`);

      fetch(`/api/booking-slots/${slot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}`,
          'x-admin-user-email': 'admin@holisticedge.in',
        },
        body: JSON.stringify({
          date: slot.date,
          time: slot.time,
          capacity: slot.capacity,
          status: 'AVAILABLE',
        }),
      }).catch(e => console.warn('Could not sync slot unblock to server:', e));
    } else {
      const reason = window.prompt('Enter reason for blocking this slot (e.g. Doctor in surgery):', 'Clinical procedure scheduled');
      if (reason !== null) {
        bookingSlotStorage.setStatus(slot.id, 'BLOCKED', reason || 'Blocked by administrator');
        logAudit('blocked', 'booking_slot' as any, slot.id, `Blocked slot ${slot.date} at ${slot.timeLabel}: ${reason}`);
        showToast('info', 'Slot Blocked', `${slot.timeLabel} blocked.`);

        fetch(`/api/booking-slots/${slot.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}`,
            'x-admin-user-email': 'admin@holisticedge.in',
          },
          body: JSON.stringify({
            date: slot.date,
            time: slot.time,
            capacity: slot.capacity,
            status: 'BLOCKED',
            blockedReason: reason || 'Blocked by administrator',
          }),
        }).catch(e => console.warn('Could not sync slot block to server:', e));
      }
    }
  };

  const handleDuplicate = (slot: BookingSlot) => {
    const targetDate = window.prompt('Enter target date to copy slot to (YYYY-MM-DD):', slot.date);
    if (!targetDate) return;

    const dup = bookingSlotStorage.duplicate(slot.id, targetDate);
    if (dup) {
      logAudit('duplicated', 'booking_slot' as any, dup.id, `Duplicated slot to ${targetDate} at ${slot.timeLabel}`);
      showToast('success', 'Slot Duplicated', `Created slot on ${targetDate} at ${slot.timeLabel}.`);
    } else {
      showToast('error', 'Duplicate Failed', '• slot already exists on that date at this time.');
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const res = bookingSlotStorage.delete(deleteTarget.id);
    if (res.success) {
      logAudit('deleted', 'booking_slot' as any, deleteTarget.id, `Deleted slot ${deleteTarget.date} at ${deleteTarget.timeLabel}`);
      showToast('success', 'Slot Deleted', `Removed ${deleteTarget.timeLabel} slot.`);
    } else {
      showToast('error', 'Cannot Delete Slot', res.error || 'Failed to delete slot.');
    }
    setDeleteTarget(null);
  };

  const handleGenerateBatch = () => {
    if (!selectedDate) return;
    const res = bookingSlotStorage.generateScheduleForDate(selectedDate, {
      defaultCapacity: batchCapacity,
    });
    logAudit('batch_generated', 'booking_slot' as any, selectedDate, `Generated ${res.created} standard slots for ${selectedDate}`);
    showToast(
      'success',
      'Schedule Generated',
      `Created ${res.created} slots (${res.skipped} already existed).`
    );
    setBatchModalOpen(false);
  };

  const navigateDate = (days: number) => {
    const current = new Date(selectedDate || todayIso);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-[#1A1A1A]">Booking Slots & Capacity Management</h1>
            <span className="text-xs bg-[#0F2747]/10 text-[#0F2747] font-bold px-2.5 py-0.5 rounded-full border border-[#0F2747]/20">
              Live Real-Time Sync
            </span>
          </div>
          <p className="text-sm text-[#9E968C] mt-0.5">
            Control appointment slot availability, clinical chair capacity, and instant website scheduling
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBatchModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E2DC] bg-white text-xs font-semibold text-[#2C2926] hover:bg-[#F8F7F4] transition-colors"
          >
            <Sparkles size={13} className="text-[#0F2747]" />
            Generate Day Schedule
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingSlot(null);
              setFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2747] text-white text-xs font-bold hover:bg-[#0B1D3A] transition-colors"
          >
            <Plus size={14} /> Add Single Slot
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#9E968C] mb-1 font-medium">
            <span>Total Slots</span>
            <Clock size={14} className="text-[#0F2747]" />
          </div>
          <p className="text-2xl font-black text-[#1A1A1A]">{dayStats.total}</p>
          <p className="text-[11px] text-[#5A544E] mt-1">
            <span className="text-green-600 font-bold">{dayStats.open} Open</span> · <span className="text-red-600 font-bold">{dayStats.full} Full</span>
          </p>
        </div>

        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#9E968C] mb-1 font-medium">
            <span>Patient Capacity</span>
            <Users size={14} className="text-[#0F2747]" />
          </div>
          <p className="text-2xl font-black text-[#1A1A1A]">{dayStats.totalSeats} seats</p>
          <p className="text-[11px] text-[#5A544E] mt-1">
            {dayStats.remainingSeats} remaining today
          </p>
        </div>

        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#9E968C] mb-1 font-medium">
            <span>Booked Appointments</span>
            <CheckCircle2 size={14} className="text-green-600" />
          </div>
          <p className="text-2xl font-black text-green-700">{dayStats.bookedSeats}</p>
          <p className="text-[11px] text-[#5A544E] mt-1">
            Confirmed clinical sessions
          </p>
        </div>

        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#9E968C] mb-1 font-medium">
            <span>Capacity Utilization</span>
            <TrendingUp size={14} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-[#0F2747]">{dayStats.utilization}%</p>
          <div className="w-full bg-[#E5E2DC] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#0F2747] h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, dayStats.utilization)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Date Navigation & Filter Controls */}
      <div className="bg-white border border-[#E5E2DC] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateDate(-1)}
              className="w-8 h-8 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] hover:bg-[#FAF9F6]"
              title="Previous Day"
            >
              <ChevronLeft size={15} />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[#E5E2DC] text-xs font-bold text-[#1A1A1A] outline-none focus:border-[#0F2747]"
            />

            <button
              type="button"
              onClick={() => navigateDate(1)}
              className="w-8 h-8 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] hover:bg-[#FAF9F6]"
              title="Next Day"
            >
              <ChevronRight size={15} />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(todayIso)}
              className={cn(
                'px-3 h-8 rounded-lg text-xs font-semibold transition-colors',
                selectedDate === todayIso
                  ? 'bg-[#0F2747] text-white'
                  : 'border border-[#E5E2DC] text-[#5A544E] hover:bg-[#FAF9F6]'
              )}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => {
                const tmrw = new Date();
                tmrw.setDate(tmrw.getDate() + 1);
                setSelectedDate(tmrw.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
              }}
              className="px-3 h-8 rounded-lg border border-[#E5E2DC] text-xs font-semibold text-[#5A544E] hover:bg-[#FAF9F6]"
            >
              Tomorrow
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate('')}
              className={cn(
                'px-3 h-8 rounded-lg text-xs font-semibold transition-colors',
                selectedDate === ''
                  ? 'bg-[#0F2747] text-white'
                  : 'border border-[#E5E2DC] text-[#5A544E] hover:bg-[#FAF9F6]'
              )}
            >
              All Dates
            </button>
          </div>

          {/* Search and Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E968C]" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search slot time or notes..."
                className="w-full pl-8 pr-3 h-8 rounded-lg border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747]"
              />
            </div>

            <div className="flex gap-1 border border-[#E5E2DC] rounded-xl p-0.5 bg-[#FAF9F6]">
              {(['ALL', 'OPEN', 'FULL', 'CLOSED', 'BLOCKED'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors',
                    statusFilter === st
                      ? 'bg-[#0F2747] text-white shadow-xs'
                      : 'text-[#5A544E] hover:text-[#1A1A1A]'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Slots Table */}
      <div className="bg-white border border-[#E5E2DC] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] border-b border-[#E5E2DC] text-[#5A544E] uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Date & Time</th>
                <th className="px-4 py-3.5">Capacity & Seats</th>
                <th className="px-4 py-3.5">Booked</th>
                <th className="px-4 py-3.5">Remaining</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Notes / Reasons</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC]">
              {filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-[#9E968C]">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-[#E5E2DC] flex items-center justify-center mx-auto mb-3">
                      <CalendarDays size={20} className="text-[#9E968C]" />
                    </div>
                    <p className="text-sm font-bold text-[#1A1A1A]">No Booking Slots Found</p>
                    <p className="text-xs mt-1">
                      {selectedDate
                        ? `No slots configured for ${selectedDate}. Use "Generate Day Schedule" or "Add Single Slot".`
                        : 'No slots match the active filters.'}
                    </p>
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={() => setBatchModalOpen(true)}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2747] text-white text-xs font-bold"
                      >
                        <Sparkles size={13} /> Generate Day Schedule Now
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSlots.map(slot => {
                  const remaining = Math.max(0, slot.capacity - slot.booked);
                  const isPast = new Date(`${slot.date}T${slot.time}`) < new Date();

                  return (
                    <tr key={slot.id} className="hover:bg-[#FAF9F6]/60 transition-colors">
                      {/* Date & Time */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs',
                            slot.status === 'OPEN' ? 'bg-[#0F2747] text-white' :
                            slot.status === 'FULL' ? 'bg-red-100 text-red-700' :
                            slot.status === 'BLOCKED' ? 'bg-amber-100 text-amber-800' :
                            'bg-[#E5E2DC] text-[#5A544E]'
                          )}>
                            <Clock size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#1A1A1A]">{slot.timeLabel}</p>
                            <p className="text-[11px] text-[#9E968C]">{slot.date}</p>
                          </div>
                        </div>
                      </td>

                      {/* Capacity */}
                      <td className="px-4 py-4">
                        <span className="font-bold text-[#1A1A1A]">{slot.capacity} seats</span>
                      </td>

                      {/* Booked */}
                      <td className="px-4 py-4">
                        <span className={cn(
                          'font-bold px-2 py-0.5 rounded-md text-[11px]',
                          slot.booked > 0 ? 'bg-blue-50 text-blue-700' : 'text-[#9E968C]'
                        )}>
                          {slot.booked} booked
                        </span>
                      </td>

                      {/* Remaining */}
                      <td className="px-4 py-4">
                        <span className={cn(
                          'font-bold text-xs inline-flex items-center gap-1',
                          remaining === 0 ? 'text-red-600' :
                          remaining === 1 ? 'text-red-700 bg-red-100/80 px-2 py-0.5 rounded-full border border-red-300 animate-pulse font-extrabold' :
                          remaining === 2 ? 'text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300 font-extrabold' :
                          'text-green-700'
                        )}>
                          {remaining === 0 ? '0 available (Full)' :
                           remaining === 1 ? '🔥 Only 1 left!' :
                           remaining === 2 ? '⚡ Only 2 left' :
                           `${remaining} available`}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold',
                          slot.status === 'OPEN' ? 'bg-green-50 text-green-700 border border-green-200' :
                          slot.status === 'FULL' ? 'bg-red-50 text-red-700 border border-red-200' :
                          slot.status === 'BLOCKED' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          'bg-[#FAF9F6] text-[#5A544E] border border-[#E5E2DC]'
                        )}>
                          {slot.status === 'OPEN' && <CheckCircle2 size={11} />}
                          {slot.status === 'FULL' && <AlertCircle size={11} />}
                          {slot.status === 'BLOCKED' && <Ban size={11} />}
                          {slot.status === 'CLOSED' && <Lock size={11} />}
                          {slot.status}
                        </span>
                      </td>

                      {/* Notes / Reasons */}
                      <td className="px-4 py-4 max-w-xs">
                        {slot.blockedReason && (
                          <p className="text-[11px] text-amber-800 font-semibold truncate" title={slot.blockedReason}>
                            Blocked: {slot.blockedReason}
                          </p>
                        )}
                        {slot.notes && (
                          <p className="text-[11px] text-[#5A544E] truncate" title={slot.notes}>
                            {slot.notes}
                          </p>
                        )}
                        {!slot.blockedReason && !slot.notes && (
                          <span className="text-[#C4BEB4]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Toggle Open/Closed */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(slot)}
                            className="p-1.5 rounded-lg text-[#5A544E] hover:text-[#0F2747] hover:bg-[#FAF9F6] transition-colors"
                            title={slot.status === 'OPEN' ? 'Close Slot' : 'Open Slot'}
                          >
                            {slot.status === 'OPEN' ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>

                          {/* Toggle Block */}
                          <button
                            type="button"
                            onClick={() => handleToggleBlock(slot)}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              slot.status === 'BLOCKED'
                                ? 'text-amber-700 hover:bg-amber-50'
                                : 'text-[#5A544E] hover:text-amber-700 hover:bg-[#FAF9F6]'
                            )}
                            title={slot.status === 'BLOCKED' ? 'Unblock Slot' : 'Block Slot (Doctor Busy)'}
                          >
                            <Ban size={14} />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSlot(slot);
                              setFormModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#5A544E] hover:text-[#0F2747] hover:bg-[#FAF9F6] transition-colors"
                            title="Edit Slot"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(slot)}
                            className="p-1.5 rounded-lg text-[#5A544E] hover:text-[#0F2747] hover:bg-[#FAF9F6] transition-colors"
                            title="Duplicate to Date"
                          >
                            <Copy size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(slot)}
                            disabled={slot.booked > 0}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              slot.booked > 0
                                ? 'text-[#D5CFC5] cursor-not-allowed'
                                : 'text-red-500 hover:bg-red-50'
                            )}
                            title={slot.booked > 0 ? 'Cannot delete slot with active bookings' : 'Delete Slot'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <SlotFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingSlot(null);
        }}
        slot={editingSlot}
        defaultDate={selectedDate}
        onSaved={saved => {
          showToast('success', editingSlot ? 'Slot Updated' : 'Slot Created', `${saved.timeLabel} on ${saved.date} saved.`);
          logAudit(editingSlot ? 'updated' : 'created', 'booking_slot' as any, saved.id, `${editingSlot ? 'Updated' : 'Created'} slot ${saved.date} at ${saved.timeLabel}`);
        }}
      />

      {/* Batch Generator Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBatchModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0F2747] text-white flex items-center justify-center">
                  <Sparkles size={15} />
                </div>
                <h3 className="text-sm font-bold text-[#1A1A1A]">Generate Standard Daily Schedule</h3>
              </div>
              <button onClick={() => setBatchModalOpen(false)} className="text-[#5A544E] hover:text-[#1A1A1A]">×</button>
            </div>

            <p className="text-xs text-[#5A544E] leading-relaxed">
              This will create <strong>12 standard 45-minute clinical appointment slots</strong> (10:00 AM to 7:30 PM) for <strong>{selectedDate || 'the selected date'}</strong>. Any existing slots will be preserved without duplicate creation.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                Default Patient Capacity per Slot
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={batchCapacity}
                onChange={e => setBatchCapacity(parseInt(e.target.value, 10) || 1)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E2DC]">
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#E5E2DC] text-xs font-semibold text-[#5A544E]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateBatch}
                className="px-4 py-2 rounded-xl bg-[#0F2747] text-white text-xs font-bold hover:bg-[#0B1D3A]"
              >
                Generate 12 Slots
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Booking Slot"
        message={`Are you sure you want to delete the ${deleteTarget?.timeLabel} slot for ${deleteTarget?.date}• This cannot be undone.`}
        confirmLabel="Delete Slot"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

