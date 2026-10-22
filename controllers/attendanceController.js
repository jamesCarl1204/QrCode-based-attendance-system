const bcrypt = require('bcrypt');
const { findStudentByEmail, createStudent, findTeacherByEmail } = require('../models/attendanceModel');
// ===== REGISTER STUDENT =====
async function registerStudent(req, res) {
  const { firstName, middleName, lastName, email, password, parentEmail } = req.body;

  if (!firstName || !lastName || !email || !password || !parentEmail) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    const existing = await findStudentByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered.' });
    }


    const studentId = await createStudent({
      firstName, middleName, lastName, email, hashedPassword, parentEmail
    });

    return res.status(201).json({ message: 'Registration successful.', studentId });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ===== LOGIN STUDENT =====
async function loginStudent(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required.' });
  }

  try {
    const student = await findStudentByEmail(email);
    if (!student) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const match = (password, student.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    req.session.userId = student.id;
    req.session.role = 'student';

    return res.status(200).json({ message: 'Login successful.' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ===== LOGIN TEACHER (placeholder — wala ka pang teachers table) =====
async function loginTeacher(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required.' });
  }

  try {
    const teacher = await findTeacherByEmail(email);
    if (!teacher) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const match = (password, teacher.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    req.session.userId = teacher.id;
    req.session.role = 'teacher';

    return res.status(200).json({ message: 'Login successful.' });
  } catch (err) {
    console.error('Login teacher error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out.' });
    }
    res.status(200).json({ message: 'Logged out successfully.' });
  });
}

module.exports = { registerStudent, loginStudent, loginTeacher, logout };