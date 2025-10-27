const EQUIPMENT_DEFINITIONS = [
  { feature: 'semi-tautliner', code: 'semi_taut', label: 'Semi tautliner', category: 'semi' },
  { feature: 'semi-fourgon', code: 'semi_fourgon', label: 'Semi fourgon', category: 'semi' },
  { feature: 'semi-frigorifique', code: 'semi_frigo', label: 'Semi frigorifique', category: 'semi' },
  { feature: 'semi-hayon', code: 'semi_hayon', label: 'Semi hayon', category: 'semi' },
  { feature: 'porteur-tole', code: 'porteur_tole', label: 'Porteur tôlé', category: 'porteur' },
  { feature: 'porteur-taut', code: 'porteur_taut', label: 'Porteur tautliner', category: 'porteur' },
  { feature: 'porteur-hayon', code: 'porteur_hayon', label: 'Porteur hayon', category: 'porteur' },
  { feature: 'vehicule-leger', code: 'vehicule_leger', label: 'Véhicule léger', category: 'light_vehicle' },
];

const SERVICE_DEFINITIONS = [
  { feature: 'express', code: 'express', label: 'Express' },
  { feature: 'adr', code: 'adr', label: 'ADR' },
  { feature: 'international', code: 'international', label: 'International' },
  { feature: 'grue', code: 'grue', label: 'Grue embarquée' },
  { feature: 'chariot-embarque', code: 'chariot_embarque', label: 'Chariot embarqué' },
  { feature: 'fosse', code: 'fosse', label: 'Fosse de dépotage' },
  { feature: 'porte-char', code: 'porte_chars', label: 'Porte-chars' },
  { feature: 'convoi-exceptionnel', code: 'convoi_exceptionnel', label: 'Convoi exceptionnel' },
];

const equipmentByFeature = new Map(EQUIPMENT_DEFINITIONS.map((item) => [item.feature, item]));
const equipmentByCode = new Map(EQUIPMENT_DEFINITIONS.map((item) => [item.code, item]));

const serviceByFeature = new Map(SERVICE_DEFINITIONS.map((item) => [item.feature, item]));
const serviceByCode = new Map(SERVICE_DEFINITIONS.map((item) => [item.code, item]));

module.exports = {
  EQUIPMENT_DEFINITIONS,
  SERVICE_DEFINITIONS,
  equipmentByFeature,
  equipmentByCode,
  serviceByFeature,
  serviceByCode,
};
