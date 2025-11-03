const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { normalizeDepartmentCode } = require('../utils/departmentGeo');

const EXCEL_FILENAME = 'Fretplus-tarifs(10).xlsm';
const MAX_PALLETS = 33;

const SHEET_NAMES = {
  idf: [
    'Tarif d\u00e9part IDF',
    'Tarif d\u01f8part IDF',
    'Tarif d\uFFFDpart IDF',
    'Tarif d?part IDF',
    'Tarif depart IDF',
  ],
  pricePerKm: [
    '\u00e0 km',
    'a km',
    '\uFFFD km',
    '?? km',
  ],
  nonIdfShort: ['Hors IDF ZC', 'Hors IDF ZC '],
  nonIdfLong: ['Hors IDF ZL', 'Hors IDF ZL '],
};

const IDF_DEPARTURE_CODES = new Set(['75', '77', '78', '91', '92', '93', '94', '95']);

const normalizePalletCount = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.min(parsed, MAX_PALLETS);
};

const getWorkbookPath = () => path.resolve(__dirname, '..', '..', EXCEL_FILENAME);

const resolveSheet = (workbook, candidates) => {
  if (!workbook) {
    return null;
  }
  for (const name of candidates) {
    if (workbook.Sheets[name]) {
      return workbook.Sheets[name];
    }
  }
  return null;
};

const ensureWorkbook = () => {
  const excelPath = getWorkbookPath();
  if (!fs.existsSync(excelPath)) {
    return null;
  }
  try {
    return xlsx.readFile(excelPath, { cellDates: false });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to read tariff workbook:', error);
    return null;
  }
};

const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const buildPaletteColumnMap = (headerRow, startIndex = 1) => {
  const columns = [];
  headerRow.forEach((cell, index) => {
    if (index < startIndex) {
      return;
    }
    const count = Number.parseInt(cell, 10);
    if (Number.isFinite(count)) {
      columns.push({ index, count });
    }
  });
  return columns;
};

const buildIdfMatrix = (sheet) => {
  if (!sheet) {
    return { matrix: new Map(), mplByCount: new Map(), departures: new Set() };
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true });
  if (!rows.length) {
    return { matrix: new Map(), mplByCount: new Map(), departures: new Set() };
  }

  const departures = new Set();
  const firstRow = rows[0] || [];
  firstRow.forEach((cell, index) => {
    if (index === 0) {
      return;
    }
    const code = normalizeDepartmentCode(cell);
    if (code) {
      departures.add(code);
    }
  });

  const paletteColumns = buildPaletteColumnMap(rows[1] || [], 1);

  const mplByCount = new Map();
  const mplRow = rows[2] || [];
  paletteColumns.forEach(({ index, count }) => {
    const value = safeNumber(mplRow[index]);
    if (value !== null) {
      mplByCount.set(count, value);
    }
  });

  const matrix = new Map();
  for (let rowIndex = 4; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row || row.length === 0) {
      continue;
    }

    let dept = row[0];
    if (dept === undefined || dept === null || dept === '') {
      continue;
    }

    dept = normalizeDepartmentCode(dept);
    if (!dept) {
      continue;
    }

    const priceByCount = new Map();
    paletteColumns.forEach(({ index, count }) => {
      const value = safeNumber(row[index]);
      if (value !== null) {
        priceByCount.set(count, value);
      }
    });

    if (priceByCount.size > 0) {
      matrix.set(dept, priceByCount);
    }
  }

  return {
    matrix,
    mplByCount,
    departures: departures.size > 0 ? departures : new Set(IDF_DEPARTURE_CODES),
  };
};

const buildNonIdfMatrix = (sheet) => {
  if (!sheet) {
    return [];
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true });
  if (rows.length < 3) {
    return [];
  }

  const paletteColumns = buildPaletteColumnMap(rows[1] || [], 2);
  const entries = [];

  for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row || row.length === 0) {
      continue;
    }

    const km = safeNumber(row[0]);
    const baseCost = safeNumber(row[1]);

    if (km === null || baseCost === null) {
      continue;
    }

    const coefficients = new Map();
    paletteColumns.forEach(({ index, count }) => {
      const value = safeNumber(row[index]);
      if (value !== null) {
        coefficients.set(count, value);
      }
    });

    if (coefficients.size === 0) {
      continue;
    }

    entries.push({ km, baseCost, coefficients });
  }

  entries.sort((a, b) => a.km - b.km);
  return entries;
};

const buildPricePerKmMap = (sheet) => {
  if (!sheet) {
    return new Map();
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true });
  if (rows.length < 2) {
    return new Map();
  }

  const data = new Map();

  for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row || row.length === 0) {
      continue;
    }

    const code = normalizeDepartmentCode(row[0]);
    if (!code) {
      continue;
    }

    const name = row[1] ? row[1].toString().trim() : null;
    const pricePerKm = safeNumber(row[2]);
    const departureSurcharge = safeNumber(row[3]);
    const deliverySurcharge = safeNumber(row[4]);

    data.set(code, {
      departmentName: name,
      pricePerKm,
      departureSurcharge,
      deliverySurcharge,
    });
  }

  return data;
};

const selectZoneEntry = (entries, distanceKm) => {
  if (!entries.length || !Number.isFinite(distanceKm)) {
    return null;
  }

  let selected = entries[0];
  for (const entry of entries) {
    if (distanceKm <= entry.km) {
      selected = entry;
      break;
    }
    selected = entry;
  }
  return selected;
};

const computeZoneTariff = (entries, distanceKm, palletCount) => {
  if (!entries.length || !Number.isFinite(distanceKm) || !Number.isFinite(palletCount)) {
    return null;
  }

  const entry = selectZoneEntry(entries, distanceKm);
  if (!entry) {
    return null;
  }

  const counts = Array.from(entry.coefficients.keys()).sort((a, b) => a - b);
  if (!counts.length) {
    return null;
  }

  let coefficient = entry.coefficients.get(palletCount);
  if (coefficient === undefined) {
    for (const count of counts) {
      if (palletCount <= count) {
        coefficient = entry.coefficients.get(count);
        break;
      }
    }
    if (coefficient === undefined) {
      coefficient = entry.coefficients.get(counts[counts.length - 1]);
    }
  }

  if (coefficient === undefined || coefficient === null) {
    return null;
  }

  const gridPrice = entry.baseCost + entry.km * coefficient * palletCount;

  return {
    gridPrice,
    coefficient,
    referenceKm: entry.km,
    baseCost: entry.baseCost,
  };
};

let cache = null;

const loadTariffData = () => {
  if (cache) {
    return cache;
  }

  const workbook = ensureWorkbook();
  if (!workbook) {
    cache = {
      idfDepartures: new Set(IDF_DEPARTURE_CODES),
      idfMatrix: new Map(),
      mplByCount: new Map(),
      pricePerKm: new Map(),
      nonIdfShort: [],
      nonIdfLong: [],
    };
    return cache;
  }

  const idfSheet = resolveSheet(workbook, SHEET_NAMES.idf);
  const kmSheet = resolveSheet(workbook, SHEET_NAMES.pricePerKm);
  const shortSheet = resolveSheet(workbook, SHEET_NAMES.nonIdfShort);
  const longSheet = resolveSheet(workbook, SHEET_NAMES.nonIdfLong);

  const { matrix, mplByCount, departures } = buildIdfMatrix(idfSheet);
  const pricePerKm = buildPricePerKmMap(kmSheet);
  const nonIdfShort = buildNonIdfMatrix(shortSheet);
  const nonIdfLong = buildNonIdfMatrix(longSheet);

  cache = {
    idfDepartures: departures,
    idfMatrix: matrix,
    mplByCount,
    pricePerKm,
    nonIdfShort,
    nonIdfLong,
  };

  return cache;
};

const getTariffForShipment = ({
  departureDepartment,
  arrivalDepartment,
  palletCount,
  distanceKm,
}) => {
  const data = loadTariffData();

  const normalizedDeparture = normalizeDepartmentCode(departureDepartment);
  const normalizedArrival = normalizeDepartmentCode(arrivalDepartment);
  const normalizedPallets = normalizePalletCount(palletCount);
  const normalizedDistance = safeNumber(distanceKm);

  if (!normalizedArrival) {
    return null;
  }

  const perKmEntry = data.pricePerKm.get(normalizedArrival) || null;

  const result = {
    departureDepartment: normalizedDeparture,
    arrivalDepartment: normalizedArrival,
    palletCount: normalizedPallets,
    gridPrice: null,
    pricePerKm: perKmEntry?.pricePerKm ?? null,
    departmentName: perKmEntry?.departmentName ?? null,
    departureSurcharge: perKmEntry?.departureSurcharge ?? null,
    deliverySurcharge: perKmEntry?.deliverySurcharge ?? null,
    palletMpl: normalizedPallets ? data.mplByCount.get(normalizedPallets) ?? null : null,
    source: null,
    zone: null,
    referenceDistanceKm: null,
    baseCost: null,
    coefficient: null,
    distanceKm: normalizedDistance,
  };

  if (
    normalizedDeparture &&
    normalizedPallets &&
    data.idfDepartures.has(normalizedDeparture) &&
    data.idfMatrix.has(normalizedArrival)
  ) {
    const prices = data.idfMatrix.get(normalizedArrival);
    const price = prices.get(normalizedPallets) ?? null;
    if (price !== null) {
      result.gridPrice = price;
      result.source = 'idf';
      result.referenceDistanceKm = normalizedDistance;
    }
    return result;
  }

  if (normalizedPallets && Number.isFinite(normalizedDistance)) {
    const shortMax = data.nonIdfShort.length
      ? data.nonIdfShort[data.nonIdfShort.length - 1].km
      : null;
    const longMin = data.nonIdfLong.length ? data.nonIdfLong[0].km : null;

    const candidates = [];

    if (shortMax !== null && normalizedDistance <= shortMax) {
      const computed = computeZoneTariff(data.nonIdfShort, normalizedDistance, normalizedPallets);
      if (computed) {
        candidates.push({ zone: 'non-idf-zc', computed });
      }
    }

    if (longMin !== null && normalizedDistance >= longMin) {
      const computed = computeZoneTariff(data.nonIdfLong, normalizedDistance, normalizedPallets);
      if (computed) {
        candidates.push({ zone: 'non-idf-zl', computed });
      }
    }

    if (candidates.length) {
      let best = candidates[0];
      let bestDelta = Math.abs(normalizedDistance - best.computed.referenceKm);

      for (let i = 1; i < candidates.length; i += 1) {
        const delta = Math.abs(normalizedDistance - candidates[i].computed.referenceKm);
        if (delta < bestDelta) {
          best = candidates[i];
          bestDelta = delta;
        }
      }

      result.gridPrice = best.computed.gridPrice;
      result.source = best.zone;
      result.zone = best.zone;
      result.referenceDistanceKm = best.computed.referenceKm;
      result.baseCost = best.computed.baseCost;
      result.coefficient = best.computed.coefficient;
    }
  }

  return result;
};

const resolveCoefficientForEntry = (entry, palletCount) => {
  const counts = Array.from(entry.coefficients.keys()).sort((a, b) => a - b);
  if (!counts.length) {
    return null;
  }

  if (entry.coefficients.has(palletCount)) {
    return entry.coefficients.get(palletCount);
  }

  for (const count of counts) {
    if (palletCount <= count) {
      return entry.coefficients.get(count);
    }
  }

  return entry.coefficients.get(counts[counts.length - 1]);
};

const computeNonIdfRowValues = (entry, paletteCounts) =>
  paletteCounts.map((count) => {
    const coefficient = resolveCoefficientForEntry(entry, count);
    if (!Number.isFinite(Number(coefficient))) {
      return null;
    }

    const value = entry.baseCost + entry.km * Number(coefficient) * count;
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  });

const getTariffGridForDeparture = (departureDepartment) => {
  const data = loadTariffData();
  const normalized = normalizeDepartmentCode(departureDepartment);
  if (!normalized) {
    return null;
  }

  if (data.idfDepartures.has(normalized)) {
    const paletteCounts = Array.from(
      data.mplByCount.keys()
    ).sort((a, b) => a - b);

    const rows = Array.from(data.idfMatrix.entries())
      .map(([arrival, priceMap]) => ({
        key: arrival,
        label: arrival,
        values: paletteCounts.map((count) => {
          const value = priceMap.get(count) ?? null;
          return Number.isFinite(Number(value)) ? Number(value) : null;
        }),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      type: 'idf',
      paletteCounts,
      rows,
      meta: {
        departureDepartment: normalized,
        source: 'idf',
      },
    };
  }

  const shortEntries = data.nonIdfShort || [];
  const longEntries = data.nonIdfLong || [];
  if (!shortEntries.length && !longEntries.length) {
    return null;
  }

  const paletteCounts = Array.from(
    new Set(
      [...shortEntries, ...longEntries].flatMap((entry) =>
        Array.from(entry.coefficients.keys())
      )
    )
  )
    .filter((count) => Number.isFinite(Number(count)))
    .sort((a, b) => a - b);

  if (!paletteCounts.length) {
    return null;
  }

  const formatRows = (entries, zone) =>
    entries.map((entry) => ({
      key: `${zone}-${entry.km}`,
      label: `${entry.km} km`,
      zone,
      values: computeNonIdfRowValues(entry, paletteCounts),
    }));

  const rows = [
    ...formatRows(shortEntries, 'short'),
    ...formatRows(longEntries, 'long'),
  ];

  if (!rows.length) {
    return null;
  }

  return {
    type: 'non-idf',
    paletteCounts,
    rows,
    meta: {
      departureDepartment: normalized,
      source: 'non-idf',
      zones: {
        short: 'Hors IDF - Zone courte',
        long: 'Hors IDF - Zone longue',
      },
    },
  };
};

module.exports = {
  getTariffForShipment,
  loadTariffData,
  MAX_PALLETS,
  getTariffGridForDeparture,
};
