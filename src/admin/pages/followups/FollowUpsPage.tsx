import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  Clock,
  Send,
  RefreshCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  ExternalLink,
  Check,
  Search,
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

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
  messageStatus?: 'PENDING' | 'SENT' | 'FAILED' | string;
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

// IST-aware today string
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
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      groups.history.push(r);
      continue;
    }
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

const SECTION_CONFIG: Record<Exclude<QueueGroup, 'history'>, {
  label: string;
  icon: React.ReactNode;
  urgency: 'high' | 'medium' | 'low';
  emptyText: string;
}> = {
  overdue: {
    label: 'Overdue Follow-ups',
    icon: <AlertTriangle size={15} className="text-red-600" />,
    urgency: 'high',
    emptyText: 'No overdue follow-ups.',
  },
  today: {
    label: 'Due Today',
    icon: <AlertCircle size={15} className="text-amber-600" />,
    urgency: 'high',
    emptyText: 'No follow-ups due today.',
  },
  tomorrow: {
    label: 'Tomorrow',
    icon: <Clock size={15} className="text-sky-600" />,
    urgency: 'medium',
    emptyText: 'No follow-ups scheduled for tomorrow.',
  },
  upcoming: {
    label: 'Upcoming (Beyond Tomorrow)',
    icon: <CalendarCheck size={15} className="text-slate-500" />,
    urgency: 'low',
    emptyText: 'No upcoming follow-ups scheduled.',
  },
};

export function FollowUpsPage() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
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
    setTimeout(() => setToast(null), 4500);
  }, []);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>('/api/follow-ups', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}` },
      });
      if (res.ok && res.data?.success && Array.isArray(res.data.reminders)) {
        setReminders(res.data.reminders);
      }
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleSendEmail = async (id: string) => {
    setSendingId(id);
    try {
      const res = await apiClient.post<any>(`/api/follow-ups/${id}/send-now`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}` },
      });
      if (res.ok && res.data?.success) {
        showToast(res.data.message || 'Follow-up email sent successfully!', 'success', 'Email Dispatched');
        fetchReminders();
      } else {
        showToast(res.data?.error || res.error || 'Failed to send email. You can retry sending.', 'error', 'Email Dispatch Failed');
        fetchReminders();
      }
    } catch (err: any) {
      showToast(err.message || 'Email dispatch error. Please check SMTP connection.', 'error', 'Email Dispatch Failed');
      fetchReminders();
    } finally {
      setSendingId(null);
    }
  };

  const handleComplete = async (id: string) => {
    setActioningId(id);
    try {
      const res = await apiClient.patch<any>(`/api/follow-ups/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}` },
      });
      if (res.ok && res.data?.success) {
        showToast('Follow-up completed — moved to history.', 'success', 'Follow-up Completed');
        fetchReminders();
      } else {
        showToast('Failed to mark follow-up as completed.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to complete follow-up.', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActioningId(id);
    try {
      const res = await apiClient.patch<any>(`/api/follow-ups/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}` },
      });
      if (res.ok && res.data?.success) {
        showToast('Follow-up cancelled — moved to history.', 'success', 'Follow-up Cancelled');
        fetchReminders();
      } else {
        showToast('Failed to cancel follow-up.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel follow-up.', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const renderTaskBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'OVERDUE') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">OVERDUE</span>;
    }
    if (s === 'DUE') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">DUE TODAY</span>;
    }
    if (s === 'SCHEDULED') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">SCHEDULED</span>;
    }
    if (s === 'COMPLETED') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">COMPLETED</span>;
    }
    if (s === 'CANCELLED') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">CANCELLED</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{status}</span>;
  };

  const renderMessageBadge = (r: Reminder) => {
    const mStatus = (r.messageStatus || '').toUpperCase();
    if (mStatus === 'SENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Email sent: ${formatTs(r.sentAt)}`}>
          <CheckCircle2 size={10} className="text-emerald-600" />
          <span>EMAIL SENT</span>
        </span>
      );
    }
    if (mStatus === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200" title={r.failureReason || 'Email delivery failed'}>
          <AlertCircle size={10} className="text-red-600" />
          <span>EMAIL FAILED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
        <span>EMAIL NOT SENT</span>
      </span>
    );
  };

  const ReminderRow = ({ r, urgency, isHistory }: { r: Reminder; urgency: 'high' | 'medium' | 'low'; isHistory?: boolean; key?: React.Key }) => {
    const isSending = sendingId === r.id;
    const isActioning = actioningId === r.id;
    const isCompleted = r.status === 'COMPLETED';
    const isCancelled = r.status === 'CANCELLED';

    return (
      <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-100 last:border-0 ${
        urgency === 'high' && !isHistory ? 'bg-white hover:bg-amber-50/20' : 'bg-white hover:bg-slate-50/60'
      } transition-colors`}>
        {/* Patient info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isHistory ? 'bg-slate-100' : urgency === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
          }`}>
            <User size={15} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
              <span>{r.patientName}</span>
              {r.registrationTokenNumber && (
                <span className="text-[10.5px] font-bold text-[#0284C7] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 font-mono">
                  {r.registrationTokenNumber}
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-slate-500 truncate mt-0.5">
              {r.patientEmail || 'No email registered'}
              {r.patientPhone && <span> · {r.patientPhone}</span>}
            </div>
          </div>
        </div>

        {/* Date + notes */}
        <div className="flex-1 min-w-0 sm:max-w-[240px]">
          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400" />
            <span>{formatDate(r.scheduledDate)} at {r.scheduledTime || '10:00 AM'}</span>
          </div>
          {r.notes ? (
            <div className="text-[11px] text-slate-500 truncate mt-0.5" title={r.notes}>{r.notes}</div>
          ) : (
            <div className="text-[11px] text-slate-400 italic mt-0.5">Administrative follow-up</div>
          )}
        </div>

        {/* Status badges */}
        <div className="flex flex-col sm:items-end gap-1 flex-shrink-0 min-w-[120px]">
          <div className="flex items-center gap-1.5">
            {renderTaskBadge(r.status)}
            {renderMessageBadge(r)}
          </div>
          {r.failureReason && (
            <div className="text-[10px] text-red-600 max-w-[160px] truncate" title={r.failureReason}>
              Error: {r.failureReason}
            </div>
          )}
          {isHistory && (
            <div className="text-[10px] text-slate-400">
              {isCompleted && r.completedAt ? `Completed ${formatTs(r.completedAt)}` : ''}
              {isCancelled && r.cancelledAt ? `Cancelled ${formatTs(r.cancelledAt)}` : ''}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0 pt-2 sm:pt-0">
          {!isHistory && (
            <>
              {/* Send Email Action */}
              <button
                onClick={() => handleSendEmail(r.id)}
                disabled={isSending || isActioning}
                title={r.messageStatus === 'SENT' ? 'Resend follow-up email' : 'Send follow-up email via Gmail/SMTP'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 ${
                  r.messageStatus === 'FAILED'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : r.messageStatus === 'SENT'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    : 'bg-[#0F2747] hover:bg-[#0B1D3A] text-white'
                }`}
              >
                {isSending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                <span>{r.messageStatus === 'FAILED' ? 'Retry Email' : r.messageStatus === 'SENT' ? 'Resend Email' : 'Send Email'}</span>
              </button>

              {/* Complete Follow-up Action */}
              <button
                onClick={() => handleComplete(r.id)}
                disabled={isSending || isActioning}
                title="Mark follow-up as completed (moves out of active queue to history)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
              >
                {isActioning ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                <span>Complete</span>
              </button>

              {/* Cancel Follow-up Action */}
              <button
                onClick={() => handleCancel(r.id)}
                disabled={isSending || isActioning}
                title="Cancel follow-up"
                className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <XCircle size={15} />
              </button>
            </>
          )}

          {/* Open Patient Profile */}
          {r.patientId && (
            <button
              onClick={() => navigate(`/admin/patients?id=${r.patientId}`)}
              title="Open Patient Profile"
              className="p-1.5 rounded-xl text-slate-400 hover:text-[#0F2747] hover:bg-slate-100 transition-colors"
            >
              <ExternalLink size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const SectionBlock = ({
    group,
    reminders: sectionReminders,
  }: {
    group: Exclude<QueueGroup, 'history'>;
    reminders: Reminder[];
    key?: React.Key;
  }) => {
    const cfg = SECTION_CONFIG[group];
    if (sectionReminders.length === 0) return null;

    const headerBg = group === 'overdue'
      ? 'bg-red-50 border-red-200'
      : group === 'today'
      ? 'bg-amber-50 border-amber-200'
      : group === 'tomorrow'
      ? 'bg-sky-50 border-sky-200'
      : 'bg-slate-50 border-slate-200';

    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className={`flex items-center justify-between px-4 py-3 border-b ${headerBg}`}>
          <div className="flex items-center gap-2">
            {cfg.icon}
            <span className="text-xs font-bold text-slate-800">{cfg.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              group === 'overdue' ? 'bg-red-600 text-white'
              : group === 'today' ? 'bg-amber-600 text-white'
              : group === 'tomorrow' ? 'bg-sky-600 text-white'
              : 'bg-slate-500 text-white'
            }`}>
              {sectionReminders.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {group === 'overdue' ? 'Action required immediately' : group === 'today' ? 'Scheduled for today' : ''}
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {sectionReminders.map(r => (
            <ReminderRow key={r.id} r={r} urgency={cfg.urgency} />
          ))}
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
          <p className="text-xs text-slate-500 mt-1">
            Actionable patient follow-up tasks · Gmail/SMTP patient messaging · {activeCount} active in queue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReminders}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search follow-ups by patient name, token, email..."
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F2747] focus:ring-2 focus:ring-[#0F2747]/10 transition-all shadow-sm"
        />
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`flex items-center justify-between p-4 rounded-2xl text-xs font-medium border shadow-sm ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            )}
            <div>
              {toast.title && <p className="font-bold">{toast.title}</p>}
              <p className={toast.title ? 'text-[11px] opacity-90' : ''}>{toast.text}</p>
            </div>
          </div>
          <button onClick={() => setToast(null)} className="font-bold opacity-60 hover:opacity-100 text-sm ml-4">✕</button>
        </div>
      )}

      {/* Queue Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-200 rounded-3xl">
          <Loader2 size={26} className="animate-spin mb-3 text-[#0F2747]" />
          <p className="text-xs font-medium">Loading follow-up queue...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Action Queue: 1. OVERDUE -> 2. DUE TODAY -> 3. TOMORROW -> 4. UPCOMING */}
          {(['overdue', 'today', 'tomorrow', 'upcoming'] as const).map(group => (
            <SectionBlock key={group} group={group} reminders={groups[group]} />
          ))}

          {/* All Clear State for Active Queue */}
          {activeCount === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-200/90 rounded-3xl shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-bold text-slate-800">All caught up!</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                No active follow-ups require immediate action. New follow-ups can be scheduled from patient profiles.
              </p>
            </div>
          )}

          {/* 5. HISTORY SECTION (Completed & Cancelled) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setHistoryExpanded(e => !e)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Follow-up History (Completed & Cancelled)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {groups.history.length}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <span>{historyExpanded ? 'Collapse' : 'View History'}</span>
                {historyExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>
            {historyExpanded && (
              <div className="divide-y divide-slate-100">
                {groups.history.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No completed or cancelled follow-ups yet.
                  </div>
                ) : (
                  groups.history.map(r => (
                    <ReminderRow key={r.id} r={r} urgency="low" isHistory={true} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FollowUpsPage;
