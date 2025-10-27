const express = require('express');
const { requireAdmin } = require('../middleware/authMiddleware');
const {
  listProviders,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
} = require('../controllers/providerController');
const { importExcelProviders } = require('../controllers/providerImportController');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'tmp', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

router.get('/providers', requireAdmin, listProviders);
router.get('/providers/:id', requireAdmin, getProviderById);
router.post('/providers', requireAdmin, createProvider);
router.put('/providers/:id', requireAdmin, updateProvider);
router.delete('/providers/:id', requireAdmin, deleteProvider);
router.post('/providers/import', requireAdmin, upload.single('file'), importExcelProviders);

module.exports = router;
