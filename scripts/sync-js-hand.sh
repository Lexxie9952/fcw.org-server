#!/bin/bash

# -Synchronizes the javascript packet handler (packhand_gen.js)
#  with the definitions in packets.def.
# -extracts scenarios and helpdata from Freeciv into Freeciv-web.
# -copies sound files from Freeciv to Freeciv-web. 

resolve() { echo "$(cd "$1" >/dev/null && pwd)"; }
while [[ $# -gt 0 ]]; do
  case $1 in
    -f) FREECIV_DIR=$(resolve "$2"); shift; shift;;
    -i) INSTALL_DIR=$(resolve "$2"); shift; shift;;
    -o) WEBAPP_DIR=$(resolve "$2"); shift; shift;;
    -d) DATA_APP_DIR=$(resolve "$2"); shift; shift;;
    *) echo "Unrecognized argument: $1"; shift;;
  esac
done
: ${FREECIV_DIR:?Must specify (original) freeciv project dir with -f}
: ${INSTALL_DIR:?Must specify freeciv install dir with -i}
: ${WEBAPP_DIR:?Must specify existing freeciv-web (webapp) dir with -o}
: ${DATA_APP_DIR:?Must specify existing save-game data (webapp) dir with -d}

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"

FC_DATA_DIR="${FREECIV_DIR}/data"
DOCS_DEST="${WEBAPP_DIR}/docs"
JS_DEST="${WEBAPP_DIR}/javascript"
SOUNDS_DEST="${WEBAPP_DIR}/sounds"
GAME_DEST="${DATA_APP_DIR}/savegames"

mkdir -p "${DOCS_DEST}" "${JS_DEST}" "${SOUNDS_DEST}" "${GAME_DEST}" && \
#warning: sync-with-flags.sh will rebuild flags for site using the svg-to-webp convertor
#which creates BAD FAILED flags for many nations. It will overwrite the nicely fixed
#flags that were manually put in later.
#/home/freeciv/freeciv-web/freeciv-web/target/freeciv-web/images/flags/fixed should be
#used as a backup directory of all fixed flags, so they can be restored whenever
#sync-with-flags.sh is called. Which we should always avoid, except during first time ./install.sh
#"${DIR}"/freeciv-img-extract/sync-with-flags.sh -f "${FREECIV_DIR}" -o "${WEBAPP_DIR}" && \
"${DIR}"/freeciv-img-extract/sync.sh -f "${FREECIV_DIR}" -o "${WEBAPP_DIR}" && \
"${DIR}"/helpdata_gen/ruleset_auto_gen.sh -i "${INSTALL_DIR}" -o "${WEBAPP_DIR}" && \
"${DIR}"/generate_js_hand/generate_js_hand.py -f "${FREECIV_DIR}" -o "${WEBAPP_DIR}" && \
"${DIR}"/gen_event_types/gen_event_types.py -f "${FREECIV_DIR}" -o "${WEBAPP_DIR}" && \
"${DIR}"/helpdata_gen/helpdata_gen.py -f "${FREECIV_DIR}" -o "${WEBAPP_DIR}" && \
"${DIR}"/soundspec-extract/soundspec-extract.py -f "${FREECIV_DIR}" -o "${WEBAPP_DIR}" && \
cp "${FREECIV_DIR}/data/stdsounds"/*.ogg "${SOUNDS_DEST}" && \
  echo "Copied sounds to ${SOUNDS_DEST}" && \
cp "${FREECIV_DIR}/data/scenarios"/*.sav "${GAME_DEST}" && \
  echo "Copied scenarios to ${GAME_DEST}" && \
cp "${DIR}/../LICENSE.txt" "${DOCS_DEST}" && \
(if [ -n "${UPDATE_EXTERNAL_SOURCES}" ]; then
  "${DIR}"/update-wikipedia-docs.py -f "${FREECIV_DIR}" -o "${WEBAPP_DIR}"
    echo "Wikipedia content updated."
    echo "  Some images or content may be stale - please review the generated files"
    echo "  for suitability."
else
  echo "NOT updating files generated from external sources (e.g. wikipedia)."
  echo "  Due to various risks of using external data, this is not the default behavior."
  echo "  To run these scripts, use:"
  echo "      $ > UPDATE_EXTERNAL_SOURCES=true sync-js-hand.js"
fi) && \
echo "done with sync-js-hand!"
