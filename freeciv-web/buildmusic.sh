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

BATCH_MODE=""

#Build site:
while [[ $# -gt 0 ]]; do
  case $1 in
    -B) BATCH_MODE="-B"; shift;;
    *) echo "Unrecognized argument: $1"; shift;;
  esac
done

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"

TOMCATDIR="/var/lib/tomcat8"
MUSICDIR="/var/lib/tomcat8/webapps/data/music"
WEBAPP_DIR="${DIR}/target/freeciv-web"

echo " "
echo -e "${MAGENTA}buildmusic.sh ${PURPLE}                   Copies game soundtrack into the webapp."
echo -e "${WHITE}------------------------------------------------------------------------${LGREY}"
echo -e "${LBLUE}${MUSICDIR} ${LGREY}is assumed to be manually installed."
echo -e "${RED}Wait for Apache Tomcat to have site up, before running.${LGREY} When page can"
echo -e "reload, this script can be run. Otherwise may create file system issues."
echo -e "${WHITE}------------------------------------------------------------------------${LGREY}"
echo -e "${LGREEN}Copying${LBLUE} ${MUSICDIR} ${LGREY}to:"
echo -e "       ${LBLUE} ${TOMCATDIR}/webapps/freeciv-web/music"
echo -e "${WHITE}------------------------------------------------------------------------${LGREY}"
cp -dR "${MUSICDIR}" "${TOMCATDIR}/webapps/freeciv-web"
echo -e "${LGREEN}Copy complete"
# let user know when it's finished
echo $'\a'