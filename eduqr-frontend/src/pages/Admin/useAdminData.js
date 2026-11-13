import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function useAdminData() {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadStudents = useCallback(async () => {
    const d = await api('/api/admin/students');
    if (d.success) setStudents(d.students.map((x) => ({ id: x.id, studentIdNumber: x.student_id_number, name: `${x.first_name} ${x.last_name}`, email: x.email, parentEmail: x.parent_email, createdAt: x.created_at })));
  }, []);

  const loadTeachers = useCallback(async () => {
    const d = await api('/api/admin/teachers');
    if (d.success) setTeachers(d.teachers.map((x) => ({ id: x.id, teacherIdNumber: x.teacher_id_number, name: `${x.first_name} ${x.last_name}`, email: x.email, createdAt: x.created_at })));
  }, []);

  const loadClasses = useCallback(async () => {
    const d = await api('/api/admin/classes');
    if (d.success) setClasses(d.classes);
  }, []);

  useEffect(() => {
    loadStudents();
    loadTeachers();
    loadClasses();
  }, [loadStudents, loadTeachers, loadClasses]);

  const remove = async (url, reload, done) => {
    setBusy(true);
    try {
      const d = await api(url, { method: 'DELETE' });
      if (!d.success) {
        toast(d.generalError || 'Could not delete.', 'error');
        return;
      }
      done();
      await reload();
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return { students, teachers, classes, busy, loadStudents, loadTeachers, loadClasses, remove };
}
