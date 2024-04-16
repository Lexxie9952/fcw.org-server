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

var governments = {};
var requested_gov = -1;

var REPORT_WONDERS_OF_THE_WORLD = 0;
var REPORT_TOP_5_CITIES = 1;
var REPORT_DEMOGRAPHIC = 2;
var REPORT_ACHIEVEMENTS = 3;

var GOV_LAST = -1; // set in handle_ruleset_government() when server tells us the ruleset.
                   // -1 causes a failsafe for checking gov_requirement on whether units
                   // can be built, so worst case is displaying units you can't make with cur_gov.

/**************************************************************************
   ...
**************************************************************************/
function show_revolution_dialog()
{
  const revo_height = 680;  // default height of dialog for normal screen
  var extended_height = 0;  // extended height for rulesets with lots of verbose titles and govs
  var revo_width = "490";   // more govs means more verbose differentiation (e.g. civ2civ3)
  var num_govs = Object.keys(governments).length;

  if (num_govs > 7) {
    extended_height = 48 * (num_govs - 7);
    revo_width = "780"; // extra horizontal to accomodate more verbosity
  }
  if (revo_height + extended_height >= $(window).height()) {
    extended_height = $(window).height() - revo_height - 4;
  }

  var id = "#revolution_dialog";
  remove_active_dialog(id);
  $("<div id='revolution_dialog'></div>").appendTo("div#game_page");

  if (client.conn.playing == null) return;

  var gov_name = governments[client.conn.playing['government']]['name'];
  if (gov_name == "Monarchy") gov_name = get_gov_modifier(client.conn.playing.playerno, "Monarchy", true) + " " + gov_name;

  var dhtml = "Current form of government: <b>" + gov_name
	          + "</b><br>To start a revolution, select a new form of government:"
            + "<p><div id='governments' >"
            + "<div id='governments_list'>"
            + "</div></div><br> ";

  $(id).html(dhtml);

  $(id).attr("title", "Start a Revolution!");
  $(id).dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "99%" : revo_width,
			height: is_small_screen() ? $(window).height() - 40 : (revo_height+extended_height),
			  buttons: {
          "Start revolution!" : function() {
            start_revolution();
            remove_active_dialog("#revolution_dialog");
				  }
			  }
  });

  dialog_register(id);
  update_govt_dialog();
}

/**************************************************************************
   ...
**************************************************************************/
function init_civ_dialog()
{
  if (!client_is_observer() && client.conn.playing != null) {

    var pplayer = client.conn.playing;
    var pnation = nations[pplayer['nation']];
    var tag = pnation['graphic_str'];

    var civ_description = "";
    var gov_modifier = get_gov_modifier(client.conn.playing.playerno, null, true); if (gov_modifier) gov_modifier += " ";
    if (!pnation['customized']) {
	    civ_description += "<img src='/images/flags/" + tag + "-web" + get_tileset_file_extention() + "' width='180'>";
    }

    civ_description += "<br><div>" + pplayer['name'] + " rules the " + nations[pplayer['nation']]['adjective']
	    + " with the form of government: " + gov_modifier + governments[client.conn.playing['government']]['name']
	    + "</div><br>";
    $("#nation_title").html("The " + nations[pplayer['nation']]['adjective'] + " nation");
    $("#civ_dialog_text").html(civ_description);

  } else {
    $("#civ_dialog_text").html("This dialog isn't available as observer.");
  }

}


/**************************************************************************
   ...
**************************************************************************/
function update_govt_dialog()
{
  var govt;
  var govt_id;
  if (client_is_observer()) return;

  var governments_list_html = "";

  for (govt_id in governments) {
    govt = governments[govt_id];
    let is_requested_gov = (requested_gov == govt_id);
    let is_current_gov   = (client.conn.playing['government'] == govt_id);
    let mod_class = "govt_button";
    if (is_requested_gov) mod_class = "govt_button_selected";
    if (is_current_gov)   mod_class = "govt_button_current";  // will override class styling of above indicating not a real change


    governments_list_html += "<button class='"+mod_class+"' id='govt_id_" + govt['id'] + "' "
	                  + "onclick='set_req_government(event, " + govt['id'] + ");' "
			  + "title='" + browser.metaKey +"-CLICK: read manual on " + govt['name']+ "'>" +  govt['name'] + "</button>";
  }

  $("#governments_list").html(governments_list_html);

  var magna_carta = get_gov_modifier(client.conn.playing.playerno, "Monarchy", false); // Allows secondary species of sub-governments

  var gov_modifier = "";
  for (govt_id in governments) {
    govt = governments[govt_id];
    gov_modifier = (govt['name'] == "Monarchy" ? magna_carta : "");

    label_html = "<img class='lowered_gov' src='/images/e/"+govt['name'].toLowerCase()+gov_modifier+".png'>&nbsp;&nbsp;&nbsp;"
               + capitalize(gov_modifier) + " " + govt['name']
               + "<img class='govt_button_image' src='/images/e/techs/"+govt['name'].toLowerCase()+gov_modifier+".png'> "

    if (!can_player_get_gov(govt_id)) {
      $("#govt_id_" + govt['id']).button({ disabled: true, label: label_html});
    }
    else {
      $("#govt_id_" + govt['id']).button({label: label_html});
      $("#govt_id_" + govt['id']).tooltip({
        show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
      });
    }
  }
}


/**************************************************************************
   ...
**************************************************************************/
function start_revolution()
{
  console.log("start revolution()")
  if (requested_gov != -1) {
      for (var unit_id in units) {
        punit = units[unit_id];
        if (punit['owner'] == client.conn.playing.playerno) {
          if (punit['activity']==ACTIVITY_CONVERT) {
            request_new_unit_activity(punit, ACTIVITY_IDLE, EXTRA_NONE);
          }
        }
      }
      var cur_gov = governments[client.conn.playing['government']]['id'];
      if (do_worklists(cur_gov, governments[requested_gov]['id']))
        setTimeout(send_player_change_government(requested_gov),1500); // delay to remove Fanatics from 134 cities;
      else send_player_change_government(requested_gov);
      requested_gov = -1;

      /* old code for calling do_worklists, used strings as gov identifiers.
         new code wants id to do a cleaner check */
      /*var cur_gov = governments[client.conn.playing['government']];
      if (do_worklists(cur_gov['name'], governments[requested_gov]['name']))
        setTimeout(send_player_change_government(requested_gov),800);
      else send_player_change_government(requested_gov);
      requested_gov = -1;*/
  }
}

/**************************************************************************
   When changing government, clear illegal production from worklist
**************************************************************************/
function do_worklists(cur_gov_id, new_gov_id)
{
  var altered = false;

  // THIS was a clean-up of DIRTY hard-coding. If it fails, see commits for 23Feb2021 to revert.
  for (city_id in cities) {
    var pcity=cities[city_id];
    if (pcity['owner'] != client.conn.playing.playerno) continue;             // don't bother with unowned cities
    if (pcity['worklist'] == null || pcity['worklist'].length == 0) continue; // don't bother with null worklists
    var prev_worklist_len = pcity['worklist'].length;
    var cur_prod_is_legal = true;
    for (ut_id in unit_types) {
      if (unit_types[ut_id].gov_requirement < GOV_LAST && unit_types[ut_id].gov_requirement != new_gov_id) {
        // We have iterated to a unit type that is not allowed under the new gov. Force wipe it from the worklist.
        pcity['worklist'] = pcity['worklist'].filter(list_item => !(list_item['kind']==VUT_UTYPE && list_item['value'] == ut_id));
        if (pcity['production_kind']==VUT_UTYPE && pcity['production_value'] == ut_id) {
          // Current prod in this city is of the illegal type. Flag it to take action AFTER everything in worklist got purged.
          altered=true;
          cur_prod_is_legal=false;
        }
      }
    }
    // If illegal types were removed from worklist, tell the server our new worklist for this city.
    if (prev_worklist_len != pcity['worklist'].length) {
      send_city_worklist(pcity['id']);
      altered = true; // lets caller know we might be making heavy server traffic on changing lots of worklists
    }
    // Only after worklist is purged remove illegal current_production:    (to avoid it became null or bumping up another illegal unit to cur_prod)
    if (!cur_prod_is_legal) {
      if (pcity['worklist'] != null && pcity['worklist'].length) {
        send_city_change(pcity['id'],pcity['worklist'][0]['kind'],pcity['worklist'][0]['value']);
        pcity['worklist'].shift();
        send_city_worklist(pcity['id']);
      } else {send_city_change(pcity['id'], VUT_IMPROVEMENT, Object.keys(improvements).length-1);}
    }
  }
  return altered;
}

/**************************************************************************
   ...
**************************************************************************/
function set_req_government(event, gov_id)
{
  if (metaKey(event)) {
    remove_active_dialog("#revolution_dialog");
    help_redirect(VUT_GOVERNMENT, gov_id);
    return;
  }
  requested_gov = gov_id;
  update_govt_dialog();
}

/**************************************************************************
 ...
**************************************************************************/
function send_player_change_government(govt_id)
{
  console.log("send_player_change_government")
  var packet = {"pid" : packet_player_change_government,
                "government" : govt_id };
  send_request(JSON.stringify(packet));
}

/**************************************************************************
 Returns the max tax rate for a given government.
 FIXME: This shouldn't be hardcoded, but instead fetched
 from the effects.
**************************************************************************/
function government_max_rate(govt_id)
{
  var govt = governments[govt_id]['name'];
  if (govt == "Anarchy") {
    return 100;
  } else if (govt == "Despotism") {
    return 60;
  } else if (govt == "Monarchy") {
    if (client_rules_flag[CRF_MP2_E]
        && player_has_wonder(client.conn.playing.playerno, improvement_id_by_name(B_MAGNA_CARTA))) {
      return 75;  // MP2E onward gets 75% max rate for Magna Carta
    }
    else return 70;
  } else if (govt == "Communism") {
    return 80;
  } else if (govt == "Republic") {
    return 80;
  } else if (govt == "Democracy") {
    return 100;
  } else if (govt == "Fundamentalism") {
    return 80;
  } else if (govt == "Tribalism") {
    return 60;
  } else if (govt == "Federation") {
    return 90;
  } else if (govt == "Nationalism") {
    return 90;
  } else if (govt == "Theocracy") {
    return 80;
  } else {
    // this should not happen
    return 100;
  }
}

/**************************************************************************
  Returns true iff the player can get the specified governement.

  Uses the JavaScript implementation of the requirement system. Is
  therefore limited to the requirement types and ranges the JavaScript
  requirement system can evaluate.
**************************************************************************/
function can_player_get_gov(govt_id)
{
  return (player_has_wonder(client.conn.playing.playerno, improvement_id_by_name(B_STATUE_OF_LIBERTY_NAME)) //hack for statue of liberty
          || are_reqs_active(client.conn.playing,
                      null,
                      null,
                      null,
                      null,
                      null,
                      null,
                      governments[govt_id]["reqs"],
                      RPT_CERTAIN));
}

/**************************************************************************
 ...
**************************************************************************/
function request_report(rtype)
{
  var packet = {"pid"  : packet_report_req,
                "type" : rtype};
  send_request(JSON.stringify(packet));
}



/**************************************************************************
 ...
**************************************************************************/
function show_climate_dialog(rtype)
{
  var title = "Climate Report";
  var message = "<br>";
  var warm_toler = Math.round((game_info['warminglevel']*100)/server_settings['globalwarming_percent']['val']);
  var warm_accum = game_info['globalwarming'] + warm_toler;
  var cold_toler = Math.round((game_info['coolinglevel']*100)/server_settings['nuclearwinter_percent']['val']);
  var cold_accum = game_info['nuclearwinter'] + cold_toler;

  message += "<span title='IF global warming occurs, the impact strength on the surface tiles of the planet.\n0% = none.\n100% = normal.\n101-10000 = elevated.'>"
          +"<b>Global Warming Strength</b>:&nbsp; " + game_info['global_warming'] +"%"
          + "</span><br>";

  message += "<span title='The current cumulative impact of existing pollution over recent turns, possibly accumulating higher beyond the tolerance to trigger Global Warming. A certain amount will naturally disperse each turn, if the impact caused by existing pollution is not greater.'>"
          +"<b>Global Warming Impact</b>:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; "
          + (game_info['globalwarming'] > 0 ? warm_accum : "<span title='The impact is below tolerance or a major climate disaster has recently reset the climate models.'>[unknown]</span>")
          + "<span title='One unit of Accumulated Climate Stress, whether in measuring impact to climate, or tolerance to the stress.'> ACS</span>"
          + "</span><br>";

  message += "<span title='The current tolerance of the climate after exposure to recent impacts. This represents the natural reduction per turn that the Earth can ecologically absorb and process, and thus, also the tolerance beyond which global warming has a chance to trigger.'>"
          +"<b>Global Warming Tolerance</b>: " + warm_toler
          + "<span title='One unit of Accumulated Climate Stress, whether in measuring impact to climate, or tolerance to that stress.'> ACS </span>"
          + "</span><br>";

  message += "<span title='This is a server setting. Higher numbers make Global Warming more likely, by altering the Global Warming Tolerance shown above. Default of 100% = unchanged.'>"
          +"<b>Global Warming Percent</b>:&nbsp;&nbsp;&nbsp; " + server_settings['globalwarming_percent']['val']
          + "%</span><br><br>";

  if (game_info['globalwarming'] > game_info['warminglevel'])
      message += "Scientists recommend immediate international action to halt habitat destruction from Global Warming!!<br><br>"
  else if (game_info['globalwarming'] > game_info['warminglevel'] *.5)
      message += "Scientists are concerned that pollution impact is too close to Climate Tolerance levels.<br><br>"

  message += "<br><span title='IF nuclear winter occurs, the impact strength on the surface tiles of the planet.\n0% = none.\n100% = normal.\n101-10000 = elevated.'>"
          + "<b>Nuclear Winter Strength</b>:&nbsp; " + game_info['nuclear_winter']+"%"
          + "</span><br>";

  message += "<span title='The current cumulative impact of existing fallout over recent turns, possibly accumulating higher beyond the tolerance to trigger Nuclear Winter. A certain amount will naturally disperse each turn, if the impact caused by existing fallout is not greater.'>"
          + "<b>Nuclear Winter Impact</b>:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; "
          + (game_info['nuclearwinter'] > 0 ? cold_accum : "<span title='The impact is below tolerance or a major climate disaster has recently reset the climate models.'>[unknown]</span>")
          + "<span title='One unit of Accumulated Climate Stress, whether in measuring impact to climate, or tolerance to that stress.'> ACS </span>"
          + "</span><br>";

  message += "<span title='The current tolerance of the climate after exposure to recent impacts. This represents the natural reduction per turn that the Earth can ecologically absorb and process, and thus, also the tolerance beyond which nuclear winter has a chance to trigger.'>"
          + "<b>Nuclear Winter Tolerance</b>: " + cold_toler
          + "<span title='One unit of Accumulated Climate Stress, whether in measuring impact to climate, or tolerance to that stress.'> ACS </span>"
          + "</span><br>";

  message += "<span title='This is a server setting. Higher numbers make Nuclear Winter more likely, by altering the Nuclear Winter Tolerance shown above. Default of 100% = unchanged.'>"
          +"<b>Nuclear Winter Percent</b>:&nbsp;&nbsp;&nbsp; " + server_settings['nuclearwinter_percent']['val']
          + "%</span><br><br>";

  if (game_info['nuclearwinter'] > game_info['coolinglevel'])
      message += "Scientists recommend immediate international action to halt habitat destruction from Nuclear Winter!!<br>"
  else if (game_info['nuclearwinter'] > game_info['coolinglevel'] *.5)
      message += "Scientists are concerned that fallout impact is too close to Climate Tolerance levels.<br>"

  message += "<br><i style='font-size:90%; color=#888;'>Hover over data for explanations."
  remove_active_dialog("#dialog");
  $("<div id='dialog'></div>").appendTo("div#game_page");

  $("#dialog").html(message);
  $("#dialog").attr("title", title);
  $("#dialog").dialog({
      bgiframe: true,
      modal: true,
      width: is_small_screen() ? "90%" : "40%",
      buttons: {
        'Close (𝗪)': function() {
          remove_active_dialog("#dialog");
        }
      }
    });

  $("#dialog").dialog('open');
  dialog_register("#dialog");
  $("#dialog").parent().css("overflow","visible"); // required to not clip tooltips
  $("#dialog").css("background-image","url(/images/bg-med-dark-text.jpg");

  $("#dialog span").tooltip({ tooltipClass: "tt_slim",
    show: { delay:100, effect:"none", duration: 0},
    hide: { delay:0,   effect:"none", duration: 0}
  });

}

/************************************************
*
************************************************/
function get_gov_modifier(playerno, gov_name, uppercase) {
  if (!client_rules_flag[CRF_MP2_C]) return "";

  if (!gov_name) gov_name = governments[players[playerno]['government']]['name'];
  var gov_modifier = "";

  if (players[playerno].wonders[improvement_id_by_name(B_MAGNA_CARTA)]) {
    if (gov_name == "Monarchy") gov_modifier = uppercase ? "Constitutional" : "constitutional";
  }
  return gov_modifier;
}
