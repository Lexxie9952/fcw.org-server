#! /bin/bash
# Starts freeciv-proxy.

until python3 ../freeciv-proxy/freeciv-proxy.py "${1}" > "../logs/freeciv-proxy-${1}.log" 2>&1 ; do
  echo $(date) "Freeciv-proxy ${1} crashed with exit code $?. Restarting" >&2
  sleep 10
done
