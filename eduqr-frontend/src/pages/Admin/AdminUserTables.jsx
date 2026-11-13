import { STUDENT_COLS, TEACHER_COLS } from './admin.constants.js';
import DataTable from '../../components/DataTable.jsx';

export default function AdminUserTables({ tab, studentRows, teachers, onViewStudent, onDeleteStudent, onViewTeacher, onDeleteTeacher }) {
  if (tab === 'students') {
    return (
      <DataTable columns={STUDENT_COLS} rows={studentRows} searchKeys={['name', 'studentIdNumber']} placeholder="Search by name or student ID…"
        emptyText="No students found." onView={onViewStudent} onDelete={onDeleteStudent} />
    );
  }

  if (tab === 'teachers') {
    return (
      <DataTable columns={TEACHER_COLS} rows={teachers} searchKeys={['name', 'teacherIdNumber']} placeholder="Search by name or teacher ID…"
        emptyText="No teachers found." onView={onViewTeacher} onDelete={onDeleteTeacher} />
    );
  }

  return null;
}
