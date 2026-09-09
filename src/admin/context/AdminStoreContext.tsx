import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  AdminAppointment,
  AdminLead,
  AdminOffer,
  AdminNotification,
  AuditEntry,
  DashboardMetrics,
  ToastMessage,
  ToastType,
  AdminPatient,
} from '../types/admin.types';
import {
  patientStorage,
  appointmentStorage,
  leadStorage,
  testimonialStorage,
  notificationStorage,
  offerStorage,
  auditStorage,
  computeDashboardMetrics,
  OFFERS_UPDATED_EVENT,
} from '../services/adminStorage';
import { useAdminAuth } from './AdminAuthContext';

interface AdminStoreContextValue {
  // Patients
  patients: AdminPatient[];
  refreshPatients: () => void;
  // Appointments
  appointments: AdminAppointment[];
  refreshAppointments: () => void;
  // Leads
  leads: AdminLead[];
  refreshLeads: () => void;
  // Offers
  offers: AdminOffer[];
  refreshOffers: () => void;
  publishOffer: (id: string) => { success: boolean; error?: string; offer?: AdminOffer };
  unpublishOffer: (id: string) => void;
  archiveOffer: (id: string) => void;
  duplicateOffer: (id: string) => AdminOffer | null;
  deleteOffer: (id: string) => boolean;
  // Notifications
  notifications: AdminNotification[];
  unreadCount: number;
  unreadNotificationsCount: number;
  activeLeadsCount: number;
  dueFollowUpsCount: number;
  refreshNotifications: () => void;
  markNotificationRead: (id: string) => Promise<void> | void;
  markAllNotificationsRead: () => Promise<void> | void;
  clearAllNotifications: () => Promise<void> | void;
  archiveNotification: (id: string) => Promise<void> | void;
  deleteNotification: (id: string) => Promise<void> | void;
  // Audit
  auditEntries: AuditEntry[];
  logAudit: (action: string, entity: string, entityId: string, description: string, metadata?: Record<string, unknown>) => void;
  // Dashboard
  metrics: DashboardMetrics;
  refreshMetrics: () => void;
  // Toast
  toasts: ToastMessage[];
  showToast: (type: ToastType, title: string, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const AdminStoreContext = createContext<AdminStoreContextValue | null>(null);

export function AdminStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAdminAuth();

  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todayAppointments: 0,
    upcomingAppointments: 0,
    newLeads: 0,
    pendingFollowUps: 0,
    unreadNotifications: 0,
    cancelledToday: 0,
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const refreshPatients = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/patients', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.patients)) {
          setPatients(data.patients);
          return;
        }
      }
    } catch {}
    setPatients(patientStorage.getAll());
  }, []);

  const refreshAppointments = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/appointments', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.appointments)) {
          const normalized = data.appointments.map((a: any) => ({
            ...a,
            fullName: a.fullName || a.patientName || 'Patient',
            patientName: a.patientName || a.fullName || 'Patient',
            phone: a.phone || a.patientPhone || '',
            email: a.email || a.patientEmail || '',
            preferredDate: a.preferredDate || a.date || '',
            preferredTime: a.preferredTime || a.time || '',
            date: a.date || a.preferredDate || '',
            time: a.time || a.preferredTime || '',
            service: a.service || 'Chiropractic Care',
            status: a.status ? (a.status.charAt(0).toUpperCase() + a.status.slice(1).toLowerCase()) : 'Confirmed',
          }));
          setAppointments(normalized);
          return;
        }
      }
    } catch {}
    setAppointments(appointmentStorage.getAll());
  }, []);

  const refreshLeads = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/leads', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.leads)) {
          setLeads(data.leads);
          return;
        }
      }
    } catch {}
    setLeads(leadStorage.getAll());
  }, []);

  const refreshOffers = useCallback(() => {
    setOffers(offerStorage.getAll());
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          return;
        }
      }
    } catch {}
    setNotifications(notificationStorage.getAll());
  }, []);

  const refreshMetrics = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/dashboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.metrics) {
          setMetrics(data.metrics);
          return;
        }
      }
    } catch {}
    setMetrics(computeDashboardMetrics());
  }, []);

  // Load all data on mount / auth change
  useEffect(() => {
    if (user) {
      refreshPatients();
      refreshAppointments();
      refreshLeads();
      refreshOffers();
      refreshNotifications();
      setAuditEntries(auditStorage.getAll());
      refreshMetrics();
    }
  }, [user, refreshPatients, refreshAppointments, refreshLeads, refreshOffers, refreshNotifications, refreshMetrics]);

  // Listen for offer updates and real-time website submissions across windows/components
  useEffect(() => {
    const handleDataChange = () => {
      refreshPatients();
      refreshAppointments();
      refreshLeads();
      refreshOffers();
      refreshNotifications();
      setAuditEntries(auditStorage.getAll());
      refreshMetrics();
    };
    window.addEventListener(OFFERS_UPDATED_EVENT, handleDataChange);
    window.addEventListener('storage', handleDataChange);
    window.addEventListener('admin_data_updated', handleDataChange);
    return () => {
      window.removeEventListener(OFFERS_UPDATED_EVENT, handleDataChange);
      window.removeEventListener('storage', handleDataChange);
      window.removeEventListener('admin_data_updated', handleDataChange);
    };
  }, [refreshPatients, refreshAppointments, refreshLeads, refreshOffers, refreshNotifications, refreshMetrics]);

  const publishOffer = useCallback((id: string) => {
    const res = offerStorage.publish(id, user || undefined);
    if (res.success && res.offer) {
      refreshOffers();
      const actionLabel = res.offer.status === 'SCHEDULED' ? 'scheduled' : 'published';
      auditStorage.log({
        actor: user?.name || 'Admin',
        actorId: user?.id || 'admin',
        action: actionLabel,
        entity: 'offer',
        entityId: id,
        description: `${res.offer.status === 'SCHEDULED' ? 'Scheduled' : 'Published'} offer: ${res.offer.title}`,
      });
      setAuditEntries(auditStorage.getAll());
    }
    return res;
  }, [user, refreshOffers]);

  const unpublishOffer = useCallback((id: string) => {
    const updated = offerStorage.unpublish(id);
    if (updated) {
      refreshOffers();
      auditStorage.log({
        actor: user?.name || 'Admin',
        actorId: user?.id || 'admin',
        action: 'unpublished',
        entity: 'offer',
        entityId: id,
        description: `Unpublished offer: ${updated.title}`,
      });
      setAuditEntries(auditStorage.getAll());
    }
  }, [user, refreshOffers]);

  const archiveOffer = useCallback((id: string) => {
    const updated = offerStorage.archive(id);
    if (updated) {
      refreshOffers();
      auditStorage.log({
        actor: user?.name || 'Admin',
        actorId: user?.id || 'admin',
        action: 'archived',
        entity: 'offer',
        entityId: id,
        description: `Archived offer: ${updated.title}`,
      });
      setAuditEntries(auditStorage.getAll());
    }
  }, [user, refreshOffers]);

  const duplicateOffer = useCallback((id: string) => {
    const created = offerStorage.duplicate(id);
    if (created) {
      refreshOffers();
      auditStorage.log({
        actor: user?.name || 'Admin',
        actorId: user?.id || 'admin',
        action: 'created',
        entity: 'offer',
        entityId: created.id,
        description: `Duplicated offer: ${created.title}`,
      });
      setAuditEntries(auditStorage.getAll());
    }
    return created;
  }, [user, refreshOffers]);

  const deleteOffer = useCallback((id: string) => {
    const existing = offerStorage.getById(id);
    const res = offerStorage.delete(id);
    if (res) {
      refreshOffers();
      auditStorage.log({
        actor: user?.name || 'Admin',
        actorId: user?.id || 'admin',
        action: 'deleted',
        entity: 'offer',
        entityId: id,
        description: `Deleted offer: ${existing?.title || id}`,
      });
      setAuditEntries(auditStorage.getAll());
    }
    return res;
  }, [user, refreshOffers]);

  const markNotificationRead = useCallback(async (id: string) => {
    notificationStorage.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n));
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {
      console.warn('Backend mark read error:', e);
    }
    refreshMetrics();
  }, [refreshMetrics]);

  const markAllNotificationsRead = useCallback(async () => {
    notificationStorage.markAllRead();
    setNotifications(prev => prev.map(n => n.status === 'unread' ? { ...n, status: 'read' as const } : n));
    try {
      const token = localStorage.getItem('admin_token');
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {
      console.warn('Backend mark all read error:', e);
    }
    refreshMetrics();
  }, [refreshMetrics]);

  const clearAllNotifications = useCallback(async () => {
    notificationStorage.clearAll();
    setNotifications([]);
    try {
      const token = localStorage.getItem('admin_token');
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {
      console.warn('Backend clear all notifications error:', e);
    }
    refreshMetrics();
  }, [refreshMetrics]);

  const archiveNotification = useCallback(async (id: string) => {
    notificationStorage.archive(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/notifications/${id}/archive`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {
      console.warn('Backend archive notification error:', e);
    }
    refreshMetrics();
  }, [refreshMetrics]);

  const deleteNotification = useCallback(async (id: string) => {
    notificationStorage.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {
      console.warn('Backend delete notification error:', e);
    }
    refreshMetrics();
  }, [refreshMetrics]);

  const logAudit = useCallback((
    action: string,
    entity: string,
    entityId: string,
    description: string,
    metadata?: Record<string, unknown>
  ) => {
    const entry = auditStorage.log({
      actor: user?.name || 'Unknown',
      actorId: user?.id || 'unknown',
      action,
      entity,
      entityId,
      description,
      metadata: metadata || {},
    });
    setAuditEntries(prev => [entry, ...prev]);
  }, [user]);

  const showToast = useCallback((type: ToastType, title: string, message: string, duration = 4000) => {
    const id = `toast_${Date.now()}`;
    const toast: ToastMessage = { id, type, title, message, duration };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration + 300);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => n.status === 'unread').length;
  const unreadNotificationsCount = unreadCount;
  const activeLeadsCount = leads.filter(l => {
    const s = (l.status || '').toLowerCase();
    return s === 'new' || s === 'follow-up' || s === 'interested' || s === 'contacted';
  }).length;
  const dueFollowUpsCount = metrics.pendingFollowUps ?? 0;

  return (
    <AdminStoreContext.Provider value={{
      patients,
      refreshPatients,
      appointments,
      refreshAppointments,
      leads,
      refreshLeads,
      offers,
      refreshOffers,
      publishOffer,
      unpublishOffer,
      archiveOffer,
      duplicateOffer,
      deleteOffer,
      notifications,
      unreadCount,
      unreadNotificationsCount,
      activeLeadsCount,
      dueFollowUpsCount,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      clearAllNotifications,
      archiveNotification,
      deleteNotification,
      auditEntries,
      logAudit,
      metrics,
      refreshMetrics,
      toasts,
      showToast,
      dismissToast,
    }}>
      {children}
    </AdminStoreContext.Provider>
  );
}

export function useAdminStore() {
  const ctx = useContext(AdminStoreContext);
  if (!ctx) throw new Error('useAdminStore must be used within AdminStoreProvider');
  return ctx;
}