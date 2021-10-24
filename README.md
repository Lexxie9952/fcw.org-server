THE FREECIV-WEB PROJECT
-----------------------

[![Build Status](https://github.com/Lexxie9952/fcw.org-server/workflows/continuous%20integration/badge.svg)](https://github.com/Lexxie9952/fcw.org-server/actions?query=workflow%3A%22continuous+integration%22)
[![Code Quality: Javascript](https://img.shields.io/lgtm/grade/javascript/g/freeciv/freeciv-web.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/freeciv/freeciv-web/context:javascript)
[![Total Alerts](https://img.shields.io/lgtm/alerts/g/freeciv/freeciv-web.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/freeciv/freeciv-web/alerts) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

Freeciv-web is an open-source turn-based strategy game. It can be played in any HTML5 capable web-browser and features in-depth game-play and a wide variety of game modes and options. Your goal is to build cities, collect resources, organize your government, and build an army, with the ultimate goal of creating the best civilization. You can play online against other players (multiplayer) or play by yourself against the computer. There is both a HTML5 2D version with isometric graphics and a 3D WebGL version of Freeciv-web. 

Freeciv-web is free and open source software. The Freeciv C server is released under the GNU General Public License, while the Freeciv-web client is released
under the GNU Affero General Public License. See [License](LICENSE.txt) for the full license document.

Currently known servers based on Freeciv-web:
- [Freecivweb.org](https://www.freecivweb.org) - Full Freeciv-web
- [moving borders](https://fcw.movingborders.es) (Everything except longturn and real-Earth)

![Freeciv-web](https://raw.githubusercontent.com/Lexxie9952/fcw.org-server/master/fcw-2021.png "Freeciv-web screenshot")


Overview
--------

Freeciv-Web consists of these components:

* [Freeciv-web](freeciv-web) - a Java web application for the Freeciv-web client.
  This application is a Java web application which make up the application
  viewed in each user's web browser. The Metaserver is also a part of this module.
  Implemented in Javascript, Java, JSP, HTML and CSS. Built with maven and runs 
  on Tomcat 8 and nginx.

* [Freeciv](freeciv) - the Freeciv C server, which is checked out from the official
  Git repository, and patched to work with a WebSocket/JSON protocol. Implemented in C.

* [Freeciv-proxy](freeciv-proxy) - a WebSocket proxy which allows WebSocket clients in Freeciv-web
  to send socket requests to Freeciv servers. WebSocket requests are sent from Javascript 
  in Freeciv-web to nginx, which then proxies the WebSocket messages to freeciv-proxy, 
  which finally sends Freeciv socket requests to the Freeciv servers. Implemented in Python.

* [Publite2](publite2) - a process launcher for Freeciv C servers, which manages
  multiple Freeciv server processes and checks capacity through the Metaserver. 
  Implemented in Python.

* [pbem](pbem) is play-by-email support. 

Running Freeciv-web on your computer
------------------------------------
The recommended and probably easiest way is to use Vagrant on VirtualBox.  
[FCW Install Docs on Wiki](https://freecivweb.fandom.com/wiki/Freeciv-web_FCW_Install)  

Whatever the method you choose, you'll have to check out Freeciv-web to a
directory on your computer, by installing [Git](http://git-scm.com/) and
running this command:
 ```bash
  git clone https://github.com/Lexxie9952/fcw.org-server.git --depth=10
 ```

You may also want to change some parameters before installing, although
it's not needed in most cases. If you have special requirements, have a look
at [config.dist](config/config.dist),
copy it without the `.dist` extension and edit to your liking.

#### :warning: Notice for Windows users

Please keep in mind that the files are to be used in a Unix-like system
(some Ubuntu version with the provided Vagrant file).
Line endings for text files are different in Windows, and some editors
"correct" them, making the files unusable in the VM.
There's some provision to recode the main configuration files when installing,
but not afterwards. If you touch shared files after installation, please use
an editor that respect Unix line endings or transform them with a utility
like dos2unix after saving them.

### Running Freeciv-web with Vagrant on VirtualBox

Freeciv-web can be setup using Vagrant on VirtualBox to quickly create a 
local developer image running Freeciv-web on latest Ubuntu on your host
operating system such as Windows, OSX or Linux. 
This is the recommended way to build Freeciv-web on your computer.

1. Install VirtualBox: https://www.virtualbox.org/ - Install manually on Windows, and with the following command on Linux:
 ```bash
sudo apt-get install virtualbox
 ```

2. Install Vagrant: http://www.vagrantup.com/ - Install manually on Windows
, and with the following command on Linux:
 ```bash
sudo apt-get install vagrant
 ```

3. Run Vagrant with the following commands in your Freeciv-web directory:
 ```bash
 vagrant up
 ```

  This will build, compile, install and run Freeciv-web on the virtual server image. Wait for the installation process to complete, watching for any error messages in the logs.
  
  NOTE:
  Vagrant is now configured to run with NFS on Linux and Mac, which speeds it up by 10-100 times. This should run 
  out of the box for Mac OS X 10.5+ as well as Linux. If you are having problems on Linux, you might need to execute
  the following commands:
  ```bash
 sudo apt-get install nfs-kernel-server nfs-common portmap
  ```
  on Debian based systems or their equivalents.
  
4. Test Freeciv-web by pointing your browser to http://localhost if you run Windows or http://localhost:8080 if you run Linux or macOS.

To log in to your Vagrant server, run the command: 
 ```bash
 vagrant ssh
 ```

The Vagrant guest machine will mount the Freeciv-web source repository in the /vagrant directory.
Note that running Freeciv-web using Vagrant requires about 4Gb of memory
and 3 Gb of harddisk space.

### System Requirements for manual install

Install this software if you are not running Freeciv-web with Vagrant:

- Tomcat 8 - https://tomcat.apache.org/ 

- Java 8 JDK - http://www.oracle.com/technetwork/java/javase/downloads/ 

- Python 3.6 - http://www.python.org/

- Pillow v2.3.0 (PIL fork) - http://pillow.readthedocs.org/
  (required for freeciv-img-extract)

- Mysql 5.5.x - http://www.mysql.com/

- Maven 3 - http://maven.apache.org/download.html

- Firebug for debugging - http://getfirebug.com/

- curl-7.19.7 - http://curl.haxx.se/

- OpenSSL - http://www.openssl.org/

- nginx 1.11.x or later - http://nginx.org/

- MySQL Connector/Python - https://github.com/mysql/mysql-connector-python

- pngcrush, required for freeciv-img-extract.  http://pmt.sourceforge.net/pngcrush/

- Tornado 6.1 or later - http://www.tornadoweb.org/

- Jansson 2.6 - http://www.digip.org/jansson/

- liblzma-dev - http://tukaani.org/xz/ - for XZ compressed savegames.

- cwebp to create .webp files of the tileset.


When in a [tested system](scripts/install/systems),
you may run `scripts/install/install.sh` and it will fetch and configure what's needed.

Start and stop Freeciv-web with the following commands:  
  start-freeciv-web.sh  
  stop-freeciv-web.sh  
  status-freeciv-web.sh

All software components in Freeciv-web will log to the /logs sub-directory of the Freeciv-web installation.


### Running Freeciv-web on Docker

Freeciv-web can easily be built and run from Docker using `docker-compose`. Web is exposed on port 80 by default.

 1. Make sure you have both [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/) installed using MOST CURRENT VERSION of both, and are using a CURRENT Docker storage driver. 
 
    ("Problems regarding 'setfacl' have been reported when using (deprecated) 'aufs' as Docker storage driver. Please try using 'overlay2' instead. You can check the storage driver by running 'docker info' or 'docker info | grep Storage'.")

 2. Run the following from the freeciv-web directory:

    ```sh
    docker-compose up -d
    ```

 3. Connect to docker via host machine using standard browser

http://localhost/

Enjoy. The overall dockerfile and required changes to scripts needs some further improvements.

Freeciv-Web continuous integration on Travis CI 
-----------------------------------------------
Freeciv-Web is built on Travis CI on every commit. This is the current build status: [![Build Status](https://api.travis-ci.org/freeciv/freeciv-web.png)](https://travis-ci.org/freeciv/freeciv-web)

Developers interested in Freeciv-web
------------------------------------

If you want to contibute to Freeciv-web, see the [issues](https://github.com/freeciv/freeciv-web/issues) on GibHub and the [TODO file](TODO.md) for 
some tasks you can work on. Pull requests on Github is welcome! 
  

Contributors to Freeciv-web
---------------------------
Andreas Røsdal  [@andreasrosdal](https://github.com/andreasrosdal)  
Lexxie9952 (https://discordapp.com/users/Lexxie9952)(https://github.com/Lexxie9952)
Marko Lindqvist [@cazfi](https://github.com/cazfi)  
Sveinung Kvilhaugsvik [@kvilhaugsvik](https://github.com/kvilhaugsvik) 
Gerik Bonaert [@adaxi](https://github.com/adaxi)  
Lmoureaux [@lmoureaux](https://github.com/lmoureaux)  
Máximo Castañeda [@lonemadmax](https://github.com/lonemadmax)  
and the [Freeciv.org project](http://freeciv.wikia.com/wiki/People)!

About FCW and this repository
-----------------------------
FCW is a volunteer effort and an open source project of a private community that does not
sell/distribute its work under the GPL definition of distribution. 

For our users and developers, FCW publishes its source code.

FCW's source code is provided on this repository regardless of whether you are a user or contributing
developer. Note that this provision is _bona voluntas_, as our licenses specifically allow us to limit
releases only to our users and contributing developers.

By using the FCW website, you voluntarily choose to be in a provider/user relationship under
our Terms of Service.

FCW is NOT required to involuntarily enter into relations with any user or developer; nor accept code
from any developer. We reserve the right to not do so. Freeciv voluntarily accepts those users who by
their own volition enter a provider/usership relation with us by accepting the Terms of Service of the
private community under which we provide our service. We accept code from developers who voluntarily
agree to our software licenses, that the content they submit is immediately under that license, and
that they agree to our Repository Policy. (Before submission, you may request that your source code
be accepted with conditional exceptions to our Repository Policy, and we may or may not agree to that
exception.)

Any entity that uses our site or submits code, in so doing agrees to not limit the rights we reserve for 
free and unencumbered operation. Any relation with us is conditional to this, and to the software
licenses under which we operate. In any case where an interpretation of our Terms of Service or
Repository Policy can be established to be in non-accordance with our licenses, the latter shall be
assumed to be what is operative.

You have our permission to access our service, for free, if you accept our Terms of Service. In so doing,
you are choosing to be a private member of a private internal community. FCW reserves the right to refuse
membership to anyone. 
----
By submitting a **Pull Request** to this repository,
1. You agree, as per our licenses, that FCW may use and modify submitted content freely and without
restriction.
2. Per our licenses, you maintain the right to use any contribution you have made in any other project
or license, whatsoever, to the degree that it does not encumber (1), as above. That is, you maintain
all rights to use your submitted code wherever and however, without encumbering our right to do the same.
3. This means we may do, but are not limited to do, the following: Release as the licensor: freeciv
server code under GPL licensing or AGPL licensing; freeciv-web code under AGPL licensing; audio/art or
other content under whatever appropriate licensing or exemptions may allow or entitle such.  
4. You agree we will not be obstructed from re-releasing or repackaging any contributed part of the
project as we deem necessary or desirable, whether for future release of this project or other projects,
including but not limited to changes required to accomplish or facilitate compliance with other component
licensing, and/or maintaining the ability to deliver our services.

*Statements made above are inclusive to our Terms of Service. No statement made above shall be deemed
as FCW or its maintainers implicitly waiving any rights or overriding any Common Law of a jurisdiction
we fall under, nor any license under which we operate.

