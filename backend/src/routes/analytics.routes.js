const { Router } = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);
router.get('/wasted-lighting', analyticsController.wastedLighting);
router.get('/occupancy', analyticsController.occupancy);

module.exports = router;
