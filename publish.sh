#!/bin/bash

# Culori pentru output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Script publicare pachet NPM ===${NC}"

# Verifică dacă utilizatorul este autentificat la npm
echo -e "${YELLOW}Verificăm autentificarea la npm...${NC}"
NPM_USER=$(npm whoami 2>/dev/null)

if [ $? -ne 0 ]; then
  echo -e "${RED}Nu ești autentificat la npm. Te rog să te autentifici:${NC}"
  npm login
else
  echo -e "${GREEN}Ești autentificat ca: $NPM_USER${NC}"
fi

# Verifică versiunea curentă
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Versiunea curentă: ${GREEN}$CURRENT_VERSION${NC}"

# Întreabă dacă dorește să incrementeze versiunea
read -p "Dorești să incrementezi versiunea? (y/n): " CHANGE_VERSION

if [ "$CHANGE_VERSION" = "y" ]; then
  echo -e "${YELLOW}Alege tipul de incrementare:${NC}"
  echo "1) patch (0.8.0 -> 0.8.1) - pentru bugfixuri"
  echo "2) minor (0.8.0 -> 0.9.0) - pentru funcționalități noi"
  echo "3) major (0.8.0 -> 1.0.0) - pentru schimbări breaking"
  read -p "Alegere (1-3): " VERSION_TYPE
  
  case $VERSION_TYPE in
    1) npm version patch --no-git-tag-version ;;
    2) npm version minor --no-git-tag-version ;;
    3) npm version major --no-git-tag-version ;;
    *) echo -e "${RED}Opțiune invalidă, păstrăm versiunea actuală${NC}" ;;
  esac
  
  NEW_VERSION=$(node -p "require('./package.json').version")
  echo -e "${GREEN}Versiune actualizată la: $NEW_VERSION${NC}"
fi

# Construiește pachetul
echo -e "${YELLOW}Construim pachetul...${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Eroare la build! Procesul de publicare s-a oprit.${NC}"
  exit 1
fi

echo -e "${GREEN}Build cu succes!${NC}"

# Verifică dacă există fișierul NPM_README.md și îl copiază temporar peste README.md dacă există
if [ -f "NPM_README.md" ]; then
  echo -e "${YELLOW}Folosim NPM_README.md pentru publicare...${NC}"
  cp README.md README.md.backup
  cp NPM_README.md README.md
fi

# Publică pachetul
echo -e "${YELLOW}Publicăm pachetul pe npm...${NC}"
npm publish --access public

PUBLISH_RESULT=$?

# Restaurează README.md dacă a fost modificat
if [ -f "README.md.backup" ]; then
  mv README.md.backup README.md
  echo -e "${YELLOW}README original restaurat.${NC}"
fi

# Verifică rezultatul publicării
if [ $PUBLISH_RESULT -ne 0 ]; then
  echo -e "${RED}Eroare la publicare!${NC}"
  exit 1
fi

PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

echo -e "${GREEN}=== Pachet publicat cu succes! ===${NC}"
echo -e "Pachet: ${GREEN}$PACKAGE_NAME@$PACKAGE_VERSION${NC}"
echo -e "${YELLOW}Pachetul poate fi accesat cu:${NC}"
echo -e "${GREEN}npx $PACKAGE_NAME${NC}"
echo -e "${YELLOW}Pentru autentificare:${NC}"
echo -e "${GREEN}npx $PACKAGE_NAME auth${NC}"

# Sugerează să commit și tag în git
echo -e "\n${YELLOW}Nu uita să commit-ui schimbările în git:${NC}"
echo -e "${GREEN}git add .${NC}"
echo -e "${GREEN}git commit -m \"Bump version to $PACKAGE_VERSION\"${NC}"
echo -e "${GREEN}git tag v$PACKAGE_VERSION${NC}"
echo -e "${GREEN}git push && git push --tags${NC}" 