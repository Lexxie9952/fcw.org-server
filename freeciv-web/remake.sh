#!/bin/bash
# Does EVERY step to re-build C-server and restart freeciv-web.

printf "\n**********************************************************************"
printf "./remake.sh: DEPLOYED SERVER version. Re-builds server executables."
printf "Important: Use ./vremake.sh for vagrant installations."
printf "**********************************************************************\n"

cd ~/freeciv-web/freeciv && ./prepare_freeciv.sh && cd freeciv && make install && cd ../../scripts && ./stop-freeciv-web.sh && ./start-freeciv-web.sh

# let user know when it's finished
echo $'\a'
