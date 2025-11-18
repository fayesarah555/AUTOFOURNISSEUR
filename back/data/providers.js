const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const EXCEL_FILENAME = 'Liste Global transporteurs.xlsx';
const EXCEL_PATH = path.resolve(__dirname, '..', EXCEL_FILENAME);

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const boolFromCell = (value) => {
  if (value === undefined || value === null) {
    return false;
  }

  const normalized = value.toString().trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return ['oui', 'yes', 'true', '1', 'x'].includes(normalized);
};

const normalizeDepartment = (value) => {
  const num = Number.parseInt(value, 10);
  if (Number.isFinite(num)) {
    return num.toString().padStart(2, '0');
  }

  return value ? value.toString().trim() : '';
};

const normalizePhone = (value) => {
  if (!value) {
    return '';
  }

  return value.toString().replace(/\s+/g, ' ').trim();
};

const featureDictionary = {
  'Semi- Type': {
    'Taut ': 'semi-tautliner',
    Fourgon: 'semi-fourgon',
    Frigo: 'semi-frigorifique',
    'Semi-Hayon': 'semi-hayon',
  },
  'Porteurs-Type': {
    'Porteur tolé': 'porteur-tole',
    'Porteur Taut': 'porteur-taut',
    Hayon: 'porteur-hayon',
  },
  'VL ': {
    'VL ': 'vehicule-leger',
  },
  Express: {
    EXPRESS: 'express',
  },
  'Moyens de manutention': {
    GRUE: 'grue',
    'Chariot Embarqué': 'chariot-embarque',
    FOSSES: 'fosse',
    'Porte-chars': 'porte-char',
    'convois exceptionnels': 'convoi-exceptionnel',
  },
  ADR: {
    ADR: 'adr',
  },
  international: {
    INTERNATIONAL: 'international',
  },
};

const createSectionCache = (headerTop) => {
  const cache = [];
  let lastSection = '';

  headerTop.forEach((label) => {
    const value = (label || '').toString().trim();
    if (value) {
      lastSection = value;
      cache.push(value);
    } else {
      cache.push(lastSection);
    }
  });

  return cache;
};

const computeLogisticsMetrics = (provider) => {
  const features = new Set(provider.profile.features);
  const express = features.has('express');
  const adr = features.has('adr');
  const international = features.has('international');
  const fridge = features.has('semi-frigorifique');
  const heavy = features.has('porte-char') || features.has('convoi-exceptionnel');
  const light = features.has('vehicule-leger');
  const hayon = features.has('semi-hayon') || features.has('porteur-hayon');

  provider.coverage = international ? 'global' : 'domestic';
  provider.leadTimeDays = express ? 1 : heavy ? 4 : 2;
  provider.onTimeRate = Number(
    Math.min(
      0.98,
      Math.max(
        0.75,
        0.92 + (express ? 0.03 : 0) - (provider.profile.unreachable ? 0.05 : 0) - (heavy ? 0.02 : 0)
      )
    ).toFixed(4)
  );
  provider.pricePerKm = Number(
    (
      1 +
      (fridge ? 0.35 : 0) +
      (heavy ? 0.4 : 0) +
      (adr ? 0.15 : 0) -
      (light ? 0.2 : 0)
    ).toFixed(2)
  );
  provider.baseHandlingFee = 80 + features.size * 8 + (heavy ? 120 : 0);
  provider.minShipmentKg = heavy ? 800 : light ? 20 : 120;
  provider.co2GramsPerTonneKm = Math.max(
    15,
    Math.round(50 + (heavy ? 20 : 0) + (fridge ? 10 : 0) - (light ? 15 : 0))
  );
  provider.customerSatisfaction = Number(
    Math.min(
      4.8,
      Math.max(3.2, 4.1 + (express ? 0.3 : 0) - (provider.profile.unreachable ? 0.4 : 0) + (hayon ? 0.1 : 0))
    ).toFixed(1)
  );
  provider.contractFlexibility = express ? 'spot' : light ? 'monthly' : 'quarterly';

  const departmentsCount = provider.profile.deliveryDepartments.length;
  const notes = [`Dessert ${departmentsCount} département${departmentsCount > 1 ? 's' : ''}`];
  if (international) {
    notes.push("opère à l'international");
  }
  provider.notes = `${notes.join(' et ')}.`;

  const cityText = provider.profile.city
    ? provider.profile.city
    : provider.profile.department
    ? `département ${provider.profile.department}`
    : 'France';

  const contactName = provider.profile.contact || 'contact non renseigné';
  const contactPhone = provider.profile.phone || 'téléphone non renseigné';

  provider.description = `Basé à ${cityText}. Contact ${contactName} (${contactPhone}).`;
};

const loadFromExcel = (excelPath) => {
  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 3) {
    return [];
  }

  const headerTop = rows[0].map((value) => (value || '').toString().trim());
  const headerSecond = rows[1].map((value) => (value || '').toString().trim());
  const sectionCache = createSectionCache(headerTop);
  const dataRows = rows.slice(2);
  const providers = [];

  dataRows.forEach((rawRow, rowIndex) => {
    const nameCell = rawRow[0];
    const name = nameCell ? nameCell.toString().trim() : '';
    if (!name) {
      return;
    }

    const features = new Set();
    const deliveryDepartments = new Set();
    const pickupDepartments = new Set();

    const provider = {
      id: `prt-${slugify(name) || 'transporteur'}-${String(rowIndex + 1).padStart(4, '0')}`,
      name,
      modes: ['road'],
      coverage: 'domestic',
      regions: [],
      serviceCapabilities: [],
      certifications: [],
      leadTimeDays: 3,
      onTimeRate: 0.9,
      pricePerKm: 1.05,
      baseHandlingFee: 80,
      minShipmentKg: 150,
      co2GramsPerTonneKm: 58,
      customerSatisfaction: 4.1,
      contractFlexibility: 'monthly',
      notes: '',
      description: '',
      profile: {
        address: '',
        postalCode: '',
        city: '',
        department: '',
        contact: '',
        phone: '',
        unreachable: false,
        features: [],
        deliveryDepartments: [],
        pickupDepartments: [],
      },
    };

    rawRow.forEach((cell, columnIndex) => {
      const topLabel = sectionCache[columnIndex] || '';
      const secondLabel = headerSecond[columnIndex] || '';
      const cellValue = (cell || '').toString().trim();

      if (!cellValue) {
        return;
      }

      if (topLabel.startsWith('Département de livraisons')) {
        const departmentCode = normalizeDepartment(secondLabel || cellValue);
        if (departmentCode) {
          deliveryDepartments.add(departmentCode);
        }
        return;
      }

      if (topLabel.startsWith('Département de Chargement')) {
        const departmentCode = normalizeDepartment(secondLabel || cellValue);
        if (departmentCode) {
          pickupDepartments.add(departmentCode);
        }
        return;
      }

      switch (secondLabel) {
        case 'Nom Transporteur':
          break;
        case 'Adresse':
          provider.profile.address = cellValue;
          break;
        case 'Département':
          provider.profile.department = normalizeDepartment(cellValue);
          break;
        case 'Ville': {
          const match = cellValue.match(/^(\d{5})\s*(.*)$/);
          if (match) {
            provider.profile.postalCode = match[1];
            provider.profile.city = match[2] || '';
          } else {
            provider.profile.city = cellValue;
          }
          break;
        }
        case 'Nom de Contact':
          provider.profile.contact = cellValue;
          break;
        case 'Téléphone':
          provider.profile.phone = normalizePhone(cellValue);
          break;
        // case 'Ne Répond pas ':
        //   provider.profile.unreachable = boolFromCell(cellValue);
          break;
        default: {
          const featureGroup = featureDictionary[topLabel];
          if (featureGroup) {
            const featureKey = featureGroup[secondLabel] || featureGroup[cellValue];
            if (featureKey && boolFromCell(cellValue)) {
              features.add(featureKey);
            }
          }
        }
      }
    });

    provider.profile.features = Array.from(features).sort();
    provider.profile.deliveryDepartments = Array.from(deliveryDepartments)
      .map(normalizeDepartment)
      .filter(Boolean)
      .sort();
    provider.profile.pickupDepartments = Array.from(pickupDepartments)
      .map(normalizeDepartment)
      .filter(Boolean)
      .sort();

    if (!provider.profile.department && provider.profile.deliveryDepartments.length > 0) {
      provider.profile.department = provider.profile.deliveryDepartments[0];
    }

    if (!provider.profile.deliveryDepartments.length && provider.profile.department) {
      provider.profile.deliveryDepartments.push(provider.profile.department);
    }

    provider.regions = Array.from(
      new Set(
        provider.profile.deliveryDepartments
          .map((department) => department && `FR-${department}`)
          .filter(Boolean)
      )
    );
    provider.serviceCapabilities = Array.from(features).sort();

    computeLogisticsMetrics(provider);
    providers.push(provider);
  });

  return providers;
};

const loadSeedProviders = () => {
  try {
    if (!fs.existsSync(EXCEL_PATH)) {
      return [];
    }

    return loadFromExcel(EXCEL_PATH);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load transport providers from Excel dataset:', error.message);
    return [];
  }
};

const providers = loadSeedProviders();

module.exports = providers;
module.exports.loadSeedProviders = loadSeedProviders;
module.exports.EXCEL_PATH = EXCEL_PATH;
module.exports.loadFromExcel = loadFromExcel;
