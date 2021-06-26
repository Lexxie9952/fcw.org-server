#!/bin/bash

# Freeciv has code that generates certain help texts based on the ruleset.
# This code is written in C. It is huge. Replicating it in JavaScript would
# be a huge task and probably introduce bugs. Even if someone did it it
# would be hard to keep the replicated code in sync as the corresponding
# Freeciv C code kept evolving.
#
# Freeciv has the tool freeciv-manual. It can use the ruleset based auto
# help text generation. It can output HTML. Some of its HTML output is
# machine readable enough to be usable for Freeciv-web.
#
# Generate HTML manuals for the supported rulesets.

resolve() { echo "$(cd "$1" >/dev/null && pwd)"; }
while [[ $# -gt 0 ]]; do
  case $1 in
    -i) INSTALL_DIR=$(resolve "$2"); shift; shift;;
    -o) WEBAPP_DIR=$(resolve "$2"); shift; shift;;
    *) echo "Unrecognized argument: $1"; shift;;
  esac
done
: ${INSTALL_DIR:?Must specify freeciv install dir with -i}
: ${WEBAPP_DIR:?Must specify existing freeciv-web (webapp) dir with -o}

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"

MAN_DIR="${WEBAPP_DIR}/man"

freeciv_manual="${INSTALL_DIR}/bin/freeciv-manual"

mkdir -p "${MAN_DIR}" && \
cd "${MAN_DIR}" && \
"$freeciv_manual" -r civ2civ3 && \
"$freeciv_manual" -r classic && \
"$freeciv_manual" -r multiplayer && \
"$freeciv_manual" -r webperimental && \
echo "Generated Ruleset manual files in ${MAN_DIR}"
