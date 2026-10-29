const classModel = require('../models/classModel');
const sessionModel = require('../models/sessionModel');
const { canAccessClass } = require('../services/accessService');
const { generateAttendanceCode } = require('../utils/helpers');
const { fail, serverError } = require('../utils/response');

async function createSession(req, res) {
  const classId = req.params.id;
  const { sessionDate, startTime, endTime, lateAfter } = req.body || {};
  if (!sessionDate || !startTime || !endTime || !lateAfter) {
    return fail(res, 400, 'All fields are required.');
  }

  try {
    if (!(await classModel.findOwned(classId, req.session.user.id))) {
      return fail(res, 403, 'Not authorized for this class.');
    }

    let attendanceCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      attendanceCode = generateAttendanceCode();
      if (!(await sessionModel.codeExists(attendanceCode))) break;
    }

    const id = await sessionModel.create({ classId, sessionDate, startTime, endTime, lateAfter, attendanceCode });

    return res.json({
      success: true,
      session: {
        id,
        class_id: Number(classId),
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        late_after: lateAfter,
        attendance_code: attendanceCode,
      },
    });
  } catch (err) {
    return serverError(res, 'Create session error', err);
  }
}

async function listSessions(req, res) {
  try {
    const cls = await classModel.findById(req.params.id);
    if (!cls) return fail(res, 404, 'Class not found.');

    if (!(await canAccessClass(req.session.user, { classId: cls.id, teacherId: cls.teacher_id }))) {
      return fail(res, 403, 'Not authorized for this class.');
    }

    const sessions = await sessionModel.listByClass(cls.id);
    return res.json({ success: true, sessions });
  } catch (err) {
    return serverError(res, 'List sessions error', err);
  }
}

async function deleteSession(req, res) {
  try {
    const session = await sessionModel.findWithTeacher(req.params.id);
    if (!session) return fail(res, 404, 'Session not found.');
    if (session.teacher_id !== req.session.user.id) return fail(res, 403, 'Not authorized for this class.');

    await sessionModel.deleteWithRecords(session.id);
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'Delete session error', err);
  }
}

module.exports = { createSession, listSessions, deleteSession };
