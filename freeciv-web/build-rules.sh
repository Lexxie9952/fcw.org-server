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

printf "\nUpdating rulesets\n"
   for r in ${RULESETS[@]}; do
      echo "Copying $r"
      bash ../scripts/copy-ruleset.sh $r      
   done

printf "\nRe-generating manuals\n"
   for r in ${RULESETS[@]}; do
      echo "Generating help manual for $r"
      cd ~/freeciv-web/freeciv-web/src/derived/webapp/man
      ~/freeciv-web/freeciv/freeciv/tools/freeciv-manual -r $r      
   done
