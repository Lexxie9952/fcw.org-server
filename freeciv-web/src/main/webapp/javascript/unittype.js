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


var unit_types = {};  /* packet_ruleset_unit */
var unit_classes = {};  /* packet_ruleset_unit_class */

var U_NOT_OBSOLETED = null;

var U_LAST = MAX_NUM_UNITS;

// Unit class flags:
const UCF_TERRAIN_SPEED = 0;
const UCF_TERRAIN_DEFENSE = 1;
const UCF_DAMAGE_SLOWS = 2;
const UCF_CAN_OCCUPY_CITY = 3;
const UCF_BUILD_ANYWHERE = 4;
const UCF_UNREACHABLE = 5;
const UCF_COLLECT_RANSOM = 6;
const UCF_ZOC = 7;
const UCF_CAN_FORTIFY = 8;
const UCF_DOESNT_OCCUPY_TILE = 9;
const UCF_ATTACK_NON_NATIVE = 10;
const UCF_KILLCITIZEN = 11;
const UCF_USER_FLAG_1 = 12;
const UCF_USER_FLAG_2 = 13;
const UCF_USER_FLAG_3 = 14;
const UCF_USER_FLAG_4 = 15;
const UCF_USER_FLAG_5 = 16;
const UCF_USER_FLAG_6 = 17;
const UCF_USER_FLAG_7 = 18;
const UCF_USER_FLAG_8 = 19;
const UCF_USER_FLAG_9 = 20;
const UCF_USER_FLAG_10 = 21;
const UCF_USER_FLAG_11 = 22;
const UCF_USER_FLAG_12 = 23;
// Custom unit class flags (MP2 sequence/order; TO DO: universalize/uniform order in other rules)
const UCF_ATTACK_FROM_NON_NATIVE = UCF_USER_FLAG_1;
const UCF_MISSILE = UCF_USER_FLAG_2;
const UCF_CANPILLAGE = UCF_USER_FLAG_3
const UCF_AIRLIFTABLE = UCF_USER_FLAG_4;
const UCF_BORDERPOLICE = UCF_USER_FLAG_5;
const UCF_CARGO_RESTRAINED = UCF_USER_FLAG_6;
const UCF_WATER_VESSEL = UCF_USER_FLAG_7;
const UCF_DELAYLOAD = UCF_USER_FLAG_8;             // Fractional move points spent to load or unload this unit.
const UCF_UNLOADONCE = UCF_USER_FLAG_9;            // Loses 2/3 moves when unloaded, uses no moves to load
const UCF_NEVERTIRED = UCF_USER_FLAG_10;           // No tired attack; basically for non-land units
const UCF_NOCARRIERREFUEL = UCF_USER_FLAG_11;      // pftools.c needed-flag to not assume illegal embark on carriers for pathfinding.
// 12 IS MAX userflags for classes!

// Unit flags
const UTYF_CANT_FORTIFY = 0;              /* Unable to Fortify */
const UTYF_NOZOC = 1;                     /* Does not exert Zone of Control on enemy units */
const UTYF_IGZOC = 2;                     /* Ignores Zone of Control exerted by enemy units */
const UTYF_CIVILIAN = 3;                  /* Is a non-military unit */
const UTYF_IGTER = 4;                     /* Ignores terrain movement speed, treating all terrain as roaded */
const UTYF_ONEATTACK = 5;                 /* HEINOUS MISNOMER: Loses all movement points after making an attack */
const UTYF_FIELDUNIT = 6;                 /* Causes unhappiness in some governments merely by existing. */
const UTYF_PROVOKING = 7;                 /* SERVER autoattack: A unit will choose to attack this unit even if defending against it has better odds. */
const UTYF_NEVER_PROTECTS = 8;            /* Overrides unreachable_protects server setting for defender */
const UTYF_SETTLERS = 9;                  /* Does not include ability to found cities */
const UTYF_DIPLOMAT = 10;                 /* The most undocumented hard-coded mystery flag in Freeciv history */
const UTYF_COAST_STRICT = 11;             /* Can't leave the coast */
const UTYF_COAST = 12;                    /* Can 'refuel' at coast - meaningless if fuel value not set */
const UTYF_SHIELD2GOLD = 13;              /* Upkeep can switch from shield to gold */
const UTYF_SPY = 14;                      /* Strong in diplomatic battles */
const UTYF_ONLY_NATIVE_ATTACK = 15;       /* Cannot attack vs non-native tiles even if class can */
const UTYF_FANATIC = 16;                  /* Only Fundamentalist/Theocratic government can build these units. */
const UTYF_GAMELOSS = 17;                 /* Losing this unit means losing the game */
const UTYF_UNIQUE = 18;                   /* A player can only have one unit of this type */
const UTYF_EVAC_FIRST = 19;               /* When a transport with this unit ist lost the game rescues this type first */
const UTYF_SUPERSPY = 20;                 /* Always wins diplomatic contests */
const UTYF_NOHOME = 21;                   /* Has no homecity, this no upkeep */
const UTYF_NO_VETERAN = 22;               /* Cannot increase veteran level */
const UTYF_CITYBUSTER = 23;               /* Gets double firepower against cities */
const UTYF_NOBUILD = 24;                  /* Unit cannot be built (barb leader etc) */
const UTYF_BADWALLATTACKER = 25;          /* Firepower set to 1 when EFT_DEFEND_BONUS applies (for example, land unit attacking city with walls) */
const UTYF_BADCITYDEFENDER = 26;          /* Firepower set to 1 and attackers x2 when in city */
const UTYF_BARBARIAN_ONLY = 27;           /* Only barbarians can build this unit */
const UTYF_BEACH_LANDER = 28;             /* Unit won't lose all its movement when moving from non-native terrain to
                                           * native terrain even if slow_invasions is turned on. Also exempt from UNIVERSAL_UNLOAD effects. */
const UTYF_NEWCITY_GAMES_ONLY = 29;       /* Unit can't be built in scenarios where founding new cities is prevented. */
const UTYF_CANESCAPE = 30;                /* 50% chance to escape when killstack occours if more moves remaining than attacker */
const UTYF_CANKILLESCAPING = 31;          /* Can kill escaping units */
const UTYF_NEVER_BLOCKED = 32;            /* Overrides unreachable_protects server setting for attacker */
const UTYF_MULTISLOT = 33;                /* if server setting slot_control is ON, unit types with this flag can use extra city_build_slots*/
const UTYF_TRANSPORTDEFENDER = 34;        /* Unit can always defend while transported, even on non-native terrain  */
const UTYF_SENTRYALWAYS = 35;             /* These units always behave as sentry (e.g. fortified snipers, air reconnaissance units who
                                             can't sentry because !refuel tile, etc.) */
const UTYF_NONPROVOKEVIGIL = 36;          /* with AA_ADVANCED autoattack rulesets, these units attack non-provoking units when on vigil (except civilians) */
const UTYF_NOSTACKDEATH = 37;             /* Unit does not die in stack kill events. This means stack is not gone, so CanEscape units remain anchored to the stack. */
const UTYF_STACKANCHOR = 38;              /* StackAnchor == CanEscape units escaping stack death do not flee to other tiles.*/
const UTYF_STACKALONE = 39;

const UTYF_NONPROVOKING = 40;             /* This unit is never autoattacked */
const UTYF_PROVOKINGCLASS1 = 41;          /* Provokes class 1 */
const UTYF_PROVOKINGCLASS2 = 42;          /* Provokes class 2 */
const UTYF_PROVOKINGCLASS3 = 43;          /* Provokes class 3 */
const UTYF_ODDSATTACKCLASS1 = 44;         /* Attacks Provoking Class 1 if odds are better */
const UTYF_ODDSATTACKCLASS2 = 45;         /* Attacks Provoking Class 2 if odds are better */
const UTYF_ODDSATTACKCLASS3 = 46;         /* Attacks Provoking Class 3 if odds are better */
const UTYF_ALWAYSATTACKCLASS1 = 47;       /* Attacks Provoking Class 1 always */
const UTYF_ALWAYSATTACKCLASS2 = 48        /* Attacks Provoking Class 2 always */
const UTYF_ALWAYSATTACKCLASS3 = 49;       /* Attacks Provoking Class 3 always */

const UTYF_FREE_RIDE = 50;                /* Doesn't impart passive movement cost to passengers on transports named "Cargo Plane", if said passengers have a paradrop range > 0 */
const UTYF_ONLY_HITS_TARGETS = 51;        /* Unit only attacks defenders in a stack which are in its targets list and there's no stack kill but only a single death: use case is ABM */

const UTYF_RESERVED1 = 52;
const UTYF_RESERVED2 = 53;
const UTYF_RESERVED3 = 54;
const UTYF_RESERVED4 = 55;
const UTYF_RESERVED5 = 56;
const UTYF_RESERVED6 = 57;
const UTYF_RESERVED7 = 58;

const UTYF_USER_FLAG_1 = 59;              // Airbase: can build airbases
const UTYF_USER_FLAG_2 = 60;              // Transform: can transform terrain
const UTYF_USER_FLAG_3 = 61;              // CanRoad: Able to build roads
const UTYF_USER_FLAG_4 = 62;              // CanFortress: can build forts/fortresses
const UTYF_USER_FLAG_5 = 63;              // Bombarder (SUA)
const UTYF_USER_FLAG_6 = 64;              // AirAttacker
const UTYF_USER_FLAG_7 = 65;              // Horse
const UTYF_USER_FLAG_8 = 66;              // FootSoldier
const UTYF_USER_FLAG_9 = 67;              // Helicopter
const UTYF_USER_FLAG_10 = 68;             // Submarine
const UTYF_USER_FLAG_11 = 69;             // Unbribable
const UTYF_USER_FLAG_12 = 70;             // Traderoute
const UTYF_USER_FLAG_13 = 71;             // HelpWonder
const UTYF_USER_FLAG_14 = 72;             // Capturer
const UTYF_USER_FLAG_15 = 73;             // Capturable
const UTYF_USER_FLAG_16 = 74;             // Cities - can found cities
const UTYF_USER_FLAG_17 = 75;             // AddToCity - can add pop to city
const UTYF_USER_FLAG_18 = 76;             // Nuclear
const UTYF_USER_FLAG_19 = 87;             // Missile
const UTYF_USER_FLAG_20 = 78;             // Well-Digger
const UTYF_USER_FLAG_21 = 79;             // Infra
const UTYF_USER_FLAG_22 = 80;             // Proletarian
const UTYF_USER_FLAG_23 = 81;             // Paratroopers
const UTYF_USER_FLAG_24 = 82;             // Marines (thru MP2C), "AttackNonNative" (MP2D onward)
const UTYF_USER_FLAG_25 = 83;             // Expellable
const UTYF_USER_FLAG_26 = 84;             // AirProtector - unreachable and can protect its tile from units unable to reach it
const UTYF_USER_FLAG_27 = 85;             // CantReachAir - unable to attack air units
const UTYF_USER_FLAG_28 = 86;             // FortBuster - defending forts get no bonus, 33% attack bonus vs. Fortress
const UTYF_USER_FLAG_29 = 87;             // FortressBuster - defending fortresses get no bonus
const UTYF_USER_FLAG_30 = 88;             // AntiAir - Anti-Air bonus vs air, less effective vs Stealth
const UTYF_USER_FLAG_31 = 89;             // CanHide - can make Hideouts
const UTYF_USER_FLAG_32 = 90;             // WillNever
const UTYF_USER_FLAG_33 = 91;             // NonMilAttack - has military capacity but can enter territories with whom you're at peace
const UTYF_USER_FLAG_34 = 92;             // Cant_Pillage
const UTYF_USER_FLAG_35 = 93;             // CanClaim - can make a Tile Claim
const UTYF_USER_FLAG_36 = 94;             // CantAttack - can't do conventional attacks (usually means bombard only)
const UTYF_USER_FLAG_37 = 95;             // Workers - lets ruleset target Workers and Workers II with a single effect or actionenabler
const UTYF_USER_FLAG_38 = 96;
const UTYF_USER_FLAG_39 = 97;
const UTYF_USER_FLAG_40 = 98;             // unused , reserved for future use .....
const UTYF_USER_FLAG_41 = 99;
const UTYF_USER_FLAG_42 = 100;
const UTYF_USER_FLAG_43 = 101;
const UTYF_USER_FLAG_44 = 102;
const UTYF_USER_FLAG_45 = 103;

// ^^ ...these can be continued up to const UTYF_USER_FLAG_44 = 76;

// Custom unit flags (MP2 sequence/order; TO DO: universalize/uniform order in other rules)
const UTYF_AIRBASE = UTYF_USER_FLAG_1         // Can make Airbase
const UTYF_TRANSFORM = UTYF_USER_FLAG_2       // Can do advanced Terrain transformations
const UTYF_CANROAD = UTYF_USER_FLAG_3         // Able to build Roads
const UTYF_CANFORTRESS = UTYF_USER_FLAG_4     // Can build Forts and Fortresses
const UTYF_BOMBARDER = UTYF_USER_FLAG_5       // Can safely conduct Ranged Attacks
const UTYF_AIRATTACKER = UTYF_USER_FLAG_6     // AEGIS Cruiser has defense bonus against this unit
const UTYF_HORSE = UTYF_USER_FLAG_7           // Attack halue half vs. Pikemen. Knights defend at 3 against this unit
const UTYF_FOOTSOLDIER = UTYF_USER_FLAG_8     // Knights defend at 2 when attacked by this unit
const UTYF_HELICOPTER = UTYF_USER_FLAG_9      // Defends very badly against Fighters
const UTYF_SUBMARINE = UTYF_USER_FLAG_10      // Attack value reduced against some ships
const UTYF_UNBRIBABLE = UTYF_USER_FLAG_11     // Can't be bribed
const UTYF_TRADEROUTE = UTYF_USER_FLAG_12     // Can establish trade routes
const UTYF_HELPWONDER = UTYF_USER_FLAG_13     // Can help build a Wonder
const UTYF_CAPTURER = UTYF_USER_FLAG_14       // Can capture some enemy units
const UTYF_CAPTURABLE = UTYF_USER_FLAG_15     // Can be captured by some enemy units
const UTYF_CITIES = UTYF_USER_FLAG_16         // can build city?
const UTYF_ADDTOCITY = UTYF_USER_FLAG_17      // Can add itself to the population of a city
const UTYF_NUCLEAR = UTYF_USER_FLAG_18        // Can perform nuclear detonations
const UTYF_MISSILE = UTYF_USER_FLAG_19        // Unit is a Missile
const UTYF_WELLDIGGER = UTYF_USER_FLAG_20     // Can dig a well and irrigate tiles with no water.
const UTYF_INFRA = UTYF_USER_FLAG_21          // Can build infrastructure
const UTYF_PROLETARIAN = UTYF_USER_FLAG_22    // Controllable only by communist governments
const UTYF_PARATROOPERS = UTYF_USER_FLAG_23   // Can be paradropped from a friendly city or suitable base.
const UTYF_MARINES = UTYF_USER_FLAG_24        // Can launch attack from non-native tiles (thru MP2C)
const UTYF_NONNATIVEATTACK = UTYF_USER_FLAG_24// Can attack non-native tiles (MP2D onward) (same flag position #24 as above).
const UTYF_EXPELLABLE = UTYF_USER_FLAG_25     // Can be peacefully expelled from foreign tiles.
const UTYF_AIRPROTECTOR = UTYF_USER_FLAG_26   // Is Unreachable AND can protect its tile form units unable to attack this unit
const UTYF_CANT_REACH_AIR = UTYF_USER_FLAG_27 // Unable to attack air units.
const UTYF_FORTBUSTER = UTYF_USER_FLAG_28     // Defending Forts get no bonus. Has (33%) attack bonus vs. Fortresses
const UTYF_FORTRESSBUSTER = UTYF_USER_FLAG_29 // Defending Fortresses get no bonus.
const UTYF_ANTIAIR = UTYF_USER_FLAG_30;       // Anti-Air unit. e.g., AEGIS, AAA, Mobile SAM
const UTYF_CANHIDE = UTYF_USER_FLAG_31;       /* Can make hideouts */
const UTYF_WILLNEVER = UTYF_USER_FLAG_32;     // Doesn't auto-attack. Used in "if_attacker" reqs in game.ruleset.
const UTYF_NONMILATTACK = UTYF_USER_FLAG_33;  // NonMilAttack - can attack and enter peace waters/territory
const UTYF_CANT_PILLAGE = UTYF_USER_FLAG_34;  // CantPillage - unable to pillage tiles
const UTYF_CAN_CLAIM = UTYF_USER_FLAG_35;     // CanClaim - able to make Tile Claims
const UTYF_CANT_ATTACK = UTYF_USER_FLAG_36;   // CantAttack - unable to do conventional attacks (usually bombard only)
const UTYF_WORKERS = UTYF_USER_FLAG_37;       // Workers - allows manipulating just the class of Workers,Workers II,Engineers with single effect or actionenabler
/**********************************************************************//**
  Return true iff units of the given type can do the specified generalized
  (ruleset defined) action enabler controlled action.

  Note that a specific unit in a specific situation still may be unable to
  perform the specified action.
**************************************************************************/
function utype_can_do_action(putype, action_id)
{
  if (putype == null || putype['utype_actions'] == null) {
    console.log("utype_can_do_action(): bad unit type.");
    return false;
  } else if (action_id > ACTION_COUNT || action_id < 0) {
    console.log("utype_can_do_action(): invalid action id " + action_id);
    return false;
  } else if (action_id == ACTION_COUNT) return true;

  return putype['utype_actions'].isSet(action_id);
}

/**********************************************************************//**
  Returns the number of shields it takes to build this unit type.
  Specifically, it might be cheaper due to UNIT_BUILD_COST_PCT effect,
  which the server actually tells us but we have not yet implemented
  in effects.js (but one day might)
**************************************************************************/
/* TO DO if we import common/effects.c
function utype_build_shield_cost(pcity, punittype)
{
  var  base;
  var  owner;
  var  ptile;

  if (pcity != null) {
    owner = city_owner(pcity);
    ptile = city_tile(pcity);
  } else {
    owner = null;
    ptile = null;
  }

  base = punittype['build_cost']
  * (100 + get_unittype_bonus(owner, ptile, punittype, EFT_UNIT_BUILD_COST_PCT)) / 100;

return MAX(base * game.info.shieldbox / 100, 1);
}*/


/**************************************************************************
Fetch the unit type id by the matching name. Returns NULL if doesn't exist
**************************************************************************/
function utype_id_by_name(name)
{
  var utype = Object.entries(unit_types).filter(abc => {
    return abc[1].name == name
  })
  if (utype.length == 1) {  /* found it */
    return parseInt(utype[0][0]);
  }
  return null;
}
/**************************************************************************
Whether player can build given unit somewhere,
ignoring whether unit is obsolete and assuming the
player has a coastal city.
**************************************************************************/
function can_player_build_unit_direct(p, punittype)
{
  /* might be called on a null punittype, such as
     the non-existing type to which a unit upgrades: */
  if (!punittype) return false;

  /*if (utype_has_flag(punittype, UTYF_NUCLEAR)
      && !get_player_bonus(p, EFT_ENABLE_NUKE) > 0) {
    return FALSE;
  }*/

  /*if (utype_has_flag(punittype, UTYF_NOBUILD)) {
    return FALSE;
  }*/

  /*if (punittype->need_government
      && punittype->need_government != government_of_player(p)) {
    return FALSE;
  }*/

  if (player_invention_state(p, punittype['tech_requirement']) != TECH_KNOWN) {
    return false;
  }

  /* FIXME: add support for global advances, check for building reqs etc.*/

  return true;
}

/**************************************************************************
...
**************************************************************************/
function utype_has_class_flag(ptype, flag)
{
  return unit_classes[ptype['unit_class_id']]['flags'].isSet(flag);
}
/**************************************************************************
...
**************************************************************************/
function utype_has_flag(ptype, flag)
{
  // returns whether unit_type has UTYF type flag
  var bv = new BitVector(ptype['flags']);
  return bv.isSet(flag);
}

/**************************************************************************
...
**************************************************************************/
function get_utypes_from_tech(tech_id)
{
  var result = [];

  for (var unit_type_id in unit_types) {
    var punit_type = unit_types[unit_type_id];
    if (punit_type['tech_requirement'] == tech_id) {
      result.push(punit_type);
    }
  }
  return result;
}

/**************************************************************************
 Wrapper for getting a unit's attack strength. Do NOT access
 punit.attack_strength directly.
 *************************************************************************/
function utype_attack_power(ptype) {
  return ptype['attack_strength'] / client_rules_flag[CRF_GRANULAR_COMBAT_STRENGTH];
}
/**************************************************************************
 Wrapper for getting a unit's defense strength. Do NOT access
 punit.defense_strength directly.
 *************************************************************************/
 function utype_defense_power(ptype) {
   return ptype['defense_strength'] / client_rules_flag[CRF_GRANULAR_COMBAT_STRENGTH];
 }
/************************************************************************
 * Returns the base attack strength of a unit based on its v0 vet
 * power level.
*************************************************************************/
function utype_real_base_attack_strength(ptype) {
  // no custom power_fact means default of 100%:
  if (ptype.power_fact[0] === undefined) {
    return utype_attack_power(ptype);
  }

  var adjusted = utype_attack_power(ptype) * ptype.power_fact[0];
  // round to 3 decimals
  adjusted *= 10; // already 100x higher from power_fect, so make 1000x
  adjusted = Math.round(adjusted) / 1000;
  return adjusted;
}
/************************************************************************
 * Same as above, for base defense strength.
*************************************************************************/
function utype_real_base_defense_strength(ptype) {
  // no custom power_fact means default of 100%:
  if (ptype.power_fact[0] === undefined) {
    return utype_defense_power(ptype);
  }

  var adjusted = utype_defense_power(ptype) * ptype.power_fact[0];
  // round to 3 decimals
  adjusted *= 10; // already 100x higher from power_fect, so make 1000x
  adjusted = Math.round(adjusted) / 1000;
  return adjusted;
}

/************************************************************************
 * Returns the "real" base move rate of a unit, since v0 veteran level
 * can be used to achieve non-integer values for base movement.
 * Return value is in move_frags.
*************************************************************************/
function utype_real_base_move_rate(punit_type)
{
  var move_bonus = parseInt(punit_type['move_bonus'][0])
                 ? parseInt(punit_type['move_bonus'][0])
                 : 0;
  var move_rate  = parseInt(punit_type['move_rate']);

  return move_bonus + move_rate;
}



