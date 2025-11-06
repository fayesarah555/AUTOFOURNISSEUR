const {
  listProviders: repositoryListProviders,
  findProviderById,
  addProvider,
  updateProvider,
  deleteProvider,
  getTariffDocumentDefinition,
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
const { findTariffDocument } = require('../utils/tariffDocuments');

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
      return res.status(400).json({ error: 'ParamÃƒÂ¨tre ids requis.' });
    }

    const providers = await Promise.all(ids.map((id) => findProviderById(id)));
    const results = providers
      .filter(Boolean)
      .map((provider) => enrichProvider(provider, req.query));

    if (results.length === 0) {
      return res.status(404).json({ error: 'Aucun transporteur trouvÃƒÂ© pour les identifiants demandÃƒÂ©s.' });
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
      errors.push(`Le champ ${field} doit ÃƒÂªtre un nombre.`);
      return;
    }

    let resolved = numeric;

    if (allowPercent && resolved > 1) {
      resolved = resolved / 100;
    }

    if (resolved < min || resolved > max) {
      errors.push(`Le champ ${field} doit ÃƒÂªtre compris entre ${min} et ${max}.`);
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
    errors.push('Aucun champ valide ÃƒÂ  mettre ÃƒÂ  jour.');
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
        error: 'Impossible de dÃ©terminer le dÃ©partement de dÃ©part du transporteur.',
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
  getProviderTariffDocument,
  getProviderBaseTariffGrid,
};



