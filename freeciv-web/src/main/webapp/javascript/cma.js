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


// Global vars that allow multiple functions to work on the City Governor
var cma_val_sliders = [1,0,0,0,0,0];  // UI supplied values for cm_parameter['factor'][..]
var s_val = ["","","","","",""];                        // corresponding UI sliders
var cma_min_sliders = [1,0,0,0,0,0];  // UI supplied values for cm_parameter['minimal_surplus'][..]
var s_min = ["","","","","",""];                        // corresponding UI sliders
var cma_celebrate = false;
var cma_enabled = false;
var cma_updater_interval;
var cma_allow_disorder = false; 
var cma_allow_specialists = true;
var cma_max_growth = false;
var cma_happy_slider = 0;
var cma_user_changed = false;         // state var for whether user made any changes

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
  var governor_tab_html = "<header><div id='cma_status' style='font-size: 150%'>"
                        + cma_get_status_icon()+" City Governor <b>" 
                        + cma_get_status_text(cma_enabled) + "d</b>.<span id='cma_help' style='float:right;'>&#x2753;</span></div><br>";
  var dhtml = "<button type='button' class='button ui-button ui-corner-all' onclick='button_pushed_toggle_cma();' id='btn_toggle_cma' title='"+cma_get_status_text(!cma_enabled)+" city governor in this city'>";
  dhtml += "<b>"+cma_get_status_text(!cma_enabled)+'</b> Governor</button></header><br>';
  dhtml += "<form name='cma_vals'><table border='0'><th style='font-size:150%'>Output Priorities</th>";
  // Basic Vals:
  var pic_str = "<img style='' class='lowered_gov' src='";
  for (i=0; i<O_LAST; i++) {
    const name = O_NAME[i]; // Food, Shield, Trade, Gold, etc.
    dhtml += "<tr> <td><span style='margin-left:-30px; float:right'><b>"+name+" </b>"+pic_str+O_PIC[i]+"'></td> <td><div class='horizontal dynamic-slider-control slider' id='cma-val-slider-"+name+"'></div> </td>"
    dhtml += "<td> <div id='"+name+"_val_result' style='float:left;'></div> </td></tr>"
  }
  dhtml += "</table></form>";
  dhtml += "<br><form name='cma_min_vals'><table border='0' style='color: #000000;'><th style='font-size:150%'>Minimum Surplus</th>";
  // Min Surplus Vals:
  for (i=0; i<O_LAST; i++) {
    const name = O_NAME[i]; // Food, Shield, Trade, Gold, etc.
    dhtml += "<tr> <td><span style='margin-left:-30px; float:right'><b>"+name+" </b>"+pic_str+O_PIC[i]+"'></td> <td><div class='horizontal dynamic-slider-control slider' id='cma-min-slider-"+name+"'></div> </td>"
    dhtml += "<td> <div id='"+name+"_min_result' style='float:left;'></div> </td></tr>"
  }
  dhtml += "</table></form>";
  dhtml += "<br><input type='checkbox' style='font-size:120%' onchange='cma_user_input();' id='cma_celebrate'><b>Force Celebration</b><br>";
  dhtml += "<br><div id='cma_unsaved_warning'></div>";
  dhtml += "<button type='button' class='button ui-button ui-corner-all' onclick='button_pushed_cma_save();' id='btn_set_cma' title='Saves new settings for the City Governor'><b>Save</b></button>";

  governor_tab_html += dhtml;
  $(id).html(governor_tab_html);

  var helpstr = "The City Governor helps manage cities. It deploys citizens on the city's free tiles to regulate output. It can change citizens to specialists, if needed. The governor has another ability: it can try to prevent disorder."
  +" You can tell your Governor what kind of output you want. There are two kinds of sliders: On the bottom, you set a Minimum Surplus for each kind of output; e.g. Gold=3 tells the Governor to earn at least 3 gold more than it needs for building upkeep. The top sliders define preference for one kind of output over others: setting Shield=1,Science=3 means you value 1 bulb as equal to 3 shields."
  +" If you set goals that your Governor can't fulfill, he resigns and passes control back to you. Use Minimum Surpluses conservatively and rely on Priorities to achieve your goals."
  +" The Force Celebrate checkbox tells your Governor to do what he can to make your people celebrate. This usually only works if you help him out with a higher luxury rate."
  +" Beware of using the Governor in some cities: you may encounter difficulties with the overlapping cities nearby. It's best to manage both overlapping cities the same way: by yourself or by Governor.";
  // These need a setup delay to avoid a mess:
  setTimeout(function() {
    //$("#cma_helptext").html(helpstr);
    create_cma_sliders();
    wait(250);
    create_cma_page();
    wait(350);
    update_cma_state();
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
    cma_celebrate = pcity['cm_parameter']['require_happy'];

    // Currently not used but part of the cm_parameter:
    cma_allow_disorder = pcity['cm_parameter']['allow_disorder'];
    cma_allow_specialists = pcity['cm_parameter']['allow_specialists'];
    cma_max_growth = pcity['cm_parameter']['max_growth'];
    cma_happy_slider = pcity['cm_parameter']['happy_factor'];
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
  }
}
/**************************************************************************
  ...
**************************************************************************/
function create_cma_page()
{
  const maxval = 25;    // value sliders have max of 25
  const min_min = -20;  // min surplus is -20
  const max_min = 20;   // max surplus is +20

  for (var i = 0; i < O_LAST; i++) {
    // Val sliders:
    var name = O_NAME[i];
    s_val[i] = new Slider(document.getElementById("cma-val-slider-"+name),
    document.getElementById("cma-val-slider-"+name+"-input"));

    s_val[i].setMaximum(maxval);
    s_val[i].setMinimum(0);
    s_val[i].setValue(cma_val_sliders[i]);
    s_val[i].setBlockIncrement(1);
    s_val[i].setUnitIncrement(1);
    s_val[i].onchange = cma_user_input;
  }
  for (var i = 0; i < O_LAST; i++) {
    // Minimum surplus sliders:
    var name = O_NAME[i];
    s_min[i] = new Slider(document.getElementById("cma-min-slider-"+name),
    document.getElementById("cma-min-slider-"+name+"-input"));

    s_min[i].setMaximum(max_min);
    s_min[i].setMinimum(min_min);
    s_min[i].setValue(cma_min_sliders[i]);
    s_min[i].setBlockIncrement(1);
    s_min[i].setUnitIncrement(1);
    s_min[i].onchange = cma_user_input;
  }
  $("#cma_celebrate").prop("checked", cma_celebrate);
  $("#cma_celebrate").onchange = cma_user_input;
  // Update all UI that dynamically changes with enabled/disabled state:
  cma_set_title();

  update_dynamic_UI();

  update_cma_labels();
}
/**************************************************************************
  ...
**************************************************************************/
function update_dynamic_UI()
{
  $("#btn_toggle_cma").html = cma_get_status_text(!cma_enabled)+" Governor";
  // Update warning message for saved/unsaved state changes:
  if (cma_user_changed) {
    $("#cma_unsaved_warning").html("<b>Warning: current values are not yet saved.</b>")
    $("#cma_unsaved_warning").show();
  } else $("#cma_unsaved_warning").hide();
}
/**************************************************************************
  ...
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
  ...
**************************************************************************/
function update_cma_state()
{
  cma_celebrate = $("#cma_celebrate").prop("checked");
  update_cma_labels();
}
/**************************************************************************
  ...
**************************************************************************/
function button_pushed_toggle_cma() {
  //var state = !(active_city['cma_enabled'])
  //active_city['cma_enabled'] = state;
  cma_enabled = !cma_enabled;
  request_new_cma();
  setTimeout(create_cma_page, 2000);
}
/**************************************************************************
  called when user hits button to save new CMA values
**************************************************************************/
function button_pushed_cma_save() {
  cma_enabled = true;     // obviously true if requesting to turn on
  update_cma_state();     // refresh UI state vars before saving
  request_new_cma();      // send new CMA off too server
  setTimeout(create_cma_page, 2000);
}
/**************************************************************************
  This is periodically called to submit and display rates, in order to 
  avoid laggy overload and unneeded server packet sending/receiving
**************************************************************************
function cma_refresh()
{
  // only submit rates if they changed
  if (cma_rates_changed) {
    cma_rates_changed = false;
    update_cma_state();
  }
} THIS FUNCTION WASN'T NEEDED.*/
/**************************************************************************
  The title is dynamic: it displays whether CMA is enabled or disabled.
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
  cm_parameter['max_growth'] = true;  // no-brainer to not do extra food surplus
  cm_parameter['require_happy'] = cma_celebrate;
  cm_parameter['allow_disorder'] = false;   // keep default server CM behaviour
  cm_parameter['allow_specialists'] = true; // keep default server CM behaviour
  cm_parameter['factor'] = [...cma_val_sliders];
  cm_parameter['happy_factor'] = 0; // TODO: figure out what this does and set this later. **********************************************

  var packet = {
    "pid"       : packet_city_manager,         // !!!!!!!! need to regen or upload src/derived/webapp/javascript/packets.js !!!!!!!!!!!!!!!!!!!!!!!!!
    "city_id"   : active_city['id'],
    "enabled"   : cma_enabled,
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
  Checked box or Red X to visually indicate if CMA is on/off
**************************************************************************/
function cma_get_status_icon() {
    return cma_enabled ? "&#x2705 " : "&#x274c ";
}
/**************************************************************************
...
**************************************************************************/
function cma_get_status_text(state) {
    return state ? "Enable" : "Disable"
}

/**************************************************************************
 Set default UI values to emulate cityturn.c::set_default_city_manager
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
  cma_happy_slider = 0;
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