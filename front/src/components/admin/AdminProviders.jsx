import React, { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../../utils/apiClient";
import "./adminProviders.css";

const FEATURE_OPTIONS = [
  { value: "semi-tautliner", label: "Semi tautliner" },
  { value: "semi-fourgon", label: "Semi fourgon" },
  { value: "semi-frigorifique", label: "Semi frigorifique" },
  { value: "semi-hayon", label: "Semi hayon" },
  { value: "porteur-tole", label: "Porteur tôlé" },
  { value: "porteur-taut", label: "Porteur tautliner" },
  { value: "porteur-hayon", label: "Porteur hayon" },
  { value: "vehicule-leger", label: "Véhicule léger" },
  { value: "express", label: "Express" },
  { value: "adr", label: "ADR" },
  { value: "international", label: "International" },
  { value: "grue", label: "Grue" },
  { value: "chariot-embarque", label: "Chariot embarqué" },
  { value: "fosse", label: "Fosse" },
  { value: "porte-char", label: "Porte-char" },
  { value: "convoi-exceptionnel", label: "Convoi exceptionnel" },
  { value: "prise-rdv", label: "Prise de RDV" },
  { value: "chgt-au-pont", label: "Chgt au Pont" },
];

const DEFAULT_DEPARTMENTS = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15",
  "16", "17", "18", "19", "2A", "2B", "21", "22", "23", "24", "25", "26", "27", "28", "29",
  "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44",
  "45", "46", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
  "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74",
  "75", "76", "77", "78", "79", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "90", "91", "92", "93", "94", "95"
];

const TARIFF_FILE_ACCEPT = ".pdf,.xls,.xlsx";

const detectTariffFileFormat = (file) => {
  if (!file) {
    return null;
  }
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return 'pdf';
  }
  if (
    name.endsWith('.xls') ||
    name.endsWith('.xlsx') ||
    type.includes('spreadsheet') ||
    type.includes('excel')
  ) {
    return 'excel';
  }
  return null;
};

const getTariffFormatLabel = (format) => (format === 'excel' ? 'XLS' : 'PDF');

const createDefaultFormState = () => ({
  id: "",
  name: "",
  description: "",
  rating: "",
  profile: {
    address: "",
    postalCode: "",
    city: "",
    department: "",
    contact: "",
    phone: "",
    unreachable: false,
  },
  features: [],
  deliveryDepartments: [],
  pickupDepartments: [],
});

const createDefaultTariffImportState = () => ({
  providerId: '',
  file: null,
  mode: 'document',
  loading: false,
  status: null,
  error: null,
});

const AdminProviders = ({ onLogout }) => {
  const [providers, setProviders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [formState, setFormState] = useState(() => createDefaultFormState());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tariffUploadStatus, setTariffUploadStatus] = useState(null);
  const [tariffUploadError, setTariffUploadError] = useState(null);
  const [uploadingProviderId, setUploadingProviderId] = useState(null);
  const tariffFileInputs = useRef({});
  const additionalTariffInputs = useRef({});
  const excelProviderInputRef = useRef(null);
  const excelTariffInputRef = useRef(null);
  const [excelCreationState, setExcelCreationState] = useState({
    providerFile: null,
    tariffFile: null,
    loading: false,
    status: null,
    error: null,
  });

  // Modal d'import de grille pour un fournisseur existant
  const [tariffImportModalOpen, setTariffImportModalOpen] = useState(false);
  const [tariffImportState, setTariffImportState] = useState(() => createDefaultTariffImportState());

  const departmentOptions = useMemo(() => {
    const deliveryCodes = meta?.availableFilters?.deliveryDepartments || [];
    const pickupCodes = meta?.availableFilters?.pickupDepartments || [];
    const codes = deliveryCodes.length || pickupCodes.length
      ? Array.from(new Set([...deliveryCodes, ...pickupCodes]))
      : DEFAULT_DEPARTMENTS;
    return codes.map((code) => ({ value: code, label: code }));
  }, [meta]);

  // Liens modèles Excel
  const singleProviderTemplateUrl = useMemo(() => {
    const baseUrl = apiClient.defaults?.baseURL || '';
    const path = '/admin/providers/import/template';
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path;
  }, []);
  const datasetTemplateUrl = useMemo(() => {
    const baseUrl = apiClient.defaults?.baseURL || '';
    const path = '/admin/providers/import/dataset-template';
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path;
  }, []);

  const openTariffImportModal = () => {
    setTariffImportState(createDefaultTariffImportState());
    setTariffImportModalOpen(true);
  };
  const closeTariffImportModal = () => {
    setTariffImportModalOpen(false);
    setTariffImportState(createDefaultTariffImportState());
  };
  const openTariffImportFor = async (providerId) => {
    try {
      await apiClient.get('/admin/providers/' + encodeURIComponent(providerId));
    } catch (err) {
      alert('Transporteur introuvable. Rafraîchissez la liste ou réimportez-le.');
      return;
    }
    setTariffImportState({
      ...createDefaultTariffImportState(),
      providerId,
    });
    setTariffImportModalOpen(true);
  };
  const handleTariffImportChange = (field) => (e) => {
    if (field === 'providerId') {
      setTariffImportState((prev) => ({ ...prev, providerId: e.target.value }));
    } else if (field === 'file') {
      const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
      setTariffImportState((prev) => ({ ...prev, file }));
    } else if (field === 'mode') {
      setTariffImportState((prev) => ({ ...prev, mode: e.target.value }));
    }
  };
  const handleTariffImportSubmit = async (event) => {
    event.preventDefault();
    const { providerId, file, mode } = tariffImportState;
    if (!providerId) {
      setTariffImportState((s) => ({ ...s, error: 'Veuillez sélectionner un fournisseur.' }));
      return;
    }
    if (!file) {
      setTariffImportState((s) => ({ ...s, error: 'Veuillez sélectionner un fichier PDF ou Excel.' }));
      return;
    }
    const name = (file.name || '').toLowerCase();
    if (!(name.endsWith('.pdf') || name.endsWith('.xls') || name.endsWith('.xlsx'))) {
      setTariffImportState((s) => ({ ...s, error: 'Le fichier doit être un PDF ou un Excel (.xls / .xlsx).' }));
      return;
    }
    try {
      setTariffImportState((s) => ({ ...s, loading: true, error: null, status: null }));
      const formData = new FormData();
      formData.append('file', file);
      const endpoint = mode === 'catalog'
        ? `/admin/providers/${encodeURIComponent(providerId)}/tariff-catalogs/import`
        : `/admin/providers/${encodeURIComponent(providerId)}/tariff-document`;
      const response = await apiClient.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTariffImportState((s) => ({
        ...s,
        loading: false,
        status: response.data?.message || 'Import réalisé avec succès.',
      }));
      await fetchProviders();
      closeTariffImportModal();
    } catch (err) {
      setTariffImportState((s) => ({ ...s, loading: false, error: err?.response?.data?.error || "Échec de l'import de la grille." }));
    }
  };

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/admin/providers', {
        params: {
          page,
          pageSize,
          sortBy: 'name',
          sortOrder: 'asc',
          q: (searchText || '').trim(),
        },
      });
      setProviders(response.data.data || []);
      setMeta(response.data.meta || null);
    } catch (err) {
      setError('Impossible de charger la liste des fournisseurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [page, pageSize, searchText]);

  const openCreateModal = () => {
    setFormState(createDefaultFormState());
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (provider) => {
    const profile = provider.profile || {};
    const combinedFeatures = Array.from(
      new Set([...(profile.features || []), ...(provider.serviceCapabilities || [])])
    );
    setFormState({
      id: provider.id,
      name: provider.name || '',
      description: provider.description || '',
      rating: provider.rating != null ? String(provider.rating) : '',
      profile: {
        address: profile.address || '',
        postalCode: profile.postalCode || '',
        city: profile.city || '',
        department: (profile.department || '').toUpperCase(),
        contact: profile.contact || '',
        phone: profile.phone || '',
        unreachable: Boolean(profile.unreachable),
      },
      features: combinedFeatures,
      deliveryDepartments: (profile.deliveryDepartments || []).map((code) => code.toUpperCase()),
      pickupDepartments: (profile.pickupDepartments || []).map((code) => code.toUpperCase()),
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setFormState(createDefaultFormState());
  };

  const handleChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProfileChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value,
      },
    }));
  };

  const handleDepartmentsToggle = (field) => (code) => {
    setFormState((prev) => {
      const current = prev[field] || [];
      const exists = current.includes(code);
      const next = exists ? current.filter((item) => item !== code) : [...current, code];
      return { ...prev, [field]: next };
    });
  };

  const DepartmentPicker = ({ label, field }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const selected = formState[field] || [];

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (containerRef.current && !containerRef.current.contains(event.target)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const summaryText = useMemo(() => {
      if (!selected.length) {
        return 'Aucun';
      }
      const labels = selected.map((code) => {
        const match = departmentOptions.find((option) => option.value === code);
        return match ? match.label : code;
      });
      if (labels.length <= 3) {
        return labels.join(', ');
      }
      const displayed = labels.slice(0, 3).join(', ');
      return `${displayed} +${labels.length - 3}`;
    }, [selected, departmentOptions]);

    return (
      <div className={`dept-picker${open ? ' open' : ''}`} ref={containerRef}>
        <button type="button" className="dept-picker-trigger" onClick={() => setOpen((prev) => !prev)}>
          <span>{label}</span>
          <span className="dept-picker-summary">
            {summaryText}
          </span>
        </button>
        {open && (
          <div className="dept-picker-dropdown">
            <div className="dept-picker-options">
              {departmentOptions.map((option) => (
                <label key={option.value} className="checkbox">
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => handleDepartmentsToggle(field)(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const buildPayload = () => {
    const normalizeDepartment = (value) => (value ? value.trim().toUpperCase() : '');
    const features = Array.from(new Set(formState.features));
    const deliveryDepartments = formState.deliveryDepartments.map(normalizeDepartment).filter(Boolean);
    const pickupDepartments = formState.pickupDepartments.map(normalizeDepartment).filter(Boolean);
    const ratingNumber = Number(formState.rating);
    const rating =
      Number.isFinite(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5
        ? Math.round(ratingNumber)
        : undefined;

    return {
      name: formState.name,
      description: formState.description,
      rating,
      coverage: 'domestic',
      contractFlexibility: 'spot',
      modes: ['road'],
      serviceCapabilities: features,
      certifications: [],
      profile: {
        address: formState.profile.address,
        postalCode: formState.profile.postalCode,
        city: formState.profile.city,
        department: normalizeDepartment(formState.profile.department),
        contact: formState.profile.contact,
        phone: formState.profile.phone,
        unreachable: Boolean(formState.profile.unreachable),
        features,
        deliveryDepartments,
        pickupDepartments,
      },
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = buildPayload();

    try {
      if (isEditing) {
        await apiClient.put('/admin/providers/' + encodeURIComponent(formState.id), payload);
      } else {
        await apiClient.post('/admin/providers', payload);
      }
      closeModal();
      fetchProviders();
    } catch (err) {
      alert("Échec de l'enregistrement du fournisseur.");
    }
  };

  const handleDelete = async (providerId) => {
    if (!window.confirm('Supprimer ce fournisseur ?')) {
      return;
    }
    try {
      await apiClient.delete('/admin/providers/' + encodeURIComponent(providerId));
      fetchProviders();
    } catch (err) {
      alert('Impossible de supprimer ce fournisseur.');
    }
  };

  const handleImportSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setImportStatus('Veuillez sélectionner un fichier Excel.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setImportLoading(true);
    setImportStatus(null);
    try {
      const response = await apiClient.post('/admin/providers/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = response.data || {};
      const details = Array.isArray(data.items) && data.items.length
        ? `\nIDs: ${data.items.map((it) => it.externalRef).join(', ')}`
        : '';
      setImportStatus((data.message || (data.processed ? data.processed + ' fournisseurs importés.' : 'Import terminé.')) + details);
      setSelectedFile(null);
      fetchProviders();
    } catch (err) {
      setImportStatus("Échec de l'import. Vérifiez le format.");
    } finally {
      setImportLoading(false);
    }
  };

  const registerTariffInput = (providerId) => (node) => {
    if (node) {
      tariffFileInputs.current[providerId] = node;
    } else {
      delete tariffFileInputs.current[providerId];
    }
  };

  const registerAdditionalTariffInput = (providerId) => (node) => {
    if (node) {
      additionalTariffInputs.current[providerId] = node;
    } else {
      delete additionalTariffInputs.current[providerId];
    }
  };

  const handleTariffUploadClick = async (providerId) => {
    try {
      await apiClient.get('/admin/providers/' + encodeURIComponent(providerId));
    } catch (err) {
      alert('Transporteur introuvable. Rafraîchissez la liste ou réimportez-le.');
      return;
    }
    const input = tariffFileInputs.current[providerId];
    if (input) {
      input.click();
    }
  };

  const handleTariffFileChange = (provider) => async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const resetInput = () => {
      if (event.target) {
        event.target.value = '';
      }
    };

    const format = detectTariffFileFormat(file);
    if (!format) {
      setTariffUploadError('Veuillez sélectionner un PDF ou un Excel (.xls / .xlsx).');
      setTariffUploadStatus(null);
      resetInput();
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingProviderId(provider.id);
    setTariffUploadError(null);
    setTariffUploadStatus(null);

    try {
      const response = await apiClient.post(
        `/admin/providers/${encodeURIComponent(provider.id)}/tariff-document`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setTariffUploadStatus(
        response.data?.message || 'Document tarifaire importé avec succès.'
      );
      setTariffUploadError(null);
      fetchProviders();
    } catch (err) {
      setTariffUploadError(
        err?.response?.data?.error || "Échec de l'import du PDF."
      );
      setTariffUploadStatus(null);
    } finally {
      setUploadingProviderId(null);
      resetInput();
    }
  };

  const handleAdditionalTariffUploadClick = async (providerId) => {
    try {
      await apiClient.get('/admin/providers/' + encodeURIComponent(providerId));
    } catch (err) {
      alert('Transporteur introuvable. Rafraǩchissez la liste ou rǸimportez-le.');
      return;
    }
    const input = additionalTariffInputs.current[providerId];
    if (input) {
      input.click();
    }
  };

  const handleAdditionalTariffFileChange = (provider) => async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const resetInput = () => {
      if (event.target) {
        event.target.value = '';
      }
    };

    const format = detectTariffFileFormat(file);
    if (!format) {
      alert('Veuillez sélectionner un PDF ou un Excel (.xls / .xlsx).');
      resetInput();
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiClient.post(
        `/admin/providers/${encodeURIComponent(provider.id)}/tariff-documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      fetchProviders();
    } catch (err) {
      alert("�%chec de l'ajout de cette grille tarifaire.");
    } finally {
      resetInput();
    }
  };

  const handleDeleteAdditionalTariffDocument = async (providerId, documentId) => {
    if (!window.confirm('Supprimer ce document tarifaire ?')) {
      return;
    }
    try {
      await apiClient.delete(
        `/admin/providers/${encodeURIComponent(providerId)}/tariff-documents/${documentId}`
      );
      fetchProviders();
    } catch (err) {
      alert('Impossible de supprimer ce document.');
    }
  };

  const handleExcelCreationFileChange = (field) => (event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;

    if (field === 'tariffFile' && file) {
      const format = detectTariffFileFormat(file);
      if (!format) {
        if (event.target) {
          event.target.value = '';
        }
        setExcelCreationState((prev) => ({
          ...prev,
          error: 'La grille tarifaire doit être un PDF ou un Excel (.xls / .xlsx).',
          status: null,
        }));
        return;
      }
    }

    setExcelCreationState((prev) => ({
      ...prev,
      [field]: file,
      status: null,
      error: null,
    }));
  };

  const resetExcelInputs = () => {
    if (excelProviderInputRef.current) {
      excelProviderInputRef.current.value = '';
    }
    if (excelTariffInputRef.current) {
      excelTariffInputRef.current.value = '';
    }
  };

  const handleExcelCreationSubmit = async (event) => {
    event.preventDefault();
    if (!excelCreationState.providerFile) {
      setExcelCreationState((prev) => ({
        ...prev,
        error: 'Veuillez sélectionner le fichier Excel du fournisseur.',
        status: null,
      }));
      return;
    }

    const formData = new FormData();
    formData.append('providerExcel', excelCreationState.providerFile);
    if (excelCreationState.tariffFile) {
      formData.append('tariffPdf', excelCreationState.tariffFile);
    }

    setExcelCreationState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      status: null,
    }));

    try {
      const response = await apiClient.post('/admin/providers/import-single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setExcelCreationState({
        providerFile: null,
        tariffFile: null,
        loading: false,
        status: response.data?.message || 'Fournisseur importé depuis Excel.',
        error: null,
      });
      resetExcelInputs();
      fetchProviders();
    } catch (err) {
      setExcelCreationState((prev) => ({
        ...prev,
        loading: false,
        error: err?.response?.data?.error || "Échec de l'import du modèle Excel.",
      }));
    }
  };

  const pageSizeOptions = useMemo(() => meta?.pageSizeOptions || [10, 20, 30, 50], [meta]);

  return (
    <div className="admin-providers-container">
      <header className="admin-header">
        <div>
          <h1>Espace Admin - Fournisseurs</h1>
          <p>Gestion des transporteurs et import Excel.</p>
        </div>
          <div className="admin-header-actions">
            {onLogout && (
              <button type="button" className="btn" onClick={onLogout}>
                Se deconnecter
              </button>
            )}
            <button type="button" className="btn" onClick={openCreateModal}>
              Nouveau fournisseur
            </button>
            <form className="import-form" onSubmit={handleImportSubmit}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
            />
            <button type="submit" className="btn" disabled={importLoading}>
              {importLoading ? 'Import en cours…' : 'Importer Excel'}
            </button>
          </form>
          <a className="template-link" href={datasetTemplateUrl} target="_blank" rel="noreferrer">
            Télécharger le modèle dataset
          </a>
        </div>
      </header>

      {importStatus && <div className="import-status">{importStatus}</div>}
      {tariffUploadError && <div className="import-status error">{tariffUploadError}</div>}
      {tariffUploadStatus && <div className="import-status">{tariffUploadStatus}</div>}

      <section className="creation-modes">
        <div className="creation-card">
          <h3>Création via formulaire</h3>
          <p>
            Renseignez toutes les informations du transporteur manuellement puis ajoutez la grille
            tarifaire PDF depuis la liste des fournisseurs.
          </p>
          <div className="creation-card-actions">
            <button type="button" className="btn" onClick={openCreateModal}>
              Ouvrir le formulaire
            </button>
          </div>
        </div>
        <div className="creation-card">
          <h3>Importer un fournisseur via modèle Excel</h3>
          <p>
            Téléchargez le modèle et complétez une seule ligne avec les informations du transporteur.
            Une fois le fournisseur créé et visible dans la liste, importez sa grille (PDF ou Excel)
            depuis la colonne Actions de la ligne correspondante.
          </p>
          <a
            className="template-link"
            href={singleProviderTemplateUrl}
            target="_blank"
            rel="noreferrer"
          >
            Télécharger le modèle Excel
          </a>
          <form className="excel-import-form" onSubmit={handleExcelCreationSubmit}>
            <label>
              <span>Fichier fournisseur (Excel) *</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                ref={excelProviderInputRef}
                onChange={handleExcelCreationFileChange('providerFile')}
                required
              />
              {excelCreationState.providerFile && (
                <small className="file-name">{excelCreationState.providerFile.name}</small>
              )}
            </label>
            <button type="submit" className="btn" disabled={excelCreationState.loading}>
              {excelCreationState.loading ? 'Import en cours…' : 'Créer ce fournisseur'}
            </button>
          </form>
          {excelCreationState.error && (
            <div className="import-status error">{excelCreationState.error}</div>
          )}
          {excelCreationState.status && (
            <div className="import-status">{excelCreationState.status}</div>
          )}
        </div>
        <div className="creation-card">
          <h3>Modèle de grille tarifaire</h3>
          <p>
            Téléchargez un modèle Excel de grille tarifaire à remplir pour un transporteur, puis utilisez la colonne “Actions” de la liste pour importer le fichier.
          </p>
          <div className="creation-card-actions">
            <a
              className="btn"
              href={(apiClient.defaults?.baseURL || '').replace(/\/$/, '') + '/admin/providers/tariff/template'}
              target="_blank"
              rel="noreferrer"
            >
              Télécharger le modèle de grille
            </a>
          </div>
        </div>
      </section>

      <section className="admin-list-section">
        <div className="admin-list-controls">
          <label className="search-inline">
            <span>Recherche</span>
            <input
              type="text"
              placeholder="Nom, adresse, contact, ville, département…"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            <span>Résultats / page</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <div className="pagination">
            <button type="button" onClick={() => setPage(Math.max(page - 1, 1))} disabled={page <= 1 || loading}>
              Précédent
            </button>
            <span>
              Page {meta?.page ?? page} / {meta?.totalPages ?? '?'}
            </span>
            <button
              type="button"
              onClick={() => setPage(meta?.hasNextPage ? page + 1 : page)}
              disabled={!meta?.hasNextPage || loading}
            >
              Suivant
            </button>
          </div>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <div className="admin-table-wrapper">
          {loading ? (
            <p>Chargement…</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Adresse</th>
                  <th>Contact</th>
                  <th>Téléphone</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                    {providers.map((provider) => {
                      const tariffFormatLabel = provider.hasTariffDocument
                        ? getTariffFormatLabel(provider.tariffDocumentFormat)
                        : null;
                      const manageButtonLabel = uploadingProviderId === provider.id
                        ? 'Import en cours...'
                        : provider.hasTariffDocument
                        ? `Remplacer ${tariffFormatLabel}`
                        : 'Ajouter PDF / XLS';
                      return (
                        <tr key={provider.id}>
                          <td>{provider.name}</td>
                          <td>{provider.profile?.address || '--'}</td>
                          <td>{provider.profile?.contact || '--'}</td>
                          <td>{provider.profile?.phone || '--'}</td>
                          <td>{provider.rating != null ? provider.rating : '--'}</td>
                          <td className="table-actions">
                            <button type="button" onClick={() => openEditModal(provider)}>
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDelete(provider.id)}
                            >
                              Supprimer
                            </button>
                            <div className="tariff-upload-group">
                              <div className="tariff-section">
                                <p className="tariff-section-title">Grille principale</p>
                                <input
                                  type="file"
                                  accept={TARIFF_FILE_ACCEPT}
                                  ref={registerTariffInput(provider.id)}
                                  style={{ display: 'none' }}
                                  onChange={handleTariffFileChange(provider)}
                                />
                                <div className="tariff-primary-actions">
                                  <button
                                    type="button"
                                    onClick={() => handleTariffUploadClick(provider.id)}
                                    disabled={uploadingProviderId === provider.id}
                                  >
                                    {manageButtonLabel}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openTariffImportFor(provider.id)}
                                    title="Importer une grille via formulaire"
                                    className="link-button"
                                  >
                                    Importer via formulaire
                                  </button>
                                </div>
                                {provider.tariffDocumentFilename && (
                                  <small
                                    className="tariff-upload-hint"
                                    title={provider.tariffDocumentFilename}
                                  >
                                    {provider.tariffDocumentFilename}
                                  </small>
                                )}
                              </div>

                              <div className="tariff-section">
                                <div className="tariff-section-header">
                                  <p className="tariff-section-title">Grilles supplémentaires</p>
                                  <button
                                    type="button"
                                    className="small-btn"
                                    onClick={() => handleAdditionalTariffUploadClick(provider.id)}
                                  >
                                    Ajouter un doc
                                  </button>
                                </div>
                                <input
                                  type="file"
                                  accept={TARIFF_FILE_ACCEPT}
                                  ref={registerAdditionalTariffInput(provider.id)}
                                  style={{ display: 'none' }}
                                  onChange={handleAdditionalTariffFileChange(provider)}
                                />
                                {Array.isArray(provider.tariffDocuments) &&
                                  provider.tariffDocuments.length > 0 ? (
                                    <ul className="tariff-documents-list">
                                      {provider.tariffDocuments.map((doc) => (
                                        <li key={doc.id}>
                                          <div className="tariff-document-info">
                                            <a
                                              href={doc.downloadUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              {doc.originalName || doc.filename}
                                            </a>
                                            <small>{doc.format?.toUpperCase()}</small>
                                          </div>
                                          <div className="tariff-documents-actions">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleDeleteAdditionalTariffDocument(
                                                  provider.id,
                                                  doc.id
                                                )
                                              }
                                            >
                                              Supprimer
                                            </button>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <small className="tariff-upload-hint">
                                      Aucun document supplémentaire.
                                    </small>
                                  )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {isModalOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h2>{isEditing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h2>
            <form onSubmit={handleSubmit} className="admin-form">
              <label>
                <span>Nom du transporteur *</span>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </label>

              <label>
                <span>Description / Remarque</span>
                <textarea
                  value={formState.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </label>

              <label>
                <span>Note (1 à 5)</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formState.rating}
                  onChange={(e) => handleChange('rating', e.target.value)}
                  placeholder="--"
                />
              </label>

              <fieldset className="form-fieldset">
                <legend>Informations fournisseur</legend>
                <div className="form-grid">
                  <label>
                    <span>Adresse</span>
                    <input
                      type="text"
                      value={formState.profile.address}
                      onChange={(e) => handleProfileChange('address', e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Code postal</span>
                    <input
                      type="text"
                      value={formState.profile.postalCode}
                      onChange={(e) => handleProfileChange('postalCode', e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Ville</span>
                    <input
                      type="text"
                      value={formState.profile.city}
                      onChange={(e) => handleProfileChange('city', e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Département</span>
                    <input
                      type="text"
                      value={formState.profile.department}
                      onChange={(e) => handleProfileChange('department', e.target.value.toUpperCase())}
                      placeholder="01, 69..."
                    />
                  </label>
                  <label>
                    <span>Contact</span>
                    <input
                      type="text"
                      value={formState.profile.contact}
                      onChange={(e) => handleProfileChange('contact', e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Téléphone</span>
                    <input
                      type="text"
                      value={formState.profile.phone}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                    />
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={formState.profile.unreachable}
                      onChange={(e) => handleProfileChange('unreachable', e.target.checked)}
                    />
                    <span>Ne répond pas</span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="form-fieldset">
                <legend>Équipements / services</legend>
                <div className="features-grid">
                  {FEATURE_OPTIONS.map((option) => (
                    <label key={option.value} className="checkbox">
                      <input
                        type="checkbox"
                        checked={formState.features.includes(option.value)}
                        onChange={() => handleDepartmentsToggle('features')(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="form-fieldset">
                <legend>Départements couverts</legend>
                <div className="dept-picker-grid">
                  <DepartmentPicker label="Départ (chargement)" field="pickupDepartments" />
                  <DepartmentPicker label="Arrivée (livraison)" field="deliveryDepartments" />
                </div>
              </fieldset>

              <div className="form-actions">
                <button type="submit" className="btn primary">
                  {isEditing ? 'Mettre à jour' : 'Créer'}
                </button>
                <button type="button" className="btn" onClick={closeModal}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tariffImportModalOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h2>Importer une grille tarifaire</h2>
            <form className="admin-form" onSubmit={handleTariffImportSubmit}>
              <label>
                <span>Mode d'import *</span>
                <select value={tariffImportState.mode} onChange={handleTariffImportChange('mode')} required>
                  <option value="document">Document (PDF / Excel converti en PDF)</option>
                  <option value="catalog">Grille en base (Excel modèle)</option>
                </select>
              </label>
              <label>
                <span>Fournisseur *</span>
                <select
                  value={tariffImportState.providerId}
                  onChange={handleTariffImportChange('providerId')}
                  required
                >
                  <option value="">-- Sélectionner --</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Grille tarifaire (PDF ou Excel) *</span>
                <input
                  type="file"
                  accept={TARIFF_FILE_ACCEPT}
                  onChange={handleTariffImportChange('file')}
                  required
                />
                {tariffImportState.file && (
                  <small className="file-name">{tariffImportState.file.name}</small>
                )}
              </label>
              <div className="form-actions">
                <button type="submit" className="btn primary" disabled={tariffImportState.loading}>
                  {tariffImportState.loading ? 'Import en cours…' : 'Importer'}
                </button>
                <button type="button" className="btn" onClick={closeTariffImportModal}>
                  Annuler
                </button>
              </div>
            </form>
            {tariffImportState.error && (
              <div className="import-status error">{tariffImportState.error}</div>
            )}
            {tariffImportState.status && (
              <div className="import-status">{tariffImportState.status}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProviders;
