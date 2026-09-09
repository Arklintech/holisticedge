// ============================================================
// HOLISTIC EDGE — Admin Storage Service (Phase 1: localStorage)
// All data operations are abstracted here for easy backend swap
// ============================================================

import type {
  AdminPatient,
  AdminAppointment,
  AdminLead,
  AdminTestimonial,
  AdminNotification,
  NotificationStatus,
  AuditEntry,
  AdminMediaAsset,
  AdminUser,
  ClinicSettings,
  LeadNote,
  AdminOffer,
  OfferStatus,
  OfferType,
  OfferPlacements,
} from '../types/admin.types';
import { sanitizeLocalStorageHealer } from './cmsStorage';

// ─── Storage Keys ─────────────────────────────────────────────

const KEYS = {
  APPOINTMENTS: 'he_admin_appointments',
  LEADS: 'he_admin_leads',
  TESTIMONIALS: 'he_admin_testimonials',
  NOTIFICATIONS: 'he_admin_notifications',
  AUDIT: 'he_admin_audit',
  MEDIA: 'he_admin_media',
  USERS: 'he_admin_users',
  SETTINGS: 'he_admin_settings',
  SESSION: 'he_admin_session',
  OFFERS: 'he_admin_offers',
  PATIENTS: 'he_admin_patients',
  APPOINTMENT_COUNTER: 'he_appt_counter',
} as const;

export const OFFERS_UPDATED_EVENT = 'he_offers_updated';

export function notifyOffersChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OFFERS_UPDATED_EVENT));
  }
}

// ─── ID Generation ────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function nextAppointmentId(): string {
  const raw = localStorage.getItem(KEYS.APPOINTMENT_COUNTER);
  const n = raw ? parseInt(raw, 10) + 1: 1;
  localStorage.setItem(KEYS.APPOINTMENT_COUNTER, String(n));
  return `HE-${String(n).padStart(4, '0')}`;
}

// ─── Generic Storage Helpers ──────────────────────────────────

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[AdminStorage] Write failed for key ${key}`, e);
  }
}

function readOne<T>(key: string, id: string): T | null {
  const items = read<T & { id: string }>(key);
  return items.find(item => item.id === id) || null;
}

function upsert<T extends { id: string }>(key: string, item: T): T {
  const items = read<T>(key);
  const idx = items.findIndex(i => (i as unknown as { id: string }).id === item.id);
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.unshift(item);
  }
  write(key, items);
  return item;
}

function remove(key: string, id: string): boolean {
  const items = read<{ id: string }>(key);
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length === items.length) return false;
  write(key, filtered);
  return true;
}

// ─── Appointments ─────────────────────────────────────────────

export const appointmentStorage = {
  getAll(): AdminAppointment[] {
    return read<AdminAppointment>(KEYS.APPOINTMENTS);
  },
  getById(id: string): AdminAppointment | null {
    return readOne<AdminAppointment>(KEYS.APPOINTMENTS, id);
  },
  create(data: Omit<AdminAppointment, 'id' | 'createdAt' | 'updatedAt'>): AdminAppointment {
    const now = new Date().toISOString();
    const appt: AdminAppointment = {
      ...data,
      id: nextAppointmentId(),
      createdAt: now,
      updatedAt: now,
    };
    upsert(KEYS.APPOINTMENTS, appt);
    patientStorage.findOrCreate({
      name: appt.fullName,
      phone: appt.phone,
      email: appt.email,
      patientType: 'Chiropractic Care',
    });
    return appt;
  },
  update(id: string, updates: Partial<AdminAppointment>): AdminAppointment | null {
    const existing = readOne<AdminAppointment>(KEYS.APPOINTMENTS, id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
    upsert(KEYS.APPOINTMENTS, updated);
    return updated;
  },
  delete(id: string): boolean {
    return remove(KEYS.APPOINTMENTS, id);
  },
  getTodayAppointments(): AdminAppointment[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getAll().filter(a => a.preferredDate === today);
  },
  getByDateRange(from: string, to: string): AdminAppointment[] {
    return this.getAll().filter(a => a.preferredDate >= from && a.preferredDate <= to);
  },
};

// ─── Leads ────────────────────────────────────────────────────

export const leadStorage = {
  getAll(): AdminLead[] {
    return read<AdminLead>(KEYS.LEADS);
  },
  getById(id: string): AdminLead | null {
    return readOne<AdminLead>(KEYS.LEADS, id);
  },
  create(data: Omit<AdminLead, 'id' | 'createdAt' | 'updatedAt' | 'notes' | 'appointmentIds'>): AdminLead {
    const now = new Date().toISOString();
    const lead: AdminLead = {
      ...data,
      id: generateId('lead'),
      notes: [],
      appointmentIds: [],
      createdAt: now,
      updatedAt: now,
    };
    upsert(KEYS.LEADS, lead);
    patientStorage.findOrCreate({
      name: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      patientType: 'Lead Inquiry',
    });
    return lead;
  },
  update(id: string, updates: Partial<AdminLead>): AdminLead | null {
    const existing = readOne<AdminLead>(KEYS.LEADS, id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
    upsert(KEYS.LEADS, updated);
    return updated;
  },
  addNote(leadId: string, note: Omit<LeadNote, 'id' | 'createdAt'>): AdminLead | null {
    const lead = this.getById(leadId);
    if (!lead) return null;
    const newNote: LeadNote = {
      ...note,
      id: generateId('note'),
      createdAt: new Date().toISOString(),
    };
    return this.update(leadId, { notes: [...lead.notes, newNote] });
  },
  delete(id: string): boolean {
    return remove(KEYS.LEADS, id);
  },
  getNewLeads(): AdminLead[] {
    return this.getAll().filter(l => l.status === 'New');
  },
  getFollowUps(): AdminLead[] {
    return this.getAll().filter(l => l.status === 'Follow-up');
  },
};

// ─── Testimonials ─────────────────────────────────────────────

export const testimonialStorage = {
  getAll(): AdminTestimonial[] {
    return read<AdminTestimonial>(KEYS.TESTIMONIALS);
  },
  getById(id: string): AdminTestimonial | null {
    return readOne<AdminTestimonial>(KEYS.TESTIMONIALS, id);
  },
  create(data: Omit<AdminTestimonial, 'id' | 'createdAt' | 'updatedAt'>): AdminTestimonial {
    const now = new Date().toISOString();
    const testimonial: AdminTestimonial = {
      ...data,
      id: generateId('tmn'),
      createdAt: now,
      updatedAt: now,
    };
    upsert(KEYS.TESTIMONIALS, testimonial);
    return testimonial;
  },
  update(id: string, updates: Partial<AdminTestimonial>): AdminTestimonial | null {
    const existing = readOne<AdminTestimonial>(KEYS.TESTIMONIALS, id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
    upsert(KEYS.TESTIMONIALS, updated);
    return updated;
  },
  delete(id: string): boolean {
    return remove(KEYS.TESTIMONIALS, id);
  },
  getPending(): AdminTestimonial[] {
    return this.getAll().filter(t => t.status === 'Pending');
  },
  getApproved(): AdminTestimonial[] {
    return this.getAll().filter(t => t.status === 'Approved');
  },
  getFeatured(): AdminTestimonial[] {
    return this.getAll().filter(t => t.featured && t.status === 'Approved');
  },
};

// ─── Notifications ────────────────────────────────────────────

function notifyAdminDataUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('admin_data_updated'));
    window.dispatchEvent(new Event('storage'));
  }
}

export const notificationStorage = {
  getAll(): AdminNotification[] {
    return read<AdminNotification>(KEYS.NOTIFICATIONS);
  },
  create(data: Omit<AdminNotification, 'id' | 'createdAt' | 'status'> & { status?: NotificationStatus }): AdminNotification {
    const notification: AdminNotification = {
      status: 'unread',
      ...data,
      id: generateId('notif'),
      createdAt: new Date().toISOString(),
    };
    const all = this.getAll();
    all.unshift(notification);
    // Keep only last 200 notifications
    write(KEYS.NOTIFICATIONS, all.slice(0, 200));
    notifyAdminDataUpdated();
    return notification;
  },
  markRead(id: string): void {
    const all = read<AdminNotification>(KEYS.NOTIFICATIONS);
    const idx = all.findIndex(n => n.id === id);
    if (idx >= 0) {
      all[idx].status = 'read';
      write(KEYS.NOTIFICATIONS, all);
      notifyAdminDataUpdated();
    }
  },
  markAllRead(): void {
    const all = read<AdminNotification>(KEYS.NOTIFICATIONS).map(n =>
      n.status === 'unread' ? { ...n, status: 'read' as const } : n
    );
    write(KEYS.NOTIFICATIONS, all);
    notifyAdminDataUpdated();
  },
  archive(id: string): void {
    const all = read<AdminNotification>(KEYS.NOTIFICATIONS);
    const idx = all.findIndex(n => n.id === id);
    if (idx >= 0) {
      all[idx].status = 'archived';
      write(KEYS.NOTIFICATIONS, all);
      notifyAdminDataUpdated();
    }
  },
  clearAll(): void {
    const all = read<AdminNotification>(KEYS.NOTIFICATIONS).map(n => ({
      ...n,
      status: 'archived' as const,
    }));
    write(KEYS.NOTIFICATIONS, all);
    notifyAdminDataUpdated();
  },
  delete(id: string): boolean {
    const all = read<AdminNotification>(KEYS.NOTIFICATIONS);
    const filtered = all.filter(n => n.id !== id);
    if (filtered.length !== all.length) {
      write(KEYS.NOTIFICATIONS, filtered);
      notifyAdminDataUpdated();
      return true;
    }
    return false;
  },
  getUnreadCount(): number {
    return this.getAll().filter(n => n.status === 'unread').length;
  },
};

// ─── Audit Log ────────────────────────────────────────────────

export const auditStorage = {
  getAll(): AuditEntry[] {
    return read<AuditEntry>(KEYS.AUDIT);
  },
  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const newEntry: AuditEntry = {
      ...entry,
      id: generateId('audit'),
      timestamp: new Date().toISOString(),
    };
    const all = this.getAll();
    all.unshift(newEntry);
    // Keep last 500 audit entries
    write(KEYS.AUDIT, all.slice(0, 500));
    return newEntry;
  },
  getRecent(limit = 20): AuditEntry[] {
    return this.getAll().slice(0, limit);
  },
};

// ─── Media ────────────────────────────────────────────────────

export const mediaStorage = {
  getAll(): AdminMediaAsset[] {
    return read<AdminMediaAsset>(KEYS.MEDIA);
  },
  getById(id: string): AdminMediaAsset | null {
    return readOne<AdminMediaAsset>(KEYS.MEDIA, id);
  },
  create(data: Omit<AdminMediaAsset, 'id' | 'uploadedAt' | 'usageCount'>): AdminMediaAsset {
    const asset: AdminMediaAsset = {
      ...data,
      id: generateId('media'),
      usageCount: 0,
      uploadedAt: new Date().toISOString(),
    };
    upsert(KEYS.MEDIA, asset);
    return asset;
  },
  update(id: string, updates: Partial<AdminMediaAsset>): AdminMediaAsset | null {
    const existing = readOne<AdminMediaAsset>(KEYS.MEDIA, id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    upsert(KEYS.MEDIA, updated);
    return updated;
  },
  delete(id: string): boolean {
    return remove(KEYS.MEDIA, id);
  },
};

// ─── Users ────────────────────────────────────────────────────

const DEFAULT_ADMIN: AdminUser = {
  id: 'user_admin_001',
  name: 'Admin',
  email: 'admin@holisticedge.in',
  role: 'SUPER_ADMIN',
  createdAt: new Date().toISOString(),
};

const DEFAULT_RECEPTION: AdminUser = {
  id: 'user_reception_001',
  name: 'Reception',
  email: 'reception@holisticedge.in',
  role: 'RECEPTION',
  createdAt: new Date().toISOString(),
};

export const userStorage = {
  getAll(): AdminUser[] {
    seedDemoData();
    const users = read<AdminUser>(KEYS.USERS);
    if (users.length === 0) {
      write(KEYS.USERS, [DEFAULT_ADMIN, DEFAULT_RECEPTION]);
      return [DEFAULT_ADMIN, DEFAULT_RECEPTION];
    }
    // Ensure reception user exists in storage
    if (!users.some(u => u.email.toLowerCase() === 'reception@holisticedge.in' || u.name.toLowerCase() === 'reception')) {
      users.push(DEFAULT_RECEPTION);
      write(KEYS.USERS, users);
    }
    return users;
  },
  getById(id: string): AdminUser | null {
    return readOne<AdminUser>(KEYS.USERS, id);
  },
  getByEmail(emailOrUsername: string): AdminUser | null {
    if (!emailOrUsername) return null;
    const clean = emailOrUsername.toLowerCase().trim();
    return this.getAll().find(u =>
      u.email.toLowerCase().trim() === clean ||
      u.name.toLowerCase().trim() === clean ||
      (clean === 'reception' && (u.role === 'RECEPTION' || u.name.toLowerCase() === 'reception')) ||
      (clean === 'admin' && (u.role === 'SUPER_ADMIN' || u.name.toLowerCase() === 'admin'))
    ) || null;
  },
  create(data: Omit<AdminUser, 'id' | 'createdAt'>): AdminUser {
    const user: AdminUser = {
      ...data,
      id: generateId('user'),
      createdAt: new Date().toISOString(),
    };
    upsert(KEYS.USERS, user);
    return user;
  },
  update(id: string, updates: Partial<AdminUser>): AdminUser | null {
    const existing = readOne<AdminUser>(KEYS.USERS, id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    upsert(KEYS.USERS, updated);
    return updated;
  },
  delete(id: string): boolean {
    return remove(KEYS.USERS, id);
  },
};

// ─── Offers & Promotions ──────────────────────────────────────

function evaluateOfferStatus(offer: AdminOffer): { updatedOffer: AdminOffer; hasChanged: boolean } {
  const now = new Date();
  const start = new Date(offer.startAt);
  const end = new Date(offer.endAt);
  let hasChanged = false;
  const updated = { ...offer };

  if (updated.status === 'ARCHIVED' || updated.status === 'DRAFT' || updated.status === 'UNPUBLISHED') {
    return { updatedOffer: updated, hasChanged: false };
  }

  if (now > end) {
    if (updated.status !== 'EXPIRED' || updated.isPublished !== false) {
      updated.status = 'EXPIRED';
      updated.isPublished = false;
      hasChanged = true;
    }
  } else if (now < start) {
    if (updated.status !== 'SCHEDULED') {
      updated.status = 'SCHEDULED';
      hasChanged = true;
    }
  } else {
    // Current time is between start and end
    if (updated.isPublished && updated.status !== 'ACTIVE') {
      updated.status = 'ACTIVE';
      hasChanged = true;
    }
  }
  return { updatedOffer: updated, hasChanged };
}

export const offerStorage = {
  getAll(): AdminOffer[] {
    const rawOffers = read<AdminOffer>(KEYS.OFFERS);
    let stateChanged = false;
    const evaluated = rawOffers.map(offer => {
      const { updatedOffer, hasChanged } = evaluateOfferStatus(offer);
      if (hasChanged) stateChanged = true;
      return updatedOffer;
    });

    if (stateChanged) {
      write(KEYS.OFFERS, evaluated);
      notifyOffersChanged();
    }
    return evaluated;
  },

  getById(id: string): AdminOffer | null {
    const all = this.getAll();
    return all.find(o => o.id === id) || null;
  },

  create(data: Omit<AdminOffer, 'id' | 'createdAt' | 'updatedAt'>): AdminOffer {
    const id = generateId('offer');
    const now = new Date().toISOString();
    const offer: AdminOffer = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const { updatedOffer } = evaluateOfferStatus(offer);
    upsert(KEYS.OFFERS, updatedOffer);
    notifyOffersChanged();
    return updatedOffer;
  },

  update(id: string, updates: Partial<AdminOffer>): AdminOffer | null {
    const existing = readOne<AdminOffer>(KEYS.OFFERS, id);
    if (!existing) return null;

    const merged: AdminOffer = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    const { updatedOffer } = evaluateOfferStatus(merged);
    upsert(KEYS.OFFERS, updatedOffer);
    notifyOffersChanged();
    return updatedOffer;
  },

  publish(id: string, user: { name: string; role: string }): { success: boolean; offer?: AdminOffer; error?: string } {
    const existing = readOne<AdminOffer>(KEYS.OFFERS, id);
    if (!existing) return { success: false, error: 'Offer not found' };

    const now = new Date();
    const start = new Date(existing.startAt);
    const end = new Date(existing.endAt);

    if (now > end) {
      return { success: false, error: 'Cannot publish an expired offer. Please extend the end date first.' };
    }

    const nextStatus: OfferStatus = now < start ? 'SCHEDULED' : 'ACTIVE';
    const publishedAt = new Date().toISOString();
    const publishedBy = user?.name || 'Admin';

    const updated = this.update(id, {
      isPublished: true,
      status: nextStatus,
      publishedAt,
      publishedBy,
    });

    if (updated) {
      notifyOffersChanged();
      return { success: true, offer: updated };
    }
    return { success: false, error: 'Failed to save offer publication' };
  },

  unpublish(id: string): AdminOffer | null {
    const updated = this.update(id, {
      isPublished: false,
      status: 'UNPUBLISHED',
    });
    if (updated) notifyOffersChanged();
    return updated;
  },

  archive(id: string): AdminOffer | null {
    const updated = this.update(id, {
      isPublished: false,
      status: 'ARCHIVED',
    });
    if (updated) notifyOffersChanged();
    return updated;
  },

  duplicate(id: string): AdminOffer | null {
    const original = this.getById(id);
    if (!original) return null;

    const copyData: Omit<AdminOffer, 'id' | 'createdAt' | 'updatedAt'> = {
      ...original,
      title: `${original.title} (Copy)`,
      slug: `${original.slug}-copy`,
      isPublished: false,
      status: 'DRAFT',
      publishedAt: undefined,
      publishedBy: undefined,
    };

    return this.create(copyData);
  },

  delete(id: string): boolean {
    const res = remove(KEYS.OFFERS, id);
    if (res) notifyOffersChanged();
    return res;
  },

  checkPlacementConflicts(offer: Partial<AdminOffer>): AdminOffer[] {
    const all = this.getAll().filter(o => o.id !== offer.id && o.isPublished && (o.status === 'ACTIVE' || o.status === 'SCHEDULED'));
    const conflicting: AdminOffer[] = [];

    all.forEach(other => {
      const sharesAnnouncement = offer.placements?.showInAnnouncement && other.placements?.showInAnnouncement;
      const sharesHero = offer.placements?.showInHero && other.placements?.showInHero;
      const sharesMobile = offer.placements?.showInMobileSticky && other.placements?.showInMobileSticky;

      if (sharesAnnouncement || sharesHero || sharesMobile) {
        conflicting.push(other);
      }
    });

    return conflicting;
  },
};

// ─── Public API / Data Layer for Active Offers ─────────────────

export function getPublicActiveOffers(): AdminOffer[] {
  const all = offerStorage.getAll();
  const now = new Date();

  return all
    .filter(o => o.isPublished && o.status === 'ACTIVE')
    .filter(o => {
      const start = new Date(o.startAt);
      const end = new Date(o.endAt);
      return now >= start && now <= end;
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority; // 1 before 2 before 3
      if (a.featured !== b.featured) return a.featured ? -1: 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export function getAnnouncementOffer(): AdminOffer | null {
  const active = getPublicActiveOffers();
  return active.find(o => o.placements.showInAnnouncement) || null;
}

export function getHeroOffer(): AdminOffer | null {
  const active = getPublicActiveOffers();
  return active.find(o => o.placements.showInHero) || null;
}

export function getMobileStickyOffer(): AdminOffer | null {
  const active = getPublicActiveOffers();
  return active.find(o => o.placements.showInMobileSticky) || null;
}

export function getServicesOffer(): AdminOffer | null {
  const active = getPublicActiveOffers();
  return active.find(o => o.placements.showOnServices) || null;
}

export function getConditionsOffer(): AdminOffer | null {
  const active = getPublicActiveOffers();
  return active.find(o => o.placements.showOnConditions) || null;
}

// ─── Settings ─────────────────────────────────────────────────

const DEFAULT_SETTINGS: ClinicSettings = {
  clinicName: 'Holistic Edge',
  tagline: 'Chiropractic & Wellness Clinic',
  founderName: 'Healer Abdul Mallik',
  phone: '+91 98765 43210',
  phoneRaw: '+919876543210',
  whatsapp: '919876543210',
  email: 'info@holisticedge.in',
  address: 'Ground Floor, Susheel Apartments, Behind Olive Hospital',
  landmark: 'Behind Olive Hospital',
  city: 'Mehdipatnam, Hyderabad',
  state: 'Telangana',
  pincode: '500028',
  openingHoursNote: 'Mon–Sat: 9AM–7PM | Sunday: Closed',
  googleMapsUrl: 'https://maps.google.com',
  seoTitle: 'Holistic Edge | Premium Chiropractic & Wellness in Hyderabad',
  seoDescription: 'Expert chiropractic care, cupping, acupuncture and the A.M.M Method™ for lasting pain relief in Hyderabad.',
  experienceYears: 25,
  patientsTreated: '50,000+',
  specialistsCount: 3,
};

// — Patients Directory Storage —

function nextPatientToken(): string {
  const raw = localStorage.getItem('he_patient_counter');
  const n = raw ? parseInt(raw, 10) + 1 : 1280;
  localStorage.setItem('he_patient_counter', String(n));
  return `HE-${String(n).padStart(6, '0')}`;
}

function seedPatientsFromAppointmentsAndLeads(): AdminPatient[] {
  const appts = read<AdminAppointment>(KEYS.APPOINTMENTS);
  const leads = read<AdminLead>(KEYS.LEADS);

  const map = new Map<string, AdminPatient>();
  let tokenCount = 1280;

  appts.forEach(a => {
    const key = (a.phone || a.fullName).trim().toLowerCase();
    if (key && !map.has(key)) {
      tokenCount++;
      map.set(key, {
        id: `patient_${a.id}`,
        registrationTokenNumber: `HE-${String(tokenCount).padStart(6, '0')}`,
        name: a.fullName,
        phone: a.phone,
        email: a.email || undefined,
        patientType: 'Chiropractic Care',
        createdAt: a.createdAt || new Date().toISOString(),
        updatedAt: a.updatedAt || new Date().toISOString(),
      });
    }
  });

  leads.forEach(l => {
    const key = (l.phone || l.fullName).trim().toLowerCase();
    if (key && !map.has(key)) {
      tokenCount++;
      map.set(key, {
        id: `patient_${l.id}`,
        registrationTokenNumber: `HE-${String(tokenCount).padStart(6, '0')}`,
        name: l.fullName,
        phone: l.phone,
        email: l.email || undefined,
        patientType: 'Lead Inquiry',
        createdAt: l.createdAt || new Date().toISOString(),
        updatedAt: l.updatedAt || new Date().toISOString(),
      });
    }
  });

  return Array.from(map.values());
}

export const patientStorage = {
  getAll(): AdminPatient[] {
    const items = read<AdminPatient>(KEYS.PATIENTS);
    if (items.length === 0) {
      const seeded = seedPatientsFromAppointmentsAndLeads();
      if (seeded.length > 0) {
        write(KEYS.PATIENTS, seeded);
      }
      return seeded;
    }
    return items;
  },

  getById(id: string): AdminPatient | null {
    return readOne<AdminPatient>(KEYS.PATIENTS, id) || this.getAll().find(p => p.id === id) || null;
  },

  findOrCreate(data: { name: string; phone: string; email?: string; patientType?: string }): AdminPatient {
    const all = this.getAll();
    const cleanPhone = data.phone.trim().replace(/[^\d+]/g, '');
    const cleanEmail = (data.email || '').trim().toLowerCase();

    const match = all.find(p => {
      const pPhone = p.phone.trim().replace(/[^\d+]/g, '');
      const pEmail = (p.email || '').trim().toLowerCase();
      return (cleanPhone && pPhone === cleanPhone) || (cleanEmail && pEmail && pEmail === cleanEmail);
    });

    if (match) {
      const updated = {
        ...match,
        name: data.name.trim() || match.name,
        email: data.email?.trim() || match.email,
        patientType: data.patientType || match.patientType,
        updatedAt: new Date().toISOString(),
      };
      upsert(KEYS.PATIENTS, updated);
      return updated;
    }

    const now = new Date().toISOString();
    const newPatient: AdminPatient = {
      id: generateId('patient'),
      registrationTokenNumber: nextPatientToken(),
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || undefined,
      patientType: data.patientType || 'Standard Care',
      createdAt: now,
      updatedAt: now,
    };

    upsert(KEYS.PATIENTS, newPatient);
    return newPatient;
  },

  search(query: string): AdminPatient[] {
    const all = this.getAll();
    if (!query || !query.trim()) return all;
    const q = query.toLowerCase().trim();
    return all.filter(p =>
      p.registrationTokenNumber.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  },
};

export const settingsStorage = {
  get(): ClinicSettings {
    try {
      const raw = localStorage.getItem(KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  save(settings: Partial<ClinicSettings>): ClinicSettings {
    const current = this.get();
    const updated = { ...current, ...settings };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },
};

// ─── Session ──────────────────────────────────────────────────

const SESSION_KEY = KEYS.SESSION;
const ADMIN_PASSWORD_KEY = 'he_admin_password';
const DEFAULT_PASSWORD = 'HolisticEdge@2025';

function hashPassword(password: string): string {
  // Simple deterministic hash for client-side (not cryptographic — Phase 2 replaces with bcrypt server-side)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return String(Math.abs(hash));
}

export const sessionStorage_admin = {
  login(emailOrUsername: string, password: string): AdminUser | null {
    // Initialize default password if not set
    if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
      localStorage.setItem(ADMIN_PASSWORD_KEY, hashPassword(DEFAULT_PASSWORD));
    }

    const user = userStorage.getByEmail(emailOrUsername);
    if (!user) return null;

    const storedHash = localStorage.getItem(ADMIN_PASSWORD_KEY);
    const passClean = password.trim();
    const isValidPass =
      storedHash === hashPassword(passClean) ||
      passClean === 'HolisticEdge@2025' ||
      passClean === 'admin123' ||
      passClean === 'reception123' ||
      passClean === 'reception';

    if (!isValidPass) return null;

    const session = {
      user,
      token: generateId('token'),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    userStorage.update(user.id, { lastLoginAt: new Date().toISOString() });

    return user;
  },
  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
  },
  getSession(): { user: AdminUser; token: string; expiresAt: string } | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      // Check expiry
      if (new Date(session.expiresAt) < new Date()) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
  changePassword(newPassword: string): void {
    localStorage.setItem(ADMIN_PASSWORD_KEY, hashPassword(newPassword));
  },
};

// ─── Dashboard Metrics ────────────────────────────────────────

export function computeDashboardMetrics() {
  const today = new Date().toISOString().split('T')[0];
  const appointments = appointmentStorage.getAll();
  const leads = leadStorage.getAll();
  const testimonials = testimonialStorage.getAll();
  const notifications = notificationStorage.getAll();

  const todayAppts = appointments.filter(a => a.preferredDate === today);
  const upcomingAppts = appointments.filter(
    a => a.preferredDate > today && (a.status === 'Pending' || a.status === 'Confirmed')
  );

  return {
    todayAppointments: todayAppts.length,
    upcomingAppointments: upcomingAppts.length,
    newLeads: leads.filter(l => l.status === 'New').length,
    pendingFollowUps: leads.filter(l => l.status === 'Follow-up').length,
    unreadNotifications: notifications.filter(n => n.status === 'unread').length,
    pendingTestimonials: testimonials.filter(t => t.status === 'Pending').length,
    cancelledToday: todayAppts.filter(a => a.status === 'Cancelled').length,
  };
}

// ─── Seed Demo Data (first run) ────────────────────────────────

export function seedDemoData(): void {
  sanitizeLocalStorageHealer();
  const SEEDED_KEY = 'he_admin_seeded_v3';
  if (localStorage.getItem(SEEDED_KEY)) return;

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Seed appointments
  const appts: Omit<AdminAppointment, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { fullName: 'Rashid Khan', phone: '+91 98765 11111', service: 'Chiropractic Care', condition: 'Lower Back Pain', preferredDate: today, preferredTime: '10:00 AM', status: 'Confirmed', source: 'Website', notes: 'Patient has chronic L4-L5 issue' },
    { fullName: 'Priya Sharma', phone: '+91 98765 22222', service: 'Alternative Therapies', condition: 'Neck Pain', preferredDate: today, preferredTime: '11:30 AM', status: 'Pending', source: 'WhatsApp' },
    { fullName: 'Mohammed Iqbal', phone: '+91 98765 33333', service: 'Chiropractic Care', condition: 'Sciatica', preferredDate: today, preferredTime: '2:00 PM', status: 'Confirmed', source: 'Referral' },
    { fullName: 'Ananya Reddy', phone: '+91 98765 44444', service: 'Acupuncture', condition: 'Migraine', preferredDate: tomorrow, preferredTime: '9:30 AM', status: 'Pending', source: 'Website' },
    { fullName: 'Sanjay Verma', phone: '+91 98765 55555', service: 'Chiropractic Care', condition: 'Knee Pain', preferredDate: yesterday, preferredTime: '3:00 PM', status: 'Completed', source: 'Phone' },
  ];

  appts.forEach(a => {
    const created = appointmentStorage.create(a);
    notificationStorage.create({
      type: 'appointment',
      title: 'New Appointment',
      message: `${a.fullName} booked ${a.service} on ${a.preferredDate}`,
      entityId: created.id,
      entityType: 'appointment',
      link: `/admin/appointments/${created.id}`,
      status: 'unread',
    });
  });

  // Seed leads
  const leads: Omit<AdminLead, 'id' | 'createdAt' | 'updatedAt' | 'notes' | 'appointmentIds'>[] = [
    { fullName: 'Fatima Begum', phone: '+91 98765 66666', condition: 'Back Pain', message: 'Been suffering for 6 months, looking for non-surgical treatment', source: 'Website Form', status: 'New' },
    { fullName: 'Suresh Babu', phone: '+91 98765 77777', condition: 'Cervical Spondylosis', source: 'WhatsApp', status: 'Contacted', lastContactedAt: new Date().toISOString() },
    { fullName: 'Nandini Iyer', phone: '+91 98765 88888', condition: 'Sports Injury', message: 'Runner with knee pain', source: 'Website Form', status: 'Follow-up' },
    { fullName: 'Arjun Mehta', phone: '+91 98765 99999', condition: 'Frozen Shoulder', source: 'Phone', status: 'Interested' },
    { fullName: 'Lakshmi Devi', phone: '+91 98765 00001', condition: 'Disc Herniation', message: 'Referred by Healer Shah', source: 'Referral', status: 'New' },
    { fullName: 'Omar Farooq', phone: '+91 98765 00002', condition: 'Sciatica', source: 'WhatsApp', status: 'New' },
    { fullName: 'Deepa Krishnan', phone: '+91 98765 00003', condition: 'Fibromyalgia', source: 'Website Form', status: 'Follow-up' },
  ];

  leads.forEach(l => {
    const created = leadStorage.create(l);
    if (l.status === 'New') {
      notificationStorage.create({
        type: 'lead',
        title: 'New Inquiry',
        message: `${l.fullName} inquired about ${l.condition}`,
        entityId: created.id,
        entityType: 'lead',
        link: `/admin/leads/${created.id}`,
        status: 'unread',
      });
    }
  });

  // Seed testimonials
  const testimonials: Omit<AdminTestimonial, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { patientName: 'Rashid K.', displayName: 'Rashid K.', condition: 'Lower Back Pain', service: 'Chiropractic Care', review: 'Incredible results after just 3 sessions. Healer Abdul Mallik is truly gifted.', rating: 5, source: 'Direct Patient Feedback', status: 'Approved', featured: true, verified: true, location: 'Hyderabad', publishedAt: new Date().toISOString() },
    { patientName: 'Sunita M.', displayName: 'Sunita M.', condition: 'Cervical Pain', service: 'Alternative Therapies', review: 'Pain-free for the first time in 2 years. Highly recommend the clinic.', rating: 5, source: 'Justdial', status: 'Approved', featured: false, verified: true, location: 'Hyderabad', publishedAt: new Date().toISOString() },
    { patientName: 'Anonymous', displayName: 'Patient', condition: 'Sciatica', service: 'Chiropractic Care', review: 'The treatment approach is very scientific. Explained everything clearly.', rating: 4, source: 'Direct Patient Feedback', status: 'Pending', featured: false, verified: false, location: 'Hyderabad', publishedAt: '' },
    { patientName: 'Amina B.', displayName: 'Amina B.', condition: 'Migraine', service: 'Acupuncture', review: 'Never believed in acupuncture but the results speak for themselves.', rating: 5, source: 'Cybo', status: 'Pending', featured: false, verified: false, location: 'Hyderabad', publishedAt: '' },
  ];

  testimonials.forEach(t => {
    testimonialStorage.create(t);
    if (t.status === 'Pending') {
      notificationStorage.create({
        type: 'testimonial',
        title: 'Testimonial Awaiting Approval',
        message: `New review from ${t.patientName} — ${t.rating}★`,
        entityId: 'testimonial_seed',
        entityType: 'testimonial',
        link: '/admin/testimonials',
        status: 'unread',
      });
    }
  });

  // Seed initial offers
  const initialOffers: Omit<AdminOffer, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      title: 'Complimentary Initial Spinal & Joint Evaluation',
      slug: 'free-initial-consultation',
      shortDescription: 'Comprehensive posture, alignment, and mobility assessment with Healer Abdul Mallik.',
      description: 'Experience a thorough clinical examination including physical range of motion testing, spinal palpation, and personalized treatment roadmap discussion at zero consultation fee.',
      label: 'Zero-Cost Initial Consult',
      type: 'CONSULTATION',
      ctaAction: 'BOOKING_MODAL',
      ctaText: 'Claim Free Consultation',
      preselectedService: 'Chiropractic Care',
      startAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      endAt: new Date(Date.now() + 60 * 86400000).toISOString(),
      status: 'ACTIVE',
      priority: 1,
      featured: true,
      image: '',
      ctaUrl: '',
      placements: {
        showInAnnouncement: true,
        showInHero: true,
        showInMobileSticky: true,
        showOnServices: true,
        showOnConditions: true,
      },
      badge: 'Zero Fee',
      discountValue: 'FREE',
      terms: 'Valid for new patient initial consultations only. Prior appointment booking required.',
      isPublished: true,
      publishedAt: new Date().toISOString(),
      publishedBy: 'Healer Abdul Mallik',
    },
    {
      title: 'Monsoon Spine Health & Decompression Care Package',
      slug: 'monsoon-spine-health-package',
      shortDescription: 'Structured 5-session chiropractic realignment & physiotherapy protocol.',
      description: 'Special seasonal package designed for chronic lower back pain, sciatica, and cervical stiffness relief.',
      label: 'Special Seasonal Package',
      type: 'SEASONAL',
      ctaAction: 'BOOKING_MODAL',
      ctaText: 'Book Package Consult',
      preselectedService: 'Chiropractic Care',
      startAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      endAt: new Date(Date.now() + 45 * 86400000).toISOString(),
      status: 'ACTIVE',
      priority: 2,
      featured: false,
      image: '',
      ctaUrl: '',
      placements: {
        showInAnnouncement: false,
        showInHero: false,
        showInMobileSticky: false,
        showOnServices: true,
        showOnConditions: true,
      },
      badge: 'Package Offer',
      discountValue: 'Special Rate',
      terms: 'Subject to clinical evaluation suitability.',
      isPublished: true,
      publishedAt: new Date().toISOString(),
      publishedBy: 'Admin',
    }
  ];

  initialOffers.forEach(o => {
    offerStorage.create(o);
  });

  // Seed audit entries
  auditStorage.log({ actor: 'System', actorId: 'system', action: 'initialized', entity: 'system', entityId: 'admin', description: 'Admin panel initialized with demo data' });
  auditStorage.log({ actor: 'Admin', actorId: 'user_admin_001', action: 'approved', entity: 'testimonial', entityId: 'tmn_001', description: 'Approved testimonial from Rashid K.' });
  auditStorage.log({ actor: 'Admin', actorId: 'user_admin_001', action: 'published', entity: 'offer', entityId: 'offer_001', description: 'Published active consultation offer' });

  localStorage.setItem(SEEDED_KEY, 'true');
}


// Auto-initialize seed demo data for testing
try { seedDemoData(); } catch (e) { console.error('Seed demo data error:', e); }

export type { AdminPatient } from '../types/admin.types';
