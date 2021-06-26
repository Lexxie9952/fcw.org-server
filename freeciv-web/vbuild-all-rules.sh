#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

RULESETS=(classic civ1 civ2 civ2civ3 sandbox webperimental multiplayer mpplus mp2 ag mp2-brava mp2-caravel)
TOPDIR="$( cd ../"$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

printf "\nThis script may solve issues with Game Manual generation for vagrant users.\n"

printf "\nUpdating rulesets\n"
   for r in ${RULESETS[@]}; do
      echo "Copying $r"
      bash ../scripts/copy-ruleset.sh $r      
   done

printf "\nRe-generating manuals\n"
   cd src/derived/webapp/man
   for r in ${RULESETS[@]}; do
      printf "\n"
      echo "Generating help manual for $r"    
       ${HOME}/freeciv/bin/freeciv-manual -r $r
      printf "*************************************************************\n"
   done

# Vagrant install needs to copy these files into the tomcat webapp
printf "\nCopying to Tomcat webapp\n"
   cp /vagrant/freeciv-web/src/derived/webapp/man/*.* /var/lib/tomcat8/webapps/freeciv-web/man/

printf "\n\n****** REMINDER: ************************************************************\n"
printf "(1) ./vclean-rules.sh is required to fix custom .html files that were overwritten.\n"
printf "(2) run ./build.sh to refresh and activate the new manuals.\n"
