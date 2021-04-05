#!/bin/bash

THIS_DIR="$(dirname $0)"

if test "x$1" = "x" || test "x$1" = "x-h" || test "x$1" = "x--help" ; then
  echo "Usage: $0 <freeciv.org server tree> [diff file to create]"
  exit
fi

FREECIV_ORG="$1"
OUTPUT_FILE="$2"

if ! test -f "${FREECIV_ORG}/common/game.c" ; then
  echo "${FREECIV_ORG} doesn't look like freeciv tree; no \"${FREECIV_ORG}/common/game.c\" found" >&2
  exit 1
fi

if test "x${OUTPUT_FILE}" != "x" && test -f "${OUTPUT_FILE}" ; then
  echo "\"${OUTPUT_FILE}\" already exist. Not overwriting." >&2
  exit 1
fi

echo "Creating diff and calculating number of lines in it..."
if test "x${OUTPUT_FILE}" = "x" ; then
  # We use diff_ignore from the freeciv.org tree, as it should be more
  # up to date than our older tree
  diff -Nurd -X${FREECIV_ORG}/scripts/diff_ignore \
             -X.diff_ignore_divergence \
       "${FREECIV_ORG}" ${THIS_DIR}/freeciv | wc -l
else
  diff -Nurd -X${FREECIV_ORG}/scripts/diff_ignore \
             -X.diff_ignore_divergence \
       "${FREECIV_ORG}" ${THIS_DIR}/freeciv | tee ${OUTPUT_FILE} | wc -l
fi
