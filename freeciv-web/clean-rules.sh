11#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

RULESETS=(classic civ2civ3 maptest multiplayer mpplus mp2sandbox mp2 ag)
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

printf "\nOverwriting ag7.html with ag7.bak.html\n"
   cp /vagrant/freeciv-web/src/derived/webapp/man/ag7.bak.html /vagrant/freeciv-web/src/derived/webapp/man/ag7.html

printf "\nDirectly copying rules into to Tomcat webapp\n"
   cp /vagrant/freeciv-web/src/derived/webapp/man/*.* /var/lib/tomcat8/webapps/freeciv-web/man/
printf "\n*** REMINDER:  run ./build.sh to refresh and activate new manual.\n"