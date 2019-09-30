#!/bin/bash
# Does EVERY step to re-build C-server and restart freeciv-web.

cd /vagrant/freeciv && ./prepare_freeciv.sh && cd freeciv && make install && cd ../../scripts && ./stop-freeciv-web.sh && ./start-freeciv-web.sh

# let user know when it's finished
echo $'\a'
