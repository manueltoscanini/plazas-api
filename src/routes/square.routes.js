const router = require('express').Router();
const c = require('../controllers/square.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// IMPORTANTE: /list va antes de /:id, si no Express toma "list" como un id
router.get('/list', c.list);
router.get('/:id', c.getById);

router.post('/', auth, requireRole('admin'), c.create);
router.patch('/:id', auth, requireRole('admin'), c.update);

module.exports = router;
