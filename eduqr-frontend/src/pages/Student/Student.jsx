import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import PortalLayout from '../../components/PortalLayout.jsx';
import ClassCard from '../../components/ClassCard.jsx';
import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import StudentDashboard from './StudentDashboard.jsx';
import ScanModal from './StudentScanModal.jsx';
import ClassDetail from './StudentClassDetail.jsx';
import s from '../../styles/Portal.module.css';
import { TITLES, LINKS } from './student.constants.js';
import { mapClass } from './student.helpers.js';


export default function Student() {
  const [classes, setClasses] = useState([]);
  const [filter, setFilter] = useState('dashboard');
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
        title={TITLES[filter]}
        onSelect={(k) => (k === 'scan' ? setScanOpen(true) : setFilter(k))}
        headerAction={<button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setJoinOpen(true)}><i className="fa-solid fa-plus" /> <span className={s.btnLabel}>Join class</span></button>}>
        {filter === 'dashboard' && <StudentDashboard onOpenClass={(id) => { setActiveId(id); }} />}

        {filter !== 'dashboard' && (
        <>
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
        </>
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