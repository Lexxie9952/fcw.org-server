11#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

RULESETS=(mp2-caravel mp2-dragoon)
TOPDIR="$( cd ../"$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

printf "\n**********************************************************************\n"
printf "./vbuild-rules.sh: VAGRANT version of ruleset build script.\nNOTE: Use ./build-rules.sh for non-local servers.\n"
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
      printf "*************************************************************\n\n"
   done

# Vagrant install needs to copy these files into the tomcat webapp
cp /vagrant/freeciv-web/src/derived/webapp/man/*.* /var/lib/tomcat9/webapps/freeciv-web/man/

printf "\n\n****** REMINDER: ************************************************************\n"
printf "(1) ./vclean-rules.sh is required to fix custom .html files that were overwritten.\n"
printf "(2) run ./build.sh to refresh and activate the new manuals.\n"
