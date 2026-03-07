const { Router } = require('express');
const sensorController = require('../controllers/sensor.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.get('/', sensorController.list);
router.get('/:id', sensorController.get);
router.post('/', sensorController.create);
router.put('/:id', sensorController.update);
router.patch('/:id/active', sensorController.setActive);
router.delete('/:id', sensorController.remove);

module.exports = router;
