import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Filter, Calendar, List, Phone, MessageSquare,
  ChevronLeft, ChevronRight, Check, X, Clock, RefreshCw, Eye,
} from 'lucide-react';
import { useAdminStore } from '../../context/AdminStoreContext';
import { appointmentStorage } from '../../services/adminStorage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { AdminAppointment, AppointmentStatus } from '../../types/admin.types';
import { cn } from '../../../lib/utils';

const STATUSES: AppointmentStatus[] = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No-show'];
const PAGE_SIZE = 10;

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function AppointmentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { appointments, refreshAppointments, refreshMetrics, showToast, logAudit } = useAdminStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'All');
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: AppointmentStatus; label: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    refreshAppointments();
  }, [refreshAppointments]);

  // Filter + search
  const filtered = useMemo(() => {
    let data = [...appointments].sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    if (statusFilter !== 'All') {
      data = data.filter(a => a.status?.toLowerCase() === statusFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(a =>
        (a.fullName || '').toLowerCase().includes(q) ||
        (a.phone || '').includes(q) ||
        (a.service || '').toLowerCase().includes(q) ||
        (a.id || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [appointments, statusFilter, search]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleStatusChange = useCallback(async (apptId: string, newStatus: AppointmentStatus) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/appointments/${apptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ status: newStatus.toUpperCase() }),
      });
    } catch {}
    const updated = appointmentStorage.update(apptId, { status: newStatus });
    refreshAppointments();
    refreshMetrics();
    logAudit(newStatus.toLowerCase(), 'appointment', apptId, `Appointment ${apptId} marked as ${newStatus}`);
    showToast('success', `Appointment ${newStatus}`, `${updated?.fullName || 'Patient'}'s appointment has been updated.`);
    setActionLoading(false);
    setConfirmAction(null);
  }, [refreshAppointments, refreshMetrics, logAudit, showToast]);

  const quickActions = (appt: AdminAppointment) => {
    const actions: { label: string; status: AppointmentStatus; icon: React.ReactNode; color: string }[] = [];
    const s = (appt.status || '').toLowerCase();
    if (s === 'pending') {
      actions.push({ label: 'Confirm', status: 'Confirmed', icon: <Check size={11} />, color: 'bg-green-50 text-green-700 hover:bg-green-100' });
      actions.push({ label: 'Cancel', status: 'Cancelled', icon: <X size={11} />, color: 'bg-red-50 text-red-700 hover:bg-red-100' });
    }
    if (s === 'confirmed') {
      actions.push({ label: 'Complete', status: 'Completed', icon: <Check size={11} />, color: 'bg-[#EFF6FF] text-[#1E40AF] hover:bg-blue-100' });
      actions.push({ label: 'No-show', status: 'No-show', icon: <Clock size={11} />, color: 'bg-gray-100 text-gray-600 hover:bg-gray-200' });
      actions.push({ label: 'Cancel', status: 'Cancelled', icon: <X size={11} />, color: 'bg-red-50 text-red-700 hover:bg-red-100' });
    }
    return actions;
  };

  return (
    <div className="p-3 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#1A1A1A]">Appointments</h1>
          <p className="text-sm text-[#9E968C]">{filtered.length} appointment{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/admin/appointments/new')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2747] text-white text-sm font-semibold hover:bg-[#0B1D3A] transition-colors"
        >
          <Plus size={15} />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E968C]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Name, phone, service..."
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#E5E2DC] bg-white text-sm text-[#1A1A1A] placeholder:text-[#C4BDB4] focus:outline-none focus:border-[#0F2747] focus:ring-2 focus:ring-[#0F2747]/10 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['All', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white border border-[#E5E2DC] text-[#5A544E] hover:bg-[#F8F7F4]'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E2DC] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#F8F7F4]">
                {['ID', 'Patient', 'Service', 'Date & Time', 'Status', 'Source', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[#9E968C] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8F7F4]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Calendar size={22} />}
                      title={search || statusFilter !== 'All' ? 'No matching appointments' : 'No appointments yet'}
                      description={search || statusFilter !== 'All' ? 'Try adjusting your filters.' : 'Create your first appointment to get started.'}
                      action={!search && statusFilter === 'All' ? { label: '+ New Appointment', onClick: () => navigate('/admin/appointments/new') } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map(appt => (
                  <tr key={appt.id} className="hover:bg-[#F8F7F4] transition-colors group">
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#9E968C]">{appt.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/appointments/${appt.id}`)}
                        className="text-left hover:text-[#0F2747] transition-colors"
                      >
                        <p className="font-medium text-[#1A1A1A]">{appt.fullName}</p>
                        <p className="text-[11px] text-[#9E968C]">{appt.phone}</p>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12.5px] text-[#2C2926]">{appt.service}</p>
                      <p className="text-[11px] text-[#9E968C]">{appt.condition}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-[12.5px] font-medium text-[#1A1A1A]">{formatDate(appt.preferredDate)}</p>
                      <p className="text-[11px] text-[#9E968C]">{appt.preferredTime}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="px-4 py-3 text-[11.5px] text-[#9E968C]">{appt.source}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {/* Quick status actions */}
                        {quickActions(appt).map(action => (
                          <button
                            key={action.status}
                            onClick={() => setConfirmAction({ id: appt.id, action: action.status, label: action.label })}
                            title={action.label}
                            className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors', action.color)}
                          >
                            {action.icon}
                          </button>
                        ))}
                        <a
                          href={`tel:${appt.phone}`}
                          className="w-7 h-7 rounded-lg bg-[#F4F1EA] flex items-center justify-center text-[#5A544E] hover:bg-[#E8E4DC] transition-colors"
                          title="Call"
                        >
                          <Phone size={11} />
                        </a>
                        <button
                          onClick={() => navigate(`/admin/appointments/${appt.id}`)}
                          className="w-7 h-7 rounded-lg bg-[#F4F1EA] flex items-center justify-center text-[#5A544E] hover:bg-[#E8E4DC] transition-colors"
                          title="View"
                        >
                          <Eye size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#F0ECE4]">
            <p className="text-[11.5px] text-[#9E968C]">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] hover:bg-[#F8F7F4] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                    p === page ? 'bg-[#1A1A1A] text-white' : 'border border-[#E5E2DC] text-[#5A544E] hover:bg-[#F8F7F4]'
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] hover:bg-[#F8F7F4] disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        title={`Mark as ${confirmAction?.action}`}
        message={`Are you sure you want to mark this appointment as "${confirmAction?.action}"• This action will update the appointment status and be recorded in the audit log.`}
        confirmLabel={confirmAction?.label || 'Confirm'}
        variant={confirmAction?.action === 'Cancelled' || confirmAction?.action === 'No-show' ? 'danger' : 'warning'}
        isLoading={actionLoading}
        onConfirm={() => confirmAction && handleStatusChange(confirmAction.id, confirmAction.action)}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

