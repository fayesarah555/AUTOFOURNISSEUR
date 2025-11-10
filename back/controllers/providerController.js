const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');
const {
  listProviders: repositoryListProviders,
  findProviderById,
  addProvider,
  updateProvider,
  deleteProvider,
  getTariffDocumentDefinition,
  updateProviderTariffDocumentPath,
} = require('../repositories/providerRepository');
const {
  computeDepartmentDistanceKm,
  normalizeDepartmentCode,
} = require('../utils/departmentGeo');
const {
  getTariffForShipment,
  MAX_PALLETS,
  getTariffGridForDeparture,
  getAvailablePaletteMeters,
  getPalletCountForMeters,
} = require('../services/tariffMatrixService');
const {
  findTariffDocument,
  ensureTariffDirectory,
  TARIFF_DIR,
} = require('../utils/tariffDocuments');
const fsPromises = fs.promises;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

const IDF_DEPARTMENT_CODES = new Set(['75', '77', '78', '91', '92', '93', '94', '95']);

const SUPPLEMENTARY_OPTIONS = [
  { value: 'hayon', label: 'Hayon' },
  { value: 'prise-rdv', label: 'Prise de RDV' },
  { value: 'matiere-adr', label: 'Matiere ADR' },
  { value: 'chgt-au-pont', label: 'Chgt au Pont' },
];

const EXCEL_TEMPLATE_COLUMNS = {
  name: 'Nom du transporteur',
  description: 'Description',
  address: 'Adresse',
  postalCode: 'Code postal',
  city: 'Ville',
  department: 'Département',
  contact: 'Contact',
  phone: 'Téléphone',
  email: 'Email',
  unreachable: 'Ne répond pas (oui/non)',
  deliveryDepartments: 'Départements livraison (codes séparés par des virgules)',
  pickupDepartments: 'Départements chargement (codes séparés par des virgules)',
  profileNotes: 'Notes internes',
  profileFeatures: 'Équipements (séparés par des virgules)',
  serviceCapabilities: 'Services (séparés par des virgules)',
  modes: 'Modes (séparés par des virgules)',
  coverage: 'Couverture (domestic/global)',
  contractFlexibility: 'Contrat (spot/monthly/quarterly)',
};

const EXCEL_TEMPLATE_HEADER_ORDER = [
  EXCEL_TEMPLATE_COLUMNS.name,
  EXCEL_TEMPLATE_COLUMNS.description,
  EXCEL_TEMPLATE_COLUMNS.address,
  EXCEL_TEMPLATE_COLUMNS.postalCode,
  EXCEL_TEMPLATE_COLUMNS.city,
  EXCEL_TEMPLATE_COLUMNS.department,
  EXCEL_TEMPLATE_COLUMNS.contact,
  EXCEL_TEMPLATE_COLUMNS.phone,
  EXCEL_TEMPLATE_COLUMNS.email,
  EXCEL_TEMPLATE_COLUMNS.unreachable,
  EXCEL_TEMPLATE_COLUMNS.deliveryDepartments,
  EXCEL_TEMPLATE_COLUMNS.pickupDepartments,
  EXCEL_TEMPLATE_COLUMNS.profileNotes,
  EXCEL_TEMPLATE_COLUMNS.profileFeatures,
  EXCEL_TEMPLATE_COLUMNS.serviceCapabilities,
  EXCEL_TEMPLATE_COLUMNS.modes,
  EXCEL_TEMPLATE_COLUMNS.coverage,
  EXCEL_TEMPLATE_COLUMNS.contractFlexibility,
];

const EXCEL_TEMPLATE_SAMPLE_ROW = {
  [EXCEL_TEMPLATE_COLUMNS.name]: '#EXEMPLE - À REMPLACER',
  [EXCEL_TEMPLATE_COLUMNS.description]:
    'Transporteur régional spécialisé messagerie palette.',
  [EXCEL_TEMPLATE_COLUMNS.address]: '12 rue des Forges',
  [EXCEL_TEMPLATE_COLUMNS.postalCode]: '42000',
  [EXCEL_TEMPLATE_COLUMNS.city]: 'Saint-Étienne',
  [EXCEL_TEMPLATE_COLUMNS.department]: '42',
  [EXCEL_TEMPLATE_COLUMNS.contact]: 'Jean Dupont',
  [EXCEL_TEMPLATE_COLUMNS.phone]: '0601020304',
  [EXCEL_TEMPLATE_COLUMNS.email]: 'contact@example.com',
  [EXCEL_TEMPLATE_COLUMNS.unreachable]: 'non',
  [EXCEL_TEMPLATE_COLUMNS.deliveryDepartments]: '01, 03, 38, 69',
  [EXCEL_TEMPLATE_COLUMNS.pickupDepartments]: '42, 43, 63',
  [EXCEL_TEMPLATE_COLUMNS.profileNotes]: 'Disponible 6j/7 - horaires étendus',
  [EXCEL_TEMPLATE_COLUMNS.profileFeatures]: 'semi-tautliner, porteur-hayon',
  [EXCEL_TEMPLATE_COLUMNS.serviceCapabilities]: 'express, adr',
  [EXCEL_TEMPLATE_COLUMNS.modes]: 'road',
  [EXCEL_TEMPLATE_COLUMNS.coverage]: 'domestic',
  [EXCEL_TEMPLATE_COLUMNS.contractFlexibility]: 'spot',
};

const EXCEL_BOOLEAN_TRUE = new Set(['oui', 'yes', 'true', '1', 'x']);

const matchesSupplementaryOption = (option, provider, featureSet) => {
  const features =
    featureSet ||
    new Set(
      [...(provider.profile?.features || []), ...(provider.serviceCapabilities || [])]
        .map((value) => value && value.toLowerCase())
        .filter(Boolean)
    );

  const notes = `${provider.notes || ''} ${provider.profile?.notes || ''}`.toLowerCase();

  switch (option) {
    case 'hayon':
      return (
        features.has('porteur-hayon') ||
        features.has('semi-hayon') ||
        features.has('hayon')
      );
    case 'prise-rdv':
      return (
        features.has('prise-rdv') ||
        features.has('prise-de-rdv') ||
        notes.includes('prise de rdv') ||
        notes.includes('prise rdv') ||
        notes.includes('rdv')
      );
    case 'matiere-adr':
      return features.has('adr');
    case 'chgt-au-pont':
      return (
        features.has('chgt-au-pont') ||
        features.has('chgt-pont') ||
        features.has('chg-pont') ||
        (notes.includes('pont') && (notes.includes('chgt') || notes.includes('changement')))
      );
    default:
      return false;
  }
};

const sanitizeNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const sanitizePositiveInteger = (value) => {
  const numeric = sanitizeNumber(value);
  if (numeric === undefined) {
    return undefined;
  }
  const int = Math.round(numeric);
  if (int < 1) {
    return undefined;
  }
  return Math.min(int, MAX_PALLETS);
};

const parseCsv = (value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === 'string'
          ? item.split(',')
          : [String(item ?? '')]
      )
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const parseListInput = (value) => parseCsv(value);

const splitMultiValueInput = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);
  }

  return value
    .toString()
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseExcelBoolean = (value) => {
  if (value === undefined || value === null) {
    return false;
  }
  const normalized = value.toString().trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return EXCEL_BOOLEAN_TRUE.has(normalized);
};

const parseDepartmentList = (value) =>
  splitMultiValueInput(value).map((item) => normalizeDepartmentFilter(item)).filter(Boolean);

const cleanupUploadedFile = async (file) => {
  if (!file?.path) {
    return;
  }

  try {
    await fsPromises.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Failed to cleanup uploaded file', error);
    }
  }
};

const ALLOWED_TARIFF_FILE_TYPES = {
  pdf: {
    extensions: new Set(['.pdf']),
    mimes: new Set(['application/pdf']),
    defaultExtension: '.pdf',
  },
  excel: {
    extensions: new Set(['.xls', '.xlsx']),
    mimes: new Set([
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]),
    defaultExtension: '.xlsx',
  },
};

const resolveTariffFileInfo = (file) => {
  if (!file) {
    throw new Error('Aucun fichier reçu.');
  }

  const originalName = (file.originalname || '').toLowerCase();
  const extension = (path.extname(originalName) || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  for (const [format, spec] of Object.entries(ALLOWED_TARIFF_FILE_TYPES)) {
    if (spec.extensions.has(extension) || spec.mimes.has(mime)) {
      const resolvedExtension = extension || spec.defaultExtension;
      return { format, extension: resolvedExtension };
    }
  }

  throw new Error('Le fichier doit être un PDF ou un Excel (.xls / .xlsx).');
};

const persistTariffDocumentForProvider = async (
  externalRef,
  tempFile,
  { extension, explicitPath = '', buffer = null } = {}
) => {
  if (!externalRef) {
    return null;
  }

  ensureTariffDirectory();

  const sanitizedExtension = extension && extension.startsWith('.') ? extension : '.pdf';
  const targetFilename = path.basename(`${externalRef}${sanitizedExtension}`);
  const targetPath = path.join(TARIFF_DIR, targetFilename);

  await fsPromises.unlink(targetPath).catch((error) => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  });

  const previousDocument = findTariffDocument(externalRef, explicitPath);
  if (previousDocument.localPath && previousDocument.localPath !== targetPath) {
    await fsPromises.unlink(previousDocument.localPath).catch((error) => {
      if (error.code !== 'ENOENT') {
        console.warn('Failed to remove previous tariff document', error);
      }
    });
  }

  if (buffer) {
    await fsPromises.writeFile(targetPath, buffer);
  } else if (tempFile?.path) {
    await fsPromises.rename(tempFile.path, targetPath);
  } else {
    throw new Error('Aucun document à enregistrer.');
  }

  return updateProviderTariffDocumentPath(externalRef, targetFilename);
};

const buildProviderPayloadFromExcelRow = (row) => {
  const getString = (key) => {
    const value = row[key];
    return value === undefined || value === null ? '' : value.toString().trim();
  };

  const features = splitMultiValueInput(row[EXCEL_TEMPLATE_COLUMNS.profileFeatures]).map((value) =>
    value.toLowerCase()
  );

  const serviceCapabilities = splitMultiValueInput(
    row[EXCEL_TEMPLATE_COLUMNS.serviceCapabilities]
  ).map((value) => value.toLowerCase());

  return {
    name: getString(EXCEL_TEMPLATE_COLUMNS.name),
    description: getString(EXCEL_TEMPLATE_COLUMNS.description),
    coverage: getString(EXCEL_TEMPLATE_COLUMNS.coverage) || 'domestic',
    contractFlexibility: getString(EXCEL_TEMPLATE_COLUMNS.contractFlexibility) || 'spot',
    modes: splitMultiValueInput(row[EXCEL_TEMPLATE_COLUMNS.modes]).map((value) =>
      value.toLowerCase()
    ),
    serviceCapabilities,
    profile: {
      address: getString(EXCEL_TEMPLATE_COLUMNS.address),
      postalCode: getString(EXCEL_TEMPLATE_COLUMNS.postalCode),
      city: getString(EXCEL_TEMPLATE_COLUMNS.city),
      department: getString(EXCEL_TEMPLATE_COLUMNS.department),
      contact: getString(EXCEL_TEMPLATE_COLUMNS.contact),
      phone: getString(EXCEL_TEMPLATE_COLUMNS.phone),
      email: getString(EXCEL_TEMPLATE_COLUMNS.email),
      unreachable: parseExcelBoolean(row[EXCEL_TEMPLATE_COLUMNS.unreachable]),
      features,
      deliveryDepartments: parseDepartmentList(row[EXCEL_TEMPLATE_COLUMNS.deliveryDepartments]),
      pickupDepartments: parseDepartmentList(row[EXCEL_TEMPLATE_COLUMNS.pickupDepartments]),
      notes: getString(EXCEL_TEMPLATE_COLUMNS.profileNotes),
    },
  };
};

const extractSingleProviderFromExcel = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const [firstSheetName] = workbook.SheetNames;
  if (!firstSheetName) {
    return null;
  }

  // 1) Tentative avec le modèle "simple" (une ligne, en-têtes EXCEL_TEMPLATE_COLUMNS)
  {
    const sheet = workbook.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    const validRows = rows.filter((row) => {
      const name = (row[EXCEL_TEMPLATE_COLUMNS.name] || '').toString().trim();
      if (!name) {
        return false;
      }
      return !name.startsWith('#');
    });

    if (validRows.length === 1) {
      return buildProviderPayloadFromExcelRow(validRows[0]);
    }
    if (validRows.length > 1) {
      throw new Error('Le fichier modèle (simple) doit contenir un seul transporteur par import.');
    }
  }

  // 2) Fallback: essayer le modèle "dataset" (type Liste Global transporteurs.xlsx)
  try {
    // Utilise le parseur dataset existant pour construire des objets fournisseurs
    // et ne garde que le premier si présent.
    const providersModule = require('../data/providers');
    if (typeof providersModule.loadFromExcel === 'function') {
      const list = providersModule.loadFromExcel(filePath) || [];
      if (Array.isArray(list) && list.length === 1) {
        return list[0];
      }
      if (Array.isArray(list) && list.length > 1) {
        throw new Error(
          'Le fichier dataset contient plusieurs lignes. Utilisez l\'import Excel (dataset) pour importer plusieurs fournisseurs en une fois.'
        );
      }
    }
  } catch (err) {
    // ignore and fall through to null
  }

  // Rien trouvé
  return null;
};

// Retourne une liste de fournisseurs à partir d'un fichier Excel.
// Accepte le modèle "simple" (en-têtes EXCEL_TEMPLATE_COLUMNS) avec 1..N lignes,
// ou le modèle "dataset" (type Liste Global transporteurs.xlsx).
const extractFlexibleProvidersFromExcel = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const [firstSheetName] = workbook.SheetNames;
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];

  // 1) Essayer le modèle simple (colonnes EXCEL_TEMPLATE_COLUMNS)
  try {
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    const validRows = rows.filter((row) => {
      const name = (row[EXCEL_TEMPLATE_COLUMNS.name] || '').toString().trim();
      if (!name) return false;
      return !name.startsWith('#');
    });
    if (validRows.length > 0) {
      return validRows.map((row) => buildProviderPayloadFromExcelRow(row));
    }
  } catch (_) {
    // fallthrough
  }

  // 2) Fallback: parseur dataset
  try {
    const providersModule = require('../data/providers');
    if (typeof providersModule.loadFromExcel === 'function') {
      const list = providersModule.loadFromExcel(filePath) || [];
      if (Array.isArray(list)) {
        return list;
      }
    }
  } catch (_) {
    // ignore
  }

  return [];
};

const buildProviderTemplateBuffer = () => {
  const worksheet = xlsx.utils.aoa_to_sheet([EXCEL_TEMPLATE_HEADER_ORDER]);
  const sampleRow = EXCEL_TEMPLATE_HEADER_ORDER.map(
    (header) => EXCEL_TEMPLATE_SAMPLE_ROW[header] || ''
  );
  xlsx.utils.sheet_add_aoa(worksheet, [sampleRow], { origin: 'A2' });

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Transporteur');
  return xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
};

const convertExcelFileToPdfBuffer = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const [firstSheet] = workbook.SheetNames;
  if (!firstSheet) {
    throw new Error('Le fichier Excel est vide.');
  }

  const sheet = workbook.Sheets[firstSheet];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  if (!rows.length) {
    throw new Error('Le fichier Excel ne contient aucune donnée.');
  }

  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(14).text('Grille tarifaire importée', { align: 'left' });
    doc.moveDown();
    doc.fontSize(10);

    rows.forEach((row) => {
      const line = row
        .map((cell) => (cell === undefined || cell === null ? '' : String(cell)))
        .join(' | ');
      doc.text(line);
      doc.moveDown(0.15);
    });

    doc.end();
  });
};

const computeScore = (provider) => {
  const ratingScore = provider.customerSatisfaction * 20; // /5 *100
  const onTimeScore = provider.onTimeRate * 100;
  const leadTimeScore = Math.max(0, 100 - provider.leadTimeDays * 4); // penalise delays
  const sustainabilityScore = Math.max(0, 100 - provider.co2GramsPerTonneKm);

  return (
    ratingScore * 0.4 +
    onTimeScore * 0.25 +
    leadTimeScore * 0.2 +
    sustainabilityScore * 0.15
  );
};

const normalizeDepartmentFilter = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  const trimmed = value.toString().trim();
  if (!trimmed) {
    return '';
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isFinite(parsed)) {
    return parsed.toString().padStart(2, '0');
  }

  return trimmed.toUpperCase();
};

const enrichProvider = (provider, { distanceKm, weightKg } = {}) => {
  const distance = sanitizeNumber(distanceKm);
  const weight = sanitizeNumber(weightKg);
  const estimatedCost =
    typeof distance === 'number'
      ? provider.baseHandlingFee + provider.pricePerKm * Math.max(distance, 0)
      : null;

  const meetsWeight =
    typeof weight === 'number' ? weight >= provider.minShipmentKg : true;

  return {
    ...provider,
    score: computeScore(provider),
    estimatedCost,
    meetsWeight,
  };
};

const applyTariffPricing = (
  provider,
  { departureDepartment, arrivalDepartment, palletCount, distanceKm } = {}
) => {
  const fallbackArrival =
    arrivalDepartment ||
    provider.profile?.deliveryDepartments?.[0] ||
    provider.profile?.department ||
    null;

  const fallbackDeparture =
    departureDepartment ||
    provider.profile?.department ||
    provider.profile?.pickupDepartments?.[0] ||
    null;

  const tariff = getTariffForShipment({
    departureDepartment: fallbackDeparture,
    arrivalDepartment: fallbackArrival,
    palletCount,
    distanceKm,
  });

  if (!tariff) {
    return provider;
  }

  const next = { ...provider };
  const hasGridPrice = Number.isFinite(tariff.gridPrice);
  const hasTariffPricePerKm = Number.isFinite(tariff.pricePerKm);

  const pricing = {
    gridPrice: hasGridPrice ? tariff.gridPrice : null,
    pricePerKm: hasTariffPricePerKm ? tariff.pricePerKm : provider.pricePerKm ?? null,
    source: tariff.source ?? null,
    zone: tariff.zone ?? null,
    palletCount: tariff.palletCount ?? null,
    palletMpl: tariff.palletMpl ?? null,
    referenceDistanceKm: tariff.referenceDistanceKm ?? null,
    baseCost: tariff.baseCost ?? null,
    coefficient: tariff.coefficient ?? null,
    departmentName: tariff.departmentName ?? null,
    departureSurcharge: tariff.departureSurcharge ?? null,
    deliverySurcharge: tariff.deliverySurcharge ?? null,
    arrivalDepartment: tariff.arrivalDepartment ?? null,
    departureDepartment: tariff.departureDepartment ?? null,
    distanceKm: tariff.distanceKm ?? distanceKm ?? null,
  };

  if (hasGridPrice) {
    next.estimatedCost = tariff.gridPrice;
  }

  if (hasTariffPricePerKm) {
    next.pricePerKm = tariff.pricePerKm;
  }

  next.pricing = pricing;
  return next;
};

const normalizeDepartmentList = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const normalized = values
    .map((value) => normalizeDepartmentFilter(value))
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

const computeRoutePriority = (provider, { departureDepartment, arrivalDepartment }) => {
  if (!departureDepartment && !arrivalDepartment) {
    return 0;
  }

  const profile = provider?.profile || {};
  const pricing = provider?.pricing || {};

  const profileDepartment = normalizeDepartmentFilter(profile.department);
  const pickupDepartments = normalizeDepartmentList(profile.pickupDepartments);
  const deliveryDepartments = normalizeDepartmentList(profile.deliveryDepartments);

  const pricingDeparture = normalizeDepartmentFilter(pricing.departureDepartment);
  const pricingArrival = normalizeDepartmentFilter(pricing.arrivalDepartment);

  let priority = 0;

  if (departureDepartment) {
    if (pricingDeparture === departureDepartment) {
      priority += 8;
    } else if (profileDepartment === departureDepartment) {
      priority += 6;
    } else if (pickupDepartments.includes(departureDepartment)) {
      priority += 4;
    } else if (deliveryDepartments.includes(departureDepartment)) {
      priority += 2;
    }
  }

  if (arrivalDepartment) {
    if (pricingArrival === arrivalDepartment) {
      priority += 4;
    } else if (deliveryDepartments.includes(arrivalDepartment)) {
      priority += 3;
    } else if (pickupDepartments.includes(arrivalDepartment)) {
      priority += 1;
    }
  }

  return priority;
};

const applyFilters = (items, filters) =>
  items.filter((item) => {
    if (filters.query) {
      const profile = item.profile || {};
      const candidate = [
        item.name,
        item.description,
        item.notes,
        profile.city,
        profile.department,
        profile.address,
        profile.contact,
        (profile.deliveryDepartments || []).join(' '),
        (profile.pickupDepartments || []).join(' '),
        (profile.features || []).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!candidate.includes(filters.query)) {
        return false;
      }
    }

    const combinedFeatureSet = new Set(
      [...(item.profile?.features || []), ...(item.serviceCapabilities || [])]
        .map((value) => (typeof value === 'string' ? value.toLowerCase() : ''))
        .filter(Boolean)
    );

    const shouldLogIdfChecks =
      filters.requiresIdfTariff ||
      (filters.arrivalDepartment && IDF_DEPARTMENT_CODES.has(filters.arrivalDepartment));

    const logIdfDecision = (reason, extra = {}) => {
      if (!shouldLogIdfChecks) {
        return;
      }
      console.debug('[providers][filter][idf]', {
        reason,
        providerId: item.id || null,
        providerName: item.name || null,
        providerDepartment: normalizeDepartmentFilter(item.profile?.department) || null,
        pickupDepartments: normalizeDepartmentList(item.profile?.pickupDepartments || []),
        deliveryDepartments: normalizeDepartmentList(item.profile?.deliveryDepartments || []),
        pricingSource: item.pricing?.source || null,
        departureDepartment: filters.departureDepartment || null,
        arrivalDepartment: filters.arrivalDepartment || null,
        ...extra,
      });
    };



    if (filters.requireWeightMatch && !item.meetsWeight) {
      logIdfDecision('rejected-weight-mismatch');
      return false;
    }

    if (filters.features.length > 0) {
      const hasFeatures = filters.features.every((feature) => combinedFeatureSet.has(feature));
      if (!hasFeatures) {
        logIdfDecision('rejected-missing-feature', { requiredFeatures: filters.features });
        return false;
      }
    }

    if (filters.supplementaryOptions.length > 0) {
      const matchesAllSupplementary = filters.supplementaryOptions.every((option) =>
        matchesSupplementaryOption(option, item, combinedFeatureSet)
      );
      if (!matchesAllSupplementary) {
        logIdfDecision('rejected-missing-supplementary-option', {
          requiredSupplementaryOptions: filters.supplementaryOptions,
        });
        return false;
      }
    }

    if (filters.departureDepartment) {
      const departureTargets = new Set(
        [
          normalizeDepartmentFilter(item.profile?.department),
          ...normalizeDepartmentList(item.profile?.pickupDepartments || []),
        ].filter(Boolean)
      );

      if (!departureTargets.has(filters.departureDepartment)) {
        logIdfDecision('rejected-departure-mismatch', { departureTargets: Array.from(departureTargets) });
        return false;
      }
    }

    if (filters.arrivalDepartment) {
      const arrivalTargets = new Set(
        normalizeDepartmentList(item.profile?.deliveryDepartments || [])
      );

      if (!arrivalTargets.has(filters.arrivalDepartment)) {
        logIdfDecision('rejected-arrival-mismatch', { arrivalTargets: Array.from(arrivalTargets) });
        return false;
      }
    }

    const requiresIdfTariff =
      (filters.departureDepartment && IDF_DEPARTMENT_CODES.has(filters.departureDepartment)) ||
      (filters.arrivalDepartment && IDF_DEPARTMENT_CODES.has(filters.arrivalDepartment));

    if (requiresIdfTariff) {
      const pricingSource = (item.pricing?.source || '').toLowerCase();
      if (pricingSource !== 'idf') {
        logIdfDecision('rejected-non-idf-pricing', { pricingSource });
        return false;
      }
    }

    if (filters.arrivalDepartment && IDF_DEPARTMENT_CODES.has(filters.arrivalDepartment)) {
      const providerDepartment = normalizeDepartmentFilter(item.profile?.department);
      if (!providerDepartment || !IDF_DEPARTMENT_CODES.has(providerDepartment)) {
        logIdfDecision('rejected-provider-not-idf', { providerDepartment });
        return false;
      }
    }

    if (typeof filters.palletMeters === 'number') {
      const providerMeters = sanitizeNumber(item.pricing?.palletMpl);
      if (typeof providerMeters !== 'number' || providerMeters < filters.palletMeters) {
        logIdfDecision('rejected-pallet-meters', { providerMeters, requiredMeters: filters.palletMeters });
        return false;
      }
    }

    logIdfDecision('accepted');
    return true;
  });

const sortProviders = (items, sortBy, sortOrder) => {
  const orderMultiplier = sortOrder === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const aHasDoc = a && a.hasTariffDocument ? 1 : 0;
    const bHasDoc = b && b.hasTariffDocument ? 1 : 0;
    if (aHasDoc !== bHasDoc) {
      return bHasDoc - aHasDoc; // Prioritize providers with a tariff document
    }
    const aPriority = Number.isFinite(a.routePriority) ? a.routePriority : 0;
    const bPriority = Number.isFinite(b.routePriority) ? b.routePriority : 0;

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    const fallbackValue =
      orderMultiplier === -1 ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    const resolveNumber = (value) =>
      Number.isFinite(value) ? value : fallbackValue;

    const getComparableValue = (provider) => {
      switch (sortBy) {
        case 'estimatedCost': {
          const value = Number(provider.estimatedCost);
          return resolveNumber(value);
        }
        case 'pricePerKm': {
          const value = Number(provider.pricePerKm ?? provider.pricing?.pricePerKm);
          return resolveNumber(value);
        }
        case 'score': {
          const value = Number(provider.score);
          return resolveNumber(value);
        }
        default: {
          const value = provider[sortBy];
          if (typeof value === 'number') {
            return resolveNumber(value);
          }
          if (typeof value === 'string') {
            return resolveNumber(Number(value));
          }
          return fallbackValue;
        }
      }
    };

    const aValue = getComparableValue(a);
    const bValue = getComparableValue(b);

    if (aValue === bValue) {
      return (a.name || '').localeCompare(b.name || '');
    }

    return aValue > bValue ? orderMultiplier : -orderMultiplier;
  });
};

const listProviders = async (req, res, next) => {
  try {
    const {
      q,
      requireWeightMatch,
      sortBy = 'score',
      sortOrder = 'desc',
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      weightKg,
      distanceKm,
      departureDepartment,
      arrivalDepartment,
      palletMeters,
    } = req.query;

    const normalizedDepartureDepartment = normalizeDepartmentFilter(departureDepartment);
    const normalizedArrivalDepartment = normalizeDepartmentFilter(arrivalDepartment);
    const requestedPalletMeters = sanitizeNumber(palletMeters);
    const requestedPalletCount = sanitizePositiveInteger(req.query.palletCount);

    let effectivePalletCount =
      typeof requestedPalletCount === 'number' ? requestedPalletCount : undefined;

    if (
      (effectivePalletCount === undefined || effectivePalletCount === null) &&
      typeof requestedPalletMeters === 'number'
    ) {
      const derivedCount = getPalletCountForMeters(requestedPalletMeters);
      if (Number.isFinite(derivedCount)) {
        effectivePalletCount = derivedCount;
      }
    }
    const filters = {
      query: typeof q === 'string' ? q.trim().toLowerCase() : '',
      features: parseCsv(req.query.features).map((value) => value.toLowerCase()),
      supplementaryOptions: Array.from(
        new Set(
          parseCsv(req.query.supplementaryOptions)
            .map((value) => value.toLowerCase())
            .filter((value) => SUPPLEMENTARY_OPTIONS.some((option) => option.value === value))
        )
      ),
      palletCount:
        typeof effectivePalletCount === 'number' && Number.isFinite(effectivePalletCount)
          ? effectivePalletCount
          : undefined,
      palletMeters:
        typeof requestedPalletMeters === 'number' && Number.isFinite(requestedPalletMeters)
          ? Number(requestedPalletMeters.toFixed(3))
          : null,
      requireWeightMatch: requireWeightMatch === 'true',
      departureDepartment: normalizedDepartureDepartment,
      arrivalDepartment: normalizedArrivalDepartment,
    };

    filters.requiresIdfTariff =
      (filters.departureDepartment && IDF_DEPARTMENT_CODES.has(filters.departureDepartment)) ||
      (filters.arrivalDepartment && IDF_DEPARTMENT_CODES.has(filters.arrivalDepartment));

    console.info('[providers] listProviders query', {
      query: filters.query,
      departure: filters.departureDepartment,
      arrival: filters.arrivalDepartment,
      requiresIdfTariff: filters.requiresIdfTariff,
      palletCount: filters.palletCount,
      weightKg,
      supplementaryOptions: filters.supplementaryOptions,
      featuresCount: filters.features.length,
    });

    const manualDistanceKm = sanitizeNumber(distanceKm);
    const autoDistanceKm =
      normalizedDepartureDepartment && normalizedArrivalDepartment
        ? computeDepartmentDistanceKm(normalizedDepartureDepartment, normalizedArrivalDepartment)
        : null;

    let effectiveDistanceKm = manualDistanceKm;
    let distanceSource = null;

    if (typeof manualDistanceKm === 'number') {
      distanceSource = 'manual';
    }

    if (typeof effectiveDistanceKm !== 'number' && typeof autoDistanceKm === 'number') {
      effectiveDistanceKm = autoDistanceKm;
      distanceSource = 'departments';
    }

    if (typeof effectiveDistanceKm === 'number') {
      filters.distanceKm = effectiveDistanceKm;
    }

    const parsedPageSize = Number(pageSize);
    const canonicalPageSize = PAGE_SIZE_OPTIONS.includes(parsedPageSize)
      ? parsedPageSize
      : DEFAULT_PAGE_SIZE;
    const currentPage = Math.max(Number(page) || 1, 1);

    const dataset = await repositoryListProviders();
    const enriched = dataset.map((provider) =>
      enrichProvider(provider, { distanceKm: effectiveDistanceKm, weightKg })
    );
    const priced = enriched.map((provider) =>
      applyTariffPricing(provider, {
        departureDepartment: filters.departureDepartment,
        arrivalDepartment: filters.arrivalDepartment,
        palletCount: filters.palletCount,
        distanceKm: effectiveDistanceKm,
      })
    );
    const filtered = applyFilters(priced, filters);
    const prioritized = filtered.map((provider) => ({
      ...provider,
      routePriority: computeRoutePriority(provider, {
        departureDepartment: normalizedDepartureDepartment,
        arrivalDepartment: normalizedArrivalDepartment,
      }),
    }));

    const availableDeliveryDepartments = Array.from(
      new Set(
        dataset
          .flatMap((provider) => provider.profile?.deliveryDepartments || [])
          .map(normalizeDepartmentFilter)
          .filter(Boolean)
      )
    ).sort();
    const availablePickupDepartments = Array.from(
      new Set(
        dataset
          .flatMap((provider) => provider.profile?.pickupDepartments || [])
          .map(normalizeDepartmentFilter)
          .filter(Boolean)
      )
    ).sort();
    const availableFeatures = Array.from(
      new Set(
        dataset.flatMap((provider) => provider.profile?.features || provider.serviceCapabilities || [])
      )
    ).sort();
    const availablePalletMeters = getAvailablePaletteMeters();

    const sortableFields = new Set([
      'score',
      'pricePerKm',
      'estimatedCost',
      'leadTimeDays',
      'customerSatisfaction',
      'onTimeRate',
      'co2GramsPerTonneKm',
      'baseHandlingFee',
    ]);

    const resolvedSortField = sortableFields.has(sortBy) ? sortBy : 'score';
    const resolvedSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const sorted = sortProviders(prioritized, resolvedSortField, resolvedSortOrder);
    const total = sorted.length;
    const totalPages = Math.max(Math.ceil(total / canonicalPageSize), 1);
    const offset = (currentPage - 1) * canonicalPageSize;
    const paginated = sorted.slice(offset, offset + canonicalPageSize);

    const appliedFiltersPayload = {
      ...filters,
      palletCount:
        typeof filters.palletCount === 'number' && Number.isFinite(filters.palletCount)
          ? filters.palletCount
          : null,
      palletMeters:
        typeof filters.palletMeters === 'number' && Number.isFinite(filters.palletMeters)
          ? filters.palletMeters
          : null,
      supplementaryOptions: filters.supplementaryOptions,
    };

    return res.json({
      data: paginated,
      meta: {
        total,
        page: currentPage,
        pageSize: canonicalPageSize,
        totalPages,
        sortBy: resolvedSortField,
        sortOrder: resolvedSortOrder,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        appliedFilters: appliedFiltersPayload,
        estimatedDistanceKm:
          typeof effectiveDistanceKm === 'number'
            ? Math.round(effectiveDistanceKm * 10) / 10
            : null,
        estimatedDistanceSource: distanceSource,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
        availableFilters: {
          deliveryDepartments: availableDeliveryDepartments,
          pickupDepartments: availablePickupDepartments,
          features: availableFeatures,
          palletMeters: availablePalletMeters,
          supplementaryOptions: SUPPLEMENTARY_OPTIONS,
        },
        derivedPalletCount: appliedFiltersPayload.palletCount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getProvidersByIds = async (req, res, next) => {
  try {
    const ids = parseCsv(req.query.ids);
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Paramètre ids requis.' });
    }

    const providers = await Promise.all(ids.map((id) => findProviderById(id)));
    const results = providers
      .filter(Boolean)
      .map((provider) => enrichProvider(provider, req.query));

    if (results.length === 0) {
      return res.status(404).json({ error: 'Aucun transporteur trouvé pour les identifiants demandés.' });
    }

    return res.json({ data: results });
  } catch (error) {
    return next(error);
  }
};

const getProviderById = async (req, res, next) => {
  try {
    const provider = await findProviderById(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Transporteur introuvable.' });
    }

    return res.json({ data: enrichProvider(provider, req.query) });
  } catch (error) {
    return next(error);
  }
};

const normalizeProviderPayload = (input, { partial = false } = {}) => {
  const data = input || {};
  const errors = [];
  const normalized = {};
  const profile = {};

  const getString = (value) => (value === undefined || value === null ? '' : String(value).trim());
  const getArray = (value) => {
    if (value === undefined || value === null) {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => getString(item))
        .filter(Boolean);
    }
    return parseListInput(value);
  };
  const getNumber = (value) => {
    const num = sanitizeNumber(value);
    return num;
  };
  const getBoolean = (value) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (['1', 'true', 'oui', 'yes'].includes(lower)) {
        return true;
      }
      if (['0', 'false', 'non', 'no'].includes(lower)) {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return false;
  };

  const assignString = (field, { required = true, transform } = {}) => {
    if (data[field] === undefined) {
      if (!partial && required) {
        errors.push(`Le champ ${field} est requis.`);
      }
      return;
    }

    const raw = getString(data[field]);
    if (!raw) {
      if (required && !partial) {
        errors.push(`Le champ ${field} est requis.`);
      }
      if (!required || partial) {
        normalized[field] = '';
      }
      return;
    }

    normalized[field] = transform ? transform(raw) : raw;
  };

  const assignArray = (field, { transform, required = false } = {}) => {
    if (data[field] === undefined) {
      if (!partial && required) {
        errors.push(`Le champ ${field} est requis.`);
      }
      return;
    }

    const values = getArray(data[field]);
    if (values.length === 0 && required && !partial) {
      errors.push(`Le champ ${field} doit contenir au moins une valeur.`);
      return;
    }

    normalized[field] = transform ? values.map(transform) : values;
  };

  const assignNumber = (field, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, allowPercent = false } = {}) => {
    if (data[field] === undefined) {
      return;
    }

    const numeric = getNumber(data[field]);
    if (numeric === undefined) {
      errors.push(`Le champ ${field} doit être un nombre.`);
      return;
    }

    let resolved = numeric;

    if (allowPercent && resolved > 1) {
      resolved = resolved / 100;
    }

    if (resolved < min || resolved > max) {
      errors.push(`Le champ ${field} doit être compris entre ${min} et ${max}.`);
      return;
    }

    normalized[field] = resolved;
  };

  if (data.name !== undefined || !partial) {
    assignString('name');
  }

  assignString('description', { required: false });
  assignString('coverage', { required: false, transform: (value) => value.toLowerCase() });
  assignString('contractFlexibility', { required: false, transform: (value) => value.toLowerCase() });
  assignString('notes', { required: false });

  assignArray('regions', { transform: (value) => value.toUpperCase() });
  assignArray('serviceCapabilities', { transform: (value) => value.toLowerCase() });
  assignArray('certifications');

  assignNumber('leadTimeDays', { min: 0 });
  assignNumber('onTimeRate', { min: 0, max: 1, allowPercent: true });
  assignNumber('pricePerKm', { min: 0 });
  assignNumber('baseHandlingFee', { min: 0 });
  assignNumber('minShipmentKg', { min: 0 });
  assignNumber('co2GramsPerTonneKm', { min: 0 });
  assignNumber('customerSatisfaction', { min: 0, max: 5 });

  const profileInput = data.profile || {};
  if (data.profile !== undefined || !partial) {
    const address = getString(profileInput.address);
    const postalCode = getString(profileInput.postalCode);
    const city = getString(profileInput.city);
    const department = normalizeDepartmentFilter(profileInput.department);
    const contact = getString(profileInput.contact);
    const phone = getString(profileInput.phone);
    const email = getString(profileInput.email);

    if (address) profile.address = address;
    if (postalCode) profile.postalCode = postalCode;
    if (city) profile.city = city;
    if (department) profile.department = department;
    if (contact) profile.contact = contact;
    if (phone) profile.phone = phone;
    if (email) profile.email = email;

    if (profileInput.unreachable !== undefined) {
      profile.unreachable = getBoolean(profileInput.unreachable);
    }

    const profileFeatures = getArray(profileInput.features);
    if (profileFeatures.length || (!partial && data.profile !== undefined)) {
      profile.features = profileFeatures;
    }

    const deliveryDepartments = getArray(profileInput.deliveryDepartments).map(normalizeDepartmentFilter).filter(Boolean);
    const pickupDepartments = getArray(profileInput.pickupDepartments).map(normalizeDepartmentFilter).filter(Boolean);

    if (deliveryDepartments.length) {
      profile.deliveryDepartments = deliveryDepartments;
    }
    if (pickupDepartments.length) {
      profile.pickupDepartments = pickupDepartments;
    }

    const profileNotes = getString(profileInput.notes);
    if (profileNotes) {
      profile.notes = profileNotes;
    }
  }

  if (Object.keys(profile).length > 0) {
    normalized.profile = profile;
  }

  if (data.id && typeof data.id === 'string') {
    normalized.id = data.id.trim();
  }

  if (partial && Object.keys(normalized).length === 0) {
    errors.push('Aucun champ valide à mettre à jour.');
  }

  return { errors, value: normalized };
};

const createProvider = async (req, res, next) => {
  try {
    const { errors, value } = normalizeProviderPayload(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    const created = await addProvider(value);
    return res.status(201).json({ data: enrichProvider(created) });
  } catch (error) {
    return next(error);
  }
};

const updateProviderEntry = async (req, res, next) => {
  try {
    const { errors, value } = normalizeProviderPayload(req.body, { partial: true });

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    const updated = await updateProvider(req.params.id, value);

    if (!updated) {
      return res.status(404).json({ error: 'Transporteur introuvable.' });
    }

    return res.json({ data: enrichProvider(updated) });
  } catch (error) {
    return next(error);
  }
};

const deleteProviderEntry = async (req, res, next) => {
  try {
    const deleted = await deleteProvider(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Transporteur introuvable.' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const importSingleProviderWithTariff = async (req, res, next) => {
  const providerFile = req.files?.providerExcel?.[0];
  const tariffFile = req.files?.tariffPdf?.[0];

  if (!providerFile) {
    await cleanupUploadedFile(tariffFile);
    return res.status(400).json({ error: 'Le fichier Excel du fournisseur est requis.' });
  }

  let providerPayloads = [];
  try {
    // Accepter 1..N fournisseurs depuis un seul fichier
    const list = extractFlexibleProvidersFromExcel(providerFile.path);
    providerPayloads = Array.isArray(list) ? list : [];
  } catch (error) {
    await cleanupUploadedFile(providerFile);
    await cleanupUploadedFile(tariffFile);
    return res.status(400).json({ error: error.message || 'Fichier Excel invalide.' });
  } finally {
    await cleanupUploadedFile(providerFile);
  }

  if (!providerPayloads || providerPayloads.length === 0) {
    await cleanupUploadedFile(tariffFile);
    return res.status(400).json({
      error: 'Aucune donnée transporteur trouvée dans le modèle. Remplissez au moins une ligne.',
    });
  }
  // Si plusieurs fournisseurs dans le fichier et un document tarifaire est présent,
  // refuser pour éviter l'ambiguïté.
  if (providerPayloads.length > 1 && tariffFile) {
    await cleanupUploadedFile(tariffFile);
    return res.status(400).json({
      error:
        'Le fichier contient plusieurs transporteurs. Importez-les sans document via "Importer Excel", puis ajoutez un PDF par ligne depuis la liste.',
    });
  }

  if (providerPayloads.length > 1) {
    // Import de masse (sans document)
    try {
      const { importProviders } = require('../services/providerImportService');
      // Valider et normaliser chaque entrée
      const normalized = [];
      for (const payload of providerPayloads) {
        const { errors, value } = normalizeProviderPayload(payload);
        if (errors.length === 0) {
          normalized.push(value);
        }
      }
      if (normalized.length === 0) {
        return res.status(400).json({ error: 'Aucune ligne valide dans le fichier.' });
      }
      const result = await importProviders(normalized, { sourceSheet: 'CUSTOM' });
      return res.status(201).json({
        message: `${result.processed} fournisseur(s) importé(s).`,
        processed: result.processed,
      });
    } catch (error) {
      return next(error);
    }
  }

  // Cas monoligne: procéder comme avant avec option de document PDF/Excel
  const { errors, value } = normalizeProviderPayload(providerPayloads[0]);
  if (errors.length > 0) {
    await cleanupUploadedFile(tariffFile);
    return res.status(400).json({ error: errors.join(' ') });
  }

  try {
    const created = await addProvider(value);
    let finalProvider = created;

    if (tariffFile) {
      let tariffFileInfo;
      try {
        tariffFileInfo = resolveTariffFileInfo(tariffFile);
      } catch (error) {
        await cleanupUploadedFile(tariffFile);
        return res.status(400).json({ error: error.message });
      }

      try {
        let buffer = null;
        if (tariffFileInfo.format === 'excel') {
          buffer = await convertExcelFileToPdfBuffer(tariffFile.path);
        }

        const updated = await persistTariffDocumentForProvider(
          created.id,
          buffer ? null : tariffFile,
          {
            extension: '.pdf',
            buffer,
          }
        );
        if (updated) {
          finalProvider = updated;
        }
      } catch (error) {
        await cleanupUploadedFile(tariffFile);
        return next(error);
      }
    }

    await cleanupUploadedFile(tariffFile);

    return res.status(201).json({
      message: 'Fournisseur importé depuis le modèle Excel.',
      data: enrichProvider(finalProvider),
    });
  } catch (error) {
    await cleanupUploadedFile(tariffFile);
    return next(error);
  }
};

const uploadProviderTariffDocument = async (req, res, next) => {
  const tempFile = req.file;

  try {
    const { id } = req.params;
    if (!id) {
      console.warn('[providers][uploadTariff] missing id');
      await cleanupUploadedFile(tempFile);
      return res.status(400).json({ error: 'Identifiant fournisseur requis.' });
    }

    if (!tempFile) {
      console.warn('[providers][uploadTariff] no file received', { providerId: id });
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    let fileInfo;
    try {
      fileInfo = resolveTariffFileInfo(tempFile);
    } catch (error) {
      await cleanupUploadedFile(tempFile);
      return res.status(400).json({ error: error.message });
    }

    const meta = await getTariffDocumentDefinition(id);
    if (!meta) {
      console.warn('[providers][uploadTariff] supplier not found', { providerId: id });
      await cleanupUploadedFile(tempFile);
      return res.status(404).json({ error: 'Transporteur introuvable.' });
    }

    let buffer = null;
    if (fileInfo.format === 'excel') {
      try {
        buffer = await convertExcelFileToPdfBuffer(tempFile.path);
      } catch (error) {
        await cleanupUploadedFile(tempFile);
        return res
          .status(400)
          .json({ error: error.message || 'Impossible de convertir le fichier Excel.' });
      }
    }

    let updatedProvider;
    try {
      updatedProvider = await persistTariffDocumentForProvider(meta.externalRef, buffer ? null : tempFile, {
        extension: '.pdf',
        explicitPath: meta.explicitPath,
        buffer,
      });
    } catch (error) {
      await cleanupUploadedFile(tempFile);
      return next(error);
    }

    await cleanupUploadedFile(tempFile);

    if (!updatedProvider) {
      return res
        .status(500)
        .json({ error: 'Impossible de mettre à jour le transporteur.' });
    }

    console.info('[providers][uploadTariff] imported document', { providerId: id, filename: tempFile?.originalname || null });
    return res.json({
      message: 'Document tarifaire importé avec succès.',
      data: enrichProvider(updatedProvider),
    });
  } catch (error) {
    console.error('[providers][uploadTariff] error', { message: error.message });
    await cleanupUploadedFile(tempFile);
    return next(error);
  }
};

const downloadProviderImportTemplate = (_req, res) => {
  const buffer = buildProviderTemplateBuffer();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="modele_import_transporteur.xlsx"'
  );
  return res.send(buffer);
};

// Modèle aligné sur "Liste Global transporteurs.xlsx"
const buildProviderDatasetTemplateBuffer = () => {
  const workbook = xlsx.utils.book_new();

  // Lignes d'en-tête (2 lignes)
  const headerTop = [];
  const headerSecond = [];

  const push = (top, second) => {
    headerTop.push(top || '');
    headerSecond.push(second || '');
  };

  // Colonnes fiche fournisseur
  [
    'Nom Transporteur',
    'Adresse',
    'Département',
    'Ville',
    'Nom de Contact',
    'Téléphone',
    'Ne Répond pas ',
  ].forEach((label) => push('', label));

  // Départements livraisons (exemple de quelques codes)
  ['01', '69', '75'].forEach((dept) => push('Département de livraisons', dept));
  // Départements chargement (exemple)
  ['42', '69'].forEach((dept) => push('Département de Chargement', dept));

  // Groupes d'équipements / services (suivent featureDictionary)
  ['Semi- Type', 'Taut '];
  [
    ['Semi- Type', ['Taut ', 'Fourgon', 'Frigo', 'Semi-Hayon']],
    ['Porteurs-Type', ['Porteur tolé', 'Porteur Taut', 'Hayon']],
    ['VL ', ['VL ']],
    ['Express', ['EXPRESS']],
    ['Moyens de manutention', ['GRUE', 'Chariot Embarqué', 'FOSSES', 'Porte-chars', 'convois exceptionnels']],
    ['ADR', ['ADR']],
    ['international', ['INTERNATIONAL']],
  ].forEach(([top, seconds]) => {
    seconds.forEach((sec) => push(top, sec));
  });

  const rows = [];
  rows.push(headerTop);
  rows.push(headerSecond);

  // Exemple de ligne de données (cocher avec 'x')
  const data = new Array(headerSecond.length).fill('');
  const setBySecond = (label, value) => {
    const idx = headerSecond.findIndex((l) => l === label);
    if (idx >= 0) data[idx] = value;
  };
  setBySecond('Nom Transporteur', 'EXEMPLE TRANSPORTEUR');
  setBySecond('Adresse', '12 rue des Forges');
  setBySecond('Département', '69');
  setBySecond('Ville', '69000 Lyon');
  setBySecond('Nom de Contact', 'Jean Dupont');
  setBySecond('Téléphone', '0601020304');
  setBySecond('Ne Répond pas ', '');

  // Exemples de départements livraisons/chargement cochés
  setBySecond('01', 'x');
  setBySecond('69', 'x');
  setBySecond('75', '');
  setBySecond('42', 'x');

  // Exemples d’équipements
  ['Taut ', 'Hayon', 'EXPRESS', 'GRUE'].forEach((sec) => setBySecond(sec, 'x'));

  rows.push(data);

  const sheet = xlsx.utils.aoa_to_sheet(rows);
  xlsx.utils.book_append_sheet(workbook, sheet, 'Fournisseurs');
  return xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
};

const downloadProviderDatasetTemplate = (_req, res) => {
  const buffer = buildProviderDatasetTemplateBuffer();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="modele_import_fournisseurs_dataset.xlsx"'
  );
  return res.send(buffer);
};

// Génère un modèle Excel simple pour une grille tarifaire à remplir
const buildTariffGridTemplateBuffer = () => {
  const workbook = xlsx.utils.book_new();
  const header = [
    'Destination / Distance',
    '1 palette (EUR)',
    '2 palettes (EUR)',
    '3 palettes (EUR)',
    '4 palettes (EUR)',
    '5 palettes (EUR)',
    'Prix au km (optionnel)'
  ];

  // Exemple complet couvrant départements et plages de distances
  const rows = [
    header,
    // Par département (code ou libellé + code)
    ['Paris (75)', 120, 210, 300, 380, 450, ''],
    ['69',         110, 195, 280, 360, 430, ''],
    // Par plages de distances (avec prix au km renseigné)
    ['0-50 km',    90,  160, 230, 300, 360, 1.10],
    ['51-100 km',  130, 210, 290, 370, 440, 1.30],
    ['101-200 km', 180, 270, 360, 450, 530, 1.50],
  ];

  const worksheet = xlsx.utils.aoa_to_sheet(rows);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Grille');
  return xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
};

const downloadTariffGridTemplate = (_req, res) => {
  const buffer = buildTariffGridTemplateBuffer();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="modele_grille_tarifaire.xlsx"'
  );
  return res.send(buffer);
};

const getProviderTariffDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Identifiant fournisseur requis.' });
    }

    const meta = await getTariffDocumentDefinition(id);
    if (!meta) {
      return res.status(404).json({ error: 'Transporteur introuvable.' });
    }

    const documentInfo = findTariffDocument(meta.externalRef, meta.explicitPath);
    if (!documentInfo.hasDocument) {
      return res
        .status(404)
        .json({ error: 'Aucune grille tarifaire disponible pour ce transporteur.' });
    }

    if (documentInfo.type === 'remote') {
      return res.redirect(documentInfo.publicUrl);
    }

    const dispositionType = req.query.download === '1' ? 'attachment' : 'inline';
    const filename = documentInfo.filename || `${meta.externalRef}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${encodeURIComponent(filename)}"`
    );

    return res.sendFile(documentInfo.localPath);
  } catch (error) {
    return next(error);
  }
};

const resolveDepartureDepartment = (provider) => {
  const profile = provider?.profile || {};
  return (
    normalizeDepartmentFilter(
      profile.department ||
        profile.pickupDepartments?.[0] ||
        profile.deliveryDepartments?.[0] ||
        ''
    ) || null
  );
};

const getProviderBaseTariffGrid = async (req, res, next) => {
  try {
    const provider = await findProviderById(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Transporteur introuvable.' });
    }

    const departureDepartment = resolveDepartureDepartment(provider);
    if (!departureDepartment) {
      return res.status(400).json({
        error: 'Impossible de déterminer le département de départ du transporteur.',
      });
    }

    const grid = getTariffGridForDeparture(departureDepartment);
    if (!grid) {
      return res.status(404).json({
        error: 'Aucune grille tarifaire de base disponible pour ce transporteur.',
      });
    }

    return res.json({
      data: {
        ...grid,
        provider: {
          id: provider.id,
          name: provider.name,
          departureDepartment,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listProviders,
  getProvidersByIds,
  getProviderById,
  createProvider,
  updateProvider: updateProviderEntry,
  deleteProvider: deleteProviderEntry,
  importSingleProviderWithTariff,
  uploadProviderTariffDocument,
  downloadProviderImportTemplate,
  downloadProviderDatasetTemplate,
  downloadTariffGridTemplate,
  importTariffCatalogFromExcel,
  getProviderTariffDocument,
  getProviderBaseTariffGrid,
};

// Importe une grille tarifaire (catalogue + lignes) pour un fournisseur existant à partir d'un modèle Excel
async function importTariffCatalogFromExcel(req, res, next) {
  const tempFile = req.file;
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Identifiant fournisseur requis.' });
    }
    if (!tempFile?.path) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    const workbook = xlsx.readFile(tempFile.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      await cleanupUploadedFile(tempFile);
      return res.status(400).json({ error: 'Fichier Excel vide.' });
    }

    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (rows.length < 2) {
      await cleanupUploadedFile(tempFile);
      return res.status(400).json({ error: 'Modèle invalide: en-têtes manquants.' });
    }

    const header = rows[0].map((c) => (c || '').toString().trim());
    const destColIndex = 0;
    // Colonnes palette: détecter "X palette" dans l'en-tête
    const paletteCols = [];
    header.forEach((label, idx) => {
      const m = label.match(/^(\d+)\s*palette/iu);
      if (m) {
        const count = Number.parseInt(m[1], 10);
        if (Number.isFinite(count) && count > 0) {
          paletteCols.push({ idx, count });
        }
      }
    });
    const pricePerKmCol = header.findIndex((h) => h.toLowerCase().includes('prix au km'));

    const meta = await getTariffDocumentDefinition(id);
    if (!meta) {
      await cleanupUploadedFile(tempFile);
      return res.status(404).json({ error: 'Transporteur introuvable.' });
    }
    const provider = await findProviderById(id);
    const originDepartment = resolveDepartureDepartment(provider);

    const parseDestination = (value) => {
      const raw = (value || '').toString().trim();
      if (!raw) return { type: 'none' };
      // Plage de distances: "0-50 km"
      const mDist = raw.match(/^(\d+(?:[\.,]\d+)?)\s*-\s*(\d+(?:[\.,]\d+)?)\s*km$/i);
      if (mDist) {
        const a = Number(mDist[1].replace(',', '.'));
        const b = Number(mDist[2].replace(',', '.'));
        if (Number.isFinite(a) && Number.isFinite(b)) {
          return { type: 'distance', min: Math.min(a, b), max: Math.max(a, b) };
        }
      }
      // Département avec code entre parenthèses: "Paris (75)"
      const mDeptParen = raw.match(/\((\d{2})\)/);
      if (mDeptParen) {
        return { type: 'department', code: mDeptParen[1] };
      }
      // Code département brut (ex: "75")
      const mDept = raw.match(/^(\d{2})$/);
      if (mDept) {
        return { type: 'department', code: mDept[1] };
      }
      return { type: 'unknown' };
    };

    const lines = [];
    for (let r = 1; r < rows.length; r += 1) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      const dest = parseDestination(row[destColIndex]);
      if (dest.type === 'none' || dest.type === 'unknown') continue;
      const pricePerKm = pricePerKmCol >= 0 ? Number(row[pricePerKmCol].toString().replace(',', '.')) : null;

      for (const col of paletteCols) {
        const rawPrice = row[col.idx];
        if (rawPrice === undefined || rawPrice === null || rawPrice === '') continue;
        const price = Number(rawPrice.toString().replace(',', '.'));
        if (!Number.isFinite(price)) continue;
        const line = {
          origin_department: originDepartment || null,
          destination_department: dest.type === 'department' ? dest.code : null,
          min_distance_km: dest.type === 'distance' ? dest.min : null,
          max_distance_km: dest.type === 'distance' ? dest.max : null,
          pallet_count: col.count,
          base_price: price,
          price_per_km: Number.isFinite(pricePerKm) ? pricePerKm : null,
        };
        lines.push(line);
      }
    }

    if (lines.length === 0) {
      await cleanupUploadedFile(tempFile);
      return res.status(400).json({ error: 'Aucune ligne tarifaire valide trouvée dans le fichier.' });
    }

    // Créer un catalogue et insérer les lignes
    const label = `Grille importée ${new Date().toLocaleDateString('fr-FR')}`;
    let catalogId;
    try {
      const repo = require('../repositories/providerRepository');
      catalogId = await repo.createTariffCatalogForSupplier(meta.supplierId, { label });
      await repo.bulkInsertTariffLines(catalogId, lines);
    } catch (dbError) {
      await cleanupUploadedFile(tempFile);
      return next(dbError);
    }

    await cleanupUploadedFile(tempFile);
    return res.json({ message: 'Grille tarifaire importée en base.', data: { catalogId, lines: lines.length } });
  } catch (error) {
    await cleanupUploadedFile(tempFile).catch(() => {});
    return next(error);
  }
}

/* duplicate removed */



