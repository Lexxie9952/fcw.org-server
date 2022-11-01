#!/bin/bash
# Does EVERY step to re-build C-server and restart freeciv-web.
# Assumes development environment and produces debug info for coredumps.
# Use ./remake-nodebug.sh for no debug/coredump make.

printf "\n**********************************************************************\n"
printf "./remake.sh: DEPLOYED SERVER version. Re-builds server executables.\n"
printf "Use ./remake-nodebug.sh to suppress debug/coredump make.\n"
printf "Use ../freeciv/./prepare.sh for complete rebuild.\n"
printf "Important: Use ./vremake.sh for vagrant installations.\n"
printf "**********************************************************************\n"

CFLAGS="-g"

cd ~/freeciv-web/freeciv && ./prepare_freeciv.sh && cd build && make install && cd ../../scripts && ./stop-freeciv-web.sh && ./start-freeciv-web.sh

# let user know when it's finished
echo $'\a'
