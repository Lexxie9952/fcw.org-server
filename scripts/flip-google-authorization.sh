patch -p1 -u -R -s -d .. <Remove-Google-Authorization-in-Longturn.patch >/dev/null 2>/dev/null
if [ $? -ne 0 ];then
    patch -p1 -u -s -d .. <Remove-Google-Authorization-in-Longturn.patch
    if [ $? -eq 0 ];then
        git update-index --assume-unchanged ../freeciv-web/src/main/webapp/javascript/pregame.js
        git update-index --assume-unchanged ../freeciv-proxy/freeciv-proxy.py
        git update-index --assume-unchanged ../freeciv-web/src/main/webapp/javascript/clinet.js
        printf "Sucessfully removed Google authorization!\n\nfreeciv-web/src/main/webapp/javascript/pregame.js\nfreeciv-proxy/freeciv-proxy.py\nand freeciv-web/src/main/webapp/javascript/clinet.js have been made uncommittable.\n\nIf working on those files, make sure to flip authorization before uploading.\n\n"
    else
        echo "Failed to remove Google authorization!"
        exit 1
    fi
else
  printf "Sucessfully added Google authorization back in!\n\nfreeciv-web/src/main/webapp/javascript/pregame.js\nfreeciv-proxy/freeciv-proxy.py\nand freeciv-web/src/main/webapp/javascript/clinet.js have been made committable again.\n\n"
  git update-index --no-assume-unchanged ../freeciv-web/src/main/webapp/javascript/pregame.js
  git update-index --no-assume-unchanged ../freeciv-proxy/freeciv-proxy.py
  git update-index --no-assume-unchanged ../freeciv-web/src/main/webapp/javascript/clinet.js
fi
echo "You need to rebuild freeciv-web's javascript files for these changes to take effect (freeciv-web/build-js.sh)"
