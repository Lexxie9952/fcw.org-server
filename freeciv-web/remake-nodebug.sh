#!/bin/bash
# Assumes deployed server environment and suppresses debug info for coredumps.
# Does EVERY step to re-build C-server and restart freeciv-web.
# Use ./remake.sh for debug/coredump info.

printf "\n*********************************************************************\n"
printf "./remake-nodebug.sh: DEPLOYED SERVER version.\n"
printf "* Re-builds (faster) server executables without debug coredump infos.\n"
printf "* Use ../freeciv/./prepare.sh for complete rebuild.\n"
printf "***********************************************************************\n"
printf "Remake scripts for other contexts:" 
printf "Use ./remake.sh to include debug/coredump\n"
printf "Use ./vremake.sh for Vagrant installations.\n"
printf "Use ./remakem.sh for Multipass installations.\n"
printf "***********************************************************************\n"

cd ~/freeciv-web/freeciv && ./prepare_freeciv.sh && cd build && make install && cd ../../scripts && ./stop-freeciv-web.sh && ./start-freeciv-web.sh

# let user know when it's finished
echo $'\a'
