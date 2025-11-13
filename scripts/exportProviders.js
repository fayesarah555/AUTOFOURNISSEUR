const fs = require('fs');
const path = require('path');
const providersModule = require(path.resolve(__dirname, '../back/data/providers'));
const providers = providersModule
  .loadFromExcel(providersModule.EXCEL_PATH)
  .map((provider, index) => ({
    ...provider,
    rating:
      provider.rating !== undefined && provider.rating !== null
        ? provider.rating
        : ((index % 5) + 1),
  }));
const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceFile: path.relative(process.cwd(), providersModule.EXCEL_PATH),
  totalProviders: providers.length,
  providers,
};
const outputPath = path.resolve(__dirname, '../samples/providers-import-model.json');
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
console.log('Wrote', providers.length, 'providers to', path.relative(process.cwd(), outputPath));
