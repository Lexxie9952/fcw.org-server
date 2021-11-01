#!/bin/bash

if ! test -d /var/lib/tomcat9 ; then

  BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. >/dev/null && pwd)"

  . ${BASEDIR}/scripts/install/ext-install.sh

  ext_install_tomcat9

  TOMCAT_HOME=/var/lib/tomcat9

  echo "==== Preparing Tomcat ===="

  cd "${TOMCAT_HOME}"
  sudo setfacl -m d:u:$(id -u):rwX,u:$(id -u):rwx webapps
  mkdir -p webapps/data/{savegames/pbem,scorelogs,ranklogs}
  setfacl -Rm d:u:tomcat:rwX webapps/data

fi
