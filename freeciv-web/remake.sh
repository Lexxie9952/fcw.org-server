#!/bin/bash
# Does EVERY step to re-build C-server and restart freeciv-web.

printf "\n**********************************************************************\n"
printf "./remake.sh: DEPLOYED SERVER version. Re-builds server executables.\n"
printf "Important: Use ./vremake.sh for vagrant installations.\n"
printf "**********************************************************************\n"

cd ~/freeciv-web/freeciv && ./prepare_freeciv.sh && cd build && make install && cd ../../scripts && ./stop-freeciv-web.sh && ./start-freeciv-web.sh

# let user know when it's finished
echo $'\a'
