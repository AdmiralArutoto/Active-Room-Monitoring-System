const { Router } = require('express');
const ingestController = require('../controllers/ingest.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

// Push endpoint is open — sensors push without user auth.
// State query endpoints require auth.
router.post('/:sensor_key', ingestController.push);
router.get('/', requireAuth, ingestController.getAll);
router.get('/:sensor_key', requireAuth, ingestController.getOne);

module.exports = router;
