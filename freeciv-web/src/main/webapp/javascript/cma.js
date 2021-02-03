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

var power_cma = true;  /* Whether or not "Your Cities" text in Cities list becomes 
power-user buttons for mass-paste or mass-apply of clipboard to each city */

// Global vars that allow multiple functions to work on the City Governor
var cma_val_sliders = [1,0,0,0,0,0];  // UI supplied values for cm_parameter['factor'][..]
var s_val = [" "," "," "," "," "," "];                        // corresponding UI sliders
var cma_min_sliders = [1,0,0,0,0,0];  // UI supplied values for cm_parameter['minimal_surplus'][..]
var s_min = [" "," "," "," "," "," "];                        // corresponding UI sliders
var cma_happy_slider = 0;
var s_hpy = " ";
var cma_celebrate = false;
var cma_allow_disorder = false; 
var cma_allow_specialists = true;
var cma_max_growth = false;
var cma_apply_once = false;
var cma_enabled = false;

// Governor Clipboard for copy/paste:
var _cma_val_sliders = [1,0,0,0,0,0];
var _cma_min_sliders = [1,0,0,0,0,0];
var _cma_happy_slider = 0;
var _cma_celebrate = false;
var _cma_allow_disorder = false; 
var _cma_allow_specialists = true;
var _cma_max_growth = false;

var cma_user_changed = false;         // state var for whether user made any changes
var gov_refresh_timer = 0;
var global_governor_message = "";     // for intercepting and displaying CMA messages from server


const gov_help =
"<b>BASICS:</b><br>City Governors help you manage cities. When city population changes, they arrange the citizens to work tiles in"
+" order to best achieve the goals of the On-Screen Settings. If told, the Governor can change citizens to specialists and prevent disorder."
+" By saving the On-Screen Settings, you order your Governor what kind of output to achieve. There are two kinds"
+" of sliders: (<b>1</b>) <b>Minimum Surplus</b> orders a minimum floor to achieve. For example, {Food=3} tells the Governor to gather"
+" at least +3 food. (<b>2</b>) <b>Output Priorities</b> tell the Governor which outputs to prioritize. For example,"
+" {Science=2, Shield=1} values bulbs at double the value of shields. The Governor would select shields over bulbs only in cases where he gets more than 2"
+" shields in exchange for 1 bulb. If you set goals that your Governor can't fulfill, he resigns and passes control back to you. In general,"
+" use 'Minimum Surpluses' as a fail-safe floor, and 'Output Priorities' to target preferred output.<br>"
+" The <b>Force Celebrate</b> option orders your Governor to achieve celebration. Usually this needs a higher "
+" national Luxury rate. You can less forcefully express a preference to celebrate by using the Happy slider.<br><b>NOTE:</b> In cities with"
+" overlapping tiles, it's best to avoid competing with your Governor: manage both cities manually, or both via the Governor.<br><br>"
+" <b>ADVANCED:</b><br><b>I. <u>TILE REFRESH</u>.</b> The Governor only re-arranges tiles when population changes, or a foreign military unit occupies"
+" a worked tile. The City Governor Tab can help you optimally refresh the tile arrangement"
+" at other important times, such as: (<b>1</b>) New tile improvements"
+" finished, such as Irrigation. (<b>2</b>) A new Building changes output bonuses. (<b>3</b>) Pollution."
+"  (<b>4</b>) Change in tax rates. (<b>5</b>) The turn before growth, to collect other resources instead of exceeding"
+" the food surplus needed to grow.<br>You can manually request cities to refresh tiles: (<b>a</b>) In single cities, refresh tiles with the On-Screen settings by clicking"
+" <b>Set Once</b>. In the city tile view, clicking the city-center-tile will also auto-arrange, using the existing Governor settings. (<b>2</b>) You can click <b>Refresh All</b> to make all cities refresh their tiles according to their saved City Governor Settings."
+" (<b>c</b>) In the City List, click the upper-left Clipboard button to refresh tiles in selected cities.<br>"
+" <b>II. <u>COPY/PASTE CLIPBOARD</u>.<br></b> You may want to apply specific City Governor Settings to multiple cities."
+" Advanced buttons let you do this. (<b>1</b>) <b>Copy</b> copies On-Screen Settings to the Clipboard."
+" (<b>2</b>) <b>Paste</b> pastes the Clipboard to On-Screen Settings. (<b>3</b>) <b>Set Once</b> tells the Governor to refresh tiles according to"
+" On-Screen Settings, <i>without</i> changing his current saved orders. (<b>4</b>) <b>Set All</b> dangerously tells ALL Governors in ALL Cities to"
+" refresh their tiles according to the On-Screen Settings, <i>without</i> changing their current saved orders. (<b>5</b>) <b>Save All</b> dangerously"
+" tells ALL Governors in ALL Cities to immediately adopt the On-Screen Settings as their new orders. (<b>6</b>) Instead of 'Set All'"
+" or 'Save All', you can selectively Set or Save multiple cities via the upper-left Clipboard in the City List: (<b>a</b>) SHIFT-CLICK to <b>set</b>"
+" selected cities to Clipboard Settings <i>without</i> changing orders. (<b>b</b>) CTRL-CLICK to <b>save</b> the Clipboard Settings to every selected city."
+" <b>NOTE:</b> Be careful with advanced macro buttons! It's easy to confuse multiple origins (Clipboard or On-Screen Settings) and multiple destinations"
+" (interim order, permanent order; one city, some cities, all cities, etc.)";
/**************************************************************************
Init Governor tab - returns true if the tab was able to generate
**************************************************************************/
function show_city_governor_tab()
{ // Reject cases which can't show the Governor: -----------------------------------------------
  if (client_is_observer() || client.conn.playing == null) return false;
  if (!active_city) return false;
  if (!active_city['cm_parameter']) {
    $("#city_governor_tab").html("City Governor unavailable.");
    return false;
  }
  if (city_owner_player_id(active_city) != client.conn.playing.playerno) {
    $("#city_governor_tab").html("City Governor available only for domestic cities.");
    return false;
  }
  if (!client_rules_flag[CRF_MP2_C]) {
    // Temporarily disallow in normal games until vetted in development ruleset:
    // TODO: remove this if-block in April 2021.
    $("#city_governor_tab").html("Sorry! This ruleset does not yet support the City Governor.");
    return false;
  }
  // --------------------------------------------------------------------------------------------
  cma_init_data();  // Retrieve city's current cm_parameter into the UI state vars.
  const id = "#city_governor_tab";
  var dhtml = "<header><div id='cma_status' style='font-size: 150%'>"
                        + cma_get_status_icon()+" City Governor <b>" 
                        + cma_get_status_text(cma_enabled) + "d</b><br></div><header>";
  // Toggle enable/disable governor button:
  dhtml += "<button type='button' class='button ui-button ui-corner-all' onclick='button_pushed_toggle_cma();' id='btn_toggle_cma' title='"+cma_get_status_text(!cma_enabled)+" city governor in this city'>";
  dhtml += "<b>"+cma_get_status_text(!cma_enabled)+"</b></button>";
  // Refresh screen button:
  dhtml +="<button type='button' class='button ui-button ui-corner-all' onclick='button_pushed_refresh_cma();' id='btn_refresh_cma' title='Reset or refresh the On-Screen Settings back to the saved state of the City Governor Settings.'>";
  dhtml += "Reload</button>";
  // Help button:
  dhtml +="<button type='button' class='button ui-button ui-corner-all' style='float:right' onclick='show_governor_help();' title='How to use City Governors'>";
  dhtml += "Help</button>";

  // Main slider panel:
  dhtml += "<form name='cma_vals'><table border='0'><th style='font-size:150%'>Output Priorities</th>";
  // Basic Vals:
  var pic_str = "<img style='' class='lowered_gov' src='";
  for (i=0; i<O_LAST; i++) {
    const name = O_NAME[i]; // Food, Shield, Trade, Gold, etc.
    dhtml += "<tr> <td><span style='margin-left:-30px; float:right'><b>"+name+" </b>"+pic_str+O_PIC[i]+"'></td> <td><div class='horizontal dynamic-slider-control slider' id='cma-val-slider-"+name+"'></div> </td>"
    dhtml += "<td> <div id='"+name+"_val_result' style='float:left;'></div> </td></tr>"
  }
  const name = "<span title='The relative importance of celebration vs. the other raw outputs. Use the Force Celebration checkbox to ensure celebration.'>Happy Factor</span>"
  dhtml += "<tr> <td><span style='margin-left:-30px; float:right'><b>"+name+" </b>&#x1F60A;</td> <td><div class='horizontal dynamic-slider-control slider' id='cma-happy-slider'></div> </td>"
  dhtml += "<td> <div id='happy_result' style='float:left;'></div> </td></tr>"
  dhtml += "</table></form>";
  dhtml += "<br><input type='checkbox' onchange='cma_user_input();' id='cma_celebrate'><b><span style='font-size:110%;'>Force Celebration</span></b> &nbsp;";
  dhtml += "<input type='checkbox' title='Suppress all specialists who do not prevent disorder.' onchange='cma_user_input();' id='cma_specialists'><span style='font-size:110%;'>Suppress Specialists</span> &nbsp;";
  dhtml += "<input type='checkbox' onchange='cma_user_input();' id='cma_disorder'><span style='font-size:110%;'>Allow Disorder</span> <br>";

  dhtml += "<br><form name='cma_min_vals'><table border='0' style='color: #000000;'><th style='font-size:150%'>Minimum Surplus</th>";
  // Min Surplus Vals:
  for (i=0; i<O_LAST; i++) {
    const name = O_NAME[i]; // Food, Shield, Trade, Gold, etc.
    dhtml += "<tr> <td><span style='margin-left:-30px; float:right'><b>"+name+" </b>"+pic_str+O_PIC[i]+"'></td> <td><div class='horizontal dynamic-slider-control slider' id='cma-min-slider-"+name+"'></div> </td>"
    dhtml += "<td> <div id='"+name+"_min_result' style='float:left;'></div> </td></tr>"
  }
  dhtml += "</table></form>";
  dhtml += "<br><button type='button' class='button ui-button ui-corner-all' onclick='button_pushed_cma_save();' id='btn_set_cma' title='Save On-Screen Settings as the new City Governor Setttings for this city.'>Save</button>";
  dhtml += "<button type='button' class='button ui-button ui-corner-all' onclick='button_pushed_cma_apply();' id='btn_apply_cma' title='Set city tiles to match On-Screen Settings without changing the current City Governor Settings.'>Set Once</button>";
  dhtml += "<button type='button' class='button ui-button ui-corner-all' onclick='cma_copy_current();' title='Copy On-Screen Settings to Clipboard.'>Copy</button>";
  dhtml += "<button type='button' class='button ui-button ui-corner-all' onclick='cma_paste_clipboard();' title='Paste Clipboard to the On-Screen Settings.'>Paste</button>";
  dhtml += "<button type='button' class='button ui-button ui-corner-all' onclick='cma_all_cities(true);' title='Set tiles in all cities to match the Clipboard, without changing City Governor Settings.'>&#x26A0;&#xFE0F;Set All</button>";
  dhtml += "<button type='button' class='button ui-button ui-corner-all' onclick='cma_all_cities(false);' title='Paste and save Clipboard as the new City Governor Settings, for all cities.'>&#x26A0;&#xFE0F;Save All</button>";
  dhtml += "<button type='button' class='button ui-button ui-corner-all' onclick='cma_clipboard_macro(null,true);' title='Auto-arrange tiles in all cities with a Governor'>&#x26A0;&#xFE0F;Refresh All</button>";

  dhtml += "<div id='cma_unsaved_warning'>"+global_governor_message+"</div>";

  $(id).html(dhtml);

  // These need a setup delay to avoid a mess:
  setTimeout(function() {
    //$("#cma_helptext").html(gov_help);
    create_cma_sliders();
    setTimeout(function() {if (!create_cma_page()) return false;},350);
    setTimeout(update_cma_state,600); // 350+250=600
  },2100);

  //cma_updater_interval = setInterval(cma_refresh, 500); NOT NEEDED
  return true;
}
/**************************************************************************
  Populates the UI states for the existing CMA or uses server defaults.
**************************************************************************/
function cma_init_data()
{
  const pcity = active_city;
  cma_user_changed = false;   

  cma_enabled = pcity['cma_enabled'];
  if (cma_enabled) {
    cma_val_sliders = [...pcity['cm_parameter']['factor']];
    cma_min_sliders = [...pcity['cm_parameter']['minimal_surplus']];
    cma_happy_slider = pcity['cm_parameter']['happy_factor'];
    cma_celebrate = pcity['cm_parameter']['require_happy'];
    cma_allow_specialists = pcity['cm_parameter']['allow_specialists'];
    cma_allow_disorder = pcity['cm_parameter']['allow_disorder'];

    // Currently not changeable, but always on:
    cma_max_growth = pcity['cm_parameter']['max_growth'];
  }
  else {
    cma_set_default_city_manager(); // sets UI vars to server's CMA defaults
  }
}
/**************************************************************************
Update Governor tab
**************************************************************************/
function create_cma_sliders() {
  if (client_is_observer() || client.conn.playing == null) return;

  for (i=0; i<O_LAST; i++) {
    const name = O_NAME[i]; // Food, Shield, Trade, Gold, etc.
    $("#cma-val-slider-"+name).html("<input class='slider-input' id='cma-val-slider-"+name+"-input' name='cma-val-slider-"+name+"-input'/>");
    s_val[i] = $("#cma-val-slider-"+name);
    $("#cma-min-slider-"+name).html("<input class='slider-input' id='cma-min-slider-"+name+"-input' name='cma-min-slider-"+name+"-input'/>");
    s_min[i] = $("#cma-val-slider-"+name);
    $("#cma-happy-slider").html("<input class='slider-input' id='cma-happy-slider-input' name='cma-happy-slider-input'/>");
    s_hpy = $("#cma-happy-slider");
  }
}
/**************************************************************************
  ...returns true if was able to do it, or else false
**************************************************************************/
function create_cma_page()
{
  const maxval = 25;    // value sliders have max of 25
  const min_min = -20;  // min surplus is -20
  const max_min = 20;   // max surplus is +20

  // Create sliders first, assign next. Might give processor more time to catch up.
      
  // Val sliders:
  for (var i = 0; i < O_LAST; i++) {
    var name = O_NAME[i];
    s_val[i] = new Slider(document.getElementById("cma-val-slider-"+name),
    document.getElementById("cma-val-slider-"+name+"-input"));
  }
  // Minimum surplus sliders:
  for (var i = 0; i < O_LAST; i++) {
    var name = O_NAME[i];
    s_min[i] = new Slider(document.getElementById("cma-min-slider-"+name),
    document.getElementById("cma-min-slider-"+name+"-input"));
  }
  for (var i = 0; i < O_LAST; i++) {
    s_val[i].setMaximum(maxval);
    s_val[i].setMinimum(0);
    s_val[i].setValue(cma_val_sliders[i]);
    s_val[i].setBlockIncrement(5);
    s_val[i].setUnitIncrement(1);
    s_val[i].onchange = cma_user_input;
  }
  for (var i = 0; i < O_LAST; i++) {
    s_min[i].setMaximum(max_min);
    s_min[i].setMinimum(min_min);
    s_min[i].setValue(cma_min_sliders[i]);
    s_min[i].setBlockIncrement(5);
    s_min[i].setUnitIncrement(1);
    s_min[i].onchange = cma_user_input;
  }
  s_hpy = new Slider(document.getElementById("cma-happy-slider"),
  document.getElementById("cma-happy-slider-input"));
  s_hpy.setMaximum(50);
  s_hpy.setMinimum(0);
  s_hpy.setValue(cma_happy_slider);
  s_hpy.setBlockIncrement(5);
  s_hpy.setUnitIncrement(1);
  s_hpy.onchange = cma_user_input;

  $("#cma_celebrate").prop("checked", cma_celebrate);
  $("#cma_celebrate").onchange = cma_user_input;

  $("#cma_specialists").prop("checked", (!cma_allow_specialists)); // suppress = !allow
  $("#cma_specialists").onchange = cma_user_input;

  $("#cma_disorder").prop("checked", cma_allow_disorder);
  $("#cma_disorder").onchange = cma_user_input;

  // Update all UI that dynamically changes with enabled/disabled state:
  cma_set_title();
  update_dynamic_UI();
  update_cma_labels();
  return true;
}
/**************************************************************************
  Changes dynamic parts of the page to reflect current events and states.
**************************************************************************/
function update_dynamic_UI()
{
  $("#btn_toggle_cma").html = cma_get_status_text(!cma_enabled)+" Governor";
  // Update warning message for saved/unsaved state changes:
  if (cma_user_changed) {
    $("#cma_unsaved_warning").html("<b>Warning: current values are not yet saved.</b>")
    $("#cma_unsaved_warning").show();
    $("#btn_set_cma").html("<b>Save</b>"); // bold to prompt user to save.
    global_governor_message=""; // always reset when newer message comes.
  } else {
    if (!global_governor_message)
      $("#cma_unsaved_warning").hide();
  }
}
/**************************************************************************
  1. Number labels next to sliders get updated.
  2. Stored UI states of sliders get recored.
**************************************************************************/
function update_cma_labels()
{
  for (var i=0; i < O_LAST; i++) {
    cma_val_sliders[i] = s_val[i].getValue();
    cma_min_sliders[i] = s_min[i].getValue();
    var name = O_NAME[i];
    $("#"+name+"_val_result").html("<b>"+cma_val_sliders[i] + "</b>");
    $("#"+name+"_min_result").html("<b>"+cma_min_sliders[i] + "</b>");
  }
  $("#happy_result").html("<b>"+cma_happy_slider + "</b>");
  cma_happy_slider = s_hpy.getValue();

  // Update all UI that dynamically changes with enabled/disabled state:
  cma_set_title();
  update_dynamic_UI(); // TODO: for better performance should maybe call in cma_user_input but it relies on cma_user_changed which not all buttons will set off.
}
/**************************************************************************
  Called when the user changes any of the settings
**************************************************************************/
function cma_user_input()
{
  cma_user_changed=true;
  update_cma_state();
}
/**************************************************************************
  Step one of synchronising UI state with variables recording them.
  This is for checkboxes, then proceeds to call it for update_cma_labels.
**************************************************************************/
function update_cma_state()
{
  cma_celebrate = $("#cma_celebrate").prop("checked");
  cma_allow_specialists = !($("#cma_specialists").prop("checked")); //suppress=!allow
  cma_allow_disorder = $("#cma_disorder").prop("checked");
  update_cma_labels();
}
/**************************************************************************
  Called when user clicks button to Enable/Disable governor.
**************************************************************************/
function button_pushed_toggle_cma() {
  cma_enabled = !cma_enabled;
  cma_apply_once = false;  // a regular cma command
  request_new_cma();
  $("#btn_set_cma").html("Save"); // unbold, latest state was already uploaded to server
  gov_refresh_timer = new Date().getTime(); //tells show_city_dialog this happened
}
/**************************************************************************
  Called when user hits button to upload new CMA values to the server.
**************************************************************************/
function button_pushed_cma_save() {
  cma_enabled = true;     // obviously true if requesting to turn on
  cma_apply_once = false; // a regular cma command
  update_cma_state();     // refresh UI state vars before saving
  request_new_cma();      // send new CMA off too server
  $("#btn_set_cma").html("Save"); // unbold, latest state was already uploaded to server
  gov_refresh_timer = new Date().getTime(); //tells show_city_dialog this happened
}
/**************************************************************************
  Called when user hits button to apply CMA values one time without
  altering ongoing settings (or lack thereof):
**************************************************************************/
function button_pushed_cma_apply() {
  cma_enabled = true;     // stand-in "true", will revert to whatever it was
  update_cma_state();     // refresh UI state vars before saving
  // a special cma command; apply once without altering anything:
  cma_apply_once = true;  
  request_new_cma();      // send new CMA off to server
  gov_refresh_timer = new Date().getTime(); //tells show_city_dialog this happened
}
/**************************************************************************
  Lets user refresh the screen, make sure it has right values or is 
  represented correctly.
**************************************************************************/
function button_pushed_refresh_cma() {
  $("#city_governor_tab").html("");
  show_city_governor_tab();
}
/**************************************************************************
  The title is dynamic: it tells whether CMA is enabled or disabled.
**************************************************************************/
function cma_set_title() {
  dhtml = cma_get_status_icon()+" City Governor <b>" 
        + cma_get_status_text(cma_enabled) + "d</b>."
  $("#cma_status").html(dhtml);
}
/**************************************************************************
  Sends new CMA parameters to the server, populated from the UI states.
**************************************************************************/
function request_new_cma() {
  var cm_parameter = {};
  cm_parameter['minimal_surplus'] = [...cma_min_sliders];
  cm_parameter['max_growth'] = cma_max_growth;
  cm_parameter['require_happy'] = cma_celebrate;
  cm_parameter['allow_disorder'] = cma_allow_disorder;
  cm_parameter['allow_specialists'] = cma_allow_specialists;
  cm_parameter['factor'] = [...cma_val_sliders];
  cm_parameter['happy_factor'] = cma_happy_slider;
  var packet = {
    "pid"       : packet_city_manager,
    "city_id"   : active_city['id'],
    "enabled"   : cma_enabled,
    "apply_once": cma_apply_once,
    "parameter" : cm_parameter
  }

  send_request(JSON.stringify(packet));
  cma_user_changed = false;

  //console.log("Sending CMA packet:")
  //add_client_message(JSON.stringify(packet));
  // TODO:  packet info that comes back to update city info, will, if the city_id matches active_city,
  // update some labels and enable/disable checkboxes, etc., in this tab, so that the info is visible
  // to the user in real time.  This includes any message about CMA had to release itself to user control.
}
/**************************************************************************
 Set default UI values to emulate cityturn.c::set_default_city_manager(..)
**************************************************************************/
function cma_set_default_city_manager() 
{
  const pcity = active_city;
  // Reset global UI vars
  cma_val_sliders = [0,0,0,0,0,0];   
  cma_min_sliders = [0,0,0,0,0,0];  
  cma_celebrate = false;
  cma_allow_disorder = false; 
  cma_allow_specialists = true;
  cma_max_growth = true; // Don't overdo food surplus if city grows @ TC
  
  if (pcity.size > 1) {
    if (pcity.size <= game_info.notradesize) {
      cma_val_sliders[O_FOOD] = 15;
    } 
    else {
      if (pcity.granary_size == pcity.food_stock) {
        /* We don't need more food if the granary is full. */
        cma_val_sliders[O_FOOD] = 0;
      }
      else {
        cma_val_sliders[O_FOOD] = 10;
      }
    }
  } 
  else {
    /* Growing to size 2 is the highest priority. */
    cma_val_sliders[O_FOOD] = 20;
  }
  cma_val_sliders[O_SHIELD]  = 5;
  cma_val_sliders[O_TRADE]   = 0;  /* Trade only provides gold/science. */
  cma_val_sliders[O_GOLD]    = 2;
  cma_val_sliders[O_LUXURY]  = 0;  /* Luxury only influences happiness. */
  cma_val_sliders[O_SCIENCE] = 2;
  cma_happy_slider = pcity.size >= 3 ? 1 : 0;
  if (pcity.granary_size == pcity.food_stock) {
    cma_min_sliders[O_FOOD] = 0;
  } else {
    cma_min_sliders[O_FOOD] = 1;
  }
  cma_min_sliders[O_SHIELD] = 1;
  cma_min_sliders[O_TRADE] = 0;
  cma_min_sliders[O_GOLD] = -20;
  cma_min_sliders[O_LUXURY] = 0;
  cma_min_sliders[O_SCIENCE] = 0;
}
/**************************************************************************
 Copy current state of the Governor settings (whether saved or unsaved)
 to the clipboard, for pasting.
**************************************************************************/
function cma_copy_current() {
  _cma_val_sliders = [...cma_val_sliders];
  _cma_min_sliders = [...cma_min_sliders];
  _cma_happy_slider = cma_happy_slider;
  _cma_celebrate = cma_celebrate;
  _cma_allow_disorder  = cma_allow_disorder;
  _cma_allow_specialists = cma_allow_specialists;
  _cma_max_growth = cma_max_growth;
  $("#cma_unsaved_warning").html("On-screen settings copied to clipboard.")
}
/**************************************************************************
 Paste the clipboard into the current state of the Governor UI.
**************************************************************************/
function cma_paste_clipboard() {
  const maxval = 25;    // value sliders have max of 25
  const min_min = -20;  // min surplus is -20
  const max_min = 20;   // max surplus is +20

  for (var i = 0; i < O_LAST; i++) {
    s_val[i].setValue(_cma_val_sliders[i]);
  }
  for (var i = 0; i < O_LAST; i++) {
    s_min[i].setValue(_cma_min_sliders[i]);
  }
  s_hpy.setValue(_cma_happy_slider);
  $("#cma_celebrate").prop("checked", _cma_celebrate);
  $("#cma_specialists").prop("checked", (!_cma_allow_specialists)); // suppress = !allow
  $("#cma_disorder").prop("checked", _cma_allow_disorder);
  // Update all UI that dynamically changes with enabled/disabled state:
  cma_set_title();
  update_dynamic_UI();
  update_cma_labels();
  cma_user_input();
}
/**************************************************************************
  Pastes CMA clipboard into a city's CMA settings on the server.
  Set apply_once=true if this is a temporary application,
  set apply_once=false if this is a permanent save to server  
**************************************************************************/
function cma_paste_to_city_id(city_id, apply_once)
{
  var cm_parameter = {};
  cm_parameter['minimal_surplus'] = [..._cma_min_sliders];
  cm_parameter['max_growth'] = _cma_max_growth;  
  cm_parameter['require_happy'] = _cma_celebrate;
  cm_parameter['allow_disorder'] = _cma_allow_disorder;
  cm_parameter['allow_specialists'] = _cma_allow_specialists;
  cm_parameter['factor'] = [..._cma_val_sliders];
  cm_parameter['happy_factor'] = _cma_happy_slider;
  var packet = {
    "pid"       : packet_city_manager,
    "city_id"   : city_id,  // caller supplied
    "enabled"   : true,     // has to be true for both actions
    "apply_once": apply_once,
    "parameter" : cm_parameter
  }
  send_request(JSON.stringify(packet));
}
/**************************************************************************
 ...
**************************************************************************/
function show_governor_help()
{
  show_dialog_message("Help",gov_help);
}
/**************************************************************************
  Buys (or attempts to buy) every production item in every selected city.
**************************************************************************/
function cma_all_cities(apply_once)
{
  // Mass send of packets to save or apply the clipboard:
  for (var city_id in cities)  {
    if (city_owner_player_id(cities[city_id]) == client.conn.playing.playerno) {
      cma_paste_to_city_id(parseInt(city_id), apply_once);
    }
  }
}
/**************************************************************************
  'Green Checked Box' or 'Red X' to visually indicate if CMA is on/off
**************************************************************************/
function cma_get_status_icon() {
  return cma_enabled ? "&#x2705 " : "&#x274c ";
}
/**************************************************************************
 Text to represent CMA is on or off.
**************************************************************************/
function cma_get_status_text(state) {
  return state ? "Enable" : "Disable"
}
/**************************************************************************
 Goes directly to view a particular city's governor.
**************************************************************************/
function cma_select_tab(city_id) {
  show_city_dialog_by_id(city_id);  // open city
  wait(300);
  $("#ctg").click();                // click gov tab
}
