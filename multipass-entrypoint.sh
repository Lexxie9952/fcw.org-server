#!/bin/bash

workflow() {
  action="$1"

  # Activate python 3.7 virtual environment
  . "${HOME}/.freeciv-env/bin/activate"
  echo "Using python version $(python3 --version)"

  pushd freeciv-web/scripts || exit 1
  "./${action}-freeciv-web.sh"
  popd || exit 1
}

action="$1"
case "${action}" in
start)
  workflow start
  ;;
stop)
  workflow stop
  ;;
*)
  echo ""
  echo "Run this script inside a multipass vm shell, to start or stop FCW."
  echo "Invalid action ${action}"
  echo "Usage $0 start|stop"
  echo ""
  ;;
esac

exit 0