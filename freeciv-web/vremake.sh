#!/bin/bash
# Assumes VAGRANT environment and produces debug info for coredumps.
# Does EVERY step to re-build C-server and restart freeciv-web.

printf "\n*********************************************************************\n"
printf "./vremake.sh: VAGRANT version.\n"
printf "\n*********************************************************************\n"
printf "* Re-builds server executables for VAGRANT virtual machine instances.\n"
printf "* Use ../freeciv/./prepare.sh for complete rebuild.\n"
printf "***********************************************************************\n"
printf "Remake scripts for other contexts:" 
printf "Use ./remake.sh on deployed server installations.\n"
printf "Use ./remakem.sh for Multipass installations.\n"
printf "***********************************************************************\n"

rm /tmp/core*

CFLAGS="-g"

cd /vagrant/freeciv && ./prepare_freeciv.sh && cd build && make install && cd ../../scripts && ./stop-freeciv-web.sh && ./start-freeciv-web.sh

# let user know when it's finished
echo $'\a'
