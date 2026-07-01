const { Router } = require('express');
const settingsController = require('../controllers/settings.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.get('/profile', settingsController.getProfile);
router.put('/profile', settingsController.updateProfile);
router.get('/preferences', settingsController.getPreferences);
router.put('/preferences', settingsController.updatePreferences);

module.exports = router;
