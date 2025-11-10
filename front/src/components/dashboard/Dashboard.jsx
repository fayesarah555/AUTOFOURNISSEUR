import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './dashboard.css';
import apiClient from '../../utils/apiClient';

const createEmptyFilters = () => ({
  q: '',
  coverage: [],
  features: [],
  minRating: '',
  minOnTimeRate: '',
  maxLeadTime: '',
  maxCo2: '',
  contractFlexibility: [],
  maxPrice: '',
  palletCount: '',
  palletFormat: '',
  palletFormatOption: '',
  palletBaseMeter: '',
  palletMeters: '',
  supplementaryOptions: [],
  weightKg: '',
  distanceKm: '',
  requireWeightMatch: false,
  deliveryDepartments: [],
  pickupDepartments: [],
});

const PALLET_DIMENSION_ORDER = ['80x120', '100x100', '100x120', '120x120', '100x160', '60x80'];



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
  'prise-rdv': 'Prise de RDV',
  'chgt-au-pont': 'Chgt au Pont',
  'matiere-adr': 'Matiere ADR',
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
    keys: ['express', 'adr', 'porte-char', 'convoi-exceptionnel', 'international', 'prise-rdv', 'chgt-au-pont'],
  },
];

const FLEXIBILITY_OPTIONS = [
  { value: 'spot', label: 'Spot' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'annual', label: 'Annuel' },
];

const SUPPLEMENTARY_OPTIONS = [
  { value: 'hayon', label: 'Hayon' },
  { value: 'prise-rdv', label: 'Prise de RDV' },
  { value: 'matiere-adr', label: 'Matiere ADR' },
  { value: 'chgt-au-pont', label: 'Chgt au Pont' },
];

// Départements Ile-de-France pour mise en avant dans les listes
const IDF_DEPARTMENTS = new Set(['75', '77', '78', '91', '92', '93', '94', '95']);



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

// Composant SearchableMultiSelect pour les filtres avec recherche
const SearchableMultiSelect = ({ label, options, selectedValues, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(lowerSearch) || 
      opt.value.toLowerCase().includes(lowerSearch)
    );
  }, [options, searchTerm]);

  const handleToggle = (value) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newValues);
  };

  const selectedLabels = options
    .filter(opt => selectedValues.includes(opt.value))
    .map(opt => opt.label)
    .join(', ');

  const isDisabled = disabled || options.length === 0;

  return (
    <div className={`searchable-select ${isDisabled ? 'searchable-select--disabled' : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className="select-trigger"
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
      >
        <span className="select-label">{label}</span>
        <span className="select-value">
          {selectedValues.length > 0
            ? `${selectedValues.length} sélectionné(s)`
            : placeholder || (isDisabled ? 'Indisponible' : 'Tous')}
        </span>
        <span className={`select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && !isDisabled && (
        <div className="select-dropdown">
          <div className="select-search">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="select-options">
            {filteredOptions.length === 0 ? (
              <div className="select-no-results">Aucun résultat</div>
            ) : (
              filteredOptions.map((option) => (
                <label key={option.value} className="select-option">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={() => handleToggle(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))
            )}
          </div>
          {selectedValues.length > 0 && (
            <div className="select-footer">
              <button
                type="button"
                className="select-clear"
                onClick={() => onChange([])}
              >
                Effacer tout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SearchableSingleSelect = ({
  label,
  options,
  selectedValue,
  onChange,
  placeholder = 'Tous',
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return options;
    }
    const lower = searchTerm.toLowerCase();
    // En mode recherche, on masque les en-têtes de section
    return options.filter(
      (option) =>
        option.__type !== 'header' &&
        (option.label.toLowerCase().includes(lower) || option.value.toLowerCase().includes(lower))
    );
  }, [options, searchTerm]);

  const selectedLabel =
    options.find((option) => option.value === selectedValue)?.label || '';

  const isDisabled = disabled || options.length === 0;

  const handleSelect = (value) => {
    const next = value === selectedValue ? '' : value;
    onChange(next);
    setIsOpen(false);
  };

  return (
    <div
      className={`searchable-select ${isDisabled ? 'searchable-select--disabled' : ''}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className="select-trigger"
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
      >
        <span className="select-label">{label}</span>
        <span className="select-value">
          {selectedLabel || (isDisabled ? 'Indisponible' : placeholder)}
        </span>
        <span className={`select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && !isDisabled && (
        <div className="select-dropdown">
          <div className="select-search">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="select-options">
            {filteredOptions.length === 0 ? (
              <div className="select-no-results">Aucun résultat</div>
            ) : (
              filteredOptions.map((option) =>
                option.__type === 'header' ? (
                  <div key={`${label}-${option.value}`} className="select-section">
                    {option.label}
                  </div>
                ) : (
                  <button
                    type="button"
                    key={`${label}-${option.value}`}
                    className={`select-option-btn${
                      option.value === selectedValue ? ' select-option-btn--active' : ''
                    }`}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                  </button>
                )
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Note: Le reste du code du Dashboard original doit être copié ici
// Je vais créer une version simplifiée qui montre les changements principaux

const Dashboard = ({ user, onLogout, onLoginRequest, isAdmin }) => {
  const isAuthenticated = Boolean(user);
  const displayName = user?.displayName || user?.id || 'Visiteur';

  // ... (garder tous les useState, useEffect, et fonctions du fichier original)
  const [providers, setProviders] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState(createEmptyFilters());
  const [formState, setFormState] = useState(createEmptyFilters());
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estimationDeparture, setEstimationDeparture] = useState('');
  const [estimationArrival, setEstimationArrival] = useState('');
  const [palletFormatInput, setPalletFormatInput] = useState('');
  const [tariffModal, setTariffModal] = useState({
    open: false,
    provider: null,
    url: null,
    type: null,
    error: null,
  });
  const [tariffGridModal, setTariffGridModal] = useState({
    open: false,
    loading: false,
    error: null,
    data: null,
    provider: null,
  });

  // Fonction pour mettre à jour les filtres
  const updateFormState = (key, value) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateRequest = useCallback(() => {
    if (!isAuthenticated) {
      onLoginRequest?.();
      return;
    }

    // TODO: ouvrir le module de création de fournisseur
    console.info('Ouverture du module de création de fournisseur (à implémenter)');
  }, [isAuthenticated, onLoginRequest]);

  const effectivePageSizeOptions = useMemo(() => {
    const base = meta?.pageSizeOptions || [10, 20, 30, 50];
    if (base.includes(pageSize)) {
      return base;
    }
    return [...base, pageSize].sort((a, b) => a - b);
  }, [meta, pageSize]);

  const deliveryDepartmentOptions = useMemo(() => {
    const codes = meta?.availableFilters?.deliveryDepartments || [];
    return codes.map((code) => ({
      value: code,
      label: `${code} - ${FRENCH_DEPARTMENT_NAMES[code] || 'Département ' + code}`,
    }));
  }, [meta]);

  const pickupDepartmentOptions = useMemo(() => {
    const codes = meta?.availableFilters?.pickupDepartments || [];
    return codes.map((code) => ({
      value: code,
      label: `${code} - ${FRENCH_DEPARTMENT_NAMES[code] || 'Département ' + code}`,
    }));
  }, [meta]);

  const departmentOptionsAll = useMemo(() => {
    const map = new Map();
    [...deliveryDepartmentOptions, ...pickupDepartmentOptions].forEach((option) => {
      if (!map.has(option.value)) {
        map.set(option.value, option);
      }
    });
    const all = Array.from(map.values()).sort((a, b) => a.value.localeCompare(b.value));

    const idf = all.filter((opt) => IDF_DEPARTMENTS.has(opt.value));
    const others = all.filter((opt) => !IDF_DEPARTMENTS.has(opt.value));

    const grouped = [];
    if (idf.length) {
      grouped.push({ value: '__hdr_idf', label: 'Départements IDF', __type: 'header' });
      grouped.push(...idf);
    }
    if (others.length) {
      grouped.push({ value: '__hdr_other', label: 'Autres départements', __type: 'header' });
      grouped.push(...others);
    }
    return grouped;
  }, [deliveryDepartmentOptions, pickupDepartmentOptions]);

  const {
    palletFormatGroups,
    palletOptionMap,
    palletBaseMeterMap,
  } = useMemo(() => {
    const rawEntries = Array.isArray(meta?.availableFilters?.palletMeters)
      ? meta.availableFilters.palletMeters
      : [];

    const groupsMap = new Map();
    const optionMap = new Map();

    rawEntries.forEach((entry) => {
      const rawDimension = entry?.dimension || entry?.format || 'Autre format';
      const dimensionLabel = rawDimension?.toString().trim() || 'Autre format';
      const normalizedKey = dimensionLabel.replace(/\s+/g, '').toLowerCase() || dimensionLabel;

      const meterValue = Number(entry?.meter ?? entry?.value);
      const tonnageValue = Number(entry?.tonnage ?? entry?.weight);
      const countValue = Number(entry?.palletCount ?? entry?.count ?? entry?.nombre);

      if (!Number.isFinite(meterValue) || meterValue <= 0 || !Number.isFinite(countValue) || countValue <= 0) {
        return;
      }

      const optionId = `${normalizedKey}__${meterValue.toFixed(3)}__${countValue}`;
      const option = {
        id: optionId,
        dimensionLabel,
        meter: meterValue,
        tonnage: Number.isFinite(tonnageValue) ? tonnageValue : null,
        palletCount: countValue,
      };

      if (!groupsMap.has(normalizedKey)) {
        groupsMap.set(normalizedKey, {
          label: dimensionLabel,
          options: [],
        });
      }
      groupsMap.get(normalizedKey).options.push(option);
      optionMap.set(optionId, option);
    });

    const getDimensionOrder = (label) => {
      const normalized = label.replace(/\s+/g, '').toLowerCase();
      const index = PALLET_DIMENSION_ORDER.indexOf(normalized);
      return index === -1 ? PALLET_DIMENSION_ORDER.length : index;
    };

    const groups = Array.from(groupsMap.values()).map((group) => ({
      ...group,
      options: group.options.sort((a, b) => a.palletCount - b.palletCount || a.meter - b.meter),
    }));
    groups.sort((a, b) => {
      const orderDiff = getDimensionOrder(a.label) - getDimensionOrder(b.label);
      if (orderDiff !== 0) {
        return orderDiff;
      }
      return a.label.localeCompare(b.label, 'fr-FR');
    });

    const baseMap = new Map();
    groups.forEach((group) => {
      const baseOption = group.options.find((option) => option.palletCount === 1) || group.options[0];
      if (baseOption && baseOption.palletCount > 0) {
        baseMap.set(group.label, baseOption.meter / baseOption.palletCount);
      }
    });

    return {
      palletFormatGroups: groups,
      palletOptionMap: optionMap,
      palletBaseMeterMap: baseMap,
    };
  }, [meta]);

  const flattenedPalletOptions = useMemo(
    () => palletFormatGroups.flatMap((group) => group.options),
    [palletFormatGroups]
  );

  const getPalletOptionDisplay = useCallback((option) => {
    const tonnageLabel = Number.isFinite(option.tonnage) ? `${option.tonnage.toFixed(1)} t` : '-- t';
    return `${option.dimensionLabel} • ${option.meter.toFixed(3)} m • ${tonnageLabel} • ${
      option.palletCount
    } palette${option.palletCount > 1 ? 's' : ''}`;
  }, []);

  useEffect(() => {
    if (!formState.palletFormatOption) {
      setPalletFormatInput('');
      return;
    }
    const entry = palletOptionMap.get(formState.palletFormatOption);
    setPalletFormatInput(entry ? getPalletOptionDisplay(entry) : '');
  }, [formState.palletFormatOption, palletOptionMap, getPalletOptionDisplay]);

  const computeMetersFromBase = useCallback((baseMeterValue, countValue) => {
    const baseMeter = Number(baseMeterValue);
    const count = Number(countValue);
    if (!Number.isFinite(baseMeter) || !Number.isFinite(count) || count <= 0) {
      return '';
    }
    return (baseMeter * count).toFixed(3);
  }, []);

  const handlePalletFormatSelection = useCallback(
    (value) => {
      if (!value) {
        setFormState((prev) => ({
          ...prev,
          palletFormatOption: '',
          palletFormat: '',
          palletBaseMeter: '',
          palletCount: '',
          palletMeters: '',
          weightKg: '',
        }));
        setPalletFormatInput('');
        return;
      }

      const entry = palletOptionMap.get(value);
      if (!entry) {
        return;
      }
      const baseUnit = entry.palletCount > 0 ? entry.meter / entry.palletCount : null;
      const weightKg = Number.isFinite(entry.tonnage) ? String(Math.round(entry.tonnage * 1000)) : '';
      setFormState((prev) => ({
        ...prev,
        palletFormatOption: value,
        palletFormat: entry.dimensionLabel,
        palletBaseMeter: baseUnit ? baseUnit.toFixed(4) : '',
        palletCount: String(entry.palletCount),
        palletMeters: entry.meter.toFixed(3),
        weightKg,
      }));
      setPalletFormatInput(getPalletOptionDisplay(entry));
    },
    [palletOptionMap, getPalletOptionDisplay]
  );

  const handlePalletCountChange = useCallback(
    (value) => {
      setFormState((prev) => ({
        ...prev,
        palletCount: value,
        palletFormatOption: '',
        palletMeters: computeMetersFromBase(
          prev.palletBaseMeter || palletBaseMeterMap.get(prev.palletFormat),
          value
        ),
        weightKg: '',
      }));
      setPalletFormatInput('');
    },
    [computeMetersFromBase, palletBaseMeterMap]
  );

  const handlePalletFormatInputChange = useCallback(
    (value) => {
      setPalletFormatInput(value);
      if (!value.trim()) {
        handlePalletFormatSelection('');
        return;
      }
      const normalized = value.trim().toLowerCase();
      const matched = flattenedPalletOptions.find(
        (option) => getPalletOptionDisplay(option).toLowerCase() === normalized
      );
      if (matched) {
        handlePalletFormatSelection(matched.id);
      }
    },
    [flattenedPalletOptions, getPalletOptionDisplay, handlePalletFormatSelection]
  );

  const formattedPalletMetersLabel = useMemo(() => {
    const meters = Number(formState.palletMeters);
    if (!Number.isFinite(meters) || meters <= 0) {
      return '';
    }
    return meters.toLocaleString('fr-FR', {
      minimumFractionDigits: meters >= 1 ? 2 : 3,
      maximumFractionDigits: 3,
    });
  }, [formState.palletMeters]);

  const appliedDistanceKm = useMemo(() => {
    const fromMeta = meta?.estimatedDistanceKm;
    if (typeof fromMeta === 'number' && Number.isFinite(fromMeta)) {
      return fromMeta;
    }
    const value = Number(meta?.appliedFilters?.distanceKm ?? appliedFilters.distanceKm);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }, [meta, appliedFilters.distanceKm]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const formatCurrencyValue = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '--';
    }
    return currencyFormatter.format(value);
  };

  const tariffGridData = tariffGridModal.data;
  const tariffGridPaletteCounts = Array.isArray(tariffGridData?.paletteCounts)
    ? tariffGridData.paletteCounts
    : [];
  const tariffGridRows = Array.isArray(tariffGridData?.rows) ? tariffGridData.rows : [];
  const tariffGridMeta = tariffGridData?.meta || null;
  const tariffGridZoneLabels = tariffGridMeta?.zones || {};
  const hasTariffGridData = tariffGridRows.length > 0 && tariffGridPaletteCounts.length > 0;

  const formattedDistanceLabel = useMemo(() => {
    if (typeof appliedDistanceKm !== 'number' || Number.isNaN(appliedDistanceKm)) {
      return null;
    }

    const minimumFractionDigits = appliedDistanceKm >= 100 ? 0 : 1;
    return `${appliedDistanceKm.toLocaleString('fr-FR', {
      minimumFractionDigits,
      maximumFractionDigits: 1,
    })} km`;
  }, [appliedDistanceKm]);


  const tariffViewerUrl = useMemo(() => {
    if (!tariffModal.open || tariffModal.error || !tariffModal.url) {
      return null;
    }
    if (tariffModal.type === 'local') {
      const separator = tariffModal.url.includes('?') ? '&' : '?';
      return `${tariffModal.url}${separator}inline=1`;
    }
    return tariffModal.url;
  }, [tariffModal.open, tariffModal.error, tariffModal.url, tariffModal.type]);

  const tariffDownloadUrl = useMemo(() => {
    if (!tariffModal.open || tariffModal.error || !tariffModal.url) {
      return null;
    }
    if (tariffModal.type === 'local') {
      const separator = tariffModal.url.includes('?') ? '&' : '?';
      return `${tariffModal.url}${separator}download=1`;
    }
    return tariffModal.url;
  }, [tariffModal.open, tariffModal.error, tariffModal.url, tariffModal.type]);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...formState });
    setPage(1);
  }, [formState]);

  const handleResetFilters = useCallback(() => {
    const empty = createEmptyFilters();
    setFormState(empty);
    setAppliedFilters(empty);
    setPage(1);
    setEstimationDeparture('');
    setEstimationArrival('');
  }, []);

  const handleOpenTariff = useCallback((provider) => {
    if (!provider) {
      return;
    }

    if (!provider.hasTariffDocument) {
      setTariffModal({
        open: true,
        provider,
        url: null,
        type: null,
        error: "Aucune grille tarifaire disponible pour ce transporteur.",
      });
      return;
    }

    let baseUrl = (provider.tariffDocumentUrl || '').trim();
    if (baseUrl) {
      // If relative, prefix with API base URL when available
      const isAbsolute = /^https?:\/\//i.test(baseUrl);
      if (!isAbsolute) {
        const apiBase = (apiClient.defaults?.baseURL || '').replace(/\/$/, '');
        if (apiBase) {
          baseUrl = `${apiBase}${baseUrl.startsWith('/') ? '' : '/'}${baseUrl}`;
        }
      }
    } else {
      const apiBase = (apiClient.defaults?.baseURL || '').replace(/\/$/, '');
      const id = encodeURIComponent(provider.id);
      baseUrl = apiBase
        ? `${apiBase}/api/providers/${id}/tariff-document`
        : `/api/providers/${id}/tariff-document`;
    }

    setTariffModal({
      open: true,
      provider,
      url: baseUrl,
      type: provider.tariffDocumentType || 'local',
      error: null,
    });
  }, []);

  const handleCloseTariff = useCallback(() => {
    setTariffModal({
      open: false,
      provider: null,
      url: null,
      type: null,
      error: null,
    });
  }, []);
  const handleOpenTariffGrid = useCallback(async (provider) => {
    if (!provider) {
      return;
    }

    setTariffGridModal({
      open: true,
      loading: true,
      error: null,
      data: null,
      provider,
    });

    try {
      const { data } = await apiClient.get(`/api/providers/${provider.id}/base-tariff-grid`);
      setTariffGridModal({
        open: true,
        loading: false,
        error: null,
        data: data?.data || null,
        provider,
      });
    } catch (err) {
      console.error('Erreur lors du chargement de la grille tarifaire de base', err);
      setTariffGridModal({
        open: true,
        loading: false,
        error:
          err?.response?.data?.error ||
          'Impossible de charger la grille tarifaire. Reessayez plus tard.',
        data: null,
        provider,
      });
    }
  }, []);

  const handleCloseTariffGrid = useCallback(() => {
    setTariffGridModal({
      open: false,
      loading: false,
      error: null,
      data: null,
      provider: null,
    });
  }, []);

  const handleExportTariffGridPdf = useCallback(
  async (provider) => {
    if (typeof window === 'undefined' || !provider) {
      return;
    }

    try {
      let gridData = null;
      if (
        tariffGridModal.open &&
        tariffGridModal.provider?.id === provider.id &&
        hasTariffGridData
      ) {
        gridData = tariffGridModal.data;
      } else {
        const { data } = await apiClient.get(`/api/providers/${provider.id}/base-tariff-grid`);
        gridData = data?.data || null;
      }

      if (
        !gridData ||
        !Array.isArray(gridData.paletteCounts) ||
        !gridData.paletteCounts.length ||
        !Array.isArray(gridData.rows) ||
        !gridData.rows.length
      ) {
        window.alert('Aucune grille tarifaire disponible pour ce transporteur.');
        return;
      }

      const paletteCounts = gridData.paletteCounts;
      const rows = gridData.rows;
      const zoneLabels = gridData.meta?.zones || {};
      const tariffTypeLabel =
        gridData.type === 'idf' ? 'Tarifs Ile-de-France' : 'Tarifs hors IDF';

      const legendHtml =
        gridData.type === 'non-idf' && Object.keys(zoneLabels).length
          ? `
            <div class="tariff-grid__meta">
              <span>Zones couvertes :</span>
              <ul class="tariff-grid__legend">
                ${Object.entries(zoneLabels)
                  .map(([zoneKey, label]) => `<li><strong>${label}</strong></li>`)
                  .join('')}
              </ul>
            </div>
          `
          : '';

      const headerCells = [
        gridData.type === 'non-idf' ? '<th>Zone</th>' : '',
        `<th>${gridData.type === 'idf' ? 'Destination' : 'Distance'}</th>`,
        ...paletteCounts.map(
          (count) => `<th>${count} palette${count > 1 ? 's' : ''}</th>`
        ),
      ].join('');

      const rowCells = rows
        .map((row) => {
          const zoneCell =
            gridData.type === 'non-idf'
              ? `<td>${zoneLabels[row.zone] || row.zone || '--'}</td>`
              : '';
          const distanceCell = `<td>${row.label || '--'}</td>`;
          const valuesCells = paletteCounts
            .map((_, index) => {
              const raw = Array.isArray(row.values) ? row.values[index] : null;
              const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
              return `<td>${formatCurrencyValue(value)}</td>`;
            })
            .join('');
          return `<tr>${zoneCell}${distanceCell}${valuesCells}</tr>`;
        })
        .join('');

      const departureDepartment = gridData.meta?.departureDepartment;
      const title = `Grille tarifaire ${provider.name || ''}`.trim() || 'Grille tarifaire';
      const subtitle = departureDepartment ? `Départ : ${departureDepartment}` : '';
      const gridHtml = `
        <div class="tariff-grid printable">
          <div class="tariff-grid__meta">
            <span>${tariffTypeLabel}</span>
          </div>
          ${legendHtml}
          <div class="tariff-grid__table-wrapper">
            <table class="tariff-grid-table">
              <thead>
                <tr>${headerCells}</tr>
              </thead>
              <tbody>
                ${rowCells}
              </tbody>
            </table>
          </div>
        </div>
      `;

      const printStyles = `
        * { box-sizing: border-box; font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; }
        body { margin: 24px; background: #fff; }
        h1 { font-size: 20px; margin: 0 0 8px; }
        h2 { font-size: 14px; margin: 0 0 16px; color: #475569; }
        .tariff-grid { display: block; }
        .tariff-grid__meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; font-size: 12px; color: #475569; }
        .tariff-grid__legend { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 8px; }
        .tariff-grid__legend li { background: #e2e8f0; color: #1e293b; padding: 4px 10px; border-radius: 999px; font-size: 11px; }
        .tariff-grid__table-wrapper { border: 1px solid #cbd5f5; border-radius: 8px; overflow: hidden; margin-top: 12px; }
        .tariff-grid-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #cbd5f5; padding: 10px; text-align: center; }
        th { background: #e2e8f0; font-weight: 600; }
        td:first-child, th:first-child, td:nth-child(2), th:nth-child(2) { text-align: left; }
      `;

      const printableHtml = `
        <!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <style>${printStyles}</style>
          </head>
          <body>
            <h1>${title}</h1>
            ${subtitle ? `<h2>${subtitle}</h2>` : ''}
            <div class="meta">
              Exporte le ${new Date().toLocaleString('fr-FR')}
            </div>
            ${gridHtml}
          </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.title = 'export-tariff-grid';
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) {
        document.body.removeChild(iframe);
        window.alert('Impossible de preparer le document a imprimer.');
        return;
      }

      const finalizePrint = () => {
        setTimeout(() => {
          try {
            iframeWindow.focus();
            iframeWindow.print();
          } catch (err) {
            console.warn('Impression automatique indisponible', err);
            window.alert('Utilisez Ctrl+P pour enregistrer la grille en PDF.');
          } finally {
            setTimeout(() => {
              try {
                document.body.removeChild(iframe);
              } catch (cleanupError) {
                console.debug('Impossible de retirer le cadre dimpression', cleanupError);
              }
            }, 500);
          }
        }, 150);
      };

      iframeWindow.document.open();
      iframeWindow.document.write(printableHtml);
      iframeWindow.document.close();

      setTimeout(finalizePrint, 200);
    } catch (error) {
      console.error("Erreur lors de l'export de la grille au format PDF", error);
      window.alert('Impossible de generer le PDF pour ce transporteur.');
    }
  },
  [
    formatCurrencyValue,
    hasTariffGridData,
    tariffGridModal.data,
    tariffGridModal.open,
    tariffGridModal.provider,
  ]
);

  useEffect(() => {
    if (!tariffModal.open && !tariffGridModal.open) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (tariffModal.open) {
        handleCloseTariff();
      }
      if (tariffGridModal.open) {
        handleCloseTariffGrid();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tariffModal.open, tariffGridModal.open, handleCloseTariff, handleCloseTariffGrid]);

  useEffect(() => {
    if (!tariffModal.open && !tariffGridModal.open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [tariffModal.open, tariffGridModal.open]);

  useEffect(() => {
    let isCancelled = false;

    const fetchProviders = async () => {
      setLoading(true);
      setError(null);

      const params = {
        page,
        pageSize,
      };

      const addListParam = (key, values) => {
        if (Array.isArray(values) && values.length > 0) {
          params[key] = values.join(',');
        }
      };

      const addNumberParam = (key, value) => {
        if (value !== undefined && value !== null && value !== '') {
          params[key] = value;
        }
      };

      const trimmedQuery = appliedFilters.q?.trim();
      if (trimmedQuery) {
        params.q = trimmedQuery;
      }

      addListParam('features', appliedFilters.features);
      addListParam('supplementaryOptions', appliedFilters.supplementaryOptions);

      addNumberParam('palletCount', appliedFilters.palletCount);
      addNumberParam('palletMeters', appliedFilters.palletMeters);
      addNumberParam('weightKg', appliedFilters.weightKg);
      addNumberParam('distanceKm', appliedFilters.distanceKm);

      if (appliedFilters.requireWeightMatch) {
        params.requireWeightMatch = 'true';
      }

      if (estimationDeparture) {
        params.departureDepartment = estimationDeparture;
      }

      if (estimationArrival) {
        params.arrivalDepartment = estimationArrival;
      }

      try {
        const { data } = await apiClient.get('/api/providers', { params });

        if (isCancelled) {
          return;
        }

        setProviders(data?.data || []);
        setMeta(data?.meta || null);
      } catch (err) {
        if (isCancelled) {
          return;
        }

        console.error('Erreur lors du chargement des transporteurs', err);
        setError("Impossible de charger les transporteurs. Réessayez plus tard.");
        setProviders([]);
        setMeta(null);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchProviders();

    return () => {
      isCancelled = true;
    };
  }, [appliedFilters, page, pageSize, estimationDeparture, estimationArrival]);

  return (
    <div className="dashboard-improved">
      {/* Header compact */}
      <header className="dashboard-header">
        <div className="header-brand">
          <h1>Comparateur Transporteurs</h1>
          <div className="header-stats">
            <span>
              <strong>{meta?.total ?? providers.length}</strong> Résultat{(meta?.total ?? providers.length) > 1 ? 's' : ''}
            </span>
            {meta?.page && (
              <span>
                Page {meta.page} / {meta.totalPages}
              </span>
            )}
          </div>
        </div>
        <div className="header-actions">
          {isAdmin && (
            <Link to="/admin" className="btn-create btn-create--active">
              Espace admin
            </Link>
          )}
          <button
            type="button"
            className={`btn-create ${isAuthenticated ? 'btn-create--active' : 'btn-create--login'}`}
            onClick={handleCreateRequest}
          >
            {isAuthenticated ? 'Créer un fournisseur' : 'Se connecter pour créer'}
          </button>
          <div className={`header-user ${isAuthenticated ? '' : 'header-user--anonymous'}`}>
            <span>{isAuthenticated ? displayName : 'Consultation libre'}</span>
            {isAuthenticated && onLogout && (
              <button onClick={onLogout}>Déconnexion</button>
            )}
          </div>
        </div>
      </header>

      {/* Section Filtres pliables */}
      <section className="filters-section">
        <button 
          className="filters-toggle"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <span>Filtres de recherche</span>
          <span className={`toggle-icon ${filtersExpanded ? 'expanded' : ''}`}>▼</span>
        </button>

        {filtersExpanded && (
          <div className="filters-content">
            <div className="filters-sections">
              <div className="filters-subsection filters-subsection--search">
                <h3>Barre de recherche</h3>
                <div className="filters-grid">
                  <div className="filter-group">
                    <SearchableSingleSelect
                      label="Départ (estimation)"
                      options={departmentOptionsAll}
                      selectedValue={estimationDeparture}
                      onChange={(value) => {
                        setEstimationDeparture(value);
                        setPage(1);
                      }}
                      placeholder="Tous les départements"
                    />
                  </div>
                  <div className="filter-group">
                    <SearchableSingleSelect
                      label="Arrivée (estimation)"
                      options={departmentOptionsAll}
                      selectedValue={estimationArrival}
                      onChange={(value) => {
                        setEstimationArrival(value);
                        setPage(1);
                      }}
                      placeholder="Tous les départements"
                    />
                  </div>
                  <div className="filter-group filter-group--full">
                    <SearchableMultiSelect
                      label="Options supplmentaires"
                      options={SUPPLEMENTARY_OPTIONS}
                      selectedValues={formState.supplementaryOptions}
                      onChange={(values) => updateFormState('supplementaryOptions', values)}
                    />
                  </div>
                  <div className="filter-group filter-group--full">
                    <SearchableMultiSelect
                      label="Services & équipements"
                      options={FEATURE_GROUP_DEFINITIONS.flatMap((group) =>
                        group.keys.map((key) => ({
                          value: key,
                          label: FEATURE_LABELS[key],
                        }))
                      )}
                      selectedValues={formState.features}
                      onChange={(values) => updateFormState('features', values)}
                    />
                  </div>
                </div>
                <div className="estimation-info">
                  {appliedDistanceKm ? (
                    <span>
                      Distance estimée : <strong>{appliedDistanceKm.toFixed(1)} km</strong>
                      {meta?.estimatedDistanceSource === 'departments' && ' (calcul automatique)'}
                      {meta?.estimatedDistanceSource === 'manual' && ' (distance saisie)'}
                    </span>
                  ) : (
                    <span>Saisissez une distance ou sélectionnez départ/arrivée</span>
                  )}
                </div>
              </div>
              <div className="filters-subsection filters-subsection--cargo">
                <h3>Description marchandise</h3>
                <div className="filters-grid">
                  <div className="filter-group">
                    <label>
                      <span>Format / équivalences</span>
                      <input
                        className="autocomplete-input"
                        type="text"
                        list="pallet-format-datalist"
                        placeholder="80x120 • 0.8 m • 0.9 t • 1 palette"
                        value={palletFormatInput}
                        onChange={(e) => handlePalletFormatInputChange(e.target.value)}
                      />
                      <datalist id="pallet-format-datalist">
                        {flattenedPalletOptions.map((option) => (
                          <option key={option.id} value={getPalletOptionDisplay(option)} />
                        ))}
                      </datalist>
                    </label>
                    {formState.palletFormat && (
                      <small className="helper-text">Format sélectionné : {formState.palletFormat}</small>
                    )}
                  </div>
                  <div className="filter-group">
                    <label>
                      <span>Nombre de palettes</span>
                      <input
                        type="number"
                        min="1"
                        max="33"
                        step="1"
                        value={formState.palletCount}
                        onChange={(e) => handlePalletCountChange(e.target.value)}
                        disabled={!formState.palletFormat}
                      />
                    </label>
                  </div>
                  <div className="filter-group">
                    <label>
                      <span>Mètres calculés</span>
                      <input
                        type="text"
                        value={formattedPalletMetersLabel ? `${formattedPalletMetersLabel} m` : ''}
                        readOnly
                        placeholder="--"
                      />
                    </label>
                    <small className="helper-text">
                      Calcul automatique (format × nombre)
                    </small>
                  </div>
                  <div className="filter-group">
                    <label>
                      <span>Poids (kg)</span>
                      <input
                        type="number"
                        min="0"
                        value={formState.weightKg}
                        onChange={(e) => updateFormState('weightKg', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="filters-actions">
              <button type="button" className="btn-apply" onClick={handleApplyFilters}>
                Appliquer les filtres
              </button>
              <button
                type="button"
                className="btn-reset"
                onClick={handleResetFilters}
              >
                Reinitialiser
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Liste des fournisseurs - Prend maintenant la majorité de l'espace */}
      <main className="providers-main">
        <section className="providers-list">
          <div className="list-header">
            <h2>Liste des transporteurs</h2>
            <div className="list-controls">
              <label className="control-inline">
                <span>Résultats / page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setPageSize(value);
                    setPage(1);
                  }}
                >
                  {effectivePageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="results-table">
            {/* Tableau des résultats */}
            <div className="table-responsive">
              {error && (
                <div className="empty-state error-state">
                  <p>{error}</p>
                </div>
              )}
              {!error && loading && (
                <div className="empty-state">
                  <p>Chargement des transporteurs...</p>
                </div>
              )}
              {!error && !loading && providers.length === 0 && (
                <div className="empty-state">
                  <p>Aucun transporteur trouvé avec ces critères</p>
                </div>
              )}
              {!error && !loading && providers.length > 0 && (
                <table className="providers-table">
                  <thead>
                    <tr>
                      <th>Transporteur</th>
                      <th>Département</th>
                      <th>Contact</th>
                      <th>Téléphone</th>
                      <th>Distance estimée</th>
                      <th>Grille tarif transporteur</th>
                    </tr>
                  </thead>
                  <tbody>

                    {providers.map((provider, index) => {
                      const isBest = index === 0;

                      const departmentRaw =
                        provider.profile?.department ||
                        provider.profile?.deliveryDepartments?.[0] ||
                        provider.profile?.pickupDepartments?.[0] ||
                        '';
                      const departmentDisplay = departmentRaw ? departmentRaw.toString().toUpperCase() : '--';

                      const contactDisplay = provider.profile?.contact?.trim() || '--';
                      const phoneDisplay = provider.profile?.phone?.trim() || '--';

                      return (
                        <tr key={provider.id}>
                          <td>
                            <div className="provider-info">
                              <div className={`provider-name${provider.hasTariffDocument ? ' has-tariff' : ''}`}>
                                <strong>{provider.name}</strong>
                                {provider.hasTariffDocument && (
                                  <span className="provider-name-badge" aria-hidden="true">
                                    PDF
                                  </span>
                                )}
                              </div>
                              <small>{provider.profile?.city}</small>
                            </div>
                          </td>
                          <td>{departmentDisplay}</td>
                          <td>{contactDisplay}</td>
                          <td>{phoneDisplay}</td>
                          <td>{formattedDistanceLabel || '--'}</td>
                          <td>
                            <div className="tariff-actions">
                              <button
                                type="button"
                                className="btn-tariff btn-tariff--pdf"
                                onClick={() => handleOpenTariff(provider)}
                                title="Afficher la grille PDF du transporteur"
                                disabled={!provider.hasTariffDocument}
                              >
                                PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  </tbody>
                </table>
              )}
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn-page"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={loading || !(meta?.hasPreviousPage)}
              >
                Prcdent
              </button>
              <span>
                Page {meta?.page ?? page} / {meta?.totalPages ?? Math.max(Math.ceil((meta?.total ?? providers.length) / pageSize), 1)}
              </span>
              <button
                type="button"
                className="btn-page"
                onClick={() => setPage((prev) => (meta?.hasNextPage ? prev + 1 : prev))}
                disabled={loading || !meta?.hasNextPage}
              >
                Suivant
              </button>
            </div>
          </div>
        </section>
      </main>

      {tariffGridModal.open && (
        <div className="tariff-modal-backdrop" role="dialog" aria-modal="true">
          <div className="tariff-modal tariff-modal--grid">
            <header className="tariff-modal__header">
              <div className="tariff-modal__title">
                <h3>Grille tarifaire de base</h3>
                {tariffGridModal.provider?.name && (
                  <small>{tariffGridModal.provider.name}</small>
                )}
                {tariffGridMeta?.departureDepartment && (
                  <small>Depart: {tariffGridMeta.departureDepartment}</small>
                )}
              </div>
              <button
                type="button"
                className="tariff-modal__close"
                onClick={handleCloseTariffGrid}
                aria-label="Fermer la grille tarifaire"
              >
                {'\u00d7'}
              </button>
            </header>
            <div className="tariff-modal__body tariff-modal__body--grid">
              {tariffGridModal.loading ? (
                <p className="tariff-modal__message">Chargement de la grille tarifaire...</p>
              ) : tariffGridModal.error ? (
                <p className="tariff-modal__message">{tariffGridModal.error}</p>
              ) : hasTariffGridData ? (
                <div className="tariff-grid">
                  <div className="tariff-grid__meta">
                    <span>
                      {tariffGridData?.type === 'idf' ? 'Tarifs Ile-de-France' : 'Tarifs hors IDF'}
                    </span>
                  </div>
                  {tariffGridData?.type === 'non-idf' && Object.keys(tariffGridZoneLabels).length > 0 && (
                    <div className="tariff-grid__meta">
                      <span>Zones couvertes:</span>
                      <ul className="tariff-grid__legend">
                        {Object.entries(tariffGridZoneLabels).map(([zoneKey, zoneLabel]) => (
                          <li key={zoneKey}>
                            <strong>{zoneLabel}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="tariff-grid__table-wrapper">
                    <table className="tariff-grid-table">
                      <thead>
                        <tr>
                          {tariffGridData?.type === 'non-idf' && <th>Zone</th>}
                          <th>{tariffGridData?.type === 'idf' ? 'Destination' : 'Distance'}</th>
                          {tariffGridPaletteCounts.map((count) => (
                            <th key={`palette-${count}`}>{count} palette{count > 1 ? 's' : ''}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tariffGridRows.map((row) => (
                          <tr key={row.key || row.label}>
                            {tariffGridData?.type === 'non-idf' && (
                              <td>{tariffGridZoneLabels[row.zone] || row.zone || '--'}</td>
                            )}
                            <td>{row.label || '--'}</td>
                            {tariffGridPaletteCounts.map((count, index) => (
                              <td key={`${row.key || row.label || index}-${count}`}>
                                {formatCurrencyValue(
                                  Array.isArray(row.values) ? row.values[index] : null
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="tariff-modal__message">
                  Aucune grille tarifaire disponible pour ce transporteur.
                </p>
              )}
            </div>
            <footer className="tariff-modal__footer">
              <button type="button" className="tariff-modal__btn" onClick={handleCloseTariffGrid}>
                Fermer
              </button>
            </footer>
          </div>
        </div>
      )}

      {tariffModal.open && (
        <div className="tariff-modal-backdrop" role="dialog" aria-modal="true">
          <div className="tariff-modal">
            <header className="tariff-modal__header">
              <div className="tariff-modal__title">
                <h3>{tariffModal.provider?.name || 'Grille tarifaire'}</h3>
                {tariffModal.provider?.profile?.city && (
                  <small>{tariffModal.provider.profile.city}</small>
                )}
              </div>
              <button
                type="button"
                className="tariff-modal__close"
                onClick={handleCloseTariff}
                aria-label="Fermer la grille tarifaire"
              >
                {'\u00d7'}
              </button>
            </header>
            <div className="tariff-modal__body">
              {tariffModal.error ? (
                <p className="tariff-modal__message">{tariffModal.error}</p>
              ) : (
                <>
                  {tariffViewerUrl ? (
                    <iframe
                      key={tariffViewerUrl}
                      src={tariffViewerUrl}
                      title={`Grille tarifaire ${tariffModal.provider?.name || ''}`}
                      className="tariff-modal__iframe"
                    />
                  ) : (
                    <p className="tariff-modal__message">Chargement du document...</p>
                  )}
                  {tariffModal.type === 'remote' && (
                    <p className="tariff-modal__hint">
                      Le document est hébergé sur un site externe. Utilisez le bouton d&apos;ouverture si l&apos;aperçu ne s&apos;affiche pas.
                    </p>
                  )}
                </>
              )}
            </div>
            <footer className="tariff-modal__footer">
              <button type="button" className="tariff-modal__btn" onClick={handleCloseTariff}>
                Fermer
              </button>
              {!tariffModal.error && tariffDownloadUrl && (
                <a
                  href={tariffDownloadUrl}
                  target={tariffModal.type === 'remote' ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="tariff-modal__btn tariff-modal__btn--primary"
                >
                  {tariffModal.type === 'remote'
                    ? 'Ouvrir dans un nouvel onglet'
                    : 'Télécharger le PDF'}
                </a>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;














