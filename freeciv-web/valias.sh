#!/bin/bash
# Set up useful aliases for server development.
# ***********************************************************************************

alias fcw="cd /vagrant/freeciv-web"
alias bjs="cd /vagrant/freeciv-web; ./build-js.sh"
alias b="cd /vagrant/freeciv-web; ./build.sh"
alias rules="cd /vagrant/freeciv-web; ./vbuild-rules.sh; ./vclean-rules.sh"
alias ball="cd /vagrant/freeciv-web; ./build-images.sh; ./vbuild-all*; ./vclean*; ./build.sh"
alias bim="cd /vagrant/freeciv-web; ./build-images.sh"
alias vr="cd /vagrant/freeciv-web; ./vremake.sh"
echo "==== Aliases set for vagrant server ===="
exit
