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

var nations = {};
var nation_groups = [];
var diplstates = {};
var selected_player = -1;


/**************************************************************************
 ...
**************************************************************************/
function update_nation_screen()
{
  var total_players = 0;
  var no_humans = 0;
  var no_ais = 0;

  // Carefully set up display mode controls:  wide, reduced standard, tiny:
  var wide_screen = $(window).width()<1340 ? false : true;
  var narrow_screen = $(window).width()<1000 ? true : false;
  var small_screen = is_small_screen();
  var landscape_screen = $(window).width() > $(window).height() ? true : false; 
  var tiny_screen=false;
  var redux_screen=false;  // mid-size screen
  
  // narrow screen triggers tiny screen (becase we need width for city rows)
  // if small_screen and not landscape, that's also a tiny screen:
  if (small_screen || narrow_screen) {
      tiny_screen = true; redux_screen=false; wide_screen = false;
  } else if (!wide_screen) {
      if (narrow_screen) {
        tiny_screen=true; redux_screen=true;  wide_screen = false;
      }
      else {
        tiny_screen=false ;redux_screen=true; wide_screen = false;
      }
  }/*
  console.log("Wide:   "+wide_screen);
  console.log("Landscp:"+landscape_screen);
  console.log("Redux:  "+redux_screen);
  console.log("Small:  "+small_screen);
  console.log("Narrow: "+narrow_screen);
  console.log("Tiny:   "+tiny_screen);
  console.log("Scrollx:"+scroll_narrow_x);*/

  var header_titles = ["Flag", "Color", "Player Name", "Nation", "Attitude", "Score", "AI/Human", "Alive", "Diplomatic state", "Embassy", "Shared Vision", "Team", "State&nbsp;"];
  if (redux_screen || tiny_screen)
    header_titles = ["Flag", " ", "Name", "Nation", "Mood", "Score", "Type", "Alive", "Relation", "Embassy", "Vision", "Team", "State&nbsp;"];

  var center_style = " style='text-align:center;'";

  var nation_list_html = "<table class='tablesorter' id='nation_table' "+center_style+" width='95%' border=0 cellspacing=0 >"
	  + "<thead><tr id='nation_header_row'><th>"+header_titles[0]+"</th><th>"+header_titles[1]+"</th><th style='text-align:left;'>"+header_titles[2]+"</th>"
    + "<th"+center_style+">"+header_titles[3]+"</th><th "+center_style+"class='nation_attitude'>"+header_titles[4]+"</th><th"+center_style+">"
    + header_titles[5]+"</th><th"+center_style+">"+header_titles[6]+"</th><th"+center_style+">"+header_titles[7]+"</th>"
    + "<th"+center_style+">"+header_titles[8]+"</th><th"+center_style+">"+header_titles[9]+"</th><th"+center_style+">"+header_titles[10]
    + "</th><th"+center_style+" class='nation_team'>"+header_titles[11]
    +"</th><th style='text-align:right;'>"+header_titles[12]+"</th></tr></thead><tbody class='nation_table_body'>";

  var sortList = [];
  var headers = $('#nation_table thead th');
  headers.filter('.tablesorter-headerAsc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 0]);
  });
  headers.filter('.tablesorter-headerDesc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 1]);
  });

  for (var player_id in players) {
    var pplayer = players[player_id];
    if (pplayer['nation'] == -1) continue;
    if (is_longturn() && pplayer['name'].indexOf("New Available Player") != -1) continue;
    total_players++;

    var flag_html = "<canvas id='nation_dlg_flags_" + player_id + "' width='29' height='20' class='nation_flags'></canvas>";

    var plr_class = "";
    if (!client_is_observer() && client.conn.playing != null && player_id == client.conn.playing['playerno']) plr_class = "nation_row_self";
    if (!pplayer['is_alive']) plr_class = "nation_row_dead";
    if (!client_is_observer() && diplstates[player_id] != null && diplstates[player_id] == DS_WAR) plr_class = "nation_row_war";

    nation_list_html += "<tr data-plrid='" + player_id + "' class='" + plr_class
	   + "'><td>" + flag_html + "</td>";
    nation_list_html += "<td><div style='background-color: " + nations[pplayer['nation']]['color']
           + "; margin: 4px; width: 20px; height: 20px;'>"
           + "</div></td>";

    nation_list_html += "<td style='text-align:left;'>" + pplayer['name'] + "</td><td style='text-align:left;' title=\"" 
          + nations[pplayer['nation']]['legend'] + "\">"
          + nations[pplayer['nation']]['adjective']  + "</td>"
       + "<td class='nation_attitude'>" + col_love(pplayer) + "</td>"
       + "<td>" + get_score_text(pplayer) + "</td>"
       +"<td>" + (pplayer['flags'].isSet(PLRF_AI) ?
          get_ai_level_text(pplayer) + " AI" : "Human") + "</td><td>"
	   + (pplayer['is_alive'] ? "Alive" : "Dead") +  "</td>";

    var contact_time=0;
    if (!client_is_observer() && client.conn.playing != null && diplstates[player_id] != null && player_id != client.conn.playing['playerno']) {
      contact_time = pplayer.diplstates[client.conn.playing.playerno].contact_turns_left; //set this here because it needs the same 'if'
      
      var pact_time = pplayer.diplstates[client.conn.playing.playerno].turns_left;
      var dstate = get_diplstate_text(diplstates[player_id]);
      if (dstate == "None") dstate = "<span style='font-size:1%; color:rgba(0,0,0,0);'>+</span>" + dstate; // sorting hack
      if (dstate!="Ceasefire" && dstate!="Armistice") pact_time=0; // don't show unless it's a real timer on an expiring pact.
      pact_time = (pact_time>0) ? ":<span title='Turns till pact expires' style='color:#f0d0c0'>"+pact_time+"</span>" : "";   // show turns left for diplstate or blank if n/a
      nation_list_html += "<td style='text-align:center'>" + dstate +pact_time+"</td>";
    } else {
      nation_list_html += "<td style='text-align:center'>-</td>";
    }

    // Alternate text if no embassy, show contact_turns instead:
    var embassy_status = get_embassy_text(player_id);
    
    // Abbreviate for smaller screen
    if (redux_screen || tiny_screen)
      embassy_status = embassy_status.replace(" embassy", ""); //e.g., "They have embassy" >> "They have"

    if (embassy_status == "None") {
      if (contact_time>0) embassy_status = "<span title='Contact turns remaining' style='color:#c0c0c0'>("+contact_time+")</span>";
    } else embassy_status = "<span style='font-size:1%; color:rgba(0,0,0,0);'>z</span>" + embassy_status;  // sorting hack

    nation_list_html += "<td style='text-align:center;'>" + embassy_status + "</td>";

    nation_list_html += "<td>"
    if (!client_is_observer() && client.conn.playing != null) {
      if (pplayer['gives_shared_vision'].isSet(client.conn.playing['playerno']) && client.conn.playing['gives_shared_vision'].isSet(player_id)) {
        nation_list_html += "Both ways"
      } else if (pplayer['gives_shared_vision'].isSet(client.conn.playing['playerno'])) {
        nation_list_html += "To you"
      } else if (client.conn.playing['gives_shared_vision'].isSet(player_id)) {
        nation_list_html += "To them"
      } else {
        nation_list_html += "None"
      }
    }
    nation_list_html += "</td>"

    nation_list_html += "<td class='nation_team'>" + (pplayer['team'] + 1) + "</td>";
    var pstate = " ";
    if (pplayer['phase_done'] && !pplayer['flags'].isSet(PLRF_AI)) {
      pstate = "Done";
    } else if (!pplayer['flags'].isSet(PLRF_AI)
               && pplayer['nturns_idle'] > 1) {
      if (tiny_screen || redux_screen) pstate += "idle  " + pplayer['nturns_idle'];
      else pstate += "Idle for " + pplayer['nturns_idle'] + " turns";
    } else if (!pplayer['phase_done']
               && !pplayer['flags'].isSet(PLRF_AI)) {
      pstate = "Moving";
    }
    nation_list_html += "<td id='player_state_" + player_id + "'>" + pstate + "</td>";
    nation_list_html += "</tr>";

    if (!pplayer['flags'].isSet(PLRF_AI) && pplayer['is_alive'] && pplayer['nturns_idle'] <= 4) no_humans++;
    if (pplayer['flags'].isSet(PLRF_AI) && pplayer['is_alive']) no_ais++;

  }
  nation_list_html += "</tbody></table>";

  $("#nations_list").html(nation_list_html);

  $("#nations_title").html("Nations of the World");
  $("#nations_label").html("Human players: " + no_humans + ". AIs: " + no_ais + ". Inactive/dead: " + (total_players - no_humans - no_ais) + ".");

  select_no_nation();

  if (is_pbem()) {
    /* TODO: PBEM games do not support diplomacy.*/
    $('#meet_player_button').hide();
    $('#cancel_treaty_button').hide();
    $('#take_player_button').hide();
    $('#toggle_ai_button').hide();
    $('#game_scores_button').hide();
  } else if (is_longturn()) {
    $('#take_player_button').hide();
    $('#toggle_ai_button').hide();
    $('#game_scores_button').hide();
  }

  if (is_small_screen) {
    $('#take_player_button').hide();
  }

  for (var player_id in players) {
    var pplayer = players[player_id];
    var flag_canvas = $('#nation_dlg_flags_' + player_id);
    if (flag_canvas.length > 0) {
      var flag_canvas_ctx = flag_canvas[0].getContext("2d");
      var tag = "f." + nations[pplayer['nation']]['graphic_str'];
      if (flag_canvas_ctx != null && sprites[tag] != null) {
        flag_canvas_ctx.drawImage(sprites[tag], 0, 0);
      }
    }
  }

  $("#nation_table").tablesorter({theme: "dark", sortList: sortList });
  if (is_small_screen()) {
    $("#nations").height( mapview['height'] - 150);
    $("#nations").width( mapview['width']);
  }

  /* Fetch online (connected) players on this game from Freeciv-proxy. */
  $.ajax({
    url: "/civsocket/" + (parseInt(civserverport) + 1000) + "/status",
    dataType: "html",
    cache: false,
    async: true
  }).done(function( data ) {
    var online_players = {};
    var players_re = /username: <b>([^<]*)</g;
    var found;

    while ((found = players_re.exec(data)) != null) {
      if (found[1].length > 0) {
        online_players[found[1].toLowerCase()] = true;
      }
    }

    for (var player_id in players) {
      var pplayer = players[player_id];
      if (online_players[pplayer['username'].toLowerCase()]) {
        $("#player_state_" + player_id).html("<span style='color: #00EE00;'><b>Online</b></span>");
      }
    }
    $("#nation_table").trigger('update');
  });

  if (is_longturn()) $(".nation_attitude").hide();
  if (is_longturn()) $(".nation_team").hide();

  $("#nation_table").tooltip();
  
  if (tiny_screen) {
    //console.log("Resetting tiny")
    $("#nation_table").css({"zoom":"0.6", "-moz-transform":"0.6"});  // -40% scaling if screen is small
    $("#nation_header_row").css({"font-size":"90%"}); 
    $("#nations_title").css({"zoom":"0.85", "-moz-transform":"0.85"});  // -40% scaling if screen is small
    $("#nations_button_div").css({"zoom":"74%"});
    $("#nations_label").css({"zoom":"85%"});     
  }
  else if (redux_screen) {
    //console.log("Resetting redux")
    $("#city_table").css({"zoom":"0.91", "-moz-transform":"0.91"});  // -9% scaling if screen is only slightly smaller
    $("#nation_header_row").css({"font-size":"90%"});  
  }
}


/**************************************************************************
 ...
**************************************************************************/
function col_love(pplayer)
{
  if (client_is_observer() || client.conn.playing == null || pplayer['playerno'] == client.conn.playing['playerno']
      || pplayer['flags'].isSet(PLRF_AI) == false) {
    return "-";
  } else {
    return love_text(pplayer['love'][client.conn.playing['playerno']]);
  }

}

/**************************************************************************
 ...
**************************************************************************/
function handle_nation_table_select(ev)
{
  ev.stopPropagation();

  var new_element = $(this);
  var new_player = parseFloat(new_element.data("plrid"));

  if (new_player === selected_player) {
     new_element.removeClass('ui-selected');
     select_no_nation();
  } else {
     new_element.siblings().removeClass('ui-selected');
     new_element.addClass('ui-selected');
     selected_player = new_player;
     select_a_nation();
  }
}

/**************************************************************************
 Enables the appropriate action buttons for the selected nation.
**************************************************************************/
function select_a_nation()
{
  var player_id = selected_player;
  var pplayer = players[selected_player];
  if (pplayer == null) return;

  var selected_myself = client.conn.playing != null && player_id == client.conn.playing['playerno'];
  var both_alive_and_different = client.conn.playing != null
                              && player_id != client.conn.playing['playerno']
                              && pplayer['is_alive']
                              && client.conn.playing['is_alive'];

  if (pplayer['is_alive'] && (client_is_observer()
      || selected_myself
      || (diplstates[player_id] != null && diplstates[player_id] != DS_NO_CONTACT)
      || client_state() == C_S_OVER)) {
    $('#view_player_button').button("enable");
  } else {
    $('#view_player_button').button("disable");
  }

  if (!client_is_observer()
      && both_alive_and_different
      && diplstates[player_id] != null
      && diplstates[player_id] != DS_NO_CONTACT) {
    $('#meet_player_button').button("enable");
  } else {
    $('#meet_player_button').button("disable");
  }
  if (!is_hotseat()
      && !pplayer['flags'].isSet(PLRF_AI)
      && (diplstates[player_id] != null && diplstates[player_id] == DS_NO_CONTACT)) {
    $('#meet_player_button').button("disable");
  }

    if (pplayer['flags'].isSet(PLRF_AI) || selected_myself) {
      $('#send_message_button').button("disable");
    } else {
      $('#send_message_button').button("enable");
    }

  if (!client_is_observer()
      && both_alive_and_different
      && pplayer['team'] != client.conn.playing['team']
      && diplstates[player_id] != null
      && diplstates[player_id] != DS_WAR && diplstates[player_id] != DS_NO_CONTACT) {
    $('#cancel_treaty_button').button("enable");

  } else {
    $('#cancel_treaty_button').button("disable");
  }
  
  if (can_client_control() && !selected_myself) {
    if (diplstates[player_id] == DS_CEASEFIRE || diplstates[player_id] == DS_ARMISTICE || diplstates[player_id] == DS_PEACE) {
      $("#cancel_treaty_button").button("option", "label", "Declare war");
    } else {
      $("#cancel_treaty_button").button("option", "label", "Cancel treaty");
    }
  }

  if (can_client_control()
      && both_alive_and_different
      && pplayer['team'] != client.conn.playing['team']
      && client.conn.playing['gives_shared_vision'].isSet(player_id)) {
    $('#withdraw_vision_button').button("enable");
  } else {
    $('#withdraw_vision_button').button("disable");
  }

  if (client_is_observer() ||
       (both_alive_and_different && diplstates[player_id] != DS_NO_CONTACT)) {
    $("#intelligence_report_button").button("enable");
  } else {
    $("#intelligence_report_button").button("disable");
  }

  if (!is_hotseat() && client_is_observer() && pplayer['flags'].isSet(PLRF_AI)
      && nations[pplayer['nation']]['is_playable']
               && $.getUrlVar('multi') == "true") {
    $('#take_player_button').button("enable");
  } else {
    $('#take_player_button').button("disable");
  }

  $('#toggle_ai_button').button("enable");

}

/**************************************************************************
 Marks the selected player as none and disables all action buttons,
 except the scores one.
**************************************************************************/
function select_no_nation()
{
  selected_player = -1;
  $('#nations_button_div button').not('#game_scores_button').button("disable");
}

/**************************************************************************
 Changes to the nations tab, selects a player and scrolls the table
 so that it is on view.
**************************************************************************/
function nation_table_select_player(player_no)
{
  $('#players_tab a').click();
  var row = $('#nation_table tr[data-plrid=' + player_no + ']');
  if (row.length == 1) {
    row.click();
    row[0].scrollIntoView();
  }
}

/**************************************************************************
 ...
**************************************************************************/
function nation_meet_clicked()
{
  if (selected_player == -1) return;
  diplomacy_init_meeting_req(selected_player);
  set_default_mapview_active();
}

/**************************************************************************
 ...
**************************************************************************/
function cancel_treaty_clicked()
{
  if (selected_player == -1) return;
  diplomacy_cancel_treaty(selected_player);
  set_default_mapview_active();
}

/**************************************************************************
 ...
**************************************************************************/
function withdraw_vision_clicked()
{
  if (selected_player == -1) return;

  var packet = {"pid" : packet_diplomacy_cancel_pact,
                "other_player_id" : selected_player,
                "clause" : CLAUSE_VISION};
  send_request(JSON.stringify(packet));
  set_default_mapview_active();
}

/**************************************************************************
 ...
**************************************************************************/
function take_player_clicked()
{
  if (selected_player == -1) return;
  var pplayer = players[selected_player];
  take_player(pplayer['name']);
  set_default_mapview_active();
}

/**************************************************************************
 ...
**************************************************************************/
function toggle_ai_clicked()
{
  if (selected_player == -1) return;
  var pplayer = players[selected_player];
  aitoggle_player(pplayer['name']);
  set_default_mapview_active();
}

/**************************************************************************
 ...
**************************************************************************/
function get_score_text(player)
{
  // show score if EMBASSY or OBSERVER or PLAYER==YOURSELF
  if ( (player['score'] > 0 && get_embassy_text(player.playerno) != "None")
       || client_is_observer()
       || (client.conn.playing != null && player['playerno'] == client.conn.playing['playerno'])) {
    return player['score'];
  } else {
    return " ";
  }
}

/**************************************************************************
  Return a text describing an AI's love for you.  (Oooh, kinky!!)
  These words should be adjectives which can fit in the sentence
  "The x are y towards us"
  "The Babylonians are respectful towards us"
**************************************************************************/
function love_text(love)
{
  if (love <= - MAX_AI_LOVE * 90 / 100) {
    return "Genocidal";
  } else if (love <= - MAX_AI_LOVE * 70 / 100) {
    return "Belligerent";
  } else if (love <= - MAX_AI_LOVE * 50 / 100) {
    return "Hostile";
  } else if (love <= - MAX_AI_LOVE * 25 / 100) {
    return "Uncooperative";
  } else if (love <= - MAX_AI_LOVE * 10 / 100) {
    return "Uneasy";
  } else if (love <= MAX_AI_LOVE * 10 / 100) {
    return "Neutral";
  } else if (love <= MAX_AI_LOVE * 25 / 100) {
    return "Respectful";
  } else if (love <= MAX_AI_LOVE * 50 / 100) {
    return "Helpful";
  } else if (love <= MAX_AI_LOVE * 70 / 100) {
    return "Enthusiastic";
  } else if (love <= MAX_AI_LOVE * 90 / 100) {
    return "Admiring";
  } else {
    return "Worshipful";
  }
}

/**************************************************************************
 ...
**************************************************************************/
function take_player(player_name)
{
  send_message("/take " + player_name);
  observing = false;
}

/**************************************************************************
 ...
**************************************************************************/
function aitoggle_player(player_name)
{
  send_message("/aitoggle " + player_name);
  observing = false;
}

/**************************************************************************
 ...
**************************************************************************/
function center_on_player()
{
  if (selected_player == -1) return;

    /* find a city to focus on. */
    for (var city_id in cities) {
      var pcity = cities[city_id];
      if (city_owner_player_id(pcity) == selected_player) {
        center_tile_mapcanvas(city_tile(pcity));
        set_default_mapview_active();
        return;
      }
    }
}

/**************************************************************************
  Send a private message to another human player from the dialog.
  Only called from within the dialog.
**************************************************************************/
function send_private_message(other_player_name)
{
  var message = other_player_name + ": " + encode_message_text($("#private_message_text").val());
  var packet = {"pid" : packet_chat_msg_req,
                "message" : message};
  send_request(JSON.stringify(packet));
  keyboard_input = true;
  $("#dialog").dialog('close');
}

/**************************************************************************
  Show the dialog for sending a private message to another human player.
**************************************************************************/
function show_send_private_message_dialog()
{
  if (selected_player == -1) return;
  var pplayer = players[selected_player];

  if (pplayer == null) {
    swal("Please select a player to send a private message to first.");
    return;
  }

  var name = pplayer['name'];
  keyboard_input = false;

  // reset dialog page.
  $("#dialog").remove();
  $("<div id='dialog'></div>").appendTo("div#game_page");

  var intro_html = "Message: <textarea id='private_message_text' type='text' rows='6' cols='60' maxlength='350'>";
  $("#dialog").html(intro_html);
  $("#dialog").attr("title", "Send private message to " + name);
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "80%" : "50%",
			buttons:
			{
				"Send" : function() {
				  send_private_message(name);
				}
			}
		});


  $("#dialog").dialog('open');


  $('#dialog').keyup(function(e) {
    if (e.keyCode == 13) {
      send_private_message(name);
    }
  });


}
