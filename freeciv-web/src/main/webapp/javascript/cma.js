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
var cma_min_sliders = [1,0,0,0,0,0];  // UI supplied values for cm_parameter['minimal_surplus'][..]
var cma_happy_slider = 0;
var cma_celebrate = false;
var cma_allow_disorder = false;
var cma_no_farmer = false;
var cma_allow_specialists = true;
var cma_apply_once = false;
var cma_enabled = false;
// current implementation allowed starving, with food min_surplus of 20,
// even when positive food was available:
var cma_max_growth = false;
var MIN_SURPLUS_MAX = 150;  // How far up the min surplus sliders will go

// Governor Clipboard for copy/paste:
var _cma_val_sliders = [1,0,0,0,0,0];
var _cma_min_sliders = [1,0,0,0,0,0];
var _cma_happy_slider = 0;
var _cma_celebrate = false;
var _cma_allow_disorder = false;
var _cma_no_farmer = false;
var _cma_allow_specialists = true;
var _cma_max_growth = false;

var cma_user_changed = false;         // state var for whether user made any changes
var gov_refresh_timer = 0;
var global_governor_message = "";     // for intercepting and displaying CMA messages from server


const gov_help =
"<big><b class='unit_desc'>BASICS:</b></big><br>City Governors help you manage cities. When city population changes, they arrange citizens to work the tiles "
+" that best achieve the goals of the On-Screen Settings. Governors can also change citizens to specialists and prevent disorder."
+" Saving the On-Screen Settings is how you hire a Governor to achieve certain output goals. There are two kinds"
+" of sliders: (<b>1</b>) <b>Minimum Surplus</b> sliders set the minimum floor to achieve. For example, {Food=3} tells the Governor to gather"
+" at least +3 food. (<b>2</b>) <b>Output Priorities</b> tell the Governor the priorities of outputs relative to each other. For example, setting"
+" {Science=2, Shield=1} will value science at 2x the value of shields. The Governor would select shields over bulbs only when he gets more than 2"
+" shields in exchange for 1 bulb. If you set goals the Governor can't fulfill, he resigns and passes control back to you. In general,"
+" use 'Minimum Surpluses' as a fail-safe floor, and 'Output Priorities' to target preferred output.<br>"
+" The <b>Force Celebrate</b> option orders your Governor to achieve celebration. Usually this needs a higher "
+" national Luxury rate. You can less forcefully tune celebration with the Happy Factor slider.<br><b>NOTE:</b> In cities with"
+" overlapping tiles, it's best to avoid competing with your Governor: manage both cities manually, or give both a Governor.<br><br>"
+" <b>SLIDER TIP:</b> For fine-tuning, click a slider and use LEFT- and RIGHT- ARROW keys.<br><br>"
+"<big><b class='unit_desc'>ADVANCED:</b></big><br><b>I. <u>TILE REFRESH</u>.</b> The Governor only re-arranges tiles when population changes or a foreign military unit occupies"
+" a worked tile. The City Governor Tab can help you optimally refresh the tile arrangement"
+" at other important times, such as: (<b>1</b>) New tile improvements"
+" finished, such as Irrigation. (<b>2</b>) A new Building changes output bonuses. (<b>3</b>) Pollution. (<b>4</b>) Migration of wild animals. "
+"  (<b>5</b>) Change in tax rates. (<b>6</b>) The turn before growth, to collect other resources instead of exceeding"
+" the food surplus needed to grow.<br>You can manually request cities to refresh tiles: (<b>a</b>) In single cities, refresh tiles with the On-Screen"
+" settings by clicking <b>Set Once</b>. In the city tile view, clicking the city-center-tile will also auto-arrange, using the existing Governor settings."
+" If the preference <b>Show Worked Tiles on Map</b>(SHIFT-W) is selected, CTRL-SHIFT-click on a city will do the same from the main map view."
+ "(<b>2</b>) You can click <b>Refresh All</b> to make all cities refresh their tiles according to their saved City Governor Settings."
+" (<b>c</b>) In the City List, click the upper-left Clipboard button to <i>selectively</i> refresh tiles in checkbox-selected cities.<br>"
+" <b>II. <u>COPY/PASTE CLIPBOARD</u>.<br></b> You may want to apply specific City Governor Settings to multiple cities."
+" Advanced buttons let you do this. (<b>1</b>) <b>Copy</b> copies On-Screen Settings to the Clipboard."
+" (<b>2</b>) <b>Paste</b> pastes the Clipboard to On-Screen Settings. (<b>3</b>) <b>Set Once</b> tells the Governor to refresh tiles according to"
+" On-Screen Settings, <i>without</i> changing his ongoing saved orders. (<b>4</b>) <b>Set All</b> dangerously tells ALL Governors in ALL Cities to"
+" refresh their tiles according to the <u>Clipboard</u> Settings, <i>without</i> changing their current saved orders. (<b>5</b>) <b>Save All</b> dangerously"
+" tells ALL Governors in ALL Cities to immediately adopt the <u>Clipboard</u> Settings as their new orders. (<b>6</b>) Instead of 'Set All'"
+" or 'Save All', you can selectively Set or Save multiple cities via the upper-left Clipboard in the City List: (<b>a</b>) SHIFT-CLICK to <b>set</b>"
+" selected cities to Clipboard Settings <i>without</i> changing orders. (<b>b</b>) CTRL-CLICK to <b>save</b> the Clipboard Settings to every checkbox-selected city."
+" <b>NOTE:</b> Be careful with advanced macro buttons! It's easy to confuse multiple origins (Clipboard or On-Screen Settings) and multiple destinations"
+" (interim order, permanent order; one city, some cities, all cities, etc.)";
/**************************************************************************
Init Governor tab - returns true if the tab was able to generate
**************************************************************************/
function show_city_governor_tab()
{ // Reject cases which can't show the Governor: -----------------------------------------------
  if (client_is_observer() || client.conn.playing == null) return false;
  if (!active_city) return false;
  // this should disable CMA in saved games started before CMA was put in:
  if (!active_city['cm_parameter']) {
    // could we just insert a cm_parameter for the city with a default?
    $("#city_governor_tab").html("Game was started before City Governor feature was added.");
    return false;
  }
  if (city_owner_player_id(active_city) != client.conn.playing.playerno) {
    $("#city_governor_tab").html("City Governor available only for domestic cities.");
    return false;
  }
  // --------------------------------------------------------------------------------------------
  cma_init_data();  // Retrieve city's current cm_parameter into the UI state vars.
  $("#cma_status").html(cma_get_status_icon()+" City Governor <b>"+cma_get_status_text(cma_enabled) + "d</b><br>");
  $("#btn_toggle_cma").prop("title", cma_get_status_text(!cma_enabled)+" city governor in this city");
  $("#btn_toggle_cma").html("<b>"+cma_get_status_text(!cma_enabled)+"</b></button>");
  create_cma_sliders();
  create_cma_page();
  update_cma_state();

  // These won't set inside civclient.css, so we do it here:
  $(".ui-slider-handle").css("background", "url('/images/slider_prod.png')");
  $(".ui-slider").css("background", "url('/images/string.png')");
  $("#cma-val-slider-Food").children().css("background-image", "url('/images/slider_food.png')");
  $("#cma-val-slider-Shield").children().css("background-image", "url('/images/slider_prod.png')");
  $("#cma-val-slider-Trade").children().css("background-image", "url('/images/slider_trade.png')");
  $("#cma-val-slider-Gold").children().css("background-image", "url('/images/slider_gold.png')");
  $("#cma-val-slider-Luxury").children().css("background-image", "url('/images/slider_lux.png')");
  $("#cma-val-slider-Science").children().css("background-image", "url('/images/slider_sci.png')");
  $("#cma-happy-slider").children().css("background-image", "url('/images/slider_happy.png')");
  $("#cma-min-slider-Food").children().css("background-image", "url('/images/slider_food.png')");
  $("#cma-min-slider-Shield").children().css("background-image", "url('/images/slider_prod.png')");
  $("#cma-min-slider-Trade").children().css("background-image", "url('/images/slider_trade.png')");
  $("#cma-min-slider-Gold").children().css("background-image", "url('/images/slider_gold.png')");
  $("#cma-min-slider-Luxury").children().css("background-image", "url('/images/slider_lux.png')");
  $("#cma-min-slider-Science").children().css("background-image", "url('/images/slider_sci.png')");

  if (!is_small_screen() && !touch_device) {
    $('#btn_toggle_cma').tooltip({ position: { my:"left bottom", at: "left top-4"}, show: { delay:350, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0} });
    $('#btn_refresh_cma').tooltip({ position: { my:"left bottom", at: "left top-4"}, show: { delay:350, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0} });
    $('#btn_cma_help').tooltip({ position: { my:"right bottom", at: "right top-4"}, show: { delay:350, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0} });

    $('#btn_set_cma').tooltip({ position: { my:"left top", at: "left bottom-4"}, show: { delay:350, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0} });
    $('#btn_apply_cma').tooltip({ position: { my:"left top", at: "left bottom-4"}, show: { delay:350, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0} });
    $('#btn_copy_cma').tooltip({ position: { my:"center top", at: "center bottom-4"}, show: { delay:350, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0} });
    $('#btn_paste_cma').tooltip({ position: { my:"center top", at: "center bottom-4"}, show: { delay:350, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0} });
    $('#btn_cma_setall').tooltip({ position: { my:"center top", at: "center bottom-4"}, show: { delay:350, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0} });
    $('#btn_setall_cma').tooltip({ position: { my:"center top", at: "center bottom-4"}, show: { delay:350, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0} });
    $('#btn_cma_saveall').tooltip({ position: { my:"center top", at: "center bottom-4"}, show: { delay:350, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0} });
    $('#btn_cma_refreshall').tooltip({ position: { my:"center top", at: "center bottom-4"}, show: { delay:350, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0} });
  }

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
    cma_no_farmer = pcity['cm_parameter']['max_growth']; /* temp. used as substitute for no_farmer because wasn't latter wasn't building into our return packets! */
    //cma_max_growth = pcity['cm_parameter']['max_growth']; see above, unused param used instead for no_farmer (for now)
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

  if (!is_small_screen()) {
    $(".cma_slider").css("width", 720);
  }

  for (i=0; i<O_LAST; i++) {
    const name = O_NAME[i]; // Food, Shield, Trade, Gold, etc.

    $("#cma-val-slider-"+name).slider({ value: cma_val_sliders[i], min:0, max:25 });
    $("#cma-val-slider-"+name).slider("enable");
    $("#cma-min-slider-"+name).slider({ value: cma_min_sliders[i], min:-20, max:MIN_SURPLUS_MAX });
    $("#cma-min-slider-"+name).slider("enable");
    //$("#cma-val-slider-"+name).css("width", 160);  // let .css file do it
    //$("#cma-min-slider-"+name).css("width", 160);

    $("#cma-val-slider-"+name).slider({"slide": cma_user_slide, "change": cma_user_input});
    $("#cma-min-slider-"+name).slider({"slide": cma_user_slide, "change": cma_user_input});
  }
  $("#cma-happy-slider").slider({ value: cma_happy_slider, min:0, max:50 });
  $("#cma-happy-slider").slider("enable");
  //$("#cma-happy-slider").css("width", 160);
  $("#cma-happy-slider").slider({"slide": cma_user_slide, "change": cma_user_input});
}
/**************************************************************************
  ...returns true if was able to do it
**************************************************************************/
function create_cma_page()
{
  $("#cma_celebrate").prop("checked", cma_celebrate);
  $("#cma_celebrate").onchange = cma_user_input;

  $("#cma_specialists").prop("checked", (!cma_allow_specialists)); // suppress = !allow
  $("#cma_specialists").onchange = cma_user_input;

  $("#cma_disorder").prop("checked", cma_allow_disorder);
  $("#cma_disorder").onchange = cma_user_input;

  $("#cma_nofarmer").prop("checked", cma_no_farmer);
  $("#cma_nofarmer").onchange = cma_user_input;

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
    var name = O_NAME[i];
    cma_val_sliders[i] = $("#cma-val-slider-"+name).slider("option", "value");
    cma_min_sliders[i] = $("#cma-min-slider-"+name).slider("option", "value");
    $("#"+name+"_val_result").html("<b>"+cma_val_sliders[i]+"</b>");
    $("#"+name+"_min_result").html("<b>"+cma_min_sliders[i]+"</b>");
  }
  cma_happy_slider = $("#cma-happy-slider" ).slider( "option", "value" );
  $("#happy_result").html("<b>"+cma_happy_slider+"</b>");

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
  Called when the user is in the process of sliding a slider.
  Has to correct for glitch in jquery slider that reports a different
  value from what it will decide after mouseup
**************************************************************************/
function cma_user_slide()
{
  var h,v,m;

  cma_user_changed=true;
  for (var i=0; i < O_LAST; i++) {
    var name = O_NAME[i];
    v = $("#cma-val-slider-"+name).slider("option", "value");
    m = $("#cma-min-slider-"+name).slider("option", "value");
    // Heuristic that fixes majority of glitchy value reporting by jq widget:
    if (v<cma_val_sliders[i]) v--; else if (v>cma_val_sliders[i]) v++;
    if (m<cma_min_sliders[i]) m--; else if (m>cma_min_sliders[i]) m++;
    $("#"+name+"_val_result").html("<b>"+v+"</b>");
    $("#"+name+"_min_result").html("<b>"+m+"</b>");
  }
  h = $("#cma-happy-slider" ).slider( "option", "value" );
  // correct jquery slider glitch:
  if (h<cma_happy_slider) h--; else if (h>cma_happy_slider) h++;
  $("#happy_result").html("<b>"+h+"</b>");

  // Update all UI that dynamically changes with enabled/disabled state:
  cma_set_title();
  update_dynamic_UI();
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
  cma_no_farmer = $("#cma_nofarmer").prop("checked");
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
  // cm_parameter['max_growth'] = cma_max_growth; see below
  cm_parameter['require_happy'] = cma_celebrate;
  cm_parameter['allow_disorder'] = cma_allow_disorder;
  cm_parameter['max_growth'] = cma_no_farmer; /* temp. used as substitute for no_farmer because wasn't latter wasn't building into our return packets! */
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
  cma_no_farmer = false;
  cma_allow_specialists = true;
  cma_max_growth = false; /* temp. used as substitute for no_farmer because wasn't latter wasn't building into our return packets! */

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
  _cma_no_farmer = cma_no_farmer;
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
    var name = O_NAME[i];
    $("#cma-val-slider-"+name).slider({"value":_cma_val_sliders[i]});
    $("#cma-min-slider-"+name).slider({"value":_cma_min_sliders[i]});
  }
  $("#cma-happy-slider").slider({"value":_cma_happy_slider});

  $("#cma_celebrate").prop("checked", _cma_celebrate);
  $("#cma_specialists").prop("checked", (!_cma_allow_specialists)); // suppress = !allow
  $("#cma_disorder").prop("checked", _cma_allow_disorder);
  $("#cma_nofarmer").prop("checked", _cma_no_farmer);

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
  //cm_parameter['max_growth'] = _cma_max_growth;  currently not used so used as a substitute for no_farmer
  cm_parameter['require_happy'] = _cma_celebrate;
  cm_parameter['allow_disorder'] = _cma_allow_disorder;
  cm_parameter['max_growth'] = _cma_no_farmer; /* temp. used as substitute for no_farmer because wasn't latter wasn't building into our return packets! */
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
  show_dialog_message("Help",gov_help,true);
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
