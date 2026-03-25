const router = require('express').Router();
const {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  getMedicationLogs,
  createMedicationLog,
} = require('../controllers/medicationController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/:patientId', getMedications);
router.post('/', createMedication);
router.patch('/:id', updateMedication);
router.delete('/:id', deleteMedication);

router.get('/logs/:patientId', getMedicationLogs);
router.post('/logs', createMedicationLog);

module.exports = router;
