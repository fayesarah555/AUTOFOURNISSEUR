import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './dashboard.css';
import apiClient from '../../utils/apiClient';

const createEmptyFilters = () => ({
  q: '',
  modes: [],
  coverage: [],
  regions: [],
  features: [],
  minRating: '',
  minOnTimeRate: '',
  maxLeadTime: '',
  maxCo2: '',
  contractFlexibility: [],
  maxPrice: '',
  weightKg: '',
  distanceKm: '',
  requireWeightMatch: false,
  deliveryDepartments: [],
  pickupDepartments: [],
});

const MODE_OPTIONS = [
  { value: 'road', label: 'Routier' },
  { value: 'rail', label: 'Rail' },
  { value: 'sea', label: 'Maritime' },
  { value: 'air', label: 'Aérien' },
  { value: 'river', label: 'Fluvial' },
];

const COVERAGE_OPTIONS = [
  { value: 'domestic', label: 'National' },
  { value: 'regional', label: 'Régional' },
  { value: 'europe', label: 'Europe' },
  { value: 'global', label: 'Global' },
];

const REGION_OPTIONS = [
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Allemagne' },
  { value: 'BE', label: 'Belgique' },
  { value: 'NL', label: 'Pays-Bas' },
  { value: 'ES', label: 'Espagne' },
  { value: 'NO', label: 'Norvège' },
  { value: 'SE', label: 'Suède' },
  { value: 'DK', label: 'Danemark' },
  { value: 'AT', label: 'Autriche' },
  { value: 'PL', label: 'Pologne' },
  { value: 'CZ', label: 'Tchéquie' },
  { value: 'IT', label: 'Italie' },
  { value: 'UK', label: 'Royaume-Uni' },
  { value: 'CH', label: 'Suisse' },
  { value: 'EU', label: 'Europe (interrégion)' },
  { value: 'NA', label: 'Amérique du Nord' },
  { value: 'LATAM', label: 'Amérique latine' },
  { value: 'APAC', label: 'Asie-Pacifique' },
  { value: 'MEA', label: 'Afrique / Moyen-Orient' },
];

const FEATURE_LABELS = {
  'semi-tautliner': 'Semi tautliner',
  'semi-fourgon': 'Semi fourgon',
  'semi-frigorifique': 'Semi frigorifique',
  'semi-hayon': 'Semi hayon',
  'porteur-tole': 'Porteur tôlé',
  'porteur-taut': 'Porteur tautliner',
  'porteur-hayon': 'Porteur hayon',
  'vehicule-leger': 'Véhicule léger',
  express: 'Express',
  adr: 'ADR',
  international: 'International',
  grue: 'Grue',
  'chariot-embarque': 'Chariot embarqué',
  fosse: 'Fosse',
  'porte-char': 'Porte-char',
  'convoi-exceptionnel': 'Convoi exceptionnel',
};

const FEATURE_GROUP_DEFINITIONS = [
  {
    label: 'Semi-remorques',
    keys: ['semi-tautliner', 'semi-fourgon', 'semi-frigorifique', 'semi-hayon'],
  },
  {
    label: 'Porteurs',
    keys: ['porteur-tole', 'porteur-taut', 'porteur-hayon', 'vehicule-leger'],
  },
  {
    label: 'Manutention',
    keys: ['grue', 'chariot-embarque', 'fosse'],
  },
  {
    label: 'Options & spécialités',
    keys: ['express', 'adr', 'porte-char', 'convoi-exceptionnel', 'international'],
  },
];

const FLEXIBILITY_OPTIONS = [
  { value: 'spot', label: 'Spot' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'annual', label: 'Annuel' },
];

const COVERAGE_LABELS = COVERAGE_OPTIONS.reduce(
  (acc, option) => ({
    ...acc,
    [option.value]: option.label,
  }),
  {}
);

const MODE_LABELS = MODE_OPTIONS.reduce(
  (acc, option) => ({
    ...acc,
    [option.value]: option.label,
  }),
  {}
);

const SORT_OPTIONS = [
  { value: 'score', label: 'Score global' },
  { value: 'customerSatisfaction', label: 'Satisfaction client' },
  { value: 'pricePerKm', label: 'Prix / km' },
  { value: 'estimatedCost', label: 'Coût estimé' },
  { value: 'leadTimeDays', label: 'Délai (jours)' },
  { value: 'onTimeRate', label: 'Ponctualité' },
  { value: 'co2GramsPerTonneKm', label: 'Empreinte CO₂' },
];

const toggleItem = (collection, value) =>
  collection.includes(value) ? collection.filter((item) => item !== value) : [...collection, value];

const formatPercent = (value) =>
  typeof value === 'number' ? `${(value * 100).toFixed(0)} %` : 'N/A';

const getFeatureLabel = (value) => FEATURE_LABELS[value] || value.replace(/-/g, ' ');

const getCoverageLabel = (value) => COVERAGE_LABELS[value] || value;

const getModeLabel = (value) => MODE_LABELS[value] || value;

const FRENCH_DEPARTMENT_NAMES = {
  '01': 'Ain',
  '02': 'Aisne',
  '03': 'Allier',
  '04': 'Alpes-de-Haute-Provence',
  '05': 'Hautes-Alpes',
  '06': 'Alpes-Maritimes',
  '07': 'Ardeche',
  '08': 'Ardennes',
  '09': 'Ariege',
  '10': 'Aube',
  '11': 'Aude',
  '12': 'Aveyron',
  '13': 'Bouches-du-Rhone',
  '14': 'Calvados',
  '15': 'Cantal',
  '16': 'Charente',
  '17': 'Charente-Maritime',
  '18': 'Cher',
  '19': 'Correze',
  '21': "Cote-d'Or",
  '22': "Cotes-d'Armor",
  '23': 'Creuse',
  '24': 'Dordogne',
  '25': 'Doubs',
  '26': 'Drome',
  '27': 'Eure',
  '28': 'Eure-et-Loir',
  '29': 'Finistere',
  '2A': 'Corse-du-Sud',
  '2B': 'Haute-Corse',
  '30': 'Gard',
  '31': 'Haute-Garonne',
  '32': 'Gers',
  '33': 'Gironde',
  '34': 'Herault',
  '35': 'Ille-et-Vilaine',
  '36': 'Indre',
  '37': 'Indre-et-Loire',
  '38': 'Isere',
  '39': 'Jura',
  '40': 'Landes',
  '41': 'Loir-et-Cher',
  '42': 'Loire',
  '43': 'Haute-Loire',
  '44': 'Loire-Atlantique',
  '45': 'Loiret',
  '46': 'Lot',
  '47': 'Lot-et-Garonne',
  '48': 'Lozere',
  '49': 'Maine-et-Loire',
  '50': 'Manche',
  '51': 'Marne',
  '52': 'Haute-Marne',
  '53': 'Mayenne',
  '54': 'Meurthe-et-Moselle',
  '55': 'Meuse',
  '56': 'Morbihan',
  '57': 'Moselle',
  '58': 'Nievre',
  '59': 'Nord',
  '60': 'Oise',
  '61': 'Orne',
  '62': 'Pas-de-Calais',
  '63': 'Puy-de-Dome',
  '64': 'Pyrenees-Atlantiques',
  '65': 'Hautes-Pyrenees',
  '66': 'Pyrenees-Orientales',
  '67': 'Bas-Rhin',
  '68': 'Haut-Rhin',
  '69': 'Rhone',
  '70': 'Haute-Saone',
  '71': 'Saone-et-Loire',
  '72': 'Sarthe',
  '73': 'Savoie',
  '74': 'Haute-Savoie',
  '75': 'Paris',
  '76': 'Seine-Maritime',
  '77': 'Seine-et-Marne',
  '78': 'Yvelines',
  '79': 'Deux-Sevres',
  '80': 'Somme',
  '81': 'Tarn',
  '82': 'Tarn-et-Garonne',
  '83': 'Var',
  '84': 'Vaucluse',
  '85': 'Vendee',
  '86': 'Vienne',
  '87': 'Haute-Vienne',
  '88': 'Vosges',
  '89': 'Yonne',
  '90': 'Territoire de Belfort',
  '91': 'Essonne',
  '92': 'Hauts-de-Seine',
  '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne',
  '95': "Val-d'Oise",
};

const normalizeDepartmentCode = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  let code = String(value).trim().toUpperCase();
  if (!code) {
    return '';
  }

  if (code.startsWith('FR-')) {
    code = code.slice(3);
  }

  if (/^\d{5}$/.test(code)) {
    code = code.slice(0, 2);
  }

  if (/^0\d{2}$/.test(code)) {
    code = code.slice(1);
  }

  if (/^\d$/.test(code)) {
    code = code.padStart(2, '0');
  }

  if (code === '20') {
    return '2A';
  }

  if (code === '2A' || code === '2B') {
    return code;
  }

  if (/^\d{2}$/.test(code)) {
    return code;
  }

  return code;
};

const formatDepartmentLabel = (dept) => {
  const normalized = normalizeDepartmentCode(dept);
  if (!normalized) {
    return 'NC';
  }

  const label =
    FRENCH_DEPARTMENT_NAMES[normalized] ||
    (normalized.length === 2 ? FRENCH_DEPARTMENT_NAMES[normalized.padStart(2, '0')] : undefined);

  if (label) {
    return `Dept ${normalized} - ${label}`;
  }

  if (/^\d{2}$/.test(normalized)) {
    return `Dept ${normalized}`;
  }

  return `Dept ${String(dept)}`;
};

const cloneFilterState = (state) => ({
  ...state,
  modes: [...state.modes],
  coverage: [...state.coverage],
  regions: [...state.regions],
  contractFlexibility: [...state.contractFlexibility],
  features: [...state.features],
  deliveryDepartments: [...state.deliveryDepartments],
  pickupDepartments: [...state.pickupDepartments],
});

const formatDepartmentList = (departments, limit = 6) => {
  if (!Array.isArray(departments)) {
    return 'N/A';
  }

  const unique = Array.from(
    new Set(
      departments
        .map((dept) => normalizeDepartmentCode(dept))
        .filter((dept) => dept && dept !== 'NC')
    )
  );

  if (unique.length === 0) {
    return 'N/A';
  }

  const preview = unique.slice(0, limit).map(formatDepartmentLabel);
  const remainder = unique.length - preview.length;
  return remainder > 0 ? `${preview.join(', ')} +${remainder}` : preview.join(', ');
};

const formatTravelEta = (distanceKm, averageSpeed = 65) => {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return '';
  }

  if (!Number.isFinite(averageSpeed) || averageSpeed <= 0) {
    return '';
  }

  const totalMinutes = Math.round((distanceKm / averageSpeed) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  }

  if (hours > 0) {
    return `${hours} h`;
  }

  return `${minutes} min`;
};

const sanitizeNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatCurrency = (value) =>
  typeof value === 'number'
    ? `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
    : 'N/A';

const formatDistanceCost = (value) =>
  typeof value === 'number'
    ? `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
    : '—';

const createEmptyAdminForm = () => ({
  name: '',
  description: '',
  modes: '',
  coverage: 'domestic',
  regions: '',
  serviceCapabilities: '',
  certifications: '',
  leadTimeDays: '',
  onTimeRate: '',
  pricePerKm: '',
  baseHandlingFee: '',
  minShipmentKg: '',
  co2GramsPerTonneKm: '',
  customerSatisfaction: '',
  contractFlexibility: 'spot',
  notes: '',
});

const listFromInput = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const buildAdminPayload = (form) => {
  const errors = [];

  const name = form.name.trim();
  if (!name) {
    errors.push('Le nom est obligatoire.');
  }

  const description = form.description.trim();
  if (!description) {
    errors.push('La description est obligatoire.');
  }

  const coverage = form.coverage ? form.coverage.trim().toLowerCase() : '';
  if (!coverage) {
    errors.push('La couverture est obligatoire.');
  } else if (!COVERAGE_OPTIONS.some((option) => option.value === coverage)) {
    errors.push('La couverture sélectionnée est invalide.');
  }

  const contractFlexibility = form.contractFlexibility
    ? form.contractFlexibility.trim().toLowerCase()
    : '';
  if (!contractFlexibility) {
    errors.push('Le type de contrat est obligatoire.');
  } else if (!FLEXIBILITY_OPTIONS.some((option) => option.value === contractFlexibility)) {
    errors.push('Le type de contrat sélectionné est invalide.');
  }

  const modes = listFromInput(form.modes);
  if (modes.length === 0) {
    errors.push('Indiquez au moins un mode de transport.');
  }

  const regions = listFromInput(form.regions).map((value) => value.toUpperCase());
  if (regions.length === 0) {
    errors.push('Indiquez au moins une région desservie.');
  }

  const serviceCapabilities = listFromInput(form.serviceCapabilities).map((value) =>
    value.toLowerCase()
  );
  if (serviceCapabilities.length === 0) {
    errors.push('Indiquez au moins un service proposé.');
  }

  const certifications = listFromInput(form.certifications);
  if (certifications.length === 0) {
    errors.push('Indiquez au moins une certification.');
  }

  const normalizeNumber = (
    value,
    label,
    { min = 0, max = Number.POSITIVE_INFINITY, allowPercent = false } = {}
  ) => {
    const numeric = sanitizeNumber(value);

    if (numeric === undefined) {
      errors.push(`Le champ ${label} doit être un nombre.`);
      return undefined;
    }

    let resolved = numeric;

    if (allowPercent && resolved > 1) {
      resolved = resolved / 100;
    }

    if (resolved < min || resolved > max) {
      const minDisplay = allowPercent && max === 1 ? min * 100 : min;
      const maxDisplay = allowPercent && max === 1 ? max * 100 : max;
      const suffix = allowPercent && max === 1 ? ' %' : '';
      const formatBoundary = (boundary) =>
        Number.isInteger(boundary) ? boundary : boundary.toFixed(2);

      errors.push(
        `Le champ ${label} doit être compris entre ${formatBoundary(minDisplay)} et ${formatBoundary(
          maxDisplay
        )}${suffix}.`
      );

      return undefined;
    }

    return resolved;
  };

  const leadTimeDays = normalizeNumber(form.leadTimeDays, 'délai (jours)', { min: 0 });
  const onTimeRate = normalizeNumber(form.onTimeRate, 'ponctualité (%)', {
    min: 0,
    max: 1,
    allowPercent: true,
  });
  const pricePerKm = normalizeNumber(form.pricePerKm, 'prix / km', { min: 0 });
  const baseHandlingFee = normalizeNumber(form.baseHandlingFee, 'frais fixes', { min: 0 });
  const minShipmentKg = normalizeNumber(form.minShipmentKg, 'poids minimal', { min: 0 });
  const co2GramsPerTonneKm = normalizeNumber(form.co2GramsPerTonneKm, 'CO₂', { min: 0 });
  const customerSatisfaction = normalizeNumber(form.customerSatisfaction, 'satisfaction', {
    min: 0,
    max: 5,
  });

  const notes = form.notes.trim();

  const payload = {
    name,
    description,
    modes,
    coverage,
    regions,
    serviceCapabilities,
    certifications,
    leadTimeDays,
    onTimeRate,
    pricePerKm,
    baseHandlingFee,
    minShipmentKg,
    co2GramsPerTonneKm,
    customerSatisfaction,
    contractFlexibility,
    notes,
  };

  return { errors, payload };
};

const providerToAdminForm = (provider) => ({
  name: provider.name || '',
  description: provider.description || '',
  modes: Array.isArray(provider.modes) ? provider.modes.join(', ') : '',
  coverage: provider.coverage || 'domestic',
  regions: Array.isArray(provider.regions) ? provider.regions.join(', ') : '',
  serviceCapabilities: Array.isArray(provider.serviceCapabilities)
    ? provider.serviceCapabilities.join(', ')
    : '',
  certifications: Array.isArray(provider.certifications)
    ? provider.certifications.join(', ')
    : '',
  leadTimeDays:
    provider.leadTimeDays === undefined || provider.leadTimeDays === null
      ? ''
      : String(provider.leadTimeDays),
  onTimeRate:
    provider.onTimeRate === undefined || provider.onTimeRate === null
      ? ''
      : String((provider.onTimeRate * 100).toFixed(0)),
  pricePerKm:
    provider.pricePerKm === undefined || provider.pricePerKm === null
      ? ''
      : String(provider.pricePerKm),
  baseHandlingFee:
    provider.baseHandlingFee === undefined || provider.baseHandlingFee === null
      ? ''
      : String(provider.baseHandlingFee),
  minShipmentKg:
    provider.minShipmentKg === undefined || provider.minShipmentKg === null
      ? ''
      : String(provider.minShipmentKg),
  co2GramsPerTonneKm:
    provider.co2GramsPerTonneKm === undefined || provider.co2GramsPerTonneKm === null
      ? ''
      : String(provider.co2GramsPerTonneKm),
  customerSatisfaction:
    provider.customerSatisfaction === undefined || provider.customerSatisfaction === null
      ? ''
      : String(provider.customerSatisfaction),
  contractFlexibility: provider.contractFlexibility || 'spot',
  notes: provider.notes || '',
});

const Dashboard = ({ user, onLogout, onLoginRequest }) => {
  const isAdmin = Boolean(user?.roles?.includes('admin'));
  const displayName = user?.displayName || user?.id || (isAdmin ? 'Administrateur' : 'Invité');
  const [formState, setFormState] = useState(() => createEmptyFilters());
  const [filters, setFilters] = useState(() => createEmptyFilters());
  const [sorting, setSorting] = useState({ sortBy: 'score', sortOrder: 'desc' });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 7 });
  const [providers, setProviders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminForm, setAdminForm] = useState(() => createEmptyAdminForm());
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [adminStatus, setAdminStatus] = useState({ submitting: false, error: '', success: '' });
  const adminFormRef = useRef(null);
  const [availableFilters, setAvailableFilters] = useState({
    deliveryDepartments: [],
    pickupDepartments: [],
    features: [],
  });

  const featureGroups = useMemo(() => {
    const defaultFeatures = FEATURE_GROUP_DEFINITIONS.flatMap((group) => group.keys);
    const sourceFeatures = availableFilters.features?.length
      ? Array.from(new Set([...availableFilters.features, ...defaultFeatures]))
      : defaultFeatures;

    const groupEntries = FEATURE_GROUP_DEFINITIONS.map((group) => ({
      label: group.label,
      options: group.keys
        .filter((key) => sourceFeatures.includes(key))
        .map((value) => ({ value, label: getFeatureLabel(value) }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    }));

    const usedKeys = new Set(groupEntries.flatMap((group) => group.options.map((option) => option.value)));
    const leftovers = sourceFeatures
      .filter((value) => !usedKeys.has(value))
      .map((value) => ({ value, label: getFeatureLabel(value) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

    const finalGroups = groupEntries.filter((group) => group.options.length > 0);
    if (leftovers.length > 0) {
      finalGroups.push({ label: 'Autres options', options: leftovers });
    }

    return finalGroups;
  }, [availableFilters.features]);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError('');

    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      sortBy: sorting.sortBy,
      sortOrder: sorting.sortOrder,
    };

    if (filters.q) params.q = filters.q;
    if (filters.modes.length) params.modes = filters.modes.join(',');
    if (filters.coverage.length) params.coverage = filters.coverage.join(',');
    if (filters.regions.length) params.regions = filters.regions.join(',');
    if (filters.contractFlexibility.length)
      params.contractFlexibility = filters.contractFlexibility.join(',');
    if (filters.features.length) params.features = filters.features.join(',');
    if (filters.deliveryDepartments.length) {
      params.deliveryDepartments = filters.deliveryDepartments.join(',');
    }
    if (filters.pickupDepartments.length) {
      params.pickupDepartments = filters.pickupDepartments.join(',');
    }

    const minRatingValue = sanitizeNumber(filters.minRating);
    if (minRatingValue !== undefined) {
      params.minRating = minRatingValue;
    }

    const minOnTimeRateValue = sanitizeNumber(filters.minOnTimeRate);
    if (minOnTimeRateValue !== undefined) {
      params.minOnTimeRate = minOnTimeRateValue / 100;
    }

    const maxLeadTimeValue = sanitizeNumber(filters.maxLeadTime);
    if (maxLeadTimeValue !== undefined) {
      params.maxLeadTime = maxLeadTimeValue;
    }

    const maxCo2Value = sanitizeNumber(filters.maxCo2);
    if (maxCo2Value !== undefined) {
      params.maxCo2 = maxCo2Value;
    }

    const maxPriceValue = sanitizeNumber(filters.maxPrice);
    if (maxPriceValue !== undefined) {
      params.maxPrice = maxPriceValue;
    }

    const weightValue = sanitizeNumber(filters.weightKg);
    if (weightValue !== undefined) {
      params.weightKg = weightValue;
    }

    const distanceValue = sanitizeNumber(filters.distanceKm);
    if (distanceValue !== undefined) {
      params.distanceKm = distanceValue;
    }

    if (filters.requireWeightMatch) {
      params.requireWeightMatch = true;
    }

    try {
      const { data } = await apiClient.get('/api/providers', { params });
      const fetchedProviders = data.data || [];
      const providerMap = fetchedProviders.reduce((acc, provider) => {
        acc[provider.id] = provider;
        return acc;
      }, {});

      setProviders(fetchedProviders);
      setMeta(data.meta || null);
      if (data.meta?.availableFilters) {
        setAvailableFilters({
          deliveryDepartments: data.meta.availableFilters.deliveryDepartments || [],
          pickupDepartments: data.meta.availableFilters.pickupDepartments || [],
          features: data.meta.availableFilters.features || [],
        });
      }
      setSelected((prev) => {
        if (!prev || Object.keys(prev).length === 0) {
          return prev;
        }
        const next = {};
        Object.keys(prev).forEach((id) => {
          if (providerMap[id]) {
            next[id] = providerMap[id];
          }
        });
        return next;
      });
    } catch (err) {
      setError("Impossible de charger les transporteurs. Veuillez réessayer.");
      setProviders([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination, sorting]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setFilters(cloneFilterState(formState));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleReset = () => {
    const empty = createEmptyFilters();
    setFormState(empty);
    setFilters(cloneFilterState(empty));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const updateFormState = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAdminInputChange = (field, value) => {
    setAdminForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setAdminStatus((prev) => ({
      ...prev,
      error: '',
      success: '',
    }));
  };

  const handleAdminReset = () => {
    setAdminForm(createEmptyAdminForm());
    setEditingProviderId(null);
    setAdminStatus({ submitting: false, error: '', success: '' });
    setTimeout(() => {
      adminFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleNavigateToAdmin = useCallback(() => {
    if (isAdmin) {
      adminFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      onLoginRequest?.();
    }
  }, [isAdmin, onLoginRequest]);

  const handleStartEditProvider = (provider) => {
    if (!isAdmin) {
      return;
    }
    setEditingProviderId(provider.id);
    setAdminForm(providerToAdminForm(provider));
    setAdminStatus({ submitting: false, error: '', success: '' });
    setTimeout(() => {
      adminFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleAdminSubmit = async (event) => {
    event.preventDefault();

    if (!isAdmin || adminStatus.submitting) {
      return;
    }

    const { errors: validationErrors, payload } = buildAdminPayload(adminForm);

    if (validationErrors.length > 0) {
      setAdminStatus({ submitting: false, error: validationErrors.join(' '), success: '' });
      return;
    }

    setAdminStatus({ submitting: true, error: '', success: '' });

    try {
      if (editingProviderId) {
        await apiClient.put(`/api/providers/${editingProviderId}`, payload);
        setAdminStatus({ submitting: false, error: '', success: 'Transporteur mis à jour.' });
      } else {
        await apiClient.post('/api/providers', payload);
        setAdminStatus({ submitting: false, error: '', success: 'Transporteur créé.' });
        setAdminForm(createEmptyAdminForm());
      }
      await fetchProviders();
    } catch (err) {
      const message =
        err.response?.data?.error ||
        "Impossible d'enregistrer le transporteur. Vérifiez les données saisies.";
      setAdminStatus({ submitting: false, error: message, success: '' });
    }
  };

  const handleDeleteProvider = async (provider) => {
    if (!isAdmin || adminStatus.submitting) {
      return;
    }

    const confirmed = window.confirm(`Supprimer le transporteur "${provider.name}" ?`);
    if (!confirmed) {
      return;
    }

    setAdminStatus({ submitting: true, error: '', success: '' });

    try {
      await apiClient.delete(`/api/providers/${provider.id}`);
      setAdminStatus({ submitting: false, error: '', success: 'Transporteur supprimé.' });
      if (editingProviderId === provider.id) {
        setEditingProviderId(null);
        setAdminForm(createEmptyAdminForm());
      }
      await fetchProviders();
    } catch (err) {
      const message =
        err.response?.data?.error || 'Impossible de supprimer le transporteur sélectionné.';
      setAdminStatus({ submitting: false, error: message, success: '' });
    }
  };

  const handleSelectProvider = (provider) => {
    setSelected((prev) => {
      if (prev[provider.id]) {
        const next = { ...prev };
        delete next[provider.id];
        return next;
      }
      if (Object.keys(prev).length >= 3) {
        // Garder seulement 3 transporteurs pour la comparaison.
        const remainingIds = Object.keys(prev).slice(1);
        const trimmed = remainingIds.reduce(
          (acc, key) => ({
            ...acc,
            [key]: prev[key],
          }),
          {}
        );
        return { ...trimmed, [provider.id]: provider };
      }
      return { ...prev, [provider.id]: provider };
    });
  };

  const goToPage = (direction) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, prev.page + direction),
    }));
  };

  const comparisonList = useMemo(() => Object.values(selected), [selected]);

  const activeFilters = useMemo(() => {
    const badges = [];
    if (filters.q) badges.push({ label: `Recherche: ${filters.q}` });
    if (filters.modes.length) badges.push({ label: `Modes: ${filters.modes.join(', ')}` });
    if (filters.coverage.length)
      badges.push({ label: `Couverture: ${filters.coverage.join(', ')}` });
    if (filters.regions.length) badges.push({ label: `Régions: ${filters.regions.join(', ')}` });
    if (filters.contractFlexibility.length)
      badges.push({ label: `Contrats: ${filters.contractFlexibility.join(', ')}` });
    if (filters.features.length)
      badges.push({ label: `Équipements: ${filters.features.map(getFeatureLabel).join(', ')}` });
    if (filters.minRating) badges.push({ label: `Satisfaction ≥ ${filters.minRating}` });
    if (filters.minOnTimeRate)
      badges.push({ label: `Ponctualité ≥ ${filters.minOnTimeRate}%` });
    if (filters.maxLeadTime) badges.push({ label: `Délai ≤ ${filters.maxLeadTime} j` });
    if (filters.maxCo2) badges.push({ label: `CO₂ ≤ ${filters.maxCo2}` });
    if (filters.maxPrice) badges.push({ label: `Prix ≤ ${filters.maxPrice}` });
    if (filters.distanceKm) badges.push({ label: `Distance: ${filters.distanceKm} km` });
    if (filters.weightKg) badges.push({ label: `Poids: ${filters.weightKg} kg` });
    if (filters.requireWeightMatch) badges.push({ label: 'Respect du poids minimal' });
    if (filters.pickupDepartments.length)
      badges.push({
        label: `Départ: ${filters.pickupDepartments.map(formatDepartmentLabel).join(', ')}`,
      });
    if (filters.deliveryDepartments.length)
      badges.push({
        label: `Arrivée: ${filters.deliveryDepartments.map(formatDepartmentLabel).join(', ')}`,
      });
    return badges;
  }, [filters]);

  const highlightedProvider = comparisonList[0] ?? providers[0] ?? null;

  const summaryInsights = useMemo(() => {
    const dataset = providers.filter(Boolean);
    const providerCount = meta?.total ?? dataset.length;
    const comparisonCount = comparisonList.length;
    const comparisonNames = comparisonList.map((provider) => provider.name);

    if (dataset.length === 0) {
      const requestedDistance = sanitizeNumber(filters.distanceKm);
      return {
        providerCount,
        comparisonCount,
        comparisonNames,
        avgSatisfaction: null,
        avgOnTimeRate: null,
        avgLeadTime: null,
        avgPricePerKm: null,
        avgCo2: null,
        topCoverage: null,
        bestProvider: null,
        computedDistance:
          requestedDistance !== undefined &&
          Number.isFinite(requestedDistance) &&
          requestedDistance > 0
            ? requestedDistance
            : undefined,
      };
    }

    const totals = dataset.reduce(
      (acc, provider) => {
        acc.satisfaction += provider.customerSatisfaction ?? 0;
        acc.onTime += provider.onTimeRate ?? 0;
        acc.leadTime += provider.leadTimeDays ?? 0;
        acc.pricePerKm += provider.pricePerKm ?? 0;
        acc.co2 += provider.co2GramsPerTonneKm ?? 0;
        if (provider.coverage) {
          acc.coverages[provider.coverage] = (acc.coverages[provider.coverage] || 0) + 1;
        }
        if ((provider.score ?? 0) > acc.bestScore) {
          acc.bestScore = provider.score ?? 0;
          acc.bestProvider = provider;
        }
        if (typeof provider.distanceKm === 'number' && Number.isFinite(provider.distanceKm)) {
          acc.distance.total += provider.distanceKm;
          acc.distance.count += 1;
        }
        return acc;
      },
      {
        satisfaction: 0,
        onTime: 0,
        leadTime: 0,
        pricePerKm: 0,
        co2: 0,
        coverages: {},
        bestScore: -Infinity,
        bestProvider: null,
        distance: { total: 0, count: 0 },
      }
    );

    const count = dataset.length;
    const averageDistance =
      totals.distance.count > 0 ? totals.distance.total / totals.distance.count : undefined;
    const requestedDistance = sanitizeNumber(filters.distanceKm);
    const computedDistanceCandidate =
      requestedDistance !== undefined
        ? requestedDistance
        : averageDistance !== undefined
        ? averageDistance
        : 180;

    const normalizedDistance =
      typeof computedDistanceCandidate === 'number' &&
      Number.isFinite(computedDistanceCandidate) &&
      computedDistanceCandidate > 0
        ? computedDistanceCandidate
        : undefined;

    const coverageEntry = Object.entries(totals.coverages).sort((a, b) => b[1] - a[1])[0];

    return {
      providerCount,
      comparisonCount,
      comparisonNames,
      avgSatisfaction: count > 0 ? totals.satisfaction / count : null,
      avgOnTimeRate: count > 0 ? totals.onTime / count : null,
      avgLeadTime: count > 0 ? totals.leadTime / count : null,
      avgPricePerKm: count > 0 ? totals.pricePerKm / count : null,
      avgCo2: count > 0 ? totals.co2 / count : null,
      topCoverage: coverageEntry ? coverageEntry[0] : null,
      bestProvider: totals.bestProvider,
      computedDistance: normalizedDistance,
    };
  }, [providers, meta, comparisonList, filters.distanceKm]);

  const coverageLabel = summaryInsights.topCoverage
    ? getCoverageLabel(summaryInsights.topCoverage)
    : null;

  const routeDistanceKm =
    typeof summaryInsights.computedDistance === 'number' &&
    Number.isFinite(summaryInsights.computedDistance) &&
    summaryInsights.computedDistance > 0
      ? summaryInsights.computedDistance
      : undefined;

  const routeDistanceDisplay =
    typeof routeDistanceKm === 'number' ? `${Math.round(routeDistanceKm)} km` : '--';

  const routeEtaDisplay = routeDistanceKm ? formatTravelEta(routeDistanceKm) : '';

  const onTimePercent =
    typeof summaryInsights.avgOnTimeRate === 'number'
      ? Math.round(summaryInsights.avgOnTimeRate * 100)
      : null;


  const routeOptimization = onTimePercent ?? 84;


  const loadFillRate = (() => {
    if (
      typeof summaryInsights.avgPricePerKm !== 'number' ||
      !Number.isFinite(summaryInsights.avgPricePerKm)
    ) {
      return 86;
    }
    const normalized = Math.max(0, Math.min(1, 1 - summaryInsights.avgPricePerKm / 3));
    return Math.round(68 + normalized * 22);
  })();

  const satisfactionSparkline = useMemo(() => {
    const values = providers
      .map((provider) =>
        typeof provider?.customerSatisfaction === 'number'
          ? Math.round((provider.customerSatisfaction / 5) * 100)
          : null
      )
      .filter((value) => value !== null);

    if (values.length === 0) {
      return [48, 55, 60, 52, 68, 74, 80];
    }

    const trimmed = values.slice(0, 7);
    while (trimmed.length < 7) {
      trimmed.push(trimmed[trimmed.length - 1] ?? 60);
    }
    return trimmed;
  }, [providers]);

  const sparklinePath = useMemo(() => {
    if (satisfactionSparkline.length < 2) {
      return '0,60 100,60';
    }
    const step = 100 / (satisfactionSparkline.length - 1);
    return satisfactionSparkline
      .map((value, index) => {
        const x = (step * index).toFixed(1);
        const y = (100 - value).toFixed(1);
        return `${x},${y}`;
      })
      .join(' ');
  }, [satisfactionSparkline]);

  const mapGradientId = useMemo(
    () => `map-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  const alertTimestamp = useMemo(
    () =>
      new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
    []
  );

  const heroStats = [
    {
      title: 'Transporteurs',
      value:
        summaryInsights.providerCount && summaryInsights.providerCount > 0
          ? summaryInsights.providerCount
          : '--',
      helper: coverageLabel
        ? `Couverture dominante: ${coverageLabel}`
        : 'Ajoutez des partenaires pour elargir vos options.',
      sparkline: false,
    },
    {
      title: 'Satisfaction moyenne',
      value:
        typeof summaryInsights.avgSatisfaction === 'number'
          ? summaryInsights.avgSatisfaction.toFixed(1)
          : '--',
      suffix: typeof summaryInsights.avgSatisfaction === 'number' ? '/5' : '',
      helper:
        onTimePercent !== null
          ? `Ponctualite moyenne ${onTimePercent}%`
          : 'Collectez plus de retours clients.',
      sparkline: false,
    },
    {
      title: 'Delai moyen',
      value:
        typeof summaryInsights.avgLeadTime === 'number' &&
        Number.isFinite(summaryInsights.avgLeadTime)
          ? `${Math.round(summaryInsights.avgLeadTime)} j`
          : '--',
      helper:
        typeof summaryInsights.avgLeadTime === 'number'
          ? 'Base sur les transporteurs selectionnes.'
          : 'Completez les SLA pour affiner le suivi.',
      sparkline: false,
    },
    {
      title: 'Empreinte CO2',
      value:
        typeof summaryInsights.avgCo2 === 'number' && Number.isFinite(summaryInsights.avgCo2)
          ? `${Math.round(summaryInsights.avgCo2)} g/t.km`
          : '--',
      helper:
        typeof summaryInsights.avgPricePerKm === 'number'
          ? `Tarif moyen ${summaryInsights.avgPricePerKm.toFixed(2)} €/km`
          : 'Ajoutez les tarifs pour comparer les couts.',
      sparkline: true,
    },
  ];

  const comparisonSummaryText =
    summaryInsights.comparisonCount > 0
      ? `${summaryInsights.comparisonCount} transporteur(s) prets pour la comparaison.`
      : "Selectionnez jusqu'a trois transporteurs a comparer.";

  const pickupPreview = highlightedProvider
    ? formatDepartmentList(highlightedProvider.profile?.pickupDepartments || [], 3)
    : 'N/A';

  const deliveryPreview = highlightedProvider
    ? formatDepartmentList(highlightedProvider.profile?.deliveryDepartments || [], 3)
    : 'N/A';

  const highlightedLocation =
    highlightedProvider?.profile?.city ||
    highlightedProvider?.profile?.address ||
    highlightedProvider?.name ||
    '--';

  const highlightedModes =
    Array.isArray(highlightedProvider?.modes) && highlightedProvider.modes.length > 0
      ? highlightedProvider.modes.map(getModeLabel).join(', ')
      : '--';

  const highlightedScore =
    typeof highlightedProvider?.score === 'number'
      ? highlightedProvider.score.toFixed(0)
      : '--';


  const bestProviderLeadTime =
    summaryInsights.bestProvider?.leadTimeDays !== undefined &&
    summaryInsights.bestProvider?.leadTimeDays !== null
      ? `${summaryInsights.bestProvider.leadTimeDays} j`
      : '--';

  const bestProviderContact =
    summaryInsights.bestProvider?.profile?.contact ||
    summaryInsights.bestProvider?.profile?.phone ||
    'NC';

  const truckLoadRate = Math.max(0, Math.min(100, loadFillRate));
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-card sidebar-greeting">
          <div className="sidebar-avatar">{(displayName || '?').slice(0, 1).toUpperCase()}</div>
          <div className="sidebar-profile">
            <p className="sidebar-title">Bonjour, {displayName}</p>
            <p className="sidebar-subtitle">
              {isAdmin
                ? 'Pilotez vos partenaires et optimisez vos flux.'
                : 'Comparez vos transporteurs et identifiez les meilleures options.'}
            </p>
          </div>
          <div className="sidebar-account">
            <span className={`sidebar-badge ${isAdmin ? 'is-admin' : ''}`}>
              {isAdmin ? 'Admin' : 'Invite'}
            </span>
            {isAdmin ? (
              <button type="button" onClick={() => onLogout?.()}>Se deconnecter</button>
            ) : (
              <button type="button" onClick={() => onLoginRequest?.()}>Connexion</button>
            )}
          </div>
        </div>
        <nav className="sidebar-nav">
          <button type="button" className="nav-item nav-item-active">Tableau de bord</button>
          <button type="button" className="nav-item">Transporteurs</button>
          <button type="button" className="nav-item">Analyses</button>
          <button type="button" className="nav-item">Notifications</button>
        </nav>
        <div className="sidebar-card sidebar-filters">
          <div className="sidebar-card-header">
            <h3>Filtres actifs</h3>
            <span className="sidebar-chip">{activeFilters.length}</span>
          </div>
          {activeFilters.length > 0 ? (
            <ul>
              {activeFilters.slice(0, 6).map((badge) => (
                <li key={badge.label}>{badge.label}</li>
              ))}
            </ul>
          ) : (
            <p>Aucun filtre applique. Utilisez le panneau principal pour affiner la recherche.</p>
          )}
        </div>
        <div className="sidebar-card sidebar-comparison">
          <div className="sidebar-card-header">
            <h3>Comparaison</h3>
            <span className="sidebar-chip">
              {summaryInsights.comparisonCount > 0 ? summaryInsights.comparisonCount : 0}/3
            </span>
          </div>
          <p>{comparisonSummaryText}</p>
          {summaryInsights.comparisonNames.length > 0 && (
            <ul>
              {summaryInsights.comparisonNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="sidebar-action" onClick={handleNavigateToAdmin}>
          {isAdmin ? 'Nouveau transporteur' : 'Connexion admin'}
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <h1>Comparateur de transporteurs</h1>
            <p>
              Suivez vos transporteurs internes, optimisez les trajets et controlez les SLA en temps reel.
            </p>
          </div>
          <div className="topbar-actions">
            <label className="topbar-search">
              <input
                type="search"
                placeholder="Rechercher un transporteur..."
                value={formState.q}
                onChange={(event) => updateFormState('q', event.target.value)}
              />
            </label>
            <div className="topbar-metrics">
              <span>
                <strong>{providers.length}</strong>
                <small>Resultats</small>
              </span>
              <span>
                <strong>{summaryInsights.providerCount || providers.length}</strong>
                <small>Catalogue</small>
              </span>
            </div>
          </div>
        </header>

        <section className="dashboard-hero">
          <article className="hero-map-card">
            <header className="hero-map-header">
              <div>
                <h2>Suivi d'itineraire</h2>
                <p>
                  {highlightedProvider
                    ? `Segment pilote: ${highlightedProvider.name}`
                    : 'Selectionnez un transporteur pour afficher le suivi.'}
                </p>
              </div>
              <div className="hero-map-tabs">
                <button type="button" className="hero-tab hero-tab-active">Tracking</button>
                <button type="button" className="hero-tab">Trafic</button>
                <button type="button" className="hero-tab">Optimisation</button>
              </div>
            </header>
            <div className="hero-map-canvas">
              <svg viewBox="0 0 320 140" role="presentation" aria-hidden="true">
                <defs>
                  <linearGradient id={mapGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="320" height="140" rx="18" className="hero-map-surface" />
                <path
                  d="M20 110 C 80 40, 140 40, 200 100 S 300 80, 300 40"
                  fill="none"
                  stroke={`url(#${mapGradientId})`}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="20" cy="110" r="10" className="hero-map-node" />
                <circle cx="160" cy="70" r="10" className="hero-map-node" />
                <circle cx="300" cy="40" r="10" className="hero-map-node hero-map-node-active" />
              </svg>
            </div>
            <div className="hero-map-meta">
              <div>
                <span>Distance restante</span>
                <strong>
                  {routeEtaDisplay ? `${routeDistanceDisplay} / ${routeEtaDisplay}` : routeDistanceDisplay}
                </strong>
              </div>
              <div>
                <span>Optimisation</span>
                <strong>{routeOptimization}%</strong>
                <small>Traffic et itineraire optimises</small>
              </div>
              <div>
                <span>Alerte geofencing</span>
                <strong>{highlightedLocation}</strong>
                <small>{alertTimestamp}</small>
              </div>
            </div>
            <footer className="hero-map-footer">
              <div>
                <span>Depart</span>
                <strong>{pickupPreview}</strong>
              </div>
              <div>
                <span>Arrivee</span>
                <strong>{deliveryPreview}</strong>
              </div>
              <div>
                <span>Modes</span>
                <strong>{highlightedModes}</strong>
              </div>
            </footer>
          </article>

          <div className="hero-stats-grid">
            {heroStats.map((stat) => (
              <article key={stat.title} className="hero-stat-card">
                <div className="hero-stat-header">
                  <span>{stat.title}</span>
                </div>
                <div className="hero-stat-value">
                  <strong>{stat.value}</strong>
                  {stat.suffix && <span>{stat.suffix}</span>}
                </div>
                <p>{stat.helper}</p>
                {stat.sparkline && (
                  <svg
                    className="hero-stat-sparkline"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      points={sparklinePath}
                    />
                  </svg>
                )}
              </article>
            ))}
          </div>
        </section>

        <div className="dashboard-main-grid">
      <section className="filters-card panel">
        <form onSubmit={handleSubmit} className="filters-form">
          <div className="filters-row">
            <label className="filters-field">
              <span>Recherche libre</span>
              <input
                type="text"
                value={formState.q}
                placeholder="Nom, spécialité, note..."
                onChange={(event) => updateFormState('q', event.target.value)}
              />
            </label>
            <label className="filters-field">
              <span>Distance (km)</span>
              <input
                type="number"
                min="0"
                value={formState.distanceKm}
                onChange={(event) => updateFormState('distanceKm', event.target.value)}
              />
            </label>
            <label className="filters-field">
              <span>Poids (kg)</span>
              <input
                type="number"
                min="0"
                value={formState.weightKg}
                onChange={(event) => updateFormState('weightKg', event.target.value)}
              />
            </label>
            <label className="filters-field">
              <span>Prix max (€)</span>
              <input
                type="number"
                min="0"
                value={formState.maxPrice}
                onChange={(event) => updateFormState('maxPrice', event.target.value)}
              />
            </label>
            <label className="filters-field">
              <span>Satisfaction min</span>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formState.minRating}
                onChange={(event) => updateFormState('minRating', event.target.value)}
              />
            </label>
            <label className="filters-field">
              <span>Ponctualité min (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={formState.minOnTimeRate}
                onChange={(event) => updateFormState('minOnTimeRate', event.target.value)}
              />
            </label>
            <label className="filters-field">
              <span>Délai max (jours)</span>
              <input
                type="number"
                min="0"
                value={formState.maxLeadTime}
                onChange={(event) => updateFormState('maxLeadTime', event.target.value)}
              />
            </label>
            <label className="filters-field">
              <span>CO₂ max</span>
              <input
                type="number"
                min="0"
                value={formState.maxCo2}
                onChange={(event) => updateFormState('maxCo2', event.target.value)}
              />
            </label>
          </div>

          <div className="filters-tags">
            <fieldset>
              <legend>Modes</legend>
              <div className="chip-group">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`chip ${formState.modes.includes(option.value) ? 'chip-active' : ''}`}
                    onClick={() =>
                      updateFormState('modes', toggleItem(formState.modes, option.value))
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Couverture</legend>
              <div className="chip-group">
                {COVERAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`chip ${
                      formState.coverage.includes(option.value) ? 'chip-active' : ''
                    }`}
                    onClick={() =>
                      updateFormState('coverage', toggleItem(formState.coverage, option.value))
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Régions desservies</legend>
              <div className="chip-group">
                {REGION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`chip ${
                      formState.regions.includes(option.value) ? 'chip-active' : ''
                    }`}
                    onClick={() =>
                      updateFormState('regions', toggleItem(formState.regions, option.value))
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {featureGroups.map((group) => (
              <fieldset key={group.label}>
                <legend>{group.label}</legend>
                <div className="chip-group">
                  {group.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`chip ${
                        formState.features.includes(option.value) ? 'chip-active' : ''
                      }`}
                      onClick={() =>
                        updateFormState('features', toggleItem(formState.features, option.value))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}

            {availableFilters.pickupDepartments.length > 0 && (
              <fieldset>
                <legend>Départ (chargement)</legend>
                <div className="chip-group">
                  {availableFilters.pickupDepartments.map((dept) => (
                    <button
                      key={`pickup-${dept}`}
                      type="button"
                      className={`chip ${
                        formState.pickupDepartments.includes(dept) ? 'chip-active' : ''
                      }`}
                      onClick={() =>
                        updateFormState('pickupDepartments', toggleItem(formState.pickupDepartments, dept))
                      }
                    >
                      {formatDepartmentLabel(dept)}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {availableFilters.deliveryDepartments.length > 0 && (
              <fieldset>
                <legend>Arrivée (livraison)</legend>
                <div className="chip-group">
                  {availableFilters.deliveryDepartments.map((dept) => (
                    <button
                      key={`delivery-${dept}`}
                      type="button"
                      className={`chip ${
                        formState.deliveryDepartments.includes(dept) ? 'chip-active' : ''
                      }`}
                      onClick={() =>
                        updateFormState('deliveryDepartments', toggleItem(formState.deliveryDepartments, dept))
                      }
                    >
                      {formatDepartmentLabel(dept)}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset>
              <legend>Contrats</legend>
              <div className="chip-group">
                {FLEXIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`chip ${
                      formState.contractFlexibility.includes(option.value) ? 'chip-active' : ''
                    }`}
                    onClick={() =>
                      updateFormState(
                        'contractFlexibility',
                        toggleItem(formState.contractFlexibility, option.value)
                      )
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="filters-bottom-row">
            <label className="filters-checkbox">
              <input
                type="checkbox"
                checked={formState.requireWeightMatch}
                onChange={(event) => updateFormState('requireWeightMatch', event.target.checked)}
              />
              Respect strict du poids minimal
            </label>
            <div className="filters-actions">
              <button type="button" className="button-secondary" onClick={handleReset}>
                Réinitialiser
              </button>
              <button type="submit" className="button-primary">
                Rechercher
              </button>
            </div>
          </div>
        </form>
              </section>
      <section className="results-card panel">
        <header className="results-header">
          <div>
            <h2>Resultats</h2>
            {meta ? (
              <p>
                {meta.total} transporteurs correspondants a page {meta.page}/{meta.totalPages}
              </p>
            ) : (
              <p>Affichez les transporteurs correspondant a vos criteres.</p>
            )}
          </div>
          <div className="results-controls">
            <label>
              Tri
              <select
                value={sorting.sortBy}
                onChange={(event) => setSorting((prev) => ({ ...prev, sortBy: event.target.value }))}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ordre
              <select
                value={sorting.sortOrder}
                onChange={(event) =>
                  setSorting((prev) => ({ ...prev, sortOrder: event.target.value }))
                }
              >
                <option value="desc">Decroissant</option>
                <option value="asc">Croissant</option>
              </select>
            </label>
          </div>
        </header>

        {error && <div className="results-error">{error}</div>}

        <div className="results-table">
          <div className="results-head">
            <span>Transporteur</span>
            <span>Score</span>
            <span>Satisfaction</span>
            <span>Ponctualite</span>
            <span>Prix / km</span>
            <span>Cost estime</span>
            <span>Delai</span>
            <span>CO2</span>
            <span />
          </div>

          {loading ? (
            <div className="results-loading">Chargement des options...</div>
          ) : providers.length === 0 ? (
            <div className="results-empty">
              Aucun transporteur ne correspond aux criteres selectionnes.
            </div>
          ) : (
            providers.map((provider) => {
              const isSelected = Boolean(selected[provider.id]);
              const isEditing = editingProviderId === provider.id;
              const featureList =
                provider.profile?.features?.length > 0
                  ? provider.profile.features
                  : provider.serviceCapabilities || [];

              return (
                <div
                  key={provider.id}
                  className={`results-row ${isSelected ? 'row-selected' : ''} ${
                    isEditing ? 'row-editing' : ''
                  }`}
                >
                  <div className="results-main">
                    <strong>{provider.name}</strong>
                    <p>{provider.description}</p>

                    <div className="results-contact">
                      {provider.profile?.address && <span>{provider.profile.address}</span>}
                      {(provider.profile?.postalCode || provider.profile?.city) && (
                        <span>
                          {[provider.profile?.postalCode, provider.profile?.city]
                            .filter(Boolean)
                            .join(' ')}
                        </span>
                      )}
                      {provider.profile?.contact && (
                        <span>Contact : {provider.profile.contact}</span>
                      )}
                      {provider.profile?.phone && <span>Tel : {provider.profile.phone}</span>}
                      {provider.profile?.unreachable && (
                        <span className="status-warning">Ne repond pas</span>
                      )}
                    </div>

                    <div className="results-tags">
                      {provider.modes.map((mode) => (
                        <span key={`${provider.id}-${mode}`} className="tag">
                          {getModeLabel(mode)}
                        </span>
                      ))}
                      <span className="tag tag-light">{getCoverageLabel(provider.coverage)}</span>
                    </div>

                    <div className="results-departments">
                      <span>
                        Livraison : {formatDepartmentList(provider.profile?.deliveryDepartments || [])}
                      </span>
                      <span>
                        Chargement : {formatDepartmentList(provider.profile?.pickupDepartments || [])}
                      </span>
                    </div>

                    <div className="results-capabilities">
                      {featureList.slice(0, 6).map((capability) => (
                        <span key={`${provider.id}-${capability}`} className="capability">
                          {getFeatureLabel(capability)}
                        </span>
                      ))}
                      {featureList.length === 0 && <span className="capability">--</span>}
                      {featureList.length > 6 && (
                        <span className="capability">+{featureList.length - 6}</span>
                      )}
                    </div>
                  </div>

                  <span className="results-value" data-label="Score">
                    {provider.score?.toFixed(0)}
                  </span>
                  <span className="results-value" data-label="Satisfaction">
                    {provider.customerSatisfaction?.toFixed(1)}/5
                  </span>
                  <span className="results-value" data-label="Ponctualite">
                    {formatPercent(provider.onTimeRate)}
                  </span>
                  <span className="results-value" data-label="Prix / km">
                    {provider.pricePerKm?.toFixed(2)} €/km
                  </span>
                  <span className="results-value" data-label="Cost estime">
                    {formatDistanceCost(provider.estimatedCost)}
                  </span>
                  <span className="results-value" data-label="Delai">
                    {provider.leadTimeDays} j
                  </span>
                  <span className="results-value" data-label="CO2">
                    {provider.co2GramsPerTonneKm} g
                  </span>

                  <div className="results-actions">
                    <button type="button" onClick={() => handleSelectProvider(provider)}>
                      {isSelected ? 'Retirer' : 'Comparer'}
                    </button>
                    {isAdmin && (
                      <div className="results-admin-buttons">
                        <button type="button" onClick={() => handleStartEditProvider(provider)}>
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDeleteProvider(provider)}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="results-footer">
          <div className="results-pagination">
            <button
              type="button"
              disabled={!meta?.hasPreviousPage}
              onClick={() => goToPage(-1)}
            >
              Precedent
            </button>
            <button type="button" disabled={!meta?.hasNextPage} onClick={() => goToPage(1)}>
              Suivant
            </button>
          </div>
          <label>
            Resultats / page
            <select
              value={pagination.pageSize}
              onChange={(event) =>
                setPagination({ page: 1, pageSize: Number(event.target.value) })
              }
            >
              {[5, 7, 10, 15].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </footer>
      </section>
        </div>
      </main>

      <aside className="dashboard-rail">
        <section className="rail-card truck-card">
          <header>
            <h3>Capacite camion</h3>
            <span>{truckLoadRate}%</span>
          </header>
          <div className="truck-progress">
            <div className="truck-progress-fill" style={{ width: `${truckLoadRate}%` }}>
              <span>{truckLoadRate}%</span>
            </div>
          </div>
          <ul>
            <li><span>Transporteur</span><strong>{highlightedProvider?.name || '--'}</strong></li>
            <li><span>Score</span><strong>{highlightedScore}</strong></li>
            <li><span>Delai de reference</span><strong>{bestProviderLeadTime}</strong></li>
            <li><span>Contact</span><strong>{bestProviderContact}</strong></li>
          </ul>
        </section>


        {isAdmin && (
          <section className="admin-card" ref={adminFormRef}>
            <header className="admin-header">
              <div>
                <h2>{editingProviderId ? 'Modifier un transporteur' : 'Nouveau transporteur'}</h2>
                <p>
                  {editingProviderId
                    ? 'Mettez a jour les informations du transporteur selectionne ci-dessus.'
                    : 'Ajoutez un nouveau partenaire a partir de vos donnees internes.'}
                </p>
              </div>
              {editingProviderId && (
                <button
                  type="button"
                  className="admin-reset"
                  onClick={handleAdminReset}
                  disabled={adminStatus.submitting}
                >
                  Nouvelle fiche
                </button>
              )}
            </header>

            {adminStatus.error && (
              <div className="admin-alert admin-alert-error">{adminStatus.error}</div>
            )}
            {adminStatus.success && (
              <div className="admin-alert admin-alert-success">{adminStatus.success}</div>
            )}

            <form className="admin-form" onSubmit={handleAdminSubmit}>
              <div className="admin-form-grid">
                <label className="admin-field">
                  <span>Nom *</span>
                  <input
                    type="text"
                    value={adminForm.name}
                    onChange={(event) => handleAdminInputChange('name', event.target.value)}
                    placeholder="Ex : Euro Fastline"
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field admin-field-full">
                  <span>Description *</span>
                  <textarea
                    rows={3}
                    value={adminForm.description}
                    onChange={(event) => handleAdminInputChange('description', event.target.value)}
                    placeholder="Promesse de service, differenciants..."
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field">
                  <span>Modes *</span>
                  <input
                    type="text"
                    value={adminForm.modes}
                    onChange={(event) => handleAdminInputChange('modes', event.target.value)}
                    placeholder="road, air..."
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field">
                  <span>Couverture *</span>
                  <select
                    value={adminForm.coverage}
                    onChange={(event) => handleAdminInputChange('coverage', event.target.value)}
                    disabled={adminStatus.submitting}
                  >
                    {COVERAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  <span>Regions *</span>
                  <input
                    type="text"
                    value={adminForm.regions}
                    onChange={(event) => handleAdminInputChange('regions', event.target.value)}
                    placeholder="FR, DE, EU..."
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field">
                  <span>Services *</span>
                  <input
                    type="text"
                    value={adminForm.serviceCapabilities}
                    onChange={(event) => handleAdminInputChange('serviceCapabilities', event.target.value)}
                    placeholder="last-mile, tracking..."
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field">
                  <span>Certifications *</span>
                  <input
                    type="text"
                    value={adminForm.certifications}
                    onChange={(event) => handleAdminInputChange('certifications', event.target.value)}
                    placeholder="ISO 9001, ISO 27001..."
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field">
                  <span>Contrat *</span>
                  <select
                    value={adminForm.contractFlexibility}
                    onChange={(event) => handleAdminInputChange('contractFlexibility', event.target.value)}
                    disabled={adminStatus.submitting}
                  >
                    {FLEXIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  <span>Delai (jours) *</span>
                  <input
                    type="number"
                    min="0"
                    value={adminForm.leadTimeDays}
                    onChange={(event) => handleAdminInputChange('leadTimeDays', event.target.value)}
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field">
                  <span>Ponctualite (%) *</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={adminForm.onTimeRate}
                    onChange={(event) => handleAdminInputChange('onTimeRate', event.target.value)}
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field">
                  <span>Prix / km (EUR) *</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adminForm.pricePerKm}
                    onChange={(event) => handleAdminInputChange('pricePerKm', event.target.value)}
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field">
                  <span>Frais fixes (EUR)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={adminForm.baseHandlingFee}
                    onChange={(event) => handleAdminInputChange('baseHandlingFee', event.target.value)}
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field">
                  <span>Poids minimal (kg) *</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={adminForm.minShipmentKg}
                    onChange={(event) => handleAdminInputChange('minShipmentKg', event.target.value)}
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field">
                  <span>CO2 (g/t.km) *</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={adminForm.co2GramsPerTonneKm}
                    onChange={(event) => handleAdminInputChange('co2GramsPerTonneKm', event.target.value)}
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field">
                  <span>Satisfaction (sur 5) *</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={adminForm.customerSatisfaction}
                    onChange={(event) => handleAdminInputChange('customerSatisfaction', event.target.value)}
                    disabled={adminStatus.submitting}
                  />
                </label>

                <label className="admin-field admin-field-full">
                  <span>Notes internes</span>
                  <textarea
                    rows={2}
                    value={adminForm.notes}
                    onChange={(event) => handleAdminInputChange('notes', event.target.value)}
                    placeholder="SLA specifiques, clauses contractuelles, alertes..."
                    disabled={adminStatus.submitting}
                  />
                </label>
              </div>

              <div className="admin-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={handleAdminReset}
                  disabled={adminStatus.submitting}
                >
                  Reinitialiser
                </button>
                <button type="submit" className="button-primary" disabled={adminStatus.submitting}>
                  {editingProviderId ? 'Enregistrer les modifications' : 'Creer le transporteur'}
                </button>
              </div>
              <p className="admin-hint">
                Separez les valeurs multiples (modes, regions, certifications) par des virgules.
              </p>
            </form>
          </section>
        )}


      <section className="comparison-card">
        <header>
          <h2>Comparaison</h2>
          <p>
            Sélectionnez jusqu’à trois transporteurs pour comparer les SLA, les coûts estimés et
            l’impact environnemental.
          </p>
        </header>

        {comparisonList.length === 0 ? (
          <div className="comparison-empty">
            Choisissez des transporteurs dans la liste pour voir la comparaison détaillée.
          </div>
        ) : (
          <div className="comparison-grid">
            {comparisonList.map((provider) => (
              <article key={provider.id} className="comparison-column">
                <div className="comparison-header">
                  <h3>{provider.name}</h3>
                  <button type="button" onClick={() => handleSelectProvider(provider)}>
                    Retirer
                  </button>
                </div>
                {provider.profile?.address && (
                  <p className="comparison-address">{provider.profile.address}</p>
                )}
                <ul>
                  <li>
                    <strong>Score</strong>
                    <span>{provider.score?.toFixed(0)}</span>
                  </li>
                  <li>
                    <strong>Satisfaction</strong>
                    <span>{provider.customerSatisfaction?.toFixed(1)}/5</span>
                  </li>
                  <li>
                    <strong>Ponctualité</strong>
                    <span>{formatPercent(provider.onTimeRate)}</span>
                  </li>
                  <li>
                    <strong>Délai</strong>
                    <span>{provider.leadTimeDays} jours</span>
                  </li>
                  <li>
                    <strong>Ville</strong>
                    <span>
                      {[provider.profile?.postalCode, provider.profile?.city]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </span>
                  </li>
                  <li>
                    <strong>Contact</strong>
                    <span>{provider.profile?.contact || '—'}</span>
                  </li>
                  <li>
                    <strong>Téléphone</strong>
                    <span>{provider.profile?.phone || '—'}</span>
                  </li>
                  <li>
                    <strong>Min. expédition</strong>
                    <span>{provider.minShipmentKg} kg</span>
                  </li>
                  <li>
                    <strong>Coût estimé</strong>
                    <span>{formatDistanceCost(provider.estimatedCost)}</span>
                  </li>
                  <li>
                    <strong>Frais fixes</strong>
                    <span>{formatCurrency(provider.baseHandlingFee)}</span>
                  </li>
                  <li>
                    <strong>Prix / km</strong>
                    <span>{provider.pricePerKm?.toFixed(2)} €/km</span>
                  </li>
                  <li>
                    <strong>CO₂</strong>
                    <span>{provider.co2GramsPerTonneKm} g/t.km</span>
                  </li>
                  <li>
                    <strong>Certifications</strong>
                    <span>{provider.certifications.join(', ') || '—'}</span>
                  </li>
                  <li>
                    <strong>Services</strong>
                    <span>
                      {(provider.profile?.features?.length
                        ? provider.profile.features
                        : provider.serviceCapabilities
                      )
                        .map(getFeatureLabel)
                        .join(', ') || '—'}
                    </span>
                  </li>
                  <li>
                    <strong>Livraison</strong>
                    <span>{formatDepartmentList(provider.profile?.deliveryDepartments || [])}</span>
                  </li>
                  <li>
                    <strong>Chargement</strong>
                    <span>{formatDepartmentList(provider.profile?.pickupDepartments || [])}</span>
                  </li>
                  <li>
                    <strong>Notes</strong>
                    <span>{provider.notes}</span>
                  </li>
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      </aside>

    </div>
  );
};

export default Dashboard;
