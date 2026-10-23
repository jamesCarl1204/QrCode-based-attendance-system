import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import PortalLayout from '../../components/PortalLayout.jsx';
import ClassCard from '../../components/ClassCard.jsx';
import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import Dashboard from './Dashboard.jsx';
import AiChat from './AiChat.jsx';
import ClassDetail from './ClassDetail.jsx';
import s from '../../styles/Portal.module.css';

const LINKS = [
  { key: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
  { key: 'active', icon: 'fa-book-open', label: 'My Classes' },
  { key: 'archived', icon: 'fa-box-archive', label: 'Archived Classes' },
  { key: 'ai', icon: 'fa-robot', label: 'AI Assistant', tag: 'AI' },
];
const TITLES = { dashboard: 'Dashboard', active: 'My Classes', archived: 'Archived Classes', ai: 'AI Assistant' };
const COLORS = { blue: '#2563eb', green: '#16a34a', pink: '#db2777', orange: '#ea580c', purple: '#7c3aed', teal: '#0d9488' };

const mapClass = (c) => ({ id: c.id, subject: c.subject_name, section: c.section, code: c.class_code, color: c.color, archived: !!c.archived });

export default function Teacher() {
  const toast = useToast();
  const [view, setView] = useState('dashboard');
  const [classes, setClasses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', section: '', color: 'blue' });
  const [formErr, setFormErr] = useState('');
  const [creating, setCreating] = useState(false);

  const [delClass, setDelClass] = useState(null);
  const [delErr, setDelErr] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { api('/api/classes').then((d) => { if (d.success) setClasses(d.classes.map(mapClass)); }); }, []);
  useEffect(() => {
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const filterKey = view === 'archived' ? 'archived' : 'active';
  let visible = classes.filter((c) => (filterKey === 'archived' ? c.archived : !c.archived));
  if (view === 'archived' && search.trim()) {
    const q = search.trim().toLowerCase();
    visible = visible.filter((c) => [c.subject, c.section, c.code].some((v) => (v || '').toLowerCase().includes(q)));
  }

  const setArchived = (id, archived) => setClasses((p) => p.map((c) => (c.id === id ? { ...c, archived } : c)));
  const activeClass = classes.find((c) => c.id === activeId);

  const create = async () => {
    if (!form.subject.trim()) { setFormErr('Subject name is required.'); return; }
    setCreating(true); setFormErr('');
    try {
      const d = await api('/api/classes', { method: 'POST', body: { subjectName: form.subject.trim(), section: form.section.trim(), color: form.color } });
      if (!d.success) { setFormErr(d.errors?.subjectName || d.generalError || 'Could not create class.'); return; }
      setClasses((p) => [...p, mapClass(d.class)]);
      setCreateOpen(false); setForm({ subject: '', section: '', color: 'blue' });
    } catch { setFormErr('Something went wrong. Please try again.'); } finally { setCreating(false); }
  };

  const restore = async (c) => {
    const d = await api(`/api/classes/${c.id}/archive`, { method: 'PATCH', body: { archived: false } });
    if (d.success) setArchived(c.id, false);
  };

  const confirmDelete = async () => {
    setDeleting(true); setDelErr('');
    try {
      const d = await api(`/api/classes/${delClass.id}`, { method: 'DELETE' });
      if (!d.success) { setDelErr(d.generalError || 'Could not delete this class.'); return; }
      toast(`Deleted ${delClass.subject}.`);
      setClasses((p) => p.filter((c) => c.id !== delClass.id));
      setDelClass(null);
    } catch { setDelErr('Something went wrong. Please try again.'); } finally { setDeleting(false); }
  };

  if (activeClass) {
    return <ClassDetail key={activeClass.id} cls={activeClass} onBack={() => setActiveId(null)}
      onArchiveChange={(id, archived) => { setArchived(id, archived); setActiveId(null); }} />;
  }

  const isArchivedView = view === 'archived';

  return (
    <>
      <PortalLayout role="teacher" brand="Teacher Portal" links={LINKS} active={view} title={TITLES[view]} onSelect={setView}
        headerAction={<button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setCreateOpen(true)}><i className="fa-solid fa-plus" /> <span className={s.btnLabel}>Create class</span></button>}>

        {view === 'dashboard' && <Dashboard classes={classes} onGoClasses={() => setView('active')} />}
        {view === 'ai' && <AiChat />}

        {(view === 'active' || view === 'archived') && (
          <>
            <div className={s.sectionHeader}>
              <h2>{isArchivedView ? 'Archived Subjects' : 'My Subjects'}</h2>
              <p>{visible.length} {isArchivedView ? 'archived' : 'active'} {visible.length === 1 ? 'class' : 'classes'} · School Year 2025–2026</p>
              {isArchivedView && <input className={s.searchInput} style={{ marginTop: -10, marginBottom: 22 }} placeholder="Search archived classes…" value={search} onChange={(e) => setSearch(e.target.value)} />}
            </div>

            {visible.length === 0 ? (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}><i className={`fa-solid ${isArchivedView ? 'fa-box-archive' : 'fa-book-open'}`} /></div>
                <h3>{isArchivedView ? 'No archived classes' : 'No classes yet'}</h3>
                <p>{isArchivedView ? 'Classes you archive will show up here.' : 'Add a class to get started'}</p>
                {!isArchivedView && <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setCreateOpen(true)}>+ Create class</button>}
              </div>
            ) : (
              <div className={s.subjectGrid}>
                {visible.map((c) => (
                  <ClassCard key={c.id} cls={c} onOpen={() => setActiveId(c.id)}
                    corner={c.archived && (
                      <div className={s.cardMenu} onClick={(e) => e.stopPropagation()}>
                        <button className={s.cardMenuBtn} onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}>⋮</button>
                        {openMenu === c.id && (
                          <div className={s.menuDropdown}>
                            <button onClick={() => { setOpenMenu(null); restore(c); }}>Restore</button>
                            <button style={{ color: '#fb7185' }} onClick={() => { setOpenMenu(null); setDelErr(''); setDelClass(c); }}>Delete</button>
                          </div>
                        )}
                      </div>
                    )} />
                ))}
              </div>
            )}
          </>
        )}
      </PortalLayout>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)}>
        <ModalHeader title="Create Class" onClose={() => setCreateOpen(false)} />
        <div className={s.modalBody}>
          <label>Subject name *</label>
          <input placeholder="e.g. Mathematics" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={formErr ? { borderColor: '#dc2626' } : undefined} />
          <label>Section / Grade</label>
          <input placeholder="e.g. Grade 10 - Section A" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          <label>Class code (auto-generated · share with students)</label>
          <input readOnly value={form.subject.trim() ? 'Will be generated on save' : ''} placeholder="Enter a subject name first" />
          <label>Class color</label>
          <div className={s.colorPicker}>
            {Object.entries(COLORS).map(([k, hex]) => (
              <button key={k} type="button" className={`${s.swatch} ${form.color === k ? s.swatchSelected : ''}`} style={{ background: hex }} onClick={() => setForm({ ...form, color: k })}>
                {form.color === k ? '✓' : ''}
              </button>
            ))}
          </div>
          <p className={s.fieldError}>{formErr}</p>
        </div>
        <ModalFooter>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className={`${s.btn} ${s.btnPrimary}`} disabled={creating} onClick={create}>{creating ? 'Creating…' : 'Create'}</button>
        </ModalFooter>
      </Modal>

      <Modal open={!!delClass} small onClose={() => setDelClass(null)}>
        <ModalHeader danger eyebrow="DELETE CLASS" title="Delete this class?" onClose={() => setDelClass(null)} />
        <p className={s.modalDesc}>You're about to permanently delete <strong>{delClass?.subject}</strong>. This cannot be undone.</p>
        <p className={s.fieldError}>{delErr}</p>
        <ModalFooter>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setDelClass(null)}>Cancel</button>
          <button className={`${s.btn} ${s.btnDanger}`} disabled={deleting} onClick={confirmDelete}>{deleting ? 'Deleting…' : 'Delete class'}</button>
        </ModalFooter>
      </Modal>
    </>
  );
}
