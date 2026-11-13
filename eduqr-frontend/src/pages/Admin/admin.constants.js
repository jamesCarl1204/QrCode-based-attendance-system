export const LINKS = [
  { key: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
  { key: 'students', icon: 'fa-user-graduate', label: 'Students' },
  { key: 'teachers', icon: 'fa-chalkboard-user', label: 'Teachers' },
  { key: 'classes', icon: 'fa-book-open', label: 'Classes' },
  { key: 'archivedClasses', icon: 'fa-box-archive', label: 'Archived Classes' },
  { key: 'createTeacher', icon: 'fa-user-plus', label: 'Create Teacher' },
  { key: 'announcements', icon: 'fa-bullhorn', label: 'Announcements' },

];
export const TITLES = { dashboard: 'Dashboard', students: 'Students', teachers: 'Teachers', classes: 'Classes', archivedClasses: 'Archived Classes', createTeacher: 'Create Teacher', announcements: 'Announcements'};


export const STUDENT_COLS = [
  { key: 'name', label: 'Name', sortable: true }, { key: 'studentIdNumber', label: 'Student ID', sortable: true },
  { key: 'email', label: 'Email', sortable: true }, { key: 'parentEmail', label: "Parent's Email" },
];
export const TEACHER_COLS = [
  { key: 'name', label: 'Name', sortable: true }, { key: 'teacherIdNumber', label: 'Teacher ID', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
];
