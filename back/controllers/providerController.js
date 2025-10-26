const {
  listProviders: repositoryListProviders,
  findProviderById,
  addProvider,
  updateProvider,
  deleteProvider,
} = require('../repositories/providerRepository');

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const sanitizeNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

  return trimmed;
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

    if (filters.modes.length > 0) {
      const modesLower = item.modes.map((mode) => mode.toLowerCase());
      const hasMode = filters.modes.some((mode) => modesLower.includes(mode));
      if (!hasMode) {
        return false;
      }
    }

    if (filters.coverages.length > 0 && !filters.coverages.includes(item.coverage.toLowerCase())) {
      return false;
    }

    if (
      filters.regions.length > 0 &&
      !filters.regions.some((region) => item.regions.includes(region.toUpperCase()))
    ) {
      return false;
    }

    if (
      filters.services.length > 0 &&
      !filters.services.every((service) =>
        item.serviceCapabilities.map((cap) => cap.toLowerCase()).includes(service)
      )
    ) {
      return false;
    }

    if (
      filters.certifications.length > 0 &&
      !filters.certifications.every((cert) =>
        item.certifications.map((value) => value.toLowerCase()).includes(cert)
      )
    ) {
      return false;
    }

    if (typeof filters.minRating === 'number' && item.customerSatisfaction < filters.minRating) {
      return false;
    }

    if (typeof filters.minOnTimeRate === 'number' && item.onTimeRate < filters.minOnTimeRate) {
      return false;
    }

    if (typeof filters.maxLeadTime === 'number' && item.leadTimeDays > filters.maxLeadTime) {
      return false;
    }

    if (typeof filters.maxCo2 === 'number' && item.co2GramsPerTonneKm > filters.maxCo2) {
      return false;
    }

    if (
      filters.flexibilities.length > 0 &&
      !filters.flexibilities.includes(item.contractFlexibility.toLowerCase())
    ) {
      return false;
    }

    if (filters.requireWeightMatch && !item.meetsWeight) {
      return false;
    }

    if (typeof filters.maxPrice === 'number') {
      if (typeof item.estimatedCost === 'number') {
        if (item.estimatedCost > filters.maxPrice) {
          return false;
        }
      } else if (item.pricePerKm > filters.maxPrice) {
        return false;
      }
    }

    if (filters.features.length > 0) {
      const featureSet = new Set((item.profile?.features || []).map((value) => value.toLowerCase()));
      const hasFeatures = filters.features.every((feature) => featureSet.has(feature));
      if (!hasFeatures) {
        return false;
      }
    }

    if (filters.deliveryDepartments.length > 0) {
      const deliveries = new Set(item.profile?.deliveryDepartments || []);
      const matches = filters.deliveryDepartments.some((department) => deliveries.has(department));
      if (!matches) {
        return false;
      }
    }

    if (filters.pickupDepartments.length > 0) {
      const pickups = new Set(item.profile?.pickupDepartments || []);
      const matches = filters.pickupDepartments.some((department) => pickups.has(department));
      if (!matches) {
        return false;
      }
    }

    return true;
  });

const sortProviders = (items, sortBy, sortOrder) => {
  const orderMultiplier = sortOrder === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (aValue === undefined || bValue === undefined) {
      return 0;
    }

    if (aValue === bValue) {
      return 0;
    }

    return aValue > bValue ? orderMultiplier : -orderMultiplier;
  });
};

const listProviders = (req, res) => {
  const {
    q,
    modes,
    coverage,
    regions,
    services,
    certifications,
    minRating,
    minOnTimeRate,
    maxLeadTime,
    maxCo2,
    contractFlexibility,
    requireWeightMatch,
    maxPrice,
    sortBy = 'score',
    sortOrder = 'desc',
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    weightKg,
    distanceKm,
  } = req.query;

  const filters = {
    query: typeof q === 'string' ? q.trim().toLowerCase() : '',
    modes: parseCsv(modes).map((mode) => mode.toLowerCase()),
    coverages: parseCsv(coverage).map((value) => value.toLowerCase()),
    regions: parseCsv(regions).map((value) => value.toUpperCase()),
    services: parseCsv(services).map((value) => value.toLowerCase()),
    certifications: parseCsv(certifications).map((value) => value.toLowerCase()),
    flexibilities: parseCsv(contractFlexibility).map((value) => value.toLowerCase()),
    features: parseCsv(req.query.features).map((value) => value.toLowerCase()),
    minRating: sanitizeNumber(minRating),
    minOnTimeRate: sanitizeNumber(minOnTimeRate),
    maxLeadTime: sanitizeNumber(maxLeadTime),
    maxCo2: sanitizeNumber(maxCo2),
    maxPrice: sanitizeNumber(maxPrice),
    requireWeightMatch: requireWeightMatch === 'true',
    deliveryDepartments: parseCsv(req.query.deliveryDepartments)
      .map(normalizeDepartmentFilter)
      .filter(Boolean),
    pickupDepartments: parseCsv(req.query.pickupDepartments)
      .map(normalizeDepartmentFilter)
      .filter(Boolean),
  };

  const canonicalPageSize = Math.min(
    Math.max(Number(pageSize) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  const currentPage = Math.max(Number(page) || 1, 1);

  const dataset = repositoryListProviders();
  const enriched = dataset.map((provider) =>
    enrichProvider(provider, { distanceKm, weightKg })
  );
  const filtered = applyFilters(enriched, filters);

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

  const sorted = sortProviders(filtered, resolvedSortField, resolvedSortOrder);
  const total = sorted.length;
  const totalPages = Math.max(Math.ceil(total / canonicalPageSize), 1);
  const offset = (currentPage - 1) * canonicalPageSize;
  const paginated = sorted.slice(offset, offset + canonicalPageSize);

  return res.json({
    data: paginated,
    meta: {
      total,
      page: currentPage,
      pageSize: canonicalPageSize,
      totalPages,
      sortBy: resolvedSortField,
      sortOrder: resolvedSortOrder,
      appliedFilters: filters,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      availableFilters: {
        deliveryDepartments: availableDeliveryDepartments,
        pickupDepartments: availablePickupDepartments,
        features: availableFeatures,
      },
    },
  });
};

const getProvidersByIds = (req, res) => {
  const ids = parseCsv(req.query.ids);
  if (ids.length === 0) {
    return res.status(400).json({ error: 'Paramètre ids requis.' });
  }

  const results = ids
    .map((id) => findProviderById(id))
    .filter(Boolean)
    .map((provider) => enrichProvider(provider, req.query));

  if (results.length === 0) {
    return res.status(404).json({ error: 'Aucun transporteur trouvé pour les identifiants demandés.' });
  }

  return res.json({ data: results });
};

const getProviderById = (req, res) => {
  const provider = findProviderById(req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'Transporteur introuvable.' });
  }

  return res.json({ data: enrichProvider(provider, req.query) });
};

const normalizeProviderPayload = (input, { partial = false } = {}) => {
  const data = input || {};
  const errors = [];
  const normalized = {};

  const processString = (field, { required = true, transform } = {}) => {
    if (data[field] === undefined) {
      if (!partial && required) {
        errors.push(`Le champ ${field} est requis.`);
      }
      return;
    }

    const raw = String(data[field] ?? '').trim();

    if (!raw) {
      if (required) {
        errors.push(`Le champ ${field} est requis.`);
      } else {
        normalized[field] = '';
      }
      return;
    }

    normalized[field] = transform ? transform(raw) : raw;
  };

  const processList = (field, { required = true, transform } = {}) => {
    if (data[field] === undefined) {
      if (!partial && required) {
        errors.push(`Le champ ${field} est requis.`);
      }
      return;
    }

    const values = parseListInput(data[field]);

    if (values.length === 0) {
      if (required) {
        errors.push(`Le champ ${field} doit contenir au moins une valeur.`);
      } else {
        normalized[field] = [];
      }
      return;
    }

    normalized[field] = transform ? values.map(transform) : values;
  };

  const processNumber = (field, { required = true, min = 0, max = Number.POSITIVE_INFINITY, allowPercent = false } = {}) => {
    if (data[field] === undefined) {
      if (!partial && required) {
        errors.push(`Le champ ${field} est requis.`);
      }
      return;
    }

    const numeric = sanitizeNumber(data[field]);

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

  processString('name');
  processString('description');
  processString('coverage', { transform: (value) => value.toLowerCase() });
  processString('contractFlexibility', { transform: (value) => value.toLowerCase() });
  processString('notes', { required: false });

  processList('modes', { transform: (value) => value.toLowerCase() });
  processList('regions', { transform: (value) => value.toUpperCase() });
  processList('serviceCapabilities', { transform: (value) => value.toLowerCase() });
  processList('certifications');

  processNumber('leadTimeDays', { min: 0 });
  processNumber('onTimeRate', { min: 0, max: 1, allowPercent: true });
  processNumber('pricePerKm', { min: 0 });
  processNumber('baseHandlingFee', { min: 0 });
  processNumber('minShipmentKg', { min: 0 });
  processNumber('co2GramsPerTonneKm', { min: 0 });
  processNumber('customerSatisfaction', { min: 0, max: 5 });

  if (data.id && typeof data.id === 'string') {
    normalized.id = data.id.trim();
  }

  if (!partial && normalized.notes === undefined) {
    normalized.notes = '';
  }

  if (partial && Object.keys(normalized).length === 0) {
    errors.push("Aucun champ valide à mettre à jour.");
  }

  return { errors, value: normalized };
};

const createProvider = (req, res) => {
  const { errors, value } = normalizeProviderPayload(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const created = addProvider(value);
  return res.status(201).json({ data: enrichProvider(created) });
};

const updateProviderEntry = (req, res) => {
  const { errors, value } = normalizeProviderPayload(req.body, { partial: true });

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const updated = updateProvider(req.params.id, value);

  if (!updated) {
    return res.status(404).json({ error: 'Transporteur introuvable.' });
  }

  return res.json({ data: enrichProvider(updated) });
};

const deleteProviderEntry = (req, res) => {
  const deleted = deleteProvider(req.params.id);

  if (!deleted) {
    return res.status(404).json({ error: 'Transporteur introuvable.' });
  }

  return res.status(204).send();
};

module.exports = {
  listProviders,
  getProvidersByIds,
  getProviderById,
  createProvider,
  updateProvider: updateProviderEntry,
  deleteProvider: deleteProviderEntry,
};
