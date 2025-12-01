# Déploiement rapide (VM Debian fresh) — AUTOFOURNISSEUR

Ce guide couvre l'installation des dépendances système, Docker, et les commandes pour lancer le projet (back + front + MariaDB) via Docker Compose.

## 1) Pré-requis système (Debian/Ubuntu)
Si la VM est vierge sans `sudo`, connecte-toi en root (`su -`) ou préfixe les commandes par `sudo` si tu l’installes.
```bash
apt-get update && apt-get install -y ca-certificates curl gnupg lsb-release apt-transport-https software-properties-common git build-essential python3
```

## 2) Installer Docker + Compose (officiel Docker)
```bash
# Ajouter la clé GPG
install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && chmod a+r /etc/apt/keyrings/docker.gpg

# Ajouter le dépôt Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# (Optionnel) Utiliser Docker sans sudo
usermod -aG docker $USER
```
Reconnecte-toi si tu ajoutes ton utilisateur au groupe `docker`.

## 3) Récupérer le code
```bash
git clone <repo> autofournisseur
cd autofournisseur
```

## 4) Variables d'environnement
```bash
cp .env.example .env
# Ajuste les secrets si besoin (ports, mots de passe DB, SECRET_KEY, etc.)
```

## 5) Lancer l'environnement complet (MariaDB + API + Front)
```bash
docker compose up --build -d
```
- Front : http://localhost:3000  
- API : http://localhost:8080 (ping `/health`)  
- DB : port host `${DB_PORT:-3307}` vers 3306 container, init via `back/config/schema.sql` + `back/config/seed_pallets.sql`.

## 6) Importer les transporteurs (Excel) via script
Assure-toi que le back est up (Docker ou local), puis :
```bash
# Depuis la racine du repo
cd back
node scripts/importExcel.js ../samples/transporteur_demo_10.xlsx
# ou sans argument -> utilisera back/Liste Global transporteurs.xlsx
```
Le script utilise `continueOnError`, donc il traite toutes les lignes et affiche les erreurs éventuelles.

## 7) Lancer local hors Docker (optionnel)
### Backend
```bash
cd back
npm ci
npm run dev   # port 8080 par défaut
```
### Frontend
```bash
cd front
npm ci
npm start     # port 3000, attend l'API sur http://localhost:8080
```

## 8) Commandes utiles Docker
```bash
# Logs
docker compose logs -f back
docker compose logs -f front
docker compose logs -f db

# Redémarrer un service
docker compose restart back

# Arrêter tout
docker compose down
```

## 9) Notes
- Images utilisées : `node:20-alpine` (build front/back) et `mariadb:11.4`.
- Les uploads/documents tarifaires sont persistés via le volume `back_public`.
- La recherche et les imports admin/consultation sont exposés via le front (Nginx).
