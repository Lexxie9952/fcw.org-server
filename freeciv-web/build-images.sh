#!/bin/bash
# builds Freeciv-web, copies the war file to Tomcat and builds the selected rulesets.

printf "\nRebuilding FCW images...\n"
../scripts/freeciv-img-extract/sync.sh -f ../freeciv/freeciv -o src/derived/webapp      
printf "\n.******* REMINDER: ./build.sh required to incorporate new images into active website. *******\n"
   
