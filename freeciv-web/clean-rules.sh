11#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

RULESETS=(classic civ2civ3 maptest multiplayer mpplus mp2sandbox mp2 ag ag2 mp2-brava mp2-caravel)
TOPDIR="$( cd ../"$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

printf "\nThis overwrites auto-generated manual for units file, ag7.html, with\n"
printf "ag7.bak.html, allowing user control to edit and simplify redundancies\n"
printf "in that file, such as bonuses and penalties which cancel each other out,\n"
printf "or verbose long lists of units which can be substituted with shorter verbiage.\n"

printf "\n****************************************************************************\n"
printf "WARNING: if you have changed ANYTHING affecting unit stats, helptext, etc.,\n"
printf "be sure to make a NEW ag7.bak.html before running this script !!\n"
printf "Suggested: Do a diff with src/derived/webapp/man/ag7.html, to redo changes.\n"
printf "****************************************************************************\n"

printf "\nDirectly copying rules into to Tomcat webapp\n"
   cp /vagrant/freeciv-web/src/derived/webapp/man/*.* /var/lib/tomcat8/webapps/freeciv-web/man/

printf "\nOverwriting ag7.html with ag7.bak.html\n"
   cp /vagrant/freeciv-web/src/derived/webapp/man/ag7.bak.html /vagrant/freeciv-web/src/derived/webapp/man/ag7.html
printf "\nOverwriting ag27.html with ag27.bak.html\n"
   cp /vagrant/freeciv-web/src/derived/webapp/man/ag27.bak.html /vagrant/freeciv-web/src/derived/webapp/man/ag27.html
printf "\nOverwriting mp2-brava7.html with mp2-brava7.bak.html\n"
   cp /vagrant/freeciv-web/src/derived/webapp/man/mp2-brava7.bak.html /vagrant/freeciv-web/src/derived/webapp/man/mp2-brava7.html
printf "\nOverwriting mp2-caravel6.html with mp2-caravel6.bak.html\n"
   cp /vagrant/freeciv-web/src/derived/webapp/man/mp2-caravel6.bak.html /vagrant/freeciv-web/src/derived/webapp/man/mp2-caravel6.html
printf "\nOverwriting mp2-caravel7.html with mp2-caravel7.bak.html\n"
   cp /vagrant/freeciv-web/src/derived/webapp/man/mp2-caravel7.bak.html /vagrant/freeciv-web/src/derived/webapp/man/mp2-caravel7.html

printf "\n*** REMINDER:  run ./build.sh to refresh and activate new manual.\n"