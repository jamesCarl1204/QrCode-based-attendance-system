const router = require('express').Router();
const sessionCtrl = require('../controllers/sessionController');
const attendance = require('../controllers/attendanceController');
const { requireAuth, requireTeacher, requireStudent } = require('../middleware/auth');
const { scanLimiter } = require('../middleware/rateLimiters');

router.get('/sessions/:id/records', requireAuth, attendance.getRecords);
router.post('/sessions/:id/manual-attend', requireTeacher, attendance.manualAttend);
router.post('/sessions/:id/attend', requireStudent, attendance.attendBySession);
router.get('/sessions/:id/download', requireTeacher, attendance.downloadCsv);
router.delete('/sessions/:id', requireTeacher, sessionCtrl.deleteSession);

router.post('/attend/scan', scanLimiter, requireStudent, attendance.scanQr);

module.exports = router;
