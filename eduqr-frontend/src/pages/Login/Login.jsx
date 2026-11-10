import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, homeFor } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { SiteNav } from '../Landing/Landing.jsx';
import s from './Login.module.css';

/* ---------- constants ---------- */
const EMPTY_LOGIN = { email: '', password: '' };
const EMPTY_REG = {
  studentIdNumber: '', firstName: '', middleName: '', lastName: '',
  email: '', password: '', confirmPassword: '', parentEmail: '',
};
const EMPTY_FORGOT = { email: '', newPassword: '', confirmNewPassword: '' };
const REG_TRIM = ['studentIdNumber', 'firstName', 'middleName', 'lastName', 'email', 'parentEmail'];

// `full` = spans both columns. Fields without it sit side by side.
const REG_FIELDS = [
  { key: 'studentIdNumber', icon: 'fa-id-card', label: 'Student ID Number', placeholder: 'e.g. 2024-00123', autoComplete: 'off' },
  { key: 'firstName', icon: 'fa-user', label: 'First Name', placeholder: 'First name', autoComplete: 'given-name' },
  { key: 'lastName', icon: 'fa-user', label: 'Last Name', placeholder: 'Last name', autoComplete: 'family-name' },
  { key: 'middleName', icon: 'fa-user', label: 'Middle Name (optional)', placeholder: 'Middle name', optional: true, autoComplete: 'additional-name' },
  { key: 'email', icon: 'fa-envelope', type: 'email', label: 'Email Address', placeholder: 'you@email.com', full: true, autoComplete: 'email' },
  { key: 'password', icon: 'fa-lock', type: 'password', label: 'Password', placeholder: 'At least 8 characters', autoComplete: 'new-password' },
  { key: 'confirmPassword', icon: 'fa-lock', type: 'password', label: 'Confirm Password', placeholder: 'Re-enter password', autoComplete: 'new-password' },
  { key: 'parentEmail', icon: 'fa-envelope-open-text', type: 'email', label: "Parent's Email", placeholder: 'parent@email.com', full: true, autoComplete: 'off',
    hint: 'Attendance notifications will be sent to this email.' },
];

const trimKeys = (obj, keys) => ({ ...obj, ...Object.fromEntries(keys.map((k) => [k, obj[k].trim()])) });

/* ---------- small presentational pieces ---------- */
function Field({ icon, label, error, hint, password, ...props }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const type = password ? (show ? 'text' : 'password') : props.type;
  const note = error || hint || '';

  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>{label}</label>
      <div className={s.inputWrap}>
        <i className={`fa-solid ${icon} ${s.inputIcon}`} aria-hidden="true" />
        <input
          id={id}
          className={`${s.input} ${password ? s.inputPw : ''} ${error ? s.inputErr : ''}`}
          aria-invalid={!!error}
          {...props}
          type={type}
        />
        {password && (
          <button type="button" className={s.eyeBtn} onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
            <i className={`fa-solid ${show ? 'fa-eye-slash' : 'fa-eye'}`} />
          </button>
        )}
      </div>
      {/* One fixed-height slot for hint OR error, so rows never jump or misalign */}
      <p className={`${s.note} ${error ? s.noteErr : ''}`} role={error ? 'alert' : undefined}>{note}</p>
    </div>
  );
}

function RoleTabs({ role, onPick }) {
  return (
    <div className={s.tabs} role="tablist">
      <button type="button" role="tab" aria-selected={role === 'student'} className={`${s.tab} ${role === 'student' ? s.tabActive : ''}`} onClick={() => onPick('student')}>
        <i className="fa-solid fa-user-graduate" /> Student
      </button>
      <button type="button" role="tab" aria-selected={role === 'teacher'} className={`${s.tab} ${role === 'teacher' ? s.tabActive : ''}`} onClick={() => onPick('teacher')}>
        <i className="fa-solid fa-chalkboard-user" /> Teacher
      </button>
    </div>
  );
}

function SubmitButton({ busy, busyText, children }) {
  return (
    <button type="submit" className={s.submit} disabled={busy}>
      {busy
        ? <><i className="fa-solid fa-spinner fa-spin" /> {busyText}</>
        : <>{children} <i className={`fa-solid fa-arrow-right ${s.submitArrow}`} /></>}
    </button>
  );
}

function Alerts({ general, success }) {
  return (
    <>
      {general && <div className={s.alert} role="alert">{general}</div>}
      {success && <div className={`${s.alert} ${s.alertOk}`} role="status">{success}</div>}
    </>
  );
}

function FormHead({ title, sub }) {
  return <div className={s.formHead}><h2>{title}</h2><p>{sub}</p></div>;
}

function BackButton({ onClick }) {
  return <button type="button" className={s.backBtn} onClick={onClick}><i className="fa-solid fa-arrow-left" /> Back to login</button>;
}

/* ---------- page ---------- */
export default function Login({ embedded = false } = {}) {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [view, setView] = useState('login'); // login | register | forgot
  const [role, setRole] = useState('student');
  const [busy, setBusy] = useState(false);
  const [general, setGeneral] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});
  const [logoOk, setLogoOk] = useState(true);

  const [login, setLogin] = useState(EMPTY_LOGIN);
  const [reg, setReg] = useState(EMPTY_REG);
  const [forgot, setForgot] = useState(EMPTY_FORGOT);

  const isTeacher = role === 'teacher';

  // Login page is always light (doesn't touch the saved portal theme).
  useEffect(() => { document.documentElement.setAttribute('data-theme', 'light'); }, []);

  const clearMessages = () => { setGeneral(''); setSuccess(''); setErrors({}); };
  const go = (next) => { clearMessages(); setReg(EMPTY_REG); setForgot(EMPTY_FORGOT); setView(next); };
  const pickRole = (r) => { clearMessages(); setRole(r); };

  // Wires an input to its form state + server error, and clears that error while typing.
  const bind = (form, setForm, key) => ({
    value: form[key],
    error: errors[key],
    onChange: (e) => {
      const { value } = e.target;
      setForm((f) => ({ ...f, [key]: value }));
      setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
    },
  });

  // Posts, then maps server errors back onto fields.
  const submit = (endpoint, body, onOk) => async (e) => {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      const d = await api(endpoint, { method: 'POST', body });
      if (d.success) await onOk(d);
      else {
        if (d.generalError) setGeneral(d.generalError);
        if (d.errors) setErrors(d.errors);
      }
    } catch {
      setGeneral('Unable to reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const afterAuth = async () => {
    const me = await refresh();
    navigate(homeFor(me?.role), { replace: true });
  };

  const solo = view === 'register'; // register gets a single wider card (no banner)

  return (
    <div className={`${s.page} ${embedded ? s.embeddedPage : ''}`}>
      {!embedded && <SiteNav hideAuth />}
      <div className={s.stage}>
        <div className={`${s.shell} ${solo ? s.shellSolo : ''}`}>

          {/* ---------- LEFT: form pane ---------- */}
          <section className={s.formPane}>
            <div>
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

              {view !== 'register' && <RoleTabs role={role} onPick={pickRole} />}

              {view === 'login' && (
                <>
                  <FormHead
                    title={isTeacher ? 'Teacher Portal' : 'Student Portal'}
                    sub={isTeacher ? 'Log in to manage your classes' : 'Log in to view your attendance'} />
                  <Alerts general={general} />
                  <form onSubmit={submit(isTeacher ? '/api/login/teacher' : '/api/login/student',
                    { email: login.email.trim(), password: login.password }, afterAuth)}>
                    <Field icon="fa-envelope" label="Email Address" type="email" placeholder="you@gmail.com" autoComplete="email" required
                      {...bind(login, setLogin, 'email')} />
                    <Field icon="fa-lock" label="Password" password placeholder="••••••••" autoComplete="current-password" required
                      {...bind(login, setLogin, 'password')} />
                    <div className={s.forgot}>
                      <button type="button" className={s.linkBtn} onClick={() => go('forgot')}>Forgot password?</button>
                    </div>
                    <SubmitButton busy={busy} busyText="Logging in…">Log In</SubmitButton>
                  </form>
                </>
              )}

              {view === 'register' && (
                <>
                  <BackButton onClick={() => go('login')} />
                  <FormHead title="Create Student Account" sub="Register to join your class and track your attendance" />
                  <Alerts general={general} />
                  <form onSubmit={submit('/api/register/student', trimKeys(reg, REG_TRIM), afterAuth)}>
                    <div className={s.regGrid}>
                      {REG_FIELDS.map((f) => (
                        <div key={f.key} className={f.full ? s.span2 : undefined}>
                          <Field icon={f.icon} label={f.label} type={f.type} password={f.type === 'password'}
                            placeholder={f.placeholder} hint={f.hint} autoComplete={f.autoComplete} required={!f.optional}
                            {...bind(reg, setReg, f.key)} />
                        </div>
                      ))}
                    </div>
                    <SubmitButton busy={busy} busyText="Creating account…">Create Account</SubmitButton>
                  </form>
                </>
              )}

              {view === 'forgot' && (
                <>
                  <BackButton onClick={() => go('login')} />
                  <FormHead
                    title={isTeacher ? 'Reset Teacher Password' : 'Reset Student Password'}
                    sub="Enter your email and set a new password" />
                  <Alerts general={general} success={success} />
                  <form onSubmit={submit(isTeacher ? '/api/forgot-password/teacher' : '/api/forgot-password/student',
                    { ...forgot, email: forgot.email.trim() },
                    () => { setForgot(EMPTY_FORGOT); setSuccess('Password reset successful. You can now log in with your new password.'); })}>
                    <Field icon="fa-envelope" label="Email Address" type="email" placeholder="you@email.com" autoComplete="email" required
                      {...bind(forgot, setForgot, 'email')} />
                    <Field icon="fa-lock" label="New Password" password placeholder="At least 8 characters" autoComplete="new-password" required
                      {...bind(forgot, setForgot, 'newPassword')} />
                    <Field icon="fa-lock" label="Confirm New Password" password placeholder="Re-enter new password" autoComplete="new-password" required
                      {...bind(forgot, setForgot, 'confirmNewPassword')} />
                    <SubmitButton busy={busy} busyText="Resetting…">Reset Password</SubmitButton>
                  </form>
                </>
              )}
            </div>

            {view === 'login' && (
              <div className={s.cardFoot}>
                <span>New student?</span>
                <button type="button" className={s.linkBtn} onClick={() => go('register')}>Register here</button>
              </div>
            )}
          </section>

          {/* ---------- RIGHT: banner pane ---------- */}
          {!solo && (
            <aside className={`${s.banner} ${view !== 'login' ? s.bannerHideSm : ''}`}>
              <div className={s.gridOverlay} />
              <div className={s.glowOne} />
              <div className={s.glowTwo} />

              <div className={s.bannerTop}>
                <span className={s.pill}><span className={s.pillDot} /> QR Attendance Monitoring System</span>
                <div className={s.signUp}>
                  <span>Don&rsquo;t have an account?</span>
                  <button type="button" className={s.signUpBtn} onClick={() => go('register')}>Sign Up</button>
                </div>
              </div>

              <div className={s.hero}>
                <h1 className={s.headline}>
                  Smart, Instant &amp; <br className={s.br} />Secure{' '}
                  <span className={s.headlineAccent}>Classroom Attendance</span>
                </h1>
                <p className={s.desc}>
                  Scan in seconds, keep parents informed automatically, and give teachers real-time class attendance visibility.
                </p>
                <div className={s.features}>
                  <div className={s.feature}>
                    <span className={s.featureIcon}><i className="fa-solid fa-bolt" /></span>
                    <strong>Real-Time</strong><span className={s.featureSub}>Instant logs</span>
                  </div>
                  <div className={s.feature}>
                    <span className={s.featureIcon}><i className="fa-regular fa-envelope" /></span>
                    <strong>Parent Alerts</strong><span className={s.featureSub}>Auto notifications</span>
                  </div>
                  <div className={s.feature}>
                    <span className={s.featureIcon}><i className="fa-solid fa-chart-simple" /></span>
                    <strong>Live View</strong><span className={s.featureSub}>For teachers</span>
                  </div>
                </div>
              </div>

              <div className={s.bannerFoot}>
                <span>Regis Marie College &copy; 2026</span>
                <span><i className="fa-solid fa-shield-halved" /> Secure Portal</span>
              </div>
            </aside>
          )}
        </div>
      </div>

      {!embedded && <footer className={s.footer}>&copy; 2026 Regis Marie College. QR Code-Based Attendance Monitoring System.</footer>}
    </div>
  );
}