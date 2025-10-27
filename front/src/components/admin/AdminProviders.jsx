import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../utils/apiClient';
import './adminProviders.css';

const defaultFormState = {
  id: '',
  name: '',
  description: '',
  notes: '',
  coverage: 'domestic',
  contractFlexibility: 'spot',
  leadTimeDays: '',
  onTimeRate: '',
  pricePerKm: '',
  baseHandlingFee: '',
  minShipmentKg: '',
  co2GramsPerTonneKm: '',
  customerSatisfaction: '',
  modes: 'road',
  regions: '',
  serviceCapabilities: '',
  certifications: '',
  profile: {
    address: '',
    postalCode: '',
    city: '',
    department: '',
    contact: '',
    phone: '',
    email: '',
    unreachable: false,
    features: '',
    deliveryDepartments: '',
    pickupDepartments: '',
  },
};

const toList = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const AdminProviders = () => {
  const [providers, setProviders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [formState, setFormState] = useState(defaultFormState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

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
    setFormState(defaultFormState);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (provider) => {
    const profile = provider.profile || {};
    setFormState({
      id: provider.id,
      name: provider.name || '',
      description: provider.description || '',
      notes: provider.notes || '',
      coverage: provider.coverage || 'domestic',
      contractFlexibility: provider.contractFlexibility || 'spot',
      leadTimeDays: provider.leadTimeDays ?? '',
      onTimeRate: provider.onTimeRate ?? '',
      pricePerKm: provider.pricePerKm ?? '',
      baseHandlingFee: provider.baseHandlingFee ?? '',
      minShipmentKg: provider.minShipmentKg ?? '',
      co2GramsPerTonneKm: provider.co2GramsPerTonneKm ?? '',
      customerSatisfaction: provider.customerSatisfaction ?? '',
      modes: (provider.modes || []).join(', '),
      regions: (provider.regions || []).join(', '),
      serviceCapabilities: (provider.serviceCapabilities || []).join(', '),
      certifications: (provider.certifications || []).join(', '),
      profile: {
        address: profile.address || '',
        postalCode: profile.postalCode || '',
        city: profile.city || '',
        department: profile.department || '',
        contact: profile.contact || '',
        phone: profile.phone || '',
        email: profile.email || '',
        unreachable: Boolean(profile.unreachable),
        features: (profile.features || []).join(', '),
        deliveryDepartments: (profile.deliveryDepartments || []).join(', '),
        pickupDepartments: (profile.pickupDepartments || []).join(', '),
      },
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setFormState(defaultFormState);
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

  const buildPayload = () => ({
    name: formState.name,
    description: formState.description,
    notes: formState.notes,
    coverage: formState.coverage,
    contractFlexibility: formState.contractFlexibility,
    leadTimeDays: formState.leadTimeDays,
    onTimeRate: formState.onTimeRate,
    pricePerKm: formState.pricePerKm,
    baseHandlingFee: formState.baseHandlingFee,
    minShipmentKg: formState.minShipmentKg,
    co2GramsPerTonneKm: formState.co2GramsPerTonneKm,
    customerSatisfaction: formState.customerSatisfaction,
    modes: toList(formState.modes),
    regions: toList(formState.regions),
    serviceCapabilities: toList(formState.serviceCapabilities),
    certifications: toList(formState.certifications),
    profile: {
      address: formState.profile.address,
      postalCode: formState.profile.postalCode,
      city: formState.profile.city,
      department: formState.profile.department,
      contact: formState.profile.contact,
      phone: formState.profile.phone,
      email: formState.profile.email,
      unreachable: Boolean(formState.profile.unreachable),
      features: toList(formState.profile.features),
      deliveryDepartments: toList(formState.profile.deliveryDepartments),
      pickupDepartments: toList(formState.profile.pickupDepartments),
    },
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = buildPayload();

    try {
      if (isEditing) {
        await apiClient.put('/admin/providers/' + formState.id, payload);
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
      await apiClient.delete('/admin/providers/' + providerId);
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
                  <th>Couverture</th>
                  <th>Prix / km</th>
                  <th>Base</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr key={provider.id}>
                    <td>{provider.name}</td>
                    <td>{provider.coverage}</td>
                    <td>{provider.pricePerKm && provider.pricePerKm.toFixed ? provider.pricePerKm.toFixed(2) : '--'} €</td>
                    <td>{provider.baseHandlingFee && provider.baseHandlingFee.toFixed ? provider.baseHandlingFee.toFixed(2) : '--'} €</td>
                    <td>{provider.profile && provider.profile.contact ? provider.profile.contact : '--'}</td>
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
              <div className="form-grid">
                <label>
                  <span>Nom *</span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Couverture</span>
                  <select
                    value={formState.coverage}
                    onChange={(e) => handleChange('coverage', e.target.value)}
                  >
                    <option value="domestic">National</option>
                    <option value="regional">Régional</option>
                    <option value="europe">Europe</option>
                    <option value="global">Global</option>
                  </select>
                </label>
                <label>
                  <span>Flexibilité contrat</span>
                  <select
                    value={formState.contractFlexibility}
                    onChange={(e) => handleChange('contractFlexibility', e.target.value)}
                  >
                    <option value="spot">Spot</option>
                    <option value="monthly">Mensuel</option>
                    <option value="quarterly">Trimestriel</option>
                    <option value="annual">Annuel</option>
                  </select>
                </label>
                <label>
                  <span>Prix / km (€)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formState.pricePerKm}
                    onChange={(e) => handleChange('pricePerKm', e.target.value)}
                  />
                </label>
                <label>
                  <span>Base (€)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formState.baseHandlingFee}
                    onChange={(e) => handleChange('baseHandlingFee', e.target.value)}
                  />
                </label>
                <label>
                  <span>Délai (jours)</span>
                  <input
                    type="number"
                    value={formState.leadTimeDays}
                    onChange={(e) => handleChange('leadTimeDays', e.target.value)}
                  />
                </label>
              </div>

              <label>
                <span>Description</span>
                <textarea
                  value={formState.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </label>

              <div className="form-grid">
                <label>
                  <span>Modes</span>
                  <input
                    type="text"
                    value={formState.modes}
                    onChange={(e) => handleChange('modes', e.target.value)}
                    placeholder="road, air"
                  />
                </label>
                <label>
                  <span>Services</span>
                  <input
                    type="text"
                    value={formState.serviceCapabilities}
                    onChange={(e) => handleChange('serviceCapabilities', e.target.value)}
                    placeholder="express, adr"
                  />
                </label>
                <label>
                  <span>Certifications</span>
                  <input
                    type="text"
                    value={formState.certifications}
                    onChange={(e) => handleChange('certifications', e.target.value)}
                  />
                </label>
              </div>

              <fieldset className="form-fieldset">
                <legend>Profil</legend>
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
                      onChange={(e) => handleProfileChange('department', e.target.value)}
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
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={formState.profile.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                    />
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={formState.profile.unreachable}
                      onChange={(e) => handleProfileChange('unreachable', e.target.checked)}
                    />
                    <span>Non joignable</span>
                  </label>
                </div>
                <label>
                  <span>Équipements / options</span>
                  <input
                    type="text"
                    value={formState.profile.features}
                    onChange={(e) => handleProfileChange('features', e.target.value)}
                    placeholder="express, adr, semi-fourgon"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    <span>Départements de livraison</span>
                    <input
                      type="text"
                      value={formState.profile.deliveryDepartments}
                      onChange={(e) => handleProfileChange('deliveryDepartments', e.target.value)}
                      placeholder="01, 69, 75"
                    />
                  </label>
                  <label>
                    <span>Départements de chargement</span>
                    <input
                      type="text"
                      value={formState.profile.pickupDepartments}
                      onChange={(e) => handleProfileChange('pickupDepartments', e.target.value)}
                      placeholder="01, 69, 75"
                    />
                  </label>
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
