const { Router } = require('express');
const path = require('path');
const multer = require('multer');
const areaController = require('../controllers/area.controller');
const { requireAuth } = require('../middleware/auth.middleware');

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
router.post('/', areaController.create);
router.put('/:id', areaController.update);
router.post('/:id/image', upload.single('image'), areaController.uploadImage);
router.patch('/:id/position', areaController.setPosition);
router.patch('/:id/active', areaController.setActive);
router.delete('/:id', areaController.remove);

module.exports = router;
