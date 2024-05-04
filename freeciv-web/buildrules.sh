#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

RULESETS=(civ2civ3 civ1 civ2 sandbox experimental alien classic classicplus multiplayer mpplus mp2-ag mp2-brava mp2-caravel mp2-dragoon mp2-elephant)
TOPDIR="$( cd ../"$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

printf "\n**********************************************************************\n"
printf "./build-rules.sh: DEPLOYED SERVER version of ruleset build script.\nNOTE: Use ./vbuild-rules.sh for vagrant installations.\n"
printf "**********************************************************************\n"

printf "\nUpdating rulesets...\n"
   for r in ${RULESETS[@]}; do
      echo "Copying $r"
      bash ../scripts/copy-ruleset.sh $r
   done

printf "\nRe-generating manuals\n"
   cd src/derived/webapp/man
   for r in ${RULESETS[@]}; do
      echo "Generating help manual for *********************************************** $r"
       ${HOME}/freeciv/bin/freeciv-manual -r $r
   done

printf "\n\n****** REMINDER: ************************************************************\n"
printf "(1) ./clean-rules.sh is required to fix custom .html files that were overwritten.\n"
printf "(2) run ./build.sh to refresh and activate the new manuals.\n"
