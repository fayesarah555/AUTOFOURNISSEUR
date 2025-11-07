#!/usr/bin/env node
/**
 * Populate the supplier_tariff_grids table for roughly 50% of the suppliers.
 *
 * Usage: node scripts/seedTariffGrids.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { pool, closePool } = require('../config/mariadb');
const { listProviders } = require('../repositories/providerRepository');
const { maintainTariffGridForSupplier } = require('../services/tariffGridService');

const main = async () => {
  const providers = await listProviders();
  if (!providers.length) {
    console.log('No providers found. Run the provider import first.');
    return;
  }

  const supplierRows = await pool.query('SELECT id, external_ref FROM suppliers');
  const supplierIdByExternalRef = new Map(
    supplierRows.map((row) => [row.external_ref || `prt-db-${row.id}`, row.id])
  );

  const conn = await pool.getConnection();
  let attached = 0;
  let removed = 0;
  let skipped = 0;

  try {
    for (const provider of providers) {
      const supplierId = supplierIdByExternalRef.get(provider.id);
      if (!supplierId) {
        skipped += 1;
        continue;
      }

      await conn.beginTransaction();
      try {
        const result = await maintainTariffGridForSupplier(conn, supplierId, provider);
        if (result.attached) {
          attached += 1;
        } else if (result.removed) {
          removed += 1;
        }
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      }
    }
  } finally {
    conn.release();
    await closePool();
  }

  console.log(
    `Tariff grids attached: ${attached}, removed: ${removed}, skipped: ${skipped}, processed: ${providers.length}.`
  );
};

main().catch((error) => {
  console.error('Failed to seed supplier tariff grids:', error);
  process.exitCode = 1;
});
