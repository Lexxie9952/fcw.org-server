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

// Server's Local Time relative to GMT. e.g., London 0, Paris 1, SF -8
const SERVER_GMT_OFFSET = 1;  // helps localize timestamps to client's time zone

/* The server will send information about its settings. It is stored here.
 * You can look up a setting by its name or by its id number. */
var server_settings = {};

/****************************************************************
 The "options" file handles actual "options", and also view options,
 message options, dialog/report settings, cma settings, server settings,
 and global worklists.
*****************************************************************/

var Game_UID;   // (semi)-Unique-enough identifier for the particular game
var myGameVars; // User persistent storage tied to a unique game
// Hard-coded client behaviours specific to certain rulesets get custom ruleset flags (CRF)
// assigned to them inside handle_ruleset_control() (packhand.js). You can then hard-code
// specific client behaviour by checking for (client_rules_flag & CRF_FLAG_NAME):
var client_rules_flag              = []; // bit-flag for exceptional rules hard-coded into client
const CRF_CARGO_HEURISTIC          =  0; // conventional ruleset generalisations for which cargo units go on which transports: filters a cleaner UI for transport loading
const CRF_OASIS_IRRIGATE           =  1; // ruleset allows irrigating from oasis as a water source
const CRF_ASMITH_SPECIALISTS       =  2; // six total specialists; but #4,#5,#6 are only active with A.Smith wonder
const CRF_MP2_UNIT_CONVERSIONS     =  3; // Leader,AAA,Worker,and Riflemen can do the unit CONVERT order
const CRF_LEGION_WORK              =  4; // Legions can road and make forts
const CRF_MASONRY_FORT             =  5; // Masonry tech allows building forts
const CRF_CANALS                   =  6; // Ruleset allows canals with Engineering
const CRF_NO_UNIT_GOLD_UPKEEP      =  7; // Ruleset doesn't use gold upkeep on units, so don't show it.
const CRF_MP2_SPECIAL_UNITS        =  8; // Special rules/filters for handling MP2 units: Fanatics (skirmish), Well-Digger, Queen, Pilgrim, Proletarians
const CRF_COMMIE_BLDG_UPKEEP       =  9; // Used for calculating/showing upkeep from buildings accurately for communist government bonus (in some rulesets)
const CRF_PACTS_SANS_EMBASSY       = 10; // Ruleset allows treaties without embassy if contact_turns>0 but only for limited pacts
const CRF_TESLA_UPGRADE_DISCOUNT   = 11;//Ruleset has Tesla's Laboratory and gives a 20% discount on unit upgrades.
const CRF_RADAR_TOWER              = 12; // Ruleset has improvement for building Radar Tower over Airbase.
const CRF_EXTRA_HIDEOUT            = 13; // Ruleset has hideouts and hidden status.
const CRF_EXTRA_QUAY               = 14; // Ruleset has Quay extra and Waterway Extra.
const CRF_NO_WASTE                 = 15; // Ruleset does not feature waste.
const CRF_MINOR_NUKES              = 16; // Ruleset has minor nukes (fission, 3x3 area)
const CRF_MAJOR_NUKES              = 17; // Ruleset has major nukes (fusion), which it may want to disable in some games.
const CRF_SURGICAL_PILLAGE         = 18; // Allow special exception units without UCF_PILLAGE to pillage tiles.
const CRF_MAGLEV                   = 19; // Ruleset has MAGLEVS
const CRF_SIEGE_RAM                = 20; // Ruleset uses Siege Ram, which highjacks diplomatic sabotage popup to only allow City Wall sabotage.
const CRF_MARINE_BASES             = 21; // Needed to optimize due to flaws in actionenablers/req
const CRF_MARINE_RANGED            = 22; // Marines can do ranged attack
const CRF_BSHIP_BOMBARD            = 23; // Battleships can Bombard
const CRF_TRIREME_FUEL             = 24; // Trireme is fuel unit, client benefts from UI optimisations
const CRF_RECYCLING_DISCOUNT       = 25;
const CRF_SEABRIDGE                = 26;
const CRF_COLOSSUS_DISCOUNT        = 27;
const CRF_SPECIAL_UNIT_ATTACKS     = 28; // complex special one-way engagements enabled, mp2-caravel onward.
const CRF_NO_BASES_ON_RIVERS       = 29;
const CRF_2X_MOVES                 = 30;
const CRF_EXTRA_WATCHTOWER         = 31;
const CRF_EXTRA_HIGHWAY            = 32;
const CRF_GRANULAR_COMBAT_STRENGTH = 33; // How much to divide combat values for granularity. Instead of true/false, contains the actual divisor.
const CRF_DEBOARD_RESTRICT         = 34; // Any ruleset allowing transports on land tiles shouldn't allow 0-cost deboarding anywhere and everywhere
const CRF_MTN_RIVERS               = 35;
const CRF_CLASSIC_PLUS             = 36;
const CRF_MP2                      = 37; // rules flags for "minimum" mp2 ruleset, for when new feature came in.
const CRF_MP2_A                    = 38;
const CRF_MP2_B                    = 39;
const CRF_MP2_C                    = 40;
const CRF_MP2_D                    = 41;
const CRF_MP2_E                    = 42;
const CRF_LAST                     = 43;

var graphic_theme_path;

/** Defaults for options normally on command line **/
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
var enable_goto_drag = true; // whether to disable dragging unit for GOTO
var enable_autoexplore = true; // whether to disable the X hotkey because some people mess up
var show_order_option = true; // corresponds to the checkbox, and whether or not to show orders buttons at all
var show_order_buttons = 2;  //  if shown, which mode:  1=most common, 2=all orders, 3=hide panels
var show_empire_tab = false;
var show_warcalc = false;
var show_unit_movepct = false; // show move-point bar on map units
var show_compass = true; // show compass on map
var hp_bar_offset = 0;    // if mp bar is shown, offset to bump up hp bar
var focuslock = false;    // whether map centers and locks always on focused unit

var save_options_on_exit = true;
var fullscreen_mode = false;
var replace_capital_i = null; // option to fix bad capital I in some default sans fonts
var play_music = true;
var show_timestamps = false;  // show ec_info timestamps on critical events that occurred while not logged in (useful in longturn only)

/** Local Options: **/
var scroll_narrow_x = false;  // wider scrollable table rows for mobile to see more info
var solid_color_behind_units = false;
var sound_bell_at_new_turn = false;
var smooth_move_unit_msec = 30;
var smooth_center_slide_msec = 200;
var do_combat_animation = true;
var ai_manual_turn_done = true;
var auto_center_on_unit = true;
var auto_center_on_combat = false;
var auto_center_each_turn = true;
var wakeup_focus = true;
var goto_into_unknown = true;
var center_when_popup_city = true;
var concise_city_production = false;
var auto_turn_done = false;
var meta_accelerators = true;
var ask_city_name = true;
var popup_new_cities = true;
var popup_actor_arrival = true;
var keyboardless_goto = true;
var enable_cursor_changes = true;
var separate_unit_selection = false;
var unit_selection_clears_orders = true;
var highlight_our_names = "yellow";

/* This option is currently set by the client - not by the user. */
var update_city_text_in_refresh_tile = true;

var draw_dashed_borders = false;
var draw_tertiary_colors = false;
var draw_border_mode = 0; // 0 = no tertiary, 1 = tertiary, 2 = no border at all */
var draw_thick_borders = false;
var draw_moving_borders = false;
var draw_border_flags = false;
var minimap_color = 1;   // draw minimap in primary,secondary, or tertiary colors

var draw_city_outlines = true;
var draw_city_output = false;
var draw_city_airlift_counter = false;
var draw_highlighted_pollution = false;
var draw_city_mood = false;
var draw_map_grid = false;
var draw_stacked_unit_mode = 3;   // default to best mode: ring+small
  const dsum_BASIC = 0;  // normal large + for stacked unit sprite
  const dsum_RING  = 1;  // small + near hpbar for stacked unit sprite
  const dsum_SMALL = 2;  // ring around national shield for stacked unit sprite
var draw_city_names = true;
var draw_city_growth = true;
var draw_city_productions = false;
var draw_city_buycost = false;
var draw_city_traderoutes = false;
var draw_terrain = true;
var draw_coastline = false;
var draw_roads_rails = true;
var draw_irrigation = true;
var draw_mines = true;
var draw_fortress_airbase = true;
var draw_huts = true;
var draw_resources = true;
var draw_pollution = true;
var draw_cities = true;
var draw_units = true;
var draw_focus_unit = false;
var draw_fog_of_war = true;
var draw_borders = true;
var draw_full_citybar = true;
var draw_unit_shields = true;
var player_dlg_show_dead_players = true;
var reqtree_show_icons = true;
var reqtree_curved_lines = false;

/* gui-gtk-2.0 client specific options. */
var gui_gtk2_map_scrollbars = false;
var gui_gtk2_dialogs_on_top = true;
var gui_gtk2_show_task_icons = true;
var gui_gtk2_enable_tabs = true;
var gui_gtk2_better_fog = true;
var gui_gtk2_show_chat_message_time = false;
var gui_gtk2_split_bottom_notebook = false;
var gui_gtk2_new_messages_go_to_top = false;
var gui_gtk2_show_message_window_buttons = true;
var gui_gtk2_metaserver_tab_first = false;
var gui_gtk2_allied_chat_only = false;
var gui_gtk2_small_display_layout = false;

function init_options_dialog()
{
  $("#save_button").button("option", "label", "Save Game (Ctrl+S)");
  $("#metamessage_setting").val(server_settings['metamessage']['val']);
  $('#metamessage_setting').change(function() {
    send_message("/metamessage " + $('#metamessage_setting').val());
  });

  $('#metamessage_setting').bind('keyup blur',function(){
    var clean_text = $(this).val().replace(/[^a-zA-Z\s\-]/g,'');
    if ($(this).val() != clean_text) {
      $(this).val( clean_text ); }
    }
  );

  if (!is_pbem()) {
    var existing_timeout = game_info['timeout'];
    if (existing_timeout == 0) $("#timeout_info").html("<i> (none)</i>");
    else $("#timeout_info").html(" seconds");
    $("#timeout_setting").val(existing_timeout);
  } else {
    $("#timeout_setting_div").hide();
  }
  $('#timeout_setting').change(function() {
    var new_timeout = parseInt($('#timeout_setting').val());
    if (new_timeout >= 1 && new_timeout <= 29) {
      swal("Invalid timeout specified. Must be 0 or more than 30 seconds.");
      setSwalTheme();
    } else {
      send_message("/set timeout " + new_timeout);
    }
  });

/* 8Mar2024. Probable vestige of old program flow doesn't seem needed anymore:
  if (audio != null && !audio.source.src) {
    if (supports_mp3()) {
      pick_next_track();
      if (play_music) audio.play();
    }
  } */

  $(".setting_button").tooltip({
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });

  // USER OPTIONS ------------------------------------------------------------------
  // PERMANENT SAVE also requires adding to civclient_init() IN civclient.js
  // SOUNDS
  $('#play_sounds_setting').prop('checked', sounds_enabled);
  $('#play_sounds_setting').change(function() {
    sounds_enabled = this.checked;
    simpleStorage.set('sndFX', sounds_enabled);
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
  // DRAW MAP GRID
  $('#draw_map_grid').prop('checked', draw_map_grid);
  $('#draw_map_grid').change(function() {
    draw_map_grid = this.checked;
    simpleStorage.set('mapgrid', draw_map_grid);
  });
  // MAP DRAG ENABLED
  $('#map_drag_enabled').prop('checked', map_drag_enabled);
  $('#map_drag_enabled').change(function() {
    map_drag_enabled = this.checked;
    simpleStorage.set('mapdrag', map_drag_enabled);
  });
  // GOTO DRAG ENABLED
  $('#enable_goto_drag').prop('checked', enable_goto_drag);
  $('#enable_goto_drag').change(function() {
    enable_goto_drag = this.checked;
    simpleStorage.set('gotodrag', enable_goto_drag);
  });
  // AUTOEXPLORE HOTKEY 'X' ENABLED
  $('#enable_autoexplore').prop('checked', enable_autoexplore);
  $('#enable_autoexplore').change(function() {
    enable_autoexplore = this.checked;
    simpleStorage.set('explorekey', enable_autoexplore);
  });
  // UNIT CLICK GIVES CONTEXT MENU
  $('#unit_click_menu').prop('checked', unit_click_menu);
  $('#unit_click_menu').change(function() {
    unit_click_menu = this.checked;
    simpleStorage.set('unitclickmenu', unit_click_menu);
  });
  // SHOW ORDER BUTTONS -- show_order_option: whether to show; show_order_buttons: modality less/more/hide all panels
  $('#show_order_buttons').prop('checked', show_order_option);
  if (show_order_option==true) {
    $("#game_unit_orders_default").show();
    update_unit_order_commands();
  }
  else {
    $("#game_unit_orders_default").hide();
  }
  $('#show_order_buttons').change(function() {
    show_order_option = this.checked;
    if (show_order_option==true) {
      simpleStorage.set('showorderoption', show_order_option);
      show_order_buttons = simpleStorage.get('ordrbtns');
      if (!show_order_buttons || show_order_buttons==3) {
        // option was never set || was set to hide all; turning the option back on resets to default:
        if (show_order_buttons==3) $("#game_status_panel_bottom").show(); // bring back the other hidden panael
        show_order_buttons=2; // default to 2:all (1==common, 3==hide all)
        simpleStorage.set('ordrbtns', show_order_buttons);
      }
      $("#game_unit_orders_default").show();
      update_unit_order_commands();
    }
    else {
      $("#game_unit_orders_default").hide();
    }
    simpleStorage.set('showorderoption', show_order_option);
  });
  // AUTO ATTACK
  $('#auto_attack').prop('checked', auto_attack);
  $('#auto_attack').change(function() {
    auto_attack = this.checked;
    //simpleStorage.set('autoattack', auto_attack); // don't store this to next session
  });
  // HIGHLIGHT POLLUTED TILES
  $('#draw_highlighted_pollution').prop('checked', draw_highlighted_pollution);
  $('#draw_highlighted_pollution').change(function() {
    draw_highlighted_pollution = this.checked;
    simpleStorage.set('showpollution', draw_highlighted_pollution);
  });
  // CITY AIRLIFT COUNTER
  $('#airlift_setting').prop('checked', draw_city_airlift_counter);
  $('#airlift_setting').change(function() {
    draw_city_airlift_counter = this.checked;
    simpleStorage.set('airlift', draw_city_airlift_counter);
  });
  // FOCUS LOCK UNITS TO CENTER OF MAP
  $('#focuslock_setting').prop('checked', focuslock);
  $('#focuslock_setting').change(function() {
    focuslock = this.checked;
    simpleStorage.set('focuslock', focuslock);
  });
  // DRAW CITY MOOD ON MAP
  $('#draw_city_mood').prop('checked', draw_city_mood);
  $('#draw_city_mood').change(function() {
    draw_city_mood = this.checked;
    simpleStorage.set('drawMood', draw_city_mood);
  });
   // SHOW WORKED TILES ON MAP
   $('#draw_city_output').prop('checked', draw_city_output);
   $('#draw_city_output').change(function() {
     draw_city_output = this.checked;
     simpleStorage.set('drawTiles', draw_city_output);
   });
   // MOBILE: WIDER TABLE ROWS
   $('#scroll_narrow_x').prop('checked', scroll_narrow_x);
   $('#scroll_narrow_x').change(function() {
     scroll_narrow_x = this.checked;
     simpleStorage.set('xScroll', scroll_narrow_x);
   });
    // BORDER FLAGS
    $('#fill_borders').prop('checked', draw_border_flags);
    $('#fill_borders').change(function() {
      draw_border_flags = this.checked;
      simpleStorage.set('borderFlags', draw_border_flags);
    });
    // TRICOLORE BORDERS
    $('#tricolor_borders').prop('checked', draw_tertiary_colors);
    $('#tricolor_borders').change(function() {
      draw_tertiary_colors = this.checked;
      draw_border_mode |= 1;
      simpleStorage.set('tricolore', draw_tertiary_colors);
    });
    // THICK BORDERS
    $('#thick_borders').prop('checked', draw_thick_borders);
    $('#thick_borders').change(function() {
      draw_thick_borders = this.checked;
      simpleStorage.set('thickBorders', draw_thick_borders);
    });
    // CLASSIC DASHED BORDERS (override)
    $('#dashed_borders').prop('checked', draw_dashed_borders);
    $('#dashed_borders').change(function() {
      draw_dashed_borders = this.checked;
      simpleStorage.set('dashedBorders', draw_dashed_borders);
    });
    // NO BORDERS (override)
    $('#no_borders').prop('checked', (draw_border_mode & 2));
    $('#no_borders').change(function() {
      if (this.checked) draw_border_mode |= 2;
      else draw_border_mode &= 1;
      //simpleStorage.set('noBorders', draw_border_mode & 2);
    });
    // MOVING BORDERS
    $('#moving_borders').prop('checked', draw_moving_borders);
    $('#moving_borders').change(function() {
      draw_moving_borders = this.checked;
      simpleStorage.set('movingBorders', draw_moving_borders);
    });
    // SHOW EMPIRE TAB
    $('#show_empire').prop('checked', show_empire_tab);
    $('#show_empire').change(function() {
      show_empire_tab = this.checked;
      if (show_empire_tab) $("#ui-id-2").show(); else $("#ui-id-2").hide();
      simpleStorage.set('showEmpire', show_empire_tab);
    });
    // Show Move Points % on units on map
    $('#show_unit_mp').prop('checked', show_unit_movepct);
    $('#show_unit_mp').change(function() {
      show_unit_movepct = this.checked;
      if (show_unit_movepct) hp_bar_offset = -5;
      else hp_bar_offset = 0;
      simpleStorage.set('showMoves', show_unit_movepct);
    });
    // SHOW WARCALC TAB
    $('#show_warcalc').prop('checked', show_warcalc);
    $('#show_warcalc').change(function() {
      show_warcalc = this.checked;
      if (show_warcalc) {
        $("#warcalc_tab").show();
        $("#ui-id-8").click();
        // for now, keep checkbox off and ready to activate next time:
        show_warcalc=false; // remove this if making a permanent option
        setTimeout(function(){$("#show_warcalc").prop("checked", false);},100);
      }
      //else $("#ui-id-8").hide();
      //simpleStorage.set('showCalc', show_warcalc);
    });
    // Show Map Compass
    $('#show_compass').prop('checked', show_compass);
    $('#show_compass').change(function() {
      show_compass = this.checked;
      simpleStorage.set('showCompass', show_compass);
      if (show_compass) $("#compass").show();
      else $("#compass").hide();
    });

    $('#show_timestamps').prop('checked', show_timestamps);
    $('#show_timestamps').change(function() {
      show_timestamps = this.checked;
      simpleStorage.set('tstamps', show_timestamps);
      if (show_timestamps) {
        $(".ts").show();
        $(".ts").css("display", "inline");
      }
      else {
        $(".ts").hide();
        $(".ts").css("display", "none");
      }
    });

   // Graphic Theme
   graphic_theme_path = simpleStorage.get('grtheme');
   if (!graphic_theme_path) graphic_theme_path = "themes/greek/";
     //console.log("Theme Path = "+graphic_theme_path);
   $('#graphic_theme').val(graphic_theme_path).prop('selected', true);
     //console.log("1-Theme Path = "+graphic_theme_path);
   $('#graphic_theme').change(function() {
     graphic_theme_path = $('#graphic_theme').val();
     simpleStorage.set('grtheme', graphic_theme_path);
     change_graphic_theme();
   });
   //----------------------------------------------------------------^^USER OPTIONS^^
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

  $("#title_setting_div").hide();

  if (is_longturn()) {
    $("#update_model_button").hide();
    $("#switch_renderer_button").hide();
    $("#renderer_help").hide();
    $("#save_button").hide();
    $("#surrender_button").hide();
  }

  if (is_supercow())
    $("#save_button").show();
    $("#timeout_setting_div").show(); // doesn't do anything yet, but one day we can change metamessage here.
}

function change_graphic_theme()
{
  return;
  /*
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
  */
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


