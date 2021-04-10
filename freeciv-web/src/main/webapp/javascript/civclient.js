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
var client = {};
client.conn = {};

var client_frozen = false;
var phase_start_time = 0;

var debug_active = false;
var autostart = false;

var username = null;

var fc_seedrandom = null;

// singleplayer, multiplayer, longturn, pbem
var game_type = "";
var link_game_type = "";

var music_list = [ "battle-epic",
                   "andrewbeck-ancient",
                   "into_the_shadows",
                   "andrewbeck-stings",
                   "trap_a_space_odyssey_battle_for_the_planet",
                   "elvish-theme",
                   "cullambruce-lockhart-dawning_fanfare"];
var audio = null;
var audio_enabled = false;

var last_turn_change_time = 0;
var turn_change_elapsed = 0;
var seconds_to_phasedone = 0;
var seconds_to_phasedone_sync = 0;
var dialog_close_trigger = "";
var dialog_message_close_task;

/**************************************************************************
 Main starting point for Freeciv-web
**************************************************************************/
$(document).ready(function() {
  civclient_init();
});

/**************************************************************************
 This function is called on page load.
**************************************************************************/
function civclient_init()
{
  $.blockUI.defaults['css']['backgroundColor'] = "#222";
  $.blockUI.defaults['css']['color'] = default_dialog_text_color;
  $.blockUI.defaults['theme'] = true;

  var action = $.getUrlVar('action');
  link_game_type = $.getUrlVar('type');
  if (link_game_type == null) {
    if (action == null || action == 'multi') {
      swal({
             title: "Unknown game type",
             text: "For some reason the client can't determine what kind of game this is. Please <a href='https://github.com/freeciv/freeciv-web/issues'>open an issue</a> detailing how you got here",
             html: true,
             type: "error"
           },
           // Requires a parameter to also be called on cancel
           function (unused) {
             window.location.href ='/';
           }
      );
      setSwalTheme();
      return;
    } else if (action == 'pbem') {
      link_game_type = 'pbem';
    } else {
      link_game_type = 'singleplayer';
    }
  }

  if (action == "observe") {
    observing = true;
    $("#civ_tab").remove();
    $("#empire_tab").remove();
    $("#cities_tab").remove();
    $("#pregame_buttons").remove();
    $("#game_unit_orders_default").remove();
    $("#civ_dialog").remove();
  }

  //initialize a seeded random number generator
  fc_seedrandom = new Math.seedrandom('freeciv-web');

  if (window.requestAnimationFrame == null) {
    swal("Please upgrade your browser.");
    setSwalTheme();
    return;
  }

  if (is_longturn() && observing) {
    swal("LongTurn games can't be observed.");
    setSwalTheme();
    return;
  }

  init_mapview();

  game_init();
  $('#tabs').tabs({ heightStyle: "fill" });
  control_init();
  init_replay();

  timeoutTimerId = setInterval(update_timeout, 1000);

  update_game_status_panel();
  statusTimerId = setInterval(update_game_status_panel, 6000);

  if (overviewTimerId == -1) {
    OVERVIEW_REFRESH = 6000;
    overviewTimerId = setInterval(redraw_overview, OVERVIEW_REFRESH);
  }

  motd_init();

  $('#tabs').css("height", $(window).height());
  $("#tabs-map").height("auto");
  $("#tabs-empire").height("auto");
  $("#tabs-warcalc").height("auto");
  $("#tabs-civ").height("auto");
  $("#tabs-tec").height("auto");
  $("#tabs-nat").height("auto");
  $("#tabs-cities").height("auto");
  $("#tabs-opt").height("100%");
 // $("#tabs-chat").height("auto");
  $("#tabs-hel").height("auto");

  $(".button").button();

  // SAVED USER PREFS CHECKBOX OPTIONS: ---------------------------------------------
  sounds_enabled = simpleStorage.get('sndFX');
  if (sounds_enabled == null) {
    // Default to true, except when known to be problematic.
    if (platform.name == 'Safari') {
      sounds_enabled = false;
    } else {
      sounds_enabled = true;
    }
  }
 
  draw_map_grid = simpleStorage.get('mapgrid');
  if (draw_map_grid == null) 
    draw_map_grid = false;  // Default case

  map_drag_enabled = simpleStorage.get('mapdrag');
  if (map_drag_enabled == null) 
    map_drag_enabled = true;  // Default case

  enable_goto_drag = simpleStorage.get('gotodrag');
  if (enable_goto_drag == null) 
    enable_goto_drag = true;  // Default case 
    
  enable_autoexplore = simpleStorage.get('explorekey');
  if (enable_autoexplore == null) 
    enable_autoexplore = true;  // Default case     

  unit_click_menu = simpleStorage.get('unitclickmenu');
  if (unit_click_menu == null) 
    if (is_small_screen() || is_touch_device())
      unit_click_menu = true;  // Default for mobile
    else 
      unit_click_menu = false;  // Default for PC

  draw_city_airlift_counter = simpleStorage.get('airlift');
  if (draw_city_airlift_counter == null) 
    draw_city_airlift_counter = false;  // Default case

  draw_city_mood = simpleStorage.get('drawMood');
  if (draw_city_mood == null) 
    draw_city_mood = false;  // Default case

  draw_stacked_unit_mode = simpleStorage.get('stackmode');
  if (draw_stacked_unit_mode == null) 
    draw_stacked_unit_mode = 3;  // Default case
  
  draw_city_output = simpleStorage.get('drawTiles');
  if (draw_city_output == null) 
    draw_city_output = false;  // Default case

  scroll_narrow_x = simpleStorage.get('xScroll');
  if (scroll_narrow_x == null) 
    scroll_narrow_x = false;  // Default case

  show_empire_tab = simpleStorage.get('showEmpire');
  if (show_empire_tab == null) 
    show_empire_tab = false;  // Default case
  
/*show_warcalc = simpleStorage.get('showCalc');
  if (show_warcalc == null) 
    show_warcalc = false;  // Default case */

  show_compass = simpleStorage.get('showCompass');
  if (show_compass == null || show_compass == true) {
    show_compass = true;  // Default case
    $("#compass").show();
  } else $("#compass").hide();
  var tmp = simpleStorage.get('chatDlg');
  if (tmp != null)  {// don't overwrite object keys if not yet stored
    restore_chatbox_vals = tmp;
  }

  draw_highlighted_pollution = simpleStorage.get('showpollution');
  if (draw_highlighted_pollution == null)
    draw_highlighted_pollution = false;

  focuslock = simpleStorage.get('focuslock');
  if (focuslock == null) {
    if (is_small_screen() || is_touch_device())
      focuslock = true;
    else focuslock = false;
  }

  show_unit_movepct = simpleStorage.get('showMoves');
  if (show_unit_movepct == null)
    show_unit_movepct = false;
  if (show_unit_movepct) {
    hp_bar_offset = -5;
  } else hp_bar_offset = 0;

  draw_border_flags = simpleStorage.get('borderFlags');
  if (draw_border_flags == null) 
    draw_border_flags = false;  // Default case

  draw_tertiary_colors = simpleStorage.get('tricolore');
  if (draw_tertiary_colors == null) 
    draw_tertiary_colors = false;  // Default case

  draw_thick_borders = simpleStorage.get('thickBorders');
  if (draw_thick_borders == null) 
    draw_thick_borders = false;  // Default case

  draw_dashed_borders = simpleStorage.get('dashedBorders');
  if (draw_dashed_borders == null) 
    draw_dashed_borders = false;  // Default case

  draw_moving_borders = simpleStorage.get('movingBorders');
  if (draw_moving_borders == null) 
    draw_moving_borders = false;  // Default case
  // -------------------------------------------------------------------------------- 
  
  /* Initialze audio.js music player */
  audiojs.events.ready(function() {
    var as = audiojs.createAll({
          trackEnded: function() {
            if (!supports_mp3()) {
              audio.load("/music/" + music_list[Math.floor(Math.random() * music_list.length)] + ".ogg");
            } else {
              audio.load("/music/" + music_list[Math.floor(Math.random() * music_list.length)] + ".mp3");
            }
            audio.play();
          }
        });
    audio = as[0];
  });

  if (link_game_type == 'singleplayer#') link_game_type = 'singleplayer';

  var game_port = $.getUrlVar('civserverport');
  var game_host = $.getUrlVar('civserverhost');
  var multi = $.getUrlVar('multi');
  if ((link_game_type == 'pbem' || link_game_type == 'singleplayer') && game_port == null && game_host == null && multi == null ) {
     game_type = link_game_type;
     init_common_intro_dialog();
  }
  else {
    $.ajax({
        type: 'GET',
        url: "/get_game_type?host="+$.getUrlVar('civserverhost')+"&port="+game_port,
        success: function(data, textStatus, request){
            game_type = data;
            if (link_game_type != "" && game_type == "longturn" && link_game_type != game_type) {
            if (link_game_type.includes("#")) link_game_type = link_game_type.replace(/#/g,"%23");
                var stored_username = simpleStorage.get("username", "");
                if (stored_username == null || stored_username == false) stored_username = "blank"
                $.ajax({
                    type: 'POST',
                    url: "/validate_twit?username="+stored_username+"&type=type%3D"+link_game_type+"&port="+game_port,
                });    
            }
            init_common_intro_dialog();
        },
        error: function (request, textStatus, errorThrown) {  
            swal("Error, can't get the game type!");
            setSwalTheme();      
        }
    });    
  }
  setup_window_size();
  update_turn_change_timer(); // styles it for mobile or large screen.
  // civclient.css refuses to do it, so we do it here:
  $(".ui-dialog-titlebar-minimize").css({"background":"none","background-image":"none","margin-top":"1px", "margin-left": "0px",
    "margin-right":"2px", "border":"none", "height":"16px"});
  $(".ui-dialog-titlebar-maximize").css({"background":"none","background-image":"none","margin-top":"1px", "margin-left": "0px",
    "margin-right":"2px", "border":"none", "height":"16px"});
  $(".ui-dialog-titlebar-restore").css({"background":"none","background-image":"none","margin-top":"1px", "margin-left": "0px",
    "margin-right":"2px", "border":"none", "height":"16px"});
  $(".ui-dialog-titlebar-close").css({"background":"none","background-image":"none","margin-top":"1px", "margin-left": "0px",
    "margin-right":"2px", "border":"none", "height":"16px"}); // solo el diablo sabe por que!

}

/**************************************************************************
 Shows a intro dialog depending on game type.
**************************************************************************/
function init_common_intro_dialog() {

  if (observing) {
    show_intro_dialog("Welcome to Freeciv-web",
      "You have joined the game as an observer. Please enter your name:");
    $("#turn_done_button").button( "option", "disabled", true);

  } else if ($.getUrlVar('action') == "pbem") {
    show_pbem_dialog();

  } else if ($.getUrlVar('action') == "hotseat") {
    show_hotseat_dialog();

  } else if (is_small_screen()) {
    if (is_longturn()) {
        setTimeout(show_longturn_intro_dialog, 300);
    } else {
      show_intro_dialog("Welcome to Freeciv-web",
        "You are about to join the game. Please enter your name:");
    }
  } else if ($.getUrlVar('action') == "earthload") {
    show_intro_dialog("Welcome to Freeciv-web",
      "You can now play Freeciv-web on the earth map you have chosen. " +
      "Please enter your name: ");

  } else if ($.getUrlVar('action') == "load") {
    show_intro_dialog("Welcome to Freeciv-web",
      "You are about to join this game server, where you can " +
      "load a savegame, tutorial, custom map generated from an image or a historical scenario map. " +
      "Please enter your name: ");

  } else if ($.getUrlVar('action') == "multi") {

    if (is_longturn()) {
        setTimeout(show_longturn_intro_dialog, 300);
    } else {
      var msg =  "After you Join Game, click the <b>Game</b> button to select rules and settings.<br>" +
                  "Wait for other players <b>before</b> clicking <b>Start</b>.";
      show_intro_dialog("Multiplayer Game", msg);
    }

  } else if ($.getUrlVar('action') == "hack") {
    var hack_port;
    var hack_username;

    if ($.getUrlVar('civserverport') != null) {
      hack_port = $.getUrlVar('civserverport');
    } else {
      show_intro_dialog("Welcome to Freeciv-web",
        "Hack mode disabled because civserverport wasn't specified. "
        + "Falling back to regular mode.");
      return;
    }

    if ($.getUrlVar("username") != null) {
      hack_username = $.getUrlVar("username");
    } else if (simpleStorage.hasKey("username")) {
      hack_username = simpleStorage.get("username");
    } else {
      show_intro_dialog("Welcome to Freeciv-web",
        "Hack mode disabled because \"username\" wasn't specified and no "
        + "stored user name was found. " +
        "Falling back to regular mode.");
      return;
    }
    
    $.ajax({
        type: 'POST',
        url: "/validate_twit?username="+hack_username+"&type=action_hack&port="+hack_port,
    });    
    
  } else {
    show_intro_dialog("Singleplayer vs. Freeciv AI",
      "<br>Creating an account is optional. Saved games need an account."); 
      //+" (<a class='pwd_reset' href='#' style='color: #404A6F;'>Forgot password?</a>) Have fun! <br>");
      //$(".pwd_reset").click(forgot_pbem_password); 
  }
  $("#pregame_message_area").html("<b>Game</b>: Select rules and game settings.<br>"+
  "<b>Load</b>: Load saved game.<br>"+
  "<b>Nation</b>: Pick nation.<br>"+
  "<b>Start</b>: Do <u>after</u> you set rules and settings.<br><br>"+
  ($.getUrlVar('action') != "multi" 
     ? "<b>WARNING:</b> Default rules for Singleplayer are Classic (old).</b><br><br>"+
     "<u>All rulesets are suitable for Singleplayer.</u><br><br>"+
     "<b>NOTE:</b> Rulesets named 'Multiplayer' are simply the more modern rulesets that work well with any number of players.<br>"+
     "You can play Singleplayer with a Multiplayer ruleset if you wish to improve for multiplayer games with other humans.<br>"+
     "&nbsp;&bull; If you do this, try: &nbsp; <b>/set sciencebox 80</b> &nbsp; (or similar) to set a singleplayer research pace. <b>/help sciencebox</b> for more info.<br>"
     : "<b>WARNING:</b> Default rules for Multiplayer are Multiplayer+.</b><br><br>"   ) +
  
  "Click <b>Game</b> button to select Game Version (ruleset).<br><br>"+
  "Advanced: You can tune more settings with the command line.<br>"+
  "&nbsp;&nbsp;&nbsp;To see all options: <b>/show all</b><br>"+
  "&nbsp;&nbsp;&nbsp;Set option to ####: <b>/set</b> option_name ####<br>"+
  "&nbsp;&nbsp;&nbsp;To see option help: <b>/help</b> option_name<br><br><br>"
   );
}

/**************************************************************************
 Closes a generic message dialog.
**************************************************************************/
function close_dialog_message() {
  remove_active_dialog("#generic_dialog");
  $(this).off("keypress");
}

function closing_dialog_message() {
  clearTimeout(dialog_message_close_task);
  $("#game_text_input").blur();
}

/**************************************************************************
 Shows a generic message dialog.
**************************************************************************/
function show_dialog_message(title, message)
{
  if (title=="Tile Information" || title=="Tile Info")
    message = improve_tile_info_dialog(message);

  // reset dialog page.
  remove_active_dialog("#generic_dialog");
  $("<div id='generic_dialog'></div>").appendTo("div#game_page");

  speak(title);
  speak(message);

  $("#generic_dialog").html(message);
  $("#generic_dialog").attr("title", title);
  $("#generic_dialog").dialog({
			bgiframe: true,
			modal: false,
			width: is_small_screen() ? "90%" : "50%",
			close: closing_dialog_message,
			buttons: {
				"OK (𝗪)": close_dialog_message
			}
		}).dialogExtend({
                   "minimizable" : true,
                   "closable" : true,
                   "icons" : {
                     "minimize" : "ui-icon-circle-minus",
                     "restore" : "ui-icon-bullet"
                   }});
        
  // W is universal key to get out of anything and back to map                 
  $(this).keypress(function(e){
    //alert("(this).keypress(e) event that was tied to dialog, keycode: "+e.keyCode);
    if (e.which == 119 || e.keyCode == 119 /* IE8: || (window.event != null && window.event.keyCode == 119)*/) {
        //alert('1-W pressed');
        close_dialog_message();
    };
  });

  $("#generic_dialog").dialog('open');
  dialog_register("#generic_dialog");

  $("#game_text_input").blur();

  if (title=="Tile Information")
      $("#calc_tip").tooltip();
  
  // Automatically close dialog after 38 seconds, because sometimes the dialog can't be closed manually.
  // When can't it be closed manually? This made problems if two dialogs opened in <30 and first one 
  // closes second one. Turning off and will fix some other way if needed:
  // dialog_message_close_task = setTimeout(close_dialog_message, 38000);

  $('#generic_dialog').css("max-height", "450px");
}

/**************************************************************************
 ...
**************************************************************************/
function validate_username() {
  username = $("#username_req").val();

  if (!is_username_valid_show(username)) {
    return false;
  }

  simpleStorage.set("username", username);

  return true;
}

/**************************************************************************
 Checks if the username is valid and shows the reason if it is not.
 Returns whether the username is valid.
**************************************************************************/
function is_username_valid_show(username) {
  var reason = get_invalid_username_reason(username);
  if (reason != null) {
    $("#username_validation_result").html("The username '"
                + username.replace(/&/g, "&amp;").replace(/</g, "&lt;")
                + "' is " + reason + ".");
    $("#username_validation_result").show();
    return false;
  }
  return true;
}

/* Webclient is always client. */
function is_server()
{
  return false;
}

/**************************************************************************
 ...
**************************************************************************/
function update_timeout()
{
  var now = new Date().getTime();

  var is_small = is_small_screen();

  if (game_info != null
      && current_turn_timeout() != null && current_turn_timeout() > 0) {
    var remaining = Math.floor(seconds_to_phasedone - ((now - seconds_to_phasedone_sync) / 1000));

    if (remaining >= 0 && turn_change_elapsed == 0) {
      if (is_small && !is_longturn()) {
        $("#turn_done_button").button("option", "label", "T " + remaining);
        $("#turn_done_button .ui-button-text").css("padding", "3px");
      } else if (is_small) {  // small screen && longturn:
        $("#turn_done_button").button("option", "label", "" + seconds_to_human_time(remaining) + ""); //timer only, don't cover tabs
      } else {                          // big screen && longturn:   
        $("#turn_done_button").button("option", "label", "Turn Done (" + seconds_to_human_time(remaining) + ")");
      }
      if (!is_touch_device()) $("#turn_done_button").tooltip({ disabled: false });
    }
  }
}


/**************************************************************************
 shows the remaining time of the turn change on the turn done button.
**************************************************************************/
function update_turn_change_timer()
{
  turn_change_elapsed += 1;
  if (turn_change_elapsed < last_turn_change_time) {
    setTimeout(update_turn_change_timer, 1000);
    $("#turn_done_button").button("option", "label", "Please wait (" 
        + (last_turn_change_time - turn_change_elapsed) + ")");
  } else {
    turn_change_elapsed = 0;
    if (is_small_screen()) {
      $("#turn_done_button").button("option", "label", "Done");
      $("#turn_done_button").css("font-size", "90%");
      $("#turn_done_button_div").css("padding-right","0px");
      $("#turn_done_button").css("padding-left", "3px");
      $("#turn_done_button").css("padding-right", "3px");
    }
    else {
      $("#turn_done_button").button("option", "label", "Turn Done");
      $("#turn_done_button_div").css("padding-right","1px");
    } 
  }
}

/**************************************************************************
 ...
**************************************************************************/
function set_phase_start()
{
  phase_start_time = new Date().getTime();
}

/**************************************************************************
...
**************************************************************************/
function request_observe_game()
{
  send_message("/observe ");
}

/**************************************************************************
...
**************************************************************************/
function surrender_game()
{
  send_surrender_game();

  $("#tabs-map").removeClass("ui-tabs-hide");
  $("#tabs-opt").addClass("ui-tabs-hide");
  $("#map_tab").addClass("ui-state-active");
  $("#map_tab").addClass("ui-tabs-selected");
  $("#map_tab").removeClass("ui-state-default");

}

/**************************************************************************
...
**************************************************************************/
function send_surrender_game()
{
  if (!client_is_observer() && ws != null && ws.readyState === 1) {
    send_message("/surrender ");
  }
}

/**************************************************************************
...
**************************************************************************/
function show_fullscreen_window()
{
  if (BigScreen.enabled) {
    BigScreen.toggle();
  } else {
   show_dialog_message('Fullscreen', 'Press F11 for fullscreen mode.');
  }
}

/**************************************************************************
...
**************************************************************************/
function show_debug_info()
{
  console.log("Freeciv version: " + freeciv_version);
  console.log("Browser useragent: " + navigator.userAgent);
  console.log("jQuery version: " + $().jquery);
  console.log("jQuery UI version: " + $.ui.version);
  console.log("simpleStorage version: " + simpleStorage.version);
  console.log("Touch device: " + is_touch_device());
  console.log("HTTP protocol: " + document.location.protocol);
  if (ws != null && ws.url != null) console.log("WebSocket URL: " + ws.url);

  debug_active = true;
  /* Show average network latency PING (server to client, and back). */
  var sum = 0;
  var max = 0;
  for (var i = 0; i < debug_ping_list.length; i++) {
    sum += debug_ping_list[i];
    if (debug_ping_list[i] > max) max = debug_ping_list[i];
  }
  console.log("Network PING average (server): " + (sum / debug_ping_list.length) + " ms. (Max: " + max +"ms.)");

  /* Show average network latency PING (client to server, and back). */
  sum = 0;
  max = 0;
  for (var j = 0; j < debug_client_speed_list.length; j++) {
    sum += debug_client_speed_list[j];
    if (debug_client_speed_list[j] > max) max = debug_client_speed_list[j];
  }
  console.log("Network PING average (client): " + (sum / debug_client_speed_list.length) + " ms.  (Max: " + max +"ms.)");

}

/**************************************************************************
  This function can be used to display a message of the day to users.
  It is run on startup of the game, and every 30 minutes after that.
  The /motd.js Javascript file is fetched using AJAX, and executed
  so it can run any Javascript code. See motd.js also.
**************************************************************************/
function motd_init()
{
  $.getScript("/motd.js");
  setTimeout(motd_init, 1000*60*30);
}

/**************************************************************************
 Shows the authentication and password dialog.
**************************************************************************/
function show_auth_dialog(packet) {

  // reset dialog page.
  $("#dialog").remove();
  $("<div id='dialog'></div>").appendTo("div#game_page");

  var intro_html = packet['message']
      + "<br><br> Password: <input id='password_req' type='text' size='25'>";
  $("#dialog").html(intro_html);
  $("#dialog").attr("title", "Private server needs password to enter");
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "80%" : "60%",
			buttons:
			{
				"Ok" : function() {
                                  var pwd_packet = {"pid" : packet_authentication_reply, "password" : $('#password_req').val()};
                                  var myJSONText = JSON.stringify(pwd_packet);
                                  send_request(myJSONText);

                                  $("#dialog").dialog('close');
				}
			}
		});

  $("#dialog").dialog('open');
}

/**************************************************************************
 Is this a LongTurn game?
**************************************************************************/
function is_longturn()
{
  return game_type == "longturn";
}

/**************************************************************************
 Is connected user a supercow/admin/Gamemaster?
**************************************************************************/
function is_supercow()
{
  return (client.conn["access_level"] >= 5);
}

/**************************************************************************
 Is this an ongoing LongTurn game?
*************************************************************************/
function is_ongoing_longturn()
{
  return is_longturn() && game_info != null && game_info['turn'] > 0;
}

/**************************************************************************
 Is this a loaded game? Make sure to call after the "you are logged in as"
 message.
*************************************************************************/
function is_loaded_game()
{
  var chatbox_text = get_chatbox_text();
  return chatbox_text !== null && chatbox_text.indexOf("Load complete") != -1;
}

