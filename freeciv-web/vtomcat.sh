#!/bin/bash
# Does EVERY step to re-build C-server and restart freeciv-web.

TOPDIR="$( cd ../"$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

printf "\n**********************************************************************\n"
printf "VAGRANT version. Run as \". vtomcat.sh\" . Relocate to tomcat directory.\n"
printf "\"cd /vagrant/freeciv-web\"      to return\n"
printf "**********************************************************************\n"

cd /var/lib/tomcat8/webapps

# let user know when it's finished
echo $'\a'
