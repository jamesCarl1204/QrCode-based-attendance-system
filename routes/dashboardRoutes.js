const router = require('express').Router();
const dashboard = require('../controllers/dashboardController');
const { requireStudent, requireTeacher, requireAdmin } = require('../middleware/auth');

router.get('/student/dashboard', requireStudent, dashboard.studentDashboard);
router.get('/teacher/dashboard', requireTeacher, dashboard.teacherDashboard);
router.get('/admin/dashboard', requireAdmin, dashboard.adminDashboard);

module.exports = router;
