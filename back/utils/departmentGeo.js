const departments = require('../data/departments_centers.json');

const EARTH_RADIUS_KM = 6371;

const coordinatesMap = departments.reduce((acc, entry) => {
  const code = String(entry.code).trim();
  if (!code) {
    return acc;
  }
  acc.set(code.toUpperCase(), {
    lat: Number(entry.lat),
    lon: Number(entry.lon),
  });
  return acc;
}, new Map());

const normalizeDepartmentCode = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const code = String(value).trim().toUpperCase();
  if (!code) {
    return null;
  }

  if (code.length === 1) {
    return code.padStart(2, '0');
  }

  if (/^97\d$/.test(code)) {
    return code.padStart(3, '0');
  }

  if (/^\d{2}$/.test(code) || /^\d{3}$/.test(code) || ['2A', '2B'].includes(code)) {
    return code;
  }

  return code;
};

const degreesToRadians = (deg) => (deg * Math.PI) / 180;

const computeHaversineDistanceKm = (from, to) => {
  const dLat = degreesToRadians(to.lat - from.lat);
  const dLon = degreesToRadians(to.lon - from.lon);

  const fromLatRad = degreesToRadians(from.lat);
  const toLatRad = degreesToRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(fromLatRad) * Math.cos(toLatRad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const getDepartmentCoordinates = (code) => {
  const normalized = normalizeDepartmentCode(code);
  if (!normalized) {
    return null;
  }
  return coordinatesMap.get(normalized) || null;
};

const computeDepartmentDistanceKm = (fromCode, toCode) => {
  const from = getDepartmentCoordinates(fromCode);
  const to = getDepartmentCoordinates(toCode);

  if (!from || !to) {
    return null;
  }

  return computeHaversineDistanceKm(from, to);
};

module.exports = {
  getDepartmentCoordinates,
  computeDepartmentDistanceKm,
  normalizeDepartmentCode,
};
