const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { getProfile } = require('../controllers/profileController');
const {
  listProviders,
  getProvidersByIds,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
  getProviderTariffDocument,
  downloadAdditionalTariffDocument,
  getProviderBaseTariffGrid,
  importSingleProviderWithTariff,
  uploadProviderTariffDocument,
  downloadProviderImportTemplate,
} = require('../controllers/providerController');
const { importExcelProviders } = require('../controllers/providerImportController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'tmp', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

const providerExcelUpload = upload.fields([
  { name: 'providerExcel', maxCount: 1 },
  { name: 'tariffPdf', maxCount: 1 },
]);

router.get('/providers', listProviders);
router.get('/providers/batch', getProvidersByIds);
router.get('/providers/:id/tariff-document', getProviderTariffDocument);
router.get('/providers/:id/tariff-documents/:documentId', downloadAdditionalTariffDocument);
router.get('/providers/:id/base-tariff-grid', getProviderBaseTariffGrid);
router.get('/providers/:id', getProviderById);

router.get('/me', requireAuth, getProfile);

router.post('/providers', requireAdmin, createProvider);
router.put('/providers/:id', requireAdmin, updateProvider);
router.delete('/providers/:id', requireAdmin, deleteProvider);
router.post('/providers/import', requireAdmin, upload.single('file'), importExcelProviders);
router.post(
  '/providers/import-single',
  requireAdmin,
  providerExcelUpload,
  importSingleProviderWithTariff
);
router.post(
  '/providers/:id/tariff-document',
  requireAdmin,
  upload.single('file'),
  uploadProviderTariffDocument
);
router.get(
  '/providers/import/template',
  requireAdmin,
  downloadProviderImportTemplate
);

module.exports = router;
