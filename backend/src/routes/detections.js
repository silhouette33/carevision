const router = require('express').Router();
const { getLogs, createLog } = require('../controllers/detectionController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', getLogs);
router.post('/', createLog);

module.exports = router;
