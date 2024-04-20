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


var C_S_INITIAL = 0;    /* Client boot, only used once on program start. */
var C_S_PREPARING = 1;  /* Main menu (disconnected) and connected in pregame. */
var C_S_RUNNING = 2;    /* Connected with game in progress. */
var C_S_OVER = 3;       /* Connected with game over. */

var civclient_state = C_S_INITIAL;

var endgame_player_info = [];
var height_offset = 43;
var width_offset = 0;

/**************************************************************************
 Sets the client state (initial, pre, running, over etc).
**************************************************************************/
function set_client_state(newstate)
{
  if (civclient_state != newstate) {
    civclient_state = newstate;

    switch (civclient_state) {
    case C_S_RUNNING:
      $.unblockUI();
      show_new_game_message();
      insert_pregame_messages();

      set_client_page(PAGE_GAME);
      setup_window_size();

      update_metamessage_on_gamestart();

      if (is_pbem()) {
        setTimeout(function () {
          set_human_pbem_players();
          advance_unit_focus(false);
        }, 1500);
      }

      /* remove context menu from pregame. */
      $(".context-menu-root").remove();

      //if (renderer == RENDERER_WEBGL) {
      //  init_webgl_mapview();
      //}

      if (observing || $.getUrlVar('action') == "multi" || is_longturn() || game_loaded) {
        center_on_any_city();
        advance_unit_focus(false);
      }

      if (audio != null) {
        if (!audio.source.src)
          pick_next_track();
        if (play_music) setTimeout(audio.play(), 10000);
      }
      popup_fullscreen_enter_game_dialog();
      break;
    case C_S_OVER:
      setTimeout(show_endgame_dialog, 500);
      break;
    case C_S_PREPARING:
      break;
    default:
      break;
    }
  }
}

/**************************************************************************
  Refreshes the size of UI elements based on new window and screen size.
**************************************************************************/
function setup_window_size ()
{
  var winWidth = $(window).width();
  var winHeight = $(window).height();
  var new_mapview_width = winWidth - width_offset;
  var new_mapview_height = winHeight - height_offset;

  //if (renderer == RENDERER_2DCANVAS) {
    mapview_canvas.width = new_mapview_width;
    mapview_canvas.height = new_mapview_height;
    buffer_canvas.width = Math.floor(new_mapview_width * 1.5);
    buffer_canvas.height = Math.floor(new_mapview_height * 1.5);

    mapview['width'] = new_mapview_width;
    mapview['height'] = new_mapview_height;
    mapview['store_width'] = new_mapview_width;
    mapview['store_height'] = new_mapview_height;

    mapview_canvas_ctx.font = canvas_text_font;
    buffer_canvas_ctx.font = canvas_text_font;
  //}

  $("#pregame_message_area").height( new_mapview_height - 105
                                        - $("#pregame_game_info").outerHeight());
  $("#pregame_player_list").height( new_mapview_height - 80);

  $("#nations").height( new_mapview_height - 100);
  $("#nations").width( new_mapview_width);

  $('#tabs').css("height", $(window).height());
  $("#tabs-map").height("auto");


  $("#city_viewport").height( new_mapview_height - 20);

  $("#opt_tab").show();
  $("#players_tab").show();
  $("#cities_tab").show();
  $("#freeciv_logo").show();
  $("#tabs-hel").hide();
  if (not_large_screen()) {
    if (is_small_screen()) {
      // Adjustments for mobile: spatial economy, fit
      $("#turn_done_button").css({"padding-left":"7px", "padding-right":"7px", "padding-bottom":"8px"});
      $("#tabs_menu").css("margin-left","-3px");
      $(".ui-tabs-anchor").css("padding", "7px");
      $("#freeciv_logo").hide();
      // Remove text from tabs: icons only:
      $("#map_tab").children().html("<img style='float:left' src='/images/map_tab_icon_m.png'>");
      $("#empire_tab").children().html("<img style='float:left' src='/images/empire_tab_icon.png'>");
      $("#civ_tab").children().html("<img style='float:left' src='/images/gov_tab_icon.png'>");
      $("#tech_tab").children().html("<img style='float:left' src='/images/tech_tab_icon_m.png'>");
      $("#players_tab").children().html("<img style='float:left' src='/images/nation_tab_icon.png'>");
      $("#cities_tab").children().html("<img style='float:left' src='/images/cities_tab_icon.png'>");
      $("#opt_tab").children().html("<img style='float:left' src='/images/prefs_tab_icon.png'>");
      $("#hel_tab").children().html("<img style='float:left' src='/images/help_tab_icon_m.png'>");
      $("#warcalc_tab").children().html("&#x1F3B2;")
      $("#button_national_units").html("&#9823;");
      $("#button_unit_homecity").html("&#x1F3E0;");
      $("#button_unit_deployment").html("&#x2299;");
      $("#button_city_buildings").html("&#x1F3E2;");
      $("#button_empire_upkeep").html("&#x1f4b0;");
      $("#button_empire_prod").html("&#x1F528;");
      // Remove mini-map
      $(".overview_dialog").hide(); overview_active = false;
      // Remove orders buttons
      //if ($("#game_unit_orders_default").length > 0) $("#game_unit_orders_default").remove();
      $(".not_mobile").remove(); // gets rid of all except goto,paradrop,airlift,nuke,and "hide buttons"
      $("#game_unit_orders_default").css("position","absolute");
      $("#game_unit_orders_default").css("top","48px");
      $(".order_button").css("padding","1px 1px 0px 6px");

      if ($("#game_unit_orders_settlers").length > 0) $("#game_unit_orders_settlers").remove();
      // Optimise space/fit in game unit panel:
      $("#game_unit_panel").css({"transform":"scale(0.95)","float":"left","margin-top":"-12px","margin-left":"-22px","width":"100%;"});
      $("#game_unit_info").css({"float":"left", "width":"2000%"}); // continuous horizontal drag-scroll panel

      $(".ui-dialog-titlebar").show(); // patch:was hidden on mobile for more room, but minimize-disabling is worse
      // TODO: find accurate #id method to do this, ui-id-12 is not for certain:
      $(".ui-dialog-titlebar").find("#ui-id-12").parent().css({"background":"none","border-style":"none","height":"16px","width":"1px"}); // remove background image
      $('#ui-id-12').parent().show();  // unhide messagebox title
      $(".ui-dialog-titlebar").css({"font-size":"70%", "margin-left":"-3px"});
      $("#game_status_panel_bottom").css("font-size", "0.8em");
    }
    else {  // medium screen e.g. 1366 x 768, has some issues it needs TLC on:
      $(".wc_spacer").css("height","2%")
      $("#worklist_control button").css("height","7%")
      $(".ui-dialog .ui-dialog-title").css("font-size","115%"); // vert space at premium
    }
  }
  else {  // handle case where small window is resized to large again
    $("#map_tab").children().html("<img style='float:left; margin-right:5px;' src='/images/map_tab_icon_m.png'> Map");
    $("#empire_tab").children().html("<img style='float:left; margin-right:5px;' src='/images/empire_tab_icon.png'> Empire");
    $("#civ_tab").children().html("<img style='float:left; margin-right:5px;' src='/images/gov_tab_icon.png'> Gov.");
    $("#tech_tab").children().html("<img style='float:left; margin-right:5px;' src='/images/tech_tab_icon_m.png'> Tech");
    $("#players_tab").children().html("<img style='float:left; margin-right:5px;' src='/images/nation_tab_icon.png'> Nations");
    $("#cities_tab").children().html("<img style='float:left; margin-right:5px;' src='/images/cities_tab_icon.png'> Cities");
    $("#opt_tab").children().html("<img style='float:left; margin-right:5px;' src='/images/prefs_tab_icon.png'> Prefs");
    $("#hel_tab").children().html("<img style='float:left; margin-right:5px;' src='/images/help_tab_icon_m.png'> Help");
  }

  if (overview_active) init_overview();
  if (unitpanel_active) init_game_unit_panel();

  // Because CSS file is ignoring this style, we do it here:
  $(".ui-tabs-tab").css("border-color","#404040");

  if (client_is_observer()) {
    observing = true;
    $("#tabs-cities").hide();
    $("#tabs-empire").hide();
  }
}

function client_state()
{
  return civclient_state;
}


/**************************************************************************
  Return TRUE if the client can change the view; i.e. if the mapview is
  active.  This function should be called each time before allowing the
  user to do mapview actions.
**************************************************************************/
function can_client_change_view()
{
  return ((client.conn.playing != null || client_is_observer())
      && (C_S_RUNNING == client_state()
	      || C_S_OVER == client_state()));
}

/**************************************************************************
  Returns TRUE if the client can control the player.
**************************************************************************/
function can_client_control()
{
  return (null != client.conn.playing && !client_is_observer());
}

/**************************************************************************
  Returns TRUE if the client can issue orders (giving unit commands, etc).
**************************************************************************/
function can_client_issue_orders()
{
  return (can_client_control() && C_S_RUNNING == client_state());
}

/**************************************************************************
  Webclient does have observer support.
**************************************************************************/
function client_is_observer()
{
  return client.conn['observer'] || observing;
}

/**************************************************************************
  Intro message
**************************************************************************/
function show_new_game_message()
{
  var message = null;

  clear_chatbox();

  if (observing || $.getUrlVar('autostart') == "true") {
    return;

  } else if (is_hotseat()) {
    show_hotseat_new_phase();
    return;
  } else if (is_pbem()) {
    message = "Welcome, " + capitalize(username) + "! It is now your turn to play. Each player will " +
      "get an e-mail when it is their turn to play, and can only play one turn at a time. " +
      "Click the end turn button to end your turn and let the next opponent play.";
    setTimeout(check_queued_tech_gained_dialog, 2500);

  } else if (client.conn.access_level == 5) {
     return;
  }
  else if (is_longturn()) {
    message = "Welcome, " + capitalize(username) + "! This is a Longturn game, where you play one turn per day. " +
    "Just do your moves, and come back tomorrow when the timer advances to the next turn! You may " +
    "bookmark this page to return. You can also find the game again at " + window.location.host + ".<br> "+
    "<font color='#90FFFF'>Freeciv is a game of diplomacy. Your nation is encouraged to talk to other nations. "+
    "Please click to join the <a href='https://discord.gg/Zj8UQSN' target='_new'>community Discord chat server</a>. "+
    "Players are responsible for following the #rules posted there. Be polite; please keep in-game talk "+
    "related to the game; do not post spam to offsite links if you wish to remain in the game.</font> Good luck, have fun!";

    if (is_small_screen()) {
      message += "<br>This is your message window that reports ongoing game events. " +
      "<i style='color:#fed'>Tap the yellow <b>minimize button</b> at the top to enter the game</i>. You can return here to view " +
      "game messages by hitting the maximize button.";
    }

  } else if (is_small_screen()) {
    message = "Welcome, " + capitalize(username) + "! You lead a great civilization. Your task is to conquer the world!\n" +
      "Please join the <a href='https://discord.gg/Zj8UQSN' target='_new'>community Discord chat server</a>. "+
      "Click on units for giving them orders, and drag units on the map to move them.\n" +
      "Good luck, and have a lot of fun!\n<br><br>This message window reports game events. " +
      "<i style='color:#fed'>Tap the yellow <b>minimize button</b> at the top to enter the game</i>. You can return here to view " +
      "game messages by hitting the maximize button.";

  } else if (client.conn.playing != null && !game_loaded) {
    var pplayer = client.conn.playing;
    var player_nation_text = "Welcome, " + capitalize(username) + ", ruler of the " + nations[pplayer['nation']]['adjective'] + " peoples.";

    if (is_touch_device()) {
      message = player_nation_text + " Your\n" +
      "task is to create a great empire! You should start by\n" +
      "exploring the land around you with your scout,\n" +
      "and using your settlers to find a good place to build\n" +
      "a city. Click on units to get a list of available orders. \n" +
      "To move a unit around, carefully drag the unit to the \n" +
      "place you want it to go.\n" +
      "Please join the <a href='https://discord.gg/Zj8UQSN' target='_new'>community Discord chat server</a>.\n"+
      "Good luck, and have a lot of fun!";

    } else {
      message = player_nation_text + " Your\n" +
      "task is to create a great empire! You should start by\n" +
      "exploring the land around you with your scout,\n" +
      "and using your settlers to find a good place to build\n" +
      "a city. Right-click with the mouse on your units for a list of available \n" +
      "orders such as move, explore, build cities and attack. \n" +
      "Please join the <a href='https://discord.gg/Zj8UQSN' target='_new'>community Discord chat server</a>.\n"+
      "Good luck, and have a lot of fun!";

    }
  } else if (game_loaded) {
    message = "Welcome back, " + capitalize(username);
    if (client.conn.playing != null) {
     message += " ruler of the " + nations[client.conn.playing['nation']]['adjective'] + " empire.";
    }
  } else {
    return;
  }

  message_log.update({ event: E_FIRST_CONTACT, message: message });
}

/**************************************************************************
...
**************************************************************************/
function alert_war(player_no)
{
  var pplayer = players[player_no];
  message_log.update({
    event: E_DIPLOMACY,
    message: "War: You are now at war with the "
	+ nations[pplayer['nation']]['adjective']
        + " leader " + pplayer['name'] + "!"
  });
}

/**************************************************************************
 Shows the endgame dialog
**************************************************************************/
function show_endgame_dialog()
{
  var title = "Final Report: The Greatest Civilizations in the world!";
  var message = "<p id='hof_msg'></p>";
  for (var i = 0; i < endgame_player_info.length; i++) {
    var pplayer = players[endgame_player_info[i]['player_id']];
    var nation_adj = nations[pplayer['nation']]['adjective'];
    message += (i+1) + ": The " + nation_adj + " ruler " + pplayer['name']
      + " scored " + endgame_player_info[i]['score'] + " points" + "<br>";
  }

  // reset dialog page.
  $("#dialog").remove();
  $("<div id='dialog'></div>").appendTo("div#game_page");

  $("#dialog").html(message);
  $("#dialog").attr("title", title);
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "90%" : "50%",
			buttons: {
                "Game replay" : function() {
                  show_replay();
                },
				"Show Scores" : function() {
					$("#dialog").dialog('close');
					view_game_scores();
				},
				Ok: function() {
					$("#dialog").dialog('close');
					$("#game_text_input").blur();
				}
			}
		});

  $("#dialog").dialog('open');
  $("#game_text_input").blur();
  $("#dialog").css("max-height", "500px");

  setTimeout(submit_game_to_hall_of_fame, 1000);
}


/**************************************************************************
 Updates message on the metaserver on gamestart.
**************************************************************************/
function update_metamessage_on_gamestart()
{
  if (!observing && !metamessage_changed && client.conn.playing != null
      && client.conn.playing['pid'] == players[0]['pid']
      && $.getUrlVar('action') == "new") {
    var pplayer = client.conn.playing;
    var metasuggest = capitalize(username) + " ruler of the " + nations[pplayer['nation']]['adjective'] + ".";
    send_message("/metamessage " + metasuggest);
    setInterval(update_metamessage_game_running_status, 200000);
  }

  if ($.getUrlVar('action') == "new" || $.getUrlVar('action') == "earthload"
      || $.getUrlVar('scenario') == "true") {
    /*if (renderer == RENDERER_2DCANVAS) {
      $.post("/freeciv_time_played_stats?type=single2d").fail(function() {});
    } else {
      $.post("/freeciv_time_played_stats?type=single3d").fail(function() {});
    }*/
    $.post("/freeciv_time_played_stats?type=single2d").fail(function() {});
  }
  if ($.getUrlVar('action') == "multi" && client.conn.playing != null
      && client.conn.playing['pid'] == players[0]['pid'] && !is_longturn()) {
    $.post("/freeciv_time_played_stats?type=multi").fail(function() {});
  }
  if ($.getUrlVar('action') == "hotseat") {
    $.post("/freeciv_time_played_stats?type=hotseat").fail(function() {});
    send_message("/metamessage hotseat game" );
  }
}

/**************************************************************************
 Updates message on the metaserver during a game.
**************************************************************************/
function update_metamessage_game_running_status()
{
  if (client.conn.playing != null && !metamessage_changed) {
    var pplayer = client.conn.playing;
    var rules = ruleset_control['name'];
    var metasuggest = rules + " | " + nations[pplayer['nation']]['adjective'] + " | " + (governments[client.conn.playing['government']] != null ? governments[client.conn.playing['government']]['name'] : "-")
         + " | People:" + civ_population(client.conn.playing.playerno)
         + " | Score:" + pplayer['score'] + " | " + "Research:" + (techs[client.conn.playing['researching']] != null ? techs[client.conn.playing['researching']]['name'] : "-" );
    send_message("/metamessage " + metasuggest);

  }
}
