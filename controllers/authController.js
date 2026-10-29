const bcrypt = require('bcrypt');
const studentModel = require('../models/studentModel');
const teacherModel = require('../models/teacherModel');
const { isValidEmail } = require('../utils/helpers');
const { fail, fieldErrors, serverError } = require('../utils/response');

/* ---------- register (student) ---------- */
async function registerStudent(req, res) {
  const {
    studentIdNumber, firstName, middleName, lastName,
    email, password, confirmPassword, parentEmail,
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

  if (Object.keys(errors).length > 0) return fieldErrors(res, 400, errors);

  try {
    if (await studentModel.findIdByEmail(email.trim())) {
      return fieldErrors(res, 400, { email: 'An account with this email already exists.' });
    }
    if (await studentModel.findIdByStudentNumber(studentIdNumber.trim())) {
      return fieldErrors(res, 400, { studentIdNumber: 'This student ID number is already registered.' });
    }

    const id = await studentModel.create({
      studentIdNumber: studentIdNumber.trim(),
      firstName: firstName.trim(),
      middleName: middleName ? middleName.trim() : null,
      lastName: lastName.trim(),
      email: email.trim(),
      hashedPassword: await bcrypt.hash(password, 10),
      parentEmail: parentEmail.trim(),
    });

    req.session.user = { id, role: 'student', email: email.trim(), firstName: firstName.trim() };
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'Registration error', err);
  }
}

/* ---------- login ---------- */
async function loginStudent(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 400, 'Email and password are required.');

  try {
    const student = await studentModel.findForLogin(email.trim());
    if (!student || !(await bcrypt.compare(password, student.password))) {
      return fail(res, 401, 'Invalid email or password.');
    }

    req.session.user = { id: student.id, role: 'student', email: student.email, firstName: student.first_name };
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'Student login error', err);
  }
}

async function loginTeacher(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 400, 'Email and password are required.');

  try {
    const teacher = await teacherModel.findForLogin(email.trim());
    if (!teacher || !(await bcrypt.compare(password, teacher.password))) {
      return fail(res, 401, 'Invalid email or password.');
    }

    req.session.user = {
      id: teacher.id,
      role: teacher.role === 'admin' ? 'admin' : 'teacher',
      email: teacher.email,
      firstName: teacher.first_name,
    };
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'Teacher login error', err);
  }
}

/* ---------- forgot password (student + teacher share one handler) ---------- */
function makeForgotPassword(model, label) {
  return async (req, res) => {
    const { email, newPassword, confirmNewPassword } = req.body || {};
    const errors = {};

    if (!email || !email.trim()) errors.email = 'Email is required.';
    else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
    if (!newPassword || newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters.';
    if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = 'Passwords do not match.';
    }
    if (Object.keys(errors).length > 0) return fieldErrors(res, 400, errors);

    try {
      if (!(await model.findIdByEmail(email.trim()))) {
        return fieldErrors(res, 404, { email: 'No account found with this email.' });
      }
      // Hashed, so login (bcrypt.compare) works after the reset
      await model.updatePasswordByEmail(email.trim(), await bcrypt.hash(newPassword, 10));
      return res.json({ success: true });
    } catch (err) {
      return serverError(res, `${label} forgot password error`, err);
    }
  };
}

const forgotPasswordStudent = makeForgotPassword(studentModel, 'Student');
const forgotPasswordTeacher = makeForgotPassword(teacherModel, 'Teacher');

/* ---------- session ---------- */
function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
}

function me(req, res) {
  if (!req.session.user) return res.status(401).json({ success: false });
  return res.json({ success: true, user: req.session.user });
}

module.exports = {
  registerStudent, loginStudent, loginTeacher,
  forgotPasswordStudent, forgotPasswordTeacher, logout, me,
};
