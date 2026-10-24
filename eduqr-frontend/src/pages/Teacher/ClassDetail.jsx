import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../api.js';
import { fmt12, fmtClock, phNow, toDateInput, toTimeInput } from '../../utils.js';
import { useToast } from '../../context/ToastContext.jsx';
import DetailFrame from '../../components/DetailFrame.jsx';
import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import s from '../../styles/Portal.module.css';

const timeRange = (x) => `${fmt12(x.start_time)} – ${fmt12(x.end_time)} · Late after ${fmt12(x.late_after)}`;

const TABS = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'summary', label: 'Summary' },
  { key: 'members', label: 'Members' },
];

const statusClass = (st) =>
  st === 'Present' ? s.recordStatusPresent : st === 'Late' ? s.recordStatusLate : st === 'Absent' ? s.recordStatusAbsent : s.recordStatusPending;

const rateClass = (r) => (r === null ? '' : r >= 85 ? s.rateGood : r >= 75 ? s.rateWarn : s.rateLow);

/* ---------- Overall attendance per student ---------- */
function SummaryTab({ sessions }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    Promise.all(
      sessions.map((x) =>
        api(`/api/sessions/${x.id}/records`)
          .then((d) => ({ session: x, records: d.success ? d.records || [] : [] }))
          .catch(() => ({ session: x, records: [] }))
      )
    ).then((all) => {
      if (!alive) return;
      const map = new Map();
      all.forEach(({ session, records }) => {
        records.forEach((r) => {
          if (!map.has(r.student_id)) {
            map.set(r.student_id, { id: r.student_id, name: `${r.first_name} ${r.last_name}`, present: 0, late: 0, absent: 0, history: [] });
          }
          const st = map.get(r.student_id);
          if (r.status === 'Present') st.present++;
          else if (r.status === 'Late') st.late++;
          else if (r.status === 'Absent') st.absent++;
          st.history.push({ date: session.session_date, status: r.status, time_in: r.time_in });
        });
      });
      const list = [...map.values()].map((st) => {
        const counted = st.present + st.late + st.absent;
        return { ...st, counted, rate: counted > 0 ? Math.round(((st.present + st.late) / counted) * 100) : null };
      });
      setRows(list);
    });
    return () => { alive = false; };
  }, [sessions]);

  const visible = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    let list = rows.filter((r) => !needle || r.name.toLowerCase().includes(needle));
    if (filter === 'low') list = list.filter((r) => r.rate !== null && r.rate < 75);
    if (filter === 'absences') list = list.filter((r) => r.absent > 0);
    if (filter === 'late') list = list.filter((r) => r.late > 0);
    list = [...list].sort((a, b) => {
      if (sort === 'rateAsc') return (a.rate ?? 101) - (b.rate ?? 101);
      if (sort === 'rateDesc') return (b.rate ?? -1) - (a.rate ?? -1);
      if (sort === 'absent') return b.absent - a.absent;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [rows, q, filter, sort]);

  const avg = useMemo(() => {
    const rated = (rows || []).filter((r) => r.rate !== null);
    return rated.length ? Math.round(rated.reduce((n, r) => n + r.rate, 0) / rated.length) : null;
  }, [rows]);

  if (sessions.length === 0) {
    return (
      <div className={s.emptyState}>
        <div className={s.emptyIcon}><i className="fa-solid fa-chart-simple" /></div>
        <h3>No data yet</h3><p>Create an attendance session first. Student summaries will show up here.</p>
      </div>
    );
  }

  return (
    <>
      <div className={s.tabHeaderRow}>
        <div><h3>Student Summary</h3><p>Overall attendance of each student across ended sessions</p></div>
      </div>

      {rows === null && <p className={s.mutedText}>Loading…</p>}

      {rows && (
        <>
          <div className={s.statPillRow}>
            <div className={s.statPill}><div className={s.statValue}>{rows.length}</div><div className={s.statLabel}>Students</div></div>
            <div className={s.statPill}><div className={s.statValue}>{sessions.length}</div><div className={s.statLabel}>Sessions</div></div>
            <div className={s.statPill}><div className={s.statValue}>{avg !== null ? `${avg}%` : '—'}</div><div className={s.statLabel}>Class Average</div></div>
            <div className={s.statPill}><div className={s.statValue}>{rows.filter((r) => r.rate !== null && r.rate < 75).length}</div><div className={s.statLabel}>Below 75%</div></div>
          </div>

          <div className={s.summaryToolbar}>
            <input className={s.searchInput} placeholder="Search student…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className={s.selectInput} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All students</option>
              <option value="low">Low attendance (below 75%)</option>
              <option value="absences">With absences</option>
              <option value="late">With lates</option>
            </select>
            <select className={s.selectInput} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Sort: Name (A–Z)</option>
              <option value="rateAsc">Sort: Lowest rate first</option>
              <option value="rateDesc">Sort: Highest rate first</option>
              <option value="absent">Sort: Most absences</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <p className={s.mutedText}>No students match this filter.</p>
          ) : (
            <div className={s.recordsTableWrap}>
              <table className={s.recordsTable}>
                <thead><tr><th>Student</th><th>Present</th><th>Late</th><th>Absent</th><th>Rate</th></tr></thead>
                <tbody>
                  {visible.map((r) => (
                    <Fragment key={r.id}>
                      <tr className={s.summaryRow} onClick={() => setOpen(open === r.id ? null : r.id)}>
                        <td><div className={s.recordStudentCell}><span className={s.recordAvatar}>{r.name.split(' ').map((p) => p.charAt(0)).slice(0, 2).join('')}</span><span className={s.recordStudentName}>{r.name}</span></div></td>
                        <td><span className={s.cPresent}>{r.present}</span></td>
                        <td><span className={s.cLate}>{r.late}</span></td>
                        <td><span className={s.cAbsent}>{r.absent}</span></td>
                        <td><span className={rateClass(r.rate)}>{r.rate !== null ? `${r.rate}%` : '—'}</span></td>
                      </tr>
                      {open === r.id && (
                        <tr>
                          <td colSpan={5}>
                            <div className={s.historyList}>
                              {r.history.map((h, i) => (
                                <div key={i} className={s.historyItem}>
                                  <span>{h.date}</span>
                                  <span className={`${s.recordStatus} ${statusClass(h.status)}`}>{h.status || 'Not yet'}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={s.hint} style={{ marginTop: 10 }}>Rate = (Present + Late) ÷ ended sessions. Sessions that haven't ended yet are not counted. Click a student to see their record per session.</p>
        </>
      )}
    </>
  );
}

function CreateAttendanceModal({ cls, open, onClose, onCreated }) {
  const [f, setF] = useState({ date: '', start: '', end: '', late: '' });
  const [clock, setClock] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const now = phNow();
    setF({
      date: toDateInput(now), start: toTimeInput(now),
      end: toTimeInput(new Date(now.getTime() + 90 * 60000)), late: toTimeInput(new Date(now.getTime() + 10 * 60000)),
    });
    setErr('');
    const tick = () => setClock(fmtClock(phNow()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [open]);

  const submit = async () => {
    if (!f.date || !f.start || !f.end || !f.late) { setErr('Please fill out all fields.'); return; }
    setBusy(true); setErr('');
    try {
      const d = await api(`/api/classes/${cls.id}/sessions`, { method: 'POST', body: { sessionDate: f.date, startTime: f.start, endTime: f.end, lateAfter: f.late } });
      if (!d.success) { setErr(d.generalError || 'Could not open attendance.'); return; }
      onCreated(d.session);
    } catch { setErr('Something went wrong. Please try again.'); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader eyebrow="CREATE ATTENDANCE" title={cls.subject} sub={cls.section || 'No section set'} onClose={onClose} />
      <div className={s.modalBody}>
        <div className={s.liveClock}>Current time (PH): <strong>{clock}</strong></div>
        <label>Date</label>
        <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <div className={s.timeRow}>
          <div><label>Class start</label><input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
          <div><label>Class end</label><input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
        </div>
        <label>Mark as Late after</label>
        <input type="time" value={f.late} onChange={(e) => setF({ ...f, late: e.target.value })} />
        <p className={s.hint}>Students who arrive after <span>{fmt12(f.late)}</span> will be marked as late.</p>
        <p className={s.fieldError}>{err}</p>
      </div>
      <ModalFooter>
        <button className={`${s.btn} ${s.btnOutline}`} onClick={onClose}>Cancel</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={submit}>{busy ? 'Opening…' : 'Open Attendance ›'}</button>
      </ModalFooter>
    </Modal>
  );
}

function RecordsPage({ session, onBack, onChanged }) {
  const toast = useToast();
  const [records, setRecords] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await api(`/api/sessions/${session.id}/records`);
    setRecords(d.success ? d.records || [] : false);
  }, [session]);

  useEffect(() => { setRecords(null); load(); }, [load]);

  const mark = async (studentId, status) => {
    setBusy(true);
    try {
      const d = await api(`/api/sessions/${session.id}/manual-attend`, { method: 'POST', body: { studentId, status } });
      if (!d.success) { toast(d.generalError || 'Could not mark attendance.', 'error'); return; }
      toast(`Marked as ${status}.`);
      await load(); onChanged();
    } catch { toast('Something went wrong. Please try again.', 'error'); } finally { setBusy(false); }
  };

  return (
    <div className={s.mainContent}>
      <button className={`${s.btn} ${s.btnOutline}`} onClick={onBack} style={{ marginBottom: 20 }}>← Back to sessions</button>
      <div className={s.sectionHeader}>
        <h2>Session Records · {session.session_date}</h2>
        <p>{timeRange(session)}</p>
      </div>
      <div className={`${s.panel} ${s.sessionRecordsPanel}`}>
        {records === null && <p className={s.mutedText}>Loading…</p>}
        {records === false && <p className={s.mutedText}>Could not load records.</p>}
        {records && records.length === 0 && <p className={s.mutedText}>No students in this class yet.</p>}
        {records && records.length > 0 && (
          <>
            <p className={s.hint} style={{ marginBottom: 10 }}>Student has no internet or couldn't scan the QR code? Mark their attendance manually using the buttons below.</p>
            <div className={s.recordsTableWrap}>
              <table className={s.recordsTable}>
                <thead><tr><th>Student</th><th>Time In</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.student_id}>
                      <td><div className={s.recordStudentCell}><span className={s.recordAvatar}>{r.first_name?.charAt(0)}{r.last_name?.charAt(0)}</span><span className={s.recordStudentName}>{r.first_name} {r.last_name}</span></div></td>
                      <td><span className={s.recordTime}>{r.time_in ? fmt12(r.time_in) : '—'}</span></td>
                      <td><span className={`${s.recordStatus} ${statusClass(r.status)}`}>{r.status || 'Not yet'}</span></td>
                      <td>
                        <div className={s.recordActions}>
                          {['Present', 'Late', 'Absent'].map((st) => (
                            <button key={st} className={`${s.btn} ${s.btnOutline} ${s.markBtn} ${st === 'Present' ? s.recordMarkPresent : st === 'Late' ? s.recordMarkLate : s.recordMarkAbsent}`} disabled={busy} onClick={() => mark(r.student_id, st)}>{st}</button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ClassDetail({ cls, onBack, onArchiveChange }) {
  const toast = useToast();
  const [tab, setTab] = useState('attendance');
  const [sessions, setSessions] = useState([]);
  const [members, setMembers] = useState({ teacher: null, students: [] });
  const [menuId, setMenuId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [qrSession, setQrSession] = useState(null);
  const [viewSession, setViewSession] = useState(null);
  const [delSession, setDelSession] = useState(null);
  const [removeStudent, setRemoveStudent] = useState(null);
  const [removeErr, setRemoveErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loadSessions = useCallback(async () => {
    const d = await api(`/api/classes/${cls.id}/sessions`);
    if (d.success) setSessions(d.sessions || []);
  }, [cls.id]);
  const loadMembers = useCallback(async () => {
    const d = await api(`/api/classes/${cls.id}/members`);
    if (d.success) setMembers({ teacher: d.teacher, students: d.students || [] });
  }, [cls.id]);

  useEffect(() => { loadSessions(); loadMembers(); }, [loadSessions, loadMembers]);
  useEffect(() => {
    const close = () => setMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const toggleArchive = async () => {
    setBusy(true);
    try {
      const d = await api(`/api/classes/${cls.id}/archive`, { method: 'PATCH', body: { archived: !cls.archived } });
      if (!d.success) { toast(d.generalError || 'Could not update this class.', 'error'); return; }
      onArchiveChange(cls.id, !cls.archived);
    } catch { toast('Something went wrong. Please try again.', 'error'); } finally { setBusy(false); }
  };

  const confirmDeleteSession = async () => {
    setBusy(true);
    try {
      const d = await api(`/api/sessions/${delSession.id}`, { method: 'DELETE' });
      if (!d.success) { toast(d.generalError || 'Could not delete session.', 'error'); return; }
      toast(`Deleted the attendance session for ${delSession.session_date}.`);
      setDelSession(null); await loadSessions();
    } catch { toast('Something went wrong. Please try again.', 'error'); } finally { setBusy(false); }
  };

  const confirmRemove = async () => {
    setBusy(true); setRemoveErr('');
    try {
      const d = await api(`/api/classes/${cls.id}/students/${removeStudent.id}`, { method: 'DELETE' });
      if (!d.success) { setRemoveErr(d.generalError || 'Could not remove student.'); return; }
      toast(`Removed ${removeStudent.first_name} ${removeStudent.last_name} from the class. Their attendance records were kept.`);
      setRemoveStudent(null); await loadMembers();
    } catch { setRemoveErr('Something went wrong. Please try again.'); } finally { setBusy(false); }
  };

  if (viewSession) {
    return <RecordsPage session={viewSession} onBack={() => setViewSession(null)} onChanged={loadSessions} />;
  }

  return (
    <>
      <DetailFrame cls={cls} onBack={onBack} tab={tab} setTab={setTab} tabs={TABS}
        topAction={<button className={`${s.btn} ${s.bannerBtn}`} disabled={busy} onClick={toggleArchive}>{cls.archived ? 'Restore class' : 'Archive class'}</button>}>
        {tab === 'attendance' && (
          <>
            <div className={s.tabHeaderRow}>
              <div><h3>Attendance</h3><p>{sessions.length} session{sessions.length === 1 ? '' : 's'} recorded</p></div>
              {cls.archived
                ? <p className={s.archivedHint}>Restore this class to create attendance</p>
                : <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setCreateOpen(true)}>+ Create Attendance</button>}
            </div>
            {sessions.length === 0 && (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}><i className="fa-solid fa-qrcode" /></div>
                <h3>No attendance sessions yet</h3><p>Tap <strong>Create Attendance</strong> to open a session for today.</p>
              </div>
            )}
            {sessions.map((x) => (
              <div key={x.id} className={s.sessionCard}>
                <div className={s.clickable} onClick={() => setViewSession(x)}>
                  <div className={s.sessionDate}>{x.session_date}</div>
                  <div className={s.sessionTime}>{timeRange(x)}</div>
                </div>
                <div className={s.sessionActions}>
                  <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setQrSession(x)}>QR</button>
                  <div className={s.menuWrap}>
                    <button className={s.menuBtn} onClick={(e) => { e.stopPropagation(); setMenuId(menuId === x.id ? null : x.id); }}>⋮</button>
                    {menuId === x.id && (
                      <div className={s.menuDropdown}>
                        <button onClick={() => window.open(`/api/sessions/${x.id}/download`, '_blank')}>Download</button>
                        <button className="danger" style={{ color: '#fb7185' }} onClick={() => setDelSession(x)}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'summary' && <SummaryTab sessions={sessions} />}

        {tab === 'members' && (
          <>
            <div className={s.tabHeaderRow}><div><h3>Members</h3><p>{members.students.length} student{members.students.length === 1 ? '' : 's'} joined</p></div></div>
            <div className={s.sessionCard}>
              <div><div className={s.sessionDate}>{members.teacher?.first_name || '—'}</div><div className={s.sessionTime}>{members.teacher?.email || '—'}</div></div>
              <span className={s.mutedText}>Teacher · Owner</span>
            </div>
            {members.students.length === 0 && (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}><i className="fa-solid fa-user-group" /></div>
                <h3>No students yet</h3><p>Share your class code so students can join.</p>
              </div>
            )}
            {members.students.map((m) => (
              <div key={m.id} className={s.sessionCard}>
                <div><div className={s.sessionDate}>{m.first_name} {m.last_name}</div><div className={s.sessionTime}>{m.email}</div></div>
                <button className={`${s.btn} ${s.btnOutline} ${s.removeBtn}`} onClick={() => { setRemoveErr(''); setRemoveStudent(m); }}>Remove</button>
              </div>
            ))}
          </>
        )}
      </DetailFrame>

      <CreateAttendanceModal cls={cls} open={createOpen} onClose={() => setCreateOpen(false)}
        onCreated={async (sess) => { setCreateOpen(false); await loadSessions(); setQrSession(sess); }} />

      <Modal open={!!qrSession} onClose={() => setQrSession(null)}>
        {qrSession && (
          <>
            <ModalHeader eyebrow="ATTENDANCE QR" title={qrSession.session_date} sub={timeRange(qrSession)} onClose={() => setQrSession(null)} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                <div className={s.qrBox}><QRCodeSVG value={qrSession.attendance_code} size={220} level="H" bgColor="#ffffff" fgColor="#000000" /></div>
              </div>
              <p className={s.hint}>Students scan this QR using their app to mark attendance.</p>
            </div>
            <ModalFooter><button className={`${s.btn} ${s.btnOutline}`} onClick={() => setQrSession(null)}>Close</button></ModalFooter>
          </>
        )}
      </Modal>

      <Modal open={!!delSession} small onClose={() => setDelSession(null)}>
        <ModalHeader danger eyebrow="DELETE ATTENDANCE" title="Delete this session?" onClose={() => setDelSession(null)} />
        <p className={s.modalDesc}>You're about to delete the attendance session for <strong>{delSession?.session_date}</strong>. This will permanently remove every student's time-in and status for that session. This cannot be undone.</p>
        <ModalFooter>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setDelSession(null)}>Cancel</button>
          <button className={`${s.btn} ${s.btnDanger}`} disabled={busy} onClick={confirmDeleteSession}>{busy ? 'Deleting…' : 'Delete session'}</button>
        </ModalFooter>
      </Modal>

      <Modal open={!!removeStudent} small onClose={() => setRemoveStudent(null)}>
        <ModalHeader danger eyebrow="REMOVE STUDENT" title="Remove this student from the class?" onClose={() => setRemoveStudent(null)} />
        <p className={s.modalDesc}><strong>{removeStudent?.first_name} {removeStudent?.last_name}</strong> will no longer see or have access to this class. Their existing attendance records for this class will stay intact and will not be deleted.</p>
        <p className={s.fieldError}>{removeErr}</p>
        <ModalFooter>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setRemoveStudent(null)}>Cancel</button>
          <button className={`${s.btn} ${s.btnDanger}`} disabled={busy} onClick={confirmRemove}>{busy ? 'Removing…' : 'Remove student'}</button>
        </ModalFooter>
      </Modal>
    </>
  );
}