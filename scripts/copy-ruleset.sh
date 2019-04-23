#!/bin/bash

if [ "$1" != "" ]; then
    cp ../freeciv/freeciv/data/$1.serv ~/freeciv/share/freeciv/$1.serv
    cp -r ../freeciv/freeciv/data/$1 ~/freeciv/share/freeciv
else
    echo "Please specify the ruleset to copy (for example ./copy-ruleset.sh mp2)"
fi
