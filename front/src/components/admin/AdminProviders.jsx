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

const createDefaultFormState = () => ({
  id: "",
  name: "",
  description: "",
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

const AdminProviders = () => {
  const [providers, setProviders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [formState, setFormState] = useState(() => createDefaultFormState());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const departmentOptions = useMemo(() => {
    const deliveryCodes = meta?.availableFilters?.deliveryDepartments || [];
    const pickupCodes = meta?.availableFilters?.pickupDepartments || [];
    const codes = deliveryCodes.length || pickupCodes.length
      ? Array.from(new Set([...deliveryCodes, ...pickupCodes]))
      : DEFAULT_DEPARTMENTS;
    return codes.map((code) => ({ value: code, label: code }));
  }, [meta]);

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
  }, [page, pageSize]);

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

    return {
      name: formState.name,
      description: formState.description,
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
      setImportStatus(data.message || (data.processed ? data.processed + ' fournisseurs importés.' : 'Import terminé.'));
      setSelectedFile(null);
      fetchProviders();
    } catch (err) {
      setImportStatus("Échec de l'import. Vérifiez le format.");
    } finally {
      setImportLoading(false);
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
        </div>
      </header>

      {importStatus && <div className="import-status">{importStatus}</div>}

      <section className="admin-list-section">
        <div className="admin-list-controls">
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr key={provider.id}>
                    <td>{provider.name}</td>
                    <td>{provider.profile?.address || '--'}</td>
                    <td>{provider.profile?.contact || '--'}</td>
                    <td>{provider.profile?.phone || '--'}</td>
                    <td className="table-actions">
                      <button type="button" onClick={() => openEditModal(provider)}>
                        Modifier
                      </button>
                      <button type="button" className="danger" onClick={() => handleDelete(provider.id)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
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
    </div>
  );
};

export default AdminProviders;
