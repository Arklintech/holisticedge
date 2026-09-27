import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck, Clock, Mail, RefreshCw, XCircle, CheckCircle2,
  AlertTriangle, AlertCircle, Loader2, ChevronDown, ChevronUp,
  User, ExternalLink, Check, Search,
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

// Official WhatsApp brand SVG icon
const WhatsAppIcon = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="WhatsApp"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.555 4.122 1.528 5.852L0 24l6.335-1.502A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.884 9.884 0 01-5.032-1.378l-.36-.214-3.742.887.944-3.629-.235-.374A9.861 9.861 0 012.106 12C2.106 6.537 6.537 2.106 12 2.106c5.463 0 9.894 4.431 9.894 9.894 0 5.463-4.431 9.894-9.894 9.894z"/>
  </svg>
);

interface Reminder {
  id: string;
  patientId: string;
  registrationTokenNumber?: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  appointmentId?: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
  status: 'SCHEDULED' | 'DUE' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED' | string;
  messageStatus?: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | string;
  messageChannel?: 'whatsapp' | 'email' | string;
  providerMessageId?: string;
  sentAt?: string;
  failedAt?: string;
  failureReason?: string;
  completedAt?: string;
  completedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt?: string;
  createdBy?: string;
}

function getISTDate(offsetDays = 0): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  if (offsetDays) ist.setUTCDate(ist.getUTCDate() + offsetDays);
  return ist.toISOString().split('T')[0];
}

type QueueGroup = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'history';
type GroupedReminders = Record<QueueGroup, Reminder[]>;

function groupReminders(reminders: Reminder[], today: string, tomorrow: string): GroupedReminders {
  const groups: GroupedReminders = { overdue: [], today: [], tomorrow: [], upcoming: [], history: [] };
  for (const r of reminders) {
    const status = (r.status || '').toUpperCase();
    if (status === 'COMPLETED' || status === 'CANCELLED') { groups.history.push(r); continue; }
    if (r.scheduledDate < today) groups.overdue.push(r);
    else if (r.scheduledDate === today) groups.today.push(r);
    else if (r.scheduledDate === tomorrow) groups.tomorrow.push(r);
    else groups.upcoming.push(r);
  }
  const byTime = (a: Reminder, b: Reminder) => (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
  (Object.keys(groups) as QueueGroup[]).forEach(k => groups[k].sort(byTime));
  return groups;
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTs(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const SECTION_CONFIG: Record<Exclude<QueueGroup, 'history'>, { label: string; icon: React.ReactNode; urgency: 'high' | 'medium' | 'low'; emptyText: string }> = {
  overdue: { label: 'Overdue Follow-ups', icon: <AlertTriangle size={15} className="text-red-600" />, urgency: 'high', emptyText: 'No overdue follow-ups.' },
  today: { label: 'Due Today', icon: <AlertCircle size={15} className="text-amber-600" />, urgency: 'high', emptyText: 'No follow-ups due today.' },
  tomorrow: { label: 'Tomorrow', icon: <Clock size={15} className="text-sky-600" />, urgency: 'medium', emptyText: 'No follow-ups scheduled for tomorrow.' },
  upcoming: { label: 'Upcoming (Beyond Tomorrow)', icon: <CalendarCheck size={15} className="text-slate-500" />, urgency: 'low', emptyText: 'No upcoming follow-ups scheduled.' },
};

export function FollowUpsPage() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [waSendState, setWaSendState] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'failed'>>({});
  const [emailSendState, setEmailSendState] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'failed'>>({});
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ text: string; title?: string; type: 'success' | 'error' } | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const today = useMemo(() => getISTDate(0), []);
  const tomorrow = useMemo(() => getISTDate(1), []);

  const filteredReminders = useMemo(() => {
    if (!search.trim()) return reminders;
    const q = search.toLowerCase();
    return reminders.filter(r =>
      (r.patientName || '').toLowerCase().includes(q) ||
      (r.registrationTokenNumber || '').toLowerCase().includes(q) ||
      (r.patientEmail || '').toLowerCase().includes(q) ||
      (r.notes || '').toLowerCase().includes(q)
    );
  }, [reminders, search]);

  const groups = useMemo(() => groupReminders(filteredReminders, today, tomorrow), [filteredReminders, today, tomorrow]);
  const activeCount = groups.overdue.length + groups.today.length + groups.tomorrow.length + groups.upcoming.length;

  const showToast = useCallback((text: string, type: 'success' | 'error', title?: string) => {
    setToast({ text, title, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>('/api/follow-ups', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}` },
      });
      if (res.ok && res.data?.success && Array.isArray(res.data.reminders)) setReminders(res.data.reminders);
    } catch (err) { console.error('Failed to fetch reminders:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  // PRIMARY: WhatsApp via WATI
  const handleSendWhatsApp = async (id: string) => {
    if (waSendState[id] === 'sending') return;
    setWaSendState(prev => ({ ...prev, [id]: 'sending' }));
    try {
      const res = await apiClient.post<any>(`/api/follow-ups/${id}/send-whatsapp`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}` },
      });
      if (res.ok && res.data?.success) {
        setWaSendState(prev => ({ ...prev, [id]: 'sent' }));
        showToast(res.data.message || 'WhatsApp reminder dispatched!', 'success', 'WhatsApp Sent');
        fetchReminders();
        setTimeout(() => setWaSendState(prev => ({ ...prev, [id]: 'idle' })), 4000);
      } else {
        setWaSendState(prev => ({ ...prev, [id]: 'failed' }));
        showToast(res.data?.error || 'WATI dispatch failed.', 'error', 'WhatsApp Failed');
        fetchReminders();
      }
    } catch (err: any) {
      setWaSendState(prev => ({ ...prev, [id]: 'failed' }));
      showToast(err.message || 'WhatsApp error.', 'error', 'WhatsApp Error');
      fetchReminders();
    }
  };

  // SECONDARY: Email via SMTP
  const handleSendEmail = async (id: string) => {
    if (emailSendState[id] === 'sending') return;
    setEmailSendState(prev => ({ ...prev, [id]: 'sending' }));
    try {
      const res = await apiClient.post<any>(`/api/follow-ups/${id}/send-now`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}` },
      });
      if (res.ok && res.data?.success) {
        setEmailSendState(prev => ({ ...prev, [id]: 'sent' }));
        showToast(res.data.message || 'Email sent!', 'success', 'Email Dispatched');
        fetchReminders();
        setTimeout(() => setEmailSendState(prev => ({ ...prev, [id]: 'idle' })), 4000);
      } else {
        setEmailSendState(prev => ({ ...prev, [id]: 'failed' }));
        showToast(res.data?.error || 'Email failed.', 'error', 'Email Failed');
        fetchReminders();
      }
    } catch (err: any) {
      setEmailSendState(prev => ({ ...prev, [id]: 'failed' }));
      showToast(err.message || 'Email error.', 'error', 'Email Error');
      fetchReminders();
    }
  };

  const handleComplete = async (id: string) => {
    setActioningId(id);
    try {
      const res = await apiClient.patch<any>(`/api/follow-ups/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}` },
      });
      if (res.ok && res.data?.success) { showToast('Follow-up completed.', 'success', 'Completed'); fetchReminders(); }
      else showToast('Failed to complete.', 'error');
    } catch (err: any) { showToast(err.message || 'Failed.', 'error'); }
    finally { setActioningId(null); }
  };

  const handleCancel = async (id: string) => {
    setActioningId(id);
    try {
      const res = await apiClient.patch<any>(`/api/follow-ups/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}` },
      });
      if (res.ok && res.data?.success) { showToast('Follow-up cancelled.', 'success', 'Cancelled'); fetchReminders(); }
      else showToast('Failed to cancel.', 'error');
    } catch (err: any) { showToast(err.message || 'Failed.', 'error'); }
    finally { setActioningId(null); }
  };

  const renderTaskBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'OVERDUE') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">OVERDUE</span>;
    if (s === 'DUE') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">DUE TODAY</span>;
    if (s === 'SCHEDULED') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">SCHEDULED</span>;
    if (s === 'COMPLETED') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">COMPLETED</span>;
    if (s === 'CANCELLED') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">CANCELLED</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{status}</span>;
  };

  const renderMessageBadge = (r: Reminder) => {
    const ms = (r.messageStatus || '').toUpperCase();
    const isWA = !r.messageChannel || r.messageChannel === 'whatsapp';
    if (ms === 'READ') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" title="WhatsApp read">
        <WhatsAppIcon size={10} className="text-emerald-600" /><span>WA READ</span>
      </span>
    );
    if (ms === 'DELIVERED') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200" title="WhatsApp delivered">
        <WhatsAppIcon size={10} className="text-teal-600" /><span>WA DELIVERED</span>
      </span>
    );
    if (ms === 'SENT') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" title={isWA ? 'WhatsApp sent' : 'Email sent'}>
        {isWA ? <WhatsAppIcon size={10} className="text-emerald-600" /> : <CheckCircle2 size={10} className="text-emerald-600" />}
        <span>{isWA ? 'WA SENT' : 'EMAIL SENT'}</span>
      </span>
    );
    if (ms === 'FAILED') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200" title={r.failureReason || 'Failed'}>
        <AlertCircle size={10} className="text-red-600" /><span>FAILED</span>
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
        <WhatsAppIcon size={10} /><span>NOT SENT</span>
      </span>
    );
  };

  // WhatsApp primary button component
  const WhatsAppBtn = ({ r, isActioning }: { r: Reminder; isActioning: boolean }) => {
    const state = waSendState[r.id] || 'idle';
    const ms = (r.messageStatus || '').toUpperCase();
    if (state === 'sending') return (
      <button disabled className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#25D366]/70 text-white opacity-80 shadow-sm cursor-not-allowed">
        <Loader2 size={12} className="animate-spin" /><span>Sending…</span>
      </button>
    );
    if (state === 'sent') return (
      <button onClick={() => handleSendWhatsApp(r.id)} disabled={isActioning} title="Resend WhatsApp"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm transition-all">
        <CheckCircle2 size={12} className="text-emerald-600" /><span>WA Sent</span>
      </button>
    );
    if (state === 'failed' || ms === 'FAILED') return (
      <button onClick={() => handleSendWhatsApp(r.id)} disabled={isActioning} title="Retry WhatsApp"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all disabled:opacity-50">
        <WhatsAppIcon size={12} /><span>Retry WA</span>
      </button>
    );
    if (ms === 'SENT' || ms === 'DELIVERED' || ms === 'READ') return (
      <button onClick={() => handleSendWhatsApp(r.id)} disabled={isActioning} title="Resend WhatsApp"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border border-[#25D366]/30 shadow-sm transition-all disabled:opacity-50">
        <WhatsAppIcon size={12} /><span>Resend WA</span>
      </button>
    );
    return (
      <button onClick={() => handleSendWhatsApp(r.id)} disabled={isActioning} title={`Send WhatsApp to ${r.patientPhone || 'patient'} via WATI`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#25D366] hover:bg-[#22c55e] text-white shadow-sm transition-all disabled:opacity-50">
        <WhatsAppIcon size={12} /><span>Send WhatsApp</span>
      </button>
    );
  };

  // Email secondary button
  const EmailBtn = ({ r, isActioning }: { r: Reminder; isActioning: boolean }) => {
    const state = emailSendState[r.id] || 'idle';
    return (
      <button onClick={() => handleSendEmail(r.id)} disabled={state === 'sending' || isActioning}
        title="Send follow-up via email (secondary/fallback)"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium bg-transparent text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-50">
        {state === 'sending' ? <Loader2 size={11} className="animate-spin" /> : state === 'sent' ? <CheckCircle2 size={11} className="text-emerald-600" /> : <Mail size={11} />}
        <span className="hidden sm:inline">{state === 'sending' ? '…' : state === 'sent' ? 'Sent' : 'Email'}</span>
      </button>
    );
  };

  // Row component
  const ReminderRow = ({ r, urgency, isHistory }: { r: Reminder; urgency: 'high' | 'medium' | 'low'; isHistory?: boolean; key?: React.Key }) => {
    const isActioning = actioningId === r.id;
    return (
      <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-100 last:border-0 ${urgency === 'high' && !isHistory ? 'bg-white hover:bg-amber-50/20' : 'bg-white hover:bg-slate-50/60'} transition-colors`}>
        {/* Patient info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isHistory ? 'bg-slate-100 text-slate-400' : urgency === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
            <User size={15} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
              <span>{r.patientName}</span>
              {r.registrationTokenNumber && (
                <span className="text-[10.5px] font-bold text-[#0284C7] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 font-mono">{r.registrationTokenNumber}</span>
              )}
            </div>
            <div className="text-[11.5px] text-slate-500 mt-0.5">
              {r.patientPhone
                ? <span className="flex items-center gap-1"><WhatsAppIcon size={10} className="text-[#25D366]" />{r.patientPhone}</span>
                : <span className="text-slate-400 italic">No phone registered</span>}
              {r.patientEmail && <span className="block truncate">{r.patientEmail}</span>}
            </div>
          </div>
        </div>
        {/* Date + notes */}
        <div className="flex-1 min-w-0 sm:max-w-[230px]">
          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400" />
            <span>{formatDate(r.scheduledDate)} at {r.scheduledTime || '10:00 AM'}</span>
          </div>
          {r.notes
            ? <div className="text-[11px] text-slate-500 truncate mt-0.5" title={r.notes}>{r.notes}</div>
            : <div className="text-[11px] text-slate-400 italic mt-0.5">Administrative follow-up</div>}
        </div>
        {/* Status badges */}
        <div className="flex flex-col sm:items-end gap-1 flex-shrink-0 min-w-[130px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            {renderTaskBadge(r.status)}
            {renderMessageBadge(r)}
          </div>
          {r.failureReason && <div className="text-[10px] text-red-600 max-w-[160px] truncate" title={r.failureReason}>Error: {r.failureReason}</div>}
          {isHistory && (
            <div className="text-[10px] text-slate-400">
              {r.status === 'COMPLETED' && r.completedAt ? `Completed ${formatTs(r.completedAt)}` : ''}
              {r.status === 'CANCELLED' && r.cancelledAt ? `Cancelled ${formatTs(r.cancelledAt)}` : ''}
            </div>
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0 pt-2 sm:pt-0">
          {!isHistory && (
            <>
              <WhatsAppBtn r={r} isActioning={isActioning} />
              <EmailBtn r={r} isActioning={isActioning} />
              <button id={`btn-complete-${r.id}`} onClick={() => handleComplete(r.id)} disabled={isActioning}
                title="Mark as completed — moves to history. Does NOT auto-send WhatsApp."
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50">
                {isActioning ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                <span>Complete</span>
              </button>
              <button id={`btn-cancel-${r.id}`} onClick={() => handleCancel(r.id)} disabled={isActioning}
                title="Cancel follow-up"
                className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                <XCircle size={15} />
              </button>
            </>
          )}
          {r.patientId && (
            <button id={`btn-profile-${r.id}`} onClick={() => navigate(`/admin/patients?id=${r.patientId}`)} title="Open Patient Profile"
              className="p-1.5 rounded-xl text-slate-400 hover:text-[#0F2747] hover:bg-slate-100 transition-colors">
              <ExternalLink size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const SectionBlock = ({ group, reminders: sr }: { group: Exclude<QueueGroup, 'history'>; reminders: Reminder[]; key?: React.Key }) => {
    const cfg = SECTION_CONFIG[group];
    if (sr.length === 0) return null;
    const hdrBg = group === 'overdue' ? 'bg-red-50 border-red-200' : group === 'today' ? 'bg-amber-50 border-amber-200' : group === 'tomorrow' ? 'bg-sky-50 border-sky-200' : 'bg-slate-50 border-slate-200';
    const cntBg = group === 'overdue' ? 'bg-red-600' : group === 'today' ? 'bg-amber-600' : group === 'tomorrow' ? 'bg-sky-600' : 'bg-slate-500';
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className={`flex items-center justify-between px-4 py-3 border-b ${hdrBg}`}>
          <div className="flex items-center gap-2">
            {cfg.icon}
            <span className="text-xs font-bold text-slate-800">{cfg.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${cntBg}`}>{sr.length}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">{group === 'overdue' ? 'Action required immediately' : group === 'today' ? 'Scheduled for today' : ''}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {sr.map(r => <ReminderRow key={r.id} r={r} urgency={cfg.urgency} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <CalendarCheck size={22} className="text-[#0F2747]" />
            Follow-up Work Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <WhatsAppIcon size={12} className="text-[#25D366]" />
            <span>WhatsApp-first patient messaging via WATI</span>
            <span className="text-slate-300">·</span>
            <span>{activeCount} active in queue</span>
          </p>
        </div>
        <button onClick={fetchReminders} disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* Channel legend */}
      <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium px-1">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#25D366] inline-block"></span>Primary: WhatsApp (WATI)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>Secondary: Email (SMTP)</span>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by patient name, token, email, notes…"
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F2747] focus:ring-2 focus:ring-[#0F2747]/10 transition-all shadow-sm" />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center justify-between p-4 rounded-2xl text-xs font-medium border shadow-sm ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" /> : <AlertCircle size={16} className="text-red-600 flex-shrink-0" />}
            <div>
              {toast.title && <p className="font-bold">{toast.title}</p>}
              <p className={toast.title ? 'text-[11px] opacity-90' : ''}>{toast.text}</p>
            </div>
          </div>
          <button onClick={() => setToast(null)} className="font-bold opacity-60 hover:opacity-100 text-sm ml-4">✕</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-200 rounded-3xl">
          <Loader2 size={26} className="animate-spin mb-3 text-[#0F2747]" />
          <p className="text-xs font-medium">Loading follow-up queue…</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(['overdue', 'today', 'tomorrow', 'upcoming'] as const).map(group => (
            <SectionBlock key={group} group={group} reminders={groups[group]} />
          ))}

          {activeCount === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-200/90 rounded-3xl shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><CheckCircle2 size={24} /></div>
              <p className="text-sm font-bold text-slate-800">All caught up!</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">No active follow-ups. Schedule new ones from patient profiles.</p>
            </div>
          )}

          {/* History */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            <button onClick={() => setHistoryExpanded(e => !e)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition-colors">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Follow-up History (Completed &amp; Cancelled)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{groups.history.length}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <span>{historyExpanded ? 'Collapse' : 'View History'}</span>
                {historyExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>
            {historyExpanded && (
              <div className="divide-y divide-slate-100">
                {groups.history.length === 0
                  ? <div className="p-8 text-center text-xs text-slate-400">No completed or cancelled follow-ups yet.</div>
                  : groups.history.map(r => <ReminderRow key={r.id} r={r} urgency="low" isHistory={true} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FollowUpsPage;
