# FreeCiv on AWS

Notes on setup of FreeCiv Web Server in AWS.

Stephen Houser -- September 11, 2019

I started in docker and have added notes here on tweaks to work in AWS with a separate persistent data volume, mounted at `/freeciv-data`. These notes include the creation/setup of that persistent (EBS) volume, the initial install and creation of a snapshot/image (AMI) that can then be re-used to launch EC2 instances.

1. Create EBS volume
2. Create Security Group
3. Create EC2 Instance (to populate EBS volume and setup FreeCiv Web)
4. Create AMI for re-use
5. Launch an EC2 instance from the AMI and mount EBS volume

## Create persistent (EBS) data volume

* 1GiB general SSD is fine
* Needs to be in same AZ as the EC2 Instance

## Create security group

Inbound ports:

* 22: ssh for tweaking
* 80: http user interface
* 443: https user interface
* 8080: tomcat
* 4002: web proxy launcher status (publite)
* 6000-6009: websocket proxies
* 7000-7009: freeciv servers

## Create EC2 Instance

* At least `t2.small` instance
* Ubuntu Server 18.04 LTS (HVM), SSD Volume Type - ami-07d0cf3af28718ef8 (64-bit x86)
* Put in created security group
* Add an SSH keypair you have access to

## Attach persistent data drive

* back in Volumes, attach to the EC2 instance
* note the device name `/dev/sdf`

## Configure Persistent Data and then EC2 Instance

```
ssh -i ~/.ssh/houser-aws.pem ubuntu@ec2-54-81-55-91.compute-1.amazonaws.com
```

* SSL Certificate -- `nginx` will not start without one (or mod of the config)
 * If you use install mode TEST then install will generate a self signed cert
 * If you use install mode DFLT then put a cert in /etc/nginx/ssl/freeciv-web.crt

### The Persistent Data Volume

Set up persistent data volume, likely on an EC2 instance, perhaps the same one you will soon use to install FreeCiv Web.

```
sudo mkfs -t xfs /dev/xvdf
sudo mkdir /freeciv-data
sudo mount /dev/xvdf /freeciv-data

# Make location for saved game data
sudo mkdir -p /freeciv-data/data
...

# Make locaton for SSL certificate, populate as needed
sudo mkdir -p /freeciv-data/ssl
...

# Make location for game configuration, populate as needed
sudo mkdir -p /freeciv-data/games
...

# Put in configuration to use when building
touch /freeciv-data/config
...

# Make sure `ubuntu` user can access everything
sudo chown -R ubuntu:ubuntu /freeciv-data

# Unmount when done
sudo umount /freeciv-data
```

### Configure the EC2 instance for snapshotting

```
# Setup and install FreeCiv Web

# Mount and link in persistent data volume
sudo mkdir -p /freeciv-data
sudo mount /dev/xvdf /freeciv-data

if [ -d /freeciv-data/data ]; then
    sudo mkdir -p /var/lib/tomcat9/webapps
    sudo ln -s /freeciv-data/data /var/lib/tomcat9/webapps/
fi

# Fetch and build FreeCiv Web
git clone https://github.com/bowdoincollege/freeciv-web.git --depth 10
cd freeciv-web

# Config file is *only* used when building freeciv-web
if [ -f /freeciv-data/config ]; then
    cp /freeciv-data/config config/config
fi

./scripts/install/install.sh --mode=DFLT

sudo umount /freeciv-data
sudo shutdown -h now
```

* Snap an ec2 image

## Run the EC2 Image

Startup (UserData) should look like the following:

```
#!/bin/bash

# Mount persistent storage for save games
sudo mount /dev/xvdf /freeciv-data

# Copy (overwrite) SSL Certificate
if [ -d /freeciv-data/ssl ]; then
    sudo cp -r /freeciv-data/ssl /etc/nginx/
fi

# Copy (overwrite) any game startup scripts from persistent storage
if [ -d /freeciv-data/games ]; then
    cp /freeciv-data/games/pubscript_longterm_*serv ~/freeciv-web/publite2
fi

# Start FreeCiv Web, proxies, servers, ...
cd freeciv-web
~/freeciv-web/scripts/start-freeciv-web.sh
```

## Important Locations

* Longterm games are configured in `~/freeciv-web/publite2/pubscript_longturn_*.serv`
* Saved games, scorelogs, ranklogs are in `/var/lib/tomcat9/webapps/data`
* Logfiles for proxies and games are in `~/freeciv-web/logs/`

## Stooopid Google

* Can't use Google Sign-in with default EC2 names. Need to have a CNAME or some other reference to connect with.

https://stackoverflow.com/questions/46225712/google-oauth2-does-not-work-with-amazon-ec2-instances-public-dns?rq=1
