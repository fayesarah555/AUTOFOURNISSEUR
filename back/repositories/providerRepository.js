const crypto = require('crypto');
const { pool } = require('../config/mariadb');
const {
  equipmentByCode,
  serviceByCode,
  serviceByFeature,
} = require('../utils/providerMappings');

const clone = (value) => (value ? JSON.parse(JSON.stringify(value)) : null);

const parseJsonArray = (value, fallback = []) => {
  if (!value) {
    return Array.isArray(fallback) ? [...fallback] : [];
  }

  if (Array.isArray(value)) {
    return [...value];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : Array.isArray(fallback) ? [...fallback] : [];
  } catch (error) {
    return Array.isArray(fallback) ? [...fallback] : [];
  }
};

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const serializeArray = (value) => {
  if (!value) {
    return JSON.stringify([]);
  }

  const arr = Array.isArray(value) ? value : [value];
  return JSON.stringify(arr);
};

const buildInClause = (ids) => {
  const unique = Array.from(new Set(ids)).filter((value) => value !== null && value !== undefined);
  if (unique.length === 0) {
    return { clause: '(NULL)', params: [] };
  }

  const placeholders = unique.map(() => '?').join(', ');
  return { clause: `(${placeholders})`, params: unique };
};

const generateId = (name) => {
  const slug = (name || 'provider')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16);
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `prt-${slug}-${randomSuffix}`;
};

const fetchSuppliers = async (externalRefs) => {
  if (Array.isArray(externalRefs) && externalRefs.length > 0) {
    const { clause, params } = buildInClause(externalRefs);
    return pool.query(`SELECT * FROM suppliers WHERE external_ref IN ${clause}`, params);
  }

  if (typeof externalRefs === 'string' && externalRefs) {
    return pool.query('SELECT * FROM suppliers WHERE external_ref = ?', [externalRefs]);
  }

  return pool.query('SELECT * FROM suppliers');
};

const hydrateProviders = async (supplierRows) => {
  if (!supplierRows || supplierRows.length === 0) {
    return [];
  }

  const supplierIds = supplierRows.map((row) => row.id);
  const supplierIdSet = new Set(supplierIds);
  const inClause = buildInClause(supplierIds);

  const equipmentRows = supplierIds.length
    ? await pool.query(
        `SELECT se.supplier_id, et.code
         FROM supplier_equipment se
         JOIN equipment_types et ON se.equipment_id = et.id
         WHERE se.capability_status = 'yes' AND se.supplier_id IN ${inClause.clause}`,
        inClause.params
      )
    : [];

  const serviceRows = supplierIds.length
    ? await pool.query(
        `SELECT sc.supplier_id, st.code
         FROM service_capabilities sc
         JOIN service_types st ON sc.service_id = st.id
         WHERE sc.status = 'yes' AND sc.supplier_id IN ${inClause.clause}`,
        inClause.params
      )
    : [];

  const coverageRows = supplierIds.length
    ? await pool.query(
        `SELECT supplier_id, department_code, coverage_type
         FROM coverage_zones
         WHERE supplier_id IN ${inClause.clause}`,
        inClause.params
      )
    : [];

  const contactRows = supplierIds.length
    ? await pool.query(
        `SELECT supplier_id, full_name, phone, email, is_primary
         FROM supplier_contacts
         WHERE supplier_id IN ${inClause.clause}`,
        inClause.params
      )
    : [];

  const serviceFeaturesBySupplier = new Map();
  const profileFeaturesBySupplier = new Map();

  for (const row of equipmentRows) {
    if (!supplierIdSet.has(row.supplier_id)) {
      continue;
    }

    const definition = equipmentByCode.get(row.code);
    if (!definition) {
      continue;
    }

    if (!profileFeaturesBySupplier.has(row.supplier_id)) {
      profileFeaturesBySupplier.set(row.supplier_id, new Set());
    }

    profileFeaturesBySupplier.get(row.supplier_id).add(definition.feature);
  }

  for (const row of serviceRows) {
    if (!supplierIdSet.has(row.supplier_id)) {
      continue;
    }

    const definition = serviceByCode.get(row.code);
    if (!definition) {
      continue;
    }

    if (!serviceFeaturesBySupplier.has(row.supplier_id)) {
      serviceFeaturesBySupplier.set(row.supplier_id, new Set());
    }
    serviceFeaturesBySupplier.get(row.supplier_id).add(definition.feature);

    if (!profileFeaturesBySupplier.has(row.supplier_id)) {
      profileFeaturesBySupplier.set(row.supplier_id, new Set());
    }
    profileFeaturesBySupplier.get(row.supplier_id).add(definition.feature);
  }

  const coverageMap = new Map();
  for (const row of coverageRows) {
    if (!supplierIdSet.has(row.supplier_id)) {
      continue;
    }

    if (!coverageMap.has(row.supplier_id)) {
      coverageMap.set(row.supplier_id, {
        delivery: new Set(),
        loading: new Set(),
      });
    }

    const entry = coverageMap.get(row.supplier_id);
    const code = row.department_code;

    if (row.coverage_type === 'loading') {
      entry.loading.add(code);
    } else {
      entry.delivery.add(code);
    }
  }

  const contactMap = new Map();
  for (const contact of contactRows) {
    if (!supplierIdSet.has(contact.supplier_id)) {
      continue;
    }

    const existing = contactMap.get(contact.supplier_id);
    if (!existing || (contact.is_primary && !existing.is_primary)) {
      contactMap.set(contact.supplier_id, contact);
    }
  }

  const providers = supplierRows.map((row) => {
    const id = row.external_ref || `prt-db-${row.id}`;
    const modes = parseJsonArray(row.modes_json, ['road']).map((value) => value.toLowerCase());
    const regions = parseJsonArray(row.regions_json, []);
    const certifications = parseJsonArray(row.certifications_json, []);

    const serviceFeatures = Array.from(serviceFeaturesBySupplier.get(row.id) || []).sort();
    const profileFeatures = new Set(profileFeaturesBySupplier.get(row.id) || []);
    const coverage = coverageMap.get(row.id) || { delivery: new Set(), loading: new Set() };
    const contact = contactMap.get(row.id) || {};

    const deliveryDepartments = Array.from(coverage.delivery).filter(Boolean).sort();
    const pickupDepartments = Array.from(coverage.loading).filter(Boolean).sort();

    if (!regions.length && deliveryDepartments.length) {
      deliveryDepartments.forEach((department) => {
        if (department) {
          regions.push(`FR-${department}`);
        }
      });
    }

    const provider = {
      id,
      source: row.source_sheet,
      name: row.name,
      description: row.description || '',
      coverage: row.coverage || 'domestic',
      contractFlexibility: row.contract_flexibility || 'spot',
      notes: row.notes || '',
      modes,
      regions,
      serviceCapabilities: serviceFeatures,
      certifications,
      leadTimeDays: toNumber(row.lead_time_days, 0),
      onTimeRate: toNumber(row.on_time_rate, 0),
      pricePerKm: toNumber(row.price_per_km, 0),
      baseHandlingFee: toNumber(row.base_handling_fee, 0),
      minShipmentKg: toNumber(row.min_shipment_kg, 0),
      co2GramsPerTonneKm: toNumber(row.co2_grams_per_tonne_km, 0),
      customerSatisfaction: toNumber(row.customer_satisfaction, 0),
      profile: {
        address: row.address || '',
        postalCode: row.postal_code || '',
        city: row.city || '',
        department: row.department_code || '',
        contact: contact.full_name || '',
        phone: contact.phone || '',
        unreachable: Boolean(row.unreachable),
        features: Array.from(profileFeatures).sort(),
        deliveryDepartments,
        pickupDepartments,
      },
    };

    if (!provider.profile.department && provider.profile.deliveryDepartments.length > 0) {
      provider.profile.department = provider.profile.deliveryDepartments[0];
    }

    if (!provider.profile.deliveryDepartments.length && provider.profile.department) {
      provider.profile.deliveryDepartments.push(provider.profile.department);
    }

    return provider;
  });

  return providers;
};

const listProviders = async () => {
  const rows = await fetchSuppliers();
  const providers = await hydrateProviders(rows);
  return providers.map((provider) => clone(provider));
};

const findProviderById = async (externalRef) => {
  if (!externalRef) {
    return null;
  }

  const rows = await fetchSuppliers(externalRef);
  const providers = await hydrateProviders(rows);
  return clone(providers[0] || null);
};

const ensureUniqueExternalRef = async (candidate, baseName) => {
  let ref = candidate || generateId(baseName);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await fetchSuppliers(ref);
    if (!existing.length) {
      return ref;
    }
    ref = generateId(baseName);
  }
};

const insertServiceCapabilities = async (conn, supplierId, capabilities = []) => {
  await conn.query('DELETE FROM service_capabilities WHERE supplier_id = ?', [supplierId]);

  for (const capability of capabilities) {
    const normalized = capability.toLowerCase();
    const definition = serviceByFeature.get(normalized);
    if (!definition) {
      continue;
    }

    await conn.query(
      `INSERT INTO service_capabilities (supplier_id, service_id, status)
       VALUES (?, (SELECT id FROM service_types WHERE code = ?), 'yes')`,
      [supplierId, definition.code]
    );
  }
};

const addProvider = async (providerInput) => {
  const baseName = providerInput.name || 'Provider';
  const externalRef = await ensureUniqueExternalRef(providerInput.id, baseName);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const insertResult = await conn.query(
      `INSERT INTO suppliers (
        external_ref, source_sheet, name, description, address, postal_code, city,
        department_code, country_code, status, coverage, contract_flexibility,
        lead_time_days, on_time_rate, price_per_km, base_handling_fee,
        min_shipment_kg, co2_grams_per_tonne_km, customer_satisfaction,
        modes_json, regions_json, certifications_json, unreachable, notes
      ) VALUES (
        ?, 'CUSTOM', ?, ?, NULL, NULL, NULL,
        NULL, 'FR', 'active', ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, 0, ?
      )`,
      [
        externalRef,
        providerInput.name,
        providerInput.description || null,
        providerInput.coverage || 'domestic',
        providerInput.contractFlexibility || 'spot',
        providerInput.leadTimeDays || 0,
        providerInput.onTimeRate || 0,
        providerInput.pricePerKm || 0,
        providerInput.baseHandlingFee || 0,
        providerInput.minShipmentKg || 0,
        providerInput.co2GramsPerTonneKm || 0,
        providerInput.customerSatisfaction || 0,
        serializeArray(providerInput.modes || ['road']),
        serializeArray(providerInput.regions || []),
        serializeArray(providerInput.certifications || []),
        providerInput.notes || null,
      ]
    );

    const supplierId = insertResult.insertId;
    await insertServiceCapabilities(conn, supplierId, providerInput.serviceCapabilities || []);

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const provider = await findProviderById(externalRef);
  return provider;
};

const updateProvider = async (externalRef, updates) => {
  const rows = await fetchSuppliers(externalRef);
  if (!rows.length) {
    return null;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE suppliers SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        coverage = COALESCE(?, coverage),
        contract_flexibility = COALESCE(?, contract_flexibility),
        lead_time_days = COALESCE(?, lead_time_days),
        on_time_rate = COALESCE(?, on_time_rate),
        price_per_km = COALESCE(?, price_per_km),
        base_handling_fee = COALESCE(?, base_handling_fee),
        min_shipment_kg = COALESCE(?, min_shipment_kg),
        co2_grams_per_tonne_km = COALESCE(?, co2_grams_per_tonne_km),
        customer_satisfaction = COALESCE(?, customer_satisfaction),
        modes_json = COALESCE(?, modes_json),
        regions_json = COALESCE(?, regions_json),
        certifications_json = COALESCE(?, certifications_json),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE external_ref = ?`,
      [
        updates.name || null,
        updates.description || null,
        updates.coverage || null,
        updates.contractFlexibility || null,
        updates.leadTimeDays ?? null,
        updates.onTimeRate ?? null,
        updates.pricePerKm ?? null,
        updates.baseHandlingFee ?? null,
        updates.minShipmentKg ?? null,
        updates.co2GramsPerTonneKm ?? null,
        updates.customerSatisfaction ?? null,
        updates.modes ? serializeArray(updates.modes) : null,
        updates.regions ? serializeArray(updates.regions) : null,
        updates.certifications ? serializeArray(updates.certifications) : null,
        updates.notes ?? null,
        externalRef,
      ]
    );

    if (updates.serviceCapabilities) {
      const current = rows[0];
      await insertServiceCapabilities(conn, current.id, updates.serviceCapabilities);
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const provider = await findProviderById(externalRef);
  return provider;
};

const deleteProvider = async (externalRef) => {
  const result = await pool.query('DELETE FROM suppliers WHERE external_ref = ?', [externalRef]);
  return result.affectedRows > 0;
};

const resetProviders = async () => {
  // No-op for database-backed repository.
  return false;
};

module.exports = {
  listProviders,
  findProviderById,
  addProvider,
  updateProvider,
  deleteProvider,
  resetProviders,
};
