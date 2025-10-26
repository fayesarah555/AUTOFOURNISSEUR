const express = require('express');
const { login, logout, checkSession } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/session', checkSession);

module.exports = router;
