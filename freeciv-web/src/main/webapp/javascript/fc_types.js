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

const TRUE = true;
const FALSE = false;

const TRI_NO = 0;
const TRI_YES = 1;
const TRI_MAYBE = 2;

const MAX_NUM_ITEMS = 200;
const MAX_NUM_ADVANCES = 250;
const MAX_NUM_UNITS = 250;
const MAX_NUM_BUILDINGS = 200;
const MAX_EXTRA_TYPES = 128;
const MAX_LEN_NAME = 48;
const MAX_LEN_CITYNAME = 50;

const UNCLAIMED_LAND = 255;

const FC_INFINITY = (1000 * 1000 * 1000);
const FC_NEG_HUGE = -2147483648

const CONNECT_ACTION_ILLEGAL = -2;

const ACTIVITY_IDLE = 0;
const ACTIVITY_POLLUTION = 1;
/* 2 == old deprecated ACTIVITY_OLD_ROAD */
const ACTIVITY_MINE = 3;
const ACTIVITY_IRRIGATE = 4;
const ACTIVITY_FORTIFIED = 5;
const ACTIVITY_SENTRY = 7;
const ACTIVITY_PILLAGE = 9;
const ACTIVITY_GOTO = 10;
const ACTIVITY_EXPLORE = 11;
const ACTIVITY_TRANSFORM = 12;
const ACTIVITY_UNUSED = 13;
const ACTIVITY_VIGIL = 13; // not unused anymore!
const ACTIVITY_FORTIFYING = 15;
const ACTIVITY_FALLOUT = 16;
const ACTIVITY_BASE = 18;			/* building base */
const ACTIVITY_GEN_ROAD = 19;
const ACTIVITY_CONVERT = 20;
const ACTIVITY_CULTIVATE = 21;
const ACTIVITY_PLANT = 22;
const ACTIVITY_LAST = 23;   /* leave this one last */

const IDENTITY_NUMBER_ZERO = 0;

/* Corresponds to the enum action_target_kind */
const ATK_CITY  = 0;
const ATK_UNIT  = 1;
const ATK_UNITS = 2;
const ATK_TILE  = 3;
const ATK_SELF  = 4;
const ATK_COUNT = 5;

/* Corresponds to the enum action_sub_target_kind */
const ASTK_NONE = 0;
const ASTK_BUILDING = 1;
const ASTK_TECH = 2;
const ASTK_EXTRA = 3;
const ASTK_EXTRA_NOT_THERE = 4;
const ASTK_COUNT = 5;

/* The unit_orders enum from unit.h */
const ORDER_MOVE = 0;
const ORDER_ACTIVITY = 1;
const ORDER_FULL_MP = 2;
const ORDER_ACTION_MOVE = 3;
const ORDER_PERFORM_ACTION = 4;
const ORDER_LAST = 5;

/* The unit_ss_data_type enum from unit.h */
const USSDT_QUEUE = 0;
const USSDT_UNQUEUE = 1;
const USSDT_BATTLE_GROUP = 2;

/* Actions */
const ACTION_ESTABLISH_EMBASSY = 0;
const ACTION_ESTABLISH_EMBASSY_STAY = 1;
const ACTION_SPY_INVESTIGATE_CITY = 2;
const ACTION_INV_CITY_SPEND = 3;
const ACTION_SPY_POISON = 4;
const ACTION_SPY_POISON_ESC = 5;
const ACTION_SPY_STEAL_GOLD = 6;
const ACTION_SPY_STEAL_GOLD_ESC = 7;
const ACTION_SPY_SABOTAGE_CITY = 8;
const ACTION_SPY_SABOTAGE_CITY_ESC = 9;
const ACTION_SPY_TARGETED_SABOTAGE_CITY = 10;
const ACTION_SPY_TARGETED_SABOTAGE_CITY_ESC = 11;
const ACTION_SPY_SABOTAGE_CITY_PRODUCTION = 12;
const ACTION_SPY_SABOTAGE_CITY_PRODUCTION_ESC = 13;
const ACTION_SPY_STEAL_TECH = 14;
const ACTION_SPY_STEAL_TECH_ESC = 15;
const ACTION_SPY_TARGETED_STEAL_TECH = 16;
const ACTION_SPY_TARGETED_STEAL_TECH_ESC = 17;
const ACTION_SPY_INCITE_CITY = 18;
const ACTION_SPY_INCITE_CITY_ESC = 19;
const ACTION_TRADE_ROUTE = 20;
const ACTION_MARKETPLACE = 21;
const ACTION_HELP_WONDER = 22;
const ACTION_SPY_BRIBE_UNIT = 23;
const ACTION_SPY_SABOTAGE_UNIT = 24;
const ACTION_SPY_SABOTAGE_UNIT_ESC = 25;
const ACTION_CAPTURE_UNITS = 26;
const ACTION_FOUND_CITY = 27;
const ACTION_JOIN_CITY = 28;
const ACTION_STEAL_MAPS = 29;
const ACTION_STEAL_MAPS_ESC = 30;
const ACTION_BOMBARD = 31;
const ACTION_BOMBARD2 = 32;
const ACTION_BOMBARD3 = 33;
const ACTION_SPY_NUKE = 34;
const ACTION_SPY_NUKE_ESC = 35;
const ACTION_NUKE = 36;
const ACTION_NUKE_CITY = 37;
const ACTION_NUKE_UNITS = 38;
const ACTION_DESTROY_CITY = 39;
const ACTION_EXPEL_UNIT = 40;
const ACTION_RECYCLE_UNIT = 41;
const ACTION_DISBAND_UNIT = 42;
const ACTION_HOME_CITY = 43;
const ACTION_UPGRADE_UNIT = 44;
const ACTION_PARADROP = 45;
const ACTION_AIRLIFT = 46;
const ACTION_ATTACK = 47;
const ACTION_SUICIDE_ATTACK = 48;
const ACTION_STRIKE_BUILDING = 49;
const ACTION_STRIKE_PRODUCTION = 50;
const ACTION_CONQUER_CITY = 51;
const ACTION_CONQUER_CITY2 = 52;
const ACTION_HEAL_UNIT = 53;
const ACTION_TRANSFORM_TERRAIN = 54;
const ACTION_CULTIVATE = 55;
const ACTION_PLANT = 56;
const ACTION_PILLAGE = 57;
const ACTION_FORTIFY = 58;
const ACTION_ROAD = 59;
const ACTION_CONVERT = 60;
const ACTION_BASE = 61;
const ACTION_MINE = 62;
const ACTION_IRRIGATE = 63;
const ACTION_TRANSPORT_DEBOARD = 64;
const ACTION_TRANSPORT_UNLOAD = 65;
const ACTION_TRANSPORT_DISEMBARK1 = 66;
const ACTION_TRANSPORT_DISEMBARK2 = 67;
const ACTION_TRANSPORT_BOARD = 68;
const ACTION_TRANSPORT_EMBARK = 69;
const ACTION_SPY_SPREAD_PLAGUE = 70;
const ACTION_SPY_ATTACK = 71;
const ACTION_USER_ACTION1 = 72;
const ACTION_USER_ACTION2 = 73;
const ACTION_USER_ACTION3 = 74;
const ACTION_CLEAN_POLLUTION = 75;
const ACTION_CLEAN_FALLOUT = 76;
const ACTION_COUNT = 77;

/* The action_decision enum */
/* Doesn't need the player to decide what action to take. */
const ACT_DEC_NOTHING = 0;
/* Wants a decision because of something done to the actor. */
const ACT_DEC_PASSIVE = 1;
/* Wants a decision because of something the actor did. */
const ACT_DEC_ACTIVE = 2;

/* The kind of universals_u (value_union_type was req_source_type).
 * Used in the network protocol. */
const VUT_NONE = 0;
const VUT_ADVANCE = 1;
const VUT_GOVERNMENT = 2;
const VUT_IMPROVEMENT = 3;
const VUT_TERRAIN = 4;
const VUT_NATION = 5;
const VUT_UTYPE = 6;
const VUT_UTFLAG = 7;
const VUT_UCLASS = 8;
const VUT_UCFLAG = 9;
const VUT_OTYPE = 10;
const VUT_SPECIALIST = 11;
const VUT_MINSIZE = 12;		/* Minimum size: at city range means city size */
const VUT_AI_LEVEL = 13;		/* AI level of the player */
const VUT_TERRAINCLASS = 14;	/* More generic terrain type, currently "Land" or "Ocean" */
const VUT_MINYEAR = 15;
const VUT_TERRAINALTER = 16;      /* Terrain alterations that are possible */
const VUT_CITYTILE = 17;          /* Target tile is used by city. */
const VUT_GOOD = 18;
const VUT_TERRFLAG = 19;
const VUT_NATIONALITY = 20;
const VUT_BASEFLAG = 21;
const VUT_ROADFLAG = 22;
const VUT_EXTRA = 23;
const VUT_TECHFLAG = 24;
const VUT_ACHIEVEMENT = 25;
const VUT_DIPLREL = 26;
const VUT_MAXTILEUNITS = 27;
const VUT_STYLE = 28;
const VUT_MINCULTURE = 29;
const VUT_UNITSTATE = 30;
const VUT_MINMOVES = 31;
const VUT_MINVETERAN = 32;
const VUT_MINHP = 33;
const VUT_AGE = 34;
const VUT_NATIONGROUP = 35;
const VUT_TOPO = 36;
const VUT_IMPR_GENUS = 37;
const VUT_ACTION = 38;
const VUT_MINTECHS = 39;
const VUT_EXTRAFLAG = 40;
const VUT_MINCALFRAG = 41;
const VUT_SERVERSETTING = 42;
const VUT_COUNT = 43;             /* Keep this last. */

/* Freeciv's gui_type enum */
/* Used for options which do not belong to any gui. */
const GUI_STUB    = 0;
const GUI_GTK2    = 1;
const GUI_GTK3    = 2;
const GUI_GTK3_22 = 3;
/* GUI_SDL remains for now for keeping client options alive until
 * user has migrated them to sdl2-client */
const GUI_SDL     = 4;
const GUI_QT      = 5;
const GUI_SDL2    = 6;
const GUI_WEB     = 7;
const GUI_GTK3x   = 8;

/* Sometimes we don't know (or don't care) if some requirements for effect
 * are currently fulfilled or not. This enum tells lower level functions
 * how to handle uncertain requirements. */
const RPT_POSSIBLE = 0; /* We want to know if it is possible that effect is active */
const RPT_CERTAIN = 1;  /* We want to know if it is certain that effect is active  */

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
const V_MAIN = 0;
const V_INVIS = 1;
const V_SUBSURFACE = 2;
const V_COUNT = 3;

/* Extra categories:
Corresponds to fc_types.h SPACE_NUM extra_category but implemented here as an array */
const EXTRA_CATEGORIES = [ "Infra", "Natural", "Nuisance", "Bonus", "Resource" ];

/* causes for extra */
const EC_IRRIGATION = 0;
const EC_MINE = 1;
const EC_ROAD = 2;
const EC_BASE = 3;
const EC_POLLUTION = 4;
const EC_FALLOUT = 5;
const EC_HUT = 6;
const EC_APPEARANCE = 7;
const EC_RESOURCE = 8;

/* causes for extra removal */
const ERM_PILLAGE = 0;
const ERM_CLEANPOLLUTION = 1;
const ERM_CLEANFALLOUT = 2;
const ERM_DISAPPEARANCE = 3;

/* barbarian types */
const NOT_A_BARBARIAN = 0;
const LAND_BARBARIAN = 1;
const SEA_BARBARIAN = 2;
const ANIMAL_BARBARIAN = 3;
const LAND_AND_SEA_BARBARIAN = 4;

/* improvement genera */
// unknown if these exist elsewhere; but it's nasty to hard-code
// plain numbers, so these definitions are solely for FCW client to use
const GENUS_GREAT_WONDER = 0;
const GENUS_SMALL_WONDER = 1; // genus <= GENUS_SMALL_WONDER means it's a wonder
const GENUS_IMPROVEMENT = 2;
const GENUS_SPECIAL = 3; // coinage and spaceship parts

const TECH_USER_1 = 32;
const TECH_SPECIAL_TECH = 32; // reserved for cul-de-sac "specialization" techs which enhance what a parent tech can do
