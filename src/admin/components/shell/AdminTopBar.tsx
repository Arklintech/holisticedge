import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Settings,
  Plus,
  CalendarPlus,
  UserPlus,
  Star,
  Tag,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminStore } from '../../context/AdminStoreContext';
import { cn } from '../../../lib/utils';

interface AdminTopBarProps {
  onSearchOpen: () => void;
  onMobileMenuOpen: () => void;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminTopBar({ onSearchOpen, onMobileMenuOpen }: AdminTopBarProps) {
  const { user, logout } = useAdminAuth();
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, clearAllNotifications } = useAdminStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickActionsOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Generate breadcrumbs
  const breadcrumbs = React.useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [];
    let path = '';
    for (const seg of segments) {
      path += '/' + seg;
      const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
      crumbs.push({ label, path });
    }
    return crumbs;
  }, [location.pathname]);

  const recentNotifs = notifications.filter(n => n.status === 'unread').slice(0, 8);

  const notifTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <CalendarPlus size={13} className="text-[#0284C7]" />;
      case 'lead': return <UserPlus size={13} className="text-[#059669]" />;
      case 'testimonial': return <Star size={13} className="text-[#D97706]" />;
      default: return <Bell size={13} className="text-slate-500" />;
    }
  };

  const quickActions = [
    { label: 'New Appointment', icon: <CalendarPlus size={14} />, path: '/admin/appointments/new' },
    { label: 'Add Lead', icon: <UserPlus size={14} />, path: '/admin/leads/new' },
    { label: 'Create Offer', icon: <Tag size={14} />, path: '/admin/offers/new' },
  ];

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between gap-3 px-3 sm:px-6 bg-white border-b border-slate-200/80 z-20">
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile Sidebar Hamburger Button */}
        {onMobileMenuOpen && (
          <button
            type="button"
            onClick={onMobileMenuOpen}
            className="md:hidden flex items-center justify-center w-9 h-9 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm flex-shrink-0 transition-colors cursor-pointer"
            title="Open menu"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs sm:text-sm min-w-0 overflow-x-auto no-scrollbar">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              {i > 0 && <span className="text-slate-300 font-medium">/</span>}
              <button
                onClick={() => navigate(crumb.path)}
                className={cn(
                  'truncate transition-colors font-medium',
                  i === breadcrumbs.length - 1
                    ? 'text-slate-900 font-semibold cursor-default'
                    : 'text-slate-400 hover:text-slate-700'
                )}
              >
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Global Search Trigger */}
        <button
          onClick={onSearchOpen}
          className="flex items-center gap-2 px-3 h-9 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium transition-all"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono text-slate-500">⌘K</kbd>
        </button>

        {/* Quick Actions */}
        <div ref={quickRef} className="relative">
          <button
            onClick={() => setQuickActionsOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#0284C7] text-white hover:bg-[#026aa2] transition-colors shadow-sm"
            title="Quick actions"
          >
            <Plus size={16} />
          </button>
          {quickActionsOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-50">
              {quickActions.map(action => (
                <button
                  key={action.path}
                  onClick={() => { navigate(action.path); setQuickActionsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-[#0284C7]">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(v => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/60"
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold bg-[#0284C7] text-white rounded-full flex items-center justify-center leading-none shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <div className="flex items-center gap-2.5">
                  {recentNotifs.length > 0 && (
                    <>
                      <button
                        onClick={() => markAllNotificationsRead()}
                        className="text-[11px] text-[#0284C7] font-bold hover:underline"
                      >
                        Mark read
                      </button>
                      <button
                        onClick={clearAllNotifications}
                        className="text-[11px] text-red-600 font-bold hover:underline"
                      >
                        Clear All
                      </button>
                    </>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {recentNotifs.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-8">No unread notifications</p>
                ) : (
                  recentNotifs.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.link) navigate(n.link);
                        setNotifOpen(false);
                      }}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors',
                        n.status === 'unread' && 'bg-sky-50/40'
                      )}
                    >
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {notifTypeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 leading-tight">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight truncate">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                      </div>
                      {n.status === 'unread' && (
                        <span className="w-2 h-2 rounded-full bg-[#0284C7] flex-shrink-0 mt-2" />
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/50">
                <button
                  onClick={() => { navigate('/admin/notifications'); setNotifOpen(false); }}
                  className="text-xs font-semibold text-[#0284C7] hover:underline w-full text-center"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Account Menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="flex items-center gap-2 h-9 px-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200/60"
          >
            <div className="w-6 h-6 rounded-lg bg-[#0284C7] flex items-center justify-center text-white text-[11px] font-bold">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-slate-800 truncate max-w-[90px]">
              {user?.name || 'Admin'}
            </span>
            <ChevronDown size={12} className="text-slate-400" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-50">
              <div className="px-3.5 py-2.5 border-b border-slate-100 mb-1 bg-slate-50/50 rounded-t-2xl">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] bg-sky-100 text-[#0284C7] px-2 py-0.5 rounded-full font-bold">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={() => { navigate('/admin/settings'); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Settings size={14} className="text-slate-400" />
                Settings
              </button>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}