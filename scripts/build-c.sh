#!/bin/bash
cd /vagrant/freeciv && ./prepare_freeciv.sh && cd build && make install && cd ../../scripts && ./stop-freeciv-web.sh && ./start-freeciv-web.sh

# let user know when it's finished
echo $'\a'
