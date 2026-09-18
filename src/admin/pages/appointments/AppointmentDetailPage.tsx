import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, MessageSquare, Calendar, Clock,
  User, Tag, FileText, Check, X, RefreshCw, Trash2, CalendarCheck,
} from 'lucide-react';
import { appointmentStorage, notificationStorage } from '../../services/adminStorage';
import { useAdminStore } from '../../context/AdminStoreContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { AdminAppointment, AppointmentStatus } from '../../types/admin.types';

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshAppointments, refreshMetrics, showToast, logAudit } = useAdminStore();

  const [appt, setAppt] = useState<AdminAppointment | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ action: AppointmentStatus; label: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingAppt, setLoadingAppt] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [followUpPrompt, setFollowUpPrompt] = useState<'Completed' | 'No-show' | null>(null);

  useEffect(() => {
    if (!id) return;
    const local = appointmentStorage.getById(id);
    if (local) {
      setAppt(local);
      setEditNotes(local.notes || '');
      setLoadingAppt(false);
    }

    const token = localStorage.getItem('admin_token');
    fetch(`/api/appointments/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.appointment) {
          const a = data.appointment;
          const normalized: AdminAppointment = {
            ...a,
            fullName: a.fullName || a.patientName || 'Patient',
            phone: a.phone || a.patientPhone || '',
            email: a.email || a.patientEmail || undefined,
            preferredDate: a.preferredDate || a.date || '',
            preferredTime: a.preferredTime || a.time || '',
            service: a.service || 'Chiropractic Care',
            status: a.status ? (a.status.charAt(0).toUpperCase() + a.status.slice(1).toLowerCase()) as AppointmentStatus : 'Confirmed',
          };
          setAppt(normalized);
          setEditNotes(normalized.notes || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAppt(false));
  }, [id]);

  if (loadingAppt && !appt) {
    return (
      <div className="p-12 text-center">
        <RefreshCw size={24} className="animate-spin text-[#10B981] mx-auto mb-3" />
        <p className="text-sm text-[#5A544E]">Loading appointment details...</p>
      </div>
    );
  }

  if (!appt) {
    return (
      <div className="p-3 sm:p-6 text-center">
        <p className="text-sm text-[#9E968C]">Appointment not found.</p>
        <button onClick={() => navigate('/admin/appointments')} className="mt-3 text-xs text-[#0F2747] hover:underline">
          ← Back to Appointments
        </button>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/appointments/${appt.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ status: newStatus.toUpperCase().replace(/[\s-]+/g, '_') }),
      });
    } catch {}
    const updated = appointmentStorage.update(appt.id, { status: newStatus });
    const target = updated || { ...appt, status: newStatus };
    setAppt(target);
    refreshAppointments();
    refreshMetrics();
    logAudit(newStatus.toLowerCase(), 'appointment', appt.id, `Appointment ${appt.id} marked as ${newStatus}`);
    if (newStatus === 'Cancelled') {
      notificationStorage.create({
        type: 'appointment',
        title: 'Appointment Cancelled',
        message: `${appt.fullName}'s appointment on ${appt.preferredDate} was cancelled.`,
        entityId: appt.id,
        entityType: 'appointment',
        link: `/admin/appointments/${appt.id}`,
      });
      showToast('success', 'Appointment Cancelled', 'Appointment cancelled — moved to history.');
    } else if (newStatus === 'Completed') {
      showToast('success', 'Appointment Completed', 'Appointment completed — moved to history.');
    } else if (newStatus === 'No-show') {
      showToast('success', 'Marked No-show', 'Marked as No-show — moved to history.');
    } else {
      showToast('success', `Status updated to ${newStatus}`);
    }
    setActionLoading(false);
    setConfirmAction(null);
    // Surface a non-blocking informational prompt for terminal statuses
    if (newStatus === 'Completed' || newStatus === 'No-show') setFollowUpPrompt(newStatus as 'Completed' | 'No-show');
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await new Promise(r => setTimeout(r, 200));
    const updated = appointmentStorage.update(appt.id, { notes: editNotes });
    if (updated) {
      setAppt(updated);
      logAudit('updated', 'appointment', appt.id, `Notes updated for appointment ${appt.id}`);
      showToast('success', 'Notes saved');
    }
    setSavingNotes(false);
  };

  const handleDelete = async () => {
    setActionLoading(true);
    await new Promise(r => setTimeout(r, 300));
    appointmentStorage.delete(appt.id);
    refreshAppointments();
    refreshMetrics();
    logAudit('deleted', 'appointment', appt.id, `Appointment ${appt.id} deleted`);
    showToast('success', 'Appointment deleted');
    navigate('/admin/appointments');
  };

  const statusActions: { label: string; status: AppointmentStatus; variant: 'danger' | 'warning' }[] = [
    appt.status === 'Pending' && { label: 'Confirm Appointment', status: 'Confirmed', variant: 'warning' },
    (appt.status === 'Pending' || appt.status === 'Confirmed') && { label: 'Mark Completed', status: 'Completed', variant: 'warning' },
    (appt.status === 'Pending' || appt.status === 'Confirmed') && { label: 'Mark No-show', status: 'No-show', variant: 'danger' },
    (appt.status === 'Pending' || appt.status === 'Confirmed') && { label: 'Cancel Appointment', status: 'Cancelled', variant: 'danger' },
  ].filter(Boolean) as { label: string; status: AppointmentStatus; variant: 'danger' | 'warning' }[];

  return (
    <div className="p-3 sm:p-6 max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => navigate('/admin/appointments')}
          className="w-8 h-8 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] hover:bg-[#F8F7F4] transition-colors flex-shrink-0"
        >
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-bold text-[#1A1A1A] truncate">{appt.fullName}</h1>
            <StatusBadge status={appt.status} size="md" className="flex-shrink-0" />
          </div>
          <p className="text-xs text-[#9E968C] font-mono truncate">{appt.id}</p>
        </div>
        <button
          onClick={() => setDeleteConfirm(true)}
          className="w-8 h-8 rounded-lg border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
          title="Delete appointment"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patient Info */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Patient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full overflow-hidden">
              <div className="min-w-0 max-w-full overflow-hidden">
                <label className="text-[10.5px] text-[#9E968C] font-medium">Full Name</label>
                <p className="text-sm text-[#1A1A1A] font-medium mt-0.5 break-words max-w-full truncate">{appt.fullName}</p>
              </div>
              <div className="min-w-0 max-w-full overflow-hidden">
                <label className="text-[10.5px] text-[#9E968C] font-medium">Phone</label>
                <div className="flex items-center gap-2 mt-0.5 max-w-full">
                  <p className="text-sm text-[#1A1A1A] break-all max-w-full overflow-hidden">{appt.phone}</p>
                  <a href={`tel:${appt.phone}`} className="w-6 h-6 rounded-md bg-[#F4F1EA] flex items-center justify-center text-[#5A544E] hover:bg-[#E8E4DC] flex-shrink-0" title="Call">
                    <Phone size={11} />
                  </a>
                </div>
              </div>
              {appt.email && (
                <div className="min-w-0 max-w-full overflow-hidden">
                  <label className="text-[10.5px] text-[#9E968C] font-medium">Email</label>
                  <p className="text-sm text-[#1A1A1A] mt-0.5 break-all max-w-full overflow-hidden">{appt.email}</p>
                </div>
              )}
              <div className="min-w-0 max-w-full overflow-hidden">
                <label className="text-[10.5px] text-[#9E968C] font-medium">Source</label>
                <p className="text-sm text-[#1A1A1A] mt-0.5 break-words max-w-full overflow-hidden">{appt.source}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Appointment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full overflow-hidden">
              <div className="min-w-0 max-w-full overflow-hidden">
                <label className="text-[10.5px] text-[#9E968C] font-medium">Service</label>
                <p className="text-sm text-[#1A1A1A] font-medium mt-0.5 break-words max-w-full overflow-hidden">{appt.service}</p>
              </div>
              <div className="min-w-0 max-w-full overflow-hidden">
                <label className="text-[10.5px] text-[#9E968C] font-medium">Condition</label>
                <p className="text-sm text-[#1A1A1A] mt-0.5 break-words max-w-full overflow-hidden">{appt.condition}</p>
              </div>
              <div className="min-w-0 max-w-full overflow-hidden">
                <label className="text-[10.5px] text-[#9E968C] font-medium">Date</label>
                <p className="text-sm text-[#1A1A1A] mt-0.5">{formatDate(appt.preferredDate)}</p>
              </div>
              <div className="min-w-0 max-w-full overflow-hidden">
                <label className="text-[10.5px] text-[#9E968C] font-medium">Time</label>
                <p className="text-sm text-[#1A1A1A] mt-0.5">{appt.preferredTime}</p>
              </div>
              {appt.assignedTo && (
                <div className="min-w-0 max-w-full overflow-hidden">
                  <label className="text-[10.5px] text-[#9E968C] font-medium">Assigned To</label>
                  <p className="text-sm text-[#1A1A1A] mt-0.5 break-words max-w-full overflow-hidden">{appt.assignedTo}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Notes</h2>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={4}
              placeholder="Add clinical notes, reminders, or follow-up details..."
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E2DC] text-sm text-[#1A1A1A] placeholder:text-[#C4BDB4] focus:outline-none focus:border-[#0F2747] focus:ring-2 focus:ring-[#0F2747]/10 resize-none transition-all"
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes || editNotes === appt.notes}
              className="px-4 py-2 rounded-xl bg-[#1A1A1A] text-white text-xs font-semibold hover:bg-[#2E2C29] disabled:opacity-40 transition-colors"
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* Actions + Meta */}
        <div className="space-y-4">
          {/* Status Actions */}
          {statusActions.length > 0 && (
            <div className="bg-white border border-[#E5E2DC] rounded-2xl p-4 space-y-2">
              <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider mb-3">Actions</h2>
              {statusActions.map(action => (
                <button
                  key={action.status}
                  onClick={() => setConfirmAction({ action: action.status, label: action.label })}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
                    action.variant === 'danger'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-100'
                      : 'bg-[#F4F1EA] text-[#1A1A1A] hover:bg-[#E8E4DC] border border-[#E5E2DC]'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Post-status informational prompt — admin-initiated follow-up only */}
          {followUpPrompt && (
            <div className={`rounded-2xl p-4 border ${
              followUpPrompt === 'Completed'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-start gap-2.5">
                <CalendarCheck size={15} className={followUpPrompt === 'Completed' ? 'text-emerald-600 mt-0.5' : 'text-slate-500 mt-0.5'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${
                    followUpPrompt === 'Completed' ? 'text-emerald-800' : 'text-slate-700'
                  }`}>
                    {followUpPrompt === 'Completed'
                      ? 'Appointment completed — patient history preserved.'
                      : 'Marked no-show — patient history preserved.'
                    }
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {followUpPrompt === 'Completed'
                      ? 'To schedule a follow-up, open the patient profile and use Set Follow-up.'
                      : 'To schedule a follow-up or re-engagement, open the patient profile.'
                    }
                  </p>
                  {appt.patientId && (
                    <button
                      onClick={() => navigate(`/admin/patients/${appt.patientId}`)}
                      className="text-[11px] font-medium mt-1 text-[#0F2747] hover:underline"
                    >
                      Open Patient Profile →
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setFollowUpPrompt(null)}
                  className="text-[#9E968C] hover:text-[#5A544E] transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Record Info</h2>
            <div className="space-y-2">
              <div>
                <p className="text-[10.5px] text-[#9E968C]">Created</p>
                <p className="text-xs text-[#5A544E]">{formatTs(appt.createdAt)}</p>
              </div>
              <div>
                <p className="text-[10.5px] text-[#9E968C]">Last Updated</p>
                <p className="text-xs text-[#5A544E]">{formatTs(appt.updatedAt)}</p>
              </div>
              {appt.leadId && (
                <div>
                  <p className="text-[10.5px] text-[#9E968C]">Linked Lead</p>
                  <button
                    onClick={() => navigate(`/admin/leads/${appt.leadId}`)}
                    className="text-xs text-[#0F2747] hover:underline"
                  >
                    View Lead →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Status Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.label || ''}
        message={`This will update the appointment status to "${confirmAction?.action}" and log the change.`}
        confirmLabel={confirmAction?.label || 'Confirm'}
        variant={confirmAction?.variant || 'warning'}
        isLoading={actionLoading}
        onConfirm={() => confirmAction && handleStatusChange(confirmAction.action)}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteConfirm}
        title="Delete Appointment"
        message="This will permanently delete this appointment record. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}

