const crypto = require('crypto');
const providerData = require('../data/providers');

const loadSeedProviders =
  (providerData && providerData.loadSeedProviders && providerData.loadSeedProviders.bind(providerData)) ||
  (() => (Array.isArray(providerData) ? providerData : []));

const seedProviders = Array.isArray(providerData) ? providerData : loadSeedProviders();

const withProfileDefaults = (provider) => ({
  ...provider,
  profile: {
    address: '',
    postalCode: '',
    city: '',
    department: '',
    contact: '',
    phone: '',
    unreachable: false,
    features: [],
    deliveryDepartments: [],
    pickupDepartments: [],
    ...(provider.profile || {}),
  },
});

let providers = seedProviders.map((provider) => withProfileDefaults(provider));

const clone = (provider) => (provider ? JSON.parse(JSON.stringify(provider)) : null);

const listProviders = () => providers.map((provider) => ({ ...provider }));

const findProviderById = (id) => providers.find((provider) => provider.id === id);

const generateId = (name) => {
  const slug = (name || 'provider')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16);
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `prt-${slug}-${randomSuffix}`;
};

const addProvider = (providerInput) => {
  const baseName = providerInput.name || 'Provider';
  const id = providerInput.id && !findProviderById(providerInput.id) ? providerInput.id : generateId(baseName);

  const provider = withProfileDefaults({
    ...providerInput,
    id,
  });

  providers.push(provider);

  return clone(provider);
};

const updateProvider = (id, updates) => {
  const index = providers.findIndex((provider) => provider.id === id);

  if (index === -1) {
    return null;
  }

  providers[index] = {
    ...providers[index],
    ...updates,
    id,
  };

  return clone(providers[index]);
};

const deleteProvider = (id) => {
  const index = providers.findIndex((provider) => provider.id === id);
  if (index === -1) {
    return false;
  }

  providers.splice(index, 1);
  return true;
};

const resetProviders = () => {
  providers = loadSeedProviders().map((provider) => withProfileDefaults(provider));
};

module.exports = {
  listProviders,
  findProviderById,
  addProvider,
  updateProvider,
  deleteProvider,
  resetProviders,
};
