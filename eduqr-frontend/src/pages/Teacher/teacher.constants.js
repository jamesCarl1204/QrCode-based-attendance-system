export const LINKS = [
  { key: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
  { key: 'active', icon: 'fa-book-open', label: 'My Classes' },
  { key: 'archived', icon: 'fa-box-archive', label: 'Archived Classes' },
  { key: 'ai', icon: 'fa-robot', label: 'AI Assistant', tag: 'AI' },
];

export const TITLES = { dashboard: 'Dashboard', active: 'My Classes', archived: 'Archived Classes', ai: 'AI Assistant' };

export const COLORS = { blue: '#2563eb', green: '#16a34a', pink: '#db2777', orange: '#ea580c', purple: '#7c3aed', teal: '#0d9488' };

export const TABS = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'summary', label: 'Summary' },
  { key: 'members', label: 'Members' },
];

export const GREETING = 'Hi! How can I help you?';

// Whitelist: the AI only picks a type; the actual question is built here.
export const ACTION_PROMPTS = {
  summary: (a) => `Give me the attendance summary of ${a.subject_name}${a.session_date ? ` on ${a.session_date}` : ''}.`,
  absent: (a) => `Who was absent in ${a.subject_name}${a.session_date ? ` on ${a.session_date}` : ''}?`,
  late: (a) => `Who was late in ${a.subject_name}${a.session_date ? ` on ${a.session_date}` : ''}?`,
  low_attendance: (a) => `Which students in ${a.subject_name} have low attendance?`,
};
