// Fill this in if you want contact info in the footer. Empty values are hidden.
export const CONTACT = { email: '', location: '' };

export const FEATURES = [
  { icon: 'fa-qrcode', title: 'QR code attendance',
    text: 'Students scan the class QR code with their phone camera. Present or Late is decided automatically.' },
  { icon: 'fa-clock', title: 'Session time windows',
    text: 'Teachers set the class start, end, and late cutoff. Scans outside the window are rejected, and each student can only scan once.' },
  { icon: 'fa-chart-line', title: 'Live dashboards',
    text: 'Teacher and admin dashboards refresh on their own, so you see scans, rates, and recent activity as they happen.' },
  { icon: 'fa-envelope', title: 'Parent email alerts',
    text: "Parents get an email when their child scans in, and a final status (Present, Late, or Absent) when the class ends." },
  { icon: 'fa-list-check', title: 'Summaries and records',
    text: "See each student’s attendance rate, flag anyone below 75%, mark attendance manually, and download a session as CSV." },
  { icon: 'fa-robot', title: 'AI attendance assistant',
    text: 'Teachers can ask in plain language who was absent, who was late, or which students have low attendance.' },
];

export const STEPS = [
  { icon: 'fa-user-gear', title: 'Set up',
    text: "The admin creates teacher accounts. Students register with their parent’s email and join a class using its code." },
  { icon: 'fa-calendar-plus', title: 'Open a session',
    text: 'The teacher opens an attendance session for the class and shows its QR code.' },
  { icon: 'fa-camera', title: 'Scan to check in',
    text: 'Students scan the QR code in the Student Portal. Their time in and status are recorded instantly.' },
  { icon: 'fa-bell', title: 'Monitor and notify',
    text: 'Teachers and admins track attendance live while parents receive automatic emails.' },
];

export const BENEFITS = [
  { icon: 'fa-bolt', title: 'Faster attendance',
    text: 'No roll call. A whole class can check in within seconds.' },
  { icon: 'fa-bullseye', title: 'Accurate records',
    text: 'Only enrolled students can scan, inside the session window, once per session.' },
  { icon: 'fa-envelope-open-text', title: 'Better parent communication',
    text: 'Parents are informed automatically, without teachers sending anything.' },
  { icon: 'fa-cloud', title: 'Convenient digital management',
    text: 'Classes, sessions, and records live in one place and work on desktop or phone.' },
];

export const PORTALS = [
  { icon: 'fa-user-graduate', name: 'Student',
    items: ['Join classes with a code', 'Scan the QR code to check in', 'View your own attendance rate'] },
  { icon: 'fa-chalkboard-user', name: 'Teacher',
    items: ['Create classes and sessions', 'Monitor and mark attendance', 'Ask the AI assistant'] },
  { icon: 'fa-user-shield', name: 'Admin',
    items: ['Manage students and teachers', 'Browse every class and record', 'Watch system-wide activity'] },
];

export const SAMPLE = [
  { name: 'Maria Santos', status: 'Present', time: '7:58 AM', cls: 'present' },
  { name: 'Juan Dela Cruz', status: 'Late', time: '8:14 AM', cls: 'late' },
  { name: 'Ana Reyes', status: 'Absent', time: '—', cls: 'absent' },
];

export const NAV = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'about', label: 'About' },
];
