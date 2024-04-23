#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

# ANSI color codes
GREEN='\033[0;32m'
LGREEN='\033[1;32m'
LGREY='\033[0;37m'
WHITE='\033[1;37m'
BLUE='\033[0;34m'
LBLUE='\033[1;34m'
RED='\033[0;31m'
PINK='\033[1;31m'
PURPLE='\033[0;35m'
MAGENTA='\033[1;35m'
CYAN='\033[0;36m'
LCYAN='\033[1;36m'

echo -e "${LGREEN}Rebuilding FCW images...${LGREY}"
../scripts/freeciv-img-extract/sync.sh -f ../freeciv/freeciv -o src/derived/webapp
echo -e "${PINK}REMINDER 1: ${LCYAN}./build.sh${LGREY} required to incorporate new images into active website."
echo -e "${MAGENTA}REMINDER 2: ${LGREY}Convert ${CYAN}src/derived/webapp/tileset${LGREY} files to ${WHITE}.webp${LGREY} before ${LCYAN}./build.sh${LGREY}"

# let user know when it's finished
echo $'\a'

