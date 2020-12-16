#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

RULESETS=(maptest civ2civ3 classic multiplayer mpplus mp2 mp2sandbox ag ag2 mp2-brava mp2-caravel)
TOPDIR="$( cd ../"$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

printf "\nUpdating rulesets\n"
   for r in ${RULESETS[@]}; do
      echo "Copying $r"
      bash ../scripts/copy-ruleset.sh $r      
   done

printf "\nRe-generating manuals\n"
   cd src/derived/webapp/man
   for r in ${RULESETS[@]}; do
      echo "Generating help manual for *********************************************** $r"    
       ${TOPDIR}/freeciv/freeciv/tools/freeciv-manual -r $r
   done
