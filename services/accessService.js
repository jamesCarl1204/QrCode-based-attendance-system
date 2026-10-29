const classModel = require('../models/classModel');

// Teacher: must own the class. Student: must be enrolled (not removed).
async function canAccessClass(user, { classId, teacherId }) {
  if (user.role === 'teacher') return teacherId === user.id;
  return classModel.isEnrolled(classId, user.id);
}

module.exports = { canAccessClass };
