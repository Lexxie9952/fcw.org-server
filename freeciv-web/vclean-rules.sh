11#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

RULESETS=(classic civ2civ3 maptest multiplayer mpplus mp2sandbox mp2 ag ag2 mp2-brava mp2-caravel)
TOPDIR="$( cd ../"$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

printf "\n./vclean-rules.sh: VAGRANT VERSION. Use ./clean-rules.sh for deployed servers.\n"

printf "\nThis overwrites the auto-generated manuals with the release-version manuals.\n"
printf "Release versions reduce verbosity and add more information.\n"
printf "\n****************************************************************************\n"
printf "WARNING: if you have changed ANYTHING affecting unit stats, helptext, etc., be\n"
printf "sure to make a NEW <rulesetname>#.bak.html before running this script!\n"
printf "Do a diff with src/derived/webapp/man/<rulesetname>#.html.\n"
printf "****************************************************************************\n"

printf "\nOverwriting generated manual with release-version: MP2-Avant Garde"
   cp /vagrant/freeciv-web/src/derived/webapp/man/ag7.bak.html /vagrant/freeciv-web/src/derived/webapp/man/ag7.html
printf "\nOverwriting generated manual with release-version: MP2-Brava"
   cp /vagrant/freeciv-web/src/derived/webapp/man/mp2-brava7.bak.html /vagrant/freeciv-web/src/derived/webapp/man/mp2-brava7.html
printf "\nOverwriting auto-generated manual with release-version: MP2-Caravel"
   cp /vagrant/freeciv-web/src/derived/webapp/man/mp2-caravel6.bak.html /vagrant/freeciv-web/src/derived/webapp/man/mp2-caravel6.html
   cp /vagrant/freeciv-web/src/derived/webapp/man/mp2-caravel7.bak.html /vagrant/freeciv-web/src/derived/webapp/man/mp2-caravel7.html

printf "\nDirectly copying rules to Tomcat webapp\n"
   cp /vagrant/freeciv-web/src/derived/webapp/man/*.* /var/lib/tomcat8/webapps/freeciv-web/man/

printf "\n*** REMINDER:  run ./build.sh to refresh and activate new manual.\n"