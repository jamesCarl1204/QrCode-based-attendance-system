import { useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import s from '../../styles/Portal.module.css';

const EMPTY_T = { teacherIdNumber: '', firstName: '', middleName: '', lastName: '', email: '', password: '' };

export default function CreateTeacher({ onCreated }) {
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
