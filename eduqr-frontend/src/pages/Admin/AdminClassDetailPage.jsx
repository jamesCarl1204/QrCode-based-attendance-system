import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { fmt12 } from '../../utils.js';
import DetailFrame from '../../components/DetailFrame.jsx';
import s from '../../styles/Portal.module.css';

export default function AdminClassDetailPage({ cls, onBack, onDelete }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('attendance');
  const [viewSession, setViewSession] = useState(null);

  useEffect(() => {
    if (!cls?.id) return;
    let alive = true;
    setData(null);
    setViewSession(null);
    api(`/api/admin/classes/${cls.id}`).then((d) => {
      if (alive) setData(d.success ? d : false);
    }).catch(() => { if (alive) setData(false); });
    return () => { alive = false; };
  }, [cls?.id]);

  const detailClass = data?.class;
  const frameClass = detailClass ? {
    id: detailClass.id,
    subject: detailClass.subject_name,
    section: detailClass.section,
    code: detailClass.class_code,
    color: detailClass.color,
    archived: !!detailClass.archived,
  } : {
    id: cls.id,
    subject: cls.subject_name,
    section: cls.section,
    code: cls.class_code,
    color: cls.color,
    archived: !!cls.archived,
  };

  if (viewSession) {
    return (
      <div className={s.mainContent}>
        <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setViewSession(null)} style={{ marginBottom: 20 }}>← Back to sessions</button>
        <div className={s.sectionHeader}>
          <h2>Session Records · {viewSession.session_date}</h2>
          <p>{fmt12(viewSession.start_time)} – {fmt12(viewSession.end_time)} · Late after {fmt12(viewSession.late_after)}</p>
        </div>
        <div className={`${s.panel} ${s.sessionRecordsPanel}`}>
          {!Array.isArray(viewSession.records) && <p className={s.mutedText}>Attendance records are unavailable.</p>}
          {Array.isArray(viewSession.records) && viewSession.records.length === 0 && <p className={s.mutedText}>No students in this class yet.</p>}
          {Array.isArray(viewSession.records) && viewSession.records.length > 0 && (
            <>
            <div className={`${s.recordsTableWrap} ${s.adminRecordsDesktop}`}>
              <table className={s.recordsTable}>
                <thead><tr><th>Student</th><th>Time In</th><th>Status</th></tr></thead>
                <tbody>
                  {viewSession.records.map((record, index) => (
                    <tr key={record.student_id ?? record.studentId ?? index}>
                      <td>
                        <div className={s.recordStudentCell}>
                          <span className={s.recordAvatar} aria-label="Student profile"><i className="fa-solid fa-user" aria-hidden="true" /></span>
                          <span className={s.recordStudentName}>{record.first_name} {record.last_name}</span>
                        </div>
                      </td>
                      <td><span className={s.recordTime}>{record.time_in ? fmt12(record.time_in) : '—'}</span></td>
                      <td><span className={`${s.recordStatus} ${record.status === 'Present' ? s.recordStatusPresent : record.status === 'Late' ? s.recordStatusLate : record.status === 'Absent' ? s.recordStatusAbsent : s.recordStatusPending}`}>{record.status || 'Not yet'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={s.adminRecordsMobile}>
              {viewSession.records.map((record, index) => (
                <article className={s.adminRecordCard} key={record.student_id ?? record.studentId ?? index}>
                  <div className={s.adminRecordIdentity}>
                    <span className={s.recordAvatar} aria-label="Student profile"><i className="fa-solid fa-user" aria-hidden="true" /></span>
                    <div className={s.adminRecordInfo}>
                      <span className={s.recordStudentName}>{record.first_name} {record.last_name}</span>
                      <span className={s.teacherRecordTime}>Time In · {record.time_in ? fmt12(record.time_in) : '—'}</span>
                    </div>
                  </div>
                  <div className={s.adminRecordStatus}>
                    <span className={`${s.recordStatus} ${record.status === 'Present' ? s.recordStatusPresent : record.status === 'Late' ? s.recordStatusLate : record.status === 'Absent' ? s.recordStatusAbsent : s.recordStatusPending}`}>{record.status || 'Not yet'}</span>
                  </div>
                </article>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={s.adminClassPage}>
      <DetailFrame
        cls={frameClass}
        onBack={onBack}
        tab={tab}
        setTab={setTab}
        extra={detailClass ? `Teacher: ${detailClass.teacher_first_name} ${detailClass.teacher_last_name} · ${detailClass.teacher_email}` : `Teacher: ${cls.teacher_first_name} ${cls.teacher_last_name}`}
        topAction={<button className={`${s.btn} ${s.bannerBtn}`} onClick={() => detailClass && onDelete(detailClass)}>Delete class</button>}
      >
        <div className={s.adminClassDetailContent}>
          {data === null && <p className={s.mutedText}>Loading class records…</p>}
          {data === false && <p className={s.mutedText}>Could not load class records. Please go back and try again.</p>}
          {data && tab === 'attendance' && (
            <>
              <div className={`${s.statPillRow} ${s.adminClassStats}`}>
                {[
                  ['Present', data.totals.present],
                  ['Late', data.totals.late],
                  ['Absent', data.totals.absent],
                  ['Attendance Rate', data.totals.attendanceRatePercent !== null ? `${data.totals.attendanceRatePercent}%` : '—'],
                ].map(([label, value]) => (
                  <div key={label} className={s.statPill}>
                    <div className={s.statValue}>{value}</div>
                    <div className={s.statLabel}>{label}</div>
                  </div>
                ))}
              </div>

              <div className={s.tabHeaderRow}>
                <div><h3>Attendance</h3><p>{data.sessions.length} session{data.sessions.length === 1 ? '' : 's'} recorded</p></div>
              </div>
              {data.sessions.length === 0 && (
                <div className={s.emptyState}><div className={s.emptyIcon}><i className="fa-solid fa-qrcode" /></div><h3>No attendance sessions yet</h3><p>Sessions created by the teacher will appear here.</p></div>
              )}
              {data.sessions.map((session) => (
                <div key={session.id} className={s.sessionCard}>
                  <button type="button" className={s.clickable} onClick={() => setViewSession(session)} style={{ textAlign: 'left', background: 'transparent', border: 0, color: 'inherit', font: 'inherit', padding: 0, flex: 1, minWidth: 0 }}>
                    <div className={s.sessionDate}>{session.session_date}</div>
                    <div className={s.sessionTime}>{fmt12(session.start_time)} – {fmt12(session.end_time)} · Late after {fmt12(session.late_after)}</div>
                  </button>
                  <div className={s.sessionActions}>
                    <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setViewSession(session)}>View records</button>
                    <span className={s.mutedText}>{session.ended ? 'Ended' : 'Ongoing'}</span>
                  </div>
                </div>
              ))}
            </>
          )}
          {data && tab === 'members' && (
            <>
              <div className={s.tabHeaderRow}>
                <div><h3>Members</h3><p>{data.students.length} student{data.students.length === 1 ? '' : 's'} joined</p></div>
              </div>
              <div className={s.sessionCard}>
                <span className={s.adminStudentAvatar}>{detailClass?.teacher_first_name?.charAt(0)}{detailClass?.teacher_last_name?.charAt(0)}</span>
                <div className={s.adminStudentInfo}>
                  <div className={s.sessionDate}>{detailClass ? `${detailClass.teacher_first_name} ${detailClass.teacher_last_name}` : ` ${cls.teacher_first_name} ${cls.teacher_last_name}`}</div>
                  <div className={s.sessionTime}>{detailClass?.teacher_email || '—'}</div>
                </div>
                <span className={s.mutedText}>Teacher · Owner</span>
              </div>
              {data.students.length === 0 && (
                <div className={s.emptyState}><div className={s.emptyIcon}><i className="fa-solid fa-user-group" /></div><h3>No students yet</h3><p>There are no students enrolled in this class.</p></div>
              )}
              {data.students.map((student) => (
                <div key={student.id} className={`${s.sessionCard} ${s.adminStudentCard}`}>
                  <span className={s.adminStudentAvatar}>{student.first_name?.charAt(0)}{student.last_name?.charAt(0)}</span>
                  <div className={s.adminStudentInfo}>
                    <div className={s.sessionDate}>{student.first_name} {student.last_name}</div>
                    <div className={s.sessionTime}>{student.email}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </DetailFrame>
    </div>
  );
}
