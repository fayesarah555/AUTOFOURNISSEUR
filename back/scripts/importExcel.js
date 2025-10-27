#!/usr/bin/env node
/**
 * Import transport providers from the Excel dataset into MariaDB.
 *
 * Usage: node scripts/importExcel.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const providersModule = require('../data/providers');
const { pool } = require('../config/mariadb');
const {
  EQUIPMENT_DEFINITIONS,
  SERVICE_DEFINITIONS,
  equipmentByFeature,
  serviceByFeature,
} = require('../utils/providerMappings');

const providers = Array.isArray(providersModule)
  ? providersModule
  : typeof providersModule.loadSeedProviders === 'function'
    ? providersModule.loadSeedProviders()
    : [];

if (!providers.length) {
  console.warn('No providers loaded from Excel dataset. Abort.');
  process.exit(0);
}

const cachedDepartments = new Set();
const cachedEquipment = new Set();
const cachedServices = new Set();

const sql = {
  upsertDepartment:
    'INSERT INTO departments (code, country_code, name) VALUES (?, ?, ?) ' +
    'ON DUPLICATE KEY UPDATE name = VALUES(name), country_code = VALUES(country_code)',
  upsertEquipment:
    'INSERT INTO equipment_types (code, label, category) VALUES (?, ?, ?) ' +
    'ON DUPLICATE KEY UPDATE label = VALUES(label), category = VALUES(category), active = 1',
  upsertService:
    'INSERT INTO service_types (code, label, description) VALUES (?, ?, NULL) ' +
    'ON DUPLICATE KEY UPDATE label = VALUES(label)',
  findSupplierByExternalRef:
    'SELECT id FROM suppliers WHERE external_ref = ?',
  insertSupplier:
    `INSERT INTO suppliers (
      external_ref, source_sheet, name, description, legal_name, siret,
      address, postal_code, city, department_code, country_code, website,
      status, coverage, contract_flexibility, lead_time_days, on_time_rate,
      price_per_km, base_handling_fee, min_shipment_kg, co2_grams_per_tonne_km,
      customer_satisfaction, modes_json, regions_json, certifications_json,
      unreachable, profile_notes, notes
    ) VALUES (
      ?, ?, ?, ?, NULL, NULL,
      ?, ?, ?, ?, ?, NULL,
      'active', ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )`,
  updateSupplier:
    `UPDATE suppliers SET
      source_sheet = ?,
      name = ?,
      description = ?,
      address = ?,
      postal_code = ?,
      city = ?,
      department_code = ?,
      country_code = ?,
      coverage = ?,
      contract_flexibility = ?,
      lead_time_days = ?,
      on_time_rate = ?,
      price_per_km = ?,
      base_handling_fee = ?,
      min_shipment_kg = ?,
      co2_grams_per_tonne_km = ?,
      customer_satisfaction = ?,
      modes_json = ?,
      regions_json = ?,
      certifications_json = ?,
      unreachable = ?,
      profile_notes = ?,
      notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE external_ref = ?`,
  deleteExistingContacts: 'DELETE FROM supplier_contacts WHERE supplier_id = ?',
  insertContact:
    `INSERT INTO supplier_contacts (
      supplier_id, contact_role, full_name, email, phone, mobile,
      availability, is_primary
    ) VALUES (?, 'primary', ?, NULL, ?, NULL, NULL, 1)` ,
  deleteEquipment: 'DELETE FROM supplier_equipment WHERE supplier_id = ?',
  insertEquipment:
    `INSERT INTO supplier_equipment (supplier_id, equipment_id, capability_status)
     VALUES (?, (SELECT id FROM equipment_types WHERE code = ?), ?)` ,
  deleteServices: 'DELETE FROM service_capabilities WHERE supplier_id = ?',
  insertService:
    `INSERT INTO service_capabilities (supplier_id, service_id, status)
     VALUES (?, (SELECT id FROM service_types WHERE code = ?), ?)` ,
  deleteCoverage: 'DELETE FROM coverage_zones WHERE supplier_id = ?',
  insertCoverage:
    `INSERT INTO coverage_zones (supplier_id, department_code, coverage_type)
     VALUES (?, ?, ?)` ,
};

const normalizeDepartmentCode = (raw) => {
  if (raw === undefined || raw === null) {
    return null;
  }

  let value = raw.toString().trim();
  if (!value) {
    return null;
  }

  value = value.replace(/\.\d+$/, '');

  const numeric = Number.parseInt(value, 10);
  if (Number.isFinite(numeric)) {
    if (numeric >= 1 && numeric <= 999) {
      return numeric.toString().padStart(2, '0');
    }
  }

  return value.toUpperCase().slice(0, 8);
};

const boolToStatus = (flag) => (flag ? 'yes' : 'no');

const toJson = (value) => {
  try {
    return JSON.stringify(value ?? []);
  } catch (error) {
    return '[]';
  }
};

const ensureDepartment = async (conn, code, country = 'FR') => {
  const normalized = normalizeDepartmentCode(code);
  if (!normalized) {
    return null;
  }

  if (cachedDepartments.has(normalized)) {
    return normalized;
  }

  await conn.query(sql.upsertDepartment, [normalized, country, normalized]);
  cachedDepartments.add(normalized);
  return normalized;
};

const seedReferenceData = async (conn) => {
  for (const item of EQUIPMENT_DEFINITIONS) {
    if (!cachedEquipment.has(item.code)) {
      await conn.query(sql.upsertEquipment, [item.code, item.label, item.category]);
      cachedEquipment.add(item.code);
    }
  }

  for (const item of SERVICE_DEFINITIONS) {
    if (!cachedServices.has(item.code)) {
      await conn.query(sql.upsertService, [item.code, item.label]);
      cachedServices.add(item.code);
    }
  }
};

const getCountryFromProvider = (provider) => {
  if (provider.coverage && provider.coverage !== 'domestic') {
    return 'FR';
  }

  const department = provider.profile?.department;
  if (department && department.length === 2) {
    return 'FR';
  }

  return 'FR';
};

const importProvider = async (conn, provider) => {
  const deliveryDepartments = provider.profile?.deliveryDepartments || [];
  const pickupDepartments = provider.profile?.pickupDepartments || [];

  const sourceSheet = provider.source_sheet || 'TPS_National';
  const countryCode = sourceSheet === 'TPS_Espagnols' ? 'ES' : getCountryFromProvider(provider);

  const departmentCode = await ensureDepartment(
    conn,
    provider.profile?.department || deliveryDepartments[0] || null,
    countryCode
  );

  for (const dept of deliveryDepartments) {
    await ensureDepartment(conn, dept, 'FR');
  }

  for (const dept of pickupDepartments) {
    await ensureDepartment(conn, dept, 'FR');
  }

  const modesJson = toJson(provider.modes);
  const regionsJson = toJson(provider.regions);
  const certificationsJson = toJson(provider.certifications);

  const unreachable = provider.profile?.unreachable ? 1 : 0;
  const profileNotes = provider.profile?.notes || null;
  const notes = provider.notes || null;

  const coverage = provider.coverage || 'domestic';
  const contractFlexibility = provider.contractFlexibility || 'spot';

  const postalCode = provider.profile?.postalCode || null;
  const city = provider.profile?.city || null;
  const address = provider.profile?.address || null;

  const existing = await conn.query(sql.findSupplierByExternalRef, [provider.id]);

  if (existing.length === 0) {
    const insertParams = [
      provider.id,
      sourceSheet,
      provider.name,
      provider.description || null,
      address,
      postalCode,
      city,
      departmentCode,
      countryCode,
      coverage,
      contractFlexibility,
      provider.leadTimeDays || 3,
      provider.onTimeRate || 0.92,
      provider.pricePerKm || 1.2,
      provider.baseHandlingFee || 0,
      provider.minShipmentKg || 0,
      provider.co2GramsPerTonneKm || 180,
      provider.customerSatisfaction || 4,
      modesJson,
      regionsJson,
      certificationsJson,
      unreachable,
      profileNotes,
      notes,
    ];

    const result = await conn.query(sql.insertSupplier, insertParams);
    return result.insertId;
  }

  const updateParams = [
    sourceSheet,
    provider.name,
    provider.description || null,
    address,
    postalCode,
    city,
    departmentCode,
    countryCode,
    coverage,
    contractFlexibility,
    provider.leadTimeDays || 3,
    provider.onTimeRate || 0.92,
    provider.pricePerKm || 1.2,
    provider.baseHandlingFee || 0,
    provider.minShipmentKg || 0,
    provider.co2GramsPerTonneKm || 180,
    provider.customerSatisfaction || 4,
    modesJson,
    regionsJson,
    certificationsJson,
    unreachable,
    profileNotes,
    notes,
    provider.id,
  ];

  await conn.query(sql.updateSupplier, updateParams);
  return existing[0].id;
};

const updateContact = async (conn, supplierId, provider) => {
  await conn.query(sql.deleteExistingContacts, [supplierId]);

  const contactName = provider.profile?.contact || null;
  const phone = provider.profile?.phone || null;

  if (!contactName && !phone) {
    return;
  }

  await conn.query(sql.insertContact, [supplierId, contactName, phone]);
};

const updateEquipment = async (conn, supplierId, provider) => {
  await conn.query(sql.deleteEquipment, [supplierId]);

  const features = new Set(provider.profile?.features || []);

  for (const feature of features) {
    const definition = equipmentByFeature.get(feature);
    if (!definition) {
      continue;
    }

    await conn.query(sql.insertEquipment, [supplierId, definition.code, 'yes']);
  }
};

const updateServices = async (conn, supplierId, provider) => {
  await conn.query(sql.deleteServices, [supplierId]);

  const services = new Set([...(provider.serviceCapabilities || []), ...(provider.profile?.features || [])]);

  for (const feature of services) {
    const definition = serviceByFeature.get(feature);
    if (!definition) {
      continue;
    }

    await conn.query(sql.insertService, [supplierId, definition.code, 'yes']);
  }
};

const updateCoverage = async (conn, supplierId, provider) => {
  await conn.query(sql.deleteCoverage, [supplierId]);

  const deliveryDepartments = provider.profile?.deliveryDepartments || [];
  const pickupDepartments = provider.profile?.pickupDepartments || [];

  for (const dept of deliveryDepartments) {
    const normalized = normalizeDepartmentCode(dept);
    if (!normalized) {
      continue;
    }
    await conn.query(sql.insertCoverage, [supplierId, normalized, 'delivery']);
  }

  for (const dept of pickupDepartments) {
    const normalized = normalizeDepartmentCode(dept);
    if (!normalized) {
      continue;
    }
    await conn.query(sql.insertCoverage, [supplierId, normalized, 'loading']);
  }
};

const main = async () => {
  const conn = await pool.getConnection();
  try {
    await seedReferenceData(conn);

    let processed = 0;

    for (const provider of providers) {
      await conn.beginTransaction();
      try {
        const supplierId = await importProvider(conn, provider);
        await updateContact(conn, supplierId, provider);
        await updateEquipment(conn, supplierId, provider);
        await updateServices(conn, supplierId, provider);
        await updateCoverage(conn, supplierId, provider);
        await conn.commit();
        processed += 1;
      } catch (error) {
        await conn.rollback();
        console.error(`Failed to import provider ${provider.name}:`, error.message);
        throw error;
      }
    }

    console.log(`Imported ${processed} providers into MariaDB.`);
  } finally {
    conn.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error('Import failed:', error);
  process.exitCode = 1;
});
