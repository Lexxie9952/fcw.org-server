#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
cd "${DIR}"

# Fix line endings on Windows
sed -i 's/\r$//' freeciv-web.project

#. ./version.txt

# Allow the user to override how Freeciv is downloaded.
#if test -f dl_freeciv.sh ; then
#  DL_FREECIV=dl_freeciv.sh
#else
#  DL_FREECIV=dl_freeciv_default.sh
#fi

#if ! ./$DL_FREECIV $FCREV ; then
#  echo "Git checkout failed" >&2
#  exit 1
#fi

#if ! ./apply_patches.sh ; then
#  echo "Patching failed" >&2
#  exit 1
#fi

if ! cp -a overwrite/* freeciv ; then
  echo "Overwriting files failed" >&2
  exit 1
fi

( cd freeciv
  ./autogen.sh --no-configure-run --disable-nls )

( mkdir -p build
  cd build
  ../freeciv/configure CFLAGS="-O3 $CFLAGS" \
              --enable-mapimg=magickwand --with-project-definition=../freeciv-web.project --enable-fcweb --enable-json --disable-delta-protocol --disable-nls --disable-fcmp --enable-freeciv-manual --disable-ruledit --enable-fcdb=no --enable-ai-static=classic --prefix=${HOME}/freeciv/ && make -s -j$(nproc)
)
