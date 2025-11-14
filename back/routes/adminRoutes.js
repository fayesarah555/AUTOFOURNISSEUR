const express = require('express');
const { requireAdmin } = require('../middleware/authMiddleware');
const {
  listProviders,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
  importSingleProviderWithTariff,
  uploadProviderTariffDocument,
  addAdditionalTariffDocument,
  deleteAdditionalTariffDocument,
  downloadProviderImportTemplate,
  downloadProviderDatasetTemplate,
  downloadTariffGridTemplate,
  importTariffCatalogFromExcel,
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

const providerExcelUpload = upload.fields([
  { name: 'providerExcel', maxCount: 1 },
  { name: 'tariffPdf', maxCount: 1 },
]);

router.get('/providers', requireAdmin, listProviders);
router.get('/providers/:id', requireAdmin, getProviderById);
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
router.post(
  '/providers/:id/tariff-documents',
  requireAdmin,
  upload.single('file'),
  addAdditionalTariffDocument
);
router.delete(
  '/providers/:id/tariff-documents/:documentId',
  requireAdmin,
  deleteAdditionalTariffDocument
);
router.post(
  '/providers/:id/tariff-catalogs/import',
  requireAdmin,
  upload.single('file'),
  importTariffCatalogFromExcel
);
router.get(
  '/providers/import/template',
  requireAdmin,
  downloadProviderImportTemplate
);

router.get(
  '/providers/import/dataset-template',
  requireAdmin,
  downloadProviderDatasetTemplate
);

router.get(
  '/providers/tariff/template',
  requireAdmin,
  downloadTariffGridTemplate
);

module.exports = router;
