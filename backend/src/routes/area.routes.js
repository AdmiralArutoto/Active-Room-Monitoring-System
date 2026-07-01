const { Router } = require('express');
const path = require('path');
const multer = require('multer');
const areaController = require('../controllers/area.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = Router();

const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || '/app/uploads',
  filename: (req, file, cb) => {
    cb(null, `area-${req.params.id}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.use(requireAuth);

router.get('/site', areaController.getSite);
router.get('/', areaController.list);
router.get('/:id', areaController.get);
router.get('/:id/children', areaController.children);
router.get('/:id/tree', areaController.tree);
router.post('/', requireRole('MANAGER'), areaController.create);
router.put('/:id', requireRole('MANAGER'), areaController.update);
router.post('/:id/image', requireRole('MANAGER'), upload.single('image'), areaController.uploadImage);
router.patch('/:id/position', requireRole('MANAGER'), areaController.setPosition);
router.patch('/:id/active', requireRole('MANAGER'), areaController.setActive);
router.delete('/:id', requireRole('MANAGER'), areaController.remove);

module.exports = router;
