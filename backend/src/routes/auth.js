const router = require('express').Router();
const { register, login, updateFcmToken } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.put('/fcm-token', auth, updateFcmToken);

module.exports = router;
