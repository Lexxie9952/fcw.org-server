#!/bin/bash
# refreshes the listed SCENARIOS, gzips them, then copies to all necessary locations

# NOTE: assumes /home/freeciv/freeciv-web/freeciv/freeciv/data/scenarios/ is location for update source

# scenario_name.sav files are located in:
#########################################
# /home/freeciv/freeciv-web/freeciv/freeciv/data/scenarios
# /var/lib/tomcat9/webapps/data/savegames

# scenario_name.sav.gz files are located in:
############################################
# /home/freeciv/freeciv/share/freeciv/scenarios
# /home/freeciv/freeciv-web/freeciv/build/data/scenarios

SCENARIOS=(europe.sav europe-new-positions.sav)
TOPDIR="$( cd ../"$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

printf "\n./scenario-build.sh: DEPLOYED VERSION. Use ./vscenario-build.sh for vagrant servers.\n"
printf "\n****************************************************************************\n"
printf "This refreshes only the SCENARIOS marked for rebuild inside this script.\n"
printf "****************************************************************************\n"

SCENARIOS=(europe.sav europe-new-positions.sav tutorial.sav)
TOPDIR="$( cd ../"$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

printf "\nUpdating scenarios...\n"
printf "***********************\n"
   for r in ${SCENARIOS[@]}; do
      echo "$r"
      echo "     copying to /var/lib/tomcat9/webapps/data/savegames"
      cp /home/freeciv/freeciv-web/freeciv/freeciv/data/scenarios/$r /var/lib/tomcat9/webapps/data/savegames
      echo "     copying to /home/freeciv/freeciv-web/freeciv/build/data/scenarios"
      cp /home/freeciv/freeciv-web/freeciv/freeciv/data/scenarios/$r /home/freeciv/freeciv-web/freeciv/build/data/scenarios      
      printf "\n"
   done

printf "\nGZIP scenarios and copy...\n"
cd /home/freeciv/freeciv-web/freeciv/build/data/scenarios
   for r in ${SCENARIOS[@]}; do
      echo "$r"
      echo "     GZIP /home/freeciv/freeciv-web/freeciv/build/data/scenarios/$r"
      gzip $r
      echo "     copying $r.sav.gz to /home/freeciv/freeciv/share/freeciv/scenarios"
      cp $r.gz /home/freeciv/freeciv/share/freeciv/scenarios
      printf "\n"
   done

printf "\n****** REMINDER: ************************************************************\n"
printf "(1) run ./build.sh to refresh and activate the new manuals.\n"
