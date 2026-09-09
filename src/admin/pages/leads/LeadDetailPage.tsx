import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, MessageSquare, Plus, Trash2, CalendarPlus, Send,
} from 'lucide-react';
import { leadStorage, appointmentStorage } from '../../services/adminStorage';
import { useAdminStore } from '../../context/AdminStoreContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { AdminLead, LeadStatus, LeadSource } from '../../types/admin.types';
import { conditionsData } from '../../../data/conditions';
import { cn } from '../../../lib/utils';

const STATUSES: LeadStatus[] = ['New', 'Contacted', 'Interested', 'Appointment Booked', 'Follow-up', 'Converted', 'Not Interested', 'Closed'];

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leads, appointments, refreshLeads, refreshMetrics, showToast, logAudit, user } = useAdminStore() as any;

  const [lead, setLead] = useState<AdminLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [linkedAppts, setLinkedAppts] = useState<ReturnType<typeof appointmentStorage.getAll>>([]);

  useEffect(() => {
    if (!id) return;

    let found: AdminLead | null = null;
    if (Array.isArray(leads) && leads.length > 0) {
      found = leads.find((l: AdminLead) => l.id === id) || null;
    }
    if (!found) {
      found = leadStorage.getById(id) || null;
    }

    if (found) {
      setLead(found);
      const appts = Array.isArray(appointments) && appointments.length > 0
        ? appointments.filter((a: any) => a.leadId === id || a.phone === found?.phone)
        : appointmentStorage.getAll().filter(a => a.leadId === id || a.phone === found?.phone);
      setLinkedAppts(appts);
      setLoading(false);
    }

    // Always fetch latest from backend
    fetch(`/api/leads/${id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.success && data.lead) {
          setLead(data.lead);
          const appts = Array.isArray(appointments) && appointments.length > 0
            ? appointments.filter((a: any) => a.leadId === id || a.phone === data.lead.phone)
            : appointmentStorage.getAll().filter(a => a.leadId === id || a.phone === data.lead.phone);
          setLinkedAppts(appts);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, leads, appointments]);

  if (loading && !lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[#9E968C]">Loading lead details...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-3 sm:p-6 text-center">
        <p className="text-sm text-[#9E968C]">Lead not found.</p>
        <button onClick={() => navigate('/admin/leads')} className="mt-3 text-xs text-[#0F2747] hover:underline">← Back to Leads</button>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: LeadStatus) => {
    const updatedLead: AdminLead = {
      ...lead,
      status: newStatus,
      lastContactedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLead(updatedLead);
    leadStorage.update(lead.id, {
      status: newStatus,
      lastContactedAt: updatedLead.lastContactedAt,
      updatedAt: updatedLead.updatedAt,
    });

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
          lastContactedAt: updatedLead.lastContactedAt,
        }),
      });
    } catch (err) {
      console.warn('Backend lead status update failed, updated locally:', err);
    }

    refreshLeads();
    refreshMetrics();
    logAudit('status_changed', 'lead', lead.id, `Lead ${lead.fullName} status changed to ${newStatus}`);
    showToast('success', 'Status updated', `${lead.fullName} → ${newStatus}`);
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setAddingNote(true);
    const newNoteObj = {
      id: `note_${Date.now()}`,
      content: note.trim(),
      author: user?.name || 'Admin',
      createdAt: new Date().toISOString(),
    };
    const updatedNotes = [...(lead.notes || []), newNoteObj];
    const updatedLead: AdminLead = { ...lead, notes: updatedNotes, updatedAt: new Date().toISOString() };
    setLead(updatedLead);
    setNote('');

    leadStorage.addNote(lead.id, { content: note.trim(), author: user?.name || 'Admin' });

    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ notes: updatedNotes }),
      });
    } catch (err) {
      console.warn('Backend note update failed, saved locally:', err);
    }

    refreshLeads();
    showToast('success', 'Note added', 'New observation saved');
    logAudit('note_added', 'lead', lead.id, `Note added to lead ${lead.fullName}`);
    setAddingNote(false);
  };

  const handleDelete = async () => {
    setActionLoading(true);
    leadStorage.delete(lead.id);

    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (err) {
      console.warn('Backend lead deletion failed, deleted locally:', err);
    }

    refreshLeads();
    refreshMetrics();
    logAudit('deleted', 'lead', lead.id, `Lead ${lead.fullName} deleted`);
    showToast('success', 'Lead deleted', lead.fullName);
    navigate('/admin/leads');
  };

  return (
    <div className="p-3 sm:p-6 max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/leads')} className="w-8 h-8 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] hover:bg-[#F8F7F4]">
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#1A1A1A]">{lead.fullName}</h1>
            <StatusBadge status={lead.status} size="md" />
          </div>
          <p className="text-[11px] text-[#9E968C]">{lead.source} · {formatTs(lead.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <a href={`tel:${lead.phone}`} className="w-8 h-8 rounded-lg bg-[#F4F1EA] flex items-center justify-center text-[#5A544E] hover:bg-[#E8E4DC]" title="Call">
            <Phone size={14} />
          </a>
          <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-700 hover:bg-green-100" title="WhatsApp">
            <MessageSquare size={14} />
          </a>
          <button onClick={() => navigate(`/admin/appointments/new`)} className="w-8 h-8 rounded-lg bg-[#0F2747] flex items-center justify-center text-white hover:bg-[#0B1D3A]" title="Book Appointment">
            <CalendarPlus size={14} />
          </button>
          <button onClick={() => setDeleteConfirm(true)} className="w-8 h-8 rounded-lg border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-50">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          {/* Lead Info */}
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Lead Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[10.5px] text-[#9E968C]">Phone</p><p className="text-sm text-[#1A1A1A] font-medium">{lead.phone}</p></div>
              {lead.email && <div><p className="text-[10.5px] text-[#9E968C]">Email</p><p className="text-sm text-[#1A1A1A]">{lead.email}</p></div>}
              <div><p className="text-[10.5px] text-[#9E968C]">Condition</p><p className="text-sm text-[#1A1A1A] font-medium">{lead.condition}</p></div>
              <div><p className="text-[10.5px] text-[#9E968C]">Source</p><p className="text-sm text-[#1A1A1A]">{lead.source}</p></div>
              {lead.assignedTo && <div><p className="text-[10.5px] text-[#9E968C]">Assigned To</p><p className="text-sm text-[#1A1A1A]">{lead.assignedTo}</p></div>}
              {lead.lastContactedAt && <div><p className="text-[10.5px] text-[#9E968C]">Last Contacted</p><p className="text-sm text-[#1A1A1A]">{formatTs(lead.lastContactedAt)}</p></div>}
            </div>
            {lead.message && (
              <div>
                <p className="text-[10.5px] text-[#9E968C] mb-1">Original Message</p>
                <p className="text-sm text-[#2C2926] bg-[#F8F7F4] rounded-xl p-3 leading-relaxed">{lead.message}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Notes ({(lead.notes || []).length})</h2>
            {(lead.notes || []).length > 0 && (
              <div className="space-y-2">
                {[...(lead.notes || [])].reverse().map(note => (
                  <div key={note.id} className="bg-[#F8F7F4] rounded-xl p-3">
                    <p className="text-sm text-[#1A1A1A] leading-relaxed">{note.content}</p>
                    <p className="text-[10.5px] text-[#9E968C] mt-1">{note.author} · {formatTs(note.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="Add a note, follow-up reminder, or observation..."
                className="flex-1 px-3 py-2.5 rounded-xl border border-[#E5E2DC] text-sm placeholder:text-[#C4BDB4] focus:outline-none focus:border-[#0F2747] focus:ring-2 focus:ring-[#0F2747]/10 resize-none transition-all"
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote(); }}
              />
              <button
                onClick={handleAddNote}
                disabled={!note.trim() || addingNote}
                className="px-3 py-2 rounded-xl bg-[#1A1A1A] text-white text-xs font-semibold hover:bg-[#2E2C29] disabled:opacity-40 self-end"
              >
                <Send size={13} />
              </button>
            </div>
            <p className="text-[10.5px] text-[#C4BDB4]">Ctrl+Enter to submit</p>
          </div>

          {/* Linked Appointments */}
          {linkedAppts.length > 0 && (
            <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Appointments ({linkedAppts.length})</h2>
              {linkedAppts.map(appt => (
                <button
                  key={appt.id}
                  onClick={() => navigate(`/admin/appointments/${appt.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#F8F7F4] hover:bg-[#F0ECE4] transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{appt.service}</p>
                    <p className="text-[11px] text-[#9E968C]">{appt.preferredDate} · {appt.preferredTime}</p>
                  </div>
                  <StatusBadge status={appt.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status + Meta */}
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Status</h2>
            <div className="space-y-1.5">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    lead.status === s
                      ? 'bg-[#1A1A1A] text-white'
                      : 'hover:bg-[#F8F7F4] text-[#5A544E]'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Record Info</h2>
            <div className="space-y-2">
              <div><p className="text-[10.5px] text-[#9E968C]">Created</p><p className="text-xs text-[#5A544E]">{formatTs(lead.createdAt)}</p></div>
              <div><p className="text-[10.5px] text-[#9E968C]">Updated</p><p className="text-xs text-[#5A544E]">{formatTs(lead.updatedAt)}</p></div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Delete Lead"
        message="This will permanently delete this lead and all its notes. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}

