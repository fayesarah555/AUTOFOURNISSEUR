#!/bin/bash

# ==============================================
# AUTOFOURNISSEUR - Script de déploiement
# ==============================================

echo "🚀 Démarrage du déploiement AUTOFOURNISSEUR..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérification du fichier .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Erreur: Le fichier .env n'existe pas!${NC}"
    echo -e "${YELLOW}Veuillez créer le fichier .env avant de continuer.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Fichier .env trouvé${NC}"

# Arrêt des containers existants
echo "🛑 Arrêt des containers existants..."
docker-compose down

# Nettoyage (optionnel - décommentez si nécessaire)
# echo "🧹 Nettoyage des images obsolètes..."
# docker-compose down --rmi all --volumes

# Build sans cache pour le frontend (important!)
echo "🏗️  Build du frontend (sans cache)..."
docker-compose build --no-cache front

# Build des autres services
echo "🏗️  Build des autres services..."
docker-compose build back

# Démarrage des services
echo "🚀 Démarrage des services..."
docker-compose up -d

# Attente que les services soient prêts
echo "⏳ Attente du démarrage complet..."
sleep 10

# Vérification du statut
echo ""
echo "📊 Statut des services:"
docker-compose ps

# Test de connectivité
echo ""
echo "🧪 Test de connectivité..."

# Test de la base de données
if docker-compose exec -T db mysqladmin ping -h localhost -u${DB_USER:-appuser} -p${DB_PASSWORD:-apppassword} &>/dev/null; then
    echo -e "${GREEN}✓ Base de données: OK${NC}"
else
    echo -e "${RED}✗ Base de données: ERREUR${NC}"
fi

# Test du backend
if curl -f http://localhost:8080 &>/dev/null; then
    echo -e "${GREEN}✓ Backend: OK${NC}"
else
    echo -e "${YELLOW}⚠ Backend: Vérifiez les logs${NC}"
fi

# Test du frontend
if curl -f http://localhost:3000 &>/dev/null; then
    echo -e "${GREEN}✓ Frontend: OK${NC}"
else
    echo -e "${YELLOW}⚠ Frontend: Vérifiez les logs${NC}"
fi

# Test de nginx
if curl -f http://localhost &>/dev/null; then
    echo -e "${GREEN}✓ Nginx: OK${NC}"
else
    echo -e "${YELLOW}⚠ Nginx: Vérifiez les logs${NC}"
fi

echo ""
echo "======================================"
echo "🎉 Déploiement terminé!"
echo "======================================"
echo ""
echo "📍 Accès à l'application:"
echo "   - Frontend: http://localhost"
echo "   - API: http://localhost/api"
echo "   - Backend direct: http://localhost:8080"
echo "   - Database: localhost:3307"
echo ""
echo "📝 Commandes utiles:"
echo "   - Logs en temps réel: docker-compose logs -f"
echo "   - Logs d'un service: docker-compose logs -f [front|back|db|nginx]"
echo "   - Redémarrer: docker-compose restart"
echo "   - Arrêter: docker-compose down"
echo ""
