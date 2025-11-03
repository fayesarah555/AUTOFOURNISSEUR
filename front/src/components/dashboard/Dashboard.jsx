import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './dashboard.css';
import apiClient from '../../utils/apiClient';

const createEmptyFilters = () => ({
  q: '',
  modes: [],
  coverage: [],
  features: [],
  minRating: '',
  minOnTimeRate: '',
  maxLeadTime: '',
  maxCo2: '',
  contractFlexibility: [],
  maxPrice: '',
  palletCount: '',
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

const POPULAR_DEPARTMENT_CODES = ['75', '77', '78', '91', '92', '93', '94', '95'];



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
    return Array.from(map.values()).sort((a, b) => a.value.localeCompare(b.value));
  }, [deliveryDepartmentOptions, pickupDepartmentOptions]);

  const popularDepartmentOptions = useMemo(() => {
    if (!departmentOptionsAll.length) {
      return [];
    }

    return POPULAR_DEPARTMENT_CODES.map((code) =>
      departmentOptionsAll.find((option) => option.value === code)
    ).filter(Boolean);
  }, [departmentOptionsAll]);

  const otherDepartmentOptions = useMemo(
    () => departmentOptionsAll.filter((option) => !POPULAR_DEPARTMENT_CODES.includes(option.value)),
    [departmentOptionsAll]
  );

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

  const totalEstimateHeader = useMemo(() => {
    if (!formattedDistanceLabel) {
      return 'Tarif total estimé';
    }

    return `Tarif total estimé (${formattedDistanceLabel})`;
  }, [formattedDistanceLabel]);

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

    const baseUrl =
      provider.tariffDocumentUrl && provider.tariffDocumentUrl.trim().length > 0
        ? provider.tariffDocumentUrl
        : `/api/providers/${provider.id}/tariff-document`;

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
          gridData.type === 'idf' ? 'Tarifs Île-de-France' : 'Tarifs hors IDF';

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

        const targetWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
        if (!targetWindow) {
          window.alert(
            "Impossible d'ouvrir la fenêtre de téléchargement. Vérifiez votre bloqueur de pop-up."
          );
          return;
        }

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

        targetWindow.document.write(`
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
                Exporté le ${new Date().toLocaleString('fr-FR')}
              </div>
              ${gridHtml}
            </body>
          </html>
        `);
        targetWindow.document.close();
        targetWindow.focus();
        targetWindow.print();
      } catch (error) {
        console.error("Erreur lors de l'export de la grille au format PDF", error);
        window.alert('Impossible de générer le PDF pour ce transporteur.');
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
      addListParam('features', appliedFilters.features);
      addListParam('contractFlexibility', appliedFilters.contractFlexibility);
      addListParam('deliveryDepartments', appliedFilters.deliveryDepartments);
      addListParam('pickupDepartments', appliedFilters.pickupDepartments);

      addNumberParam('minRating', appliedFilters.minRating);
      addNumberParam('minOnTimeRate', appliedFilters.minOnTimeRate);
      addNumberParam('maxLeadTime', appliedFilters.maxLeadTime);
      addNumberParam('maxCo2', appliedFilters.maxCo2);
      addNumberParam('maxPrice', appliedFilters.maxPrice);
      addNumberParam('palletCount', appliedFilters.palletCount);
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
                  <span>Nombre de palettes</span>
                  <input
                    type="number"
                    min="1"
                    max="33"
                    step="1"
                    value={formState.palletCount}
                    onChange={(e) => updateFormState('palletCount', e.target.value)}
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
                    {popularDepartmentOptions.length > 0 && (
                      <optgroup key="popular-departments" label="Départements les plus utilisés">
                        {popularDepartmentOptions.map((option) => (
                          <option key={`depart-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherDepartmentOptions.length > 0 && (
                      <optgroup key="other-departments" label="Tous les départements">
                        {otherDepartmentOptions.map((option) => (
                          <option key={`depart-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
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
                    {popularDepartmentOptions.length > 0 && (
                      <optgroup key="popular-arrival-departments" label="Départements les plus utilisés">
                        {popularDepartmentOptions.map((option) => (
                          <option key={`arrivee-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherDepartmentOptions.length > 0 && (
                      <optgroup key="other-arrival-departments" label="Tous les départements">
                        {otherDepartmentOptions.map((option) => (
                          <option key={`arrivee-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
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
                      <th>Département</th>
                      <th>Contact</th>
                      <th>Téléphone</th>
                      <th>Distance estimée</th>
                      <th>Tarif HA (grille)</th>
                      <th>Tarif HA EUR/km</th>
                      <th>{totalEstimateHeader}</th>
                      <th>Satisfaction</th>
                      <th>Délai</th>
                      <th>CO2</th>
                      <th>Grille tarif transporteur</th>
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

                      const departmentRaw =
                        provider.profile?.department ||
                        provider.profile?.deliveryDepartments?.[0] ||
                        provider.profile?.pickupDepartments?.[0] ||
                        '';
                      const departmentDisplay = departmentRaw ? departmentRaw.toString().toUpperCase() : '--';

                      const contactDisplay = provider.profile?.contact?.trim() || '--';
                      const phoneDisplay = provider.profile?.phone?.trim() || '--';

                      const pricingInfo = provider.pricing || {};
                      const hasTariffGrid =
                        typeof pricingInfo.gridPrice === 'number' && Number.isFinite(Number(pricingInfo.gridPrice));
                      const gridPriceValue = hasTariffGrid
                        ? Number(pricingInfo.gridPrice)
                        : Number(provider.baseHandlingFee);
                      const gridPriceDisplay = Number.isFinite(gridPriceValue)
                        ? currencyFormatter.format(gridPriceValue)
                        : '--';

                      const pricePerKmSource =
                        pricingInfo.pricePerKm !== undefined && pricingInfo.pricePerKm !== null
                          ? pricingInfo.pricePerKm
                          : provider.pricePerKm;
                      const pricePerKmValue = Number(pricePerKmSource);
                      const pricePerKmDisplay = Number.isFinite(pricePerKmValue)
                        ? `${pricePerKmValue.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} EUR / km`
                        : '--';

                      const estimatedCostValue =
                        typeof provider.estimatedCost === 'number' && Number.isFinite(provider.estimatedCost)
                          ? provider.estimatedCost
                          : hasTariffGrid
                          ? gridPriceValue
                          : typeof appliedDistanceKm === 'number'
                          ? (Number(provider.baseHandlingFee) || 0) +
                            (Number(provider.pricePerKm) || 0) * appliedDistanceKm
                          : null;
                      const estimatedCostDisplay =
                        typeof estimatedCostValue === 'number' && Number.isFinite(estimatedCostValue)
                          ? currencyFormatter.format(estimatedCostValue)
                          : '--';

                      const palletCountValue = Number(pricingInfo.palletCount);
                      const hasPalletCount = Number.isFinite(palletCountValue);
                      const palletMplValue = Number(pricingInfo.palletMpl);
                      const hasPalletMpl = Number.isFinite(palletMplValue);

                      const sourceLabel = (() => {
                        switch (pricingInfo.source) {
                          case 'idf':
                            return 'Tarif IDF';
                          case 'non-idf-zc':
                            return 'Hors IDF - Zone courte';
                          case 'non-idf-zl':
                            return 'Hors IDF - Zone longue';
                          default:
                            return null;
                        }
                      })();

                      const referenceDistanceDisplay =
                        typeof pricingInfo.referenceDistanceKm === 'number' &&
                        Number.isFinite(pricingInfo.referenceDistanceKm)
                          ? pricingInfo.referenceDistanceKm.toLocaleString('fr-FR') + ' km'
                          : null;

                      const surchargeLabel = (() => {
                        const parts = [];
                        if (Number.isFinite(Number(pricingInfo.departureSurcharge))) {
                          parts.push(
                            `Enlevement +${Number(pricingInfo.departureSurcharge).toLocaleString('fr-FR')} EUR`
                          );
                        }
                        if (Number.isFinite(Number(pricingInfo.deliverySurcharge))) {
                          parts.push(
                            `Livraison +${Number(pricingInfo.deliverySurcharge).toLocaleString('fr-FR')} EUR`
                          );
                        }
                        return parts.length ? parts.join(' - ') : null;
                      })();
                      const satisfactionValue = Number(provider.customerSatisfaction);
                      const leadTimeValue = Number(provider.leadTimeDays);
                      const co2Value = Number(provider.co2GramsPerTonneKm);

                      return (
                        <tr key={provider.id} className={isBest ? 'best-result' : undefined}>
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
                            {gridPriceDisplay}
                            {hasTariffGrid && (
                              <>
                                {sourceLabel && (
                                  <small className="pricing-detail">
                                    {sourceLabel}
                                    {referenceDistanceDisplay ? ` - ${referenceDistanceDisplay}` : ''}
                                  </small>
                                )}
                                {hasPalletCount && (
                                  <small className="pricing-detail">
                                    {`${palletCountValue.toLocaleString('fr-FR')} palette${palletCountValue > 1 ? 's' : ''}${
                                      hasPalletMpl
                                        ? ` - ${palletMplValue.toLocaleString('fr-FR', {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1,
                                          })} MPL`
                                        : ''
                                    }`}
                                  </small>
                                )}
                              </>
                            )}
                          </td>
                          <td>
                            {pricePerKmDisplay}
                            {pricingInfo.departmentName && (
                              <small className="pricing-detail">{pricingInfo.departmentName}</small>
                            )}
                            {surchargeLabel && (
                              <small className="pricing-detail">{surchargeLabel}</small>
                            )}
                          </td>
                          <td>{estimatedCostDisplay}</td>
                          <td>
                            {Number.isFinite(satisfactionValue)
                              ? `${satisfactionValue.toFixed(1)} / 5`
                              : '--'}
                          </td>
                          <td>{Number.isFinite(leadTimeValue) ? `${leadTimeValue} j` : '--'}</td>
                          <td>{Number.isFinite(co2Value) ? `${co2Value} g/t.km` : '--'}</td>
                          <td>
                            <div className="tariff-actions">
                              <button
                                type="button"
                                className="btn-grid"
                                onClick={() => handleOpenTariffGrid(provider)}
                              >
                                Voir la grille
                              </button>
                              <button
                                type="button"
                                className="btn-tariff btn-tariff--pdf"
                                onClick={() => handleExportTariffGridPdf(provider)}
                                title="Exporter la grille en PDF"
                              >
                                📄 PDF
                              </button>
                            </div>
                          </td>
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
                  {tariffModal.type === 'remote' && !tariffModal.error && (
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
                  {tariffModal.type === 'remote' ? 'Ouvrir dans un nouvel onglet' : 'Télécharger le PDF'}
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









