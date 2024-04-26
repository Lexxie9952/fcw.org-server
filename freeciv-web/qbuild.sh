#!/bin/bash
# Compiles C-server only.

# ANSI color codes
GREEN='\033[0;32m'
LGREEN='\033[1;32m'
LGREY='\033[0;37m'
DGREY='\033[1;30m'
WHITE='\033[1;37m'
BLUE='\033[0;34m'
LBLUE='\033[1;34m'
BROWN='\033[0;33m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PINK='\033[1;31m'
PURPLE='\033[0;35m'
MAGENTA='\033[1;35m'
CYAN='\033[0;36m'
LCYAN='\033[1;36m'

echo " "
echo -e "${WHITE}****************************************************************************${LGREY}"
echo -e "${LCYAN}./qbuild.sh${LGREY}"
echo -e "${WHITE}****************************************************************************${LGREY}"

#-g for DEBUG symbol table (to debug segfaults), -O2 for performance
#CFLAGS="-g"
CFLAGS="-O2"

build() {
    pushd "${HOME}/freeciv-web/freeciv/build"

    echo -e "${WHITE}****************************************************************************${LGREY}"
    echo -e "${LCYAN}~/freeciv-web/freeciv/build/make -s install${LGREY}"
    echo -e "${WHITE}****************************************************************************${LGREY}"

    if make -s install="$1/build"
    then
        echo -e "${WHITE}****************************************************************************${LBLUE}"
        echo -e "QUICK BUILD:  ${LCYAN}./qbuild.sh${LGREY}"
        echo -e "${WHITE}****************************************************************************${LGREY}"
        echo -e "  Compiles executable quickly without refreshing environment."
        echo -e "  Used to quickly see if freeciv server compiles without errors."
        echo -e "${WHITE}****************************************************************************${DGREY}"
        echo -e "Remake scripts for other contexts:${LGREY}"
        echo -e "Use ${CYAN}./remake.sh${LGREY} on deployed server installations."
        echo -e "Use ${CYAN}./remakem.sh${LGREY} on Multipass installations."
        echo -e "Use ${CYAN}./vremake.sh${LGREY} for Vagrant installations."
        echo -e "${LGREEN}****************************************************************************${LGREEN}"
        echo -e "${LGREEN}*****************************${WHITE} QBUILD SUCCESS!!${LGREEN} *****************************${LGREY}"
        echo -e "${YELLOW}WARNING.${LGREY} This did not refresh FCW environment."
        echo -e "Old executables will still be running.${LGREY}"
    else
        echo -e "${RED}*****************************${WHITE} QBUILD FAILURE!!${RED} *****************************${LGREY}"
        echo $'\a'
        exit 1
    fi
}

build

# let user know when it's finished
echo $'\a'
exit 0
