import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, homeFor } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import s from './Login.module.css';

const QR_DOTS = [[130,30],[160,30],[200,50],[240,30],[270,60],[130,70],[180,80],[220,90],[30,130],[60,150],[30,180],[90,200],[140,150],[170,180],[210,160],[250,140],[290,170],[330,150],[360,190],[140,220],[190,240],[230,220],[270,250],[310,230],[350,260],[130,280],[170,310],[220,290],[260,320],[300,300],[340,330],[180,350],[230,360],[280,350]];

function QrArt() {
  return (
    <svg className={s.qrArt} viewBox="0 0 400 400" aria-hidden="true">
      {[[20, 20], [310, 20], [20, 310]].map(([x, y]) => (
        <g key={x + '-' + y}>
          <rect x={x} y={y} width="70" height="70" rx="10" fill="none" stroke="currentColor" strokeWidth="6" />
          <rect x={x + 20} y={y + 20} width="30" height="30" rx="6" fill="currentColor" />
        </g>
      ))}
      <g fill="currentColor">{QR_DOTS.map(([x, y]) => <rect key={x + '-' + y} x={x} y={y} width="14" height="14" />)}</g>
    </svg>
  );
}

function Field({ icon, error, ...props }) {
  return (
    <>
      <div className={s.inputGroup}><i className={`fas ${icon}`} /><input {...props} /></div>
      <p className={s.fieldError}>{error}</p>
    </>
  );
}

const EMPTY_REG = { studentIdNumber: '', firstName: '', middleName: '', lastName: '', email: '', password: '', confirmPassword: '', parentEmail: '' };

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [view, setView] = useState('selector'); // selector | login | register | forgot
  const [role, setRole] = useState('student');
  const [busy, setBusy] = useState(false);
  const [general, setGeneral] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});

  const [login, setLogin] = useState({ email: '', password: '' });
  const [reg, setReg] = useState(EMPTY_REG);
  const [forgot, setForgot] = useState({ email: '', newPassword: '', confirmNewPassword: '' });

  const go = (v) => { setView(v); setGeneral(''); setSuccess(''); setErrors({}); };

  const pickRole = (r) => { setRole(r); go('login'); };

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

  return (
    <div className={s.page}>
      <div className={s.brandPanel}>
        <QrArt />
        <div className={s.brandContent}>
          <div className={s.logoWrap}>
            <img src="/logo.png" alt="School logo" className={s.logo}
              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }} />
            <div className={s.logoFallback} style={{ display: 'none' }}><i className="fas fa-graduation-cap" /></div>
          </div>
          <p className={s.eyebrow}>Regis Marie College</p>
          <h1 className={s.title}>QR Code&#8209;Based Attendance<br />Monitoring System</h1>
          <p className={s.subtext}>Real-time attendance tracking for teachers and students, powered by QR codes.</p>
          <ul className={s.points}>
            <li><i className="fas fa-qrcode" /> Instant QR check-in for every session</li>
            <li><i className="fas fa-bolt" /> Live attendance status, no paperwork</li>
            <li><i className="fas fa-shield-halved" /> Secure teacher &amp; student portals</li>
          </ul>
        </div>
      </div>

      <div className={s.authPanel}>
        <div className={s.authInner}>
          {view === 'selector' && (
            <>
              <div className={s.heading}><h1>Choose how you'd like to log in</h1></div>
              <div className={s.optionGrid}>
                <button className={s.optionCard} onClick={() => pickRole('teacher')}>
                  <div className={s.optionIcon}><i className="fas fa-chalkboard-teacher" /></div>
                  <div><h3>Teacher Login</h3><p>Manage your classes and attendance</p></div>
                  <i className={`fas fa-arrow-right ${s.optionArrow}`} />
                </button>
                <button className={s.optionCard} onClick={() => pickRole('student')}>
                  <div className={s.optionIcon}><i className="fas fa-user-graduate" /></div>
                  <div><h3>Student Login</h3><p>View and scan your attendance</p></div>
                  <i className={`fas fa-arrow-right ${s.optionArrow}`} />
                </button>
              </div>
              <div className={s.newUser}>
                <span>New Student?</span>
                <button className={s.linkBtn} onClick={() => go('register')}><i className="fas fa-user-plus" /> Register Here</button>
              </div>
            </>
          )}

          {view === 'login' && (
            <>
              <button className={s.backBtn} onClick={() => { setLogin({ email: '', password: '' }); go('selector'); }}><i className="fas fa-arrow-left" /> Back</button>
              <div className={s.formHeader}>
                <i className={`fas ${isTeacher ? 'fa-chalkboard-teacher' : 'fa-user-graduate'}`} />
                <h2>{isTeacher ? 'Teacher Login' : 'Student Login'}</h2>
                <p>{isTeacher ? 'Log in to manage your classes' : 'Log in to view your attendance'}</p>
              </div>
              {general && <div className={s.generalError}>{general}</div>}
              <form onSubmit={(e) => submit(e, isTeacher ? '/api/login/teacher' : '/api/login/student',
                { email: login.email.trim(), password: login.password }, afterAuth)}>
                <Field icon="fa-envelope" type="email" placeholder="Email Address" required value={login.email} error={errors.email}
                  onChange={(e) => setLogin({ ...login, email: e.target.value })} />
                <Field icon="fa-lock" type="password" placeholder="Password" required value={login.password} error={errors.password}
                  onChange={(e) => setLogin({ ...login, password: e.target.value })} />
                <div className={s.forgot}><a onClick={() => go('forgot')}>Forgot password?</a></div>
                <button type="submit" className={s.submit} disabled={busy}>
                  <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-sign-in-alt'}`} /> {busy ? 'Logging in…' : 'Log In'}
                </button>
              </form>
            </>
          )}

          {view === 'register' && (
            <>
              <button className={s.backBtn} onClick={() => { setReg(EMPTY_REG); go('selector'); }}><i className="fas fa-arrow-left" /> Back to Login</button>
              <div className={s.formHeader}>
                <i className="fas fa-user-plus" /><h2>Create Student Account</h2>
                <p>Register to join your class and track your attendance</p>
              </div>
              {general && <div className={s.generalError}>{general}</div>}
              <form onSubmit={(e) => submit(e, '/api/register/student',
                { ...reg, studentIdNumber: reg.studentIdNumber.trim(), firstName: reg.firstName.trim(), middleName: reg.middleName.trim(), lastName: reg.lastName.trim(), email: reg.email.trim(), parentEmail: reg.parentEmail.trim() }, afterAuth)}>
                {[
                  ['studentIdNumber', 'fa-id-card', 'text', 'Student ID Number', true],
                  ['firstName', 'fa-user', 'text', 'First Name', true],
                  ['middleName', 'fa-user', 'text', 'Middle Name (optional)', false],
                  ['lastName', 'fa-user', 'text', 'Last Name', true],
                  ['email', 'fa-envelope', 'email', 'Email Address', true],
                  ['password', 'fa-lock', 'password', 'Password (at least 8 characters)', true],
                  ['confirmPassword', 'fa-lock', 'password', 'Confirm Password', true],
                  ['parentEmail', 'fa-envelope-open-text', 'email', "Parent's Email", true],
                ].map(([k, icon, type, ph, req]) => (
                  <div key={k}>
                    <Field icon={icon} type={type} placeholder={ph} required={req} value={reg[k]} error={errors[k]}
                      onChange={(e) => setReg({ ...reg, [k]: e.target.value })} />
                    {k === 'parentEmail' && <p className={s.hint}>Attendance notifications will be sent to this email.</p>}
                  </div>
                ))}
                <button type="submit" className={s.submit} disabled={busy}>
                  <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-user-plus'}`} /> {busy ? 'Creating account…' : 'Create Account'}
                </button>
              </form>
            </>
          )}

          {view === 'forgot' && (
            <>
              <button className={s.backBtn} onClick={() => { setForgot({ email: '', newPassword: '', confirmNewPassword: '' }); go('login'); }}><i className="fas fa-arrow-left" /> Back</button>
              <div className={s.formHeader}>
                <i className="fas fa-key" />
                <h2>{isTeacher ? 'Reset Teacher Password' : 'Reset Student Password'}</h2>
                <p>Enter your email and set a new password</p>
              </div>
              {general && <div className={s.generalError}>{general}</div>}
              {success && <div className={`${s.generalError} ${s.success}`}>{success}</div>}
              <form onSubmit={(e) => submit(e, isTeacher ? '/api/forgot-password/teacher' : '/api/forgot-password/student',
                { ...forgot, email: forgot.email.trim() },
                () => { setForgot({ email: '', newPassword: '', confirmNewPassword: '' }); setSuccess('Password reset successful. You can now log in with your new password.'); })}>
                <Field icon="fa-envelope" type="email" placeholder="Email Address" required value={forgot.email} error={errors.email}
                  onChange={(e) => setForgot({ ...forgot, email: e.target.value })} />
                <Field icon="fa-lock" type="password" placeholder="New Password (at least 8 characters)" required value={forgot.newPassword} error={errors.newPassword}
                  onChange={(e) => setForgot({ ...forgot, newPassword: e.target.value })} />
                <Field icon="fa-lock" type="password" placeholder="Confirm New Password" required value={forgot.confirmNewPassword} error={errors.confirmNewPassword}
                  onChange={(e) => setForgot({ ...forgot, confirmNewPassword: e.target.value })} />
                <button type="submit" className={s.submit} disabled={busy}>
                  <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-key'}`} /> {busy ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
