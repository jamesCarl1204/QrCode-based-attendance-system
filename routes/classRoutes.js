const router = require('express').Router();
const classCtrl = require('../controllers/classController');
const sessionCtrl = require('../controllers/sessionController');
const { requireAuth, requireTeacher, requireStudent } = require('../middleware/auth');

router.post('/classes', requireTeacher, classCtrl.createClass);
router.get('/classes', requireAuth, classCtrl.listClasses);
router.post('/classes/join', requireStudent, classCtrl.joinClass);

router.patch('/classes/:id/archive', requireTeacher, classCtrl.archiveClass);
router.delete('/classes/:id', requireTeacher, classCtrl.deleteClass);
router.delete('/classes/:id/leave', requireStudent, classCtrl.leaveClass);
router.get('/classes/:id/members', requireAuth, classCtrl.getMembers);
router.delete('/classes/:classId/students/:studentId', requireTeacher, classCtrl.removeStudent);

router.post('/classes/:id/sessions', requireTeacher, sessionCtrl.createSession);
router.get('/classes/:id/sessions', requireAuth, sessionCtrl.listSessions);

module.exports = router;
