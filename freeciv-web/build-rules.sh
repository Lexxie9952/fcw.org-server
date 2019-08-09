#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

RULESETS=(mpplus mp2 classic multiplayer mp2sandbox)

printf "\nUpdating rulesets\n"
   for r in ${RULESETS[@]}; do
      echo "Copying $r"
      bash ../scripts/copy-ruleset.sh $r      
   done

printf "\nRe-generating manuals\n"
   for r in ${RULESETS[@]}; do
      echo "Generating help manual for $r"    
      ../freeciv/freeciv/tools/freeciv-manual -r $r
   done
