#!/bin/bash
# Assumes MULTIPASS environment and produces debug info for coredumps.
# Does EVERY step to re-build C-server and restart freeciv-web.
START=$(date +%s)
GREEN='\033[0;32m'; LGREEN='\033[1;32m'; LGREY='\033[0;37m'; DGREY='\033[1;30m'; WHITE='\033[1;37m'
BLUE='\033[0;34m'; LBLUE='\033[1;34m'; BROWN='\033[0;33m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
PINK='\033[1;31m'; PURPLE='\033[0;35m'; MAGENTA='\033[1;35m'; CYAN='\033[0;36m'; LCYAN='\033[1;36m'

echo -e "${YELLOW}********************************************************************************${LGREY}"
echo -e "${LCYAN}./remakem.sh: ${WHITE}MULTIPASS SERVER${LGREY} version."
echo -e "${YELLOW}********************************************************************************${LGREY}"
echo -e "${YELLOW}*${LGREY} Re-builds server executables for MULTIPASS VM instances."
echo -e "${YELLOW}*${LGREY} Use ${CYAN}../freeciv/./prepare.sh${LGREY} for complete rebuild."
echo -e "${YELLOW}********************************************************************************${LGREY}"
echo -e "Remake scripts for other contexts:"
echo -e "Use ${CYAN}./remake.sh${LGREY} on deployed server installations."
echo -e "Use ${CYAN}./vremake.sh${LGREY} for Vagrant installations."
echo -e "${YELLOW}********************************************************************************${LGREY}"

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
  pushd "${HOME}/freeciv-web/freeciv"
  ./prepare_freeciv.sh
  pushd build
  if make install
  then
    echo -e "${GREEN}*********************************${WHITE} MAKE SUCCESS!!${GREEN} *******************************${LGREY}"
  else
    echo -e "${RED}*********************************${WHITE} MAKE FAILURE!!${RED} ********************************${LGREY}"
  fi

  popd && popd
}

activate
stop
build
activate
start

# let user know when it's finished
echo $'\a'
END=$(date +%s)
DIFF=$(( $END - $START ))
echo -e "${LCYAN}./remakem.sh${LGREY} finished in ${WHITE}${DIFF}${LGREY} seconds."
exit 0
