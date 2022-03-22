#! /bin/bash
# starts freeciv-proxy and freeciv-web.
# This script is started by civlauncher.py in publite2.

if [ "$#" -ne 6 ]; then
  echo "init-freeciv-web.sh error: incorrect number of parameters." >&2
  exit 1
fi

declare -a args

addArgs() {
  local i=${#args[*]}
  for v in "$@"; do
    args[i]=${v}
    let i++
  done
}

echo "init-freeciv-web.sh port ${2}"

addArgs --debug 1
addArgs --port "${2}"
addArgs --Announce none
addArgs --exit-on-end
addArgs --meta --keep --Metaserver "http://${4}"
addArgs --type "${5}"

if [ "$5" = "longturn" ]; then
  addArgs --read "${6}"
else
  addArgs --read "pubscript_${6}.serv"
fi

addArgs --log "../logs/freeciv-web-log-${2}.log"

if [ "$5" = "pbem" ]; then
  addArgs --Ranklog "/var/lib/tomcat9/webapps/data/ranklogs/rank_${2}.log"
fi

savesdir=${1}
if [ "$5" = "longturn" ]; then
  savesubdir=${6%".serv"}
  savesdir="${savesdir}lt/$savesubdir"
  mkdir -p "${savesdir}"

  grep -q '^#\s*autoreload\s*$' "${6}"
  if [ $? -eq 0 ]; then
    lastsave=$(ls -t "${savesdir}" | grep '\.sav' | head -n 1)
    if [ -n "${lastsave}" ]; then
      addArgs --file "${lastsave%.*}"
    fi
  fi
else
  addArgs --quitidle 20
fi
addArgs --saves "${savesdir}"

export FREECIV_SAVE_PATH=${savesdir};
rm -f "/var/lib/tomcat9/webapps/data/scorelogs/score-${2}.log"

# Start Freeciv-proxy in background
../freeciv-proxy/start-freeciv-proxy.sh "${3}" >> "../logs/freeciv-proxy-loop.log" 2>&1 &

# Start Freeciv C server
proxy_pid=$! && 
${HOME}/freeciv/bin/freeciv-web "${args[@]}" > /dev/null 2> "../logs/freeciv-web-stderr-${2}.log"


# Game over. Do cleanup.
rc=$?; 
#kill Freeciv-proxy and start-freeciv-proxy.sh procecsses
pkill -9 -P $proxy_pid;
kill -9 $proxy_pid; 
exit $rc
