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

// Player income is calculated two ways. Sometimes the server gives it to us 
// for free. When it doesn't, we need to calculate it in the client. This
// keeps track of when our info for this is fresh from either source. 
var income_needs_refresh = false;

var last_ground_attack_time = 0;

/* Freeciv Web Client.
   This file contains the handling-code for packets from the civserver.
*/

var DEBUG_LOG_PACKETS = false;


function handle_processing_started(packet)
{
  client_frozen = true;
}

function handle_processing_finished(packet)
{
  client_frozen = false;
}

function handle_freeze_hint(packet)
{
  client_frozen = true;
}

function handle_thaw_hint(packet)
{
  client_frozen = false;
}

/* 100% */
function handle_ruleset_terrain(packet)
{
  /* FIXME: These two hacks are there since Freeciv-web doesn't support rendering Lake and Glacier correctly. */
  if (packet['name'] == "Lake") packet['graphic_str'] = packet['graphic_alt'];
  //if (packet['name'] == "Glacier") packet['graphic_str'] = "tundra";
  terrains[packet['id']] = packet;
}

/****************************************************************************
  After we send a join packet to the server we receive a reply.  This
  function handles the reply.  100% Complete.
****************************************************************************/
function handle_server_join_reply(packet)
{
  if (packet['you_can_join']) {
    var client_info;

    client.conn.established = true;
    client.conn.id = packet['conn_id'];

    if (get_client_page() == PAGE_MAIN
        || get_client_page() == PAGE_NETWORK) {
      set_client_page(PAGE_START);
    }

    client_info = {
      "pid"           : packet_client_info,
      "gui"           : GUI_WEB,
      "emerg_version" : 0,
      "distribution"  : ""
    };
    send_request(JSON.stringify(client_info));

    set_client_state(C_S_PREPARING);

    if (($.getUrlVar('action') == "new" || $.getUrlVar('action') == "hack")
        && $.getUrlVar('ruleset') != null) {
      change_ruleset($.getUrlVar('ruleset'));
    }

    if (autostart) {
      if (loadTimerId == -1) {
        wait_for_text("You are logged in as", pregame_start_game);
      } else {
        wait_for_text("Load complete", pregame_start_game);
      }
    } else if (observing) {
      wait_for_text("You are logged in as", request_observe_game);
    }

  } else {
    swal("You were rejected from the game.", (packet['message'] || ""), "error");
    setSwalTheme();
    client.conn.id = -1;/* not in range of conn_info id */
    set_client_page(PAGE_MAIN);

  }

}

/**************************************************************************
  Remove, add, or update dummy connection struct representing some
  connection to the server, with info from packet_conn_info.
  Updates player and game connection lists.
  Calls update_players_dialog() in case info for that has changed.
  99% done.
**************************************************************************/
function handle_conn_info(packet)
{
  var pconn = find_conn_by_id(packet['id']);


  if (packet['used'] == false) {
    /* Forget the connection */
    if (pconn == null) {
      freelog(LOG_VERBOSE, "Server removed unknown connection " + packet['id']);
      return;
    }
    client_remove_cli_conn(pconn);
    pconn = null;
  } else {
    var pplayer = valid_player_by_number(packet['player_num']);

    packet['playing'] = pplayer;

    if (packet['id'] == client.conn.id) {
      if (client.conn.player_num == null
          || client.conn.player_num !== packet['player_num']) {
        discard_diplomacy_dialogs();
      }
      client.conn = packet;
    }

    conn_list_append(packet);

  }

  if (packet['id'] == client.conn.id) {
    if (client.conn.playing != packet['playing']) {
      set_client_state(C_S_PREPARING);
    }
  }

  /* FIXME: not implemented yet.
  update_players_dialog();
  update_conn_list_dialog();*/

}

/* 100% done */
function handle_ruleset_resource(packet)
{
  resources[packet['id']] = packet;
}

/**************************************************************************
 100% complete.
**************************************************************************/
function handle_tile_info(packet)
{
  if (tiles != null) {
    packet['extras'] = new BitVector(packet['extras']);

    tiles[packet['tile']] = $.extend(tiles[packet['tile']], packet);
  }
}


/**************************************************************************
  intercepts the E_UNIT_ACTION_TARGET_HOSTILE event which is only used
  for ground attacks, then processes what needs to happen from it. 
**************************************************************************/
function handle_iPillage_event(message, tile_id)  // iPillage.
{
  var ptile = tiles[tile_id];
  var ptype;
  var delay = 0;

  message=message.substring(8); // removes "💥 Your ", leaving, "Ground Strike Fighter destroyed the Roman Quay with a Ground Strike"

  for (ptype_id in unit_types) {
    // Find out the unit_type who did this hostile deed !
    ptype = unit_types[ptype_id];
    if (message.startsWith(ptype['name'])) {
      // The alt sound is preferred for alternate attack types:
      var sskey = ptype['sound_fight_alt'];
      if (!sskey) sskey = ptype['sound_fight']; //fallback
      if (!soundset[sskey]) sskey = ptype['sound_fight']; //fallback
      //console.log("calling playsound with sskey:"+sskey);
      play_hostile_event_sound(sskey, ptile, ptype);

      break;
    }
  }
  // Activate explosion on the tile also.
  delay = 500; // synchronise explosion with sound effect
  // times for each unit are in the top of unit.js:
  if (ptype && unit_pillage_sound_delay_times[ptype.rule_name])
    delay += unit_pillage_sound_delay_times[ptype.rule_name];

  delayed_explosion(tile_id, delay);
}
function delayed_explosion(tile_id, delay_ms) {
  setTimeout(() => { delayed_explosion_helper(tile_id);}, delay_ms);
}
function delayed_explosion_helper(tile_id) {
  explosion_anim_map[tile_id] = 25;
  anim_swords_instead[tile_id] = false;
}

/**************************************************************************
 Intercepts server messages about city governor and puts them in the 
 Governor tab where they can be read in timely manner, since map chatbox
 is not open during this time.
**************************************************************************/
function handle_city_governor_event(message)
{
  global_governor_message = message;
  global_governor_message = "<b>"+global_governor_message+"</b>";
  $("#cma_unsaved_warning").html(global_governor_message);
  $("#cma_unsaved_warning").show();
  // Put an expiration on it.
  setTimeout(function() { global_governor_message=""; }, 10000);
}

/**************************************************************************
 100% complete.
**************************************************************************/
function handle_chat_msg(packet)
{  
  var message = packet['message'];
  var event = packet['event'];
  var conn_id = packet['conn_id'];
  var tile_id = packet['tile'];

  const DEFAULT_OFF_WHITE_COLOR = "#D0C8C0";

  // Dirty way to remove the server forcing blinding white font tags into every 
  // event we get, disallowing us to set the classes ourselves!
  // TODO: find out where the server is doing this and remove it: it will
  // decrease bandwidth volume also!
  
  
  /* Shouldn't be needed anymore:
  if (event != E_CHAT_MSG) message.replace('<font color="#FFFFFF">', '');
  else message.replace("#FFFFFF", DEFAULT_OFF_WHITE_COLOR);
  */

  if (message == null) return;
  if (event == null || event < 0 || event >= E_UNDEFINED) {
    console.log('Undefined message event type');
    console.log(packet);
    packet['event'] = E_UNDEFINED;
  }

  /* Event interceptions... used to trigger client processing */
  switch (event) {
    case E_UNIT_ACTION_TARGET_HOSTILE:
      handle_iPillage_event(message, tile_id);
      break;
    case E_CITY_CMA_RELEASE:
      handle_city_governor_event(message);
      break;
    case E_IMP_SOLD:
      if (!suppress_event_sound()) play_sound(soundset["e_imp_sold"]);
      break;
    case E_CHAT_MSG_PRIVATE_RCVD:
      if (!suppress_event_sound()) play_sound("iphone1.ogg");
      break;
    //case E_CHAT_MSG_PRIVATE_SENT:
    //  break;
  }

  if (connections[conn_id] == null) {
    if (packet['event'] == E_SCRIPT) {
        var regxp = /\n/gi;
        message = message.replace(regxp, "<br>\n");
        show_dialog_message("Message for you:", message);
        return;
    } else {
        if (message.indexOf("/metamessage") != -1) return;  //don't spam message dialog on game start.
        if (message.indexOf("Metaserver message string") != -1) return;  //don't spam message dialog on game start.

        if (tile_id != null && tile_id > 0) {
        message = "<span class='chatbox_text_tileinfo' "
            + "onclick='center_tile_id_click(" + tile_id + ");'>" + message.replace(DEFAULT_OFF_WHITE_COLOR, "B0F0FF") + "</span>";
        }

    if (is_speech_supported()) speak(message);
    }
  }

  if (message.includes("%%") || message.includes("[`")) message = decode_user_hyperlinks(message);

  packet['message'] = message;
  add_chatbox_text(packet);

  // Do sounds for special messages
  //console.log("Event type = "+packet['event']);
  // TODO: these can now go into event interceptor above by looking at event class instead of here.
  if (packet['event']==1 || packet['event']==77) /* 1==E_CITY_LOST, 77==E_UNIT_WIN_ATT, there are in events.h and are the two
  types of event that come back for cities being conquered by someone.*/
  {
    if (message.includes(" your lootings accumulate to ")) play_sound(soundset["e_victor"]);
    else if (message.includes("You have liberated ")) play_sound(soundset["e_liberate"]);
    else if (message.includes(" gold from the city.")) play_sound(soundset["e_conquer"]);
  }
}


/**************************************************************************
  Recenter the map to a tile and mark it with an explosion
  TODO: replace with a flare or similar animation
**************************************************************************/
function recenter_flare_tile(tile_id)
{
  center_tile_id(tile_id);
  explosion_anim_map[tile_id] = 50;
  show_tile_marker_instead[tile_id] = true;
}

/**************************************************************************
  Decodes tile and unit hyperlinks sent through chat
**************************************************************************/
function decode_user_hyperlinks(message)
{
  var ptile = null;

  // If we are here, then this message contains a link. If it is also going from oneself 
  // to onself, it is probably a SafeLink. SafeLinks are forced to go to oneself only. 
  // In any case, all links in messages going from oneself to oneself will be interpreted
  // as such. Therefore, if this is the case, repackage the presentation of this message here:
  /* Old code for fixing historic chat messages and Private Links.
  if (client.conn.playing && client.conn.playing['name']) {
    pname = client.conn.playing.name;
    // Historic message from oneself to oneself
    if (message.includes("{"+pname+" -> ")) {
      message = message.replace("{"+pname+" -> "+pname+"}: ", "<font color='#AFA8A8'>{Private Link}: </font>");
      message = message.replace("#A020F0",DEFAULT_OFF_WHITE_COLOR); //private msg colour triggers sound: remove
    } else if (message.includes("->{"+pname+"}: ")) {  // Real-time message from oneself to oneself}
      message = message.replace("->{"+pname+"}: ", "<font color='#AFA8A8'>{Private Link}: </font>");
      message = message.replace("#A020F0",DEFAULT_OFF_WHITE_COLOR); //private msg colour triggers sound: remove
    }
  }*/

  // Freemoji:  (emoji/info icons, etc.)
  var assert_escape = 0;
  while (message.includes("[`")) {
      if (assert_escape++ > 20) break; // insurance against freaky or erroneous markups

      var freemoji_name = message.substring(message.indexOf("[`") + 2, message.indexOf("`]"));
      var replace_me = "[`"+freemoji_name+"`]";

      var element = html_emoji_from_universal(freemoji_name);
      message = message.replace( replace_me, (element) );
  }
  
  // EXTRACT ENCODED TILE LINKS
  if (message.includes("%%tile")) {
    assert_escape = 0;
    var tile_x, tile_y, tile_link;
    var tile_extract, tile_id;
    var pcity, city_name;
        
    while (message.includes("%%tile") && message.includes("~%")) {
      if (assert_escape++ > 4) break; // insurance against badly constructed links

      tile_extract = message.substring(0,message.indexOf("~%")+2).match("%%tile(.*)~%");
      tile_id = tile_extract[1]; // string between %%tile and ~%
    
      if (tiles[tile_id] != null) { 
        ptile = tiles[tile_id];
        pcity = tile_city(ptile);
        city_name = (pcity == null) ? "" : pcity.name+":";
        tile_x = ptile.x;
        tile_y = ptile.y;
        tile_link = "<span class='chatbox_text_tileinfo' onclick='recenter_flare_tile("+tile_id+");'>"
                      + "<font style='text-decoration: underline;' color='#1FDFFF'><l tgt='tile' x='"
                      + tile_x + "' y='" + tile_y + "'>" + city_name +" (" + tile_x + "," + tile_y + ")";
        message = message.replace( tile_extract[0], (tile_link + "</l></font></span>") );
      }
    }
  }  // TO DO: Hover text the territory info, terrain type

  // EXTRACT ENCODED UNIT LINK... TODO... 4Mar2021 and previous commits over the month broke this to only give coordinates.
  if (message.includes("%%unit")) {
    assert_escape = 0;
    var unit_link, unit_name;
    var unit_extract, unit_id;

    while (message.includes("%%unit") && message.includes("_%")) {
      if (assert_escape++ > 4) break; // insurance against badly constructed links
      unit_extract = message.substring(0,message.indexOf("_%")+2).match("%%unit(.*)_%");
      unit_name = message.substring(message.indexOf("_%")+2,message.indexOf("~~"));
      unit_name = message.match("_%(.*)~~");
      if (unit_name==null) unit_name = ""
      unit_id = unit_extract[1]; // String between %%unit and _%
      
      if (units[unit_id] != null) { 
        punit = units[unit_id];
        var nationality = nations[players[punit['owner']]['nation']]['adjective'];
        var hovertext = get_unit_city_info(punit);
        unit_link = "<span class='chatbox_text_tileinfo' "
                      + " title='"+hovertext+"'"
                      + " onclick='set_unit_id_focus("+unit_id+");'>"
                      + "<font style='text-decoration: underline;' color='#FFA865'>"
                      + unit_name[1];
        message = message.replace( unit_name[1]+"~~", "")
        message = message.replace( unit_extract[0], (unit_link + "</font></span>") );
      } else { // fog of war units can't link--use plain text
          message = message.replace( "~~", "")
          message = message.replace( unit_extract[0], "");
      }
    }
  }

   // EXTRACT ENCODED DISCORD LINK
   if (message.includes("%%Discord")) {
        message = message.replace( "%%Discord", "<a href='https://discord.gg/Zj8UQSN' target='_new'>Freeciv-Web Discord Chat</a>")
   }
  return message;
}

/**************************************************************************
  Handle an early message packet. Thease have format like other chat
  messages but server sends them only about events related to establishing
  the connection and other setup in the early phase. They are a separate
  packet just so that client knows thse to be already relevant when it's
  only setting itself up - other chat messages might be just something
  sent to all clients, and we might want to still consider ourselves
  "not connected" (not receivers of those messages) until we are fully
  in the game.
**************************************************************************/
function handle_early_chat_msg(packet)
{
  /* Handle as a regular chat message for now. */
  handle_chat_msg(packet);
}

/***************************************************************************
  The city_info packet is used when the player has full information about a
  city, including it's internals.

  It is followed by web_city_info_addition that gives additional
  information only needed by Freeciv-web. Its processing will therefore
  stop while it waits for the corresponding web_city_info_addition packet.
***************************************************************************/
function handle_city_info(packet)
{
  /* Decode the city name. */
  packet['name'] = decodeURIComponent(packet['name']);

  /* Decode bit vectors. */
  packet['improvements'] = new BitVector(packet['improvements']);
  packet['city_options'] = new BitVector(packet['city_options']);

  /* Add an unhappy field like the city_short_info packet has. */
  packet['unhappy'] = city_unhappy(packet);

  if (cities[packet['id']] == null) {
    cities[packet['id']] = packet;
    if (C_S_RUNNING == client_state() && !observing && benchmark_start == 0
        && client.conn.playing != null && packet['owner'] == client.conn.playing.playerno) {
      show_city_dialog_by_id(packet['id']);
    }
  } else {
    cities[packet['id']] = $.extend(cities[packet['id']], packet);
  }

  /* manually update tile relation.*/
  if (tiles[packet['tile']] != null) {
    tiles[packet['tile']]['worked'] = packet['id'];
  }

  /* Stop the processing here. Wait for the web_city_info_addition packet.
   * The processing of this packet will continue once it arrives. */
}

/***************************************************************************
  The web_city_info_addition packet is a follow up packet to
  city_info packet. It gives some information the C clients calculates on
  their own. It is used when the player has full information about a city,
  including it's internals.
***************************************************************************/
function handle_web_city_info_addition(packet)
{
  if (cities[packet['id']] == null) {
    /* The city should have been sent before the additional info. */
    console.log("packet_web_city_info_addition for unknown city "
                + packet['id']);
    return;
  } else {
    /* Merge the information from web_city_info_addition into the recently
     * received city_info. */
    $.extend(cities[packet['id']], packet);
  }

  /* Get the now merged city_info. */
  packet = cities[packet['id']];

  /* Continue with the city_info processing. */
  if (active_city != null) {
    show_city_dialog(active_city);
  }

  if (packet['diplomat_investigate']) {
    show_city_dialog(cities[packet['id']]);
  }

  if (worklist_dialog_active && active_city != null) {
    city_worklist_dialog(active_city);
  }
  /* Update active tabs affected by this info */
  bulbs_output_updater.update();
  var active_tab = $("#tabs").tabs("option", "active"); 
  if (active_tab == TAB_CITIES) {
    city_screen_updater.update();
  } else if (active_tab == TAB_EMPIRE) {  
    empire_screen_updater.update();  // TEST:is this the right way to update empire screen?
  }
  income_needs_refresh = true;
}

/* 99% complete
   TODO: does this loose information? */
function handle_city_short_info(packet)
{
  /* Decode the city name. */
  packet['name'] = decodeURIComponent(packet['name']);

  /* Decode bit vectors. */
  packet['improvements'] = new BitVector(packet['improvements']);

  if (cities[packet['id']] == null) {
    cities[packet['id']] = packet;
  } else {
    cities[packet['id']] = $.extend(cities[packet['id']], packet);
  }

  /* Update active tabs affected by this info */
  bulbs_output_updater.update();
  var active_tab = $("#tabs").tabs("option", "active"); 
  if (active_tab == TAB_CITIES) {
    city_screen_updater.update();
  } else if (active_tab == TAB_EMPIRE) {  
    empire_screen_updater.update();  // TEST:is this the right way to update empire screen?
  }
  income_needs_refresh = true;
}

/**************************************************************************
  A traderoute-info packet contains information about one end of a
  traderoute
**************************************************************************/
function handle_traderoute_info(packet)
{
  if (city_trade_routes[packet['city']] == null) {
    /* This is the first trade route received for this city. */
    city_trade_routes[packet['city']] = {};
  }

  city_trade_routes[packet['city']][packet['index']] = packet;
}

/************************************************************************//**
  Handle information about a player.

  It is followed by web_player_info_addition that gives additional
  information only needed by Freeciv-web. Its processing will therefore
  stop while it waits for the corresponding web_player_info_addition packet.
****************************************************************************/
function handle_player_info(packet)
{
  /* Interpret player flags. */
  packet['flags'] = new BitVector(packet['flags']);
  packet['gives_shared_vision'] = new BitVector(packet['gives_shared_vision']);

  players[packet['playerno']] = $.extend(players[packet['playerno']], packet);

  /*
  // if server has sent a nation color change:
  if (packet['color_red']) {
    if (packet['playerno'] && players[packet['playerno']] && nations[players[packet['playerno']]['nation']])  { 
          var pplayer = players[packet['playerno']];
          var pcolor = "rgb("+packet['color_red']+","+packet['color_green']+","+packet['color_blue']+")";
          nations[pplayer['nation']]['color'] = pcolor;
    } 
  } */

  /* Update active tabs affected by this info */
  var active_tab = $("#tabs").tabs("option", "active"); 
  if (active_tab == TAB_EMPIRE) {  
    empire_screen_updater.update();  // TEST:is this the right way to update empire screen?
  }
}

/************************************************************************//**
  The web_player_info_addition packet is a follow up packet to the
  player_info packet. It gives some information the C clients calculates on
  their own.
****************************************************************************/
function handle_web_player_info_addition(packet)
{
  players[packet['playerno']] = $.extend(players[packet['playerno']], packet);

  if (client.conn.playing != null) {
    if (packet['playerno'] == client.conn.playing['playerno']) {
      client.conn.playing = players[packet['playerno']];
      update_game_status_panel();
      update_net_income();
      income_needs_refresh = false;
      income_calculated_by_client = false;
    }
  }
  update_player_info_pregame();

  if (is_tech_tree_init && tech_dialog_active) update_tech_screen();

  assign_nation_color(players[packet['playerno']]['nation']);

  // Savegame can be considered loaded after last player packet is received
  // and color processing is completed for their national colors:
  if (packet['playerno'] == getLength(players)-1)
    $.unblockUI();
}

/* 100% complete */
function handle_player_remove(packet)
{
  delete players[packet['playerno']];
  update_player_info_pregame();

}

/* 100% complete */
function handle_conn_ping(packet)
{
  ping_last = new Date().getTime();
  var pong_packet = {"pid" : packet_conn_pong};
  send_request(JSON.stringify(pong_packet));

}

/**************************************************************************
  Server requested topology change.

  0% complete.
**************************************************************************/
function handle_set_topology(packet)
{
  /* TODO */
}

/* 50% complete */
function handle_map_info(packet)
{
  map = packet;

  map_init_topology(false);

  map_allocate();

  /* TODO: init_client_goto();*/

  mapdeco_init();

}

/* 100% complete */
function handle_game_info(packet)
{
  game_info = packet;
  if (is_ongoing_longturn() && C_S_PREPARING == client_state()) wait_for_text("You are logged in as", pick_nation_ongoing_longturn);
}

/**************************************************************************
  Handle the calendar info packet.
**************************************************************************/
function handle_calendar_info(packet)
{
  calendar_info = packet;
}

/* 30% complete */
function handle_start_phase(packet)
{
  if (C_S_PREPARING == client_state()) pregame_messages = get_chatbox_msg_array();
  update_client_state(C_S_RUNNING);

  set_phase_start();

  saved_this_turn = false;

  add_replay_frame();


}

/**************************************************************************
  Handle the ruleset control packet.

  This is the first ruleset packet the server sends.
**************************************************************************/
function handle_ruleset_control(packet)
{
  ruleset_control = packet;

  // Set Flags for hard-coded client behaviors/optimisations specific to rulesets: *************************
  for (i=0;i<CRF_LAST;i++)
    client_rules_flag[i] = false; // reset, maybe loading new rules

  client_rules_flag[CRF_MINOR_NUKES]=true; // all known rules have 3x3 fission nukes at this time

  var rules = ruleset_control['name'];

  // Establish legacy compatibility for all MP2 rulesets from Brava onward: 
  if (rules.startsWith("MP2")) {
    rules = "MP2";
  }
  // Legacy rules block:
  switch (rules) {
    case "MP2":
    case "Avant-garde 2":
    case "Avant-garde":
      client_rules_flag[CRF_MP2_A]=true;
      client_rules_flag[CRF_RADAR_TOWER]=true;
      client_rules_flag[CRF_EXTRA_HIDEOUT]=true;
      client_rules_flag[CRF_EXTRA_QUAY]=true;
      client_rules_flag[CRF_MAJOR_NUKES]=true; // ruleset has them and server setting to disallow them
      client_rules_flag[CRF_SURGICAL_PILLAGE]=true;
      $("#order_airbase").attr("title", "Build Airbase/Radar (Shift-E)");

    case "Multiplayer-Evolution ruleset":
      client_rules_flag[CRF_MP2]=true;
      client_rules_flag[CRF_CARGO_HEURISTIC]=true;
      client_rules_flag[CRF_ASMITH_SPECIALISTS]=true;
      client_rules_flag[CRF_OASIS_IRRIGATE]=true;
      client_rules_flag[CRF_MP2_UNIT_CONVERSIONS]=true;
      client_rules_flag[CRF_LEGION_WORK]=true
      client_rules_flag[CRF_MASONRY_FORT]=true;
      client_rules_flag[CRF_CANALS]=true;
      client_rules_flag[CRF_MP2_SPECIAL_UNITS]=true;
      client_rules_flag[CRF_COMMIE_BLDG_UPKEEP]=true;
      client_rules_flag[CRF_PACTS_SANS_EMBASSY]=true;
      client_rules_flag[CRF_TESLA_UPGRADE_DISCOUNT]=true;
      client_rules_flag[CRF_NO_WASTE]=true;
      client_rules_flag[CRF_MAGLEV] = true;
      client_rules_flag[CRF_TRIREME_FUEL] = true;
    break;

    case "Multiplayer-Plus ruleset":
      client_rules_flag[CRF_CARGO_HEURISTIC]=true;
      client_rules_flag[CRF_NO_UNIT_GOLD_UPKEEP]=true;
      client_rules_flag[CRF_PACTS_SANS_EMBASSY]=true;
      client_rules_flag[CRF_NO_WASTE]=true;
    break;

    case "Multiplayer ruleset":
      client_rules_flag[CRF_CARGO_HEURISTIC]=true;
      client_rules_flag[CRF_NO_UNIT_GOLD_UPKEEP]=true;
      client_rules_flag[CRF_NO_WASTE]=true;
    break;

    case "Classic ruleset":
      client_rules_flag[CRF_CARGO_HEURISTIC]=true;
      client_rules_flag[CRF_NO_UNIT_GOLD_UPKEEP]=true;
      client_rules_flag[CRF_NO_WASTE]=true;
    break;

    case "Civ2Civ3 ruleset":
      client_rules_flag[CRF_MAGLEV] = true;
    case "Sandbox ruleset":
      client_rules_flag[CRF_NO_BASES_ON_RIVERS] = true;
      client_rules_flag[CRF_COMMIE_BLDG_UPKEEP] = true;
    break;
  }
  /* Flags for hard-coded client behaviors/optimisations specific to rulesets,
     for MP2 Brava and onward:  ALSO, if a setting becomes false in later version
     these client_rules_flag[_] =false statements go here to avoid the chronologic
     override logic above */
  switch (ruleset_control['name']) {
    case "MP2 Caravel":
      client_rules_flag[CRF_MP2_C] = true;
      client_rules_flag[CRF_SIEGE_RAM] = true;
      client_rules_flag[CRF_MARINE_BASES] = true;
      client_rules_flag[CRF_MARINE_RANGED] = true;
      client_rules_flag[CRF_BSHIP_BOMBARD] = true;
      client_rules_flag[CRF_RECYCLING_DISCOUNT] = true;      
      client_rules_flag[CRF_COLOSSUS_DISCOUNT] = true;      
      client_rules_flag[CRF_SPECIAL_UNIT_ATTACKS] = true;      

      case "MP2 Brava":
      // flags for brava that don't override/contradict caravel
      client_rules_flag[CRF_SEABRIDGE] = true;
      client_rules_flag[CRF_MP2_B] = true;
    break;
  }

  warcalc_set_tooltips(); // set ruleset tooltips for buttons

  if (ruleset_control['name'])
  update_client_state(C_S_PREPARING);

  /* Clear out any effects belonging to the previous ruleset. */
  effects = {};

  /* Clear out the description of the previous ruleset. */
  ruleset_summary = null;
  ruleset_description = null;

  game_rules = null;
  nation_groups = [];
  nations = {};
  specialists = {};
  techs = {};
  governments = {};
  terrain_control = {};
  SINGLE_MOVE = undefined;
  unit_types = {};
  unit_classes = {};
  city_rules = {};
  terrains = {};
  resources = {};
  goods = {};
  actions = {};

  improvements_init();

  /* handle_ruleset_extra defines some variables dynamically */
  for (var extra in extras) {
    var ename = extras[extra]['name'];
    delete window["EXTRA_" + ename.toUpperCase()];
    if (ename == "Railroad") delete window["EXTRA_RAIL"];
    else if (ename == "Oil Well") delete window["EXTRA_OIL_WELL"];
    else if (ename == "Minor Tribe Village") delete window["EXTRA_HUT"];
    else if (typeof EXTRA_SEABRIDGE !== 'undefined') {
      if (ename == "Sea Bridge") delete window["EXTRA_SEABRIDGE"];
    }
    else if (typeof EXTRA_FORT !== 'undefined') { //makes sure it's defined first
      if (ename == "Fort") delete window["EXTRA_FORT"]; ///// 
    } else if (typeof EXTRA_NAVALBASE !== 'undefined') {
        if (ename =="Naval Base") delete window["EXTRA_NAVALBASE"]
    } else if (typeof EXTRA_CASTLE !== 'undefined') {
      if (ename =="Castle") delete window["EXTRA_CASTLE"]
    } else if (typeof EXTRA_BUNKER !== 'undefined') {
      if (ename =="Castle") delete window["EXTRA_BUNKER"]
    }
  }
  extras = {};

  /* Reset legal diplomatic clauses. */
  clause_infos = {};

  // Granularity. From MP2_C onward, some units may have non-integer attack scores.
  // Put these into the client stored data for unit_types so that warcalc and helptext
  // will show perfect info:
  
  /* TODO: implement rest.
   * Some ruleset packets don't have handlers *yet*. Remember to clean up
   * when they are implemented:
   *   handle_ruleset_government_ruler_title
   *   handle_ruleset_base        <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
   *   handle_ruleset_choices
   *   handle_ruleset_road
   *   handle_ruleset_disaster
   *   handle_ruleset_extra_flag   <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
   *   handle_ruleset_trade
   *   handle_ruleset_unit_bonus
   *   handle_ruleset_unit_flag
   *   handle_ruleset_unit_class_flag
   *   handle_ruleset_terrain_flag
   *   handle_ruleset_achievement
   *   handle_ruleset_tech_flag
   *   handle_ruleset_nation_sets
   *   handle_ruleset_style
   *   handle_ruleset_music
   *   handle_ruleset_action_auto
   *
   * Maybe also:
   *   handle_rulesets_ready
   *   handle_nation_availability
   */
}
/**************************************************************************
  Apply internal ruleset effects used for non-integer granular combat 
  scores. Assures accuracy for: warcalc, manual helptext, city prod list,
  etc.
**************************************************************************/
function handle_non_integer_combat_scores(key)
{
  if (unit_types[key]['name']=="Falconeers") {
    unit_types[key].defense_strength *= 0.5;
  }
  else if (unit_types[key]['name']=="Escort Fighter") {
    unit_types[key].attack_strength += 0.5;
  }
  else if (unit_types[key]['name']=="Fighter") {
    unit_types[key].defense_strength += 0.5; // easier than *= 1.666forever
  }
  else {
    return; // skip message
  }
  console.log("Non-integer combat strength added to warcalc data for "+unit_types[key]['name'])
}

/**************************************************************************
  Ruleset summary.
**************************************************************************/
function handle_ruleset_summary(packet)
{
  ruleset_summary = packet['text'];
}

/**************************************************************************
  Receive next part of the ruleset description.
**************************************************************************/
function handle_ruleset_description_part(packet)
{
  if (ruleset_description == null) {
    ruleset_description = packet['text'];
  } else {
    ruleset_description += packet['text'];
  }
}

function handle_endgame_report(packet)
{

  update_client_state(C_S_OVER);

  /* TODO: implement rest*/

}

function update_client_state(value)
{
  set_client_state(value);
}

function handle_authentication_req(packet)
{
  show_auth_dialog(packet);
}

function handle_server_shutdown(packet)
{
  /* TODO: implement*/
}

function handle_nuke_tile_info(packet)
{
  var ptile = index_to_tile(packet['tile']);

  ptile['nuke'] = 60;

  play_sound('nuclear_distant.ogg');

}

/* done */
function handle_city_remove(packet)
{
  remove_city(packet['city_id']);
}


function handle_connect_msg(packet)
{
  add_chatbox_text(packet);
}

/* done */
function handle_server_info(packet)
{

  if (packet['emerg_version'] > 0) {
    console.log('Server has version %d.%d.%d.%d%s',
      packet.major_version, packet.minor_version, packet.patch_version,
      packet.emerg_version, packet.version_label);
  } else {
    console.log("Server has version %d.%d.%d%s",
      packet.major_version, packet.minor_version, packet.patch_version,
      packet.version_label);
  }
}

/* done */
function handle_city_name_suggestion_info(packet)
{
  /* Decode the city name. */
  packet['name'] = decodeURIComponent(packet['name']);

  city_name_dialog(packet['name'], packet['unit_id']);
}

/**************************************************************************
  PID 45. Handle the response the a request asking what buildings a
  potential victim of targeted sabotage city victim.
**************************************************************************/
function handle_city_sabotage_list(packet)
{
  if (!packet["disturb_player"]) {
    console.log("handle_city_sabotage_list(): was asked to not disturb "
                + "the player. That is unimplemented.");
  }

  popup_sabotage_dialog(game_find_unit_by_number(packet['actor_id']),
                        game_find_city_by_number(packet['city_id']),
                        new BitVector(packet['improvements']),
                        packet['act_id']);
}

function handle_player_attribute_chunk(packet)
{
  /* The attribute block of the player structure is an area of Freeciv
   * server memory that the client controls. The server will store it to
   * savegames, send it when the client requests a copy and change it on
   * the client's request. The server has no idea about its content. This
   * is a chunk of it.
   *
   * The C clients can use the attribute block to store key-value pair
   * attributes for the object types city, player, tile and unit. The
   * format the they use to encode this data can be found in Freeciv's
   * client/attribute.c.
   *
   * The C clients uses it to store parameters of cities for the (client
   * side) CMA agent. */

  /* TODO: Find out if putting something inside savegames is needed. If it
   * is: decide if compatibility with the format of the Freeciv C clients
   * is needed and implement the result of the decision. */
}

/**************************************************************************
  Handle a remove-unit packet, sent by the server to tell us any time a
  unit is no longer there.                             99% complete.
**************************************************************************/
function handle_unit_remove(packet)
{
  var punit = game_find_unit_by_number(packet['unit_id']);

  if (punit == null) {
    return;
  }

  /* Close the action selection dialog if the actor unit is lost */
  if (action_selection_in_progress_for === punit.id) {
    action_selection_close();
    /* Open another action selection dialog if there are other actors in the
     * current selection that want a decision. */
    action_selection_next_in_focus(punit.id);
  }

  /* TODO: Notify agents. */

  clear_tile_unit(punit);
  client_remove_unit(punit);

}

/* 100% complete */
function handle_unit_info(packet)
{
  handle_unit_packet_common(packet);
  /* Update active tabs affected by this info */
  var active_tab = $("#tabs").tabs("option", "active"); 
  if (active_tab == TAB_EMPIRE) {  
    empire_screen_updater.update();  // TEST:is this the right way to update empire screen?
  }
}

/* 99% complete FIXME: does this loose information? */
function handle_unit_short_info(packet)
{
  handle_unit_packet_common(packet);
  /* Update active tabs affected by this info */
  var active_tab = $("#tabs").tabs("option", "active"); 
  if (active_tab == TAB_EMPIRE) {  
    empire_screen_updater.update();  // TEST:is this the right way to update empire screen?
  }
}

/**************************************************************************
  Called to do basic handling for a unit_info or short_unit_info packet.

  Both owned and foreign units are handled; you may need to check unit
  owner, or if unit equals focus unit, depending on what you are doing.

  Note: Normally the server informs client about a new "activity" here.
  For owned units, the new activity can be a result of:
  - The player issued a command (a request) with the client.
  - The server side AI did something.
  - An enemy encounter caused a sentry to idle. (See "Wakeup Focus").

  Depending on what caused the change, different actions may be taken.
  Therefore, this function is a bit of a jungle, and it is advisable
  to read thoroughly before changing.

  Exception: When the client puts a unit in focus, it's status is set to
  idle immediately, before informing the server about the new status. This
  is because the server can never deny a request for idle, and should not
  be concerned about which unit the client is focusing on.
**************************************************************************/
function handle_unit_packet_common(packet_unit)
{
  var punit = player_find_unit_by_id(unit_owner(packet_unit), packet_unit['id']);

  clear_tile_unit(punit);

  if (punit == null && game_find_unit_by_number(packet_unit['id'])) {
    /* This means unit has changed owner. We deal with this here
     * by simply deleting the old one and creating a new one. */
    handle_unit_remove(packet_unit['id']);
  }
  var old_tile = null;
  if (punit != null) old_tile = index_to_tile(punit['tile']);

  if (units[packet_unit['id']] == null) {
    /* This is a new unit. */
    if (should_ask_server_for_actions(packet_unit)) {
      action_decision_request(packet_unit);
    }
    packet_unit['anim_list'] = [];
    units[packet_unit['id']] = packet_unit;
    units[packet_unit['id']]['facing'] = 6;
  } else {
    if (punit['action_decision_want'] != packet_unit['action_decision_want']
        && should_ask_server_for_actions(packet_unit)) {
      /* The unit wants the player to decide. */
      action_decision_request(packet_unit);
    }

    update_unit_anim_list(units[packet_unit['id']], packet_unit);
    units[packet_unit['id']] = $.extend(units[packet_unit['id']], packet_unit);

    for (var i = 0; i < current_focus.length; i++) {
      if (current_focus[i]['id'] == packet_unit['id']) {
        $.extend(current_focus[i], packet_unit);
      }
    }
  }

  update_tile_unit(units[packet_unit['id']]);

  if (current_focus.length > 0 && current_focus[0]['id'] == packet_unit['id']) {
    update_active_units_dialog();
    update_unit_order_commands();

    if (current_focus[0]['done_moving'] != packet_unit['done_moving']) {
      update_unit_focus();
    }
  }

  /* TODO: update various dialogs and mapview. */
}

function handle_unit_combat_info(packet)
{
  var attacker = units[packet['attacker_unit_id']];
  var defender = units[packet['defender_unit_id']];
  var attacker_hp = packet['attacker_hp'];
  var defender_hp = packet['defender_hp'];
  var tile_x = tiles[attacker['tile']]['x'];
  var tile_y = tiles[attacker['tile']]['y'];



      // Might be null/false if observer
      var pplayer = null;
      var player_nation = null;

      if (observing || client.conn.playing == null) {
        // reserved extra 'observer' handling later
      } else { // set up player info if it's a real player
        pplayer = players[client.conn.playing['playerno']];
        player_nation = nations[pplayer['nation']]['adjective'];
      }

      var defender_nation = players[defender['owner']]['nation'];
      var attacker_nation = players[attacker['owner']]['nation'];
      var player_is_combatant = (player_nation==nations[defender_nation]['adjective'] || player_nation==nations[attacker_nation]['adjective']);
      var combatant_visible = (is_unit_visible(attacker) || is_unit_visible(defender));

      // When an attacker loses, play sound for defender if: a combatant is visible OR the player was involved in the battle. 
      if (attacker_hp == 0 && (combatant_visible || player_is_combatant) )  {
        var win_type = unit_type(defender)['name'];
        var swords = (units_pregunpowder.indexOf(win_type) >= 0);
        if (combatant_visible) explosion_anim_map[attacker['tile']] = 25 - swords*1;
        anim_swords_instead[attacker['tile']] = swords; 

        if (!combat_sound_special_case(attacker,attacker_hp,defender) ) // this function lets us program special cases sounds
          play_combat_sound(defender); //attacker lost, player defender combat sound
      }
      // When a defender loses, play sound for attacker if: a combatant is visible OR the player was involved in the battle.
      if (defender_hp == 0  && (combatant_visible || player_is_combatant) ) {
        var win_type = unit_type(attacker)['name'];
        var swords = (units_pregunpowder.indexOf(win_type) >= 0);
        if (combatant_visible) explosion_anim_map[defender['tile']] = 25 - swords*1;
        anim_swords_instead[defender['tile']] = swords; 

        if (!combat_sound_special_case(attacker,attacker_hp,defender) ) // this function lets us program special cases sounds
          play_combat_sound(attacker); //defender lost, player attacker combat sound
      }
      // When both units survive due to combat rounds/bombardment/etc.
      if (defender_hp > 0 && attacker_hp > 0 && (combatant_visible || player_is_combatant) ) 
      {
        play_combat_sound(attacker); 
        play_combat_sound(defender); 
        
        //update_map_canvas_full();
/*
        // Construct the names of the defender unit: e.g., "Your Cannon", "French Cavalry", etc.
        var defend_unit = "the " + nations[defender_nation]['adjective'];
        if (nations[defender_nation]['adjective']==player_nation) defend_unit = "your";
        defend_unit = defend_unit + " " + unit_types[defender['type']]['name'];
        // Construct name of attacker unit:
        var attack_unit = "the " + nations[attacker_nation]['adjective']; 
        if (nations[attacker_nation]['adjective']==player_nation) attack_unit = "your";
        attack_unit = attack_unit + " " + unit_types[attacker['type']]['name'];
        
        // It was not sending a message after battle, so inject one here:
        var special_message = "A valiant battle with no winner: <l tgt=\"tile\" x=\""+tile_x+"\" y=\""+tile_y+"\">"+attack_unit+"</l> survived with "+attacker_hp+"hp while reducing "
                            + defend_unit+" to "+defender_hp+"hp.";  
        
        // might need to replace true with "true" since it's string inside a packet:                    
        if (packet['make_att_veteran']==true && attack_unit.substring(0,4)=="your") {
          special_message += " From the battle experience, "+attack_unit+" gained a veteran level!"
        }
        else if (packet['make_def_veteran']==true && defend_unit.substring(0,4)=="your") {
          special_message += " From the battle experience, "+defend_unit+" gained a veteran level!"
        } 
        
        // TO DO: special message is clickable like the others, taking you to the map location it happened.                    
        
        // Everything below is a hack for the fact we aren't correctly intercepting and processing packets for battle results
        // sent by the server, when those battles involved combat_rounds and did not result in a unit dying:
        // --------------------------------------------------------------------------------------------------------------------
        var scrollDiv = get_chatbox_msg_list();
        if (scrollDiv != null && player_is_combatant) {     // TO DO: not sure if 'hack fix' update on unit display is appropriate for non-combatant witnesses
          var item = document.createElement('li');          // who might not have info/data on some of the units involved which are being changed here
          item.className = "e_unit_win_att";
          item.innerHTML = "<span class='chatbox_text_tileinfo' onclick='center_tile_id("+attacker['tile']+");'>"+special_message+"</span>";

          scrollDiv.appendChild(item); 
          chatbox_scroll_to_bottom(true);
*/
          // New packet style coming back for a no-victory battle wasn't getting interpreted and redrawn
          // We will hard-code in here the new unit infos so redraw will work:
/*          
          units[packet['attacker_unit_id']]['hp'] = attacker_hp;
          units[packet['defender_unit_id']]['hp'] = defender_hp;

          // force update veteran levels also
          if (packet['make_att_veteran']==true) units[packet['attacker_unit_id']]['veteran']++;
          if (packet['make_def_veteran']==true) units[packet['defender_unit_id']]['veteran']++;
         
          //When neither unit wins, tired moves will almost certainly result in 0 movesleft, but we don't have
          // movesleft info until a packet 63 arrives with this info, so it's safer to show the user for now
          // what is 99% likely true, that the unit has 0 moves left, instead of 100% certainly false, that it has full movesleft:
          units[packet['attacker_unit_id']]['movesleft'] = 0;
          units[packet['defender_unit_id']]['movesleft'] = 0;  //packet 63 will reset these when it finally comes, likely to 0.
*/          
          // TO DO: send harmless action/info refresh on the unit such as a shift-J or unit info inquiry etc., using 
          // var packet_unit_do_action = 84 (or other?) ...  to provoke the server to come back with a packet 63, in order 
          // to get the proper move points that are remaining for the player's unit... this will make all the hacky junk above superfluous.
/*           
          // Forced redraw:
          update_tile_unit(units[packet['attacker_unit_id']]);   
          update_tile_unit(units[packet['defender_unit_id']]);
          auto_center_on_focus_unit();
          update_active_units_dialog();
          update_unit_order_commands();
*/
          //setTimeout(update_unit_focus, 700);  // remove this if unit redraw still doesn't work
          // --------------------------------------------------------------------------------------------------------------------
        }
}

/**************************************************************************
  Handle the requested follow up question about an action
**************************************************************************/
function handle_unit_action_answer(packet)
{
  var actor_id = packet['actor_id'];
  var target_id = packet['target_id'];
  var cost = packet['cost'];
  var action_type = packet['action_type'];

  var target_city = game_find_city_by_number(target_id);
  var target_unit = game_find_unit_by_number(target_id);
  var actor_unit = game_find_unit_by_number(actor_id);

  if (actor_unit == null) {
    console.log("Bad actor unit (" + actor_id
                + ") in unit action answer.");
    act_sel_queue_done(diplomat_id);
    return;
  }

  if (!packet["disturb_player"]) {
    console.log("handle_unit_action_answer(): was asked to not disturb "
                + "the player. That is unimplemented.");
  }

  if (action_type == ACTION_SPY_BRIBE_UNIT) {
    if (target_unit == null) {
      console.log("Bad target unit (" + target_id
                  + ") in unit action answer.");
      act_sel_queue_done(diplomat_id);
      return;
    } else {
      popup_bribe_dialog(actor_unit, target_unit, cost, action_type);
      return;
    }
  } else if (action_type == ACTION_SPY_INCITE_CITY
             || action_type == ACTION_SPY_INCITE_CITY_ESC) {
    if (target_city == null) {
      console.log("Bad target city (" + target_id
                  + ") in unit action answer.");
      act_sel_queue_done(diplomat_id);
      return;
    } else {
      popup_incite_dialog(actor_unit, target_city, cost, action_type);
      return;
    }
  } else if (action_type == ACTION_UPGRADE_UNIT) {
    if (target_city == null) {
      console.log("Bad target city (" + target_id
                  + ") in unit action answer.");
      act_sel_queue_done(diplomat_id);
      return;
    } else {
      popup_unit_upgrade_dlg(actor_unit, target_city, cost, action_type);
      return;
    }
  } else if (action_type == ACTION_COUNT) {
    console.log("unit_action_answer: Server refused to respond.");
  } else {
    console.log("unit_action_answer: Invalid answer.");
  }
  act_sel_queue_done(diplomat_id);
}

/**************************************************************************
  Handle server reply about what actions an unit can do.
**************************************************************************/
function handle_unit_actions(packet)
{
  var actor_unit_id = packet['actor_unit_id'];
  var target_unit_id = packet['target_unit_id'];
  var target_city_id = packet['target_city_id'];
  var target_tile_id = packet['target_tile_id'];
  var target_extra_id = packet['target_extra_id'];
  var action_probabilities = packet['action_probabilities'];
  var disturb_player = packet['disturb_player'];

  var pdiplomat = game_find_unit_by_number(actor_unit_id);
  var target_unit = game_find_unit_by_number(target_unit_id);
  var target_city = game_find_city_by_number(target_city_id);
  var ptile = index_to_tile(target_tile_id);
  var target_extra = extra_by_number(target_extra_id);

  var hasActions = false;

  /* The dead can't act. */
  if (pdiplomat != null && ptile != null) {
    action_probabilities.forEach(function(prob) {
      if (action_prob_possible(prob)) {
        hasActions = true;
      }
    });
  }

  if (hasActions && disturb_player) {
    popup_action_selection(pdiplomat, action_probabilities,
                           ptile, target_extra, target_unit, target_city);
  } else if (disturb_player) {
    /* Nothing to do. */
    action_selection_no_longer_in_progress(actor_unit_id);
    action_decision_clear_want(actor_unit_id);
    action_selection_next_in_focus(actor_unit_id);
  } else if (hasActions) {
    /* This was a background request. */

    /* No background requests are currently made. */
    console.log("Received the reply to a background request I didn't do.");
  }
}

function handle_diplomacy_init_meeting(packet)
{
  // for hotseat games, only activate diplomacy if the player is playing.
  if (is_hotseat() && packet['initiated_from'] != client.conn.playing['playerno']) return;   

  diplomacy_clause_map[packet['counterpart']] = [];
  show_diplomacy_dialog(packet['counterpart']);
  show_diplomacy_clauses(packet['counterpart']);
}

function handle_diplomacy_cancel_meeting(packet)
{
  cancel_meeting(packet['counterpart']);
}

function handle_diplomacy_create_clause(packet)
{
  var counterpart_id = packet['counterpart'];
  if(diplomacy_clause_map[counterpart_id] == null) {
    diplomacy_clause_map[counterpart_id] = [];
  }
  diplomacy_clause_map[counterpart_id].push(packet);
  show_diplomacy_clauses(counterpart_id);
}

function handle_diplomacy_remove_clause(packet)
{
  remove_clause(packet);
}

function handle_diplomacy_accept_treaty(packet)
{
  accept_treaty(packet['counterpart'],
    packet['I_accepted'],
    packet['other_accepted']);
}

/* Assemble incoming page_msg here. */
var page_msg = {};

/**************************************************************************
  Page_msg header handler.
**************************************************************************/
function handle_page_msg(packet)
{
  /* Message information */
  page_msg['headline'] = packet['headline'];
  page_msg['caption'] = packet['caption'];
  page_msg['event'] = packet['event'];

  /* How many fragments to expect. */
  page_msg['missing_parts'] = packet['parts'];

  /* Will come in follow up packets. */
  page_msg['message'] = "";

  // If it's Wonders of the World Report we are responsible for adding Small Wonders client-side
  if (packet.headline == "Wonders of the World") {
    page_msg['message'] += handle_wonders_report(); 

    if (packet['parts']==0) { // 0==no Great Wonders: must show a report dialog because no further parts arriving
      show_dialog_message(page_msg['headline'], page_msg['message']);
      page_msg = {}; /* Clear the message. */
    }
    else page_msg['message']+="<br><b><u>Great Wonders</u></b><br>"
  }
}

/**************************************************************************
  Finishes constructing Wonders Report (client-side needed for Small Wonders)
**************************************************************************/
function handle_wonders_report()
{
  // initialize wonder report table
  var appended_message = "<div style='overflow:hidden;'><table><tr><th style='text-align:left;'><u>Small Wonders</u></th><th>#</th></tr>" ;

  // counter for how many wonders we find out there in the world: 
  var wonders = new Array(improvements.length);
  
  for (var w=0; w < Object.keys(improvements).length; w++)  {        // check all wonders
    wonders[w] = 0;
    for (var p=0; p < Object.keys(players).length; p++)              // look at all players
    { 
      if (players[p].wonders[w] != 0)                 // player has wonder
        wonders[w]++;                                 // increment the count
    }
    if (wonders[w] > 0 && improvements[w].genus==1)  { // 1 is the genus code for small wonder
      var color_marker = "<span style='text-shadow: 1px 1px #000'>";
      if (!client_is_observer() && player_has_wonder(client.conn.playing.playerno,w)) {
        color_marker = "<span style='color: rgb(128,192,255); text-shadow: 1px 1px #000'>";
      }
      appended_message += "<tr style='cursor:default' title='"+html_safe(improvements[w].helptext)+"'>" 
        + "<td>" + color_marker + improvements[w].name+"</span></td><td><b>"+wonders[w] + "</b></td></tr>";
    }
  }
  appended_message += "</table></div>";

  return appended_message;
}

/**************************************************************************
  Page_msg part handler.
**************************************************************************/
function handle_page_msg_part(packet)
{
  /* Add the new parts of the message content. */
  page_msg['message'] = page_msg['message'] + packet['lines'];

  /* Register that it was received. */
  page_msg['missing_parts']--;

  if (page_msg['missing_parts'] == 0) {
    /* This was the last part. */

    var regxp = /\n/gi;

    page_msg['message'] = page_msg['message'].replace(regxp, "<br>\n");

    show_dialog_message(page_msg['headline'], page_msg['message']);

    /* Clear the message. */
    page_msg = {};
  }
}

function handle_conn_ping_info(packet)
{
  last_ping_measurement = packet['ping_time'][0] * 1000;

  if (debug_active) {
    conn_ping_info = packet;
    debug_ping_list.push(packet['ping_time'][0] * 1000);
  }
}

function handle_end_phase(packet)
{
  chatbox_clip_messages();
  if (is_pbem()) {
    pbem_end_phase();
  }
  if (is_hotseat())  {
    hotseat_next_player();
  }
}

/* Done. */
function handle_new_year(packet)
{
  game_info['year'] = packet['year'];
  /* TODO: Support calender fragments. */
  game_info['fragments'] = packet['fragments'];
  game_info['turn'] = packet['turn'];
}

function handle_begin_turn(packet)
{
  if (!observing) {
    $("#turn_done_button").button("option", "disabled", false);
    $("#turn_done_button").css({"background-color":"#000f", "opacity":1, "color":"#ddd", "border-color": "#edd5"});
    if (is_small_screen()) {
      $("#turn_done_button").button("option", "label", "Done");
    } else {
      $("#turn_done_button").button("option", "label", "Turn Done");
    }
  }
  waiting_units_list = [];
  update_unit_focus();
  update_active_units_dialog();
  update_game_status_panel();

  var funits = get_units_in_focus();
  if (funits != null && funits.length == 0) {
    /* auto-center if there is no unit in focus. */
    auto_center_on_focus_unit();
  }

  if (is_tech_tree_init && tech_dialog_active) update_tech_screen();
}

function handle_end_turn(packet)
{
  reset_unit_anim_list();
  if (!observing) {
    $("#turn_done_button").css({"background-color":"#0006", "opacity":0.85, "color":"#edd", "border-color": "#edd5"});
    $("#turn_done_button").button( "option", "disabled", true);
    $("#turn_done_button:disabled").css({"background-color":"#0006", "opacity":0.85, "color":"#edd", "border-color": "#edd5"});
  }
}

function handle_freeze_client(packet)
{
  client_frozen = true;
}

function handle_thaw_client(packet)
{
  client_frozen = false;
}

function handle_spaceship_info(packet)
{
  spaceship_info[packet['player_num']] = packet;
}

/* 100% complete */
function handle_ruleset_unit(packet)
{
  if (packet['name'] != null && packet['name'].indexOf('?unit:') == 0)
    packet['name'] = packet['name'].replace('?unit:', '');

  unit_types[packet['id']] = packet;

  unit_types[packet['id']].gov_requirement = GOV_LAST;
  for (var i = 0; i < packet['build_reqs'].length; i++) {
    if (packet['build_reqs'][i]['kind'] == VUT_GOVERNMENT) {
      unit_types[packet['id']].gov_requirement = packet['build_reqs'][i]['value'];
    }
  }

  // Placeholder solution for units whose base combat strength is 
  // non-integer and achievea  non-integer base score via a globally
  // applied bonus/penalty in units.ruleset.
  if (client_rules_flag[CRF_MP2_C])
    handle_non_integer_combat_scores(packet['id']);
  
}

/************************************************************************//**
  The web_ruleset_unit_addition packet is a follow up packet to the
  ruleset_unit packet. It gives some information the C clients calculates on
  their own.
****************************************************************************/
function handle_web_ruleset_unit_addition(packet)
{
  /* Decode bit vector. */
  packet['utype_actions'] = new BitVector(packet['utype_actions']);

  unit_types[packet['id']] = $.extend(unit_types[packet['id']], packet);
  
  create_unit_offset_arrays();
}

/* 100% complete */
function handle_ruleset_game(packet)
{
  game_rules = packet;
}

/* 100% complete */
function handle_ruleset_specialist(packet)
{
  specialists[packet['id']] = packet;
}

function handle_ruleset_government_ruler_title(packet)
{
  /* TODO: implement*/
}

/**************************************************************************
  Recreate the old req[] field of ruleset_tech packets.

  This makes it possible to delay research_reqs support.
**************************************************************************/
function recreate_old_tech_req(packet)
{
  var i;

  /* Recreate the field it self. */
  packet['req'] = [];

  /* Add all techs in research_reqs. */
  for (i = 0; i < packet['research_reqs'].length; i++) {
    var requirement = packet['research_reqs'][i];

    if (requirement.kind == VUT_ADVANCE
        && requirement.range == REQ_RANGE_PLAYER
        && requirement.present) {
      packet['req'].push(requirement.value);
    }
  }

  /* Fill in A_NONE just in case Freeciv-web assumes its size is 2. */
  while (packet['req'].length < 2) {
    packet['req'].push(A_NONE);
  }
}

/* 100% complete */
function handle_ruleset_tech(packet)
{
  packet['name'] = packet['name'].replace("?tech:", "");
  techs[packet['id']] = packet;

  recreate_old_tech_req(packet);
}

/**************************************************************************
  Packet ruleset_tech_class handler.
**************************************************************************/
function handle_ruleset_tech_class(packet)
{
  /* TODO: implement*/
}

function handle_ruleset_tech_flag(packet)
{
  /* TODO: implement*/
}

/* 100% complete */
function handle_ruleset_government(packet)
{
  governments[packet['id']] = packet;
  // Track number of governments for ruleset:
  GOV_LAST =  Object.keys(governments).length; // length = last_index+1 because 0-based
}

/* 100% complete */
function handle_ruleset_terrain_control(packet)
{
  terrain_control = packet;

  /* Separate since it is easier understand what SINGLE_MOVE means than to
   * understand what terrain_control['move_fragments'] means. */
  SINGLE_MOVE = terrain_control['move_fragments'];
}

/* 100% complete */
function handle_ruleset_nation_groups(packet)
{
  nation_groups = packet['groups'];
}

/* 100% complete */
function handle_ruleset_nation(packet)
{
  nations[packet['id']] = packet;
}

function handle_ruleset_city(packet)
{
  city_rules[packet['style_id']] = packet;
}

/* 100% complete */
function handle_ruleset_building(packet)
{
  improvements_add_building(packet);
}

function handle_ruleset_unit_class(packet)
{
  packet['flags'] = new BitVector(packet['flags']);
  unit_classes[packet['id']] = packet;
}

function handle_ruleset_disaster(packet)
{
  /* TODO: implement */
}

function handle_ruleset_trade(packet)
{
  /* TODO: implement */
}

function handle_rulesets_ready(packet)
{
  /* Nothing to do */
}

function handle_single_want_hack_reply(packet)
{
  /* TODO: implement */
}

function handle_ruleset_choices(packet)
{
  /* TODO: implement */
}

function handle_game_load(packet)
{
  /* TODO: implement */
}

 /* Done */
function handle_ruleset_effect(packet)
{
  if (effects[packet['effect_type']] == null) {
    /* This is the first effect of this type. */
    effects[packet['effect_type']] = [];
  }

  effects[packet['effect_type']].push(packet);
}

function handle_ruleset_unit_flag(packet)
{
  /* TODO: implement */
}

/***************************************************************************
  Packet ruleset_unit_class_flag handler.
***************************************************************************/
function handle_ruleset_unit_class_flag(packet)
{
  /* TODO: implement */
}

function handle_ruleset_unit_bonus(packet)
{
  /* TODO: implement */
}

function handle_ruleset_terrain_flag(packet)
{
  /* TODO: implement */
}

/**************************************************************************
  Receive scenario information about the current game.

  The current game is a scenario game if scenario_info's 'is_scenario'
  field is set to true.
**************************************************************************/
function handle_scenario_info(packet)
{
  scenario_info = packet;

  /* Don't call update_game_info_pregame() yet. Wait for the scenario
   * description. */
}

/**************************************************************************
  Receive scenario description of the current scenario.
**************************************************************************/
function handle_scenario_description(packet)
{
  scenario_info['description'] = packet['description'];

  /* Show the updated game information. */
  update_game_info_pregame();
}

function handle_vote_new(packet)
{
  /* TODO: implement*/
}

function handle_vote_update(packet)
{
  /* TODO: implement*/
}

function handle_vote_remove(packet)
{
  /* TODO: implement*/
}

function handle_vote_resolve(packet)
{
  /* TODO: implement*/
}

function handle_edit_object_created(packet)
{
  /* edit not supported. */
}

function handle_goto_path(packet)
{
  if (goto_active) {
    update_goto_path(packet);
  }
  else { // middle-click to show path for units on tile
    show_goto_path(packet);
  }
}

/**************************************************************************
  Receive general information about a server setting.
  Setting data type specific information comes in a follow up packet.
**************************************************************************/
function handle_server_setting_const(packet)
{
  /* The data type specific follow up packets needs to look up a setting by
   * its id. */
  server_settings[packet['id']] = packet;

  /* Make it possible to look up a setting by its name. */
  server_settings[packet['name']] = packet;
}

/**************************************************************************
  Receive general information about a server setting.
  This is a follow up packet with data type specific information.
**************************************************************************/
function handle_server_setting_int(packet)
{
  $.extend(server_settings[packet['id']], packet);
}

/**************************************************************************
  Receive general information about a server setting.
  This is a follow up packet with data type specific information.
**************************************************************************/
function handle_server_setting_enum(packet)
{
  $.extend(server_settings[packet['id']], packet);
}

/**************************************************************************
  Receive general information about a server setting.
  This is a follow up packet with data type specific information.
**************************************************************************/
function handle_server_setting_bitwise(packet)
{
  $.extend(server_settings[packet['id']], packet);
}

/**************************************************************************
  Receive general information about a server setting.
  This is a follow up packet with data type specific information.
**************************************************************************/
function handle_server_setting_bool(packet)
{
  $.extend(server_settings[packet['id']], packet);
}

/**************************************************************************
  Receive general information about a server setting.
  This is a follow up packet with data type specific information.
**************************************************************************/
function handle_server_setting_str(packet)
{
  $.extend(server_settings[packet['id']], packet);
}

/**************************************************************************
  Makes a game UID that is browser persistent, so user data specific 
  to a game can be remembered on client.
**************************************************************************/
function handle_game_uid()
{
  /* TODO: Currently, we just call this every time the user toggles Alt-X
    * to go into chalkboard mode. That's bad because we might want to start
    * using the UID for saving other game-specific info on the client side.
    * Ideally we would not create a Game_UID on the client side but rather,
    * pull it from server_settings or game_info. Or alternatively, find some 
    * unique point/event/trigger during game load or game start that we know 
    * only happens once and happens AFTER we have received a packet with the
    * server_settings loaded, since those are needed to create the Game_UID. */
  if (! (server_settings && Object.keys(server_settings).length > 0) ) return;
  if (is_longturn() 
      && server_settings['metamessage']
      && server_settings['metamessage']['val']) {
        
        Game_UID = server_settings['metamessage']['val']; 
  }
  else {
    Game_UID = server_settings['xsize']['val'] * server_settings['ysize']['val']
              + server_settings['xsize']['val'] + server_settings['ysize']['val'];
    if (client.conn.playing) {
      Game_UID += client.conn.playing['name'] + client.conn.playing['nation']
      + client.conn.playing['playerno'];
    }          
  }
  Game_UID = getHash(Game_UID.toString()); // get UID

  myGameVars = simpleStorage.get(Game_UID); // get persistent data for UID
  if (!myGameVars) myGameVars = {};
}

function handle_server_setting_control(packet)
{
  /* TODO: implement */
}

function handle_player_diplstate(packet)
{
  if (client == null || client.conn.playing == null) return;

  if (packet['type'] == DS_WAR && packet['plr2'] == client.conn.playing['playerno']
      && diplstates[packet['plr1']] != DS_WAR && diplstates[packet['plr1']] != DS_NO_CONTACT) {
     alert_war(packet['plr1']);
  } else if (packet['type'] == DS_WAR && packet['plr1'] == client.conn.playing['playerno']
      && diplstates[packet['plr2']] != DS_WAR && diplstates[packet['plr2']] != DS_NO_CONTACT)  {
     alert_war(packet['plr2']);
  }

  if (packet['plr1'] == client.conn.playing['playerno']) {
    diplstates[packet['plr2']] = packet['type'];
  } else if (packet['plr2'] == client.conn.playing['playerno']) {
    diplstates[packet['plr1']] = packet['type'];
  }

  // TODO: remove current diplstates (after moving all users to the new one),
  //       or just make it a reference to players[me].diplstates
  //
  // There's no need to set players[packet.plr2].diplstates, as there'll be
  // a packet for that.  In fact, there's a packet for each of (p1,x) and (p2,x)
  // when the state changes between p1 and p2, and for all pairs of players
  // when a turn begins
  if (players[packet['plr1']].diplstates === undefined) {
    players[packet['plr1']].diplstates = [];
  }
  players[packet['plr1']].diplstates[packet['plr2']] = {
    state: packet['type'],
    turns_left: packet['turns_left'],
    contact_turns_left: packet['contact_turns_left'],
    has_reason_to_cancel: packet['has_reason_to_cancel']
  };
}

/**************************************************************************
  Packet handle_ruleset_extra handler. Also defines EXTRA_* variables
  dynamically.
**************************************************************************/
function handle_ruleset_extra(packet)
{
  /* Decode bit vectors. */
  packet['causes'] = new BitVector(packet['causes']);
  packet['rmcauses'] = new BitVector(packet['rmcauses']);

  extras[packet['id']] = packet;
  extras[packet['name']] = packet;

  window["EXTRA_" + packet['name'].toUpperCase()] = packet['id'];

  if (typeof EXTRA_FORT !== 'undefined') { //makes sure it's defined first
     //some rulesets don't have this extra so this checks if it's defined first
    if (packet['name'] == "Fort") window["EXTRA_FORT"] = packet['id']; /////
  } 
  /*
  if (typeof EXTRA_NAVALBASE !== 'undefined') { //makes sure it's defined first
    if (packet['name'] == "Naval Base") window["EXTRA_NAVALBASE"] = packet['id']; /////
  } */

  if (packet['name'] == "Sea Bridge") window['EXTRA_SEABRIDGE'] = packet['id'];
  if (packet['name'] == "Naval Base") window["EXTRA_NAVALBASE"] = packet['id']; /////
  if (packet['name'] == "Railroad") window["EXTRA_RAIL"] = packet['id'];
  if (packet['name'] == "Oil Well") window["EXTRA_OIL_WELL"] = packet['id'];
  if (packet['name'] == "Minor Tribe Village") window["EXTRA_HUT"] = packet['id'];
  if (packet['name'] == "Castle") window["EXTRA_CASTLE"] = packet['id'];
  if (packet['name'] == "Bunker") window["EXTRA_BUNKER"] = packet['id'];

}

/**************************************************************************
  Packet ruleset_extra_flag handler.
**************************************************************************/
function handle_ruleset_extra_flag(packet)
{
  /* TODO: implement */
}

function handle_ruleset_base(packet)
{
  /* TODO: Implement */
}

function handle_ruleset_road(packet)
{
  /* TODO: Implement */
}

/************************************************************************//**
  Handle a packet about a particular action enabler.
****************************************************************************/
function handle_ruleset_action_enabler(packet)
{
  var paction = actions[packet.enabled_action];

  if (paction === undefined) {
    console.log("Unknown action " + packet.action + " for enabler ");
    console.log(packet);
    return;
  }

  /* Store the enabler in its action. */
  paction.enablers.push(packet);
}

function handle_ruleset_nation_sets(packet)
{
  /* TODO: Implement */
}

function handle_ruleset_style(packet)
{
  /* TODO: Implement */
}

function handle_nation_availability(packet)
{
  /* TODO: Implement */
}

function handle_ruleset_music(packet)
{
  /* TODO: Implement */
}

function handle_endgame_player(packet)
{
  endgame_player_info.push(packet);
}

function handle_research_info(packet)
{
  var old_inventions = null;
  if (research_data[packet['id']] != null) old_inventions = research_data[packet['id']]['inventions'];

  research_data[packet['id']] = packet;

  if (game_info['team_pooled_research']) {
    for (var player_id in players) {
      var pplayer = players[player_id];
      if (pplayer['team'] == packet['id']) {
  pplayer = $.extend(pplayer, packet);
        delete pplayer['id'];
      }
    }
  } else {
    var pplayer = players[packet['id']];
    pplayer = $.extend(pplayer, packet);
    delete pplayer['id'];
  }

  if (!client_is_observer() && old_inventions != null && client.conn.playing != null && client.conn.playing['playerno'] == packet['id']) {
    for (var i = 0; i < packet['inventions'].length; i++) {
      if (packet['inventions'][i] != old_inventions[i] && packet['inventions'][i] == TECH_KNOWN) {
        queue_tech_gained_dialog(i);
  break;
      }
    }
  }

  if (is_tech_tree_init && tech_dialog_active) update_tech_screen();
  bulbs_output_updater.update();
}

function handle_worker_task(packet)
{
  /* TODO: Implement */
}

function handle_timeout_info(packet)
{
  last_turn_change_time = Math.ceil(packet['last_turn_change_time']);
  seconds_to_phasedone = Math.floor(packet['seconds_to_phasedone']);
  seconds_to_phasedone_sync = new Date().getTime();
}

/************************************************************************//**
  Shows image with text and play music
****************************************************************************/
function handle_show_img_play_sound(packet)
{
  /* TODO: Implement */
  /* Currently (6th Sep 2018) only used in sandbox. The sandbox ruleset
   * isn't supported by Freeciv-web at the moment. */
}

function handle_play_music(packet)
{
  /* TODO: Implement */
}

/* Receive a generalized action. */
function handle_ruleset_action(packet)
{
  actions[packet['id']] = packet;
  packet["enablers"] = [];
}

/**************************************************************************
  Handle an action auto performer rule.
**************************************************************************/
function handle_ruleset_action_auto(packet)
{
  /* Not stored. The web client doesn't use this rule knowledge (yet). */
}

function handle_ruleset_goods(packet)
{
  goods[packet['id']] = packet;
}

function handle_ruleset_achievement(packet)
{
  /* TODO: Implement. */
}

/************************************************************************//**
  Handle a packet about a particular clause.
****************************************************************************/
function handle_ruleset_clause(packet)
{
  clause_infos[packet['type']] = packet;
}

function handle_achievement_info(packet)
{
  /* TODO: implement */
}

function handle_team_name_info(packet)
{
  /* TODO: implement */
}

/************************************************************************//**
  Returns true if the sound of an event in the chat_log history should not
  be played because the client is in a cooldown after launch, and not 
  wanting to hear repeated events from long past turns (e.g., chat messages,
  sold buildings, etc.)
****************************************************************************/
function suppress_event_sound()
{
  var cur_time = new Date().getTime();

  // uses global vars located in clinet.js:
  if (cur_time-game_launch_timer < event_sound_suppress_delay) {
    return true;
  }
  return false;
}
