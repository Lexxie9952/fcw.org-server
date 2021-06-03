/***********************************************************************
 Freeciv - Copyright (C) 1996 - A Kjeldberg, L Gregersen, P Unold
   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 2, or (at your option)
   any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
***********************************************************************/

#ifdef HAVE_CONFIG_H
#include <fc_config.h>
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* utility */
#include "astring.h"
#include "fcintl.h"
#include "mem.h"
#include "rand.h"
#include "shared.h"

/* common */
#include "actions.h"
#include "ai.h"
#include "city.h"
#include "combat.h"
#include "events.h"
#include "game.h"
#include "log.h"
#include "map.h"
#include "movement.h"
#include "packets.h"
#include "player.h"
#include "research.h"
#include "specialist.h"
#include "traderoutes.h"
#include "unit.h"
#include "unitlist.h"

/* common/scriptcore */
#include "luascript_types.h"

/* server */
#include "actiontools.h"
#include "barbarian.h"
#include "citizenshand.h"
#include "citytools.h"
#include "cityturn.h"
#include "diplomats.h"
#include "diplhand.h"
#include "maphand.h"
#include "notify.h"
#include "plrhand.h"
#include "sanitycheck.h"
#include "spacerace.h"
#include "srv_main.h"
#include "techtools.h"
#include "unittools.h"

/* server/advisors */
#include "autoexplorer.h"
#include "autosettlers.h"

/* server/scripting */
#include "script_server.h"

#include "pf_tools.h"

#include "unithand.h"

/* An explanation why an action isn't enabled. */
struct ane_expl {
  /* The kind of reason why an action isn't enabled. */
  enum ane_kind kind;

  union {
    /* The city without the needed capacity- */
    struct city *capacity_city;

    /* The bad terrain in question. */
    struct terrain *no_act_terrain;

    /* The player to advice declaring war on. */
    struct player *no_war_with;

    /* The nation that can't be involved. */
    struct nation_type *no_act_nation;

    /* The unit type that can't be targeted. */
    const struct unit_type *no_tgt_utype;

    /* The action that blocks the action. */
    struct action *blocker;

    /* The required distance. */
    int distance;
  };
};

static void illegal_action(struct player *pplayer,
                           struct unit *actor,
                           action_id stopped_action,
                           struct player *tgt_player,
                           const struct tile *target_tile,
                           const struct city *target_city,
                           const struct unit *target_unit,
                           bool disturb_player,
                           const enum action_requester requester);
static bool city_add_unit(struct player *pplayer, struct unit *punit,
                          struct city *pcity, const struct action *paction);
static bool city_build(struct player *pplayer, struct unit *punit,
                       struct tile *ptile, const char *name,
                       const struct action *paction);
static bool do_unit_establish_trade(struct player *pplayer,
                                    struct unit *punit,
                                    struct city *pcity_dest,
                                    const struct action *paction);
static bool unit_do_help_build(struct player *pplayer,
                               struct unit *punit,
                               struct city *pcity_dest,
                               const struct action *paction);
static bool unit_bombard(struct unit *punit, struct tile *ptile,
                         const struct action *paction,
                         bool is_retaliation);
static bool unit_nuke(struct player *pplayer, struct unit *punit,
                      struct tile *def_tile,
                      const struct action *paction);
static bool unit_do_destroy_city(struct player *act_player,
                                 struct unit *act_unit,
                                 struct city *tgt_city,
                                 const struct action *paction);
static bool do_unit_change_homecity(struct unit *punit,
                                    struct city *pcity);
static bool do_unit_upgrade(struct player *pplayer,
                            struct unit *punit, struct city *pcity,
                            enum action_requester ordered_by);
static bool do_attack(struct unit *actor_unit, struct tile *target_tile,
                      const struct action *paction);
static bool do_unit_strike_city_building(const struct player *act_player,
                                         struct unit *act_unit,
                                         struct city *tgt_city,
                                         Impr_type_id tgt_bld_id,
                                         const struct action *paction);
static bool do_unit_conquer_city(struct player *act_player,
                                 struct unit *act_unit,
                                 struct city *tgt_city,
                                 struct action *paction);

#define NUM_BATTLE_LOSS_ADJECTIVES 44
const char battle_survivor_adjectives[NUM_BATTLE_LOSS_ADJECTIVES+1][40] = {
  "brutal", "ruthless", "vicious", "bloodthirsty",                             //  0- 3
  "savage", "harsh", "barbarous", "atrocious",                                 //  4- 7
  "unsuccessful", "inadequate", "ineffective", "mediocre",                     //  8-11
  "disrespectful", "deficient", "unimpressive", "scrappy",                     // 12-15 
  "pointless", "cheap", "pathetic", "&#8203;useless", // prevent "an useless"  // 16-19   
  "insignficant", "futile", "inept", "shabby",                                 // 20-23
  "sorry", "decrepit", "pathetic", "hopeless",                                 // 24-27 
  "effete", "weak", "pitiful", "feeble",                                       // 28-31
  "incompetent", "laughable", "puny", "worthless",                             // 32-35
  "impotent", "lame",  "wimpy", "ridiculous",                                  // 36-39   
  "amusing", "trifling", "total joke of an ", "textbook example of how not to ",// 40-43
  "ERROR"
};

#define NUM_BATTLE_WINNER_VERBS 28
const char battle_winner_verbs[NUM_BATTLE_WINNER_VERBS+1][40] = {
  // redundancy for leaning more heavily to generic/common words
  // NB: first half are for normal battles, second half are for
  // stack kills.
  "eliminated", "eliminated", "eliminated", "eliminated",
  "eliminated", "eliminated", "eliminated", "eliminated",
  "disposed of", "destroyed", "killed", "killed",
  "defeated", "killed", "defeated", "killed",
  "destroyed", "destroyed", "slaughtered", "eradicated",
  "crushed", "vanquished", "eliminated", "wiped out",
  "snuffed out", "annihilated", "exterminated", "massacred",
  "ERROR"
};


/**********************************************************************//**
  For variety, returns a battle adjective after defeating an enemy
  attack, based on hitpoints left of the survivor.
**************************************************************************/
static const char *get_battle_survivor_adjective(struct unit *psurvivor)
{
  float hp_pct = (float)psurvivor->hp / (float)unit_type_get(psurvivor)->hp;
  int range = hp_pct * NUM_BATTLE_LOSS_ADJECTIVES;
  int min_range = (range-6 > 0) ? range-6 : 0;
  range += NUM_BATTLE_LOSS_ADJECTIVES/4; // always have min. 25% range
  if (range >= NUM_BATTLE_LOSS_ADJECTIVES)
    range = NUM_BATTLE_LOSS_ADJECTIVES;
/* debug
        notify_player(unit_owner(psurvivor), NULL, E_BAD_COMMAND, ftc_server,
                  _("pct=%f, min_range=%d, range=%d, picking from %d to %d"),
                  hp_pct, min_range, range, min_range,
                  min_range+(range-min_range));
*/
  return battle_survivor_adjectives[(fc_rand(range-min_range)+min_range)];
}

/**********************************************************************//**
  For variety, returns a battle adjective after defeating an enemy
  'stack_size == 0 means, pick a generic.
  'stack_size'>= 1 means, pick a more glorious word.
**************************************************************************/
const char *get_battle_winner_verb(int stack_size)
{
  if (!stack_size)
    return battle_winner_verbs[fc_rand(NUM_BATTLE_WINNER_VERBS/2)];

  return
    battle_winner_verbs[fc_rand(NUM_BATTLE_WINNER_VERBS/2)+
                             (NUM_BATTLE_WINNER_VERBS/2)];   
}


/**********************************************************************//**
  Upgrade all units of a given type.
**************************************************************************/
void handle_unit_type_upgrade(struct player *pplayer, Unit_type_id uti)
{
  const struct unit_type *to_unittype;
  struct unit_type *from_unittype = utype_by_number(uti);
  int number_of_upgraded_units = 0;
  struct action *paction = action_by_number(ACTION_UPGRADE_UNIT);

  if (NULL == from_unittype) {
    /* Probably died or bribed. */
    log_verbose("handle_unit_type_upgrade() invalid unit type %d", uti);
    return;
  }

  to_unittype = can_upgrade_unittype(pplayer, from_unittype);
  if (!to_unittype) {
    notify_player(pplayer, NULL, E_BAD_COMMAND, ftc_server,
                  _("Illegal packet, can't upgrade %s (yet)."),
                  utype_name_translation(from_unittype));
    return;
  }

  /* 
   * Try to upgrade units. The order we upgrade in is arbitrary (if
   * the player really cared they should have done it manually). 
   */
  conn_list_do_buffer(pplayer->connections);
  unit_list_iterate(pplayer->units, punit) {
    if (unit_type_get(punit) == from_unittype) {
      struct city *pcity = tile_city(unit_tile(punit));

      if (is_action_enabled_unit_on_city(paction->id, punit, pcity)
          && unit_perform_action(pplayer, punit->id, pcity->id, 0, "",
                                 paction->id, ACT_REQ_SS_AGENT)) {
        number_of_upgraded_units++;
      } else if (UU_NO_MONEY == unit_upgrade_test(punit, FALSE)) {
        break;
      }
    }
  } unit_list_iterate_end;
  conn_list_do_unbuffer(pplayer->connections);

  /* Alert the player about what happened. */
  if (number_of_upgraded_units > 0) {
    const int cost = unit_upgrade_price(pplayer, from_unittype, to_unittype);
    notify_player(pplayer, NULL, E_UNIT_UPGRADED, ftc_server,
                  /* FIXME: plurality of number_of_upgraded_units ignored!
                   * (Plurality of unit names is messed up anyway.) */
                  /* TRANS: "2 Musketeers upgraded to Riflemen for 100 gold."
                   * Plurality is in gold (second %d), not units. */
                  PL_("&#8203;[`gold`] %d %s upgraded to %s for %d gold.",
                      "&#8203;[`gold`] %d %s upgraded to %s for %d gold.",
                      cost * number_of_upgraded_units),
                  number_of_upgraded_units,
                  utype_name_translation(from_unittype),
                  utype_name_translation(to_unittype),
                  cost * number_of_upgraded_units);
    send_player_info_c(pplayer, pplayer->connections);
  } else {
    notify_player(pplayer, NULL, E_UNIT_UPGRADED, ftc_server,
                  _("No units could be upgraded."));
  }
}

/**********************************************************************//**
  Upgrade the unit to a newer unit type.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_unit_upgrade(struct player *pplayer,
                            struct unit *punit, struct city *pcity,
                            enum action_requester ordered_by)
{
  const struct unit_type *from_unit = unit_type_get(punit);
  const struct unit_type *to_unit = can_upgrade_unittype(pplayer, from_unit);

  transform_unit(punit, to_unit, FALSE);
  send_player_info_c(pplayer, pplayer->connections);

  if (ordered_by == ACT_REQ_PLAYER) {
    int cost = unit_upgrade_price(pplayer, from_unit, to_unit);

    notify_player(pplayer, unit_tile(punit), E_UNIT_UPGRADED, ftc_server,
                  PL_("&#8203;[`gold`] %s upgraded to %s for %d gold.",
                      "&#8203;[`gold`] %s upgraded to %s for %d gold.", cost),
                  utype_name_translation(from_unit),
                  unit_link(punit),
                  cost);
  }

  return TRUE;
}

/**********************************************************************//**
  Capture all the units at pdesttile using punit.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_capture_units(struct player *pplayer,
                             struct unit *punit,
                             struct tile *pdesttile,
                             const struct action *paction)
{
  struct city *pcity;
  char capturer_link[MAX_LEN_LINK];
  const char *capturer_nation = nation_plural_for_player(pplayer);
  bv_unit_types unique_on_tile;
  const struct unit_type *act_utype;

  /* Sanity check: The actor still exists. */
  fc_assert_ret_val(pplayer, FALSE);
  fc_assert_ret_val(punit, FALSE);

  act_utype = unit_type_get(punit);

  /* Sanity check: make sure that the capture won't result in the actor
   * ending up with more than one unit of each unique unit type. */
  BV_CLR_ALL(unique_on_tile);
  unit_list_iterate(pdesttile->units, to_capture) {
    bool unique_conflict = FALSE;

    /* Check what the player already has. */
    if (utype_player_already_has_this_unique(pplayer,
                                             unit_type_get(to_capture))) {
      /* The player already has a unit of this kind. */
      unique_conflict = TRUE;
    }

    if (utype_has_flag(unit_type_get(to_capture), UTYF_UNIQUE)) {
      /* The type of the units at the tile must also be checked. Two allied
       * players can both have their unique unit at the same tile.
       * Capturing them both would give the actor two units of a kind that
       * is supposed to be unique. */

      if (BV_ISSET(unique_on_tile, utype_index(unit_type_get(to_capture)))) {
        /* There is another unit of the same kind at this tile. */
        unique_conflict = TRUE;
      } else {
        /* Remember the unit type in case another unit of the same kind is
         * encountered later. */
        BV_SET(unique_on_tile, utype_index(unit_type_get(to_capture)));
      }
    }

    if (unique_conflict) {
      log_debug("capture units: already got unique unit");
      notify_player(pplayer, pdesttile, E_UNIT_ILLEGAL_ACTION, ftc_server,
                    /* TRANS: You can only have one Leader. */
                    _("You can only have one %s."),
                    unit_link(to_capture));

      return FALSE;
    }
  } unit_list_iterate_end;

  /* N.B: unit_link() always returns the same pointer. */
  sz_strlcpy(capturer_link, unit_link(punit));

  pcity = tile_city(pdesttile);

  // First, sanity unload all units to capture so they aren't transported by null units!
  unit_list_iterate_safe(pdesttile->units, pcargo) {

    if (unit_transported(pcargo)) {
        /* Captured cargo must first be unloaded so it won't crash when its transport becomes null after capture */
        struct unit *tunit = unit_transport_get(pcargo);
        if (pcargo) {
          unit_transport_unload_send(pcargo);
        }
        else return FALSE; // shouldn't be there but failsafe to avoid crashy.

        /*TRICKERY: just create a new cargo unit of same type in the closest city.*/
        struct city *new_home_city = find_closest_city(unit_tile(punit), NULL, unit_owner(punit), FALSE,
                                FALSE, FALSE, TRUE, FALSE, NULL);
        struct unit *new_unit = NULL;
        if (new_home_city != NULL) {
          new_unit = create_unit(pplayer, new_home_city->tile, pcargo->utype, 
                            0, (game.server.homecaughtunits ? punit->homecity : IDENTITY_NUMBER_ZERO), 0);
          if (new_unit) new_unit=NULL;
          else return FALSE; // failsafe
        }
          
        notify_player(unit_owner(pcargo), pdesttile,
                    E_ENEMY_DIPLOMAT_BRIBE, ftc_server,
                    _("⚠️ Your transported %s %s %s lost when the %s ambushed %s %s."),
                    unit_name_translation(pcargo), UNIT_EMOJI(pcargo), 
                    (is_unit_plural(pcargo) ? "were" : "was"),
                    nation_plural_for_player(pplayer),
                    (is_unit_plural(pcargo) ? "their" : "its"),
                    unit_name_translation(tunit));

        // This is what we formerly did to avoid seg fault. We can revert to this for safety if needed. 
        // Don't make new unit. Award gold for booty below. Do a return FALSE; All the important data
        // gets updated & fresh, and each separate capture takes one move. Not so bad. 

        /* pplayer->economic.gold += unit_build_shield_cost_base(pcargo); 

        notify_player(pplayer, pdesttile,
                    E_ENEMY_DIPLOMAT_BRIBE, ftc_server,
                    _("&#8203;[`gold`] Captured %s cargo was taken as booty and auctioned for %d gold."),
                    unit_name_translation(pcargo),
                    unit_build_shield_cost_base(pcargo));
        *****************************************************************************/
        if (new_home_city != NULL) {
          notify_player(pplayer, pdesttile,
                      E_ENEMY_DIPLOMAT_BRIBE, ftc_server,
                      _("🎁 Captured %s %s %s confiscated as booty and taken to your nearest city, %s."),
                      unit_name_translation(pcargo),
                      UNIT_EMOJI(pcargo),
                      (is_unit_plural(pcargo) ? "were" : "was"),
                      city_link(new_home_city));
        }

        wipe_unit(pcargo, ULR_CAPTURED, pplayer);

        //return FALSE; //ultra-conservative escape to avoid seg-fault and make each confiscation take 1 move/ bring it back if bugs return.
      }
  } unit_list_iterate_safe_end;

  unit_list_iterate(pdesttile->units, to_capture) {
    struct player *uplayer = unit_owner(to_capture);
    const char *victim_link;

    unit_owner(to_capture)->score.units_lost++;
    
   
    to_capture = unit_change_owner(to_capture, pplayer,
                                   (game.server.homecaughtunits
                                    ? punit->homecity
                                    : IDENTITY_NUMBER_ZERO),
                                   ULR_CAPTURED);
    /* As unit_change_owner() currently remove the old unit and
     * replace by a new one (with a new id), we want to make link to
     * the new unit. */
    victim_link = unit_link(to_capture);

    /* Notify players */
    notify_player(pplayer, pdesttile, E_MY_DIPLOMAT_BRIBE, ftc_server,
                  /* TRANS: <unit> ... <unit> */
                  _("🎁 Your %s succeeded in capturing the %s %s."),
                  capturer_link, nation_adjective_for_player(uplayer),
                  victim_link);
    notify_player(uplayer, pdesttile,
                  E_ENEMY_DIPLOMAT_BRIBE, ftc_server,
                  /* TRANS: <unit> ... <Poles> */
                  _("⚠️ Your %s %s captured by the %s."),
                  victim_link, (is_unit_plural(to_capture) ? "were" : "was"), 
                  capturer_nation);

    /* May cause an incident */
    action_consequence_success(paction, pplayer, act_utype,
                               uplayer, /*unit_owner(to_capture), offender now owns this unit, duh!*/
                               pdesttile, victim_link);

    if (NULL != pcity) {
      /* The captured unit is in a city. Bounce it. */
      bounce_unit(to_capture, TRUE);
    }
  } unit_list_iterate_end;

  unit_did_action(punit);
  unit_forget_last_activity(punit);

  send_unit_info(NULL, punit);
  send_player_info_c(pplayer, pplayer->connections);

  return TRUE;
}

/**********************************************************************//**
  Expel the target unit to his owner's capital.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_expel_unit(struct player *pplayer,
                          struct unit *actor,
                          struct unit *target,
                          const struct action *paction)
{
  char target_link[MAX_LEN_LINK];
  struct player *uplayer;
  struct tile *target_tile;
  struct city *pcity;
  const struct unit_type *act_utype;

  /* Maybe it didn't survive the Lua call back. Why wasn't this caught by
   * the caller? Check in the code that emits the signal. */
  fc_assert_ret_val(target, FALSE);

  uplayer = unit_owner(target);

  /* A unit is supposed to have an owner. */
  fc_assert_ret_val(uplayer, FALSE);

  /* Maybe it didn't survive the Lua call back. Why wasn't this caught by
   * the caller? Check in the code that emits the signal. */
  fc_assert_ret_val(actor, FALSE);
  act_utype = unit_type_get(actor);

  /* Where is the actor player? */
  fc_assert_ret_val(pplayer, FALSE);

  target_tile = unit_tile(target);

  /* Expel the target unit to his owner's capital. */
  pcity = player_capital(uplayer);

  /* N.B: unit_link() always returns the same pointer. */
  sz_strlcpy(target_link, unit_link(target));

  if (pcity == NULL) {
    /* No where to send the expelled unit. */

    /* The price of failing an expulsion is a single move. */
    actor->moves_left = MAX(0, actor->moves_left - SINGLE_MOVE);
    send_unit_info(NULL, actor);

    /* Notify the actor player. */
    notify_player(pplayer, target_tile, E_UNIT_ACTION_FAILED, ftc_server,
                  /* TRANS: <Poles> <Spy> */
                  _("The %s don't have a capital to expel their %s to."),
                  nation_plural_for_player(uplayer), target_link);

    /* Nothing more could be done. */
    return FALSE;
  }

  /* Please review the code below and above (including the strings sent to
   * the players) before allowing expulsion to non capital cities. */
  fc_assert(is_capital(pcity));

  /* Notify everybody involved. */
  notify_player(pplayer, target_tile, E_UNIT_DID_EXPEL, ftc_server,
                /* TRANS: <Border Patrol> ... <Spy> */
                _("👢 Your %s succeeded in expelling the %s %s."),
                unit_link(actor), nation_adjective_for_player(uplayer),
                target_link);
  notify_player(uplayer, target_tile, E_UNIT_WAS_EXPELLED, ftc_server,
                /* TRANS: <unit> ... <Poles> */
                _("👢 Your %s %s expelled by the %s."),
                target_link, 
                (is_unit_plural(target) ? "were" : "was"),
                nation_plural_for_player(pplayer));

  /* Being expelled destroys all remaining movement. */
  if (!teleport_unit_to_city(target, pcity, 0, FALSE)) {
    log_error("Bug in unit expulsion: unit can't teleport.");

    return FALSE;
  }

  /* This may cause a diplomatic incident */
  action_consequence_success(paction, pplayer, act_utype, uplayer,
                             target_tile, target_link);

  /* Mission accomplished. */
  return TRUE;
}

/**********************************************************************//**
  Restore some of the target unit's hit points.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_heal_unit(struct player *act_player,
                         struct unit *act_unit,
                         struct unit *tgt_unit,
                         const struct action *paction)
{
  int healing_limit;
  int tgt_hp_max;
  struct player *tgt_player;
  struct tile *tgt_tile;
  char act_unit_link[MAX_LEN_LINK];
  char tgt_unit_link[MAX_LEN_LINK];
  const char *tgt_unit_owner;
  const struct unit_type *act_utype;

  /* Sanity checks: got all the needed input. */
  fc_assert_ret_val(act_player, FALSE);
  fc_assert_ret_val(act_unit, FALSE);
  fc_assert_ret_val(tgt_unit, FALSE);

  act_utype = unit_type_get(act_unit);

  /* The target unit can't have more HP than this. */
  tgt_hp_max = unit_type_get(tgt_unit)->hp;

  /* Sanity check: target isn't at full health and can therefore can be
   * healed. */
  fc_assert_ret_val(tgt_unit->hp < tgt_hp_max, FALSE);

  /* Fetch the target unit's owner. */
  tgt_player = unit_owner(tgt_unit);
  fc_assert_ret_val(tgt_player, FALSE);

  /* Fetch the target unit's tile. */
  tgt_tile = unit_tile(tgt_unit);
  fc_assert_ret_val(tgt_tile, FALSE);

  /* The max amount of HP that can be added. */
  healing_limit = tgt_hp_max / 4;

  /* Heal the target unit. */
  tgt_unit->hp = MIN(tgt_unit->hp + healing_limit, tgt_hp_max);
  send_unit_info(NULL, tgt_unit);

  send_unit_info(NULL, act_unit);

  /* Every call to unit_link() overwrites the previous. Two units are being
   * linked to. */
  sz_strlcpy(act_unit_link, unit_link(act_unit));
  sz_strlcpy(tgt_unit_link, unit_link(tgt_unit));

  /* Notify everybody involved. */
  if (act_player == tgt_player) {
    /* TRANS: used instead of nation adjective when the nation is
     * domestic. */
    tgt_unit_owner = _("your");
  } else {
    tgt_unit_owner = nation_adjective_for_player(unit_nationality(tgt_unit));
  }

  notify_player(act_player, tgt_tile, E_MY_UNIT_DID_HEAL, ftc_server,
                /* TRANS: If foreign: Your Leader heals Finnish Warrior.
                 * If domestic: Your Leader heals your Warrior. */
                _("🩸 Your %s heals %s %s."),
                act_unit_link, tgt_unit_owner, tgt_unit_link);

  if (act_player != tgt_player) {
    notify_player(tgt_player, tgt_tile, E_MY_UNIT_WAS_HEALED, ftc_server,
                  /* TRANS: Norwegian ... Leader ... Warrior */
                  _("🩸 %s %s heals your %s."),
                  nation_adjective_for_player(unit_nationality(act_unit)),
                  act_unit_link, tgt_unit_link);
  }

  /* This may have diplomatic consequences. */
  action_consequence_success(paction, act_player, act_utype, tgt_player,
                             tgt_tile, unit_link(tgt_unit));

  return TRUE;
}

/**********************************************************************//**
  Unload actor unit from target unit.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_unit_alight(struct player *act_player,
                           struct unit *act_unit,
                           struct unit *tgt_unit,
                           const struct action *paction)
{
  /* Unload the unit and send out info to clients. */
  unit_transport_unload_send(act_unit);

  return TRUE;
}

/**********************************************************************//**
  Have the actor unit board the target unit.

  Assumes that all checks for action legality has been done.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_unit_board(struct player *act_player,
                          struct unit *act_unit,
                          struct unit *tgt_unit,
                          const struct action *paction)
{
  if (unit_transported(act_unit)) {
    unit_transport_unload(act_unit);
  }

  /* Load the unit and send out info to clients. */
  unit_transport_load_send(act_unit, tgt_unit);

  return TRUE;
}

/**********************************************************************//**
  Unload target unit from actor unit.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_unit_unload(struct player *act_player,
                           struct unit *act_unit,
                           struct unit *tgt_unit,
                           const struct action *paction)
{
  /* Unload the unit and send out info to clients. */
  unit_transport_unload_send(tgt_unit);

  return TRUE;
}

/**********************************************************************//**
  Disembark actor unit from target unit to target tile.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_disembark(struct player *act_player,
                         struct unit *act_unit,
                         struct tile *tgt_tile,
                         const struct action *paction)
{
  int move_cost = map_move_cost_unit(&(wld.map), act_unit, tgt_tile);

  /* Sanity checks */
  fc_assert_ret_val(act_player, FALSE);
  fc_assert_ret_val(act_unit, FALSE);
  fc_assert_ret_val(tgt_tile, FALSE);
  fc_assert_ret_val(paction, FALSE);

  unit_move(act_unit, tgt_tile, move_cost, NULL, FALSE, FALSE);

  return TRUE;
}

/**********************************************************************//**
  Have the actor unit embark the target unit.

  Assumes that all checks for action legality has been done.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_unit_embark(struct player *act_player,
                           struct unit *act_unit,
                           struct unit *tgt_unit,
                           const struct action *paction)
{
  struct tile *tgt_tile;
  int move_cost;

  /* Sanity checks */
  fc_assert_ret_val(act_player, FALSE);
  fc_assert_ret_val(act_unit, FALSE);
  fc_assert_ret_val(tgt_unit, FALSE);
  fc_assert_ret_val(paction, FALSE);

  if (unit_transported(act_unit)) {
    /* Assumed to be legal. */
    unit_transport_unload(act_unit);
  }

  /* Do it. */
  tgt_tile = unit_tile(tgt_unit);
  move_cost = map_move_cost_unit(&(wld.map), act_unit, tgt_tile);
  unit_move(act_unit, tgt_tile, move_cost, tgt_unit, FALSE, FALSE);

  return TRUE;
}

/**********************************************************************//**
  Returns TRUE iff the player is able to change his diplomatic
  relationship to the other player to war.

  Note that the player can't declare war on someone he already is at war
  with.
**************************************************************************/
static bool rel_may_become_war(const struct player *pplayer,
                               const struct player *oplayer)
{
  enum diplstate_type ds;

  fc_assert_ret_val(pplayer, FALSE);
  fc_assert_ret_val(oplayer, FALSE);

  ds = player_diplstate_get(pplayer, oplayer)->type;

  /* The player can't declare war on someone he already is at war with. */
  return ds != DS_WAR
      /* The player can't declare war on a teammate or on himself. */
      && ds != DS_TEAM && pplayer != oplayer;
}

/**********************************************************************//**
  Returns the first player that may enable the specified action if war is
  declared.

  Helper for need_war_player(). Use it in stead.
**************************************************************************/
static struct player *need_war_player_hlp(const struct unit *actor,
                                          const action_id act,
                                          const struct tile *target_tile,
                                          const struct city *target_city,
                                          const struct unit *target_unit)
{
  if (action_id_get_actor_kind(act) != AAK_UNIT) {
    /* No unit can ever do this action so it isn't relevant. */
    return NULL;
  }

  if (!unit_can_do_action(actor, act)) {
    /* The unit can't do the action no matter if there is war or not. */
    return NULL;
  }

  /* Look for hard coded war requirements that can't be an action enabler
   * requirement. */
  switch ((enum gen_action)act) {
  case ACTION_BOMBARD:
  case ACTION_BOMBARD2:
  case ACTION_BOMBARD3:
  case ACTION_ATTACK:
  case ACTION_SUICIDE_ATTACK:
    /* Target is tile or unit stack but a city (or unit) can block it. */
    if (target_tile) {
      struct city *tcity;
      struct unit *tunit;

      if ((tcity = tile_city(target_tile))
          && rel_may_become_war(unit_owner(actor), city_owner(tcity))) {
        return city_owner(tcity);
      }

      if ((tunit = is_non_attack_unit_tile(target_tile, unit_owner(actor)))
          && rel_may_become_war(unit_owner(actor), unit_owner(tunit))) {
        return unit_owner(tunit);
      }
    }
    break;

  case ACTION_ESTABLISH_EMBASSY:
  case ACTION_ESTABLISH_EMBASSY_STAY:
  case ACTION_SPY_INVESTIGATE_CITY:
  case ACTION_INV_CITY_SPEND:
  case ACTION_SPY_POISON:
  case ACTION_SPY_POISON_ESC:
  case ACTION_SPY_SPREAD_PLAGUE:
  case ACTION_SPY_STEAL_GOLD:
  case ACTION_SPY_STEAL_GOLD_ESC:
  case ACTION_SPY_SABOTAGE_CITY:
  case ACTION_SPY_SABOTAGE_CITY_ESC:
  case ACTION_SPY_TARGETED_SABOTAGE_CITY:
  case ACTION_SPY_TARGETED_SABOTAGE_CITY_ESC:
  case ACTION_SPY_SABOTAGE_CITY_PRODUCTION:
  case ACTION_SPY_SABOTAGE_CITY_PRODUCTION_ESC:
  case ACTION_SPY_STEAL_TECH:
  case ACTION_SPY_STEAL_TECH_ESC:
  case ACTION_SPY_TARGETED_STEAL_TECH:
  case ACTION_SPY_TARGETED_STEAL_TECH_ESC:
  case ACTION_SPY_INCITE_CITY:
  case ACTION_SPY_INCITE_CITY_ESC:
  case ACTION_TRADE_ROUTE:
  case ACTION_MARKETPLACE:
  case ACTION_HELP_WONDER:
  case ACTION_SPY_BRIBE_UNIT:
  case ACTION_SPY_SABOTAGE_UNIT:
  case ACTION_SPY_SABOTAGE_UNIT_ESC:
  case ACTION_CAPTURE_UNITS: /* Only foreign is a hard req. */
  case ACTION_FOUND_CITY:
  case ACTION_JOIN_CITY:
  case ACTION_STEAL_MAPS:
  case ACTION_STEAL_MAPS_ESC:
  case ACTION_SPY_NUKE:
  case ACTION_SPY_NUKE_ESC:
  case ACTION_NUKE:
  case ACTION_NUKE_CITY:
  case ACTION_NUKE_UNITS:
  case ACTION_DESTROY_CITY:
  case ACTION_EXPEL_UNIT:
  case ACTION_RECYCLE_UNIT:
  case ACTION_DISBAND_UNIT:
  case ACTION_HOME_CITY:
  case ACTION_UPGRADE_UNIT:
  case ACTION_PARADROP:
  case ACTION_AIRLIFT:
  case ACTION_HEAL_UNIT:
  case ACTION_STRIKE_BUILDING:
  case ACTION_STRIKE_PRODUCTION:
  case ACTION_CONQUER_CITY:
  case ACTION_CONQUER_CITY2:
  case ACTION_TRANSFORM_TERRAIN:
  case ACTION_CULTIVATE:
  case ACTION_PLANT:
  case ACTION_PILLAGE:
  case ACTION_CLEAN_POLLUTION:
  case ACTION_CLEAN_FALLOUT:
  case ACTION_FORTIFY:
  case ACTION_CONVERT:
  case ACTION_ROAD:
  case ACTION_BASE:
  case ACTION_MINE:
  case ACTION_IRRIGATE:
  case ACTION_TRANSPORT_ALIGHT:
  case ACTION_TRANSPORT_UNLOAD:
  case ACTION_TRANSPORT_DISEMBARK1:
  case ACTION_TRANSPORT_DISEMBARK2:
  case ACTION_TRANSPORT_BOARD:
  case ACTION_TRANSPORT_EMBARK:
  case ACTION_SPY_ATTACK:
  case ACTION_USER_ACTION1:
  case ACTION_USER_ACTION2:
  case ACTION_USER_ACTION3:
    /* No special help. */
    break;
  case ACTION_COUNT:
    /* Invalid. */
    fc_assert(act != ACTION_COUNT);
    break;
  }

  /* Look for war requirements from the action enablers. */
  if (can_utype_do_act_if_tgt_diplrel(unit_type_get(actor),
                                      act, DS_WAR, FALSE)) {
    /* The unit can do the action even if there isn't war. */
    return NULL;
  }

  switch (action_id_get_target_kind(act)) {
  case ATK_CITY:
    if (target_city == NULL) {
      /* No target city. */
      return NULL;
    }

    if (rel_may_become_war(unit_owner(actor), city_owner(target_city))) {
      return city_owner(target_city);
    }
    break;
  case ATK_UNIT:
    if (target_unit == NULL) {
      /* No target unit. */
      return NULL;
    }

    if (rel_may_become_war(unit_owner(actor), unit_owner(target_unit))) {
      return unit_owner(target_unit);
    }
    break;
  case ATK_UNITS:
    if (target_tile == NULL) {
      /* No target units since no target tile. */
      return NULL;
    }

    unit_list_iterate(target_tile->units, tunit) {
      if (rel_may_become_war(unit_owner(actor), unit_owner(tunit))) {
        return unit_owner(tunit);
      }
    } unit_list_iterate_end;
    break;
  case ATK_TILE:
    if (target_tile == NULL) {
      /* No target tile. */
      return NULL;
    }

    if (rel_may_become_war(unit_owner(actor), tile_owner(target_tile))) {
      return tile_owner(target_tile);
    }
    break;
  case ATK_SELF:
    /* Can't declare war on itself. */
    return NULL;
    break;
  case ATK_COUNT:
    /* Nothing to check. */
    fc_assert(action_id_get_target_kind(act) != ATK_COUNT);
    return NULL;
  }

  /* Declaring war won't enable the specified action. */
  return NULL;
}

/**********************************************************************//**
  Returns the first player that may enable the specified action if war is
  declared. If the specified action is ACTION_ANY the first player that
  may enable any action at all if war is declared will be returned.
**************************************************************************/
static struct player *need_war_player(const struct unit *actor,
                                      const action_id act_id,
                                      const struct tile *target_tile,
                                      const struct city *target_city,
                                      const struct unit *target_unit)
{
  if (act_id == ACTION_ANY) {
    /* Any action at all will do. */
    action_iterate(act) {
      struct player *war_player;

      war_player = need_war_player_hlp(actor, act,
                                       target_tile, target_city,
                                       target_unit);

      if (war_player != NULL) {
        /* Declaring war on this player may enable this action. */
        return war_player;
      }
    } action_iterate_end;

    /* No action at all may be enabled by declaring war. */
    return NULL;
  } else {
    /* Look for the specified action. */
    return need_war_player_hlp(actor, act_id,
                               target_tile, target_city,
                               target_unit);
  }
}

/**********************************************************************//**
  Returns TRUE iff the specified terrain type blocks the specified action.

  If the "action" is ACTION_ANY all actions are checked.
**************************************************************************/
static bool does_terrain_block_action(const action_id act_id,
                                      bool is_target,
                                      struct unit *actor_unit,
                                      struct terrain *pterrain)
{
  if (act_id == ACTION_ANY) {
    /* Any action is OK. */
    action_iterate(alt_act) {
      if (utype_can_do_action(unit_type_get(actor_unit), alt_act)
          && !does_terrain_block_action(alt_act, is_target,
                                        actor_unit, pterrain)) {
        /* Only one action has to be possible. */
        return FALSE;
      }
    } action_iterate_end;

    /* No action enabled. */
    return TRUE;
  }

  /* ACTION_ANY is handled above. */
  fc_assert_ret_val(action_id_exists(act_id), FALSE);

  action_enabler_list_iterate(action_enablers_for_action(act_id),
                              enabler) {
    if (requirement_fulfilled_by_terrain(pterrain,
            (is_target ? &enabler->target_reqs : &enabler->actor_reqs))
        && requirement_fulfilled_by_unit_type(unit_type_get(actor_unit),
                                              &enabler->actor_reqs)) {
      /* This terrain kind doesn't block this action enabler. */
      return FALSE;
    }
  } action_enabler_list_iterate_end;

  return TRUE;
}

/**********************************************************************//**
  Returns TRUE iff the specified nation blocks the specified action.

  If the "action" is ACTION_ANY all actions are checked.
**************************************************************************/
static bool does_nation_block_action(const action_id act_id,
                                     bool is_target,
                                     struct unit *actor_unit,
                                     struct nation_type *pnation)
{
  if (act_id == ACTION_ANY) {
    /* Any action is OK. */
    action_iterate(alt_act) {
      if (utype_can_do_action(unit_type_get(actor_unit), alt_act)
          && !does_nation_block_action(alt_act, is_target,
                                       actor_unit, pnation)) {
        /* Only one action has to be possible. */
        return FALSE;
      }
    } action_iterate_end;

    /* No action enabled. */
    return TRUE;
  }

  /* ACTION_ANY is handled above. */
  fc_assert_ret_val(action_id_exists(act_id), FALSE);

  action_enabler_list_iterate(action_enablers_for_action(act_id),
                              enabler) {
    if (requirement_fulfilled_by_nation(pnation,
                                       (is_target ? &enabler->target_reqs
                                                  : &enabler->actor_reqs))
        && requirement_fulfilled_by_unit_type(unit_type_get(actor_unit),
                                              &enabler->actor_reqs)) {
      /* This nation doesn't block this action enabler. */
      return FALSE;
    }
  } action_enabler_list_iterate_end;

  return TRUE;
}

/**********************************************************************//**
  Returns an explaination why punit can't perform the specified action
  based on the current game state.
**************************************************************************/
static struct ane_expl *expl_act_not_enabl(struct unit *punit,
                                           const action_id act_id,
                                           const struct tile *target_tile,
                                           const struct city *target_city,
                                           const struct unit *target_unit)
{
  struct player *must_war_player;
  struct action *blocker;
  struct player *tgt_player = NULL;
  struct ane_expl *explnat = fc_malloc(sizeof(struct ane_expl));
  bool can_exist = can_unit_exist_at_tile(&(wld.map), punit, unit_tile(punit));
  bool on_native = is_native_tile(unit_type_get(punit), unit_tile(punit));
  int action_custom;

  /* Not know yet. (Initialize before the below check.) */
  explnat->kind = ANEK_UNKNOWN;

  if (act_id != ACTION_ANY) {
    /* A specific action should have a suitable target. */
    switch (action_id_get_target_kind(act_id)) {
    case ATK_CITY:
      if (target_city == NULL) {
        explnat->kind = ANEK_MISSING_TARGET;
      }
      break;
    case ATK_UNIT:
      if (target_unit == NULL) {
        explnat->kind = ANEK_MISSING_TARGET;
      }
      break;
    case ATK_UNITS:
    case ATK_TILE:
      if (target_tile == NULL) {
        explnat->kind = ANEK_MISSING_TARGET;
      }
      break;
    case ATK_SELF:
      /* No other target. */
      break;
    case ATK_COUNT:
      fc_assert(action_id_get_target_kind(act_id) != ATK_COUNT);
      break;
    }
  }

  if (explnat->kind == ANEK_MISSING_TARGET) {
    /* No point continuing. */
    return explnat;
  }

  if (act_id == ACTION_ANY) {
    /* Find the target player of some actions. */
    if (target_city) {
      /* Individual city targets have the highest priority. */
      tgt_player = city_owner(target_city);
    } else if (target_unit) {
      /* Individual unit targets have the next priority. */
      tgt_player = unit_owner(target_unit);
    } else if (target_tile) {
      /* Tile targets have the lowest priority. */
      tgt_player = tile_owner(target_tile);
    }
  } else {
    /* Find the target player of this action. */
    switch (action_id_get_target_kind(act_id)) {
    case ATK_CITY:
      tgt_player = city_owner(target_city);
      break;
    case ATK_UNIT:
      tgt_player = unit_owner(target_unit);
      break;
    case ATK_TILE:
      tgt_player = tile_owner(target_tile);
      break;
    case ATK_UNITS:
      /* A unit stack may contain units with multiple owners. Pick the
       * first one. */
      if (target_tile
          && unit_list_size(target_tile->units) > 0) {
        tgt_player = unit_owner(unit_list_get(target_tile->units, 0));
      }
      break;
    case ATK_SELF:
      /* A unit acting against itself. */
      tgt_player = unit_owner(punit);
      break;
    case ATK_COUNT:
      fc_assert(action_id_get_target_kind(act_id) != ATK_COUNT);
      break;
    }
  }

  switch ((enum gen_action)act_id) {
  case ACTION_FOUND_CITY:
    /* Detects that the target is closer to a city than citymindist allows.
     * Detects that the target tile is claimed by a foreigner even when it
     * is legal to found a city on an unclaimed or domestic tile. */
    action_custom = city_build_here_test(target_tile, punit);
    break;
  case ACTION_AIRLIFT:
    action_custom = test_unit_can_airlift_to(NULL, punit, target_city);
    break;
  case ACTION_NUKE_UNITS:
    action_custom = unit_attack_units_at_tile_result(punit, target_tile);
    break;
  case ACTION_ATTACK:
  case ACTION_SUICIDE_ATTACK:
    action_custom = unit_attack_units_at_tile_result(punit, target_tile);
    break;
  case ACTION_CONQUER_CITY:
  case ACTION_CONQUER_CITY2:
    if (target_city) {
      action_custom = unit_move_to_tile_test(&(wld.map), punit,
                                             punit->activity,
                                             unit_tile(punit),
                                             city_tile(target_city),
                                             FALSE, NULL, TRUE);
    } else {
      action_custom = MR_OK;
    }
    break;
  case ACTION_TRANSPORT_EMBARK:
    if (target_unit) {
      action_custom = unit_move_to_tile_test(&(wld.map), punit,
                                             punit->activity,
                                             unit_tile(punit),
                                             unit_tile(target_unit),
                                             FALSE, NULL, FALSE);
    } else {
      action_custom = MR_OK;
    }
    break;
  case ACTION_TRANSPORT_DISEMBARK1:
  case ACTION_TRANSPORT_DISEMBARK2:
    if (target_tile) {
      action_custom = unit_move_to_tile_test(&(wld.map), punit,
                                             punit->activity,
                                             unit_tile(punit),
                                             target_tile,
                                             FALSE, NULL, FALSE);
    } else {
      action_custom = MR_OK;
    }
    break;
  default:
    action_custom = 0;
    break;
  }

  if (!unit_can_do_action(punit, act_id)) {
    explnat->kind = ANEK_ACTOR_UNIT;
  } else if (action_id_has_result_safe(act_id, ACTION_FOUND_CITY)
             && tile_city(target_tile)) {
    explnat->kind = ANEK_BAD_TARGET;
  } else if ((!can_exist
       && !utype_can_do_act_when_ustate(unit_type_get(punit), act_id,
                                        USP_LIVABLE_TILE, FALSE))
      || (can_exist
          && !utype_can_do_act_when_ustate(unit_type_get(punit), act_id,
                                           USP_LIVABLE_TILE, TRUE))) {
    explnat->kind = ANEK_BAD_TERRAIN_ACT;
    explnat->no_act_terrain = tile_terrain(unit_tile(punit));
  } else if ((!on_native
       && !utype_can_do_act_when_ustate(unit_type_get(punit), act_id,
                                        USP_NATIVE_TILE, FALSE))
      || (on_native
          && !utype_can_do_act_when_ustate(unit_type_get(punit), act_id,
                                           USP_NATIVE_TILE, TRUE))) {
    explnat->kind = ANEK_BAD_TERRAIN_ACT;
    explnat->no_act_terrain = tile_terrain(unit_tile(punit));
  } else if (punit
             && does_terrain_block_action(act_id, FALSE,
                 punit, tile_terrain(unit_tile(punit)))) {
    /* No action enabler allows acting against this terrain kind. */
    explnat->kind = ANEK_BAD_TERRAIN_ACT;
    explnat->no_act_terrain = tile_terrain(unit_tile(punit));
  } else if (action_id_has_result_safe(act_id, ACTION_FOUND_CITY)
             && target_tile
             && terrain_has_flag(tile_terrain(target_tile),
                                 TER_NO_CITIES)) {
    explnat->kind = ANEK_BAD_TERRAIN_TGT;
    explnat->no_act_terrain = tile_terrain(target_tile);
  } else if (target_tile
             && does_terrain_block_action(act_id, TRUE,
                 punit, tile_terrain(target_tile))) {
    /* No action enabler allows acting against this terrain kind. */
    explnat->kind = ANEK_BAD_TERRAIN_TGT;
    explnat->no_act_terrain = tile_terrain(target_tile);
  } else if (unit_transported(punit)
             && !utype_can_do_act_when_ustate(unit_type_get(punit), act_id,
                                              USP_TRANSPORTED, TRUE)) {
    explnat->kind = ANEK_IS_TRANSPORTED;
  } else if (!unit_transported(punit)
             && !utype_can_do_act_when_ustate(unit_type_get(punit), act_id,
                                              USP_TRANSPORTED, FALSE)) {
    explnat->kind = ANEK_IS_NOT_TRANSPORTED;
  } else if (0 < get_transporter_occupancy(punit)
             && !utype_can_do_act_when_ustate(unit_type_get(punit), act_id,
                                              USP_TRANSPORTING, TRUE)) {
    explnat->kind = ANEK_IS_TRANSPORTING;
  } else if (!(0 < get_transporter_occupancy(punit))
             && !utype_can_do_act_when_ustate(unit_type_get(punit), act_id,
                                              USP_TRANSPORTING, FALSE)) {
    explnat->kind = ANEK_IS_NOT_TRANSPORTING;
  } else if ((punit->homecity > 0)
             && !utype_can_do_act_when_ustate(unit_type_get(punit), act_id,
                                              USP_HAS_HOME_CITY, TRUE)) {
    explnat->kind = ANEK_ACTOR_HAS_HOME_CITY;
  } else if ((punit->homecity <= 0)
             && !utype_can_do_act_when_ustate(unit_type_get(punit), act_id,
                                              USP_HAS_HOME_CITY, FALSE)) {
    explnat->kind = ANEK_ACTOR_HAS_NO_HOME_CITY;
  } else if ((punit->homecity <= 0)
             && (action_id_has_result_safe(act_id, ACTION_TRADE_ROUTE)
                 || action_id_has_result_safe(act_id,
                                              ACTION_MARKETPLACE))) {
    explnat->kind = ANEK_ACTOR_HAS_NO_HOME_CITY;
  } else if ((must_war_player = need_war_player(punit,
                                                act_id,
                                                target_tile,
                                                target_city,
                                                target_unit))) {
    explnat->kind = ANEK_NO_WAR;
    explnat->no_war_with = must_war_player;
  } else if (action_mp_full_makes_legal(punit, act_id)) {
    explnat->kind = ANEK_LOW_MP;
  } else if (tgt_player
             && unit_owner(punit) != tgt_player
             && !can_utype_do_act_if_tgt_diplrel(unit_type_get(punit),
                                                 act_id,
                                                 DRO_FOREIGN,
                                                 TRUE)) {
    explnat->kind = ANEK_FOREIGN;
  } else if (action_id_has_result_safe(act_id, ACTION_FOUND_CITY)
             && action_custom == CB_BAD_BORDERS) {
    explnat->kind = ANEK_FOREIGN;
  } else if (tgt_player
             && unit_owner(punit) == tgt_player
             && !can_utype_do_act_if_tgt_diplrel(unit_type_get(punit),
                                                 act_id,
                                                 DRO_FOREIGN,
                                                 FALSE)) {
    explnat->kind = ANEK_DOMESTIC;
  } else if (punit
             && does_nation_block_action(act_id, FALSE,
                                         punit, unit_owner(punit)->nation)) {
    explnat->kind = ANEK_NATION_ACT;
    explnat->no_act_nation = unit_owner(punit)->nation;
  } else if (tgt_player
             && does_nation_block_action(act_id, TRUE,
                                         punit, tgt_player->nation)) {
    explnat->kind = ANEK_NATION_TGT;
    explnat->no_act_nation = tgt_player->nation;
  } else if ((target_tile && tile_city(target_tile))
             && !utype_may_act_tgt_city_tile(unit_type_get(punit),
                                             act_id,
                                             CITYT_CENTER,
                                             TRUE)) {
    explnat->kind = ANEK_IS_CITY_CENTER;
  } else if ((target_tile && !tile_city(target_tile))
             && !utype_may_act_tgt_city_tile(unit_type_get(punit),
                                             act_id,
                                             CITYT_CENTER,
                                             FALSE)) {
    explnat->kind = ANEK_IS_NOT_CITY_CENTER;
  } else if ((target_tile && tile_owner(target_tile) != NULL)
             && !utype_may_act_tgt_city_tile(unit_type_get(punit),
                                             act_id,
                                             CITYT_CLAIMED,
                                             TRUE)) {
    explnat->kind = ANEK_TGT_IS_CLAIMED;
  } else if ((target_tile && tile_owner(target_tile) == NULL)
             && !utype_may_act_tgt_city_tile(unit_type_get(punit),
                                             act_id,
                                             CITYT_CLAIMED,
                                             FALSE)) {
    explnat->kind = ANEK_TGT_IS_UNCLAIMED;
  } else if (action_id_exists(act_id) && punit
             && ((target_tile
                  && !action_id_distance_inside_max(act_id,
                      real_map_distance(unit_tile(punit), target_tile)))
                 || (target_city
                     && !action_id_distance_inside_max(act_id,
                         real_map_distance(unit_tile(punit),
                                           city_tile(target_city))))
                 || (target_unit
                     && !action_id_distance_inside_max(act_id,
                         real_map_distance(unit_tile(punit),
                                           unit_tile(target_unit)))))) {
    explnat->kind = ANEK_DISTANCE_FAR;
    explnat->distance = action_by_number(act_id)->max_distance;
  } else if (action_id_has_result_safe(act_id, ACTION_PARADROP)
             && punit && target_tile
             && real_map_distance(unit_tile(punit), target_tile)
                > unit_type_get(punit)->paratroopers_range) {
    explnat->kind = ANEK_DISTANCE_FAR;
    explnat->distance = unit_type_get(punit)->paratroopers_range;
  } else if (action_id_exists(act_id) && punit
             && ((target_tile
                  && real_map_distance(unit_tile(punit), target_tile)
                      < action_by_number(act_id)->min_distance)
                 || (target_city
                     && real_map_distance(unit_tile(punit),
                                          city_tile(target_city))
                        < action_by_number(act_id)->min_distance)
                 || (target_unit
                     && real_map_distance(unit_tile(punit),
                                          unit_tile(target_unit))
                        < action_by_number(act_id)->min_distance))) {
    explnat->kind = ANEK_DISTANCE_NEAR;
    explnat->distance = action_by_number(act_id)->min_distance;
  } else if (target_city
             && (action_id_has_result_safe(act_id, ACTION_JOIN_CITY)
                 && action_actor_utype_hard_reqs_ok(ACTION_JOIN_CITY,
                                                    unit_type_get(punit))
                 && (city_size_get(target_city) + unit_pop_value(punit)
                     > game.info.add_to_size_limit))) {
    /* TODO: Check max city size requirements from action enabler target
     * vectors. */
    explnat->kind = ANEK_CITY_TOO_BIG;
  } else if (target_city
             && (action_id_has_result_safe(act_id, ACTION_JOIN_CITY)
                 && action_actor_utype_hard_reqs_ok(ACTION_JOIN_CITY,
                                                    unit_type_get(punit))
                 && (!city_can_grow_to(target_city,
                                       city_size_get(target_city)
                                       + unit_pop_value(punit))))) {
    explnat->kind = ANEK_CITY_POP_LIMIT;
  } else if ((action_id_has_result_safe(act_id, ACTION_NUKE_UNITS)
              || action_id_has_result_safe(act_id, ACTION_SUICIDE_ATTACK)
              || action_id_has_result_safe(act_id, ACTION_ATTACK))
             && action_custom != ATT_OK) {
    switch (action_custom) {
    case ATT_NON_ATTACK:
      explnat->kind = ANEK_ACTOR_UNIT;
      break;
    case ATT_UNREACHABLE:
      explnat->kind = ANEK_TGT_UNREACHABLE;
      break;
    case ATT_NONNATIVE_SRC:
      explnat->kind = ANEK_BAD_TERRAIN_ACT;
      explnat->no_act_terrain = tile_terrain(unit_tile(punit));
      break;
    case ATT_NONNATIVE_DST:
      explnat->kind = ANEK_BAD_TERRAIN_TGT;
      explnat->no_act_terrain = tile_terrain(target_tile);
      break;
    default:
      fc_assert(action_custom != ATT_OK);
      explnat->kind = ANEK_UNKNOWN;
      break;
    }
  } else if (action_id_has_result_safe(act_id, ACTION_AIRLIFT)
             && action_custom == AR_SRC_NO_FLIGHTS) {
    explnat->kind = ANEK_CITY_NO_CAPACITY;
    explnat->capacity_city = tile_city(unit_tile(punit));
  } else if (action_id_has_result_safe(act_id, ACTION_AIRLIFT)
             && action_custom == AR_DST_NO_FLIGHTS) {
    explnat->kind = ANEK_CITY_NO_CAPACITY;
    explnat->capacity_city = game_city_by_number(target_city->id);
  } else if (action_id_has_result_safe(act_id, ACTION_FOUND_CITY)
             && action_custom == CB_NO_MIN_DIST) {
    explnat->kind = ANEK_CITY_TOO_CLOSE_TGT;
  } else if (action_id_has_result_safe(act_id, ACTION_PARADROP)
             && target_tile
             && !map_is_known(target_tile, unit_owner(punit))) {
    explnat->kind = ANEK_TGT_TILE_UNKNOWN;
  } else if ((action_id_has_result_safe(act_id, ACTION_CONQUER_CITY)
              || action_id_has_result_safe(act_id, ACTION_CONQUER_CITY2)
              || action_id_has_result_safe(act_id,
                                           ACTION_TRANSPORT_EMBARK)
              || action_id_has_result_safe(act_id,
                                           ACTION_TRANSPORT_DISEMBARK2)
              || action_id_has_result_safe(act_id,
                                           ACTION_TRANSPORT_DISEMBARK1))
             && action_custom != MR_OK) {
    switch (action_custom) {
    case MR_CANNOT_DISEMBARK:
      explnat->kind = ANEK_DISEMBARK_ACT;
      break;
    case MR_TRIREME:
      explnat->kind = ANEK_TRIREME_MOVE;
      break;
    default:
      fc_assert(action_custom != MR_OK);
      explnat->kind = ANEK_UNKNOWN;
      break;
    }
  } else if (action_id_has_result_safe(act_id, ACTION_SPY_BRIBE_UNIT)
             && utype_player_already_has_this_unique(unit_owner(punit),
                 unit_type_get(target_unit))) {
    explnat->kind = ANEK_TGT_IS_UNIQUE_ACT_HAS;
    explnat->no_tgt_utype = unit_type_get(target_unit);
  } else if ((game.scenario.prevent_new_cities
              && utype_can_do_action(unit_type_get(punit), ACTION_FOUND_CITY))
             && (action_id_has_result_safe(act_id, ACTION_FOUND_CITY)
                 || act_id == ACTION_ANY)) {
    /* Please add a check for any new action forbidding scenario setting
     * above this comment. */
    explnat->kind = ANEK_SCENARIO_DISABLED;
  } else if (action_id_exists(act_id)
             && (blocker = action_is_blocked_by(act_id, punit,
                                                target_tile, target_city,
                                                target_unit))) {
    explnat->kind = ANEK_ACTION_BLOCKS;
    explnat->blocker = blocker;
  } else {
    explnat->kind = ANEK_UNKNOWN;
  }

  return explnat;
}

/**********************************************************************//**
  Give the reason kind why an action isn't enabled.
**************************************************************************/
enum ane_kind action_not_enabled_reason(struct unit *punit,
                                        action_id act_id,
                                        const struct tile *target_tile,
                                        const struct city *target_city,
                                        const struct unit *target_unit)
{
  struct ane_expl *explnat = expl_act_not_enabl(punit, act_id,
                                                target_tile,
                                                target_city, target_unit);
  enum ane_kind out = explnat->kind;

  free(explnat);

  return out;
}

/**********************************************************************//**
  Explain why punit can't perform any action at all based on its current
  game state.
**************************************************************************/
static void explain_why_no_action_enabled(struct unit *punit,
                                          const struct tile *target_tile,
                                          const struct city *target_city,
                                          const struct unit *target_unit)
{
  struct player *pplayer = unit_owner(punit);
  struct ane_expl *explnat = expl_act_not_enabl(punit, ACTION_ANY,
                                                target_tile,
                                                target_city, target_unit);

  switch (explnat->kind) {
  case ANEK_ACTOR_UNIT:
    /* This shouldn't happen unless the client is buggy given the current
     * users. */
    fc_assert_msg(explnat->kind != ANEK_ACTOR_UNIT,
                  "Asked to explain why a non actor can't act.");

    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("Unit cannot do anything."));
    break;
  case ANEK_MISSING_TARGET:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("Your %s found no suitable target."),
                  unit_name_translation(punit));
    break;
  case ANEK_BAD_TARGET:
    /* This shouldn't happen at the moment. Only specific action checks
     * will trigger bad target checks. This is a reply to a question about
     * any action. */
    fc_assert(explnat->kind != ANEK_BAD_TARGET);

    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("Your %s found no suitable target."),
                  unit_name_translation(punit));
    break;
  case ANEK_BAD_TERRAIN_ACT:
    {
      const char *types[utype_count()];
      int i = 0;

      if (!utype_can_do_act_when_ustate(unit_type_get(punit),
                                        ACTION_ANY, USP_LIVABLE_TILE,
                                        FALSE)
          && !can_unit_exist_at_tile(&(wld.map), punit, unit_tile(punit))) {
        unit_type_iterate(utype) {
          if (utype_can_do_act_when_ustate(utype, ACTION_ANY,
                                           USP_LIVABLE_TILE, FALSE)) {
            types[i++] = utype_name_translation(utype);
          }
        } unit_type_iterate_end;
      }

      if (0 < i) {
        struct astring astr = ASTRING_INIT;

        notify_player(pplayer, unit_tile(punit),
                      E_BAD_COMMAND, ftc_server,
                      _("Your %s cannot act from %s. "
                        "Only %s can act from a non livable tile."),
                      unit_name_translation(punit),
                      terrain_name_translation(explnat->no_act_terrain),
                      astr_build_or_list(&astr, types, i));

        astr_free(&astr);
      } else {
        notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                      _("Unit cannot act from %s."),
                      terrain_name_translation(explnat->no_act_terrain));
      }
    }
    break;
  case ANEK_BAD_TERRAIN_TGT:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("Unit cannot act against %s."),
                  terrain_name_translation(explnat->no_act_terrain));
    break;
  case ANEK_IS_TRANSPORTED:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit is being transported, and"
                    " so cannot act."));
    break;
  case ANEK_IS_NOT_TRANSPORTED:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit cannot act when it isn't being "
                    "transported."));
    break;
  case ANEK_IS_TRANSPORTING:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit is transporting, and"
                    " so cannot act."));
    break;
  case ANEK_IS_NOT_TRANSPORTING:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit cannot act when it isn't transporting."));
    break;
  case ANEK_ACTOR_HAS_HOME_CITY:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit has a home city, and so cannot act."));
    break;
  case ANEK_ACTOR_HAS_NO_HOME_CITY:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit cannot act unless it has a home city."));
    break;
  case ANEK_NO_WAR:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("💢 Your %s %s unable to aggress the <span class='nation_link'>tile</span>: "),
                  unit_name_translation(punit),
                  (is_unit_plural(punit) ? "are" : "is"));
    notify_player(
          pplayer, NULL, E_BAD_COMMAND, ftc_server,
          _("You must "
            "<span title='Declare war on %s.' class='nation_link' "
            "onclick='nation_table_select_player(%d); $(&apos;#cancel_treaty_button&apos;).click()'>"
            "declare war on %s</span> first. Use the "
            "<span class='nation_link' onclick='nation_table_select_player(%d);'>"
            "Nations</span> tab for diplomacy."),
          player_name(explnat->no_war_with),
          player_index(explnat->no_war_with),
          player_name(explnat->no_war_with),
          player_index(explnat->no_war_with));
    break;
  case ANEK_DOMESTIC:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit cannot act against domestic targets."));
    break;
  case ANEK_FOREIGN:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit cannot act against foreign targets."));
    break;
  case ANEK_NATION_ACT:
     notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                   /* TRANS: Swedish ... Riflemen */
                   _("%s %s cannot act."),
                   nation_adjective_translation(explnat->no_act_nation),
                   unit_name_translation(punit));
     break;
  case ANEK_NATION_TGT:
     notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                   /* TRANS: ... Pirate ... */
                   _("This unit cannot act against %s targets."),
                   nation_adjective_translation(explnat->no_act_nation));
     break;
  case ANEK_LOW_MP:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit has too few moves left to act."));
    break;
  case ANEK_IS_CITY_CENTER:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit cannot act against city centers."));
    break;
  case ANEK_IS_NOT_CITY_CENTER:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit cannot act against non city centers."));
    break;
  case ANEK_TGT_IS_CLAIMED:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit cannot act against claimed tiles."));
    break;
  case ANEK_TGT_IS_UNCLAIMED:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit cannot act against unclaimed tiles."));
    break;
  case ANEK_DISTANCE_NEAR:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit is too near its target to act."));
    break;
  case ANEK_DISTANCE_FAR:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit is too far away from its target to act."));
    break;
  case ANEK_SCENARIO_DISABLED:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("Can't perform any action this scenario permits."));
    break;
  case ANEK_CITY_TOO_CLOSE_TGT:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("Can't perform any action this close to a city."));
    break;
  case ANEK_CITY_TOO_BIG:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  /* TRANS: Settler ... Berlin */
                  _("%s can't do anything to %s. It is too big."),
                  unit_name_translation(punit),
                  city_name_get(target_city));
    break;
  case ANEK_CITY_POP_LIMIT:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  /* TRANS: London ... Settlers */
                  _("%s needs an improvement to grow, so "
                    "%s cannot do anything to it."),
                  city_name_get(target_city),
                  unit_name_translation(punit));
    break;
  case ANEK_CITY_NO_CAPACITY:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  /* TRANS: Paris ... Warriors (think: airlift) */
                  _("%s don't have enough capacity, so "
                    "%s cannot do anything."),
                  city_name_get(explnat->capacity_city),
                  unit_name_translation(punit));
    break;
  case ANEK_TGT_TILE_UNKNOWN:
    notify_player(pplayer, target_tile, E_BAD_COMMAND, ftc_server,
                  /* TRANS: Paratroopers ... */
                  _("%s can't do anything to an unknown target tile."),
                  unit_name_translation(punit));
    break;
  case ANEK_TRIREME_MOVE:
    notify_player(pplayer, target_tile, E_BAD_COMMAND, ftc_server,
                  _("%s cannot move that far from the coast line."),
                  unit_link(punit));
    break;
  case ANEK_DISEMBARK_ACT:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("%s cannot disembark outside of a city or a native base "
                    "for %s."),
                  unit_link(punit),
                  utype_name_translation(
                      unit_type_get(unit_transport_get(punit))));
    break;
  case ANEK_TGT_UNREACHABLE:
    notify_player(pplayer, target_tile, E_BAD_COMMAND, ftc_server,
                  _("%s can't reach any target."),
                  unit_name_translation(punit));
    break;
  case ANEK_TGT_IS_UNIQUE_ACT_HAS:
    notify_player(pplayer, target_tile, E_BAD_COMMAND, ftc_server,
                  _("%s can't do anything since you already have a %s."),
                  unit_name_translation(punit),
                  utype_name_translation(explnat->no_tgt_utype));
    break;
  case ANEK_ACTION_BLOCKS:
    /* If an action blocked another action the blocking action must be
     * possible. */
    fc_assert(explnat->kind != ANEK_ACTION_BLOCKS);
    /* Fall through to unknown cause. */
  case ANEK_UNKNOWN:
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("No action possible."));
    break;
  }

  free(explnat);
}

/**********************************************************************//**
  Handle a query for what actions a unit may do.

  MUST always send a reply so the client can move on in the queue. This
  includes when the client give invalid input. That the acting unit died
  before the server received a request for what actions it could do should
  not stop the client from processing the next unit in the queue.
**************************************************************************/
void handle_unit_get_actions(struct connection *pc,
                             const int actor_unit_id,
                             const int target_unit_id_client,
                             const int target_tile_id,
                             const int target_extra_id_client,
                             const bool disturb_player)
{
  struct player *actor_player;
  struct unit *actor_unit;
  struct tile *target_tile;
  struct act_prob probabilities[MAX_NUM_ACTIONS];
  struct unit *target_unit;
  struct city *target_city;
  struct extra_type *target_extra;
  int actor_target_distance;
  const struct player_tile *plrtile;
  int target_extra_id = target_extra_id_client;

  /* No potentially legal action is known yet. If none is found the player
   * should get an explanation. */
  bool at_least_one_action = FALSE;

  /* A target should only be sent if it is possible to act against it */
  int target_city_id = IDENTITY_NUMBER_ZERO;
  int target_unit_id = IDENTITY_NUMBER_ZERO;

  actor_player = pc->playing;
  actor_unit = game_unit_by_number(actor_unit_id);
  target_tile = index_to_tile(&(wld.map), target_tile_id);

  /* Initialize the action probabilities. */
  action_iterate(act) {
    probabilities[act] = ACTPROB_NA;
  } action_iterate_end;

  /* Check if the request is valid. */
  if (!target_tile || !actor_unit || !actor_player
      || actor_unit->owner != actor_player) {
    dsend_packet_unit_actions(pc, actor_unit_id,
                              IDENTITY_NUMBER_ZERO, IDENTITY_NUMBER_ZERO,
                              target_tile_id, target_extra_id,
                              disturb_player,
                              probabilities);
    return;
  }

  /* Select the targets. */

  if (target_unit_id_client == IDENTITY_NUMBER_ZERO) {
    /* Find a new target unit. */
    target_unit = action_tgt_unit(actor_unit, target_tile, TRUE);
  } else {
    /* Prepare the client selected target unit. */
    target_unit = game_unit_by_number(target_unit_id_client);
  }

  /* Find the target city. */
  target_city = action_tgt_city(actor_unit, target_tile, TRUE);

  /* The specified target unit must be located at the target tile. */
  if (target_unit && unit_tile(target_unit) != target_tile) {
    notify_player(actor_player, unit_tile(actor_unit),
                  E_BAD_COMMAND, ftc_server,
                  _("Target not at target tile."));
    dsend_packet_unit_actions(pc, actor_unit_id,
                              IDENTITY_NUMBER_ZERO, IDENTITY_NUMBER_ZERO,
                              target_tile_id, target_extra_id,
                              disturb_player,
                              probabilities);
    return;
  }

  if (target_extra_id_client == EXTRA_NONE) {
    /* See if a target extra can be found. */
    target_extra = action_tgt_tile_extra(actor_unit, target_tile, TRUE);
  } else {
    /* Use the client selected target extra. */
    target_extra = extra_by_number(target_extra_id_client);
  }

  /* The player may have outdated information about the target tile.
   * Limiting the player knowledge look up to the target tile is OK since
   * all targets must be located at it. */
  plrtile = map_get_player_tile(target_tile, actor_player);

  /* Distance between actor and target tile. */
  actor_target_distance = real_map_distance(unit_tile(actor_unit),
                                            target_tile);

  /* Find out what can be done to the targets. */

  /* Set the probability for the actions. */
  action_iterate(act) {
    if (action_id_get_actor_kind(act) != AAK_UNIT) {
      /* Not relevant. */
      continue;
    }

    switch (action_id_get_target_kind(act)) {
    case ATK_CITY:
      if (plrtile && plrtile->site) {
        /* Only a known city may be targeted. */
        if (target_city) {
          /* Calculate the probabilities. */
          probabilities[act] = action_prob_vs_city(actor_unit, act,
                                                   target_city);
        } else if (!tile_is_seen(target_tile, actor_player)
                   && action_maybe_possible_actor_unit(act, actor_unit)
                   && action_id_distance_accepted(act,
                                                  actor_target_distance)) {
          /* The target city is non existing. The player isn't aware of this
           * fact because he can't see the tile it was located on. The
           * actor unit it self doesn't contradict the requirements to
           * perform the action. The (no longer existing) target city was
           * known to be close enough. */
          probabilities[act] = ACTPROB_NOT_KNOWN;
        } else {
          /* The actor unit is known to be unable to act or the target city
           * is known to be too far away. */
          probabilities[act] = ACTPROB_IMPOSSIBLE;
        }
      } else {
        /* No target to act against. */
        probabilities[act] = ACTPROB_IMPOSSIBLE;
      }
      break;
    case ATK_UNIT:
      if (target_unit) {
        /* Calculate the probabilities. */
        probabilities[act] = action_prob_vs_unit(actor_unit, act,
                                                 target_unit);
      } else {
        /* No target to act against. */
        probabilities[act] = ACTPROB_IMPOSSIBLE;
      }
      break;
    case ATK_UNITS:
      if (target_tile) {
        /* Calculate the probabilities. */
        probabilities[act] = action_prob_vs_units(actor_unit, act,
                                                  target_tile);
      } else {
        /* No target to act against. */
        probabilities[act] = ACTPROB_IMPOSSIBLE;
      }
      break;
    case ATK_TILE:
      if (target_tile) {
        /* Calculate the probabilities. */
        probabilities[act] = action_prob_vs_tile(actor_unit, act,
                                                 target_tile, target_extra);
      } else {
        /* No target to act against. */
        probabilities[act] = ACTPROB_IMPOSSIBLE;
      }
      break;
    case ATK_SELF:
      if (actor_target_distance == 0) {
        /* Calculate the probabilities. */
        probabilities[act] = action_prob_self(actor_unit, act);
      } else {
        /* Don't bother with self targeted actions unless the actor is
         * asking about what can be done to its own tile. */
        probabilities[act] = ACTPROB_IMPOSSIBLE;
      }
      break;
    case ATK_COUNT:
      fc_assert_action(action_id_get_target_kind(act) != ATK_COUNT,
                       probabilities[act] = ACTPROB_IMPOSSIBLE);
      break;
    }
  } action_iterate_end;

  /* Analyze the probabilities. Decide what targets to send and if an
   * explanation is needed. */
  action_iterate(act) {
    if (action_prob_possible(probabilities[act])) {
      /* An action can be done. No need to explain why no action can be
       * done. */
      at_least_one_action = TRUE;

      switch (action_id_get_target_kind(act)) {
      case ATK_CITY:
        /* The city should be sent as a target since it is possible to act
         * against it. */

        /* All city targeted actions requires that the player is aware of
         * the target city. It is therefore in the player's map. */
        fc_assert_action(plrtile, continue);
        fc_assert_action(plrtile->site, continue);

        target_city_id = plrtile->site->identity;
        break;
      case ATK_UNIT:
        /* The unit should be sent as a target since it is possible to act
         * against it. */
        fc_assert(target_unit != NULL);
        target_unit_id = target_unit->id;
        break;
      case ATK_TILE:
        /* The target tile isn't selected here so it hasn't changed. */
        fc_assert(target_tile != NULL);

        if (target_extra && action_id_has_complex_target(act)) {
          /* The target extra may have been set here. */
          target_extra_id = target_extra->id;
        }
        break;
      case ATK_UNITS:
        /* The target tile isn't selected here so it hasn't changed. */
        fc_assert(target_tile != NULL);
        break;
      case ATK_SELF:
        /* The target unit is the actor unit. It is already sent. */
        fc_assert(actor_unit != NULL);
        break;
      case ATK_COUNT:
        fc_assert_msg(action_id_get_target_kind(act) != ATK_COUNT,
                      "Invalid action target kind.");
        break;
      }

      if (target_city_id != IDENTITY_NUMBER_ZERO
          && target_unit_id != IDENTITY_NUMBER_ZERO) {
        /* No need to find out more. */
        break;
      }
    }
  } action_iterate_end;

  /* Send possible actions and targets. */
  dsend_packet_unit_actions(pc,
                            actor_unit_id, target_unit_id, target_city_id,
                            target_tile_id, target_extra_id,
                            disturb_player,
                            probabilities);

  if (disturb_player && !at_least_one_action) {
    /* The user should get an explanation why no action is possible. */
    explain_why_no_action_enabled(actor_unit,
                                  target_tile, target_city, target_unit);
  }
}

/**********************************************************************//**
  Try to explain to the player why an action is illegal.

  Event type should be E_BAD_COMMAND if the player should know that the
  action is illegal or E_UNIT_ILLEGAL_ACTION if the player potentially new
  information is being revealed.
**************************************************************************/
void illegal_action_msg(struct player *pplayer,
                        const enum event_type event,
                        struct unit *actor,
                        const action_id stopped_action,
                        const struct tile *target_tile,
                        const struct city *target_city,
                        const struct unit *target_unit)
{
  struct ane_expl *explnat;

  /* Explain why the action was illegal. */
  explnat = expl_act_not_enabl(actor, stopped_action,
                               target_tile, target_city, target_unit);
  switch (explnat->kind) {
  case ANEK_ACTOR_UNIT:
    {
      struct astring astr = ASTRING_INIT;

      if (role_units_translations(&astr,
                                  action_id_get_role(stopped_action),
                                  TRUE)) {
        notify_player(pplayer, unit_tile(actor),
                      event, ftc_server,
                      /* TRANS: Only Diplomat or Spy can do Steal Gold. */
                      _("Only %s can do %s."),
                      astr_str(&astr),
                      action_id_name_translation(stopped_action));
        astr_free(&astr);
      } else {
        notify_player(pplayer, unit_tile(actor),
                      event, ftc_server,
                      /* TRANS: Spy can't do Capture Units. */
                      _("%s can't do %s."),
                      unit_name_translation(actor),
                      action_id_name_translation(stopped_action));
      }
    }
    break;
  case ANEK_MISSING_TARGET:
    notify_player(pplayer, unit_tile(actor), event, ftc_server,
                  /* TRANS: "Your Spy found ... suitable for
                   * Bribe Enemy Unit." */
                  _("Your %s found no target suitable for %s."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_BAD_TARGET:
    notify_player(pplayer, unit_tile(actor), event, ftc_server,
                  /* TRANS: "Having your Spy do Bribe Enemy Unit to
                   * this target ..." */
                  _("Having your %s do %s to this target is redundant."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_BAD_TERRAIN_ACT:
    {
      const char *types[utype_count()];
      int i = 0;

      if (!utype_can_do_act_when_ustate(unit_type_get(actor),
                                        stopped_action, USP_LIVABLE_TILE,
                                        FALSE)
          && !can_unit_exist_at_tile(&(wld.map), actor, unit_tile(actor))) {
        unit_type_iterate(utype) {
          if (utype_can_do_act_when_ustate(utype, stopped_action,
                                           USP_LIVABLE_TILE, FALSE)) {
            types[i++] = utype_name_translation(utype);
          }
        } unit_type_iterate_end;
      }

      if (0 < i) {
        struct astring astr = ASTRING_INIT;

        notify_player(pplayer, unit_tile(actor),
                      event, ftc_server,
                      /* TRANS: action name.
                       * "Your Spy can't do Steal Gold from Ocean.
                       * Only Explorer or Partisan can do Steal Gold ..." */
                      _("Your %s can't do %s from %s. "
                        "Only %s can do %s from a non livable tile."),
                      unit_name_translation(actor),
                      action_id_name_translation(stopped_action),
                      terrain_name_translation(explnat->no_act_terrain),
                      astr_build_or_list(&astr, types, i),
                      action_id_name_translation(stopped_action));

        astr_free(&astr);
      } else {
        notify_player(pplayer, unit_tile(actor),
                      event, ftc_server,
                      /* TRANS: action name.
                       * "Your Spy can't do Steal Gold from Ocean." */
                      _("Your %s can't do %s from %s."),
                      unit_name_translation(actor),
                      action_id_name_translation(stopped_action),
                      terrain_name_translation(explnat->no_act_terrain));
      }
    }
    break;
  case ANEK_BAD_TERRAIN_TGT:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy can't do Industrial Sabotage to Mountains." */
                  _("Your %s can't do %s to %s."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action),
                  terrain_name_translation(explnat->no_act_terrain));
    break;
  case ANEK_IS_TRANSPORTED:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy can't do Industrial Sabotage while ..." */
                  _("Your %s can't do %s while being transported."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_IS_NOT_TRANSPORTED:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy can't do Industrial Sabotage while ..." */
                  _("Your %s can't do %s while not being transported."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_IS_TRANSPORTING:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy can't do Industrial Sabotage while ..." */
                  _("Your %s can't do %s while transporting."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_IS_NOT_TRANSPORTING:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy can't do Industrial Sabotage while ..." */
                  _("Your %s can't do %s while not transporting."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_ACTOR_HAS_HOME_CITY:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy can't do Industrial Sabotage because ..." */
                  _("Your %s can't do %s because %s a home city."),
                  unit_name_translation(actor),
                  (is_unit_plural(actor) ? "they have" : "it has"),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_ACTOR_HAS_NO_HOME_CITY:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy can't do Industrial Sabotage because ..." */
                  _("Your %s can't do %s because it is homeless."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_NO_WAR:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy can't do Industrial Sabotage while you
                   * aren't at war with Prester John." */
                  _("Your %s can't do %s while you"
                    " aren't at war with %s."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action),
                  player_name(explnat->no_war_with));
    break;
  case ANEK_DOMESTIC:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Riflemen can't do Expel Unit to domestic
                   * unit stacks." */
                  _("Your %s can't do %s to domestic %s."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action),
                  action_target_kind_translated_name(
                    action_id_get_target_kind(stopped_action)));
    break;
  case ANEK_FOREIGN:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Leader can't do Use Court Physician to foreign
                   * unit stacks." */
                  _("Your %s can't do %s to foreign %s."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action),
                  action_target_kind_translated_name(
                    action_id_get_target_kind(stopped_action)));
    break;
  case ANEK_NATION_ACT:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Swedish Riflemen can't do Expel Unit." */
                  _("%s %s can't do %s."),
                  nation_adjective_translation(explnat->no_act_nation),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_NATION_TGT:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Riflemen... Expel Unit... Pirate Migrants." */
                  _("Your %s can't do %s to %s %s."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action),
                  nation_adjective_translation(explnat->no_act_nation),
                  action_target_kind_translated_name(
                    action_id_get_target_kind(stopped_action)));
    break;
  case ANEK_LOW_MP:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy has ... to Bribe Enemy Unit." */
                  _("Your %s %s too few moves left to %s."),
                  unit_name_translation(actor),
                  (is_unit_plural(actor) ? "have" : "has"),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_IS_CITY_CENTER:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy can't do Bribe Enemy Unit to city centers." */
                  _("Your %s can't do %s to city centers."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_IS_NOT_CITY_CENTER:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy can only do Investigate City to
                   * city centers." */
                  _("Your %s can only do %s to city centers."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_TGT_IS_CLAIMED:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Settlers can't do Build City to claimed tiles." */
                  _("Your %s can't do %s to claimed tiles."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_TGT_IS_UNCLAIMED:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy can't do Bribe Enemy Unit to
                   * unclaimed tiles." */
                  _("Your %s can't do %s to unclaimed tiles."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_DISTANCE_NEAR:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy must be at least 2 tiles away to do
                   * Incite a Revolt and Escape." */
                  PL_("%s must be at least %d tile away to do %s.",
                      "%s must be at least %d tiles away to do %s.",
                      explnat->distance),
                  unit_name_translation(actor),
                  explnat->distance,
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_DISTANCE_FAR:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Diplomat can't be more than 1 tile away to do
                   * Establish Embassy." */
                  PL_("%s have a maximum range of %d tile to do %s.",
                      "%s have a maximum range of %d tiles to do %s.",
                      explnat->distance),
                  unit_name_translation(actor),
                  explnat->distance,
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_SCENARIO_DISABLED:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: Can't do Build City in this scenario. */
                  _("Can't do %s in this scenario."),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_CITY_TOO_CLOSE_TGT:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: Can't do Build City this close to a city. */
                  _("Can't do %s this close to a city."),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_CITY_TOO_BIG:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: Settlers ... Join City ... London */
                  _("%s can't do %s to %s. It is too big."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action),
                  city_name_get(target_city));
    break;
  case ANEK_CITY_POP_LIMIT:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: London ... Settlers ... Join City */
                  _("%s needs an improvement to grow, so "
                    "%s cannot do %s."),
                  city_name_get(target_city),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_CITY_NO_CAPACITY:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: Paris ... Airlift to City ... Warriors */
                  _("%s has no capacity to %s %s."),
                  city_name_get(explnat->capacity_city),
                  action_id_name_translation(stopped_action),
                  unit_name_translation(actor));
    break;
  case ANEK_TGT_TILE_UNKNOWN:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: Paratroopers ... Drop Paratrooper */
                  _("%s can't do %s to an unknown tile."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_TRIREME_MOVE:
    notify_player(pplayer, target_tile, event, ftc_server,
                  /* TRANS: "Trireme cannot move ..." */
                  _("%s cannot move that far from the coast line."),
                  unit_link(actor));
    break;
  case ANEK_DISEMBARK_ACT:
    notify_player(pplayer, unit_tile(actor), event, ftc_server,
                  /* TRANS: "Riflemen cannot disembark ... native base
                   * for Helicopter." */
                  _("%s cannot disembark outside of a city or a native base "
                    "for %s."),
                  unit_link(actor),
                  utype_name_translation(
                      unit_type_get(unit_transport_get(actor))));
    break;
  case ANEK_TGT_UNREACHABLE:
    notify_player(pplayer, target_tile,
                  event, ftc_server,
                  _("<font color='#C0C0C0'>No reachable target for %s to %s.</font>"),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action));
    break;
  case ANEK_TGT_IS_UNIQUE_ACT_HAS:
    notify_player(pplayer, target_tile, event, ftc_server,
                  /* TRANS: "You already have a Leader." */
                  _("You already have a %s."),
                  utype_name_translation(explnat->no_tgt_utype));
    break;
  case ANEK_ACTION_BLOCKS:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: Freight ... Recycle Unit ... Help Wonder ... */
                  _("Your %s can't do %s when %s is legal."),
                  unit_name_translation(actor),
                  action_id_name_translation(stopped_action),
                  action_id_name_translation(explnat->blocker->id));
    break;
  case ANEK_UNKNOWN:
    notify_player(pplayer, unit_tile(actor),
                  event, ftc_server,
                  /* TRANS: action name.
                   * "Your Spy was unable to Bribe Enemy Unit." */
                  _("Your %s %s unable to %s."),
                  unit_name_translation(actor),
                  (is_unit_plural(actor) ? "were" : "was"),                    
                  action_id_name_translation(stopped_action));
    break;
  }

  free(explnat);
}

/**********************************************************************//**
  Tell the client that the action it requested is illegal. This can be
  caused by the player (and therefore the client) not knowing that some
  condition of an action no longer is true.
**************************************************************************/
static void illegal_action(struct player *pplayer,
                           struct unit *actor,
                           action_id stopped_action,
                           struct player *tgt_player,
                           const struct tile *target_tile,
                           const struct city *target_city,
                           const struct unit *target_unit,
                           bool disturb_player,
                           const enum action_requester requester)
{
  int punishment_mp;

  /* Why didn't the game check before trying something illegal? Did a good
   * reason to not call is_action_enabled_unit_on...() appear? The game is
   * omniscient... */
  fc_assert(requester != ACT_REQ_RULES);

  /* Don't punish the player for something the game did. Don't tell the
   * player that the rules required the game to try to do something
   * illegal. */
  fc_assert_ret_msg((requester == ACT_REQ_PLAYER
                     || requester == ACT_REQ_SS_AGENT),
                    "The player wasn't responsible for this.");

  /* The mistake may have a cost. */
  punishment_mp = get_target_bonus_effects(NULL,
                                           unit_owner(actor),
                                           tgt_player,
                                           NULL,
                                           NULL,
                                           NULL,
                                           actor,
                                           unit_type_get(actor),
                                           NULL,
                                           NULL,
                                           action_by_number(stopped_action),
                                           EFT_ILLEGAL_ACTION_MOVE_COST);

  actor->moves_left = MAX(0, actor->moves_left - punishment_mp);

  send_unit_info(NULL, actor);

  if (punishment_mp) {
    /* The player probably wants to be disturbed if his unit was punished
     * with the loss of movement points. */
    notify_player(pplayer, unit_tile(actor),
                  E_UNIT_ILLEGAL_ACTION, ftc_server,
                  /* TRANS: Spy ... movement point text that may include
                   * fractions. */
                  _("Your %s lost %s MP for attempting an illegal action."),
                  unit_name_translation(actor),
                  move_points_text(punishment_mp, TRUE));
  }

  if (disturb_player || punishment_mp) {
    /* This is a foreground request or the actor unit was punished with
     * the loss of movement points. */
    illegal_action_msg(pplayer, E_UNIT_ILLEGAL_ACTION,
                       actor, stopped_action,
                       target_tile, target_city, target_unit);
  }
}

/**********************************************************************//**
  Inform the client that something went wrong during a unit diplomat query
**************************************************************************/
static void unit_query_impossible(struct connection *pc,
                                  const int actor_id,
                                  const int target_id,
                                  bool disturb_player)
{
  dsend_packet_unit_action_answer(pc,
                                  actor_id, target_id,
                                  0,
                                  ACTION_NONE,
                                  disturb_player);
}

/**********************************************************************//**
  Tell the client the cost of bribing a unit, inciting a revolt, or
  any other parameters needed for action.

  Only send result back to the requesting connection, not all
  connections for that player.
**************************************************************************/
void handle_unit_action_query(struct connection *pc,
                              const int actor_id,
                              const int target_id,
                              const action_id action_type,
                              bool disturb_player)
{
  struct player *pplayer = pc->playing;
  struct unit *pactor = player_unit_by_number(pplayer, actor_id);
  struct unit *punit = game_unit_by_number(target_id);
  struct city *pcity = game_city_by_number(target_id);

  if (!action_id_exists(action_type)) {
    /* Non existing action */
    log_error("handle_unit_action_query() the action %d doesn't exist.",
              action_type);

    unit_query_impossible(pc, actor_id, target_id, disturb_player);
    return;
  }

  if (NULL == pactor) {
    /* Probably died or bribed. */
    log_verbose("handle_unit_action_query() invalid actor %d",
                actor_id);
    unit_query_impossible(pc, actor_id, target_id, disturb_player);
    return;
  }

  switch ((enum gen_action)action_type) {
  case ACTION_SPY_BRIBE_UNIT:
    if (punit
        && is_action_enabled_unit_on_unit(action_type,
                                          pactor, punit)) {
      dsend_packet_unit_action_answer(pc,
                                      actor_id, target_id,
                                      unit_bribe_cost(punit, pplayer),
                                      action_type, disturb_player);
    } else {
      illegal_action(pplayer, pactor, action_type,
                     punit ? unit_owner(punit) : NULL,
                     NULL, NULL, punit, disturb_player, ACT_REQ_PLAYER);
      unit_query_impossible(pc, actor_id, target_id, disturb_player);
      return;
    }
    break;
  case ACTION_SPY_INCITE_CITY:
  case ACTION_SPY_INCITE_CITY_ESC:
    if (pcity
        && is_action_enabled_unit_on_city(action_type,
                                          pactor, pcity)) {
      dsend_packet_unit_action_answer(pc,
                                      actor_id, target_id,
                                      city_incite_cost(pplayer, pcity),
                                      action_type, disturb_player);
    } else {
      illegal_action(pplayer, pactor, action_type,
                     pcity ? city_owner(pcity) : NULL,
                     NULL, pcity, NULL, disturb_player, ACT_REQ_PLAYER);
      unit_query_impossible(pc, actor_id, target_id, disturb_player);
      return;
    }
    break;
  case ACTION_UPGRADE_UNIT:
    if (pcity
        && is_action_enabled_unit_on_city(action_type,
                                          pactor, pcity)) {
      const struct unit_type *tgt_utype;
      int upgr_cost;

      tgt_utype = can_upgrade_unittype(pplayer, unit_type_get(pactor));
      /* Already checked via is_action_enabled_unit_on_city() */
      fc_assert_ret(tgt_utype);
      upgr_cost = unit_upgrade_price(pplayer,
                                      unit_type_get(pactor), tgt_utype);

      dsend_packet_unit_action_answer(pc,
                                      actor_id, target_id,
                                      upgr_cost, action_type,
                                      disturb_player);
    } else {
      illegal_action(pplayer, pactor, action_type,
                     pcity ? city_owner(pcity) : NULL,
                     NULL, pcity, NULL, disturb_player, ACT_REQ_PLAYER);
      unit_query_impossible(pc, actor_id, target_id, disturb_player);
      return;
    }
    break;
  case ACTION_SPY_TARGETED_SABOTAGE_CITY:
  case ACTION_SPY_TARGETED_SABOTAGE_CITY_ESC:
  case ACTION_STRIKE_BUILDING:
    if (pcity
        && is_action_enabled_unit_on_city(action_type,
                                          pactor, pcity)) {
      spy_send_sabotage_list(pc, pactor, pcity,
                             action_by_number(action_type), disturb_player);
    } else {
      illegal_action(pplayer, pactor, action_type,
                     pcity ? city_owner(pcity) : NULL,
                     NULL, pcity, NULL, disturb_player, ACT_REQ_PLAYER);
      unit_query_impossible(pc, actor_id, target_id, disturb_player);
      return;
    }
    break;
  default:
    unit_query_impossible(pc, actor_id, target_id, disturb_player);
    return;
  };
}

/**********************************************************************//**
  Handle a request to do an action.

  action_type must be a valid action.
**************************************************************************/
void handle_unit_do_action(struct player *pplayer,
                           const int actor_id,
                           const int target_id,
                           const int sub_tgt_id,
                           const char *name,
                           const action_id action_type)
{
  (void) unit_perform_action(pplayer, actor_id, target_id, sub_tgt_id, name,
                             action_type, ACT_REQ_PLAYER);
}

/**********************************************************************//**
  Handle unit action

  action_type must be a valid action.
**************************************************************************/
void unit_do_action(struct player *pplayer,
                    const int actor_id,
                    const int target_id,
                    const int sub_tgt_id,
                    const char *name,
                    const action_id action_type)
{
  unit_perform_action(pplayer, actor_id, target_id,
                      sub_tgt_id, name, action_type, ACT_REQ_PLAYER);
}

/**********************************************************************//**
  Execute a request to perform an action and let the caller know if it was
  performed or not.

  The action must be a valid action.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
bool unit_perform_action(struct player *pplayer,
                         const int actor_id,
                         const int target_id,
                         const int sub_tgt_id,
                         const char *name,
                         const action_id action_type,
                         const enum action_requester requester)
{
  struct action *paction;
  struct unit *actor_unit = player_unit_by_number(pplayer, actor_id);
  struct tile *target_tile = index_to_tile(&(wld.map), target_id);
  struct extra_type *target_extra;
  struct unit *punit = game_unit_by_number(target_id);
  struct city *pcity = game_city_by_number(target_id);

  if (!action_id_exists(action_type)) {
    /* Non existing action */
    log_error("unit_perform_action() the action %d doesn't exist.",
              action_type);

    return FALSE;
  }

  if (sub_tgt_id >= 0 && sub_tgt_id < MAX_EXTRA_TYPES
      && sub_tgt_id != EXTRA_NONE) {
    target_extra = extra_by_number(sub_tgt_id);
    fc_assert(!(target_extra->ruledit_disabled));
  } else {
    target_extra = NULL;
  }

  paction = action_by_number(action_type);

  if (action_get_activity(paction) != ACTIVITY_LAST
      && unit_activity_needs_target_from_client(
           action_get_activity(paction))
      && target_extra == NULL) {
    /* Missing required action extra target. */
    log_verbose("unit_perform_action() action %d requires action "
                "but extra id %d is invalid.",
                action_type, sub_tgt_id);
    return FALSE;
  }

  if (NULL == actor_unit) {
    /* Probably died or bribed. */
    log_verbose("handle_unit_do_action() invalid actor %d",
                actor_id);
    return FALSE;
  }

  if (paction->unitwaittime_controlled
      && !unit_can_do_action_now(actor_unit, "unit_perform_action")) {
    /* Action not possible due to unitwaittime setting. */
    return FALSE;
  }

#define ACTION_STARTED_UNIT_CITY(action, actor, target, action_performer) \
  if (pcity                                                               \
      && is_action_enabled_unit_on_city(action_type,                      \
                                       actor_unit, pcity)) {              \
    bool success;                                                         \
    script_server_signal_emit("action_started_unit_city",                 \
                              action_by_number(action), actor, target);   \
    if (!actor || !unit_is_alive(actor_id)) {                             \
      /* Actor unit was destroyed during pre action Lua. */               \
      return FALSE;                                                       \
    }                                                                     \
    if (!target || !city_exist(target_id)) {                              \
      /* Target city was destroyed during pre action Lua. */              \
      return FALSE;                                                       \
    }                                                                     \
    success = action_performer;                                           \
    if (success) {                                                        \
      action_success_actor_price(paction, actor_id, actor);               \
    }                                                                     \
    return success;                                                       \
  } else {                                                                \
    illegal_action(pplayer, actor_unit, action_type,                      \
                   pcity ? city_owner(pcity) : NULL, NULL, pcity, NULL,   \
                   TRUE, requester);                                      \
  }

#define ACTION_STARTED_UNIT_SELF(action, actor, action_performer)         \
  if (actor_unit                                                          \
      && is_action_enabled_unit_on_self(action_type, actor_unit)) {       \
    bool success;                                                         \
    script_server_signal_emit("action_started_unit_self",                 \
                              action_by_number(action), actor);           \
    if (!actor || !unit_is_alive(actor_id)) {                             \
      /* Actor unit was destroyed during pre action Lua. */               \
      return FALSE;                                                       \
    }                                                                     \
    success = action_performer;                                           \
    if (success) {                                                        \
      action_success_actor_price(paction, actor_id, actor);               \
      action_success_target_pay_mp(paction, target_id, punit);            \
    }                                                                     \
    return success;                                                       \
  } else {                                                                \
    illegal_action(pplayer, actor_unit, action_type,                      \
                   unit_owner(actor_unit), NULL, NULL, actor_unit,        \
                   TRUE, requester);                                      \
  }

#define ACTION_STARTED_UNIT_UNIT(action, actor, target, action_performer) \
  if (punit                                                               \
      && is_action_enabled_unit_on_unit(action_type, actor_unit, punit)) {\
    bool success;                                                         \
    script_server_signal_emit("action_started_unit_unit",                 \
                              action_by_number(action), actor, target);   \
    if (!actor || !unit_is_alive(actor_id)) {                             \
      /* Actor unit was destroyed during pre action Lua. */               \
      return FALSE;                                                       \
    }                                                                     \
    if (!target || !unit_is_alive(target_id)) {                           \
      /* Target unit was destroyed during pre action Lua. */              \
      return FALSE;                                                       \
    }                                                                     \
    success = action_performer;                                           \
    if (success) {                                                        \
      action_success_actor_price(paction, actor_id, actor);               \
    }                                                                     \
    return success;                                                       \
  } else {                                                                \
    illegal_action(pplayer, actor_unit, action_type,                      \
                   punit ? unit_owner(punit) : NULL, NULL, NULL, punit,   \
                   TRUE, requester);                                      \
  }

#define ACTION_STARTED_UNIT_UNITS(action, actor, target, action_performer)\
  if (target_tile                                                         \
      && is_action_enabled_unit_on_units(action_type,                     \
                                         actor_unit, target_tile)) {      \
    bool success;                                                         \
    script_server_signal_emit("action_started_unit_units",                \
                              action_by_number(action), actor, target);   \
    if (!actor || !unit_is_alive(actor_id)) {                             \
      /* Actor unit was destroyed during pre action Lua. */               \
      return FALSE;                                                       \
    }                                                                     \
    success = action_performer;                                           \
    if (success) {                                                        \
      action_success_actor_price(paction, actor_id, actor);               \
    }                                                                     \
    return success;                                                       \
  } else {                                                                \
    illegal_action(pplayer, actor_unit, action_type,                      \
                   NULL, target_tile, NULL, NULL,                         \
                   TRUE, requester);                                      \
  }

#define ACTION_STARTED_UNIT_TILE(action, actor, target, action_performer) \
  if (target_tile                                                         \
      && is_action_enabled_unit_on_tile(action_type,                      \
                                        actor_unit, target_tile,          \
                                        target_extra)) {                  \
    bool success;                                                         \
    script_server_signal_emit("action_started_unit_tile",                 \
                              action_by_number(action), actor, target);   \
    if (!actor || !unit_is_alive(actor_id)) {                             \
      /* Actor unit was destroyed during pre action Lua. */               \
      return FALSE;                                                       \
    }                                                                     \
    success = action_performer;                                           \
    if (success) {                                                        \
      action_success_actor_price(paction, actor_id, actor);               \
    }                                                                     \
    return success;                                                       \
  } else {                                                                \
    illegal_action(pplayer, actor_unit, action_type,                      \
                   target_tile ? tile_owner(target_tile) : NULL,          \
                   target_tile, NULL, NULL,                               \
                   TRUE, requester);                                      \
  }

  switch (action_type) {
  case ACTION_SPY_BRIBE_UNIT:
    ACTION_STARTED_UNIT_UNIT(action_type, actor_unit, punit,
                             diplomat_bribe(pplayer, actor_unit, punit,
                                            paction));
    break;
  case ACTION_SPY_SABOTAGE_UNIT:
  case ACTION_SPY_SABOTAGE_UNIT_ESC:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_UNIT(action_type, actor_unit, punit,
                             spy_sabotage_unit(pplayer, actor_unit,
                                               punit, paction));
    break;
  case ACTION_EXPEL_UNIT:
    ACTION_STARTED_UNIT_UNIT(action_type, actor_unit, punit,
                             do_expel_unit(pplayer, actor_unit, punit,
                                           paction));
    break;
  case ACTION_HEAL_UNIT:
    ACTION_STARTED_UNIT_UNIT(action_type, actor_unit, punit,
                             do_heal_unit(pplayer, actor_unit, punit,
                                          paction));
    break;
  case ACTION_TRANSPORT_ALIGHT:
    ACTION_STARTED_UNIT_UNIT(action_type, actor_unit, punit,
                             do_unit_alight(pplayer, actor_unit, punit,
                                            paction));
    break;
  case ACTION_TRANSPORT_UNLOAD:
    ACTION_STARTED_UNIT_UNIT(action_type, actor_unit, punit,
                             do_unit_unload(pplayer, actor_unit, punit,
                                            paction));
    break;
  case ACTION_TRANSPORT_BOARD:
    ACTION_STARTED_UNIT_UNIT(action_type, actor_unit, punit,
                             do_unit_board(pplayer, actor_unit, punit,
                                           paction));
    break;
  case ACTION_TRANSPORT_EMBARK:
    ACTION_STARTED_UNIT_UNIT(action_type, actor_unit, punit,
                             do_unit_embark(pplayer, actor_unit, punit,
                                            paction));
    break;
  case ACTION_DISBAND_UNIT:
    /* All consequences are handled by the action system. */
    ACTION_STARTED_UNIT_SELF(action_type, actor_unit, TRUE);
    break;
  case ACTION_FORTIFY:
    ACTION_STARTED_UNIT_SELF(action_type, actor_unit,
                             unit_activity_handling_targeted(actor_unit,
                                                             ACTIVITY_FORTIFYING,
                                                             &target_extra));
    break;
  case ACTION_CONVERT:
    ACTION_STARTED_UNIT_SELF(action_type, actor_unit,
                             unit_activity_handling(actor_unit,
                                                    ACTIVITY_CONVERT));
    break;
  case ACTION_SPY_SABOTAGE_CITY:
  case ACTION_SPY_SABOTAGE_CITY_ESC:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             diplomat_sabotage(pplayer, actor_unit, pcity,
                                               B_LAST, paction));
    break;
  case ACTION_SPY_TARGETED_SABOTAGE_CITY:
  case ACTION_SPY_TARGETED_SABOTAGE_CITY_ESC:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             diplomat_sabotage(pplayer, actor_unit, pcity,
                                               sub_tgt_id, paction));
    break;
  case ACTION_SPY_SABOTAGE_CITY_PRODUCTION:
  case ACTION_SPY_SABOTAGE_CITY_PRODUCTION_ESC:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             diplomat_sabotage(pplayer, actor_unit, pcity,
                                               -1, paction));
    break;
  case ACTION_SPY_POISON:
  case ACTION_SPY_POISON_ESC:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             spy_poison(pplayer, actor_unit, pcity,
                                        paction));
    break;
  case ACTION_SPY_SPREAD_PLAGUE:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             spy_spread_plague(pplayer, actor_unit, pcity,
                                               paction));
    break;
  case ACTION_SPY_INVESTIGATE_CITY:
  case ACTION_INV_CITY_SPEND:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             diplomat_investigate(pplayer,
                                                  actor_unit, pcity,
                                                  paction));
    break;
  case ACTION_ESTABLISH_EMBASSY:
  case ACTION_ESTABLISH_EMBASSY_STAY:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             diplomat_embassy(pplayer, actor_unit, pcity,
                                              paction));
    break;
  case ACTION_SPY_INCITE_CITY:
  case ACTION_SPY_INCITE_CITY_ESC:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             diplomat_incite(pplayer, actor_unit, pcity,
                                             paction));
    break;
  case ACTION_SPY_STEAL_TECH:
  case ACTION_SPY_STEAL_TECH_ESC:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             diplomat_get_tech(pplayer, actor_unit, pcity,
                                               A_UNSET, paction));
    break;
  case ACTION_SPY_TARGETED_STEAL_TECH:
  case ACTION_SPY_TARGETED_STEAL_TECH_ESC:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             diplomat_get_tech(pplayer, actor_unit, pcity,
                                               sub_tgt_id, paction));
    break;
  case ACTION_SPY_STEAL_GOLD:
  case ACTION_SPY_STEAL_GOLD_ESC:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             spy_steal_gold(pplayer, actor_unit, pcity,
                                            paction));
    break;
  case ACTION_STEAL_MAPS:
  case ACTION_STEAL_MAPS_ESC:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             spy_steal_some_maps(pplayer, actor_unit,
                                                 pcity, paction));
    break;
  case ACTION_TRADE_ROUTE:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             do_unit_establish_trade(pplayer, actor_unit,
                                                     pcity, paction));
    break;
  case ACTION_MARKETPLACE:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             do_unit_establish_trade(pplayer, actor_unit,
                                                     pcity, paction));
    break;
  case ACTION_HELP_WONDER:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             unit_do_help_build(pplayer, actor_unit, pcity,
                                                paction));
    break;
  case ACTION_SPY_NUKE:
  case ACTION_SPY_NUKE_ESC:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             spy_nuke_city(pplayer, actor_unit, pcity,
                                           paction));
    break;
  case ACTION_JOIN_CITY:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             city_add_unit(pplayer, actor_unit, pcity,
                                           paction));
    break;
  case ACTION_DESTROY_CITY:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             unit_do_destroy_city(pplayer,
                                                  actor_unit, pcity,
                                                  paction));
    break;
  case ACTION_RECYCLE_UNIT:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             unit_do_help_build(pplayer, actor_unit, pcity,
                                                paction));
    break;
  case ACTION_HOME_CITY:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             do_unit_change_homecity(actor_unit, pcity));
    break;
  case ACTION_UPGRADE_UNIT:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             do_unit_upgrade(pplayer, actor_unit,
                                             pcity, requester));
    break;
  case ACTION_CONQUER_CITY:
  case ACTION_CONQUER_CITY2:
    /* Difference is caused by the ruleset. ("Fake generalized" actions) */
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             do_unit_conquer_city(pplayer, actor_unit,
                                                  pcity, paction));
    break;
  case ACTION_STRIKE_BUILDING:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             do_unit_strike_city_building(pplayer,
                                                          actor_unit,
                                                          pcity,
                                                          sub_tgt_id,
                                                          paction));
    break;
  case ACTION_STRIKE_PRODUCTION:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             do_unit_strike_city_building(pplayer,
                                                          actor_unit,
                                                          pcity,
                                                          -1,
                                                          paction));
    break;
  case ACTION_AIRLIFT:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             do_airline(actor_unit, pcity));
    break;
  case ACTION_NUKE_CITY:
    ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity,
                             unit_nuke(pplayer, actor_unit, city_tile(pcity),
                                       paction));
    break;
  case ACTION_CAPTURE_UNITS:
    ACTION_STARTED_UNIT_UNITS(action_type, actor_unit, target_tile,
                              do_capture_units(pplayer, actor_unit,
                                               target_tile, paction));
    break;
  case ACTION_BOMBARD:
  case ACTION_BOMBARD2:
  case ACTION_BOMBARD3:
    /* Difference is caused by the ruleset. ("Fake generalized" actions) */
    ACTION_STARTED_UNIT_UNITS(action_type, actor_unit, target_tile,
                              unit_bombard(actor_unit, target_tile,
                                           paction, false));
    break;
  case ACTION_ATTACK:
  case ACTION_SUICIDE_ATTACK:
    /* Difference is caused by data in the action structure. */
    ACTION_STARTED_UNIT_UNITS(action_type, actor_unit, target_tile,
                              do_attack(actor_unit, target_tile, paction));
    break;
  case ACTION_NUKE_UNITS:
    ACTION_STARTED_UNIT_UNITS(action_type, actor_unit, target_tile,
                              unit_nuke(pplayer, actor_unit, target_tile,
                                        paction));
    break;
  case ACTION_SPY_ATTACK:
    ACTION_STARTED_UNIT_UNITS(action_type, actor_unit, target_tile,
                              spy_attack(pplayer, actor_unit, target_tile,
                                         paction));
    break;  
  case ACTION_FOUND_CITY:
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             city_build(pplayer, actor_unit,
                                        target_tile, name, paction));
    break;
  case ACTION_NUKE:
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             unit_nuke(pplayer, actor_unit, target_tile,
                                       paction));
    break;
  case ACTION_PARADROP:
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             do_paradrop(actor_unit, target_tile, paction));
    break;
  case ACTION_TRANSPORT_DISEMBARK1:
  case ACTION_TRANSPORT_DISEMBARK2:
    /* Difference is caused by the ruleset. ("Fake generalized" actions) */
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             do_disembark(pplayer, actor_unit,
                                          target_tile, paction));
    break;
  case ACTION_TRANSFORM_TERRAIN:
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             unit_activity_handling(actor_unit,
                                                    ACTIVITY_TRANSFORM));
    break;
  case ACTION_CULTIVATE:
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             unit_activity_handling_targeted(actor_unit,
                                                             ACTIVITY_CULTIVATE,
                                                             &target_extra));
    break;
  case ACTION_PLANT:
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             unit_activity_handling_targeted(actor_unit,
                                                             ACTIVITY_PLANT,
                                                             &target_extra));
    break;
  case ACTION_PILLAGE:
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             unit_activity_handling_targeted(actor_unit,
                                                             ACTIVITY_PILLAGE,
                                                             &target_extra));
    break;
  case ACTION_ROAD:
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             unit_activity_handling_targeted(actor_unit,
                                                             ACTIVITY_GEN_ROAD,
                                                             &target_extra));
    break;
  case ACTION_BASE:
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             unit_activity_handling_targeted(actor_unit,
                                                             ACTIVITY_BASE,
                                                             &target_extra));
    break;
  case ACTION_MINE:
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             unit_activity_handling_targeted(actor_unit,
                                                             ACTIVITY_MINE,
                                                             &target_extra));
    break;
  case ACTION_IRRIGATE:
    ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile,
                             unit_activity_handling_targeted(actor_unit,
                                                             ACTIVITY_IRRIGATE,
                                                             &target_extra));
    break;
  case ACTION_USER_ACTION1:
  case ACTION_USER_ACTION2:
  case ACTION_USER_ACTION3:
    /* 100% ruleset defined. */
    switch (action_get_target_kind(paction)) {
    case ATK_CITY:
      ACTION_STARTED_UNIT_CITY(action_type, actor_unit, pcity, TRUE);
      break;
    case ATK_UNIT:
      ACTION_STARTED_UNIT_UNIT(action_type, actor_unit, punit, TRUE);
      break;
    case ATK_UNITS:
      ACTION_STARTED_UNIT_UNITS(action_type, actor_unit, target_tile, TRUE);
      break;
    case ATK_TILE:
      ACTION_STARTED_UNIT_TILE(action_type, actor_unit, target_tile, TRUE);
      break;
    case ATK_SELF:
      ACTION_STARTED_UNIT_SELF(action_type, actor_unit, TRUE);
      break;
    case ATK_COUNT:
      fc_assert(action_get_target_kind(paction) != ATK_COUNT);
      break;
    }
    break;
  case ACTION_COUNT:
    log_error("handle_unit_do_action() %s (%d) ordered to perform an "
              "invalid action.",
              unit_rule_name(actor_unit), actor_id);
    break;
  }

  /* Something must have gone wrong. */
  return FALSE;
}

/**********************************************************************//**
  Transfer a unit from one city (and possibly player) to another.
  If 'rehome' is not set, only change the player which owns the unit
  (the new owner is new_pcity's owner). Otherwise the new unit will be
  given a homecity, even if it was homeless before.
  This new homecity must be valid for this unit.
**************************************************************************/
void unit_change_homecity_handling(struct unit *punit, struct city *new_pcity,
                                   bool rehome)
{
  struct city *old_pcity = game_city_by_number(punit->homecity);
  struct player *old_owner = unit_owner(punit);
  struct player *new_owner = city_owner(new_pcity);

  /* Calling this function when new_pcity is same as old_pcity should
   * be safe with current implementation, but it is not meant to
   * be used that way. */
  fc_assert_ret(new_pcity != old_pcity);

  /* If 'rehome' is not set, this function should only be used to change
   * which player owns the unit */
  fc_assert_ret(rehome || new_owner != old_owner);

  if (old_owner != new_owner) {
    struct city *pcity = tile_city(punit->tile);

    fc_assert(!utype_player_already_has_this_unique(new_owner,
                                                    unit_type_get(punit)));

    vision_clear_sight(punit->server.vision);
    vision_free(punit->server.vision);

    if (pcity != NULL
        && !can_player_see_units_in_city(old_owner, pcity)) {
      /* Special case when city is being transferred. At this point city
       * itself has changed owner, so it's enemy city now that old owner
       * cannot see inside. All the normal methods of removing transferred
       * unit from previous owner's client think that there's no need to
       * remove unit as client shouldn't have it in first place. */
      unit_goes_out_of_sight(old_owner, punit);
    }

    /* Remove AI control of the old owner. */
    CALL_PLR_AI_FUNC(unit_lost, old_owner, punit);

    unit_list_remove(old_owner->units, punit);
    unit_list_prepend(new_owner->units, punit);
    punit->owner = new_owner;

    /* Activate AI control of the new owner. */
    CALL_PLR_AI_FUNC(unit_got, new_owner, punit);

    punit->server.vision = vision_new(new_owner, unit_tile(punit));
    unit_refresh_vision(punit);
  }

  if (rehome) {
    fc_assert(!unit_has_type_flag(punit, UTYF_NOHOME));

    /* Remove from old city first and add to new city only after that.
     * This is more robust in case old_city == new_city (currently
     * prohibited by fc_assert in the beginning of the function).
     */
    if (old_pcity) {
      /* Even if unit is dead, we have to unlink unit pointer (punit). */
      unit_list_remove(old_pcity->units_supported, punit);
      /* update unit upkeep */
      city_units_upkeep(old_pcity);
    }

    unit_list_prepend(new_pcity->units_supported, punit);

    /* update unit upkeep */
    city_units_upkeep(new_pcity);

    punit->homecity = new_pcity->id;
  }

  if (!can_unit_continue_current_activity(punit)) {
    /* This is mainly for cases where unit owner changes to one not knowing
     * Railroad tech when unit is already building railroad. */
    set_unit_activity(punit, ACTIVITY_IDLE);
  }

  /* Send info to players and observers. */
  send_unit_info(NULL, punit);

  city_refresh(new_pcity);
  send_city_info(new_owner, new_pcity);

  if (old_pcity) {
    fc_assert(city_owner(old_pcity) == old_owner);
    city_refresh(old_pcity);
    send_city_info(old_owner, old_pcity);
  }

  unit_get_goods(punit);

  fc_assert(unit_owner(punit) == city_owner(new_pcity));
}

/**********************************************************************//**
  Change a unit's home city.

  Returns TRUE iff the action could be done, FALSE if it couldn't.
**************************************************************************/
static bool do_unit_change_homecity(struct unit *punit,
                                    struct city *pcity)
{
  const char *giver = NULL;

  if (unit_owner(punit) != city_owner(pcity)) {
    /* This is a gift. Tell the receiver. */
    giver = player_name(unit_owner(punit));
  }

  unit_change_homecity_handling(punit, pcity, TRUE);

  if (punit->homecity == pcity->id && giver) {
    /* Notify the city owner about the gift he received. */
    notify_player(city_owner(pcity), city_tile(pcity), E_UNIT_BUILT,
                  ftc_server,
                  /* TRANS: other player ... unit type ... city name. */
                  _("🎁 %s transferred control over a %s %s to you in %s."),
                  giver,
                  unit_tile_link(punit),
                  UNIT_EMOJI(punit),
                  city_link(pcity));
  }

  return punit->homecity == pcity->id;
}

/**********************************************************************//**
  Help build the current production in a city.

  The amount of shields used to build the unit added to the city's shield
  stock for the current production is determined by the
  Unit_Shield_Value_Pct effect.
  
  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool unit_do_help_build(struct player *pplayer,
                               struct unit *punit,
                               struct city *pcity_dest,
                               const struct action *paction)
{
  const char *work;
  const char *prod;
  const char *action_name;
  const char *info_emoji;
  int shields;
  const struct unit_type *act_utype;

  /* Sanity check: The actor still exists. */
  fc_assert_ret_val(pplayer, FALSE);
  fc_assert_ret_val(punit, FALSE);

  /* Sanity check: The target city still exists. */
  fc_assert_ret_val(pcity_dest, FALSE);

  act_utype = unit_type_get(punit);

  shields = unit_shield_value(punit, unit_type_get(punit), paction);

  bool double_contributor = (shields >= unit_type_get(punit)->build_cost * 2) 
                          ? true : false;
  bool full_contributor = (shields >= unit_type_get(punit)->build_cost) 
                          ? true : false;
  bool three_quarters = three_quarters = 
                          (!full_contributor
                          && shields >= (float)unit_type_get(punit)->build_cost*70/100)
                          ? true : false;

  if (action_has_result(paction, ACTION_HELP_WONDER)) {
    /* Add the caravan shields */
    pcity_dest->shield_stock += shields;

    /* Will be punished for changing production to something that can't
     * receive "Help Wonder" help. */
    fc_assert(city_production_gets_caravan_shields(
                  &pcity_dest->production));
    pcity_dest->caravan_shields += shields;
  } else {
    fc_assert(action_has_result(paction, ACTION_RECYCLE_UNIT));
    /* Add the shields from recycling the unit to the city's current
     * production. */
    pcity_dest->shield_stock += shields;

    // This had to change, otherwise there is no control at all over what 
    // production types can get a Unit_Shield_Value_Pct penalty/bonus, since
    // you can just change production to allowed/bonus type, disband, then
    // change back again:
    // ...
    /* If we change production later at this turn. No penalty is added. */
    //pcity_dest->disbanded_shields += shields;
  }

  conn_list_do_buffer(pplayer->connections);

  if (action_has_result(paction, ACTION_HELP_WONDER)) {
    /* Let the player that just donated shields with "Help Wonder" know
     * the result of his donation. */
    prod = city_production_name_translation(pcity_dest);
    action_name = (is_unit_plural(punit) ? _("help build")
                                         : _("helps build"));
    info_emoji = UNIT_EMOJI(punit);
  } else {
    fc_assert(action_has_result(paction, ACTION_RECYCLE_UNIT));
    /* TRANS: Your Caravan does "Recycle Unit" to help build the
     * current production in Bergen (4 surplus).
     * "Recycle Unit" says "current production" rather than its name. */
    //prod = _("current production");
    prod = city_production_name_translation(pcity_dest);
    // Reason someone made it say "current production": you might not have
    // intel on what your ally is making who is planning to backstab you.
    // Reason it's changed: if you help make something, you get direct
    // intel on what's being made. Also, most names are shorter than 
    // 'current production', so it's a verbosity reduction for busy
    // leaders.
    if (full_contributor || three_quarters) {
      action_name = (is_unit_plural(punit) ? _("help build")
                                          : _("helps build"));
    }
    action_name = (is_unit_plural(punit) ? _("recycle to build")
                                         : _("recycles to build"));
    if (three_quarters) info_emoji = _("&#8203;[`recycle`][`75`]");
    else { 
      if (double_contributor) info_emoji = _("&#8203;[`recycle`][`200`]");
      else {
        info_emoji = full_contributor ? _("&#8203;[`recycle`][`100`]") : _("&#8203;[`recycle`][`50pct`]");
      }
    }
  }

  if (build_points_left(pcity_dest) >= 0) {
    /* TRANS: Your Caravan does "Help Wonder" to help build the
     * Pyramids in Bergen (4 left).
     * You can reorder '4' and 'left' in the actual format string. */
    work = _("left");
  } else {
    /* TRANS: Your Caravan does "Help Wonder" to help build the
     * Pyramids in Bergen (4 surplus).
     * You can reorder '4' and 'surplus' in the actual format string. */
    work = _("extra");
  }

  notify_player(pplayer, city_tile(pcity_dest), E_CARAVAN_ACTION,
                ftc_server,
                /* TRANS: Your Caravan does "Help Wonder" to help build the
                 * Pyramids in Bergen (4 surplus). */
                _("%s Your %s %s %s in %s <span class='nowrap'>(%d %s)</span>"),
                info_emoji,
                unit_link(punit),
                action_name,
                prod,
                city_link(pcity_dest), 
                abs(build_points_left(pcity_dest)),
                work);

  /* May cause an incident */
  action_consequence_success(paction, pplayer, act_utype, 
                             city_owner(pcity_dest),
                             city_tile(pcity_dest), city_link(pcity_dest));

  if (city_owner(pcity_dest) != unit_owner(punit)) {
    /* Tell the city owner about the gift he just received. */

    send_city_info(city_owner(pcity_dest), pcity_dest);
    notify_player(city_owner(pcity_dest), city_tile(pcity_dest),
                  E_CARAVAN_ACTION, ftc_server,
                  /* TRANS: We received help to build the Pyramids in Bergen
                   * from [a] Persian Caravan (4 surplus). */
                  _("🎁 We received help to build the %s [`%s`] in %s from %s %s %s %s "
                    "(%d %s)."),
                  city_production_name_translation(pcity_dest),
                  city_production_name_translation(pcity_dest),
                  city_link(pcity_dest),
                  (is_unit_plural(punit) ? "" : indefinite_article_for_word(nation_adjective_for_player(pplayer),false)),
                  nation_adjective_for_player(pplayer),
                  unit_link(punit), UNIT_EMOJI(punit),
                  abs(build_points_left(pcity_dest)),
                  work);
  }

  send_player_info_c(pplayer, pplayer->connections);
  send_city_info(pplayer, pcity_dest);
  conn_list_do_unbuffer(pplayer->connections);

  return TRUE;
}

/**********************************************************************//**
  This function assumes that the target city is valid. It should only be
  called after checking that the unit legally can join the target city.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool city_add_unit(struct player *pplayer, struct unit *punit,
                          struct city *pcity, const struct action *paction)
{
  int amount = unit_pop_value(punit);
  const struct unit_type *act_utype;

  // Handle 0 pop cost migrant type possibilities: "shields for rapture"
  amount = (amount >= unit_type_get(punit)->city_size) 
           ? amount : unit_type_get(punit)->city_size;

  /* Sanity check: The actor is still alive. */
  fc_assert_ret_val(punit, FALSE);

  act_utype = unit_type_get(punit);

  /* Sanity check: The target city still exists. */
  fc_assert_ret_val(pcity, FALSE);

  fc_assert_ret_val(amount > 0, FALSE);

  city_size_add(pcity, amount);
  /* Make the new people something, otherwise city fails the checks */
  pcity->specialists[DEFAULT_SPECIALIST] += amount;
  citizens_update(pcity, unit_nationality(punit));
  /* Refresh the city data. */
  city_refresh(pcity);
  // Now make the worker do something besides entertain and eater other people's food:
  auto_arrange_workers(pcity);
  city_refresh(pcity);

  /* Notify the unit owner that the unit successfully joined the city. */
  notify_player(pplayer, city_tile(pcity), E_CITY_BUILD, ftc_server,
                _("➕ %s added to aid %s in growing."),
                unit_tile_link(punit),
                city_link(pcity));
  if (pplayer != city_owner(pcity)) {
    /* Notify the city owner when a foreign unit joins a city. */
    notify_player(city_owner(pcity), city_tile(pcity), E_CITY_BUILD,
                  ftc_server,
                  /* TRANS: another player had his unit joint your city. */
                  _("➕ %s adds %s to your city %s."),
                  player_name(unit_owner(punit)),
                  unit_tile_link(punit),
                  city_link(pcity));;
  }

  action_consequence_success(paction, pplayer, act_utype,
                             city_owner(pcity), city_tile(pcity),
                             city_link(pcity));

  sanity_check_city(pcity);

  send_city_info(NULL, pcity);

  script_server_signal_emit("city_size_change", pcity, amount, "unit_added");

  return TRUE;
}

/**********************************************************************//**
  This function assumes a certain level of consistency checking: There
  is no city under punit->(x,y), and that location is a valid one on
  which to build a city. It should only be called after a call to a
  function like test_unit_add_or_build_city, which does the checking.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool city_build(struct player *pplayer, struct unit *punit,
                       struct tile *ptile, const char *name,
                       const struct action *paction)
{
  char message[1024];
  int size;
  struct player *nationality;
  struct player *towner;
  const struct unit_type *act_utype;

  /* Sanity check: The actor still exists. */
  fc_assert_ret_val(pplayer, FALSE);
  fc_assert_ret_val(punit, FALSE);

  act_utype = unit_type_get(punit);
  towner = tile_owner(ptile);

  if (!is_allowed_city_name(pplayer, name, message, sizeof(message))) {
    notify_player(pplayer, ptile, E_BAD_COMMAND, ftc_server,
                  "%s", message);
    return FALSE;
  }

  nationality = unit_nationality(punit);

  create_city(pplayer, ptile, name, nationality);
  size = unit_type_get(punit)->city_size;
  if (size > 1) {
    struct city *pcity = tile_city(ptile);

    fc_assert_ret_val(pcity != NULL, FALSE);

    city_change_size(pcity, size, nationality, NULL);
  }

  /* May cause an incident even if the target tile is unclaimed. A ruleset
   * could give everyone a casus belli against the city founder. A rule
   * like that would make sense in a story where deep ecology is on the
   * table. (See also Voluntary Human Extinction Movement) */
  action_consequence_success(paction, pplayer, act_utype, towner,
                             ptile, tile_link(ptile));

  return TRUE;
}

/**********************************************************************//**
  This function handles GOTO path requests from the client.
**************************************************************************/
void handle_goto_path_req(struct player *pplayer, int unit_id, int goal)
{
  struct unit *punit = player_unit_by_number(pplayer, unit_id);
  struct tile *ptile = index_to_tile(&(wld.map), goal);
  struct pf_parameter parameter;
  struct pf_map *pfm;
  struct pf_path *path;
  struct tile *old_tile;
  int i = 0;
  struct packet_goto_path p;

  if (NULL == punit) {
    /* Shouldn't happen */
    log_error("handle_unit_move()"
              " invalid unit %d",
              unit_id);
    return;
  }

  if (NULL == ptile) {
    /* Shouldn't happen */
    log_error("handle_unit_move()"
              " invalid %s (%d) tile (%d,%d)",
              unit_rule_name(punit),
              unit_id,
              TILE_XY(ptile));
    return;
  }

  if (!is_player_phase(unit_owner(punit), game.info.phase)) {
    /* Client is out of sync, ignore */
    log_verbose("handle_unit_move()"
                " invalid %s (%d) %s != phase %d",
                unit_rule_name(punit),
                unit_id,
                nation_rule_name(nation_of_unit(punit)),
                game.info.phase);
    return;
  }

  p.unit_id = punit->id;
  p.dest = tile_index(ptile);

  /* Use path-finding to find a goto path. */
  pft_fill_unit_parameter(&parameter, punit);
  pfm = pf_map_new(&parameter);
  path = pf_map_path(pfm, ptile);
  pf_map_destroy(pfm);

  if (path) {
    int total_mc = 0;

    p.length = path->length - 1;

    old_tile = path->positions[0].tile;

    for (i = 0; i < path->length - 1; i++) {
      struct tile *new_tile = path->positions[i + 1].tile;
      int dir;

      total_mc += path->positions[1].total_MC;
      if (same_pos(new_tile, old_tile)) {
        dir = -1;
      } else {
        dir = get_direction_for_step(&(wld.map), old_tile, new_tile);
      }
      old_tile = new_tile;
      p.dir[i] = dir;

    }
    pf_path_destroy(path);
    p.turns = total_mc / unit_move_rate(punit);
    send_packet_goto_path(pplayer->current_conn, &p);

  } else {
    return;
  }
}

/**********************************************************************//**
  Handle change in unit activity.
**************************************************************************/
static void handle_unit_change_activity_real(struct player *pplayer,
                                             int unit_id,
                                             enum unit_activity activity,
                                             struct extra_type *activity_target)
{
  struct unit *punit = player_unit_by_number(pplayer, unit_id);

  if (NULL == punit) {
    /* Probably died or bribed. */
    log_verbose("handle_unit_change_activity() invalid unit %d", unit_id);
    return;
  }

  if (punit->activity == activity
      && punit->activity_target == activity_target
      && !punit->ai_controlled // Treat change in ai.control as change in activity, so idle autosettlers behave correctly.
      && !(activity == ACTIVITY_PILLAGE && unit_can_iPillage(punit)) // Can change your mind from regular pillage to iPillage.
      ) {
    return;
  }

  /* Remove city spot reservations for AI settlers on city founding
   * mission, before goto_tile reset. */
  if (punit->server.adv->task != AUT_NONE) {
    adv_unit_new_task(punit, AUT_NONE, NULL);
  }

  punit->ai_controlled = FALSE;
  punit->goto_tile = NULL;

  if (activity == ACTIVITY_GOTO) {
    /* Don't permit a client to set a unit's activity to ACTIVITY_GOTO.
     * Setting ACTIVITY_GOTO from the client results in a unit indicating
     * it is going somewhere while it is standing still. The appearance of
     * the unit doing something can trick the user to not make use of it.
     *
     * Handled here because adv_follow_path() uses unit_activity_handling()
     * to set a unit's activity to ACTIVITY_GOTO. */
    return;
  }

  /* The activity can now be set. */
  unit_activity_handling_targeted(punit, activity, &activity_target);

  if (activity == ACTIVITY_EXPLORE) {
    /* Exploring is handled here explicitly, since the player expects to
     * see an immediate response from setting a unit to auto-explore.
     * Handling it deeper in the code leads to some tricky recursive loops -
     * see PR#2631. */
    if (punit->moves_left > 0) {
      do_explore(punit);
    }
  }
}

/**********************************************************************//**
  Handle change in unit activity.
**************************************************************************/
void handle_unit_change_activity(struct player *pplayer, int unit_id,
                                 enum unit_activity activity,
                                 int target_id)
{
  struct extra_type *activity_target;

  if (activity == ACTIVITY_PILLAGE) {
    struct unit *punit = player_unit_by_number(pplayer, unit_id);
    if (target_id >= ACTIVITY_IPILLAGE_OVERRIDE_FLAG) {  // & causes 'true' for target_id == -1
      // Client requests to override default iPillage with standard Pillage.
      target_id -= ACTIVITY_IPILLAGE_OVERRIDE_FLAG; // convert target_id to valid again.
      if (punit) punit->server.iPillage_no = true;
    } 
    else punit->server.iPillage_no = false;
  }

  if (target_id < 0 || target_id >= game.control.num_extra_types) {
    activity_target = NULL;
  } else {
    activity_target = extra_by_number(target_id);
  }

#ifdef FREECIV_WEB
  /* Web-client is not capable of selecting target, so we do it server side */
  if (activity_target == NULL) {
    struct unit *punit = player_unit_by_number(pplayer, unit_id);
    bool required = TRUE;

    if (punit == NULL) {
      return;
    }

    if (activity == ACTIVITY_IRRIGATE) {
      struct tile *ptile = unit_tile(punit);
      struct terrain *pterrain = tile_terrain(ptile);

      if (pterrain->irrigation_result != pterrain) {
        required = FALSE;
      } else {
        activity_target = next_extra_for_tile(ptile, EC_IRRIGATION,
                                              pplayer, punit);
      }
    } else if (activity == ACTIVITY_MINE) {
      struct tile *ptile = unit_tile(punit);
      struct terrain *pterrain = tile_terrain(ptile);

      if (pterrain->mining_result != pterrain) {
        required = FALSE;
      } else {
        activity_target = next_extra_for_tile(ptile, EC_MINE,
                                              pplayer, punit);
      }
    } else if (activity == ACTIVITY_BASE) {
      struct tile *ptile = unit_tile(punit);
      struct base_type *pbase =
        get_base_by_gui_type(BASE_GUI_FORTRESS, punit, ptile);

      if (pbase != NULL) {
        activity_target = base_extra_get(pbase);
      }

    } else if (activity == ACTIVITY_POLLUTION) {
      activity_target = prev_extra_in_tile(unit_tile(punit), ERM_CLEANPOLLUTION,
                                           pplayer, punit);
    } else if (activity == ACTIVITY_FALLOUT) {
      activity_target = prev_extra_in_tile(unit_tile(punit), ERM_CLEANFALLOUT,
                                           pplayer, punit);
    } else {
      required = FALSE;
    }

    if (activity_target == NULL && required) {
      /* Nothing more we can do */
      return;
    }
  }
#endif /* FREECIV_WEB */

  handle_unit_change_activity_real(pplayer, unit_id, activity, activity_target);
}

/**********************************************************************//**
  Make sure everyone who can see combat does.
**************************************************************************/
static void see_combat(struct unit *pattacker, struct unit *pdefender)
{
  struct packet_unit_short_info unit_att_short_packet, unit_def_short_packet;
  struct packet_unit_info unit_att_packet, unit_def_packet;

  /* 
   * Special case for attacking/defending:
   * 
   * Normally the player doesn't get the information about the units inside a
   * city. However for attacking/defending the player has to know the unit of
   * the other side.  After the combat a remove_unit packet will be sent
   * to the client to tidy up.
   *
   * Note these packets must be sent out before unit_versus_unit is called,
   * so that the original unit stats (HP) will be sent.
   */
  package_short_unit(pattacker, &unit_att_short_packet,
                     UNIT_INFO_IDENTITY, 0);
  package_short_unit(pdefender, &unit_def_short_packet,
                     UNIT_INFO_IDENTITY, 0);
  package_unit(pattacker, &unit_att_packet);
  package_unit(pdefender, &unit_def_packet);

  conn_list_iterate(game.est_connections, pconn) {
    struct player *pplayer = pconn->playing;

    if (pplayer != NULL) {

      /* NOTE: this means the player can see combat between submarines even
       * if neither sub is visible.  See similar comment in send_combat. */
      if (map_is_known_and_seen(unit_tile(pattacker), pplayer, V_MAIN)
          || map_is_known_and_seen(unit_tile(pdefender), pplayer,
                                   V_MAIN)) {

        /* Units are sent even if they were visible already. They may
         * have changed orientation for combat. */
        if (pplayer == unit_owner(pattacker)) {
          send_packet_unit_info(pconn, &unit_att_packet);
        } else {
          send_packet_unit_short_info(pconn, &unit_att_short_packet, FALSE);
        }
        
        if (pplayer == unit_owner(pdefender)) {
          send_packet_unit_info(pconn, &unit_def_packet);
        } else {
          send_packet_unit_short_info(pconn, &unit_def_short_packet, FALSE);
        }
      }
    } else if (pconn->observer) {
      /* Global observer sees everything... */
      send_packet_unit_info(pconn, &unit_att_packet);
      send_packet_unit_info(pconn, &unit_def_packet);
    }
  } conn_list_iterate_end;
}

/**********************************************************************//**
  Send combat info to players.
**************************************************************************/
static void send_combat(struct unit *pattacker, struct unit *pdefender, 
                        int att_veteran, int def_veteran, int bombard)
{
  struct packet_unit_combat_info combat;

  combat.attacker_unit_id = pattacker->id;
  combat.defender_unit_id = pdefender->id;
  combat.attacker_hp = pattacker->hp;
  combat.defender_hp = pdefender->hp;
  combat.make_att_veteran = att_veteran;
  combat.make_def_veteran = def_veteran;

  players_iterate(other_player) {
    /* NOTE: this means the player can see combat between submarines even
     * if neither sub is visible.  See similar comment in see_combat. */
    if (map_is_known_and_seen(unit_tile(pattacker), other_player, V_MAIN)
        || map_is_known_and_seen(unit_tile(pdefender), other_player,
                                 V_MAIN)) {
      lsend_packet_unit_combat_info(other_player->connections, &combat);

      /* 
       * Remove the client knowledge of the units.  This corresponds to the
       * send_packet_unit_short_info calls up above.
       */
      if (!can_player_see_unit(other_player, pattacker)) {
	unit_goes_out_of_sight(other_player, pattacker);
      }
      if (!can_player_see_unit(other_player, pdefender)) {
	unit_goes_out_of_sight(other_player, pdefender);
      }
    }
  } players_iterate_end;

  /* Send combat info to non-player observers as well.  They already know
   * about the unit so no unit_info is needed. */
  conn_list_iterate(game.est_connections, pconn) {
    if (NULL == pconn->playing && pconn->observer) {
      send_packet_unit_combat_info(pconn, &combat);
    }
  } conn_list_iterate_end;
}

/**********************************************************************//**
  This function assumes the bombard is legal. The calling function should
  have already made all necessary checks.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.

  bool is_retaliation = flags if this is an initiated bombardment, or if
   this bombardment is a tit-for-tat "reverse bombardment" retaliation.
**************************************************************************/
static bool unit_bombard(struct unit *punit, struct tile *ptile,
                         const struct action *paction, bool is_retaliation)
{
  struct player *pplayer = unit_owner(punit);
  struct city *pcity = tile_city(ptile);
  int def_moves_used;
  const struct unit_type *act_utype;

  /* Sanity check: The actor still exists. */
  fc_assert_ret_val(pplayer, FALSE);
  fc_assert_ret_val(punit, FALSE);

  act_utype = unit_type_get(punit);
  
  struct bombard_stats pstats;
  unit_get_bombard_stats(&pstats, punit);
  int bombard_rate = unit_type_get(punit)->bombard_rate;
  // handle encoding for "infinite" rounds, a thereotical case no one will ever do:
  if (bombard_rate<0) bombard_rate = 1000; // 1000 is our 'infinity'.
  if (is_retaliation) { // initiators use normal bombard stats
    /* Retaliation bombardment is stipulated only for
       some units, in their extra_unit_stats: */
    struct extra_unit_stats estats;
    unit_get_extra_stats(&estats, punit);
    // for re-usability of code, construct bombard_stats from retaliation stats:
    bombard_rate = estats.bombard_retaliate_rounds;
    pstats.bombard_stay_fortified = true; // defenders never lose fortify
    pstats.bombard_move_cost = 0;
    // pstats->bombard_primary_targets = retaliator uses same val as its bombard_stats
    // pstats->bombard_primary_kills =   retaliator uses same val as its bombard_stats
    // pstats->bombard_atk_mod =         retaliator uses same val as its bombard_stats
    // The above 3 stats can be set on units who still can't initiate bombard, to inform
    // how they behave in retaliatory bombard.
  } 
  // Now the retaliator is all set up to look like the attacker, in this function

  log_debug("Start bombard: %s %s to %d, %d.",
            nation_rule_name(nation_of_player(pplayer)),
            unit_rule_name(punit), TILE_XY(ptile));

/* If bombard_primary_targets isn't unlimited (==0), then we:
   1. count targets on the tile
   2. if tile targets are less than max_targets, treat as unlimited 
   3. else randomly select max_targets # of targets to be bombed. */
  int max_targets = pstats.bombard_primary_targets;
  int num_reachable = 0;
  bool *is_target = NULL; // dynamic array

  if (max_targets) { // !max_targets means everyone is target
    // Count reachable units on tile:
    unit_list_iterate_safe(ptile->units, pdefender) {
      if (is_unit_reachable_at(pdefender, punit, ptile)) {
        num_reachable++;
      }
    } unit_list_iterate_safe_end;

    // If less targets on tile than max, we can skip forward
    if (num_reachable <= max_targets)
      max_targets = 0; // unlimited, hit all targets on tile

    if (max_targets) { // Create target list only if needed
      // Randomly select the max_targets # of targets:
#define ITERATION_LIMIT 1000 // Safety insurance
      int c=0, iteration = 0; 
      // Init dynamic target array:
      is_target = (bool *)calloc(num_reachable, sizeof(bool));
      // Pick a random target for each of the # of targets:
      for (c=0; c < max_targets; c++) {
        if (iteration++ > ITERATION_LIMIT) break;
        int r = fc_rand(num_reachable);
        if (is_target[r] == TRUE) c--; // pick non-selected target
        else
          is_target[r] = TRUE;
      }
#undef ITERATION_LIMIT
    }
  }
/** FINISHED TARGET SELECTION ************************************/

  int r = 0;  // index to reachable is_target[] array
  int kills = pstats.bombard_primary_kills;

  unit_list_iterate_safe(ptile->units, pdefender) {
    /* Sanity checks */
    if (!is_retaliation) { // retaliating against treaty breaker is natural
      fc_assert_ret_val_msg(!pplayers_non_attack(unit_owner(punit),
                            unit_owner(pdefender)), FALSE,
                            "Trying to attack a unit with which you have "
                            "peace or cease-fire at (%d, %d).",
                            TILE_XY(unit_tile(pdefender)));
      fc_assert_ret_val_msg(!pplayers_allied(unit_owner(punit),
                            unit_owner(pdefender)), FALSE,
                            "Trying to attack a unit with which you have "
                            "alliance at (%d, %d).", 
                            TILE_XY(unit_tile(pdefender)));
    }

    if (is_unit_reachable_at(pdefender, punit, ptile)) {
      bool adj;
      enum direction8 facing;
      int att_hp, def_hp;

      adj = base_get_direction_for_step(&(wld.map),
                                        punit->tile, pdefender->tile, &facing);
      /* Unlike normal attack, no change defender orientation when bombarding */
      if (adj)
        punit->facing = facing;

      // Bombard unit if: targets=unlimited OR target was randomly selected:
      if (!max_targets || is_target[r]) {
        bool could_kill = (kills>0);

        def_moves_used = unit_move_rate(pdefender) - pdefender->moves_left;

        unit_bombs_unit(punit, pdefender, &att_hp, &def_hp, could_kill, bombard_rate);

        if (def_hp > 0) {   // SURVIVED
          notify_player(pplayer, ptile,
                        E_UNIT_ACTION_FAILED, ftc_server,
                        /* TRANS: 💢 Your 🤺Swordsmen assaulted the English Horsemen🏇 (9hp).
                             or   💢 Your 🤺Swordsmen retaliated against the English Horsemen🏇 (9hp). */
                        /* TODO: replace generic "assaulted" with ruleset
                          defined name of action.*/
                        _("💢 Your %s %s the %s %s [`%s`] (%dhp)."),
                        /*UNIT_EMOJI(punit),*/ unit_name_translation(punit),
                        (is_retaliation ? "retaliated against": "assaulted"),
                        nation_adjective_for_player(unit_owner(pdefender)),
                        unit_name_translation(pdefender), unit_name_translation(pdefender),
                        def_hp);

          notify_player(unit_owner(pdefender), ptile,
                        E_UNIT_ESCAPED, ftc_server,
                        /* TRANS: 💢 French 🤺Swordsmen assaulted your Horsemen🏇 (9hp).
                             or   💢 French 🤺Swordsmen retaliated against your Horsemen🏇 (9hp). */
                        /* TODO: replace generic "assaulted" with ruleset
                          defined name of action.*/
                        _("💢 %s %s %s %s your %s [`%s`] (%dhp)."),
                        nation_adjective_for_player(pplayer),
                        UNIT_EMOJI(punit), unit_name_translation(punit),
                        (is_retaliation ? "retaliated against": "assaulted"),
                        unit_name_translation(pdefender), unit_name_translation(pdefender),
                        def_hp);
        } else {          // DIED 
          notify_player(pplayer, ptile,
                        E_UNIT_ACTION_FAILED, ftc_server,
                        /* TRANS: 💥 Your 🤺Swordsmen assault eliminated the English Horsemen🏇.
                             or   💥 Your 🤺Swordsmen retaliation eliminated the English Horsemen🏇. */
                        /* TODO: replace generic "assaulted" with ruleset
                          defined name of action.*/
                        _("💥 Your %s %s <b>%s</b> the %s %s [`%s`]."),
                        /*UNIT_EMOJI(punit), */unit_name_translation(punit),
                        (is_retaliation ? "retaliation": "assault"),
                        get_battle_winner_verb(0),
                        nation_adjective_for_player(unit_owner(pdefender)),
                        unit_name_translation(pdefender), unit_name_translation(pdefender));

          notify_player(unit_owner(pdefender), ptile,
                        E_UNIT_ESCAPED, ftc_server,
                        /* TRANS: ⚠️ French 🤺Swordsmen assaulted and eliminated your Horsemen🏇.
                             or   ⚠️ French 🤺Swordsmen retaliated and eliminated your Horsemen🏇. */
                        /* TODO: replace generic "assaulted" with ruleset
                          defined name of action.*/
                        _("⚠️ %s %s %s %s and <b>%s</b> your %s [`%s`]."),
                        nation_adjective_for_player(pplayer),
                        UNIT_EMOJI(punit), unit_name_translation(punit),
                        (is_retaliation ? "retaliated": "assaulted"),
                        get_battle_winner_verb(0),
                        unit_name_translation(pdefender), unit_name_translation(pdefender));        
        }

        see_combat(punit, pdefender);

        punit->hp = att_hp;
        pdefender->hp = def_hp;

        send_combat(punit, pdefender, 0, 0, 1);
        // Attacker loses no hit points so suffers no injured-caused mp loss, but
        // defender indeed does. Note if defender is a retaliator, this will be
        // role reversal later when function is called again.
        pdefender->moves_left = unit_move_rate(pdefender) - def_moves_used;  
        if (pdefender->moves_left<0) pdefender->moves_left = 0;
        send_unit_info(NULL, pdefender);

        /* May cause an incident */
        if (!is_retaliation) { // only initiating causes incident
          action_consequence_success(paction,
                                    unit_owner(punit), act_utype,
                                    unit_owner(pdefender),
                                    unit_tile(pdefender),
                                    unit_link(pdefender));
        }

        if (def_hp<=0) {  // handle burial
          wipe_unit(pdefender, ULR_KILLED, unit_owner(punit));
          kills--;  // track the max #kills allowed
        }
      }
      r++;  // iterates reachable target counter
    }
  } unit_list_iterate_safe_end;

  // clean dynamic target array
  if (is_target) free(is_target);

  /* Initiators of bombardment:
     a) lose moves, b) get a UWT timestamp, c) possibly lose fortified status
     d) could possibly do a killcitizen to target city
     BUT, Retaliation bombarders don't process any of this stuff. */
  if (!is_retaliation)  { 
  // bm_cost is bombard_move_cost if specified otherwise it's a OneAttack turn loss:
    int bm_cost = (pstats.bombard_move_cost>0) ? pstats.bombard_move_cost : 999;
    punit->moves_left = (punit->moves_left - bm_cost > 0) 
                      ? (punit->moves_left - bm_cost) : 0;

    // Retaliators don't get UWT stamped either
    unit_did_action(punit);

    // Retaliators don't ever lose fortified status from incoming attacks:

    // Don't forget "fortified" if action specifies to stay fortified
    //if (pstats.bombard_stay_fortified && punit->activity != ACTIVITY_FORTIFIED)
    //  unit_forget_last_activity(punit); // Otherwise forget last activity as usual
    if (pstats.bombard_stay_fortified && punit->activity == ACTIVITY_FORTIFIED) {
      // don't forget last activity
    } else {
        unit_forget_last_activity(punit); // Otherwise forget last activity as usual
    }
  
    if (pcity
        && city_size_get(pcity) > 1
        && get_city_bonus(pcity, EFT_UNIT_NO_LOSE_POP) <= 0
        // && ( !(game.server.killcitizen_pct>0 && game.server.killcitizen_pct<100)
        //    || (fc_rand(100) < game.server.killcitizen_pct) )
        && kills_citizen_after_attack(punit)) {
      city_reduce_size(pcity, 1, pplayer, "bombard");
      city_refresh(pcity);
      send_city_info(NULL, pcity);
      // For non-obvious values of killcitizen_pct, report that city lost population.
      if (game.server.killcitizen_pct>0 && game.server.killcitizen_pct<100) {
        /* notify players of population loss can go here*/
      }   
    } 
    else {
      // For non-obvious values of killcitizen_pct, report city lost no population.
      if (game.server.killcitizen_pct>0 && game.server.killcitizen_pct<100) {
        /* notify players of population loss can go here       */
      }
    }
  }

  // This is where we recursively call this function for retaliators to fight back. 
  // Safe Recursion because is_retaliation==true won't continue recursion.
  if (!is_retaliation) {
    // function calls itself once for every retaliator to fight back 
    unit_list_iterate_safe(ptile->units, pdefender) {
      struct extra_unit_stats rstats;
      unit_get_extra_stats(&rstats, pdefender);

      if (rstats.bombard_retaliate_rounds   // a retaliator recursively fights back...
       && pdefender->moves_left > 0) {      // ... if it has moves_left:
        
          unit_bombard(pdefender,        // Defender is now Attacker
                      unit_tile(punit),  // Attacker tile is now Defender tile
                      paction,           // (still Bombardment, but will be unused)
                      true);             // is_retaliation==true, ...    
      }                                  // ... (so no further recursion)
    } unit_list_iterate_safe_end;
  }

  send_unit_info(NULL, punit);

  return TRUE;
}

/**********************************************************************//**
  Do a "regular" nuclear attack.

  Can be stopped by an EFT_NUKE_PROOF (SDI defended) city.

  This function assumes the attack is legal. The calling function should
  have already made all necessary checks.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool unit_nuke(struct player *pplayer, struct unit *punit,
                      struct tile *def_tile, const struct action *paction)
{

/*
  unit_type_iterate(ptype) {
        notify_player(pplayer, unit_tile(punit), E_UNIT_LOST_ATT, ftc_server,
                  _("&#8203;[`/units/%s`] id:%d name: %s"),
                     utype_name_translation(ptype),
                     ptype->item_number,
                     utype_name_translation(ptype));
  } unit_type_iterate_end;
*/

  struct city *pcity;
  const struct unit_type *act_utype;
  /* bombard_rate is never used on nukes, but for nukes it has a double purpose:
     the amount of sq_radius to add to the default sq_radius of 2: */
  int extra_radius = unit_type_get(punit)->bombard_rate;
  char nuclear_unit_name[64];

  sprintf(nuclear_unit_name,"%s",unit_rule_name(punit));

  /* Sanity check: The actor still exists. */
  fc_assert_ret_val(pplayer, FALSE);
  fc_assert_ret_val(punit, FALSE);

  act_utype = unit_type_get(punit);

  log_debug("Start nuclear attack: %s %s against (%d, %d).",
            nation_rule_name(nation_of_player(pplayer)),
            unit_rule_name(punit),
            TILE_XY(def_tile));

  if ((pcity = sdi_try_defend(pplayer, def_tile))) {
    /* FIXME: Remove the hard coded reference to SDI defense. */
    notify_player(pplayer, unit_tile(punit), E_UNIT_LOST_ATT, ftc_server,
                  _("⚠️Your %s was shot down by "
                    "SDI defenses, what a waste."), unit_tile_link(punit));
    notify_player(city_owner(pcity), def_tile, E_UNIT_WIN_DEF, ftc_server,
                  _("💥The nuclear attack on %s was thwarted by"
                    " your SDI defense."), city_link(pcity));

    /* Trying to nuke something this close can be... unpopular. */
    action_consequence_caught(paction, pplayer, act_utype,
                              city_owner(pcity),
                              def_tile, unit_tile_link(punit));

    /* Remove the destroyed nuke. */
    wipe_unit(punit, ULR_SDI, city_owner(pcity));

    return FALSE;
  }

  dlsend_packet_nuke_tile_info(game.est_connections, tile_index(def_tile));

  /* A nuke is always consumed when it detonates. See below. */
  fc_assert(paction->actor_consuming_always);

  /* The nuke must be wiped here so it won't be seen as a victim of its own
   * detonation. */
  wipe_unit(punit, ULR_DETONATED, NULL);

  do_nuclear_explosion(pplayer, def_tile, extra_radius, nuclear_unit_name);

  /* May cause an incident even if the target tile is unclaimed. A ruleset
   * could give everyone a casus belli against the tile nuker. A rule
   * like that would make sense in a story where detonating any nuke at all
   * could be forbidden. */
  action_consequence_success(paction, pplayer, act_utype,
                             tile_owner(def_tile),
                             def_tile,
                             tile_link(def_tile));

  return TRUE;
}

/**********************************************************************//**
  Destroy the target city.

  This function assumes the destruction is legal. The calling function
  should have already made all necessary checks.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool unit_do_destroy_city(struct player *act_player,
                                 struct unit *act_unit,
                                 struct city *tgt_city,
                                 const struct action *paction)
{
  int tgt_city_id;
  struct player *tgt_player;
  bool try_civil_war = FALSE;
  const struct unit_type *act_utype;

  /* Sanity check: The actor still exists. */
  fc_assert_ret_val(act_player, FALSE);
  fc_assert_ret_val(act_unit, FALSE);

  act_utype = unit_type_get(act_unit);

  /* Sanity check: The target city still exists. */
  fc_assert_ret_val(tgt_city, FALSE);

  tgt_player = city_owner(tgt_city);

  /* How can a city be ownerless? */
  fc_assert_ret_val(tgt_player, FALSE);

  /* Save city ID. */
  tgt_city_id = tgt_city->id;

  if (is_capital(tgt_city)
      && (tgt_player->spaceship.state == SSHIP_STARTED
          || tgt_player->spaceship.state == SSHIP_LAUNCHED)) {
    /* Destroying this city destroys the victim's space ship. */
    spaceship_lost(tgt_player);
  }

  if (is_capital(tgt_city)
      && civil_war_possible(tgt_player, TRUE, TRUE)
      && normal_player_count() < MAX_NUM_PLAYERS
      && civil_war_triggered(tgt_player)) {
    /* Destroying this city can trigger a civil war. */
    try_civil_war = TRUE;
  }

  /* Let the actor know. */
  notify_player(act_player, city_tile(tgt_city),
                E_UNIT_WIN_ATT, ftc_server,
                _("💥You destroy %s completely."),
                city_tile_link(tgt_city));

  if (tgt_player != act_player) {
    /* This was done to a foreign city. Inform the victim player. */
    notify_player(tgt_player, city_tile(tgt_city),
                  E_CITY_LOST, ftc_server,
                  _("⚠️%s has been destroyed by %s."),
                  city_tile_link(tgt_city),
                  player_name(act_player));
  }

  /* May cause an incident */
  action_consequence_success(paction, act_player, act_utype,
                             tgt_player, city_tile(tgt_city),
                             city_link(tgt_city));

  /* Run post city destruction Lua script. */
  script_server_signal_emit("city_destroyed", tgt_city, tgt_player,
                            act_player);

  /* Can't be sure of city existence after running script. */
  if (city_exist(tgt_city_id)) {
    remove_city(tgt_city);
  }

  if (try_civil_war) {
    /* Try to start the civil war. */
    (void) civil_war(tgt_player);
  }

  /* The city is no more. */
  return TRUE;
}

/**********************************************************************//**
  Do a "regular" attack.

  This function assumes the attack is legal. The calling function should
  have already made all necessary checks.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_attack(struct unit *punit, struct tile *def_tile,
                      const struct action *paction)
{
  char loser_link[MAX_LEN_LINK], winner_link[MAX_LEN_LINK];
  struct unit *ploser, *pwinner;
  struct city *pcity = NULL;
  int moves_used, def_moves_used; 
  int old_unit_vet, old_defender_vet, vet;
  int winner_id;
  struct player *pplayer = unit_owner(punit);
  bool adj;
  enum direction8 facing;
  int att_hp, def_hp;
  struct unit *pdefender;
  const struct unit_type *act_utype = unit_type_get(punit);

  if (!(pdefender = get_defender(punit, def_tile))) {
    /* Can't fight air... */
    return FALSE;
  }
  
  log_debug("Start attack: %s %s against %s %s.",
            nation_rule_name(nation_of_player(pplayer)),
            unit_rule_name(punit), 
            nation_rule_name(nation_of_unit(pdefender)),
            unit_rule_name(pdefender));

  /* Sanity checks */
  fc_assert_ret_val_msg(!pplayers_non_attack(pplayer,
                                             unit_owner(pdefender)),
                        FALSE,
                        "Trying to attack a unit with which you have peace "
                        "or cease-fire at (%d, %d).", TILE_XY(def_tile));
  fc_assert_ret_val_msg(!pplayers_allied(pplayer, unit_owner(pdefender)),
                        FALSE,
                        "Trying to attack a unit with which you have "
                        "alliance at (%d, %d).", TILE_XY(def_tile));

  struct extra_unit_stats pstats;
  unit_get_extra_stats(&pstats, punit);                      

  moves_used = unit_move_rate(punit) - punit->moves_left;
  def_moves_used = unit_move_rate(pdefender) - pdefender->moves_left;

  adj = base_get_direction_for_step(&(wld.map),
                                    punit->tile, pdefender->tile, &facing);

  fc_assert(adj);
  if (adj) {
    punit->facing = facing;
    pdefender->facing = opposite_direction(facing);
  }

  old_unit_vet = punit->veteran;
  old_defender_vet = pdefender->veteran;
  unit_versus_unit(punit, pdefender, &att_hp, &def_hp);

  if ((att_hp <= 0 || utype_is_consumed_by_action(paction, punit->utype))
      && unit_transported(punit)) {
    /* Dying attacker must be first unloaded so it doesn't die insider transport */
    unit_transport_unload_send(punit);
  }

  see_combat(punit, pdefender);

  punit->hp = att_hp;
  pdefender->hp = def_hp;

  combat_veterans(punit, pdefender);

  /* Adjust attackers moves_left _after_ unit_versus_unit() so that
   * the movement attack modifier is correct! --dwp
   *
   * For greater Civ2 compatibility (and game balance issues), we recompute 
   * the new total MP based on the HP the unit has left after being damaged, 
   * and subtract the MPs that had been used before the combat (plus the 
   * points used in the attack itself, for the attacker). -GJW, Glip
   */
  punit->moves_left = unit_move_rate(punit) - moves_used;
  pdefender->moves_left = unit_move_rate(pdefender) - def_moves_used;

  if (punit->moves_left < 0) {
    punit->moves_left = 0;
  }
  if (pdefender->moves_left < 0) {
    pdefender->moves_left = 0;
  }
  unit_did_action(punit);

  // Don't forget "fortified" if unit attribute specifies to stay fortified
  // TO DO: don't use this struct-> member but a separate for attack attributes
  if (pstats.attack_stay_fortified && punit->activity == ACTIVITY_FORTIFIED) {
    // don't forget last activity
  } else {
      unit_forget_last_activity(punit); // Otherwise forget last activity as usual
  }
    
  /* This may cause a diplomatic incident. */
  action_consequence_success(paction, pplayer, act_utype,
                             unit_owner(pdefender),
                             def_tile, unit_link(pdefender));

  if (pdefender->hp <= 0
      && (pcity = tile_city(def_tile))
      && city_size_get(pcity) > 1
      && get_city_bonus(pcity, EFT_UNIT_NO_LOSE_POP) <= 0) {

        if (kills_citizen_after_attack(punit)) {
          // For non-obvious values of killcitizen_pct, report whether city lost population.
          if (game.server.killcitizen_pct>0 && game.server.killcitizen_pct<100) {
            notify_player(pplayer, NULL,
                E_UNIT_LOST_MISC, ftc_server,
                _("💥 Population lost in %s after successful attack:"),
                city_link(pcity));
            notify_player(unit_owner(pdefender), def_tile,
                E_CITY_FAMINE, ftc_server, //E_CITY_FAMINE is only shared event for pop loss in city.
                _("➖ The %s attack caused population loss in %s:"),
                nation_adjective_for_player(pplayer),
                city_link(pcity));      
          }   
          city_reduce_size(pcity, 1, pplayer, "attack");
          city_refresh(pcity);
          send_city_info(NULL, pcity);
        } 
        else  {
          // For non-obvious values of killcitizen_pct, report whether city lost population.
          if (game.server.killcitizen_pct>0 && game.server.killcitizen_pct<100) {    
            notify_player(pplayer, NULL,
                  E_CITY_NORMAL, ftc_server,
                  _("&#8203;[`equal`] %s lost no population after your attack:"),
                  city_link(pcity));
            notify_player(unit_owner(pdefender), NULL,
                  E_CITY_NORMAL, ftc_server,
                  _("&#8203;[`equal`] No population loss in %s after %s attack:"),
                  city_link(pcity),
                  nation_adjective_for_player(pplayer));
            }
        }
  }
  if (punit->hp > 0 && pdefender->hp > 0) {
    /* Neither died */
    send_combat(punit, pdefender, punit->veteran - old_unit_vet,
                pdefender->veteran - old_defender_vet, 0);

    // send_combat was failing to update clients.
    // TODO: fix that and remove this block below
    send_unit_info(NULL, punit);
    send_unit_info(NULL, pdefender);

    /* N.B.: unit_link always returns the same pointer. */
    // loser=attacker, winner=defender, for purposes below
    sz_strlcpy(loser_link, unit_tile_link(punit));
    sz_strlcpy(winner_link, unit_link(pdefender));

     // Make a reference copy for use.
    char punit_emoji[MAX_LEN_LINK], pdefender_emoji[MAX_LEN_LINK];
    sprintf(punit_emoji, "%s", UNIT_EMOJI(punit));
    sprintf(pdefender_emoji, "%s", UNIT_EMOJI(pdefender));

    notify_player(unit_owner(punit), def_tile,
                  E_UNIT_ACTION_FAILED, ftc_server,
                  /* TRANS: Your 🐎Horsemen (2hp) could not defeat the Australian Horsemen🐎 (2hp)." */
                  _("💢 Your %s %s (%dhp) could not defeat the %s %s %s (%dhp).\n"),
                  punit_emoji, loser_link, punit->hp,
                  nation_adjective_for_player(unit_owner(pdefender)),
                  winner_link, pdefender_emoji, pdefender->hp);
    notify_player(unit_owner(pdefender), def_tile,
                  E_UNIT_ESCAPED, ftc_server,
                  /* TRANS: "[An] Indian ⛵Galleon (4hp) attacked your Frigate⛵ (6hp), with no casualties. */
                  _("💢 %s %s %s %s (%dhp) attacked your %s %s %s (%dhp), with no casualties.\n"),
                  is_unit_plural(punit) ? "" : indefinite_article_for_word(nation_adjective_for_player(unit_owner(punit)), true),
                  nation_adjective_for_player(unit_owner(punit)),
                  punit_emoji, loser_link,
                  punit->hp,
                  (pcity ? city_link(pcity) : ""),
                  winner_link, pdefender_emoji,
                  pdefender->hp);

      if (punit->veteran > old_unit_vet)
        notify_unit_experience(punit);

      if (pdefender->veteran > old_defender_vet)
        notify_unit_experience(pdefender);

    return TRUE;
  }
  pwinner = (punit->hp > 0) ? punit : pdefender;
  winner_id = pwinner->id;
  ploser = (pdefender->hp > 0) ? punit : pdefender;

  vet = (pwinner->veteran == ((punit->hp > 0) ? old_unit_vet :
	old_defender_vet)) ? 0 : 1;

  send_combat(punit, pdefender, punit->veteran - old_unit_vet,
              pdefender->veteran - old_defender_vet, 0);

  /* N.B.: unit_link always returns the same pointer. */
  sz_strlcpy(loser_link, unit_tile_link(ploser));
  sz_strlcpy(winner_link,
             utype_is_consumed_by_action(paction, pwinner->utype)
             ? unit_tile_link(pwinner) : unit_link(pwinner));
  const char *ploser_name = unit_name_translation(ploser);

  if (punit == ploser) {
    /* The attacker lost */
    log_debug("Attacker lost: %s %s against %s %s.",
              nation_rule_name(nation_of_player(pplayer)),
              unit_rule_name(punit),
              nation_rule_name(nation_of_unit(pdefender)),
              unit_rule_name(pdefender));

    const char *adj = get_battle_survivor_adjective(pdefender);
    notify_player(unit_owner(pwinner), unit_tile(pwinner),
                  E_UNIT_WIN_DEF, ftc_server,
                  /* TRANS: "Your Cannon ... the Polish Destroyer." */
                  _("💥 Your %s %s %s survived %s %s attack by %s %s [`%s`] %s."),
                  (pcity ? city_link(pcity) : ""),
                  winner_link, UNIT_EMOJI(pwinner),
                  indefinite_article_for_word(adj, false),
                  adj,
                  (is_unit_plural(punit) ? "" : indefinite_article_for_word(nation_adjective_for_player(unit_owner(ploser)),false)),
                  nation_adjective_for_player(unit_owner(ploser)),
                  ploser_name,
                  loser_link);
    if (vet) {
      notify_unit_experience(pwinner);
    }
    notify_player(unit_owner(ploser), def_tile,
                  E_UNIT_LOST_ATT, ftc_server,
                  /* TRANS: "... Cannon ... the Polish Destroyer." */
                  _("⚠️ Your attacking %s failed against the %s %s."),
                  loser_link,
                  nation_adjective_for_player(unit_owner(pwinner)),
                  winner_link);
    wipe_unit(ploser, ULR_KILLED, unit_owner(pwinner));
  } else {
    /* The defender lost, the attacker punit lives! */

    log_debug("Defender lost: %s %s against %s %s.",
              nation_rule_name(nation_of_player(pplayer)),
              unit_rule_name(punit),
              nation_rule_name(nation_of_unit(pdefender)),
              unit_rule_name(pdefender));

    punit->moved = TRUE;	/* We moved */
    kill_unit(pwinner, ploser,
              vet && !utype_is_consumed_by_action(paction, punit->utype));
    if (unit_is_alive(winner_id)) {
      if (utype_is_consumed_by_action(paction, pwinner->utype)) {
        return TRUE;
      }
    } else {
      return TRUE;
    }
  }

  /* If attacker wins, and occupychance > 0, it might move in.  Don't move in
   * if there are enemy units in the tile (a fortress, city or air base with
   * multiple defenders and unstacked combat). Note that this could mean 
   * capturing (or destroying) a city. */

  if (pwinner == punit && fc_rand(100) < game.server.occupychance
      && !is_non_allied_unit_tile(def_tile, pplayer)) {

    /* Hack: make sure the unit has enough moves_left for the move to succeed,
       and adjust moves_left to afterward (if successful). */

    int old_moves = punit->moves_left;
    int full_moves = unit_move_rate(punit);

    punit->moves_left = full_moves;
    /* Post attack occupy move. */
    if (((pcity = tile_city(def_tile))
         && is_action_enabled_unit_on_city(ACTION_CONQUER_CITY,
                                           punit, pcity)
         && unit_perform_action(unit_owner(punit), punit->id, pcity->id,
                                0, "",
                                ACTION_CONQUER_CITY, ACT_REQ_RULES))
        || ((pcity = tile_city(def_tile))
            && is_action_enabled_unit_on_city(ACTION_CONQUER_CITY2,
                                              punit, pcity)
            && unit_perform_action(unit_owner(punit), punit->id, pcity->id,
                                   0, "",
                                   ACTION_CONQUER_CITY2, ACT_REQ_RULES))
        || (unit_transported(punit)
            && is_action_enabled_unit_on_tile(ACTION_TRANSPORT_DISEMBARK1,
                                              punit, def_tile, NULL)
            && unit_perform_action(unit_owner(punit), punit->id,
                                   tile_index(def_tile), 0, "",
                                   ACTION_TRANSPORT_DISEMBARK1,
                                   ACT_REQ_RULES))
        || (unit_transported(punit)
            && is_action_enabled_unit_on_tile(ACTION_TRANSPORT_DISEMBARK2,
                                              punit, def_tile, NULL)
            && unit_perform_action(unit_owner(punit), punit->id,
                                   tile_index(def_tile), 0, "",
                                   ACTION_TRANSPORT_DISEMBARK2,
                                   ACT_REQ_RULES))
        || (unit_move_handling(punit, def_tile, FALSE, TRUE))) {
      int mcost = MAX(0, full_moves - punit->moves_left - SINGLE_MOVE);

      /* Move cost is bigger of attack (SINGLE_MOVE) and occupying move costs.
       * Attack SINGLE_COST is already calculated in to old_moves. */
      punit->moves_left = old_moves - mcost;
      if (punit->moves_left < 0) {
        punit->moves_left = 0;
      }
    } else {
      punit->moves_left = old_moves;
    }
  }

  /* The attacker may have died for many reasons */
  if (game_unit_by_number(winner_id) != NULL) {
    send_unit_info(NULL, pwinner);
  }

  return TRUE;
}

/**********************************************************************//**
  Have the unit perform a surgical strike against a building in a city.

  This function assumes the attack is legal. The calling function should
  have already made all necessary checks.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_unit_strike_city_building(const struct player *act_player,
                                         struct unit *act_unit,
                                         struct city *tgt_city,
                                         Impr_type_id tgt_bld_id,
                                         const struct action *paction)
{
  struct player *tgt_player;

  /* Sanity checks */
  fc_assert_ret_val(act_player, FALSE);
  fc_assert_ret_val(act_unit, FALSE);
  fc_assert_ret_val(tgt_city, FALSE);
  fc_assert_ret_val(paction, FALSE);

  tgt_player = city_owner(tgt_city);
  fc_assert_ret_val(tgt_player, FALSE);

  /* The surgical strike may miss. */
  {
    int odds = 100;

    /* Let the Action_Odds_Pct effect modify the odds. */
    odds += ((odds
              * get_target_bonus_effects(NULL,
                                         act_player, tgt_player,
                                         tgt_city, NULL, NULL,
                                         act_unit, unit_type_get(act_unit),
                                         NULL, NULL, paction,
                                         EFT_ACTION_ODDS_PCT))
             / 100);

    /* Roll the dice. */
    if (fc_rand(100) >= odds) {
      /* Notify the player. */
      notify_player(act_player, city_tile(tgt_city),
                    E_UNIT_ACTION_ACTOR_FAILURE, ftc_server,
                    _("Your %s failed to %s in %s."),
                    unit_link(act_unit),
                    action_name_translation(paction),
                    city_link(tgt_city));

      /* Make the failed attempt cost a single move. */
      act_unit->moves_left = MAX(0, act_unit->moves_left - SINGLE_MOVE);

      return FALSE;
    }
  }

  if (tgt_bld_id < 0) {
    char prod[256];

    /* Get name of the production */
    universal_name_translation(&tgt_city->production, prod, sizeof(prod));

    /* Destroy the production */
    tgt_city->shield_stock = 0;
    nullify_prechange_production(tgt_city);

    /* Let the players know. */
    notify_player(act_player, city_tile(tgt_city),
                  E_UNIT_ACTION_ACTOR_SUCCESS, ftc_server,
                  _("Your %s succeeded in destroying"
                    " the production of %s in %s."),
                  unit_link(act_unit),
                  prod,
                  city_name_get(tgt_city));
    notify_player(tgt_player, city_tile(tgt_city),
                  E_UNIT_ACTION_TARGET_HOSTILE, ftc_server,
                  _("The production of %s was destroyed in %s,"
                    " %s are suspected."),
                  prod,
                  city_link(tgt_city),
                  nation_plural_for_player(tgt_player));
  } else {
    struct impr_type *tgt_bld = improvement_by_number(tgt_bld_id);

    if (!city_has_building(tgt_city, tgt_bld)) {
      /* Noting to destroy here. */

      /* Notify the player. */
      notify_player(act_player, city_tile(tgt_city),
                    E_UNIT_ACTION_ACTOR_FAILURE, ftc_server,
                    _("Your %s didn't find a %s to %s in %s."),
                    unit_link(act_unit),
                    improvement_name_translation(tgt_bld),
                    action_name_translation(paction),
                    city_link(tgt_city));

      /* Punish the player for blindly attacking a building. */
      act_unit->moves_left = MAX(0, act_unit->moves_left - SINGLE_MOVE);

      return FALSE;
    }

    /* Destroy the building. */
    building_lost(tgt_city, tgt_bld, "attacked", act_unit);

    /* Update the player's view of the city. */
    send_city_info(NULL, tgt_city);

    /* Let the players know. */
    notify_player(act_player, city_tile(tgt_city),
                  E_UNIT_ACTION_ACTOR_SUCCESS, ftc_server,
                  _("Your %s destroyed the %s in %s."),
                  unit_link(act_unit),
                  improvement_name_translation(tgt_bld),
                  city_link(tgt_city));
    notify_player(tgt_player, city_tile(tgt_city),
                  E_UNIT_ACTION_TARGET_HOSTILE, ftc_server,
                  _("The %s destroyed the %s in %s."),
                  nation_plural_for_player(tgt_player),
                  improvement_name_translation(tgt_bld),
                  city_link(tgt_city));
  }

  return TRUE;
}

/**********************************************************************//**
  Have the unit conquer a city.

  This function assumes the attack is legal. The calling function should
  have already made all necessary checks.

  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_unit_conquer_city(struct player *act_player,
                                 struct unit *act_unit,
                                 struct city *tgt_city,
                                 struct action *paction)
{
  bool success;
  struct tile *tgt_tile = city_tile(tgt_city);
  int move_cost = map_move_cost_unit(&(wld.map), act_unit, tgt_tile);
  int tgt_city_id = tgt_city->id;
  struct player *tgt_player = city_owner(tgt_city);
  const char *victim_link = city_link(tgt_city);
  const struct unit_type *act_utype = unit_type_get(act_unit);

  /* Sanity check */
  fc_assert_ret_val(tgt_tile, FALSE);

  unit_move(act_unit, tgt_tile, move_cost, NULL, FALSE, TRUE);

  /* The city may have been destroyed during the conquest. */
  success = (!city_exist(tgt_city_id)
             || city_owner(tgt_city) == act_player);

  if (success) {
    /* May cause an incident */
    action_consequence_success(paction, act_player, act_utype,
                               tgt_player, tgt_tile,
                               victim_link);
  }

  return success;
}

/**********************************************************************//**
  See also aiunit could_unit_move_to_tile()
**************************************************************************/
static bool can_unit_move_to_tile_with_notify(struct unit *punit,
					      struct tile *dest_tile,
					      bool igzoc,
                                              struct unit *embark_to,
                                              bool enter_enemy_city)
{
  struct tile *src_tile = unit_tile(punit);
  enum unit_move_result reason =
    unit_move_to_tile_test(&(wld.map), punit, punit->activity,
                           src_tile, dest_tile, igzoc, embark_to,
                           enter_enemy_city);

  switch (reason) {
  case MR_OK:
    return TRUE;

  case MR_NO_WAR:
    notify_player(unit_owner(punit), src_tile, E_BAD_COMMAND, ftc_server,
                  _("Cannot attack unless you declare war first."));
    break;

  case MR_ZOC:
    notify_player(unit_owner(punit), src_tile, E_BAD_COMMAND, ftc_server,
                  _("%s can only move into your own zone of control."),
                  unit_link(punit));
    break;

  case MR_TRIREME:
    notify_player(unit_owner(punit), src_tile, E_BAD_COMMAND, ftc_server,
                  _("%s cannot move that far from the coast line."),
                  unit_link(punit));
    break;

  case MR_PEACE:
    if (tile_owner(dest_tile)) {
      notify_player(unit_owner(punit), src_tile, E_BAD_COMMAND, ftc_server,
                    _("Cannot invade unless you break peace with "
                      "%s first."),
                    player_name(tile_owner(dest_tile)));
    }
    break;

  case MR_CANNOT_DISEMBARK:
    notify_player(unit_owner(punit), src_tile, E_BAD_COMMAND, ftc_server,
                  _("%s cannot disembark outside of a city or a native base "
                    "for %s."),
                  unit_link(punit),
                  utype_name_translation(
                      unit_type_get(unit_transport_get(punit))));
    break;

  case MR_NON_NATIVE_MOVE:
    notify_player(unit_owner(punit), src_tile, E_BAD_COMMAND, ftc_server,
                  _("Terrain is unsuitable for %s units."),
                  uclass_name_translation(unit_class_get(punit)));
    break;

  default:
    /* FIXME: need more explanations someday! */
    break;
  };

  return FALSE;
}

/**********************************************************************//**
  Will try to move to/attack the tile dest_x,dest_y.  Returns TRUE if this
  was done, FALSE if it wasn't for some reason. Even if this returns TRUE,
  the unit may have died upon arrival to new tile.

  'igzoc' means ignore ZOC rules - not necessary for igzoc units etc, but
  done in some special cases (moving barbarians out of initial hut).
  Should normally be FALSE.

  'move_do_not_act' is another special case which should normally be
  FALSE.  If TRUE any enabler controlled actions punit can perform to
  pdesttile it self or something located at it will be ignored. If FALSE
  the system will check if punit can perform any enabler controlled action
  to pdesttile. If it can the player will be asked to choose what to do. If
  it can't and punit is unable to move (or perform another non enabler
  controlled action) to pdesttile the game will try to explain why.

  FIXME: This function needs a good cleaning.
**************************************************************************/
bool unit_move_handling(struct unit *punit, struct tile *pdesttile,
                        bool igzoc, bool move_do_not_act)
{
  struct player *pplayer = unit_owner(punit);
  struct city *pcity = tile_city(pdesttile);

  /*** Phase 1: Basic checks ***/

  /* this occurs often during lag, and to the AI due to some quirks -- Syela */
  if (!is_tiles_adjacent(unit_tile(punit), pdesttile)) {
    log_debug("tiles not adjacent in move request");
    return FALSE;
  }


  if (punit->moves_left <= 0) {
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("This unit has no moves left."));
    return FALSE;
  }

  if (!unit_can_do_action_now(punit, "unit_move_handling")) {
    return FALSE;
  }

  /*** Phase 2: Attempted action interpretation checks ***/

  /* Check if the move should be interpreted as an attempt to perform an
   * enabler controlled action to the target tile. When the move may be an
   * action attempt the server stops moving the unit, marks it as wanting a
   * decision based on its own movement to the tile it attempted to move to
   * and notifies the client.
   *
   * In response to the unit being marked as wanting a decision the client
   * can query the server for what actions the unit, given the player's
   * knowledge, may be able to perform against a target at the tile it tried
   * to move to. The server will respond to the query with the actions that
   * may be enabled and, when all actions are known to be illegal given the
   * player's knowledge, an explanation why no action could be done. The
   * client will probably use the list of potentially legal actions, if any,
   * to pop up an action selection dialog. See handle_unit_action_query()
   *
   * If the AI has used a goto to send an actor to a target do not
   * pop up a dialog in the client.
   * For tiles occupied by allied cities or units, keep moving if
   * move_do_not_act tells us to, or if the unit is on goto and the tile
   * is not the final destination. */
  if (!move_do_not_act) {
    const bool can_not_move = !unit_can_move_to_tile(&(wld.map),
                                                     punit, pdesttile,
                                                     igzoc, FALSE);
    struct extra_type *textra = action_tgt_tile_extra(punit, pdesttile,
                                                      can_not_move);
    struct tile *ttile = action_tgt_tile(punit, pdesttile, textra,
                                         can_not_move);

    /* Consider to pop up the action selection dialog if a potential city,
     * unit or units target exists at the destination tile. A tile target
     * will only trigger the pop up if it may be legal. */
    if ((0 < unit_list_size(pdesttile->units) || pcity || ttile)) {
      /* A target (unit or city) exists at the tile. If a target is an ally
       * it still looks like a target since move_do_not_act isn't set.
       * Assume that the intention is to do an action. */

      if ((action_tgt_unit(punit, pdesttile, can_not_move)
           || action_tgt_city(punit, pdesttile, can_not_move)
           || action_tgt_tile_units(punit, pdesttile, can_not_move)
           || ttile || textra)
          || can_not_move) {
        /* There is a target punit, from the player's point of view, may be
         * able to act against OR punit can't do any non action move. The
         * client should therefore ask what action(s) the unit can perform
         * to any targets at pdesttile.
         *
         * In the first case the unit needs a decision about what action, if
         * any at all, to take. Asking what actions the unit can perform
         * will return a list of actions that may, from the players point of
         * view, be possible. The client can then show this list to the
         * player or, if configured to do so, make the choice it self.
         *
         * In the last case the player may need an explanation about why no
         * action could be taken. Asking what actions the unit can perform
         * will provide this explanation. */
        punit->action_decision_want = ACT_DEC_ACTIVE;
        punit->action_decision_tile = pdesttile;
        send_unit_info(player_reply_dest(pplayer), punit);

        /* The move wasn't done because the unit wanted the player to
         * decide what to do or because the unit couldn't move to the
         * target tile. */
        return FALSE;
      }
    }
  }

  /*** Phase 3: OK now move the unit ***/

  /* We cannot move a transport into a tile that holds
   * units or cities not allied with all of our cargo. */
  if (get_transporter_capacity(punit) > 0) {
    unit_list_iterate(unit_tile(punit)->units, pcargo) {
      if (unit_contained_in(pcargo, punit)
          && (is_non_allied_unit_tile(pdesttile, unit_owner(pcargo))
              || is_non_allied_city_tile(pdesttile,
                                         unit_owner(pcargo)))) {
         notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                       _("A transported unit is not allied to all "
                         "units or city on target tile."));
         return FALSE;
      }
    } unit_list_iterate_end;
  }

  if (can_unit_move_to_tile_with_notify(punit, pdesttile, igzoc,
                                        NULL, FALSE)
      /* Don't override "Transport Embark" */
      && can_unit_exist_at_tile(&(wld.map), punit, pdesttile)
      /* Don't override "Transport Disembark" or "Transport Disembark 2" */
      && !unit_transported(punit)) {
    int move_cost = map_move_cost_unit(&(wld.map), punit, pdesttile);

    /* May cause an incident */
    action_consequence_success(NULL, pplayer, unit_type_get(punit),
                               tile_owner(pdesttile),
                               pdesttile, tile_link(pdesttile));

    unit_move(punit, pdesttile, move_cost,
              /* Don't override "Transport Embark" */
              NULL, FALSE,
              /* Don't override "Conquer City" */
              FALSE);

    return TRUE;
  } else {
    return FALSE;
  }
}

/**********************************************************************//**
  Handle request to establish traderoute. If pcity_dest is NULL, assumes
  that unit is inside target city.
  Returns TRUE iff action could be done, FALSE if it couldn't. Even if
  this returns TRUE, unit may have died during the action.
**************************************************************************/
static bool do_unit_establish_trade(struct player *pplayer,
                                    struct unit *punit,
                                    struct city *pcity_dest,
                                    const struct action *paction)
{
  char homecity_link[MAX_LEN_LINK], destcity_link[MAX_LEN_LINK];
  char punit_link[MAX_LEN_LINK];
  int revenue;
  bool can_establish;
  int home_overbooked = 0;
  int dest_overbooked = 0;
  int home_max;
  int dest_max;
  struct city *pcity_homecity;
  struct trade_route_list *routes_out_of_dest;
  struct trade_route_list *routes_out_of_home;
  enum traderoute_bonus_type bonus_type;
  struct goods_type *goods;
  const char *goods_str;
  const struct unit_type *act_utype;

  /* Sanity check: The actor still exists. */
  fc_assert_ret_val(pplayer, FALSE);
  fc_assert_ret_val(punit, FALSE);

  /* Sanity check: The target city still exists. */
  fc_assert_ret_val(pcity_dest, FALSE);

  act_utype = unit_type_get(punit);

  pcity_homecity = player_city_by_number(pplayer, punit->homecity);

  if (!pcity_homecity) {
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("Sorry, your %s cannot establish"
                    " a trade route because it %s no home city."),
                  unit_link(punit), (is_unit_plural(punit) ? "they have" : "it has"));
    return FALSE;
  }

  if (game.info.goods_selection == GSM_ARRIVAL) {
    goods =  goods_from_city_to_unit(pcity_homecity, punit);
  } else {
    goods = punit->carrying;
  }
  if (goods == NULL) {
    notify_player(pplayer, unit_tile(punit), E_BAD_COMMAND, ftc_server,
                  _("Sorry, your %s cannot establish"
                    " a trade route because %s not carrying any goods."),
                  unit_link(punit), (is_unit_plural(punit) ? "they're" : "it's"));
    return FALSE;
  }

  sz_strlcpy(homecity_link, city_link(pcity_homecity));
  sz_strlcpy(destcity_link, city_link(pcity_dest));

  if (!can_cities_trade(pcity_homecity, pcity_dest)) {
    notify_player(pplayer, city_tile(pcity_dest), E_BAD_COMMAND, ftc_server,
                  _("Sorry, your %s cannot establish"
                    " a trade route between %s and %s."),
                  unit_link(punit),
                  homecity_link,
                  destcity_link);
    return FALSE;
  }

  sz_strlcpy(punit_link, unit_tile_link(punit));
  routes_out_of_home = trade_route_list_new();
  routes_out_of_dest = trade_route_list_new();

  /* This part of code works like can_establish_trade_route, except
   * that we actually do the action of making the trade route. */

  /* If we can't make a new trade route we can still get the trade bonus. */
  can_establish = action_has_result(paction, ACTION_TRADE_ROUTE)
                  && !have_cities_trade_route(pcity_homecity, pcity_dest);

  if (can_establish) {
    home_max = max_trade_routes(pcity_homecity);
    dest_max = max_trade_routes(pcity_dest);
    home_overbooked = city_num_trade_routes(pcity_homecity) - home_max;
    dest_overbooked = city_num_trade_routes(pcity_dest) - dest_max;
  }

  if (can_establish && (home_overbooked >= 0 || dest_overbooked >= 0)) {
    int trade = trade_base_between_cities(pcity_homecity, pcity_dest);

    /* See if there's a trade route we can cancel at the home city. */
    if (home_overbooked >= 0) {
      if (home_max <= 0
          || (city_trade_removable(pcity_homecity, routes_out_of_home)
              >= trade)) {
        notify_player(pplayer, city_tile(pcity_dest),
                      E_BAD_COMMAND, ftc_server,
                     _("Sorry, your %s cannot establish"
                       " a trade route here!"),
                       punit_link);
        if (home_max > 0) {
          notify_player(pplayer, city_tile(pcity_dest),
                        E_BAD_COMMAND, ftc_server,
                        PL_("      The city of %s already has %d "
                            "better trade route!",
                            "      The city of %s already has %d "
                            "better trade routes!", home_max),
                        homecity_link,
                        home_max);
        }
	can_establish = FALSE;
      }
    }

    /* See if there's a trade route we can cancel at the dest city. */
    if (can_establish && dest_overbooked >= 0) {
      if (dest_max <= 0
          || (city_trade_removable(pcity_dest, routes_out_of_dest)
              >= trade)) {
        notify_player(pplayer, city_tile(pcity_dest),
                      E_BAD_COMMAND, ftc_server,
                      _("Sorry, your %s cannot establish"
                        " a trade route here!"),
                      punit_link);
        if (dest_max > 0) {
          notify_player(pplayer, city_tile(pcity_dest),
                        E_BAD_COMMAND, ftc_server,
                        PL_("      The city of %s already has %d "
                            "better trade route!",
                            "      The city of %s already has %d "
                            "better trade routes!", dest_max),
                        destcity_link,
                        dest_max);
        }
	can_establish = FALSE;
      }
    }
  }

  /* We now know for sure whether we can establish a trade route. */

  /* Calculate and announce initial revenue. */
  revenue = get_caravan_enter_city_trade_bonus(pcity_homecity, pcity_dest, goods,
                                               can_establish);

  bonus_type = trade_route_settings_by_type(cities_trade_route_type(pcity_homecity, pcity_dest))->bonus_type;

  conn_list_do_buffer(pplayer->connections);

  goods_str = goods_name_translation(goods);
  // in the case where, e.g., the unit name is "Goods" and the goods name is "Goods", 
  // avoid saying "Goods Goods" in the messages generated farther below.
  char empty[1] = "";
  if (strcmp(goods_str, utype_name_translation(unit_type_get(punit))) ==0 ) {
    goods_str = empty;
  }

  /* We want to keep the bonus type string as the part of the format of the PL_() strings
   * for supporting proper pluralization for it. */
  switch (bonus_type) {
  case TBONUS_NONE:
    notify_player(pplayer, city_tile(pcity_dest),
                  E_CARAVAN_ACTION, ftc_server,
                  /* TRANS: ... Caravan ... Paris ... Stockholm ... Goods */
                  _("%s %s from %s arrived in %s."),
                  punit_link,
                  goods_str,
                  homecity_link,
                  destcity_link);
    break;
  case TBONUS_GOLD:
    notify_player(pplayer, city_tile(pcity_dest),
                  E_CARAVAN_ACTION, ftc_server,
                  /* TRANS: ... Caravan ... Paris ... Stockholm, ... Goods... */
                  PL_("&#8203;[`gold`] %s %s from %s arrived in %s."
                      " Revenue: <font color='#fff'><b>%d</b></font> gold.",
                      "&#8203;[`gold`] %s %s from %s arrived in %s."
                      " Revenue: <font color='#fff'><b>%d</b></font> gold.",
                      revenue),
                  punit_link,
                  goods_str,
                  homecity_link,
                  destcity_link,
                  revenue);
    break;
  case TBONUS_SCIENCE:
    notify_player(pplayer, city_tile(pcity_dest),
                  E_CARAVAN_ACTION, ftc_server,
                  /* TRANS: ... Caravan ... Paris ... Stockholm, ... Goods... */
                  PL_("💡 %s %s from %s arrived in %s."
                      " Bulbs received: <font color='#ff0'><b>%d</b></font>.",
                      "💡 %s %s from %s arrived in %s."
                      " Bulbs received: <font color='#ff0'><b>%d</b></font>.",
                      revenue),
                  punit_link,
                  goods_str,
                  homecity_link,
                  destcity_link,
                  revenue);
    break;
  case TBONUS_BOTH:
    notify_player(pplayer, city_tile(pcity_dest),
                  E_CARAVAN_ACTION, ftc_server,
                  /* TRANS: ... Caravan ... Paris ... Stockholm, ... Goods... */
                  PL_("&#8203;[`gold`]💡 %s %s from %s arrived in %s."
                      " Revenues: <font color='#fff'><b>%d</b></font> gold, <font color='#ff0'>%d</b></font> bulbs.",
                      "&#8203;[`gold`]💡 %s %s from %s arrived in %s."
                      " Revenues: <font color='#fff'><b>%d</b></font> gold, <font color='#ff0'>%d</b></font> bulbs.",
                      revenue),
                  punit_link,
                  goods_str,
                  homecity_link,
                  destcity_link,
                  revenue, revenue);
    break;
  }

  if (bonus_type == TBONUS_GOLD || bonus_type == TBONUS_BOTH) {
    pplayer->economic.gold += revenue;

    send_player_info_c(pplayer, pplayer->connections);
  }

  if (bonus_type == TBONUS_SCIENCE || bonus_type == TBONUS_BOTH) {
    /* add bulbs and check for finished research */
    update_bulbs(pplayer, revenue, TRUE);

    /* Inform everyone about tech changes */
    send_research_info(research_get(pplayer), NULL);
  }

  if (can_establish) {
    struct trade_route *proute_from, *proute_to;
    struct city_list *cities_out_of_home;
    struct city_list *cities_out_of_dest;
    struct player *partner_player;

    /* Announce creation of trade route (it's not actually created until
     * later in this function, as we have to cancel existing routes, but
     * it makes more sense to announce in this order) */

    partner_player = city_owner(pcity_dest);

    /* Always tell the unit owner */
    notify_player(pplayer, NULL,
                  E_CARAVAN_ACTION, ftc_server,
                  _("🐫 New trade route established from %s to %s."),
                  homecity_link,
                  destcity_link);
    if (pplayer != partner_player) {
      notify_player(partner_player, city_tile(pcity_dest),
                    E_CARAVAN_ACTION, ftc_server,
                    _("🐫 The %s established a trade route from "
                      "%s to %s."),
                    nation_plural_for_player(pplayer),
                    homecity_link,
                    destcity_link);
    }

    cities_out_of_home = city_list_new();
    cities_out_of_dest = city_list_new();

    /* Now cancel any less profitable trade route from the home city. */
    trade_route_list_iterate(routes_out_of_home, premove) {
      struct trade_route *pback;

      city_list_append(cities_out_of_home, game_city_by_number(premove->partner));

      pback = remove_trade_route(pcity_homecity, premove, TRUE, FALSE);
      free(premove);
      free(pback);
    } trade_route_list_iterate_end;

    /* And the same for the dest city. */
    trade_route_list_iterate(routes_out_of_dest, premove) {
      struct trade_route *pback;

      city_list_append(cities_out_of_dest, game_city_by_number(premove->partner));

      pback = remove_trade_route(pcity_dest, premove, TRUE, FALSE);
      free(premove);
      free(pback);
    } trade_route_list_iterate_end;

    /* Actually create the new trade route */
    proute_from = fc_malloc(sizeof(struct trade_route));
    proute_from->partner = pcity_dest->id;
    proute_from->goods = goods;

    proute_to = fc_malloc(sizeof(struct trade_route));
    proute_to->partner = pcity_homecity->id;
    proute_to->goods = goods;

    if (goods_has_flag(goods, GF_BIDIRECTIONAL)) {
      proute_from->dir = RDIR_BIDIRECTIONAL;
      proute_to->dir = RDIR_BIDIRECTIONAL;
    } else {
      proute_from->dir = RDIR_FROM;
      proute_to->dir = RDIR_TO;
    }
    trade_route_list_append(pcity_homecity->routes, proute_from);
    trade_route_list_append(pcity_dest->routes, proute_to);

    /* Refresh the cities. */
    city_refresh(pcity_homecity);
    city_refresh(pcity_dest);
    city_list_iterate(cities_out_of_home, pcity) {
      city_refresh(pcity);
    } city_list_iterate_end;
    city_list_iterate(cities_out_of_dest, pcity) {
      city_refresh(pcity);
    } city_list_iterate_end;

    /* Notify the owners of the cities. */
    send_city_info(pplayer, pcity_homecity);
    send_city_info(partner_player, pcity_dest);
    city_list_iterate(cities_out_of_home, pcity) {
      send_city_info(city_owner(pcity), pcity);
    } city_list_iterate_end;
    city_list_iterate(cities_out_of_dest, pcity) {
      send_city_info(city_owner(pcity), pcity);
    } city_list_iterate_end;

    /* Notify each player about the other cities so that they know about
     * its size for the trade calculation. */
    if (pplayer != partner_player) {
      reality_check_city(partner_player, city_tile(pcity_homecity));
      send_city_info(partner_player, pcity_homecity);
      reality_check_city(pplayer, city_tile(pcity_dest));
      send_city_info(pplayer, pcity_dest);
    }

    city_list_iterate(cities_out_of_home, pcity) {
      if (partner_player != city_owner(pcity)) {
        send_city_info(partner_player, pcity);
        send_city_info(city_owner(pcity), pcity_dest);
      }
      if (pplayer != city_owner(pcity)) {
        send_city_info(pplayer, pcity);
        send_city_info(city_owner(pcity), pcity_homecity);
      }
    } city_list_iterate_end;

    city_list_iterate(cities_out_of_dest, pcity) {
      if (partner_player != city_owner(pcity)) {
        send_city_info(partner_player, pcity);
        send_city_info(city_owner(pcity), pcity_dest);
      }
      if (pplayer != city_owner(pcity)) {
        send_city_info(pplayer, pcity);
        send_city_info(city_owner(pcity), pcity_homecity);
      }
    } city_list_iterate_end;

    city_list_destroy(cities_out_of_home);
    city_list_destroy(cities_out_of_dest);
  }

  /* May cause an incident */
  action_consequence_success(paction,
                             pplayer, act_utype, city_owner(pcity_dest),
                             city_tile(pcity_dest),
                             city_link(pcity_dest));

  conn_list_do_unbuffer(pplayer->connections);

  /* Free data. */
  trade_route_list_destroy(routes_out_of_home);
  trade_route_list_destroy(routes_out_of_dest);

  return TRUE;
}

/**********************************************************************//**
  Change various unit server side client state.

  The server keeps various unit state that is owned by the client. The only
  consequence this state has for the game is how the client reacts to it.
  The state may be server side because the server writes to it or simply to
  have it end up in the save game.
**************************************************************************/
void handle_unit_sscs_set(struct player *pplayer,
                          int unit_id,
                          enum unit_ss_data_type type,
                          int value)
{
  struct unit *punit = player_unit_by_number(pplayer, unit_id);

  if (NULL == punit) {
    /* Being asked to unqueue a "spent" unit because the client haven't
     * been told that it's gone is expected. */
    if (type != USSDT_UNQUEUE) {
      /* Probably died or bribed. */
      log_verbose("handle_unit_sscs_set() invalid unit %d", unit_id);
    }

    return;
  }

  switch (type) {
  case USSDT_QUEUE:
    /* Reminds the client to ask the server about what actions the unit can
     * perform against the target tile. Action decision state can be set by
     * the server it self too. */

    if (index_to_tile(&(wld.map), value) == NULL) {
      /* Asked to be reminded to ask what actions the unit can do to a non
       * existing target tile. */
      log_verbose("unit_sscs_set() invalid target tile %d for unit %d",
                  value, unit_id);
      break;
    }

    punit->action_decision_want = ACT_DEC_ACTIVE;
    punit->action_decision_tile = index_to_tile(&(wld.map), value);

    /* Let the client know that this unit needs the player to decide
     * what to do. */
    send_unit_info(player_reply_dest(pplayer), punit);

    break;
  case USSDT_UNQUEUE:
    /* Delete the reminder for the client to ask the server about what
     * actions the unit can perform against a certain target tile.
     * Action decision state can be set by the server it self too. */

    punit->action_decision_want = ACT_DEC_NOTHING;
    punit->action_decision_tile = NULL;

    /* Let the client know that this unit no longer needs the player to
     * decide what to do. */
    send_unit_info(player_reply_dest(pplayer), punit);

    break;
  case USSDT_BATTLE_GROUP:
    /* Battlegroups are handled entirely by the client, so all we have to
       do here is save the battlegroup ID so that it'll be persistent. */

    punit->battlegroup = CLIP(-1, value, MAX_NUM_BATTLEGROUPS);

    break;
  }
}

/**********************************************************************//**
  Handle request to set unit to autosettler mode.
**************************************************************************/
void handle_unit_autosettlers(struct player *pplayer, int unit_id)
{
  struct unit *punit = player_unit_by_number(pplayer, unit_id);

  if (NULL == punit) {
    /* Probably died or bribed. */
    log_verbose("handle_unit_autosettlers() invalid unit %d", unit_id);
    return;
  }

  if (!can_unit_do_autosettlers(punit)) {
    return;
  }

  punit->ai_controlled = TRUE;
  send_unit_info(NULL, punit);
}

/**********************************************************************//**
  Update everything that needs changing when unit activity changes from
  old activity to new one.
**************************************************************************/
static void unit_activity_dependencies(struct unit *punit,
				       enum unit_activity old_activity,
                                       struct extra_type *old_target)
{
  switch (punit->activity) {
  case ACTIVITY_IDLE:
    switch (old_activity) {
    case ACTIVITY_PILLAGE: 
      {
        if (old_target != NULL) {
          unit_list_iterate_safe(unit_tile(punit)->units, punit2) {
            if (punit2->activity == ACTIVITY_PILLAGE) {
              extra_deps_iterate(&(punit2->activity_target->reqs), pdep) {
                if (pdep == old_target) {
                  set_unit_activity(punit2, ACTIVITY_IDLE);
                  send_unit_info(NULL, punit2);
                  break;
                }
              } extra_deps_iterate_end;
            }
          } unit_list_iterate_safe_end;
        }
        break;
      }
    case ACTIVITY_EXPLORE:
      /* Restore unit's control status */
      punit->ai_controlled = FALSE;
      break;
    default: 
      ; /* do nothing */
    }
    break;
  case ACTIVITY_EXPLORE:
    punit->ai_controlled = TRUE;
    set_unit_activity(punit, ACTIVITY_EXPLORE);
    send_unit_info(NULL, punit);
    break;
  default:
    /* do nothing */
    break;
  }
}

/**********************************************************************//**
  Handle request for changing activity.
**************************************************************************/
bool unit_activity_handling(struct unit *punit,
                            enum unit_activity new_activity)
{
  /* Must specify target for ACTIVITY_BASE */
  fc_assert_ret_val(new_activity != ACTIVITY_BASE
                    && new_activity != ACTIVITY_GEN_ROAD, FALSE);

  if (new_activity == ACTIVITY_PILLAGE) {
    struct extra_type *target = NULL;

    /* Assume untargeted pillaging if no target specified */
    unit_activity_handling_targeted(punit, new_activity, &target);
  } else if (can_unit_do_activity(punit, new_activity)) {
    enum unit_activity old_activity = punit->activity;
    struct extra_type *old_target = punit->activity_target;

    free_unit_orders(punit);
    set_unit_activity(punit, new_activity);
    send_unit_info(NULL, punit);
    unit_activity_dependencies(punit, old_activity, old_target);
  }

  return TRUE;
}

/**********************************************************************//**
  Handle request for targeted activity.
**************************************************************************/
bool unit_activity_handling_targeted(struct unit *punit,
                                     enum unit_activity new_activity,
                                     struct extra_type **new_target)
{
  if (!activity_requires_target(new_activity)) {
    unit_activity_handling(punit, new_activity);
    if (new_activity == ACTIVITY_TRANSFORM) {
        action_consequence_success(action_by_number(ACTION_TRANSFORM_TERRAIN),
                                   unit_owner(punit), unit_type_get(punit),
                                   tile_owner(unit_tile(punit)),
                                   unit_tile(punit),
                                   tile_link(unit_tile(punit)));
      }

  } else if (can_unit_do_activity_targeted(punit, new_activity, *new_target)) {
    enum unit_activity old_activity = punit->activity;
    struct extra_type *old_target = punit->activity_target;
    enum unit_activity stored_activity = new_activity;

    free_unit_orders(punit);
    unit_assign_specific_activity_target(punit,
                                         &new_activity, new_target);
    if (new_activity != stored_activity
        && !activity_requires_target(new_activity)) {
      /* unit_assign_specific_activity_target() changed our target activity
       * (to ACTIVITY_IDLE in practice) */
      unit_activity_handling(punit, new_activity);
    } 
    else 
    {
        set_unit_activity_targeted(punit, new_activity, *new_target);
        send_unit_info(NULL, punit);    
        unit_activity_dependencies(punit, old_activity, old_target);
/*** BEGIN all Pillage actions *****/
        if (new_activity == ACTIVITY_PILLAGE) {
            // Check if this is an instant-Pillage and act accordingly. ("iPillage").
            struct extra_unit_stats pstats;
            unit_get_extra_stats(&pstats, punit);
/**** <start iPillage block>: TODO: move to its own function *****/
            if (unit_can_iPillage(punit) && punit->server.iPillage_no == false) {
              int odds = pstats.iPillage_odds + 5 * punit->veteran; // +5% for each veteran level.
              if (pstats.iPillage_random_targets) punit->server.iPillage_count++; // increment counter for units who pillage multiple extras in one action
/*** BEGIN SUCCESSFUL PILLAGE BLOCK ***/
              if (fc_rand(100) < odds) {
                notify_player(unit_owner(punit), unit_tile(punit),
                          E_UNIT_ACTION_TARGET_HOSTILE, ftc_server,
                          /* changing this string below requires changing substring extraction in packhand:handle_iPillage_event() */
                          _("💥 Your %s destroyed the %s %s with a %s."),
                          unit_link(punit),
                          (tile_owner(unit_tile(punit)) ? nation_adjective_for_player(tile_owner(unit_tile(punit))) : " " ), 
                          extra_name_translation(punit->activity_target),
                          unit_type_get(punit)->sound_fight_alt);
                //notify other player:
                if (tile_owner(punit->tile) && tile_owner(punit->tile) != unit_owner(punit)) {
                  notify_player(tile_owner(punit->tile), unit_tile(punit),
                          E_UNIT_ACTION_TARGET_HOSTILE, ftc_server,
                          _("⚠️ Your %s %s destroyed from %s %s done by %s %s %s!"),
                          extra_name_translation(punit->activity_target),
                          (is_word_plural(extra_name_translation(punit->activity_target)) ? "were" : "was"),
                          indefinite_article_for_word(unit_type_get(punit)->sound_fight_alt, false),                          
                          unit_type_get(punit)->sound_fight_alt,
                          indefinite_article_for_word(nation_adjective_for_player(unit_owner(punit)), false),
                          nation_adjective_for_player(unit_owner(punit)),
                          unit_link(punit));
                }
                // update_unit_activity(..) usually calls unit_activity_complete(..), but, it
                // assumes it is processing activities at TC, so it does things like restoring
                // move points.. Therefore, handle all house-keeping here prior to the call, so
                // that send_unit_info, etc., sends the right info out to clients after:
                punit->server.action_timestamp = 0;
                if (pstats.iPillage_random_targets) {
                  // Multiple targets in one action, only subtract the unit's moves_left on the final iPillage.
                  if (((punit->server.iPillage_count) % pstats.iPillage_random_targets) == 0) {
                    punit->moves_left -= pstats.iPillage_moves * SINGLE_MOVE; //reduce moves left
                    punit->server.iPillage_count = 0;  // reset counter back to 0.
                  }
                }
                else { // always subtract moves_left if not on a counter up to iPillage_random_targets:
                  punit->moves_left -= pstats.iPillage_moves * SINGLE_MOVE; //reduce moves left
                }
                if (punit->moves_left<0) punit->moves_left = 0;
                  punit->activity_count = 1000;  // force unit_activity_complete to iPillage (instant-finish activity)
                  unit_activity_complete(punit);
                  unit_did_action(punit); // iPillage, just like unit_move, needs an immediate real-time uwt timestamp.
              } 
/*** END SUCCESSFUL iPILLAGE BLOCK ***/
/*** BEGIN FAILED iPILLAGE BLOCK ***/
              else {
                notify_player(unit_owner(punit), unit_tile(punit),
                          E_UNIT_ACTION_ACTOR_FAILURE, ftc_server,
                          _("💢 Your %s's %s missed its target."),
                          unit_link(punit),
                          unit_type_get(punit)->sound_fight_alt);
                //notify other player:
                if (tile_owner(punit->tile)) {
                  notify_player(tile_owner(punit->tile), unit_tile(punit),
                          E_UNIT_ACTION_ACTOR_FAILURE, ftc_server,
                          _("💢 %s %s %s failed while trying to %s your %s."),
                          indefinite_article_for_word(nation_adjective_for_player(unit_owner(punit)), true),
                          nation_adjective_for_player(unit_owner(punit)),
                          unit_link(punit),
                          unit_type_get(punit)->sound_fight_alt,
                          extra_name_translation(punit->activity_target));
                }
                if (pstats.iPillage_random_targets) {
                  // Multiple targets in one action, only subtract the moves on the final iPillage.
                  if (((punit->server.iPillage_count) % pstats.iPillage_random_targets) == 0) {
                    punit->moves_left -= pstats.iPillage_moves * SINGLE_MOVE; //reduce moves left
                    punit->server.iPillage_count = 0;  // reset counter back to 0.
                  }
                }
                else punit->moves_left -= pstats.iPillage_moves * SINGLE_MOVE; // always reduce moves left for single_target ops
                if (punit->moves_left<0) punit->moves_left = 0;
                // unit_activity_complete(..) was not called due to FAILED MISSION, so do house-keeping here:
                unit_did_action(punit); // iPillage, just like unit_move, needs an immediate real-time uwt timestamp.
                unit_list_refresh_vision(unit_tile(punit)->units);
                set_unit_activity(punit, ACTIVITY_IDLE);
                unit_forget_last_activity(punit);
                send_unit_info(NULL, punit);
              } 
/*** END FAILED iPILLAGE BLOCK ***/
            }
/**** </end iPillage block>: TODO: move to its own function *****/
            punit->server.iPillage_no = false; 
            // both iPillage and regular Pillage reset special request flag to false after any pillage attempt type completed.

            /* DEBUG only:
            notify_player(unit_owner(punit), NULL,
                          E_UNIT_RELOCATED, ftc_server,
                          _("%s is true.\niPillage_moves=%d\nbitfield=%d\nptype->paratroopers_mr_sub=%d"),
                          unit_type_get(punit)->sound_fight_alt,
                          pstats.iPillage_moves, pstats.bit_field,
                          unit_type_get(punit)->paratroopers_mr_sub);*/

            // Successful action consequence has to come early to make casus belli,
            // so that victim can preventatively react to the offensive behaviour:
            action_consequence_success(action_by_number(ACTION_PILLAGE),
                                    unit_owner(punit), unit_type_get(punit),
                                    tile_owner(unit_tile(punit)),
                                    unit_tile(punit),
                                    tile_link(unit_tile(punit)));

        }
/**** </end all PILLAGE ACTIONS> *****/        
        else if (new_activity == ACTIVITY_GEN_ROAD) {
          // Successful action consequence has to come early to make casus belli,
          // so that victim can preventatively react to the offensive behaviour:          
          action_consequence_success(action_by_number(ACTION_ROAD),
                                    unit_owner(punit), unit_type_get(punit),
                                    tile_owner(unit_tile(punit)),
                                    unit_tile(punit),
                                    tile_link(unit_tile(punit)));                                   
        }
        else if (new_activity == ACTIVITY_BASE) {
          // Successful action consequence has to come early to make casus belli,
          // so that victim can preventatively react to the offensive behaviour:
          action_consequence_success(action_by_number(ACTION_BASE),
                                    unit_owner(punit), unit_type_get(punit),
                                    tile_owner(unit_tile(punit)),
                                    unit_tile(punit),
                                    tile_link(unit_tile(punit)));                                   
        }
    }
  }

  return TRUE;
}

/**********************************************************************//**
  Receives route packages.
**************************************************************************/
void handle_unit_orders(struct player *pplayer,
                        const struct packet_unit_orders *packet)
{
  int length = packet->length;
  struct unit *punit = player_unit_by_number(pplayer, packet->unit_id);
  struct tile *src_tile = index_to_tile(&(wld.map), packet->src_tile);
  struct unit_order *order_list;
#ifdef FREECIV_DEBUG
  int i;
#endif

  if (NULL == punit) {
    /* Probably died or bribed. */
    log_verbose("handle_unit_orders() invalid unit %d", packet->unit_id);
    return;
  }

  if (0 > length || MAX_LEN_ROUTE < length) {
    /* Shouldn't happen */
    log_error("handle_unit_orders() invalid %s (%d) "
              "packet length %d (max %d)", unit_rule_name(punit),
              packet->unit_id, length, MAX_LEN_ROUTE);
    return;
  }

  if (src_tile != unit_tile(punit)) {
    /* Failed sanity check.  Usually this happens if the orders were sent
     * in the previous turn, and the client thought the unit was in a
     * different position than it's actually in.  The easy solution is to
     * discard the packet.  We don't send an error message to the client
     * here (though maybe we should?). */
    log_verbose("handle_unit_orders() invalid %s (%d) tile (%d, %d) "
                "!= (%d, %d)", unit_rule_name(punit), punit->id,
                TILE_XY(src_tile), TILE_XY(unit_tile(punit)));
    return;
  }

  if (ACTIVITY_IDLE != punit->activity) {
    /* New orders implicitly abandon current activity */
    unit_activity_handling(punit, ACTIVITY_IDLE);
  }

  if (length) {
    order_list = create_unit_orders(length, packet->orders);
    if (!order_list) {
      log_error("received invalid orders from %s for %s (%d).",
                player_name(pplayer), unit_rule_name(punit), packet->unit_id);
      return;
    }
  }

  /* This must be before old orders are freed. If this is
   * settlers on city founding mission, city spot reservation
   * from goto_tile must be freed, and free_unit_orders() loses
   * goto_tile information */
  adv_unit_new_task(punit, AUT_NONE, NULL);

  free_unit_orders(punit);
  /* If we waited on a tile, reset punit->done_moving */
  punit->done_moving = (punit->moves_left <= 0);

  /* Make sure that the unit won't keep its old ai_controlled state after
   * it has recieved new orders from the client. */
  punit->ai_controlled = FALSE;

  if (length == 0) {
    fc_assert(!unit_has_orders(punit));
    send_unit_info(NULL, punit);
    return;
  }

  punit->has_orders = TRUE;
  punit->orders.length = length;
  punit->orders.index = 0;
  punit->orders.repeat = packet->repeat;
  punit->orders.vigilant = packet->vigilant;
  if (length) {
    punit->orders.list = order_list;
  }

  if (!packet->repeat) {
    punit->goto_tile = index_to_tile(&(wld.map), packet->dest_tile);
  } else {
    /* Make sure that no old goto_tile remains. */
    punit->goto_tile = NULL;
  }

#ifdef FREECIV_DEBUG
  log_debug("Orders for unit %d: length:%d", packet->unit_id, length);
  for (i = 0; i < length; i++) {
    log_debug("  %d,%s,%s,%d",
              packet->orders[i].order, dir_get_name(packet->orders[i].dir),
              packet->orders[i].order == ORDER_PERFORM_ACTION ?
                action_id_rule_name(packet->orders[i].action) :
                packet->orders[i].order == ORDER_ACTIVITY ?
                  unit_activity_name(packet->orders[i].activity) :
                  "no action/activity required",
              packet->orders[i].sub_target);
  }
#endif /* FREECIV_DEBUG */

  if (!is_player_phase(unit_owner(punit), game.info.phase)
      || execute_orders(punit, TRUE)) {
    /* Looks like the unit survived. */
    send_unit_info(NULL, punit);
  }
}

/**********************************************************************//**
  Handle worker task assigned to the city
**************************************************************************/
void handle_worker_task(struct player *pplayer,
                        const struct packet_worker_task *packet)
{
  struct city *pcity = game_city_by_number(packet->city_id);
  struct worker_task *ptask = NULL;
  struct tile *ptile = index_to_tile(&(wld.map), packet->tile_id);

  if (pcity == NULL || pcity->owner != pplayer || ptile == NULL) {
    return;
  }

  worker_task_list_iterate(pcity->task_reqs, ptask_old) {
    if (tile_index(ptask_old->ptile) == packet->tile_id) {
      ptask = ptask_old;
    }
  } worker_task_list_iterate_end;

  if (ptask == NULL) {
    if (packet->activity == ACTIVITY_LAST) {
      return;
    }

    ptask = fc_malloc(sizeof(struct worker_task));
    worker_task_init(ptask);
    worker_task_list_append(pcity->task_reqs, ptask);
  } else {
    if (packet->activity == ACTIVITY_LAST) {
      worker_task_list_remove(pcity->task_reqs, ptask);
      free(ptask);
      ptask = NULL;
    }
  }

  if (ptask != NULL) {
    ptask->ptile = ptile;
    ptask->act = packet->activity;
    if (packet->tgt >= 0) {
      if (packet->tgt < MAX_EXTRA_TYPES) {
        ptask->tgt = extra_by_number(packet->tgt);
      } else {
        log_debug("Illegal worker task target %d", packet->tgt);
        ptask->tgt = NULL;
      }
    } else {
      ptask->tgt = NULL;
    }
    ptask->want = packet->want;
  }

  lsend_packet_worker_task(pplayer->connections, packet);
}
