#!/bin/bash
# Set up useful aliases for server development.
# ***********************************************************************************

alias fcw="cd ~/freeciv-web/freeciv-web"
alias bjs="cd ~/freeciv-web/freeciv-web; ./build-js.sh"
alias b="ccd ~/freeciv-web/freeciv-web; ./build.sh"
alias rules="cd ~/freeciv-web/freeciv-web; ./build-rules.sh; ./clean-rules.sh"
alias ball="cd ~/freeciv-web/freeciv-web; ./build-images.sh; ./build-rules*; ./clean-rules*; ./build.sh"
alias bim="cd ~/freeciv-web/freeciv-web; ./build-images.sh"
alias vr="cd ~/freeciv-web/freeciv; ./prepare_freeciv.sh; cd build; make install"
echo "==== Aliases set for production server ===="
exit
