import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { fmt12 } from '../../utils.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DetailFrame from '../../components/DetailFrame.jsx';
import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import { TABS } from './student.constants.js';
import { statusClass, rateClass, ownRecord } from './student.helpers.js';
import s from '../../styles/Portal.module.css';

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
          <>
          <div className={`${s.recordsTableWrap} ${s.studentRecordsDesktop}`}>
            <table className={s.recordsTable}>
              <thead><tr><th>Student</th><th>Time In</th><th>Status</th></tr></thead>
              <tbody>
                <tr>
                  <td>
                    <div className={s.recordStudentCell}>
                      <span className={s.recordAvatar} aria-label="Student profile"><i className="fa-solid fa-user" aria-hidden="true" /></span>
                      <span className={s.recordStudentName}>{mine.first_name} {mine.last_name}</span>
                    </div>
                  </td>
                  <td><span className={s.recordTime}>{mine.time_in ? fmt12(mine.time_in) : '—'}</span></td>
                  <td><span className={`${s.recordStatus} ${statusClass(mine.status, s)}`}>{mine.status || 'Not yet'}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className={s.studentRecordsMobile}>
            <article className={s.studentRecordCard}>
              <div className={s.studentRecordIdentity}>
                <span className={s.recordAvatar} aria-label="Student profile"><i className="fa-solid fa-user" aria-hidden="true" /></span>
                <div className={s.studentRecordInfo}>
                  <span className={s.recordStudentName}>{mine.first_name} {mine.last_name}</span>
                  <span className={s.teacherRecordTime}>Time In · {mine.time_in ? fmt12(mine.time_in) : '—'}</span>
                </div>
              </div>
              <div className={s.studentRecordStatus}>
                <span className={`${s.recordStatus} ${statusClass(mine.status, s)}`}>{mine.status || 'Not yet'}</span>
              </div>
            </article>
          </div>
          </>
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
            <div className={s.statPill}><div className={`${s.statValue} ${rateClass(stats.rate, s)}`}>{stats.rate !== null ? `${stats.rate}%` : '—'}</div><div className={s.statLabel}>Attendance Rate</div></div>
          </div>
          {stats.rate !== null && stats.rate < 75 && (
            <p className={s.fieldError} style={{ marginBottom: 12 }}>Your attendance is below 75%. Please talk to your teacher.</p>
          )}
          <div className={s.historyList}>
            {stats.history.map((h) => (
              <div key={h.id} className={s.historyItem}>
                <span>{h.date}</span>
                <span className={`${s.recordStatus} ${statusClass(h.status, s)}`}>{h.status || 'Not yet'}</span>
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
                  {mine && <span className={`${s.recordStatus} ${statusClass(st, s)}`}>{st || 'Not yet'}</span>}
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

export default ClassDetail;
