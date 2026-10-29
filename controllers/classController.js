const classModel = require('../models/classModel');
const teacherModel = require('../models/teacherModel');
const { canAccessClass } = require('../services/accessService');
const { generateClassCode } = require('../utils/helpers');
const { fail, fieldErrors, serverError } = require('../utils/response');

async function createClass(req, res) {
  const { subjectName, section, color } = req.body || {};
  if (!subjectName || !subjectName.trim()) {
    return fieldErrors(res, 400, { subjectName: 'Subject name is required.' });
  }

  try {
    let classCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      classCode = generateClassCode(subjectName);
      if (!(await classModel.codeExists(classCode))) break;
    }

    const id = await classModel.create({
      teacherId: req.session.user.id,
      subjectName: subjectName.trim(),
      section: section ? section.trim() : null,
      classCode,
      color: color || 'blue',
    });

    return res.json({
      success: true,
      class: {
        id,
        subject_name: subjectName.trim(),
        section: section ? section.trim() : null,
        class_code: classCode,
        color: color || 'blue',
      },
    });
  } catch (err) {
    return serverError(res, 'Create class error', err);
  }
}

async function listClasses(req, res) {
  try {
    const { role, id } = req.session.user;
    const classes = role === 'teacher'
      ? await classModel.listByTeacher(id)
      : await classModel.listForStudent(id);
    return res.json({ success: true, classes });
  } catch (err) {
    return serverError(res, 'List classes error', err);
  }
}

async function archiveClass(req, res) {
  const { archived } = req.body || {};
  if (typeof archived !== 'boolean') return fail(res, 400, 'archived must be true or false.');

  try {
    const cls = await classModel.findOwned(req.params.id, req.session.user.id);
    if (!cls) return fail(res, 403, 'Not authorized for this class.');

    await classModel.setArchived(cls.id, archived);
    return res.json({ success: true, archived });
  } catch (err) {
    return serverError(res, 'Archive class error', err);
  }
}

async function deleteClass(req, res) {
  try {
    const cls = await classModel.findOwned(req.params.id, req.session.user.id);
    if (!cls) return fail(res, 403, 'Not authorized for this class.');

    if ((await classModel.countActiveStudents(cls.id)) > 0) {
      return fail(res, 400, 'This class still has enrolled students. Remove them before deleting the class.');
    }
    if ((await classModel.countSessions(cls.id)) > 0) {
      return fail(res, 400, 'This class still has attendance records. It cannot be deleted.');
    }

    await classModel.deleteEmpty(cls.id);
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'Delete class error', err);
  }
}

async function joinClass(req, res) {
  const { classCode } = req.body || {};
  if (!classCode || !classCode.trim()) {
    return fieldErrors(res, 400, { joinCode: 'Class code is required.' });
  }

  try {
    const cls = await classModel.findByCodeWithTeacher(classCode.trim().toUpperCase());
    if (!cls) return fieldErrors(res, 404, { joinCode: 'Invalid class code.' });

    const existing = await classModel.findEnrollment(cls.id, req.session.user.id);
    if (existing && existing.removed_at === null) {
      return fieldErrors(res, 400, { joinCode: 'You are already enrolled in this class.' });
    }

    if (existing) await classModel.reenroll(existing.id); // previously removed -> re-enroll
    else await classModel.enroll(cls.id, req.session.user.id);

    return res.json({ success: true, class: cls });
  } catch (err) {
    return serverError(res, 'Join class error', err);
  }
}

async function leaveClass(req, res) {
  try {
    if (!(await classModel.isEnrolled(req.params.id, req.session.user.id))) {
      return fail(res, 404, 'You are not enrolled in this class.');
    }
    await classModel.leave(req.params.id, req.session.user.id);
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'Leave class error', err);
  }
}

async function getMembers(req, res) {
  try {
    const cls = await classModel.findById(req.params.id);
    if (!cls) return fail(res, 404, 'Class not found.');

    if (!(await canAccessClass(req.session.user, { classId: cls.id, teacherId: cls.teacher_id }))) {
      return fail(res, 403, 'Not authorized for this class.');
    }

    const teacher = await teacherModel.findBasicById(cls.teacher_id);
    const students = await classModel.listMembers(cls.id);
    return res.json({ success: true, teacher, students });
  } catch (err) {
    return serverError(res, 'Members error', err);
  }
}

async function removeStudent(req, res) {
  const { classId, studentId } = req.params;
  try {
    if (!(await classModel.findOwned(classId, req.session.user.id))) {
      return fail(res, 403, 'Not authorized for this class.');
    }
    if (!(await classModel.isEnrolled(classId, studentId))) {
      return fail(res, 404, 'Student is not enrolled in this class.');
    }
    await classModel.removeStudent(classId, studentId);
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'Remove student from class error', err);
  }
}

module.exports = {
  createClass, listClasses, archiveClass, deleteClass, joinClass, leaveClass, getMembers, removeStudent,
};
