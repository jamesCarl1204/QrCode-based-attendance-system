const bcrypt = require('bcrypt');
const studentModel = require('../models/studentModel');
const teacherModel = require('../models/teacherModel');
const classModel = require('../models/classModel');
const sessionModel = require('../models/sessionModel');
const attendanceModel = require('../models/attendanceModel');
const { isValidEmail, toPHDate, calcRate } = require('../utils/helpers');
const { fail, fieldErrors, serverError } = require('../utils/response');
const emailService = require('../services/emailService');
/* ---------- students ---------- */
async function listStudents(req, res) {
  try {
    return res.json({ success: true, students: await studentModel.listAll() });
  } catch (err) {
    return serverError(res, 'Admin list students error', err);
  }
}

async function deleteStudent(req, res) {
  try {
    const student = await studentModel.findById(req.params.id);
    if (!student) return fail(res, 404, 'Student not found.');
    await studentModel.deleteCascade(student.id);
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'Admin delete student error', err);
  }
}

/* ---------- teachers ---------- */
async function listTeachers(req, res) {
  try {
    return res.json({ success: true, teachers: await teacherModel.listTeachers() });
  } catch (err) {
    return serverError(res, 'Admin list teachers error', err);
  }
}

async function deleteTeacher(req, res) {
  try {
    const teacher = await teacherModel.findRoleById(req.params.id);
    if (!teacher) return fail(res, 404, 'Teacher not found.');
    if (teacher.role === 'admin') return fail(res, 403, 'Cannot delete an admin account.');

    await teacherModel.deleteCascade(teacher.id);
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'Admin delete teacher error', err);
  }
}

async function createTeacher(req, res) {
  const { teacherIdNumber, firstName, middleName, lastName, email, password } = req.body || {};
  const errors = {};

  if (!teacherIdNumber || !teacherIdNumber.trim()) errors.teacherIdNumber = 'Teacher ID is required.';
  if (!firstName || !firstName.trim()) errors.firstName = 'First name is required.';
  if (!lastName || !lastName.trim()) errors.lastName = 'Last name is required.';
  if (!email || !email.trim()) errors.email = 'Email is required.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters.';

  if (Object.keys(errors).length > 0) return fieldErrors(res, 400, errors);

  try {
    if (await teacherModel.findIdByEmail(email.trim())) {
      return fieldErrors(res, 400, { email: 'An account with this email already exists.' });
    }
    if (await teacherModel.findIdByTeacherNumber(teacherIdNumber.trim())) {
      return fieldErrors(res, 400, { teacherIdNumber: 'This teacher ID is already registered.' });
    }

    const id = await teacherModel.create({
      teacherIdNumber: teacherIdNumber.trim(),
      firstName: firstName.trim(),
      middleName: middleName ? middleName.trim() : null,
      lastName: lastName.trim(),
      email: email.trim(),
      hashedPassword: await bcrypt.hash(password, 10),
    });

    return res.json({
      success: true,
      teacher: {
        id,
        teacher_id_number: teacherIdNumber.trim(),
        first_name: firstName.trim(),
        middle_name: middleName ? middleName.trim() : null,
        last_name: lastName.trim(),
        email: email.trim(),
      },
    });
  } catch (err) {
    return serverError(res, 'Admin create teacher error', err);
  }
}

/* ---------- classes ---------- */
async function listClasses(req, res) {
  try {
    return res.json({ success: true, classes: await classModel.adminListAll() });
  } catch (err) {
    return serverError(res, 'Admin list classes error', err);
  }
}

async function classDetail(req, res) {
  try {
    const cls = await classModel.adminFindById(req.params.id);
    if (!cls) return fail(res, 404, 'Class not found.');

    const students = await classModel.adminListStudents(cls.id);
    const sessions = await sessionModel.listAdminByClass(cls.id);
    const records = await attendanceModel.listWithNames(sessions.map((s) => s.id));

    const now = new Date();
    let totalPresent = 0, totalLate = 0, totalAbsent = 0;

    const sessionsOut = sessions.map((sess) => {
      const ended = now > toPHDate(sess.session_date, sess.end_time);
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
        records: sessionRecords,
      };
    });

    return res.json({
      success: true,
      class: cls,
      students,
      sessions: sessionsOut,
      totals: {
        present: totalPresent,
        late: totalLate,
        absent: totalAbsent,
        attendanceRatePercent: calcRate(totalPresent + totalLate, totalPresent + totalLate + totalAbsent),
      },
    });
  } catch (err) {
    return serverError(res, 'Admin class detail error', err);
  }
}

async function deleteClass(req, res) {
  try {
    const cls = await classModel.findById(req.params.id);
    if (!cls) return fail(res, 404, 'Class not found.');
    await classModel.deleteCascade(cls.id);
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'Admin delete class error', err);
  }
}

/* ---------- announcements ---------- */
async function sendAnnouncement(req, res) {
  const { title, message, toStudents, toParents } = req.body || {};
  const t = typeof title === 'string' ? title.trim() : '';
  const m = typeof message === 'string' ? message.trim() : '';

  if (!t) return fail(res, 400, 'Title is required.');
  if (t.length > 150) return fail(res, 400, 'Title is too long (max 150 characters).');
  if (!m) return fail(res, 400, 'Message is required.');
  if (m.length > 2000) return fail(res, 400, 'Message is too long (max 2000 characters).');
  if (!toStudents && !toParents) return fail(res, 400, 'Select at least one recipient.');
  if (!emailService.isEmailConfigured()) return fail(res, 500, 'Email service is not configured.');

  try {
    const rows = await studentModel.listContactEmails();

    const set = new Set();
    rows.forEach((r) => {
      if (toStudents && r.email) set.add(r.email.trim().toLowerCase());
      if (toParents && r.parent_email) set.add(r.parent_email.trim().toLowerCase());
    });
    const recipients = [...set];

    if (recipients.length === 0) return fail(res, 400, 'No recipients found.');

    res.json({ success: true, recipients: recipients.length });

    emailService.sendAnnouncementBulk(recipients, { title: t, message: m })
      .catch((err) => console.error('Announcement bulk error:', err));
  } catch (err) {
    return serverError(res, 'Send announcement error', err);
  }
}
module.exports = {
  listStudents, deleteStudent, listTeachers, deleteTeacher, createTeacher,
  listClasses, classDetail, deleteClass, sendAnnouncement
};
