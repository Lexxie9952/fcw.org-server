#!/bin/bash
# Set up useful aliases for server development.
# You can't set bash aliases from an .sh script so this simply serves as a mnemonic
# for setting them yourself manually in your alias setup. 
# ***********************************************************************************

alias fcw="cd ~/freeciv-web/freeciv-web"
alias bjs="cd ~/freeciv-web/freeciv-web; ./build-js.sh"
alias b="cd ~/freeciv-web/freeciv-web; ./build.sh"
alias ball="cd ~/freeciv-web/freeciv-web; ./build-images.sh; ./build-rules*; ./clean-rules*; ./build.sh"
alias bim="cd ~/freeciv-web/freeciv-web; ./build-images.sh"
alias comp="echo '==================================================================='; echo 'Recompile new FCW server executable without shutdown and restart...'; echo '==================================================================='; echo ''; cd ~/freeciv-web/freeciv; ./prepare_freeciv.sh; cd build; make install"
echo "==== Aliases set for production server ===="
exit
