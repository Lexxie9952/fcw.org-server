#!/bin/bash

# *********************************************************************************************************************************
# Microsoft Windows 10/11:
# **************************************** PLEASE SEE MULTIPASS.MD FILE FOR INSTRUCTIONS. ****************************************
# *********************************************************************************************************************************
# UNTESTED:
# 1. Install Hyper-V and Multipass, clone repo, go to appropriate directory within cloned repo, etc., as described in Multipass.md
# 2. Run the following commands from CLI:
#    multipass launch bionic -n fcw --memory 3G --disk 20G --cpus 2 --mount $(pwd):/home/ubuntu/freeciv-web
#    multipass exec fcw --working-directory /home/ubuntu/freeciv-web -- chmod +x scripts/install/install-multipass.sh
#    multipass exec fcw --working-directory /home/ubuntu/freeciv-web -- scripts/install/install-multipass.sh
# 3. To finish, please execute:
#    multipass shell fcw
#    ./multipass-entrypoint.sh start
# *********************************************************************************************************************************
# *********************************************************************************************************************************
# macOS and Linux:
# *********************************************************************************************************************************
# 1. Clone repo, go to appropriate directory within cloned repo, etc., as described in Multipass.md
# 2. Run this script.
# 3. Finish steps documented within Multipass.md
# *********************************************************************************************************************************

GREEN='\033[0;32m'; LGREEN='\033[1;32m'; LGREY='\033[0;37m'; DGREY='\033[1;30m'; WHITE='\033[1;37m'; BLUE='\033[0;34m'; LBLUE='\033[1;34m'; BROWN='\033[0;33m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; PINK='\033[1;31m'; PURPLE='\033[0;35m'; MAGENTA='\033[1;35m'; CYAN='\033[0;36m'; LCYAN='\033[1;36m'

echo $'\a'
echo ""
echo -e "${DGREY}************************************************************************************${LGREY}"
echo -e "${LCYAN}./fcw-multipass.sh ${LGREY}$1"
echo -e "${DGREY}************************************************************************************${LGREY}"
echo -e "args: <${DGREY}none${LGREY} | ${GREEN}create${LGREY} | ${RED}destroy${LGREY} | ${BROWN}rebuild${LGREY}>"
echo -e "${DGREY}************************************************************************************${LGREY}"
action="$1"
case "$action" in
create)
  echo -e "<create> - ${LGREEN}Creates FCW virtual machine."
  ;;
destroy)
  echo -e "<destroy> - ${RED}Destroys${LGREY} any existing FCW VM."
  ;;
rebuild)
  echo -e "<rebuild> - ${RED}Destroys${LGREY} any existing FCW VM then ${LGREEN}creates${LGREY} new VM."
  ;;
*)
  echo -e "<${DGREY}none${LGREY}> - ${RED}Destroys${LGREY} any existing FCW VM then ${LGREEN}creates${LGREY} new VM."
  ;;
esac

destroy() {
      echo -e "${DGREY}************************************************************************************${LGREY}"

# If after destroying the VM, we will make a new one, then we should warn the user that they should disable the VPN.
if [ "$action" != "destroy" ]; then
      echo -e "${RED}!!! REMEMBER TO DISABLE VPN BEFORE RUNNING THIS SCRIPT !!!"
      echo -e "${RED}!!! REMEMBER TO DISABLE VPN BEFORE RUNNING THIS SCRIPT !!!"
      echo -e "${RED}!!! REMEMBER TO DISABLE VPN BEFORE RUNNING THIS SCRIPT !!!"
      echo -e "${DGREY}************************************************************************************${LGREY}"
fi

      echo ""
      echo -e "${WHITE}CTRL-C to abort.  ${LGREY}Sleeping for 15 seconds...${LGREY}"
# Give user 15 seconds to abort before we destroy the VM.
  sleep 15
      echo $'\a'
      echo -e "${DGREY}Destroying any existing fcw virtual machine...${LGREY}"
  multipass delete fcw
  multipass purge
      echo -e "${DGREY}(This harmlessly fails if no fcw virtual machine running)${LGREY}"
}

create() {
  multipass launch bionic -n fcw --memory 3G --disk 20G --cpus 2 --mount $(pwd):/home/ubuntu/freeciv-web
      echo ""
      echo "================ Starting FCW Installation ================"
  multipass exec fcw --working-directory /home/ubuntu/freeciv-web -- chmod +x scripts/install/install-multipass.sh
  multipass exec fcw --working-directory /home/ubuntu/freeciv-web -- scripts/install/install-multipass.sh
      echo "================ Installation complete ================"
      echo "To finish, please execute:"
      echo ""
      echo "multipass shell fcw"
      echo "./multipass-entrypoint.sh start"
}

rebuild() {
  destroy
  create
}

# args:
# ./fcw-multipass.sh                   destroys existing fcw vm then creates a new one
# ./fcw-multipass.sh <rebuild>         destroys existing fcw vm then creates a new one (same as no args)
# ./fcw-multipass.sh <create>          creates a new fcw vm
# ./fcw-multipass.sh <destroy>         destroys existing fcw vm
action="$1"
case "$action" in
create)
  create
  ;;
destroy)
  destroy
  ;;
*)
  rebuild
esac

echo -e "${DGREY}*${LGREY} Within a working instance, you can use ${CYAN}~/freeciv-web/freeciv/./prepare.sh${LGREY} to do a complete rebuild."
echo $'\a'

exit 0
