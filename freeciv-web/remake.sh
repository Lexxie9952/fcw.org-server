#!/bin/bash
# Assumes deployed server environment and produces debug info for coredumps.
# Does EVERY step to re-build C-server and restart freeciv-web.
# Use ./remake-nodebug.sh for no debug/coredump make.
START=$(date +%s)
GREEN='\033[0;32m'; LGREEN='\033[1;32m'; LGREY='\033[0;37m'; DGREY='\033[1;30m'; WHITE='\033[1;37m'
BLUE='\033[0;34m'; LBLUE='\033[1;34m'; BROWN='\033[0;33m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
PINK='\033[1;31m'; PURPLE='\033[0;35m'; MAGENTA='\033[1;35m'; CYAN='\033[0;36m'; LCYAN='\033[1;36m'

echo -e "${BROWN}********************************************************************************${LGREY}"
echo -e "${LCYAN}./remake.sh: ${YELLOW}DEPLOYED SERVER${LGREY} version."
echo -e "${BROWN}********************************************************************************${LGREY}"
echo -e "${BROWN}*${LGREY} Re-builds server executables for DEPLOYED SERVER installations."
echo -e "${BROWN}*${LGREY} Use ${CYAN}../freeciv/./prepare.sh${LGREY} for complete rebuild."
echo -e "${BROWN}********************************************************************************${LGREY}"
echo -e "Remake scripts for other contexts:"
echo -e "Use ${CYAN}./remake-nodebug.sh${LGREY} to suppress debug/coredump make."
echo -e "Use ${CYAN}./remakem.sh${LGREY} for Multipass installations."
echo -e "Use ${CYAN}./vremake.sh${LGREY} for Vagrant installations."
echo -e "${BROWN}********************************************************************************${LGREY}"

CFLAGS="-g"

pushd ~/freeciv-web/freeciv
./prepare_freeciv.sh
pushd build
if make install
then
  echo -e "${GREEN}*********************************${WHITE} MAKE SUCCESS!!${GREEN} *******************************${LGREY}"
else
  echo -e "${RED}*********************************${WHITE} MAKE FAILURE!!${RED} ********************************${LGREY}"
fi
popd && popd
pushd ../scripts
./stop-freeciv-web.sh && ./start-freeciv-web.sh
popd

# let user know when it's finished
echo $'\a'
END=$(date +%s)
DIFF=$(( $END - $START ))
echo -e "${LCYAN}./remake.sh${LGREY} finished in ${WHITE}${DIFF}${LGREY} seconds."
exit 0
