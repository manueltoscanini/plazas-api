const router = require('express').Router();
const c = require('../controllers/reports.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.get('/pending', c.listPending);

router.post('/create', auth, c.create);
router.post('/upvote', auth, c.upvote);
router.post('/downvote', auth, c.downvote);

router.post('/approve', auth, requireRole('trusted', 'admin'), c.approve);
router.post('/reject', auth, requireRole('trusted', 'admin'), c.reject);

module.exports = router;
