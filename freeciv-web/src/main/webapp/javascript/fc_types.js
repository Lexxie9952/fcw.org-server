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

var TRUE = true;
var FALSE = false;

var TRI_NO = 0;
var TRI_YES = 1;
var TRI_MAYBE = 2;

var MAX_NUM_ITEMS = 200;
var MAX_NUM_ADVANCES = 250;
var MAX_NUM_UNITS = 250;
var MAX_NUM_BUILDINGS = 200;
var MAX_EXTRA_TYPES = 128;
var MAX_LEN_NAME = 48;
var MAX_LEN_CITYNAME = 60;

const UNCLAIMED_LAND = 255;

var FC_INFINITY = (1000 * 1000 * 1000);

const CONNECT_ACTION_ILLEGAL = -1;

var ACTIVITY_IDLE = 0;
var ACTIVITY_POLLUTION = 1;
var ACTIVITY_MINE = 3;
var ACTIVITY_IRRIGATE = 4;
var ACTIVITY_FORTIFIED = 5;
var ACTIVITY_SENTRY = 7;
var ACTIVITY_PILLAGE = 9;
var ACTIVITY_GOTO = 10;
var ACTIVITY_EXPLORE = 11;
var ACTIVITY_TRANSFORM = 12;
var ACTIVITY_UNUSED = 13; 
var ACTIVITY_VIGIL = 13; // not unused anymore!
var ACTIVITY_FORTIFYING = 15;
var ACTIVITY_FALLOUT = 16;
var ACTIVITY_BASE = 18;			/* building base */
var ACTIVITY_GEN_ROAD = 19;
var ACTIVITY_CONVERT = 20;
var ACTIVITY_CULTIVATE = 21;
var ACTIVITY_PLANT = 22;
var ACTIVITY_LAST = 23;   /* leave this one last */

var IDENTITY_NUMBER_ZERO = 0;

/* Corresponds to the enum action_target_kind */
var ATK_CITY  = 0;
var ATK_UNIT  = 1;
var ATK_UNITS = 2;
var ATK_TILE  = 3;
var ATK_SELF  = 4;
var ATK_COUNT = 5;

/* Corresponds to the enum action_sub_target_kind */
var ASTK_NONE = 0;
var ASTK_BUILDING = 1;
var ASTK_TECH = 2;
var ASTK_EXTRA = 3;
var ASTK_EXTRA_NOT_THERE = 4;
var ASTK_COUNT = 5;

/* Actions */
var ACTION_ESTABLISH_EMBASSY = 0;
var ACTION_ESTABLISH_EMBASSY_STAY = 1;
var ACTION_SPY_INVESTIGATE_CITY = 2;
var ACTION_INV_CITY_SPEND = 3;
var ACTION_SPY_POISON = 4;
var ACTION_SPY_POISON_ESC = 5;
var ACTION_SPY_STEAL_GOLD = 6;
var ACTION_SPY_STEAL_GOLD_ESC = 7;
var ACTION_SPY_SABOTAGE_CITY = 8;
var ACTION_SPY_SABOTAGE_CITY_ESC = 9;
var ACTION_SPY_TARGETED_SABOTAGE_CITY = 10;
var ACTION_SPY_TARGETED_SABOTAGE_CITY_ESC = 11;
var ACTION_SPY_SABOTAGE_CITY_PRODUCTION = 12;
var ACTION_SPY_SABOTAGE_CITY_PRODUCTION_ESC = 13;
var ACTION_SPY_STEAL_TECH = 14;
var ACTION_SPY_STEAL_TECH_ESC = 15;
var ACTION_SPY_TARGETED_STEAL_TECH = 16;
var ACTION_SPY_TARGETED_STEAL_TECH_ESC = 17;
var ACTION_SPY_INCITE_CITY = 18;
var ACTION_SPY_INCITE_CITY_ESC = 19;
var ACTION_TRADE_ROUTE = 20;
var ACTION_MARKETPLACE = 21;
var ACTION_HELP_WONDER = 22;
var ACTION_SPY_BRIBE_UNIT = 23;
var ACTION_SPY_SABOTAGE_UNIT = 24;
var ACTION_SPY_SABOTAGE_UNIT_ESC = 25;
var ACTION_CAPTURE_UNITS = 26;
var ACTION_FOUND_CITY = 27;
var ACTION_JOIN_CITY = 28;
var ACTION_STEAL_MAPS = 29;
var ACTION_STEAL_MAPS_ESC = 30;
var ACTION_BOMBARD = 31;
var ACTION_BOMBARD2 = 32;
var ACTION_BOMBARD3 = 33;
var ACTION_SPY_NUKE = 34;
var ACTION_SPY_NUKE_ESC = 35;
var ACTION_NUKE = 36;
var ACTION_NUKE_CITY = 37;
var ACTION_NUKE_UNITS = 38;
var ACTION_DESTROY_CITY = 39;
var ACTION_EXPEL_UNIT = 40;
var ACTION_RECYCLE_UNIT = 41;
var ACTION_DISBAND_UNIT = 42;
var ACTION_HOME_CITY = 43;
var ACTION_UPGRADE_UNIT = 44;
var ACTION_PARADROP = 45;
var ACTION_AIRLIFT = 46;
var ACTION_ATTACK = 47;
var ACTION_SUICIDE_ATTACK = 48;
var ACTION_STRIKE_BUILDING = 49;
var ACTION_STRIKE_PRODUCTION = 50;
var ACTION_CONQUER_CITY = 51;
var ACTION_CONQUER_CITY2 = 52;
var ACTION_HEAL_UNIT = 53;
var ACTION_TRANSFORM_TERRAIN = 54;
var ACTION_CULTIVATE = 55;
var ACTION_PLANT = 56;
var ACTION_PILLAGE = 57;
var ACTION_FORTIFY = 58;
var ACTION_ROAD = 59;
var ACTION_CONVERT = 60;
var ACTION_BASE = 61;
var ACTION_MINE = 62;
var ACTION_IRRIGATE = 63;
var ACTION_TRANSPORT_DEBOARD = 64;
var ACTION_TRANSPORT_UNLOAD = 65;
var ACTION_TRANSPORT_DISEMBARK1 = 66;
var ACTION_TRANSPORT_DISEMBARK2 = 67;
var ACTION_TRANSPORT_BOARD = 68;
var ACTION_TRANSPORT_EMBARK = 69;
var ACTION_SPY_SPREAD_PLAGUE = 70;
var ACTION_SPY_ATTACK = 71;
var ACTION_USER_ACTION1 = 72;
var ACTION_USER_ACTION2 = 73;
var ACTION_USER_ACTION3 = 74;
var ACTION_CLEAN_POLLUTION = 75;
var ACTION_CLEAN_FALLOUT = 76;
var ACTION_COUNT = 77;

/* The action_decision enum */
/* Doesn't need the player to decide what action to take. */
var ACT_DEC_NOTHING = 0;
/* Wants a decision because of something done to the actor. */
var ACT_DEC_PASSIVE = 1;
/* Wants a decision because of something the actor did. */
var ACT_DEC_ACTIVE = 2;

/* The kind of universals_u (value_union_type was req_source_type).
 * Used in the network protocol. */
var VUT_NONE = 0;
var VUT_ADVANCE = 1;
var VUT_GOVERNMENT = 2;
var VUT_IMPROVEMENT = 3;
var VUT_TERRAIN = 4;
var VUT_NATION = 5;
var VUT_UTYPE = 6;
var VUT_UTFLAG = 7;
var VUT_UCLASS = 8;
var VUT_UCFLAG = 9;
var VUT_OTYPE = 10;
var VUT_SPECIALIST = 11;
var VUT_MINSIZE = 12;		/* Minimum size: at city range means city size */
var VUT_AI_LEVEL = 13;		/* AI level of the player */
var VUT_TERRAINCLASS = 14;	/* More generic terrain type, currently "Land" or "Ocean" */
var VUT_MINYEAR = 15;
var VUT_TERRAINALTER = 16;      /* Terrain alterations that are possible */
var VUT_CITYTILE = 17;          /* Target tile is used by city. */
var VUT_GOOD = 18;
var VUT_TERRFLAG = 19;
var VUT_NATIONALITY = 20;
var VUT_BASEFLAG = 21;
var VUT_ROADFLAG = 22;
var VUT_EXTRA = 23;
var VUT_TECHFLAG = 24;
var VUT_ACHIEVEMENT = 25;
var VUT_DIPLREL = 26;
var VUT_MAXTILEUNITS = 27;
var VUT_STYLE = 28;
var VUT_MINCULTURE = 29;
var VUT_UNITSTATE = 30;
var VUT_MINMOVES = 31;
var VUT_MINVETERAN = 32;
var VUT_MINHP = 33;
var VUT_AGE = 34;
var VUT_NATIONGROUP = 35;
var VUT_TOPO = 36;
var VUT_IMPR_GENUS = 37;
var VUT_ACTION = 38;
var VUT_MINTECHS = 39;
var VUT_EXTRAFLAG = 40;
var VUT_MINCALFRAG = 41;
var VUT_SERVERSETTING = 42;
var VUT_COUNT = 43;             /* Keep this last. */

/* Freeciv's gui_type enum */
/* Used for options which do not belong to any gui. */
var GUI_STUB    = 0;
var GUI_GTK2    = 1;
var GUI_GTK3    = 2;
var GUI_GTK3_22 = 3;
/* GUI_SDL remains for now for keeping client options alive until
 * user has migrated them to sdl2-client */
var GUI_SDL     = 4;
var GUI_QT      = 5;
var GUI_SDL2    = 6;
var GUI_WEB     = 7;
var GUI_GTK3x   = 8;

/* Sometimes we don't know (or don't care) if some requirements for effect
 * are currently fulfilled or not. This enum tells lower level functions
 * how to handle uncertain requirements. */
var RPT_POSSIBLE = 0; /* We want to know if it is possible that effect is active */
var RPT_CERTAIN = 1;  /* We want to know if it is certain that effect is active  */

// Output Types and their Names 
const O_FOOD = 0;
const O_SHIELD = 1;
const O_TRADE = 2;
const O_GOLD = 3;
const O_LUXURY = 4;
const O_SCIENCE = 5;
const O_LAST = 6;
const O_NAME = ["Food", "Shield", "Trade", "Gold", "Luxury", "Science"];
const O_PIC = ["/images/wheat.png","/images/shield14x18.png","/images/trade.png","/images/gold.png","/images/lux.png","/images/sci.png"];

/* vision_layer enum */
var V_MAIN = 0;
var V_INVIS = 1;
var V_SUBSURFACE = 2;
var V_COUNT = 3;

/* causes for extra */
var EC_IRRIGATION = 0;
var EC_MINE = 1;
var EC_ROAD = 2;
var EC_BASE = 3;
var EC_POLLUTION = 4;
var EC_FALLOUT = 5;
var EC_HUT = 6;
var EC_APPEARANCE = 7;
var EC_RESOURCE = 8;

/* causes for extra removal */
var ERM_PILLAGE = 0;
var ERM_CLEANPOLLUTION = 1;
var ERM_CLEANFALLOUT = 2;
var ERM_DISAPPEARANCE = 3;

/* barbarian types */
var NOT_A_BARBARIAN = 0;
var LAND_BARBARIAN = 1;
var SEA_BARBARIAN = 2;
var ANIMAL_BARBARIAN = 3;
var LAND_AND_SEA_BARBARIAN = 4;

/* improvement genera */
// unknown if these exist elsewhere; but it's nasty to hard-code
// plain numbers, so these definitions are solely for FCW client to use
const GENUS_GREAT_WONDER = 0;
const GENUS_SMALL_WONDER = 1; // genus <= GENUS_SMALL_WONDER means it's a wonder
const GENUS_IMPROVEMENT = 2;
const GENUS_COINAGE = 3;
