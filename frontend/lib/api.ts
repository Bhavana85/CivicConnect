/**
 * CivicConnect — Local Storage Backend (Prototype Mode)
 * 
 * This replaces all backend API calls with localStorage-based operations.
 * No backend server needed — everything runs in the browser.
 */

// Prototype mode — no bcrypt needed, passwords stored as plain text

// ── Types ───────────────────────────────────────────────────────────────────
export type ReportStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export interface ReportStatusHistory {
  id: number | string;
  report_id: number | string;
  old_status: string | null;
  new_status: ReportStatus | string;
  remark?: string | null;
  changed_by?: string;
  changed_by_role: string;
  changed_at: string;
}

export const VALID_WORKFLOW_STATUSES: ReportStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
];

export const VALID_WORKFLOW_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['UNDER_REVIEW', 'IN_PROGRESS'], // Allow reopening
  REJECTED: ['UNDER_REVIEW'], // Allow appeal/correction
};

export function normalizeStatus(status?: string): string {
  if (!status) return 'SUBMITTED';
  const s = status.toUpperCase();
  if (s === 'PENDING') return 'SUBMITTED';
  return s;
}

export function getAvailableTransitions(currentStatus: string, role?: string): string[] {
  const norm = normalizeStatus(currentStatus);
  return VALID_WORKFLOW_TRANSITIONS[norm] || [];
}

// ── Priority Definitions ───────────────────────────────────────────────────
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const VALID_PRIORITIES: ComplaintPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

export const PRIORITY_CONFIG: Record<
  ComplaintPriority,
  { label: string; color: string; bg: string; border: string }
> = {
  CRITICAL: { label: 'Critical', color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
  HIGH:     { label: 'High',     color: '#c2410c', bg: '#ffedd5', border: '#fed7aa' },
  MEDIUM:   { label: 'Medium',   color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  LOW:      { label: 'Low',      color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
};

export function computeDefaultPriority(category: string, title = '', description = ''): ComplaintPriority {
  const text = `${title} ${description}`.toLowerCase();

  // 1. Critical triggers: life-threatening, emergency, public safety hazard, live wire, open manhole, collapse
  if (
    text.includes('emergency') ||
    text.includes('life threatening') ||
    text.includes('public safety') ||
    text.includes('gas leak') ||
    text.includes('live wire') ||
    text.includes('open manhole') ||
    text.includes('collapse') ||
    text.includes('fatal')
  ) {
    return 'CRITICAL';
  }

  // 2. High triggers: major water leak/pipeline burst, dangerous road damage, severe, contamination, flooding
  if (
    text.includes('major leak') ||
    text.includes('pipe burst') ||
    text.includes('pipeline burst') ||
    text.includes('dangerous') ||
    text.includes('accident') ||
    text.includes('deep pothole') ||
    text.includes('flooding') ||
    text.includes('cave-in') ||
    text.includes('severe') ||
    category === 'sewage'
  ) {
    return 'HIGH';
  }

  // 3. Low triggers: cosmetic, beautification, minor park maintenance, paint, gardening
  if (
    text.includes('minor') ||
    text.includes('beautification') ||
    text.includes('park bench') ||
    text.includes('paint') ||
    text.includes('gardening') ||
    text.includes('cosmetic')
  ) {
    return 'LOW';
  }

  // 4. Category-based sensible baseline
  if (category === 'water' && (text.includes('leak') || text.includes('no water'))) {
    return 'HIGH';
  }

  return 'MEDIUM';
}

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  ward_number: number | null;
  preferred_lang: string;
  is_verified: boolean;
  role: string;
  created_at: string;
}

export interface Report {
  id: number;
  user_id: number;
  category: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  address_text: string;
  ward_number: number | null;
  status: ReportStatus | string;
  priority?: ComplaintPriority | string;
  assigned_to?: string | null;
  department?: string | null;
  upvotes: number;
  photo_url: string | null;
  after_photo_url: string | null;
  resolved_at?: string | null;
  reporter_name: string;
  is_verified: boolean;
  report_count: number;
  status_history?: ReportStatusHistory[];
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: number;
  report_id: number;
  user_id: number;
  body: string;
  author_name: string;
  created_at: string;
}

interface ForumPost {
  id: number;
  user_id: number;
  title: string | null;
  body: string;
  ward_number: number | null;
  parent_id: number | null;
  upvotes: number;
  is_pinned: boolean;
  is_deleted: boolean;
  author_name: string;
  reply_count: number;
  created_at: string;
}

interface Alert {
  id: number;
  alert_type: string;
  title_en: string;
  title_kn: string;
  body_en: string;
  body_kn: string;
  severity: string;
  is_active: boolean;
  ward_numbers: number[] | null;
  expires_at: string | null;
  created_at: string;
}

interface BudgetItem {
  id: number;
  department: string;
  allocated_amount: number;
  spent_amount: number;
  fiscal_year: number;
}

// ── Storage Helpers ─────────────────────────────────────────────────────────
function getStore<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`cc_store_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setStore<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`cc_store_${key}`, JSON.stringify(data));
}

function getNextId(): number {
  if (typeof window === 'undefined') return 1;
  const id = parseInt(localStorage.getItem('cc_next_id') || '100') + 1;
  localStorage.setItem('cc_next_id', id.toString());
  return id;
}

// ── Seed Data ───────────────────────────────────────────────────────────────
const SEED_USERS: User[] = [
  { id: 1, full_name: 'Admin User', email: 'admin@civicconnect.gov', phone: '+919000000001', password_hash: 'admin123', ward_number: null, preferred_lang: 'en', is_verified: true, role: 'admin', created_at: new Date().toISOString() },
  { id: 2, full_name: 'Demo Citizen', email: 'citizen@example.com', phone: '+919000000002', password_hash: 'citizen123', ward_number: 73, preferred_lang: 'en', is_verified: true, role: 'citizen', created_at: new Date().toISOString() },
  { id: 3, full_name: 'Ward 73 Officer', email: 'gov73@bbmp.gov.in', phone: '+919000000003', password_hash: 'gov123', ward_number: 73, preferred_lang: 'en', is_verified: true, role: 'government', created_at: new Date().toISOString() },
];

const SEED_REPORTS: Report[] = [
  { id: 10, user_id: 2, category: 'pothole', title: 'Pothole on MG Road', description: 'Massive pothole causing traffic slowdowns and danger to two-wheelers. Located right at the bus stop making it extremely hazardous during monsoon.', lat: 12.9716, lng: 77.5946, address_text: 'MG Road, near Metro Station', ward_number: 73, status: 'RESOLVED', priority: 'HIGH', upvotes: 12, photo_url: 'https://images.unsplash.com/photo-1594818898109-44704f1098e3?auto=format&fit=crop&w=800&q=80', after_photo_url: 'https://images.unsplash.com/photo-1581092160607-ee67df30d0fd?auto=format&fit=crop&w=800&q=80', reporter_name: 'Demo Citizen', is_verified: true, report_count: 5, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: 11, user_id: 2, category: 'streetlight', title: 'Broken Streetlight on 12th Main', description: 'Streetlight has been out for 3 days. The entire stretch is pitch dark at night, making it unsafe for pedestrians and cyclists.', lat: 12.9784, lng: 77.6408, address_text: '12th Main, Indiranagar', ward_number: 73, status: 'SUBMITTED', priority: 'MEDIUM', upvotes: 4, photo_url: 'https://images.unsplash.com/photo-1617953141700-ace986f13467?auto=format&fit=crop&w=800&q=80', after_photo_url: null, reporter_name: 'Demo Citizen', is_verified: true, report_count: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 12, user_id: 2, category: 'garbage', title: 'Garbage pileup near Cubbon Park', description: 'Large garbage pile has accumulated near the Cubbon Park entrance. Foul smell affecting nearby shops and pedestrians. Needs urgent cleanup.', lat: 12.9763, lng: 77.5929, address_text: 'Cubbon Park, North Gate', ward_number: 42, status: 'IN_PROGRESS', priority: 'MEDIUM', upvotes: 8, photo_url: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?auto=format&fit=crop&w=800&q=80', after_photo_url: null, reporter_name: 'Priya Sharma', is_verified: true, report_count: 3, created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date().toISOString() },
  { id: 13, user_id: 2, category: 'water', title: 'Water pipeline leak on CMH Road', description: 'A major water pipeline is leaking continuously for the past 2 days. Thousands of litres of water wasted daily. Road is waterlogged and slippery.', lat: 12.9750, lng: 77.6150, address_text: 'CMH Road, near Old Airport Road junction', ward_number: 73, status: 'SUBMITTED', priority: 'HIGH', upvotes: 15, photo_url: 'https://images.unsplash.com/photo-1583245177184-4ab53e73e26c?auto=format&fit=crop&w=800&q=80', after_photo_url: null, reporter_name: 'Ramesh K.', is_verified: true, report_count: 7, created_at: new Date(Date.now() - 43200000).toISOString(), updated_at: new Date().toISOString() },
  { id: 14, user_id: 2, category: 'sewage', title: 'Overflowing drain at Domlur', description: 'The storm water drain at Domlur flyover junction is blocked and overflowing. Sewage water is flooding the main road during every rain.', lat: 12.9610, lng: 77.6387, address_text: 'Domlur Flyover Junction', ward_number: 73, status: 'IN_PROGRESS', priority: 'HIGH', upvotes: 22, photo_url: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80', after_photo_url: null, reporter_name: 'Ananya R.', is_verified: true, report_count: 4, created_at: new Date(Date.now() - 259200000).toISOString(), updated_at: new Date().toISOString() },
  { id: 15, user_id: 2, category: 'pothole', title: 'Road cave-in near HSR Layout', description: 'A section of road has caved in near the HSR Layout signal. Multiple vehicles have been damaged. Barricades are missing.', lat: 12.9122, lng: 77.6472, address_text: 'Sector 7, HSR Layout', ward_number: 150, status: 'SUBMITTED', priority: 'CRITICAL', upvotes: 31, photo_url: 'https://images.unsplash.com/photo-1611348586804-61bf6c080437?auto=format&fit=crop&w=800&q=80', after_photo_url: null, reporter_name: 'Vikram Patel', is_verified: true, report_count: 9, created_at: new Date(Date.now() - 345600000).toISOString(), updated_at: new Date().toISOString() },
  { id: 16, user_id: 2, category: 'garbage', title: 'Construction debris dumped illegally', description: 'Construction waste and debris have been illegally dumped on the footpath near Koramangala Water Tank. Blocking pedestrian access entirely.', lat: 12.9352, lng: 77.6270, address_text: '8th Block, Koramangala', ward_number: 68, status: 'SUBMITTED', priority: 'LOW', upvotes: 6, photo_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80', after_photo_url: null, reporter_name: 'Meera N.', is_verified: true, report_count: 2, created_at: new Date(Date.now() - 518400000).toISOString(), updated_at: new Date().toISOString() },
  { id: 17, user_id: 2, category: 'streetlight', title: 'Flickering lights on Outer Ring Road', description: 'Multiple streetlights are flickering on the ORR stretch between Marathahalli and Bellandur. Creates hazardous driving conditions at night.', lat: 12.9560, lng: 77.7010, address_text: 'Outer Ring Road, Marathahalli', ward_number: 150, status: 'RESOLVED', priority: 'MEDIUM', upvotes: 18, photo_url: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=800&q=80', after_photo_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=800&q=80', reporter_name: 'Suresh M.', is_verified: true, report_count: 3, created_at: new Date(Date.now() - 604800000).toISOString(), updated_at: new Date().toISOString() },
];

const SEED_STATUS_HISTORY: ReportStatusHistory[] = [
  { id: 1, report_id: 10, old_status: null, new_status: 'SUBMITTED', remark: 'Initial citizen complaint', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 2, report_id: 10, old_status: 'SUBMITTED', new_status: 'UNDER_REVIEW', remark: 'Reviewed by Indiranagar ward office', changed_by_role: 'government', changed_at: new Date(Date.now() - 72000000).toISOString() },
  { id: 3, report_id: 10, old_status: 'UNDER_REVIEW', new_status: 'VERIFIED', remark: 'Pothole verified on site', changed_by_role: 'admin', changed_at: new Date(Date.now() - 60000000).toISOString() },
  { id: 4, report_id: 10, old_status: 'VERIFIED', new_status: 'ASSIGNED', remark: 'Assigned to BBMP Road Infrastructure Team', changed_by_role: 'admin', changed_at: new Date(Date.now() - 48000000).toISOString() },
  { id: 5, report_id: 10, old_status: 'ASSIGNED', new_status: 'IN_PROGRESS', remark: 'Road crew filling pothole', changed_by_role: 'government', changed_at: new Date(Date.now() - 24000000).toISOString() },
  { id: 6, report_id: 10, old_status: 'IN_PROGRESS', new_status: 'RESOLVED', remark: 'Asphalt resurfacing complete with photo evidence', changed_by_role: 'government', changed_at: new Date().toISOString() },

  { id: 7, report_id: 11, old_status: null, new_status: 'SUBMITTED', remark: 'Complaint submitted by citizen', changed_by_role: 'citizen', changed_at: new Date().toISOString() },

  { id: 8, report_id: 12, old_status: null, new_status: 'SUBMITTED', remark: 'Garbage reported near Cubbon Park', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 9, report_id: 12, old_status: 'SUBMITTED', new_status: 'UNDER_REVIEW', remark: 'Dispatched health officer to inspect', changed_by_role: 'admin', changed_at: new Date(Date.now() - 150000000).toISOString() },
  { id: 10, report_id: 12, old_status: 'UNDER_REVIEW', new_status: 'VERIFIED', remark: 'Verified illegal waste dumping', changed_by_role: 'admin', changed_at: new Date(Date.now() - 120000000).toISOString() },
  { id: 11, report_id: 12, old_status: 'VERIFIED', new_status: 'ASSIGNED', remark: 'Assigned to Solid Waste Sanitation Truck #4', changed_by_role: 'government', changed_at: new Date(Date.now() - 90000000).toISOString() },
  { id: 12, report_id: 12, old_status: 'ASSIGNED', new_status: 'IN_PROGRESS', remark: 'Truck on site clearing garbage', changed_by_role: 'government', changed_at: new Date(Date.now() - 40000000).toISOString() },

  { id: 13, report_id: 13, old_status: null, new_status: 'SUBMITTED', remark: 'Citizen report of pipeline leak', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 43200000).toISOString() },

  { id: 14, report_id: 14, old_status: null, new_status: 'SUBMITTED', remark: 'Overflowing drain at Domlur reported', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 259200000).toISOString() },
  { id: 15, report_id: 14, old_status: 'SUBMITTED', new_status: 'UNDER_REVIEW', remark: 'Reviewed by BWSSB engineer', changed_by_role: 'admin', changed_at: new Date(Date.now() - 200000000).toISOString() },
  { id: 16, report_id: 14, old_status: 'UNDER_REVIEW', new_status: 'VERIFIED', remark: 'Drain blockage confirmed', changed_by_role: 'admin', changed_at: new Date(Date.now() - 160000000).toISOString() },
  { id: 17, report_id: 14, old_status: 'VERIFIED', new_status: 'ASSIGNED', remark: 'Assigned to stormwater desilting unit', changed_by_role: 'government', changed_at: new Date(Date.now() - 100000000).toISOString() },
  { id: 18, report_id: 14, old_status: 'ASSIGNED', new_status: 'IN_PROGRESS', remark: 'Desilting machinery in operation', changed_by_role: 'government', changed_at: new Date(Date.now() - 30000000).toISOString() },

  { id: 19, report_id: 15, old_status: null, new_status: 'SUBMITTED', remark: 'Road cave-in reported', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 345600000).toISOString() },
  { id: 20, report_id: 16, old_status: null, new_status: 'SUBMITTED', remark: 'Debris dumping reported', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 518400000).toISOString() },
  { id: 21, report_id: 17, old_status: null, new_status: 'SUBMITTED', remark: 'Streetlight flickering reported', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 604800000).toISOString() },
  { id: 22, report_id: 17, old_status: 'SUBMITTED', new_status: 'UNDER_REVIEW', remark: 'Reviewing circuit faults', changed_by_role: 'government', changed_at: new Date(Date.now() - 500000000).toISOString() },
  { id: 23, report_id: 17, old_status: 'UNDER_REVIEW', new_status: 'VERIFIED', remark: 'Fault verified', changed_by_role: 'admin', changed_at: new Date(Date.now() - 400000000).toISOString() },
  { id: 24, report_id: 17, old_status: 'VERIFIED', new_status: 'ASSIGNED', remark: 'Assigned to BESCOM maintenance', changed_by_role: 'government', changed_at: new Date(Date.now() - 300000000).toISOString() },
  { id: 25, report_id: 17, old_status: 'ASSIGNED', new_status: 'IN_PROGRESS', remark: 'Transformer repairs ongoing', changed_by_role: 'government', changed_at: new Date(Date.now() - 200000000).toISOString() },
  { id: 26, report_id: 17, old_status: 'IN_PROGRESS', new_status: 'RESOLVED', remark: 'New LED light fitted and tested', changed_by_role: 'government', changed_at: new Date(Date.now() - 100000000).toISOString() },
];

const SEED_FORUM: ForumPost[] = [
  { id: 20, user_id: 2, title: 'Water supply issues in Ward 73', body: 'Has anyone else experienced low water pressure this week? It\'s been happening every morning from 6-9 AM.', ward_number: 73, parent_id: null, upvotes: 8, is_pinned: false, is_deleted: false, author_name: 'Demo Citizen', reply_count: 3, created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 21, user_id: 2, title: 'New park development proposal', body: 'BBMP has proposed a new park near the Indiranagar metro. What does the community think?', ward_number: 73, parent_id: null, upvotes: 15, is_pinned: false, is_deleted: false, author_name: 'Demo Citizen', reply_count: 7, created_at: new Date(Date.now() - 345600000).toISOString() },
  { id: 22, user_id: 2, title: 'Garbage Collection in Ward 42', body: 'The collection trucks haven\'t come to 3rd Cross for two days now.', ward_number: 42, parent_id: null, upvotes: 12, is_pinned: false, is_deleted: false, author_name: 'Resident 42', reply_count: 2, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 23, user_id: 2, title: 'Ward 42 Neighborhood Watch', body: 'We are organizing a night patrol volunteer group. Please reply here if interested.', ward_number: 42, parent_id: null, upvotes: 25, is_pinned: true, is_deleted: false, author_name: 'Resident 42', reply_count: 15, created_at: new Date(Date.now() - 500000000).toISOString() },
  { id: 24, user_id: 2, title: 'Traffic signal at Ward 150 junction', body: 'The new signal is causing more traffic jams than before. Can we petition to adjust the timings?', ward_number: 150, parent_id: null, upvotes: 42, is_pinned: false, is_deleted: false, author_name: 'Citizen 150', reply_count: 11, created_at: new Date(Date.now() - 432000000).toISOString() },
];

const SEED_ALERTS: Alert[] = [
  { id: 30, alert_type: 'road_closure', title_en: 'Road Closure: MG Road', title_kn: 'ರಸ್ತೆ ಮುಚ್ಚಿದೆ: ಎಂ.ಜಿ. ರಸ್ತೆ', body_en: 'MG Road between Trinity Circle and Halasuru Gate is closed for metro rail work from April 18–25, 2026. Use Residency Road as alternate route.', body_kn: 'ಏಪ್ರಿಲ್ 18–25, 2026 ರ ತನಕ ಮೆಟ್ರೋ ಕೆಲಸಕ್ಕಾಗಿ ಟ್ರಿನಿಟಿ ಸರ್ಕಲ್ ಮತ್ತು ಹಲಸೂರು ಗೇಟ್ ನಡುವಿನ ಎಂ.ಜಿ. ರಸ್ತೆ ಮುಚ್ಚಲಾಗಿದೆ.', severity: 'warning', is_active: true, ward_numbers: [42, 43, 44], expires_at: '2026-04-25T00:00:00Z', created_at: new Date().toISOString() },
  { id: 31, alert_type: 'weather', title_en: 'Heavy Rain Advisory', title_kn: 'ಭಾರಿ ಮಳೆ ಎಚ್ಚರಿಕೆ', body_en: 'IMD has issued a Yellow Alert for heavy rainfall in Bengaluru. Citizens are advised to avoid low-lying areas and subways.', body_kn: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಭಾರಿ ಮಳೆಗಾಗಿ IMD ಹಳದಿ ಎಚ್ಚರಿಕೆ ನೀಡಿದೆ. ನಾಗರಿಕರು ತಗ್ಗು ಪ್ರದೇಶಗಳನ್ನು ತಪ್ಪಿಸಬೇಕು.', severity: 'warning', is_active: true, ward_numbers: null, expires_at: '2026-04-19T00:00:00Z', created_at: new Date().toISOString() },
  { id: 32, alert_type: 'event', title_en: 'Rajyotsava Parade — Road Restrictions', title_kn: 'ರಾಜ್ಯೋತ್ಸವ ಮೆರವಣಿಗೆ — ರಸ್ತೆ ನಿರ್ಬಂಧ', body_en: 'Several roads around Vidhana Soudha will have restricted access on November 1 from 8 AM to 2 PM.', body_kn: 'ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ ಮೆರವಣಿಗೆಗಾಗಿ ನವೆಂಬರ್ 1 ರಂದು ವಿಧಾನ ಸೌಧ ಸುತ್ತ ರಸ್ತೆ ನಿರ್ಬಂಧ.', severity: 'info', is_active: true, ward_numbers: [1, 2, 3], expires_at: '2026-11-01T00:00:00Z', created_at: new Date().toISOString() },
];

const SEED_BUDGET: BudgetItem[] = [
  { id: 1, department: 'Roads & Infrastructure', allocated_amount: 1350000000, spent_amount: 824000000, fiscal_year: 2024 },
  { id: 2, department: 'Water Supply', allocated_amount: 500000000, spent_amount: 434000000, fiscal_year: 2024 },
  { id: 3, department: 'Solid Waste', allocated_amount: 360000000, spent_amount: 286000000, fiscal_year: 2024 },
  { id: 4, department: 'Street Lighting', allocated_amount: 150000000, spent_amount: 120000000, fiscal_year: 2024 },
  { id: 5, department: 'Parks & Recreation', allocated_amount: 170000000, spent_amount: 130000000, fiscal_year: 2024 },
  { id: 6, department: 'Health & Sanitation', allocated_amount: 215000000, spent_amount: 180000000, fiscal_year: 2024 },
];

// ── Initialize Store ────────────────────────────────────────────────────────
const STORE_VERSION = '12'; // Increment to force re-seed for priority support

function initStore() {
  if (typeof window === 'undefined') return;
  const currentVersion = localStorage.getItem('cc_store_version');
  if (currentVersion !== STORE_VERSION) {
    // Clear old data and re-seed
    setStore('users', SEED_USERS);
    setStore('reports', SEED_REPORTS);
    setStore('status_history', SEED_STATUS_HISTORY);
    setStore('forum_posts', SEED_FORUM);
    setStore('alerts', SEED_ALERTS);
    setStore('budget', SEED_BUDGET);
    setStore('comments', []);
    localStorage.setItem('cc_next_id', '100');
    localStorage.setItem('cc_store_version', STORE_VERSION);
    localStorage.removeItem('cc_store_initialized');
    console.log('📦 CivicConnect prototype store initialized (v' + STORE_VERSION + ')');
  } else {
    // Ensure status_history exists
    const history = getStore<ReportStatusHistory>('status_history', []);
    if (!history || history.length === 0) {
      setStore('status_history', SEED_STATUS_HISTORY);
    }
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') initStore();

// ── Simulated JWT ───────────────────────────────────────────────────────────
function makeToken(user: User): string {
  // Simple base64 token for prototype
  const payload = { id: user.id, role: user.role, is_verified: user.is_verified, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  return btoa(JSON.stringify(payload));
}

function parseToken(): { id: number; role: string; is_verified: boolean } | null {
  try {
    const token = localStorage.getItem('cc_token');
    if (!token) return null;
    return JSON.parse(atob(token));
  } catch { return null; }
}

// ── Auth API ────────────────────────────────────────────────────────────────
export async function login(data: { identifier: string; password: string; roleType?: string }) {
  initStore();
  const users = getStore<User>('users', SEED_USERS);
  const { identifier, password, roleType = 'citizen' } = data;

  let user: User | undefined;
  const cleanIdentifier = identifier.trim().toLowerCase();
  
  if (roleType === 'citizen') {
    user = users.find(u => u.email.toLowerCase() === cleanIdentifier && u.role === 'citizen');
  } else if (roleType === 'government') {
    const ward = parseInt(identifier.trim()) || 0;
    user = users.find(u => u.ward_number === ward && u.role === 'government');
  } else if (roleType === 'admin') {
    const isAdminAlias = cleanIdentifier === 'admin';
    user = users.find(u => (u.email.toLowerCase() === cleanIdentifier || (isAdminAlias && u.email === 'admin@civicconnect.gov')) && u.role === 'admin');
  }

  if (!user) {
    throw { response: { data: { error: 'Invalid credentials. User not found.' }, status: 401 } };
  }

  // Simple plain-text password comparison for prototype
  const isValid = (password === user.password_hash);

  if (!isValid) {
    throw { response: { data: { error: 'Invalid credentials. Wrong password.' }, status: 401 } };
  }

  const token = makeToken(user);
  const { password_hash: _, ...userPublic } = user;
  return { data: { user: userPublic, token } };
}

export async function register(data: { full_name: string; email: string; phone: string; password: string }) {
  initStore();
  const users = getStore<User>('users', SEED_USERS);
  const { full_name, email, phone, password } = data;

  if (!full_name || !email || !phone || !password) {
    throw { response: { data: { error: 'All fields are required.' }, status: 400 } };
  }

  if (users.find(u => u.email === email)) {
    throw { response: { data: { error: 'Email already registered.' }, status: 409 } };
  }

  const id = getNextId();
  const user: User = {
    id, full_name, email, phone, password_hash: password,
    ward_number: null, preferred_lang: 'en',
    is_verified: false, role: 'citizen', created_at: new Date().toISOString(),
  };
  users.push(user);
  setStore('users', users);

  const token = makeToken(user);
  const { password_hash: _, ...userPublic } = user;
  return { data: { user: userPublic, token } };
}

export async function getUsers() {
  initStore();
  const tokenData = parseToken();
  if (!tokenData || tokenData.role !== 'admin') {
    throw { response: { data: { error: 'Unauthorized.' }, status: 403 } };
  }
  const users = getStore<User>('users', SEED_USERS);
  // Do not send passwords to the frontend
  const safeUsers = users.map(u => {
    const { password_hash, ...safe } = u;
    return safe;
  });
  return { data: { users: safeUsers } };
}

export async function deleteUser(id: number) {
  initStore();
  const tokenData = parseToken();
  if (!tokenData || tokenData.role !== 'admin') {
    throw { response: { data: { error: 'Unauthorized.' }, status: 403 } };
  }
  let users = getStore<User>('users', SEED_USERS);
  users = users.filter(u => u.id !== id);
  setStore('users', users);
  return { data: { success: true } };
}

// ── Reports API ─────────────────────────────────────────────────────────────
export async function getReports(params?: Record<string, string>) {
  initStore();
  let reports = getStore<Report>('reports', SEED_REPORTS);
  const history = getStore<ReportStatusHistory>('status_history', SEED_STATUS_HISTORY);
  const tokenData = parseToken();

  // Normalize statuses and attach history
  reports = reports.map(r => {
    const rHistory = history
      .filter(h => String(h.report_id) === String(r.id))
      .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
    return {
      ...r,
      status: normalizeStatus(r.status),
      status_history: rHistory,
    };
  });

  // Filter based on user role
  if (tokenData?.role === 'government') {
    reports = reports.filter(r => r.is_verified === true);
  } else if (tokenData?.role === 'citizen') {
    reports = reports.filter(r => r.is_verified === true || r.user_id === tokenData.id);
  }
  // admin sees all reports

  if (params?.status && params.status !== 'all') {
    const norm = normalizeStatus(params.status);
    reports = reports.filter(r => normalizeStatus(r.status) === norm);
  }
  if (params?.category && params.category !== 'all') {
    reports = reports.filter(r => r.category === params.category);
  }
  if (params?.priority && params.priority !== 'all') {
    const pUpper = params.priority.toUpperCase();
    reports = reports.filter(r => (r.priority || 'MEDIUM').toUpperCase() === pUpper);
  }

  if (params?.sort === 'priority') {
    reports.sort((a, b) => {
      const orderA = PRIORITY_ORDER[(a.priority || 'MEDIUM').toUpperCase()] || 3;
      const orderB = PRIORITY_ORDER[(b.priority || 'MEDIUM').toUpperCase()] || 3;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  } else if (params?.sort === 'support') {
    reports.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
  } else {
    reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  return { data: { reports, total: reports.length, page: 1, limit: 20 } };
}

export async function getReportById(id: string | number) {
  initStore();
  const reports = getStore<Report>('reports', SEED_REPORTS);
  const history = getStore<ReportStatusHistory>('status_history', SEED_STATUS_HISTORY);
  const report = reports.find(r => String(r.id) === String(id));
  if (!report) throw { response: { data: { error: 'Report not found.' }, status: 404 } };
  
  const rHistory = history
    .filter(h => String(h.report_id) === String(id))
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

  return {
    data: {
      report: {
        ...report,
        status: normalizeStatus(report.status),
        status_history: rHistory,
      },
    },
  };
}

export async function getReportStatusHistory(reportId: string | number) {
  initStore();
  const history = getStore<ReportStatusHistory>('status_history', SEED_STATUS_HISTORY);
  const filtered = history
    .filter(h => String(h.report_id) === String(reportId))
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
  return { data: { history: filtered } };
}

export async function createReport(data: { category: string; title: string; description?: string; lat: number; lng: number; address_text?: string; ward_number?: number; photo_url?: string; priority?: string }) {
  initStore();
  const tokenData = parseToken();
  if (!tokenData) throw { response: { data: { error: 'Please login first.' }, status: 401 } };

  const reports = getStore<Report>('reports', SEED_REPORTS);
  const history = getStore<ReportStatusHistory>('status_history', SEED_STATUS_HISTORY);
  
  // Proximity clustering logic: Check for unverified reports of same category within ~100m
  const PROXIMITY_THRESHOLD = 0.001; // Roughly 100 meters
  const existingReport = reports.find(r => 
    !r.is_verified && 
    r.status !== 'REJECTED' &&
    r.category === data.category && 
    Math.abs(r.lat - data.lat) < PROXIMITY_THRESHOLD && 
    Math.abs(r.lng - data.lng) < PROXIMITY_THRESHOLD
  );

  if (existingReport) {
    existingReport.report_count = (existingReport.report_count || 1) + 1;
    setStore('reports', reports);
    return { data: { report: existingReport, is_duplicate: true } };
  }

  // Determine priority: computed default for citizens; allowed override for admin/government
  let assignedPriority = computeDefaultPriority(data.category, data.title, data.description);
  if (tokenData && (tokenData.role === 'admin' || tokenData.role === 'government') && data.priority) {
    const reqP = String(data.priority).toUpperCase() as ComplaintPriority;
    if (VALID_PRIORITIES.includes(reqP)) {
      assignedPriority = reqP;
    }
  }

  const users = getStore<User>('users', SEED_USERS);
  const user = users.find(u => u.id === tokenData.id);
  const id = getNextId();
  const now = new Date().toISOString();
  const report: Report = {
    id, user_id: tokenData.id, category: data.category, title: data.title,
    description: data.description || '', lat: data.lat, lng: data.lng,
    address_text: data.address_text || '', ward_number: data.ward_number || null,
    status: 'SUBMITTED', priority: assignedPriority, upvotes: 0, photo_url: data.photo_url || null, after_photo_url: null,
    reporter_name: user?.full_name || 'Citizen', is_verified: false, report_count: 1,
    created_at: now, updated_at: now,
  };
  reports.push(report);
  setStore('reports', reports);

  // Record initial status history
  const historyEntry: ReportStatusHistory = {
    id: getNextId(),
    report_id: id,
    old_status: null,
    new_status: 'SUBMITTED',
    remark: 'Complaint submitted by citizen',
    changed_by: user?.full_name || 'Citizen',
    changed_by_role: 'citizen',
    changed_at: now,
  };
  history.push(historyEntry);
  setStore('status_history', history);

  return { data: { report: { ...report, status_history: [historyEntry] } } };
}

export async function getNearbyReports(lat: number, lng: number, radius = 2000) {
  return getReports();
}

export async function updateReportStatus(
  id: number,
  status: string,
  remark?: string,
  assigned_to?: string,
  after_photo_url?: string
) {
  initStore();
  const tokenData = parseToken();
  if (!tokenData || (tokenData.role !== 'government' && tokenData.role !== 'admin')) {
    throw { response: { data: { error: 'Only administrators and ward officers can update complaint status.' }, status: 403 } };
  }
  const reports = getStore<Report>('reports', SEED_REPORTS);
  const history = getStore<ReportStatusHistory>('status_history', SEED_STATUS_HISTORY);
  const report = reports.find(r => r.id === id);
  if (!report) {
    throw { response: { data: { error: 'Report not found.' }, status: 404 } };
  }

  const currentStatus = normalizeStatus(report.status);
  const targetStatus = normalizeStatus(status) as ReportStatus;

  if (!VALID_WORKFLOW_STATUSES.includes(targetStatus)) {
    throw { response: { data: { error: `Invalid status '${status}'. Must be one of: ${VALID_WORKFLOW_STATUSES.join(', ')}` }, status: 400 } };
  }

  const allowedTransitions = VALID_WORKFLOW_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(targetStatus)) {
    throw {
      response: {
        data: {
          error: `Cannot transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowedTransitions.join(', ') || 'None'}`
        },
        status: 400
      }
    };
  }

  report.status = targetStatus;
  if (assigned_to !== undefined) report.assigned_to = assigned_to;
  if (after_photo_url !== undefined) report.after_photo_url = after_photo_url;
  report.updated_at = new Date().toISOString();
  if (targetStatus === 'RESOLVED') {
    (report as any).resolved_at = new Date().toISOString();
  }
  setStore('reports', reports);

  // Add history record
  const user = getStore<User>('users', SEED_USERS).find(u => u.id === tokenData.id);
  const historyEntry: ReportStatusHistory = {
    id: getNextId(),
    report_id: id,
    old_status: currentStatus,
    new_status: targetStatus,
    remark: remark || null,
    changed_by: user?.full_name || (tokenData.role === 'admin' ? 'Municipal Administrator' : 'Ward Officer'),
    changed_by_role: tokenData.role,
    changed_at: new Date().toISOString(),
  };
  history.push(historyEntry);
  setStore('status_history', history);

  const updatedHistory = history
    .filter(h => String(h.report_id) === String(id))
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

  return { data: { report: { ...report, status_history: updatedHistory }, history_entry: historyEntry } };
}

export async function updateReportPriority(
  id: number,
  priority: string,
  remark?: string
) {
  initStore();
  const tokenData = parseToken();
  if (!tokenData || (tokenData.role !== 'government' && tokenData.role !== 'admin')) {
    throw { response: { data: { error: 'Only administrators and ward officers can update complaint priority.' }, status: 403 } };
  }
  const targetPriority = String(priority).toUpperCase() as ComplaintPriority;
  if (!VALID_PRIORITIES.includes(targetPriority)) {
    throw { response: { data: { error: `Invalid priority '${priority}'. Priority must be one of: ${VALID_PRIORITIES.join(', ')}` }, status: 400 } };
  }

  const reports = getStore<Report>('reports', SEED_REPORTS);
  const history = getStore<ReportStatusHistory>('status_history', SEED_STATUS_HISTORY);
  const report = reports.find(r => r.id === id);
  if (!report) {
    throw { response: { data: { error: 'Report not found.' }, status: 404 } };
  }

  const oldPriority = report.priority || 'MEDIUM';
  report.priority = targetPriority;
  report.updated_at = new Date().toISOString();
  setStore('reports', reports);

  const user = getStore<User>('users', SEED_USERS).find(u => u.id === tokenData.id);
  const changerName = user?.full_name || (tokenData.role === 'admin' ? 'Municipal Administrator' : 'Ward Officer');
  const auditRemark = `Priority changed from ${oldPriority} to ${targetPriority}${remark ? ': ' + remark : ''}`;
  const historyEntry: ReportStatusHistory = {
    id: getNextId(),
    report_id: id,
    old_status: normalizeStatus(report.status),
    new_status: normalizeStatus(report.status),
    remark: auditRemark,
    changed_by: changerName,
    changed_by_role: tokenData.role,
    changed_at: new Date().toISOString(),
  };
  history.push(historyEntry);
  setStore('status_history', history);

  const updatedHistory = history
    .filter(h => String(h.report_id) === String(id))
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

  return { data: { report: { ...report, status_history: updatedHistory }, history_entry: historyEntry } };
}

export async function verifyReport(id: number, is_valid: boolean, remark?: string) {
  initStore();
  const tokenData = parseToken();
  if (!tokenData || tokenData.role !== 'admin') {
    throw { response: { data: { error: 'Only admins can verify reports.' }, status: 403 } };
  }
  const reports = getStore<Report>('reports', SEED_REPORTS);
  const history = getStore<ReportStatusHistory>('status_history', SEED_STATUS_HISTORY);
  const report = reports.find(r => r.id === id);
  if (!report) {
    throw { response: { data: { error: 'Report not found.' }, status: 404 } };
  }

  const currentStatus = normalizeStatus(report.status);
  const targetStatus: ReportStatus = is_valid ? 'VERIFIED' : 'REJECTED';
  const defaultRemark = is_valid
    ? 'Report verified by administrator as genuine civic issue.'
    : 'Report rejected by administrator as duplicate or invalid.';

  report.status = targetStatus;
  report.is_verified = is_valid;
  report.updated_at = new Date().toISOString();
  setStore('reports', reports);

  const historyEntry: ReportStatusHistory = {
    id: getNextId(),
    report_id: id,
    old_status: currentStatus,
    new_status: targetStatus,
    remark: remark || defaultRemark,
    changed_by: 'Administrator',
    changed_by_role: 'admin',
    changed_at: new Date().toISOString(),
  };
  history.push(historyEntry);
  setStore('status_history', history);

  return { data: { report } };
}

// ── Comments & Likes ────────────────────────────────────────────────────────
export async function getComments(id: string) {
  initStore();
  const comments = getStore<Comment>('comments', []);
  return { data: { comments: comments.filter(c => c.report_id === parseInt(id)) } };
}

export async function addComment(id: string, body: string) {
  initStore();
  const tokenData = parseToken();
  if (!tokenData) throw { response: { data: { error: 'Please login first.' }, status: 401 } };
  const comments = getStore<Comment>('comments', []);
  const users = getStore<User>('users', SEED_USERS);
  const user = users.find(u => u.id === tokenData.id);
  const comment: Comment = {
    id: getNextId(), report_id: parseInt(id), user_id: tokenData.id,
    body, author_name: user?.full_name || 'Citizen', created_at: new Date().toISOString(),
  };
  comments.push(comment);
  setStore('comments', comments);
  return { data: { comment } };
}

export async function likeIssue(id: string) {
  initStore();
  const tokenData = parseToken();
  if (!tokenData) throw { response: { data: { error: 'Please login first.' }, status: 401 } };
  const reports = getStore<Report>('reports', SEED_REPORTS);
  const report = reports.find(r => r.id === parseInt(id));
  if (!report) throw { response: { data: { error: 'Report not found.' }, status: 404 } };
  report.upvotes = (report.upvotes || 0) + 1;
  setStore('reports', reports);
  return { data: { id: report.id, upvotes: report.upvotes } };
}

// ── Budget ──────────────────────────────────────────────────────────────────
export async function getBudget(year = 2024) {
  initStore();
  const items = getStore<BudgetItem>('budget', SEED_BUDGET).filter(b => b.fiscal_year === year);
  return { data: { budget_items: items, fiscal_year: year } };
}

export async function getBudgetSummary(year = 2024) {
  initStore();
  const items = getStore<BudgetItem>('budget', SEED_BUDGET).filter(b => b.fiscal_year === year);
  const departments = items.map(b => ({
    department: b.department,
    total_allocated: b.allocated_amount,
    total_spent: b.spent_amount,
    utilization_pct: Math.round((b.spent_amount / b.allocated_amount) * 1000) / 10,
  }));
  const totals = {
    total_allocated: items.reduce((s, b) => s + b.allocated_amount, 0),
    total_spent: items.reduce((s, b) => s + b.spent_amount, 0),
  };
  return { data: { departments, totals, fiscal_year: year } };
}

export async function getBudgetYears() {
  return { data: { years: [2024] } };
}

export async function updateBudgetItem(id: number, data: { allocated_amount?: number; spent_amount?: number }) {
  initStore();
  const tokenData = parseToken();
  if (!tokenData) throw { response: { data: { error: 'Please login first.' }, status: 401 } };
  if (tokenData.role !== 'government') throw { response: { data: { error: 'Only government users can edit budget data.' }, status: 403 } };
  const items = getStore<BudgetItem>('budget', SEED_BUDGET);
  const item = items.find(b => b.id === id);
  if (!item) throw { response: { data: { error: 'Budget item not found.' }, status: 404 } };
  if (data.allocated_amount !== undefined) item.allocated_amount = data.allocated_amount;
  if (data.spent_amount !== undefined) item.spent_amount = data.spent_amount;
  setStore('budget', items);
  return { data: { item } };
}

// ── Forum ───────────────────────────────────────────────────────────────────
export async function getForumPosts(ward?: number) {
  initStore();
  let posts = getStore<ForumPost>('forum_posts', SEED_FORUM).filter(p => !p.parent_id && !p.is_deleted);
  if (ward) posts = posts.filter(p => p.ward_number === ward);
  posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { data: { posts } };
}

export async function createForumPost(data: { title?: string; body: string; ward_number?: number; parent_id?: number }) {
  initStore();
  const tokenData = parseToken();
  if (!tokenData) throw { response: { data: { error: 'Please login first.' }, status: 401 } };
  const posts = getStore<ForumPost>('forum_posts', SEED_FORUM);
  const users = getStore<User>('users', SEED_USERS);
  const user = users.find(u => u.id === tokenData.id);
  const post: ForumPost = {
    id: getNextId(), user_id: tokenData.id, title: data.title || null, body: data.body,
    ward_number: data.ward_number || null, parent_id: data.parent_id || null,
    upvotes: 0, is_pinned: false, is_deleted: false,
    author_name: user?.full_name || 'Citizen', reply_count: 0, created_at: new Date().toISOString(),
  };
  posts.push(post);
  // Increment parent's reply_count
  if (data.parent_id) {
    const parent = posts.find(p => p.id === data.parent_id);
    if (parent) parent.reply_count = (parent.reply_count || 0) + 1;
  }
  setStore('forum_posts', posts);
  return { data: { post } };
}

export async function getForumReplies(id: string) {
  const posts = getStore<ForumPost>('forum_posts', SEED_FORUM);
  return { data: { replies: posts.filter(p => p.parent_id === parseInt(id) && !p.is_deleted) } };
}

export async function upvoteForumPost(id: string) {
  initStore();
  const tokenData = parseToken();
  if (!tokenData) throw { response: { data: { error: 'Please login first.' }, status: 401 } };
  const posts = getStore<ForumPost>('forum_posts', SEED_FORUM);
  const post = posts.find(p => p.id === parseInt(id));
  if (post) { post.upvotes = (post.upvotes || 0) + 1; setStore('forum_posts', posts); }
  return { data: { id: parseInt(id), upvotes: post?.upvotes || 0 } };
}

// ── Alerts ──────────────────────────────────────────────────────────────────
export async function getAlerts(ward?: number) {
  initStore();
  let alerts = getStore<Alert>('alerts', SEED_ALERTS).filter(a => a.is_active);
  if (ward) alerts = alerts.filter(a => !a.ward_numbers || a.ward_numbers.includes(ward));
  return { data: { alerts } };
}

// ── OTP (stub) ──────────────────────────────────────────────────────────────
export async function requestOTP(phone: string, ward: number) {
  return { data: { message: 'OTP sent (prototype mode: use 123456)' } };
}

export async function verifyOTP(phone: string, otp: string) {
  if (otp === '123456') {
    return { data: { message: 'Verified!', token: '' } };
  }
  throw { response: { data: { error: 'Invalid OTP' }, status: 400 } };
}

// ── Elections & Volunteers ──────────────────────────────────────────────────
interface Election {
  id: number;
  title: string;
  date: string;
  type: string;
  status: string;
}

interface VolunteerProgram {
  id: number;
  name: string;
  ward: string;
  date: string;
  spots: number;
  icon: string;
}

export interface VolunteerParticipant {
  id: number;
  program_id: number;
  user_id: number;
  user_name: string;
  joined_at: string;
}

const SEED_ELECTIONS: Election[] = [
  { id: 50, title: 'BBMP Council Elections 2025', date: 'December 15, 2025', type: 'Local Body', status: 'Upcoming' },
  { id: 51, title: 'Karnataka Legislative Assembly By-Election', date: 'March 2026', type: 'State', status: 'Tentative' },
];

const SEED_VOLUNTEERS: VolunteerProgram[] = [
  { id: 60, name: 'Road Cleanup Drive', ward: 'Ward 73 – Indiranagar', date: 'Every Sunday, 7–9 AM', spots: 12, icon: '🧹' },
  { id: 61, name: 'Tree Planting Initiative', ward: 'Ward 68 – Koramangala', date: 'April 20, 2026', spots: 30, icon: '🌱' },
  { id: 62, name: 'Senior Citizen Assistance', ward: 'Ward 151 – HSR Layout', date: 'Weekdays, 10 AM–1 PM', spots: 8, icon: '🤝' },
];

// Seed elections & volunteers on first load
function initHubData() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('cc_store_elections')) {
    setStore('elections', SEED_ELECTIONS);
  }
  if (!localStorage.getItem('cc_store_volunteers')) {
    setStore('volunteers', SEED_VOLUNTEERS);
  }
  if (!localStorage.getItem('cc_store_volunteer_participants')) {
    setStore('volunteer_participants', []);
  }
}
if (typeof window !== 'undefined') initHubData();

export async function getElections() {
  initStore(); initHubData();
  return { data: { elections: getStore<Election>('elections', SEED_ELECTIONS) } };
}

export async function createElection(data: Omit<Election, 'id'>) {
  const tokenData = parseToken();
  if (!tokenData || tokenData.role !== 'government') throw { response: { data: { error: 'Only government can manage elections.' }, status: 403 } };
  const items = getStore<Election>('elections', SEED_ELECTIONS);
  const item: Election = { id: getNextId(), ...data };
  items.push(item);
  setStore('elections', items);
  return { data: { election: item } };
}

export async function updateElection(id: number, data: Partial<Omit<Election, 'id'>>) {
  const tokenData = parseToken();
  if (!tokenData || tokenData.role !== 'government') throw { response: { data: { error: 'Only government can manage elections.' }, status: 403 } };
  const items = getStore<Election>('elections', SEED_ELECTIONS);
  const item = items.find(e => e.id === id);
  if (!item) throw { response: { data: { error: 'Election not found.' }, status: 404 } };
  if (data.title !== undefined) item.title = data.title;
  if (data.date !== undefined) item.date = data.date;
  if (data.type !== undefined) item.type = data.type;
  if (data.status !== undefined) item.status = data.status;
  setStore('elections', items);
  return { data: { election: item } };
}

export async function deleteElection(id: number) {
  const tokenData = parseToken();
  if (!tokenData || tokenData.role !== 'government') throw { response: { data: { error: 'Only government can manage elections.' }, status: 403 } };
  let items = getStore<Election>('elections', SEED_ELECTIONS);
  items = items.filter(e => e.id !== id);
  setStore('elections', items);
  return { data: { success: true } };
}

export async function getVolunteerPrograms() {
  initStore(); initHubData();
  return { data: { programs: getStore<VolunteerProgram>('volunteers', SEED_VOLUNTEERS) } };
}

export async function createVolunteerProgram(data: Omit<VolunteerProgram, 'id'>) {
  const tokenData = parseToken();
  if (!tokenData || tokenData.role !== 'government') throw { response: { data: { error: 'Only government can manage programs.' }, status: 403 } };
  const items = getStore<VolunteerProgram>('volunteers', SEED_VOLUNTEERS);
  const item: VolunteerProgram = { id: getNextId(), ...data };
  items.push(item);
  setStore('volunteers', items);
  return { data: { program: item } };
}

export async function updateVolunteerProgram(id: number, data: Partial<Omit<VolunteerProgram, 'id'>>) {
  const tokenData = parseToken();
  if (!tokenData || tokenData.role !== 'government') throw { response: { data: { error: 'Only government can manage programs.' }, status: 403 } };
  const items = getStore<VolunteerProgram>('volunteers', SEED_VOLUNTEERS);
  const item = items.find(v => v.id === id);
  if (!item) throw { response: { data: { error: 'Program not found.' }, status: 404 } };
  if (data.name !== undefined) item.name = data.name;
  if (data.ward !== undefined) item.ward = data.ward;
  if (data.date !== undefined) item.date = data.date;
  if (data.spots !== undefined) item.spots = data.spots;
  if (data.icon !== undefined) item.icon = data.icon;
  setStore('volunteers', items);
  return { data: { program: item } };
}

export async function deleteVolunteerProgram(id: number) {
  const tokenData = parseToken();
  if (!tokenData || tokenData.role !== 'government') throw { response: { data: { error: 'Only government can manage programs.' }, status: 403 } };
  let items = getStore<VolunteerProgram>('volunteers', SEED_VOLUNTEERS);
  items = items.filter(v => v.id !== id);
  setStore('volunteers', items);
  return { data: { success: true } };
}

export async function joinVolunteerProgram(programId: number) {
  initStore(); initHubData();
  const tokenData = parseToken();
  if (!tokenData || tokenData.role !== 'citizen') {
    throw { response: { data: { error: 'Only citizens can join volunteer programs.' }, status: 403 } };
  }

  const participants = getStore<VolunteerParticipant>('volunteer_participants', []);
  const existing = participants.find(p => p.program_id === programId && p.user_id === tokenData.id);
  if (existing) {
    throw { response: { data: { error: 'You have already joined this program.' }, status: 400 } };
  }

  const users = getStore<User>('users', SEED_USERS);
  const user = users.find(u => u.id === tokenData.id);

  const programs = getStore<VolunteerProgram>('volunteers', SEED_VOLUNTEERS);
  const program = programs.find(p => p.id === programId);

  if (!program) throw { response: { data: { error: 'Program not found.' }, status: 404 } };
  if (program.spots <= 0) throw { response: { data: { error: 'No spots available.' }, status: 400 } };

  // Decrease spots
  program.spots -= 1;
  setStore('volunteers', programs);

  const participant: VolunteerParticipant = {
    id: getNextId(),
    program_id: programId,
    user_id: tokenData.id,
    user_name: user?.full_name || 'Citizen',
    joined_at: new Date().toISOString()
  };

  participants.push(participant);
  setStore('volunteer_participants', participants);

  return { data: { participant, program } };
}

export async function getVolunteerParticipants(programId?: number) {
  initStore(); initHubData();
  const tokenData = parseToken();
  if (!tokenData || (tokenData.role !== 'government' && tokenData.role !== 'admin')) {
    throw { response: { data: { error: 'Unauthorized to view participants.' }, status: 403 } };
  }
  let participants = getStore<VolunteerParticipant>('volunteer_participants', []);
  if (programId !== undefined) {
    participants = participants.filter(p => p.program_id === programId);
  }
  return { data: { participants } };
}

// ── Analytics Types ─────────────────────────────────────────────────────────────

export interface AnalyticsFilters {
  category?: string | null;
  department?: string | null;
  priority?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export interface AnalyticsSummary {
  total: number;
  active: number;
  resolved: number;
  rejected: number;
  critical: number;
  resolutionRate: number;
  avgResolutionHours: number | null;
  totalUpvotes: number;
  supportedCount: number;
  avgRating: number | null;
  feedbackCount: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byDepartment: { department: string; count: number }[];
  overTime: { date: string; count: number }[];
  granularity?: string;
  filters?: AnalyticsFilters;
}

// ── Feedback Types ──────────────────────────────────────────────────────────────

export interface Feedback {
  id: number | string;
  report_id: number | string;
  user_id: number | string;
  rating: number;
  comment: string | null;
  resolved_confirmation: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubmitFeedbackInput {
  rating: number;
  comment?: string;
  resolved_confirmation: boolean;
}

// Seed feedback store (empty for demo — feedback is user-generated)
const SEED_FEEDBACK: Feedback[] = [];

// ── Notification Types ──────────────────────────────────────────────────────────

export interface Notification {
  id: number | string;
  user_id: number;
  report_id: string | null;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export type NotificationType =
  | 'COMPLAINT_SUBMITTED'
  | 'COMPLAINT_VERIFIED'
  | 'COMPLAINT_REJECTED'
  | 'DEPARTMENT_ASSIGNED'
  | 'PRIORITY_CHANGED'
  | 'STATUS_CHANGED'
  | 'IN_PROGRESS'
  | 'COMPLAINT_RESOLVED'
  | 'ADMIN_REMARK'
  | 'FEEDBACK_SUBMITTED'
  | string;

// ── Analytics Helpers ───────────────────────────────────────────────────────────

function autoGranularity(reports: any[]): 'daily' | 'weekly' | 'monthly' {
  if (!reports.length) return 'monthly';
  const times = reports
    .map(r => r.created_at ? new Date(r.created_at).getTime() : NaN)
    .filter(t => !Number.isNaN(t));
  if (!times.length) return 'monthly';
  const spanDays = (Math.max(...times) - Math.min(...times)) / 86_400_000;
  if (spanDays <= 14) return 'daily';
  if (spanDays <= 90) return 'weekly';
  return 'monthly';
}

function bucketDate(dateStr: string, granularity: 'daily' | 'weekly' | 'monthly'): string {
  const d = new Date(dateStr);
  if (granularity === 'daily') {
    return d.toISOString().slice(0, 10);
  }
  if (granularity === 'weekly') {
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
    return mon.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 7);
}

// ── Analytics API ───────────────────────────────────────────────────────────────

/**
 * Fetches combined analytics dashboard data with optional filters.
 * Mirrors the backend /api/analytics/all endpoint logic using localStorage.
 */
export async function getAnalyticsDashboardData(filters?: AnalyticsFilters): Promise<{ data: AnalyticsData }> {
  initStore();
  const reports = getStore<any>('reports', SEED_REPORTS);
  const feedback = getStore<Feedback>('feedback', SEED_FEEDBACK);

  // Apply filters
  const filtered = reports.filter(r => {
    if (filters?.category && (r.category || 'other') !== filters.category) return false;
    if (filters?.priority && (r.priority || 'MEDIUM').toUpperCase() !== filters.priority) return false;
    if (filters?.status && normalizeStatus(r.status) !== filters.status) return false;
    if (filters?.department) {
      const dept = r.department && r.department.trim() ? r.department.trim() : 'Unassigned';
      if (dept !== filters.department) return false;
    }
    if (filters?.start_date && r.created_at) {
      if (new Date(r.created_at) < new Date(filters.start_date + 'T00:00:00.000Z')) return false;
    }
    if (filters?.end_date && r.created_at) {
      if (new Date(r.created_at) > new Date(filters.end_date + 'T23:59:59.999Z')) return false;
    }
    return true;
  });

  const total = filtered.length;
  const resolved = filtered.filter(r => normalizeStatus(r.status) === 'RESOLVED').length;
  const rejected = filtered.filter(r => normalizeStatus(r.status) === 'REJECTED').length;
  const active = total - resolved - rejected;
  const critical = filtered.filter(r => (r.priority || 'MEDIUM').toUpperCase() === 'CRITICAL').length;
  const resolutionRate = total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0;

  const withResTime = filtered.filter(r =>
    normalizeStatus(r.status) === 'RESOLVED' && r.resolved_at && r.created_at
  );
  const avgResolutionHours = withResTime.length > 0
    ? parseFloat((
        withResTime.reduce((sum, r) => {
          const resAt = new Date(r.resolved_at as string).getTime();
          const createdAt = new Date(r.created_at as string).getTime();
          return sum + (resAt - createdAt) / 3_600_000;
        }, 0) / withResTime.length
      ).toFixed(1))
    : null;

  const totalUpvotes = filtered.reduce((s, r) => s + (r.upvotes || 0), 0);
  const supportedCount = filtered.filter(r => (r.upvotes || 0) > 0).length;
  const feedbackCount = feedback.length;
  const avgRating = feedbackCount > 0
    ? parseFloat((feedback.reduce((s, f) => s + (f.rating || 0), 0) / feedbackCount).toFixed(2))
    : null;

  const summary: AnalyticsSummary = {
    total, active, resolved, rejected, critical,
    resolutionRate, avgResolutionHours,
    totalUpvotes, supportedCount,
    avgRating, feedbackCount,
  };

  // byCategory
  const byCategory: Record<string, number> = { pothole: 0, streetlight: 0, water: 0, sewage: 0, garbage: 0, other: 0 };
  for (const r of filtered) {
    const cat = r.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  // byStatus
  const byStatus: Record<string, number> = { SUBMITTED: 0, UNDER_REVIEW: 0, VERIFIED: 0, ASSIGNED: 0, IN_PROGRESS: 0, RESOLVED: 0, REJECTED: 0 };
  for (const r of filtered) {
    const s = normalizeStatus(r.status);
    if (s in byStatus) byStatus[s]++;
  }

  // byPriority
  const byPriority: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const r of filtered) {
    const p = (r.priority || 'MEDIUM').toUpperCase();
    if (p in byPriority) byPriority[p]++;
  }

  // byDepartment
  const deptMap: Record<string, number> = {};
  for (const r of filtered) {
    const dept = r.department && r.department.trim() ? r.department.trim() : 'Unassigned';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  }
  const byDepartment = Object.entries(deptMap)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  // overTime
  const granularity = filters?.granularity || autoGranularity(filtered);
  const timeMap: Record<string, number> = {};
  for (const r of filtered) {
    if (!r.created_at) continue;
    const key = bucketDate(r.created_at, granularity);
    timeMap[key] = (timeMap[key] || 0) + 1;
  }
  const overTime = Object.entries(timeMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    data: {
      summary, byCategory, byStatus, byPriority, byDepartment, overTime,
      granularity, filters: filters || {},
    },
  };
}

// ── Feedback API ────────────────────────────────────────────────────────────────

export async function getFeedback(reportId: string | number) {
  initStore();
  const feedback = getStore<Feedback>('feedback', SEED_FEEDBACK);
  const result = feedback.filter(f => String(f.report_id) === String(reportId));
  // Return the first one (user can only submit one feedback per report in this prototype)
  return { data: { feedback: result[0] || null } };
}

export async function submitFeedback(reportId: string | number, input: SubmitFeedbackInput) {
  initStore();
  const tokenData = parseToken();
  if (!tokenData) throw { response: { data: { error: 'Please login first.' }, status: 401 } };

  const feedbackStore = getStore<Feedback>('feedback', SEED_FEEDBACK);
  const existing = feedbackStore.find(f => String(f.report_id) === String(reportId) && f.user_id === tokenData.id);

  if (existing) {
    existing.rating = input.rating;
    existing.comment = input.comment || null;
    existing.resolved_confirmation = input.resolved_confirmation;
    existing.updated_at = new Date().toISOString();
    setStore('feedback', feedbackStore);
    return { data: { feedback: existing } };
  }

  const feedback: Feedback = {
    id: getNextId(),
    report_id: reportId,
    user_id: tokenData.id,
    rating: input.rating,
    comment: input.comment || null,
    resolved_confirmation: input.resolved_confirmation,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  feedbackStore.push(feedback);
  setStore('feedback', feedbackStore);
  return { data: { feedback } };
}

// Default export for backward compatibility
const api = { get: () => {}, post: () => {}, patch: () => {}, delete: () => {} };
export default api;

