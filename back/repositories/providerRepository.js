const crypto = require('crypto');
const { pool } = require('../config/mariadb');
const {
  equipmentByCode,
  serviceByCode,
  serviceByFeature,
} = require('../utils/providerMappings');
const { importProviders } = require('../services/providerImportService');
const { findTariffDocument } = require('../utils/tariffDocuments');

const clone = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  const replacer = (_, v) => (typeof v === 'bigint' ? v.toString() : v);
  return JSON.parse(JSON.stringify(value, replacer));
};

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

const DB_ID_PATTERN = /^prt-db-(\d+)$/i;

const fetchSuppliers = async (externalRefs) => {
  if (Array.isArray(externalRefs) && externalRefs.length > 0) {
    const { clause, params } = buildInClause(externalRefs);
    return pool.query(`SELECT * FROM suppliers WHERE external_ref IN ${clause}`, params);
  }

  if (typeof externalRefs === 'string' && externalRefs) {
    const dbIdMatch = externalRefs.match(DB_ID_PATTERN);
    if (dbIdMatch) {
      return pool.query('SELECT * FROM suppliers WHERE id = ?', [Number(dbIdMatch[1])]);
    }
    const numericId = Number(externalRefs);
    if (Number.isFinite(numericId)) {
      return pool.query('SELECT * FROM suppliers WHERE id = ?', [numericId]);
    }
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

  const tariffDocumentRows = supplierIds.length
    ? await pool.query(
        `SELECT id,
                supplier_id,
                filename,
                original_name,
                mime_type,
                format,
                size_bytes,
                created_at
         FROM supplier_tariff_documents
         WHERE supplier_id IN ${inClause.clause}
         ORDER BY created_at DESC, id DESC`,
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
  const tariffDocsBySupplier = new Map();
  for (const contact of contactRows) {
    if (!supplierIdSet.has(contact.supplier_id)) {
      continue;
    }

    const existing = contactMap.get(contact.supplier_id);
    if (!existing || (contact.is_primary && !existing.is_primary)) {
      contactMap.set(contact.supplier_id, contact);
    }
  }

  for (const doc of tariffDocumentRows) {
    if (!supplierIdSet.has(doc.supplier_id)) {
      continue;
    }

    if (!tariffDocsBySupplier.has(doc.supplier_id)) {
      tariffDocsBySupplier.set(doc.supplier_id, []);
    }
    tariffDocsBySupplier.get(doc.supplier_id).push(doc);
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
      rating: row.rating !== undefined && row.rating !== null ? toNumber(row.rating, null) : null,
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

    const attachedDocuments = (tariffDocsBySupplier.get(row.id) || []).map((doc) => ({
      id: Number(doc.id) || doc.id,
      filename: doc.filename,
      originalName: doc.original_name || doc.filename,
      format: doc.format,
      sizeBytes: doc.size_bytes !== null && doc.size_bytes !== undefined ? Number(doc.size_bytes) : null,
      createdAt: doc.created_at,
      downloadUrl: `/api/providers/${id}/tariff-documents/${doc.id}`,
    }));

    provider.tariffDocuments = attachedDocuments;

    if (!provider.profile.department && provider.profile.deliveryDepartments.length > 0) {
      provider.profile.department = provider.profile.deliveryDepartments[0];
    }

    if (!provider.profile.deliveryDepartments.length && provider.profile.department) {
      provider.profile.deliveryDepartments.push(provider.profile.department);
    }

    const documentInfo = findTariffDocument(id, row.tariff_document_url);
    const hasAdditionalDocuments = attachedDocuments.length > 0;
    const hasPrimaryDocument = documentInfo.hasDocument;
    provider.hasTariffDocument = hasPrimaryDocument || hasAdditionalDocuments;
    provider.tariffDocumentUrl = documentInfo.hasDocument ? documentInfo.publicUrl : null;
    provider.tariffDocumentType = documentInfo.type || null;
    provider.tariffDocumentFormat = documentInfo.format || null;
    if (documentInfo.hasDocument && documentInfo.filename) {
      provider.tariffDocumentFilename = documentInfo.filename;
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

const getTariffDocumentDefinition = async (externalRefOrId) => {
  if (!externalRefOrId) {
    return null;
  }

  // Try lookup by external_ref (primary path), then fallback to numeric id
  let rows = await fetchSuppliers(externalRefOrId);
  if (!rows.length) {
    // Fallback: numeric id support
    const numericId = Number(externalRefOrId);
    if (Number.isFinite(numericId)) {
      rows = await pool.query('SELECT * FROM suppliers WHERE id = ?', [numericId]);
      if (!rows.length) {
        // trace why not found
        console.warn('[providers][repo] supplier not found for id/external_ref', {
          input: externalRefOrId,
          numericId,
        });
      }
    }
  }
  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    supplierId: row.id,
    externalRef: row.external_ref || String(externalRefOrId),
    explicitPath: row.tariff_document_url || '',
  };
};

const findSupplierRowByExternalRef = async (externalRef) => {
  if (!externalRef) {
    return null;
  }
  const rows = await fetchSuppliers(externalRef);
  return rows[0] || null;
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

const buildProviderForImport = (base = {}, overrides = {}) => {
  const merged = {
    ...base,
    ...overrides,
    profile: {
      ...(base.profile || {}),
      ...(overrides.profile || {}),
    },
  };

  const profile = merged.profile || {};
  const parsedRating = toNumber(merged.rating, null);
  const normalizedRating =
    parsedRating === null ? null : Math.max(1, Math.min(5, parsedRating));

  return {
    id: merged.id,
    source_sheet: merged.source_sheet || merged.source || 'CUSTOM',
    name: merged.name,
    description: merged.description || '',
    notes: merged.notes || '',
    tariffDocumentUrl: merged.tariffDocumentUrl || '',
    coverage: merged.coverage || 'domestic',
    contractFlexibility: merged.contractFlexibility || 'spot',
    modes: Array.isArray(merged.modes) ? merged.modes : [],
    regions: Array.isArray(merged.regions) ? merged.regions : [],
    serviceCapabilities: Array.isArray(merged.serviceCapabilities) ? merged.serviceCapabilities : [],
    certifications: Array.isArray(merged.certifications) ? merged.certifications : [],
    leadTimeDays: toNumber(merged.leadTimeDays, 0),
    onTimeRate: toNumber(merged.onTimeRate, 0),
    pricePerKm: toNumber(merged.pricePerKm, 0),
    baseHandlingFee: toNumber(merged.baseHandlingFee, 0),
    minShipmentKg: toNumber(merged.minShipmentKg, 0),
    co2GramsPerTonneKm: toNumber(merged.co2GramsPerTonneKm, 0),
    customerSatisfaction: toNumber(merged.customerSatisfaction, 0),
    rating: normalizedRating,
    profile: {
      address: profile.address || '',
      postalCode: profile.postalCode || '',
      city: profile.city || '',
      department: profile.department || '',
      contact: profile.contact || '',
      phone: profile.phone || '',
      email: profile.email || '',
      unreachable: Boolean(profile.unreachable),
      features: Array.isArray(profile.features) ? profile.features : [],
      deliveryDepartments: Array.isArray(profile.deliveryDepartments)
        ? profile.deliveryDepartments
        : [],
      pickupDepartments: Array.isArray(profile.pickupDepartments)
        ? profile.pickupDepartments
        : [],
      notes: profile.notes || '',
    },
  };
};

const addProvider = async (providerInput) => {
  const baseName = providerInput.name || 'Provider';
  const externalRef = await ensureUniqueExternalRef(providerInput.id, baseName);

  const importPayload = buildProviderForImport({
    id: externalRef,
    source_sheet: 'CUSTOM',
  }, providerInput);

  await importProviders([importPayload], { sourceSheet: 'CUSTOM' });

  return findProviderById(externalRef);
};

const updateProvider = async (externalRef, updates) => {
  const rows = await fetchSuppliers(externalRef);
  if (!rows.length) {
    return null;
  }
  const currentProvider = await hydrateProviders(rows);
  const base = currentProvider[0] || {};

  const importPayload = buildProviderForImport(
    {
      id: base.id,
      source_sheet: base.source || 'CUSTOM',
      name: base.name,
      description: base.description,
      notes: base.notes,
      coverage: base.coverage,
      contractFlexibility: base.contractFlexibility,
      modes: base.modes,
      regions: base.regions,
      serviceCapabilities: base.serviceCapabilities,
      certifications: base.certifications,
      leadTimeDays: base.leadTimeDays,
      onTimeRate: base.onTimeRate,
      pricePerKm: base.pricePerKm,
      baseHandlingFee: base.baseHandlingFee,
      minShipmentKg: base.minShipmentKg,
      co2GramsPerTonneKm: base.co2GramsPerTonneKm,
      customerSatisfaction: base.customerSatisfaction,
      rating: base.rating,
      tariffDocumentUrl: base.tariffDocumentUrl,
      profile: base.profile,
    },
    updates
  );

  await importProviders([importPayload], { sourceSheet: importPayload.source_sheet || 'CUSTOM' });

  return findProviderById(externalRef);
};

const deleteProvider = async (externalRefOrId) => {
  if (!externalRefOrId) {
    return false;
  }

  const candidate = String(externalRefOrId).trim();
  const dbIdMatch = candidate.match(DB_ID_PATTERN);
  const numericId = Number.isFinite(Number(candidate))
    ? Number(candidate)
    : dbIdMatch
    ? Number(dbIdMatch[1])
    : null;

  // Try delete by external_ref (primary path)
  let result = await pool.query('DELETE FROM suppliers WHERE external_ref = ?', [candidate]);
  if (result.affectedRows > 0) {
    // eslint-disable-next-line no-console
    console.info('[providers][delete] deleted by external_ref', { externalRef: candidate });
    return true;
  }

  // Fallback: delete by numeric id (supports prt-db-<id> pseudo IDs)
  if (numericId !== null) {
    result = await pool.query('DELETE FROM suppliers WHERE id = ?', [numericId]);
    if (result.affectedRows > 0) {
      // eslint-disable-next-line no-console
      console.info('[providers][delete] deleted by numeric id', { id: numericId, input: candidate });
      return true;
    }
  }

  // eslint-disable-next-line no-console
  console.warn('[providers][delete] supplier not found for deletion', { input: externalRefOrId });
  return false;
};

const addTariffDocumentRecord = async (supplierId, data) => {
  const result = await pool.query(
    `INSERT INTO supplier_tariff_documents
      (supplier_id, filename, original_name, mime_type, format, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      supplierId,
      data.filename,
      data.originalName || null,
      data.mimeType || null,
      data.format || 'pdf',
      data.sizeBytes || null,
    ]
  );
  return { id: Number(result.insertId), ...data };
};

const findTariffDocumentRecord = async (supplierId, documentId) => {
  const rows = await pool.query(
    'SELECT * FROM supplier_tariff_documents WHERE supplier_id = ? AND id = ?',
    [supplierId, documentId]
  );
  return rows[0] || null;
};

const deleteTariffDocumentRecord = async (supplierId, documentId) => {
  const result = await pool.query(
    'DELETE FROM supplier_tariff_documents WHERE supplier_id = ? AND id = ?',
    [supplierId, documentId]
  );
  return result.affectedRows > 0;
};

const getPrimaryTariffCatalogRow = async (supplierId) => {
  if (!supplierId) {
    return null;
  }
  const rows = await pool.query(
    `SELECT *
     FROM tariff_catalogs
     WHERE supplier_id = ?
     ORDER BY valid_from IS NULL DESC, id ASC
     LIMIT 1`,
    [supplierId]
  );
  return rows[0] || null;
};

const getOrCreatePrimaryTariffCatalog = async (supplierId) => {
  if (!supplierId) {
    throw new Error('supplierId requis');
  }
  const existing = await getPrimaryTariffCatalogRow(supplierId);
  if (existing) {
    return existing;
  }
  const label = 'Catalogue principal';
  const result = await pool.query(
    `INSERT INTO tariff_catalogs (supplier_id, label, currency, incoterm, valid_from, valid_to, comment)
     VALUES (?, ?, 'EUR', NULL, CURRENT_DATE, NULL, NULL)`,
    [supplierId, label]
  );
  return {
    id: Number(result.insertId),
    supplier_id: supplierId,
    label,
    currency: 'EUR',
    incoterm: null,
    valid_from: new Date(),
    valid_to: null,
    comment: null,
  };
};

const getTariffLinesForSupplier = async (supplierId) => {
  const catalog = await getPrimaryTariffCatalogRow(supplierId);
  if (!catalog) {
    return { catalog: null, lines: [] };
  }
  const lines = await pool.query(
    `SELECT
        id,
        tariff_catalog_id,
        origin_department,
        destination_department,
        min_distance_km,
        max_distance_km,
        pallet_count,
        base_price,
        price_per_km
     FROM tariff_lines
     WHERE tariff_catalog_id = ?
     ORDER BY
       CASE WHEN destination_department IS NULL THEN 1 ELSE 0 END,
       destination_department,
       min_distance_km,
       pallet_count`,
    [catalog.id]
  );
  return { catalog, lines };
};

const updateProviderTariffDocumentPath = async (externalRef, filename) => {
  if (!externalRef) {
    return null;
  }

  const rows = await fetchSuppliers(externalRef);
  if (!rows.length) {
    return null;
  }

  // await pool.query(
  //   'UPDATE suppliers SET tariff_document_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
  //   [filename || null, rows[0].id]
  // );

  return findProviderById(externalRef);
};

const resetProviders = async () => {
  // No-op for database-backed repository.
  return false;
};

const ensureUniqueCatalogLabel = async (supplierId, baseLabel) => {
  let attempt = 1;
  let candidate = baseLabel;
  const sql = 'SELECT id FROM tariff_catalogs WHERE supplier_id = ? AND label = ? LIMIT 1';
  while (attempt < 50) {
    const existing = await pool.query(sql, [supplierId, candidate]);
    if (!existing.length) {
      return candidate;
    }
    attempt += 1;
    candidate = `${baseLabel} (${attempt})`;
  }
  throw new Error('Impossible de générer un libellé unique pour la grille tarifaire.');
};

module.exports = {
  listProviders,
  findProviderById,
  findSupplierRowByExternalRef,
  getTariffDocumentDefinition,
  addProvider,
  updateProvider,
  deleteProvider,
  updateProviderTariffDocumentPath,
  addTariffDocumentRecord,
  findTariffDocumentRecord,
  deleteTariffDocumentRecord,
  getOrCreatePrimaryTariffCatalog,
  getTariffLinesForSupplier,
  resetProviders,
  // Tariff DB helpers
  createTariffCatalogForSupplier: async (supplierId, { label, currency = 'EUR', incoterm = null, validFrom = null, validTo = null, comment = null } = {}) => {
    if (!supplierId) {
      throw new Error('supplierId requis');
    }
    const baseLabel = label || `Grille importée ${new Date().toISOString().slice(0, 10)}`;
    const resolvedLabel = await ensureUniqueCatalogLabel(supplierId, baseLabel);
    const sql = `
      INSERT INTO tariff_catalogs (supplier_id, label, currency, incoterm, valid_from, valid_to, comment)
      VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?, ?)
    `;
    const result = await pool.query(sql, [supplierId, resolvedLabel, currency, incoterm, validFrom, validTo, comment]);
    return Number(result.insertId);
  },
  bulkInsertTariffLines: async (catalogId, lines) => {
    if (!catalogId || !Array.isArray(lines) || lines.length === 0) {
      return 0;
    }
    const columns = [
      'tariff_catalog_id',
      'origin_department',
      'destination_department',
      'min_distance_km',
      'max_distance_km',
      'pallet_count',
      'base_price',
      'price_per_km',
    ];
    const placeholders = lines.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
    const values = [];
    lines.forEach((l) => {
      values.push(
        catalogId,
        l.origin_department || null,
        l.destination_department || null,
        l.min_distance_km ?? null,
        l.max_distance_km ?? null,
        l.pallet_count ?? null,
        l.base_price ?? null,
        l.price_per_km ?? null
      );
    });
    const sql = `INSERT INTO tariff_lines (${columns.join(',')}) VALUES ${placeholders}`;
    const result = await pool.query(sql, values);
    return Number(result.affectedRows || 0);
  },
};
