#!/bin/bash

destroy() {
  echo "DESTROYING EXISTING FcW Virtual machine"
  multipass delete fcw
  multipass purge
  echo "DO NOT WORRY IF THIS FAILS it means that you did not have a FcW Virtual Machine running"
}

create() {
  multipass launch bionic -n fcw --memory 3G --disk 20G --cpus 2 --mount $(pwd):/home/ubuntu/freeciv-web
  echo "======= STARTING FcW Installation ============"
  multipass exec fcw --working-directory /home/ubuntu/freeciv-web -- chmod +x scripts/install/install-multipass.sh
  multipass exec fcw --working-directory /home/ubuntu/freeciv-web -- scripts/install/install-multipass.sh
  echo "======= Installation complete ================"
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

exit 0
