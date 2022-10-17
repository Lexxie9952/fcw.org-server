#!/bin/bash
# builds javascript files Freeciv-web and copies the resulting file to tomcat.

ulimit -c unlimited
sudo bash -c 'echo /tmp/core/core.%e.%p.%h.%t > /proc/sys/kernel/core_pattern'