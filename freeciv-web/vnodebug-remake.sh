#!/bin/bash
# Does EVERY step to re-build C-server and restart freeciv-web.

printf "\n**********************************************************************\n"
printf "./vremake.sh: VAGRANT version. Re-builds server executables.\n"
printf "Important: Use ./remake.sh on deployed server installations.\n"
printf "**********************************************************************\n"

cd /vagrant/freeciv && ./prepare_freeciv.sh && cd build && make install && cd ../../scripts && ./stop-freeciv-web.sh && ./start-freeciv-web.sh

# let user know when it's finished
echo $'\a'
