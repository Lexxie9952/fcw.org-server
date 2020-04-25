/**********************************************************************
    || \
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

//var stripChar = String.fromCharCode(3);

// Global strip code for removing the └ that Chrome renders at line breaks.
var stripChar = new RegExp(String.fromCharCode(3), "g")
var show_order_buttons = 1;  // 1=most common, 2=all orders, 3=hide panels

const update_focus_delay = 500;
const update_mouse_cursor_delay = 600;

var mouse_x;
var mouse_y;
var prev_mouse_x;
var prev_mouse_y;
var prev_goto_tile;
var mclick_tile;    // keeps track of what tile was middle clicked
/* # of times to force request_goto_path on the same tile: performance hack to prevent constant requests on the same tile.
 * We used to constantly request_goto_path on the same tile because the first couple of times didn't give enough time to
 * properly construct a clean path: */
const FORCE_CHECKS_AGAIN = -4;
const LAST_FORCED_CHECK = -1;  // When FORCE_CHECKS_AGAIN++ arrives at this value, we stop requesting goto paths for the same tile

// Prevent quick double-clicking for GOTO city, from doing context menu or city dialog:
var LAST_GOTO_TILE = null;       // Last tile clicked on for a GOTO order
var LAST_GOTO_TIMESTAMP = 0;     // Time it was clicked
const GOTO_CLICK_COOLDOWN = 475; // Cooldown period before that tile can be clicked, if it's a city

var keyboard_input = true;
var unitpanel_active = false;
var allow_right_click = false;
var DEBUG_UNITS = false;  // console log tools for debugging unit issues

// performance: is_touch_device() was being called many times per second
var touch_device = null; // TO DO: replace all is_touch_device() function calls

// ---------------------------------------------------------------------------------------
// UI-state vars to handle mouse action behaviour:

/* mapview_mouse_movement is a proto-state for potentially entering map-drag mode. It's set
   to true BEFORE entering map-drag mode, then later might be set false if conditions for
   entering map-drag aren't met. Thus it can't be relied on to know if we're in map_drag mode.  */
var mapview_mouse_movement = false;
// real_mouse_move_mode always represents the true state of map-drag mode.
var real_mouse_move_mode = false;
var touch_drag_mode = false;  // whether touch devices are processing touchmove
// determines if unit clicked twice, which creates a context menu under some UI user prefs
var last_unit_clicked = -1;
// if a context menu is up, a click simply kills that menu instead of doing other mechanics
var came_from_context_menu = false;
// ----------------------------------------------------------------------------------------

// Last map viewing location, allows user to return to it with shift-spacebar.
var last_saved_tile = null;
var recent_saved_tile = null;
var clicked_city = null; // multiple units in multiple cities can be selected, this needs to
                         // record what's the real city for a "Show City" command, not the
                         // former method of guessing with find_a_focus_unit_tile_to_center_on()

var selector_city = null; // city that will select a tile to work from map view
var city_paste_target = {}; // ctrl-shift-right-click for pasting city prod target into a city

var current_focus = [];   // unit(s) in current focus selection
var last_focus = null;    // last unit in focus before focus change
var goto_active = false;  // state for selecting goto target for a unit
var delayed_goto_active = false; // modifies goto_active state to give delayed goto command
var paradrop_active = false;
var airlift_active = false;
var action_tgt_sel_active = false;

/* Will be set when the goto is activated. */
var goto_last_order = -1;
var goto_last_action = -1;

var SELECT_POPUP = 0;
var SELECT_SEA = 1;
var SELECT_LAND = 2;
var SELECT_APPEND = 3;

var intro_click_description = true;
var resize_enabled = true;
var goto_request_map = {};
var goto_turns_request_map = {};
var current_goto_turns = 0;
var waiting_units_list = [];
var show_citybar = true;
var context_menu_active = true;
var has_movesleft_warning_been_shown = false;
var game_unit_panel_state = null;

var chat_send_to = -1;
var CHAT_ICON_EVERYBODY = String.fromCharCode(62075);
var CHAT_ICON_ALLIES = String.fromCharCode(61746);
var end_turn_info_message_shown = false;

/****************************************************************************
...
****************************************************************************/
function control_init()
{
  touch_device = is_touch_device();

  if (renderer == RENDERER_2DCANVAS) {
    mapctrl_init_2d();
  } else {
    init_webgl_mapctrl();
  }

  $(document).keydown(global_keyboard_listener);
  $(window).resize(mapview_window_resized);
  $(window).bind('orientationchange resize', orientation_changed);

  $("#turn_done_button").click(send_end_turn);
  if (!touch_device) $("#turn_done_button").tooltip();

  $("#freeciv_logo").click(function(event) {
    window.open('/', '_new');
    });

  $("#game_text_input").keydown(function(event) {
	  return check_text_input(event, $("#game_text_input"));
  });
  $("#game_text_input").focus(function(event) {
    keyboard_input=false;
    resize_enabled = false;
  });

  $("#game_text_input").blur(function(event) {
    keyboard_input=true;
    resize_enabled = true;
  });

  $("#chat_direction").click(function(event) {
    chat_context_change();
  });

  $("#pregame_text_input").keydown(function(event) {
   return check_text_input(event, $("#pregame_text_input"));
  });

  $("#pregame_text_input").blur(function(event) {
      keyboard_input=true;
      if (this.value=='') {
        $("#pregame_text_input").value='>';
      }
  });

  $("#pregame_text_input").focus(function(event) {
    keyboard_input=false;
    if (this.value=='>') this.value='';
  });

  $("#start_game_button").click(function(event) {
    pregame_start_game();
  });

  $("#load_game_button").click(function(event) {
      show_load_game_dialog();
  });

  $("#pick_nation_button").click(function(event) {
    pick_nation(null);
  });

  $("#pregame_settings_button").click(function(event) {
    pregame_settings();
  });

  $("#tech_canvas").mousedown(function(event) {
     tech_mapview_mouse_click(event);
   });

  /* disable text-selection, as this gives wrong mouse cursor
   * during drag to goto units. */
  document.onselectstart = function(){ return false; };

  /* disable right clicks. */
  window.addEventListener('contextmenu', function (e) {
    if (e.target != null && (e.target.id == 'game_text_input' || e.target.id == 'overview_map' || e.target.id == 'replay_result' || (e.target.parent != null && e.target.parent.id == 'game_message_area'))) return;
    if (!allow_right_click) e.preventDefault();
  }, false);

  var context_options = {
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
  };

  if (!touch_device) {
    context_options['position'] = function(opt, x, y){
                                                if (touch_device) return;
                                                var new_top = mouse_y + $("#canvas_div").offset().top;
                                                if (renderer == RENDERER_2DCANVAS) new_top = mouse_y + $("#canvas").offset().top;
                                                opt.$menu.css({top: new_top , left: mouse_x});
                                              };
  }

  $.contextMenu(context_options);

  $(window).on('unload', function(){
    network_stop();
  });

  /* Click callbacks for main tabs. */
  $("#map_tab").click(function(event) {
    setTimeout(set_default_mapview_active, 5);
  });

  $("#empire_tab").click(function(event) {
    set_default_mapview_inactive();
    update_empire_screen();
  });

  $("#civ_tab").click(function(event) {
    set_default_mapview_inactive();
    init_civ_dialog();
  });

  $("#tech_tab").click(function(event) {
    set_default_mapview_inactive();
    update_tech_screen();
  });

  $("#players_tab").click(function(event) {
    set_default_mapview_inactive();
    update_nation_screen();
  });

  $("#cities_tab").click(function(event) {
    set_default_mapview_inactive();
    update_city_screen();
  });

  $("#warcalc_tab").click(function(event) {
    set_default_mapview_inactive();
    warcalc_screen();
  });

  $("#opt_tab").click(function(event) {
    $("#tabs-hel").hide();
    init_options_dialog();
    set_default_mapview_inactive();
  });

  /*
  $("#chat_tab").click(function(event) {
    set_default_mapview_inactive();
    $("#tabs-chat").show();

  }); */


  $("#hel_tab").click(function(event) {
    set_default_mapview_inactive();
    show_help();
  });

    $("#chat_tab").click(function(event) {
      set_default_mapview_inactive();
      $("widgetbot").height($(window).height() - 100) ;
    });

  if (!touch_device) {
    $("#game_unit_orders_default").tooltip();
  }

  $("#overview_map").click(function(e) {
    var x = e.pageX - $(this).offset().left;
    var y = e.pageY - $(this).offset().top;
    overview_clicked (x, y);
  });

  $("#send_message_button").click(function(e) {
    show_send_private_message_dialog();
  });

  $("#intelligence_report_button").click(function(e) {
    show_intelligence_report_dialog();
  });

  $('#meet_player_button').click(nation_meet_clicked);
  $('#view_player_button').click(center_on_player);
  $('#cancel_treaty_button').click(cancel_treaty_clicked);
  $('#withdraw_vision_button').click(withdraw_vision_clicked);
  $('#take_player_button').click(take_player_clicked);
  $('#toggle_ai_button').click(toggle_ai_clicked);
  $('#game_scores_button').click(view_game_scores);
  $('#nations_list').on('click', 'tbody tr', handle_nation_table_select);

  /* prevents keyboard input from changing tabs. */
  $('#tabs>ul>li').off('keydown');
  $('#tabs>div').off('keydown');

  // Default hidden; it turns itself on automatically if right conditions met.
  $("#game_unit_orders_default").hide();

  // User option, replace capital I with | in city names--users with bad I in sans font:
  replace_capital_i = simpleStorage.get("capI");
  if (replace_capital_i == null) {
    replace_capital_i = false;
    simpleStorage.set('capI', replace_capital_i);
  }
  empire_bldg_tab_saved_mag = simpleStorage.get("bldgZoom");
  if (empire_bldg_tab_saved_mag == null) {
    empire_bldg_tab_saved_mag = 0;
    simpleStorage.set('bldgZoom', empire_bldg_tab_saved_mag);
  }
  empire_upkp_tab_saved_mag = simpleStorage.get("upkpZoom");
  if (empire_upkp_tab_saved_mag == null) {
    empire_upkp_tab_saved_mag = 0;
    simpleStorage.set('upkpZoom', empire_upkp_tab_saved_mag);
  }
  empire_wklst_tab_saved_mag = simpleStorage.get("wklZoom");
  if (empire_wklst_tab_saved_mag == null) {
    empire_wklst_tab_saved_mag = 0;
    simpleStorage.set('wklZoom', empire_wklst_tab_saved_mag);
  }

  // REMOVE when out of development, it will always be shown then:
  show_empire_tab = simpleStorage.get("showEmpire");
  if (show_empire_tab)
    $("#ui-id-2").show();
  else
    $("#ui-id-2").hide();

    // Hide odds tab
  $("#ui-id-8").hide();
}

/****************************************************************************
 determined if this is a touch enabled device, such as iPhone, iPad.
****************************************************************************/
function is_touch_device()
{
  if(!cardboard_vr_enabled && ('ontouchstart' in window) || 'onmsgesturechange' in window
      || window.DocumentTouch && document instanceof DocumentTouch) {
    return true;
  } else {
    return false;
  }
}

/****************************************************************************
 Remove focus from all input elements on touch devices, since the mobile
 keyboard can be annoying to constantly popup and resize screen etc.
****************************************************************************/
function blur_input_on_touchdevice()
{
  if (touch_device || is_small_screen()) {
    $('input[type=text], textarea').blur();
  }
}

/****************************************************************************
 Called when the mouse is moved.
****************************************************************************/
function mouse_moved_cb(e)
{
  if (mapview_slide != null && mapview_slide['active']) return;

  mouse_x = 0;
  mouse_y = 0;
  /* if (!e) {
    e = window.event;
  } INTERNET EXPLORER deprecated */
  if (e.pageX || e.pageY) {
    mouse_x = e.pageX;
    mouse_y = e.pageY;
  } else {
    if (e.clientX || e.clientY) {
      mouse_x = e.clientX;
      mouse_y = e.clientY;
    }
  }
  if (renderer == RENDERER_2DCANVAS && active_city == null && mapview_canvas != null
      && $("#canvas").length) {
    mouse_x = mouse_x - $("#canvas").offset().left;
    mouse_y = mouse_y - $("#canvas").offset().top;

    if (mapview_mouse_movement && !goto_active) {
      // move the mapview using mouse movement.
      var diff_x = (touch_start_x - mouse_x) * 2;
      var diff_y = (touch_start_y - mouse_y) * 2;

      mapview['gui_x0'] += diff_x;
      mapview['gui_y0'] += diff_y;
      touch_start_x = mouse_x;
      touch_start_y = mouse_y;
      update_mouse_cursor();
    }
  } else if (renderer == RENDERER_WEBGL && active_city == null && $("#canvas_div").length) {
    mouse_x = mouse_x - $("#canvas_div").offset().left;
    mouse_y = mouse_y - $("#canvas_div").offset().top;

    if (mapview_mouse_movement && !goto_active) {
      // move the mapview using mouse movement.
      var spos = webgl_canvas_pos_to_map_pos(touch_start_x, touch_start_y);
      var epos = webgl_canvas_pos_to_map_pos(mouse_x, mouse_y);
      if (spos != null && epos != null) {
        camera_look_at(camera_current_x + spos['x'] - epos['x'], camera_current_y, camera_current_z + spos['y'] - epos['y']);
      }

      touch_start_x = mouse_x;
      touch_start_y = mouse_y;
      update_mouse_cursor();
    }
  } else if (active_city != null && city_canvas != null
             && $("#city_canvas").length) {
    mouse_x = mouse_x - $("#city_canvas").offset().left;
    mouse_y = mouse_y - $("#city_canvas").offset().top;
  }

  if (client.conn.playing == null) return;

  if (C_S_RUNNING == client_state()) {
    update_mouse_cursor();
  }

  /* determine if Right-click-and-drag to select multiple units should be activated,
     only if more than an area of 45 pixels has been selected and more than 200ms has past.
     See mapview_mouse_click and mapview_mouse_down. */
  if (map_select_check && Math.abs(mouse_x - map_select_x) > 45
      && Math.abs(mouse_y - map_select_y) > 45
      && (new Date().getTime() - map_select_check_started) > 200)  {
    map_select_active = true;
  }
}

/****************************************************************************
...
****************************************************************************/
function update_mouse_cursor()
{
  if (tech_dialog_active && !touch_device) {
    update_tech_dialog_cursor();
    real_mouse_move_mode = false;  // since this code returns before we set it false (below), make sure it's false
    return;
  }

  //console.log("update_mouse_cursor() mmm:1 g_a:0, came_from_context_menu:"+came_from_context_menu);
  var ptile;
  if (renderer == RENDERER_2DCANVAS) {
    ptile = canvas_pos_to_tile(mouse_x, mouse_y);
  } else {
    ptile = webgl_canvas_pos_to_tile(mouse_x, mouse_y);
  }

  if (ptile == null) return; /* TO DO: this is the only way this function returns without forcing real_mouse_move_mode=false, presumably because
                                if we're outside the map area, we don't change a thing for what mode is on inside that area. However, if there are
                                problems with mouse_move_mode because of this, then we should force real_mouse_move_mode to false at very beginning
                                of this function */

  real_mouse_move_mode = false;  // Every time the cursor changes is when this var changes, so we know for SURE when we're in real map-drag mode

  var punit = find_visible_unit(ptile);
  var pcity = tile_city(ptile);

  // Don't enter map drag mode when clicking to release context menu
  if (mapview_mouse_movement && !goto_active && !came_from_context_menu) {
    /* show move map cursor */
    $("#canvas_div").css("cursor", "move");
    real_mouse_move_mode = true;
  } else if (goto_active && current_goto_turns != null) {
    /* show goto cursor */
    $("#canvas_div").css("cursor", "crosshair");
  } else if (goto_active && current_goto_turns == null) {
    /* show invalid goto cursor*/
    $("#canvas_div").css("cursor", "not-allowed");
  } else if (pcity != null && client.conn.playing != null && city_owner_player_id(pcity) == client.conn.playing.playerno) {
    /* select city cursor*/
    $("#canvas_div").css("cursor", "pointer");
  } else if (punit != null && client.conn.playing != null && punit['owner'] == client.conn.playing.playerno) {
    /* move unit cursor */
    $("#canvas_div").css("cursor", "pointer");
  } else {
    $("#canvas_div").css("cursor", "default");
  }
}

/****************************************************************************
 Set the chatbox messages context to the next item on the list if it is
 small. Otherwise, show a dialog for the user to select one.
****************************************************************************/
function chat_context_change() {
  var recipients = chat_context_get_recipients();
  if (recipients.length < 4) {
    chat_context_set_next(recipients);
  } else {
    chat_context_dialog_show(recipients);
  }
}

/****************************************************************************
 Get ordered list of possible alive human chatbox messages recipients.
****************************************************************************/
function chat_context_get_recipients() {
  var allies = false;
  var pm = [];

  pm.push({id: null, flag: null, description: 'Everybody'});

  var self = -1;
  if (client.conn.playing != null) {
    self = client.conn.playing['playerno'];
  }

  for (var player_id in players) {
    if (player_id == self) continue;

    var pplayer = players[player_id];
    if (pplayer['flags'].isSet(PLRF_AI)) continue;
    if (!pplayer['is_alive']) continue;
    if (is_longturn() && pplayer['name'].indexOf("NewAvailablePlayer") != -1) continue;

    var nation = nations[pplayer['nation']];
    if (nation == null) continue;

    // TODO: add connection state, to list connected players first
    pm.push({
      id: player_id,
      description: pplayer['name'] + " of the " + nation['adjective'],
      flag: sprites["f." + nation['graphic_str']]
    });

    if (diplstates[player_id] == DS_ALLIANCE) {
      allies = true;
    }
  }

  if (allies && self >= 0) {
    pm.push({id: self, flag: null, description: 'Allies'});
  }

  pm.sort(function (a, b) {
    if (a.id == null) return -1;
    if (b.id == null) return 1;
    if (a.id == self) return -1;
    if (b.id == self) return 1;
    if (a.description < b.description) return -1;
    if (a.description > b.description) return 1;
    return 0;
  });

  return pm;
}

/****************************************************************************
 Switch chatbox messages recipients.
****************************************************************************/
function chat_context_set_next(recipients) {
  var next = 0;
  while (next < recipients.length && recipients[next].id != chat_send_to) {
    next++;
  }
  next++;
  if (next >= recipients.length) {
    next = 0;
  }

  set_chat_direction(recipients[next].id);
}

/****************************************************************************
 Show a dialog for the user to select the default recipient of
 chatbox messages.
****************************************************************************/
function chat_context_dialog_show(recipients) {
  var dlg = $("#chat_context_dialog");
  if (dlg.length > 0) {
    dlg.dialog('close');
    dlg.remove();
  }
  $("<div id='chat_context_dialog' title='Choose chat recipient'></div>")
    .appendTo("div#game_page");

  var self = -1;
  if (client.conn.playing != null) {
    self = client.conn.playing['playerno'];
  }

  var tbody_el = document.createElement('tbody');

  var add_row = function (id, flag, description) {
    var flag_canvas, ctx, row, cell;
    row = document.createElement('tr');
    cell = document.createElement('td');
    flag_canvas = document.createElement('canvas');
    flag_canvas.width = 29;
    flag_canvas.height = 20;
    ctx = flag_canvas.getContext("2d");
    if (flag != null) {
      ctx.drawImage(flag, 0, 0);
    }
    cell.appendChild(flag_canvas);
    row.appendChild(cell);
    cell = document.createElement('td');
    cell.appendChild(document.createTextNode(description));
    row.appendChild(cell);
    if (id != null) {
      $(row).data("chatSendTo", id);
    }
    tbody_el.appendChild(row);
    return ctx;
  }

  for (var i = 0; i < recipients.length; i++) {
    if (recipients[i].id != chat_send_to) {
      var ctx = add_row(recipients[i].id, recipients[i].flag,
                        recipients[i].description);

      if (recipients[i].id == null || recipients[i].id == self) {
        ctx.font = "18px FontAwesome";
        ctx.fillStyle = "rgba(32, 32, 32, 1)";
        if (recipients[i].id == null) {
          ctx.fillText(CHAT_ICON_EVERYBODY, 5, 15);
        } else {
          ctx.fillText(CHAT_ICON_ALLIES, 8, 16);
        }
      }
    }
  }

  var table = document.createElement('table');
  table.appendChild(tbody_el);
  $(table).on('click', 'tbody tr', handle_chat_direction_chosen);
  $(table).appendTo("#chat_context_dialog");

  $("#chat_context_dialog").dialog({
    bgiframe: true,
    modal: false,
    maxHeight: 0.9 * $(window).height()
  }).dialogExtend({
    minimizable: true,
    closable: true,
    icons: {
      minimize: "ui-icon-circle-minus",
      restore: "ui-icon-bullet"
    }
  });

  $("#chat_context_dialog").dialog('open');
}

/****************************************************************************
 Handle a choice in the chat context dialog.
****************************************************************************/
function handle_chat_direction_chosen(ev) {
  var new_send_to = $(this).data("chatSendTo");
  $("#chat_context_dialog").dialog('close');
  if (new_send_to == null) {
    set_chat_direction(null);
  } else {
    set_chat_direction(parseFloat(new_send_to));
  }
}

/****************************************************************************
 Set the context for the chatbox.
****************************************************************************/
function set_chat_direction(player_id) {

  if (player_id == chat_send_to) return;

  var player_name;
  var icon = $("#chat_direction");
  if (icon.length <= 0) return;
  var ctx = icon[0].getContext("2d");

  if (player_id == null || player_id < 0) {
    player_id = null;
    ctx.clearRect(0, 0, 29, 20);
    ctx.font = "18px FontAwesome";
    ctx.fillStyle = "rgba(192, 192, 192, 1)";
    ctx.fillText(CHAT_ICON_EVERYBODY, 7, 15);
    player_name = 'everybody';
  } else if (client.conn.playing != null
             && player_id == client.conn.playing['playerno']) {
    ctx.clearRect(0, 0, 29, 20);
    ctx.font = "18px FontAwesome";
    ctx.fillStyle = "rgba(192, 192, 192, 1)";
    ctx.fillText(CHAT_ICON_ALLIES, 10, 16);
    player_name = 'allies';
  } else {
    var pplayer = players[player_id];
    if (pplayer == null) return;
    player_name = pplayer['name']
                + " of the " + nations[pplayer['nation']]['adjective'];
    ctx.clearRect(0, 0, 29, 20);
    var flag = sprites["f." + nations[pplayer['nation']]['graphic_str']];
    if (flag != null) {
      ctx.drawImage(flag, 0, 0);
    }
  }

  icon.attr("title", "Sending messages to " + player_name);
  chat_send_to = player_id;
  // Avoid auto-focus into chat for game launch or turning off specific chat target
  if (player_id != null || player_name != "everybody")
    $("#game_text_input").focus();
}

/****************************************************************************
 Common replacements and encoding for messages.
 They are going to be injected as html. " and ' are changed to appease
 the server message_escape.patch until it is removed.
****************************************************************************/
function encode_message_text(message) {

  // Safe links are encoded with %%% instead of %% (pasted safe links auto-send to self)
  // Convert safe links to normal links and alter the message to be sent to self
  if (message.includes("%%%tile") || message.includes("%%%unit")) {
    message = message.replace(new RegExp("%%%tile", 'g'), "%%tile");
    message = message.replace(new RegExp("%%%unit", 'g'), "%%unit");
    // Any message with a safelink will automatically go to self:
    if (client.conn.playing && client.conn.playing['name']) {
      message = client.conn.playing['name'] +": " + message;
    }
  }

  message = message.replace(/^\s+|\s+$/g,"");
  message = message.replace(/&/g, "&amp;");
  message = message.replace(/'/g, "&apos;");
  message = message.replace(/"/g, "&quot;");
  message = message.replace(/</g, "&lt;");
  message = message.replace(/>/g, "&gt;");
  return encodeURIComponent(message);
}

/****************************************************************************
 Tell whether this is a simple message to the choir.
****************************************************************************/
function is_unprefixed_message(message) {
  if (message === null) return false;
  if (message.length === 0) return true;

  /* Commands, messages to allies and explicit send to everybody */
  var first = message.charAt(0);
  if (first === '/' || first === '.' || first === ':') return false;

  /* Private messages */
  var quoted_pos = -1;
  if (first === '"' || first === "'") {
    quoted_pos = message.indexOf(first, 1);
  }
  var private_mark = message.indexOf(':', quoted_pos);
  if (private_mark < 0) return true;
  var space_pos = message.indexOf(' ', quoted_pos);
  return (space_pos !== -1 && (space_pos < private_mark));
}

/****************************************************************************
...
****************************************************************************/
function check_text_input(event,chatboxtextarea) {

  if (event.keyCode == 13 && event.shiftKey == 0)  {
    var message = $(chatboxtextarea).val();

    if (chat_send_to != null && chat_send_to >= 0
        && is_unprefixed_message(message)) {
      if (client.conn.playing != null
          && chat_send_to == client.conn.playing['playerno']) {
        message = ". " + encode_message_text(message);
      } else {
        var pplayer = players[chat_send_to];
        if (pplayer == null) {
          // Change to public chat, don't send the message,
          // keep it in the chatline and hope the user notices
          set_chat_direction(null);
          return;
        }
        var player_name = pplayer['name'];
        /* TODO:
           - Spaces before ':' not good for longturn yet
           - Encoding characters in the name also does not work
           - Sending a ' or " cuts the message
           So we send the name unencoded, cut until the first "special" character
           and hope that is unique enough to recognize the player. It usually is.
         */
        var badchars = [' ', '"', "'"];
        for (var c in badchars) {
          var i = player_name.indexOf(badchars[c]);
          if (i > 0) {
            player_name = player_name.substring(0, i);
          }
        }
        message = player_name + encode_message_text(": " + message);
      }
    } else {
      message = encode_message_text(message);
    }

    $(chatboxtextarea).val('');
    if (!touch_device) $(chatboxtextarea).focus();
    keyboard_input = true;

    if (message.length >= 4 && message === message.toUpperCase()) {
      return; //disallow all uppercase messages.
    }

    if (message.length >= max_chat_message_length) {
      message_log.update({
        event: E_LOG_ERROR,
        message: "Error! The message is too long. Limit: " + max_chat_message_length
      });
      return;
    }

    send_message(message);
    return false;
  }
}



/****************************************************************************
  Return TRUE iff a unit on this tile is in focus.
****************************************************************************/
function get_focus_unit_on_tile(ptile)
{
  var funits = get_units_in_focus();
  if (funits == null) return null;

  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    if (punit['tile'] == ptile['index']) {
      return punit;
    }
  }
  return null;
}


/****************************************************************************
  Return TRUE iff this unit is in focus.
  TODO: not implemented yet.
****************************************************************************/
function unit_is_in_focus(cunit)
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    if (punit['id'] == cunit['id']) {
      return true;
    }
  }
  return false;
}

/****************************************************************************
  Returns a list of units in focus.
****************************************************************************/
function get_units_in_focus()
{
  return current_focus;
}

/**************************************************************************
 If there is no unit currently in focus, or if the current unit in
 focus should not be in focus, then get a new focus unit.
 We let GOTO-ing units stay in focus, so that if they have moves left
 at the end of the goto, then they are still in focus.
**************************************************************************/
function update_unit_focus()
{
  if (active_city != null) return; /* don't change focus while city dialog is active.*/

  if (C_S_RUNNING != client_state()) return;

  /* iterate zero times for no units in focus,
   * otherwise quit for any of the conditions. */
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];

    // The final KILLER for the "advance_focus after GOTO with moves still left", if it appears again:
    //if (punit['movesleft'] > 0 && came_from_goto_command) return;
    //can pass this flag as true from the deactivate_goto(true) function if it received 'true'...
    //this is already set up and requires no extra work but to pass that 'true' from there to here.

    if (punit['movesleft'] > 0
        && punit['done_moving'] == false
        && punit['ai'] == false
        && punit['activity'] == ACTIVITY_IDLE) {
      return;
    }
  }
  advance_unit_focus(false);
}

/**************************************************************************
 This function may be called from packhand.c, via update_unit_focus(),
 as a result of packets indicating change in activity for a unit. Also
 called when user press the "Wait" command.

 FIXME: Add feature to focus only units of a certain category.
**************************************************************************/
function advance_unit_focus(same_type)
{
  if (client_is_observer())
  {
    return;
  }

  var candidate = find_best_focus_candidate(false, same_type);

  if (candidate == null) {
    candidate = find_best_focus_candidate(true, same_type);
  }

  // remove state-blocking from leaving context menu
  came_from_context_menu = false;

  if (candidate != null) {
    goto_active = false;  // turn Go-To off if jumping focus to a new unit
    delayed_goto_active = false;
    clear_goto_tiles();   // TO DO: update mouse cursor function call too?
    save_last_unit_focus();
    set_unit_focus_and_redraw(candidate);
  } else {
    /* Couldn't center on a unit, then try to center on a city... */
    deactivate_goto(false);
    save_last_unit_focus();
    current_focus = []; /* Reset focus units. */
    if (renderer == RENDERER_WEBGL) webgl_clear_unit_focus();
    update_active_units_dialog();
    $("#game_unit_orders_default").hide();

    // Test removal
    /* find a city to focus on if new game. consider removing this.
    if (game_info['turn'] <= 1) {
      for (var city_id in cities) {
        var pcity = cities[city_id];
        if (city_owner_player_id(pcity) == client.conn.playing.playerno) {
          center_tile_mapcanvas(city_tile(pcity));
          break;
        }
      }
    }*/
    if (touch_device || is_small_screen())
    {
      $("#turn_done_button").button("option", "label", "<i class='fa fa-check-circle-o' style='color: green;'aria-hidden='true'></i>Done");
    } else {
        $("#turn_done_button").button("option", "label", "<i class='fa fa-check-circle-o' style='color: green;'aria-hidden='true'></i> Turn Done");
    }
    if (!end_turn_info_message_shown) {
      end_turn_info_message_shown = true;
      message_log.update({ event: E_BEGINNER_HELP, message: "All units have moved, click the \"Turn Done\" button to end your turn."});
    }
  }
}

/**************************************************************************
 This function may be called from packhand.c, via update_unit_focus(),
 as a result of packets indicating change in activity for a unit. Also
 called when user press the "Wait" command.

 FIXME: Add feature to focus only units of a certain category.
**************************************************************************/
function advance_focus_inactive_units()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    waiting_units_list.push(punit['id']);
  }

  if (client_is_observer())
  {
    return;
  }

  var candidate = find_inactive_focus_candidate();

  // remove state-blocking from leaving context menu
  came_from_context_menu = false;

  if (candidate != null) {
    goto_active = false;  // turn Go-To off if jumping focus to a new unit
    delayed_goto_active = false;
    clear_goto_tiles();   // TO DO: update mouse cursor function call too?
    save_last_unit_focus();
    set_unit_focus_and_redraw(candidate);
  } else {
    /* Couldn't center on a unit, then try to center on a city... */
    deactivate_goto(false);
    save_last_unit_focus();
    current_focus = []; /* Reset focus units. */
    waiting_units_list = []; /* Reset waiting units list */
    if (renderer == RENDERER_WEBGL) webgl_clear_unit_focus();
    update_active_units_dialog();
    $("#game_unit_orders_default").hide();
  }
}

/**************************************************************************
 Expands orders buttons panel to show all possible orders
**************************************************************************/
function button_more_orders()
{
  show_order_buttons = 2;
  update_unit_order_commands();
}

/**************************************************************************
 Collapses orders buttons panel to show only frequent/common orders
**************************************************************************/
function button_less_orders()
{
  show_order_buttons = 1;
  update_unit_order_commands();
}

/**************************************************************************
 Hides orders button panel and status panel to show more clickable map
**************************************************************************/
function button_hide_panels()
{
  show_order_buttons = 0;
  $("#game_unit_orders_default").hide();
  $("#game_status_panel_bottom").hide();
}

/**************************************************************************
 Enables and disables the correct units commands for the unit in focus.
**************************************************************************/
function update_unit_order_commands()
{
  // don't show orders buttons for observers
  if (client_is_observer() || client.conn.playing == null)
  {
    $("#game_unit_orders_default").hide();
    return;
  }

  var i, r;
  var punit;
  var ptype;
  var pcity;
  var ptile;
  var unit_actions = {};
  var funits = get_units_in_focus();

  if (funits!=null) {
    for (i = 0; i < funits.length; i++) {
      punit = funits[i];
      ptile = index_to_tile(punit['tile']);
      if (ptile == null) continue;
      pcity = tile_city(ptile);

      if (pcity != null) {
        unit_actions["show_city"] = {name: "Show city"};
      }
    }
  }
  if (funits.length<1) {
    // speed performance: hide and leave
    $("#game_unit_orders_default").hide();
    return;
  }

  switch (show_order_buttons) {
    case 0:                 // hide lower all panels
      $("#game_unit_orders_default").hide();
      $("#game_status_panel_bottom").hide();
    break;

    case 1:         // common/frequently used orders only
      $("#game_unit_orders_default").show();
      $("#order_more").show();
      $("#order_less").hide();
      $("#order_disband").hide();
    break;

    case 2:         // all legal orders buttons
      $("#game_unit_orders_default").show();
      $("#order_less").show();
      $("#order_more").hide();
      $("#order_disband").show();
    break;
  }

  $("#order_upgrade").hide();
  $("#order_convert").hide();
  $("#order_maglev").hide();
  $("#order_quay").hide();
  $("#order_canal").hide();
  $("#order_well").hide();
  $("#order_fortress").hide();
  $("#order_hideout").hide();
  $("#order_navalbase").hide();
  $("#order_airbase").hide();
  $("#order_road").hide();
  $("#order_railroad").hide();
  $("#order_mine").hide();
  $("#order_fortify").hide();  // not all non-Settlers can fortify (air/sea)
  $("#order_vigil").hide();
  $("#order_irrigate").hide();
  $("#order_transform").hide();
  $("#order_build_farmland").hide();
  $("#order_auto_settlers").hide();
  $("#order_explore").hide();
  $("#order_pollution").hide();
  $("#order_forest_remove").hide();
  $("#order_plant_forest").hide();
  $("#order_oil_well").hide();
  $("#order_make_swamp").hide();

  $("#order_noorders").hide();
  $("#order_cancel_orders").hide();
  $("#order_wait").hide();
  $("#order_sentry").hide();
  $("#order_load").hide();
  $("#order_unload").hide();
  $("#order_activate_cargo").hide();
  $("#order_airlift").hide();
  $("#order_airlift_disabled").hide();

  if (funits==null)  // we shouldn't even be here
    return;

  var terrain_name;

  for (i = 0; i < funits.length; i++) {
    punit = funits[i];
    ptype = unit_type(punit);
    ptile = index_to_tile(punit['tile']);
    terrain_name = tile_terrain(ptile)['name'];
    if (ptile == null) continue;
    pcity = tile_city(ptile);

    if (utype_can_do_action(ptype, ACTION_FOUND_CITY)
        && pcity == null) {
      $("#order_build_city").show();
      $("#order_build_city").attr('title', 'Build new city (B)');
      unit_actions["build"] = {name: "Build City (B)"};
    } else if (utype_can_do_action(ptype, ACTION_JOIN_CITY)
               && pcity != null) {
      $("#order_build_city").show();
      $("#order_build_city").attr('title', 'Join city (B)');
      unit_actions["build"] = {name: "Join City (B)"};
    } else {
      $("#order_build_city").hide();
    }

    if (ptype['name'] == "Explorer") {
      unit_actions["explore"] = {name: "Auto Explore (X)"};
      $("#order_explore").show();
    }

    // MP2 Unit Conversion handling
    if (client_rules_flag[CRF_MP2_UNIT_CONVERSIONS]) {
      if (
          // Player can convert their Leader between king/queen:
          ptype['name']=="Leader" || ptype['name']=="Queen"
          // Workers/Riflemen can convert between each other in Communism:
          || ((governments[client.conn.playing['government']]['name']=="Communism"
               && ((ptype['name']=="Workers") || ptype['name']=="Riflemen"))
               && player_invention_state(client.conn.playing, tech_id_by_name('Communism')) == TECH_KNOWN)
          // AAA can convert to Mobile SAM under qualifying conditions:
          || ( ptype['name']=="Anti-Aircraft Artillery"
               && pcity != null
               && city_owner_player_id(pcity) == client.conn.playing.playerno
               && player_invention_state(client.conn.playing, tech_id_by_name('Space Flight')) == TECH_KNOWN
               && ( city_has_building(pcity, improvement_id_by_name(B_PALACE_NAME)) || city_has_building(pcity, improvement_id_by_name(B_ECC_PALACE_NAME)) )
             )
          ) {
              $("#order_convert").show();
              unit_actions["convert"] = {name: "Convert (shift-O)"};
            }
    }
  }

  if (touch_device) unit_actions = $.extend(unit_actions, {"exit": {name: "Exit Menu"} } );
  unit_actions = $.extend(unit_actions, {
                "goto": {name: "Goto (G)"},
	              "tile_info": {name: "Tile info"}
              });

  for (i = 0; i < funits.length; i++) {
    punit = funits[i];
    ptype = unit_type(punit);
    var worker_type = false; // Handles civ2civ3 + mp2: these units have same orders as workers (join city already handled above):
    if (ptype['name'] == "Workers" || ptype['name'] == "Migrants"
      || (ptype['name'] =="Proletarians" && governments[client.conn.playing['government']]['name']=="Communism")) {

        worker_type = true;
    }

    ptile = index_to_tile(punit['tile']);
    terrain_name = tile_terrain(ptile)['name'];
    if (ptile == null) continue;
    pcity = tile_city(ptile);

    // LEGIONS. rulesets which allow Legions to build Forts and Roads on non-domestic tiles-------------
    if ((client_rules_flag[CRF_LEGION_WORK]) && ptype['name'] == "Legion") {

      // Forts:
      if (player_invention_state(client.conn.playing, tech_id_by_name('Masonry')) == TECH_KNOWN
          && !tile_has_extra(ptile, EXTRA_FORT)
          && !pcity) {  // Show Fort button if Masonry and no Fort
              unit_actions["fortress"] = {name: string_unqualify(terrain_control['gui_type_base0']) + " (Shift-F)"};
              $("#order_fortress").show();
      }
      if (!tile_has_extra(ptile, EXTRA_FORTRESS)
            && player_invention_state(client.conn.playing, tech_id_by_name('Construction')) == TECH_KNOWN
            && !pcity
          ) {
              unit_actions["fortress"] = {name: string_unqualify(terrain_control['gui_type_base0']) + " (Shift-F)"};
              $("#order_fortress").show();
      }
      if ( typeof EXTRA_NAVALBASE !== 'undefined'
              && player_invention_state(client.conn.playing, tech_id_by_name('Engineering')) == TECH_KNOWN
              && can_build_naval_base(punit,ptile)
              && !pcity
          ) {
              unit_actions["navalbase"] = {name: "Naval Base (Shift-N)"};
              $("#order_navalbase").show();
      }

      // Roads:
      if (!tile_has_extra(ptile, EXTRA_ROAD)) {
        const domestic = (ptile['owner'] == client.conn.playing.playerno)
        const has_river = tile_has_extra(ptile, EXTRA_RIVER);
        const knows_bridges = (player_invention_state(client.conn.playing, tech_id_by_name('Bridge Building')) == TECH_KNOWN);
        var show = false;

        if (!domestic) show = true;
        else if (tile_has_extra(ptile, EXTRA_FORT)) show = true;

        if (has_river && !knows_bridges) show = false;

        if (show) {
          $("#order_road").show();
          unit_actions["road"] = {name: "Road (R)"};
        } else $("#order_road").hide();
      }
    } //---------------------------------------------------------------------------------------------------
    // hideouts
    if (client_rules_flag[CRF_EXTRA_HIDEOUT] && server_settings['hideouts']['val']
        && utype_has_flag(ptype,UTYF_FOOTSOLDIER)) {
      if (player_invention_state(client.conn.playing, tech_id_by_name('Warrior Code')) == TECH_KNOWN
        && !pcity
        && !tile_has_extra(ptile, EXTRA_FORT)
        && !tile_has_extra(ptile, EXTRA_AIRBASE)
        && ( (terrain_name == 'Mountains') || (terrain_name == 'Forest') || (terrain_name == 'Jungle')
              || (terrain_name == 'Swamp') )
        && ( (ptile['owner'] == UNCLAIMED_LAND) || ptile['owner'] == client.conn.playing.playerno )
        ) {  // Show Hideout button if Warrior Code and no other bases:
        unit_actions["hideout"] = {name: string_unqualify("Hideout (Shift-H)")};
        $("#order_hideout").show();
      }
    }

    // Figure out default of whether pillage is legal and show it, before applying special rules later
    if (get_what_can_unit_pillage_from(punit, ptile).length > 0
         && (pcity == null || city_owner_player_id(pcity) !== client.conn.playing.playerno)) {
            $("#order_pillage").show();
            unit_actions["pillage"] = {name: "Pillage (Shift-P)"};
    } else {
            $("#order_pillage").hide();
    }

    // Whether to show "no orders" or "cancel orders", default, before applying special rules later
    if (punit.activity != ACTIVITY_IDLE || punit.ai || punit.has_orders) {
      unit_actions["idle"] = {name: "Cancel orders (Shift-J)"};
      $("#order_cancel_orders").show();
    } else {
      unit_actions["noorders"] = {name: "No orders (J)"};
      $("#order_noorders").show();
      $("#order_wait").show();
    }

    // All Settler types have similar types or orders and rules for whether to show those orders:
    // TO DO:  this should be checking for the FLAG "Settlers" in the ptype which indicates who can do the follow build/road/mine/etc. actions:
    if (ptype['name'] == "Settlers" || worker_type == true || ptype['name'] == "Engineers") {

      if (ptype['name'] == "Settlers") unit_actions["autosettlers"] = {name: "Auto settler (A)"};
      if (worker_type == true) unit_actions["autosettlers"] = {name: "Auto workers (A)"};
      if (ptype['name'] == "Engineers") unit_actions["autosettlers"] = {name: "Auto engineers (A)"};

      if (show_order_buttons==1) $("#order_pillage").hide(); // not frequently used order for settler types
      if (show_order_buttons==1) $("#order_noorders").hide();  //not frequently used order

      if (!tile_has_extra(ptile, EXTRA_ROAD)) {
        $("#order_road").show();
        $("#order_railroad").hide();
        if (!(tile_has_extra(ptile, EXTRA_RIVER) && player_invention_state(client.conn.playing, tech_id_by_name('Bridge Building')) == TECH_UNKNOWN)) {
	      unit_actions["road"] = {name: "Road (R)"};
	    }
      } else if (player_invention_state(client.conn.playing, tech_id_by_name('Railroad')) == TECH_KNOWN
                 && tile_has_extra(ptile, EXTRA_ROAD)
               && !tile_has_extra(ptile, EXTRA_RAIL)) {
        $("#order_road").hide();
        $("#order_railroad").show();
	      unit_actions['railroad'] = {name: "Railroad (R)"};
      } else if (can_build_maglev(punit, ptile)) {
        $("#order_road").hide();
        $("#order_railroad").hide();
        $("#order_maglev").show();
        unit_actions['maglev'] = {name: "MagLev (R)"};
      } else {
        $("#order_road").hide();
        $("#order_railroad").hide();
      }
      if (tile_has_extra(ptile, EXTRA_RIVER) && player_invention_state(client.conn.playing, tech_id_by_name('Bridge Building')) == TECH_UNKNOWN) {
        $("#order_road").hide();
      }

      $("#order_fortify").hide();
      if (show_order_buttons==1) $("#order_explore").hide(); // not frequently used button
      if (show_order_buttons==2) $("#order_sentry").show(); // not frequently used for settler types
      if (show_order_buttons==2) $("#order_auto_settlers").show(); // not frequently used button
      $("#order_pollution").show();    //TO DO: show this if there's pollution
      if ( (terrain_name == 'Hills' || terrain_name == 'Mountains') && !tile_has_extra(ptile, EXTRA_MINE)) {
        $("#order_mine").show();
        unit_actions["mine"] =  {name: "Mine (M)"};
      } else if (terrain_name == "Desert" && !tile_has_extra(ptile, EXTRA_OIL_WELL)
        && player_invention_state(client.conn.playing, tech_id_by_name('Construction'))!= TECH_UNKNOWN ) {
          $("#order_oil_well").show();
          unit_actions["mine"] =  {name: "Oil Well (M)"};
      } else if (terrain_name == 'Grassland' || terrain_name == 'Plains' || terrain_name == 'Swamp' || terrain_name == 'Jungle') {
          unit_actions["mine"] = {name: "plant Forest (M)"};
          if (show_order_buttons==2) $("#order_plant_forest").show();  //not frequently used button
      } else if (terrain_name == 'Forest') {
          unit_actions["mine"] = {name: "make Swamp (M)"};
          if (show_order_buttons==2) $("#order_make_swamp").show();  //not frequently used button
      }

      if (tile_has_extra(ptile, EXTRA_FALLOUT)) {
        unit_actions["fallout"] = {name: "clean Fallout (N)"};
      }

      if (tile_has_extra(ptile, EXTRA_POLLUTION)) {
        $("#order_pollution").show();
	    unit_actions["pollution"] = {name: "clean Pollution (P)"};
      } else {
        $("#order_pollution").hide();
      }

      if (terrain_name == "Forest") {
        if (show_order_buttons==2) $("#order_forest_remove").show(); // not frequently used button
        $("#order_irrigate").hide();
        $("#order_build_farmland").hide();
	      unit_actions["forest"] = {name: "Chop Forest (I)"};
      } else if (can_irrigate(punit, ptile)) {
        $("#order_irrigate").show();
        $("#order_forest_remove").hide();
        $("#order_build_farmland").hide();
        if (terrain_name == "Swamp") unit_actions["irrigation"] = {name: "drain Swamp (I)"};
        else unit_actions["irrigation"] = {name: "Irrigation (I)"};
      } else if (tile_has_extra(ptile, EXTRA_IRRIGATION) && !tile_has_extra(ptile, EXTRA_FARMLAND) && player_invention_state(client.conn.playing, tech_id_by_name('Refrigeration')) == TECH_KNOWN) {
        $("#order_build_farmland").show();
        $("#order_irrigate").hide();
        $("#order_forest_remove").hide();
        unit_actions["irrigation"] = {name: "Farmland (I)"};
      } else {
        $("#order_forest_remove").hide();
        $("#order_irrigate").hide();
        $("#order_build_farmland").hide();
      }

      // Order to make Fort with masonry (if ruleset allows it)
      if (client_rules_flag[CRF_MASONRY_FORT]) {
        // Masonry + No Fort on tile = show order to make Fort
        if (player_invention_state(client.conn.playing, tech_id_by_name('Masonry')) == TECH_KNOWN
            && !tile_has_extra(ptile, EXTRA_FORT)
            && !pcity) {
              unit_actions["fortress"] = {name: string_unqualify(terrain_control['gui_type_base0']) + " (Shift-F)"};
              $("#order_fortress").show();
        }
      }
      // Construction + no Fortress on tile = show order to make Fortress:
      if (player_invention_state(client.conn.playing, tech_id_by_name('Construction')) == TECH_KNOWN
          && !tile_has_extra(ptile, EXTRA_FORTRESS)
          && !pcity) {
        unit_actions["fortress"] = {name: string_unqualify(terrain_control['gui_type_base0']) + " (Shift-F)"};
        $("#order_fortress").show();
      }
      if ( typeof EXTRA_NAVALBASE !== 'undefined'
              && player_invention_state(client.conn.playing, tech_id_by_name('Engineering')) == TECH_KNOWN
              && can_build_naval_base(punit,ptile)
              && !pcity) {
              unit_actions["navalbase"] = {name: "Naval Base (Shift-N)"};
              $("#order_navalbase").show();
      }
      if (player_invention_state(client.conn.playing, tech_id_by_name('Radio')) == TECH_KNOWN
          && !tile_has_extra(ptile, EXTRA_AIRBASE) && !pcity) {
            unit_actions["airbase"] = {name: string_unqualify(terrain_control['gui_type_base1']) + " (Shift-E)"};
            if (show_order_buttons==2) $("#order_airbase").show();
      } else if (client_rules_flag[CRF_RADAR_TOWER]) { // Order to make Radar Tower Radar (if ruleset allows it)
        // Radar + has Airbase but no Radar on tile = show order to make Radar
        if (player_invention_state(client.conn.playing, tech_id_by_name('Radar')) == TECH_KNOWN
            && tile_has_extra(ptile, EXTRA_AIRBASE)
            && !tile_has_extra(ptile, EXTRA_RADAR)
            && !pcity) {
              unit_actions["airbase"] = {name: "Build Radar (Shift-E)"};
              if (show_order_buttons==2) $("#order_airbase").show();
        }
      }

    } else {   // Handle all things non-Settler types may have in common here:
      if (utype_can_do_action(ptype, ACTION_FORTIFY)) {
        $("#order_fortify").show();
        unit_actions["fortify"] = {name: "Fortify (F)"};
      }
      $("#order_sentry").show();  // TO DO?: air units and new triremes can't sentry outside a fueling tile
      if (unit_can_vigil(punit)) {
        $("#order_vigil").show();
        unit_actions["vigil"] = {name: "Vigil (Ctrl-V)"};
      }
    }

    if (show_order_buttons==2) $("#order_explore").show(); //not frequently used for most units

    // Rulesets which allow Canals:
    if (client_rules_flag[CRF_CANALS]) {
      if (can_build_canal(punit, ptile)) {
        /*if (show_order_buttons==2)*/ $("#order_canal").show(); // not frequently used button
        unit_actions["canal"] = {name: "Canal"};
      }
    }
    // Rulesets which allow Quays:
    if (client_rules_flag[CRF_EXTRA_QUAY]) {
      if (can_build_quay(punit, ptile)) {
        $("#order_quay").show();
        unit_actions["quay"] = {name: "Build Quay (Q)"};
      }
    }
    // Well-Digger-----------------------
    if (unit_types[punit['type']]['name'] == "Well-Digger") {
      $("#order_fortify").hide();
      delete unit_actions["fortify"];

      if (show_order_buttons==1) {
        $("#order_sentry").hide(); //not frequently used buttons
        $("#order_noorders").hide();
      }

      if (can_build_well(punit, ptile)) {   // Well-Digger
        $("#order_well").show();
        unit_actions["well"] = {name: "dig Well"};
      }

      var is_lowland = (terrain_name != 'Hills'
                   && terrain_name != 'Mountains');

      if (is_lowland && tile_owner(ptile)==punit['owner'] && can_irrigate(punit,ptile) ) {
        $("#order_irrigate").show();  // can irrigate any lowland tile
        unit_actions["irrigation"] = {name: "Irrigation (I)"};
      }
    } //---------------------

    /* Practically all unit types can currently perform some action. */
    unit_actions["action_selection"] = {name: "Do... (D)"};

    if (utype_can_do_action(ptype, ACTION_TRANSFORM_TERRAIN)) {
      $("#order_transform").show(); //not frequently used button
      unit_actions["transform"] = {name: "Transform terrain (O)"};
    } else {
      $("#order_transform").hide();
    }

    if (utype_can_do_action(ptype, ACTION_NUKE)) {
      $("#order_nuke").show();
      unit_actions["nuke"] = {name: "Detonate Nuke At (Shift-N)"};
    } else {
      $("#order_nuke").hide();
    }

    if (utype_can_do_action(ptype, ACTION_PARADROP) && punit['movesleft']>0) {
      $("#order_paradrop").show();
      unit_actions["paradrop"] = {name: "Paradrop (P)"};
    } else {
      $("#order_paradrop").hide();
    }

    if (pcity == null || punit['homecity'] === 0 || punit['homecity'] === pcity['id']) {
      $("#order_change_homecity").hide();
    } else if (pcity != null && punit['homecity'] != pcity['id']) {
      $("#order_change_homecity").show();
      unit_actions["homecity"] = {name: "Homecity (H)"};
    }

    if (pcity != null && city_has_building(pcity, improvement_id_by_name(B_AIRPORT_NAME))) {
      if (pcity["airlift"]>0 && punit['movesleft']>0) {
        unit_actions["airlift"] = {name: "Airlift (Shift-L)"};
        $("#order_airlift").show();
        //$("#order_airlift_disabled").hide();
      } else {
        //$("#order_airlift").hide();
        $("#order_airlift_disabled").show();
      }
    }

    // Upgrade unit: 1. Check if possible, 2. Check if upgrade unit can itself be upgraded. 3. Calculate upgrade cost. 4. Display orders with cost included.
    if (pcity != null && ptype != null && unit_types[ptype['obsoleted_by']] != null && can_player_build_unit_direct(client.conn.playing, unit_types[ptype['obsoleted_by']])) {
      //console.log(ptype['name']+" is allowed AT LEAST ONE upgrade. Beginning loop to check for higher upgrades.");
      var upgrade_type = unit_types[ptype['obsoleted_by']];

      // Look for most advanced unit we're allowed to upgrade it into:
      //    7 checks is failsafe: 5 is max in existing rules: Horsemen > Knight > Dragoon > Cavalry > Armor > Armor II
      for (var upgrade_counter = 1; upgrade_counter<=7; upgrade_counter++)
      { //console.log("   "+upgrade_counter+". upgrading to " + upgrade_type['name']+" is allowed. Checking for higher upgrade...");
        if ( upgrade_type != null && unit_types[upgrade_type['obsoleted_by']] != null ) {
          //console.log("   ..."+unit_types[upgrade_type['obsoleted_by']]['name']+" came back as upgrade to "+upgrade_type['name']+". Checking legality of upgrade:");
          if ( can_player_build_unit_direct(client.conn.playing, unit_types[upgrade_type['obsoleted_by']]) ) {
            //console.log("      ...can_player_build_unit_direct(player,unit_type) reported this is a legal upgrade.");
            upgrade_type = unit_types[upgrade_type['obsoleted_by']];
            //console.log("          ...current upgrade target changed to: "+upgrade_type['name']);
          } else {
            //console.log("Exiting upgrade loop due to "+unit_types[upgrade_type['obsoleted_by']]['name']+" not a legal upgrade.");
            break; // This type is illegal to upgrade to, stop checking for higher upgrades.
          }
        }
      }
      //console.log("EXITED upgrade target check.");
      var upgrade_name = upgrade_type['name'];
      var upgrade_cost = Math.floor(upgrade_type['build_cost'] - ptype['build_cost']/2);  //subtract half the shield cost of upgrade unit
      // upgrade cost = 2*T + (T*T)/20, where T = shield_cost_of_new unit - (shield_cost_of_old unit / 2)
      upgrade_cost = 2*upgrade_cost + Math.floor( (upgrade_cost*upgrade_cost)/20 );
      // TODO: check for effect Upgrade_Price_Pct when possible and multiply that constant to upgrade_cost
      if (client_rules_flag[CRF_TESLA_UPGRADE_DISCOUNT]) {
        if ( player_has_wonder(client.conn.playing.playerno, improvement_id_by_name(B_TESLAS_LABORATORY)) ) {
          upgrade_cost = Math.floor( upgrade_cost * 0.80); // 20% discount for Tesla's Lab
        }
      }

      unit_actions["upgrade"] =  {name: "Upgrade to "+upgrade_name+" for "+upgrade_cost+" (U)"};
      $("#order_upgrade").attr("title", "Upgrade to "+upgrade_name+" for "+upgrade_cost+" (U)");
      $("#order_upgrade").show();
    }

    if (ptype != null && ptype['name'] != "Explorer") {
      unit_actions["explore"] = {name: "Auto explore (X)"};
    }


    // Display order to load unit on transport, if: (A) on a city or river && (B) tile has a transport && (C) unit not already loaded:
        // **** TO DO: fix flawed logic, a fighter can get on a carrier if not on city/river, marines on helicopter, etc.
    var uclass = get_unit_class_name(punit);  // Ships are never cargo, so don't show the Load order for a ship:
    var never_transportable = (uclass=="Sea" || uclass=="RiverShip" || uclass=="Submarine" || uclass=="Trireme");
    if ( /*( (pcity != null) || tile_has_extra(ptile, EXTRA_RIVER)) */ true //removed city/river check because carriers/helicopters
          && !punit['transported'] && !never_transportable) {
      var units_on_tile = tile_units(ptile);
      for (var r = 0; r < units_on_tile.length; r++) {
        var tunit = units_on_tile[r];
        if (tunit['id'] == punit['id']) continue;
        var ntype = unit_type(tunit);
        if (ntype['transport_capacity'] > 0) {   // **** TO DO: && can_carry_unit(ntype,punit) --e.g., fighter can't load on a trireme
           unit_actions["unit_load"] = {name: "Load on transport (L)"};
           $("#order_load").show();
        }
      }
    }

    // Unload unit from transport ---------------------------------------
    var units_on_tile = tile_units(ptile);
    if (units_on_tile) {
      if (ptype['transport_capacity'] > 0 && units_on_tile.length >= 2) {
        for (var r = 0; r < units_on_tile.length; r++) {
          var tunit = units_on_tile[r];
          if (tunit['transported']) {
            unit_actions["unit_show_cargo"] = {name: "Select Cargo (Shift-U)"};
            // Check conditions which allow Unload Transport (T):
            // 1. Marines on native tile
            if (utype_has_flag(unit_types[tunit['type']], UTYF_MARINES) && !is_ocean_tile(ptile)) {
              unit_actions["unit_unload"] = {name: "Unload Transport (T)"};
              $("#order_unload").show();
            }
            // 2. In a city
            else if (pcity != null) {
              unit_actions["unit_unload"] = {name: "Unload Transport (T)"};
              $("#order_unload").show();
            } else { // 3. In a Naval Base
              if (typeof EXTRA_NAVALBASE !== "undefined") {
                if (tile_has_extra(ptile, EXTRA_NAVALBASE)) {
                  unit_actions["unit_unload"] = {name: "Unload Transport (T)"};
                  $("#order_unload").show();
                }
              } // 4. on a Quay
              if (client_rules_flag[CRF_EXTRA_QUAY]) {
                if (tile_has_extra(ptile, EXTRA_QUAY)) {
                  unit_actions["unit_unload"] = {name: "Unload Transport (T)"};
                  $("#order_unload").show();
                }
              }
              $("#order_activate_cargo").show(); // if no option to unload, show option to activate or 'wake' units
            }
          }
        }
      }
    }
    //------------------------------------------------------------
  }

  /* TO DO at this spot:
      auto-attack ?   show cargo button ?
  */

  var num_tile_units = tile_units(ptile);
  if (num_tile_units != null) {
    if (num_tile_units.length >= 2 && !touch_device) { // Touch devices have no buttons or keys to issue multiple orders
      unit_actions = $.extend(unit_actions, {          // and they lack screen space for longer context menus also
        "select_all_tile": {name: "Select all on tile (V)"},
        "select_all_type": {name: "Select same type (Shift-V)"}
        });
    }
  }

  // Lite version of delayed GOTO allows it if unit doesn't have full move points.
  if (is_longturn() && ptype['move_rate'] != punit['movesleft']) {
    //if (!touch_device) // TODO: touch devices have completely different logic/mechanics for triggering a goto
                       // was difficult to figure out how to integrate delayed GOTO into it:
      unit_actions["delaygoto"] = {name: "delay Goto (shift-G)"};
  }

  unit_actions = $.extend(unit_actions, {
            "sentry": {name: "Sentry (S)"},
            "wait": {name: "Wait (W)"},
            "disband": {name: "Disband (Shift-D)"}
            });

/* this code removed: it was inconsistently making context menu too large on mobile:
  if (touch_device) {
    $(".context-menu-list").css("width", "600px");
    $(".context-menu-item").css("font-size", "220%");
  } */
  $(".context-menu-list").css("z-index", 5000);

//// these changes in control.js and game.js made container not clickable but children unclickable also
  //$("#game_units_orders_default").css("pointer-events", "none"); //// container not clickable, force children to be clickable
  //$("#game_units_orders_default").children().css("pointer-events", "auto"); //// container not clickable, force children to be clickable

  return unit_actions;
}


/**************************************************************************
...
**************************************************************************/
function init_game_unit_panel()
{
  if (observing) return;
  unitpanel_active = true;

  //$("#game_unit_panel").attr("title", "Units");
  $("#game_unit_panel").dialog({
			bgiframe: true,
			modal: false,
      width: (is_small_screen() ? $(window).width() : "370px"), // Set mobile to full width continuous horizontal scroll
      maxWidth: "100%",
			height: "auto",
			resizable: false,
			closeOnEscape: false,
			dialogClass: 'unit_dialog  no-close',
			position: {my: 'right bottom', at: 'right bottom', of: window, within: $("#tabs-map")},
			appendTo: '#tabs-map',
			close: function(event, ui) { unitpanel_active = false;}

		}).dialogExtend({
             "minimizable" : true,
             "closable" : false,
             "minimize" : function(evt, dlg){ game_unit_panel_state = $("#game_unit_panel").dialogExtend("state")
                                              $(".unit_dialog").css("float","right");
                                              $(".unit_dialog").css({"height":"25","width":25});
                                              unobstruct_minimized_dialog_continer(); // don't let wide container block clicks
              },
             "restore" : function(evt, dlg){ game_unit_panel_state = $("#game_unit_panel").dialogExtend("state")
                                              $(".unit_dialog").css({"height":"auto","width":"140"});
                                              $(".unit_dialog").css("float","left");
                                              $(".unit_dialog").css(
                                                {"position":{my: 'right bottom', at: 'right bottom', of: window, within: $("#tabs-map")}});
                                                update_active_units_dialog(); //update properly resets position

                                              //$("#game_unit_panel").parent().css(
                                              //    {"position":{my: 'right bottom', at: 'right bottom', of: window, within: $("#tabs-map")}});
              },
             "icons" : {
               "minimize" : "ui-icon-circle-minus",
               "restore" : "ui-icon-bullet"
             }});

  // Set mobile to full width continuous horizontal scroll
  if (is_small_screen()) $("#game_unit_panel").parent().css({"max-width":"100%"});

  $("#game_unit_panel").dialog('open');
  $("#game_unit_panel").parent().css("overflow", "hidden");
  if (game_unit_panel_state == "minimized") $("#game_unit_panel").dialogExtend("minimize");

  $("#game_unit_panel").parent().children().not("#game_unit_panel").children().get(0).innerHTML
    = "<div style='font-size:90%; vertical-align:top;'>&#x265F;</div>";

  update_active_units_dialog();
}

/**************************************************************************
 Find the nearest available unit for focus, excluding any current unit
 in focus unless "accept_current" is TRUE.  If the current focus unit
 is the only possible unit, or if there is no possible unit, returns NULL.
**************************************************************************/
function find_best_focus_candidate(accept_current, same_type)
{
  try {
    var punit;
    var i;
    if (client_is_observer()) return null;

    var sorted_units = [];
    for (var unit_id in units) {
      punit = units[unit_id];
      if (client.conn.playing != null && punit['owner'] == client.conn.playing.playerno) {
        sorted_units.push(punit);
      }
    }
    sorted_units.sort(unit_distance_compare);

    for (i = 0; i < sorted_units.length; i++) {
      punit = sorted_units[i];
      if ((!unit_is_in_focus(punit) || accept_current)
         && client.conn.playing != null
         && punit['owner'] == client.conn.playing.playerno
         && punit['activity'] == ACTIVITY_IDLE
         && punit['movesleft'] > 0
         && punit['done_moving'] == false
         && punit['ai'] == false
         && waiting_units_list.indexOf(punit['id']) < 0
         && punit['transported'] == false
         && (!same_type || unit_type(punit)['name'] == unit_type(current_focus[0])['name'])) {
           return punit;
      }
    }

    /* check waiting units for focus candidates */
    for (i = 0; i < waiting_units_list.length; i++) {
        punit = game_find_unit_by_number(waiting_units_list[i]);
        if (punit != null && punit['movesleft'] > 0 && (!same_type || unit_type(punit)['name'] == unit_type(current_focus[0])['name'])) {
          waiting_units_list.splice(i, 1);
          return punit;
        }
    }
  } catch(err) {
    waiting_units_list = [] //safety measure to prevent one unit being included multiple times
    console.log(err);
    console.log('error in find_best_focus_candidate');
    console.log(unit_type(last_focus)['name']);
    console.log(unit_type(punit)['name']);
  }

  return null;
}

/**************************************************************************
 Find the nearest available unit for focus, excluding any current unit
 in focus unless "accept_current" is TRUE.  If the current focus unit
 is the only possible unit, or if there is no possible unit, returns NULL.
**************************************************************************/
function find_inactive_focus_candidate()
{
  var punit;
  var i;
  if (client_is_observer()) return null;

  var sorted_units = [];
  for (var unit_id in units) {
    punit = units[unit_id];
    if (client.conn.playing != null && punit['owner'] == client.conn.playing.playerno) {
      sorted_units.push(punit);
    }
  }
  sorted_units.sort(unit_distance_compare);

  for (i = 0; i < sorted_units.length; i++) {
    punit = sorted_units[i];
    if ((!unit_is_in_focus(punit))
       && client.conn.playing != null
       && punit['owner'] == client.conn.playing.playerno
       && waiting_units_list.indexOf(punit['id']) < 0
       && (punit['activity'] != ACTIVITY_IDLE || punit['transported'] == true || punit['movesleft'] <= 0 || punit['done_moving'] == true)
       && punit['ai'] == false) {
         return punit;
    }
  }
  return null;
}


/**************************************************************************
...
**************************************************************************/
function unit_distance_compare(unit_a, unit_b)
{
  if (unit_a == null || unit_b == null) {
    if (unit_a != null) return -1;
    if (unit_b != null) return 1;
    return 0;
  }

  var ptile_a = index_to_tile(unit_a['tile']);
  var ptile_b = index_to_tile(unit_b['tile']);

  if (ptile_a == null || ptile_b == null) {
    if (ptile_a != null) return -1;
    if (ptile_b != null) return 1;
    return 0;
  }

  if (ptile_a['x'] == ptile_b['x'] && ptile_a['y'] == ptile_b['y']) {
    return 0;
  } else {

    // Use the first focused unit as center
    var i_focus = 0;
    var ref_tile = null;
    while (i_focus < current_focus.length
           && (ref_tile = tiles[current_focus[i_focus].tile]) == null) {
      i_focus++;
    }

    // Or the canvas center if no unit is focused
    if (ref_tile == null) {
      ref_tile = canvas_pos_to_nearest_tile(mapview.width/2, mapview.height/2);
    }

    var ref_a = map_distance_vector(ref_tile, ptile_a);
    var ref_b = map_distance_vector(ref_tile, ptile_b);
    ref_a = map_vector_to_distance(ref_a[0], ref_a[1]);
    ref_b = map_vector_to_distance(ref_b[0], ref_b[1]);
    if (ref_a != ref_b) return ref_a - ref_b;

    // Same distance, just use any stable criteria
    if (ptile_a.x != ptile_b.x) return ptile_a.x - ptile_b.x;
    return ptile_a.y - ptile_b.y;
  }
}

/**************************************************************************
  Sets the focus unit directly. Uses id instead of a punit, so it can be
  embedded into html onclick()
**************************************************************************/
function set_unit_id_focus(id)
{
  if (units[id]) {
    set_unit_focus(units[id]);
    auto_center_on_focus_unit();
  }
}

/**************************************************************************
  Sets the focus unit directly.  The unit given will be given the
  focus; if NULL the focus will be cleared.

  This function is called for several reasons.  Sometimes a fast-focus
  happens immediately as a result of a client action.  Other times it
  happens because of a server-sent packet that wakes up a unit.
**************************************************************************/
function set_unit_focus(punit)
{
  save_last_unit_focus();

  current_focus = [];
  if (punit == null) {
    current_focus = [];
  } else {
    current_focus[0] = punit;
    if (renderer == RENDERER_WEBGL) update_unit_position(index_to_tile(punit['tile']));
  }

  if (punit) warcalc_set_default_vals(punit);
  update_active_units_dialog();
  update_unit_order_commands();
}

/**************************************************************************
 Called when clicking a unit in the units panel prior to calling
 set_unit_focus_and_redraw, so that we can check for a shift-click first
*************************************************************************/
function click_unit_in_panel(e, punit)
{
  // If shift-clicking, add this unit to the selected units
  if (e.shiftKey) {
    if (client.conn.playing != null && punit['owner'] == client.conn.playing.playerno) // only add our own unit to selection
    {
      // First we must check if unit is already in selection:
      var index = current_focus.findIndex(x => x.id==punit.id);
      if (index === -1) { // -1 means it's not in selection, so we add it:
        current_focus.push(punit);
      } else { // if unit is already in selection, shift-clicking removes it from selection
        current_focus.splice(index, 1);
      }
    }

    // though doing the exact same thing as single-click, shift-click was losing the other units in the panel, so
    // try to emulate everything else it does, as a test to get those units displayed in the panel even though
    // not in focus:
    if (renderer == RENDERER_WEBGL) update_unit_position ( index_to_tile(punit['tile']));
    auto_center_on_focus_unit();

    update_active_units_dialog(); //previously only doing this but it lost unselected units in the panel

    // added these lines below to emulate same code as non-shift-click which doesn't lose units in the panel:
    update_unit_order_commands();

    if (current_focus.length > 0 && $("#game_unit_orders_default").length > 0 && !cardboard_vr_enabled && show_order_buttons ) {
      //$("#game_units_orders_default").css("pointer-events", "none"); //// these changes in control.js and game.js made container not clickable but children unclickable also
      //$("#game_units_orders_default").children().css("pointer-events", "auto"); //// container not clickable, force children to be clickable
      $("#game_unit_orders_default").show();
    }
  } else set_unit_focus_and_redraw(punit);
}

/**************************************************************************
 See set_unit_focus()
**************************************************************************/
function set_unit_focus_and_redraw(punit)
{
  save_last_unit_focus();

  current_focus = [];

  if (punit == null) {
    current_focus = [];
    if (renderer == RENDERER_WEBGL) webgl_clear_unit_focus();
  } else {
    current_focus[0] = punit;
    warcalc_set_default_vals(punit); // warcalc default vals as last clicked units
    if (renderer == RENDERER_WEBGL) update_unit_position(index_to_tile(punit['tile']));
  }

  //shift-spacebar to return to last location:
  //our recent tile position gets put as last_ so we can return to it, and we get
  //a new recent tile as the new tile we are centering on:
  last_saved_tile = recent_saved_tile;
  if (punit != null) recent_saved_tile = index_to_tile(punit['tile']);
  auto_center_on_focus_unit();
  update_active_units_dialog();
  update_unit_order_commands();
  if (current_focus.length > 0 && $("#game_unit_orders_default").length > 0 && !cardboard_vr_enabled && show_order_buttons ) {
    //$("#game_units_orders_default").css("pointer-events", "none"); //// these changes in control.js and game.js made container not clickable but children unclickable also
    //$("#game_units_orders_default").children().css("pointer-events", "auto"); //// container not clickable, force children to be clickable
    $("#game_unit_orders_default").show();
  }
}

/**************************************************************************
 ...
**************************************************************************/
function set_unit_focus_and_activate(punit)
{
  if (punit != null) {
    set_unit_focus_and_redraw(punit);
    ////////request_new_unit_activity(punit, ACTIVITY_IDLE, EXTRA_NONE);
  }
}

/**************************************************************************
 See set_unit_focus_and_redraw()
**************************************************************************/
function city_dialog_activate_unit(punit)
{
  if (TAB_MAP === $("#tabs").tabs("option", "active")) {
    close_city_dialog_trigger();
  }
  else {
    $('#ui-id-1').trigger("click");   // ensures exit from city tab
    close_city_dialog_trigger();
  }
  //request_new_unit_activity(punit, ACTIVITY_IDLE, EXTRA_NONE);
  set_unit_focus_and_redraw(punit);
}

/**************************************************************************
Center on the focus unit, if off-screen and auto_center_on_unit is true.
**************************************************************************/
function auto_center_on_focus_unit()
{
  if (active_city != null) return; /* don't change focus while city dialog is active.*/

  var ptile = find_a_focus_unit_tile_to_center_on();

  if (ptile != null && auto_center_on_unit) {
    center_tile_mapcanvas(ptile);
    update_unit_position(ptile);
  }
}

/**************************************************************************
Center on the focus unit, if off-screen and auto_center_on_unit is true.
**************************************************************************/
function auto_center_last_location()
{
  // Be safe and get out of all select/move modes:
  map_select_active = false;
  map_select_check = false;
  mapview_mouse_movement = false;

  if (active_city != null) return; /* don't change focus while city dialog is active.*/
  if (last_saved_tile==null) return;  // no saved location or it was reset

  center_tile_mapcanvas(last_saved_tile);

  // returning to a tile is itself a reposition event, simply swap last_ and recent_ tile
  // in this case so it will advance "forward" back to the tile it came from:
  var temp = last_saved_tile;
  last_saved_tile=recent_saved_tile;
  recent_saved_tile = temp;
}

/****************************************************************************
  Finds a single focus unit that we can center on.  May return NULL.
****************************************************************************/
function find_a_focus_unit_tile_to_center_on()
{
  var funit = current_focus[0];

  if (funit == null) return null;

  return index_to_tile(funit['tile']);
}

/**************************************************************************
Return a pointer to a visible unit, if there is one.
**************************************************************************/
function find_visible_unit(ptile)
{
  var i;

  /* If no units here, return nothing. */
  if (ptile == null || unit_list_size(tile_units(ptile))==0) {
    return null;
  }

  /* If the unit in focus is at this tile, show that on top */
  var pfocus = get_focus_unit_on_tile(ptile);
  if (pfocus != null) {
    return pfocus;
  }

  /* If a city is here, return nothing (unit hidden by city). */
  if (tile_city(ptile) != null) {
    return null;
  }

  /* TODO: add missing C logic here.*/
  var vunits = tile_units(ptile);
  for (i = 0; i < vunits.length; i++) {
    var aunit = vunits[i];
    if (aunit['anim_list'] != null && aunit['anim_list'].length > 0) {
      return aunit;
    }
  }

  for (i = 0; i < vunits.length; i++) {
    var tunit = vunits[i];
    if (tunit['transported'] == false) {
      return tunit;
    }
  }

  return tile_units(ptile)[0];
}

/**********************************************************************
TODO: not complete yet
***********************************************************************/
function get_drawable_unit(ptile, citymode)
{
  var punit = find_visible_unit(ptile);

  if (punit == null) return null;

  /*if (citymode != null && unit_owner(punit) == city_owner(citymode))
    return null;*/

  if (!unit_is_in_focus(punit) || current_focus.length > 0 ) {
    return punit;
  } else {
    return null;
  }
}

/**************************************************************************
  Returns true if the order preferably should be performed from an
  adjacent tile.
**************************************************************************/
function order_wants_direction(order, act_id, ptile) {
  var action = actions[act_id];

  if (order == ORDER_PERFORM_ACTION && action == null) {
    /* Bad action id or action rule data not received and stored
     * properly. */
    console.log("Asked to put invalid action " + act_id + " in an order.");
    return false;
  }

  switch (order) {
  case ORDER_MOVE:
  case ORDER_ACTION_MOVE:
    /* Not only is it legal. It is mandatory. A move is always done in a
     * direction. */
    return true;
  case ORDER_PERFORM_ACTION:
    if (action['min_distance'] > 0) {
      /* Always illegal to do to a target on the actor's own tile. */
      return true;
    }

    if (action['max_distance'] < 1) {
      /* Always illegal to perform to a target on a neighbor tile. */
      return false;
    }

    /* FIXME: allied units and cities shouldn't always make actions be
     * performed from the neighbor tile. */
    if (tile_city(ptile) != null
        || tile_units(ptile).length != 0) {
      /* Won't be able to move to the target tile to perform the action on
       * top of it. */
      return true;
    }

    return false;
  default:
    return false;
  }
}

/**************************************************************************
 Handles shift-right click, which "copies" the unit_type on tile or
  current prod on city tile, for later "pasting" as the production of
  a clicked city tile.
**************************************************************************/
function copy_tile_target_for_prod(canvas_x, canvas_y)
{
  if (client.conn.playing == null) return;

  //console.log("copy_tile_target_for_prod(..))")
  var ptile = canvas_pos_to_tile(canvas_x, canvas_y);
  if (ptile == null || client.conn.playing == null) return;

  var pcity = tile_city(ptile);
  var name = "Target unable to be";

  // We clicked a city tile that belongs to us. Copy its current production!
  if (pcity != null && pcity['owner'] == client.conn.playing.playerno) {

    city_paste_target = {};  // reset any existing target;
    // Copy what the city is producing into the "clipboard"
    city_paste_target['production_kind'] = pcity['production_kind'];
    city_paste_target['production_value'] = pcity['production_value'];

    if (pcity['production_kind'] == VUT_UTYPE)
      name = unit_types[pcity['production_value']]['name'];
    else if (pcity['production_kind'] == VUT_IMPROVEMENT)
      name = improvements[pcity['production_value']]['name'];

    add_client_message(name+" copied to clipboard.");
  } else {
    var sunits = tile_units(ptile);
    var own_unit_index = -1; // -1 means player has none of own units present
    var player_has_own_unit_present = false;

    if (sunits != null && sunits.length > 0 ) {
      // Clicked on a tile with units:
      // Check that one of the units belongs to player:

      var own_unit_index = -1; // -1 means player has none of own units present

      // Find the first unit that belongs to the player:
      for (var u = 0; u < sunits.length; u++) {
        if (sunits[u]['owner'] == client.conn.playing.playerno)            {
          own_unit_index = u; //player wants to select his own unit first, not a foreign unit
          player_has_own_unit_present = true;
        }
        if (player_has_own_unit_present) break;
      }

      /* Copy player's first unit in stack; or else first non-player unit on tile
       * if player doesn't have own unit */
      var selected_index = own_unit_index == -1 ? 0 : own_unit_index;
      city_paste_target['production_kind'] = VUT_UTYPE;
      city_paste_target['production_value'] = sunits[selected_index]['type'];
      name = unit_types[sunits[selected_index]['type']]['name'];
      add_client_message(name+" copied to clipboard.");
    }
  }
}

/**************************************************************************
 Handles ctrl-shift-right click, which "pastes" the copied production
  target into a city's current production.
**************************************************************************/
function paste_tile_target_for_prod(canvas_x, canvas_y)
{
  if (client.conn.playing == null) return;
  //console.log("paste_tile_target_for_prod(..))")

  // Do legality checks:
  if (!city_paste_target || client.conn.playing == null)
    return;

  if (!city_paste_target['production_kind'] || !city_paste_target['production_value'])
    return;

  var ptile = canvas_pos_to_tile(canvas_x, canvas_y);
  if (ptile == null)
    return;

  var pcity = tile_city(ptile);
  if (!pcity || pcity['owner'] != client.conn.playing.playerno)
    return;

  send_city_change(pcity['id'], city_paste_target['production_kind'], city_paste_target['production_value']);
}

/**************************************************************************
 Handles shift-ctrl click, which selects/releases a worked tile on the map.
  i.e., this is the same as do_city_map_click() but from main map view.
**************************************************************************/
function worked_tile_click(ptile)
{
  var work_city_id = ptile['worked'];

  /* This is how selector_city gets set, when you click on a worked tile,
   * the city working it becomes the new selector_city: */
  if (work_city_id) selector_city = work_city_id;

  // Unworked tile and no selector_city = no action can be specified here.
  if (!selector_city) return;

  draw_city_output = true; // failsafe insurance: this mode should be on

  var packet = null;

  if (ptile['worked'] != 0) {
    packet = {"pid"     : packet_city_make_specialist,
              "city_id" : work_city_id,
              "tile_id" : ptile['index']};
  } else {
    packet = {"pid"     : packet_city_make_worker,
              "city_id" : selector_city,
              "tile_id" : ptile['index']};
  }
  send_request(JSON.stringify(packet));
}

/**************************************************************************
 Handles everything when the user clicked a tile
**************************************************************************/
function do_map_click(ptile, qtype, first_time_called)
{
  var punit;
  var packet;
  var pcity = tile_city(ptile);
  var player_has_own_unit_present = false;

  //console.log("do_map_click(...) called.");

  // User can safely finish dragging map and releasing on ANY tile without incurring an action.
  if (real_mouse_move_mode == true) return;

  if (ptile == null || client_is_observer()) return;

  // handle shift-ctrl click
  if (mouse_click_mod_key['shiftKey'] && mouse_click_mod_key['ctrlKey'] && !mouse_click_mod_key['altKey']) {
    worked_tile_click(ptile);
    return;
  }

  if (current_focus.length > 0 && current_focus[0]['tile'] == ptile['index']) {
    /* clicked on unit at the same tile, then deactivate goto and show context menu. */
    if (goto_active /*&& !touch_device*/) { //(allow clicking same tile when giving a Nuke order.)
      deactivate_goto(false);
    }
    if (renderer == RENDERER_2DCANVAS) {
      if (!mouse_click_mod_key['shiftKey']) { // normal left-click
        /* CONDITIONS FOR SHOWING A CONTEXT MENU:
           1.Automatic context menu when clicking unit, if 'unit_click_menu' user PREF is on.
           2.If unit in a city, always show context menu, so that there is a way to get past
             the selected unit and select "show city" in the contextmenu.
           3.If user_click_menu==false, unit has to be clicked TWICE for context menu. We know
             it's clicked twice by looking at last_unit_clicked.
           4.If city tile clicked only milliseconds after issuing a GOTO there, the click was
             part of double-tap-GOTO. No contextmenu if this is inside the 'cooldown' period */
        if (pcity || unit_click_menu || last_unit_clicked == current_focus[0]['id']) {
          if (pcity) {
            if (city_click_goto_cooldown(ptile))
              $("#canvas").contextMenu();
          }
          else $("#canvas").contextMenu();

          if (touch_device || !touch_device) { // We may differentiate behaviour for touch_device later
            // -2 is transition state for refresh, needed to allow clicking unit again to get rid of the context_menu
            last_unit_clicked = -2;
            // this flag indicates the next click will do nothing but destroy context_menu:
            came_from_context_menu = true;
          }
        }
      }
    } else if (!mouse_click_mod_key['shiftKey'] && unit_click_menu) {
      // 3D handling of above. TO DO: test/integrate same 2D functionality above for 3D if appropriate
      if (pcity) {
        if (city_click_goto_cooldown(ptile))
          $("#canvas_div").contextMenu();
      }
      else $("#canvas_div").contextMenu();
    }
    if (!mouse_click_mod_key['shiftKey']) {
      // Record the clicked unit to enable seeing if a unit is clicked twice.
      // 3 STATES: -1:Fresh, unit_id:last unit clicked is stored, -2:last unit was already clicked twice
      last_unit_clicked = (last_unit_clicked == -2) ? -1 : current_focus[0]['id'];
      return; //our work is done here unless we did a shift-click
    }
  }
  var sunits = tile_units(ptile);
  // We got here if we didn't left click a unit, so refresh last_unit_clicked to avoid false double-clicks if they go back to it
  last_unit_clicked = -1;

  // This catches the cases where another action released the context_menu without a user click
  // for example, cancelled attacks, no action possible, etc.
  if (!$(".context-menu-list").is(":visible"))
  {
    came_from_context_menu = false;
    // special logic to set mapview_mouse_movement here?
  }

  // HANDLE GOTO ACTIVE CLICKS ------------------------------------------------------------------------------------------------
  if (goto_active) {
    // console.log("GO TO IS ACTIVE!");
    if (current_focus.length > 0) {
      if (pcity) { // User clicked GOTO city tile.
        // This info prevents quick double-tap GOTOs from popping an unwanted contextmenu or city dialog:
        LAST_GOTO_TILE = ptile;
        LAST_GOTO_TIMESTAMP = Date.now();
      }
      // send goto order for all units in focus.
      for (var s = 0; s < current_focus.length; s++) {
        punit = current_focus[s];
        /* Get the path the server sent using PACKET_GOTO_PATH. */
        var goto_path = goto_request_map[punit['id'] + "," + ptile['x'] + "," + ptile['y']];

        if (goto_path) { // touch devices don't have a goto_path until they call this function twice. see: if (touch_device) below
          // Client circumvents FC Server has buggy GOTO for units which have UTYF_COAST + fuel:
          if (unit_has_type_flag(punit, UTYF_COAST) && punit['fuel']>0 && !delayed_goto_active && goto_path !== undefined) {
            goto_path['dir'].shift();  // remove the first "refuel dir" on fuel units, so they don't freeze on refuel spots
            goto_path['length']--;     // correct the path length for the removed -1 "refuel dir"
          } else if (delayed_goto_active) {
            //if (unit_type(punit)['move_rate']==punit['movesleft']) {    didn't capture case of unmoved but damage_slows
            if (!unit_has_moved(punit)) {
                add_client_message(unit_type(punit)['name']+" must first move and have less than full moves left.");
                goto_path = null; // cancel it so it doesn't move this turn by mistake
                return;  // avoid possible adjacent tile goto override on a delayed goto
              }
              else {
                // Gives non-fuel units the -1 (refuel) dir so they can have a kind of delayed GOTO also
                goto_path['dir'].unshift(-1);
                goto_path['length']++;  // correct for the path having an extra -1 "refuel dir" in it
              }
          }
        }
        // This is where we would normally check if the goto_path is null for unit s, and do a continue to move on to the next unit.
        // However, we might have a null path because of the GO TO BUG, in which case we allow a click on an adjacent
        // tile to simulate an arrow key to legally perform the action.  This will also handle the case for arrow-key override
        // on units that Go To won't move until next turn because they have less than full moves and are at a fueling station.

        /* The tile the unit currently is standing on. */
        var old_tile = index_to_tile(punit['tile']);

        // DO NOT create a GO TO for an adjacent tile, but circumvent it by simulating arrow key press:
        // This is necessary because "go to" adjacent tile has bugs and sometimes disallows it, preventing
        // people on touch devices, etc., from being able to do legal manual movements to adjacent tiles:
        var tile_dx = ptile['x'] - old_tile['x'];
        var tile_dy = ptile['y'] - old_tile['y'];
        //console.log("dx:"+tile_dx+", dy:"+tile_dy);

        /* Override server GOTO pathfinding bugs that report false illegal actions and thus disallow mobile device
        *  users from making legal moves. There is no risk in the override attempting a manual move command to an adjacent
        *  tile in such cases, since it will simply not perform it if the server won't allow it. ;) */

        /* Conditions for overriding GOTO with a simulated manual cursor move command:
        * ADJACENT:  tile distance dx<=1 AND dy<=1.
        * Not goto_active during a NUKE command, which is a GOTO with a goto_last_action for Nuking the target.
        * goto_path.length must be 0, undefined, or 1;  if path is 2 or more to an adjacent tile, that means there is a legal path
        * to the next tile, that uses less moves by going to another tile first (e.g. stepping onto a river before going to Forest river)
        * in which case we wouldn't want to override it because (1) it HAS a legal path and (2) it's a superior path using less moves
        */
        //console.log("goto_path, goto_path.length == "+goto_path+", "+goto_path.length);

        // True goto_path.length is 1 less for units with fuel, they "falsely" report it as +1 higher:
        var true_goto_path_length;
        if (goto_path != null && goto_path.length != null)
          true_goto_path_length = unit_types[punit['type']]['fuel'] == 0 ? goto_path.length : goto_path.length-1;
        else true_goto_path_length = 0;

        if (  Math.abs(tile_dx)<=1 && Math.abs(tile_dy) <=1     // adjacent
              && goto_last_action != ACTION_NUKE                // not a nuke command appended to a GOTO
              && (true_goto_path_length <= 1)   // don't override path>=2 which has better legal way to get to adjacent tile
          )                                    // "illegal" adjacent goto attempts render goto_path.length == undefined (true_goto_path_length will then be 0)

            /* NOTE: instead of checking ACTION_NUKE we could check (goto_last_action==-1 OR ACTION_COUNT), which would allow other
              * goto_last_actions to be added later (go to tile and build city, etc.) but this wasn't done for now because we don't
              * want to deal with the risks of relying on -1 or ACTION_COUNT to always be set properly in every single case
              */
        {
          console.log("GO TO overridden because adjacent tile.")
          switch (tile_dy)
          {
            case 0: // neither north nor south:
              switch (tile_dx)
              {
                case 0:     // clicked same tile, do nothing.
                break;

                case -1:    // west
                  key_unit_move_focus_index(DIR8_WEST,s);
                break;

                case 1:    // east
                  key_unit_move_focus_index(DIR8_EAST,s);
                break;
              }
              break;
            case 1: // south directions:
              switch (tile_dx)
              {
                case 0:     //south
                  key_unit_move_focus_index(DIR8_SOUTH,s);
                break;

                case -1:    // southwest
                  key_unit_move_focus_index(DIR8_SOUTHWEST,s);
                break;

                case 1:    // southeast
                  key_unit_move_focus_index(DIR8_SOUTHEAST,s);
                break;
              }
              break;
            case -1: // north directions
              switch (tile_dx)
              {
                case 0:
                  key_unit_move_focus_index(DIR8_NORTH,s);
                break;

                case -1:
                  key_unit_move_focus_index(DIR8_NORTHWEST,s);
                break;

                case 1:
                  key_unit_move_focus_index(DIR8_NORTHEAST,s);
                break;
              }
              break;
          }
          continue;  // we did our override and simulated an arrow keypress. no need for other handling, just go on to the next unit
        }

        //console.log("Attempting a GO TO to a non-adjacent tile.")

        // user did not click adjacent tile, so make sure it's not a null goto_path before handling the goto
        if (goto_path == null) { // Exception: nuke order allows specifying occupied tile to nuke.
          continue;  // null goto_path, do not give this unit a goto command, go on to the next unit
        }

        /* Create an order to move along the path. */
        packet = {
          "pid"      : packet_unit_orders,
          "unit_id"  : punit['id'],
          "src_tile" : old_tile['index'],
          "length"   : goto_path['length'],
          "repeat"   : false,
          "vigilant" : false,

          /* Each individual order is added later. */

          "dest_tile": ptile['index']
        };

        /* Add each individual order. */
        packet['orders'] = [];
        packet['dir'] = [];
        packet['activity'] = [];
        packet['target'] = [];
        packet['extra'] = [];
        packet['action'] = [];
        for (var i = 0; i < goto_path['length']; i++) {
          /* TODO: Have the server send the full orders instead of just the
           * dir part. Use that data in stead. */

          if (goto_path['dir'][i] == -1) {
            /* Assume that this means refuel. */
            packet['orders'][i] = ORDER_FULL_MP;
          } else if (i + 1 != goto_path['length']) {
            /* Don't try to do an action in the middle of the path. */
            packet['orders'][i] = ORDER_MOVE;
          } else {
            /* It is OK to end the path in an action. */
            packet['orders'][i] = ORDER_ACTION_MOVE;
          }

          packet['dir'][i] = goto_path['dir'][i];
          packet['activity'][i] = ACTIVITY_LAST;
          packet['target'][i] = 0;
          packet['extra'][i] = EXTRA_NONE;
          packet['action'][i] = ACTION_COUNT;
        }

        if (goto_last_order != ORDER_LAST) {
          /* The final order is specified. */
          var pos;

          /* Should the final order be performed from the final tile or
           * from the tile before it? In some cases both are legal. */
          if (!order_wants_direction(goto_last_order, goto_last_action,
                                     ptile)) {
            /* Append the final order. */
            pos = packet['length'];

            /* Increase orders length */
            packet['length'] = packet['length'] + 1;

            /* Initialize the order to "empthy" values. */
            packet['orders'][pos] = ORDER_LAST;
            packet['dir'][pos] = -1;
            packet['activity'][pos] = ACTIVITY_LAST;
            packet['target'][pos] = 0;
            packet['extra'][pos] = EXTRA_NONE;
            packet['action'][pos] = ACTION_COUNT;
          } else {
            /* Replace the existing last order with the final order */
            pos = packet['length'] - 1;
          }

          /* Set the final order. */
          packet['orders'][pos] = goto_last_order;

          /* Perform the final action. */
          packet['action'][pos] = goto_last_action;
        }

        /* The last order has now been used. Clear it. */
        goto_last_order = ORDER_LAST;
        goto_last_action = ACTION_COUNT;

        if (punit['id'] != goto_path['unit_id']) {
          /* Shouldn't happen. Maybe an old path wasn't cleared out. */
          console.log("Error: Tried to order unit " + punit['id']
                      + " to move along a path made for unit "
                      + goto_path['unit_id']);
          return;
        }
        /* Send the order to move using the orders system. */
        send_request(JSON.stringify(packet));
        if (punit['movesleft'] > 0 && !delayed_goto_active && punit['owner'] == client.conn.playing.playerno) {
          unit_move_sound_play(punit);
        } else if (!has_movesleft_warning_been_shown) {
          has_movesleft_warning_been_shown = true;
          var ptype = unit_type(punit);
          message_log.update({
            event: E_BAD_COMMAND,
            message: ptype['name'] + " has no moves left. Press turn done for the next turn."
          });
        }

      }
      clear_goto_tiles();

    } else if (touch_device) {
      /* this is to handle the case where a mobile touch device user chooses
      GOTO from the context menu or clicks the goto icon. Then the goto path
      has to be requested first, and then do_map_click will be called again
      to issue the unit order based on the goto path. */
      if (current_focus.length > 0) {
        console.log("touch device requesting goto path")
        request_goto_path(current_focus[0]['id'], ptile['x'], ptile['y']);
        if (first_time_called) {
          console.log("inside first_time_called code")
          setTimeout(function(){
            console.log("setting up virtual do_map_click")
            do_map_click(ptile, qtype, false);
          }, 250);
        }
        return;
      }
    }

    deactivate_goto(true);
    //update_unit_focus();  true in the line above advances unit focus after update_focus_delay # milliseconds

  }  // END OF GO TO HANDLING ----------------------------------------------------------------------------------------------
   else if (paradrop_active && current_focus.length > 0) {
    punit = current_focus[0];
    packet = {
      "pid"         : packet_unit_do_action,
      "actor_id"    : punit['id'],
      "target_id"   : ptile['index'],
      "extra_id"    : EXTRA_NONE,
      "value"       : 0,
      "name"        : "",
      "action_type" : ACTION_PARADROP
    };
    send_request(JSON.stringify(packet));
    paradrop_active = false;

  } else if (airlift_active && current_focus.length > 0) {
    punit = current_focus[0];
    pcity = tile_city(ptile); // TO DO: remove? we set pcity at top
    if (pcity != null) {
      packet = {
        "pid"         : packet_unit_do_action,
        "actor_id"    : punit['id'],
        "target_id"   : pcity['id'],
        "extra_id"    : EXTRA_NONE,
        "value"       : 0,
        "name"        : "",
        "action_type" : ACTION_AIRLIFT
      };
      send_request(JSON.stringify(packet));
    }
    airlift_active = false;

  } else if (action_tgt_sel_active && current_focus.length > 0) {
    request_unit_act_sel_vs(ptile);
    action_tgt_sel_active = false;

  } else {
    if (pcity != null) { //if city clicked
      if (pcity['owner'] == client.conn.playing.playerno && !mouse_click_mod_key['shiftKey']) { //if city is your own
        //console.log("Clicked our own city.");
        if (sunits != null && sunits.length > 0 //if units inside
            && sunits[0]['activity'] == ACTIVITY_IDLE //if unit idle/selectable
            && sunits[0]['owner'] == client.conn.playing.playerno  // if foreign-allied occupant we don't want to select the unit
            && sunits[0]['movesleft'] > 0) { // if no moves left we'd rather go inside city

          set_unit_focus_and_redraw(sunits[0]);
          if (city_click_goto_cooldown(ptile)) { // don't show contextmenu if in the cooldown period for a double tap GOTO
            if (renderer == RENDERER_2DCANVAS) {
              $("#canvas").contextMenu();
            } else { //3D handling can potentially be made different later
              $("#canvas_div").contextMenu();
            }
          }
          return; // move the commented-out return from below up here
        } else if (!goto_active) { //if GOTO active then the click is a move command, not a show city command
            // the case below only happens if clicking a city with foreign unit inside while not issuing a GOTO move command.
            // It seems redundant--but we make a code-slot for changing how this case is handled.
            if (sunits[0]['owner'] != client.conn.playing.playerno) {
              if (city_click_goto_cooldown(ptile))
                show_city_dialog(pcity); // show the city rather than select a foreign unit that would block clicking our own city
              return; // move the commented-out return from below up here
            } else {
                // we clicked on our own city without an active unit and were not doing a GOTO, so show the city
                if (city_click_goto_cooldown(ptile))
                  show_city_dialog(pcity);
               return; // move the commented-out return from below up here
            }
          }
          console.log("Clicked our own city but we didn't select a unit, it wasn't a GOTO move order click,"+
                      " and for some reason we're still not showing the city dialog.");
          return;
      }
      //console.log("Clicked a non-domestic city or shift-clicked domestic. Not showing dialog.  goto_active=="+goto_active);
      //return;  //this return-command only happened if clicking a foreign city, bypassing all ability below to click your
      //own unit on a tile that's not your city (such as, a foreign city)

      // special case: goto was active and foreign city was clicked, it would have done a return before.
      // TO DO: test if go to on a foreign allied city still works !
    }

    //console.log("Click resulted in arriving at this stage, past city checks and handling.");

    if (sunits != null && sunits.length == 0) {
      // Clicked on a tile with no units:
        // Normal left-click on no unit: unselect units and reset.
        // Shift+left-click on no unit: 'add nothing' to current selection, i.e., do nothing.
      if (!mouse_click_mod_key['shiftKey']) {
        set_unit_focus_and_redraw(null);
      }
    } else if (sunits != null && sunits.length > 0 ) {
      // Clicked on a tile with units:
      // Check that one of the units belongs to player:

      var own_unit_index = -1; // -1 means player has none of own units present

      for (var u = 0; u < sunits.length; u++) {
        if (sunits[u]['owner'] == client.conn.playing.playerno)
          {
            own_unit_index = u; //player wants to select his own unit first, not a foreign unit
            player_has_own_unit_present = true;
          }
          if (player_has_own_unit_present) break; // gets first visible unit in stack, not last
      }

      //if (sunits[0]['owner'] == client.conn.playing.playerno) {   // if player had a unit index >0, we couldn't click the stack
      if (player_has_own_unit_present) {

        // SHIFT CLICK HANDLING -----------------------------------------------------------------------------------------------
        // Shift-click means the user wants to add the units in this stack to selected units, OR de-select if already selected:
        if (mouse_click_mod_key['shiftKey'])  {
          var preclick_current_focus_length = current_focus.length;

				  for (var i = 0; i < sunits.length; i++) { // Process each unit on the shift-clicked tile
            var clicked_unit = sunits[i];
            if (clicked_unit['owner'] == client.conn.playing.playerno) // only add our own units to selection
            {
              // See if unit is already selected
              var index = current_focus.findIndex(x => x.id==clicked_unit.id);
              // Add unit to selection if it's not already selected:
              if (index === -1) { // -1 means it's not in selection, so we add it:
                current_focus.push(clicked_unit);
              }
              else { // Unit is already in selection. Shift-clicking removes it from selection.
                // Allow left-clicking stack then shift-clicking to add rest of stack without de-selecting the first unit
                // This ensures the whole stack is "on the same page" and not flip-flopping where you can never select/deselect
                // the entire stack.
                if (preclick_current_focus_length != 1)
                  current_focus.splice(index, 1);
              }
            }
          }
          update_active_units_dialog();
        }
        // END OF SHIFT-CLICK handling -----------------------------------------------------------------------------

        // User did a normal click, so just change selected focus:
        else if (sunits.length == 1) { // Normal left-click on a single unit: change focus onto this unit
          /* A single unit has been clicked with the mouse. */
          var unit = sunits[0];
          set_unit_focus_and_activate(unit);
        } else { /* more than one unit is on the selected left-clicked tile. */
            if (own_unit_index>=0) {
              set_unit_focus_and_redraw(sunits[own_unit_index]);
            }
            else {
              set_unit_focus_and_redraw(sunits[0]); //this shouldn't happen but, select first unit[0] if player doesn't have own unit.
              console.log("Logic fault: player has own unit supposedly present but we're selecting sunit[0] instead.")
            }
          update_active_units_dialog();
        }

        if (touch_device) { // show context menu unless we clicked on a city prior to GOTO_COOLDOWN period
          if (renderer == RENDERER_2DCANVAS) {
            if (pcity) {
              if (city_click_goto_cooldown(ptile)) $("#canvas").contextMenu();
            } else {
              $("#canvas").contextMenu();
            }
          }
          else {  // 3D handling, currently the same
            if (pcity) {
              if (city_click_goto_cooldown(ptile)) $("#canvas").contextMenu();
            } else {
              $("#canvas").contextMenu();
            }
          }
        }
      } else if (pcity == null && !mouse_click_mod_key['shiftKey']) {
        // clicked on a tile with units exclusively owned by other players.
        save_last_unit_focus();
        current_focus = [];
        for (i=0;i<sunits.length;i++)
          current_focus.push(sunits[i]);
        //current_focus = sunits;
        if (current_focus.length>0) // just for insurance ;)
          warcalc_set_default_vals(current_focus[0]);  // feeds the warcalc with default values from current_focus[0]
        $("#game_unit_orders_default").hide();
        update_active_units_dialog();
      }
    }
  }

  paradrop_active = false;
  airlift_active = false;
  action_tgt_sel_active = false;
}


/**************************************************************************
 Returns a possibly active dialog.
 Helper function to know if the map keyhandler may apply.
**************************************************************************/
function find_active_dialog()
{
  const permanent_widgets = ["game_overview_panel", "game_unit_panel", "game_chatbox_panel"];
  const dialogs = $(".ui-dialog");
  for (var i = 0; i < dialogs.length; i++) {
    const dialog = $(dialogs[i]);
    if (dialog.css("display") == "none") {
      continue;
    }
    const children = dialog.children();
    if (children.length >= 2 && permanent_widgets.indexOf(children[1].id) < 0) {
      return dialog;
    }
  }
  return null;
}

/**************************************************************************
 Callback to handle keyboard events
**************************************************************************/
function global_keyboard_listener(ev)
{
  // Check if focus is in chat field, where these keyboard events are ignored.
  if ($('input:focus').length > 0 || !keyboard_input) return;

  if (C_S_RUNNING != client_state()) return;

  /* if (!ev) ev = window.event; INTERNET EXPLORER DEPRECATED */
  var keyboard_key = String.fromCharCode(ev.keyCode);

  if (TAB_MAP === $("#tabs").tabs("option", "active")) {
    // The Map tab is active
    if (find_active_dialog() == null) {
      map_handle_key(keyboard_key, ev.keyCode, ev['ctrlKey'], ev['altKey'], ev['shiftKey'], ev);
    }
  }
  civclient_handle_key(keyboard_key, ev.keyCode, ev['ctrlKey'],  ev['altKey'], ev['shiftKey'], ev);

  if (renderer == RENDERER_2DCANVAS) $("#canvas").contextMenu('hide');
}

/**************************************************************************
 Handles global keybindings.
**************************************************************************/
function civclient_handle_key(keyboard_key, key_code, ctrl, alt, shift, the_event)
{
  switch (keyboard_key) {
    case 'C':
      if (alt) {
        the_event.preventDefault();     // override possible browser shortcut
        $('#ui-id-5').trigger("click"); // cities tab
      }
    break;

    case 'H':
      if ((!shift) && (ctrl)) {
        the_event.preventDefault(); // override possible browser shortcut
        show_debug_info();
      }
      else if (alt) $('#ui-id-7').trigger("click");  // docs tab
    break;

    case 'E':
      if (alt) {
        the_event.preventDefault(); // override possible browser shortcut
        $('#ui-id-2').trigger("click"); // empire tab
      }
    break;

    case 'G':
      if (alt) {
        the_event.preventDefault(); // override possible browser shortcut
        $('#ui-id-3').trigger("click"); // gov tab
      }
    break;

    case 'M':
      if (alt) {
        the_event.preventDefault(); // override possible browser shortcut
        $('#ui-id-1').trigger("click"); // map tab  // reserved for messages tab later
      }
    break;

    case 'N':
      if (alt) {
        the_event.preventDefault(); // override possible browser shortcut
        $('#ui-id-4').trigger("click"); // nations tab
      }
    break;

    case 'P':
        if (alt && !ctrl) {
          the_event.preventDefault(); // override possible browser shortcut
          $('#ui-id-6').trigger("click"); // prefs tab
        }
      break;

    case 'Q':
      if (alt) civclient_benchmark(0);
    break;

    case 'S':
      if (ctrl && !shift && !alt) {
        the_event.preventDefault(); // override possible browser shortcut
        quicksave();
      }
      else if (alt) {
        the_event.preventDefault(); // override possible browser shortcut
        show_fullscreen_window();
      }
    break;

    case 'T':
      if (alt) {
        the_event.preventDefault(); // override possible browser shortcut
        $('#tech_tab_item').trigger("click"); // tech tab
      }
    break;

    // close any/all tabs/windows and go back to map
    case 'W':
      if (!alt && !ctrl && !shift) { // also key_code 112 (F1)
        $('#ui-id-1').trigger("click");
        chatbox_scroll_to_bottom(false);
      } else if (alt) {               // warcalc tab
        $("#ui-id-8").trigger("click");
        warcalc_screen();
      }
    break;
  }

  switch (key_code)
  {
    case 13:
      if (shift && C_S_RUNNING == client_state()) {
        send_end_turn();
      }
      break;

    case 27:
      the_event.preventDefault();
      $('#ui-id-1').trigger("click");
      break;

    case 32:
      if (!alt && !shift && !ctrl) {
        if ($("#tabs-cities").is(":visible")) {
          highlight_rows_by_improvement(0, true); // Clear all highlighted rows.
          select_rows_by_improvement(0, true); // Clear all selected rows.
        }
      }
      break;
  }
}

/**************************************************************************
 Handles map keybindings.
**************************************************************************/
function
map_handle_key(keyboard_key, key_code, ctrl, alt, shift, the_event)
{
  switch (keyboard_key) {
    case 'A':
      if (shift) {
        auto_attack = !auto_attack;
        //simpleStorage.set('autoattack', auto_attack); //session only
        add_client_message("Auto-attack set to "+(auto_attack ? "ON." : "OFF."));
      } else key_unit_auto_settle();
    break;

    case 'B':
      if (ctrl) {   //CTRL-B solid fill national borders
        the_event.stopPropagation();
        fill_national_border = !fill_national_border;
      }
    else if (current_focus.length==1 &&   // check if single focused unit can found or join city
    (utype_can_do_action(unit_type(current_focus[0]),ACTION_JOIN_CITY)
    || utype_can_do_action(unit_type(current_focus[0]),ACTION_FOUND_CITY))) {

        request_unit_build_city();
    } else {   // otherwise hover over city while hitting B sends instant-buy command to it
        var ptile = canvas_pos_to_tile(mouse_x, mouse_y); // get tile
        var pcity = tile_city(ptile); // check if it's a city
        if (pcity!=null) request_city_id_buy(pcity['id']); // send buy order
    }
    break;

    case 'C':
      if (ctrl && !shift && !alt) {
        the_event.preventDefault();          // override possible browser shortcut
        show_citybar = !show_citybar;
      } else if (shift && !ctrl && !alt) {
          key_select_same_global_type(true); // true=same continent only
      } else if (ctrl && shift && !alt) {            // cycle citybar display mode
          the_event.preventDefault();          // override possible browser shortcut
          mapview_cycle_city_display_mode();
      } else if (current_focus.length > 0) {
          auto_center_on_focus_unit();
      }
    break;

    case 'D':
      if (shift && !ctrl && !alt) {
        key_unit_disband();
      } else if (!shift && ctrl && alt) {
        // CTRL-ALT-D user forced disconnect
        the_event.preventDefault(); // override possible browser shortcut
        clinet_disconnect_from_server();
      } else if (!(alt || ctrl)) {
        key_unit_action_select();
      }
    break;

    case 'E':
      if (shift) {
        key_unit_airbase();
      }
    break;

    case 'F':
      if (shift) {
        key_unit_fortress();
      } else {
        key_unit_fortify();
      }
    break;

    case 'G':
      if (ctrl) {
        the_event.preventDefault(); // override possible browser shortcut
        draw_map_grid = !draw_map_grid;
        simpleStorage.set('mapgrid', draw_map_grid);
      } else if (current_focus.length > 0) {
        activate_goto();
        delayed_goto_active = false;
        if (shift) delayed_goto_active = true;
      }
    break;

    case 'H':
      if (shift) {
        key_unit_hideout();
      } else key_unit_homecity();
    break;

    case 'K':
      key_unit_wait(true);
    break;

    case 'N':
      if (shift) {
        if (current_focus.length>0) {
          if (unit_types[current_focus[0]['type']]['name'].includes("Atom")
              || unit_types[current_focus[0]['type']]['name'].includes("Nuclear")
              || unit_types[current_focus[0]['type']]['name'].includes("Nuke")
              || unit_types[current_focus[0]['type']]['name'].includes("Bomb") ) {

                key_unit_nuke();
          } else key_unit_naval_base();
        }
      }
      else {
        key_unit_fallout();
      }
    break;

    case 'P':
      if (shift) {
        key_unit_pillage();
      } else if (ctrl && alt && !shift) {
        the_event.preventDefault(); // override possible browser shortcut
        draw_highlighted_pollution = !draw_highlighted_pollution;
      }
      else {
        if (current_focus.length>0) {
          if (unit_types[current_focus[0]['type']]['name'] == "Paratroopers") key_unit_paradrop();
          else key_unit_pollution();
        }
      }
    break;

    case 'Q':
      if (shift){
        key_filter_for_units_in_queue();
      } else {
        key_unit_quay();
      }
    break;

    case 'R':
      if (shift) {
        show_revolution_dialog();
      } else key_unit_road();
    break;

    case 'S':
      if (!ctrl && !alt && !shift) {
        key_unit_sentry();
      }
      else if (shift && !ctrl && !alt) { // cycle through stacked unit display modes
        draw_stacked_unit_mode ++;
        if (draw_stacked_unit_mode>3)
          draw_stacked_unit_mode = 0;
          simpleStorage.set('stackmode', draw_stacked_unit_mode);
      }
    break;

    case 'T':
      if (shift) {
        show_tax_rates_dialog();
      } else key_unit_unload();
    break;

    case 'V':
      if (shift) {
        key_select_same_type_units_on_tile();
      } else if (alt) {
        the_event.preventDefault(); // override possible browser shortcut
        key_select_different_units_on_tile();
      } else {
        key_select_all_units_on_tile();
      }
    break;

    case 'W':
      if (shift) {
        draw_city_output = !draw_city_output;
      } else if (!alt && !ctrl) key_unit_wait(false);
    break;

    case 'X':
        if (shift) { //shift-x = select all units of same type on same continent
          key_select_same_global_type(false); // false=same continent only
        }
        else if (enable_autoexplore) {
          key_unit_auto_explore();
        } else add_client_message("X hotkey was disabled in user PREFS.")
    break;

    // ALT + UIO / JKL / M,. simulates keypad for devices that don't have it, if alt not held
    // execute the primary command for these keys:
    case 'U':
      if (alt) {
        the_event.preventDefault(); // override possible browser shortcut
        key_unit_move(DIR8_WEST);  // alt+U=7
      }
      else if (shift) key_unit_show_cargo();
      else key_unit_upgrade();
    break;
    case 'I':
      if (alt) {
        if (ctrl && shift) {  // toggle capital I fixer
          the_event.preventDefault(); // override possible browser shortcut
          replace_capital_i = !replace_capital_i;
          simpleStorage.set('capI', replace_capital_i);
        } else {
          the_event.preventDefault(); // override possible browser shortcut
          key_unit_move(DIR8_NORTHWEST); // alt+I=8
        }
      }
      else if (shift) key_unit_vigil();
      else if (!shift && !alt && !ctrl) key_unit_irrigate();
    break;
    case 'O':
      if (alt) {
        the_event.preventDefault(); // override possible browser shortcut
        key_unit_move(DIR8_NORTH);  // alt+O=9
      } else if (shift) {
        key_unit_convert();
      }
      else key_unit_transform();
    break;
    case 'J':
      if (shift) {
        key_unit_idle();
      }
      else if (alt) {
        the_event.preventDefault(); // override possible browser shortcut
        key_unit_move(DIR8_SOUTHWEST); // alt+J=4
      }
      else {
        key_unit_noorders();
      }
    break;
    case 'L':
      if (shift) {
        key_unit_airlift();
      } else if (alt) key_unit_move(DIR8_NORTHEAST); // alt+L=6
      else if (ctrl) {
        the_event.preventDefault(); // override possible browser shortcut
        draw_city_airlift_counter = !draw_city_airlift_counter;
      }
      else {
        key_unit_load();
      }
    break;
    case 'M':
      if (shift && !ctrl && !alt) {
        show_unit_movepct = !show_unit_movepct;
        if (show_unit_movepct) hp_bar_offset = -5;
        else hp_bar_offset = 0;
        //simpleStorage.set('showMoves', show_unit_movepct);
      } else if (alt && !shift && !ctrl) {
        the_event.preventDefault(); // override possible browser shortcut
        key_unit_move(DIR8_SOUTH);  // alt+M=1
      } else if (ctrl && !alt && !shift) {
        the_event.preventDefault(); // override possible browser shortcut
        draw_city_mood = !draw_city_mood;
        simpleStorage.set('drawMood', draw_city_mood);
      }
      
      else key_unit_mine();
    break;
    /* these were moved lower to keycode 188,190 for Mac compatibility:
    case ',':
      if (alt) key_unit_move(DIR8_SOUTHEAST);  // alt+,=2
    break;
    case '.':
      if (alt) key_unit_move(DIR8_EAST);  // alt+.=
    break;
    // the block of code above contains virtual keypad ^^
    */
  }

  switch (key_code) {
    case 35: //1
    case 97:
      key_unit_move(DIR8_SOUTH);
      break;

    case 40: // 2 (or down arrow key)
    case 98:
    case 188:  // , key
      if (key_code==188 && shift) {  // The "<"" key selects last unit
        // we have to save last_focus before we use it so we do a little shell game
        var penultimate_focus = last_focus;
        save_last_unit_focus();

        current_focus = [];
        if (penultimate_focus != null) {
          //current_focus.push(last_focus);
          set_unit_focus_and_redraw(penultimate_focus);
        }

      }
      // if alt not pressed then ignore , key
      if (key_code==188 && !alt) break; // alt , is a virtual numpad arrow

      the_event.preventDefault(); // override possible browser shortcut
      key_unit_move(DIR8_SOUTHEAST);
      break;

    case 34: // 3
    case 99:
    case 190:
      if (key_code==190 && shift) {
        advance_focus_inactive_units();
      }

      if (key_code==190 && !alt) break; //190 moves only if alt held down:
      the_event.preventDefault(); // override possible browser shortcut
      key_unit_move(DIR8_EAST);
      break;

    case 37: // 4
    case 100:
      key_unit_move(DIR8_SOUTHWEST);
      break;

    case 12: // 5 (middle numpad key) -- also see shift-188 ("<") above
        // Selects last unit
        // we have to save last_focus before we use it so we do a little shell game
        var penultimate_focus = last_focus;
        save_last_unit_focus();

        current_focus = [];
        if (penultimate_focus != null) {
          //current_focus.push(last_focus);
          set_unit_focus_and_redraw(penultimate_focus);
        }
      break;

    case 39: // 6
    case 102:
      key_unit_move(DIR8_NORTHEAST);
      break;

    case 36: // 7
    case 103:
      key_unit_move(DIR8_WEST);
      break;

    case 38: // 8
    case 104:
      key_unit_move(DIR8_NORTHWEST);
      break;

    case 33: // 9
    case 105:
      key_unit_move(DIR8_NORTH);
      break;

    case 27:      //Esc
      deactivate_goto(false);
      /* Abort UI states */
      map_select_active = false;
      map_select_check = false;
      mapview_mouse_movement = false;
      came_from_context_menu = false;
      /* Abort any context menu blocking. */
      context_menu_active = true;
      if (renderer == RENDERER_2DCANVAS) {
        $("#canvas").contextMenu(true);
      } else {
        $("#canvas_div").contextMenu(true);
      }

      /* Abort target tile selection. */
      paradrop_active = false;
      airlift_active = false;
      action_tgt_sel_active = false;
      break;

    // shift-space, return to previous map position
    // space, will clear selection and goto.
    case 32:
      if (shift) auto_center_last_location();
      else if (ctrl && alt) {
        the_event.preventDefault();
        key_paste_link_under_cursor();
      } else {
        save_last_unit_focus();

        current_focus = [];
        if (renderer == RENDERER_WEBGL) webgl_clear_unit_focus();
        goto_active = false;
        delayed_goto_active = false;
        $("#canvas_div").css("cursor", "default");
        goto_request_map = {};
        goto_turns_request_map = {};
        clear_goto_tiles();
        update_active_units_dialog();

        // clear out of special UI-states, too
        paradrop_active = false;
        airlift_active = false;
        map_select_active = false;
        map_select_check = false;
        mapview_mouse_movement = false;
        came_from_context_menu = false;
      }
      break;

    case 222:  // ' key = focus in chat window
      the_event.preventDefault(); // don't put the ' in the input box

      // Auto-restore chatbox if it's minimised
      if (current_message_dialog_state == "minimized")
        $(".chatbox_dialog .ui-icon-bullet").click();

      $("#game_text_input").focus();
      break;

    case 107:
      //zoom in
      if (renderer == RENDERER_WEBGL) {
        let new_camera_dy = camera_dy - 60;
        let new_camera_dx = camera_dx - 45;
        let new_camera_dz = camera_dz - 45;
        if (new_camera_dy < 350 || new_camera_dy > 1200) {
          return;
        } else {
          camera_dx = new_camera_dx;
          camera_dy = new_camera_dy;
          camera_dz = new_camera_dz;
        }
        camera_look_at(camera_current_x, camera_current_y, camera_current_z);
      }
      break;

    case 109:
      //zoom out
      if (renderer == RENDERER_WEBGL) {
        let new_camera_dy = camera_dy + 60;
        let new_camera_dx = camera_dx + 45;
        let new_camera_dz = camera_dz + 45;
        if (new_camera_dy < 350 || new_camera_dy > 1200) {
          return;
        } else {
          camera_dx = new_camera_dx;
          camera_dy = new_camera_dy;
          camera_dz = new_camera_dz;
        }
        camera_look_at(camera_current_x, camera_current_y, camera_current_z);
      }
      break;

  }

}

/**************************************************************************
 Handles everything when the user clicked on the context menu
**************************************************************************/
function handle_context_menu_callback(key)
{
  switch (key) {
    case "exit":
      // touch device users get to escape from context menu
      break;

    case "build":
      request_unit_build_city();
      break;

    case "select_all_type":
      key_select_same_type_units_on_tile();
      break;

    case "select_all_tile":
      key_select_all_units_on_tile();
      break;

    case "tile_info":
      var ptile = find_a_focus_unit_tile_to_center_on();
      if (ptile != null) {
        mclick_tile = ptile;
        popit_req(ptile);
      }
      came_from_context_menu = false;  // reset UI-blocking state
      break;

    case "goto":
      activate_goto();
      break;
    case "delaygoto":
      activate_goto();
      delayed_goto_active = true;
      break;

    case "explore":
      key_unit_auto_explore();
      break;

    case "fortify":
      key_unit_fortify();
      break;

    case "vigil":
      key_unit_vigil();
      break;

    case "road":
      key_unit_road();
      break;

    case "railroad":
      key_unit_road();
      break;

    case "maglev":
      key_unit_road();
      break;

    case "quay":
      key_unit_quay();
      break;

    case "canal":
      key_unit_canal();
      break;

    case "well":
      key_unit_well();
      break;

    case "mine":
      key_unit_mine();  // and plant forest
      break;

    case "autosettlers":
      key_unit_auto_settle();
      break;

    case "fallout":
      key_unit_fallout();
      break;

    case "pollution":
      key_unit_pollution();
      break;

    case "forest":
      key_unit_irrigate();
      break;

    case "irrigation":
      key_unit_irrigate();
      break;

    case "fort":
    case "fortress":
      key_unit_fortress();
      break;

    case "hideout":
      key_unit_hideout();
      break;

    case "navalbase":
      key_unit_naval_base();
      break;

    case "airbase":
      key_unit_airbase();
      break;

    case "transform":
      key_unit_transform();
      break;

    case "nuke":
      key_unit_nuke();
      break;

    case "paradrop":
      key_unit_paradrop();
      break;

    case "pillage":
      key_unit_pillage();
      break;

    case "homecity":
      key_unit_homecity();
      break;

    case "airlift":
      key_unit_airlift();
      break;

    case "sentry":
      key_unit_sentry();
      break;

    case "wait":
      key_unit_wait(false);
      break;

    case "noorders":
      key_unit_noorders();
      break;

    case "idle":
      key_unit_idle();
      break;

    case "upgrade":
      key_unit_upgrade();
      break;

    case "convert":
      key_unit_convert();
      break;

    case "disband":
      key_unit_disband();
      break;

    case "unit_load":
      key_unit_load();
      break;

    case "unit_unload":
      key_unit_unload();
      break;

    case "unit_show_cargo":
      key_unit_show_cargo();
      break;

    case "action_selection":
      key_unit_action_select();
      break;

    case "show_city":
      // new method:
      if (clicked_city != null) {
        show_city_dialog(clicked_city);
      } else { // fail over to former method:
        var stile = find_a_focus_unit_tile_to_center_on();
        if (stile != null) {
          show_city_dialog(tile_city(stile));
        }
      }
      came_from_context_menu = false; // remove UI-blocking state.
      break;
  }
  if (key != "goto" && key != "delaygoto" && touch_device) {
    deactivate_goto(false);
  }
}

/**************************************************************************
  Activate a regular goto.
**************************************************************************/
function activate_goto()
{
  clear_goto_tiles();
  // Clear state vars so it's ready to immediately path to cursor
  prev_mouse_x = null;   prev_mouse_y = null;   prev_goto_tile = null;
  activate_goto_last(ORDER_LAST, ACTION_COUNT);
}

/**************************************************************************
  Save last focus unit for user-commmand to return to it
**************************************************************************/
function save_last_unit_focus()
{
  if (current_focus == null) return;

  if (current_focus.length>0) last_focus = current_focus[0]; // save last selected unit for command that returns to it
}


/**************************************************************************
  Activate a goto and specify what to do once there.
**************************************************************************/
function activate_goto_last(last_order, last_action)
{
  goto_active = true;

  $("#canvas_div").css("cursor", "crosshair");

  /* Set what the unit should do on arrival. */
  goto_last_order = last_order;
  goto_last_action = last_action;

  if (current_focus.length > 0) {
    if (intro_click_description) {
      if (touch_device) {
        message_log.update({
          event: E_BEGINNER_HELP,
          message: "Carefully drag unit to the tile you want it to go to."
        });
      } else {
        message_log.update({
          event: E_BEGINNER_HELP,
          message: "Click on the tile to send this unit to."
        });
      }
      intro_click_description = false;
    }

  } else {
    message_log.update({
      event: E_BEGINNER_HELP,
      message: "First select a unit to move by clicking on it, then click on the"
             + " goto button or the 'G' key, then click on the position to move to."
    });
    deactivate_goto(false);
  }

}

/**************************************************************************
 ...
**************************************************************************/
function deactivate_goto(will_advance_unit_focus)
{
  //console.log("deactivate_goto called!")
  goto_active = false;
  delayed_goto_active = false;
  $("#canvas_div").css("cursor", "default");
  goto_request_map = {};
  goto_turns_request_map = {};
  prev_goto_tile = null;  // next goto is clear and fresh
  clear_goto_tiles();

  // update focus to next unit after 600ms, except for a nuke: let
  //  them watch of course!
  if (will_advance_unit_focus && !(goto_last_action == ACTION_NUKE))
    setTimeout(update_unit_focus, update_focus_delay);
  /* if leaving goto mode but not advancing, restore unit dialog to
     display unit stats instead of 'turns for goto' */
  else update_active_units_dialog();

  /* Clear the order this action would have performed. */
  goto_last_order = ORDER_LAST;
  goto_last_action = ACTION_COUNT;
}

/**************************************************************************
 Ends the current turn.
**************************************************************************/
function send_end_turn()
{
  if (game_info == null) return;

  $("#turn_done_button").button( "option", "disabled", true);
  if (!touch_device) $("#turn_done_button").tooltip({ disabled: true });
  var packet = {"pid" : packet_player_phase_done, "turn" : game_info['turn']};
  send_request(JSON.stringify(packet));
  update_turn_change_timer();

  if (is_pbem()) {
    setTimeout(pbem_end_phase, 2000);
  }
  if (is_longturn()) {
    show_dialog_message("Turn done!",
      "Your turn in this Freeciv-web: One Turn per Day game is now over. In this game one turn is played every day. " +
      "To play your next turn in this game, go to " + window.location.host + " and click <b>Games</b> in the menu, then <b>Multiplayer</b> " +
      "and there you will find this Freeciv-web: One Turn per Day game in the list. You can also bookmark this page.<br>" +
      "See you again soon!"  );
  }
}


/**************************************************************************
 Tell the units in focus to auto explore.
**************************************************************************/
function key_unit_auto_explore()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_EXPLORE, EXTRA_NONE);
    if (punit['movesleft'] > 0 && punit['owner'] == client.conn.playing.playerno) unit_move_sound_play(punit);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to load on a transport.
**************************************************************************/
function key_unit_load()
{
  /* Client gets no info from server for which cargo is allowed on which
   * transports. So we use pragmatic heuristics to generate a better list
  // for 99.5% of the games played, which are in common rulesets */
  var normal_ruleset = (client_rules_flag[CRF_CARGO_HEURISTIC]);
  var funits = get_units_in_focus();

  // Send command for each selected unit in focus:
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    var ptype = unit_type(punit);
    var ptile = index_to_tile(punit['tile']);
    var transporter_unit_id = 0;
    var transporter_units = [];
    var has_transport_unit = false;
    var units_on_tile = tile_units(ptile);
    var t,r,b, candidate, tunit, ttype, tclass;

    // Make array of candidate transporter units:
    for (t = 0; t < units_on_tile.length; t++) {
      tunit = units_on_tile[t];
      if (tunit['id'] == punit['id']) continue;
      ttype = unit_type(tunit);
      tclass = unit_classes[ttype.unit_class_id];

      if (ttype['transport_capacity'] > 0) {
        // add candidate to list
        if (!normal_ruleset || unit_could_possibly_load(punit, ptype, ttype, tclass)) {
          transporter_units.push( {id: tunit['id'], capacity: ttype['transport_capacity'],
           moves: tunit['movesleft'], carrying: 0} );
        }
      }
    }
    // No candidate transporters found: abort
    if (transporter_units.length < 1) return;

    // if 2 or more candidates, give user a GUI choice what to load on:
    if (transporter_units.length >= 2 /*&& funits.length == 1*/) {
      // Count up how many on each transport candidate:
      for (t = 0; t < units_on_tile.length; t++ ) {
        tunit = units_on_tile[t];
        // For each transported unit, adjust load for candidate transporters:
        if (tunit['transported'] == true) {
          candidate = transporter_units.findIndex(i => i.id === tunit['transported_by']);
          if (candidate != -1) transporter_units[candidate]['carrying'] += 1;  // increment load counter of transporter
        }
      }
      // Make dialog popup with name of unit type/homecity-------------
      var id = "";
      var buttons = [];
      id = "#load_unit_dialog_" + punit['id'];
      $(id).remove();     // Reset dialog page.
      $("<div id='load_unit_dialog_" + punit['id'] + "'></div>").appendTo("div#game_page");

      var home_city_name = "";
      var home_city;
      if (punit['homecity']) home_city = punit['homecity'];
      if (home_city && cities[home_city] && cities[home_city]['name']) {
        home_city_name = " from " + cities[home_city]['name'];
      }
      $(id).attr("title", "Load "+unit_type(punit)['name'] + home_city_name );
      $(id).html("<b>M</b>:Moves <b>L</b>:Loaded <b>C</b>:Capacity<br>");
      //--------------------------------------------------------------------
      // Make buttons for each eligible transport it can load onto:
      for (b = 0; b < transporter_units.length; b++ ) {
         // edit: make button even if transport has no room - just disable it later
         if (true /*|| transporter_units[b]['carrying'] < transporter_units[b]['capacity']*/) {
          var actor = punit['id'];
          var ttile = punit['tile'];
          var dialog_num = i;
          var dialog_id = id;
          var last_dialog = funits.length;

          buttons.push(create_load_transport_button(actor,
                                                    ttile,
                                                    transporter_units[b]['id'],
                                                    transporter_units[b]['moves'],
                                                    transporter_units[b]['carrying'],
                                                    transporter_units[b]['capacity'],
                                                    dialog_id,
                                                    dialog_num,
                                                    last_dialog) );
        }
      }
      buttons.push( create_a_close_button(dialog_id) );

      // Display dialog:
      $(id).dialog({bgiframe: true,
        modal: true,
        position: { my: ("center+" + (i*3) + " center+" + (i*3) ), at: "center" },
        buttons: buttons,
        height: "auto",
        zIndex: 9999,
       /* width: "auto",*/
        width: is_small_screen() ? $( window ).width() : "575",
        fluid: true     });
      $(id).dialog('open');
    }
    // otherwise, only one transporter candidate, load automatically with no GUI input from user:
/* this had a bug and tried loading on the first transporter ID while ignoring the work we did to
   figure out which transporters are real candidates, so it's commented out now to try the candidate
   fix below.
    else {
      for (r = 0; r < units_on_tile.length; r++) {
        tunit = units_on_tile[r];
        if (tunit['id'] == punit['id']) continue;
        ttype = unit_type(tunit);
        if (ttype['transport_capacity'] > 0) {
          has_transport_unit = true;
          transporter_unit_id = tunit['id'];
        }
      }

      if (has_transport_unit && transporter_unit_id > 0 && punit['tile'] > 0) {
        var packet = {
          "pid"              : packet_unit_load,
          "cargo_id"         : punit['id'],
          "transporter_id"   : transporter_unit_id,
          "transporter_tile" : punit['tile']
        };
        send_request(JSON.stringify(packet));
        setTimeout(update_active_units_dialog, update_focus_delay);
      }
    }
*/
    // Only one legal transport, no need to do pop-up to choose which one:
    else {
      // in theory we got here because there was only one (possibly) legal transporter_unit,
      // Looping the array might be needless legacy method but oh well, it's safe.
      for (r = 0; r < transporter_units.length; r++) {
        tunit = units[transporter_units[r]['id']];
        if (tunit['id'] == punit['id']) continue;
        ttype = unit_type(tunit);
        if (ttype['transport_capacity'] > 0) {
          has_transport_unit = true;
          transporter_unit_id = tunit['id'];
        }
      }

      if (has_transport_unit && transporter_unit_id > 0 && punit['tile'] > 0) {
        var packet = {
          "pid"              : packet_unit_load,
          "cargo_id"         : punit['id'],
          "transporter_id"   : transporter_unit_id,
          "transporter_tile" : punit['tile']
        };
        send_request(JSON.stringify(packet));
        setTimeout(update_active_units_dialog, update_focus_delay);
      }
    }
  }
  // Don't advance focus if more than one dialog open, it would reset our focus units
  // which we need for upcoming dialogs for each additional unit
  if (funits.length<2)
    setTimeout(function() {advance_unit_focus(false)}, update_focus_delay);
}

/**************************************************************************
 Unload all units from transport
**************************************************************************/
function key_unit_unload()
{
  var funits = get_units_in_focus();
  var units_on_tile = [];

  // why are we looping to set these ?!
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    var ptile = index_to_tile(punit['tile']);
    units_on_tile = tile_units(ptile);
  }

  for (var i = 0; i < units_on_tile.length; i++) {
    var punit = units_on_tile[i];
    // old command prior to action_enabler ACTION_TRANSPORT_UNLOAD
    if (punit['transported'] && punit['transported_by'] > 0 ) {
      if (unit_can_do_unload(punit)) {
      var packet = {
        "pid"         : packet_unit_unload,
        "cargo_id"    : punit['id'],
        "transporter_id"   : punit['transported_by']
      };
      send_request(JSON.stringify(packet));
    }

    /* pop this in when we get ACTION_TRANSPORT_UNLOAD into server
    if (punit['transported'] && punit['transported_by'] > 0 ) {
      var packet = {
        "pid" : packet_unit_do_action,
        "actor_id"    : punit['transported_by'],
        "target_id"   : punit['id'],
        "extra_id"    : EXTRA_NONE,
        "value"       : 0,
        "name"        : "",
        "action_type" : ACTION_TRANSPORT_UNLOAD
      };
      send_request(JSON.stringify(packet));
    }*/
    }
  }
  deactivate_goto(false);
  setTimeout(function() {advance_unit_focus(false)}, update_focus_delay);
}

/**************************************************************************
 Select all other units on tile with currently selected unit.
**************************************************************************/
function key_select_all_units_on_tile()
{
  var punits = [];
  if (current_focus != null && current_focus.length>0) {
    var punit = current_focus[0];
    var ptile = index_to_tile(punit['tile']);
    var ptype = punit['type'];

    punits = tile_units(ptile);
    for (var i=0; i<punits.length; i++) {
      if ( true /*unit_types[punits[i]['type']]['name'] == unit_types[ptype]['name']*/ ) {
          // make sure it's not already in selection before adding it to selection:
          var index = current_focus.findIndex(x => x.id==punits[i].id);
          if (index === -1) { //index == -1 means it's not in selection, so we add it:
            if (punits[i]['owner'] ==  client.conn.playing.playerno) // only select if owned
              current_focus.push(punits[i]);
          }
      }
    }
    update_active_units_dialog();
  }
}

/**************************************************************************
Select all other units of same TYPE on this tile
**************************************************************************/
function key_select_same_type_units_on_tile()
{
  var punits = [];
  if (current_focus != null && current_focus.length>0) {
    var punit = current_focus[0];
    var ptile = index_to_tile(punit['tile']);
    var ptype = punit['type'];

    punits = tile_units(ptile);
    for (var i=0; i<punits.length; i++) {
      if ( unit_types[punits[i]['type']]['name'] == unit_types[ptype]['name'] ) {
          // make sure it's not already in selection before adding it to selection:
          var index = current_focus.findIndex(x => x.id==punits[i].id);
          if (index === -1) { //index == -1 means it's not in selection, so we add it:
            if (punits[i]['owner'] ==  client.conn.playing.playerno) // only select if owned
              current_focus.push(punits[i]);
          }
      }
    }
    update_active_units_dialog();
  }
}

/**************************************************************************
Select all other units of DIFFERENT type on this tile
**************************************************************************/
function key_select_different_units_on_tile()
{
  var punits = [];
  if (current_focus != null && current_focus.length>0) {
    var punit = current_focus[0];

    save_last_unit_focus();

    current_focus = []; // since we're selecting everything BUT this, it has to unselect too
    var ptile = index_to_tile(punit['tile']);
    var ptype = punit['type'];

    punits = tile_units(ptile);
    for (var i=0; i<punits.length; i++) {
      if ( unit_types[punits[i]['type']]['name'] != unit_types[ptype]['name'] ) {
          // make sure it's not already in selection before adding it to selection:
          var index = current_focus.findIndex(x => x.id==punits[i].id);
          if (index === -1) { //index == -1 means it's not in selection, so we add it:
            current_focus.push(punits[i]);
          }
      }
    }
    update_active_units_dialog();
  }
}

/**************************************************************************
Select all units of same type either globally or on same continent
**************************************************************************/
function key_select_same_global_type(continent_only)
{
  //console.log("key_select_same_type_on_continent");

  if (current_focus != null && current_focus.length>0) {
    var punit = current_focus[0];
    var ptile = index_to_tile(punit['tile']);
    var ptype = punit['type'];

    //console.log(unit_types[ptype]['name']+" selected on continent "+ptile['continent']);

    save_last_unit_focus();

    current_focus = [];  // clear focus to start adding new units to selection

    //console.log(units.length+" is units.length");
    // check every unit in the world
    for (var unit_id in units) {
      var aunit = units[unit_id];
      //console.log("Checking unit "+unit_id+", which is a "+unit_types[aunit['type']]['name']+" on continent "+tiles[aunit['tile']]['continent'] );
      // if unit belong to player
      if ( aunit['owner'] == client.conn.playing.playerno ) {
          //console.log("...owner check passed.");
          // ...and unit is on same continent as original unit
          if ( (tiles[aunit['tile']]['continent']==ptile['continent']) || !continent_only ) {
              //console.log("......continent check passed.");
              // ...and unit is of same type as original unit
              if ( unit_types[aunit['type']]['name'] == unit_types[ptype]['name'] ) {
                // add to current selection
                //console.log(".........type check passed.");
                current_focus.push(units[unit_id]);
              }
            }
          }
      }
    }
    update_active_units_dialog();
}

/**************************************************************************
 Deselect any units that are not waiting for orders, or select all that are
 waiting for orders if selection is empty
**************************************************************************/
function key_filter_for_units_in_queue() {
  if (client_is_observer()) return null;

  var punit;
  if (current_focus.length > 0) {
    var funits = get_units_in_focus();
    for (var i = funits.length - 1; i >= 0; i--){ // goes backwards to not mess
      punit = funits[i];                          // with indices of current_focus

      if  (client.conn.playing != null                    // if unit already has
      && !(punit['owner'] == client.conn.playing.playerno // orders, deselect
        && punit['activity'] == ACTIVITY_IDLE
        && punit['movesleft'] > 0
        && punit['done_moving'] == false
        && punit['ai'] == false
        && punit['transported'] == false)) {
          current_focus.splice(i, 1);
      }
    }
  } else {
    for (var unit_id in units) {
      punit = units[unit_id];
      if  (client.conn.playing != null                    // select all units
      && (punit['owner'] == client.conn.playing.playerno // w/o orders
        && punit['activity'] == ACTIVITY_IDLE
        && punit['movesleft'] > 0
        && punit['done_moving'] == false
        && punit['ai'] == false
        && punit['transported'] == false)) {
          current_focus.push(punit);
      }
    }
  }
  update_active_units_dialog();
}

/**************************************************************************
 Focus a unit transported by this transport unit
**************************************************************************/
function key_unit_show_cargo()
{
  var funits = get_units_in_focus();
  var units_on_tile = [];
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    var ptile = index_to_tile(punit['tile']);
    units_on_tile = tile_units(ptile);
  }

  save_last_unit_focus();

  current_focus = [];
  for (var i = 0; i < units_on_tile.length; i++) {
    var punit = units_on_tile[i];
    if (punit['transported'] && punit['transported_by'] > 0 ) {
      current_focus.push(punit);
    }
  }
  deactivate_goto(false);
  update_active_units_dialog();
  if (current_focus.length>0) warcalc_set_default_vals(current_focus[0]);
  update_unit_order_commands();
}

/**************************************************************************
 Tell the unit to wait (focus to next unit with moves left)
**************************************************************************/
function key_unit_wait(same_type)
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    waiting_units_list.push(punit['id']);
  }
  deactivate_goto(false);
  advance_unit_focus(same_type);
}

/**************************************************************************
 Tell the unit to have no orders this turn, set unit to done moving.
**************************************************************************/
function key_unit_noorders()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    punit['done_moving'] = true;
  }
  deactivate_goto(false);
  advance_unit_focus(false);
}

/**************************************************************************
 Tell the units to stop what they are doing.
**************************************************************************/
function key_unit_idle()
{
  // unit will refocus on itself, so remove ui-blocking state
  came_from_context_menu = false;

  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_IDLE, EXTRA_NONE);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units to vigil the tile (autoattack anyone adjacent)
**************************************************************************/
function key_unit_vigil()
{
  // unit will refocus on itself, so remove ui-blocking state
  came_from_context_menu = false;

  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    if (unit_can_vigil(punit)) {
      request_new_unit_activity(punit, ACTIVITY_VIGIL, EXTRA_NONE);
    }
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to sentry.
**************************************************************************/
function key_unit_sentry()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];

    // Hack to fix 3.09 server can't sentry fuel-Triremes on shore/river. Remove if FC server fixed:
    if (get_unit_class_name(punit) == "Trireme") {
      if (punit['fuel']>0) {
         var pcity = tile_city(index_to_tile(punit['tile']));
         if (pcity == null) {
           key_unit_noorders();
         }
         else request_new_unit_activity(punit, ACTIVITY_SENTRY, EXTRA_NONE);
      }
    }
    else request_new_unit_activity(punit, ACTIVITY_SENTRY, EXTRA_NONE);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to fortify.
**************************************************************************/
function key_unit_fortify()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_FORTIFYING, EXTRA_NONE);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to build base.
**************************************************************************/
function key_unit_fortress()
{
  //navalbase no longer goes on top of fortress, they both go on top of fort
  //var navbase_rules = (typeof EXTRA_NAVALBASE !== "undefined");

  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    //var ptile = tiles[punit['tile']];
    var activity = EXTRA_NONE;     /* EXTRA_NONE -> server decides */
    request_new_unit_activity(punit, ACTIVITY_BASE, activity);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to build a hideout
**************************************************************************/
function key_unit_hideout()
{
  var hideout_rules = false; // whether ruleset has hideouts turned ON

  if (server_settings['hideouts']) {
    hideout_rules = (client_rules_flag[CRF_EXTRA_HIDEOUT])
                     && server_settings['hideouts']['val'];
  }

  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    var ptile = tiles[punit['tile']];
    var activity = EXTRA_NONE;     /* EXTRA_NONE -> server decides */
    if (hideout_rules) activity=EXTRA_;

    request_new_unit_activity(punit, ACTIVITY_BASE, activity);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to build airbase (or Radar on top of it).
**************************************************************************/
function key_unit_airbase()
{
  var radar_rules = client_rules_flag[CRF_RADAR_TOWER];
  var activity = EXTRA_AIRBASE;

  var funits = get_units_in_focus();
  for (var i=0; i< funits.length; i++) {
    var punit = funits[i];
    var ptile = tiles[punit['tile']];
    activity = EXTRA_AIRBASE;
    if (radar_rules && tile_has_extra(ptile, EXTRA_AIRBASE)) activity=EXTRA_RADAR;

    request_new_unit_activity(punit, ACTIVITY_BASE, activity);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to irrigate.
**************************************************************************/
function key_unit_irrigate()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    /* EXTRA_NONE -> server decides */
    request_new_unit_activity(punit, ACTIVITY_IRRIGATE, EXTRA_NONE);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units to remove pollution.
**************************************************************************/
function key_unit_pollution()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_POLLUTION, EXTRA_NONE);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}


/**************************************************************************
  Start a goto that will end in the unit(s) detonating in a nuclear
  exlosion.
**************************************************************************/
function key_unit_nuke()
{
  var funits = get_units_in_focus();
  if (funits==null) return;

  var punit = funits[0];
  if (unit_can_do_action(punit, ACTION_NUKE)) {
    /* The last order of the goto is the nuclear detonation. */
    message_log.update({event: E_BEGINNER_HELP,message: "** WARNING!! ** Unit will detonate upon arrival. Choose target location..."});
    if (!touch_device)
      message_log.update({event: E_BEGINNER_HELP,message: "...or hit 'D' twice to detonate current location.<br>"});

    activate_goto_last(ORDER_PERFORM_ACTION, ACTION_NUKE);
  }
}

/**************************************************************************
 Tell the units to upgrade.
**************************************************************************/
function key_unit_upgrade()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    var pcity = tile_city(index_to_tile(punit['tile']));
    var target_id = (pcity != null) ? pcity['id'] : 0;
    var packet = {
      "pid"         : packet_unit_do_action,
      "actor_id"    : punit['id'],
      "target_id"   : target_id,
      "extra_id"    : EXTRA_NONE,
      "value"       : 0,
      "name"        : "",
      "action_type" : ACTION_UPGRADE_UNIT
    };
    send_request(JSON.stringify(packet));
  }
  deactivate_goto(false);
  setTimeout(update_active_units_dialog, update_focus_delay*.85);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units to paradrop.
**************************************************************************/
function key_unit_paradrop()
{
  paradrop_active = true;
  message_log.update({
    event: E_BEGINNER_HELP,
    message: "Click on the tile to send this paratrooper to."
  });
}

/**************************************************************************
 Tell the units to airlift.
**************************************************************************/
function key_unit_airlift()
{
  airlift_active = true;
  message_log.update({
    event: E_BEGINNER_HELP,
    message: "Click on the city to airlift this unit to."
  });
}

/**************************************************************************
 Tell the units to remove nuclear fallout.
**************************************************************************/
function key_unit_fallout()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_FALLOUT, EXTRA_NONE);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units to transform the terrain.
**************************************************************************/
function key_unit_transform()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_TRANSFORM, EXTRA_NONE);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to pillage.
**************************************************************************/
function key_unit_pillage()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    var tgt = get_what_can_unit_pillage_from(punit, null);
    //if (tgt) console.log("Unit can pillage "+tgt.length+" targets: "+tgt);
    if (tgt.length > 0) {
      if (tgt.length == 1) {
        request_new_unit_activity(punit, ACTIVITY_PILLAGE, EXTRA_NONE);
      } else {
        popup_pillage_selection_dialog(punit);
      }
    }
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to convert to other unit type.
**************************************************************************/
function key_unit_convert()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    /* EXTRA_NONE -> server decides */
    request_new_unit_activity(punit, ACTIVITY_CONVERT, -1)
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to mine.
**************************************************************************/
function key_unit_mine()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    /* EXTRA_NONE -> server decides */
    request_new_unit_activity(punit, ACTIVITY_MINE, EXTRA_NONE);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Check whether a unit can vigil.
**************************************************************************/
function unit_can_vigil(punit)
{
  // Hard coded for now until we get action enablers
  var ptype = unit_type(punit);
  var name = ptype['name'];
  var moves_used = (parseFloat(ptype['move_rate']) / parseFloat(SINGLE_MOVE))
                 - (parseFloat(punit['movesleft']) / parseFloat(SINGLE_MOVE));

  // For now Vigil is only for these server settings:
  if (server_settings["autoattack"]["val"] != true) return false;
  if (server_settings["autoattack_style"]["val"] == 0) return false;

    switch (name) {
      case "Fighter":
        if (moves_used <= 2)
          return true;
        break;
      case "Escort Fighter":
        if (moves_used <= 3)
          return true;
        break;
      case "Jet Fighter":
        if (moves_used <= 3)
          return true;
        break;
      case "Stealth Fighter":
        if (moves_used <= 4)
          return true;
        break;
    }
  return false;
}


/**************************************************************************
 Check whether a unit can build a maglev in a tile.
**************************************************************************/
function can_build_maglev(punit, ptile)
{
  return ((typeof EXTRA_MAGLEV !== "undefined")
      &&  (punit != null && ptile != null)
      &&  (!tile_has_extra(ptile, EXTRA_MAGLEV))
      &&  (tile_has_extra(ptile, EXTRA_RAIL))
      &&  (unit_can_do_action(punit, ACTION_ROAD))
      &&  (player_invention_state(client.conn.playing, tech_id_by_name('Superconductors')) == TECH_KNOWN)
      &&  ((!tile_has_extra(ptile, EXTRA_RIVER))
           || (player_invention_state(client.conn.playing, tech_id_by_name('Bridge Building')) == TECH_KNOWN))
         );
}

/**************************************************************************
 Check whether a unit can build a "well" (river) on a tile.
**************************************************************************/
function can_build_well(punit, ptile)
{
  /* Wells don't need lowland, but we may consider changing it later.
  var is_lowland = (tile_terrain(ptile)['name'] != 'Hills'
                   && tile_terrain(ptile)['name'] != 'Mountains');
  */

  return ( (punit != null && ptile != null)
      &&  (!tile_has_extra(ptile, EXTRA_RIVER))
      &&  tile_owner(ptile) == punit['owner']
      &&  (unit_types[punit['type']]['name'] == "Well-Digger")
/*      &&  (is_lowland)  */
      &&  (player_invention_state(client.conn.playing, tech_id_by_name('Pottery')) != TECH_KNOWN)
      &&  (player_invention_state(client.conn.playing, tech_id_by_name('Alphabet')) != TECH_KNOWN)
         );
}
/**************************************************************************
 Tell the unit(s) in focus to build a "well" (river)
**************************************************************************/
function key_unit_well()
{
  const funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const ptile = index_to_tile(punit['tile']);
    if (can_build_well(punit, ptile)) {
      request_new_unit_activity(punit, ACTIVITY_GEN_ROAD, extras['River']['id']);
    }
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Returns whether a unit can build a canal on a tile. Instead of true,
 returns the EXTRA_CANAL or EXTRA_WATERWAY code for which kind to make,
 otherwise returns false.
**************************************************************************/
function can_build_canal(punit, ptile)
{
  var is_lowland = (tile_terrain(ptile)['name'] != 'Hills'
                   && tile_terrain(ptile)['name'] != 'Mountains');

  var water_near = 0; // whether water is near; and then, if it is, what type
                          // of canal gets enabled by it (canal or waterway)

  // Check for water near:
  for (var dir = 0; dir < 8; dir++) {
    /* Check if there is adjacent ocean/deep ocean/lake */
    var tile1 = mapstep(ptile, dir);
    if (tile1 != null) {
        if (terrains[tile1['terrain']]['name'] == "Lake"
        || terrains[tile1['terrain']]['name'] == "Ocean"
        || terrains[tile1['terrain']]['name'] == "Deep Ocean") {
          water_near = EXTRA_CANAL;
          break;
        }
        // CRF_EXTRA_QUAY says if ruleset has waterways, which can be made with river near:
        else if ( client_rules_flag[CRF_EXTRA_QUAY] && tile_has_extra(tile1, EXTRA_RIVER) ) {
          water_near = EXTRA_WATERWAY;
          break;
        }
    }
  }

  if ((typeof EXTRA_CANAL !== "undefined")
      &&  (punit != null && ptile != null)
      &&  (!tile_has_extra(ptile, EXTRA_CANAL))
      &&  (unit_can_do_action(punit, ACTION_ROAD))
      && (is_lowland)
      && (water_near)
      &&  (player_invention_state(client.conn.playing, tech_id_by_name('Engineering')) == TECH_KNOWN) ) {

        return water_near; // serves as a code for whether to make Canal or Waterway extra.
      }

  return 0; // i.e., false, no type allowed (not canal nor waterway)
/*  return ((typeof EXTRA_CANAL !== "undefined")
      &&  (punit != null && ptile != null)
      &&  (!tile_has_extra(ptile, EXTRA_CANAL))
      &&  (unit_can_do_action(punit, ACTION_ROAD))
      && (is_lowland)
      && (water_near)
      &&  (player_invention_state(client.conn.playing, tech_id_by_name('Engineering')) == TECH_KNOWN)
         ); */
}

/**************************************************************************
 Check whether a unit can build a quay on a tile.
**************************************************************************/
function can_build_quay(punit, ptile)
{
  const domestic = (ptile['owner'] == client.conn.playing.playerno)
  var ptype = unit_type(punit);

  if (ptype['name'] == "Legion") {
    if ( (domestic) && !tile_has_extra(ptile, EXTRA_FORT) )
      return false;
  }

  return ((typeof EXTRA_QUAY !== "undefined")
      &&  (punit != null && ptile != null)
      &&  (!tile_has_extra(ptile, EXTRA_QUAY))
      &&  (!tile_has_extra(ptile, EXTRA_))
      &&  (tile_has_extra(ptile, EXTRA_RIVER)
           || tile_has_extra(ptile, EXTRA_CANAL)
           || tile_has_extra(ptile, EXTRA_WATERWAY))
      &&  (unit_can_do_action(punit, ACTION_ROAD))
      &&  (player_invention_state(client.conn.playing, tech_id_by_name('Pottery')) == TECH_KNOWN)
         );
}

/**************************************************************************
 Check whether a unit can literally "Irrigate" a tile:
   The "irrigate" command per se, NOT "chop forest" or "build farmland"
**************************************************************************/
function can_irrigate(punit, ptile)
{
  // For performance, check simple things first and exit with results
  if (punit == null || ptile == null)
    return false;
  if (!unit_can_do_action(punit, ACTION_IRRIGATE))
    return false;

  // Can always change swamp/jungle to grass:
  var terrain_name = tile_terrain(ptile)['name'];
  if (terrain_name=="Swamp" || terrain_name=="Jungle")
    return true;

  // Check for non-irrigable terrain types:
  var invalid_terrain = (terrain_name == 'Mountains'
                      || terrain_name == 'Lake'
                      || terrain_name == 'Ocean'
                      || terrain_name == 'Deep Ocean'
                      || terrain_name == 'Forest' // Chop Forest command is different
                      || terrain_name == 'Glacier'
                      );
  invalid_terrain = invalid_terrain || tile_has_extra(ptile, EXTRA_IRRIGATION); // Farmland is separate command
  if (invalid_terrain)
    return false;

  // Check central tile for water source:
  var water_near = tile_has_extra(ptile, EXTRA_RIVER) // irrigation is also a water source but, it's already irrigated! ;)
      || (tile_has_extra(ptile, EXTRA_OASIS) && (client_rules_flag[CRF_OASIS_IRRIGATE]));

  // If no water on occupied tile, check cardinally adjacent:
  if (!water_near) {
    for (var dir = 1; dir < 7; dir++) {
      if (dir==2 || dir==5)
        continue; // only check cardinal dir 1,3,4,6 (N,W,E,S)

      var cadj_tile = mapstep(ptile, dir);
      if (cadj_tile != null) {
        terrain_name = tile_terrain(cadj_tile)['name'];
        if (terrain_name == "Lake"
         || terrain_name == "Ocean"
         || terrain_name == "Deep Ocean"
         || tile_has_extra(cadj_tile, EXTRA_IRRIGATION)
         || tile_has_extra(cadj_tile, EXTRA_RIVER)
         || (tile_has_extra(cadj_tile, EXTRA_OASIS) && (client_rules_flag[CRF_OASIS_IRRIGATE])) ) {
            water_near = true;
            break; // one adjacent water is all that's needed
        }
      }
    }
  }
  if (water_near)
    return true;

  if (unit_types[punit['type']]['name'] == "Well-Digger")
    return true; // met all requirements except water_near, which it doesn't need

  return false;
}

/**************************************************************************
 Check whether a unit can build a naval base on a tile.
**************************************************************************/
function can_build_naval_base(punit, ptile)
{
  if (!tile_has_extra(ptile, EXTRA_FORT)) return false;

  var is_lowland = (tile_terrain(ptile)['name'] != 'Hills'
                   && tile_terrain(ptile)['name'] != 'Mountains');

  var water_near = false;

  /* Check if there is CAdjacent ocean/deep ocean/lake */
  for (var dir = 1; dir < 7; dir++) {
    if (dir==2 || dir==5)
      continue; // only check cardinal dir 1,3,4,6 (N,W,E,S)
    // check for water:
    var tile1 = mapstep(ptile, dir);
    if (tile1 != null) {
        if (terrains[tile1['terrain']]['name'] == "Lake"
        || terrains[tile1['terrain']]['name'] == "Ocean"
        || terrains[tile1['terrain']]['name'] == "Deep Ocean" ) {
          water_near = true;
          break;
        }
    }
  }

  return ((typeof EXTRA_NAVALBASE !== "undefined")
            && (punit != null && ptile != null)
            && (unit_can_do_action(punit, ACTION_BASE))
            && (is_lowland)
            && (water_near)
            && (player_invention_state(client.conn.playing, tech_id_by_name('Engineering')) == TECH_KNOWN)
         );
}

/**************************************************************************
 Tell the units in focus to build canal.
**************************************************************************/
function key_unit_canal()
{
  if (typeof EXTRA_CANAL === "undefined") return;

  const funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const ptile = index_to_tile(punit['tile']);
    var allowed_type = can_build_canal(punit, ptile); //EXTRA_CANAL or EXTRA_WATERWAY
    if (allowed_type) {
      request_new_unit_activity(punit, ACTIVITY_GEN_ROAD, allowed_type/*extras['Canal']['id']*/);
    }
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to build naval base.
**************************************************************************/
function key_unit_naval_base()
{
  if (typeof EXTRA_NAVALBASE === "undefined") return;

  /* Wonderful HACK:
      FC 3.0 server checks if a conflicting action is being done on the tile
      BEFORE changing action; thus a unit can't change to a new action that
      conflicts with the old action you try to replace (how genius!). Because
      naval base conflicts with airbase, it's often
      falsely "illegal" to change your mind. Here we fix half the cases
      by canceling the current action first. */
  const funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    const punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_IDLE, EXTRA_NONE);
  }


  // Now send orders after brief delay to let the cancelled orders stick:
  setTimeout( function() {
    for (var i = 0; i < funits.length; i++) {
      const punit = funits[i];
      const ptile = index_to_tile(punit['tile']);
      if (can_build_naval_base(punit, ptile)) {
        request_new_unit_activity(punit, ACTIVITY_BASE, EXTRA_NAVALBASE);
      }
    }},     200);
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Tell the units in focus to build road or railroad.
**************************************************************************/
function key_unit_road()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    var ptile = index_to_tile(punit['tile']);

    if (unit_types[punit['type']]['name'] == "Well-Digger")
      request_new_unit_activity(punit, ACTIVITY_GEN_ROAD, extras['River']['id']);
    else if (!tile_has_extra(ptile, EXTRA_ROAD)) {
      request_new_unit_activity(punit, ACTIVITY_GEN_ROAD, extras['Road']['id']);
    } else if (!tile_has_extra(ptile, EXTRA_RAIL)) {
      request_new_unit_activity(punit, ACTIVITY_GEN_ROAD, extras['Railroad']['id']);
    } else if (can_build_maglev(punit, ptile)) {
      request_new_unit_activity(punit, ACTIVITY_GEN_ROAD, extras['Maglev']['id']);
    }
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}


/**************************************************************************
 Tell the units in focus to build a quay
**************************************************************************/
function key_unit_quay()
{
  var quay_rules = client_rules_flag[CRF_EXTRA_QUAY];

  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    var ptile = tiles[punit['tile']];
    var activity = EXTRA_NONE;     /* EXTRA_NONE -> server decides */
    if (quay_rules) activity=EXTRA_QUAY;

    request_new_unit_activity(punit, ACTIVITY_GEN_ROAD, activity);
  }
  deactivate_goto(false);
  setTimeout(update_unit_focus, update_focus_delay);
}

/**************************************************************************
 Changes unit homecity to the city on same tile.
**************************************************************************/
function key_unit_homecity()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    var ptile = index_to_tile(punit['tile']);
    var pcity = tile_city(ptile);

    if (pcity != null) {
      var packet = {"pid" : packet_unit_do_action,
                    "actor_id" : punit['id'],
                    "target_id": pcity['id'],
                    "extra_id" : EXTRA_NONE,
                    "value" : 0,
                    "name" : "",
                    "action_type": ACTION_HOME_CITY};
      send_request(JSON.stringify(packet));
      $("#order_change_homecity").hide();
    }
  }
  deactivate_goto(false);
}

/**************************************************************************
  Show action selection dialog for unit(s).
**************************************************************************/
function key_unit_action_select()
{
  if (action_tgt_sel_active == true) {
    /* The 2nd key press means that the actor should target its own
     * tile. */
    action_tgt_sel_active = false;

    /* Target tile selected. Clean up hover state. */
    request_unit_act_sel_vs_own_tile();
  } else {
    action_tgt_sel_active = true;
    message_log.update({
      event: E_BEGINNER_HELP,
      message: "Click on a tile to act against it. "
             + "Press 'd' again to act against own tile."
    });
  }
  deactivate_goto(false);
}

/**************************************************************************
  An action selection dialog for the selected units against the specified
  tile is wanted.
**************************************************************************/
function request_unit_act_sel_vs(ptile)
{
  var funits = get_units_in_focus();

  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    var packet = {
      "pid"     : packet_unit_sscs_set,
      "unit_id" : punit['id'],
      "type"    : USSDT_QUEUE,
      "value"   : ptile['index']
    };

    /* Have the server record that an action decision is wanted for this
     * unit. */
    send_request(JSON.stringify(packet));
  }
}

/**************************************************************************
  An action selection dialog for the selected units against its own tile.
**************************************************************************/
function request_unit_act_sel_vs_own_tile()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    var packet = {
      "pid"     : packet_unit_sscs_set,
      "unit_id" : punit['id'],
      "type"    : USSDT_QUEUE,
      "value"   : punit['tile']
    };

    /* Have the server record that an action decision is wanted for this
     * unit. */
    send_request(JSON.stringify(packet));
  }
}

/**************************************************************************
  Call to request (from the server) that the focus unit is put into
  autosettler mode.
**************************************************************************/
function key_unit_auto_settle()
{
  var funits = get_units_in_focus();
  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    request_unit_autosettlers(punit);
  }
  setTimeout(update_unit_focus, update_focus_delay);
  deactivate_goto(false);
}



/**************************************************************************
  Ask the server to cancel unit orders, if any.
**************************************************************************/
function request_unit_cancel_orders(punit)
{
  if (punit != null && (punit.ai || punit.has_orders)) {
    punit.ai = false;
    punit.has_orders = false;
    var packet = {
      pid: packet_unit_orders,
      unit_id: punit.id,
      src_tile: punit.tile,
      length: 0,
      repeat: false,
      vigilant: false,
      dest_tile: punit.tile
    };
    packet.orders = packet.dir = packet.activity = packet.target
                  = packet.extra = packet.action = [];
    send_request(JSON.stringify(packet));
  }
}

/**************************************************************************
 ...
**************************************************************************/
function request_new_unit_activity(punit, activity, target)
{
  request_unit_cancel_orders(punit);
  var packet = {"pid" : packet_unit_change_activity, "unit_id" : punit['id'],
                "activity" : activity, "target" : target };
  //if (DEBUG_LOG_PACKETS) console.log("Sending action request: "+JSON.stringify(packet));
  send_request(JSON.stringify(packet));
}


/****************************************************************************
  Call to request (from the server) that the settler unit is put into
  autosettler mode.
****************************************************************************/
function request_unit_autosettlers(punit)
{
  if (punit != null ) {
    request_unit_cancel_orders(punit);
    var packet = {"pid" : packet_unit_autosettlers, "unit_id" : punit['id']};
    send_request(JSON.stringify(packet));
  }
}


/****************************************************************************
  Request that a city is built.
****************************************************************************/
function request_unit_build_city()
{
  if (current_focus.length > 0) {
    var punit = current_focus[0];
    if (punit != null) {

      if (punit['movesleft'] == 0) {
        message_log.update({
          event: E_BAD_COMMAND,
          message: "Unit has no moves left to build city"
        });
        return;
      }

      var ptype = unit_type(punit);
      if (true /*reserved for leglity checking, we just let server disallow for now*/) {
        var packet = null;
        var target_city = tile_city(index_to_tile(punit['tile']));

        /* Do Join City if located inside a city. */
        if (target_city == null) {
          packet = {"pid" : packet_city_name_suggestion_req,
            "unit_id"     : punit['id'] };
            send_request(JSON.stringify(packet));
        } else {
          packet = {"pid" : packet_unit_do_action,
            "actor_id"    : punit['id'],
            "target_id"   : target_city['id'],
            "extra_id"    : EXTRA_NONE,
            "value"       : 0,
            "name"        : "",
            "action_type" : ACTION_JOIN_CITY };

            swal({
              title: 'Add '+ptype['name']+' to \n'+target_city['name']+'?',
              text: 'Unit will add +1 population and expire.',
              type: 'info',
              background: '#a19886',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Yes',
              cancelButtonText: 'No'
          },
          function(){
             send_request(JSON.stringify(packet));
          });
        }
      }
    }
  }
}

/**************************************************************************
 Tell the units in focus to disband.
**************************************************************************/
function key_unit_disband()
{

  swal({
    title: "Disband unit?",
    text: "Do you want to destroy this unit?",
    type: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DD6B55",
    confirmButtonText: "Yes, disband unit.",
    closeOnConfirm: true
},
  function(){
    var funits = get_units_in_focus();
    for (var i = 0; i < funits.length; i++) {
      var punit = funits[i];
      var packet = null;
      var target_city = tile_city(index_to_tile(punit['tile']));

      /* Do Recycle Unit if located inside a city. */
      /* FIXME: Only rulesets where the player can do Recycle Unit to all
      * domestic and allied cities are supported here. */
      packet = {
        "pid"         : packet_unit_do_action,
        "actor_id"    : punit['id'],
        "target_id"   : (target_city == null ? punit['id']
                                            : target_city['id']),
        "extra_id"    : EXTRA_NONE,
        "value"       : 0,
        "name"        : "",
        "action_type" : (target_city == null ? ACTION_DISBAND_UNIT
                                            : ACTION_RECYCLE_UNIT)
      };

      send_request(JSON.stringify(packet));
    }
    setTimeout(update_unit_focus, update_focus_delay);
    setTimeout(update_active_units_dialog, update_focus_delay+100);
  });
  deactivate_goto(false);
}

/**************************************************************************
 Move the unit(s) in focus in the specified direction.
**************************************************************************/
function key_unit_move(dir)
{
  var funits = get_units_in_focus();
  if (!funits || funits.length<1) return;

  for (var i = 0; i < funits.length; i++) {
    var punit = funits[i];
    if (punit == null) {
      return;
    }
    var ptile = index_to_tile(punit['tile']);
    if (ptile == null) {
      return;
    }
    var newtile = mapstep(ptile, dir);
    if (newtile == null) {
      return;
    }

    /* Send the order to move using the orders system. */
    var packet = {
      "pid"      : packet_unit_orders,
      "unit_id"  : punit['id'],
      "src_tile" : ptile['index'],
      "length"   : 1,
      "repeat"   : false,
      "vigilant" : false,
      "orders"   : [ORDER_ACTION_MOVE],
      "dir"      : [dir],
      "activity" : [ACTIVITY_LAST],
      "target"   : [0],
      "extra"    : [EXTRA_NONE],
      "action"   : [ACTION_COUNT],
      "dest_tile": newtile['index']
    };
    send_request(JSON.stringify(packet));
    if (punit['movesleft'] > 0 && punit['owner'] == client.conn.playing.playerno) unit_move_sound_play(punit);
  }
  deactivate_goto(true);
}

/**************************************************************************
 Move the unit s in the focused/selected stack in the specified direction.
**************************************************************************/
function key_unit_move_focus_index(dir, s)
{
  if (current_focus.length > 0 /* && current_focus.length >=s << don't know if this is necessary */) {
    var punit = current_focus[s];
    if (punit == null) {
      return;
    }

    var ptile = index_to_tile(punit['tile']);
    if (ptile == null) {
      return;
    }

    var newtile = mapstep(ptile, dir);
    if (newtile == null) {
      return;
    }

    /* Send the order to move using the orders system. */
    var packet = {
      "pid"      : packet_unit_orders,
      "unit_id"  : punit['id'],
      "src_tile" : ptile['index'],
      "length"   : 1,
      "repeat"   : false,
      "vigilant" : false,
      "orders"   : [ORDER_ACTION_MOVE],
      "dir"      : [dir],
      "activity" : [ACTIVITY_LAST],
      "target"   : [0],
      "extra"    : [EXTRA_NONE],
      "action"   : [ACTION_COUNT],
      "dest_tile": newtile['index']
    };

    send_request(JSON.stringify(packet));
    if (punit['movesleft'] > 0 && punit['owner'] == client.conn.playing.playerno) unit_move_sound_play(punit);
  }

  deactivate_goto(true);
}

/**************************************************************************
 ...Paste encoded link to a tile or unit into chatbox input
**************************************************************************/
function key_paste_link_under_cursor()
{
  var ptile = canvas_pos_to_tile(mouse_x, mouse_y)
  var pcity = tile_city(ptile);

  //Check for a unit
  //-----------------------------------------------------------------------
  var sunits = tile_units(ptile);
  var own_unit_index = -1; // -1 means player has none of own units present
  var player_has_own_unit_present = false;

  if (pcity == null && sunits != null && sunits.length > 0 ) {
    // Check that one of the units belongs to player
    var own_unit_index = -1; // -1 means player has none of own units present

    // Find the first unit that belongs to the player:
    for (var u = 0; u < sunits.length; u++) {
      if (sunits[u]['owner'] == client.conn.playing.playerno)            {
        own_unit_index = u; //player wants to select his own unit first, not a foreign unit
        player_has_own_unit_present = true;
      }
      if (player_has_own_unit_present) break;
    }

    /* Copy player's first unit in stack; or else first non-player unit on tile
      * if player doesn't have own unit */
    var selected_index = own_unit_index == -1 ? 0 : own_unit_index;
    var name = unit_types[sunits[selected_index]['type']]['name'];
    var nationality = nations[players[sunits[selected_index]['owner']]['nation']]['adjective'];
    $("#game_text_input").val($("#game_text_input").val() + "%%unit"+sunits[selected_index]['id']+"_%"+nationality+" "+name+"~~ ");
    copy_string_to_clipboard("%%%unit"+sunits[selected_index]['id']+"_%"+nationality+" "+name+"~~ "); // %%% instead of %% makes it sendable to oneself
  } else {  // if no unit present, then give just a link to the tile:
    $("#game_text_input").val($("#game_text_input").val() + "%%tile"+ptile['index']+"~% ");
    copy_string_to_clipboard("%%%tile"+ptile['index']+"~% "); // %%% instead of %% makes it sendable to oneself
  }
  add_client_message("Link copied to clipboard.");

  $("#game_text_input").focus();  // default user to be ready to hit Enter or continue typing
}


/**************************************************************************
 ...
**************************************************************************/
function process_diplomat_arrival(pdiplomat, target_tile_id)
{
  var ptile = index_to_tile(target_tile_id);

  /* No queue. An action selection dialog is opened at once. If multiple
   * action selection dialogs are open at once one will hide all others.
   * The hidden dialogs are based on information from the time they
   * were opened. It is therefore more outdated than it would have been if
   * the server was asked the moment before the action selection dialog
   * was shown.
   *
   * The C client's bundled with Freeciv asks right before showing the
   * action selection dialog. They used to have a custom queue for it.
   * Freeciv patch #6601 (SVN r30682) made the desire for an action
   * decision a part of a unit's data. They used it to drop their custom
   * queue and move unit action decisions to the unit focus queue. */

  if (pdiplomat != null && ptile != null) {
    /* Ask the server about what actions pdiplomat can do. The server's
     * reply will pop up an action selection dialog for it. */
    var packet = {
      "pid" : packet_unit_get_actions,
      "actor_unit_id" : pdiplomat['id'],
      "target_unit_id" : IDENTITY_NUMBER_ZERO,
      "target_tile_id": target_tile_id,
      "target_extra_id": EXTRA_NONE,
      "disturb_player": true
    };
    send_request(JSON.stringify(packet));
  }
}

/****************************************************************************
  Request GOTO path for unit with unit_id, and dst_x, dst_y in map coords.
****************************************************************************/
function request_goto_path(unit_id, dst_x, dst_y)
{
  //console.log("   request_goto_path("+dst_x+","+dst_y+") is " + request_goto_path.caller);

  if (goto_request_map[unit_id + "," + dst_x + "," + dst_y] == null) {
    goto_request_map[unit_id + "," + dst_x + "," + dst_y] = true;

    var packet = {"pid" : packet_goto_path_req, "unit_id" : unit_id,
                  "goal" : map_pos_to_tile(dst_x, dst_y)['index']};
    send_request(JSON.stringify(packet));
    current_goto_turns = null;
    $("#unit_text_details").html("Choose unit goto");
    setTimeout(update_mouse_cursor, update_mouse_cursor_delay);
  } else {
    update_goto_path(goto_request_map[unit_id + "," + dst_x + "," + dst_y]);
  }
}

/****************************************************************************
...
****************************************************************************/
function check_request_goto_path()
{
  //console.log("   check_request_goto_path called by " + check_request_goto_path.caller.toString().substring(1,35));
  var ptile;
  // TO DO: function only called if goto_active so we can remove check for that
  if (goto_active && current_focus.length > 0
      && (prev_mouse_x != mouse_x || prev_mouse_y != mouse_y || prev_goto_tile<=LAST_FORCED_CHECK)) {

    if (renderer == RENDERER_2DCANVAS) {
      ptile = canvas_pos_to_tile(mouse_x, mouse_y);
    } else {
      ptile = webgl_canvas_pos_to_tile(mouse_x, mouse_y);
    }
    if (ptile != null) {
      if (ptile['tile'] != prev_goto_tile) {
        clear_goto_tiles(); // TO DO: goto tiles should not be in tiles[tild_id][goto_dir] which takes forever to clear, but their own array instead
        /* Send request for goto_path to server. */
        for (var i = 0; i < current_focus.length; i++) {
          request_goto_path(current_focus[i]['id'], ptile['x'], ptile['y']);
        }
      }
      // We don't want to constantly request the same tile if it hasn't changed, but we used to do that because sometimes
      // the first request_goto_path+clear_goto_tiles didn't have time(?) to clean old paths and construct a new path properly:
      if (prev_goto_tile <= LAST_FORCED_CHECK) {
        prev_goto_tile ++;
        if (prev_goto_tile > LAST_FORCED_CHECK) {
          if (ptile) prev_goto_tile = ptile['tile']; // Flag to not make continuous server requests for the same tile.
        }
      } // FLAG to force request_goto_path more times to clean path redraw glitch.  FORCE_CHECKS_AGAIN can be tuned to -x which forces...
      else prev_goto_tile = FORCE_CHECKS_AGAIN; // ... request_goto_path x more times before blocking requests on the same tile.
    }
  }
  prev_mouse_x = mouse_x;
  prev_mouse_y = mouse_y;
}

/****************************************************************************
  Show the GOTO path in the unit_goto_path packet.
****************************************************************************/
function update_goto_path(goto_packet)
{
  //console.log("   update_goto_path caller is " + update_goto_path.caller);

  var punit = units[goto_packet['unit_id']];
  if (punit == null) return;
  var t0 = index_to_tile(punit['tile']);
  var ptile = t0;
  var goaltile = index_to_tile(goto_packet['dest']);

  // don't bother check goto for same tile unit is on
  if (ptile==goaltile) return;

  if (renderer == RENDERER_2DCANVAS) {
    for (var i = 0; i < goto_packet['dir'].length; i++) {
      if (ptile == null) break;
      var dir = goto_packet['dir'][i];

      if (dir == -1) {
        /* Assume that this means refuel. */
        continue;
      }

      ptile['goto_dir'] = dir;
      ptile = mapstep(ptile, dir);
    }
  } else {
    webgl_render_goto_line(ptile, goto_packet['dir']);
  }

  current_goto_turns = goto_packet['turns'];

  goto_request_map[goto_packet['unit_id'] + "," + goaltile['x'] + "," + goaltile['y']] = goto_packet;
  goto_turns_request_map[goto_packet['unit_id'] + "," + goaltile['x'] + "," + goaltile['y']]
	  = current_goto_turns;

  if (current_goto_turns != undefined) {
    var path_length = goto_packet['length'];

    // Fuel units inject extra non-path data in the goto_packet:
    if (unit_type(punit)['fuel']>0) path_length--;

    $("#active_unit_info").html("Path: "+path_length+" tiles");
  }
  update_mouse_cursor();
}

/****************************************************************************
  Show the GOTO path for middle clicked units
****************************************************************************/
function show_goto_path(goto_packet)
{
  // separate function to potentially handle cases differently
  update_goto_path(goto_packet);
}



/**************************************************************************
  Centers the mapview around the given tile..
**************************************************************************/
function center_tile_mapcanvas(ptile)
{
  if (renderer == RENDERER_2DCANVAS) {
    center_tile_mapcanvas_2d(ptile);
  } else {
    center_tile_mapcanvas_3d(ptile);
  }
}

/**************************************************************************
  Show tile information in a popup
**************************************************************************/
function popit()
{
  var ptile;

  if (renderer == RENDERER_2DCANVAS) {
    ptile = canvas_pos_to_tile(mouse_x, mouse_y);
  } else {
    ptile = webgl_canvas_pos_to_tile(mouse_x, mouse_y);
  }

  if (ptile == null) return;

  mclick_tile = ptile; // improve_tile_info_dialog() wants to know this
  setTimeout(popit_req(ptile),150);

  // there were 2 popit_req calls here, one delayed by 150ms above and the
  // one below... it looked erroneous to leave both unless it was some
  // undocumented hack/fix, so it was commented out to see if everything
  // works fine 26Feb2020 ... targeted for later removal
  //popit_req(ptile);
}

/**************************************************************************
  request tile popup
**************************************************************************/
function popit_req(ptile)
{
  /* Force prevention of contextmenu pop-up during a tile-info pop-up request
   * (i.e. double tap for tile info on mobile on a tile that has units which
   * usually trigger a context menu)  */
  $("#canvas").contextMenu(false);
  $('.context-menu-list').trigger('contextmenu:hide');
  // Reset context menu to be active
  setTimeout(function(){
    $("#canvas").contextMenu(true);
    }, 450);

  if (ptile == null) return;

  // copies tile string to clipboard for later pasting
  // %%% instead of %% puts it in a format that will send the message privately
  // to oneself
  copy_string_to_clipboard("%%%"+"tile"+ptile['index']+"~%");

  if (tile_get_known(ptile) == TILE_KNOWN_UNSEEN) {
    //TODO: The 2 lines below should be removed after next FCW server restart
    //comment made on 3 March 2020
   show_dialog_message("Tile info", "Location: x:" + ptile['x'] + " y:" + ptile['y']);
    return;
   // Let server give us tile info. OPTIONAL TODO: reconstruct some more based on our
   // own last known knowledge of the tile. Server only sends Terrain and that's it.
  } else if (tile_get_known(ptile) == TILE_UNKNOWN) {
    show_dialog_message("Tile info", "Location: x:" + ptile['x'] + " y:" + ptile['y']);
    return;
  }

  var punit_id = 0;
  var punit = find_visible_unit(ptile);
  if (punit != null) punit_id = punit['id'];

  var focus_unit_id = 0;
  if (current_focus.length > 0) {
    focus_unit_id = current_focus[0]['id'];
  }

  var packet = {"pid" : packet_info_text_req, "visible_unit" : punit_id,
                "loc" : ptile['index'], "focus_unit": focus_unit_id};
  send_request(JSON.stringify(packet));

  // IF middle-clicked a tile that: 1) has unit(s), 2) has GO TO orders; THEN: show the path(s)
  if (punit_id) { // units are on tile
    var tunits = tile_units(ptile);
    for (u = 0; u < tunits.length; u++) {
      if (tunits[u]['goto_tile'] != undefined) { // don't show foreign units: this key is undefined
        var goto_tile_id = tunits[u]['goto_tile'];
        if (goto_tile_id > 0) {  // unit has go to orders
          request_goto_path(tunits[u]['id'], tiles[goto_tile_id]['x'], tiles[goto_tile_id]['y']);
        }
      }
    }
  }
}


/**************************************************************************
   find any city to focus on.
**************************************************************************/
function center_on_any_city()
{
  for (var city_id in cities) {
    var pcity = cities[city_id];
    center_tile_mapcanvas(city_tile(pcity));
    return;
  }
}

/**************************************************************************
 This function shows the dialog containing active units on the current tile.
**************************************************************************/
function update_active_units_dialog()
{
  var unit_info_html = "";
  var ptile = null;
  var punits = [];
  var width = 0;
  var mobile_mode = is_small_screen();
  var unit_name = "";

  if (/*client_is_observer() ||*/ !unitpanel_active) return;

  if (current_focus.length == 1) {
    ptile = index_to_tile(current_focus[0]['tile']);
    punits.push(current_focus[0]);
    var tmpunits = tile_units(ptile);
    for (var i = 0; i < tmpunits.length; i++) {
      var kunit = tmpunits[i];
      if (kunit['id'] == current_focus[0]['id']) continue;
      punits.push(kunit);
    }
  } else if (current_focus.length > 1) {
      //Former code-block only did: punits=current_focus. You could only shift-click one panel-unit then lost all the rest from the panel:
      ptile = index_to_tile(current_focus[0]['tile']);

      for (var i = 0; i < current_focus.length; i++) {
         punits.push(current_focus[i]);  // Add selected units to panel for starters
      }
      var tmpunits = tile_units(ptile);
      // Add every other unit on the tile to the panel UNLESS it's already selected (i.e. exists in current_focus array of units)
      for (var i = 0; i < tmpunits.length; i++) {
        var index = punits.findIndex(x => x.id==tmpunits[i].id);
        if (index === -1) { //index == -1 means it's not in selection, so we add it:
          punits.push(tmpunits[i]);
        }
      }
    }

  // SORT THE PANEL UNITS
  //=================================================================================
  // Sort panel units by 1-type,2-mp,3-hp,4-vet,5-id; transported units forced to end
  punits.sort(function(u1, u2) {
    // transported units go to the back of the line
    if (u1['transported']==true) return 1;
    if (u2['transported']==true) return -1;

    // sort by unit type first
    if (u1['type'] < u2['type']) return -1;
    if (u1['type'] > u2['type']) return 1;

    // sort higher move points next
    if (u1['movesleft'] > u2['movesleft']) return -1;
    if (u1['movesleft'] < u2['movesleft']) return 1;

    // sort hp next
    if (u1['hp'] > u2['hp']) return -1;
    if (u1['hp'] < u2['hp']) return 1;

    // sort vet last
    if (u1['veteran'] > u2['veteran']) return -1;
    if (u1['veteran'] < u2['veteran']) return 1;

    // unit_id is tiebreaker: forces uniform sort no matter how stack is sorted on
    // tile -- this prevents 'invisible re-sort' of unit panel where user can't
    // see they clicked on a different unit of the same type because it sorts
    // to the same highlighted position as the previous highlighted unit
    if (u1['id'] > u2['id']) return -1;
    if (u1['id'] < u2['id']) return 1;

    return 0;
  });

  // Cargo units were pushed to the back of the list. From the last position
  // in the list, check if it's cargo. If it is, move it directly after the
  // transporter unit, exposing a new unit at the back of the list to check
  // again, until: 1-it's not a cargo unit and we finished, or 2-we encounter
  // a cargo unit that was already moved, meaning that the last unit in the
  // list was already processed and we can exit.
  var fromIndex = punits.length-1; // last position in the list, 0-index
  var already_moved = [];          // keeps track of cargo already processed
  var exit_while = false;
  var sanity_assert = 0;
  //console.log("Unit panel array length = "+punits.length)

  while (punits[fromIndex] && punits[fromIndex]['transported'] && exit_while==false) {
    //if (sanity_assert<100) console.log("\nLoop iteration "+sanity_assert);
    //console.log(unit_type(punits[fromIndex])['name']+"["+fromIndex+"] is transported by tunit:"+punits[fromIndex]['transported_by'])
    var tunit_id = punits[fromIndex]['transported_by'];
    sanity_assert ++;
    var trIndex = 0;
    if (sanity_assert>1000) {console.log("Unit panel sort could not break from loop."); break;}
    // Look through all units for transporter unit of this cargo
    for (trIndex=0; trIndex<punits.length; trIndex++) {
      //console.log("   checking punits["+trIndex+"] which is unit_id:"+punits[trIndex]['id'])
      // if punit[].id == tunit_id, we found the transporter
      if (punits[trIndex]['id'] == tunit_id) {
          //console.log("     punits["+trIndex+"] was a match!!")
          var insertIndex = trIndex + 1;

          // move transported unit directly after:
          var element = punits.pop(); // remove and take last element from array
          // insert copy of cargo right after its transporter unit:
          //console.log("       insertpos="+(insertIndex)+" lastidx="+(fromIndex));
          if (insertIndex >= fromIndex) {
            //console.log("    "+insertIndex+">="+fromIndex+"=="+(insertIndex >= fromIndex));
            //console.log("    pushing element back to last place in array.")
            // can't splice to end of array
            // if transporter is now at the end of array, we have to push instead of splice
            punits.push(element);
          } else {
            //console.log("    splicing element to position "+insertIndex);
            punits.splice(insertIndex, 0, element); //trIndex+1 - right after transporter
          }
          //console.log(punits);
          // If the last unit in the list is a cargo unit that was already moved
          // after its transport, we could get in an endless loop. Therefore, we
          // keep track of cargo that was already moved. If this cargo was already
          // moved, we have completed the whole process and can exit out of it.
          if (already_moved.includes(element)) {
            //console.log("********* already_moved contains the cargo unit, EXITING!")
            exit_while=true;
          } else {
            //console.log("      pushing cargo unit to already_moved")
            already_moved.push(element);
          }
          //break;  // can't be on two transports, stop looking for more transports
      }
    }
  }
  //=========================================================================================

  for (var i = 0; i < punits.length; i++) {
    var punit = punits[i];
    var sprite = get_unit_image_sprite(punit);

    // TO DO: This is caused sometimes after rebuild when not all images load properly. This is a hack to simply abort
    // making unit panel for this current unit in the stack, but probably we need a check after game load to see if all
    // graphics loaded, and a message to please refresh if they did not.
    if (sprite == null) {
      add_client_message("Uncached graphics didn't have time to load. Please refresh browser to reload site.");
      alert("Warning - Site was rebuilt.\nGraphical sprites do not match cache.\nPlease reload page to fix.\n\n"
             +"If that doesn't work, wiping the browser cache for the site forces graphics to reset.");
      continue;
    }

    var active = false;

    // if punit is in current_focus, it's active:
    var index = current_focus.findIndex(x => x.id==punit.id);
    if (index === -1) { //index == -1 means it's not in current_focus:
      active = false;
    } else active = true;

    // FORMER CODE: var active was set to always on if we had more than 1 unit selected??????????
    //var active = (current_focus.length > 1 || current_focus[0]['id'] == punit['id']);

    // set the css background based on selected and/or transported cargo
    var display_background_css;
    var trans_help_title = "";
    if (active) { // selected units are highlighted, and slightly bluish if on a transport
      display_background_css = (punit['transported'] && punit['transported_by']>0) ? "transported_focus_unit" : "current_focus_unit";
    } else {      // non-selected units have dark transparent background, also slightly blue if on a transport
      display_background_css = (punit['transported'] && punit['transported_by']>0) ? "transported_nonfocus_unit" : "nonfocus_unit";
    }

    // hover title to give transport # and transported by
    if (unit_type(punit)['transport_capacity']>0) trans_help_title += "T"+punit['id']+" &#010;"
    if (punit['transported_by']) trans_help_title += "on "+punit['transported_by'];

    unit_info_html += "<div id='unit_info_div' title='"+trans_help_title+"' class='" + display_background_css
     + "'><div id='unit_info_image' onclick='click_unit_in_panel(event, units[" + punit['id'] + "])' "
	   + " style='margin-right:1px; background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px; width:64px;height:48px;'"   // force everything to 64x48 including oversize units (Lexxie)
           + "'></div></div>";                                 // changed margin-right to 1px, was defaulting to 5px (Lexxie)

    unit_info_html += get_html_vet_sprite(punit);
    //if (show_unit_movepct) unit_info_html += get_html_mp_sprite(punit, true);  // TO DO: showing both hp&mp messes up flow
    unit_info_html += get_html_hp_sprite(punit, true);

    width = 64;
  }

  var active_uinfo = "";
  if (current_focus.length == 1) {
    /* show info about the active focus unit. */
    var aunit = current_focus[0];
    var ptype = unit_type(aunit);

    active_uinfo += "<div id='active_unit_info' title=''>";

    // Construct unit name. Placement is different between mobile and normal screen:
    if (client.conn.playing != null && current_focus[0]['owner'] != client.conn.playing.playerno) {
      unit_name = nations[players[current_focus[0]['owner']]['nation']]['adjective']+" ";
      if (!mobile_mode) unit_name = "<b>"+unit_name+"<b>";
      else unit_name = "<span style='font-size:90%'>"+unit_name+"&nbsp;</span>";
    }
    if (ptype['transport_capacity'] > 0) {// Special text for transport units
      if (mobile_mode) { // mobile version of text
        unit_name += "<span style='font-size:90%'>"+ptype['name'] + "<font color='#C8E8FF'>#"+aunit['id']+"</font></span>"
      } else { // normal screen version of text
        unit_name += "<b>" + ptype['name'] + "</b> <font title='Transport ID' style='font-size:90%' color='#C8E8FF'>#"+aunit['id']+"</font>"
      }
    }
    else { // text for non-transport units
      if (mobile_mode) { // mobile version of text
        unit_name += "<span style='font-size:90%'>" + ptype['name'] + "</span>";
      }
      else  { // normal screen version of text
        if (DEBUG_UNITS) unit_name+=aunit['id']+"."; // very handy for debugging issues to know uid
        unit_name += "<b>" + ptype['name'] + "</b>";
      }
    }

    if (get_unit_homecity_name(aunit) != null) {
      if (mobile_mode) { // mobile version of text
        unit_name += "<span style='font-size:90%'>: " + get_unit_homecity_name(aunit) + "</span>";
      }
      else { // normal screen version of text
        unit_name += ": " + get_unit_homecity_name(aunit) + " ";
      }
    } else unit_name += " ";

    // Type of unit comes first in normal screen mode, otherwise just Moves and Hit points for condensed screens
    if (!mobile_mode)
      active_uinfo += unit_name;

    if (client.conn.playing != null && current_focus[0]['owner'] == client.conn.playing.playerno) {
      if (mobile_mode) { // mobile version of text
        active_uinfo += "<span style='color:white'> &nbsp; M:<span style='color:lightgreen;font-size:110%'><b>" + move_points_text(aunit['movesleft']) + "</b></span></span>";
      } else { // normal non-mobile text:
        active_uinfo += "<span style='color:white'>Moves:<span style='color:lightgreen;font-size:120%;'><b>" + move_points_text(aunit['movesleft']) + "</b></span></span> ";
      }
    }
    if (mobile_mode) { // mobile version of text
      active_uinfo += "<span>&nbsp;H:<span style='color:lightpink;font-size:110%'><b>"
      + aunit['hp'] + " </b> </span> </span>" + unit_name; // unit name after Moves and HP for mobile
    } else { // normal non-mobile text:
        active_uinfo += "<span title='Attack'>A:<span style='color:gainsboro;font-size:100%;'><b>" + ptype['attack_strength']   // make terser titles to avoid cramped clutter (Lexxie)
        + "</b></span></span> <span title='Defense'>D:<span style='color:gainsboro;font-size:100%;'><b>" + ptype['defense_strength']
        + "</b></span></span> <span title='Firepower'>FP:<span style='color:gainsboro;font-size:100%;'><b>" + ptype['firepower']
        + "</b></span></span> <span title='Health'>H:<span style='color:lightpink;font-size:120%;'><b>"
        + aunit['hp'] + "</b></span></span>"; //<span style='color:gainsboro;font-size:85%;'>/" + ptype['hp'] + "</span></span>";
    }
    if (aunit['veteran'] > 0) {
      if (mobile_mode) { // mobile version of text
        //active_uinfo += " <span>V:<span style='color:gainsboro;font-size:100%;'><b>" + aunit['veteran'] + "</b></span></span>";
      } else { // normal non-mobile text:
        active_uinfo += " <span title='Vet-level'>V:<span style='color:gainsboro;font-size:100%;'><b>" + aunit['veteran'] + "</b></span></span>";
      }
    }
    if (ptype['transport_capacity'] > 0) {
      if (mobile_mode) { // mobile version of text
        //active_uinfo += " <span>C:<span style='color:gainsboro;font-size:100%;'><b>" + ptype['transport_capacity'] + "</b></span></span>";
      } else { // normal non-mobile text
        active_uinfo += " <span title='Cargo Capacity'>C:<span style='color:gainsboro;font-size:100%;'><b>" + ptype['transport_capacity'] + "</b></span></span>";
      }
    }
    if (aunit['transported'] && aunit['transported_by']>0) {
      active_uinfo += " <span title='Transporter ID' style='color:lightskyblue'><b>On </b>#"+aunit['transported_by']+"</span>";
    }

    // Actual fuel remaining is: (turns_of_fuel-1) + moves_left/moves_rate
    if ( client.conn.playing != null && (ptype['fuel']>0) && (current_focus[0]['owner']==client.conn.playing.playerno) ) {
      var fuel_left = (aunit['fuel']-1) + aunit['movesleft']/ptype['move_rate'];
      var fuel_color = "";
      var size_adj = mobile_mode ? "font-size:100%" : "font-size:100%;";
      if (aunit['movesleft']==0) fuel_color = "<span style='color:gainsboro;"+size_adj+"'><b>";    // no moves left, fuel indicator is dimmed down
      else if (fuel_left>2.001) fuel_color = "<span style='color:deepskyblue;"+size_adj+"'><b>";   // more than 2 turns of fuel = blue skies ahead
      else if (fuel_left>1.001) fuel_color = "<span style='color:darkturquoise;"+size_adj+"'><b>"; // more than 1 turn  of fuel = blue skies ahead
      else if (fuel_left>0.85) fuel_color = "<span style='color:lawngreen;"+size_adj+"'><b>";      // full turn of fuel = green
      else if (fuel_left>0.67) fuel_color = "<span style='color:greenyellow;"+size_adj+"'><b>";    // most moves = green-yellow
      else if (fuel_left>0.63) fuel_color = "<span style='color:yellow;"+size_adj+"'><b>";         // getting close to half fuel used = yellow
      else if (fuel_left>0.59) fuel_color = "<span style='color:gold;"+size_adj+"'><b>";
      else if (fuel_left>0.55) fuel_color = "<span style='color:orange;"+size_adj+"'><b>";
      else if (fuel_left>0.50) fuel_color = "<span style='color:orangered;"+size_adj+"'><b>";
      else  fuel_color = "<span style='color:red;"+size_adj+"'><b>";

      if (aunit['movesleft']==0 && fuel_left<1.0001) { fuel_left="";} // no moves and exactly 1 or less fuel are special cases like airlift/refueling/etc where we don't need to show fuel
      else {
        if (mobile_mode) { // mobile version of text
          active_uinfo += " <span>F:" + fuel_color + fuel_left.toFixed(fuel_left<1?2:1) + "</b></span></span>";
        } else { // normal non-mobile text
          active_uinfo += " <span title='Fuel Left'>Fuel:" + fuel_color + fuel_left.toFixed(fuel_left<1?2:1) + "</b></span></span>";
        }
      }
    }
    active_uinfo += "</div>";
  } else if (current_focus.length >= 1 && client.conn.playing != null && current_focus[0]['owner'] != client.conn.playing.playerno) {
    active_uinfo += "<div id='active_unit_info'>" + current_focus.length + " foreign units  (" +
     nations[players[current_focus[0]['owner']]['nation']]['adjective']
     +")</div> ";
  } else if (current_focus.length > 1) {
    active_uinfo += "<div id='active_unit_info'>" + current_focus.length + " units selected.</div> ";
  }

  if (current_focus.length > 0) {
    /* reposition and resize unit panel. */
    var newwidth = 32 + punits.length * (width+2) + 11;   // width+2 can be modified if number of units is creating inconsistency in horizontal padding
    if (newwidth < 140) newwidth = 140;
    var newheight = 75 + normal_tile_height;
    if (!mobile_mode && punits.length > 1) {
      newwidth  -= 8;
      if (punits.length >2) {
        newheight -= 13; // 3 units goes from max. 4 lines to max. 3 lines needed for unit info
        if (punits.length >3) {
          newheight -=13; // 2 lines are max needed.
        }
      }
    }

    var max_units_per_row = mobile_mode ? 5 : 8;
    // if 9 or more units, switch to large side-panel style with multiple rows and columns:
    if (punits.length > max_units_per_row) {
      var columns = 5;      // start with 5 columns and only go higher if needed
      var vertical_room = window.innerHeight - 45 /*window header area*/ - 28 /* unusable bottom area*/ - 24; /* unusable upper area of unit panel*/
      var max_rows = Math.floor(vertical_room/50); // max. # of unit rows in game_unit_panel. 50=48+2 (unit vertical size+top/bottom border px)
      var max_units = columns * max_rows; //max number of units we can fit with 5 columns
      // check if 5 columns isn't enough to fit all units in the panel:
      if (punits.length > max_units) {  // if 5 columns isn't enough, then each column can display max_rows more units:
        columns += Math.ceil( (punits.length-max_units)/max_rows );
        //console.log("Ultra-large unit panel created. Vertical_room="+vertical_room+" max_rows="+max_rows+" columns="+columns);
        //console.log(".. max_units="+max_units+" selected_units="+punits.length);
      }
      newwidth = 32 + columns*(width+2) + 1;  // Large panel gets row of 5 units
      newheight = (normal_tile_height+1) * Math.ceil( punits.length/columns ) + 50;  // one row for every 5+ units, rounded up of course
    }
    unit_info_html += active_uinfo;
    $("#game_unit_info").html(unit_info_html);

    if (mobile_mode) newwidth -= 40;
    if (mobile_mode && newwidth >= $(window).width()-40) {// move unit info to clear minimized mobile chat widget:
      $("#active_unit_info").html("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"+$("#active_unit_info").html());
    }

    $("#game_unit_panel").parent().show();

    if (mobile_mode) { // mobile sizing of panel
      $("#game_unit_panel").parent().width(newwidth);
      $("#game_unit_panel").parent().height(71); // one row only
      $("#game_unit_panel").parent().css("left", $(window).width() > newwidth
                                                 ? (($( window ).width() - newwidth) + "px")
                                                 : "0px"
                                        );
      $("#game_unit_panel").parent().css("top", ($(window).height() - 81) + "px");
      $("#game_unit_panel").parent().css("background", "rgba(50,50,40,0.95)");
    } else { // normal screen sizing of panel
      $("#game_unit_panel").parent().width(newwidth);
      $("#game_unit_panel").parent().height(newheight+6);  // third line of text is rare but needs 5 more px to not be clipped off (Lexxie)
      $("#game_unit_panel").parent().css("left", ($(window).width() - newwidth) + "px");
      $("#game_unit_panel").parent().css("top", ($(window).height() - newheight - 20) + "px");
      $("#game_unit_panel").parent().css("background", "rgba(50,50,40,0.5)");
    }

    if (game_unit_panel_state == "minimized") $("#game_unit_panel").dialogExtend("minimize");
  } else {
    $("#game_unit_panel").parent().hide();
  }
  $("#active_unit_info").tooltip();
}

/**************************************************************************
  Sets mouse_touch_started_on_unit
**************************************************************************/
function set_mouse_touch_started_on_unit(ptile) {
  if (ptile == null) return;

  if (!enable_goto_drag) {
    mouse_touch_started_on_unit = false;
    return;
  }

  var sunit = find_visible_unit(ptile);
  if (sunit != null && client.conn.playing != null && sunit['owner'] == client.conn.playing.playerno) {
    mouse_touch_started_on_unit = true;
  } else {
    mouse_touch_started_on_unit = false;
  }
}


/****************************************************************************
 This function checks if there is a visible unit on the given tile,
 and selects that visible unit, and activates goto.
****************************************************************************/
function check_mouse_drag_unit(ptile)
{
  if (ptile == null || !mouse_touch_started_on_unit) return;

  var sunit = find_visible_unit(ptile);

  if (sunit != null) {
    if (client.conn.playing != null && sunit['owner'] == client.conn.playing.playerno) {
      set_unit_focus(sunit);

      if (!$(".context-menu-list").is(":visible"))
        // clicking a unit with a context menu up just releases the menu, doesn't activate goto:
        activate_goto();
    }
  }

  var ptile_units = tile_units(ptile);
  if (ptile_units.length > 1) {
     update_active_units_dialog();
  }
}
