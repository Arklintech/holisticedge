import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Phone, MessageSquare, ArrowRight, Eye,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAdminStore } from '../../context/AdminStoreContext';
import { leadStorage } from '../../services/adminStorage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import type { AdminLead, LeadStatus } from '../../types/admin.types';
import { cn } from '../../../lib/utils';

const STATUSES: LeadStatus[] = ['New', 'Contacted', 'Interested', 'Appointment Booked', 'Follow-up', 'Converted', 'Not Interested', 'Closed'];
const PAGE_SIZE = 12;

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function LeadsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { leads, refreshLeads, refreshMetrics, showToast, logAudit } = useAdminStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'All');
  const [page, setPage] = useState(1);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const leadsList = Array.isArray(leads) ? leads : [];

  const filtered = useMemo(() => {
    let data = [...leadsList].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    if (statusFilter !== 'All') data = data.filter(l => l.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(l =>
        (l.fullName || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.condition || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [leadsList, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleStatusChange = useCallback(async (lead: AdminLead, newStatus: LeadStatus) => {
    setChangingStatus(lead.id);
    leadStorage.update(lead.id, { status: newStatus, lastContactedAt: new Date().toISOString() });

    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: newStatus,
          lastContactedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.warn('Backend lead status update failed, updated locally:', err);
    }

    refreshLeads();
    refreshMetrics();
    logAudit('status_changed', 'lead', lead.id, `Lead ${lead.fullName} status changed to ${newStatus}`);
    showToast('success', 'Status updated', `${lead.fullName} → ${newStatus}`);
    setChangingStatus(null);
  }, [refreshLeads, refreshMetrics, logAudit, showToast]);

  // CRM summary counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: leadsList.length };
    STATUSES.forEach(s => { c[s] = leadsList.filter(l => l.status === s).length; });
    return c;
  }, [leadsList]);

  return (
    <div className="p-3 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#1A1A1A]">Leads & Inquiries</h1>
          <p className="text-sm text-[#9E968C]">{leadsList.length} total · {counts['New'] || 0} new</p>
        </div>
        <button
          onClick={() => navigate('/admin/leads/new')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2747] text-white text-sm font-semibold hover:bg-[#0B1D3A] transition-colors"
        >
          <Plus size={15} /> Add Lead
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap items-center gap-1.5">
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
            {s} {counts[s] !== undefined && counts[s] > 0 && <span className="opacity-60 ml-0.5">({counts[s]})</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E968C]" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Name, phone, condition..."
          className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#E5E2DC] bg-white text-sm placeholder:text-[#C4BDB4] focus:outline-none focus:border-[#0F2747] focus:ring-2 focus:ring-[#0F2747]/10 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E2DC] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#F8F7F4]">
                {['Name', 'Condition', 'Source', 'Status', 'Notes', 'Created', 'Actions'].map(h => (
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
                      icon={<Plus size={22} />}
                      title="No leads found"
                      description={search || statusFilter !== 'All' ? 'Try adjusting your filters.' : 'Leads will appear here when patients submit inquiries.'}
                      action={!search && statusFilter === 'All' ? { label: '+ Add Lead', onClick: () => navigate('/admin/leads/new') } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map(lead => (
                  <tr key={lead.id} className="hover:bg-[#F8F7F4] transition-colors group">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/leads/${lead.id}`)}
                        className="text-left hover:text-[#0F2747] transition-colors"
                      >
                        <p className="font-medium text-[#1A1A1A]">{lead.fullName}</p>
                        <p className="text-[11px] text-[#9E968C]">{lead.phone}</p>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12.5px] text-[#2C2926]">{lead.condition}</p>
                      <p className="text-[11px] text-[#9E968C] truncate max-w-[140px]">{lead.message?.slice(0, 50)}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#9E968C]">{lead.source}</td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        disabled={changingStatus === lead.id}
                        onChange={e => handleStatusChange(lead, e.target.value as LeadStatus)}
                        className="text-[11.5px] border border-[#E5E2DC] rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-[#0F2747] cursor-pointer"
                        onClick={e => e.stopPropagation()}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11.5px] text-[#9E968C]">{(lead.notes?.length || 0)} note{(lead.notes?.length || 0) !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#9E968C] whitespace-nowrap">{formatRelative(lead.createdAt || new Date().toISOString())}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`tel:${lead.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="w-7 h-7 rounded-lg bg-[#F4F1EA] flex items-center justify-center text-[#5A544E] hover:bg-[#E8E4DC]"
                          title="Call"
                        >
                          <Phone size={11} />
                        </a>
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-green-700 hover:bg-green-100"
                          title="WhatsApp"
                        >
                          <MessageSquare size={11} />
                        </a>
                        <button
                          onClick={() => navigate(`/admin/leads/${lead.id}`)}
                          className="w-7 h-7 rounded-lg bg-[#F4F1EA] flex items-center justify-center text-[#5A544E] hover:bg-[#E8E4DC]"
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-7 h-7 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-7 h-7 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

