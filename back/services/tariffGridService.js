const crypto = require('crypto');

const UPSERT_TARIFF_GRID_SQL = `
  INSERT INTO supplier_tariff_grids (
    supplier_id, label, currency, base_price, price_per_km,
    min_pallets, max_pallets, free_waiting_minutes,
    reference_distance_km, includes_fuel_surcharge,
    metadata, valid_from, valid_to
  ) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?,
    ?, ?, ?
  )
  ON DUPLICATE KEY UPDATE
    label = VALUES(label),
    currency = VALUES(currency),
    base_price = VALUES(base_price),
    price_per_km = VALUES(price_per_km),
    min_pallets = VALUES(min_pallets),
    max_pallets = VALUES(max_pallets),
    free_waiting_minutes = VALUES(free_waiting_minutes),
    reference_distance_km = VALUES(reference_distance_km),
    includes_fuel_surcharge = VALUES(includes_fuel_surcharge),
    metadata = VALUES(metadata),
    valid_from = VALUES(valid_from),
    valid_to = VALUES(valid_to),
    updated_at = CURRENT_TIMESTAMP
`;

const DELETE_TARIFF_GRID_SQL = 'DELETE FROM supplier_tariff_grids WHERE supplier_id = ?';

const formatDate = (input) => {
  if (!input) {
    return null;
  }

  const value = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value.toISOString().slice(0, 10);
};

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const collectFeatures = (provider = {}) => {
  const bucket = new Set();
  if (Array.isArray(provider.profile?.features)) {
    provider.profile.features.forEach((feature) => {
      if (feature) {
        bucket.add(feature.toString().toLowerCase());
      }
    });
  }
  if (Array.isArray(provider.serviceCapabilities)) {
    provider.serviceCapabilities.forEach((feature) => {
      if (feature) {
        bucket.add(feature.toString().toLowerCase());
      }
    });
  }
  if (Array.isArray(provider.features)) {
    provider.features.forEach((feature) => {
      if (feature) {
        bucket.add(feature.toString().toLowerCase());
      }
    });
  }
  return bucket;
};

const shouldAttachTariffGrid = (provider = {}) => {
  const discriminator =
    provider.id ||
    provider.externalRef ||
    provider.external_ref ||
    provider.name ||
    '';

  const hash = crypto.createHash('sha1').update(String(discriminator)).digest();
  // Use the first byte to keep roughly 50% of suppliers.
  return (hash[0] & 1) === 0;
};

const buildTariffGridPayload = (provider = {}) => {
  const features = collectFeatures(provider);

  const express = features.has('express');
  const refrigerated =
    features.has('semi-frigorifique') || features.has('porteur-frigorifique');
  const hazardous = features.has('adr') || features.has('matiere-adr');
  const lightVehicle = features.has('vehicule-leger');
  const hayon = features.has('porteur-hayon') || features.has('semi-hayon');

  const baseHandlingFee = Math.max(60, toNumber(provider.baseHandlingFee, 110));
  const kmPrice = Math.max(0.75, toNumber(provider.pricePerKm, 1.3));

  const coverage = provider.coverage || 'domestic';
  const coefficient =
    1 +
    (express ? 0.05 : 0) +
    (refrigerated ? 0.18 : 0) +
    (hazardous ? 0.08 : 0) -
    (lightVehicle ? 0.12 : 0) +
    (coverage === 'global' ? 0.05 : 0);

  const basePrice = Number((baseHandlingFee * coefficient).toFixed(2));
  const pricePerKm = Number((kmPrice * coefficient).toFixed(2));

  const minPallets = lightVehicle ? 1 : 2;
  const maxPallets = lightVehicle ? 12 : refrigerated ? 30 : 33;
  const freeWaitingMinutes = express ? 15 : 30;
  const referenceDistanceKm = refrigerated ? 650 : express ? 450 : 320;

  const today = new Date();
  const validFrom = formatDate(today);
  const validToDate = new Date(today);
  validToDate.setFullYear(today.getFullYear() + 1);
  const validTo = formatDate(validToDate);

  const metadata = {
    express,
    refrigerated,
    hazardous,
    lightVehicle,
    hayon,
    coverage,
    contractFlexibility: provider.contractFlexibility || null,
    features: Array.from(features).slice(0, 12),
    notes: provider.notes?.slice(0, 200) || null,
  };

  return {
    label: provider.name ? `${provider.name} - Grille standard` : 'Grille tarifaire transporteur',
    currency: 'EUR',
    basePrice,
    pricePerKm,
    minPallets,
    maxPallets,
    freeWaitingMinutes,
    referenceDistanceKm,
    includesFuelSurcharge: !lightVehicle,
    metadata,
    validFrom,
    validTo,
  };
};

const maintainTariffGridForSupplier = async (conn, supplierId, provider, options = {}) => {
  if (!conn || typeof conn.query !== 'function') {
    throw new Error('A valid connection is required to maintain tariff grids.');
  }

  const { forceAttach } = options;
  const attach =
    typeof forceAttach === 'boolean' ? forceAttach : shouldAttachTariffGrid(provider);

  if (!attach) {
    const result = await conn.query(DELETE_TARIFF_GRID_SQL, [supplierId]);
    return { attached: false, removed: result.affectedRows > 0 };
  }

  const payload = buildTariffGridPayload(provider);

  await conn.query(UPSERT_TARIFF_GRID_SQL, [
    supplierId,
    payload.label,
    payload.currency,
    payload.basePrice,
    payload.pricePerKm,
    payload.minPallets,
    payload.maxPallets,
    payload.freeWaitingMinutes,
    payload.referenceDistanceKm,
    payload.includesFuelSurcharge ? 1 : 0,
    JSON.stringify(payload.metadata || {}),
    payload.validFrom,
    payload.validTo,
  ]);

  return { attached: true, payload };
};

module.exports = {
  formatDate,
  buildTariffGridPayload,
  shouldAttachTariffGrid,
  maintainTariffGridForSupplier,
};
