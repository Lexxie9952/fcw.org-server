#!/bin/bash
# Assumes deployed server environment and produces debug info for coredumps.
# Does EVERY step to re-build C-server and restart freeciv-web.
# Use ./remake-nodebug.sh for no debug/coredump make.

printf "\n*********************************************************************\n"
printf "./remake.sh: DEPLOYED SERVER version. Re-builds server executables.\n"
printf "* Use ../freeciv/./prepare.sh for complete rebuild.\n"
printf "***********************************************************************\n"
printf "Remake scripts for other contexts:" 
printf "Use ./remake-nodebug.sh to suppress debug/coredump make.\n"
printf "Use ./vremake.sh for Vagrant installations.\n"
printf "Use ./remakem.sh for Multipass installations.\n"
printf "***********************************************************************\n"

CFLAGS="-g"

cd ~/freeciv-web/freeciv && ./prepare_freeciv.sh && cd build && make install && cd ../../scripts && ./stop-freeciv-web.sh && ./start-freeciv-web.sh

# let user know when it's finished
echo $'\a'
