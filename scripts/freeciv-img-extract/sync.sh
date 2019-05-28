#!/bin/bash

#Names of the countries whose flags should not be converted to .png
#(because we have manually drawn correct .png versions):    

SCRIPT_DIRECTORY=`dirname $0`
readarray BAD_FLAG_ARRAY < $SCRIPT_DIRECTORY/bad_flag_list.txt

elementIn () {
  local e match="$1"
  shift
  for e; do [[ "$e" == "$match" ]] && return 0; done
  return 1
}

resolve() { echo "$(cd "$1" >/dev/null && pwd)"; }
while [[ $# -gt 0 ]]; do
  case $1 in
    -f) FREECIV_DIR=$(resolve "$2"); shift; shift;;
    -o) WEBAPP_DIR=$(resolve "$2"); shift; shift;;
    *) echo "Unrecognized argument: $1"; shift;;
  esac
done
: ${FREECIV_DIR:?Must specify (original) freeciv project dir with -f}
: ${WEBAPP_DIR:?Must specify existing freeciv-web (webapp) dir with -o}

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"

TILESET_DEST="${WEBAPP_DIR}/tileset"
SPEC_DEST="${WEBAPP_DIR}/javascript/2dcanvas"
FLAG_DEST="${WEBAPP_DIR}/images/flags"

TEMP_DIR=$(mktemp -d -t 'freeciv-img-extract.XXX')

echo "running Freeciv-img-extract..."
echo "  extracting to ${TEMP_DIR}"
mkdir -p "${TILESET_DEST}" "${SPEC_DEST}" "${FLAG_DEST}" &&
python3 "${DIR}"/img-extract.py -f "${FREECIV_DIR}" -o "${TEMP_DIR}" &&
echo "compressing .png files from ${TEMP_DIR} to ${TILESET_DEST}" &&
pngcrush -q -d "${TILESET_DEST}" "${TEMP_DIR}"/freeciv-web-tileset*.png &&
echo "converting tileset .png files to .webp ..." &&
(for pngfile in "${TILESET_DEST}"/*.png; do
  cwebp -quiet -lossless "$pngfile" -o "${pngfile/%.png/.webp}"
done) &&
cp "${TEMP_DIR}"/tileset_spec_*.js "${SPEC_DEST}" &&

echo "Freeciv-img-extract done." || (>&2 echo "Freeciv-img-extract failed!" && exit 1)
