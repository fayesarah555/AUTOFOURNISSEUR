const fs = require('fs');
const path = require('path');

const PUBLIC_ROOT = path.join(__dirname, '..', 'public');
const TARIFF_DIR = path.join(PUBLIC_ROOT, 'tariffs');

const FILE_FORMATS = {
  pdf: new Set(['.pdf']),
  excel: new Set(['.xls', '.xlsx']),
};

const ensureTariffDirectory = () => {
  try {
    fs.mkdirSync(TARIFF_DIR, { recursive: true });
  } catch (error) {
    // Ignore directory creation errors (likely due to concurrent creation)
  }
};

const isHttpUrl = (value) => /^https?:\/\//i.test(value);

const sanitizeFilename = (value) => {
  if (!value) {
    return '';
  }
  return path.basename(value);
};

const detectTariffFormat = (filename) => {
  if (!filename) {
    return null;
  }
  const extension = path.extname(filename).toLowerCase();

  for (const [format, extensions] of Object.entries(FILE_FORMATS)) {
    if (extensions.has(extension)) {
      return format;
    }
  }

  return null;
};

const findTariffDocument = (providerId, explicitPath) => {
  const trimmed = typeof explicitPath === 'string' ? explicitPath.trim() : '';

  if (trimmed && isHttpUrl(trimmed)) {
    return {
      hasDocument: true,
      type: 'remote',
      publicUrl: trimmed,
      localPath: null,
      filename: null,
    };
  }

  ensureTariffDirectory();

  const candidates = [];
  const sanitized = sanitizeFilename(trimmed);

  if (sanitized) {
    candidates.push(path.join(TARIFF_DIR, sanitized));
    candidates.push(path.join(PUBLIC_ROOT, sanitized));
  }

  if (providerId) {
    const baseFilename = `${providerId}.pdf`;
    candidates.push(path.join(TARIFF_DIR, baseFilename));
    candidates.push(path.join(PUBLIC_ROOT, baseFilename));
  }

  const tested = new Set();
  for (const candidate of candidates) {
    if (!candidate || tested.has(candidate)) {
      continue;
    }
    tested.add(candidate);
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) {
        const format = detectTariffFormat(candidate);
        return {
          hasDocument: true,
          type: 'local',
          format,
          publicUrl: `/api/providers/${providerId}/tariff-document`,
          localPath: candidate,
          filename: path.basename(candidate),
        };
      }
    } catch (error) {
      // Ignore missing files
    }
  }

  return {
    hasDocument: false,
    type: null,
    publicUrl: null,
    localPath: null,
    filename: null,
  };
};

module.exports = {
  PUBLIC_ROOT,
  TARIFF_DIR,
  detectTariffFormat,
  ensureTariffDirectory,
  findTariffDocument,
};
