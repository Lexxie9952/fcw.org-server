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


/* All generalized actions. */
var actions = {};
var auto_attack = false;
var active_dialogs = [];
var action_selection_restart = false;
var did_not_decide = false;

var action_images = {
   2: "e/eyes",                          // investigate city
   4: "e/snake",                         // poison city
   5: "e/snake",                         // poison city escape
  20: "e/gold",                          // trade route
  21: "e/marketplace",                   // enter marketplace
  22: "e/camel24",                       // build wonder
  23: "corrupt",                         // bribe unit
  24: "e/bomb",                          // sabotage enemy units
  25: "e/bomb",                          // sabotage enemy units and escape
  26: "orders/capture",                  // capture unit
  27: "orders/build_city_default",
  28: "city_user_row",                   // join city
  29: "e/earth",                         // steal maps
  30: "e/earth",                         // steal maps esc
  31: "e/blueexclamation",               // SUA
  32: "e/blueexclamation",               // SUA "Bombard 2"
  33: "e/blueexclamation",               // SUA "Bombard 3"
  36: "e/nuclearexplosion",
  37: "e/nuclearexplosion",
  38: "e/nuclearexplosion",
  39: "orders/pillage",                  // destroy city
  40: "orders/expel",                    // expel units
  41: "orders/disband_recycle",
  42: "orders/disband_default",
  43: "orders/rehome_default",           // home city
  44: "orders/upgrade",
  45: "orders/paradrop",
  46: "orders/airlift",
  47: "e/redexclamation",                // Attack
  48: "e/boom",
  51: "cities_tab_icon",                 // conquer city
  54: "orders/transform_default",
  55: "orders/forest_remove_default",
  56: "orders/forest_add_default",
  57: "orders/pillage",
  58: "orders/fortify_default",
  59: "orders/road",
  60: "orders/convert",
  61: "orders/fortress",
  62: "orders/mine_default",
  63: "orders/irrigate_default",
  64: "orders/deboard",                   // deboard
  65: "orders/unload",                    // unload transport
  66: "orders/unload",                    // disembark
  68: "orders/board",                     // board
  69: "orders/board",                     // embark
  71: "e/spy",
  75: "e/pollution",
  76: "e/fallout",
  77: "orders/no_orders",
  "wait": "orders/wait",
  "cancel": "orders/cancel_orders",
  "target": "e/target",
  "targetextra": "e/targetextra",
  "autoattack": "e/redexclamations",
  "Airbase": "orders/airbase",
  "Canal, coastal": "orders/canal",
  "Canal, inland": "orders/canal",
  "Canal": "orders/canal",
  "Waterway": "orders/canal",
  "Buoy": "orders/buoy",
  "Hideout": "orders/hideout",
  "Depth": "orders/deepdive",
  "": "orders/hideout",
  "​": "orders/deepdive",           // contains a zero width space to be different from hideout
  "Maglev": "orders/maglev",
  "Naval Base": "orders/navalbase",
  "Oil Well": "orders/oil_well",
  "Quay": "orders/quay",
  "Radar": "orders/radar",
  "Railroad": "orders/railroad_default",
  "Road": "orders/road",
  "Highway": "orders/highway",
  "Sea Bridge": "orders/seabridge",
  "River": "orders/well",
  "Tile Claim": "nation_tab_icon",
  "Watchtower": "orders/watchtower",
  "Fort": "orders/fort",
  "Fortress": "orders/fortress",
  "Fishtrap": "orders/fishtrap",
  "Castle": "orders/castle",
  "Bunker": "orders/bunker",
  "Fallout": "orders/fallout",
  "Irrigation": "orders/irrigate_default",
  "Farmland": "orders/irrigation",
  "Mine": "orders/mine_default",
  "Pollution": "orders/pollution",
  "Vigil": "orders/vigil",
  "Sentry": "orders/sentry",
  "Walls": "e/greatwall"
};

/**********************************************************************//**
  Move the queue of units that need user input forward unless the current
  unit is going to need more input.
**************************************************************************/
function act_sel_queue_may_be_done(actor_unit_id)
{
  if (!is_more_user_input_needed) {
    /* The client isn't waiting for information for any unanswered follow
     * up questions. */

    if (action_selection_restart) {
      /* The action selection dialog was closed but only so it can be
       * redrawn with fresh data. */

      action_selection_restart = false;
    } else {
      /* The action selection process is over, at least for now. */
      action_selection_no_longer_in_progress(actor_unit_id);
    }

    if (did_not_decide) {
      /* The action selection dialog was closed but the player didn't
       * decide what the unit should do. */

      /* Reset so the next action selection dialog does the right thing. */
      did_not_decide = false;
    } else {
      /* An action, or no action at all, was selected. */
      action_decision_clear_want(actor_unit_id);
      action_selection_next_in_focus(actor_unit_id);
    }
  }
}

/**********************************************************************//**
  Move the queue of units that need user input forward since the
  current unit doesn't require the extra input any more.
**************************************************************************/
function act_sel_queue_done(actor_unit_id)
{
  /* Stop waiting. Move on to the next queued unit. */
  is_more_user_input_needed = false;
  act_sel_queue_may_be_done(actor_unit_id);
  action_selection_restart = false;
  did_not_decide = false;
}

/**********************************************************************//**
  Returns true if the unit dismissed an action selection dialog with
  the "Wait" button. This helps us know if we need to re-create the
  pop-up when acting on the same tile again.
**************************************************************************/
function is_unit_act_sel_waiting(punit)
{
  return !unit_has_act_sel_dialog(punit['id'])
         && should_ask_server_for_actions(punit);
}

/**********************************************************************//**
  Returns true if the unit has an open act_sel_dialog.
**************************************************************************/
function unit_has_act_sel_dialog(unit_id)
{
   return active_dialogs.includes("#act_sel_dialog_"+unit_id);
}

/**********************************************************************//**
  Re-opens an action selection dialog only for units who need it
  re-opened because they dismissed the dialog by hitting the Wait
  button.
**************************************************************************/
function act_sel_dialog_might_reopen(punit, ptile) {
    if (is_unit_act_sel_waiting(punit)
      && ptile['index'] == punit['action_decision_tile']) {
    ask_server_for_actions(punit);

    return true;
  }
}

/**************************************************************************
  Returns true iff the given action probability belongs to an action that
  may be possible.
**************************************************************************/
function action_prob_possible(aprob)
{
  return 0 < aprob['max'] || action_prob_not_impl(aprob);
}

/**************************************************************************
  Returns TRUE iff the given action probability represents that support
  for finding this action probability currently is missing from Freeciv.
**************************************************************************/
function action_prob_not_impl(probability)
{
  return probability['min'] == 254
         && probability['max'] == 0;
}

/**************************************************************************
  Returns true unless a situation were a regular move always would be
  impossible is recognized.
**************************************************************************/
function can_actor_unit_move(actor_unit, target_tile)
{
  var tgt_owner_id;

  if (index_to_tile(actor_unit['tile']) == target_tile) {
    /* The unit is already on this tile. */
    return false;
  }

  if (-1 == get_direction_for_step(tiles[actor_unit['tile']],
                                   target_tile)) {
    /* The target tile is too far away. */
    return FALSE;
  }

  for (var i = 0; i < tile_units(target_tile).length; i++) {
    tgt_owner_id = unit_owner(tile_units(target_tile)[i])['playerno'];

    if (tgt_owner_id != unit_owner(actor_unit)['playerno']
        && diplstates[tgt_owner_id] != DS_ALLIANCE
        && diplstates[tgt_owner_id] != DS_TEAM) {
      /* Can't move to a non allied foreign unit's tile. */
      return false;
    }
  }

  if (tile_city(target_tile) != null) {
    tgt_owner_id = city_owner(tile_city(target_tile))['playerno'];

    if (tgt_owner_id == unit_owner(actor_unit)['playerno']) {
      /* This city isn't foreign. */
      return true;
    }

    if (diplstates[tgt_owner_id] == DS_ALLIANCE
        || diplstates[tgt_owner_id] == DS_TEAM) {
      /* This city belongs to an ally. */
      return true;
    }

    return false;
  }

  /* It is better to show the "Keep moving" option one time to much than
   * one time to little. */
  return true;
}

/***************************************************************************
  Returns a part of an action probability in a user readable format.
***************************************************************************/
function format_act_prob_part(prob)
{
  return (prob / 2) + "%";
}
/****************************************************************************
  Format the probability that an action will be a success.
****************************************************************************/
function format_action_probability(probability)
{
  if (probability['min'] == probability['max']) {
    /* This is a regular and simple chance of success. */
    return " (" + format_act_prob_part(probability['max']) + ")";
  } else if (probability['min'] < probability['max']) {
    /* This is a regular chance of success range. */
    return " ([" + format_act_prob_part(probability['min']) + ", "
           + format_act_prob_part(probability['max']) + "])";
  } else {
    /* The remaining action probabilities shouldn't be displayed. */
    return "";
  }
}
/**************************************************************************
  Format the label of an action selection button.
**************************************************************************/
function format_action_label(action_id, action_probabilities)
{
  return actions[action_id]['ui_name'].replace("%s", "").replace("%s",
      format_action_probability(action_probabilities[action_id]));
}

/**************************************************************************
  Format the tooltip of an action selection button.
**************************************************************************/
function format_action_tooltip(act_id, act_probs)
{
  var out;

  if (act_probs[act_id]['min'] == act_probs[act_id]['max']) {
    out = "The probability of success is ";
    out += format_act_prob_part(act_probs[act_id]['max']) + ".";
  } else if (act_probs[act_id]['min'] < act_probs[act_id]['max']) {
    out = "The probability of success is ";
    out += format_act_prob_part(act_probs[act_id]['min']);
    out += ", ";
    out += format_act_prob_part(act_probs[act_id]['max']);
    out += " or somewhere in between.";

    if (act_probs[act_id]['max'] - act_probs[act_id]['min'] > 1) {
      /* The interval is wide enough to not be caused by rounding. It is
       * therefore imprecise because the player doesn't have enough
       * information. */
      out += " (This is the most precise interval I can calculate ";
      out += "given the information our nation has access to.)";
    }
  }

  return out;
}

/**************************************************************************
  Returns the function to run when an action is selected.
**************************************************************************/
function act_sel_click_function(parent_id,
                                actor_unit_id, tgt_id, sub_tgt_id,
                                action_id, action_probabilities)
{
  switch (action_id) {
  case ACTION_SPY_TARGETED_STEAL_TECH:
  case ACTION_SPY_TARGETED_STEAL_TECH_ESC:
    return function() {
      popup_steal_tech_selection_dialog(units[actor_unit_id],
                                        cities[tgt_id],
                                        action_probabilities,
                                        action_id);
      is_more_user_input_needed = true;
      remove_action_selection_dialog(parent_id, actor_unit_id, true);
    };
  case ACTION_SPY_TARGETED_SABOTAGE_CITY:
  case ACTION_SPY_TARGETED_SABOTAGE_CITY_ESC:
  case ACTION_SPY_INCITE_CITY:
  case ACTION_SPY_INCITE_CITY_ESC:
  case ACTION_SPY_BRIBE_UNIT:
  case ACTION_UPGRADE_UNIT:
    return function() {
      var packet = {
        "pid"         : packet_unit_action_query,
        "actor_id"    : actor_unit_id,
        "target_id"   : tgt_id,
        "action_type" : action_id,
        "disturb_player" : true
      };
      send_request(JSON.stringify(packet));
      is_more_user_input_needed = true;
      /* Siege Rams do targeted sabotage but do NOT select their target:
         Only City Walls are the only allowed target. We must set
         is_more_user_input_needed = false to avoid the UI getting stuck */
      if (action_id == ACTION_SPY_TARGETED_SABOTAGE_CITY_ESC
          && client_rules_flag[CRF_MP2_C]
          && unit_type(units[actor_unit_id]).name == "Siege Ram") {
            is_more_user_input_needed = false;
      }
      remove_action_selection_dialog(parent_id, actor_unit_id, true);
    };
  case ACTION_FOUND_CITY:
    return function() {
      /* Ask the server to suggest a city name. */
      var packet = {
        "pid"     : packet_city_name_suggestion_req,
        "unit_id" : actor_unit_id
      };
      send_request(JSON.stringify(packet));
      is_more_user_input_needed = true;
      remove_action_selection_dialog(parent_id, actor_unit_id, true);
    };
  /* Actions which "consume" the unit's attention, so it will advance
   * focus even if there are moves left: */
  case ACTION_FORTIFY:
  case ACTION_ROAD:
  case ACTION_BASE:
  case ACTION_MINE:
  case ACTION_IRRIGATE:
  case ACTION_CULTIVATE:
  case ACTION_PLANT:
  case ACTION_TRANSFORM_TERRAIN:
  case ACTION_CONVERT:
    return function() {
      request_unit_do_action(action_id, actor_unit_id, tgt_id, sub_tgt_id);
      remove_action_selection_dialog(parent_id, actor_unit_id);
      // Extra time to read witness successful action, since pop-up removal is distracting:
      //FIXME: if there are two selected units getting same command eg.,Fortify, it doesn't advance
      setTimeout(update_unit_focus, update_focus_delay * 1.2);
    };
  /* Pillage requires extra processing in cases the unit will iPillage random targets */
  case ACTION_PILLAGE:
    return function() {
      let extra_stats = unit_get_extra_stats(units[actor_unit_id]);
      /* for random target iPillage, unit won't hit multiple targets if sent server's suggested tgt_id, sub_tgt_id, etc. */
      if (extra_stats.iPillage && extra_stats.iPillage_random_targets) {
        key_unit_pillage();
      } else {
        request_unit_do_action(action_id, actor_unit_id, tgt_id, sub_tgt_id);
      }
      remove_action_selection_dialog(parent_id, actor_unit_id);
      // Extra time to read witness successful action, since pop-up removal is distracting:
      //FIXME: if there are two selected units getting same command, it doesn't advance
      setTimeout(update_unit_focus, update_focus_delay * 1.2);
    }
  case ACTION_ATTACK:
    return function() {
      request_unit_do_action(action_id, actor_unit_id, tgt_id, sub_tgt_id);
      // unit lost hp, mp, or died or promoted after attack, so update it:
      /* REMOVAL CANDIDATE: this may no longer be necessary since handle_unit_packet_common()
         updates active unit dialog whenever a selected unit received new unit info packet */
      setTimeout(update_game_unit_panel, update_focus_delay);
      remove_action_selection_dialog(parent_id, actor_unit_id);
    };
  default:
    return function() {
      request_unit_do_action(action_id, actor_unit_id, tgt_id, sub_tgt_id);
      remove_action_selection_dialog(parent_id, actor_unit_id);
    };
  }
}


/**************************************************************************
  Puts an icon into a button image.
**************************************************************************/
function render_action_image_into_button(text, action_id, sub_tgt, order, activity)
{
  //console.log("Render action %d:%s sub_tgt=%s",action_id,text,sub_tgt)
  if (action_images[action_id]) {
    var key = action_id;
    //console.log("  Key starts at %s",key);


    // override normal button image with sub_target image (e.g., Build Base >> Build Fort)
    if (sub_tgt !== undefined && sub_tgt > -1 && extras[sub_tgt]) {
      //console.log("    sub_tgt not undefined etc.");
      if (action_id == ACTION_ROAD || action_id == ACTION_BASE) {
        //console.log("    action_id is ROAD or BASE");
        if (action_images[extras[sub_tgt]['rule_name']]) {
          key = extras[sub_tgt]['rule_name'];
          //console.log("      Reassigned key:%s",key);
          if (key == "Depth") text = "Dive Deep";
          else if (key=="Hideout") text = "Build Hideout";
        }
      }
    };

    /* ACTION_COUNT could mean 1. NO ACTION, or, 2. a new ACTIVITY instead
       of an ACTION performance: */
    if (key == ACTION_COUNT) {
      if (order && order == ORDER_ACTIVITY && activity) {
        switch (activity) {
          case ACTIVITY_SENTRY:
            key = "Sentry";
            break;
          case ACTIVITY_FALLOUT:
            key = "Fallout";
            break;
          case ACTIVITY_POLLUTION:
            key = "Pollution";
            break;
          case ACTIVITY_VIGIL:
            key = "Vigil";
            break;
        }
      }
    }

    text = "<img class='act_sel_order_image' "
        + "src='/images/" + action_images[key] + ".png'" + ">&emsp;"
        + "<span style='position:relative; top:1px'>"+text+"</span>";
  }
  //console.log("text returns as %s\n",text);

  return text;
}

/**************************************************************************
  Create a button that selects an action.

  Needed because of JavaScript's scoping rules.
**************************************************************************/
function create_act_sel_button(parent_id,
                               actor_unit_id, tgt_id, sub_tgt_id,
                               action_id, action_probabilities)
{
  // Create button_text
  var button_text = format_action_label(action_id, action_probabilities);
  var sub_target_override = -1;  // code to not override

  // Fix inaccurate "Conquer City" to "Raze City" for size 1 city:
  if (button_text.includes("Conquer")) {
    var pcity = cities[tgt_id];
    if (pcity && pcity['size']==1
        && unit_has_class_flag(units[actor_unit_id], UCF_KILLCITIZEN)) {
      button_text = button_text.replace("Conquer", "Raze");
    }
  }

  if (action_id == ACTION_BASE && button_text.includes("Base")) {
    //console.log("\nmaking target=%d subtarget=%d",tgt_id, sub_tgt_id);
    button_text = button_text.replace("Base", extras[sub_tgt_id]['name'])
    sub_target_override = sub_tgt_id;
  } else if (action_id == ACTION_ROAD && button_text.includes("Road")) {
    //console.log("\nmaking target=%d subtarget=%d",tgt_id, sub_tgt_id);
    button_text = button_text.replace("Road", extras[sub_tgt_id]['name'])
    sub_target_override = sub_tgt_id;
  } else if (action_id == ACTION_SPY_BRIBE_UNIT) {
    if (unit_type(units[actor_unit_id])['name'] == "Patriarch")
      button_text = button_text.replace("Bribe Enemy", "Convert");
  }

  if (action_images[action_id]) {
    button_text = render_action_image_into_button(button_text, action_id, sub_target_override);
    button_text = button_text.replace("Build Dive Deep","Dive Deep");
  }
  /* Create the initial button with this action */
  var button = {
    id      : "act_sel_" + action_id + "_" + actor_unit_id,
    "class" : 'act_sel_button tt',
    html    : button_text,
    title   : format_action_tooltip(action_id,
                                    action_probabilities),
    click   : act_sel_click_function(parent_id,
                                     actor_unit_id, tgt_id, sub_tgt_id,
                                     action_id, action_probabilities)
  };

  /* The button is ready. */
  return button;
}

/****************************************************************************
  Ask the player to select an action.
****************************************************************************/
function popup_action_selection(actor_unit, action_probabilities,
                                target_tile, target_extra,
                                target_unit, target_city)
{
  // reset dialog page.
  var id = "#act_sel_dialog_" + actor_unit['id'];
  var focus_button = null; // button to auto focus on when dialog created
  remove_active_dialog(id);
  $("<div id='act_sel_dialog_" + actor_unit['id'] + "'></div>").appendTo("div#game_page");

  if (action_selection_in_progress_for != IDENTITY_NUMBER_ZERO
      && action_selection_in_progress_for != actor_unit['id']) {
    console.log("Looks like unit %d has an action selection dialog open"
                + " but a dialog for unit %d is about to be opened.",
                action_selection_in_progress_for, actor_unit['id']);
    console.log("Closing the action selection dialog for unit %d",
                action_selection_in_progress_for);
    action_selection_close();
  }

  var actor_homecity = cities[actor_unit['homecity']];

  var buttons = [];

  var dhtml = "";
  var dialog_width = "390px";  // can be adjusted for some types of pop-up

  if (target_city != null) {
    dhtml += "Your " + unit_types[actor_unit['type']]['name'];

    /* Some units don't have a home city. */
    if (actor_homecity != null) {
      dhtml += " from " + decodeURIComponent(actor_homecity['name']);
    }
    dhtml += (is_word_plural(unit_types[actor_unit['type']]['name'])
              ? " have " : " has " );
    dhtml += "arrived at " + decodeURIComponent(target_city['name'])
             + ". What is your command?";
  } else if (target_unit != null) {
    dhtml += "Your " + unit_types[actor_unit['type']]['name']
          + (is_word_plural(unit_types[actor_unit['type']]['name'])
              ? " are " : " is " )
             + "ready to act against the "
             + nations[unit_owner(target_unit)['nation']]['adjective']
             + " " + unit_types[target_unit['type']]['name'] + ".";
  } else {
    dhtml += "Your " + unit_types[actor_unit['type']]['name']
             + (is_word_plural(unit_types[actor_unit['type']]['name'])
                ? " are " : " is " ) + "waiting for your command.";
  }

  $(id).html(dhtml);

  /* Show a button for each enabled action. The buttons are sorted by
   * target kind first and then by action id number. */
  for (var tgt_kind = ATK_CITY; tgt_kind < ATK_COUNT; tgt_kind++) {
    var tgt_id = -1;
    var sub_tgt_id = -1;

    switch (tgt_kind) {
    case ATK_CITY:
      if (target_city != null) {
        tgt_id = target_city['id'];
      }
      break;
    case ATK_UNIT:
      if (target_unit != null) {
        tgt_id = target_unit['id'];
      }
      break;
    case ATK_UNITS:
      if (target_tile != null) {
        tgt_id = target_tile['index'];
      }
      break;
    case ATK_TILE:
      if (target_tile != null) {
        tgt_id = target_tile['index'];
      }
      if (target_extra != null) {
        sub_tgt_id = target_extra['id'];
      }
      break;
    case ATK_SELF:
      if (actor_unit != null) {
        tgt_id = actor_unit['id'];
      }
      break;
    default:
      console.log("Unsupported action target kind " + tgt_kind);
      break;
    }

    for (var action_id = 0; action_id < ACTION_COUNT; action_id++) {
      if (actions[action_id]['tgt_kind'] == tgt_kind
          && action_prob_possible(
              action_probabilities[action_id])) {
        //---------------------------------------------------------------------------------
        // Capture is illegal on FCW server IFF:
        // Longturn && idle nation && human && unit isn't trespassing on player's territory.
        // Therefore, don't show button and give a courtesy message about the rule.
        if (action_id == ACTION_CAPTURE_UNITS && is_longturn() ) {
          var sunits = tile_units(tiles[tgt_id]);
          if (sunits && sunits.length==1) {
            var player_id = sunits[0].owner;
            // Disallow if idle and human:
            if (players[player_id]['nturns_idle'] > 1 && !(players[player_id]['flags'].isSet(PLRF_AI))) {
              // Disallow if idler is NOT trespassing on player's own territory:
              if (tiles[tgt_id].owner != client.conn.playing.playerno) {
                add_client_message("Info: Capture is unavailable on idlers except in your homeland.");
                continue; // don't add button for illegal action
              }
            }
          }
        }
        //-------------------------------------------------------------------------------------
        /* TODO: Remove this code when rulesets get actionenablers defined for all complex
           (de)Board and (un)Load rules. See "(un)Load (de)Board (dis)Embark rules.txt" in
           ruleset dir. For now, these buttons are disallowed to prevent their appearance
           in cases where it's disallowed in a ruleset. */
        if (action_id == ACTION_TRANSPORT_BOARD) {
          if (!unit_could_possibly_load(actor_unit,
                                        unit_type(actor_unit),
                                        unit_type(target_unit),
                                        get_unit_class(target_unit))) {
            continue;
          }
        }
        if (action_id == ACTION_TRANSPORT_DEBOARD) {
          if (!unit_can_deboard(actor_unit))
            continue;
        }
        if (action_id == ACTION_TRANSPORT_UNLOAD) {
          if (!unit_can_deboard(target_unit))
          continue;
        }
        //  if (action_id == ACTION_TRANSPORT_LOAD) {}  action not backported yet
        //------------------------------------------------------------------------------------

        if (action_id==ACTION_ATTACK || action_id==ACTION_CONQUER_CITY) {
          // Attack and Conquer should always be first on menu to avoid
          // regrettable misclick issues...
          focus_button = "act_sel_"+action_id+"_"+actor_unit['id'];
          buttons.unshift(create_act_sel_button(id, actor_unit['id'],
            tgt_id, sub_tgt_id, action_id, action_probabilities));
        } else {
          buttons.push(create_act_sel_button(id, actor_unit['id'],
            tgt_id, sub_tgt_id, action_id, action_probabilities));
        }
      }
    }
  }

  if (can_actor_unit_move(actor_unit, target_tile)) {
    buttons.push({
        id      : "act_sel_move" + actor_unit['id'],
        "class" : 'act_sel_button',
        html    : 'Keep moving',
        click   : function() {
          var dir = get_direction_for_step(tiles[actor_unit['tile']],
                                           target_tile);
          var order = {
            "order"      : ORDER_MOVE,
            "dir"        : dir,
            "activity"   : ACTIVITY_LAST,
            "sub_target" : 0,
            "action"     : ACTION_COUNT
          };

          var packet = {
            "pid"       : packet_unit_orders,
            "unit_id"   : actor_unit['id'],
            "src_tile"  : actor_unit['tile'],
            "length"    : 1,
            "repeat"    : false,
            "vigilant"  : false,
            "orders"    : [order],
            "dest_tile" : target_tile['index']
          };

          if (dir == -1) {
            /* Non adjacent target tile? */
            console.log("Action selection move: bad target tile");
          } else {
            send_request(JSON.stringify(packet));
          }
          remove_action_selection_dialog(id, actor_unit['id']);
        } });
  }

  if (target_unit != null
      && tile_units(target_tile).length > 1) {
    buttons.push({
        id      : "act_sel_tgt_unit_switch" + actor_unit['id'],
        "class" : 'act_sel_button',
        html    : render_action_image_into_button('Change unit target', 'target'),
        click   : function() {
          select_tgt_unit(actor_unit,
                          target_tile, tile_units(target_tile));

          action_selection_restart = true;
          remove_action_selection_dialog(id, actor_unit['id'], true);
        } });
  }

  if (target_extra != null) {
    buttons.push({
        id      : "act_sel_tgt_extra_switch" + actor_unit['id'],
        "class" : 'act_sel_button',
        html    : render_action_image_into_button('Tile target', 'targetextra'),
        click   : function() {
          select_tgt_extra(actor_unit, target_unit, target_tile,
                           list_potential_target_extras(actor_unit,
                                                        target_tile));

          action_selection_restart = true;
          remove_action_selection_dialog(id, actor_unit['id'], true);
        } });
  }

  /* Special-case handling for auto-attack. */
  if (action_prob_possible(action_probabilities[ACTION_ATTACK])) {
        if (!auto_attack) {
          var button = {
            id      : "act_sel_" + ACTION_ATTACK + "_" + actor_unit['id'],
            "class" : 'act_sel_button tt',
            html    : render_action_image_into_button("Auto attack from now on!", "autoattack"),
            title   : "Attack without showing this attack dialog in the future",
            click   : function() {
                request_unit_do_action(ACTION_ATTACK,
                  actor_unit['id'], target_tile['index']);
                setTimeout(update_game_unit_panel, update_focus_delay);
                auto_attack = true;
                remove_action_selection_dialog(id, actor_unit['id']);
            }
          };
          buttons.push(button);
        }
  }

  buttons.push({
      id      : "act_sel_wait" + actor_unit['id'],
      "class" : 'act_sel_button',
      html    :  render_action_image_into_button("Wait", "wait"),
      click   : function() {
        did_not_decide = true;
        remove_action_selection_dialog(id, actor_unit['id'], true);
      } });

  buttons.push({
      id      : "act_sel_cancel" + actor_unit['id'],
      "class" : 'act_sel_button',
      html    : render_action_image_into_button('Cancel (<b>W</b>)', 'cancel'),
      click   : function() {
        remove_action_selection_dialog(id, actor_unit['id']);
      } });

  $(id).attr("title",
             "Action for " + unit_types[actor_unit['type']]['name']
             + ":");

  // Dialog UI: Populate richer text for rulesets with features.
  var SP = client_rules_flag[CRF_SURGICAL_PILLAGE];
  var SUA = client_rules_flag[CRF_SPECIAL_UNIT_ATTACKS];

  // This section does override names for iPillage:
  if (SP) {
    if (unit_can_iPillage(actor_unit)) {
      for (button_id in buttons) {
        if (buttons[button_id].html.includes("Pillage (100%)")) {
          let extra_stats = unit_get_extra_stats(actor_unit);
          var odds = (extra_stats.iPillage_odds + actor_unit['veteran'] * 5);
          buttons[button_id].html = buttons[button_id].html.replace("Pillage (100%)", unit_get_pillage_name(actor_unit)
            + " (" + odds + "%)");
          buttons[button_id].title = ""+odds+"% iPillage odds\n"+extra_stats.iPillage_moves+" move-points cost";
          if (extra_stats.iPillage_random_targets) {
            buttons[button_id].title += "\n"+extra_stats.iPillage_random_targets+" random targets destroyed";
          }
        }
      }
    }
  }
  var ptype = unit_type(actor_unit);
  // THIS SECTION DOES OVERRIDE NAMES for special unit actions:
  if (SUA) {
    switch (ptype['rule_name']) {
      case "Siege Ram":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                  + "Combat:                4 rounds\n"
                                  + "Targets:                 ALL\n"
                                  + "Attack bonus:        8.75x\n"
                                  + "Move cost:            1 move\n"
                                  + "Min. moves:          1 1/9 moves\n"
                                  + "Casualties:             --\n"
                                  + "\n\"Damage\" to the Fortress is represented by HP loss to all\n"
                                  + "units (up to 40%/turn): emulating damage reduction to the\n"
                                  + "Fortress defense bonus. HP healing of units (up to 40%/turn),\n"
                                  + "emulates resistance and repairing Fortress damage over the\n"
                                  + "course of a long siege."
        }
        else if (buttons[button_id].html.includes("Targeted Sabotage")) {
          buttons[button_id].html = "Attack City Walls ([25%, 50%])"
          buttons[button_id].title = "Odds of survival:  50%  (halved if city is capital)\n"
                                  + "Targets:                 City Walls\n"
                                  + "Move cost:            1/9 move\n"
                                  + "Min. moves:          1 move\n"
                                  + "Attacks the City Walls, resulting in destruction\n"
                                  + "of the City Walls or the loss of the Siege Ram."
        }
      } break;
      case "Ballista":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                  + "Combat:                5 rounds\n"
                                  + "Targets:                 2 units\n"
                                  + "Move cost:            2 moves\n"
                                  + "Min. moves:          hasn't moved\n"
                                  + "Max. casualties:     2\n"
                                  + "\nPoor accuracy but deadly firepower is represented by\n"
                                  + "5 rounds at 5x firepower vs up to 2 units. Targets\n"
                                  + "will either be missed, badly damaged, or killed."
        }
      } break;
      case "Phalanx":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                  + "Combat:                3 rounds\n"
                                  + "Targets:                 1 unit\n"
                                  + "Move cost:            5/9 move\n"
                                  + "Min. moves:          fortified OR hasn't moved\n"
                                  + "Casualties:             --\n"
                                  + "\nA 3 round rumble against one unit on the target tile\n"
                                  + "represents the Phalanx safely pushing from a held\n"
                                  + "position vs. a weak defender who comes too close."
        }
      } break;
      case "Archers":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
           buttons[button_id].title = "Odds of survival:  100%\n"
                                    + "Combat:                2 rounds\n"
                                    + "Targets:                 7 units\n"
                                    + "Move cost:            1 5/9 moves\n"
                                    + "Casualties:             --\n"
                                    + "\n2 rounds of arrows against up to 7 units,\n"
                                    + "represents Archers raining arrows from a\n"
                                    + "safe distance over an adjacent force."
        }
      } break;
      case "Legion":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                  + "Attack bonus:        2x\n"
                                  + "Combat:                1 round\n"
                                  + "Targets:                 2 units\n"
                                  + "Move cost:            1 move\n"
                                  + "Max. casualties:     2\n"
                                  + "\nPila easily disable shields in the enemy front line, represented by\n"
                                  + "1hp damage caused to up to 2 units. This helps the odds of success\n"
                                  + "of follow-up attack if done before the units heal (\"fix their shields.\")"
        }
      } break;
      case "Fanatics":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                    + "Combat:                3 rounds\n"
                                    + "Targets:                 4 units\n"
                                    + "Move cost:            1 5/9 moves\n"
                                    + "Casualties:             --\n"
                                    + "\nFanatics opportunistically damage and degrade foreign occupants\n"
                                    + "of their native land, for 3 rounds of combat on up to 4 foreign\n"
                                    + "occupants of a city or tile."

        }
      } break;
      case "Zealots":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                    + "Combat:                3 rounds\n"
                                    + "Targets:                 4 units\n"
                                    + "Move cost:            1 5/9 moves\n"
                                    + "Casualties:             --\n"
                                    + "\Zealots opportunistically damage and degrade foreign occupants\n"
                                    + "of their native land, for 3 rounds of combat on up to 4 foreign\n"
                                    + "occupants of a city or tile."

        }
      } break;
      case "Marines":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                  + "Combat:                3 rounds\n"
                                  + "Targets:                 4 units\n"
                                  + "Move cost:            1 5/9 moves\n"
                                  + "Max. casualties:     1\n"
                                  + "\nHardened Marines use agility/mobility over terrain features for hit-and-run\n"
                                  + "ballistic attacks: 3 rounds of combat on up to 4 occupants of a tile."
        }
      } break;
      case "Catapult":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                  + "Combat:                4 rounds\n"
                                  + "Targets:                 1 unit\n"
                                  + "Move cost:            2 moves\n"
                                  + "Min. moves:          hasn't moved\n"
                                  + "Max. casualties:     1\n"
                                  + "\nHurls rocks on 1 unit on the target tile for\n"
                                  + "4 rounds. Can't be done to Fortress or City."
        }
      } break;
      case "Cannon":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                  + "Combat:                5 rounds\n"
                                  + "Targets:                 2 units\n"
                                  + "Move cost:            2 moves\n"
                                  + "Min. moves:          hasn't moved\n"
                                  + "Max. casualties:     1\n"
                                  + "\nBombards up to 2 units on the target tile for\n"
                                  + "5 rounds. Can't be done to Fortress or City."
        }
      } break;
      case "Artillery":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                  + "Combat:                6 rounds\n"
                                  + "Targets:                 3 units\n"
                                  + "Move cost:            2 moves\n"
                                  + "Min. moves:          hasn't moved\n"
                                  + "Max. casualties:     1\n"
                                  + "\nBombards up to 3 units on the target tile for\n"
                                  + "6 rounds. Can't be done to Fortress or City."
        }
      } break;
      case "Howitzer":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                  + "Combat:                7 rounds\n"
                                  + "Targets:                 4 units\n"
                                  + "Move cost:            4 moves\n"
                                  + "Min. moves:          hasn't moved\n"
                                  + "Max. casualties:     1\n"
                                  + "\nBombards up to 4 units on the target tile for\n"
                                  + "7 rounds. Can't be done to Fortress or City."
        }
      } break;
      case "Battleship":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                  + "Combat:                3 rounds\n"
                                  + "Targets:                 4 units\n"
                                  + "Move cost:            5 moves\n"
                                  + "Max. casualties:     1\n"
                                  + "\nUses the range advantage of massive large guns to safely\n"
                                  + "shell and degrade up to 4 distant targets on a tile or city."
        }
      } break;
      case "Zeppelin":  for (button_id in buttons) {
        if (buttons[button_id].html.includes("Special Attack")) {
          buttons[button_id].html = buttons[button_id].html.replace("Special Attack", utype_get_bombard_name(ptype))
          buttons[button_id].title = "Odds of survival:  100%\n"
                                  + "Combat:                4 rounds\n"
                                  + "Targets:                 2 units\n"
                                  + "Move cost:            2 moves\n"
                                  + "Max. casualties:     1\n"
                                  + "\nDrops shrapnel bombs in the vicinity of enemies,\n"
                                  + "affecting up to 2 units and possibly killing one."
        }
      } break;
    }
  }
  //--------------------------------------------------------------------

  $(id).dialog({
      bgiframe: true,
     // modal: true,   // non-modal: allows player to see and witness large multi-unit battle with many dialogs
      dialogClass: "act_sel_dialog",
      overflow: "visible",
      width: is_small_screen() ? "99%" : dialog_width,
      buttons: buttons });

  $(id).dialog('open');
  is_more_user_input_needed = false;
  $(id).dialog('widget').position({my:"center top", at:"center top", of:window})
  dialog_register(id, actor_unit['id'], true);
  $(id).parent().css("overflow", "visible");
  if (focus_button) $("#"+focus_button).focus(); // default focus to attack button
  $(".tt").tooltip({ tooltipClass: "tt_tiny", position: { my:"left top", at: "right+5 top"},
    show: { delay:700, effect:"none", duration: 0 }, hide: {delay:70, effect:"none", duration: 0} });
}

/**************************************************************************
  Show the player the price of bribing the unit and, if bribing is
  possible, allow him to order it done.
**************************************************************************/
function popup_bribe_dialog(actor_unit, target_unit, cost, act_id)
{
  var bribe_possible = false;
  var dhtml = "";
  var id = "#bribe_unit_dialog_" + actor_unit['id'];

  /* Reset dialog page. */
  remove_active_dialog(id);

  $("<div id='bribe_unit_dialog_" + actor_unit['id'] + "'></div>")
      .appendTo("div#game_page");

  dhtml += "Treasury contains " + unit_owner(actor_unit)['gold'] + " gold. ";

  dhtml += "The cost of "
            + (unit_type(actor_unit)['name'] == "Patriarch" ? "converting " : "bribing ")
            + nations[unit_owner(target_unit)['nation']]['adjective']
            + " " + unit_types[target_unit['type']]['name']
            + " is " + cost + ". ";

  bribe_possible = cost <= unit_owner(actor_unit)['gold'];

  if (!bribe_possible) {
    dhtml += "Traitors Demand Too Much!";
    dhtml += "<br>";
  }

  $(id).html(dhtml);

  var close_button = {	"Close (𝗪)": function() {
                        remove_action_selection_dialog(id, actor_unit['id']); }
                     };
  var bribe_close_button = {	" Cancel (𝗪)": function() { remove_action_selection_dialog(id, actor_unit['id']); },
  				"Do it!": function() {
      request_unit_do_action(act_id, actor_unit['id'], target_unit['id']);
      remove_action_selection_dialog(id, actor_unit['id']);
    }
  };

  $(id).attr("title", "Bribery Action");

  $(id).dialog({bgiframe: true,
                modal: true,
                buttons: (bribe_possible ? bribe_close_button : close_button),
                height: "auto",
                width: "auto"});

  $(id).dialog('open');
  $(id).dialog('widget').position({my:"center top", at:"center top", of:window})
  dialog_register(id, actor_unit['id']);
}

/**************************************************************************
  Show the player the price of inviting the city and, if inciting is
  possible, allow him to order it done.
**************************************************************************/
function popup_incite_dialog(actor_unit, target_city, cost, act_id)
{
  var incite_possible;
  var id;
  var dhtml;

  id = "#incite_city_dialog_" + actor_unit['id'];

  /* Reset dialog page. */
  remove_active_dialog(id);

  $("<div id='incite_city_dialog_" + actor_unit['id'] + "'></div>")
      .appendTo("div#game_page");

  dhtml = "";

  dhtml += "Treasury contains " + unit_owner(actor_unit)['gold'] + " gold.";
  dhtml += " ";
  dhtml += "The price of inciting "
           + decodeURIComponent(target_city['name'])
           + " is " + cost + ".";

  incite_possible = cost != INCITE_IMPOSSIBLE_COST
                    && cost <= unit_owner(actor_unit)['gold'];

  if (!incite_possible) {
    dhtml += " ";
    dhtml += "Traitors Demand Too Much!";
    dhtml += "<br>";
  }

  $(id).html(dhtml);

  var close_button = {         'Close (𝗪)':    function() {remove_action_selection_dialog(id, actor_unit['id']);}};
  var incite_close_buttons = { ' Cancel (𝗪)': function() {remove_action_selection_dialog(id, actor_unit['id']);},
                               'Do it!': function() {
                                          request_unit_do_action(act_id, actor_unit['id'], target_city['id']);
                                          remove_action_selection_dialog(id, actor_unit['id']);
                               }
                             };

  $(id).attr("title", "Incite Revolt");

  $(id).dialog({bgiframe: true,
                modal: true,
                buttons: (incite_possible ? incite_close_buttons : close_button),
                height: "auto",
                width: "auto"});

  $(id).dialog('open');
  $(id).dialog('widget').position({my:"center top", at:"center top", of:window})
  dialog_register(id, actor_unit['id']);
}

/**************************************************************************
  Show the player the price of upgrading the unit and, if upgrading is
  affordable, allow him to order it done.
**************************************************************************/
function popup_unit_upgrade_dlg(actor_unit, target_city, cost, act_id)
{
  var upgrade_possible;
  var id;
  var dhtml;

  id = "#upgrade_unit_dialog_" + actor_unit['id'];

  /* Reset dialog page. */
  remove_active_dialog(id);

  $("<div id='upgrade_unit_dialog_" + actor_unit['id'] + "'></div>")
      .appendTo("div#game_page");

  dhtml = "";

  dhtml += "Treasury contains " + unit_owner(actor_unit)['gold'] + " gold.";
  dhtml += " ";
  dhtml += "The price of upgrading our "
           + unit_types[actor_unit['type']]['name']
           + " is " + cost + ".";

  upgrade_possible = cost <= unit_owner(actor_unit)['gold'];

  $(id).html(dhtml);

  var close_button = {          'Close (𝗪)':    function() {remove_action_selection_dialog(id, actor_unit['id']);}};
  var upgrade_close_buttons = { ' Cancel (𝗪)': function() {remove_action_selection_dialog(id, actor_unit['id']);},
                                'Do it!': function() {
                                  request_unit_do_action(act_id, actor_unit['id'], target_city['id']);
                                  remove_action_selection_dialog(id, actor_unit['id']);
                                }
                             };

  $(id).attr("title", "Unit upgrade");

  $(id).dialog({bgiframe: true,
                modal: true,
                buttons: (upgrade_possible ? upgrade_close_buttons
                                           : close_button),
                height: "auto",
                width: "auto"});

  $(id).dialog('open');
  $(id).dialog('widget').position({my:"center top", at:"center top", of:window})
  dialog_register(id, actor_unit['id']);
}

/**************************************************************************
  Create a button that steals a tech.

  Needed because of JavaScript's scoping rules.
**************************************************************************/
function create_steal_tech_button(parent_id, tech,
                                  actor_id, city_id, action_id)
{
  /* Create the initial button with this tech */
  var button = {
    html : tech['name'],
    "class": "tt",
    click : function() {

      request_unit_do_action(action_id, actor_id, city_id, tech['id']);
      send_request(JSON.stringify(packet));
      remove_action_selection_dialog("#"+parent_id, actor_id);
    }
  };

  /* The button is ready. */
  return button;
}

/**************************************************************************
  Select what tech to steal when doing targeted tech theft.
**************************************************************************/
function popup_steal_tech_selection_dialog(actor_unit, target_city,
                                           act_probs, action_id)
{
  var id = "stealtech_dialog_" + actor_unit['id'];
  var buttons = [];
  var untargeted_action_id = ACTION_COUNT;

  /* Reset dialog page. */
  remove_active_dialog("#"+id);

  $("<div id='" + id + "'></div>").appendTo("div#game_page");

  /* Set dialog title */
  $("#" + id).attr("title", "Pick Tech to Steal");

  /* List the alternatives */
  for (var tech_id in techs) {
    /* JavaScript for each iterates over keys. */
    var tech = techs[tech_id];

    /* Actor and target player tech known state. */
    var act_kn = player_invention_state(client.conn.playing, tech_id);
    var tgt_kn = player_invention_state(city_owner(target_city), tech_id);

    /* Can steal a tech if the target player knows it and the actor player
     * has the pre requirements. Some rulesets allows the player to steal
     * techs the player don't know the prereqs of. */
    if ((tgt_kn == TECH_KNOWN)
        && ((act_kn == TECH_PREREQS_KNOWN)
            || (game_info['tech_steal_allow_holes']
                && (act_kn == TECH_UNKNOWN)))) {
      /* Add a button for stealing this tech to the dialog. */
      buttons.push(create_steal_tech_button(id, tech,
                                            actor_unit['id'],
                                            target_city['id'],
                                            action_id));
    }
  }

  /* The player may change his mind after selecting targeted tech theft and
   * go for the untargeted version after concluding that no listed tech is
   * worth the extra risk. */
  if (action_id == ACTION_SPY_TARGETED_STEAL_TECH_ESC) {
    untargeted_action_id = ACTION_SPY_STEAL_TECH_ESC;
  } else if (action_id == ACTION_SPY_TARGETED_STEAL_TECH) {
    untargeted_action_id = ACTION_SPY_STEAL_TECH;
  }

  if (untargeted_action_id != ACTION_COUNT
      && action_prob_possible(
           act_probs[untargeted_action_id])) {
    /* Untargeted tech theft may be legal. Add it as an alternative. */
    buttons.push({
                   html  : "At " + unit_types[actor_unit['type']]['name']
                           + "'s Discretion",
                   click : function() {
                     request_unit_do_action(untargeted_action_id,
                       actor_unit['id'], target_city['id']);
                     remove_action_selection_dialog("#"+id, actor_unit['id']);
                   }
                 });
  }

  /* Allow the user to cancel. */
  buttons.push({
                 html : 'Cancel (<b>W</b>)',
                 click : function() {
                  remove_action_selection_dialog("#"+id, actor_unit['id']);
                 }
               });

  /* Create the dialog. */
  $("#" + id).dialog({
                       modal: true,
                       buttons: buttons,
                       width: "90%"});

  /* Show the dialog. */
  $("#" + id).dialog('open');
  $("#" + id).dialog('widget').position({my:"center top", at:"center top", of:window})
  dialog_register("#"+id, actor_unit['id']);
}

/**************************************************************************
  Create a button that orders a spy to try to sabotage an improvement.

  Needed because of JavaScript's scoping rules.
**************************************************************************/
function create_sabotage_impr_button(improvement, parent_id,
                                     actor_id, city_id, act_id)
{
  /* Create the initial button with this tech */
  return {
    html : improvement['name'],
    click : function() {
        request_unit_do_action(act_id, actor_id, city_id,
                               improvement['id']);
        remove_action_selection_dialog("#" + parent_id, actor_id);
    }
  };
}

/**************************************************************************
  Select what improvement to sabotage when doing targeted sabotage city.
**************************************************************************/
function popup_sabotage_dialog(actor_unit, target_city, city_imprs, act_id)
{
  var id = "sabotage_impr_dialog_" + actor_unit['id'];
  var buttons = [];

            // Siege Ram used for Wall sabotage: highjack for better presentation****
            var battering_event = false;
            if (client_rules_flag[CRF_SIEGE_RAM] == true) {
              var punit = units[actor_unit['id']];
              var ptype = unit_type(punit);
              if (ptype['name'] == "Siege Ram") battering_event = true;
            } //**********************************************************************


  /* Reset dialog page. */
  remove_active_dialog("#" + id);
  $("<div id='" + id + "'></div>").appendTo("div#game_page");

  /* Set dialog title */
  $("#" + id).attr("title", "Pick Sabotage Target");

  /* List the alternatives */
  for (var i = 0; i < ruleset_control['num_impr_types']; i++) {
    var improvement = improvements[i];

              // Battering Rams can only select City Walls *********************************
              if (battering_event) {
                if (improvement['name'] != "City Walls") continue;
                //We got here if we're at City Walls, see if it's present now:
                if (city_imprs.isSet(i) && improvement['sabotage'] > 0) {
                  // City walls present! No need to make a button: we know they'd press it.
                  // Instead, just automate what would happen if they did press the button:
                    request_unit_do_action(act_id,
                                           actor_unit['id'], target_city['id'],
                                           improvement['id']);

                  // We're done. Go home without making popup dialog.
                  return;
                }
              } //****************************************************************************

    if (city_imprs.isSet(i) && improvement['sabotage'] > 0) {
      /* The building is in the city. The probability of successfully
       * sabotaging it is above zero. */
      buttons.push(create_sabotage_impr_button(improvement, id,
                                               actor_unit['id'],
                                               target_city['id'],
                                               act_id));
    }
  }
  if (battering_event) {
    swal("City has no City Walls.");
    setSwalTheme();
    return;
  }

  /* Allow the user to cancel. */
  buttons.push({
                 html : ' Cancel (<b>W</b>)',
                 click : function() {
                  remove_action_selection_dialog("#"+id, actor_unit['id'])
                 }
               });

  /* Create the dialog. */
  $("#" + id).dialog({
                       modal: true,
                       buttons: buttons,
                       width: "90%"});

  /* Show the dialog. */
  $("#" + id).dialog('open');
  $("#" + id).dialog('widget').position({my:"center top", at:"center top", of:window})
  dialog_register("#"+id, actor_unit['id']);
}

/**************************************************************************
  Create a button that selects a target unit.
  Needed because of JavaScript's scoping rules.
**************************************************************************/
function create_select_tgt_unit_button(parent_id, actor_unit_id,
                                       target_tile_id, target_unit_id)
{
  var button = {};
  var dhtml = "";
  var target_unit = units[target_unit_id];
  var ttype = unit_type(target_unit);
  var punit = units[actor_unit_id];
  var ptype = unit_type(punit);
  // Used to construct additional transport detail info:
  var ptile = index_to_tile(target_unit['tile']);
  var units_on_tile = tile_units(ptile);
  var carrying = 0;
  var cargo_text = "";
  var show_transport_info = false;
  var normal_ruleset = (client_rules_flag[CRF_CARGO_HEURISTIC]);
  var title_text = get_unit_city_info(target_unit, true);

  var moves_text = move_points_text(target_unit['movesleft'],false);
  if (moves_text == "-") {
  // "-" means it was NaN/unknown because foreign, which means it's an ally on same tile
    moves_text = " ALLY "
  } else {
    moves_text = "M:"+moves_text+" ";
  }

  // Determine if target unit is (probably) a legal Embark target.
  if (target_unit['id'] != punit['id']) {
    tclass = unit_classes[ttype.unit_class_id];
    if (ttype['transport_capacity'] > 0) {
      if (!normal_ruleset || unit_could_possibly_load(punit, ptype, ttype, tclass)) {
        show_transport_info = true;
        // Determine cargo qty. TODO:make reusable get_cargo_qty(transport) function
        for (t = 0; t < units_on_tile.length; t++ ) {
          var aunit = units_on_tile[t];

          if (aunit['transported'] && aunit['transported_by'] == target_unit_id) {
            if (carrying) cargo_text+="," // csv presentation
            carrying ++; // increment load counter of transporter
            cargo_text += " "+unit_type(aunit)['name'];
          }
        }
        if (carrying > 1) cargo_text = "Carrying " + carrying+ " units: "+cargo_text;
        else if (carrying==1) cargo_text = "Carrying " + cargo_text;
        else cargo_text = "No Cargo"
      }
    }
  }

  // Segment 1. Unit Emoji
  dhtml += html_emoji_from_universal(ttype['name'])+" ";
  // Segment 2. Unit type name (and Unit ID iff a legal transport)
  if (show_transport_info) dhtml += "T"+target_unit_id+" ";
  dhtml += ttype['name']+" ";
  // Segment 3. If unit is cargo, tell who is transporting it.
  if (target_unit['transported_by']) dhtml+="on T"+target_unit['transported_by']+" ";
  // Segment 4. Extra transport-distinguishing info (iff legally embarkable)
  if (show_transport_info) {
    dhtml += moves_text;
    dhtml += "<span class='tt' style='cursor:help' title='"+cargo_text+"'>"+"L:"+carrying+" </span> ";
    dhtml += "C:"+ttype['transport_capacity']+" ";
  }
  // Segment 5. Nationality + Home city
  if (get_unit_homecity_name(target_unit) != null) dhtml += " ("+get_unit_homecity_name(target_unit)+")";
  //text += " &emsp;"+unit_get_flag_image(target_unit,18); // alternative flag at the right of button
  dhtml += unit_get_shield_image(target_unit);
  /* commented out because unit_flag_image is less verbose and has hover title text
  text += " (";
  text += nations[unit_owner(target_unit)['nation']]['adjective'];
  text += ")";
  */

  button = {
    html  : dhtml,
    "class": "tt",
    title: title_text,
    click : function(e) {
      if (metaKey(e)) {
        help_redirect(VUT_UTYPE, target_unit['type']);
        remove_active_dialog(parent_id);
        return;
      }
      var packet = {
        "pid"            : packet_unit_get_actions,
        "actor_unit_id"  : actor_unit_id,
        "target_unit_id" : target_unit_id,
        "target_tile_id" : target_tile_id,
        "target_extra_id": EXTRA_NONE,
        "disturb_player" : true
      };
      send_request(JSON.stringify(packet));

      remove_active_dialog(parent_id);
    }
  };

  /* The button is ready. */
  return button;
}

/**************************************************************************
  Create a dialog where a unit selects what other unit to act on.
**************************************************************************/
function select_tgt_unit(actor_unit, target_tile, potential_tgt_units)
{
  var i;

  var rid     = "sel_tgt_unit_dialog_" + actor_unit['id'];
  var id      = "#" + rid;
  var dhtml   = "";
  var buttons = [];

  /* Reset dialog page. */
  remove_active_dialog(id);
  $("<div id='" + rid + "'></div>").appendTo("div#game_page");

  dhtml += "Select target unit for your ";
  dhtml += unit_types[actor_unit['type']]['name']+":";

  $(id).html(dhtml);

  for (i = 0; i < potential_tgt_units.length; i++) {
    var tgt_unit = potential_tgt_units[i];

    buttons.push(create_select_tgt_unit_button(id, actor_unit['id'],
                                               target_tile['index'],
                                               tgt_unit['id']));
  }

  var close_button = {html: " Cancel (<b>W</b>)", click: function() {
    remove_action_selection_dialog(id, actor_unit['id']);
  }};
  buttons.push(close_button);

  var dialog_width = buttons.length>20 ? "90%" : "875px";

  $(id).dialog({
      title    : "Target unit selection",
      bgiframe : true,
      overflow: "visible",
      style :  "text-align:center",
      width: is_small_screen() ? "99%" : dialog_width,
      modal    : true,
      buttons  : buttons });

  $(id).dialog('open');
  $(id).dialog('widget').position({my:"center top", at:"center top", of:window})
  dialog_register(id, actor_unit['id']);
  $(id).parent().css("overflow","visible");
  // Tooltip for target buttons
  $(".tt").tooltip({ tooltipClass: "tt_slim", show: { delay:350, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0} });
}

/**************************************************************************
  List potential extra targets at target_tile
**************************************************************************/
function list_potential_target_extras(act_unit, target_tile)
{
  var potential_targets = [];

  for (var i = 0; i < ruleset_control.num_extra_types; i++) {
    var pextra = extras[i];

    if (tile_has_extra(target_tile, pextra.id)) {
      /* This extra is at the tile. Can anything be done to it? */
      if (is_extra_removed_by(pextra, ERM_PILLAGE)
          && unit_can_do_action(act_unit, ACTION_PILLAGE)) {
        /* TODO: add more extra removal actions as they appear. */
        potential_targets.push(pextra);
      }
    } else {
      /* This extra isn't at the tile yet. Can it be created? */
      if (pextra.buildable
          && ((is_extra_caused_by(pextra, EC_IRRIGATION)
               && unit_can_do_action(act_unit, ACTION_IRRIGATE))
              || (is_extra_caused_by(pextra, EC_MINE)
                  && unit_can_do_action(act_unit, ACTION_MINE))
              || (is_extra_caused_by(pextra, EC_BASE)
                  && unit_can_do_action(act_unit, ACTION_BASE))
              || (is_extra_caused_by(pextra, EC_ROAD)
                  && unit_can_do_action(act_unit, ACTION_ROAD)))) {
        /* TODO: add more extra creation actions as they appear. */
        potential_targets.push(pextra);
      }
    }
  }

  return potential_targets;
}

/**************************************************************************
  Create a button that selects a target extra.
  Needed because of JavaScript's scoping rules.
**************************************************************************/
function create_select_tgt_extra_button(parent_id, actor_unit_id,
                                        target_unit_id,
                                        target_tile_id, target_extra_id)
{
  var text = "";
  var button = {};
  var target_tile = index_to_tile(target_tile_id);
  var title = extras[target_extra_id]['rule_name'];
  if (title=="") title = "Hideout";
  else if (title=="​Depth") title = "Deep Depth";
  var spacer = "&nbsp" + (title == "Walls" ? "&nbsp;&nbsp;" : "");

  // UI Heuristic: buttons for stuff you can never do get rejected:
  if (title.includes("Quay") && title.length == 5) return null; //quay+"" 0-width char can't be made
  // </end stuff that can't be done>

  text += render_action_image_into_button(spacer+title, extras[target_extra_id]['rule_name'],
                                          target_extra_id);

  if (tile_has_extra(target_tile, target_extra_id)) {
    if (extra_owner(target_tile) != null) {
      text += " "+nations[extra_owner(target_tile)['nation']]['adjective'];
    } else {
      // TODO: some kind of unit_can_target check for legality
      text += " <img class='v' style='float:right;transform:scale(0.67);' title='target' src='/images/e/targetextra.png'>";
    }
  } else {
    // TODO: some kind of unit_can_build_(target_extra_id)
    text += " <img class='v' style='float:right;transform:scale(0.67);' title='build' src='/images/e/circleplus.png'>";
  }

  button = {
    html  : text,
    title:  html_safe(extras[target_extra_id].helptext+("\nMETA-CLICK: See help for "+extras[target_extra_id].rule_name)),
    click : function(e) {
      if (metaKey(e)) {
        help_redirect(VUT_EXTRA, target_extra_id);
        remove_active_dialog(parent_id);
        return;
      }
      var packet = {
        "pid"            : packet_unit_get_actions,
        "actor_unit_id"  : actor_unit_id,
        "target_unit_id" : target_unit_id,
        "target_tile_id" : target_tile_id,
        "target_extra_id": target_extra_id,
        "disturb_player" : true
      };
      send_request(JSON.stringify(packet));

      remove_active_dialog(parent_id);
    }
  };

  /* The button is ready. */
  return button;
}

/**************************************************************************
  Create a button that selects a transport to load on.
  Needed because of JavaScript's scoping rules.
**************************************************************************/
function create_load_transport_button(actor, ttile, tid, tmoves, tloaded, tcapacity,
                                      dialog_id, dialog_num, last_dialog)
{
  // Mark and disable button if transport is at full capacity:
  var disable = false;
  var target_unit = units[tid];
  var ttype = unit_type(target_unit);
  var title_text = get_unit_city_info(target_unit, true);
  var ptile = index_to_tile(target_unit['tile']);
  var units_on_tile = tile_units(ptile);
  var carrying = 0;
  var cargo_text = "";
  var text = "";

  // Loaded cargo info
  if (tloaded  >= tcapacity) {
    tloaded = " FULL";
    disable = true;
  } else tloaded = " L:"+tloaded;
  for (t = 0; t < units_on_tile.length; t++ ) {
    var aunit = units_on_tile[t];
    if (aunit['transported'] && aunit['transported_by'] == tid) {
      if (carrying) cargo_text+="," // csv presentation
      carrying ++; // increment load counter of transporter
      cargo_text += " "+unit_type(aunit)['name'];
    }
  }
  if (carrying > 1) cargo_text = "Carrying " + carrying+ " units: "+cargo_text;
  else if (carrying==1) cargo_text = "Carrying " + cargo_text;
  else cargo_text = "No Cargo"

  // Move points info
  var moves_text = move_points_text(tmoves,false);
  if (moves_text == "-") {
  // "-" means it was NaN/unknown because foreign, which means it's an ally on same tile
    moves_text = " ALLY"
  } else {
    moves_text = " M:"+moves_text;
  }

  // Segment 1. Unit Emoji
  text += html_emoji_from_universal(ttype['name'])+" ";
  // Segment 2. Txxx Unit_type
  text += "T" + tid
        + " " + unit_type(target_unit)['name'] +" "
  // Segment 3. If unit is cargo, tell who is transporting it.
  if (target_unit['transported_by']) text+="on T"+target_unit['transported_by']+" ";
  // Segment 4. M:moves L:cargo_qty C:capacity
  text += moves_text
        + "<span style='cursor:help' class='tt' title='"+cargo_text+"'>"+tloaded+"</span>"
        + " C:" + tcapacity;
  // Segment 5. Nationality + Home city
  if (get_unit_homecity_name(target_unit) != null) text += " ("+get_unit_homecity_name(target_unit)+")";
  //text += " &emsp;"+unit_get_flag_image(target_unit,18); // alternative flag at right of button
  text += unit_get_shield_image(target_unit);

  var load_button = {
    title : title_text,
    html  : text,
    "class" : "tt",
    disabled :  disable,
    click : function(e) {
      if (metaKey(e)) {
        help_redirect(VUT_UTYPE, units[tid]['type']);
        remove_action_selection_dialog(dialog_id, actor['id'])
        return;
      }
      request_unit_do_action(ACTION_TRANSPORT_BOARD, actor, tid);
      // Loaded units don't ask orders later:
      remove_unit_id_from_waiting_list(actor['id']);
      actor['done_moving'] = true;
      setTimeout(update_game_unit_panel, 600);

      // for very last dialog, click advances unit focus
      if (dialog_num==last_dialog) setTimeout(function() {advance_unit_focus(false)}, 700);

      remove_action_selection_dialog(dialog_id, actor['id'])
    }
  }
  return load_button;
}
/**************************************************************************
  Create a dialog where a unit select what other unit to act on.
**************************************************************************/
function select_tgt_extra(actor_unit, target_unit,
                          target_tile, potential_tgt_extras)
{
  var i;

  var rid     = "sel_tgt_extra_dialog_" + actor_unit['id'];
  var id      = "#" + rid;
  var dhtml   = "";
  var buttons = [];
  //var sort_order = [];
  //var sorted_buttons = [];

  /* Reset dialog page. */
  remove_active_dialog(id);
  $("<div id='" + rid + "'></div>").appendTo("div#game_page");

  dhtml += "Select tile target for your ";
  dhtml += unit_types[actor_unit['type']]['name'];

  $(id).html(dhtml);

  for (i = 0; i < potential_tgt_extras.length; i++) {
    var tgt_extra = potential_tgt_extras[i];

    let the_button = create_select_tgt_extra_button(id, actor_unit['id'],
                                                    target_unit == null ?
                                                      IDENTITY_NUMBER_ZERO :
                                                      target_unit['id'],
                                                    target_tile['index'],
                                                    tgt_extra['id']);
    if (the_button != null) {

      // last half of list needs tooltip to position differently
      if (i>potential_tgt_extras.length/2)
        the_button['class'] = 'act_sel_button tbot';
      else
        the_button['class'] = 'act_sel_button ttop';

      the_button['height'] = '31px';

      buttons.push(the_button);
      /* sort_order.push(i);
        TODO, sort the buttons alphabetically based on simple array of text
        names without the images
      */
    }
  }

  $(id).dialog({
      title    : "Tile target",
      bgiframe : true,
      "overflow": "visible",
      modal    : true,
      width    : "320px",
      buttons  : buttons });

  $(id).dialog('open');
  $(id).next().css("text-align", "center");
  $(id).dialog('widget').position({my:"center top", at:"center top", of:window})
  dialog_register(id, actor_unit['id']);
  $(id).parent().css("overflow", "visible"); // prevent clipping of tooltips
  $(".ttop").tooltip({ tooltipClass: "tt_tiny", position: { my:"left top-50", at: "right+5 top"},
    show: { delay:700, effect:"none", duration: 0 }, hide: {delay:70, effect:"none", duration: 0} });
  $(".tbot").tooltip({ tooltipClass: "tt_tiny", position: { my:"left bottom", at: "right+5 bottom"},
    show: { delay:700, effect:"none", duration: 0 }, hide: {delay:70, effect:"none", duration: 0} });
}

/**************************************************************************
  Create a dialog to set the last order/action for goto and rally
**************************************************************************/
function select_last_action()
{
  var id     = "#sel_last_action_dialog";
  var dhtml   = "";
  var buttons = [];
  var ptype = current_focus.length ? unit_type(current_focus[0]) : null;
  var actor_id = current_focus.length ? current_focus[0].id : -1;
  var uname = ptype ? ptype.name : null;
  var can_vigil = ptype
                  ? (uname.includes("Fighter") || uname.includes("Anti-Ballistic Missile"))
                  : true; /* unknown type may or may not be able to, assume true */
  const msub = (uname == "Missile Submarine") /* "DIVE DEEP" fools utype_can_do_action

  /* Reset dialog page. */
  remove_active_dialog(id);
  $("<div id='sel_last_action_dialog'></div>").appendTo("div#game_page");

  if (rally_active) {
    dhtml += "Select action to do at RALLY point:";
    // Turn off mouse-cursor pathing while dialog is open:
    old_rally_active = rally_active; // Remembers it was on.
    rally_active = false; // Gets turned back on after picking an action
  } else dhtml += "Select action to perform after GOTO:";
  $(id).html(dhtml);

/* TODO:
=========================================================================================================
    make non-working //commented-out actions to work   */

//function add_action_last_button(buttons, action_id,   override_name, order,                activity,        target, subtarget)
  buttons = add_action_last_button(buttons, ACTION_ATTACK);
  buttons = add_action_last_button(buttons, ACTION_BOMBARD,
                                  current_focus.length ? unit_get_bombard_name(current_focus[0]) :
                                  "Special Attack");
/* Currently disallowed until actionenablers can guarantee this is legal at the server level.
   TODO: when ruleset has actionenablers regulating TRANSPORT_BOARD legality, this button can return.
  buttons = add_action_last_button(buttons, ACTION_TRANSPORT_BOARD, "Board");
*/
  buttons = add_action_last_button(buttons, ACTION_SPY_BRIBE_UNIT, "Bribe");
  if (tech_known('Radio') && (!uname || uname =="Trawler"))
    buttons = add_action_last_button(buttons, ACTION_BASE, "Build Buoy", ORDER_PERFORM_ACTION, null, null, EXTRA_BUOY);
  if (tech_known('Radio') && uname !="Trawler" && !msub)
    buttons = add_action_last_button(buttons, ACTION_BASE, "Build Airbase", ORDER_PERFORM_ACTION, null, null, EXTRA_AIRBASE);
  buttons = add_action_last_button(buttons, ACTION_FOUND_CITY, "Build City");
  if (client_rules_flag[CRF_MASONRY_FORT] && tech_known('Masonry') && uname !="Trawler" && !msub)
    buttons = add_action_last_button(buttons, ACTION_BASE, "Build Fort", ORDER_PERFORM_ACTION, null, null, EXTRA_FORT);
  if (tech_known('Construction') && uname != "Trawler" && !msub)
    buttons = add_action_last_button(buttons, ACTION_BASE, "Build Fortress", ORDER_PERFORM_ACTION, null, null, EXTRA_FORTRESS);
  if (client_rules_flag[CRF_EXTRA_HIDEOUT] && server_settings.hideouts.val && tech_known('Warrior Code') && (!ptype || utype_has_flag(ptype,UTYF_FOOTSOLDIER)))
    buttons = add_action_last_button(buttons, ACTION_BASE, "Build Hideout", ORDER_PERFORM_ACTION, null, null, EXTRA_);
  if (client_rules_flag[CRF_CANALS] && tech_known('Engineering') && !msub) {
    buttons = add_action_last_button(buttons, ACTION_ROAD, "Canal, coastal", ORDER_PERFORM_ACTION, null, null, EXTRA_CANAL);
    buttons = add_action_last_button(buttons, ACTION_ROAD, "Canal, inland", ORDER_PERFORM_ACTION, null, null, EXTRA_WATERWAY);
  }
  buttons = add_action_last_button(buttons, ACTION_CAPTURE_UNITS, "Capture Unit");

  if (!msub) {
    buttons = add_action_last_button(buttons, ACTION_COUNT, "Clean Pollution", ORDER_ACTIVITY, ACTIVITY_POLLUTION, null, EXTRA_POLLUTION);
    buttons = add_action_last_button(buttons, ACTION_COUNT, "Clean Fallout", ORDER_ACTIVITY, ACTIVITY_FALLOUT, null, EXTRA_FALLOUT);
  }

  buttons = add_action_last_button(buttons, ACTION_CONQUER_CITY);
  buttons = add_action_last_button(buttons, ACTION_CONVERT);
  if (!msub)
    buttons = add_action_last_button(buttons, ACTION_CULTIVATE);

  buttons = add_action_last_button(buttons, ACTION_SUICIDE_ATTACK, "Detonate Missile");
  buttons = add_action_last_button(buttons, ACTION_NUKE, "Detonate Nuke");
  if (client_rules_flag[CRF_MP2_D] && (!uname || uname == "Missile Submarine"))
    buttons = add_action_last_button(buttons, ACTION_BASE, "Dive Deep", ORDER_PERFORM_ACTION, null, null, EXTRA_DEEPDIVE);
  buttons = add_action_last_button(buttons, ACTION_TRANSPORT_EMBARK, "Embark");
  buttons = add_action_last_button(buttons, ACTION_TRADE_ROUTE);
  buttons = add_action_last_button(buttons, ACTION_EXPEL_UNIT);
  buttons = add_action_last_button(buttons, ACTION_FORTIFY);
  buttons = add_action_last_button(buttons, ACTION_HELP_WONDER);
  buttons = add_action_last_button(buttons, ACTION_HOME_CITY, "Home City");
  if (uname != "Trawler" && !msub)
    buttons = add_action_last_button(buttons, ACTION_IRRIGATE, "Irrigate"); // works on blank tiles but not farmland
  if (tech_known('Refrigeration') && uname != "Trawler" && !msub)
    buttons = add_action_last_button(buttons, ACTION_IRRIGATE, "Irrigate Farmland", ORDER_PERFORM_ACTION, null, null, EXTRA_FARMLAND);
  buttons = add_action_last_button(buttons, ACTION_JOIN_CITY);
  //buttons = add_action_last_button(buttons, ACTION_TRANSPORT_LOAD); // GET FROM SVEINUNG WHO FINISHED THIS RECENTLY

  if (client_rules_flag[CRF_MAGLEV] && tech_known('Superconductors') && !msub)
    buttons = add_action_last_button(buttons, ACTION_ROAD, "MagLev", ORDER_PERFORM_ACTION, null, null, EXTRA_MAGLEV);
  if (uname !="Trawler") {
    if (!msub) {
      buttons = add_action_last_button(buttons, ACTION_MINE, "Mine", ORDER_PERFORM_ACTION, null, null, EXTRA_MINE);
    }
    buttons = add_action_last_button(buttons, ACTION_PILLAGE, "Pillage Anything", ORDER_PERFORM_ACTION, null, null, -1);
  }

  if (!msub) {
    buttons = add_action_last_button(buttons, ACTION_PLANT, "Plant");
    buttons = add_action_last_button(buttons, ACTION_SPY_POISON_ESC, "Poison City");

    if (tech_known('Railroad')) {
      buttons = add_action_last_button(buttons, ACTION_ROAD, "Railroad", ORDER_PERFORM_ACTION, null, null, EXTRA_RAILROAD);
    }
    buttons = add_action_last_button(buttons, ACTION_ROAD, "Road", ORDER_PERFORM_ACTION, null, null, EXTRA_ROAD);
  }

  buttons = add_action_last_button(buttons, ACTION_RECYCLE_UNIT);
  buttons = add_action_last_button(buttons, ACTION_SPY_SABOTAGE_UNIT_ESC, "Sabotage Unit");
  buttons = add_action_last_button(buttons, ACTION_COUNT, "Sentry", ORDER_ACTIVITY, ACTIVITY_SENTRY, null, -1);
  buttons = add_action_last_button(buttons, ACTION_SPY_ATTACK, "Spy vs. Spy");
  buttons = add_action_last_button(buttons, ACTION_STEAL_MAPS, "Steal Map");
  buttons = add_action_last_button(buttons, ACTION_STEAL_MAPS_ESC, "Steal Map Escape");
  buttons = add_action_last_button(buttons, ACTION_TRANSFORM_TERRAIN);
  /* TODO: As more rulesets get actionenabler support, add them to the conditional: */
  if (actor_id > 0
     && (client_rules_flag[CRF_MP2_D] || !client_rules_flag[CRF_MP2])
     && unit_has_cargo(units[actor_id])) {
    buttons = add_action_last_button(buttons, ACTION_TRANSPORT_UNLOAD, "Unload Cargo", ORDER_PERFORM_ACTION, null, actor_id, -1);
  }
  buttons = add_action_last_button(buttons, ACTION_UPGRADE_UNIT);
  if (can_vigil) {
    buttons = add_action_last_button(buttons, ACTION_COUNT, "Vigil", ORDER_ACTIVITY, ACTIVITY_VIGIL, null, -1);
  }
  buttons = add_action_last_button(buttons, ACTION_COUNT, "NO ACTION", ORDER_LAST);
  var close_button = {
    html: render_action_image_into_button("<span style='position:relative; top:-1px; left:8px;'>Cancel (<b>W</b>)</span>", "cancel"),
    click: function() {
      remove_active_dialog(id);
      deactivate_goto(false);
    }
  };
  buttons.push(close_button);

  $(id).dialog({
  title    : "Go and ...",
  overflow: "visible",
  width    : (is_small_screen() ? "99%" : "450px"),
  bgiframe : true,
  html:    dhtml,
  modal    : true,
  buttons  : buttons });

  $(id).dialog('open');
  $(id).dialog('widget').position({my:"center top", at:"center top", of:window})

  dialog_register(id);
  $(".tt").tooltip({ tooltipClass: "tt_slim", show: { delay:700, effect:"none", duration: 0 }, hide: {delay:20, effect:"none", duration: 0} });
  $(id).parent().css("overflow","visible");
}

/**************************************************************************
  Possibly add an action button for "Go...And" dialog
**************************************************************************/
function add_action_last_button(buttons, action_id, override_name, order, activity, target, subtarget)
{
  // Eliminate actions known to be illegal for the utype given a rally point.
  if (old_rally_active) {
    // Only eliminate actions iff city production utype was known:
    if (rally_virtual_utype_id != RALLY_DEFAULT_UTYPE_ID) {
      //TODO:city might be making default utype, check rally_city_id's real VUT_UTYPE instead ^^
      if (!utype_can_do_action(unit_types[rally_virtual_utype_id],action_id)) {
        return buttons; // don't add
      }
    }
  }
  // Eliminate illegal actions for a selected utype under Go...And
  else if (current_focus.length) {
    if (!utype_can_do_action(unit_type(current_focus[0]),action_id)) {
      return buttons; // don't add
    }
  }
  // Get ruleset name for action unless override title exists:
  if (!override_name) override_name = actions[action_id]['ui_name'].replace("%s", "").replace("%s","");
  var new_button = create_action_last_button(override_name, action_id, order, activity, target, subtarget);

  new_button.html = render_action_image_into_button(new_button.html, action_id, subtarget, order, activity);
  new_button.html = new_button.html.replace("act_sel_order_image", "go_and_do_order_image");
  buttons.push(new_button);
  return buttons;
}
/**************************************************************************
  Create a button for GO...AND last order dialog
**************************************************************************/
function create_action_last_button(title_text, action, order, activity, target, subtarget)
{
  var button = {
    title: "Perform "+title_text+" after completing GOTO",
    "class": "tt",
    html:  title_text,
    click: function() {
      if (order) {
        user_last_order = order;
      } else {
        user_last_order = ORDER_PERFORM_ACTION;
      }
      if (target) {
        user_last_target = target;
      }
      if (subtarget) {
        user_last_subtarget = subtarget;
      }
      if (activity) {
        user_last_activity = activity;
      }
      goto_last_order = user_last_order;
      user_last_action = action;
      goto_last_action = action;
      remove_active_dialog("#sel_last_action_dialog");
      /* AFTER picking last action, we activate goto-pathing or rally-pathing,
         to avoid cursor doing "shadow goto pathing" while modal dialog is up */
      if (old_rally_active) {
        rally_active = old_rally_active;
        old_rally_active = false;
        activate_rally_goto(cities[rally_city_id]);
      } else if (current_focus.length > 0) {
        activate_goto();
      }
    }
  }

  return button;
}

/**************************************************************************
 Registers a dialog as active, so that 'W' will close the most recent
 opened dialog (First In Last Out). Also binds the dialog close function
 to clean-up function remove_active_dialog(..)

 Optional 'actor_id' is for actor units' Action Selection Dialogs to
 unregister themselves as no longer awaiting user action selection (which
 the system needs to know for sorting the advancing of unit focus, etc.)

 Optional 'input_maybe_needed' lets us know to unregister the
 Action Selection Dialog if we might possibly be waiting for more user
 input.
**************************************************************************/
function dialog_register(id, actor_id, input_maybe_needed) {
  //console.log("    dialog registered: "+id+"    actor:"+actor_id)
  $(id).dialog('widget').keydown(dialog_key_listener);
  active_dialogs.push(id);
  //close, cancel, and [x]
  $(id).dialog({
      autoOpen: true
  }).bind('dialogclose', function(event, ui) {
    if (actor_id) {
      remove_action_selection_dialog(id, actor_id, input_maybe_needed);
    }
    else {
      remove_active_dialog(id);
    }
  });
  $(id).css("color", default_dialog_text_color);
}

/**************************************************************************
  Create a close button (for multiple cascading dialogs)
  (such as multiple dialogs for multiple units ordered to board a ship)
  Needed as a function because of JavaScript's scoping rules.
**************************************************************************/
function create_a_close_button(parent_id)
{
  var close_button = {html: render_action_image_into_button(" Cancel (<b>W</b>)", "cancel"), click: function() {
      remove_active_dialog(parent_id);
  }};
  return close_button;
}
/**************************************************************************
  Called when dialog close-binding function is triggered from the dialog
  closing some other way than by hitting 'W'.
**************************************************************************/
function remove_active_dialog(id)
{
  const index = active_dialogs.indexOf(id);
  if (index > -1) {
    active_dialogs.splice(index, 1);
  }
  $(id).remove();
}
/**************************************************************************
  Same as above but for unit action dialogs which also need to unregister
  that the unit is no longer waiting for user input from the dialog.
  Called when dialog close-binding function is triggered from the dialog
  closing some other way than by hitting 'W'.

  Optional 'inp_maybe_needed' tells us to perform a check that
  this unit has even more selections to make, and if so, not to
  unregister that the unit is waiting on user input.
**************************************************************************/
function remove_action_selection_dialog(id, actor_id, inp_maybe_needed)
{
  remove_active_dialog(id);

  if (!inp_maybe_needed) {
    act_sel_queue_done(actor_id);
  }
  else {
    act_sel_queue_may_be_done(actor_id);
  }
}

/**************************************************************************
 Callback to handle keyboard events for simple dialogs.
**************************************************************************/
function dialog_key_listener(ev)
{
  var keyboard_key = String.fromCharCode(ev.keyCode).toUpperCase();
  var key_code = ev.keyCode;
  // Check if focus is in chat field, where these keyboard events are ignored.
  if ($('input:focus').length > 0 || !keyboard_input) return;
  if (C_S_RUNNING != client_state()) return;
  if (!active_dialogs) return;

  if (key_code==27) {
    ev.stopPropagation();
    return;
  }
  switch (keyboard_key) {
    case 'W':
      if (active_dialogs.length) {
        ev.stopPropagation();
        remove_active_dialog_handler();
      }
      break;
  }
}
/**************************************************************************
 Front end wrapper that closes the CURRENTLY ACTIVE dialog and decides
 whether the ACTIVE dialog that is being closed is an action selection
 dialog or a simple dialog, and does the appropriate different processing
 needed for both cases.
**************************************************************************/
function remove_active_dialog_handler()
{
  kill_dialog_id = active_dialogs.pop();
  if (action_selection_in_progress_for && kill_dialog_id.endsWith("_"+action_selection_in_progress_for)) {
    did_not_decide = true;
    remove_action_selection_dialog(kill_dialog_id, action_selection_in_progress_for, false);
  } else {
    remove_active_dialog(kill_dialog_id);
  }
}

/***********************************************************************//**
  Closes the action selection dialog
***************************************************************************/
function action_selection_close(not_over)
{
  var id;
  var actor_unit_id = action_selection_in_progress_for;

  if (not_over) {
    did_not_decide = true;
  }

  id = "#act_sel_dialog_" + actor_unit_id;
  // Remove action selection dialog only if it exists:
  if ($(id).length) remove_action_selection_dialog(id, actor_unit_id)

  id = "#bribe_unit_dialog_" + actor_unit_id;
  // Remove action selection dialog only if it exists:
  if ($(id).length) remove_action_selection_dialog(id, actor_unit_id)

  id = "#incite_city_dialog_" + actor_unit_id;
  // Remove action selection dialog only if it exists:
  if ($(id).length) remove_action_selection_dialog(id, actor_unit_id)

  id = "#upgrade_unit_dialog_" + actor_unit_id;
  // Remove action selection dialog only if it exists:
  if ($(id).length) remove_action_selection_dialog(id, actor_unit_id)

  id = "stealtech_dialog_" + actor_unit_id;
  // Remove action selection dialog only if it exists:
  if ($(id).length) remove_action_selection_dialog(id, actor_unit_id)

  id = "sabotage_impr_dialog_" + actor_unit_id;
  // Remove action selection dialog only if it exists:
  if ($(id).length) remove_action_selection_dialog(id, actor_unit_id)

  id = "#" + "sel_tgt_unit_dialog_" + actor_unit_id;
  // Remove action selection dialog only if it exists:
  if ($(id).length) remove_action_selection_dialog(id, actor_unit_id)

  id = "#" + "sel_tgt_extra_dialog_" + actor_unit_id;
  // Remove action selection dialog only if it exists:
  if ($(id).length) remove_action_selection_dialog(id, actor_unit_id)

  id = $("#city_name_dialog");
  // Remove action selection dialog only if it exists:
  if ($(id).length) $(id).remove();
  /* previous code did this, but is potentially risky since city_name_dialog
     is currently not a registered action selection dialog but rather, is an
     "off the registry" type of dialog:
     if ($(id).length) remove_action_selection_dialog(id, actor_unit_id) */

  if (not_over) {
    /* Clean up just in case */
    did_not_decide = false;
  }
}
