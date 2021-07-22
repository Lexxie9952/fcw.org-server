TOPDIR="$( cd ../"$( dirname "${BASH_SOURCE[0]}" )" > /dev/null && pwd )"

cp /vagrant/freeciv-web/target/freeciv-web/music/* /var/lib/tomcat8/webapps/freeciv-web/music -r
printf "\n\n Done.\n"

