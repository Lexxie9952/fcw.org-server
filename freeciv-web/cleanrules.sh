#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

RULESETS=(classic civ2civ3 multiplayer mpplus mp2sandbox mp2 ag mp2-ag mp2-brava mp2-caravel mp2-dragoon mp2-elephant)
TOPDIR="$( cd ../"$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

printf "\n./clean-rules.sh: DEPLOYED SERVER VERSION. Use ./vclean-rules.sh for vagrant installations.\n"

printf "\nThis overwrites the auto-generated manuals with the release-version manuals.\n"
printf "Release versions reduce verbosity and add more information.\n"
printf "\n****************************************************************************\n"
printf "WARNING: if you have changed ANYTHING affecting unit stats, helptext, etc., be\n"
printf "sure to make a NEW <rulesetname>#.bak.html before running this script!\n"
printf "Do a diff with src/derived/webapp/man/<rulesetname>#.html.\n"
printf "****************************************************************************\n"

printf "\nOverwriting auto-generated manual with release-version: MP2-Avant Garde"
   cp  ~/freeciv-web/freeciv-web/src/derived/webapp/man/ag7.bak.html ~/freeciv-web/freeciv-web/src/derived/webapp/man/ag7.html
   cp  ~/freeciv-web/freeciv-web/src/derived/webapp/man/ag7.bak.html ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-ag7.html
printf "\nOverwriting auto-generated manual with release-version: MP2-Brava"
   cp ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-brava7.bak.html ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-brava7.html
printf "\nOverwriting auto-generated manual with release-version: MP2-Caravel"
   cp ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-caravel6.bak.html ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-caravel6.html
   cp ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-caravel7.bak.html ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-caravel7.html
printf "\nOverwriting auto-generated manual with release-version: MP2-Dragoon"
   cp ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-dragoon6.bak.html ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-dragoon6.html
   cp ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-dragoon7.bak.html ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-dragoon7.html
   cp ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-dragoon9.bak.html ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-dragoon9.html
printf "\nOverwriting auto-generated manual with release-version: MP2-Elephant"
   cp ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-elephant6.bak.html ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-elephant6.html
   cp ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-elephant7.bak.html ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-elephant7.html
   cp ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-elephant9.bak.html ~/freeciv-web/freeciv-web/src/derived/webapp/man/mp2-elephant9.html

printf "\nDirectly copying rules to Tomcat webapp\n"
   cp ~/freeciv-web/freeciv-web/src/derived/webapp/man/*.* /var/lib/tomcat8/webapps/freeciv-web/man/

printf "\n*** REMINDER:  run ./build.sh to refresh and activate new manual.\n"