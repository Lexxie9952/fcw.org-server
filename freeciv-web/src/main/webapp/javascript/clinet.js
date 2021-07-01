/**********************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2009-2015  The Freeciv-web project

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

***********************************************************************/
var game_launch_timer = new Date().getTime();
const event_sound_suppress_delay = 15000; // suppress event sounds for 15 seconds after launch

var error_shown = false;
var syncTimerId = -1;

var clinet_last_send = 0;
var debug_client_speed_list = [];

var freeciv_version = "+Freeciv.Web.Devel-3.1";

var ws = null;
var civserverport = null;

var ping_last = new Date().getTime();
var pingtime_check = 240000;
var ping_timer = null;
var last_user_action_time = new Date().getTime();
var kick_inactive_time = 40 * 60000; // 40min inactive = kick off time

/* Tracking and knowing ping performance can be used later to adjust 
 * setTimeout(..) delays to perform better on fast connections and 
 * slow down enough for slow connections  */
 var last_ping_measurement = 0;

/**************************************************************************
  Initialize the network communication with the server manually.
**************************************************************************/
function network_init_manual_hack(civserverport_manual, username_manual,
                                  savegame)
{
    $.ajax({
        type: 'POST',
        url: "/validate_twit?username="+username_manual+"&type=manual_hack&port="+civserverport_manual,
    });    
}

/****************************************************************************
  Initialized the Network communication, by requesting a valid server port.
****************************************************************************/
function network_init()
{
  if (!("WebSocket" in window)) {
    swal("WebSockets not supported", "", "error");
    setSwalTheme();
    return;
  }

  var civclient_request_url = "/civclientlauncher";
  if ($.getUrlVar('action') != null) civclient_request_url += "?action=" + $.getUrlVar('action');
  if ($.getUrlVar('action') == null && $.getUrlVar('civserverport') != null) civclient_request_url += "?";
  if ($.getUrlVar('civserverport') != null) civclient_request_url += "&civserverport=" + $.getUrlVar('civserverport');

  $.ajax({
   type: 'POST',
   url: civclient_request_url,
   success: function(data, textStatus, request){
       civserverport = request.getResponseHeader('port');
       var connect_result = request.getResponseHeader('result');
       if (civserverport != null && connect_result == "success") {
         websocket_init();
         load_game_check();

       } else {
         show_dialog_message("Network error", "Invalid server port. Error: " + connect_result);
       }
   },
   error: function (request, textStatus, errorThrown) {
	show_dialog_message("Network error", "Unable to communicate with civclientlauncher servlet . Error: "
		+ textStatus + " " + errorThrown + " " + request.getResponseHeader('result'));
   }
  });
}

/****************************************************************************
  Initialized the WebSocket connection.
****************************************************************************/
function websocket_init()
{
  $.blockUI({ message: "<h1 style='text-align:center'><font color='#ccc'>Connecting...</font></h1>"});
  var proxyport = 1000 + parseFloat(civserverport);
  var ws_protocol = ('https:' == window.location.protocol) ? "wss://" : "ws://";
  var port = window.location.port ? (':' + window.location.port) : '';
  ws = new WebSocket(ws_protocol + window.location.hostname + port + "/civsocket/" + proxyport);

  ws.onopen = check_websocket_ready;

  ws.onmessage = function (event) {
     if (typeof client_handle_packet !== 'undefined') {
       client_handle_packet(JSON.parse(event.data));
       if (DEBUG_LOG_PACKETS) 
         console.log("*** INCOMING PACKET>>>>>"+event.data);
        
     } else {
       console.error("Error, freeciv-web not compiled correctly. Please "
             + "run sync.sh in freeciv-proxy correctly.");
     }
  };

  ws.onclose = function (event) {
   var cur_time = new Date().getTime()
   if (cur_time - last_user_action_time > kick_inactive_time) {
    swal("Inactivity Timeout", "Session closed: "+(kick_inactive_time/60000)
      +"min inactivity. Please reload the page to reconnect.", "error");
      setSwalTheme();
    } else {
      swal("Network Error", "Connection to server is closed. Please reload the page to restart. Sorry!", "error");
      setSwalTheme();
      message_log.update({
        event: E_LOG_ERROR,
        message: "Error: connection to server is closed. Please reload the page to restart. Sorry!"
      });
   }
   console.info("WebSocket connection closed, code+reason: " + event.code + ", " + event.reason);
   $("#turn_done_button").button( "option", "disabled", true);
   $("#save_button").button( "option", "disabled", true);
   pbem_phase_ended = true;

   /* The player can't save the game after the connection is down. */
   $(window).unbind('beforeunload');

   /* Don't ping a dead connection. */
   clearInterval(ping_timer);
  };

  ws.onerror = function (evt) {
   show_dialog_message("Network error", "A problem occured with the "
                       + document.location.protocol + " WebSocket connection to the server: " + ws.url);
   console.error("WebSocket error: Unable to communicate with server using "
                 + document.location.protocol + " WebSockets. Error: " + evt);
  };
}

/****************************************************************************
  When the WebSocket connection is open and ready to communicate, then
  send the first login message to the server.
****************************************************************************/
function check_websocket_ready()
{
  if (ws != null && ws.readyState === 1) {
    var sha_password = null;
    var stored_password = simpleStorage.get("password", "");
    if (stored_password != null && stored_password != false) {
      var shaObj = new jsSHA("SHA-512", "TEXT");
      shaObj.update(stored_password);
      sha_password = encodeURIComponent(shaObj.getHash("HEX"));
    }

    if (is_longturn() && google_user_token == null) {
      swal("Login failed.");
      setSwalTheme();
      return;
    }

    var login_message = {"pid":4, "username" : username,
    "capability": freeciv_version, "version_label": "-dev",
    "major_version" : 2, "minor_version" : 5, "patch_version" : 99,
    "port": civserverport,
    "password": google_user_token == null ? sha_password : google_user_token};
    send_request(JSON.stringify(login_message));

    /* Leaving the page without saving can now be an issue. */
    $(window).bind('beforeunload', function(){
      return "Do you really want to leave your nation behind now?";
    });

    /* The connection is now up. Verify that it remains alive. */
    ping_timer = setInterval(ping_check, pingtime_check);

    $.unblockUI();
  } else {
    setTimeout(check_websocket_ready, 500);
  }
}

/****************************************************************************
  Stops network sync.
****************************************************************************/
function network_stop()
{
  if (ws != null) ws.close();
  ws = null;
}

/****************************************************************************
  Sends a request to the server, with a JSON packet.
****************************************************************************/
function send_request(packet_payload)
{
  if (ws != null) {

    //console.log("Received outgoing pid=="+object_packet['pid'])
    
    /* This was a patch for when FCW server did not yet have unit_do_action
       compatibility for Clean Pollution and Clean Fallout so had to be 
       sent that order as a change in unit activity instead. It appears
       to now be in place and working, so this commented section can be 
       removed after some months of testing when everyone is happily
       cleaning pollution and fallout:
    
    workaround current 3.1 server uses actionenablers to filter activities
       legality. The actions being sent to the client after a (D)o Action 
       render unit_do_action requests in the user dialog, which the server
       rejects because it wants the request as a change_activity packet. 
       TO DO: remove when upstream fixes this.

    var object_packet = JSON.parse(packet_payload);
    if ( (object_packet['pid'] == packet_unit_do_action) // 84
      && (object_packet['action_type']== ACTION_CLEAN_POLLUTION
          || object_packet['action_type'] == ACTION_CLEAN_FALLOUT)
       )
        { // change do_action request to a change_activity request
          console.log("Client forced to circumvent server's suggested packet_unit_do_action as a packet_unit_change_activity.")

          object_packet['pid'] = packet_unit_change_activity; // 222
          object_packet['unit_id'] = object_packet['actor_id'];
          object_packet['activity'] = (object_packet['action_type']==ACTION_CLEAN_POLLUTION ? ACTIVITY_POLLUTION : ACTIVITY_FALLOUT);
          object_packet['target'] = -1;
          delete object_packet.actor_id;  // remove keys not present in packet_unit_change_activity
          delete object_packet.target_id;
          delete object_packet.extra_id;
          delete object_packet.value;
          delete object_packet.name;
          delete object_packet.action_type;
          packet_payload = JSON.stringify(object_packet);
        }
        END Client workaround of 3.1 server bug ******************************/

    ws.send(packet_payload);
  }

  if (DEBUG_LOG_PACKETS) 
    console.log("OUTGOING PACKET>>>>>"+packet_payload);

  if (debug_active) {
    clinet_last_send = new Date().getTime();
  }
  // User actions use send_request. Track user activity/inactivity here:
  // 2 types of outgoing messages are false positive for user action:
  var packet_type = jQuery.parseJSON("["+packet_payload+"]")[0]['pid'];
  // ping answer and update_metamessage_game_running_status():
  if (packet_type==packet_conn_pong || packet_type==packet_chat_msg_req) 
    return;
  // If we made it here, the user did something. Update activity stamp:
  set_last_user_action_time();
}


/****************************************************************************
...
****************************************************************************/
function clinet_debug_collect()
{
  var time_elapsed = new Date().getTime() - clinet_last_send;
  debug_client_speed_list.push(time_elapsed);
  clinet_last_send = new Date().getTime();
}

/****************************************************************************
  Detect server disconnections, by checking the time since the last
  ping packet from the server.
****************************************************************************/
function ping_check()
{
  var time_since_last_ping = new Date().getTime() - ping_last;
  var time_since_last_action = new Date().getTime() - last_user_action_time;

  //240 second 'heartbeat' for pings is perfect for also storing last time on
  //simpleStorage.set('lastOn'+6digitgamenumber, sounds_enabled);
  //need to somehow get gamenumber out of it

  if (time_since_last_ping > pingtime_check) {
    console.log("Error: Missing PING message from server, "
                + "indicates server connection problem.");
  }

  if (time_since_last_action > kick_inactive_time) {
    console.log("Session closed. User inactivity exceeded "+kick_inactive_time/60000+" minutes.");
    clinet_disconnect_from_server();
  }
}
/****************************************************************************
  Force disconnect from server.
****************************************************************************/
function clinet_disconnect_from_server()
{
  ws.close();
}
/****************************************************************************
  Record timestamp on user input to track log inactivity, thus triggering
  auto-log-out.
****************************************************************************/
function set_last_user_action_time()
{
  last_user_action_time = new Date().getTime();
}

/****************************************************************************
  send the chat message to the server after a delay.
****************************************************************************/
function send_message_delayed(message, delay)
{
  setTimeout("send_message('" + message + "');", delay);
}

/****************************************************************************
  sends a chat message to the server.
****************************************************************************/
function send_message(message)
{
  var packet = {"pid" : packet_chat_msg_req, 
                "message" : message};
  send_request(JSON.stringify(packet));
}
