import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, homeFor } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import s from './Login.module.css';

function Field({ icon, label, error, password, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className={s.field}>
      <label className={s.label}>{label}</label>
      <div className={s.inputWrap}>
        <i className={`fa-solid ${icon} ${s.inputIcon}`} />
        <input className={s.input} {...props} type={password ? (show ? 'text' : 'password') : props.type} />
        {password && (
          <button type="button" className={s.eyeBtn} onClick={() => setShow((v) => !v)} aria-label="Show or hide password">
            <i className={`fa-solid ${show ? 'fa-eye-slash' : 'fa-eye'}`} />
          </button>
        )}
      </div>
      <p className={s.fieldError}>{error}</p>
    </div>
  );
}

const EMPTY_REG = { studentIdNumber: '', firstName: '', middleName: '', lastName: '', email: '', password: '', confirmPassword: '', parentEmail: '' };
const EMPTY_FORGOT = { email: '', newPassword: '', confirmNewPassword: '' };

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [view, setView] = useState('login'); // login | register | forgot
  const [role, setRole] = useState('student');
  const [busy, setBusy] = useState(false);
  const [general, setGeneral] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});
  const [logoOk, setLogoOk] = useState(true);

  const [login, setLogin] = useState({ email: '', password: '' });
  const [reg, setReg] = useState(EMPTY_REG);
  const [forgot, setForgot] = useState(EMPTY_FORGOT);

  // Login page is always light (doesn't touch the saved portal theme).
  useEffect(() => { document.documentElement.setAttribute('data-theme', 'light'); }, []);

  const go = (v) => { setView(v); setGeneral(''); setSuccess(''); setErrors({}); };
  const pickRole = (r) => { setRole(r); setGeneral(''); setSuccess(''); setErrors({}); };

  // Generic submit helper: posts, then maps server errors back onto fields.
  const submit = async (e, endpoint, body, onOk) => {
    e.preventDefault();
    setGeneral(''); setSuccess(''); setErrors({});
    setBusy(true);
    try {
      const d = await api(endpoint, { method: 'POST', body });
      if (d.success) await onOk(d);
      else { if (d.generalError) setGeneral(d.generalError); if (d.errors) setErrors(d.errors); }
    } catch {
      setGeneral('Unable to reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const afterAuth = async () => {
    await refresh();
    const me = await api('/api/me');
    navigate(homeFor(me.user?.role), { replace: true });
  };

  const isTeacher = role === 'teacher';

  const RoleTabs = () => (
    <div className={s.tabs}>
      <button type="button" className={`${s.tab} ${!isTeacher ? s.tabActive : ''}`} onClick={() => pickRole('student')}>
        <i className="fa-solid fa-user-graduate" /> Student
      </button>
      <button type="button" className={`${s.tab} ${isTeacher ? s.tabActive : ''}`} onClick={() => pickRole('teacher')}>
        <i className="fa-solid fa-chalkboard-user" /> Teacher
      </button>
    </div>
  );

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.brand}>
          {logoOk ? (
            <img src="/100.png" alt="Regis Marie College logo" className={s.logoImg} onError={() => setLogoOk(false)} />
          ) : (
            <div className={s.logoFallback}><i className="fa-solid fa-graduation-cap" /></div>
          )}
          <div>
            <span className={s.brandName}>Regis Marie College</span>
            <span className={s.brandSub}>QR Attendance System</span>
          </div>
        </div>
      </header>

      <main className={s.main}>
        <section className={`${s.hero} ${view !== 'login' ? s.heroHideSm : ''}`}>
          <div className={s.pill}><span className={s.pillDot} /> QR Attendance Monitoring System</div>
          <h1 className={s.headline}>
            Smart, Instant &amp; Secure <br className={s.br} />
            <span className={s.headlineAccent}>Classroom Attendance</span>
          </h1>
          <p className={s.desc}>
            Scan in seconds, keep parents informed automatically, and give teachers real-time class attendance visibility.
          </p>
          <div className={s.features}>
            <div className={s.feature}><i className="fa-solid fa-bolt" /><strong>Real-Time</strong><span>Instant logs</span></div>
            <div className={s.feature}><i className="fa-solid fa-envelope-circle-check" /><strong>Parent Alerts</strong><span>Auto notifications</span></div>
            <div className={s.feature}><i className="fa-solid fa-chart-column" /><strong>Live View</strong><span>For teachers</span></div>
          </div>
        </section>

        <section className={s.cardCol}>
          <div className={s.card}>
            {view !== 'register' && <RoleTabs />}

            {view === 'login' && (
              <>
                <div className={s.formHead}>
                  <h2>{isTeacher ? 'Teacher Portal' : 'Student Portal'}</h2>
                  <p>{isTeacher ? 'Log in to manage your classes' : 'Log in to view your attendance'}</p>
                </div>
                {general && <div className={s.alert}>{general}</div>}
                <form onSubmit={(e) => submit(e, isTeacher ? '/api/login/teacher' : '/api/login/student',
                  { email: login.email.trim(), password: login.password }, afterAuth)}>
                  <Field icon="fa-envelope" label="Email Address" type="email" placeholder="you@email.com" required value={login.email} error={errors.email}
                    onChange={(e) => setLogin({ ...login, email: e.target.value })} />
                  <Field icon="fa-lock" label="Password" password placeholder="••••••••" required value={login.password} error={errors.password}
                    onChange={(e) => setLogin({ ...login, password: e.target.value })} />
                  <div className={s.forgot}><a onClick={() => go('forgot')}>Forgot password?</a></div>
                  <button type="submit" className={s.submit} disabled={busy}>
                    {busy ? <><i className="fa-solid fa-spinner fa-spin" /> Logging in…</> : <>Log In <i className="fa-solid fa-arrow-right" /></>}
                  </button>
                </form>
                <div className={s.cardFoot}>
                  <span>New student?</span>
                  <button type="button" className={s.linkBtn} onClick={() => go('register')}>Register here</button>
                </div>
              </>
            )}

            {view === 'register' && (
              <>
                <button type="button" className={s.backBtn} onClick={() => { setReg(EMPTY_REG); go('login'); }}>
                  <i className="fa-solid fa-arrow-left" /> Back to login
                </button>
                <div className={s.formHead}>
                  <h2>Create Student Account</h2>
                  <p>Register to join your class and track your attendance</p>
                </div>
                {general && <div className={s.alert}>{general}</div>}
                <form onSubmit={(e) => submit(e, '/api/register/student',
                  { ...reg, studentIdNumber: reg.studentIdNumber.trim(), firstName: reg.firstName.trim(), middleName: reg.middleName.trim(), lastName: reg.lastName.trim(), email: reg.email.trim(), parentEmail: reg.parentEmail.trim() }, afterAuth)}>
                  <div className={s.regGrid}>
                    {[
                      ['studentIdNumber', 'fa-id-card', 'text', 'Student ID Number', 'e.g. 2024-00123', true, true],
                      ['firstName', 'fa-user', 'text', 'First Name', 'First name', true, false],
                      ['lastName', 'fa-user', 'text', 'Last Name', 'Last name', true, false],
                      ['middleName', 'fa-user', 'text', 'Middle Name (optional)', 'Middle name', false, true],
                      ['email', 'fa-envelope', 'email', 'Email Address', 'you@email.com', true, true],
                      ['password', 'fa-lock', 'password', 'Password', 'At least 8 characters', true, false],
                      ['confirmPassword', 'fa-lock', 'password', 'Confirm Password', 'Re-enter password', true, false],
                      ['parentEmail', 'fa-envelope-open-text', 'email', "Parent's Email", 'parent@email.com', true, true],
                    ].map(([k, icon, type, label, ph, req, full]) => (
                      <div key={k} className={full ? s.span2 : ''}>
                        <Field icon={icon} label={label} type={type} password={type === 'password'} placeholder={ph} required={req} value={reg[k]} error={errors[k]}
                          onChange={(e) => setReg({ ...reg, [k]: e.target.value })} />
                        {k === 'parentEmail' && <p className={s.hint}>Attendance notifications will be sent to this email.</p>}
                      </div>
                    ))}
                  </div>
                  <button type="submit" className={s.submit} disabled={busy}>
                    {busy ? <><i className="fa-solid fa-spinner fa-spin" /> Creating account…</> : <>Create Account <i className="fa-solid fa-arrow-right" /></>}
                  </button>
                </form>
              </>
            )}

            {view === 'forgot' && (
              <>
                <button type="button" className={s.backBtn} onClick={() => { setForgot(EMPTY_FORGOT); go('login'); }}>
                  <i className="fa-solid fa-arrow-left" /> Back to login
                </button>
                <div className={s.formHead}>
                  <h2>{isTeacher ? 'Reset Teacher Password' : 'Reset Student Password'}</h2>
                  <p>Enter your email and set a new password</p>
                </div>
                {general && <div className={s.alert}>{general}</div>}
                {success && <div className={`${s.alert} ${s.alertOk}`}>{success}</div>}
                <form onSubmit={(e) => submit(e, isTeacher ? '/api/forgot-password/teacher' : '/api/forgot-password/student',
                  { ...forgot, email: forgot.email.trim() },
                  () => { setForgot(EMPTY_FORGOT); setSuccess('Password reset successful. You can now log in with your new password.'); })}>
                  <Field icon="fa-envelope" label="Email Address" type="email" placeholder="you@email.com" required value={forgot.email} error={errors.email}
                    onChange={(e) => setForgot({ ...forgot, email: e.target.value })} />
                  <Field icon="fa-lock" label="New Password" password placeholder="At least 8 characters" required value={forgot.newPassword} error={errors.newPassword}
                    onChange={(e) => setForgot({ ...forgot, newPassword: e.target.value })} />
                  <Field icon="fa-lock" label="Confirm New Password" password placeholder="Re-enter new password" required value={forgot.confirmNewPassword} error={errors.confirmNewPassword}
                    onChange={(e) => setForgot({ ...forgot, confirmNewPassword: e.target.value })} />
                  <button type="submit" className={s.submit} disabled={busy}>
                    {busy ? <><i className="fa-solid fa-spinner fa-spin" /> Resetting…</> : <>Reset Password <i className="fa-solid fa-arrow-right" /></>}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className={s.footer}>&copy; 2026 Regis Marie College. QR Code-Based Attendance Monitoring System.</footer>
    </div>
  );
}