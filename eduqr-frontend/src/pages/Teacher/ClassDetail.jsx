import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../api.js';
import { fmt12, fmtClock, phNow, toDateInput, toTimeInput } from '../../utils.js';
import { useToast } from '../../context/ToastContext.jsx';
import DetailFrame from '../../components/DetailFrame.jsx';
import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import s from '../../styles/Portal.module.css';

const timeRange = (x) => `${fmt12(x.start_time)} – ${fmt12(x.end_time)} · Late after ${fmt12(x.late_after)}`;

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
                      <td><span className={s.recordStudentName}>{r.first_name} {r.last_name}</span></td>
                      <td><span className={s.recordTime}>{r.time_in ? fmt12(r.time_in) : '—'}</span></td>
                      <td><span className={`${s.recordStatus} ${r.status === 'Present' ? s.recordStatusPresent : r.status === 'Late' ? s.recordStatusLate : r.status === 'Absent' ? s.recordStatusAbsent : s.recordStatusPending}`}>{r.status || 'Not yet'}</span></td>
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
      <DetailFrame cls={cls} onBack={onBack} tab={tab} setTab={setTab}
      
      topAction={<button className={`${s.btn} ${s.bannerBtn}`} disabled={busy} onClick={toggleArchive}>{cls.archived ? 'Restore class' : 'Archive class'}</button>}>
        {tab === 'attendance' ? (
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
        ) : (
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
