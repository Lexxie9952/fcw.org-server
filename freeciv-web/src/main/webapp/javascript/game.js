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

var game_info = null;
var calendar_info = null;
var game_rules = null;
var ruleset_control = null;
var ruleset_summary = null;
var ruleset_description = null;

// Define all tab placements here for centralised control.
const TAB_MAP = 0,
      TAB_EMPIRE = 1,
      TAB_GOV = 2,
      TAB_TECH = 3,
      TAB_NATIONS = 4,
      TAB_CITIES = 5,
      TAB_PREFS = 6,
      TAB_HELP = 7;
      TAB_WARCALC = 8;

function game_init()
{
  map = {};
  terrains = {};
  resources = {};
  players = {};
  units = {};
  unit_types = {};
  connections = {};
  client.conn = {};
  // for some reason it wasn't automatically setting these like the other simpleStorage vars,
  // so we have to put it in here:
  graphic_theme_path = simpleStorage.get('grtheme');
  if (!graphic_theme_path) graphic_theme_path = "themes/greek/";

  // TO DO: make then call a dynamic CSS changer here, and also in the change() function in options.js
}

function game_find_city_by_number(id)
{
  return cities[id];
}

/**************************************************************************
  Find unit out of all units in game: now uses fast idex method,
  instead of looking through all units of all players.
**************************************************************************/
function game_find_unit_by_number(id)
{
  return units[id];
}

/**************************************************************************
 Count the # of thousand citizen in a civilisation.
**************************************************************************/
function civ_population(playerno) {
  var population = 0;

  for (var city_id in cities) {
    var pcity = cities[city_id];
    if (playerno == pcity['owner']) {
      population += city_population(pcity);
    }
  }
  return numberWithCommas(population * 1000);
}

/**************************************************************************
The "real" population info no one ever told - total number of actual citizens
**************************************************************************/
function city_size_sum(playerno) {
  var population = 0;

  for (var city_id in cities) {
    var pcity = cities[city_id];
    if (playerno == pcity['owner']) {
      population += (pcity['size']+1);  // +1 because size 1 cities have 2 citizens
    }
  }
  return population;   // TO DO: return population.toLocaleString(); -- if we want separators for when it goes over 1k
}


/**************************************************************************
  ...
**************************************************************************/
function update_game_status_panel() {
  if (C_S_RUNNING != client_state() || was_supercow) {
    // was_supercow makes a "fake player" to turn off observer interaction lock
    return;
  }

  var status_html = "";
  var msg_title_prefix = unread_messages > 0 ? "Unread messages.&#013;&#010;&#013;&#010;Click = " : ""
  // unread message counter with toggle message window

  status_html = "<span onclick='toggle_msgbox();' style='cursor: pointer;' title='"+msg_title_prefix
              + (current_message_dialog_state == "minimized" ? "Show" : "Hide")
              + " message window'><img src='/images/e/chat.png' height='16px'>"
              + "<font color='#ff8080'>&nbsp;<b>"
              + ((unread_messages>0) ? unread_messages : "")
              +"</b>&nbsp;&nbsp;&nbsp;</font></span>";

  if (client.conn.playing != null) {
    var pplayer = client.conn.playing;
    var tax = client.conn.playing['tax'];
    var lux = client.conn.playing['luxury'];
    var sci = client.conn.playing['science'];

    if (income_needs_refresh) city_force_income_update();

    var net_income = pplayer['expected_income'].toString();
    var income_str = (net_income.slice(-2) == ".5") ? (net_income.substring(0, net_income.length - 2) + "</b>&#189<b>") : net_income;

    if (pplayer['expected_income'] >= 0) {
      net_income = "+" + income_str;
    } else net_income = income_str;

    // PUT FLAG TO LEFT OF NATION NAME
    if (!is_small_screen()) {
      var pplayer = client.conn.playing;
      var pnation = nations[pplayer['nation']];
      var tag = pnation ? pnation['graphic_str'] : null;

      var civ_flag = "";
      if (!pnation['customized']) {
        civ_flag += "<img class='lowered_gov' style='background-color:transparent;margin-top:-3px;margin-right:3px;' src='/images/flags/" + tag + "-web" + get_tileset_file_extention() + "' width='42'>";
        status_html += "<span>"+civ_flag+"</span>";
      }
    }

    if (!is_small_screen()) status_html += "<span style='cursor:default;'><b>" + nations[pplayer['nation']]['adjective'] + "</b></span> &nbsp;";

/*************** Government type mini-icon that's clickable for revolution */
    if (!is_small_screen()) {

      status_html += "<span style='cursor:pointer;' onclick='javascript:show_revolution_dialog()'>";

      var gov_name = governments[client.conn.playing['government']]['name'];
      var gov_modifier = get_gov_modifier(client.conn.playing.playerno, "", true);

      if (gov_name == "Anarchy") status_html += "<img class='lowered_gov' src='/images/gov.anarchy.png' title='Anarchy'>";
      else if (gov_name == "Despotism") status_html += "<img class='lowered_gov' src='/images/gov.despotism.png' title='Despotism'>";
      else if (gov_name == "Monarchy") status_html += "<img class='lowered_gov' src='/images/gov.monarchy"+gov_modifier+".png' title='"+gov_modifier+" Monarchy'>";
      else if (gov_name == "Communism") status_html += "<img class='lowered_gov' src='/images/gov.communism.png' title='Communism'>";
      else if (gov_name == "Republic") status_html += "<img class='lowered_gov' src='/images/gov.republic.png' title='Republic'>";
      else if (gov_name == "Democracy") status_html += "<img class='lowered_gov' src='/images/gov.democracy.png' title='Democracy'>";
      else if (gov_name == "Fundamentalism") status_html += "<img class='lowered_gov' src='/images/gov.fundamentalism.png' title='Fundamentalism'>";
      else if (gov_name == "Theocracy") status_html += "<img class='lowered_gov' src='/images/gov.theocracy.png' title='Theocracy'>";
      else if (gov_name.startsWith("Tribal")) status_html += "<img class='lowered_gov' src='/images/gov.tribalism.png' title='Tribalism'>";
      else if (gov_name == "Federation") status_html += "<img class='lowered_gov' src='/images/gov.federation.png' title='Federation'>";
      else if (gov_name == "Nationalism") status_html += "<img class='lowered_gov' src='/images/gov.nationalism.png' title='Nationalism'>";
      else status_html += "<img class='lowered_gov' src='/images/gov.despotism.png' title='"+gov_name+"'>"; // other gov/custom ruleset
    }
    status_html += "</span>";

    if (!is_small_screen()) status_html += "<span style='cursor:pointer;' title='Total Citizens in all Cities.&#013;&#010;&#013;&#010;Click = Demographics Report' onclick='javascript:request_report(2)'>"; // type 2 is demographics
    if (!is_small_screen()) status_html += "&nbsp; <i style='color:#ffc8c0' class='fa fa-child' aria-hidden='true'></i> ";
    if (!is_small_screen()) status_html += "<b>" + city_size_sum(client.conn.playing.playerno) + "</b>  &nbsp;&nbsp;";
    if (!is_small_screen()) status_html += "<i style='color:#d8dff0' class='fa fa-clock-o' aria-hidden='true' title='Year &mdash; Turn&#013;&#010;&#013;&#010;Click = Demographics Report'></i> <b title='Year &mdash; Turn&#013;&#010;&#013;&#010;Click = Demographics Report'>" + get_year_string() + "</b> &nbsp;&nbsp;</span>";
    status_html += "<img class='v' height='21px' width='24px' style='margin-right:-4px; margin-bottom:3px' src='/images/e/coinage.png' title='Treasury'> ";

    var income_color = "<b";
    // colour for positive/zero/negative income
    if (pplayer['expected_income'] < 0) income_color += " class='negative_net_income' title='Deficit'";
    else if (pplayer['expected_income'] > 0) {
      income_color += income_calculated_by_client
       ? " style='color:#89c06a; cursor:default' title='Income'" : " style='color:#a2b095; cursor:default' title='Income'";
    }
    else { income_color += income_calculated_by_client
       ? " style='color:#919191; cursor:default' title='No Income'" : " style='color:#a2a2a2; cursor:default' title='No Income'"
    }

    status_html += "<b style='color:#ffde80; cursor:default;' title='Gold reserves'>"+pplayer['gold']
    + "</b> "+income_color+" style='cursor:default;'>" + net_income + "</b>"+"  &nbsp;&nbsp;";
    status_html += "<span style='cursor:pointer;' onclick='javascript:show_tax_rates_dialog();'><img class='sb' height='18px' style='margin-right:-4px' src='/images/e/gold.png' title='Gold Tax rate'> <b title='Gold Tax rate' style='color:#fff0d1'>"
    + tax + "</b><span title='Gold Tax rate' style='color:#bcbcbc'>%</span> &nbsp;";
    status_html += "<img class='sb' height='17px' width='16px' style='margin-right:-1px' src='/images/e/quavers.png' title='Luxury rate'> <b title='Luxury rate' style='color:#f5e4ff'>" + lux + "</b><span title='Luxury rate' style='color:#bcbcbc'>%</span> &nbsp;";
    const sci_title = "Science:\n"+(techs[client.conn.playing['researching']]===undefined ? (techs[client.conn.playing['tech_goal']]===undefined ? "No goal" : techs[client.conn.playing['tech_goal']]['name']+" (goal)")
                                                                                          : techs[client.conn.playing['researching']]['name']) +"\n"
                    + client.conn.playing['bulbs_researched']
                    + (client.conn.playing['researching_cost'] ? " / " + client.conn.playing['researching_cost'] +" bulbs\n" + bulb_output_text
                                                             : " extra bulbs\n" + bulb_output_text);
    status_html += "<img class='sb' height='17px' style='margin-right:-2px' src='/images/e/sci.png' title='"+sci_title+"'> <b title='"+sci_title+"' style='color:#ebfaff'>" + sci + "</b><span title='"+sci_title+"' style='color:#bcbcbc'>%</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> ";

  } else if (server_settings != null && server_settings['metamessage'] != null) {    // Status message for gamemasters/admins/supercows:
    status_html += "Observing - Turn <b>" + game_info['turn'] + "</b> -";
    var status_message = "";
    if (server_settings['metamessage']['val'].indexOf('|') != -1) {
      // extract the game identifier string out of the longer metamessage
      status_message = server_settings['metamessage']['val'].substr(0,server_settings['metamessage']['val'].indexOf('|'));
    }
    status_html += status_message + " &nbsp; &nbsp; &nbsp; &nbsp; ";  // pad to prevent turn done button overwrite.
  }

  if ($(window).width() - sum_width() > 880) {   // was 800 but 740 is the space available on standard screen and it's adequate
    if ($("#game_status_panel_top").length) {
      $("#game_status_panel_bottom").hide();

      // Reduce flicker on slower/inefficient browsers: Don't redraw/reset status bar if it hasn't changed.
      if ( !($("#game_status_panel_top").is(":visible")) ) {
        $("#game_status_panel_top").show();
      }
      if (status_html != $("#game_status_panel_top").html()) {
        $("#game_status_panel_top").html(status_html); //update only if changed
      }
    }
  } else {
    if ($("#game_status_panel_bottom").length) {
      $("#game_status_panel_top").hide();

      // If show_order_buttons==3, then all lower panels are OFF to maximize map space
      if (show_order_buttons != 3) {
        if ( !($("#game_status_panel_bottom").is(":visible")) ) {
          $("#game_status_panel_bottom").show();
        }
        $("#game_status_panel_bottom").css({"width": $(window).width(),"pointer-events":"none" }); ////
        if (status_html != $("#game_status_panel_bottom").html()) {
          $("#game_status_panel_bottom").html(status_html); // update only if changed
        }
      }
    }
  }

  var name = client.conn.playing ? client.conn.playing.name : username;
  var page_title = "Freeciv " + name + " T" + game_info['turn'];
  if (server_settings['metamessage'] != null) {
    var status_message = server_settings['metamessage']['val'];
    if (status_message.indexOf('|') != -1) {
      // extract the game identifier string out of the longer metamessage
      status_message = status_message.substr(0,server_settings['metamessage']['val'].indexOf('|'));
    }
    page_title += " "+status_message;
  }
  document.title = page_title;

  $("#game_status_panel_top").tooltip({
    show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  });
}

/**************************************************************************
  Returns the year and turn as a string.
**************************************************************************/
function get_year_string()
{
  var year_string = "";
  if (game_info['year'] < 0) {
    year_string = Math.abs(game_info['year'])
                  + calendar_info['negative_year_label'];
  } else if (game_info['year'] >= 0) {
    year_string = game_info['year']
                  + calendar_info['positive_year_label'];
  }
  if (is_small_screen()) {
    year_string += " (T:" + game_info['turn'] + ")";
  } else {
    year_string += "&#x2014;Turn " + game_info['turn'];
  }
  return year_string;
}

/**************************************************************************
  Return timeout value for the current turn.
**************************************************************************/
function current_turn_timeout()
{
  if (game_info['turn'] == 1 && game_info['first_timeout'] != -1) {
    return game_info['first_timeout'];
  } else {
    return game_info['timeout'];
  }
}



/**************************************************************************
  ...
**************************************************************************/
function sum_width()
{
  var sum=0;
  $("#tabs_menu").children().each( function(){
    if ($(this).is(":visible")
        && $(this).attr('id') != "game_status_panel_top"
        && $(this).attr('id').startsWith("ixtjkiller")) {

        sum += $(this).width();
    }
  });
  return sum;
}