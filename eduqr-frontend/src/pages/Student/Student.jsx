import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../api.js';
import { fmt12 } from '../../utils.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PortalLayout from '../../components/PortalLayout.jsx';
import ClassCard from '../../components/ClassCard.jsx';
import DetailFrame from '../../components/DetailFrame.jsx';
import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import s from '../../styles/Portal.module.css';

const LINKS = [
  { key: 'active', icon: 'fa-book-open', label: 'My Classes' },
  { key: 'archived', icon: 'fa-box-archive', label: 'Archived Classes' },
  { key: 'scan', icon: 'fa-camera', label: 'Scan' },
];

const TABS = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'summary', label: 'Summary' },
  { key: 'members', label: 'Members' },
];

const mapClass = (c) => ({
  id: c.id, subject: c.subject_name, section: c.section, code: c.class_code, color: c.color,
  archived: !!c.archived, teacherFirstName: c.teacher_first_name, teacherEmail: c.teacher_email,
});

const statusClass = (st) =>
  st === 'Present' ? s.recordStatusPresent : st === 'Late' ? s.recordStatusLate : st === 'Absent' ? s.recordStatusAbsent : s.recordStatusPending;

const rateClass = (r) => (r === null ? '' : r >= 85 ? s.rateGood : r >= 75 ? s.rateWarn : s.rateLow);

// Pick only the logged-in student's own row (backend already filters; this is a second guard).
const ownRecord = (data, userId) =>
  data && data.success ? (data.records || []).find((r) => String(r.student_id) === String(userId)) || null : null;

function ScanModal({ open, onClose, onDone }) {
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setErr(''); setStatus('');
    const sc = new Html5Qrcode('qrReader');
    let busy = false;
    let cancelled = false;

    const start = () =>
      sc.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, onScan, () => {})
        .catch(() => setErr('Could not access camera. Please allow camera permission.'));

    async function onScan(text) {
      if (busy || cancelled) return;
      busy = true;
      await sc.stop().catch(() => {});
      setStatus('Marking attendance…');
      try {
        const d = await api('/api/attend/scan', { method: 'POST', body: { code: text } });
        if (!d.success) {
          setErr(d.generalError || 'Could not mark attendance.'); setStatus('');
          busy = false; start(); return;
        }
        setStatus(`Marked as ${d.status}${d.subject_name ? ` for ${d.subject_name}` : ''} at ${fmt12(d.time_in)}`);
        onDone(d);
        setTimeout(onClose, 1500);
      } catch {
        setErr('Something went wrong. Please try again.'); setStatus('');
        busy = false; start();
      }
    }

    start();
    return () => { cancelled = true; sc.stop().then(() => sc.clear()).catch(() => {}); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title="Scan Attendance QR" onClose={onClose} />
      <div className={s.modalBody}>
        <div id="qrReader" style={{ width: '100%' }} />
        <p className={s.fieldError}>{err}</p>
        <p className={s.modalDesc}>{status}</p>
      </div>
      <ModalFooter><button className={`${s.btn} ${s.btnOutline}`} onClick={onClose}>Cancel</button></ModalFooter>
    </Modal>
  );
}

/* ---------- Own record for one session (no classmates) ---------- */
function RecordsPage({ session, onBack }) {
  const { user } = useAuth();
  const [mine, setMine] = useState(undefined); // undefined = loading, null = none, false = error

  useEffect(() => {
    let alive = true;
    setMine(undefined);
    api(`/api/sessions/${session.id}/records`)
      .then((d) => { if (alive) setMine(d.success ? ownRecord(d, user?.id) : false); })
      .catch(() => { if (alive) setMine(false); });
    return () => { alive = false; };
  }, [session.id, user?.id]);

  return (
    <div className={s.mainContent}>
      <button className={`${s.btn} ${s.btnOutline}`} onClick={onBack} style={{ marginBottom: 20 }}>← Back to sessions</button>
      <div className={s.sectionHeader}>
        <h2>My Record · {session.session_date}</h2>
        <p>{fmt12(session.start_time)} – {fmt12(session.end_time)} · Late after {fmt12(session.late_after)}</p>
      </div>
      <div className={`${s.panel} ${s.sessionRecordsPanel}`}>
        {mine === undefined && <p className={s.mutedText}>Loading…</p>}
        {mine === false && <p className={s.mutedText}>Could not load your record.</p>}
        {mine === null && <p className={s.mutedText}>No record found for you in this session.</p>}
        {mine && (
          <div className={s.recordsTableWrap}>
            <table className={s.recordsTable}>
              <thead><tr><th>Student</th><th>Time In</th><th>Status</th></tr></thead>
              <tbody>
                <tr>
                  <td>
                    <div className={s.recordStudentCell}>
                      <span className={s.recordAvatar}>{mine.first_name?.charAt(0)}{mine.last_name?.charAt(0)}</span>
                      <span className={s.recordStudentName}>{mine.first_name} {mine.last_name}</span>
                    </div>
                  </td>
                  <td><span className={s.recordTime}>{mine.time_in ? fmt12(mine.time_in) : '—'}</span></td>
                  <td><span className={`${s.recordStatus} ${statusClass(mine.status)}`}>{mine.status || 'Not yet'}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Summary tab: own attendance in this class ---------- */
function SummaryTab({ sessions, mine }) {
  const stats = useMemo(() => {
    if (!mine) return null;
    let present = 0, late = 0, absent = 0;
    const history = sessions.map((x) => {
      const r = mine[x.id];
      const st = r?.status || null;
      if (st === 'Present') present++;
      else if (st === 'Late') late++;
      else if (st === 'Absent') absent++;
      return { id: x.id, date: x.session_date, status: st };
    });
    const counted = present + late + absent;
    return { present, late, absent, counted, history, rate: counted > 0 ? Math.round(((present + late) / counted) * 100) : null };
  }, [sessions, mine]);

  if (sessions.length === 0) {
    return (
      <div className={s.emptyState}>
        <div className={s.emptyIcon}><i className="fa-solid fa-chart-simple" /></div>
        <h3>No data yet</h3><p>Your summary will show up once your teacher opens attendance sessions.</p>
      </div>
    );
  }

  return (
    <>
      <div className={s.tabHeaderRow}>
        <div><h3>My Summary</h3><p>Your attendance in this class across ended sessions</p></div>
      </div>
      {!stats && <p className={s.mutedText}>Loading…</p>}
      {stats && (
        <>
          <div className={s.statPillRow}>
            <div className={s.statPill}><div className={`${s.statValue} ${s.cPresent}`}>{stats.present}</div><div className={s.statLabel}>Present</div></div>
            <div className={s.statPill}><div className={`${s.statValue} ${s.cLate}`}>{stats.late}</div><div className={s.statLabel}>Late</div></div>
            <div className={s.statPill}><div className={`${s.statValue} ${s.cAbsent}`}>{stats.absent}</div><div className={s.statLabel}>Absent</div></div>
            <div className={s.statPill}><div className={`${s.statValue} ${rateClass(stats.rate)}`}>{stats.rate !== null ? `${stats.rate}%` : '—'}</div><div className={s.statLabel}>Attendance Rate</div></div>
          </div>
          {stats.rate !== null && stats.rate < 75 && (
            <p className={s.fieldError} style={{ marginBottom: 12 }}>Your attendance is below 75%. Please talk to your teacher.</p>
          )}
          <div className={s.historyList}>
            {stats.history.map((h) => (
              <div key={h.id} className={s.historyItem}>
                <span>{h.date}</span>
                <span className={`${s.recordStatus} ${statusClass(h.status)}`}>{h.status || 'Not yet'}</span>
              </div>
            ))}
          </div>
          <p className={s.hint} style={{ marginTop: 10 }}>Rate = (Present + Late) ÷ ended sessions. Sessions that haven't ended yet are not counted.</p>
        </>
      )}
    </>
  );
}

function ClassDetail({ cls, onBack, onLeft }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('attendance');
  const [sessions, setSessions] = useState([]);
  const [mine, setMine] = useState(null); // { [sessionId]: own record | null }, null while loading
  const [members, setMembers] = useState({ teacher: null, students: [] });
  const [viewSession, setViewSession] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveErr, setLeaveErr] = useState('');
  const [leaving, setLeaving] = useState(false);

  const loadSessions = useCallback(async () => {
    const d = await api(`/api/classes/${cls.id}/sessions`);
    if (d.success) setSessions(d.sessions || []);
  }, [cls.id]);

  const loadMembers = useCallback(async () => {
    const d = await api(`/api/classes/${cls.id}/members`);
    if (d.success) setMembers({ teacher: d.teacher, students: d.students || [] });
  }, [cls.id]);

  useEffect(() => { loadSessions(); loadMembers(); }, [loadSessions, loadMembers]);
  // expose refresh to parent via window event (after a scan)
  useEffect(() => {
    const h = () => loadSessions();
    window.addEventListener('attendance-updated', h);
    return () => window.removeEventListener('attendance-updated', h);
  }, [loadSessions]);

  // Fetch the student's own record for every session (badges + summary)
  useEffect(() => {
    let alive = true;
    if (sessions.length === 0) { setMine({}); return undefined; }
    Promise.all(
      sessions.map((x) =>
        api(`/api/sessions/${x.id}/records`)
          .then((d) => [x.id, ownRecord(d, user?.id)])
          .catch(() => [x.id, null])
      )
    ).then((pairs) => { if (alive) setMine(Object.fromEntries(pairs)); });
    return () => { alive = false; };
  }, [sessions, user?.id]);

  if (viewSession) {
    return <RecordsPage session={viewSession} onBack={() => setViewSession(null)} />;
  }

  const leave = async () => {
    setLeaving(true); setLeaveErr('');
    try {
      const d = await api(`/api/classes/${cls.id}/leave`, { method: 'DELETE' });
      if (!d.success) { setLeaveErr(d.generalError || 'Could not leave this class.'); return; }
      onLeft(cls.id);
    } catch { setLeaveErr('Something went wrong. Please try again.'); } finally { setLeaving(false); }
  };

  return (
    <>
      <DetailFrame cls={cls} onBack={onBack} tab={tab} setTab={setTab} tabs={TABS}
        topAction={<button className={`${s.btn} ${s.bannerBtn}`} onClick={() => setLeaveOpen(true)}>Leave class</button>}
        extra={cls.teacherFirstName ? `Teacher: ${cls.teacherFirstName} (${cls.teacherEmail})` : ''}>
        {tab === 'attendance' && (
          <>
            <div className={s.tabHeaderRow}><div><h3>Attendance</h3><p>{sessions.length} session{sessions.length === 1 ? '' : 's'} recorded</p></div></div>
            {sessions.length === 0 && (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}><i className="fa-solid fa-qrcode" /></div>
                <h3>No attendance sessions yet</h3><p>Your teacher hasn't opened an attendance session yet.</p>
              </div>
            )}
            {sessions.map((x) => {
              const st = mine?.[x.id]?.status || null;
              return (
                <div key={x.id} className={`${s.sessionCard} ${s.clickable}`} onClick={() => setViewSession(x)}>
                  <div>
                    <div className={s.sessionDate}>{x.session_date}</div>
                    <div className={s.sessionTime}>{fmt12(x.start_time)} – {fmt12(x.end_time)} · Late after {fmt12(x.late_after)}</div>
                  </div>
                  {mine && <span className={`${s.recordStatus} ${statusClass(st)}`}>{st || 'Not yet'}</span>}
                </div>
              );
            })}
          </>
        )}

        {tab === 'summary' && <SummaryTab sessions={sessions} mine={mine} />}

        {tab === 'members' && (
          <>
            <div className={s.tabHeaderRow}><div><h3>Members</h3><p>{members.students.length} student{members.students.length === 1 ? '' : 's'} joined</p></div></div>
            <div className={s.sessionCard}>
              <div>
                <div className={s.sessionDate}>{members.teacher ? members.teacher.first_name : '—'}</div>
                <div className={s.sessionTime}>{members.teacher ? members.teacher.email : '—'}</div>
              </div>
              <span className={s.mutedText}>Teacher · Owner</span>
            </div>
            {members.students.map((m) => (
              <div key={m.id} className={s.sessionCard}>
                <div>
                  <div className={s.sessionDate}>{m.first_name} {m.last_name}</div>
                  <div className={s.sessionTime}>{m.email}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </DetailFrame>

      <Modal open={leaveOpen} small onClose={() => setLeaveOpen(false)}>
        <ModalHeader danger eyebrow="LEAVE CLASS" title="Leave this class?" onClose={() => setLeaveOpen(false)} />
        <p className={s.modalDesc}>
          You're about to leave <strong>{cls.subject}</strong>. You will no longer see this class or appear in its member list.
          You can rejoin later using the class code.
        </p>
        <p className={s.fieldError}>{leaveErr}</p>
        <ModalFooter>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setLeaveOpen(false)}>Cancel</button>
          <button className={`${s.btn} ${s.btnDanger}`} disabled={leaving} onClick={leave}>{leaving ? 'Leaving…' : 'Leave class'}</button>
        </ModalFooter>
      </Modal>
    </>
  );
}

export default function Student() {
  const [classes, setClasses] = useState([]);
  const [filter, setFilter] = useState('active');
  const [activeId, setActiveId] = useState(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [code, setCode] = useState('');
  const [joinErr, setJoinErr] = useState('');
  const [joining, setJoining] = useState(false);
  const activeRef = useRef(null);
  activeRef.current = activeId;

  useEffect(() => {
    api('/api/classes').then((d) => { if (d.success) setClasses(d.classes.map(mapClass)); });
  }, []);

  const visible = classes.filter((c) => (filter === 'archived' ? c.archived : !c.archived));
  const activeClass = classes.find((c) => c.id === activeId);

  const join = async () => {
    setJoinErr('');
    if (!code.trim()) { setJoinErr('Class code is required.'); return; }
    setJoining(true);
    try {
      const d = await api('/api/classes/join', { method: 'POST', body: { classCode: code.trim() } });
      if (!d.success) { setJoinErr(d.errors?.joinCode || d.generalError || 'Could not join class.'); return; }
      setClasses((prev) => [...prev.filter((c) => c.id !== d.class.id), mapClass(d.class)]);
      setJoinOpen(false); setCode('');
    } catch { setJoinErr('Something went wrong. Please try again.'); } finally { setJoining(false); }
  };

  if (activeClass) {
    return <ClassDetail key={activeClass.id} cls={activeClass} onBack={() => setActiveId(null)}
      onLeft={(id) => { setClasses((p) => p.filter((c) => c.id !== id)); setActiveId(null); }} />;
  }

  return (
    <>
      <PortalLayout role="student" brand="Student Portal" links={LINKS} active={filter}
        title={filter === 'archived' ? 'Archived Classes' : 'My Classes'}
        onSelect={(k) => (k === 'scan' ? setScanOpen(true) : setFilter(k))}
        headerAction={<button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setJoinOpen(true)}><i className="fa-solid fa-plus" /> <span className={s.btnLabel}>Join class</span></button>}>
        <div className={s.sectionHeader}>
          <h2>{filter === 'archived' ? 'Archived Classes' : 'My Classes'}</h2>
          <p>{visible.length} {visible.length === 1 ? 'class' : 'classes'} {filter === 'archived' ? 'archived' : 'joined'}</p>
        </div>

        {visible.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}><i className={`fa-solid ${filter === 'archived' ? 'fa-box-archive' : 'fa-book-open'}`} /></div>
            <h3>{filter === 'archived' ? 'No archived classes' : 'No classes yet'}</h3>
            <p>{filter === 'archived' ? 'Classes your teacher archives will show up here.' : 'Ask your teacher for a class code, then join it here.'}</p>
            {filter !== 'archived' && <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setJoinOpen(true)}>+ Join class</button>}
          </div>
        ) : (
          <div className={s.subjectGrid}>
            {visible.map((c) => <ClassCard key={c.id} cls={c} onOpen={() => setActiveId(c.id)} />)}
          </div>
        )}
      </PortalLayout>

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)}>
        <ModalHeader title="Join Class" onClose={() => setJoinOpen(false)} />
        <div className={s.modalBody}>
          <p className={s.modalDesc}>Enter the class code provided by your teacher.</p>
          <label htmlFor="joinCode">Class code *</label>
          <input id="joinCode" placeholder="e.g. MATH-10A" value={code} style={joinErr ? { borderColor: '#dc2626' } : undefined}
            onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && join()} />
          <p className={s.fieldError}>{joinErr}</p>
        </div>
        <ModalFooter>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setJoinOpen(false)}>Cancel</button>
          <button className={`${s.btn} ${s.btnPrimary}`} disabled={joining} onClick={join}>{joining ? 'Joining…' : 'Join'}</button>
        </ModalFooter>
      </Modal>

      <ScanModal open={scanOpen} onClose={() => setScanOpen(false)}
        onDone={(d) => { if (activeRef.current && d.class_id === activeRef.current) window.dispatchEvent(new Event('attendance-updated')); }} />
    </>
  );
}