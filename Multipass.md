# Multipass Guide

## What is Multipass?
Multipass is VM software for macOS, Linux, and Windows Pro(_*_).
It is made by Canonical, the creators of Ubuntu.

Multipass easily and automatically creates an Ubuntu-based virtual machine.
This makes Multipass a great alternative to Vagrant+Virtual Box and to Docker, which require a lot of setup.

Because FCW runs on Ubuntu 18.04 LTS/Bionic, using Multipass is recommended. 18.04 is not the most recent
version of Ubuntu, but it's tested. Its lightweight resource reqs are ideal for a safe sandbox environment.

👉🏽 Using Multipass for automated creation of FCW on Ubuntu is recommended.
        (You can change the OS version in the [fcw-multipass.sh] script. Since all other
         files are configured under 18.04 LTS, it's not recommended on the first try.)

Multipass is suggested for workstations that run macOS on Apple silicon processors:
other VM support for ARM64 architecture is poor at the time of this writing (Nov.2023)

Multipass as configured in the repo files, is known to work on a Mac with M1 processor.

**OTHER:**
- [online Multipass documentation](https://multipass.run/docs). See _II._ first.
- (_*_) __Windows Home__ does not support Windows Hyper-V, but works after you install Windows Hyper-V:
  [Hyper-V installation](https://www.thewindowsclub.com/how-to-install-and-enable-hyper-v-on-windows-10-home)

_-----------------------------------------------------------------------------------------------------------_
## I. Development environment description
- __Operating system__: Ubuntu Bionic (18.04)
- __Database__: MySQL 5.x
- __Nodejs__: 16.x (Used to install handlebars for template processing)
- __Java__: 11 Openjdk
- __Python3__: 3.7.5 (with virtualenv)
- __Apache Tomcat__: 8.x
- __Nginx__: Latest available for the given Ubuntu version

### Virtual Machine specs
- __CPUs__: 2
- __RAM__: 3G
- __Disk__: 20GB

When running, The VM will take the above from your normal OS resources, for its own use.
_These specs can be changed in the_ [fcw-multipass.sh](fcw-multipass.sh) _script._


_-----------------------------------------------------------------------------------------------------------_
## II. Installation of Multipass and FCW files on macOS

0. Suggest pre-installing all needed tools (e.g., git, VS Code, brew, command line tools, etc.)
1. **Turn off VPN or other virtualized network layers before creating your VM.**
    _Note_: Multipass can trip on known network issues (e.g., when using a VPN).
    Please find the troubleshooting guide here: https://multipass.run/docs/troubleshoot-networking#heading--troubleshoot-networking-on-macos
2. Install [Multipass](https://multipass.run/docs) and run the app.
3. Create a working FCW folder that will hold all FCW files. Go to that folder in your CLI / Terminal app.
4. Clone the repository ```git clone https://github.com/Lexxie9952/fcw.org-server.git .``` **_SEE NOTE BELOW_**
        or if you were given gitlab access, (```git clone git@gitlab.com:fcw2/freeciv-web.git .```)

_Note: In Nov.2023, the ```dev``` branch has the current state of the freeciv-web.org server._
_Note 2: Look in [README](README.md) for updated/current notes on the git clone step._


_-----------------------------------------------------------------------------------------------------------_
## III. Virtual environment setup

1. Change to the freeciv-web directory.
2. Execute the bash script [fcw-multipass.sh](fcw-multipass.sh) to automatically launch the VM. **(See II.1)**
    _[fcw-multipass.sh](fcw-multipass.sh) is a bash script, which only runs on macOS and Linux._
    _On Windows, you either need a way to **non-virtually** run bash scripts; OR, execute the script's_
    _contents manually via CLI with invidividual commands. This is because you must access the multipass_
    _software running at the Windows OS level to create a VM, not within a virtualized Linux environment._
    _See docs for multipass setup in Windows and/or google for help. Essentially, the script contents_
    _automatically execute a handful of CLI commands to create a VM and start it. Take the information_
    _you learn from the multipass docs for launching a VM on Windows, and "translate" what you see in the_
    _[fcw-multipass.sh] bash script into the equivalent steps for launching the same Ubuntu VM within Windows._
3. Execute ```multipass list``` and make note of the IP address of the ```fcw``` VM. **(for step _IV.3._)**

You should now have a virtual machine instance of freeciv-web as specified in _Development environment description_.


_-----------------------------------------------------------------------------------------------------------_
## IV. Start and use Freeciv-web application

1. Open a terminal to multipass VM: ```multipass shell fcw```
2. ```~/multipass-entrypoint.sh start``` to boot/prepare FCW for use.
3. Open ```http://<ip address>/``` on your browser, using the IP address from **III.3.**

You should see the FCW home page served by the local server running inside your ```fcw``` multipass VM.


_-----------------------------------------------------------------------------------------------------------_
## V. Useful commands

### Common multipass commands to interact with the VM from _outside of the VM_.

- ```multipass shell fcw``` Open an "ssh" terminal into the multipass VM.
- ```multipass stop fcw``` Stop the multipass VM
- ```multipass start fcw``` Start the multipass VM
- ```multipass info fcw``` Get information about the VM (including it's ip address it is needed in order to connect to the application via a web browser)
- ```multipass list``` List all multipass VM instances and their ip addresses.
- ```multipass delete instance``` Delete the VM with the name ```instance```
- ```multipass purge``` Destroy and clean up all deleted instances.

### Other commands from inside the VM:
* To destroy the VM:```./fcw-multipass.sh destroy```
* Stop FCW ```~/multipass-entrypoint.sh stop``` (Stops the website that's running inside the VM.)

## Advanced
To externally access internal directories in the VM from within macOS, you can copy between them and work on a clone:
1. Example. Make a copy of an internal dir into your main OS directory tree:
```multipass transfer -r -p fcw:/var/lib/tomcat8/webapps ~/FCW/tomcat_webapps```
2. After making edits, copy dir back into the VM instance:
```multipass transfer -r -p ~/FCW/tomcat_webapps fcw:/var/lib/tomcat8/webapps```
