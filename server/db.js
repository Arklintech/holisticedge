import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_USERS = [
  {
    id: 'user_admin_001',
    name: 'Admin',
    email: 'admin@holisticedge.in',
    role: 'SUPER_ADMIN',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_reception_001',
    name: 'Reception',
    email: 'reception@holisticedge.in',
    role: 'RECEPTION',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_CLINIC_SETTINGS = {
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
  openingHoursNote: 'Mon-Sat: 9AM-7PM | Sunday: Closed',
  googleMapsUrl: 'https://maps.google.com',
  seoTitle: 'Holistic Edge | Premium Chiropractic & Wellness in Hyderabad',
  seoDescription: 'Non-surgical, non-medicinal root-cause spinal realignment & joint pain care in Mehdipatnam, Hyderabad led by Healer Abdul Mallik.',
};

const DEFAULT_PATIENTS = [
  { id: 'patient_HE-001281', registrationTokenNumber: 'HE-001281', name: 'Rashid Khan', phone: '+91 98765 11111', email: 'rashid.khan@example.com', patientType: 'Chiropractic Care', createdAt: new Date().toISOString() },
  { id: 'patient_HE-001282', registrationTokenNumber: 'HE-001282', name: 'Priya Sharma', phone: '+91 98765 22222', email: 'priya.sharma@example.com', patientType: 'Alternative Therapies', createdAt: new Date().toISOString() },
  { id: 'patient_HE-001283', registrationTokenNumber: 'HE-001283', name: 'Mohammed Iqbal', phone: '+91 98765 33333', email: 'iqbal.m@example.com', patientType: 'Chiropractic Care', createdAt: new Date().toISOString() },
  { id: 'patient_HE-001284', registrationTokenNumber: 'HE-001284', name: 'Ananya Reddy', phone: '+91 98765 44444', email: 'ananya.reddy@example.com', patientType: 'Acupuncture', createdAt: new Date().toISOString() },
  { id: 'patient_HE-001285', registrationTokenNumber: 'HE-001285', name: 'Sanjay Verma', phone: '+91 98765 55555', email: 'sanjay.v@example.com', patientType: 'Chiropractic Care', createdAt: new Date().toISOString() },
  { id: 'patient_HE-001286', registrationTokenNumber: 'HE-001286', name: 'Fatima Begum', phone: '+91 98765 66666', email: 'fatima.begum@example.com', patientType: 'Lead Inquiry', createdAt: new Date().toISOString() },
];

const DEFAULT_APPOINTMENTS = [
  { id: 'HE-0001', fullName: 'Rashid Khan', phone: '+91 98765 11111', email: 'rashid.khan@example.com', service: 'Chiropractic Care', condition: 'Lower Back Pain', preferredDate: new Date().toISOString().split('T')[0], preferredTime: '10:00 AM', status: 'Confirmed', source: 'Website', notes: 'Patient has chronic L4-L5 issue', createdAt: new Date().toISOString() },
  { id: 'HE-0002', fullName: 'Priya Sharma', phone: '+91 98765 22222', email: 'priya.sharma@example.com', service: 'Alternative Therapies', condition: 'Neck Pain', preferredDate: new Date().toISOString().split('T')[0], preferredTime: '11:30 AM', status: 'Pending', source: 'WhatsApp', createdAt: new Date().toISOString() },
  { id: 'HE-0003', fullName: 'Mohammed Iqbal', phone: '+91 98765 33333', email: 'iqbal.m@example.com', service: 'Chiropractic Care', condition: 'Sciatica', preferredDate: new Date().toISOString().split('T')[0], preferredTime: '02:00 PM', status: 'Confirmed', source: 'Referral', createdAt: new Date().toISOString() },
];

const DEFAULT_LEADS = [
  { id: 'lead_001', fullName: 'Fatima Begum', phone: '+91 98765 66666', email: 'fatima.begum@example.com', condition: 'Back Pain', message: 'Been suffering for 6 months, looking for non-surgical treatment', source: 'Website Form', status: 'New', notes: [], appointmentIds: [], createdAt: new Date().toISOString() },
  { id: 'lead_002', fullName: 'Suresh Babu', phone: '+91 98765 77777', email: '', condition: 'Cervical Spondylosis', source: 'WhatsApp', status: 'Contacted', notes: [], appointmentIds: [], createdAt: new Date().toISOString() },
];

const DEFAULT_CMS_SERVICES = [
  {
    id: 'srv_1',
    title: 'Chiropractic Care',
    slug: 'chiropractic-care',
    category: 'Core Clinical Therapy',
    summary: 'Precision spinal realignment, joint mobilization, and postural balance to eliminate nerve impingement and restore natural movement.',
    status: 'PUBLISHED',
    isFeatured: true,
    price: 1500,
    duration: '45 mins',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv_2',
    title: 'A.M.M Method™ Protocol',
    slug: 'amm-method',
    category: 'Signature Proprietary Protocol',
    summary: 'A 3-stage integrated rehabilitation combining spinal decompression, fascial release, and neuro-muscular stabilization developed by Healer Abdul Mallik.',
    status: 'PUBLISHED',
    isFeatured: true,
    price: 2500,
    duration: '60 mins',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv_3',
    title: 'Acupuncture & Cupping Therapy',
    slug: 'acupuncture-cupping',
    category: 'Alternative Therapies',
    summary: 'Targeted blood circulation enhancement, deep muscle tension release, and meridian point stimulation for chronic pain relief.',
    status: 'PUBLISHED',
    isFeatured: true,
    price: 1800,
    duration: '45 mins',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv_4',
    title: 'Sports Injury & Neuromuscular Rehab',
    slug: 'sports-injury-rehab',
    category: 'Rehabilitation',
    summary: 'Focused structural rehabilitation for athletes and active individuals recovering from ligament sprains, tendonitis, and biomechanical imbalances.',
    status: 'PUBLISHED',
    isFeatured: false,
    price: 2000,
    duration: '45 mins',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_CMS_CONDITIONS = [
  {
    id: 'cond_1',
    title: 'Lower Back Pain & Sciatica',
    slug: 'sciatica-lower-back-pain',
    category: 'Spine & Nerve',
    summary: 'Compressed lumbar discs, radiating nerve pain, and severe lower spine stiffness treated with non-surgical decompression.',
    status: 'PUBLISHED',
    isFeatured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cond_2',
    title: 'Cervical Spondylosis & Neck Stiffness',
    slug: 'cervical-spondylosis',
    category: 'Cervical Spine',
    summary: 'Chronic neck tension, pinched nerve radiculopathy, and numbness radiating down arms addressed via gentle cervical adjustments.',
    status: 'PUBLISHED',
    isFeatured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cond_3',
    title: 'Frozen Shoulder & Joint Immobility',
    slug: 'frozen-shoulder',
    category: 'Joints',
    summary: 'Adhesive capsulitis and shoulder capsule restriction restored through fascial mobilization and targeted therapeutic cupping.',
    status: 'PUBLISHED',
    isFeatured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cond_4',
    title: 'Lumbar Slipped / Bulging Disc',
    slug: 'lumbar-slip-disc',
    category: 'Spine',
    summary: 'L4-L5 and L5-S1 disc protrusion managed safely without invasive surgery through the holistic 3-stage A.M.M protocol.',
    status: 'PUBLISHED',
    isFeatured: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_CMS_FAQS = [
  {
    id: 'faq_1',
    question: 'What makes the A.M.M Method™ different from regular chiropractic?',
    answer: 'The A.M.M Method™ is a proprietary 3-stage holistic recovery protocol developed by Healer Abdul Mallik over 25+ years. It synergizes precise chiropractic adjustments with deep tissue cupping and neuromuscular stabilization exercises for permanent root-cause relief.',
    category: 'General Clinical',
    status: 'PUBLISHED',
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'faq_2',
    question: 'Is chiropractic spinal adjustment painful?',
    answer: 'No. Chiropractic adjustments performed by experienced practitioners are gentle, precise, and virtually painless. Most patients experience immediate relief and a sense of lightness in their spine following the session.',
    category: 'Treatment Safety',
    status: 'PUBLISHED',
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'faq_3',
    question: 'Can disc bulges and sciatica be treated without surgery?',
    answer: 'Yes. In the vast majority of non-emergency cases, conservative care combining spinal decompression, fascial release, and neuromuscular re-education effectively relieves nerve pressure and eliminates pain without surgery.',
    category: 'Conditions & Care',
    status: 'PUBLISHED',
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_OFFERS = [
  {
    id: 'off_1',
    title: 'Comprehensive Spine & Posture Consultation',
    code: 'FIRSTCARE',
    discountText: '20% OFF Initial Consultation',
    validUntil: '2026-12-31',
    description: 'Complete physical evaluation, spinal alignment check, posture assessment, and tailored clinical recovery roadmap.',
    status: 'ACTIVE',
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_GOOGLE_REVIEWS = [
  {
    id: 'grev_1',
    googleReviewId: 'ChZDSUhNMG9nS0VJQ0FnSUNkLXF2aWFnEAE',
    reviewerName: 'M. Rahman',
    authorName: 'M. Rahman',
    starRating: 5,
    rating: 5,
    comment: 'I had been struggling with excruciating lower back pain that radiated down my right leg for over 8 months. Healer Abdul Mallik did a thorough assessment and started the A.M.M protocol. By the 4th session, the sharp nerve pain subsided completely.',
    text: 'I had been struggling with excruciating lower back pain that radiated down my right leg for over 8 months. Healer Abdul Mallik did a thorough assessment and started the A.M.M protocol. By the 4th session, the sharp nerve pain subsided completely.',
    reviewTimestamp: new Date().toISOString(),
    source: 'GOOGLE',
    location: 'Mehdipatnam, Hyderabad',
    status: 'PUBLISHED',
    isApproved: true,
    isPublishedOnWebsite: true,
    isFeatured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grev_2',
    googleReviewId: 'ChZDSUhNMG9nS0VJQ0FnSUNkLXF2aWFnEAF',
    reviewerName: 'Syed K.',
    authorName: 'Syed K.',
    starRating: 5,
    rating: 5,
    comment: 'Healer Abdul Mallik is extremely experienced. You can clearly feel his 25 years of practice in the way he examines the spine. His gentle adjustments relieved morning stiffness in my neck.',
    text: 'Healer Abdul Mallik is extremely experienced. You can clearly feel his 25 years of practice in the way he examines the spine. His gentle adjustments relieved morning stiffness in my neck.',
    reviewTimestamp: new Date().toISOString(),
    source: 'GOOGLE',
    location: 'Banjara Hills, Hyderabad',
    status: 'PUBLISHED',
    isApproved: true,
    isPublishedOnWebsite: true,
    isFeatured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grev_3',
    googleReviewId: 'ChZDSUhNMG9nS0VJQ0FnSUNkLXF2aWFnEAG',
    reviewerName: 'P. Venkat',
    authorName: 'P. Venkat',
    starRating: 5,
    rating: 5,
    comment: 'Could not lift my left arm above shoulder level. The combination of cupping therapy followed by joint mobilization worked wonders. My range of motion improved by over 80%.',
    text: 'Could not lift my left arm above shoulder level. The combination of cupping therapy followed by joint mobilization worked wonders. My range of motion improved by over 80%.',
    reviewTimestamp: new Date().toISOString(),
    source: 'GOOGLE',
    location: 'Tolichowki, Hyderabad',
    status: 'PUBLISHED',
    isApproved: true,
    isPublishedOnWebsite: true,
    isFeatured: true,
    createdAt: new Date().toISOString(),
  },
];

function getDefaultDbSchema() {
  return {
    users: DEFAULT_USERS,
    clinicSettings: INITIAL_CLINIC_SETTINGS,
    patients: DEFAULT_PATIENTS,
    appointments: DEFAULT_APPOINTMENTS,
    reminders: [],
    emailLogs: [],
    mediaAssets: [],
    leads: DEFAULT_LEADS,
    bookingSlots: [],
    cmsServices: DEFAULT_CMS_SERVICES,
    cmsConditions: DEFAULT_CMS_CONDITIONS,
    cmsFaqs: DEFAULT_CMS_FAQS,
    cmsTeam: [],
    offers: DEFAULT_OFFERS,
    googleReviews: DEFAULT_GOOGLE_REVIEWS,
    notifications: [],
    auditLogs: [],
    counters: [],
  };
}

class PersistentDb {
  constructor() {
    this.ensureDirectory();
    this.data = this.loadData();
  }

  ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (!parsed.users || parsed.users.length === 0) {
          parsed.users = DEFAULT_USERS;
        }
        if (!parsed.patients || parsed.patients.length === 0) {
          parsed.patients = DEFAULT_PATIENTS;
        }
        if (!parsed.appointments || parsed.appointments.length === 0) {
          parsed.appointments = DEFAULT_APPOINTMENTS;
        }
        if (!parsed.leads || parsed.leads.length === 0) {
          parsed.leads = DEFAULT_LEADS;
        }
        if (!parsed.cmsServices || parsed.cmsServices.length === 0) {
          parsed.cmsServices = DEFAULT_CMS_SERVICES;
        }
        if (!parsed.cmsConditions || parsed.cmsConditions.length === 0) {
          parsed.cmsConditions = DEFAULT_CMS_CONDITIONS;
        }
        if (!parsed.cmsFaqs || parsed.cmsFaqs.length === 0) {
          parsed.cmsFaqs = DEFAULT_CMS_FAQS;
        }
        if (!parsed.offers || parsed.offers.length === 0) {
          parsed.offers = DEFAULT_OFFERS;
        }
        if (!parsed.googleReviews || parsed.googleReviews.length === 0) {
          parsed.googleReviews = DEFAULT_GOOGLE_REVIEWS;
        }
        return { ...getDefaultDbSchema(), ...parsed };
      }
    } catch (e) {
      console.error('[DB] Failed to parse db.json, creating fresh schema', e);
    }
    const fresh = getDefaultDbSchema();
    this.saveData(fresh);
    return fresh;
  }

  saveData(data = this.data) {
    try {
      this.ensureDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      if (e.code !== 'EROFS') {
        console.error('[DB] Failed to save database file', e.message);
      }
    }
  }

  get(table) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    return this.data[table];
  }

  set(table, items) {
    this.data[table] = items;
    this.saveData();
    return items;
  }

  find(table, predicate) {
    const items = this.get(table);
    return items.find(predicate) || null;
  }

  filter(table, predicate) {
    const items = this.get(table);
    return items.filter(predicate);
  }

  insert(table, item) {
    const items = this.get(table);
    items.unshift(item);
    this.saveData();
    return item;
  }

  update(table, id, updates) {
    const items = this.get(table);
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveData();
    return items[index];
  }

  delete(table, id) {
    const items = this.get(table);
    const filtered = items.filter(i => i.id !== id);
    this.data[table] = filtered;
    this.saveData();
    return true;
  }

  remove(table, id) {
    return this.delete(table, id);
  }
}

export const db = new PersistentDb();