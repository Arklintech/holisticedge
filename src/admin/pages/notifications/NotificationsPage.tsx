import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Archive, ExternalLink, CalendarDays, Activity, Star, AlertCircle, Clock, Mail } from 'lucide-react';
import { useAdminStore } from '../../context/AdminStoreContext';
import { notificationStorage } from '../../services/adminStorage';
import type { NotificationType } from '../../types/admin.types';
import { cn } from '../../../lib/utils';

const TYPE_META: Record<NotificationType, { icon: React.ReactNode; label: string }> = {
  appointment: { icon: <CalendarDays size={14} className="text-[#1B4332]" />, label: 'Appointment' },
  lead: { icon: <Activity size={14} className="text-[#1A365D]" />, label: 'Lead' },
  testimonial: { icon: <Star size={14} className="text-amber-600" />, label: 'Testimonial' },
  system: { icon: <AlertCircle size={14} className="text-[#9E968C]" />, label: 'System' },
  content: { icon: <Bell size={14} className="text-[#0F2747]" />, label: 'Content' },
  reminder: { icon: <Clock size={14} className="text-emerald-600" />, label: 'Reminder' },
  email: { icon: <Mail size={14} className="text-sky-600" />, label: 'Email' },
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
    archiveNotification,
    refreshNotifications,
  } = useAdminStore();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filtered = notifications
    .filter(n => n.status !== 'archived')
    .filter(n => filter === 'all' ? true : n.status === filter);

  const handleArchive = async (id: string) => {
    await archiveNotification(id);
    refreshNotifications();
  };

  return (
    <div className="p-3 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#1A1A1A]">Notifications</h1>
          <p className="text-sm text-[#9E968C]">{notifications.filter(n => n.status === 'unread').length} unread</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={markAllNotificationsRead} className="text-xs text-[#0F2747] font-semibold hover:underline">
            Mark all read
          </button>
          <button
            onClick={clearAllNotifications}
            className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors"
          >
            Clear All Notifications
          </button>
        </div>
      </div>

      <div className="flex gap-1.5">
        {(['all', 'unread', 'read'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors', filter === f ? 'bg-[#1A1A1A] text-white' : 'bg-white border border-[#E5E2DC] text-[#5A544E] hover:bg-[#F8F7F4]')}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#E5E2DC] rounded-2xl overflow-hidden divide-y divide-[#F0ECE4]">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={24} className="text-[#C4BDB4] mx-auto mb-3" />
            <p className="text-sm text-[#9E968C]">No notifications</p>
          </div>
        ) : (
          filtered.map(n => (
            <div key={n.id} onClick={() => { markNotificationRead(n.id); if (n.link) navigate(n.link); }}
              className={cn('flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-[#F8F7F4] transition-colors group', n.status === 'unread' && 'bg-[#FBF8F6]')}>
              <div className="w-8 h-8 rounded-full bg-[#F4F1EA] flex items-center justify-center flex-shrink-0">
                {TYPE_META[n.type]?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{n.title}</p>
                    <p className="text-xs text-[#5A544E] mt-0.5">{n.message}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <p className="text-[10.5px] text-[#9E968C]">{formatRelative(n.createdAt)}</p>
                    {n.status === 'unread' && <span className="w-2 h-2 rounded-full bg-[#0F2747]" />}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {n.status === 'unread' && <button onClick={e => { e.stopPropagation(); markNotificationRead(n.id); }} className="text-[11px] text-[#0F2747] hover:underline flex items-center gap-1"><Check size={10} />Mark read</button>}
                  <button onClick={e => { e.stopPropagation(); handleArchive(n.id); }} className="text-[11px] text-[#9E968C] hover:underline flex items-center gap-1"><Archive size={10} />Archive</button>
                  {n.link && <button onClick={e => { e.stopPropagation(); navigate(n.link!); }} className="text-[11px] text-[#1A365D] hover:underline flex items-center gap-1"><ExternalLink size={10} />View</button>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

