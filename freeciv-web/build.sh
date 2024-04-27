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
echo -e "${WHITE}------------------------------------------------------------------------${LGREY}"
echo -e "${LGREEN}build.sh ${GREEN}                                         Builds entire website."
echo -e "${WHITE}------------------------------------------------------------------------${LGREY}"
echo -e "${PINK}This version deletes the music folder in preparation for ${LCYAN}buildmusic.sh"
echo -e "${PINK}to be run immediately afterward.${LGREY}"
echo "You can run the original version of this script with:"
echo -e "  ${GREEN}${DIR}/build-nomusic.sh"
echo -e "${WHITE}------------------------------------------------------------------------${LGREY}"

echo -e "${LGREEN}Deleting${LBLUE} ${TOMCATDIR}/webapps/freeciv-web/music" && \
 rm -f -r "${TOMCATDIR}/webapps/freeciv-web/music"

echo -e "${WHITE}------------------------------------------------------------------------"
echo -e "${LGREEN}Preparing${LGREY} to build Freeciv-Web in${LBLUE} ${TOMCATDIR}/webapps/freeciv-web/"
echo -e "${WHITE}------------------------------------------------------------------------"

# Creating build.txt info file
REVTMP="$(git rev-parse HEAD 2>/dev/null)"
if test "x$REVTMP" != "x" ; then
  # This is build from git repository.
  mkdir -p "${WEBAPP_DIR}"
  echo "This build is from freeciv-web commit: $REVTMP" > "${WEBAPP_DIR}/build.txt"
  if ! test $(git diff | wc -l) -eq 0 ; then
    echo "It had local modifications." >> "${WEBAPP_DIR}/build.txt"
  fi
  date >> "${WEBAPP_DIR}/build.txt"
else
  rm -f "${WEBAPP_DIR}/build.txt"
fi

echo "maven package"
mvn ${BATCH_MODE} flyway:migrate package && \
echo " "
echo "Copying target/freeciv-web.war to ${TOMCATDIR}/webapps" && \
  cp target/freeciv-web.war "${TOMCATDIR}/webapps/"

echo -e "${WHITE}------------------------------------------------------------------------"
echo -e "${LGREEN}BUILD COMPLETE"
echo -e "${WHITE}------------------------------------------------------------------------"
echo -e "${WHITE}NOTE${LGREY}: tilespec.js set to use .webp for tileset files. If these files"
echo -e "weren't already in ${CYAN}src/derived/webapp/tileset${LGREY}, transfer .webp"
echo -e "files into ${CYAN}/var/lib/tomcat8/webapps/freeciv-web/tileset${LGREY} now."
echo -e "${PINK}Don't forget to run ${LCYAN}buildmusic.sh ${PINK}"

# let user know when it's finished
echo $'\a'