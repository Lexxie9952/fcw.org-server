#!/bin/bash
# Assumes MULTIPASS environment and produces debug info for coredumps.
# Does EVERY step to re-build C-server and restart freeciv-web.

printf "\n*********************************************************************\n"
printf "./mremake.sh: MULTIPASS SERVER version.\n"
printf "\n*********************************************************************\n"
printf "* Re-builds server executables for MULTIPASS virtual machine instances.\n"
printf "* Use ../freeciv/./prepare.sh for complete rebuild.\n"
printf "***********************************************************************\n"
printf "Remake scripts for other contexts:" 
printf "Use ./remake.sh on deployed server installations.\n"
printf "Use ./vremake.sh for Vagrant installations.\n"
printf "***********************************************************************\n"

CFLAGS="-g"

# Activate python 3.7 virtual environment
activate() {
. "${HOME}/.freeciv-env/bin/activate"
echo "Using python version $(python3 --version)"
}

stop() {
    pushd ../scripts 
    . "./stop-freeciv-web.sh"
    popd
}

start() {
    pushd ../scripts 
    . "./start-freeciv-web.sh"
    popd
}

build() {
  pushd "${HOME}/freeciv-web/freeciv" \
    && ./prepare_freeciv.sh \
    && pushd build \
    && make install \
    && popd && popd
}

activate
stop
build
activate
start

# let user know when it's finished
echo $'\a'

exit 0
