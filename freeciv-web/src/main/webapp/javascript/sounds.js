/**********************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2009-2016  The Freeciv-web project

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

var sound_path = "/sounds/";
var sound_traffic_counter = 0; // how many play_sounds called within timeframe=soundelayer milliseconds
var sound_traffic_max = 10;     // maximum of 10 sounds played within x milliseconds period
var sound_delayer = 150;       // timeframe in which a max of sound_traffic_max sound events can be played
var sound_delay_timestamp = null; // timestamp for measuring sound_delayer


/**************************************************************************
 Plays the unit sound for movement, if the unit has moved and is visible.
**************************************************************************/
function check_unit_sound_play(old_unit, new_unit)
{
  if (!sounds_enabled) return;
  if (old_unit == null || new_unit == null) return;
  /* unit is in same position. */
  if (new_unit['tile'] == old_unit['tile']) return;
  if (!is_unit_visible(new_unit)) return;

  if (soundset == null) {
    console.error("soundset not found.");
    return;
  }

  var ptype = unit_type(new_unit);
  if (soundset[ptype['sound_move']] != null) {
    play_sound(soundset[ptype['sound_move']]);
  } else if (soundset[ptype['sound_move_alt']] != null) {
    play_sound(soundset[ptype['sound_move_alt']]);
  }

}

/**************************************************************************
 Plays the unit sound for movement.
**************************************************************************/
function unit_move_sound_play(unit)
{
  if (!sounds_enabled) return;
  if (unit == null) return;

  if (soundset == null) {
    console.error("soundset not found.");
    return;
  }

  var ptype = unit_type(unit);
  move_sound = soundset[ptype['sound_move']];

  // Figure out if this unit is moving for the first time or has already moved
  var full_moves = ptype['move_rate'];
  var used_moves = full_moves - unit['movesleft'];

  // Negative used_moves means move bonus in effect. Adjust full_moves to properly reflect move bonus:
  if (used_moves<0) {
    if (ptype['name']=="Train") {
      if (player_invention_state(client.conn.playing, tech_id_by_name('Electricity')) == TECH_KNOWN)
        full_moves += 9;
      if (player_invention_state(client.conn.playing, tech_id_by_name('Combustion')) == TECH_KNOWN)
        full_moves += 9;
    }
    /* unnecessary, since we set this unit to simply always use partial move sound even with full moves
    if (ptype['name']=="Airplane") {
      if (player_invention_state(client.conn.playing, tech_id_by_name('Radio')) == TECH_KNOWN)
        full_moves += 18;
      if (player_invention_state(client.conn.playing, tech_id_by_name('Advanced Flight')) == TECH_KNOWN)
        full_moves += 18;
      if (player_invention_state(client.conn.playing, tech_id_by_name('Radar')) == TECH_KNOWN)
        full_moves += 18;
      if (player_invention_state(client.conn.playing, tech_id_by_name('Rocketry')) == TECH_KNOWN)
        full_moves += 18;
      if (player_invention_state(client.conn.playing, tech_id_by_name('Avionics')) == TECH_KNOWN)
        full_moves += 18;
      if (player_invention_state(client.conn.playing, tech_id_by_name('Space Flight')) == TECH_KNOWN)
        full_moves += 18;
    }
    */
  }

  // PARTIAL MOVE SOUNDS.  Some sounds are loud or long duration and shouldn't repeat for each step
  if ( unit['movesleft'] < full_moves )  {
    switch(ptype['name']) {
      case "Armor":
        break;
      case "Armor II":
        move_sound = "pm_armor.ogg"
        break;
      case "Medium Bomber":
      case "Heavy Bomber":
      case "Strategic Bomber":
      case "Bomber":
        move_sound = "pm_prop_bombers.ogg";
        break;
      case "Cruise Missile":
      case "Nuclear Missile":
      case "Nuclear":
      case "Tactical Nuke":
        move_sound = null;
        break;
      case "Dive Bomber":
      case "Airplane":
      case "Fighter":
      case "Escort Fighter":
        move_sound = "pm_prop_fighters.ogg";
        break;
      case "AWACS":
      case "Jet Bomber":
      case "Stealth Bomber":
      case "Jet Fighter":
      case "Ground Strike Fighter":
        move_sound = "pm-large-jets.ogg";
        break;
      case "Helicopter":
      case "Transport Helicopter":
        move_sound = "pm_heli.ogg";
        break;
      case "Train":
        move_sound = "pm_train.ogg";
        break;
      // TO DO: Armor, Cruise Missile, Nuclear
    }
  }
  // PLAY MOVE SOUND
  if (move_sound != null) {
    play_sound(move_sound);
  } else if (soundset[ptype['sound_move_alt']] != null) {
    play_sound(soundset[ptype['sound_move_alt']]);
  }
}


/**************************************************************************
 Plays the hostile event sound specified by 'key' if that tile is visible
 to the player (which we know only by if units are visible on that tile.)
**************************************************************************/
function play_hostile_event_sound(key, ptile, ptype)
{
  if (!sounds_enabled) return;

  var funits = tile_units(ptile);
  if (!funits) return;

  if (soundset == null) {
    console.error("Soundset not found.");
    return;
  }

  if (soundset[key] != null) {
    play_sound(soundset[key]);
  }

  /*
  var pclass = unit_classes[ptype['unit_class_id']];
  if (pclass['rule_name'].startsWith("Air")) {
  }*/
}

/**************************************************************************
 Plays the combat sound for the unit if visible.
**************************************************************************/
function play_combat_sound(unit)
{
  if (!sounds_enabled) return;
  if (unit == null) return;
  if (!is_unit_visible(unit) /* && renderer != RENDERER_WEBGL */)
  {
    //console.error("skipped playing a sound because unit not visible or RENDERER_WEBGL");
    return;
  }

  if (soundset == null) {
    console.error("Soundset not found.");
    return;
  }

  var ptype = unit_type(unit);
  if (soundset[ptype['sound_fight']] != null) {
    play_sound(soundset[ptype['sound_fight']]);
  } else if (soundset[ptype['sound_fight_alt']] != null) {
    play_sound(soundset[ptype['sound_fight_alt']]);
    //console.error("Combat sound not found for "+unit_types[unit['type']]['name']+", played alt-sound instead.");
  } //else console.error("No Combat sound or alt sound for "+unit_types[unit['type']]['name']+" found.");
}

/**************************************************************************
 Handle special cases sound effects, Returns false if not a special case,
 so it knows to play normal sound. Also, can send a "lie" that it's false
 to trigger normal sound AND one other sound specified in here.
**************************************************************************/
function combat_sound_special_case(attacker,attacker_hp,defender)
{
  // Destroyer vs. Submarine put in as test case:

  // Sub attacked destroyer and lost, make depth charge sound
  if (unit_types[attacker['type']]['name'] == "Submarine"
     && unit_types[defender['type']]['name'] == "Destroyer"
     && attacker_hp == 0) {

       play_sound("depth-charge.ogg")
       return true;
     }
  // Destroyer attacked Sub and won, make depth charge sound
  if (unit_types[defender['type']]['name'] == "Submarine"
     && unit_types[attacker['type']]['name'] == "Destroyer"
     && attacker_hp > 0) {

       play_sound("depth-charge.ogg")
       return true;
     }

   // IDEAS: pikemen vs. horseback unit: plays sound of horse dying and returns false so pikemen attack sound happens concurrent
   // Fighter vs fighter, return false but include a "crash and burn" sound
   // Balloon dies, return false with balloon pop/hiss/crash sound
   // Sea unit dies, a "glub glub" sinking sound played concurrent
   // Air units die, "crash and burn" sound
   // Foot unit death sound.

  return false; // no special case, play normal combat sound for victor
}

/**************************************************************************
 Plays a sound file based on a gived filename.
**************************************************************************/
function play_sound(sound_file)
{
  var current_time = new Date().getTime();

  // if first time, set up sound traffic controls:
  if (sound_delay_timestamp == null) {
    sound_delay_timestamp = current_time;
    sound_traffic_counter = 0;
  }

  // SOUND EVENT TRAFFIC POLICE: -------------------------------------------------------------------
  // The number of play_sounds called per second must be limited or it creates a DOMexception
  // and permanently shuts off sound on some browsers:
  //console.log("** STARTED play_sound("+sound_file+") WITH (counter:"+sound_traffic_counter+"), "+(current_time-sound_delay_timestamp)+"ms after last sound.");

  // Check if previous timestamp expired and reset it if yes
  if (current_time - sound_delay_timestamp > sound_delayer) {
    sound_traffic_counter = 0;
    sound_delay_timestamp = current_time;
  }

  sound_traffic_counter ++; // increment counter, it will keep incrementing until a reset happens

  // check if attempting to play MORE sounds within the allowed time span and abort if so:
  if (sound_traffic_counter > sound_traffic_max) {
    console.log("  >> Aborted play_sound('"+sound_file+"') due to (counter:"+sound_traffic_counter+") > (max_allowed:"+sound_traffic_max+") within "+sound_delayer+"ms");
    return;
  }
  //-----------------------------------------------------------------------------------------------

  try {
    if (!sounds_enabled || !(document.createElement('audio').canPlayType) || Audio == null) {
      //console.error("function play_sound() was called but failed to play.")
      return;
    }
    var audio = new Audio(sound_path + sound_file);
    var promise = audio.play();
    if (promise != null) {
      promise.catch(sound_error_handler);
    }

  } catch(err) {
    trackJs.console.log("Error playing sound_file="+sound_file);
    sound_error_handler(err);
  }
}

/**************************************************************************
 Logs a sound error in the tracker
**************************************************************************/
function sound_error_handler(err)
{
  //sounds_enabled = false;  this was turning off sounds whenever player moved multiple units
  if (window.trackJs) {

    // Don't report an error caused by: browser restricts permissions on playing sounds
    if (err != null && err['name'] != null && err['name']=="NotAllowedError")
      return;

    trackJs.console.log(err);
    trackJs.track("Sound problem");
  } else {
    console.log("sounds.js sound_error_handler(err) triggered with err=="+err);
  }
}
