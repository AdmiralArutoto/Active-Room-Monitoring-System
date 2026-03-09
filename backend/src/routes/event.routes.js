const { Router } = require('express');
const eventController = require('../controllers/event.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);
router.get('/', eventController.list);

module.exports = router;
