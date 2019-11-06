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
  $(id).remove();
  $("<div id='revolution_dialog'></div>").appendTo("div#game_page");

  if (client.conn.playing == null) return;

  var dhtml = "Current form of government: " + governments[client.conn.playing['government']]['name']
	  + "<br>To start a revolution, select the new form of government:"
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
					$("#revolution_dialog").dialog('close');
				}
			  }

  });


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
    if (!pnation['customized']) {
	    civ_description += "<img src='/images/flags/" + tag + "-web" + get_tileset_file_extention() + "' width='180'>";
	}

    civ_description += "<br><div>" + pplayer['name'] + " rules the " + nations[pplayer['nation']]['adjective']
	    + " with the form of government: " + governments[client.conn.playing['government']]['name']
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
    governments_list_html += "<button class='govt_button' id='govt_id_" + govt['id'] + "' "
	                  + "onclick='set_req_government(" + govt['id'] + ");' "
			  + "title='" + govt['helptext'] + "'>" +  govt['name'] + "</button>";
  }

  $("#governments_list").html(governments_list_html);

  for (govt_id in governments) {
    govt = governments[govt_id];
    if (!can_player_get_gov(govt_id)) {
      $("#govt_id_" + govt['id'] ).button({ disabled: true, label: govt['name'], icons: {primary: govt['rule_name']} });
    } else if (requested_gov == govt_id) {
    $("#govt_id_" + govt['id'] ).button({label: govt['name'], icons: {primary: govt['rule_name']}}).css("background", "green");
    } else if (client.conn.playing['government'] == govt_id) {
      $("#govt_id_" + govt['id'] ).button({label: govt['name'], icons: {primary: govt['rule_name']}}).css("background", "#BBBBFF").css("font-weight", "bolder");
    } else {
      $("#govt_id_" + govt['id'] ).button({label: govt['name'], icons: {primary: govt['rule_name']}});
    }

  }
  $(".govt_button").tooltip();
  $(".govt_button").tooltip({
    open: function (event, ui) {
        ui.tooltip.css({"max-width":"100%", "width":"88%", "margin-top":"55px", "margin-left":"-95px", "overflow":"visible"});
    }
});
}


/**************************************************************************
   ...
**************************************************************************/
function start_revolution()
{
  if (requested_gov != -1) {
      for (var unit_id in units) {
        punit = units[unit_id];
        if (punit['owner'] == client.conn.playing.playerno) {
          if (punit['activity']==ACTIVITY_CONVERT) {
            request_new_unit_activity(punit, ACTIVITY_IDLE, EXTRA_NONE);
          }
        }    
      }

      var cur_gov = governments[client.conn.playing['government']];
      if (do_worklists(cur_gov['name'], governments[requested_gov]['name']))
        setTimeout(send_player_change_government(requested_gov),800);
      else send_player_change_government(requested_gov);
      requested_gov = -1;
  }
}

/**************************************************************************
   ...
**************************************************************************/
function do_worklists(cur_gov, new_gov)
{
  var altered = false;

  for (city_id in cities) {
    var pcity=cities[city_id];
    if (pcity['owner'] != client.conn.playing.playerno) continue;
     
    if (cur_gov == "Fundamentalism" && new_gov != "Fundamentalism") {
      if (pcity['worklist'] != null && pcity['worklist'].length != 0) {
        var before = pcity['worklist'].length;
        pcity['worklist'] = pcity['worklist'].filter(list_item => !(list_item['kind']==VUT_UTYPE && unit_types[list_item['value']]['name'] == "Fanatics") );
        if (before != pcity['worklist'].length) {send_city_worklist(pcity['id']);altered = true;}
      }
      if (pcity['production_kind']==VUT_UTYPE && unit_types[pcity['production_value']]['name'] == "Fanatics") {
        altered=true;
        if (pcity['worklist'] != null && pcity['worklist'].length) {
          send_city_change(pcity['id'],pcity['worklist'][0]['kind'],pcity['worklist'][0]['value']);
          pcity['worklist'].shift();
          send_city_worklist(pcity['id']);
        } else {send_city_change(pcity['id'], VUT_IMPROVEMENT, Object.keys(improvements).length-1);}
      }
    } else if (cur_gov == "Communism" && new_gov != "Communism") {
      if (pcity['worklist'] != null && pcity['worklist'].length != 0) {
        var before = pcity['worklist'].length;
        pcity['worklist'] = pcity['worklist'].filter(list_item => !(list_item['kind']==VUT_UTYPE && unit_types[list_item['value']]['name'] == "Proletarians") );
        if (before != pcity['worklist'].length) {send_city_worklist(pcity['id']);altered = true;}
      }
      if (pcity['production_kind']==VUT_UTYPE && unit_types[pcity['production_value']]['name'] == "Proletarians") {
        altered=true;
        if (pcity['worklist'] != null && pcity['worklist'].length) {
          send_city_change(pcity['id'],pcity['worklist'][0]['kind'],pcity['worklist'][0]['value']);
          pcity['worklist'].shift();
          send_city_worklist(pcity['id']);
        } else {send_city_change(pcity['id'], VUT_IMPROVEMENT, Object.keys(improvements).length-1);}
      }
    }
  }  
  return altered;
}

/**************************************************************************
   ...
**************************************************************************/
function set_req_government(gov_id)
{
  requested_gov = gov_id;
  update_govt_dialog();
}

/**************************************************************************
 ...
**************************************************************************/
function send_player_change_government(govt_id)
{
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
  if (govt_id == 0) {
    // Anarchy
    return 100;
  } else if (govt_id == 1) {
    //Despotism
    return 60;
  } else if (govt_id == 2) {
    // Monarchy
    return 70;
  } else if (govt_id == 3) {
    //Communism
    return 80;
  } else if (govt_id == 4) {
    //Republic
    return 80;
  } else if (govt_id == 5) {
    //Democracy
    return 100;
  } else if (govt_id == 6) {
      //Fundamentalism
      return 80;
  } else if (govt_id == 7) {
        //Tribalism
        return 60;
  } else if (govt_id == 8) {
    //Federation
    return 90;
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
