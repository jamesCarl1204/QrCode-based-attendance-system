import { useState } from 'react';
import ClassCard from '../../components/ClassCard.jsx';
import s from '../../styles/Portal.module.css';

export default function ClassesGrid({ classes, archived, onOpen }) {
  const [q, setQ] = useState('');
  const base = classes.filter((c) => !!c.archived === archived);
  const rows = base.filter((c) => {
    const n = q.trim().toLowerCase();
    if (!n) return true;
    return c.subject_name.toLowerCase().includes(n) || (c.section || '').toLowerCase().includes(n) || `${c.teacher_first_name} ${c.teacher_last_name}`.toLowerCase().includes(n);
  });
  return (
    <>
      <div className={s.tableToolbar}>
        <input className={s.searchInput} placeholder={archived ? "Search archived classes…" : "Search by subject, section, or teacher…"} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {rows.length === 0 ? (
        archived ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}><i className="fa-solid fa-box-archive" /></div>
            <h3>No archived classes</h3>
            <p>Archived classes will appear here.</p>
          </div>
        ) : <p className={s.mutedText}>No classes found.</p>
      ) : (
        <div className={s.subjectGrid}>
          {rows.map((c) => (
            <ClassCard key={c.id} showCode={false} onOpen={() => onOpen(c.id)}
              cls={{ subject: c.subject_name, section: c.section, color: c.color, archived: c.archived }}
              footer={<div className={s.cardMeta}><span>{c.total_students} student{c.total_students === 1 ? '' : 's'}</span><span>{c.total_sessions} session{c.total_sessions === 1 ? '' : 's'}</span></div>}>
              <p className={s.sectionLabel} style={{ marginTop: 6 }}>Teacher: {c.teacher_first_name} {c.teacher_last_name}</p>
            </ClassCard>
          ))}
        </div>
      )}
    </>
  );
}
