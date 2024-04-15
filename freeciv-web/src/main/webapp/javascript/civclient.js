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

var turn_done_button_RTS_state = 999;  // an invalid state so that it gets set to right state at launch
var remaining;                         // global storage for last time turn-timer was calculated
const RTS_NO = 0, RTS_YES = 1, RTS_SOON = 2;   // rts state codes
var client_frozen = false;
var phase_start_time = 0;
var fullscreen = false;
var debug_active = false;
var autostart = false;

var username = null;

var fc_seedrandom = null;

// singleplayer, multiplayer, longturn, pbem
var game_type = "";
var link_game_type = "";

var RENDERER_2DCANVAS = 1;      // default HTML5 Canvas
var RENDERER_WEBGL = 2;         // WebGL + Three.js
var renderer = RENDERER_2DCANVAS;  // This variable specifies which map renderer to use, 2d Canvas or WebGL.

var last_turn_change_time = 0;
var turn_change_elapsed = 0;
var seconds_to_phasedone = 0;
var seconds_to_phasedone_sync = 0;
var dialog_close_trigger = "";
var dialog_message_close_task;
/* CSS PROPERTIES DEFINED IN civclient.css */
var default_text_color = "#ccc";
var default_button_background = "#444";
var default_dialog_text_color = "#ccc";

/* Useful graphical client stuff to know:
  screen_x, screen_y:  real display resolution mode of the monitor
  browser_zoom:  the zoom level of browser (assumes browser is maximized) */
const screen_x = window.screen.width * window.devicePixelRatio;
const screen_y = window.screen.height * window.devicePixelRatio;
var browser_zoom = 1;
/**************************************************************************
 Main starting point for Freeciv-web
**************************************************************************/
$(document).ready(function() {
  civclient_init();
});

/**************************************************************************
 Set up custom defined html elements (to reduce markup verbosity)
 The properties of these elements are then defined in civclient.css
**************************************************************************/
function define_autonomous_html_element_tags() {
  class font_ultra_light extends HTMLElement { constructor() {super();} };
  customElements.define("ulight-", font_ultra_light);

  class font_thin extends HTMLElement { constructor() {super();} };
  customElements.define("thin-", font_thin);

  class font_light extends HTMLElement { constructor() {super();} };
  customElements.define("light-", font_light);

  class font_regular extends HTMLElement { constructor() {super();} };
  customElements.define("reg-", font_regular);

  class font_medium extends HTMLElement { constructor() {super();} };
  customElements.define("med-", font_medium);

  class font_semibold extends HTMLElement { constructor() {super();} };
  customElements.define("sb-", font_semibold);

  class font_black extends HTMLElement { constructor() {super();} };
  customElements.define("black-", font_black);
}

/**************************************************************************
 Pull out important values we need which were defined in civclient.css
**************************************************************************/
function get_css_default_properties()
{
  var cssProps = window.getComputedStyle(document.body);
  default_text_color =
    cssProps.getPropertyValue('--default_text_color');
  default_button_background =
    cssProps.getPropertyValue('--default_button_background');
  default_dialog_text_color =
    cssProps.getPropertyValue('--default_dialog_text_color');

  /* how to change it later:
    document.body.style.setProperty('--foo-bar', newValue); */
}

/**************************************************************************
 This function is called on page load.
**************************************************************************/
function civclient_init()
{
  define_autonomous_html_element_tags();
  get_css_default_properties();

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

  if ($.getUrlVar('renderer') == "webgl") {
    renderer = RENDERER_WEBGL;
  }
  if (renderer == RENDERER_2DCANVAS) init_mapview();
  if (renderer == RENDERER_WEBGL) init_webgl_renderer();

  game_init();
  $('#tabs').tabs({ heightStyle: "fill" });
  control_init();
  init_replay();

  timeoutTimerId = setInterval(update_timeout, 1000);

  update_game_status_panel();
  statusTimerId = setInterval(update_game_status_panel, 6000);

  if (overviewTimerId == -1) {
    if (renderer == RENDERER_WEBGL) {
      OVERVIEW_REFRESH = 12000;
    } else {
      OVERVIEW_REFRESH = 6000;
    }
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

  // Saved user re-positioning of the chatbox dialog:
  var tmp = simpleStorage.get('chatDlg');
  if (tmp != null)  {// don't overwrite object keys if not yet stored
    restore_chatbox_vals = tmp;
  }
  // Saved user re-positioning of the emoji dialog pop-up:
  tmp = simpleStorage.get('emojiDlg');
  if (tmp != null) {// don't overwrite object keys if not yet stored
    restore_emojibox_vals = tmp;
  }

  // Which mode for showing orders buttons (if on) 1==common, 2==all
  show_order_buttons = simpleStorage.get('ordrbtns');
  if (!show_order_buttons || show_order_buttons === true) {
    show_order_buttons = 2;  // Default case
    simpleStorage.set('ordrbtns', 2);
  }
  if (show_order_buttons == 3) {
    $("#game_status_panel_bottom").hide(); // mode 3 hides all
  }
  // Whether to show order buttons at all:
  show_order_option = simpleStorage.get('showorderoption');
  if (show_order_option == null || show_order_option === true) {
    show_order_option = true;  // Default, show order buttons.
    simpleStorage.set('showorderoption',true)
  } else {
    show_order_option = false;
    $("#game_unit_orders_default").hide(); // no order buttons at all
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
  draw_border_mode |= draw_tertiary_colors;

  draw_thick_borders = simpleStorage.get('thickBorders');
  if (draw_thick_borders == null)
    draw_thick_borders = false;  // Default case

  draw_dashed_borders = simpleStorage.get('dashedBorders');
  if (draw_dashed_borders == null)
    draw_dashed_borders = false;  // Default case

  draw_moving_borders = simpleStorage.get('movingBorders');
  if (draw_moving_borders == null)
    draw_moving_borders = false;  // Default case

  play_music = simpleStorage.get('play_music');
  if (play_music == null) {
    play_music = is_longturn(); // singleplayer defaults off for server bandwidth savings
  }

  show_timestamps = simpleStorage.get('tstamps');
  if (show_timestamps == null) {
    show_timestamps = is_longturn();
  }
  if (!show_timestamps) {
    changeCss(".ts", "display:none");
  }

  reconfig_metakey = simpleStorage.get('reconfig_metakey');
  if (reconfig_metakey == null) reconfig_metakey = false;  // default case
  if (reconfig_metakey) {
    browser.metaKey="ALT-SHIFT";
    browser.metaKeyText = "ALT-SHIFT";
  }
  else browser.metaKey=browser.metaKeySymbol;
  //console.log("civclient.js set browser.metaKey to "+browser.metaKey+" because reconfig_metakey is "+reconfig_metakey)

  /* Roughly accurate zoom-level if browser maximized; precision not really needed as we use a simple cutoff
     to determine whether to use higher res images in some places, e.g., large shields vs. small */
  let bz = (window.outerWidth / window.innerWidth).toFixed(2);
  browser_zoom = simpleStorage.get('browser_zoom');
  if (browser_zoom == null) {
    browser_zoom = (bz > 1.25);
    simpleStorage.set('browser_zoom', bz);
  }

  audio_initialize();

  //------------------------------------------------------------------------------------------------
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

  // Allows civclient.css to specify different styling for mobile vs. not mobile
  if (is_small_screen()) document.body.classList.add('mobile');
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
        "To join the game, please enter a name:");
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
      var msg =  "After you Join Game, click the <b>SETUP</b> button to select rules and settings.<br>" +
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
  $("#pregame_message_area").html("<light->"
  + ($.getUrlVar('action') != "multi"
     ?
     "Game version currently set to: <b>Classic+</b><br><br>"
     : "Game version currently set to: <b>Avant-garde MP 2.1</b><br><br>"   )

    + "Click <b>SETUP</b> for the modern versions or game settings.<br>"
    + "Click <b>Start</b> to launch game with current settings.<br><br>"
    + "<reg->Experienced players can tune advanced settings in the command line:</reg-><br>"
    + "&nbsp;&nbsp;&nbsp;<thin->&#x2022; To see all options: <reg->/show all</reg-><br>"
    + "&nbsp;&nbsp;&nbsp;&#x2022; To see option help: <reg->/help <i>&lt;option name&gt;</i></reg-><br>"
    + "&nbsp;&nbsp;&nbsp;&#x2022; To change an option: <reg->/set option <i>&lt;setting&gt;</i></reg-><br> "
    + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ... <reg->/set option empty</reg-><i> sets it to \"\"</i></light-></thin-><br><br><br><br><br><br>"
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
 Shows a generic message dialog. 'text_friendly' sets a darker plain
 background to improve legibility for longer textual pop-ups.
**************************************************************************/
function show_dialog_message(title, message, text_friendly)
{
  let is_tile_info = false;
  if (title=="Tile Information" || title=="Tile Info") {
    is_tile_info = true;
    message = improve_tile_info_dialog(message);
    text_friendly = true;
  }

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
                   "closable" : false,
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
      $("#calc_tip").tooltip({
        show: { delay:150, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
      });

  // Automatically close dialog after 38 seconds, because sometimes the dialog can't be closed manually.
  // When can't it be closed manually? This made problems if two dialogs opened in <30 and first one
  // closes second one. Turning off and will fix some other way if needed:
  // dialog_message_close_task = setTimeout(close_dialog_message, 38000);

  $('#generic_dialog').css("max-height", "450px");
  if (text_friendly) {
    $('#generic_dialog').css("background-image", "url(/images/bg-med-dark-text.jpg");
    $('#generic_dialog').css("line-height", "21px");
    if (is_tile_info) {
      $('.tt').tooltip({
        tooltipClass:"tt_slim", position: { my:"left bottom", at: "left top-9"},
        show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
      });
    }
  }
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
  const is_small = is_small_screen();
  const longturn = is_longturn();
  const rts_text = {
    0: " ",
    1: " RTS",
    2: " RTS Soon"
  };

  if (game_info != null
      && current_turn_timeout() != null && current_turn_timeout() > 0) {
    let now = new Date().getTime();
    remaining = Math.floor(seconds_to_phasedone - ((now - seconds_to_phasedone_sync) / 1000));

    if (remaining >= 0 && turn_change_elapsed == 0) {
      if (is_small && !longturn) {                                                   // Small screen and NOT longturn
        $("#turn_done_button").button("option", "label", "T " + remaining);
        $("#turn_done_button .ui-button-text").css("padding", "3px");
      } else if (is_small) {                                                          // small screen && longturn:
        $("#turn_done_button").button("option", "label", "" + seconds_to_human_time(remaining) + ""); //timer only, don't cover tabs
      } else {                                                                        // Big screen && (longturn || !longturn):
        if (longturn) {
          let rts_code = style_longturn_turn_done_button(current_turn_timeout(), remaining);
          $("#turn_done_button").button("option", "label", seconds_to_human_time(remaining) + rts_text[rts_code]);
          $("")
        } else {
          $("#turn_done_button").button("option", "label", "Turn Done (" + seconds_to_human_time(remaining) + ")");
        }
      }
      if (!is_touch_device()) $("#turn_done_button").tooltip({
        disabled: false,
        show: { delay:200, effect:"none", duration: 0 },
        hide: {delay:0, effect:"none", duration: 0}
      });
    }
  }
}

/**************************************************************************
  For courtesy, style longturn button to indicate RTS legality.

  Under current RTS rules, RTS is always allowed:
    0 -1 hours after TC
    10-11 hours after TC (UWT just expired)
    0 -1 hours before TC
    10-11 hours before TC (before units will get UWT next turn)

  Also returns an RTS state code of RTS_NO, RTS_YES, or RTS_SOON.
**************************************************************************/
function style_longturn_turn_done_button(timeout, time_left)
{
  remaining = time_left;
  const time_after = timeout - remaining;
  const hour = 3600; // seconds

  /* NO-RTS periods are most frequent, process a quick getaway.
     NB: leave 15 minute warning periods for RTS about to begin: */
  if ( (inside(1.00*hour, time_after, 9.75*hour))
   ||  (inside(1.25*hour, remaining,  10*hour))
   ||  (time_after > 11*hour && remaining > 11.25*hour) ) {
    if (turn_done_button_RTS_state != RTS_NO) {
      set_turn_done_button_state(RTS_NO);
    }
    return RTS_NO;
  }

  let rts = RTS_NO;

  if ((remaining  <= 1*hour)                         //  0- 1 hours before TC
   || (between(10*hour, remaining, 11*hour))         // 10-11 hours before TC
   || (time_after <= 1*hour)                         // up to 1 hour after TC
   || (between(10*hour, time_after, 11*hour))) {     // from 10 to 11 hrs after TC

     rts = RTS_YES;
   } else rts = RTS_SOON;

  /* This check isn't needed: as the only possibility is that: RTS is SOON!
  if (rts != RTS_YES) {
    if      (remaining  <= 1.250*hour)                             rts = RTS_SOON;  // 15min before 0- 1 hours before TC
    else if (remaining  >  11.00*hour && remaining <= 11.25*hour)  rts = RTS_SOON;  // 15min before 10-11 hours before TC
    else if (time_after >= 9.750*hour && time_after < 10*hour)     rts = RTS_SOON;   // from 10 to 11 hrs after TC
  }*/

  switch (rts) {
    case RTS_YES:
      if (turn_done_button_RTS_state != RTS_YES) {
        set_turn_done_button_state(RTS_YES);
      }
      break;
    case RTS_SOON:
      if (turn_done_button_RTS_state != RTS_SOON) {
        set_turn_done_button_state(RTS_SOON);
      }
      break;
  }

  return rts;
}
/**************************************************************************
  Sets a flag in turn_done_button_RTS_state so that we only restyle it once
  each time its state actually changes.
**************************************************************************/
function set_turn_done_button_state(state) {
  switch (state) {
    case RTS_NO:
      turn_done_button_RTS_state = RTS_NO;
      $("#turn_done_button").attr('title', '"NO RTS" can be declared.');
      $("#turn_done_button").css("color", "green");
      break;
    case RTS_YES:
      turn_done_button_RTS_state = RTS_YES;
      $("#turn_done_button").attr("title", "RTS allowed!");
      $("#turn_done_button").css("color", "#f66");
      break;
    case RTS_SOON:
      turn_done_button_RTS_state = RTS_SOON;
      $("#turn_done_button").attr("title", "RTS in less than 15m");
      $("#turn_done_button").css("color", "#fc7");
      break;
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
      set_small_turn_done_button();
    }
    else {
      set_large_turn_done_button();
    }
  }
}
function set_small_turn_done_button() {
  $("#turn_done_button").button("option", "label", "Done");
  $("#turn_done_button").css("font-size", "90%");
  $("#turn_done_button_div").css("padding-right","0px");
  $("#turn_done_button").css("padding-left", "3px");
  $("#turn_done_button").css("padding-right", "3px");
}
function set_large_turn_done_button() {
  $("#turn_done_button").button("option", "label", "Turn Done");
  $("#turn_done_button_div").css("padding-right","1px");
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
    fullscreen = !fullscreen;
    BigScreen.toggle();
    if (browser.opera) fix_opera_full_screen()
  } else {
   show_dialog_message('Fullscreen', 'Press F11 for fullscreen mode.');
  }
}
/* Because opera has a bug in it */
function fix_opera_full_screen()
{
  if (browser.opera && !is_longturn()) {
    var mtop = fullscreen ? 37 : 0;
    $("#turn_done_button_div").css("top",mtop)
    if (fullscreen) set_small_turn_done_button();
    else set_large_turn_done_button();
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

  if (renderer == RENDERER_WEBGL) {
    console.log(maprenderer.info);
  }

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
 Gamemaster can temporarily toggle Supercow-Interaction-Lock mode with
 with this console command. Allows GM to (/take player) to click on
 cities, click to investigate unit stacks, and/or other investigative
 or debugging measures.
**************************************************************************/
function flip_supercow()
{
  client.conn.access_level = 5-client.conn.access_level;
  observing = !observing;
  client.conn['observer'] = observing;
  if (observing) {
    client.conn.playing = null;
  } else {
    client.conn.playing = {playerno: -1};
  }
  add_client_message("Supercow Lock turned "+(observing?"ON":"OFF"));
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

/****************************************************************************
 Change between 2D isometric and 3D WebGL renderer.
****************************************************************************/
function switch_renderer()
{
  if (is_longturn()){
    var game_port = $.getUrlVar('civserverport')
    var stored_username = simpleStorage.get("username", "");
    if (stored_username == null || stored_username == false) stored_username = "blank"
    $.ajax({
        type: 'POST',
        url: "/validate_twit?username="+stored_username+"&type=3d_webgl&port="+game_port,
    });
  }
  else {

    $("#canvas_div").unbind();
    if (renderer == RENDERER_WEBGL) {
        //activate 2D isometric renderer
        renderer = RENDERER_2DCANVAS;
        $("#canvas_div").empty();
        init_mapview();
        set_default_mapview_active();
        requestAnimationFrame(update_map_canvas_check, mapview_canvas);
        mapctrl_init_2d();

        for (var tile_id in tiles) {
        if (tile_get_known(tiles[tile_id]) == TILE_KNOWN_SEEN) {
            center_tile_mapcanvas(tiles[tile_id]);
            break;
        }
        }

        // reset 3D WebGL data
        for (var tile_id in tiles) {
        tiles[tile_id]['height'] = 0;
        }
        scene = null;
        heightmap = {};
        unit_positions = {};
        city_positions = {};
        city_label_positions = {};
        city_walls_positions = {};
        unit_flag_positions = {};
        unit_label_positions = {};
        unit_activities_positions = {};
        unit_health_positions = {};
        unit_healthpercentage_positions = {};
        forest_positions = {};
        jungle_positions = {};
        tile_extra_positions = {};
        road_positions = {};
        rail_positions = {};
        river_positions = {};
        tiletype_palette = [];
        meshes = {};
        load_count = 0;

    } else {
        //activate 3D WebGL renderer
        renderer = RENDERER_WEBGL;
        load_count = 0;
        mapview_model_width = Math.floor(MAPVIEW_ASPECT_FACTOR * map['xsize']);
        mapview_model_height = Math.floor(MAPVIEW_ASPECT_FACTOR * map['ysize']);

        set_default_mapview_active();
        init_webgl_renderer();

    }

    $.contextMenu({
            selector: (renderer == RENDERER_2DCANVAS) ? '#canvas' : '#canvas_div' ,
            zIndex: 5000,
            autoHide: true,
            callback: function(key, options) {
            handle_context_menu_callback(key);
            },
            build: function($trigger, e) {
                if (!context_menu_active) {
                context_menu_active = true;
                return false;
                }
                var unit_actions = update_unit_order_commands();
                return {
                    callback: function(key, options) {
                    handle_context_menu_callback(key);
                    } ,
                    items: unit_actions
                };
            }
    });

    }
}

