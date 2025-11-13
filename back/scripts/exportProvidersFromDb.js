const fs = require('fs');
const path = require('path');

const { listProviders } = require('../repositories/providerRepository');
const { pool } = require('../config/mariadb');

const main = async () => {
  try {
    const providers = await listProviders();
    const payload = {
      version: 1,
      generatedAt: new Date().toISOString(),
      source: 'database',
      totalProviders: providers.length,
      providers,
    };

    const outputPath = path.resolve(__dirname, '../../samples/providers-export-db.json');
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Exporté ${providers.length} fournisseurs vers ${path.relative(process.cwd(), outputPath)}`);
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error('Export échoué :', error);
  process.exit(1);
});
