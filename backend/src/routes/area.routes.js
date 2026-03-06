const { Router } = require('express');
const areaController = require('../controllers/area.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.get('/', areaController.list);
router.get('/:id', areaController.get);
router.get('/:id/children', areaController.children);
router.get('/:id/tree', areaController.tree);
router.post('/', areaController.create);
router.put('/:id', areaController.update);
router.patch('/:id/active', areaController.setActive);
router.delete('/:id', areaController.remove);

module.exports = router;
