const { Router } = require('express');
const sensorController = require('../controllers/sensor.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = Router();

router.use(requireAuth);

router.get('/', sensorController.list);
router.get('/:id', sensorController.get);
router.post('/', requireRole('MANAGER'), sensorController.create);
router.put('/:id', requireRole('MANAGER'), sensorController.update);
router.patch('/:id/active', requireRole('MANAGER'), sensorController.setActive);
router.delete('/:id', requireRole('MANAGER'), sensorController.remove);

module.exports = router;
