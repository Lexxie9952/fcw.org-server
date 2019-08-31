11#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

RULESETS=(mpplus mp2 classic multiplayer mp2sandbox civ2civ3)
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
      echo "Generating help manual for $r"    
       ${TOPDIR}/freeciv/freeciv/tools/freeciv-manual -r $r
   done

printf "\nCopying to Tomcat webapp\n"
   cp /vagrant/freeciv-web/src/derived/webapp/man/*.* /var/lib/tomcat8/webapps/freeciv-web/man/
printf "\n*** REMINDER:  run ./build.sh to refresh and activate new manual.\n"