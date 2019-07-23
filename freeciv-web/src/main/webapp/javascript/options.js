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

/* The server will send information about its settings. It is stored here.
 * You can look up a setting by its name or by its id number. */
var server_settings = {};

/****************************************************************
 The "options" file handles actual "options", and also view options,
 message options, dialog/report settings, cma settings, server settings,
 and global worklists.
*****************************************************************/

/** Defaults for options normally on command line **/

var graphic_theme_path;

var default_user_name = "";
var default_server_host = "localhost";
//var  default_server_port = DEFAULT_SOCK_PORT;
//var default_metaserver = META_URL;
var default_theme_name = "human";
var default_tileset_name = "";
var default_sound_set_name = "stdsounds";
var default_sound_plugin_name = "";

var sounds_enabled = true;
var unit_click_menu = true;  // whether to show context menu on left-clicking a unit
var map_drag_enabled = true; // whether double tap and drag will move the map
var show_order_option = true; // corresponds to the checkbox

var save_options_on_exit = TRUE;
var fullscreen_mode = FALSE;

/** Local Options: **/

var solid_color_behind_units = FALSE;
var sound_bell_at_new_turn = FALSE;
var smooth_move_unit_msec = 30;
var smooth_center_slide_msec = 200;
var do_combat_animation = TRUE;
var ai_manual_turn_done = TRUE;
var auto_center_on_unit = TRUE;
var auto_center_on_combat = FALSE;
var auto_center_each_turn = TRUE;
var wakeup_focus = TRUE;
var goto_into_unknown = TRUE;
var center_when_popup_city = TRUE;
var concise_city_production = FALSE;
var auto_turn_done = FALSE;
var meta_accelerators = TRUE;
var ask_city_name = TRUE;
var popup_new_cities = TRUE;
var popup_actor_arrival = true;
var keyboardless_goto = TRUE;
var enable_cursor_changes = TRUE;
var separate_unit_selection = FALSE;
var unit_selection_clears_orders = TRUE;
var highlight_our_names = "yellow";

/* This option is currently set by the client - not by the user. */
var update_city_text_in_refresh_tile = TRUE;

var draw_city_outlines = TRUE;
var draw_city_output = FALSE;
var draw_city_airlift_counter = FALSE;
var draw_map_grid = FALSE;
var draw_city_names = TRUE;
var draw_city_growth = TRUE;
var draw_city_productions = FALSE;
var draw_city_buycost = FALSE;
var draw_city_traderoutes = FALSE;
var draw_terrain = TRUE;
var draw_coastline = FALSE;
var draw_roads_rails = TRUE;
var draw_irrigation = TRUE;
var draw_mines = TRUE;
var draw_fortress_airbase = TRUE;
var draw_huts = TRUE;
var draw_resources = TRUE;
var draw_pollution = TRUE;
var draw_cities = TRUE;
var draw_units = TRUE;
var draw_focus_unit = FALSE;
var draw_fog_of_war = TRUE;
var draw_borders = TRUE;
var draw_full_citybar = TRUE;
var draw_unit_shields = TRUE;
var player_dlg_show_dead_players = TRUE;
var reqtree_show_icons = TRUE;
var reqtree_curved_lines = FALSE;

/* gui-gtk-2.0 client specific options. */
var gui_gtk2_map_scrollbars = FALSE;
var gui_gtk2_dialogs_on_top = TRUE;
var gui_gtk2_show_task_icons = TRUE;
var gui_gtk2_enable_tabs = TRUE;
var gui_gtk2_better_fog = TRUE;
var gui_gtk2_show_chat_message_time = FALSE;
var gui_gtk2_split_bottom_notebook = FALSE;
var gui_gtk2_new_messages_go_to_top = FALSE;
var gui_gtk2_show_message_window_buttons = TRUE;
var gui_gtk2_metaserver_tab_first = FALSE;
var gui_gtk2_allied_chat_only = FALSE;
var gui_gtk2_small_display_layout = FALSE;

function init_options_dialog()
{
  $("#save_button").button("option", "label", "Save Game (Ctrl+S)");
  $("#metamessage_setting").val(server_settings['metamessage']['val']);
  $('#metamessage_setting').change(function() {
    send_message("/metamessage " + $('#metamessage_setting').val());
  });

  $('#metamessage_setting').bind('keyup blur',function(){
    var cleaned_text = $(this).val().replace(/[^a-zA-Z\s\-]/g,'');
    if ($(this).val() != cleaned_text) {
      $(this).val( cleaned_text ); }
    }
  );

  if (!is_pbem()) {
    var existing_timeout = game_info['timeout'];
    if (existing_timeout == 0) $("#timeout_info").html("(0 = no timeout)");
    $("#timeout_setting").val(existing_timeout);
  } else {
    $("#timeout_setting_div").hide();
  }
  $('#timeout_setting').change(function() {
    var new_timeout = parseInt($('#timeout_setting').val());
    if (new_timeout >= 1 && new_timeout <= 29) {
      swal("Invalid timeout specified. Must be 0 or more than 30 seconds.");
    } else {
      send_message("/set timeout " + new_timeout);
    }
  });

  if (audio != null && !audio.source.src) {
    if (!supports_mp3()) {
      audio.load("/music/" + music_list[Math.floor(Math.random() * music_list.length)] + ".ogg");
    } else {
      audio.load("/music/" + music_list[Math.floor(Math.random() * music_list.length)] + ".mp3");
    }
  }

  $(".setting_button").tooltip();

  // SOUNDS
  $('#play_sounds_setting').prop('checked', sounds_enabled);
  $('#play_sounds_setting').change(function() {
    sounds_enabled = this.checked;
    simpleStorage.set('sndFX', sounds_enabled);
    console.log("sounds_enabled just got changed to "+sounds_enabled)
  });

  // SPEECH
  if (is_speech_supported()) {
    $('#speech_enabled_setting').prop('checked', speech_enabled);
    $('#speech_enabled_setting').change(function() {
      speech_enabled = this.checked;
    });
  } else {
    $('#speech_enabled_setting').attr('disabled', true);
  }

  // CITY AIRLIFT COUNTER
  $('#airlift_setting').prop('checked', draw_city_airlift_counter);
  $('#airlift_setting').change(function() {
    draw_city_airlift_counter = this.checked;
    simpleStorage.set('airlift', draw_city_airlift_counter);
  });

  // DRAW MAP GRID
  $('#draw_map_grid').prop('checked', draw_map_grid);
  $('#draw_map_grid').change(function() {
    draw_map_grid = this.checked;
    simpleStorage.set('mapgrid', draw_map_grid);
  });

  // UNIT CLICK GIVES CONTEXT MENU
  $('#unit_click_menu').prop('checked', unit_click_menu);
  $('#unit_click_menu').change(function() {
    unit_click_menu = this.checked;
    simpleStorage.set('unitclickmenu', unit_click_menu);
  });

  // MAP DRAG ENABLED
  $('#map_drag_enabled').prop('checked', map_drag_enabled);
  $('#map_drag_enabled').change(function() {
    map_drag_enabled = this.checked;
    simpleStorage.set('mapdrag', map_drag_enabled);
  });

  // AUTO ATTACK
  $('#auto_attack').prop('checked', auto_attack);
  $('#auto_attack').change(function() {
    auto_attack = this.checked;
    //simpleStorage.set('autoattack', map_drag_enabled); // probably best to not store this to next session
  });

   // SHOW ORDER BUTTONS
   $('#show_order_buttons').prop('checked', show_order_option);
   if (show_order_option==true) {
      show_order_buttons=1; // 1=frequent, 2 is verbose/complete mode
      $("#game_unit_orders_default").show();
   }
   else { 
      show_order_buttons = 0;
      $("#game_unit_orders_default").hide();
    }
   $('#show_order_buttons').change(function() {
     show_order_option = this.checked;
     if (show_order_option==true) {
       show_order_buttons=2;
       $("#game_unit_orders_default").show();
     }
     else {
       show_order_buttons = 0;
       $("#game_unit_orders_default").hide();
     }
     simpleStorage.set('showorderbuttons', show_order_option); 
   });

   // Graphic Theme
   graphic_theme_path = simpleStorage.get('grtheme');
   if (!graphic_theme_path) graphic_theme_path = "themes/greek/";
     console.log("Theme Path = "+graphic_theme_path);
   $('#graphic_theme').val(graphic_theme_path).prop('selected', true);
     console.log("1-Theme Path = "+graphic_theme_path);

   $('#graphic_theme').change(function() {
     graphic_theme_path = $('#graphic_theme').val();
     simpleStorage.set('grtheme', graphic_theme_path); 
     change_graphic_theme();
   });

   $('#graphic_theme').change();

  if (!is_longturn()) {
    if (renderer == RENDERER_WEBGL) {
        $("#switch_renderer_button").html("Use 2D HTML5 graphics");
        $("#renderer_help").html("Switch to 2D isometric graphics.")
    } else {
        $("#switch_renderer_button").html("Use 3D WebGL graphics");
        $("#renderer_help").html("Use 3D WebGL graphics. Make sure your computer<br> supports 3D WebGL graphics.")
        $("#update_model_button").hide();
    }

    if (!Detector.webgl) {
        $("#switch_renderer_button").hide();
        $("#renderer_help").html("3D WebGL not supported.")
    }
  }

  if (is_longturn()) {
    $("#update_model_button").hide();
    $("#switch_renderer_button").hide();
    $("#renderer_help").hide();
    $("#save_button").hide();
    $("#timeout_setting_div").hide();
    $("#title_setting_div").hide();
    $("#surrender_button").hide();
  }
}

function change_graphic_theme()
{
  var clearall = "faroese greek mesopotamia persian";


  console.log("Switching theme to: "+graphic_theme_path);
  $('.city_panel').removeClass(clearall).toggleClass(graphic_theme_path+'1');
  $('#city_right_panel').removeClass(clearall).toggleClass(graphic_theme_path+'1');

  $('#city_present_units').removeClass(clearall).toggleClass(graphic_theme_path+'2');
  $('#city_supported_units').removeClass(clearall).toggleClass(graphic_theme_path+'2');
  $('#city_improvements').removeClass(clearall).toggleClass(graphic_theme_path+'2');
  $('.diplomacy_messages').removeClass(clearall).toggleClass(graphic_theme_path+'2');
  $('#tech_info_box').removeClass(clearall).toggleClass(graphic_theme_path+'2');
  $('.tablesorter-dark').removeClass(clearall).toggleClass(graphic_theme_path+'2');

  $('.help_submenu').removeClass(clearall).toggleClass(graphic_theme_path+'3');
  $('#help_menu').removeClass(clearall).toggleClass(graphic_theme_path+'3');
  $('#tabs-hel.manual_doc').removeClass(clearall).toggleClass(graphic_theme_path+'3');
  $('#technologies').removeClass(clearall).toggleClass(graphic_theme_path+'3');

  $('.ui-widget-content').removeClass(clearall).toggleClass(graphic_theme_path+'4');

  $('.ui-widget-header').removeClass(clearall).toggleClass(graphic_theme_path+'5');

  $('.chatbox_dialog').removeClass(clearall).toggleClass(graphic_theme_path+'6');
  $('.ui-dialog-titlebar').removeClass(clearall).toggleClass(graphic_theme_path+'6');
  
  $('#freeciv_logo').removeClass(clearall).toggleClass(graphic_theme_path+'7');
  
}

/*
.ui-widget-header {
  background: #cb842e url("/images/ui-widget-header.png") 50% 50% repeat-x;

.ui-widget-content {
  background: url("/images/bg.jpg") repeat scroll 50% 50%;

.chatbox_dialog .ui-dialog-titlebar {
  background: #cb842e url("/images/ui-widget-header.png") 100% 50% repeat-x;


.tablesorter-dark {
  background: url("/images/bg-dark.jpg") repeat scroll 0 0 ;  


.city_panel {
  background: url("/images/bg.jpg") repeat scroll 0 0 #222222;

#help_menu {
background-image: url('/images/bg.jpg');

.help_submenu {
  background-image: url('/images/bg.jpg');

#tabs-hel.manual_doc {
  background-image: url('/images/bg.jpg');

  #city_right_panel {
  background: url("/images/bg.jpg") repeat scroll 0 0 #222222;

#technologies {
  background-image: url('/images/bg.jpg');

#tech_info_box {
  background: url("/images/bg-dark.jpg") repeat scroll 0 0 ; 

#city_present_units, #city_supported_units {
  background:  url("/images/bg-dark.jpg") repeat scroll 0 0 ;

#city_improvements {
  background: url("/images/bg-dark.jpg") repeat scroll 0 0 ; 

.diplomacy_messages {
  background: url("/images/bg-dark.jpg") repeat scroll 0 0 ;  

*/


