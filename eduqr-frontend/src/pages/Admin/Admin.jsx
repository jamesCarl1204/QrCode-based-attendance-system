import { useCallback, useEffect, useMemo, useState } from 'react';
import { LINKS, TITLES } from './admin.constants.js';
import { api } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import PortalLayout from '../../components/PortalLayout.jsx';
import ClassesGrid from './ClassesGrid.jsx';
import AdminClassDetailPage from './AdminClassDetailPage.jsx';
import CreateTeacher from './CreateTeacher.jsx';
import Announcements from './Announcements.jsx';
import Dashboard from './Dashboard.jsx';
import AdminUserTables from './AdminUserTables.jsx';
import AdminModals from './AdminModals.jsx';

export default function Admin() {
  const toast = useToast();
  const [tab, setTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [viewStudent, setViewStudent] = useState(null);
  const [viewTeacher, setViewTeacher] = useState(null);
  const [delStudent, setDelStudent] = useState(null);
  const [delTeacher, setDelTeacher] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [delClass, setDelClass] = useState(null);
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

  useEffect(() => { loadStudents(); loadTeachers(); loadClasses(); }, [loadStudents, loadTeachers, loadClasses]);

  const remove = async (url, reload, done) => {
    setBusy(true);
    try {
      const d = await api(url, { method: 'DELETE' });
      if (!d.success) { toast(d.generalError || 'Could not delete.', 'error'); return; }
      done(); await reload();
    } catch { toast('Something went wrong. Please try again.', 'error'); } finally { setBusy(false); }
  };

  const studentRows = useMemo(() => students, [students]);

  if (detailId) {
    const selectedClass = classes.find((item) => item.id === detailId);
    if (selectedClass) {
      return <AdminClassDetailPage
        key={selectedClass.id}
        cls={selectedClass}
        onBack={() => setDetailId(null)}
        onDelete={(item) => { setDetailId(null); setDelClass(item); }}
      />;
    }
  }

  return (
    <>
      <PortalLayout role="admin" brand="Admin Portal" links={LINKS} active={tab} title={TITLES[tab]} onSelect={setTab}>
        {tab === 'dashboard' && <Dashboard goTo={setTab} />}

        {(tab === 'students' || tab === 'teachers') && (
          <AdminUserTables
            tab={tab}
            studentRows={studentRows}
            teachers={teachers}
            onViewStudent={setViewStudent}
            onDeleteStudent={setDelStudent}
            onViewTeacher={setViewTeacher}
            onDeleteTeacher={setDelTeacher}
          />
        )}

        {tab === 'classes' && <ClassesGrid classes={classes} archived={false} onOpen={setDetailId} />}
        {tab === 'archivedClasses' && <ClassesGrid classes={classes} archived onOpen={setDetailId} />}
        {tab === 'announcements' && <Announcements />}
        {tab === 'createTeacher' && <CreateTeacher onCreated={loadTeachers} />}
      </PortalLayout>

      <AdminModals
        viewStudent={viewStudent}
        viewTeacher={viewTeacher}
        delStudent={delStudent}
        delTeacher={delTeacher}
        delClass={delClass}
        busy={busy}
        onCloseStudent={() => setViewStudent(null)}
        onCloseTeacher={() => setViewTeacher(null)}
        onCancelDeleteStudent={() => setDelStudent(null)}
        onConfirmDeleteStudent={() => remove(`/api/admin/students/${delStudent.id}`, loadStudents, () => setDelStudent(null))}
        onCancelDeleteTeacher={() => setDelTeacher(null)}
        onConfirmDeleteTeacher={() => remove(`/api/admin/teachers/${delTeacher.id}`, async () => { await loadTeachers(); await loadClasses(); }, () => setDelTeacher(null))}
        onCancelDeleteClass={() => setDelClass(null)}
        onConfirmDeleteClass={() => remove(`/api/admin/classes/${delClass.id}`, loadClasses, () => setDelClass(null))}
      />
    </>
  );
}
