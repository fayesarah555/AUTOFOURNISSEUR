#!/usr/bin/env node
/**
 * Import transport providers from the Excel dataset into MariaDB.
 *
 * Usage: node scripts/importExcel.js [path_to_excel]
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const providersModule = require('../data/providers');
const { importProvidersFromExcel, importProviders } = require('../services/providerImportService');
const { closePool } = require('../config/mariadb');

const resolveExcelPath = (argPath) => {
  if (!argPath) {
    return providersModule.EXCEL_PATH;
  }
  return path.isAbsolute(argPath) ? argPath : path.resolve(process.cwd(), argPath);
};

const main = async () => {
  const excelPath = resolveExcelPath(process.argv[2]);

  try {
    if (excelPath === providersModule.EXCEL_PATH) {
      const providers = Array.isArray(providersModule)
        ? providersModule
        : typeof providersModule.loadSeedProviders === 'function'
          ? providersModule.loadSeedProviders()
          : [];

      if (providers.length === 0) {
        console.warn('No providers loaded from Excel dataset. Abort.');
        return;
      }

      const sourceSheet = providers[0]?.source_sheet || 'TPS_National';
      const result = await importProviders(providers, { sourceSheet, continueOnError: true });
      console.log(
        'Imported ' + result.processed + ' providers into MariaDB. Errors: ' + (result.errors?.length || 0)
      );
      return;
    }

    const result = await importProvidersFromExcel(excelPath, {
      sourceSheet: 'CUSTOM',
      continueOnError: true,
    });
    console.log(
      'Imported ' + result.processed + ' providers from ' + excelPath + '. Errors: ' + (result.errors?.length || 0)
    );
  } finally {
    await closePool();
  }
};

main().catch((error) => {
  console.error('Import failed:', error);
  process.exitCode = 1;
});
