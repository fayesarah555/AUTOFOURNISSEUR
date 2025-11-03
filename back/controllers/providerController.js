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
const { getTariffForShipment, MAX_PALLETS, getTariffGridForDeparture } = require('../services/tariffMatrixService');
const { findTariffDocument } = require('../utils/tariffDocuments');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

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

const listProviders = async (req, res, next) => {
  try {
    const {
      q,
      modes,
      coverage,
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
      departureDepartment,
      arrivalDepartment,
    } = req.query;

    const normalizedDepartureDepartment = normalizeDepartmentFilter(departureDepartment);
    const normalizedArrivalDepartment = normalizeDepartmentFilter(arrivalDepartment);

    const filters = {
      query: typeof q === 'string' ? q.trim().toLowerCase() : '',
      modes: parseCsv(modes).map((mode) => mode.toLowerCase()),
      coverages: parseCsv(coverage).map((value) => value.toLowerCase()),
      services: parseCsv(services).map((value) => value.toLowerCase()),
      certifications: parseCsv(certifications).map((value) => value.toLowerCase()),
      flexibilities: parseCsv(contractFlexibility).map((value) => value.toLowerCase()),
      features: parseCsv(req.query.features).map((value) => value.toLowerCase()),
      minRating: sanitizeNumber(minRating),
      minOnTimeRate: sanitizeNumber(minOnTimeRate),
      maxLeadTime: sanitizeNumber(maxLeadTime),
      maxCo2: sanitizeNumber(maxCo2),
      maxPrice: sanitizeNumber(maxPrice),
      palletCount: sanitizePositiveInteger(req.query.palletCount),
      requireWeightMatch: requireWeightMatch === 'true',
      deliveryDepartments: parseCsv(req.query.deliveryDepartments)
        .map(normalizeDepartmentFilter)
        .filter(Boolean),
      pickupDepartments: parseCsv(req.query.pickupDepartments)
        .map(normalizeDepartmentFilter)
        .filter(Boolean),
      departureDepartment: normalizedDepartureDepartment,
      arrivalDepartment: normalizedArrivalDepartment,
    };

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
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      appliedFilters: filters,
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
        },
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
      return res.status(400).json({ error: 'ParamÃ¨tre ids requis.' });
    }

    const providers = await Promise.all(ids.map((id) => findProviderById(id)));
    const results = providers
      .filter(Boolean)
      .map((provider) => enrichProvider(provider, req.query));

    if (results.length === 0) {
      return res.status(404).json({ error: 'Aucun transporteur trouvÃ© pour les identifiants demandÃ©s.' });
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
      errors.push(`Le champ ${field} doit Ãªtre un nombre.`);
      return;
    }

    let resolved = numeric;

    if (allowPercent && resolved > 1) {
      resolved = resolved / 100;
    }

    if (resolved < min || resolved > max) {
      errors.push(`Le champ ${field} doit Ãªtre compris entre ${min} et ${max}.`);
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

  assignArray('modes', { transform: (value) => value.toLowerCase() });
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

  if (data.modes === undefined && !partial) {
    normalized.modes = ['road'];
  }

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
    errors.push('Aucun champ valide Ã  mettre Ã  jour.');
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
  getProviderTariffDocument,
  getProviderBaseTariffGrid,
};
