const fs = require("fs");
const path = require("path");

const { importProviders } = require("../services/providerImportService");
const { pool } = require("../config/mariadb");

const DEFAULT_JSON = path.resolve(__dirname, "../../samples/providers-import-model.json");

const main = async () => {
  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : DEFAULT_JSON;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Fichier introuvable : ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const payload = JSON.parse(raw);
  const providers = Array.isArray(payload.providers) ? payload.providers : payload;

  if (!Array.isArray(providers) || providers.length === 0) {
    throw new Error("Aucun fournisseur dans le fichier JSON.");
  }

  const sourceSheet =
    payload.source && ["TPS_National", "TPS_Espagnols", "CUSTOM"].includes(payload.source)
      ? payload.source
      : "CUSTOM";

  const result = await importProviders(providers, { sourceSheet });
  console.log(`Importé ${result.processed} fournisseur(s) depuis ${path.relative(process.cwd(), inputPath)}`);
};

main()
  .catch((error) => {
    console.error("Import échoué :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
