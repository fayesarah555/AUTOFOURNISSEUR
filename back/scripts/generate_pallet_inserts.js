#!/usr/bin/env node
/*
  Generates SQL INSERT statements for pallet formats and options
  based on the Excel equivalence data already used by the app
  (Fretplus-tarifs(10).xlsm -> "Equivalence Mpl Palette").

  Output: prints SQL to stdout and writes back/config/seed_pallets.sql
*/

const fs = require('fs');
const path = require('path');

const {
  loadTariffData,
  getAvailablePaletteMeters,
} = require('../services/tariffMatrixService');

const outPath = path.join(__dirname, '..', 'config', 'seed_pallets.sql');

const toInt = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
};

const parseDimensions = (dimensionLabel) => {
  if (!dimensionLabel) return { code: 'custom', length: null, width: null };
  const normalized = dimensionLabel.toString().trim().toLowerCase();
  const match = normalized.match(/^(\d+)x(\d+)$/);
  if (!match) {
    return { code: dimensionLabel, length: null, width: null };
  }
  const length = toInt(match[1]);
  const width = toInt(match[2]);
  const code = `${length}x${width}`;
  return { code, length, width };
};

const main = () => {
  // Ensure data loaded from Excel is available
  loadTariffData();
  const entries = getAvailablePaletteMeters();

  // Collect unique formats
  const formats = new Map(); // code -> { code, label, length, width }
  const options = []; // { code, palletCount, linearMeters, maxWeightKg }

  entries.forEach((e) => {
    const dimension = (e.dimension || 'Format').toString().trim();
    const { code, length, width } = parseDimensions(dimension);
    if (!formats.has(code)) {
      formats.set(code, {
        code,
        label: dimension,
        length,
        width,
      });
    }

    const palletCount = Number(e.palletCount);
    const meter = Number(e.meter);
    const tonnage = e.tonnage === null || e.tonnage === undefined ? null : Number(e.tonnage);
    if (Number.isFinite(palletCount) && palletCount > 0 && Number.isFinite(meter) && meter > 0) {
      options.push({ code, palletCount, linearMeters: Number(meter.toFixed(3)), maxWeightKg: Number.isFinite(tonnage) ? Number(tonnage.toFixed(2)) : null });
    }
  });

  const lines = [];
  lines.push('-- Seed pallet formats and options generated from Excel equivalences');
  lines.push('START TRANSACTION;');

  // Upsert formats
  formats.forEach((fmt) => {
    lines.push(
      `INSERT INTO pallet_formats (code, label, length_mm, width_mm, base_linear_meter)\n` +
      `VALUES ('${fmt.code}', '${fmt.label.replace(/'/g, "''")}', ${fmt.length ?? 'NULL'}, ${fmt.width ?? 'NULL'}, NULL)\n` +
      `ON DUPLICATE KEY UPDATE label=VALUES(label), length_mm=VALUES(length_mm), width_mm=VALUES(width_mm);`
    );
  });

  // Upsert options using SELECT id by code
  options.forEach((opt) => {
    const weightSql = opt.maxWeightKg === null ? 'NULL' : opt.maxWeightKg.toFixed(2);
    lines.push(
      `INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)\n` +
      `SELECT id, ${opt.palletCount}, ${opt.linearMeters.toFixed(3)}, ${weightSql} FROM pallet_formats WHERE code='${opt.code}'\n` +
      `ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);`
    );
  });

  lines.push('COMMIT;');

  const sql = lines.join('\n');
  fs.writeFileSync(outPath, sql, 'utf8');
  process.stdout.write(sql + '\n');
};

main();

