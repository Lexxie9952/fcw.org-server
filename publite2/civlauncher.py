from threading import Thread
from subprocess import call, PIPE
from shutil import *
import sys
from time import gmtime, strftime
import time
import requests
import socket
import glob

# The Civlauncher class launches a new instance of a Freeciv-web server in a 
# separate thread and restarts the process when the game ends.
class Civlauncher(Thread):
    restart_interval = 40

    def __init__ (self, gametype, scripttype, new_port, metahostpath, savesdir):
        Thread.__init__(self)
        self.new_port = new_port;
        self.gametype = gametype;
        self.scripttype = scripttype;
        self.metahostpath = metahostpath;
        self.savesdir = savesdir;
        self.started_time = strftime("%Y-%m-%d %H:%M:%S", gmtime());
        self.num_start = 0;        
        self.num_error = 0;

    def run(self):
        while True:            
            try:
                print("Start freeciv-web on port " + str(self.new_port) + 
                        " and freeciv-proxy on port " + str(1000 + self.new_port) + ".");
                retcode = call(["../publite2/init-freeciv-web.sh"
                                , self.savesdir
                                , str(self.new_port)
                                , str(1000 + self.new_port)
                                , self.metahostpath
                                , self.gametype
                                , self.scripttype])
                self.num_start += 1;
                if retcode > 0:
                    print("Freeciv-web port " + str(self.new_port) + " was terminated by signal " + str(retcode))
                    if self.gametype == "longturn":
                        lt_scripts = glob.glob('LT*.serv')
                        if self.scripttype not in lt_scripts:
                            PARAMS = {'host':socket.gethostname(), 'port':self.new_port, 'bye':1};
                            data = {'host':socket.gethostname(),
                                    'port': self.new_port,
                                    'bye':1                    };
                            r = requests.post(url = "http://"+self.metahostpath, data = data);
                            break
                        else:
                            self.num_error += 1;
                            time.sleep(self.restart_interval); # Prevention for bogging the server down if something goes horribly wrong
                    else:
                        self.num_error += 1;
                        time.sleep(self.restart_interval);

                else:
                    print("Freeciv-web port " + str(self.new_port) + " returned " + str(retcode))
            except OSError as e:
                print("Execution failed:", e, file=sys.stderr)
                break

