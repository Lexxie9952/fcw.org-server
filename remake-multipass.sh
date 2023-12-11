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

stop() {
  multipass-endpoint.sh stop
}

start() {
  multipass-endpoint.sh start
}

build() {
  pushd "${HOME}/freeciv-web/freeciv" \
    && ./prepare_freeciv.sh \
    && pushd build \
    && make install \
    && popd && popd
}

stop
build
start

# let user know when it's finished
echo $'\a'
