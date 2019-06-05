#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

BATCH_MODE=""
RULESETS=(mpplus mp2 classic multiplayer mp2sandbox)

while [[ $# -gt 0 ]]; do
  case $1 in
    -B) BATCH_MODE="-B"; shift;;
    *) echo "Unrecognized argument: $1"; shift;;
  esac
done

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"

TOMCATDIR="/var/lib/tomcat8"
WEBAPP_DIR="${DIR}/target/freeciv-web"

printf "\nRebuilding FCW images...\n"
~/freeciv-web/scripts/freeciv-img-extract/sync.sh -f ~/freeciv-web/freeciv/freeciv -o ~/freeciv-web/freeciv-web/src/derived/webapp      
printf "\n.******* REMINDER: ./build.sh required to incorporate new images into active website. *******\n"
   