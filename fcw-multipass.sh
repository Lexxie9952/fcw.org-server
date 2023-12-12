#!/bin/bash

destroy() {
  echo "**********************************************************"
  echo "!!! REMEMBER TO DISABLE VPN BEFORE RUNNING THIS SCRIPT !!!"
  echo "**********************************************************"
  echo "!!! REMEMBER TO DISABLE VPN BEFORE RUNNING THIS SCRIPT !!!"
  echo "**********************************************************"
  echo "!!! REMEMBER TO DISABLE VPN BEFORE RUNNING THIS SCRIPT !!!"
  echo "**********************************************************"
  echo ""
  echo "Destroying any existing fcw virtual machine..."
  multipass delete fcw
  multipass purge
  echo "(This harmlessly fails if no fcw virtual machine running)"
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

echo $'\a'

exit 0
