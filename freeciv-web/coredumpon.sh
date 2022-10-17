#!/bin/bash
# builds javascript files Freeciv-web and copies the resulting file to tomcat.

printf "\nPrior to running this script, do the command:\nsudo -i"

ulimit -c unlimited
sudo bash -c 'echo /tmp/core/core.%e.%p.%h.%t > /proc/sys/kernel/core_pattern'