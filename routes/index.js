const router = require('express').Router();

router.use(require('./authRoutes'));
router.use(require('./classRoutes'));
router.use(require('./sessionRoutes'));
router.use(require('./dashboardRoutes'));
router.use(require('./aiRoutes'));
router.use(require('./adminRoutes'));

module.exports = router;
