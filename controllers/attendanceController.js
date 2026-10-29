const classModel = require('../models/classModel');
const sessionModel = require('../models/sessionModel');
const attendanceModel = require('../models/attendanceModel');
const studentModel = require('../models/studentModel');
const { canAccessClass } = require('../services/accessService');
const { sendAttendanceNotification } = require('../services/emailService');
const { toPHDate, phTime } = require('../utils/helpers');
const { fail, serverError } = require('../utils/response');

// Is the session open right now? Returns { error } or { status: 'Present' | 'Late' }
function evaluateWindow(session) {
  const now = new Date();
  if (now < toPHDate(session.session_date, session.start_time)) return { error: 'Attendance is not open yet.' };
  if (now > toPHDate(session.session_date, session.end_time)) return { error: 'This session has already ended.' };
  return { status: now > toPHDate(session.session_date, session.late_after) ? 'Late' : 'Present' };
}

/* GET /sessions/:id/records */
async function getRecords(req, res) {
  try {
    const session = await sessionModel.findWithTeacher(req.params.id);
    if (!session) return fail(res, 404, 'Session not found.');

    const user = req.session.user;
    if (!(await canAccessClass(user, { classId: session.class_id, teacherId: session.teacher_id }))) {
      return fail(res, 403, 'Not authorized for this class.');
    }

    // Students only ever see their own row
    const rows = await attendanceModel.listForSession(
      session.id, session.class_id, user.role === 'student' ? user.id : null
    );

    const isEnded = new Date() > toPHDate(session.session_date, session.end_time);
    const records = rows.map((r) => ({
      student_id: r.student_id,
      first_name: r.first_name,
      last_name: r.last_name,
      time_in: r.status ? r.time_in : null,
      status: r.status || (isEnded ? 'Absent' : null),
    }));

    return res.json({ success: true, session, records });
  } catch (err) {
    return serverError(res, 'Get records error', err);
  }
}

/* POST /sessions/:id/manual-attend (teacher) */
async function manualAttend(req, res) {
  const { studentId, status } = req.body || {};
  if (!studentId || !['Present', 'Late', 'Absent'].includes(status)) {
    return fail(res, 400, 'Invalid request.');
  }

  try {
    const session = await sessionModel.findWithTeacher(req.params.id);
    if (!session) return fail(res, 404, 'Session not found.');
    if (session.teacher_id !== req.session.user.id) return fail(res, 403, 'Not authorized for this class.');

    if (!(await classModel.isEnrolled(session.class_id, studentId))) {
      return fail(res, 400, 'Student is not enrolled in this class.');
    }

    const timeIn = status === 'Absent' ? '00:00:00' : phTime();
    await attendanceModel.upsert(session.id, studentId, status, timeIn);

    return res.json({ success: true, status, time_in: timeIn });
  } catch (err) {
    return serverError(res, 'Manual attend error', err);
  }
}

/* POST /sessions/:id/attend (student, by session id) */
async function attendBySession(req, res) {
  try {
    const session = await sessionModel.findWithTeacher(req.params.id);
    if (!session) return fail(res, 404, 'Session not found.');

    const studentId = req.session.user.id;
    if (!(await classModel.isEnrolled(session.class_id, studentId))) {
      return fail(res, 403, 'Not authorized for this class.');
    }

    const check = evaluateWindow(session);
    if (check.error) return fail(res, 400, check.error);

    if (await attendanceModel.findOne(session.id, studentId)) {
      return fail(res, 400, 'You have already attended this session.');
    }

    const timeIn = phTime();
    await attendanceModel.insert(session.id, studentId, timeIn, check.status);
    return res.json({ success: true, status: check.status, time_in: timeIn });
  } catch (err) {
    return serverError(res, 'Attend error', err);
  }
}

/* POST /attend/scan (student scans the QR code) */
async function scanQr(req, res) {
  const { code } = req.body || {};
  if (!code || !code.trim()) return fail(res, 400, 'Invalid QR code.');

  try {
    const session = await sessionModel.findByCode(code.trim().toUpperCase());
    if (!session) return fail(res, 404, 'QR code not recognized. It may be expired.');

    const studentId = req.session.user.id;
    if (!(await classModel.isEnrolled(session.class_id, studentId))) {
      return fail(res, 403, 'You are not enrolled in this class.');
    }

    const check = evaluateWindow(session);
    if (check.error) return fail(res, 400, check.error);

    if (await attendanceModel.findOne(session.id, studentId)) {
      return fail(res, 400, 'You have already attended this session.');
    }

    const timeIn = phTime();
    await attendanceModel.insert(session.id, studentId, timeIn, check.status);

    const subjectName = await classModel.getSubjectName(session.class_id);
    const student = await studentModel.findContactById(studentId);
    if (student) {
      // fire-and-forget: a slow/failed email must not block the scan
      sendAttendanceNotification({
        parentEmail: student.parent_email,
        studentFirstName: student.first_name,
        studentLastName: student.last_name,
        subjectName,
        status: check.status,
        timeIn,
        sessionDate: session.session_date,
      });
    }

    return res.json({
      success: true,
      status: check.status,
      time_in: timeIn,
      subject_name: subjectName,
      class_id: session.class_id,
    });
  } catch (err) {
    return serverError(res, 'QR attend error', err);
  }
}

/* GET /sessions/:id/download (teacher, CSV) */
async function downloadCsv(req, res) {
  try {
    const session = await sessionModel.findForDownload(req.params.id);
    if (!session) return fail(res, 404, 'Session not found.');
    if (session.teacher_id !== req.session.user.id) return fail(res, 403, 'Not authorized for this class.');

    const rows = await attendanceModel.listForSession(session.id, session.class_id);
    const isEnded = new Date() > toPHDate(session.session_date, session.end_time);

    const escapeCsv = (val) => {
      const str = String(val ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const header = ['Last Name', 'First Name', 'Time In', 'Status'];
    const dataRows = rows.map((r) => [
      r.last_name, r.first_name, r.time_in || '', r.status || (isEnded ? 'Absent' : 'Not yet'),
    ]);
    const csvLines = [header, ...dataRows].map((row) => row.map(escapeCsv).join(','));

    const csv =
      `Subject:,${escapeCsv(session.subject_name)}\n` +
      `Section:,${escapeCsv(session.section || '')}\n` +
      `Date:,${escapeCsv(session.session_date)}\n` +
      `Time:,${escapeCsv(`${session.start_time} - ${session.end_time}`)}\n\n` +
      csvLines.join('\n');

    const filename = `${session.subject_name}_${session.session_date}`.replace(/[^a-z0-9_-]/gi, '_');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csv);
  } catch (err) {
    return serverError(res, 'Download session error', err);
  }
}

module.exports = { getRecords, manualAttend, attendBySession, scanQr, downloadCsv };
