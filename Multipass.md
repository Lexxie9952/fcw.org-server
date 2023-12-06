# Multipass Guide
Creating a development environment in [Multipass](https://multipass.run/docs)

Multipass is an alternative to Vagrant+Virtual Box. Like Vagrant, it uses virtualization providers.

Multipass creates an Ubuntu-based virtual machine. VM creation is automated with VM image and software provision.

Multipass is suggested for workstations that run macOS on Apple silicon processors, because
Vagrant support for this architecture is poor at the time of this writing (Nov.2023)

This method has been tested successfully on a Mac with M1 processor.

Multipass is also available for Windows and Linux.

## I. Development environment description

- __Operating system__: Ubuntu Bionic (18.04)
- __Database__: MySQL 5.x
- __Nodejs__: 16.x (Used to install handlebars for template processing)
- __Java__: 11 Openjdk
- __Python__: 3.7.5 (with virtualenv)
- __Apache Tomcat__: 8.x
- __Nginx__: Latest available for the given ubuntu version

### Virtual Machine specs

- __CPUs__: 2
- __RAM__: 3G
- __Disk__: 20GB

The VM will take the above from your normal OS resources, for its own use.
_These specs can be changed in the_ [fcw-multipass.sh](fcw-multipass.sh) _script._

## II. Installation of Multipass and FCW files on macOS

0. Suggest having all tools pre-installed (git, brew, command line tools, etc.)
1. Install [Multipass](https://multipass.run/docs) and run the app.
2. **Turn off VPN or other virtualized network layers before creating your VM.**
    _Note_: Multipass can trip on known network issues (e.g., when using a VPN). 
    Please find the troubleshooting guide here: https://multipass.run/docs/troubleshoot-networking#heading--troubleshoot-networking-on-macos
3. Create a working FCW folder that will hold all FCW files. Go to that folder in the Terminal app.
4. Clone the repository ```git clone https://github.com/Lexxie9952/fcw.org-server.git .``` **_SEE NOTE BELOW_** 
        or, for gitlab (```git clone git@gitlab.com:fcw2/freeciv-web.git .```)

_Note: In Nov.2023, the ```dev``` branch has the current state of the freeciv-web.org server._
_Note 2: Look in [README](README.md) for updated/current notes on the git clone step._

## III. Virtual environment setup

1. Change to the directory of your source code.
2. Execute the script [fcw-multipass.sh](fcw-multipass.sh)
3. Execute ```multipass list``` and make note of the IP address of the ```fcw``` VM.

You should now have a virtual machine instance of freeciv-web with the software mentioned on the _Development environment description_.

## IV. Start and use Freeciv-web application

1. Open a terminal to multipass VM: ```multipass shell fcw```
2. ```~/multipass-entrypoint.sh start``` to boot/prepare FCW for use.
3. Open ```http://<ip address>/``` on your browser, using the IP address from **III.3.**

You should see the FCW home page served by the local server running inside your ```fcw``` multipass VM.

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
* Stop FCW ```~/multipass-entrypoint.sh stop```

## Advanced
To externally access internal directories in the VM from within macOS, you can copy between them and work on a clone:
1. Example. Make a copy of an internal dir into your main OS directory tree:
```multipass transfer -r -p fcw:/var/lib/tomcat8/webapps ~/FCW/tomcat_webapps```
2. After making edits, copy dir back into the VM instance:
```multipass transfer -r -p ~/FCW/tomcat_webapps fcw:/var/lib/tomcat8/webapps```
