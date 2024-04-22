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

const ACTIVITY_FACTOR = 360;   // Superabundant numbers round very nicely

var units = {};

/* Depends on the ruleset. Comes in the packet ruleset_terrain_control.
 * Set in handle_ruleset_terrain_control(). */

var unit_pillage_sound_delay_times = {
  "Dive Bomber": 3000,
  "Ground Strike Fighter": 300,
  "Stealth Bomber": 300,
  "Jet Bomber": 300,
  "Armor":      400,
  "Armor II":   400
};

var unit_bombard_attack_names = {
  "Phalanx":       "Rumble Attack",
  "Archers":       "Volley Attack",
  "Legion":        "Pilum Assult",
  "Siege Ram":     "Ram Fortress",
  "Fanatics":      "Skirmish Assault",
  "Zealots":       "Skirmish Assault",
  "Marines":       "Bazooka Attack",
  "Zeppelin":      "Bomb",
  "Helicopter":    "Ranged Defense",
  "Battleship":    "Bombard",
  "Ballista":      "Ranged Attack",
  "Catapult":      "Bombard",
  "Cannon":        "Bombard",
  "Artillery":     "Bombard",
  "Howitzer":      "Bombard",
  "Magnum Turret": "Bombard"
};

// Determines if victory by this unit shows crossed swords or gunpowder explosion.
var units_pregunpowder = [
"Warriors",
"Phalanx",
"Legion",
"Pikemen",
"Archers",
"Horsemen",
"Chariot",
"Elephants",
"Knights",
"Crusaders",
//"Catapult", // explosion looks better since it's non-melee
//"Ballista",
"Scout",
"Explorer",
"Tribesmen",
"Well-Digger",
"Settlers",
"Workers",
"Trireme",
"Longboat",
"Caravan",
"War Galley",
"Galley",
"Siege Ram",
"Caravel",
"Ram Ship"
];

var SINGLE_MOVE;

var ANIM_STEPS = 8;

var anim_units_max = 30;
var anim_units_count = 0;

/****************************************************************************
 ...
****************************************************************************/
function idex_lookup_unit(id)
{
  return units[id];
}

/****************************************************************************
 ...
****************************************************************************/
function unit_owner(punit)
{
  return player_by_number(punit['owner']);
}


/****************************************************************************
 ...
****************************************************************************/
function client_remove_unit(punit)
{
  control_unit_killed(punit);

  if (unit_is_in_focus(punit)) {
    current_focus = [];
    //if (renderer == RENDERER_WEBGL) webgl_clear_unit_focus();
  }

  delete units[punit['id']];
}

/**************************************************************************
 Returns a list of units on the given tile. See update_tile_unit().
**************************************************************************/
function tile_units(ptile)
{
  if (ptile == null) return null;
  return ptile['units'];
}

/**************************************************************************
 Returns a ptile, (tiles[punit['tile]]) for the tile a unit is on,
  or else returns null.
**************************************************************************/
function unit_tile(punit) {
  if (punit && punit['tile'])
    return index_to_tile(punit['tile']);

  return null;
}  /* TODO: occurrences of ptile=index_to_tile(punit['tile']) in the code,
      could be:  ptile = unit_tile(punit)
      for conformity to c server code and native clients
   */


/**************************************************************************
 Returns a list of units supported by this city.
**************************************************************************/
function get_supported_units(pcity)
{
  if (pcity == null) return null;
  var result = [];
  for (var unit_id in units) {
    var punit = units[unit_id];
    if (punit['homecity'] == pcity['id']) {
      result.push(punit);
    }
  }
  return result;
}


/**************************************************************************
 Updates the index of which units can be found on a tile.
 Note: This must be called after a unit has moved to a new tile.
 See: clear_tile_unit()
**************************************************************************/
function update_tile_unit(punit)
{
  if (punit == null) return;

  var found = false;
  var ptile = index_to_tile(punit['tile']);

  if (ptile == null || ptile['units'] == null) return;

  for (var i = 0; i <  ptile['units'].length; i++) {
    if (ptile['units'][i]['id'] == punit['id']) {
      found = true;
    }
  }

  if (!found) {
    ptile['units'].push(punit);
  }
}

/**************************************************************************
 Updates the index of which units can be found on a tile.
 Note: This must be called before a unit has moved to a new tile.
**************************************************************************/
function clear_tile_unit(punit)
{
  if (punit == null) return;
  var ptile = index_to_tile(punit['tile']);
  if (ptile == null || ptile['units'] == null) return -1;

  if (ptile['units'].indexOf(punit) >= 0) {
    ptile['units'].splice(ptile['units'].indexOf(punit), 1);
  }
}

/**************************************************************************
  Returns the length of the unit list
**************************************************************************/
function unit_list_size(unit_list)
{
  if (unit_list == null) return 0;
  return unit_list.length;
}

/**************************************************************************
  Returns the unit list with the specified unit removed.
**************************************************************************/
function unit_list_without(unit_list, punit)
{
  return unit_list.filter(function(funit, index, c_focus) {
    return funit['id'] != punit['id'];
  });
}

/**************************************************************************
  Returns the type of the unit.
**************************************************************************/
function unit_type(unit)
{
  return unit_types[unit['type']];
}

/**************************************************************************
  Returns the number of people in a city whose mood is affected by
  military units.
  POSITIVE numbers:  citizens made unhappy by military units.
  NEGATIVE numbers:  citizens pacified by military units (martial law.)
**************************************************************************/
function unit_military_unhappy_in_city(pcity)
{
  if (!pcity) return 0;
  if (!pcity['ppl_unhappy'].length) return 0;  // May not have intel on this info

  /* The number can be deduced from the difference in total unhappy in
   * phase-layer 3 (NATIONALITY) and phase-layer 4 (UNITS) */
  const natl_unhappy = pcity['ppl_angry'][FEELING_NATIONALITY] * 2
                     + pcity['ppl_unhappy'][FEELING_NATIONALITY];
  const unit_unhappy = pcity['ppl_angry'][FEELING_MARTIAL] * 2
                     + pcity['ppl_unhappy'][FEELING_MARTIAL];

  return (unit_unhappy - natl_unhappy);
}
/**************************************************************************
  Returns the happy cost this unit is charging its city.
  This is currently using a repurposed punit.facing property which is
  unused in FCW, to save on data bandwidth. If we ever change that,
  this is the wrapper function to change.
**************************************************************************/
function unit_happy_cost(punit)
{
  if (punit) {
    /* TODO: Reloaded games seem to make all units face dir 6
       but I can't seem to find/fix that. */
    if (inside(0, punit['facing'], 6)) {
      return punit['facing'];
    }
  }
  return 0;
}
/**************************************************************************
  Prints a report in the client console for units causing unhappiness to
  their home city. If city_id parameter is set, it will do a report for the
  single city specified by city_id. Otherwise it will do a nation-wide
  report.
**************************************************************************/
function unit_unhappy_report(city_id)
{
  // Fail out if invalid/unknown city requested:
  if (city_id) {
    if (!cities[city_id]) return;
  }

  const city_str = (city_id ? (" in "+cities[city_id]['name']) : "");

  add_client_message("<i style='color:#ff5e5f'><b>Report on citizens unhappy about units"+city_str+"</b></i>:")
  let total = 0;
  for (u in units) {
    let punit = units[u];

    // Pass over ineligible units:
    if (!punit) continue;
    else if (punit['owner'] != client.conn.playing.playerno) continue;
    else if (city_id && (punit['homecity'] != city_id)) continue;

    // If current iterated unit causes unhappy, report it:
    let num = unit_happy_cost(punit);
    if (num) {
      total ++;
      let pcity = cities[punit['homecity']];
      let ctile = index_to_tile(pcity['tile']);

      add_client_message(
        '<div class="fake_table_grid">'

      + '<div onclick="set_unit_id_focus_and_activate('+punit['id']+');">'
      + '<b class="contrast_text">'+num+'</b> unhappy from '
      + '[`' + freemoji_name_from_universal(unit_type(punit).name) +'`]'
      + '<span class="active_link chatbox_text_tileinfo" style="float:right"> '
      + '<u>' + unit_type(punit)['name'] + '</u>'
      + '</span></div>'

      + '<div onclick="show_city_dialog_by_id('+pcity.id+');">'
      + '<span class="chatbox_text_tileinfo">&nbsp;in '
      + '<u class="active_link">' + '<l tgt="tile" x="'+ctile.x+'" y="'+ctile.y+'">' + pcity.name + '</l></u>'
      + '</span>'
      + '</div>'

      + '</div>');
    }
  }
  if (!total) add_client_message("<i style='color:#ff5e5f;font-size:smaller'>No units to report.");
  else add_client_message("<i style='color:#ff5e5f;font-size:smaller'>"+ total + "" + (total-1 ? " total units." : " unit."));
}

/**************************************************************************
  Return TRUE iff this unit can do the specified generalized (ruleset
  defined) action enabler controlled action.
**************************************************************************/
function unit_can_do_action(punit, act_id)
{
  return utype_can_do_action(unit_type(punit), act_id);
}

/**************************************************************************
  Returns postive integer (which evaluates the same as TRUE), if this unit
  has remaining cargo capacity. The number returned is the number of free
  cargo slots available.
**************************************************************************/
function unit_cargo_room(punit) {
  if (!punit) {
    console.log("Error: unit_cargo_room(..) was asked the capacity of a null unit.")
    return true; // before we had this function, we always assumed true anyway
  }
  var ptype = unit_type(punit);
  var ptile = unit_tile(punit);
  var units_on_tile = tile_units(ptile);

  var transport_id = punit['id'];
  var transport_capacity = ptype['transport_capacity'];
  var cargo_units = 0;

  // Count how many units on this tile are on this transport.
  if (units_on_tile) {
    for (var u=0; u < units_on_tile.length; u++) {
      if (units_on_tile[u]['transported_by']==transport_id) {
        cargo_units++;
      }
    }
  }

  if (cargo_units >= transport_capacity) {
    return 0;
  }
  return transport_capacity - cargo_units;
}
/**************************************************************************
  Returns true if punit is carrying cargo
**************************************************************************/
function unit_has_cargo(punit) {
  if (!punit) return false;
  var units_on_tile = tile_units(unit_tile(punit));
  if (units_on_tile) {
    for (var u=0; u < units_on_tile.length; u++) {
      if (units_on_tile[u]['transported_by'] == punit['id']) {
        return true;
      }
    }
  }
  return false;
}

/**************************************************************************
 * Return true if this unit can DEBOARD.
 *
 * This function is currently hard-coded as a placeholder for proper
 * ruleset actionenablers, but has dual use as logic of when to show
 * an order as legal; so can't be removed until 1) 3.1/3.2 actionenablers
 * are in all rulesets AND 2) client can somehow test the actionenabler
 * legality itself.
**************************************************************************/
function unit_can_deboard(punit)
{
  if (!punit) return false;
  if (!client_rules_flag[CRF_DEBOARD_RESTRICT])
    return true; // no actionenabler restrictions on other rulesets
  //****************************************************************** */
  var tunit=null,ttype=null,tclass=null;
  if (punit['transported_by']) {
    tunit = units[punit['transported_by']];
    ttype = unit_type(tunit);
    tclass = unit_classes[ttype.unit_class_id];
  } else return false; // not even loaded!
  //****************************************************************** */
  var ptile = index_to_tile(punit['tile']);
  var pcity = tile_city(ptile);
  if (pcity) return true;  // It's the one and only place you always can!
  //****************************************************************** */
  const quay_rules = client_rules_flag[CRF_EXTRA_QUAY];
  var ptype = unit_type(punit);
  if (ptile == null) return false;
  var pclass = get_unit_class_name(punit);
  if (pclass == "Bomb2") return false; // The one unit you never wanna "drop off", except in a city, ;)
  //var terrain_name = tile_terrain(ptile)['name'];
  //****************************************************************** */
  // COMMON
  /* UTYF_MARINES flag is a mishmash intersection of old capabilities of Marines programmed first as a hard-coded server flag,
   * next migrated over to a custom ruleset flag, and now is a confused holdover for backward compatibility to older rulesets.
   * The whole thing is getting deprecated so it can be split into several flags handling distinctly DIFFERENT behaviours instead
   * of all together. Therefore the line below is commented out and we'll have to see what breaks or needs changing as we
   * extricate ourselves from that legacy mess. The line below that is the new handling. May change behaviour specifically for AAA
   * in MP2A-C, though not necessarily in a bad way (since AAA acting like full Marines when it comes to transports is a bad thing.)
  //if (utype_has_flag(ptype, UTYF_MARINES) && !is_ocean_tile(ptile)) return true;
   */
  if (ptype.rule_name == "Marines" && !is_ocean_tile(ptile)) return true;

  if ((typeof EXTRA_NAVALBASE !== "undefined") && tile_has_extra(ptile, EXTRA_NAVALBASE)) return true;
  if (pclass == "Air") return true;
  if (pclass == "AirProtect") return true;
  if (pclass == "AirPillage") return true;
  if (pclass == "Air_High_Altitude") return true;
  if (pclass == "Balloon") return true;
  if (pclass == "Helicopter") return true;
  if (pclass == "Missile") return true;

  if (pclass.includes("Land")) {
    if (is_ocean_tile(ptile)) return false;
  }

  // currently decided it can unload in airbase also, below.
  //if (pclass == "Bomb") return false; // only allowed in city, handled above.

  if (!quay_rules) {
    if (tile_has_river(ptile)) return false;
    return true;
  }
  // AG onward:
  if ( (tclass.rule_name == "Helicopter" || tclass.rule_name.startsWith("Air"))
        && (pclass.includes("Land") || pclass == "Bomb") ) {
    // NB:Land could only be on a Transport Helicopter or Airplane utype.
    if (ttype.name == "Cargo Plane" && ptype.name == "Paratroopers") return true;
    if (!tile_has_extra(ptile, EXTRA_AIRBASE)) return false;
    return true;
    /* could also unload in city and naval base -- already checked above */
  }
  // Brava onward:
  if (tclass.rule_name == "LandRail" || (ttype.name == "Mechanized Infantry")
      || tclass.rule_name == "LandRoad") { // Foot soldiers can deboard from Train/Truck on any Base or Quay.
    if (tile_has_extra(ptile, EXTRA_AIRBASE)) return true;
    if (quay_rules && tile_has_extra(ptile, EXTRA_QUAY)) return true;
    if (typeof EXTRA_FORT !== 'undefined' && tile_has_extra(ptile, EXTRA_FORT)) return true;
    if (tile_has_extra(ptile, EXTRA_FORTRESS)) return true;
    if ((typeof EXTRA_CASTLE !== "undefined") && tile_has_extra(ptile, EXTRA_CASTLE)) return true;
    if ((typeof EXTRA_BUNKER !== "undefined") && tile_has_extra(ptile, EXTRA_BUNKER)) return true;
    return false;  // City already unloaded; Marines and Balloons already got off higher above.
  }
  if (tile_has_extra(ptile, EXTRA_QUAY)) return true;
  if (tile_has_river(ptile)) return false;
  if (tile_has_extra(ptile, EXTRA_CANAL)) return false;
  if (tile_has_extra(ptile, EXTRA_WATERWAY)) return false;
  return true;
}
/**************************************************************************
  This function returns TRUE if the unit_class of utype is on the list
  of "legal" cargo classes for ttype. (Each unit_type has an array of 4
  bytes which are a bitfield for (up to) 32 unit_classes which ttype is
  technically allowed to have as cargo. What we don't know is if the
  ruleset actonenablers or other mechanics prevent a given utype
  from actually boarding/embarking. Nevertheless, knowing if it's in the
  list of legal cargo classes is good info.
**************************************************************************/
function utype_is_a_cargo_class_for_ttype(ptype, ttype)
{
  const pclass_id = ptype.unit_class_id;
  let cargo_bit_val = 2 ** pclass_id;
  let cargo_array_index = 0;
  while (cargo_bit_val > 128) {
    cargo_array_index ++;
    cargo_bit_val = cargo_bit_val >> 8;
  }

/* actionenabler overrides: ptype not actionenabled to board */
  /* MP2E uclass:Land allowed on Mech.Inf; but only FootSolders and AAA are
     actionenabled */
  if (client_rules_flag[CRF_MP2_E]) {
    if (ttype.rule_name == "Mech. Inf.") {
      if (utype_has_flag(ptype, UTYF_FOOTSOLDIER)
          || ptype.name == "Anti-Aircraft Artillery") {
            return true;
          }
      else return false;
    }
  }

  return (ttype.cargo[cargo_array_index] & cargo_bit_val);
}
/**************************************************************************
  Returns FALSE iff we definitely know the unit can't load on this type
  of transporter. Returning true only means we don't know if it can't:
  The server won't tell us for sure because of actionenablers which may
  limit legal cargo from boarding. But knowing the unit CAN'T load is a
  pragmatic way to prevent long GUI lists of invalid transport candidates
  to load onto.
**************************************************************************/
function unit_could_possibly_load(punit, ptype, ttype, tclass)
{
  if (!punit || !ptype || !ttype || !tclass) return false;

  const ptype_is_valid_cargo_class =
      utype_is_a_cargo_class_for_ttype(ptype, ttype);

  // Immedately reject cargo not on the list of legal cargo classes for ttype:
  if (!ptype_is_valid_cargo_class) return false;
  /* Non-MP2 rulesets are ultra-simpleton without special exceptions to balance
     and fine-tune mechanics, exploits, etc. If utype is a legal cargo class
     for ttype, return true and we're done */
  if (!client_rules_flag[CRF_MP2]) return ptype_is_valid_cargo_class;

  //console.log("Checking "+ptype.name+" onto "+ttype.name);

  var pclass = get_unit_class_name(punit);
  var ptile = tiles[punit['tile']];
  var pcity = tile_city(ptile);
  var can_load = false;

  //console.log("   pclass=="+pclass);

  // In MP2D, only special classes can board/load without moves left:
  if (client_rules_flag[CRF_MP2_D]) {
    if (punit.movesleft <= 0) {
      if (  ptype.rule_name == "Marines"
         || pclass == "Air"
         || pclass == "AirProtect"
         || pclass == "Air_High_Altitude"
         || pclass == "Missile"
         || pclass == "Cargo"
         || pclass == "Balloon"
         || pclass == "Zeppelin"
         || pclass == "Helicopter") {

          // These classes may proceed to see if they may board
      } else {
        return false; // No other classes can board with 0 moves left.
      }
    }
    // Can't get on a Trawler if you moved this turn:
    if (pclass == "Sea" || pclass == "Submarine") {
      if (unit_has_moved(punit)) return false;
    }
  }

  // Transported units can't swap transports except under some conditions:
  // TO DO: when actionenabler_load is in server, we can put all this in game.ruleset actionenablers.
  if (punit['transported']) {
    if (pclass.includes("Bomb")) {
      if (!pcity && !tile_has_extra(ptile, EXTRA_AIRBASE))
      return false; // No bomb-swapping in mid-air or beaming-up to Bomber from a truck or train!
    }

    if (client_rules_flag[CRF_MP2_E]) {
      // Passenger Move cost handles everything except Bombs. No complex rules!!
    }
    else if ( (pclass.includes("Land") || pclass=="Cargo") && punit['transported']) {

      var from_unit  = units[punit['transported_by']]; // unit currently transporting the cargo who wants to swap transports
      var from_class = get_unit_class(from_unit);      // unit_class of the transport currently transporting the cargo
      var from_type = unit_type(from_unit);

      // Can "transport swap" where 1) unloading then loading again is legal anyway (cities, naval bases, quays) ...
      if (pcity) can_load = true;
      else if (unit_can_deboard(punit)) can_load = true; // When deboarding is legal, don't force micro-managing an extra step to unload.
      //commented out: e.g., Riflemen can't necessarily get off a Heli on a Quay.
      //else if (typeof EXTRA_NAVALBASE !== undefined && tile_has_extra(EXTRA_NAVALBASE)) can_load = true;
      //else if (client_rules_flag[CRF_EXTRA_QUAY] && tile_has_extra(EXTRA_QUAY)) can_load=true;
      // ... 2) in ships who have neither moved more than 4 moves NOR moved more than half their moves;
      else if (from_class.rule_name == "Trireme"
            || from_class.rule_name == "RiverShip"
            || from_class.rule_name == "Sea"
            || from_class.rule_name == "Boat")
      {
          var from_unit_move_rate = from_type['move_rate']; // get base move_rate of transporter
          // MP2 and up, adjust move rates for Lighthouse and Nuclear Power:
          if (client_rules_flag[CRF_MP2]) {
            if (player_has_wonder(unit_owner(from_unit).playerno, improvement_id_by_name(B_LIGHTHOUSE))) {
              from_unit_move_rate += 2*SINGLE_MOVE;
            }
            if ((player_invention_state(unit_owner(from_unit), tech_id_by_name('Nuclear Power')) == TECH_KNOWN)) {
              from_unit_move_rate += 2*SINGLE_MOVE;
            }
          } // end check for: Lighthouse / Nuclear Power

          // if unit has used no more than 4 moves...
          if (from_unit.movesleft >= from_unit_move_rate - 4*SINGLE_MOVE ) {
            // ...AND unit has half moves left or more:
            if (from_unit.movesleft >= from_unit_move_rate/2) {
              can_load = true;
            }
          }
      }
      // Every other scenario of transport-swapping Land/Cargo class is not allowed: hinder double-move exploit).
      if (!can_load) return false; // Must unload from current transport first.
    }
  }

  //////////// End of handling for already-transported units doing a transport-swap ///////////////////////

/**************************************************************************************************************************
 * LARGE CHUNKS OF THE CODE BELOW IS RENDERED REDUNDANT BY THE ADDITION OF utype_is_a_cargo_class_for_ttype(ptype, ttype),
 * which is infinitely better than immense logic cascades trying to handle every case with hard-coding. So it's
 * commented as of now (1.Oct.2022) and slated for deletion in 6 months after we discover we're bug free and everything
 * works great.
 * ********************************************************************************************************************** */

  // Disqualify all units who can never be cargo.
/* Should be handled by utype is legal cargo check at top.
  if (pclass == "Sea" ||
      pclass == "RiverShip" ||
      pclass == "Submarine" ||
      pclass == "Trireme" ||
      // 👆🏻 ships, non-ships 👇🏻
      pclass == "LandImmobile" ||
      pclass == "LandRail" ||
      pclass == "Space") {
      // Trawler is exception who can "rescue tug" sea units.
      if (ttype.name == "Trawler") {
        if (pclass != "LandRail" && pclass != "Space" && pclass !="LandImmobile") {
          return true;
        }
      }
      return false;
  }
*/

// Disqualify all units who can never be transports
/* Should be handled by utype is legal cargo check at top.
  if (ttype.transport_capacity <= 0)
    return false;
*/

/* Should be handled by utype is legal cargo check at top.
  if (pclass == "Cargo") {
    if (ptype.rule_name=="Freight") {
      if (tclass.rule_name != "LandRail"
          && tclass.rule_name != "LandRoad"
          && ttype.name != "Caravel"
          && ttype.name != "Galleon"
          && ttype.name != "Galley"
          && ttype.name != "Trireme"
          && ttype.name != "Cargo Ship"
          && ttype.name != "Airplane"
          && ttype.name != "Transport") return false;
    } else { // the "Goods" unit which is also "Cargo" class:
      if (ttype.name != "Galleon"
          && ttype.name != "Airplane"
          && ttype.name != "Transport"
          && ttype.name != "Tribesmen"
          // All commerce units can carry Cargo class units, except...
          && !utype_has_flag(ttype, UTYF_TRADEROUTE))
        return false;
        // ...Cargo class units can't carry themselves.
      if (tclass.rule_name == "Cargo") return false;
    }
  }
*/

/* Should be handled by utype is legal cargo check at top.
  else if (pclass == "Bomb") {
    if (!ttype.name.includes("Bomber")
        && tclass.rule_name != "LandRail"
        && tclass.rule_name != "LandRoad" ) return false;
    if (ttype.cargo[0]==0) return false; // any "Bomber" who can't carry bombs.
  }
  */
   /* Should be handled by utype is legal cargo check at top.
  else if (pclass == "Bomb2") { // Conventional Bombs can't use land transport because we don't allow "flying trucks" to do bombing raids.
    if (!ttype.name.includes("Bomber")) return false;
    if (ttype.cargo[0]==0) return false; // any "Bomber" who can't carry bombs.
  }
*/

/* Should be handled by utype is legal cargo check at top.
  else if (pclass == "Missile") {
    if (ttype.name=="Missile Destroyer" ||
        ttype.name=="AEGIS Cruiser" ||
        (tclass.rule_name=="Submarine" && !client_rules_flag[CRF_MP2_D]) ||
        ttype.name=="Missile Submarine" ||
        ttype.name=="Mobile SAM" ||
        ttype.name.includes("Carrier")) {
          //starting in MP2D missiles must load in a city or be a transport swap
          if (client_rules_flag[CRF_MP2_D]) {
            if (pcity) return true;
            else if (can_load) return true;
            else return false;
          }
          //pre-MP2D: missiles can board on the qualifying transport types above
          return true;
        }
    //the transport type is one who can't carry missiles:
    return false;
  }
*/

  if (pclass == "Missile") {
    // MP2E Missiles are nice and simple:
    if (client_rules_flag[CRF_MP2_E]) {
      if (pcity) return true;
      // Any 'base' type as defined by no stack death:
      if (tile_has_extra(ptile,EXTRA_) //hideout
         || tile_has_extra(ptile,EXTRA_FORT)
         || tile_has_extra(ptile,EXTRA_FORTRESS)
         || tile_has_extra(ptile,EXTRA_NAVALBASE)
         || tile_has_extra(ptile,EXTRA_CASTLE)
         || tile_has_extra(ptile,EXTRA_BUNKER)
         || tile_has_extra(ptile,EXTRA_AIRBASE)
         || tile_has_extra(ptile,EXTRA_RUINS)) {

        return true;
      }
      return false;
    }
    // MP2D Missiles can only board in a city or a transport swap at sea.
    else if (client_rules_flag[CRF_MP2_D]) {
      if (pcity) return true;
      else if (can_load) return true;
      //else if (tile_has_extra(EXTRA_AIRBASE)) return true;
        /* TODO: Airbase is a native place for missile where it should be able to board but then you could shoot a nuke out to
         * an airbase and then board an AEGIS on a canal there who takes it to another one etc. So this waits for the
         * !unit_has_moved(missile_unit) req to be implemented here and in ruleset */
      else return false;
    }
  }


  // Land, LandNoKill, LandAirSea, LandRoad, Big Land:   (LandRail already disqualified as never cargo above.)
  else if (pclass.includes("Land")) {

/* Should be handled by utype is legal cargo check at top.
    if (tclass.rule_name == "Land") return false; // can't load on Caravans, the only Land class with cargo capacity.
    if (tclass.rule_name == "Submarine") return false;

    if (client_rules_flag[CRF_MP2_E] && ttype.name == "Mechanized Infantry") {
      if (unit_has_type_flag(punit, UTYF_FOOTSOLDIER)) return true;
      else if (ptype.name == "Anti-Aircraft Artillery") return true;
    }
*/
    // Special actionenabler rules in MP2, only slow units can use Trucks and Trains:
    if (tclass.rule_name == "LandRail" || tclass.rule_name == "LandRoad") {
      if (utype_real_base_move_rate(ptype) >= 3 * SINGLE_MOVE) return false; // Equality: units with <3 moves can use wagon/train/truck
      if (tclass.rule_name == "LandRail") {
        if (pcity) return true;
        if (utype_has_flag(ptype, UTYF_FOOTSOLDIER)) return true;
        return false;
      }
    }
    // Special rules in MP2: Airplanes can only carry diplos; Cargo Planes can only carry Foot/Diplo
    if (tclass.rule_name == "Air") {
      if (ttype.name == "Cargo Plane") {
        if (!unit_has_type_flag(punit, UTYF_FOOTSOLDIER)
            &&!unit_has_type_flag(punit, UTYF_WORKERS)
            &&!unit_has_type_flag(punit, UTYF_DIPLOMAT)) {
              return false;
        }
      }
      else if (ttype.name != "Airplane" || !unit_has_type_flag(punit, UTYF_DIPLOMAT))
        return false;
      // We got here if a diplomat type is trying to board an Airplane. That's
      // currently the only legal way for "Land" to load on "Air". (MP2-AG rev2)
    }

/* Should be handled by utype is legal cargo check at top.
    if (tclass.rule_name == "AirPillage") return false;
    if (tclass.rule_name == "Air_High_Altitude") return false;
    if (ttype.name == "AEGIS Cruiser") return false;
    if (ttype.name == "Mobile SAM") return false;
    if (ttype.name == "Missile Destroyer") return false;
*/

/* Should be handled by utype is legal cargo check at top.
    if (pclass != "LandAirSea") {
      if (ttype.name.includes("Carrier")) return false;
      if (ttype.name == "Helicopter") return false; // transport heli allowed
    }
    if (pclass == "LandRoad") { // Big Land
      if (tclass.rule_name == "Helicopter") return false;
    }
*/
  }

/* Should be handled by utype is legal cargo check at top.
  else if (pclass == "Balloon") {
    if (tclass.rule_name == "LandRail") return true;
    if (tclass.rule_name == "RiverShip" && !(ttype.name == "Cargo Ship" || ttype.name == "Galleon")) return false;
    if (tclass.rule_name == "Sea" && !(ttype.name == "Transport" || ttype.name.includes("Carrier")))
      return false;
  }
*/

/* Should be handled by utype is legal cargo check at top.
  else if (pclass == "Zeppelin") {
    if (ttype.name != "Carrier" && ttype.name != "Transport" && ttype.name != "Train")
      return false;
  }
*/

/* Should be handled by utype is legal cargo check at top.
  else if (pclass.startsWith("Air") || pclass == "Helicopter") {
    if (!ttype.name.includes("Carrier")) return false;
    if (pclass == "Air_High_Altitude" && ttype.name != "Carrier") return false;
  }
*/

  //console.log("  ..."+ptype.name+" on "+ttype.name+" is LEGAL !");

  return true;
  /* TODO: should be:
  return ptype_is_valid_cargo_class */
}
/**************************************************************************
  Returns a string saying how many moves a unit has left.
**************************************************************************/
function get_unit_moves_left(punit)
{
  if (punit == null) {
    return 0;
  }
  // doesn't make unicode fraction because it's tiny unit pane label
  return "Moves:" + move_points_text(punit['movesleft'],false) + "";
}
/**************************************************************************
  Returns a string representing only the raw number for how many moves
  a unit has left.
**************************************************************************/
function unit_moves_left(punit)
{
  if (punit == null) {
    return 0;
  }
  // doesn't make unicode fraction because it's tiny tooltip
  return move_points_text(punit['movesleft'],false) + "";
}

/**************************************************************************
  Returns an amount of movement formatted for player readability.
  moves = moves expressed in total move fragments
  make_fraction = make a unicode vulgar fraction out of remainder frags?
**************************************************************************/
function move_points_text(moves, make_fraction, small)
{
  var result = "";
  if (make_fraction === undefined) make_fraction = false;

  // optional unicode slash to make fraction symbol
  var div_symbol = make_fraction ? "&#x2044;" : "/"
  var spacer = make_fraction ? "&#8203;" : " ";
  var numerator,denominator;

  if ((moves % SINGLE_MOVE) != 0) {
    // change 3/6 to 1/2, 3/9 to 1/3, etc:
    numerator = Math.floor(moves % SINGLE_MOVE);
    denominator = SINGLE_MOVE;

    var simplified_fraction = fraction_reduce(numerator, denominator);
    numerator = simplified_fraction.numerator;
    denominator = simplified_fraction.denominator;
    if (denominator == 1) { // 10079/10080 moves comes back as "1/1"
      moves = numerator * SINGLE_MOVE;
      numerator = 0;
    }

    if (Math.floor(moves / SINGLE_MOVE) > 0 && numerator>0) {
      result = "" + Math.floor(moves / SINGLE_MOVE)
               + spacer + (small?"<small>":"") + numerator
               + div_symbol + denominator+ (small?"</small>":"");
    } else if (numerator>0) {
      result = numerator + div_symbol + denominator;
    } else {
      result = Math.floor(moves / SINGLE_MOVE);
    }
  } else {
    result = Math.floor(moves / SINGLE_MOVE);
  }

  if (isNaN(moves))
     return "-";

  return result;
}

/**************************************************************************
  ...
**************************************************************************/
function unit_has_goto(punit)
{
  /* don't show goto activity for enemy units. I'm not 100% sure this is correct.  */
  if (client.conn.playing == null || punit['owner'] != client.conn.playing.playerno) {
    return false;
  }

  // patrol unit is a type of goto
  if (punit['orders_vigilant'] && punit['orders_repeat']) return true;

  // check has_orders: cancelled orders on autoexplore leaves goto_tile set
  return (punit['has_orders'] && punit['goto_tile'] != -1);
}


/**************************************************************************
  Determines the unit_anim_list for the specified unit (old and new unit).
**************************************************************************/
function update_unit_anim_list(old_unit, new_unit)
{
  var anim_tuple;
  if (old_unit == null || new_unit == null) return;
  /* unit is in same position. */
  if (new_unit['tile'] == old_unit['tile']) return;

  if (anim_units_count > anim_units_max) return;

  if (/*renderer == RENDERER_2DCANVAS &&*/ !is_unit_visible(new_unit)) return;

  if (old_unit['anim_list'] == null) old_unit['anim_list'] = [];

  if (new_unit['transported'] == true) {
    /* don't show transported units animated. */
    old_unit['anim_list'] = [];
    return;
  }

  anim_units_count += 1;
  var has_old_pos = false;
  var has_new_pos = false;
  for (var i = 0; i <  old_unit['anim_list'].length; i++) {
    anim_tuple = old_unit['anim_list'][i];
    if (anim_tuple['tile'] == old_unit['tile']) {
      has_old_pos = true;
    }
    if (anim_tuple['tile'] == new_unit['tile']) {
      has_new_pos = true;
    }
  }

  if (!has_old_pos) {
    anim_tuple = {};
    anim_tuple['tile'] = old_unit['tile'];
    anim_tuple['i'] = ANIM_STEPS;
    old_unit['anim_list'].push(anim_tuple);
  }

  if (!has_new_pos) {
    anim_tuple = {};
    anim_tuple['tile'] = new_unit['tile'];
    anim_tuple['i'] = ANIM_STEPS;
    old_unit['anim_list'].push(anim_tuple);
  }
}

/**************************************************************************
  Determines the pixel offset for the specified unit, based on the units
  anim list. This is how Freeciv-web does unit animations.
**************************************************************************/
function get_unit_anim_offset(punit)
{
  var offset = {};
/*
  if (renderer == RENDERER_WEBGL) {
    offset['x'] = 0;
    offset['y'] = 0;
    return offset;
  }
*/
  if (punit['anim_list'] != null && punit['anim_list'].length >= 2)  {
    var anim_tuple_src = punit['anim_list'][0];
    var anim_tuple_dst = punit['anim_list'][1];

    //var anim_tuple_dst = punit['anim_list'][2];
    var src_tile = index_to_tile(anim_tuple_src['tile']);
    var dst_tile = index_to_tile(anim_tuple_dst['tile']);
    var u_tile = index_to_tile(punit['tile']);

    anim_tuple_dst['i'] = anim_tuple_dst['i'] - 1;

    var i = Math.floor((anim_tuple_dst['i'] + 2 ) / 3);
   /* EXPERIMENTAL: keeps unit in centre of map even while it's moving on a GOTO.
      could be nice but conservatively not implemented for now, slightly jerky.
    if (focuslock && unit_is_only_unit_in_focus(punit)) {
      center_tile_mapcanvas(tiles[punit['anim_list'][0]['tile']]);
      // if unit is center-locked, it never has non-centered-on-tile
      //   placement on the way to the next tile:
      dst_tile = src_tile;
      u_tile = src_tile;
      i = 0;
    }
    */
    var r = map_to_gui_pos( src_tile['x'], src_tile['y']);
    var src_gx = r['gui_dx'];
    var src_gy = r['gui_dy'];

    var s = map_to_gui_pos(dst_tile['x'], dst_tile['y']);
    var dst_gx = s['gui_dx'];
    var dst_gy = s['gui_dy'];

    var t = map_to_gui_pos(u_tile['x'], u_tile['y']);
    var punit_gx = t['gui_dx'];
    var punit_gy = t['gui_dy'];

    var gui_dx = Math.floor((dst_gx - src_gx) * (i / ANIM_STEPS)) + (punit_gx - dst_gx);
    var gui_dy = Math.floor((dst_gy - src_gy) * (i / ANIM_STEPS)) + (punit_gy - dst_gy);

    if (i == 0) {
      punit['anim_list'].splice(0, 1);
      if (punit['anim_list'].length == 1) {
        punit['anim_list'].splice(0, punit['anim_list'].length);
      }
      // This will center the map on the unit EXACTLY when it finished its animation, but
      // at TC it would jerk the map all over with focuslock on every unit that finished moving,
      // unless we do some logic to make sure we only do it for our selected unit:
      if (focuslock && punit['anim_list'].length == 0) {
        if (unit_is_only_unit_in_focus(punit) ) {  // avoid centering map as non-selected moving units move around.
          center_tile_mapcanvas(unit_tile(punit));
        }
        else {}  //TODO if wanted: multiple units ordered to move at once, center on current_focus[0] only. TEST IT, was centering on alien movements too.
      }
    }

    offset['x'] = - gui_dx;
    offset['y'] = - gui_dy;
  }
  else {
    offset['x'] = 0;
    offset['y'] = 0;
    anim_units_count -= 1;
  }
  return offset;
}

/**************************************************************************
 Resets the unit anim list, every turn.
**************************************************************************/
function reset_unit_anim_list()
{
 for (var unit_id in units) {
    var punit = units[unit_id];
    punit['anim_list'] = [];
  }
  anim_units_count = 0;
}

/**************************************************************************
  Returns the name of the unit's homecity.
**************************************************************************/
function get_unit_homecity_name(punit)
{
  if (punit['homecity'] != 0 && cities[punit['homecity']] != null) {
    return decodeURIComponent(cities[punit['homecity']]['name']);
  } else {
    return null;
  }
}

/**************************************************************************
  Determines if unit is visible
**************************************************************************/
function is_unit_visible(punit)
{
  if (punit == null || punit['tile'] == null) return false;
  //if (renderer == RENDERER_WEBGL) return false;  // not supported by 3D version.

  var u_tile = index_to_tile(punit['tile']);
  var r = map_to_gui_pos(u_tile['x'], u_tile['y']);
  var unit_gui_x = r['gui_dx'];
  var unit_gui_y = r['gui_dy'];

  if (unit_gui_x < mapview['gui_x0'] || unit_gui_y < mapview['gui_y0']
      || unit_gui_x > mapview['gui_x0'] + mapview['width']
      || unit_gui_y > mapview['gui_y0'] + mapview['height']) {
    return false;
  } else {
    return true;
  }
}

/**************************************************************************
 Returns a list containing the unittype ids sorted by unittype name.
**************************************************************************/
function unittype_ids_alphabetic()
{
  var unittype_names = [];
  var unit_id;
  for (unit_id in unit_types) {
    var punit_type = unit_types[unit_id];
    unittype_names.push(punit_type['name']);
  }

  unittype_names.sort();

  var unittype_id_list = [];
  for (var n in unittype_names) {
    var unit_name = unittype_names[n];
    for (unit_id in unit_types) {
      punit_type = unit_types[unit_id];
      if (unit_name == punit_type['name']) {
        unittype_id_list.push(unit_id);
      }
    }
  }
  return unittype_id_list;
}

/**************************************************************************
 Returns a text about the unit to be shown in the city dialog, containing
 unit type name, home city, upkeep.
**************************************************************************/
function get_unit_city_info(punit, plaintext)
{
  var result = "";
  var upkeep_mode;

  // No need to show 3 upkeep types if ruleset doesn't use 3
  if (client_rules_flag[CRF_NO_UNIT_GOLD_UPKEEP]) {
      upkeep_mode=1; // Shields and Food only
  }
  else upkeep_mode=3; // F/P/G

  var ptype = unit_type(punit);

  // UNIT TYPE
  result += ptype['name'];

  if (ptype['transport_capacity']>0) result += " T"+punit['id']

  // HOME CITY, IF ANY OR KNOWN:
  if (get_unit_homecity_name(punit)) {
    result += ": "+get_unit_homecity_name(punit);
    let happy_cost = unit_happy_cost(punit);

    // UPKEEP only happens for home city units
    if (upkeep_mode == 3) {
      prior = false;
      let odata = "";
      result += "\n";
      if (punit['upkeep'][O_FOOD]) {
        result+="Food";
        odata += punit['upkeep'][O_FOOD];
        prior = true;
      }
      if (punit['upkeep'][O_GOLD]) {
        if (prior) result+= "/";
        result+="Gold";
        odata += (prior?"/":"") + punit['upkeep'][O_GOLD];
        prior = true;
      }
      if (punit['upkeep'][O_SHIELD]) {
        if (prior) result+= "/";
        result+="Shield";
        odata += (prior?"/":"") + punit['upkeep'][O_SHIELD];
        prior = true;
      }
      if (happy_cost) {
        if (prior) result+= "/";
        result+="Mad";             // MAD: "Military Agitation Disorder"
        odata += (prior?"/":"") + happy_cost;
        prior = true;
      }
      if (prior) result += ": " + odata;
    }
    else if (upkeep_mode==1) {
      result += "\nUpkeep: ";
      if (punit['upkeep'] != null) {
        let prior = false;
        if (punit['upkeep'][O_FOOD]) {
          prior = true;
          result += punit['upkeep'][O_FOOD]+"f ";
        }
        if (punit['upkeep'][O_SHIELD]) {
          result += punit['upkeep'][O_SHIELD];
          if (prior || happy_cost) result += "s";
          if (happy_cost) result += " ";
        }
        if (happy_cost) {
          result += happy_cost +"m";
        }
      }
    }
  } else if (client.conn.playing != null && punit['owner'] != client.conn.playing.playerno) {
    // Foreign unit, we don't know home city but we do know nationality and player:
    var player_id = punit['owner'];
    if (players[player_id] != null) {
      var nation_id = players[player_id]['nation'];
      result += ": "+nations[nation_id]['adjective'];
      result += "\nLeader: "+players[player_id]['name']+"";
    }
  }

  // LOCATION
  result += "\nLocation: ";
  var tile_id = punit['tile'];
  var pcity = tile_city(tiles[punit['tile']]);
  var coordinates = "{"+tiles[punit['tile']]['x']+","+tiles[punit['tile']]['y']+"}";
  if (pcity) {
    result += pcity['name']+" "+coordinates;
  }
  else if ( cities[tiles[punit['tile']]['worked']] )
  {
    if (cities[tiles[punit['tile']]['worked']]['name'])
      result += coordinates + " near "+ cities[tiles[punit['tile']]['worked']]['name'];
    else
      result += coordinates + " near unknown foreign city.";
  } else {
      result += coordinates;
  }
  // TERRITORY
  if (client.conn.playing != null && punit['owner']==client.conn.playing.playerno) {
    if (tiles[punit['tile']]['owner'] == UNCLAIMED_LAND) {
      result += "\nTerritory: Unclaimed"
    } // if not in a city, it's informative to tell you it's in your nation:
    else if (tiles[punit['tile']]['owner'] == client.conn.playing.playerno) {
      if (!pcity) result += "\nTerritory: Homeland"
      else if (pcity['owner']==client.conn.playing.playerno) result += "🛖";
      else result += "🛏️"
    }
    else if (tiles[punit['tile']]['owner'] != client.conn.playing.playerno) {
      var player_id = tiles[punit['tile']]['owner'];
      if (players[player_id] != null) {
        var nation_id = players[player_id]['nation'];
        result += "\nTerritory: "+nations[nation_id]['adjective'];
        result += " ("+players[player_id]['name']+")";
      }
    }
  }

  // ACTIVITY
  // freeciv does not have CARGO state as an activity so we have to catch it here:
  if (punit['transported_by'] != undefined && punit['transported_by'] > 0) {
    result += "\nActivity: CARGO on T"+punit['transported_by'];
  } else {  // All other cases have a unit.activity value:
    switch (punit['activity']) {
      case ACTIVITY_POLLUTION:
        result += "\nActivity: CLEANING POLLUTION";
        break;
      case ACTIVITY_MINE:
        result += "\nActivity: MINING";
        break;
      case ACTIVITY_IRRIGATE:
        result += "\nActivity: IRRIGATING";
        break;
      case ACTIVITY_FORTIFIED:
        result += "\nActivity: FORTIFIED";
        break;
      case ACTIVITY_VIGIL:
        result += "\nActivity: VIGIL";
        break;
      case ACTIVITY_FORTIFYING:
        result += "\nActivity: FORTIFYING";
        break;
      case ACTIVITY_SENTRY:
        result += "\nActivity: SENTRY";
        break;
      case ACTIVITY_PILLAGE:
        result += "\nActivity: PILLAGE";
        break;
      case ACTIVITY_GOTO:
        result += "\nActivity: GOTO";
        break;
      case ACTIVITY_EXPLORE:
        result += "\nActivity: AUTO-EXPLORE";
        break;
      case ACTIVITY_TRANSFORM:
        var ptile = tiles[punit['tile']];
        result += "\nTRANSFORMING "+terrains[ptile['terrain']]['name'];
        break;
      case ACTIVITY_FALLOUT:
        result += "\nActivity: CLEANING FALLOUT";
        break;
      case ACTIVITY_BASE:
        result += "\nActivity: BUILDING BASE";
        break;
      case ACTIVITY_GEN_ROAD:
        result += "\nActivity: BUILDING ROAD";
        break;
      case ACTIVITY_CONVERT:
        result += "\nActivity: CONVERTING";
    }
  }
  if (punit['goto_tile'] != undefined && punit['ai'] != undefined) {//FC doesn't track ACTIVITY_GOTO in all cases; catch it here
     if (punit['ai']==true) {
       result += "\nActivity: AUTO-WORKER";
     } else if (punit['goto_tile']>-1) {
       var xG = tiles[punit['goto_tile']]['x'];
       var yG = tiles[punit['goto_tile']]['y'];
       result += "\nActivity: GOTO ("+xG+","+yG+")";
     }
  }

  if (punit['activity_count']) {
    const is_2x_rules = unit_types[0].move_rate / SINGLE_MOVE; // in 2x rules, 1 Worker-Turn = 2 work-units
    var work = punit.activity_count / is_2x_rules;
    var plural = (work / ACTIVITY_FACTOR) > (1+1/SINGLE_MOVE) ? "s" : ""
    result += "\nWork Done: "
           + move_points_text(work * SINGLE_MOVE / ACTIVITY_FACTOR, true)
           + " unit"+plural;
  }

  result += "\n";  // Space for separating key stats

  //VETERAN LEVEL
  if (punit['veteran']) {
    if (ptype['veteran_levels'] > 0 ) // custom vet names
    {
      var special_name = ptype['veteran_name'][punit['veteran']];
      var n = special_name.lastIndexOf(':'); // remove junk like ?vet_rank:name
      var vet_name = special_name.substring(n + 1);
    }
    else { // standard vet names
      var vet_name = game_rules['veteran_name'][punit['veteran']];
    }
    vet_star = plaintext ? "*" : "&starf;";
    vet_name = vet_name.charAt(0).toUpperCase() + vet_name.substring(1);
    result += "\n" + vet_name + " " + vet_star.repeat(punit['veteran']);
  }

  // HEALTH
  result += "\nHealth: " + punit['hp'] + "/" + ptype['hp'];

  // MOVES LEFT
  if (client.conn.playing != null && punit['owner'] == client.conn.playing.playerno)
  { // ^ We don't know move points of non-domestic units (NaN), so only do domestic:
    result += "\nMoves: " + move_points_text(punit['movesleft'],false);
    // FUEL
    if (punit['fuel']) result += "\nFuel: "+punit['fuel'];
  }

  // CLICK INSTRUCTIONS
  if (plaintext) {
    result += "\n\n"+browser.metaKeyText+"-CLICK: help on "+ptype['name'];
  }
  else {
    result += "\n\nCLICK: see unit on map.\n\n" + browser.metaKey + "-CLICK: help on "+ptype['name'];
  }
  return result;
}

/**************************************************************************
 Returns a list of extras a unit can pillage from a tile.
 It is empty if the unit can't pillage or there's nothing to.
 Contains just EXTRA_NONE if there's something but the unit can't choose.
**************************************************************************/
function get_what_can_unit_pillage_from(punit, ptile)
{
  var i, j;
  var extra;
  var targets = [];
  if (punit == null) return targets;

  /* If no tile is given, use the one the unit is on */
  if (ptile == null) {
    ptile = index_to_tile(punit.tile);
  }

  if (terrains[ptile.terrain].pillage_time == 0) return targets;
  var unit_class = unit_classes[unit_types[punit.type].unit_class_id];

  // Abort if unit can't pillage
  if (!utype_can_do_action(unit_type(punit), ACTION_PILLAGE)) {
    if (client_rules_flag[CRF_SURGICAL_PILLAGE]) {
      var ptype = unit_type(punit);
      if (ptype['name'] != "Ground Strike Fighter"
         && ptype['name'] != "Dive Bomber"
         && ptype['name'] != "Jet Bomber"
         && ptype['name'] != "Strategic Bomber"
         && ptype['name'] != "Stealth Bomber"
         ) {
        return targets;
      }
    }
    else return targets;  // abort: unit can't pillage
  }

  var available = ptile.extras.toBitSet();
  var cannot_pillage = new BitVector([]);

  /* Get what other units are pillaging on the tile
     to avoid redundant pillage selections: */
  for (const unit_idx in Object.keys(ptile.units)) {
    const unit = ptile.units[unit_idx];

    // Don't forbid a unit from selecting its current target. They
    // might double-check from uncertainty, or the unit might want
    // to change Pillage to iPillage. Or, it might want to iPillage
    // because the other unit's pillage isn't immediate.
    if (unit==punit || unit_can_iPillage(punit)) continue;

    if (unit.activity === ACTIVITY_PILLAGE) {
      cannot_pillage.set(unit.activity_tgt);
    }
  }

  //TODO: PART 1 of 2:  remove this hack fix for this function still not working right.
  const RAIL = tile_has_extra(ptile,EXTRA_RAILROAD);
  const FORT = (typeof EXTRA_FORT !== "undefined") ? tile_has_extra(ptile,EXTRA_FORT) : false;
  const FORTRESS= tile_has_extra(ptile,EXTRA_FORTRESS);
  const NAVALBASE = (typeof EXTRA_NAVALBASE !== "undefined") ? tile_has_extra(ptile,EXTRA_NAVALBASE) : false;
  const CASTLE = (typeof EXTRA_CASTLE !== "undefined") ? tile_has_extra(ptile,EXTRA_CASTLE) : false;
  const BUNKER = (typeof EXTRA_BUNKER !== "undefined") ? tile_has_extra(ptile,EXTRA_BUNKER) : false;

  // TODO: more things to check?
  // Sure!
  // MP2-Brava+ UI convenience. Railroad reqs changed to EXTRAFLAG "Railable" instead of EXTRAS "Road",
  // in order to allow EITHER road OR seabridge as reqs. This little hack is for pure UI convenience:
  if (client_rules_flag[CRF_SEABRIDGE]) {
    extras['17'].reqs.push({'kind': 23, 'value': 16, 'range': 0, 'survives': false, 'present': true, 'quiet': false}) //road
    extras['17'].reqs.push({'kind': 23, 'value': 20, 'range': 0, 'survives': false, 'present': true, 'quiet': false}) //s-b
  }  // clean up after to prevent ever-growing array.

  /* Get what extras that are dependencies of other */
  for (i = 0; i < available.length; i++) {
    extra = extras[available[i]];
    for (j = 0; j < extra.reqs.length; j++) {
      var req = extra.reqs[j];
      if (req.kind == VUT_EXTRA && req.present == true) cannot_pillage.set(req.value);
    }
  }

  for (i = 0; i < available.length; i++) {
    extra = available[i];
    if (is_extra_removed_by(extras[extra], ERM_PILLAGE)
        && !cannot_pillage.isSet(extra)) {
      if (game_info.pillage_select) {
        //TODO: PART 2 of 2: remove when we get it working.
        /* Hack to force these from not showing */
        if (extra==EXTRA_ROAD && (RAIL)) { /*no road selectable if rail is present*/}
        else if (FORT      && extra==EXTRA_FORT      && (FORTRESS || NAVALBASE || CASTLE || BUNKER)) {}
        else if (FORTRESS  && extra==EXTRA_FORTRESS  && (CASTLE || BUNKER)) {}
        else if (NAVALBASE && extra==EXTRA_NAVALBASE && (CASTLE || BUNKER)) {}
        else { targets.push(extra); } // passed all hacky hard-coded tests, push the target.
      } else {
        targets.push(EXTRA_NONE);
        break;
      }
    }
  }

  // MP2-Brava+ clean-up.
  if (client_rules_flag[CRF_SEABRIDGE]) {
    extras['17'].reqs.pop();
    extras['17'].reqs.pop();
  }

  return targets;
}

/**************************************************************************
 Forces a unit to go along its goto path.
 current_focus[f_index]==which focused unit is getting the order
function unit_forced_goto(goto_path, f_index)
{
  var step_delay = 350; // milliseconds delay per step
  var sounds_on = sounds_enabled; // store original state of sounds_enabled

  for (step = 1; step < goto_path.length; step++) {
    setTimeout(function(step)
              { sounds_enabled = (step==1) ? sounds_on : false;
                key_unit_move_focus_index(goto_path['dir'][step], f_index);
              }.bind(this, step), ((step-1)*step_delay));
  }
  setTimeout(function() {sounds_enabled = sounds_on;},step_delay*7)
   // restore original state of sounds_enabled
}
**************************************************************************/


/**************************************************************************
 Returns the unit class name of a particular unit,
    stripped of the ?unitclass: prefix in front
**************************************************************************/
function get_unit_class_name(punit)
{
  var unit_class = unit_classes[unit_types[punit['type']]['unit_class_id']];
  return unit_class['rule_name'].replace("?unitclass:","");
}

/**************************************************************************
 Returns the unit class of a particular unit,
**************************************************************************/
function get_unit_class(punit)
{
  if (!punit) return null;

  var unit_class = unit_classes[unit_types[punit['type']]['unit_class_id']];
  return unit_class;
}

/**************************************************************************
 Returns whether a unit has one of the UCF_ flags (unit class) enumerated
  in unittype.js
 *************************************************************************/
function unit_has_class_flag(punit, flag)
{
  var unit_class = unit_classes[unit_types[punit['type']]['unit_class_id']];
  return unit_classes[unit_class['id']]['flags'].isSet(flag);
}

/**************************************************************************
 Returns whether a unit has one of the UTYF_ flags (unit type) enumerated
  in unittype.js
 *************************************************************************/
function unit_has_type_flag(punit, flag)
{
  return utype_has_flag(unit_types[punit.type], flag);
}

/**************************************************************************
 Tries to determine as accurately as possible if the unit has moved.
 TODO: server knows this can can send it in unit_info packet.
 *************************************************************************/
function unit_has_moved(punit)
{
  var ptype = unit_type(punit);

  // If unit is done moving, then yeah, it has moved.
  if (punit['done_moving']) {
    //console.log("Code 1");
    return true;
  }
  // If unit is not slowed by damage, it's a simple check for if it has
  // less than full move points:
  if (!unit_has_class_flag(punit, UCF_DAMAGE_SLOWS))
  { // min_speed is 100% so any less moves than full means it moved
    if (punit['movesleft'] < ptype['move_rate']) {
      //console.log("Code 2");
      return true;
    }
    //console.log("Code 3");
    return false; // could make false negative if it has a move bonus
  }

  // DAMAGE_SLOWS:
  // if unit has full or greater moves left, it hasn't moved
  if (punit['movesleft'] >= ptype['move_rate']) {
    //console.log("Code 4");
    return false; // potential false negative if unit has external move bonus
  }
  // DAMAGE_SLOWS unit with less than full moves left:

  // Full hp, but not full moves: this means unit has moved.
  if (punit['hp']>=ptype['hp']) {
    //console.log("Code 5");
    return true;
  }

  // Less than full moves, less than full hp. Have to look at hp*move_rate
  var health_pct = parseFloat(punit['hp']) / parseFloat(ptype['hp']);
  // Calculate "injured full moves" for this health level
  var injured_full_moves = Math.floor(parseFloat(ptype['move_rate']) * health_pct);

  //console.log("health%="+health_pct+"   inj_f_m="+injured_full_moves);

  // Unit has less moves than it should for its hp level, thus it has moved:
  if (punit['movesleft'] < injured_full_moves) {
    //console.log("Code 6");
    return true;
  }

  // Unit has equal or greater moves than we'd expect for this health level,
  // so, it hasn't moved:
  //console.log("Code 7");
  return false; // potential false negative if external move bonus in effect
}

/************************************************************************
 * Returns the special name that a unit has for its special unit attack/
 * ranged attack/bombard attack.
*************************************************************************/
function unit_get_bombard_name(punit) {
  if (!punit) return "Ranged Attack";
  return utype_get_bombard_name(unit_type(punit));
}
function utype_get_bombard_name(ptype) {
  if (!ptype) return "Ranged Attack";
  var name = unit_bombard_attack_names[ptype['rule_name']];
  if (!name) return "Ranged Attack"
  else return name;
}

/************************************************************************
 * Returns the special name that a unit has for its special iPillage
 * characteristics, if any
*************************************************************************/
function unit_get_pillage_name(punit)
{
  if (!punit) return "Pillage";
  return utype_get_pillage_name(unit_type(punit));
}
function utype_get_pillage_name(ptype)
{
  if (!ptype) return "Pillage";

  var name = ptype['sound_fight_alt'];  // key-value and name of iPillage are same.
  if (!name || name.startsWith("f_")) return "Pillage"
  else return name;
}

/************************************************************************
 * Returns true if unit can pillage AND iPillage. Helps UI decide if user
 * needs prompting for decisions where usually game decides automatically.
*************************************************************************/
function unit_has_dual_pillage_options(punit)
{
  var pstats = unit_get_extra_stats(punit);

  return (pstats.iPillage && get_unit_class_name(punit).includes("Land"));
}


/************************************************************************
 * Returns true if unit / unit_type can iPillage.
*************************************************************************/
function unit_can_iPillage(punit)
{
  return utype_can_iPillage(unit_type(punit));
}
function utype_can_iPillage(ptype)
{
  return utype_get_extra_stats(ptype).iPillage;
}

/**************************************************************************
  ************* NOTE: THIS FUNCTION HAS TO BE MAINTAINED TO BE IDENTICAL
  to the function of the same name in unittype.c
  -------------------------------------------------------------------------
 Extracts the extra_unit_stats bit_field data from the unused field
 'paratrooper_mr_sub' then packs it into nice key-object pair list.
 *************************************************************************/
function unit_get_extra_stats(punit) {
  if (!punit) return {};
  return utype_get_extra_stats(unit_type(punit));
}

/**************************************************************************
  ************* NOTE: THIS FUNCTION HAS TO BE MAINTAINED TO BE IDENTICAL
  to the function of the same name in unittype.c
  -------------------------------------------------------------------------
  Extracts the extra_unit_stats bit_field data from the unused field
 'paratrooper_mr_sub' then packs it into nice key-object pair list.
 *************************************************************************/
function utype_get_extra_stats(ptype) {
  if (!ptype) return {};

  var pstats = {};

  // Take out the bitfield and divide since server artificially
  // bumps it by SINGLE_MOVE:
  var BB = ptype['paratroopers_mr_sub'] / SINGLE_MOVE

  /* extra_unit_stats are currently embedded bits in paratroopers_mr_sub:
      if that var is being used by a real paratrooper, we must abort. */
  if (ptype['paratroopers_range'] > 0) { // a real paratrooper
    BB = 0;  // Even though it doesn't use paratroopers_mr_sub, we'll be
    // safe and just return zeroed out extra_unit_stats
  }
  // Extract bits from unused paratroopers_mr_sub field (for savegame compat)
  // FIXME: on next upgrade that breaks savegame, get this data from
  // a new and normal set of data fields.

  // Preserve a whole copy of the flags/stats:
  pstats.bit_field = BB;
  // Bit 0:
  pstats.attack_stay_fortified  =            (BB & 0b1);
  // Bit 1:  unit can instantly pillage targets
  pstats.iPillage =                          (BB & 0b10) >> 1;
  // Bits 2-4:  move cost for doing so
  pstats.iPillage_moves =              (BB & 0b00011100) >> 2;
  // Bits 5-8:  odds of success as 100-(5*x):
  pstats.iPillage_odds  =             (BB & 0b111100000) >> 5;
  // Bit 9-10:  # of targets randomly selected. 0==pinpoint selection
  pstats.iPillage_random_targets =  (BB & 0b11000000000) >> 9;
  // Bit 11-15: # of rounds of Bombard retaliation
  pstats.bombard_retaliate_rounds =
                               (BB & 0b1111100000000000) >> 11;
  // Bit 16-18: # of max attacks per turn
  pstats.max_attacks =      (BB & 0b1110000000000000000) >> 16;

  /* Adjustments of the raw encoded values to match their purpose: */

  // The iPillage_odds came as bits from 0 to 15. Each value represents reduction
  // by 5%. 15x5=75 so this gives us a range from 100% down to 25%, by fives.
  pstats.iPillage_odds = 100 - 5 * pstats.iPillage_odds;

  /* bombard_retaliate_rounds came as 5 bits with 32 possible values.
   * 0==no retaliate. bit 16=2^4=0b10000 can be reserved as a mega
   * multiplier to get values higher than 31 by sacrificing resolution
   * past 15 combat_rounds. How we choose to implement this is delayed
   * until the day we need it (and assuming we still don't use hacky
   * bit fields!))
  if (pstats.bombard_retaliate_rounds & 16) {
    pstats.bombard_retaliate_rounds *= MEGA_MULTIPLE; // for example
  } */

  return pstats;
}

/**********************************************************************//**
  Return the bombard_stats for this unit
    ************* NOTE: THIS FUNCTION HAS TO BE MAINTAINED TO BE IDENTICAL
  to the function of the same name in unittype.c
**************************************************************************/
function unit_get_bombard_stats(punit) {
  if (!punit) return {};
  return utype_get_bombard_stats(unit_type(punit));
}
/**********************************************************************//**
  Return the bombard_stats for this unit_type
  ************* NOTE: THIS FUNCTION HAS TO BE MAINTAINED TO BE IDENTICAL
  to the function of the same name in unittype.c
**************************************************************************/
function utype_get_bombard_stats(ptype)
{
  if (!ptype) return {};

  var pstats = {};

  // extract bits from unused city_size field (for savegame compat)
  // FIXME: on next upgrade that breaks savegame, get this data from
  // a new and normal set of data fields
  var BB = ptype['city_size'];

  // Preserve a copy of the bombard flags/stats:
  pstats.bit_field = BB;
  // Bit 0:      RESERVED, extra range flag (+1 range)
  pstats.bombard_extra_range =               (BB & 0b1);
  // Bit 1:      bombard_stay_fortified
  pstats.bombard_stay_fortified =           (BB & 0b10) >> 1;
  // Bits 2-7:   Move cost of bombard action
  pstats.bombard_move_cost =          (BB & 0b11111100) >> 2;
  // Bits 8-10:  Max targets exposed on tile (0==all)
  pstats.bombard_primary_targets = (BB & 0b11100000000) >> 8;
  // Bits 11-13: Max # of kills possible on primary targets (0==none)
  pstats.bombard_primary_kills =(BB & 0b11100000000000) >> 11;
  // Bits 14-19: bombard_atk_mod
  /* How to get the most out of 6 bits?
  For positive values, each unit is worth +25%, taking us up to 31*25 = +775% or 8.75x
  For negative values, each unit is worth -3%, taking us down to 31*-3 = -93%
  */
  pstats.bombard_atk_mod= (BB & 0b01111100000000000000) >> 14;
  if /* signed bit */     (BB & 0b10000000000000000000)
    pstats.bombard_atk_mod *= -3;
  else pstats.bombard_atk_mod *= 25;

  /* RESERVED for future use, see .h file for explanations
  pstats.bombard_collateral_targets = 0;
  pstats.bombard_collateral_kills = 0;
  pstats.bombard_collateral_rate_reduce = 0;
  pstats.bombard_collateral_atk_mod = 0;
  pstats.bombard_fortified_def_mod = 0;
  pstats.bombard_rate_range_mod = 0;
  pstats.bombard_atk_range_mod = 0;
  */
  return pstats;
}



/**********************************************************************//**
 Get a scaled national flag based on nationality of a certain unit
**************************************************************************/
function unit_get_flag_image(punit, height)
{
  var tag = nations[players[punit['owner']]['nation']]['graphic_str']
  var civ_flag_url = "";
  var image_element = "";

  if (!nations[players[punit['owner']]['nation']]['customized'] ) {
    civ_flag_url += "/images/flags/" + tag + "-web" + fullsize_flag_extension;

    image_element = "<img "
                  + "class='v' "  // vertical align center
                  + "src='" + civ_flag_url + "' "
                  + "title='"+nations[players[punit['owner']]['nation']]['adjective']+"' "
                  + "style='height:"+height+"px;'"
                  + ">";
    return image_element;
  }
  return "";  // no support for custom user flags at present
}

/**********************************************************************//**
 Get an html insertable national shield for nationality of a certain unit
**************************************************************************/
function unit_get_shield_image(punit)
{
  var owner_id = punit['owner'];
  var owner = players[owner_id];
  var nation_id = owner['nation'];
  var nation = nations[nation_id];

  return get_html_nation_shield_sprite(nation);
}
