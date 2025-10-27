import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estimationDeparture, setEstimationDeparture] = useState('');
  const [estimationArrival, setEstimationArrival] = useState('');

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
    return Array.from(map.values()).sort((a, b) => a.value.localeCompare(b.value));
  }, [deliveryDepartmentOptions, pickupDepartmentOptions]);

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

  const bestScore = useMemo(() => {
    let maxScore = null;
    providers.forEach((provider) => {
      const score = Number(provider.score);
      if (!Number.isFinite(score)) {
        return;
      }
      if (maxScore === null || score > maxScore) {
        maxScore = score;
      }
    });
    return maxScore;
  }, [providers]);

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

  useEffect(() => {
    let isCancelled = false;

    const fetchProviders = async () => {
      setLoading(true);
      setError(null);

      const params = {
        page,
        pageSize,
        sortBy,
        sortOrder,
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

      addListParam('modes', appliedFilters.modes);
      addListParam('coverage', appliedFilters.coverage);
      addListParam('regions', appliedFilters.regions);
      addListParam('features', appliedFilters.features);
      addListParam('contractFlexibility', appliedFilters.contractFlexibility);
      addListParam('deliveryDepartments', appliedFilters.deliveryDepartments);
      addListParam('pickupDepartments', appliedFilters.pickupDepartments);

      addNumberParam('minRating', appliedFilters.minRating);
      addNumberParam('minOnTimeRate', appliedFilters.minOnTimeRate);
      addNumberParam('maxLeadTime', appliedFilters.maxLeadTime);
      addNumberParam('maxCo2', appliedFilters.maxCo2);
      addNumberParam('maxPrice', appliedFilters.maxPrice);
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
  }, [appliedFilters, page, pageSize, sortBy, sortOrder, estimationDeparture, estimationArrival]);

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
            <div className="filters-row">
              <div className="filter-group">
                <label>
                  <span>Recherche</span>
                  <input
                    type="text"
                    value={formState.q}
                    placeholder="Nom, spécialité..."
                    onChange={(e) => updateFormState('q', e.target.value)}
                  />
                </label>
              </div>

              <div className="filter-group">
                <label>
                  <span>Distance (km)</span>
                  <input
                    type="number"
                    min="0"
                    value={formState.distanceKm}
                    onChange={(e) => updateFormState('distanceKm', e.target.value)}
                  />
                </label>
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

              <div className="filter-group">
                <label>
                  <span>Prix max (€)</span>
                  <input
                    type="number"
                    min="0"
                    value={formState.maxPrice}
                    onChange={(e) => updateFormState('maxPrice', e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="filters-dropdowns">
              <SearchableMultiSelect
                label="Modes de transport"
                options={MODE_OPTIONS}
                selectedValues={formState.modes}
                onChange={(values) => updateFormState('modes', values)}
              />

              <SearchableMultiSelect
                label="Couverture"
                options={COVERAGE_OPTIONS}
                selectedValues={formState.coverage}
                onChange={(values) => updateFormState('coverage', values)}
              />

              <SearchableMultiSelect
                label="Régions desservies"
                options={REGION_OPTIONS}
                selectedValues={formState.regions}
                onChange={(values) => updateFormState('regions', values)}
              />

              <SearchableMultiSelect
                label="Services & Équipements"
                options={FEATURE_GROUP_DEFINITIONS.flatMap(group => 
                  group.keys.map(key => ({ 
                    value: key, 
                    label: FEATURE_LABELS[key] 
                  }))
                )}
                selectedValues={formState.features}
                onChange={(values) => updateFormState('features', values)}
              />
            </div>

            <div className="estimation-controls">
              <div className="filter-group">
                <label>
                  <span>Départ (estimation)</span>
                  <select
                    value={estimationDeparture}
                    onChange={(e) => {
                      setEstimationDeparture(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Sélectionner</option>
                    {departmentOptionsAll.map((option) => (
                      <option key={`depart-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="filter-group">
                <label>
                  <span>Arrivée (estimation)</span>
                  <select
                    value={estimationArrival}
                    onChange={(e) => {
                      setEstimationArrival(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Sélectionner</option>
                    {departmentOptionsAll.map((option) => (
                      <option key={`arrivee-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
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

            <div className="filters-actions">
              <button type="button" className="btn-apply" onClick={handleApplyFilters}>
                Appliquer les filtres
              </button>
              <button 
                type="button" 
                className="btn-reset"
                onClick={handleResetFilters}
              >
                Réinitialiser
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
                <span>Trier par</span>
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
                  <option value="score">Score global</option>
                  <option value="pricePerKm">Prix / km</option>
                  <option value="customerSatisfaction">Satisfaction</option>
                  <option value="leadTimeDays">Délai</option>
                  <option value="onTimeRate">Ponctualité</option>
                  <option value="co2GramsPerTonneKm">CO₂</option>
                </select>
              </label>
              <button
                type="button"
                className="btn-sort-order"
                onClick={() => {
                  setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  setPage(1);
                }}
              >
                {sortOrder === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
              </button>
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
                      <th>Score</th>
                      <th>Satisfaction</th>
                      <th>Délai</th>
                      <th>Prix/km</th>
                      <th>{appliedDistanceKm ? `Estimation (${appliedDistanceKm} km)` : 'Estimation'}</th>
                      <th>CO₂</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((provider) => {
                      const providerScore = Number(provider.score);
                      const isBest =
                        bestScore !== null &&
                        Number.isFinite(providerScore) &&
                        Math.abs(providerScore - bestScore) < 0.0001;

                      return (
                        <tr key={provider.id} className={isBest ? 'best-result' : undefined}>
                        <td>
                          <div className="provider-info">
                            <strong>{provider.name}</strong>
                            <small>{provider.profile?.city}</small>
                          </div>
                        </td>
                        <td><strong>{provider.score?.toFixed(0) || '--'}</strong></td>
                        <td>{provider.customerSatisfaction?.toFixed(1) || '--'} / 5</td>
                        <td>{provider.leadTimeDays || '--'} j</td>
                        <td>{provider.pricePerKm?.toFixed(2) || '--'} €</td>
                        <td>
                          {appliedDistanceKm
                            ? currencyFormatter.format(
                                (Number(provider.baseHandlingFee) || 0) +
                                  (Number(provider.pricePerKm) || 0) * appliedDistanceKm
                              )
                            : '--'}
                        </td>
                        <td>{provider.co2GramsPerTonneKm || '--'} g/t.km</td>
                        <td>
                          <button className="btn-compare">Comparer</button>
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
                Précédent
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
    </div>
  );
};

export default Dashboard;
