import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { fmt12, timeAgo } from '../../utils.js';
import { useToast } from '../../context/ToastContext.jsx';
import PortalLayout from '../../components/PortalLayout.jsx';
import ClassCard from '../../components/ClassCard.jsx';
import DataTable from '../../components/DataTable.jsx';
import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import s from '../../styles/Portal.module.css';

const LINKS = [
  { key: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
  { key: 'students', icon: 'fa-user-graduate', label: 'Students' },
  { key: 'teachers', icon: 'fa-chalkboard-user', label: 'Teachers' },
  { key: 'classes', icon: 'fa-book-open', label: 'Classes' },
  { key: 'archivedClasses', icon: 'fa-box-archive', label: 'Archived Classes' },
  { key: 'createTeacher', icon: 'fa-user-plus', label: 'Create Teacher' },
];
const TITLES = { dashboard: 'Dashboard', students: 'Students', teachers: 'Teachers', classes: 'Classes', archivedClasses: 'Archived Classes', createTeacher: 'Create Teacher' };

const STUDENT_COLS = [
  { key: 'name', label: 'Name', sortable: true }, { key: 'studentIdNumber', label: 'Student ID', sortable: true },
  { key: 'email', label: 'Email', sortable: true }, { key: 'parentEmail', label: "Parent's Email" },
];
const TEACHER_COLS = [
  { key: 'name', label: 'Name', sortable: true }, { key: 'teacherIdNumber', label: 'Teacher ID', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
];

function activityIcon(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('marked late')) return [s.actOrange, 'fa-clock'];
  if (m.includes('marked absent')) return [s.actRed, 'fa-circle-xmark'];
  if (m.includes('marked present')) return [s.actGreen, 'fa-user-check'];
  if (m.includes('teacher account')) return [s.actBlue, 'fa-user-plus'];
  if (m.includes('class')) return [s.actBlue, 'fa-calendar'];
  return [s.actBlue, 'fa-circle-info'];
}

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
    <>
      <div className={s.sectionHeader}>
        <h2>Dashboard Overview</h2>
        <p><span className={s.liveDot} />Live overview · {updated ? `updated ${updated}` : 'updating…'}</p>
      </div>
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
              const [color, icon] = activityIcon(a.message);
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
    </>
  );
}

function ClassesGrid({ classes, archived, onOpen }) {
  const [q, setQ] = useState('');
  const base = classes.filter((c) => !!c.archived === archived);
  const rows = base.filter((c) => {
    const n = q.trim().toLowerCase();
    if (!n) return true;
    return c.subject_name.toLowerCase().includes(n) || (c.section || '').toLowerCase().includes(n) || `${c.teacher_first_name} ${c.teacher_last_name}`.toLowerCase().includes(n);
  });
  const noun = archived ? 'archived class' : 'class';
  return (
    <>
      <div className={s.sectionHeader}>
        <h2>{archived ? 'Archived Classes' : 'Classes'}</h2>
        <p>{base.length} {noun}{base.length === 1 ? '' : 'es'}{archived ? '' : ' created'}</p>
      </div>
      <div className={s.tableToolbar}>
        <input className={s.searchInput} placeholder="Search by subject, section, or teacher…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className={s.subjectGrid}>
        {rows.length === 0 && <p className={s.mutedText}>No {archived ? 'archived ' : ''}classes found.</p>}
        {rows.map((c) => (
          <ClassCard key={c.id} showCode={false} onOpen={() => onOpen(c.id)}
            cls={{ subject: c.subject_name, section: c.section, color: c.color, archived: c.archived }}
            footer={<div className={s.cardMeta}><span>{c.total_students} student{c.total_students === 1 ? '' : 's'}</span><span>{c.total_sessions} session{c.total_sessions === 1 ? '' : 's'}</span></div>}>
            <p className={s.sectionLabel} style={{ marginTop: 6 }}>Teacher: {c.teacher_first_name} {c.teacher_last_name}</p>
          </ClassCard>
        ))}
      </div>
    </>
  );
}

function ClassDetailModal({ classId, onClose, onDelete }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState({});

  useEffect(() => {
    if (!classId) return;
    setData(null); setOpen({});
    api(`/api/admin/classes/${classId}`).then((d) => setData(d.success ? d : false));
  }, [classId]);

  const cls = data?.class;
  return (
    <Modal open={!!classId} wide onClose={onClose}>
      <ModalHeader eyebrow="CLASS RECORD" title={cls ? cls.subject_name : 'Loading…'} onClose={onClose}
        sub={cls ? `${cls.section || 'No section set'} · Teacher: ${cls.teacher_first_name} ${cls.teacher_last_name} (${cls.teacher_email}) · Class code: ${cls.class_code}` : ''} />
      <div style={{ maxHeight: 520, overflowY: 'auto' }}>
        {data === null && <p className={s.mutedText}>Loading…</p>}
        {data === false && <p className={s.mutedText}>Could not load class.</p>}
        {data && (
          <>
            <div className={s.statPillRow}>
              {[['Present', data.totals.present], ['Late', data.totals.late], ['Absent', data.totals.absent],
                ['Attendance Rate', data.totals.attendanceRatePercent !== null ? `${data.totals.attendanceRatePercent}%` : '—']].map(([l, v]) => (
                <div key={l} className={s.statPill}><div className={s.statValue}>{v}</div><div className={s.statLabel}>{l}</div></div>
              ))}
            </div>
            <h4 className={s.blockTitle}>Students ({data.students.length})</h4>
            {data.students.length === 0 && <p className={s.mutedText}>No students enrolled yet.</p>}
            {data.students.map((st) => (
              <div key={st.id} className={s.sessionCard}><div><div className={s.sessionDate}>{st.first_name} {st.last_name}</div><div className={s.sessionTime}>{st.email}</div></div></div>
            ))}
            <h4 className={s.blockTitle}>Attendance Sessions ({data.sessions.length})</h4>
            {data.sessions.length === 0 && <p className={s.mutedText}>No attendance sessions yet.</p>}
            {data.sessions.map((x) => (
              <div key={x.id} className={s.accordion}>
                <div className={s.accordionHeader} onClick={() => setOpen((o) => ({ ...o, [x.id]: !o[x.id] }))}>
                  <div>
                    <div className={s.sessionDate}>{x.session_date}</div>
                    <div className={s.sessionTime}>{fmt12(x.start_time)} – {fmt12(x.end_time)} · Late after {fmt12(x.late_after)}</div>
                  </div>
                  <span className={s.mutedText}>{x.ended ? 'Ended' : 'Ongoing'}</span>
                </div>
                {open[x.id] && (
                  <div className={s.accordionBody}>
                    <table className={s.recordsTable}>
                      <thead><tr><th>Name</th><th>Time</th><th>Status</th></tr></thead>
                      <tbody>
                        {x.records.map((r, i) => (
                          <tr key={i}><td>{r.first_name} {r.last_name}</td><td>{r.time_in ? fmt12(r.time_in) : '—'}</td><td>{r.status || 'Not yet'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
      <ModalFooter>
        <button className={`${s.btn} ${s.btnOutline}`} onClick={onClose}>Close</button>
        <button className={`${s.btn} ${s.btnDanger}`} onClick={() => cls && onDelete(cls)}>Delete class</button>
      </ModalFooter>
    </Modal>
  );
}

const EMPTY_T = { teacherIdNumber: '', firstName: '', middleName: '', lastName: '', email: '', password: '' };

function CreateTeacher({ onCreated }) {
  const toast = useToast();
  const [f, setF] = useState(EMPTY_T);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErrors({}); setBusy(true);
    try {
      const d = await api('/api/admin/teachers', { method: 'POST', body: { ...f, teacherIdNumber: f.teacherIdNumber.trim(), firstName: f.firstName.trim(), middleName: f.middleName.trim(), lastName: f.lastName.trim(), email: f.email.trim() } });
      if (!d.success) { if (d.errors) setErrors(d.errors); else toast(d.generalError || 'Could not create teacher account.', 'error'); return; }
      toast('Teacher account created.');
      setF(EMPTY_T); onCreated();
    } catch { toast('Something went wrong. Please try again.', 'error'); } finally { setBusy(false); }
  };

  const field = (k, label, ph, type = 'text') => (
    <div className={s.inputGroup}>
      <label>{label}</label>
      <input type={type} placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      <p className={s.fieldError}>{errors[k]}</p>
    </div>
  );

  return (
    <>
      <div className={s.sectionHeader}><h2>Create Teacher Account</h2><p>Add a new teacher account to the system</p></div>
      <div className={`${s.panel} ${s.createCard}`}>
        <div className={s.ctHeader}>
          <div className={s.ctHeaderIcon}><i className="fa-solid fa-user-plus" /></div>
          <div><h3>New Teacher</h3><p>Fill in the details below to add a teacher account.</p></div>
        </div>
        <p className={s.ctLabel}>Personal Information</p>
        <div className={s.formGrid}>
          {field('teacherIdNumber', 'Teacher ID *', 'e.g. T-2026-001')}
          {field('firstName', 'First Name *', 'First name')}
          {field('middleName', 'Middle Name', 'Middle name')}
          {field('lastName', 'Last Name *', 'Last name')}
        </div>
        <div className={s.ctDivider} />
        <p className={s.ctLabel}>Account Credentials</p>
        <div className={s.formGrid}>
          {field('email', 'Email Address *', 'teacher@email.com', 'email')}
          {field('password', 'Password *', 'At least 8 characters', 'password')}
        </div>
        <button className={`${s.btn} ${s.btnPrimary} ${s.submitBtn}`} disabled={busy} onClick={submit}>
          <i className="fa-solid fa-plus" /> {busy ? 'Creating…' : 'Create Teacher Account'}
        </button>
      </div>
    </>
  );
}

function InfoModal({ item, eyebrow, idLabel, idKey, onClose }) {
  return (
    <Modal open={!!item} onClose={onClose}>
      {item && (
        <>
          <ModalHeader eyebrow={eyebrow} title={item.name} onClose={onClose} />
          <p style={{ marginBottom: 10 }}><strong>{idLabel}:</strong> {item[idKey] || '—'}</p>
          <p style={{ marginBottom: 10 }}><strong>Email:</strong> {item.email}</p>
          {item.parentEmail !== undefined && <p style={{ marginBottom: 10 }}><strong>Parent's Email:</strong> {item.parentEmail || '—'}</p>}
          <p><strong>Registered:</strong> {item.createdAt || '—'}</p>
          <ModalFooter><button className={`${s.btn} ${s.btnOutline}`} onClick={onClose}>Close</button></ModalFooter>
        </>
      )}
    </Modal>
  );
}

function ConfirmDelete({ open, eyebrow, title, children, busy, label, onCancel, onConfirm }) {
  return (
    <Modal open={open} small onClose={onCancel}>
      <ModalHeader danger eyebrow={eyebrow} title={title} onClose={onCancel} />
      <p className={s.modalDesc}>{children}</p>
      <ModalFooter>
        <button className={`${s.btn} ${s.btnOutline}`} onClick={onCancel}>Cancel</button>
        <button className={`${s.btn} ${s.btnDanger}`} disabled={busy} onClick={onConfirm}>{busy ? 'Deleting…' : label}</button>
      </ModalFooter>
    </Modal>
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

  return (
    <>
      <PortalLayout role="admin" brand="Admin Portal" links={LINKS} active={tab} title={TITLES[tab]} onSelect={setTab}>
        {tab === 'dashboard' && <Dashboard goTo={setTab} />}

        {tab === 'students' && (
          <>
            <div className={s.sectionHeader}><h2>Students</h2><p>{students.length} registered student{students.length === 1 ? '' : 's'}</p></div>
            <DataTable columns={STUDENT_COLS} rows={studentRows} searchKeys={['name', 'studentIdNumber']} placeholder="Search by name or student ID…"
              emptyText="No students found." onView={setViewStudent} onDelete={setDelStudent} />
          </>
        )}

        {tab === 'teachers' && (
          <>
            <div className={s.sectionHeader}><h2>Teachers</h2><p>{teachers.length} registered teacher{teachers.length === 1 ? '' : 's'}</p></div>
            <DataTable columns={TEACHER_COLS} rows={teachers} searchKeys={['name', 'teacherIdNumber']} placeholder="Search by name or teacher ID…"
              emptyText="No teachers found." onView={setViewTeacher} onDelete={setDelTeacher} />
          </>
        )}

        {tab === 'classes' && <ClassesGrid classes={classes} archived={false} onOpen={setDetailId} />}
        {tab === 'archivedClasses' && <ClassesGrid classes={classes} archived onOpen={setDetailId} />}
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

      <ClassDetailModal classId={detailId} onClose={() => setDetailId(null)} onDelete={(c) => { setDetailId(null); setDelClass(c); }} />

      <ConfirmDelete open={!!delClass} eyebrow="DELETE CLASS" title="Delete this class?" label="Delete class" busy={busy}
        onCancel={() => setDelClass(null)}
        onConfirm={() => remove(`/api/admin/classes/${delClass.id}`, loadClasses, () => setDelClass(null))}>
        You're about to permanently delete <strong>{delClass?.subject_name}</strong>, including all of its sessions and attendance records. This cannot be undone.
      </ConfirmDelete>
    </>
  );
}
