const router = require('express').Router();
const ai = require('../controllers/aiController');
const { requireTeacher } = require('../middleware/auth');

router.get('/ai/history', requireTeacher, ai.getHistory);
router.post('/ai/ask', requireTeacher, ai.ask);
router.post('/ai/clear', requireTeacher, ai.clearHistory);

module.exports = router;
