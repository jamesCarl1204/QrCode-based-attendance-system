import { useCallback, useEffect, useMemo, useState } from 'react';
import { LINKS, TITLES, STUDENT_COLS, TEACHER_COLS } from './admin.constants.js';
import { activityIcon } from './admin.helpers.js';
import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import InfoModal from './InfoModal.jsx';
import ConfirmDelete from './ConfirmDelete.jsx';
import { api } from '../../api.js';
import { timeAgo } from '../../utils.js';
import { useToast } from '../../context/ToastContext.jsx';
import PortalLayout from '../../components/PortalLayout.jsx';
import ClassesGrid from './ClassesGrid.jsx';
import AdminClassDetailPage from './AdminClassDetailPage.jsx';
import CreateTeacher from './CreateTeacher.jsx';
import DataTable from '../../components/DataTable.jsx';
import s from '../../styles/Portal.module.css';

function Dashboard({ goTo }) {
  const [d, setD] = useState(null);
  const [updated, setUpdated] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await api('/api/admin/dashboard');
        if (alive && r.success) { setD(r); setUpdated(new Date().toLocaleTimeString()); }
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const rate = d?.today.attendanceRatePercent;
  return (
    <div className={s.adminDashboard}>
      <div className={s.statGrid}>
        {[
          ['Students', 'fa-user-graduate', s.statGreen, d?.totals.students],
          ['Teachers', 'fa-chalkboard-user', s.statIndigo, d?.totals.teachers],
          ['Ongoing Sessions', 'fa-qrcode', s.statEmerald, d?.totals.ongoingSessions],
          ["Today's Attendance", 'fa-chart-line', s.statAmber, d ? (rate !== null ? `${rate}%` : '—') : undefined],
        ].map(([label, icon, color, val]) => (
          <div key={label} className={s.panel}>
            <div className={s.statTop}><span className={s.statLabel}>{label}</span><div className={`${s.statIcon} ${color}`}><i className={`fa-solid ${icon}`} /></div></div>
            <span className={s.statValue}>{val ?? '—'}</span>
          </div>
        ))}
      </div>
      <div className={s.dashRow}>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>Recent Activity</h3>
          <p className={s.panelSub}>Latest events across the system</p>
          <div className={s.activityFeed}>
            {!d && <p className={s.mutedText}>Loading…</p>}
            {d && d.recentActivity.length === 0 && <p className={s.mutedText}>No recent activity yet.</p>}
            {d?.recentActivity.map((a, i) => {
              const [color, icon] = activityIcon(a.message, s);
              return (
                <div key={i} className={s.activityItem}>
                  <span className={`${s.activityIcon} ${color}`}><i className={`fa-solid ${icon}`} /></span>
                  <span>{a.message}</span>
                  <span className={s.activityTime}>{timeAgo(a.at)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>Today's Snapshot</h3>
          <p className={s.panelSub}>Present, late and absent</p>
          <div className={s.statusLegend}>
            <div><span>Present</span><strong className={s.cPresent}>{d?.today.present ?? 0}</strong></div>
            <div><span>Late</span><strong className={s.cLate}>{d?.today.late ?? 0}</strong></div>
            <div><span>Absent</span><strong className={s.cAbsent}>{d?.today.absent ?? 0}</strong></div>
          </div>
          <div className={s.quickActions}>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => goTo('createTeacher')}><i className="fa-solid fa-plus" /> Create teacher</button>
            <button className={`${s.btn} ${s.btnOutline}`} onClick={() => goTo('classes')}>View classes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Announcements() {
  const toast = useToast();
  const [f, setF] = useState({ title: '', message: '', toStudents: true, toParents: true });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sent, setSent] = useState([]); // temporary list, resets on refresh

  const validate = () => {
    const e = {};
    if (!f.title.trim()) e.title = 'Title is required.';
    else if (f.title.trim().length > 150) e.title = 'Title is too long (max 150).';
    if (!f.message.trim()) e.message = 'Message is required.';
    else if (f.message.trim().length > 2000) e.message = 'Message is too long (max 2000).';
    if (!f.toStudents && !f.toParents) e.recipients = 'Select at least one recipient.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openConfirm = () => { if (validate()) setConfirmOpen(true); };

  const send = async () => {
    setBusy(true);
    const body = { title: f.title.trim(), message: f.message.trim(), toStudents: f.toStudents, toParents: f.toParents };
    try {
      const d = await api('/api/admin/announcements', { method: 'POST', body });
      if (!d.success) { toast(d.generalError || 'Could not send announcement.', 'error'); return; }
      toast(`Announcement is being sent to ${d.recipients} recipient(s).`);
      setSent((p) => [{ ...body, at: new Date().toISOString() }, ...p]);
      setF({ title: '', message: '', toStudents: true, toParents: true });
      setConfirmOpen(false);
    } catch { toast('Something went wrong. Please try again.', 'error'); } finally { setBusy(false); }
  };

  const who = [f.toStudents && 'all students', f.toParents && 'their parents'].filter(Boolean).join(' and ');

  return (
    <>
      <div className={s.sectionHeader}><h2>Announcements</h2><p>Send an email announcement to students and their parents</p></div>
      <div className={`${s.panel} ${s.createCard}`}>
        <div className={s.ctHeader}>
          <div className={s.ctHeaderIcon}><i className="fa-solid fa-bullhorn" /></div>
          <div><h3>New Announcement</h3><p>This will be emailed to the recipients you select.</p></div>
        </div>

        <div className={s.inputGroup}>
          <label>Title *</label>
          <input placeholder="e.g. No classes on Friday" maxLength={150} value={f.title}
            onChange={(e) => { setF({ ...f, title: e.target.value }); setErrors((p) => ({ ...p, title: '' })); }} />
          <p className={s.fieldError}>{errors.title}</p>
        </div>

        <div className={s.inputGroup}>
          <label>Message *</label>
          <textarea rows={6} placeholder="Write your announcement…" maxLength={2000} value={f.message}
            onChange={(e) => { setF({ ...f, message: e.target.value }); setErrors((p) => ({ ...p, message: '' })); }} />
          <p className={s.fieldError}>{errors.message}</p>
          <p className={s.hint}>{f.message.length}/2000</p>
        </div>

        <p className={s.ctLabel} style={{ marginTop: 14 }}>Send to</p>
        <div className={s.checkRow}>
          <label><input type="checkbox" checked={f.toStudents} onChange={(e) => { setF({ ...f, toStudents: e.target.checked }); setErrors((p) => ({ ...p, recipients: '' })); }} /> Students</label>
          <label><input type="checkbox" checked={f.toParents} onChange={(e) => { setF({ ...f, toParents: e.target.checked }); setErrors((p) => ({ ...p, recipients: '' })); }} /> Parents</label>
        </div>
        <p className={s.fieldError}>{errors.recipients}</p>

        <button className={`${s.btn} ${s.btnPrimary} ${s.submitBtn}`} onClick={openConfirm}>
          <i className="fa-solid fa-paper-plane" /> Review &amp; Send
        </button>
      </div>

      {sent.length > 0 && (
        <div className={s.panel} style={{ marginTop: 18, maxWidth: 760 }}>
          <h3 className={s.panelTitle}>Sent this session</h3>
          <p className={s.panelSub}>Temporary list. This will be replaced with real history once it is saved in the database.</p>
          {sent.map((a, i) => (
            <div key={i} className={s.activityItem}>
              <span><strong>{a.title}</strong> · {[a.toStudents && 'Students', a.toParents && 'Parents'].filter(Boolean).join(' + ')}</span>
              <span className={s.activityTime}>{timeAgo(a.at)}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => !busy && setConfirmOpen(false)}>
        <ModalHeader eyebrow="CONFIRM" title="Send this announcement?" onClose={() => !busy && setConfirmOpen(false)} />
        <p className={s.modalDesc}>This will be emailed to <strong>{who}</strong>. Emails cannot be recalled once they are sent.</p>
        <div className={s.announcePreview}>
          <strong>{f.title.trim()}</strong>
          <p>{f.message.trim()}</p>
        </div>
        <ModalFooter>
          <button className={`${s.btn} ${s.btnOutline}`} disabled={busy} onClick={() => setConfirmOpen(false)}>Cancel</button>
          <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send now'}</button>
        </ModalFooter>
      </Modal>
    </>
  );
}

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

        {tab === 'students' && (
          <>
            <DataTable columns={STUDENT_COLS} rows={studentRows} searchKeys={['name', 'studentIdNumber']} placeholder="Search by name or student ID…"
              emptyText="No students found." onView={setViewStudent} onDelete={setDelStudent} />
          </>
        )}

        {tab === 'teachers' && (
          <>
            <DataTable columns={TEACHER_COLS} rows={teachers} searchKeys={['name', 'teacherIdNumber']} placeholder="Search by name or teacher ID…"
              emptyText="No teachers found." onView={setViewTeacher} onDelete={setDelTeacher} />
          </>
        )}

        {tab === 'classes' && <ClassesGrid classes={classes} archived={false} onOpen={setDetailId} />}
        {tab === 'archivedClasses' && <ClassesGrid classes={classes} archived onOpen={setDetailId} />}
        {tab === 'announcements' && <Announcements />}
        {tab === 'createTeacher' && <CreateTeacher onCreated={loadTeachers} />}
      </PortalLayout>

      <InfoModal item={viewStudent} eyebrow="STUDENT INFORMATION" idLabel="Student ID" idKey="studentIdNumber" onClose={() => setViewStudent(null)} />
      <InfoModal item={viewTeacher} eyebrow="TEACHER INFORMATION" idLabel="Teacher ID" idKey="teacherIdNumber" onClose={() => setViewTeacher(null)} />

      <ConfirmDelete open={!!delStudent} eyebrow="DELETE STUDENT" title="Delete this student?" label="Delete student" busy={busy}
        onCancel={() => setDelStudent(null)}
        onConfirm={() => remove(`/api/admin/students/${delStudent.id}`, loadStudents, () => setDelStudent(null))}>
        You're about to permanently delete <strong>{delStudent?.name}</strong> and all of their attendance records. This cannot be undone.
      </ConfirmDelete>

      <ConfirmDelete open={!!delTeacher} eyebrow="DELETE TEACHER" title="Delete this teacher?" label="Delete teacher" busy={busy}
        onCancel={() => setDelTeacher(null)}
        onConfirm={() => remove(`/api/admin/teachers/${delTeacher.id}`, async () => { await loadTeachers(); await loadClasses(); }, () => setDelTeacher(null))}>
        You're about to permanently delete <strong>{delTeacher?.name}</strong> along with all of their classes, sessions, and attendance records. This cannot be undone.
      </ConfirmDelete>


      <ConfirmDelete open={!!delClass} eyebrow="DELETE CLASS" title="Delete this class?" label="Delete class" busy={busy}
        onCancel={() => setDelClass(null)}
        onConfirm={() => remove(`/api/admin/classes/${delClass.id}`, loadClasses, () => setDelClass(null))}>
        You're about to permanently delete <strong>{delClass?.subject_name}</strong>, including all of its sessions and attendance records. This cannot be undone.
      </ConfirmDelete>
    </>
  );
}
