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

var IDENTITY_NUMBER_ZERO = 0;

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

  if (C_S_RUNNING != client_state() || cardboard_vr_enabled) return;

  var status_html = "";

  if (client.conn.playing != null) {
    var pplayer = client.conn.playing;
    var tax = client.conn.playing['tax'];
    var lux = client.conn.playing['luxury'];
    var sci = client.conn.playing['science'];

    var net_income = pplayer['expected_income'];
    if (pplayer['expected_income'] > 0) {
      net_income = "+" + pplayer['expected_income'];
    }

    // PUT FLAG TO LEFT OF NATION NAME
    if (!is_small_screen()) {
      var pplayer = client.conn.playing;
      var pnation = nations[pplayer['nation']];
      var tag = pnation['graphic_str'];
  
      var civ_flag = "";
      if (!pnation['customized']) {
        civ_flag += "<img class='lowered_gov' src='/images/flags/" + tag + "-web" + get_tileset_file_extention() + "' width='60'>";
        status_html += "<span style='cursor:pointer;'>"+civ_flag+"</span>";
      } 
    }
    
    if (!is_small_screen()) status_html += "<b>" + nations[pplayer['nation']]['adjective'] + "</b> &nbsp;";
    
/*************** Government type mini-icon that's clickable for revolution */
    if (!is_small_screen()) {

      status_html += "<span style='cursor:pointer;' onclick='javascript:show_revolution_dialog()'>";
      
      if (client.conn.playing['government'] == 0) status_html += "<img class='lowered_gov' src='/images/gov.anarchy.png' title='Anarchy'>";
      else if (client.conn.playing['government'] == 1) status_html += "<img class='lowered_gov' src='/images/gov.despotism.png' title='Despotism'>";
      else if (client.conn.playing['government'] == 2) status_html += "<img class='lowered_gov' src='/images/gov.monarchy.png' title='Monarchy'>";
      else if (client.conn.playing['government'] == 3) status_html += "<img class='lowered_gov' src='/images/gov.communism.png' title='Communism'>";
      else if (client.conn.playing['government'] == 4) status_html += "<img class='lowered_gov' src='/images/gov.republic.png' title='Republic'>";
      else if (client.conn.playing['government'] == 5) status_html += "<img class='lowered_gov' src='/images/gov.democracy.png' title='Democracy'>";
      else if (client.conn.playing['government'] == 6) status_html += "<img class='lowered_gov' src='/images/gov.fundamentalism.png' title='Fundamentalism'>";
      else if (client.conn.playing['government'] == 7) status_html += "<img class='lowered_gov' src='/images/gov.tribalism.png' title='Tribalism'>";
      else if (client.conn.playing['government'] == 8) status_html += "<img class='lowered_gov' src='/images/gov.federation.png' title='Federation'>";
    }
    status_html += "</span>";

    if (!is_small_screen()) status_html += "<span style='cursor:pointer;' onclick='javascript:request_report(2)'>"; // type 2 is demographics
    if (!is_small_screen()) status_html += "&nbsp; <i class='fa fa-child' aria-hidden='true' title='Total Citizens in all Cities'></i>: ";
    if (!is_small_screen()) status_html += "<b>" + city_size_sum(client.conn.playing.playerno) + "</b>  &nbsp;&nbsp;";
    if (!is_small_screen()) status_html += "<i class='fa fa-clock-o' aria-hidden='true' title='Year (turn)'></i>: <b>" + get_year_string() + "</b> &nbsp;&nbsp;</span>";
    status_html += "<i class='fa fa-money' aria-hidden='true' title='Gold (net income)'></i>: ";
    if (pplayer['expected_income'] >= 0) {
      status_html += "<b title='Gold (net income)'>";
    } else {
      status_html += "<b class='negative_net_income' title='Gold (net income)'>";
    }
    status_html += pplayer['gold'] + " (" + net_income + ")</b>  &nbsp;&nbsp;";
    status_html += "<span style='cursor:pointer;' onclick='javascript:show_tax_rates_dialog();'><i class='fa fa-btc' aria-hidden='true' title='Tax rate'></i>: <b>" + tax + "</b>% ";
    status_html += "<i class='fa fa-music' aria-hidden='true' title='Luxury rate'></i>: <b>" + lux + "</b>% ";
    status_html += "<i class='fa fa-flask' aria-hidden='true' title='Science rate'></i>: <b>" + sci + "</b>% &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> ";
  
  } else if (server_settings != null && server_settings['metamessage'] != null) {
    status_html += server_settings['metamessage']['val']
                   + " Observing - ";
    status_html += "Turn: <b>" + game_info['turn'] + "</b>  ";
  }

  if ($(window).width() - sum_width() > 800) {
    if ($("#game_status_panel_top").length) {
      $("#game_status_panel_top").show();
      $("#game_status_panel_bottom").hide();
      $("#game_status_panel_top").html(status_html);
    }
  } else {
    if ($("#game_status_panel_bottom").length) {
      $("#game_status_panel_top").hide();
      $("#game_status_panel_bottom").show();
      $("#game_status_panel_bottom").css({"width": $(window).width(),"pointer-events":"none" }); ////
      $("#game_status_panel_bottom").html(status_html);
      //// these changes in control.js and game.js made container not clickable but children unclickable also
      //$("#game_status_panel_bottom").children().css("pointer-events", "auto"); //// children clickable, container not
    }
  }


  var page_title = "Freeciv-web - " + username
                                    + "  (turn:" + game_info['turn'] + ", port:"
                                    + civserverport + ") ";
  if (server_settings['metamessage'] != null) {
    page_title += server_settings['metamessage']['val'];
  }
  document.title = page_title;


}

/**************************************************************************
  Returns the year and turn as a string.
**************************************************************************/
function get_year_string()
{
  var year_string = "";
  if (game_info['year'] < 0) {
    year_string = Math.abs(game_info['year'])
                  + calendar_info['negative_year_label'] + " ";
  } else if (game_info['year'] >= 0) {
    year_string = game_info['year']
                  + calendar_info['positive_year_label'] + " ";
  }
  if (is_small_screen()) {
    year_string += "(T:" + game_info['turn'] + ")";
  } else {
    year_string += "(Turn:" + game_info['turn'] + ")";
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
    if ($(this).is(":visible") && $(this).attr('id') != "game_status_panel_top") sum += $(this).width();
  });
  return sum;
}