#!/bin/bash
# First time install and setup for coredump debugging on freeciv server executable
# ./vdebug-setup.sh: VAGRANT version. Sets up gdb deubugger and coredumps
# to /tmp/core_filename for first time vagrant installations.
# ***********************************************************************************

printf "\n\n"
printf "***********************************************************************\n"
printf "./vdebug-setup.sh: VAGRANT version. Sets up gdb debugger and coredumps\n"
printf "* and misc alias commands *********************************************\n"
printf "***********************************************************************\n\n"
printf "READ CAREFULLY. After running this script, copy-paste the following\n"
printf "commands to the terminal command line:\n"
printf "***********************************************************************\n"
printf "\nsudo -i\n"
echo "echo \"/tmp/core/core.%e.%p.%t\" > /proc/sys/kernel/core_pattern"
printf "ulimit -c unlimited\n"
printf "exit\n"
printf "\n\n"
printf "***********************************************************************\n"
echo "This script gives you useful alises. View it to see what they are.\n"
printf "***********************************************************************\n\n"
echo "==== Setting up coredump debug configuration ===="
ulimit -c unlimited
alias fcw="cd /vagrant/freeciv-web"
alias bjs="cd /vagrant/freeciv-web; ./build-js.sh"
alias b="cd /vagrant/freeciv-web; ./build.sh"
alias rules="cd /vagrant/freeciv-web; ./vbuild-rules.sh; ./vclean-rules.sh"
alias ball="cd /vagrant/freeciv-web; ./build-images.sh; ./vbuild-all*; ./vclean*; ./build.sh"
alias bim="cd /vagrant/freeciv-web; ./build-images.sh"
alias vr="cd /vagrant/freeciv-web; ./vremake.sh"
echo "==== Installng gdb ===="
sudo apt install gdb
exit
