const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const rateLimit = require('express-rate-limit');

require('dotenv').config();
const { sendAttendanceNotification, sendClassEndedNotification } = require('./emailService');
const { askAssistant } = require('./Aiassistant');
const app = express();
const PORT = process.env.PORT || 3000;
const bcrypt = require('bcrypt');

app.set('trust proxy', 2);


const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  timezone: '+08:00',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});


const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS: blocked request from origin ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, generalError: 'Too many attempts. Please try again later.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, generalError: 'Too many registration attempts. Please try again later.' }
});

const scanLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, generalError: 'Too many scan attempts. Please slow down and try again.' }
});



// ==== ADD THIS: insert between the "/api/login/teacher" route and "/api/logout" route in server.js ====

// Reuses the same shape/rate-limit pattern as loginLimiter/registerLimiter above.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, generalError: 'Too many attempts. Please try again later.' }
});

app.post('/api/forgot-password/student', forgotPasswordLimiter, async (req, res) => {
  const { email, newPassword, confirmNewPassword } = req.body || {};
  const errors = {};

  if (!email || !email.trim()) errors.email = 'Email is required.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!newPassword || newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters.';
  if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) errors.confirmNewPassword = 'Passwords do not match.';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    const [rows] = await pool.query('SELECT id FROM students WHERE email = ?', [email.trim()]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, errors: { email: 'No account found with this email.' } });
    }

    await pool.query('UPDATE students SET password = ? WHERE email = ?', [newPassword, email.trim()]);

    return res.json({ success: true });
  } catch (err) {
    console.error('Student forgot password error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/forgot-password/teacher', forgotPasswordLimiter, async (req, res) => {
  const { email, newPassword, confirmNewPassword } = req.body || {};
  const errors = {};

  if (!email || !email.trim()) errors.email = 'Email is required.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!newPassword || newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters.';
  if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) errors.confirmNewPassword = 'Passwords do not match.';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    const [rows] = await pool.query('SELECT id FROM teachers WHERE email = ?', [email.trim()]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, errors: { email: 'No account found with this email.' } });
    }

    await pool.query('UPDATE teachers SET password = ? WHERE email = ?', [newPassword, email.trim()]);

    return res.json({ success: true });
  } catch (err) {
    console.error('Teacher forgot password error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post('/api/register/student', registerLimiter, async (req, res) => {
  const {
    studentIdNumber, firstName, middleName, lastName,
    email, password, confirmPassword, parentEmail
  } = req.body || {};

  const errors = {};

  if (!studentIdNumber || !studentIdNumber.trim()) errors.studentIdNumber = 'Student ID number is required.';
  if (!firstName || !firstName.trim()) errors.firstName = 'First name is required.';
  if (!lastName || !lastName.trim()) errors.lastName = 'Last name is required.';
  if (!email || !email.trim()) errors.email = 'Email is required.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (confirmPassword !== undefined && password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (!parentEmail || !parentEmail.trim()) errors.parentEmail = "Parent's email is required.";
  else if (!isValidEmail(parentEmail)) errors.parentEmail = "Enter a valid parent's email address.";

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM students WHERE email = ?', [email.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, errors: { email: 'An account with this email already exists.' } });
    }

    const [existingId] = await pool.query('SELECT id FROM students WHERE student_id_number = ?', [studentIdNumber.trim()]);
    if (existingId.length > 0) {
      return res.status(400).json({ success: false, errors: { studentIdNumber: 'This student ID number is already registered.' } });
    }

    const [result] = await pool.query(
      `INSERT INTO students (student_id_number, first_name, middle_name, last_name, email, password, parent_email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        studentIdNumber.trim(),
        firstName.trim(),
        middleName ? middleName.trim() : null,
        lastName.trim(),
        email.trim(),
        await bcrypt.hash(password, 10),   
        parentEmail.trim()
      ]
    );

   
    req.session.user = {
      id: result.insertId,
      role: 'student',
      email: email.trim(),
      firstName: firstName.trim()
    };

    return res.json({ success: true, redirect: '/students/student.html' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});


app.post('/api/login/student', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, generalError: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, first_name, email, password FROM students WHERE email = ?',
      [email.trim()]
    );

  if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password))) {
      return res.status(401).json({ success: false, generalError: 'Invalid email or password.' });
    }

    const student = rows[0];
    
    req.session.user = {
      id: student.id,
      role: 'student',
      email: student.email,
      firstName: student.first_name
    }
    

    return res.json({ success: true, redirect: '/students/student.html' });
  } catch (err) {
    console.error('Student login error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});


app.post('/api/login/teacher', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, generalError: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, first_name, email, password, role FROM teachers WHERE email = ?',
      [email.trim()]
    );
      
if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password))) {
   
      return res.status(401).json({ success: false, generalError: 'Invalid email or password.' });
    }

    const teacher = rows[0];
    const role = teacher.role === 'admin' ? 'admin' : 'teacher';

    req.session.user = {
      id: teacher.id,
      role,
      email: teacher.email,
      firstName: teacher.first_name
    };

    const redirect = role === 'admin' ? '/admin/admin.html' : '/teacher/teacher.html';
    return res.json({ success: true, redirect });
  } catch (err) {
    console.error('Teacher login error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});


app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, redirect: '/login.html' });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false });
  res.json({ success: true, user: req.session.user });
});


function requireTeacher(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(401).json({ success: false, generalError: 'Not authorized.' });
  }
  next();
}


function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, generalError: 'Not authorized.' });
  }
  next();
}


function requireStudent(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'student') {
    return res.status(401).json({ success: false, generalError: 'Not authorized.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(401).json({ success: false, generalError: 'Not authorized.' });
  }
  next();
}

function generateClassCode(subjectName) {
  const prefix = (subjectName || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3) || 'CLS';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 5; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${random}`;
}


function generateAttendanceCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}


function toPHDate(dateStr, timeStr) {
  const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${t}+08:00`);
}

app.post('/api/classes', requireTeacher, async (req, res) => {
  const { subjectName, section, color } = req.body || {};

  if (!subjectName || !subjectName.trim()) {
    return res.status(400).json({ success: false, errors: { subjectName: 'Subject name is required.' } });
  }

  try {
    
    let classCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      classCode = generateClassCode(subjectName);
      const [existing] = await pool.query('SELECT id FROM classes WHERE class_code = ?', [classCode]);
      if (existing.length === 0) break;
    }

    const [result] = await pool.query(
      `INSERT INTO classes (teacher_id, subject_name, section, class_code, color)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.session.user.id,
        subjectName.trim(),
        section ? section.trim() : null,
        classCode,
        color || 'blue'
      ]
    );

    return res.json({
      success: true,
      class: {
        id: result.insertId,
        subject_name: subjectName.trim(),
        section: section ? section.trim() : null,
        class_code: classCode,
        color: color || 'blue'
      }
    });
  } catch (err) {
    console.error('Create class error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.get('/api/classes', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role === 'teacher') {
      const [rows] = await pool.query(
        'SELECT id, subject_name, section, class_code, color, created_at, archived FROM classes WHERE teacher_id = ? ORDER BY created_at DESC',
        [req.session.user.id]
      );
      return res.json({ success: true, classes: rows });
    }

    const [rows] = await pool.query(
      `SELECT c.id, c.subject_name, c.section, c.class_code, c.color, c.created_at, c.archived,
              t.first_name AS teacher_first_name, t.email AS teacher_email
       FROM classes c
       JOIN class_students cs ON cs.class_id = c.id
       JOIN teachers t ON t.id = c.teacher_id
       WHERE cs.student_id = ? AND cs.removed_at IS NULL
       ORDER BY cs.joined_at DESC`,
      [req.session.user.id]
    );
    return res.json({ success: true, classes: rows });
  } catch (err) {
    console.error('List classes error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});



app.patch('/api/classes/:id/archive', requireTeacher, async (req, res) => {
  const classId = req.params.id;
  const { archived } = req.body || {};

  if (typeof archived !== 'boolean') {
    return res.status(400).json({ success: false, generalError: 'archived must be true or false.' });
  }

  try {
    const [classRows] = await pool.query(
      'SELECT id, archived FROM classes WHERE id = ? AND teacher_id = ?',
      [classId, req.session.user.id]
    );
    if (classRows.length === 0) {
      return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
    }

    await pool.query('UPDATE classes SET archived = ? WHERE id = ?', [archived ? 1 : 0, classId]);
    
    return res.json({ success: true, archived });
  } catch (err) {
    console.error('Archive class error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});


app.delete('/api/classes/:id', requireTeacher, async (req, res) => {
  const classId = req.params.id;

  try {
    const [classRows] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ?',
      [classId, req.session.user.id]
    );
    if (classRows.length === 0) {
      return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
    }

const [[{ studentCount }]] = await pool.query(
      'SELECT COUNT(*) AS studentCount FROM class_students WHERE class_id = ? AND removed_at IS NULL',
      [classId]
    );
    
    if (studentCount > 0) {
      return res.status(400).json({ success: false, generalError: 'This class still has enrolled students. Remove them before deleting the class.' });
    }

    const [[{ sessionCount }]] = await pool.query(
      'SELECT COUNT(*) AS sessionCount FROM attendance_sessions WHERE class_id = ?',
      [classId]
    );
    if (sessionCount > 0) {
      return res.status(400).json({ success: false, generalError: 'This class still has attendance records. It cannot be deleted.' });
    }

    await pool.query('DELETE FROM class_students WHERE class_id = ?', [classId]);
    await pool.query('DELETE FROM classes WHERE id = ?', [classId]);

    return res.json({ success: true });
  } catch (err) {
    console.error('Delete class error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});


app.post('/api/classes/join', requireStudent, async (req, res) => {
  const { classCode } = req.body || {};

  if (!classCode || !classCode.trim()) {
    return res.status(400).json({ success: false, errors: { joinCode: 'Class code is required.' } });
  }

  try {
    const code = classCode.trim().toUpperCase();
    const [classRows] = await pool.query(
      `SELECT c.id, c.subject_name, c.section, c.class_code, c.color, c.archived,
              t.first_name AS teacher_first_name, t.email AS teacher_email
       FROM classes c
       JOIN teachers t ON t.id = c.teacher_id
       WHERE c.class_code = ?`,
      [code]
    );

    if (classRows.length === 0) {
      return res.status(404).json({ success: false, errors: { joinCode: 'Invalid class code.' } });
    }

    const cls = classRows[0];

    const [existing] = await pool.query(
      'SELECT id, removed_at FROM class_students WHERE class_id = ? AND student_id = ?',
      [cls.id, req.session.user.id]
    );
    if (existing.length > 0 && existing[0].removed_at === null) {
      return res.status(400).json({ success: false, errors: { joinCode: 'You are already enrolled in this class.' } });
    }

    if (existing.length > 0 && existing[0].removed_at !== null) {
      // Previously removed — re-enroll by clearing removed_at instead of inserting a duplicate row
      await pool.query(
        'UPDATE class_students SET removed_at = NULL, joined_at = NOW() WHERE id = ?',
        [existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO class_students (class_id, student_id) VALUES (?, ?)',
        [cls.id, req.session.user.id]
      );
    }

    return res.json({ success: true, class: cls });
  } catch (err) {
    console.error('Join class error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.delete('/api/classes/:id/leave', requireStudent, async (req, res) => {
  const classId = req.params.id;

  try {
    const [enrolled] = await pool.query(
      'SELECT id FROM class_students WHERE class_id = ? AND student_id = ? AND removed_at IS NULL',
      [classId, req.session.user.id]
    );
    if (enrolled.length === 0) {
      return res.status(404).json({ success: false, generalError: 'You are not enrolled in this class.' });
    }

    await pool.query(
      'UPDATE class_students SET removed_at = NOW() WHERE class_id = ? AND student_id = ? AND removed_at IS NULL',
      [classId, req.session.user.id]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Leave class error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.get('/api/classes/:id/members', requireAuth, async (req, res) => {
  const classId = req.params.id;

  try {
    const [classRows] = await pool.query(
      'SELECT id, teacher_id FROM classes WHERE id = ?',
      [classId]
    );
    if (classRows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Class not found.' });
    }
    const cls = classRows[0];

    if (req.session.user.role === 'teacher') {
      if (cls.teacher_id !== req.session.user.id) {
        return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
      }
    } else {
      const [enrolled] = await pool.query(
        'SELECT id FROM class_students WHERE class_id = ? AND student_id = ? AND removed_at IS NULL',
        [classId, req.session.user.id]
      );
      if (enrolled.length === 0) {
        return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
      }
    }

    const [teacherRows] = await pool.query(
      'SELECT first_name, email FROM teachers WHERE id = ?',
      [cls.teacher_id]
    );

    const [studentRows] = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.email, cs.joined_at
       FROM class_students cs
       JOIN students s ON s.id = cs.student_id
       WHERE cs.class_id = ? AND cs.removed_at IS NULL
       ORDER BY cs.joined_at ASC`,
      [classId]
    );

    return res.json({
      success: true,
      teacher: teacherRows[0] || null,
      students: studentRows
    });
  } catch (err) {
    console.error('Members error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});



app.delete('/api/classes/:classId/students/:studentId', requireTeacher, async (req, res) => {
  const { classId, studentId } = req.params;

  try {
    const [classRows] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ?',
      [classId, req.session.user.id]
    );
    if (classRows.length === 0) {
      return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
    }

    const [enrolledRows] = await pool.query(
      'SELECT id FROM class_students WHERE class_id = ? AND student_id = ? AND removed_at IS NULL',
      [classId, studentId]
    );
    if (enrolledRows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Student is not enrolled in this class.' });
    }

    await pool.query(
      'UPDATE class_students SET removed_at = NOW() WHERE class_id = ? AND student_id = ?',
      [classId, studentId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Remove student from class error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});


function getCurrentTimeString() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}


app.post('/api/classes/:id/sessions', requireTeacher, async (req, res) => {
  const classId = req.params.id;
  const { sessionDate, startTime, endTime, lateAfter } = req.body || {};

  if (!sessionDate || !startTime || !endTime || !lateAfter) {
    return res.status(400).json({ success: false, generalError: 'All fields are required.' });
  }

  try {
    const [classRows] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ?',
      [classId, req.session.user.id]
    );
    if (classRows.length === 0) {
      return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
    }

    let attendanceCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      attendanceCode = generateAttendanceCode();
      const [existingCode] = await pool.query(
        'SELECT id FROM attendance_sessions WHERE attendance_code = ?',
        [attendanceCode]
      );
      if (existingCode.length === 0) break;
    }

    const [result] = await pool.query(
      `INSERT INTO attendance_sessions (class_id, session_date, class_start, class_end, late_after, attendance_code)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [classId, sessionDate, startTime, endTime, lateAfter, attendanceCode]
    );

    return res.json({
      success: true,
      session: {
        id: result.insertId,
        class_id: Number(classId),
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        late_after: lateAfter,
        attendance_code: attendanceCode
      }
    });
  } catch (err) {
    console.error('Create session error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.get('/api/classes/:id/sessions', requireAuth, async (req, res) => {
  const classId = req.params.id;

  try {
    const [classRows] = await pool.query('SELECT id, teacher_id FROM classes WHERE id = ?', [classId]);
    if (classRows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Class not found.' });
    }
    const cls = classRows[0];

    if (req.session.user.role === 'teacher') {
      if (cls.teacher_id !== req.session.user.id) {
        return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
      }
    } else {
      const [enrolled] = await pool.query(
        'SELECT id FROM class_students WHERE class_id = ? AND student_id = ? AND removed_at IS NULL',
        [classId, req.session.user.id]
      );
      if (enrolled.length === 0) {
        return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
      }
    }

    const [sessions] = await pool.query(
      `SELECT id, class_id, session_date,
              class_start AS start_time, class_end AS end_time,
              late_after, attendance_code, created_at
       FROM attendance_sessions
       WHERE class_id = ?
       ORDER BY session_date DESC, class_start DESC`,
      [classId]
    );

    return res.json({ success: true, sessions });
  } catch (err) {
    console.error('List sessions error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});


app.get('/api/sessions/:id/records', requireAuth, async (req, res) => {
  const sessionId = req.params.id;

  try {
    const [sessionRows] = await pool.query(
      `SELECT s.id, s.class_id, s.session_date,
              s.class_start AS start_time, s.class_end AS end_time,
              s.late_after, c.teacher_id
       FROM attendance_sessions s
       JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`,
      [sessionId]
    );
    if (sessionRows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Session not found.' });
    }
    const session = sessionRows[0];

    if (req.session.user.role === 'teacher') {
      if (session.teacher_id !== req.session.user.id) {
        return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
      }
    } else {
      const [enrolled] = await pool.query(
        'SELECT id FROM class_students WHERE class_id = ? AND student_id = ? AND removed_at IS NULL',
        [session.class_id, req.session.user.id]
      );
      if (enrolled.length === 0) {
        return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
      }
    }

    const [rows] = await pool.query(
      `SELECT s.id AS student_id, s.first_name, s.last_name,
              ar.time_in, ar.status
       FROM class_students cs
       JOIN students s ON s.id = cs.student_id
       LEFT JOIN attendance_records ar
         ON ar.session_id = ? AND ar.student_id = s.id
       WHERE cs.class_id = ? AND cs.removed_at IS NULL
       ORDER BY s.first_name ASC`,
      [sessionId, session.class_id]
    );

    const now = new Date();
    const sessionEnd = toPHDate(session.session_date, session.end_time);
    const isEnded = now > sessionEnd;

    const records = rows.map(r => {
      if (r.status) {
        return { student_id: r.student_id, first_name: r.first_name, last_name: r.last_name, time_in: r.time_in, status: r.status };
      }
      return {
        student_id: r.student_id,
        first_name: r.first_name,
        last_name: r.last_name,
        time_in: null,
        status: isEnded ? 'Absent' : null
      };
    });

    return res.json({ success: true, session, records });
  } catch (err) {
    console.error('Get records error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});


app.post('/api/sessions/:id/manual-attend', requireTeacher, async (req, res) => {
  const sessionId = req.params.id;
  const { studentId, status } = req.body || {};

  if (!studentId || !['Present', 'Late', 'Absent'].includes(status)) {
    return res.status(400).json({ success: false, generalError: 'Invalid request.' });
  }

  try {
    const [sessionRows] = await pool.query(
      `SELECT s.id, s.class_id, c.teacher_id
       FROM attendance_sessions s
       JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`,
      [sessionId]
    );
    if (sessionRows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Session not found.' });
    }
    if (sessionRows[0].teacher_id !== req.session.user.id) {
      return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
    }

    const [enrolled] = await pool.query(
      'SELECT id FROM class_students WHERE class_id = ? AND student_id = ? AND removed_at IS NULL',
      [sessionRows[0].class_id, studentId]
    );
    if (enrolled.length === 0) {
      return res.status(400).json({ success: false, generalError: 'Student is not enrolled in this class.' });
    }

    const timeIn = status === 'Absent' ? '00:00:00' : getCurrentTimeString();

    const [existing] = await pool.query(
      'SELECT id FROM attendance_records WHERE session_id = ? AND student_id = ?',
      [sessionId, studentId]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE attendance_records SET status = ?, time_in = ? WHERE id = ?',
        [status, timeIn, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO attendance_records (session_id, student_id, time_in, status) VALUES (?, ?, ?, ?)',
        [sessionId, studentId, timeIn, status]
      );
    }

    return res.json({ success: true, status, time_in: timeIn });
  } catch (err) {
    console.error('Manual attend error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/sessions/:id/attend', requireStudent, async (req, res) => {
  const sessionId = req.params.id;

  try {
    const [sessionRows] = await pool.query(
      `SELECT s.id, s.class_id, s.session_date,
              s.class_start AS start_time, s.class_end AS end_time,
              s.late_after
       FROM attendance_sessions s
       WHERE s.id = ?`,
      [sessionId]
    );
    if (sessionRows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Session not found.' });
    }
    const session = sessionRows[0];

    const [enrolled] = await pool.query(
      'SELECT id FROM class_students WHERE class_id = ? AND student_id = ? AND removed_at IS NULL',
      [session.class_id, req.session.user.id]
    );
    if (enrolled.length === 0) {
      return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
    }

    const now = new Date();
    const sessionStart = toPHDate(session.session_date, session.start_time);
    const lateAfter = toPHDate(session.session_date, session.late_after);
    const sessionEnd = toPHDate(session.session_date, session.end_time);

    if (now < sessionStart) {
      return res.status(400).json({ success: false, generalError: 'Attendance is not open yet.' });
    }
    if (now > sessionEnd) {
      return res.status(400).json({ success: false, generalError: 'This session has already ended.' });
    }

    const status = now > lateAfter ? 'Late' : 'Present';
    const timeIn = now.toTimeString().split(' ')[0];

    const [existing] = await pool.query(
      'SELECT id FROM attendance_records WHERE session_id = ? AND student_id = ?',
      [sessionId, req.session.user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, generalError: 'You have already attended this session.' });
    }

    await pool.query(
      'INSERT INTO attendance_records (session_id, student_id, time_in, status) VALUES (?, ?, ?, ?)',
      [sessionId, req.session.user.id, timeIn, status]
    );

    return res.json({ success: true, status, time_in: timeIn });
  } catch (err) {
    console.error('Attend error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/attend/scan', scanLimiter, requireStudent, async (req, res) => {
  const { code } = req.body || {};

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, generalError: 'Invalid QR code.' });
  }

  try {
    const [sessionRows] = await pool.query(
      `SELECT s.id, s.class_id, s.session_date,
              s.class_start AS start_time, s.class_end AS end_time,
              s.late_after
       FROM attendance_sessions s
       WHERE s.attendance_code = ?`,
      [code.trim().toUpperCase()]
    );
    if (sessionRows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'QR code not recognized. It may be expired.' });
    }
    const session = sessionRows[0];

    const [enrolled] = await pool.query(
      'SELECT id FROM class_students WHERE class_id = ? AND student_id = ? AND removed_at IS NULL',
      [session.class_id, req.session.user.id]
    );
    if (enrolled.length === 0) {
      return res.status(403).json({ success: false, generalError: 'You are not enrolled in this class.' });
    }

    const now = new Date();
    const sessionStart = toPHDate(session.session_date, session.start_time);
    const lateAfter = toPHDate(session.session_date, session.late_after);
    const sessionEnd = toPHDate(session.session_date, session.end_time);

    if (now < sessionStart) {
      return res.status(400).json({ success: false, generalError: 'Attendance is not open yet.' });
    }
    if (now > sessionEnd) {
      return res.status(400).json({ success: false, generalError: 'This session has already ended.' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM attendance_records WHERE session_id = ? AND student_id = ?',
      [session.id, req.session.user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, generalError: 'You have already attended this session.' });
    }

    const status = now > lateAfter ? 'Late' : 'Present';
    const timeIn = now.toTimeString().split(' ')[0];

   await pool.query(
      'INSERT INTO attendance_records (session_id, student_id, time_in, status) VALUES (?, ?, ?, ?)',
      [session.id, req.session.user.id, timeIn, status]
    );

    const [studentRows] = await pool.query(
      'SELECT first_name, last_name, parent_email FROM students WHERE id = ?',
      [req.session.user.id]
    );
    const [classRows2] = await pool.query(
      'SELECT subject_name FROM classes WHERE id = ?',
      [session.class_id]
    );
    if (studentRows.length > 0) {
      sendAttendanceNotification({
        parentEmail: studentRows[0].parent_email,
        studentFirstName: studentRows[0].first_name,
        studentLastName: studentRows[0].last_name,
        subjectName: classRows2[0] ? classRows2[0].subject_name : '',
        status,
        timeIn,
        sessionDate: session.session_date,
      });
    }

    return res.json({
      success: true,
      status,
      time_in: timeIn,
      subject_name: classRows2[0] ? classRows2[0].subject_name : '',
      class_id: session.class_id
    });
  } catch (err) {
    console.error('QR attend error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});


// DELETE a session (teacher only)
app.delete('/api/sessions/:id', requireTeacher, async (req, res) => {
  const sessionId = req.params.id;
  try {
    const [sessionRows] = await pool.query(
      `SELECT s.id, s.class_id, c.teacher_id
       FROM attendance_sessions s
       JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`,
      [sessionId]
    );
    if (sessionRows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Session not found.' });
    }
    if (sessionRows[0].teacher_id !== req.session.user.id) {
      return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
    }

    await pool.query('DELETE FROM attendance_records WHERE session_id = ?', [sessionId]);
    await pool.query('DELETE FROM attendance_sessions WHERE id = ?', [sessionId]);

    return res.json({ success: true });
  } catch (err) {
    console.error('Delete session error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.get('/api/sessions/:id/download', requireTeacher, async (req, res) => {
  const sessionId = req.params.id;
  try {
    const [sessionRows] = await pool.query(
      `SELECT s.id, s.class_id, s.session_date,
              s.class_start AS start_time, s.class_end AS end_time,
              s.late_after, c.teacher_id, c.subject_name, c.section
       FROM attendance_sessions s
       JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`,
      [sessionId]
    );
    if (sessionRows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Session not found.' });
    }
    const session = sessionRows[0];
    if (session.teacher_id !== req.session.user.id) {
      return res.status(403).json({ success: false, generalError: 'Not authorized for this class.' });
    }

    const [rows] = await pool.query(
      `SELECT s.first_name, s.last_name, ar.time_in, ar.status
       FROM class_students cs
       JOIN students s ON s.id = cs.student_id
       LEFT JOIN attendance_records ar
         ON ar.session_id = ? AND ar.student_id = s.id
       WHERE cs.class_id = ? AND cs.removed_at IS NULL
       ORDER BY s.first_name ASC`,
      [sessionId, session.class_id]
    );

    const now = new Date();
    const sessionEnd = toPHDate(session.session_date, session.end_time);
    const isEnded = now > sessionEnd;

    const escapeCsv = (val) => {
      const str = String(val ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const header = ['Last Name', 'First Name', 'Time In', 'Status'];
    const dataRows = rows.map(r => [
      r.last_name,
      r.first_name,
      r.time_in || '',
      r.status || (isEnded ? 'Absent' : 'Not yet')
    ]);

    const csvLines = [header, ...dataRows].map(row => row.map(escapeCsv).join(','));

    const csvContent =
      `Subject:,${escapeCsv(session.subject_name)}\n` +
      `Section:,${escapeCsv(session.section || '')}\n` +
      `Date:,${escapeCsv(session.session_date)}\n` +
      `Time:,${escapeCsv(`${session.start_time} - ${session.end_time}`)}\n\n` +
      csvLines.join('\n');

    const filenameSafe = `${session.subject_name}_${session.session_date}`.replace(/[^a-z0-9_-]/gi, '_');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameSafe}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Download session error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});


async function buildTeacherAIContext(teacherId) {
  const [classes] = await pool.query(
    'SELECT id, subject_name, section, class_code, archived FROM classes WHERE teacher_id = ?',
    [teacherId]
  );
  if (classes.length === 0) return { classes: [] };

  const classIds = classes.map((c) => c.id);

  const [students] = await pool.query(
    `SELECT cs.class_id, s.id AS student_id, s.first_name, s.last_name
     FROM class_students cs
     JOIN students s ON s.id = cs.student_id
     WHERE cs.class_id IN (?) AND cs.removed_at IS NULL`,
    [classIds]
  );

  const [sessions] = await pool.query(
    `SELECT id, class_id, session_date, class_start AS start_time, class_end AS end_time, late_after
     FROM attendance_sessions
     WHERE class_id IN (?)`,
    [classIds]
  );

  const sessionIds = sessions.map((s) => s.id);
  const [records] = sessionIds.length
    ? await pool.query(
        `SELECT session_id, student_id, status FROM attendance_records WHERE session_id IN (?)`,
        [sessionIds]
      )
    : [[]];

  const now = new Date();

  return {
    classes: classes.map((cls) => {
      const clsStudents = students.filter((s) => s.class_id === cls.id);
      const clsSessions = sessions.filter((s) => s.class_id === cls.id);

      const sessionsOut = clsSessions.map((sess) => {
        const sessionEnd = toPHDate(sess.session_date, sess.end_time);
        const ended = now > sessionEnd;
        const recsForSession = records.filter((r) => r.session_id === sess.id);

        const attendance = clsStudents.map((st) => {
          const rec = recsForSession.find((r) => r.student_id === st.student_id);
          let status;
          if (rec) status = rec.status; // 'Present' | 'Late' | 'Absent'
          else status = ended ? 'Absent' : 'Not yet (session ongoing or upcoming)';
          return { student: `${st.first_name} ${st.last_name}`, status };
        });

        return {
          session_date: sess.session_date,
          start_time: sess.start_time,
          end_time: sess.end_time,
          late_after: sess.late_after,
          ended,
          attendance, // gagamitin lang sa summary sa baba, hindi ipapadala sa AI
        };
      });

      const endedSessions = sessionsOut.filter((s) => s.ended);
      const summary = clsStudents.map((st) => {
        const name = `${st.first_name} ${st.last_name}`;
        let present = 0, late = 0, absent = 0;
        endedSessions.forEach((sess) => {
          const a = sess.attendance.find((x) => x.student === name);
          if (a?.status === 'Present') present++;
          else if (a?.status === 'Late') late++;
          else if (a?.status === 'Absent') absent++;
        });
        const totalCounted = present + late + absent;
        const attendanceRate = totalCounted > 0
          ? Math.round(((present + late) / totalCounted) * 100)
          : null;
        return { student: name, present, late, absent, totalSessionsCounted: totalCounted, attendanceRatePercent: attendanceRate };
      });

      // Ito ang ipapadala sa AI: hiwalay na ang present / late / absent
      const sessionsForAI = sessionsOut.map((s) => ({
        session_date: s.session_date,
        start_time: s.start_time,
        end_time: s.end_time,
        late_after: s.late_after,
        ended: s.ended,
        present: s.attendance.filter((a) => a.status === 'Present').map((a) => a.student),
        late: s.attendance.filter((a) => a.status === 'Late').map((a) => a.student),
        absent: s.attendance.filter((a) => a.status === 'Absent').map((a) => a.student),
        not_yet_recorded: s.attendance.filter((a) => a.status.startsWith('Not yet')).map((a) => a.student),
      }));

      return {
        subject_name: cls.subject_name,
        section: cls.section,
        class_code: cls.class_code,
        archived: !!cls.archived,
        students: clsStudents.map((s) => `${s.first_name} ${s.last_name}`),
        sessions: sessionsForAI,
        studentSummary: summary,
      };
    }),
  };
}

app.get('/api/ai/history', requireTeacher, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT role, content, created_at FROM ai_messages WHERE teacher_id = ? ORDER BY created_at ASC LIMIT 100',
      [req.session.user.id]
    );
    return res.json({ success: true, messages: rows });
  } catch (err) {
    console.error('AI history error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/ai/ask', requireTeacher, async (req, res) => {
  const { question } = req.body || {};
  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, generalError: 'Please enter a question.' });
  }

  try {
    const teacherId = req.session.user.id;

    const [historyRows] = await pool.query(
      'SELECT role, content FROM ai_messages WHERE teacher_id = ? ORDER BY created_at ASC LIMIT 20',
      [teacherId]
    );

    const contextData = await buildTeacherAIContext(teacherId);

    const answer = await askAssistant({
      question,
      contextData,
      history: historyRows,
    });

    await pool.query(
      'INSERT INTO ai_messages (teacher_id, role, content) VALUES (?, ?, ?), (?, ?, ?)',
      [teacherId, 'user', question.trim(), teacherId, 'assistant', answer]
    );

    return res.json({ success: true, answer });
  } catch (err) {
    console.error('AI ask error:', err);
    return res.status(500).json({ success: false, generalError: 'The AI assistant could not respond right now. Please try again.' });
  }
});

app.post('/api/ai/clear', requireTeacher, async (req, res) => {
  try {
    await pool.query('DELETE FROM ai_messages WHERE teacher_id = ?', [req.session.user.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('AI clear error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.get('/api/admin/students', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, student_id_number, first_name, middle_name, last_name, email, parent_email, created_at
       FROM students
       ORDER BY created_at DESC`
    );
    return res.json({ success: true, students: rows });
  } catch (err) {
    console.error('Admin list students error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.delete('/api/admin/students/:id', requireAdmin, async (req, res) => {
  const studentId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT id FROM students WHERE id = ?', [studentId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Student not found.' });
    }

    await pool.query('DELETE FROM attendance_records WHERE student_id = ?', [studentId]);
    await pool.query('DELETE FROM class_students WHERE student_id = ?', [studentId]);
    await pool.query('DELETE FROM students WHERE id = ?', [studentId]);

    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete student error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.get('/api/admin/teachers', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, teacher_id_number, first_name, middle_name, last_name, email, created_at
       FROM teachers
       WHERE role = 'teacher'
       ORDER BY created_at DESC`
    );
    return res.json({ success: true, teachers: rows });
  } catch (err) {
    console.error('Admin list teachers error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.delete('/api/admin/teachers/:id', requireAdmin, async (req, res) => {
  const teacherId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT id, role FROM teachers WHERE id = ?', [teacherId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Teacher not found.' });
    }
    if (rows[0].role === 'admin') {
      return res.status(403).json({ success: false, generalError: 'Cannot delete an admin account.' });
    }

    const [classRows] = await pool.query('SELECT id FROM classes WHERE teacher_id = ?', [teacherId]);
    const classIds = classRows.map((c) => c.id);

    if (classIds.length > 0) {
      const [sessionRows] = await pool.query('SELECT id FROM attendance_sessions WHERE class_id IN (?)', [classIds]);
      const sessionIds = sessionRows.map((s) => s.id);
      if (sessionIds.length > 0) {
        await pool.query('DELETE FROM attendance_records WHERE session_id IN (?)', [sessionIds]);
      }
      await pool.query('DELETE FROM attendance_sessions WHERE class_id IN (?)', [classIds]);
      await pool.query('DELETE FROM class_students WHERE class_id IN (?)', [classIds]);
      await pool.query('DELETE FROM classes WHERE teacher_id = ?', [teacherId]);
    }

    await pool.query('DELETE FROM ai_messages WHERE teacher_id = ?', [teacherId]);
    await pool.query('DELETE FROM teachers WHERE id = ?', [teacherId]);

    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete teacher error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/admin/teachers', requireAdmin, async (req, res) => {
  const { teacherIdNumber, firstName, middleName, lastName, email, password } = req.body || {};
  const errors = {};

  if (!teacherIdNumber || !teacherIdNumber.trim()) errors.teacherIdNumber = 'Teacher ID is required.';
  if (!firstName || !firstName.trim()) errors.firstName = 'First name is required.';
  if (!lastName || !lastName.trim()) errors.lastName = 'Last name is required.';
  if (!email || !email.trim()) errors.email = 'Email is required.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters.';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    const [existingEmail] = await pool.query('SELECT id FROM teachers WHERE email = ?', [email.trim()]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ success: false, errors: { email: 'An account with this email already exists.' } });
    }

    const [existingId] = await pool.query('SELECT id FROM teachers WHERE teacher_id_number = ?', [teacherIdNumber.trim()]);
    if (existingId.length > 0) {
      return res.status(400).json({ success: false, errors: { teacherIdNumber: 'This teacher ID is already registered.' } });
    }

    const [result] = await pool.query(
      `INSERT INTO teachers (teacher_id_number, first_name, middle_name, last_name, email, password, role)
       VALUES (?, ?, ?, ?, ?, ?, 'teacher')`,
      [
        teacherIdNumber.trim(),
        firstName.trim(),
        middleName ? middleName.trim() : null,
        lastName.trim(),
        email.trim(),
        await bcrypt.hash(password, 10) 
      ]
    );

    return res.json({
      success: true,
      teacher: {
        id: result.insertId,
        teacher_id_number: teacherIdNumber.trim(),
        first_name: firstName.trim(),
        middle_name: middleName ? middleName.trim() : null,
        last_name: lastName.trim(),
        email: email.trim()
      }
    });
  } catch (err) {
    console.error('Admin create teacher error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.get('/api/admin/classes', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.subject_name, c.section, c.class_code, c.color, c.archived, c.created_at,
              t.id AS teacher_id, t.first_name AS teacher_first_name, t.last_name AS teacher_last_name, t.email AS teacher_email,
              (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id AND cs.removed_at IS NULL) AS total_students,
              (SELECT COUNT(*) FROM attendance_sessions s WHERE s.class_id = c.id) AS total_sessions
       FROM classes c
       JOIN teachers t ON t.id = c.teacher_id
       ORDER BY c.created_at DESC`
    );
    return res.json({ success: true, classes: rows });
  } catch (err) {
    console.error('Admin list classes error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});



app.get('/api/admin/classes/:id', requireAdmin, async (req, res) => {
  const classId = req.params.id;
  try {
    const [classRows] = await pool.query(
      `SELECT c.id, c.subject_name, c.section, c.class_code, c.color, c.archived, c.created_at,
              t.id AS teacher_id, t.first_name AS teacher_first_name, t.last_name AS teacher_last_name, t.email AS teacher_email
       FROM classes c
       JOIN teachers t ON t.id = c.teacher_id
       WHERE c.id = ?`,
      [classId]
    );
    if (classRows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Class not found.' });
    }
    const cls = classRows[0];

    const [students] = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.email
       FROM class_students cs
       JOIN students s ON s.id = cs.student_id
       WHERE cs.class_id = ? AND cs.removed_at IS NULL
       ORDER BY s.first_name ASC`,
      [classId]
    );

    const [sessions] = await pool.query(
      `SELECT id, session_date, class_start AS start_time, class_end AS end_time, late_after
       FROM attendance_sessions
       WHERE class_id = ?
       ORDER BY session_date DESC, class_start DESC`,
      [classId]
    );

    const sessionIds = sessions.map((s) => s.id);
    const [records] = sessionIds.length
      ? await pool.query(
          `SELECT ar.session_id, ar.student_id, ar.time_in, ar.status, s.first_name, s.last_name
           FROM attendance_records ar
           JOIN students s ON s.id = ar.student_id
           WHERE ar.session_id IN (?)`,
          [sessionIds]
        )
      : [[]];

    const now = new Date();
    let totalPresent = 0, totalLate = 0, totalAbsent = 0;

    const sessionsOut = sessions.map((sess) => {
      const sessionEnd = toPHDate(sess.session_date, sess.end_time);
      const ended = now > sessionEnd;
      const recsForSession = records.filter((r) => r.session_id === sess.id);

      const sessionRecords = students.map((st) => {
        const rec = recsForSession.find((r) => r.student_id === st.id);
        if (rec) {
          if (rec.status === 'Present') totalPresent++;
          else if (rec.status === 'Late') totalLate++;
          return { first_name: st.first_name, last_name: st.last_name, time_in: rec.time_in, status: rec.status };
        }
        if (ended) totalAbsent++;
        return { first_name: st.first_name, last_name: st.last_name, time_in: null, status: ended ? 'Absent' : null };
      });

      return {
        id: sess.id,
        session_date: sess.session_date,
        start_time: sess.start_time,
        end_time: sess.end_time,
        late_after: sess.late_after,
        ended,
        records: sessionRecords
      };
    });

    const totalCounted = totalPresent + totalLate + totalAbsent;
    const attendanceRatePercent = totalCounted > 0
      ? Math.round(((totalPresent + totalLate) / totalCounted) * 100)
      : null;

    return res.json({
      success: true,
      class: cls,
      students,
      sessions: sessionsOut,
      totals: {
        present: totalPresent,
        late: totalLate,
        absent: totalAbsent,
        attendanceRatePercent
      }
    });
  } catch (err) {
    console.error('Admin class detail error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.delete('/api/admin/classes/:id', requireAdmin, async (req, res) => {
  const classId = req.params.id;
  try {
    const [classRows] = await pool.query('SELECT id FROM classes WHERE id = ?', [classId]);
    if (classRows.length === 0) {
      return res.status(404).json({ success: false, generalError: 'Class not found.' });
    }

    const [sessionRows] = await pool.query('SELECT id FROM attendance_sessions WHERE class_id = ?', [classId]);
    const sessionIds = sessionRows.map((s) => s.id);
    if (sessionIds.length > 0) {
      await pool.query('DELETE FROM attendance_records WHERE session_id IN (?)', [sessionIds]);
    }
    await pool.query('DELETE FROM attendance_sessions WHERE class_id = ?', [classId]);
    await pool.query('DELETE FROM class_students WHERE class_id = ?', [classId]);
    await pool.query('DELETE FROM classes WHERE id = ?', [classId]);

    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete class error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const [[{ studentCount }]] = await pool.query('SELECT COUNT(*) AS studentCount FROM students');
    const [[{ teacherCount }]] = await pool.query(
      "SELECT COUNT(*) AS teacherCount FROM teachers WHERE role = 'teacher'"
    );

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [todaySessions] = await pool.query(
      `SELECT id, class_start AS start_time, class_end AS end_time
       FROM attendance_sessions
       WHERE session_date = ?`,
      [todayStr]
    );

    const now = new Date();
    let ongoingSessions = 0;
    const endedTodaySessionIds = [];
    const overdueSessions = [];

    todaySessions.forEach((s) => {
      const start = toPHDate(todayStr, s.start_time);
      const end = toPHDate(todayStr, s.end_time);
      if (now >= start && now <= end) ongoingSessions++;
      if (now > end) {
        endedTodaySessionIds.push(s.id);
        if (now - end < 1000 * 60 * 60 * 3) overdueSessions.push(s.id);
      }
    });

    let present = 0, late = 0, absent = 0;
    if (todaySessions.length > 0) {
      const allTodayIds = todaySessions.map((s) => s.id);
      const [records] = await pool.query(
        `SELECT session_id, status FROM attendance_records WHERE session_id IN (?)`,
        [allTodayIds]
      );
      records.forEach((r) => {
        if (r.status === 'Present') present++;
        else if (r.status === 'Late') late++;
      });

      if (endedTodaySessionIds.length > 0) {
        const [enrolledCounts] = await pool.query(
          `SELECT s.id AS session_id, COUNT(cs.student_id) AS enrolled
           FROM attendance_sessions s
           JOIN class_students cs ON cs.class_id = s.class_id
           WHERE s.id IN (?) AND cs.removed_at IS NULL
           GROUP BY s.id`,
          [endedTodaySessionIds]
        );
        const recordedPerSession = {};
        records.forEach((r) => {
          if (endedTodaySessionIds.includes(r.session_id)) {
            recordedPerSession[r.session_id] = (recordedPerSession[r.session_id] || 0) + 1;
          }
        });
        enrolledCounts.forEach((row) => {
          const recorded = recordedPerSession[row.session_id] || 0;
          absent += Math.max(0, row.enrolled - recorded);
        });
      }
    }

    const totalCounted = present + late + absent;
    const attendanceRatePercent = totalCounted > 0
      ? Math.round(((present + late) / totalCounted) * 100)
      : null;

    const alerts = [];
    if (overdueSessions.length > 0) {
      alerts.push({
        severity: 'warning',
        message: `${overdueSessions.length} session${overdueSessions.length === 1 ? '' : 's'} still open past end time.`
      });
    }

    const [recentScans] = await pool.query(
      `SELECT ar.time_in, ar.status, ar.created_at, s.first_name, s.last_name, c.subject_name
       FROM attendance_records ar
       JOIN students s ON s.id = ar.student_id
       JOIN attendance_sessions sess ON sess.id = ar.session_id
       JOIN classes c ON c.id = sess.class_id
       ORDER BY ar.created_at DESC
       LIMIT 8`
    );

    const [recentClasses] = await pool.query(
      `SELECT subject_name, created_at FROM classes ORDER BY created_at DESC LIMIT 3`
    );

    const [recentTeachers] = await pool.query(
      `SELECT first_name, last_name, created_at FROM teachers WHERE role = 'teacher' ORDER BY created_at DESC LIMIT 3`
    );

    const recentActivity = [
      ...recentScans.map((r) => ({
        message: `${r.first_name} ${r.last_name} marked ${r.status} for ${r.subject_name}`,
        at: r.created_at
      })),
      ...recentClasses.map((c) => ({
        message: `${c.subject_name} class was created`,
        at: c.created_at
      })),
      ...recentTeachers.map((t) => ({
        message: `New teacher account: ${t.first_name} ${t.last_name}`,
        at: t.created_at
      }))
    ]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10);

    return res.json({
      success: true,
      totals: {
        students: studentCount,
        teachers: teacherCount,
        ongoingSessions
      },
      today: {
        present,
        late,
        absent,
        attendanceRatePercent
      },
      alerts,
      recentActivity
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
  }
});

async function checkAndNotifySessionEnd() {
  try {
    const now = new Date();

    const [sessions] = await pool.query(
      `SELECT s.id, s.class_id, s.session_date, s.class_end AS end_time, c.subject_name
       FROM attendance_sessions s
       JOIN classes c ON c.id = s.class_id
       WHERE s.absent_notified = 0`
    );

    for (const session of sessions) {
      const sessionEnd = toPHDate(session.session_date, session.end_time);
      if (now <= sessionEnd) continue;

      const [students] = await pool.query(
        `SELECT s.id, s.first_name, s.last_name, s.parent_email
         FROM class_students cs
         JOIN students s ON s.id = cs.student_id
         WHERE cs.class_id = ? AND cs.removed_at IS NULL`,
        [session.class_id]
      );

      const [records] = await pool.query(
        'SELECT student_id, time_in, status FROM attendance_records WHERE session_id = ?',
        [session.id]
      );
      const recordMap = {};
      records.forEach((r) => { recordMap[r.student_id] = r; });

      for (const st of students) {
        const record = recordMap[st.id];
        const status = record ? record.status : 'Absent';
        const timeIn = record ? record.time_in : null;

        sendClassEndedNotification({
          parentEmail: st.parent_email,
          studentFirstName: st.first_name,
          studentLastName: st.last_name,
          subjectName: session.subject_name,
          status,
          timeIn,
          sessionDate: session.session_date,
        }).catch((err) => console.error('Class ended notify email error:', err));
      }

      await pool.query('UPDATE attendance_sessions SET absent_notified = 1 WHERE id = ?', [session.id]);
    }
  } catch (err) {
    console.error('Session end notification check error:', err);
  }
}

setInterval(checkAndNotifySessionEnd, 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

