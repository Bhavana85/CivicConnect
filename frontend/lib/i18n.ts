'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ─── Bundled translations (no HTTP fetch needed) ──────────────────────────────
const en = {
  nav: {
    home: 'Home', report: 'Report Issue', budget: 'Budget',
    hub: 'Civic Hub', forum: 'Forum', alerts: 'Alerts', complaints: 'My Complaints',
    login: 'Login', logout: 'Logout', register: 'Register',
  },
  home: {
    hero_title: 'Reconnect Citizens with Local Government.',
    hero_subtitle: 'Report potholes, track budgets, join ward discussions, and see your city improve — in English & ಕನ್ನಡ.',
    cta_report: 'Report an Issue', cta_budget: 'View Budget', cta_start: 'Get Started — It\'s Free',
    stats_reports: 'Issues Reported', stats_resolved: 'Issues Resolved', stats_users: 'Verified Citizens',
  },
  report: {
    title: 'Report a Civic Issue', subtitle: 'Drop a pin on the map or use your current location',
    category: 'Category',
    categories: { pothole: 'Pothole', streetlight: 'Broken Streetlight', water: 'Water Supply Issue', sewage: 'Sewage / Drainage', garbage: 'Garbage / Waste', other: 'Other' },
    issueTitle: 'Issue Title', titlePlaceholder: 'Brief description of the problem',
    description: 'Description', descriptionPlaceholder: 'Provide more details about the issue...',
    photo: 'Upload Photo (optional)', useLocation: 'Use My Location', locating: 'Locating...',
    locationSet: 'Location set on map', locationError: 'Could not get your location. Please click on the map.',
    submit: 'Submit Report', submitting: 'Submitting...', success: 'Report submitted successfully!',
    selectLocation: 'Please select a location on the map', mapInstruction: 'Click on the map to place a pin',
    status: {
      pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved', rejected: 'Rejected',
      SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review', VERIFIED: 'Verified', ASSIGNED: 'Assigned',
      IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', REJECTED: 'Rejected',
    },
    recentReports: 'Reported Issues',
  },
  budget: {
    title: 'Municipal Budget Transparency', subtitle: 'Track how your tax money is being spent',
    fiscalYear: 'Fiscal Year', allocated: 'Allocated', spent: 'Spent', department: 'Department',
    utilizationRate: 'Utilization Rate', totalAllocated: 'Total Allocated', totalSpent: 'Total Spent',
    allDepartments: 'All Departments', chartTitle: 'Allocated vs Spent by Department',
    breakdownTitle: 'Budget Breakdown', currency: '₹',
  },
  hub: {
    title: 'Civic Information Hub', elections: 'Upcoming Elections',
    volunteers: 'Volunteer Programs', volunteer_join: 'Join as Volunteer',
    ward_info: 'Your Ward Information', councillor: 'Ward Councillor',
  },
  forum: {
    title: 'Community Forum', subtitle: 'Discuss local issues with verified residents of your ward',
    newPost: 'New Post', reply: 'Reply', upvote: 'Upvote', comments: 'Comments',
    unverifiedNotice: 'Only verified residents can post in the forum.',
    verifyNow: 'Verify Residency', noThreads: 'No discussions yet. Be the first to post!',
    postedBy: 'Posted by', replies: 'replies',
  },
  alerts: {
    title: 'Active Alerts', subtitle: 'Stay informed about your area', noAlerts: 'No active alerts for your area',
    severity: { info: 'Info', warning: 'Warning', critical: 'Critical' },
    type: { road_closure: 'Road Closure', weather: 'Weather', event: 'Event', emergency: 'Emergency' },
    expires: 'Expires',
  },
  auth: {
    login: 'Login', register: 'Register', verify: 'Verify Residency', otp: 'Enter OTP',
    sendOtp: 'Send OTP', resendOtp: 'Resend OTP', phone: 'Mobile Number',
    phonePlaceholder: '+91 9876543210', password: 'Password', name: 'Full Name', ward: 'Ward Number',
    otpSent: 'OTP sent to your mobile number', otpInvalid: 'Invalid or expired OTP.',
    verifiedSuccess: 'Residency verified!', loginRequired: 'Please login to continue',
  },
  common: {
    loading: 'Loading...', error: 'Something went wrong. Please try again.',
    save: 'Save', cancel: 'Cancel', close: 'Close', back: 'Back', next: 'Next',
    submit: 'Submit', search: 'Search', filter: 'Filter', all: 'All',
    viewAll: 'View All', learnMore: 'Learn More', poweredBy: 'Powered by CivicConnect',
  },
  status: {
    pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved', rejected: 'Rejected',
    SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review', VERIFIED: 'Verified', ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', REJECTED: 'Rejected',
  },
  profileSetup: {
    title: 'Complete Your Profile', subtitle: 'Help us connect you with your local neighborhood',
    nameLabel: 'Full Name', namePlaceholder: 'e.g. Ramesh Kumar',
    locationLabel: 'Default Neighborhood', fetchLocation: 'Use my current location',
    locating: 'Finding your location...', locationFound: 'Location acquired!',
    locationError: 'Could not get location. Please allow access.',
    locationDesc: 'Your location is used to show relevant local issues.',
    submit: 'Complete Setup', success: 'Profile setup complete!',
  },
};

const kn: typeof en = {
  nav: {
    home: 'ಮುಖಪುಟ', report: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ', budget: 'ಬಜೆಟ್',
    hub: 'ನಾಗರಿಕ ಕೇಂದ್ರ', forum: 'ಚರ್ಚಾ ವೇದಿಕೆ', alerts: 'ಎಚ್ಚರಿಕೆಗಳು', complaints: 'ನನ್ನ ದೂರುಗಳು',
    login: 'ಲಾಗಿನ್', logout: 'ಲಾಗ್ ಔಟ್', register: 'ನೋಂದಣಿ',
  },
  home: {
    hero_title: 'ನಾಗರಿಕರನ್ನು ಸ್ಥಳೀಯ ಸರ್ಕಾರದೊಂದಿಗೆ ಮರುಸಂಪರ್ಕಿಸಿ.',
    hero_subtitle: 'ರಸ್ತೆ ಗುಂಡಿಗಳನ್ನು ವರದಿ ಮಾಡಿ, ಬಜೆಟ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ, ಮತ್ತು ನಿಮ್ಮ ನಗರ ಸುಧಾರಿಸುವುದನ್ನು ಕಾಣಿ.',
    cta_report: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ', cta_budget: 'ಬಜೆಟ್ ವೀಕ್ಷಿಸಿ', cta_start: 'ಉಚಿತವಾಗಿ ಪ್ರಾರಂಭಿಸಿ',
    stats_reports: 'ವರದಿ ಮಾಡಿದ ಸಮಸ್ಯೆಗಳು', stats_resolved: 'ಪರಿಹರಿಸಿದ ಸಮಸ್ಯೆಗಳು', stats_users: 'ದೃಢೀಕೃತ ನಾಗರಿಕರು',
  },
  report: {
    title: 'ನಾಗರಿಕ ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ', subtitle: 'ನಕ್ಷೆಯಲ್ಲಿ ಪಿನ್ ಇರಿಸಿ ಅಥವಾ ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಬಳಸಿ',
    category: 'ವರ್ಗ',
    categories: { pothole: 'ಹಳ್ಳ (ಗುಂಡಿ)', streetlight: 'ದೀಪ ಕೆಟ್ಟಿದೆ', water: 'ನೀರು ಸರಬರಾಜು ಸಮಸ್ಯೆ', sewage: 'ಚರಂಡಿ / ಒಳಚರಂಡಿ', garbage: 'ಕಸ / ತ್ಯಾಜ್ಯ', other: 'ಇತರೆ' },
    issueTitle: 'ಸಮಸ್ಯೆಯ ಶೀರ್ಷಿಕೆ', titlePlaceholder: 'ಸಮಸ್ಯೆಯ ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆ',
    description: 'ವಿವರಣೆ', descriptionPlaceholder: 'ಸಮಸ್ಯೆಯ ಬಗ್ಗೆ ಹೆಚ್ಚಿನ ವಿವರಗಳನ್ನು ನೀಡಿ...',
    photo: 'ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ (ಐಚ್ಛಿಕ)', useLocation: 'ನನ್ನ ಸ್ಥಳ ಬಳಸಿ', locating: 'ಸ್ಥಳ ಹುಡುಕಲಾಗುತ್ತಿದೆ...',
    locationSet: 'ನಕ್ಷೆಯಲ್ಲಿ ಸ್ಥಳ ಹೊಂದಿಸಲಾಗಿದೆ', locationError: 'ನಿಮ್ಮ ಸ್ಥಳ ಪಡೆಯಲಾಗಲಿಲ್ಲ.',
    submit: 'ವರದಿ ಸಲ್ಲಿಸಿ', submitting: 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...', success: 'ವರದಿ ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ!',
    selectLocation: 'ದಯವಿಟ್ಟು ನಕ್ಷೆಯಲ್ಲಿ ಸ್ಥಳ ಆಯ್ಕೆ ಮಾಡಿ', mapInstruction: 'ಪಿನ್ ಇರಿಸಲು ನಕ್ಷೆಯ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ',
    status: {
      pending: 'ಬಾಕಿ ಇದೆ', in_progress: 'ಪ್ರಗತಿಯಲ್ಲಿದೆ', resolved: 'ಪರಿಹರಿಸಲಾಗಿದೆ', rejected: 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ',
      SUBMITTED: 'ಸಲ್ಲಿಸಲಾಗಿದೆ', UNDER_REVIEW: 'ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ', VERIFIED: 'ದೃಢೀಕರಿಸಲಾಗಿದೆ', ASSIGNED: 'ನಿಯೋಜಿಸಲಾಗಿದೆ',
      IN_PROGRESS: 'ಪ್ರಗತಿಯಲ್ಲಿದೆ', RESOLVED: 'ಪರಿಹರಿಸಲಾಗಿದೆ', REJECTED: 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ',
    },
    recentReports: 'ವರದಿಯಾದ ಸಮಸ್ಯೆಗಳು',
  },
  budget: {
    title: 'ಮುನ್ಸಿಪಲ್ ಬಜೆಟ್ ಪಾರದರ್ಶಕತೆ', subtitle: 'ನಿಮ್ಮ ತೆರಿಗೆ ಹಣ ಹೇಗೆ ಖರ್ಚಾಗುತ್ತಿದೆ ಎಂಬುದನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
    fiscalYear: 'ಆರ್ಥಿಕ ವರ್ಷ', allocated: 'ನಿಗದಿಪಡಿಸಲಾಗಿದೆ', spent: 'ಖರ್ಚು ಮಾಡಲಾಗಿದೆ', department: 'ಇಲಾಖೆ',
    utilizationRate: 'ಬಳಕೆ ದರ', totalAllocated: 'ಒಟ್ಟು ನಿಗದಿ', totalSpent: 'ಒಟ್ಟು ಖರ್ಚು',
    allDepartments: 'ಎಲ್ಲ ಇಲಾಖೆಗಳು', chartTitle: 'ಇಲಾಖೆಯ ಪ್ರಕಾರ ನಿಗದಿ ಮತ್ತು ಖರ್ಚು',
    breakdownTitle: 'ಬಜೆಟ್ ವಿವರ', currency: '₹',
  },
  hub: {
    title: 'ನಾಗರಿಕ ಮಾಹಿತಿ ಕೇಂದ್ರ', elections: 'ಮುಂಬರುವ ಚುನಾವಣೆಗಳು',
    volunteers: 'ಸ್ವಯಂಸೇವಕ ಕಾರ್ಯಕ್ರಮಗಳು', volunteer_join: 'ಸ್ವಯಂಸೇವಕರಾಗಿ ಸೇರಿ',
    ward_info: 'ನಿಮ್ಮ ವಾರ್ಡ್ ಮಾಹಿತಿ', councillor: 'ವಾರ್ಡ್ ಕೌನ್ಸಿಲರ್',
  },
  forum: {
    title: 'ಸಮುದಾಯ ವೇದಿಕೆ', subtitle: 'ನಿಮ್ಮ ವಾರ್ಡ್‌ನ ದೃಢೀಕೃತ ನಿವಾಸಿಗಳೊಂದಿಗೆ ಸ್ಥಳೀಯ ವಿಷಯಗಳನ್ನು ಚರ್ಚಿಸಿ',
    newPost: 'ಹೊಸ ಪೋಸ್ಟ್', reply: 'ಉತ್ತರಿಸಿ', upvote: 'ಮೇಲ್ಮತ', comments: 'ಕಾಮೆಂಟ್‌ಗಳು',
    unverifiedNotice: 'ವೇದಿಕೆಯಲ್ಲಿ ಪೋಸ್ಟ್ ಮಾಡಲು ದೃಢೀಕೃತ ನಿವಾಸಿಗಳು ಮಾತ್ರ.',
    verifyNow: 'ನಿವಾಸ ದೃಢೀಕರಿಸಿ', noThreads: 'ಇನ್ನೂ ಯಾವುದೇ ಚರ್ಚೆಗಳಿಲ್ಲ.',
    postedBy: 'ಪೋಸ್ಟ್ ಮಾಡಿದ್ದು', replies: 'ಉತ್ತರಗಳು',
  },
  alerts: {
    title: 'ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು', subtitle: 'ನಿಮ್ಮ ಪ್ರದೇಶದ ಬಗ್ಗೆ ಮಾಹಿತಿ ಪಡೆಯಿರಿ', noAlerts: 'ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ಯಾವುದೇ ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ',
    severity: { info: 'ಮಾಹಿತಿ', warning: 'ಎಚ್ಚರಿಕೆ', critical: 'ತುರ್ತು' },
    type: { road_closure: 'ರಸ್ತೆ ಮುಚ್ಚಿದೆ', weather: 'ಹವಾಮಾನ', event: 'ಕಾರ್ಯಕ್ರಮ', emergency: 'ತುರ್ತು ಪರಿಸ್ಥಿತಿ' },
    expires: 'ಮುಕ್ತಾಯ',
  },
  auth: {
    login: 'ಲಾಗಿನ್', register: 'ನೋಂದಣಿ', verify: 'ನಿವಾಸ ಪರಿಶೀಲಿಸಿ', otp: 'OTP ನಮೂದಿಸಿ',
    sendOtp: 'OTP ಕಳುಹಿಸಿ', resendOtp: 'OTP ಮರು ಕಳುಹಿಸಿ', phone: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    phonePlaceholder: '+91 9876543210', password: 'ಪಾಸ್‌ವರ್ಡ್', name: 'ಪೂರ್ಣ ಹೆಸರು', ward: 'ವಾರ್ಡ್ ಸಂಖ್ಯೆ',
    otpSent: 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಗೆ OTP ಕಳುಹಿಸಲಾಗಿದೆ', otpInvalid: 'ಅಮಾನ್ಯ ಅಥವಾ ಅವಧಿ ಮೀರಿದ OTP.',
    verifiedSuccess: 'ನಿವಾಸ ದೃಢೀಕರಿಸಲಾಗಿದೆ!', loginRequired: 'ಮುಂದುವರಿಯಲು ದಯವಿಟ್ಟು ಲಾಗಿನ್ ಮಾಡಿ',
  },
  common: {
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...', error: 'ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    save: 'ಉಳಿಸಿ', cancel: 'ರದ್ದು ಮಾಡಿ', close: 'ಮುಚ್ಚಿ', back: 'ಹಿಂದೆ', next: 'ಮುಂದೆ',
    submit: 'ಸಲ್ಲಿಸಿ', search: 'ಹುಡುಕಿ', filter: 'ಫಿಲ್ಟರ್', all: 'ಎಲ್ಲ',
    viewAll: 'ಎಲ್ಲ ವೀಕ್ಷಿಸಿ', learnMore: 'ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ', poweredBy: 'CivicConnect ಮೂಲಕ ಚಾಲಿತ',
  },
  status: {
    pending: 'ಬಾಕಿ ಇದೆ', in_progress: 'ಪ್ರಗತಿಯಲ್ಲಿದೆ', resolved: 'ಪರಿಹರಿಸಲಾಗಿದೆ', rejected: 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ',
    SUBMITTED: 'ಸಲ್ಲಿಸಲಾಗಿದೆ', UNDER_REVIEW: 'ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ', VERIFIED: 'ದೃಢೀಕರಿಸಲಾಗಿದೆ', ASSIGNED: 'ನಿಯೋಜಿಸಲಾಗಿದೆ',
    IN_PROGRESS: 'ಪ್ರಗತಿಯಲ್ಲಿದೆ', RESOLVED: 'ಪರಿಹರಿಸಲಾಗಿದೆ', REJECTED: 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ',
  },
  profileSetup: {
    title: 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ', subtitle: 'ನಿಮ್ಮ ಸ್ಥಳೀಯ ನೆರೆಹೊರೆಯೊಂದಿಗೆ ಸಂಪರ್ಕಿಸಲು ಸಹಾಯ ಮಾಡಿ',
    nameLabel: 'ಪೂರ್ಣ ಹೆಸರು', namePlaceholder: 'ಉದಾ. ರಮೇಶ್ ಕುಮಾರ್',
    locationLabel: 'ಡೀಫಾಲ್ಟ್ ನೆರೆಹೊರೆ', fetchLocation: 'ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಬಳಸಿ',
    locating: 'ಸ್ಥಳ ಹುಡುಕಲಾಗುತ್ತಿದೆ...', locationFound: 'ಸ್ಥಳ ಸಿಕ್ಕಿತು!',
    locationError: 'ಸ್ಥಳ ಪಡೆಯಲಾಗಲಿಲ್ಲ. ಅನುಮತಿ ನೀಡಿ.',
    locationDesc: 'ನಿಮ್ಮ ಸ್ಥಳ ಸ್ಥಳೀಯ ಸಮಸ್ಯೆಗಳನ್ನು ತೋರಿಸಲು ಬಳಸಲಾಗುತ್ತದೆ.',
    submit: 'ಸೆಟಪ್ ಪೂರ್ಣಗೊಳಿಸಿ', success: 'ಪ್ರೊಫೈಲ್ ಸೆಟಪ್ ಪೂರ್ಣಗೊಂಡಿದೆ!',
  },
};

// ─── Init (idempotent) ────────────────────────────────────────────────────────
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        kn: { translation: kn },
      },
      lng: 'en',
      fallbackLng: 'en',
      supportedLngs: ['en', 'kn'],
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
}

export default i18n;
