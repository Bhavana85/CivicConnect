const bcrypt = require('bcryptjs');
require('dotenv').config();

// ── In-memory fallback store ────────────────────────────────────────────────
let useInMemory = false;

// Use synchronous hash so seed users are ready immediately
const adminHash    = bcrypt.hashSync('admin123', 10);
const citizenHash  = bcrypt.hashSync('citizen123', 10);
const govHash      = bcrypt.hashSync('gov123', 10);

const memStore = {
  users: [
    {
      id: 1, full_name: 'Admin User', email: 'admin@civicconnect.gov',
      phone: '+919000000001', password_hash: adminHash, ward_number: null,
      preferred_lang: 'en', is_verified: true, role: 'admin', created_at: new Date().toISOString(),
    },
    {
      id: 2, full_name: 'Demo Citizen', email: 'citizen@example.com',
      phone: '+919000000002', password_hash: citizenHash, ward_number: 73,
      preferred_lang: 'en', is_verified: true, role: 'citizen', created_at: new Date().toISOString(),
    },
    {
      id: 3, full_name: 'Ward 73 Officer', email: 'gov73@bbmp.gov.in',
      phone: '+919000000003', password_hash: govHash, ward_number: 73,
      preferred_lang: 'en', is_verified: true, role: 'government', created_at: new Date().toISOString(),
    },
  ],
  reports: [
    {
      id: 10, user_id: 2, category: 'pothole', title: 'Pothole on MG Road',
      description: 'Massive pothole causing traffic slowdowns and danger to two-wheelers.',
      lat: 12.9716, lng: 77.5946, address_text: 'MG Road, near Metro Station', ward_number: 73,
      status: 'RESOLVED', priority: 'HIGH', upvotes: 12, photo_url: null, after_photo_url: null,
      reporter_name: 'Demo Citizen', created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 11, user_id: 2, category: 'streetlight', title: 'Broken Streetlight on 12th Main',
      description: 'Streetlight has been out for 3 days. The stretch is pitch dark.',
      lat: 12.9784, lng: 77.6408, address_text: '12th Main, Indiranagar', ward_number: 73,
      status: 'SUBMITTED', priority: 'MEDIUM', upvotes: 4, photo_url: null, after_photo_url: null,
      reporter_name: 'Demo Citizen', created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 12, user_id: 2, category: 'garbage', title: 'Garbage pileup near Cubbon Park',
      description: 'Large garbage pile has accumulated near Cubbon Park entrance.',
      lat: 12.9763, lng: 77.5929, address_text: 'Cubbon Park, North Gate', ward_number: 42,
      status: 'IN_PROGRESS', priority: 'MEDIUM', upvotes: 8, photo_url: null, after_photo_url: null,
      reporter_name: 'Priya Sharma', created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 13, user_id: 2, category: 'water', title: 'Major water pipeline leak on CMH Road',
      description: 'Pipeline burst causing major leak and continuous flooding for 2 days.',
      lat: 12.9750, lng: 77.6150, address_text: 'CMH Road, near Old Airport Road junction', ward_number: 73,
      status: 'SUBMITTED', priority: 'HIGH', upvotes: 15, photo_url: null, after_photo_url: null,
      reporter_name: 'Ramesh K.', created_at: new Date(Date.now() - 43200000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 14, user_id: 2, category: 'pothole', title: 'Dangerous road cave-in near HSR Layout',
      description: 'Emergency public safety hazard: road cave-in damaged multiple vehicles.',
      lat: 12.9122, lng: 77.6472, address_text: 'Sector 7, HSR Layout', ward_number: 150,
      status: 'SUBMITTED', priority: 'CRITICAL', upvotes: 31, photo_url: null, after_photo_url: null,
      reporter_name: 'Vikram Patel', created_at: new Date(Date.now() - 345600000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 15, user_id: 2, category: 'other', title: 'Park bench painting and minor maintenance',
      description: 'Cosmetic beautification needed for park benches and flower beds.',
      lat: 12.9352, lng: 77.6270, address_text: '8th Block, Koramangala', ward_number: 68,
      status: 'SUBMITTED', priority: 'LOW', upvotes: 2, photo_url: null, after_photo_url: null,
      reporter_name: 'Meera N.', created_at: new Date(Date.now() - 518400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  report_status_history: [
    { id: 1, report_id: 10, old_status: null, new_status: 'SUBMITTED', remark: 'Initial citizen complaint', changed_by: 2, changed_by_name: 'Demo Citizen', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 2, report_id: 10, old_status: 'SUBMITTED', new_status: 'RESOLVED', remark: 'Resurfacing complete', changed_by: 3, changed_by_name: 'Ward 73 Officer', changed_by_role: 'government', changed_at: new Date().toISOString() },
    { id: 3, report_id: 11, old_status: null, new_status: 'SUBMITTED', remark: 'Complaint submitted by citizen', changed_by: 2, changed_by_name: 'Demo Citizen', changed_by_role: 'citizen', changed_at: new Date().toISOString() },
    { id: 4, report_id: 12, old_status: null, new_status: 'SUBMITTED', remark: 'Garbage reported', changed_by: 2, changed_by_name: 'Demo Citizen', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 172800000).toISOString() },
    { id: 5, report_id: 13, old_status: null, new_status: 'SUBMITTED', remark: 'Pipeline burst reported', changed_by: 2, changed_by_name: 'Demo Citizen', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 43200000).toISOString() },
    { id: 6, report_id: 14, old_status: null, new_status: 'SUBMITTED', remark: 'Cave-in emergency reported', changed_by: 2, changed_by_name: 'Demo Citizen', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 345600000).toISOString() },
    { id: 7, report_id: 15, old_status: null, new_status: 'SUBMITTED', remark: 'Park beautification reported', changed_by: 2, changed_by_name: 'Demo Citizen', changed_by_role: 'citizen', changed_at: new Date(Date.now() - 518400000).toISOString() },
  ],
  report_comments: [],
  report_likes: [],
  budget_items: [
    { id: 1, department: 'Roads & Infrastructure', allocated_amount: 1350000000, spent_amount: 824000000, fiscal_year: 2024 },
    { id: 2, department: 'Water Supply',          allocated_amount: 500000000,  spent_amount: 434000000, fiscal_year: 2024 },
    { id: 3, department: 'Solid Waste',           allocated_amount: 360000000,  spent_amount: 286000000, fiscal_year: 2024 },
    { id: 4, department: 'Street Lighting',       allocated_amount: 150000000,  spent_amount: 120000000, fiscal_year: 2024 },
    { id: 5, department: 'Parks & Recreation',    allocated_amount: 170000000,  spent_amount: 130000000, fiscal_year: 2024 },
    { id: 6, department: 'Health & Sanitation',   allocated_amount: 215000000,  spent_amount: 180000000, fiscal_year: 2024 },
  ],
  forum_posts: [],
  alerts: [
    { id: 1, alert_type: 'road_closure', title_en: 'Road Closure: MG Road', title_kn: 'ರಸ್ತೆ ಮುಚ್ಚಿದೆ: ಎಂ.ಜಿ. ರಸ್ತೆ', body_en: 'MG Road between Trinity Circle and Halasuru Gate is closed for metro rail work from April 18–25, 2026.', body_kn: 'ಏಪ್ರಿಲ್ 18–25, 2026 ರ ತನಕ ಮೆಟ್ರೋ ಕೆಲಸಕ್ಕಾಗಿ ಎಂ.ಜಿ. ರಸ್ತೆ ಮುಚ್ಚಲಾಗಿದೆ.', severity: 'warning', is_active: true, ward_numbers: [42, 43, 44], expires_at: '2026-04-25T00:00:00Z', created_at: new Date().toISOString() },
    { id: 2, alert_type: 'weather', title_en: 'Heavy Rain Advisory', title_kn: 'ಭಾರಿ ಮಳೆ ಎಚ್ಚರಿಕೆ', body_en: 'IMD has issued a Yellow Alert for heavy rainfall in Bengaluru.', body_kn: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಭಾರಿ ಮಳೆಗಾಗಿ IMD ಹಳದಿ ಎಚ್ಚರಿಕೆ ನೀಡಿದೆ.', severity: 'warning', is_active: true, ward_numbers: null, expires_at: '2026-04-19T00:00:00Z', created_at: new Date().toISOString() },
  ],
  nextId: 100,
};

// ── Try PostgreSQL ──────────────────────────────────────────────────────────
let pool = null;

try {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  });

  pool.on('error', (err) => {
    console.error('DB pool error:', err.message);
  });

  // Test connection — switch to in-memory on failure
  pool.query('SELECT NOW()')
    .then(res => {
      console.log('✅ PostgreSQL connected:', res.rows[0].now);
    })
    .catch(err => {
      console.warn('⚠️  PostgreSQL unavailable:', err.message);
      console.log('📦 Switching to IN-MEMORY mode (demo data)');
      console.log('   Demo accounts:');
      console.log('   Citizen:    citizen@example.com / citizen123');
      console.log('   Government: 73 / gov123');
      console.log('   Admin:      admin@civicconnect.gov / admin123');
      useInMemory = true;
    });
} catch (err) {
  console.warn('⚠️  PostgreSQL module error:', err.message);
  console.log('📦 Switching to IN-MEMORY mode (demo data)');
  useInMemory = true;
}

// ── Unified query interface ─────────────────────────────────────────────────
const db = {
  async query(text, params) {
    if (!useInMemory && pool) {
      try {
        return await pool.query(text, params);
      } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === '57P03' || err.message?.includes('connect')) {
          console.warn('⚠️  DB query failed, switching to in-memory:', err.message);
          useInMemory = true;
        } else {
          throw err;
        }
      }
    }
    return { rows: [], rowCount: 0 };
  },
  get isInMemory() { return useInMemory; },
  get store() { return memStore; },
};

module.exports = db;
