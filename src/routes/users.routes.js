const router = require('express').Router();
const c = require('../controllers/users.controller');

router.post('/email', c.checkEmail);
router.post('/register', c.register);
router.post('/login', c.login);

module.exports = router;
