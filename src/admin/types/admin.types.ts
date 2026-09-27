// ============================================================
// HOLISTIC EDGE — Admin Panel Type Definitions
// ============================================================

// ─── Auth ────────────────────────────────────────────────────

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'CONTENT_EDITOR' | 'RECEPTION';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminSession {
  user: AdminUser;
  token: string;
  expiresAt: string;
}

// ─── Appointments ─────────────────────────────────────────────

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-show';
export type AppointmentSource = 'Website' | 'Phone' | 'WhatsApp' | 'Walk-in' | 'Referral' | 'Website Form' | 'Booking Modal';

export interface AdminAppointment {
  id: string;
  fullName?: string;
  patientName?: string;
  phone: string;
  email?: string;
  service: string;
  condition: string;
  preferredDate?: string;   // "YYYY-MM-DD"
  preferredTime?: string;   // "10:00 AM"
  date?: string;
  timeSlot?: string;
  status: AppointmentStatus;
  assignedTo?: string;
  notes?: string;
  source: AppointmentSource;
  leadId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Leads / Inquiries ────────────────────────────────────────

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Appointment Booked'
  | 'Follow-up'
  | 'Converted'
  | 'Not Interested'
  | 'Closed';

export type LeadSource = 'Website Form' | 'WhatsApp' | 'Phone' | 'Booking Modal' | 'Walk-in' | 'Referral';

export interface LeadNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface AdminLead {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  condition: string;
  message?: string;
  service?: string;
  preferredDate?: string;
  preferredTime?: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo?: string;
  notes?: LeadNote[];
  appointmentIds?: string[];
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
}

// ─── Testimonials ─────────────────────────────────────────────

export type TestimonialStatus = 'Pending' | 'Approved' | 'Rejected' | 'Archived';

export interface AdminTestimonial {
  id: string;
  patientName: string;
  displayName: string;
  condition: string;
  service: string;
  review: string;
  rating: number;
  source: string;
  location?: string;
  status: TestimonialStatus;
  featured: boolean;
  verified: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Notifications ────────────────────────────────────────────

export type NotificationType = 'appointment' | 'lead' | 'testimonial' | 'system' | 'content' | 'reminder' | 'email' | 'whatsapp';
export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityId: string;
  entityType: string;
  link: string;
  status: NotificationStatus;
  createdAt: string;
}

// ─── Audit Log ────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  actor: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ─── Media ────────────────────────────────────────────────────

export type MediaCategory =
  | 'Clinic Exterior'
  | 'Reception'
  | 'Waiting Area'
  | 'Treatment Room'
  | 'Equipment'
  | 'Team'
  | 'Doctor'
  | 'Success Stories'
  | 'General';

export interface AdminMediaAsset {
  id: string;
  filename: string;
  originalName: string;
  url: string;           // data URL or object URL
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  altText: string;
  category: MediaCategory;
  tags: string[];
  usageCount: number;
  requiresConsent: boolean;
  consentConfirmed?: boolean;
  uploadedAt: string;
  uploadedBy: string;
}

// ─── Settings ─────────────────────────────────────────────────

export interface ClinicSettings {
  // Business
  clinicName: string;
  tagline: string;
  founderName: string;
  // Contact
  phone: string;
  phoneRaw: string;
  whatsapp: string;
  email: string;
  // Address
  address: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  // Hours
  openingHoursNote: string;
  // Social
  googleMapsUrl: string;
  justdialUrl?: string;
  // SEO
  seoTitle: string;
  seoDescription: string;
  // Stats
  experienceYears: number;
  patientsTreated: string;
  specialistsCount: number;
}

// ─── Dashboard ────────────────────────────────────────────────

export interface DashboardMetrics {
  todayAppointments: number;
  upcomingAppointments: number;
  newLeads: number;
  pendingFollowUps: number;
  unreadNotifications: number;
  pendingTestimonials: number;
  cancelledToday: number;
}

// ─── Table / Filter utilities ─────────────────────────────────

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface FilterState {
  [key: string]: string | string[] | undefined;
}

// ─── Toast ────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration: number;
}

// ─── Offers / Promotions ──────────────────────────────────────

export type OfferType =
  | 'PROMOTIONAL'
  | 'CONSULTATION'
  | 'SERVICE'
  | 'SEASONAL'
  | 'LIMITED_TIME';

export type OfferStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'UNPUBLISHED'
  | 'ARCHIVED';

export type OfferCtaAction =
  | 'BOOKING_MODAL'
  | 'CUSTOM_URL'
  | 'WHATSAPP'
  | 'PHONE';

export interface OfferPlacements {
  showInAnnouncement: boolean;
  showInHero: boolean;
  showInMobileSticky: boolean;
  showOnServices: boolean;
  showOnConditions: boolean;
}

export interface AdminOffer {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  label: string;
  type: OfferType;
  ctaAction: OfferCtaAction;
  ctaText: string;
  ctaUrl: string;
  preselectedService: string;
  startAt: string;
  endAt: string;
  status: OfferStatus;
  priority: number;
  featured: boolean;
  placements: OfferPlacements;
  image: string;
  badge: string;
  terms: string;
  discountValue: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  publishedBy: string;
}


// — Patients —

export interface AdminPatient {
  id: string;
  registrationTokenNumber: string;
  name: string;
  phone: string;
  email?: string;
  patientType: string;
  createdAt: string;
  updatedAt: string;
}