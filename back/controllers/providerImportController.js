const fs = require('fs/promises');
const path = require('path');
const { importProvidersFromExcel } = require('../services/providerImportService');

const importExcelProviders = async (req, res, next) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Aucun fichier reçu.' });
  }

  const tmpPath = file.path;

  try {
    const result = await importProvidersFromExcel(tmpPath, {
      sourceSheet: 'CUSTOM',
      continueOnError: true,
    });
    // eslint-disable-next-line no-console
    console.info(`Admin import: ${result.processed} fournisseurs traités depuis ${file.originalname}`);
    return res.status(200).json({
      processed: result.processed,
      items: result.items || [],
      errors: result.errors || [],
      message: `${result.processed} fournisseur(s) importé(s) avec succès`,
    });
  } catch (error) {
    return next(error);
  } finally {
    if (tmpPath) {
      try {
        await fs.unlink(tmpPath);
      } catch (err) {
        // ignore cleanup errors
      }
    }
  }
};

module.exports = {
  importExcelProviders,
};
