# Multipass guide

This document describes the creation of a development environment in [Multipass](https://multipass.run/docs)

Multipass is a product for creating Ubuntu based Virtual Machines, it is automating the VM creation by providing
ubuntu vm images and different ways to automate the provision of software to them.

Multipass is an alternative to Vagrant, and as vagrant is using virtualization providers.

The multipass method is suggested for workstations that run MacOS on Apple silicon processors, a platform that 
vagrant support is poor on the time of writing.

This method has been tested successfully on a machine with M2 processor.

## Installation of multipass software on MacOs

Installation steps to be added by Lexxie

_Note_: Multipass has known network issues on MacOS (e.g when using a VPN). 
Please find the troubleshooting guide here: https://multipass.run/docs/troubleshoot-networking#heading--troubleshoot-networking-on-macos

## Development environment description

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

These specs can be changed in [fcw-multipass.sh](fcw-multipass.sh) script.

## Steps to setup the development environment

1. Clone freeciv-web code (Refer to [README](README.md)), preferably on your home folder.
2. Change to the directory of your source code.
3. Execute the script [fcw-multipass.sh](fcw-multipass.sh)

These steps will create a virtual machine containing freeciv-web and the software mentioned on the environment description.

### Common multipass commands to interact with the VM.

- ```multipass shell fcw``` Open a terminal to the multipass VM.
- ```multipass stop fcw``` Stop the multipass vm
- ```multipass start fcw``` Start the multipass vm
- ```multipass info fcw``` Get information about the VM (including it's ip address it is needed in order to connect to the application via a web browser)

To destroy the VM just run ```./fcw-multipass.sh destroy```

## Start and use Freeciv-web application

1. Open a terminal to multipass VM
2. ```~/multipass-entrypoint.sh start```
3. Find the ip address from the information of the fcw VM
4. Open ```http://<ip address>/``` on your browser




