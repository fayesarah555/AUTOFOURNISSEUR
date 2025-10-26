const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { getProfile } = require('../controllers/profileController');
const {
  listProviders,
  getProvidersByIds,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
} = require('../controllers/providerController');

const router = express.Router();

router.get('/providers', listProviders);
router.get('/providers/batch', getProvidersByIds);
router.get('/providers/:id', getProviderById);

router.get('/me', requireAuth, getProfile);

router.post('/providers', requireAdmin, createProvider);
router.put('/providers/:id', requireAdmin, updateProvider);
router.delete('/providers/:id', requireAdmin, deleteProvider);

module.exports = router;
