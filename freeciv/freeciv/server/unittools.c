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
#include "bitvector.h"
#include "fcintl.h"
#include "log.h"
#include "mem.h"
#include "rand.h"
#include "shared.h"
#include "support.h"

/* common */
#include "base.h"
#include "city.h"
#include "combat.h"
#include "clientutils.h"
#include "events.h"
#include "game.h"
#include "government.h"
#include "idex.h"
#include "map.h"
#include "movement.h"
#include "packets.h"
#include "player.h"
#include "research.h"
#include "terrain.h"
#include "unit.h"
#include "unitlist.h"
#include "unittype.h"

/* common/scriptcore */
#include "luascript_signal.h"
#include "luascript_types.h"

/* aicore */
#include "path_finding.h"
#include "pf_tools.h"

/* server/scripting */
#include "script_server.h"

/* server */
#include "actiontools.h"
#include "aiiface.h"
#include "barbarian.h"
#include "citytools.h"
#include "cityturn.h"
#include "diplhand.h"
#include "gamehand.h"
#include "maphand.h"
#include "notify.h"
#include "plrhand.h"
#include "sanitycheck.h"
#include "sernet.h"
#include "srv_main.h"
#include "techtools.h"
#include "unithand.h"

/* server/advisors */
#include "advgoto.h"
#include "autoexplorer.h"
#include "autosettlers.h"

/* ai */
#include "handicaps.h"

#include "unittools.h"

char encoded_unit_emoji[128];

/* Tools for controlling the client vision of every unit when a unit
 * moves + script effects. See unit_move(). You can access this data with
 * punit->server.moving; it may be NULL if the unit is not moving). */
struct unit_move_data {
  int ref_count;
  struct unit *punit; /* NULL for invalidating. */
  struct player *powner;
  bv_player can_see_unit;
  bv_player can_see_move;
  struct vision *old_vision;
};

#define SPECLIST_TAG unit_move_data
#include "speclist.h"
#define unit_move_data_list_iterate(_plist, _pdata)                         \
  TYPED_LIST_ITERATE(struct unit_move_data, _plist, _pdata)
#define unit_move_data_list_iterate_end LIST_ITERATE_END
#define unit_move_data_list_iterate_rev(_plist, _pdata)                     \
  TYPED_LIST_ITERATE_REV(struct unit_move_data, _plist, _pdata)
#define unit_move_data_list_iterate_rev_end LIST_ITERATE_REV_END

/* This data structure lets the auto attack code cache each potential
 * attacker unit's probability of success against the target unit during
 * the checks if the unit can do autoattack. It is then reused when the
 * list of potential attackers is sorted by probability of success. */
struct autoattack_prob {
  int unit_id;
  struct act_prob prob;
  int can_attack;    // stashes info for AA_ADVANCED and avoid recalculations
  bool can_bombard;  //    "     "    "       "       "    "        "
};

#define SPECLIST_TAG autoattack_prob
#define SPECLIST_TYPE struct autoattack_prob
#include "speclist.h"

#define autoattack_prob_list_iterate_safe(autoattack_prob_list, _aap_,     \
                                          _unit_)                          \
  TYPED_LIST_ITERATE(struct autoattack_prob, autoattack_prob_list, _aap_)  \
  struct unit *_unit_ = game_unit_by_number(_aap_->unit_id);               \
                                                                           \
  if (_unit_ == NULL) {                                                    \
    continue;                                                              \
  }

#define autoattack_prob_list_iterate_safe_end  LIST_ITERATE_END

static void unit_restore_hitpoints(struct unit *punit);
static void unit_restore_movepoints(struct player *pplayer, struct unit *punit);
static void update_unit_activity(struct unit *punit, time_t now);
static bool try_to_save_unit(struct unit *punit, const struct unit_type *pttype,
                             bool helpless, bool teleporting,
                             const struct city *pexclcity);
static void wakeup_neighbor_sentries(struct unit *punit, bool departure);
static void do_upgrade_effects(struct player *pplayer);

static bool maybe_cancel_patrol_due_to_enemy(struct unit *punit);
static int hp_gain_coord(struct unit *punit);

static bool maybe_become_veteran_real(struct unit *punit, bool settler);

static void unit_transport_load_tp_status(struct unit *punit,
                                               struct unit *ptrans,
                                               bool force);

static void wipe_unit_full(struct unit *punit, bool transported,
                           enum unit_loss_reason reason,
                           struct player *killer);

static char unit_scrambled_id(int id);

/* Cycling index used by uwt scrambler.*/
int unit_wait_cycle = -1;


/**********************************************************************//**
  Returns a unit type that matches the role_tech or role roles.

  If role_tech is given, then we look at all units with this role
  whose requirements are met by any player, and return a random one.  This
  can be used to give a unit to barbarians taken from the set of most
  advanced units researched by the 'real' players.

  If role_tech is not give (-1) or if there are no matching unit types,
  then we look at 'role' value and return a random matching unit type.

  It is an error if there are no available units.  This function will
  always return a valid unit.
**************************************************************************/
struct unit_type *find_a_unit_type(enum unit_role_id role,
                                   enum unit_role_id role_tech)
{
  struct unit_type *which[U_LAST];
  int i, num = 0;

  if (role_tech != -1) {
    for (i = 0; i < num_role_units(role_tech); i++) {
      struct unit_type *iunit = get_role_unit(role_tech, i);
      const int minplayers = 2;
      int players = 0;

      /* Note, if there's only one player in the game this check will always
       * fail. */
      players_iterate(pplayer) {
	if (!is_barbarian(pplayer)
	    && can_player_build_unit_direct(pplayer, iunit)) {
	  players++;
	}
      } players_iterate_end;
      if (players > minplayers) {
	which[num++] = iunit;
      }
    }
  }
  if (num == 0) {
    for (i = 0; i < num_role_units(role); i++) {
      which[num++] = get_role_unit(role, i);
    }
  }

  /* Ruleset code should ensure there is at least one unit for each
   * possibly-required role, or check before calling this function. */
  fc_assert_exit_msg(0 < num, "No unit types in find_a_unit_type(%d, %d)!",
                     role, role_tech);

  return which[fc_rand(num)];
}

/*************************************************************************
  Used by wrapper macro UNIT_EMOJI(punit) - returns icon for a unit.
  Purpose: facilitate much quicker scanning of pages of text. It was
  found that putting the emoji BEFORE the actor type-name and AFTER
  the victim type-name, greatly facilitates that purpose.
  ...
  Returns empty string if not FCW or if invalid unit.
**************************************************************************/
char *get_web_unit_icon(const struct unit *punit, char *emoji_str)
{
  emoji_str[0] = 0; // default/reset result to "" empty string
  if (!punit) return emoji_str;
  const struct unit_type *ptype = unit_type_get((const struct unit *)punit);
  if (!ptype) return emoji_str;

#ifdef FREECIV_WEB
  sprintf(emoji_str, "[`%s`]", utype_name_translation(ptype));
#endif

  return emoji_str; // returning the parameter assists macro syntax.
}

/*************************************************************************
  Makes a unit->id into a single base-26 alphabetic letter. This allows
  semi-uniquely identifying units to players in a short form that doesn't
  reveal intel about the age of the unit, how many units are in the game,
  etc. There is a 1/26 chance of confusing two different units as the same,
  but who says that never happened in real life?
**************************************************************************/
static char unit_scrambled_id(int n)
{

  n += game.info.turn; /* Sentries can differentiate unit (quasi)-identity
     within a single turn, but not like a "permanent SSN" */

  char identifer = (char)(90-(n % 26));
  return identifer;
}

/**********************************************************************//**
  Unit has a chance to become veteran. This should not be used for settlers
  for the work they do.
**************************************************************************/
bool maybe_make_veteran(struct unit *punit)
{
  return maybe_become_veteran_real(punit, FALSE);
}

/**********************************************************************//**
  After a battle, after diplomatic aggression and after surviving trireme
  loss chance, this routine is called to decide whether or not the unit
  should become more experienced.

  There is a specified chance for it to happen, (+50% if player got SUNTZU)
  the chances are specified in the units.ruleset file.

  If 'settler' is TRUE the veteran level is increased due to work done by
  the unit.
**************************************************************************/
static bool maybe_become_veteran_real(struct unit *punit, bool settler)
{
  const struct veteran_system *vsystem;
  const struct veteran_level *vlevel;
  int chance;

  fc_assert_ret_val(punit != NULL, FALSE);

  vsystem = utype_veteran_system(unit_type_get(punit));
  fc_assert_ret_val(vsystem != NULL, FALSE);
  fc_assert_ret_val(vsystem->levels > punit->veteran, FALSE);

  vlevel = utype_veteran_level(unit_type_get(punit), punit->veteran);
  fc_assert_ret_val(vlevel != NULL, FALSE);

  if (punit->veteran + 1 >= vsystem->levels
      || unit_has_type_flag(punit, UTYF_NO_VETERAN)) {
    return FALSE;
  } else if (!settler) {
    int mod = 100 + get_unit_bonus(punit, EFT_VETERAN_COMBAT);

    /* The modification is tacked on as a multiplier to the base chance.
     * For example with a base chance of 50% for green units and a modifier
     * of +50% the end chance is 75%. */
    chance = vlevel->base_raise_chance * mod / 100;
  } else if (settler && unit_has_type_flag(punit, UTYF_SETTLERS)) {
    chance = vlevel->work_raise_chance;
  } else {
    /* No battle and no work done. */
    return FALSE;
  }

  if (fc_rand(100) < chance) {
    punit->veteran++;
    return TRUE;
  }

  return FALSE;
}

/**********************************************************************//**
  This is the basic unit versus unit combat routine.
  1) ALOT of modifiers bonuses etc is added to the 2 units rates.
  2) the combat loop, which continues until one of the units are dead or
     EFT_COMBAT_ROUNDS rounds have been fought.
  3) the aftermath, the loser (and potentially the stack which is below it)
     is wiped, and the winner gets a chance of gaining veteran status
**************************************************************************/
void unit_versus_unit(struct unit *attacker, struct unit *defender,
                      int *att_hp, int *def_hp)
{
  int attackpower = get_total_attack_power(attacker, defender);
  int defensepower = get_total_defense_power(attacker, defender);
  int attack_firepower, defense_firepower;
  struct player *plr1 = unit_owner(attacker);
  struct player *plr2 = unit_owner(defender);
  int max_rounds;           /* EFT_COMBAT_ROUNDS */
  int defender_max_rounds;  /* EFT_DEFENDER_COMBAT_ROUNDS */
  int rounds;

  struct extra_unit_stats pstats;   // TO DO, this should be separate structure for attack modifier stats.
  unit_get_extra_stats(&pstats, attacker);

  *att_hp = attacker->hp;
  *def_hp = defender->hp;
  get_modified_firepower(attacker, defender,
			 &attack_firepower, &defense_firepower);

/* DEBUG
  log_verbose("attack:%d, defense:%d, attack firepower:%d, "
              "defense firepower:%d", attackpower, defensepower,
              attack_firepower, defense_firepower);

  log_verbose("attack:%d, defense:%d, attack firepower:%d, "
            "defense firepower:%d", attackpower, defensepower,
            attack_firepower, defense_firepower);
*/

/* debug
  notify_player(plr1, NULL, E_UNIT_ACTION_FAILED, ftc_server,
            _("attack: %d, defense:%d, att_fp: %d, "
            "def_fp: %d"), attackpower, defensepower,
            attack_firepower, defense_firepower);
            */

  player_update_last_war_action(plr1);
  player_update_last_war_action(plr2);

  if (attackpower == 0) {
    *att_hp = 0;
  } else if (defensepower == 0) {
    *def_hp = 0;
  }


  /* Combat_Rounds tests the defended tile rather than attacker tile,
   * because that's where the combat is really happening. */
  max_rounds = get_target_bonus_effects(NULL,
                                        unit_owner(attacker),
                                        unit_owner(defender),
                                        unit_tile(defender) ? tile_city(unit_tile(defender)) : NULL,
                                        NULL,
                                        unit_tile(defender), // consistency: same tile used in get_total_attack_power() above.
                                        attacker,
                                        unit_type_get(attacker),
                                        NULL,
                                        NULL,
                                        NULL,
                                        EFT_COMBAT_ROUNDS,
                                        V_COUNT);
  /* There may be the case of an elusive defender unit_type or such,
   * which limits the combat_rounds from defender's perspective: */
  defender_max_rounds
             = get_target_bonus_effects(NULL,
                                        unit_owner(defender),
                                        unit_owner(attacker),
                                        unit_tile(defender) ? tile_city(unit_tile(defender)) : NULL,
                                        NULL,
                                        unit_tile(defender),
                                        defender,
                                        unit_type_get(defender),
                                        NULL,
                                        NULL,
                                        NULL,
                                        EFT_DEFENDER_COMBAT_ROUNDS,
                                        V_COUNT);
/* The stronger of the two  effects is obviously whichever reduces
   combat_rounds the most. So let the stronger effect be the winner,
   and discard the weaker. The tricky part is to treat zero and negative
   numbers as "higher" since <=0 really means infinite rounds: */
max_rounds = MIN(defender_max_rounds, max_rounds) <= 0
           ? MAX(defender_max_rounds, max_rounds)
           : MIN(defender_max_rounds, max_rounds);

  for (rounds = 0;
       *att_hp > 0 && *def_hp > 0
         && (max_rounds <= 0 || max_rounds > rounds);
       rounds++) {
    if (fc_rand(attackpower + defensepower) >= defensepower) {
      *def_hp -= attack_firepower;
    } else {
      *att_hp -= defense_firepower;
    }
  }
  if (*att_hp < 0) {
    *att_hp = 0;
  }
  if (*def_hp < 0) {
    *def_hp = 0;
  }
  // Re-fortify those whose attributes specify it:
  if (attacker->changed_from == ACTIVITY_FORTIFIED) {
    if (pstats.attack_stay_fortified) { // TODO: later will not share this struct/member with bombard
      attacker->activity = ACTIVITY_FORTIFIED;
    } // Make sure those who don't, aren't, prevent 'D' exploit:
    else {
      attacker->activity = ACTIVITY_IDLE;
      attacker->changed_from = ACTIVITY_IDLE;
    }
  }
  // Increment number of times unit has attacked this turn:
  attacker->server.attacks_this_turn++;
}

/**********************************************************************//**
  This is the basic unit versus unit classic bombardment routine.
  1) ALOT of modifiers bonuses etc is added to the 2 units rates.
  2) Do rate attacks and don't kill the defender, then return.
**************************************************************************/
void unit_bombs_unit(struct unit *attacker, struct unit *defender,
                     int *att_hp, int *def_hp, bool can_kill, int bombard_rate)
{
  int i;
  // int rate = unit_type_get(attacker)->bombard_rate;
  int rate = bombard_rate;

  int attackpower = get_total_attack_power(attacker, defender);
  int defensepower = get_total_defense_power(attacker, defender);
  int attack_firepower, defense_firepower;
  struct player *plr1 = unit_owner(attacker);
  struct player *plr2 = unit_owner(defender);

  struct bombard_stats pstats;
  unit_get_bombard_stats(&pstats, attacker);

  *att_hp = attacker->hp;
  *def_hp = defender->hp;
  get_modified_firepower(attacker, defender,
                         &attack_firepower, &defense_firepower);

  // Special attack modifiers applying to Bombard only:
  attackpower = attackpower * (100 + pstats.bombard_atk_mod)/100;

  //notify_player(plr1, NULL, E_UNIT_ACTION_FAILED, ftc_server, _("Modified ATK = %f"), (float)attackpower/100);

  // Special defense modifiers applying to Bombard only:
  // TO DO:
  /* if (defender->activity == ACTIVITY_FORTIFIED)
  defensepower *= (100 + def_pstats->fortified_def_mod);
  defensepower /= 100; */

/* DEBUG
  log_verbose("attack:%d, defense:%d, attack firepower:%d, "
              "defense firepower:%d", attackpower, defensepower,
              attack_firepower, defense_firepower); */

  player_update_last_war_action(plr1);
  player_update_last_war_action(plr2);

  for (i = 0; i < rate; i++) {
    if (fc_rand(attackpower + defensepower) >= defensepower) {
      *def_hp -= attack_firepower;
    }
  }

  /* Don't kill the target unless allowed */
  if (!can_kill && *def_hp <= 0) {
    *def_hp = 1;
  }

  // Re-fortify those whose Special Unit Attack specifies it:
  if (attacker->changed_from == ACTIVITY_FORTIFIED) {
    if (pstats.bombard_stay_fortified) {
      attacker->activity = ACTIVITY_FORTIFIED;
    } // Make sure those who don't, aren't, prevent 'D' exploit:
    else {
      attacker->activity = ACTIVITY_IDLE;
      attacker->changed_from = ACTIVITY_IDLE;
    }
  }
}

/**********************************************************************//**
  Maybe make either side of combat veteran
**************************************************************************/
void combat_veterans(struct unit *attacker, struct unit *defender)
{
  if (attacker->hp <= 0 || defender->hp <= 0
      || !game.info.only_killing_makes_veteran) {
    if (attacker->hp > 0) {
      maybe_make_veteran(attacker);
    }
    if (defender->hp > 0) {
      maybe_make_veteran(defender);
    }
  }
}

/**********************************************************************//**
  Do unit auto-upgrades to players with the EFT_UNIT_UPGRADE effect
  (traditionally from Leonardo's Workshop).
**************************************************************************/
static void do_upgrade_effects(struct player *pplayer)
{
  int upgrades = get_player_bonus(pplayer, EFT_UPGRADE_UNIT);
  struct unit_list *candidates;

  if (upgrades <= 0) {
    return;
  }
  candidates = unit_list_new();

  unit_list_iterate(pplayer->units, punit) {
    /* We have to be careful not to strand units at sea, for example by
     * upgrading a frigate to an ironclad while it was carrying a unit. */
    if (UU_OK == unit_upgrade_test(punit, TRUE)) {
      unit_list_prepend(candidates, punit);	/* Potential candidate :) */
    }
  } unit_list_iterate_end;

  while (upgrades > 0 && unit_list_size(candidates) > 0) {
    /* Upgrade one unit.  The unit is chosen at random from the list of
     * available candidates. */
    int candidate_to_upgrade = fc_rand(unit_list_size(candidates));
    struct unit *punit = unit_list_get(candidates, candidate_to_upgrade);
    const struct unit_type *type_from = unit_type_get(punit);
    const struct unit_type *type_to = can_upgrade_unittype(pplayer, type_from);

    // Get old emoji before it transforms to a new type:
    char old_unit_emoji[128]; sprintf(old_unit_emoji, "%s", UNIT_EMOJI(punit));

    transform_unit(punit, type_to, TRUE);
    notify_player(pplayer, unit_tile(punit), E_UNIT_UPGRADED, ftc_server,
                  _("[`ribbon`] %s %s upgraded for free to %s %s"),
                  old_unit_emoji, utype_name_translation(type_from),
                  unit_link(punit), UNIT_EMOJI(punit));
    unit_list_remove(candidates, punit);
    upgrades--;
  }

  unit_list_destroy(candidates);
}

/**********************************************************************//**
  1. Do Leonardo's Workshop upgrade if applicable.

  2. Restore/decrease unit hitpoints.

  3. Kill dead units.

  4. Rescue airplanes by returning them to base automatically.

  5. Decrease fuel of planes in the air.

  6. Refuel planes that are in bases.

  7. Kill planes that are out of fuel.
**************************************************************************/
void player_restore_units(struct player *pplayer)
{
  /* 1) get Leonardo out of the way first: */
  do_upgrade_effects(pplayer);

  unit_list_iterate_safe(pplayer->units, punit) {
    const struct unit_type *utype = unit_type_get(punit);
    bool coastal = utype_has_flag(utype, UTYF_COAST);

    /* 2) Modify unit hitpoints. Helicopters can even lose them. */
    unit_restore_hitpoints(punit);

    /* 3) Check that unit has hitpoints */
    if (punit->hp <= 0) {
      /* This should usually only happen for heli units, but if any other
       * units get 0 hp somehow, catch them too.  --dwp  */
      /* if 'game.server.killunhomed' is activated unhomed units are slowly
       * killed; notify player here */
      if (!punit->homecity && 0 < game.server.killunhomed) {
        notify_player(pplayer, unit_tile(punit), E_UNIT_LOST_MISC,
                      ftc_server, _("[`warning`] Your %s %s has run out of hit points "
                                    "because it was not supported by a city."),
                      unit_tile_link(punit), UNIT_EMOJI(punit));
      } else {
        notify_player(pplayer, unit_tile(punit), E_UNIT_LOST_MISC, ftc_server,
                      _("[`warning`] Your %s %s has run out of hit points."),
                      unit_tile_link(punit), UNIT_EMOJI(punit));
      }

      wipe_unit(punit, ULR_HP_LOSS, NULL);
      continue; /* Continue iterating... */
    }

    /* 4) Rescue fuel units if needed */
    if (utype_fuel(unit_type_get(punit))) {
      /* Shall we emergency return home on the last vapors? */

      /* I think this is strongly against the spirit of client goto.
       * The problem is (again) that here we know too much. -- Zamar */

      if (punit->fuel <= 1
          && !is_unit_being_refueled(punit)) {
        struct unit *carrier;

        /* auto-refuel is not a UWT event but we can't let it change
          the previous UWT timestamp: therefore we will reset it to
          whatever UWT timestamp it had before the auto-return */
        time_t original_timestamp = punit->server.action_timestamp;

        carrier = transporter_for_unit(punit);
        if (carrier) {
          unit_transport_load_tp_status(punit, carrier, FALSE);
        } else {
          bool alive = true;

          struct pf_map *pfm;
          struct pf_parameter parameter;

          pft_fill_unit_parameter(&parameter, punit);
          parameter.omniscience = !has_handicap(pplayer, H_MAP);
          pfm = pf_map_new(&parameter);

          pf_map_move_costs_iterate(pfm, ptile, move_cost, TRUE) {
            if (move_cost > punit->moves_left) {
              /* Too far */
              break;
            }

            if (is_airunit_refuel_point(ptile, pplayer, punit)) {
              struct pf_path *path;
              int id = punit->id;

              /* Client orders may be running for this unit - if so
               * we free them before engaging goto. */
              free_unit_orders(punit);

              path = pf_map_path(pfm, ptile);

              alive = adv_follow_path(punit, path, ptile);

              if (!alive) {
                log_error("rescue plane: unit %d died enroute!", id);
              } else if (!same_pos(unit_tile(punit), ptile)) {
                /* Enemy units probably blocked our route
                 * FIXME: We should try find alternative route around
                 * the enemy unit instead of just giving up and crashing. */
                log_debug("rescue plane: unit %d could not move to "
                          "refuel point!", punit->id);
              }

              if (alive) {
                /* Clear activity. Unit info will be sent in the end of
	               * the function. */
                unit_activity_handling(punit, ACTIVITY_IDLE);
                adv_unit_new_task(punit, AUT_NONE, NULL);
                punit->goto_tile = NULL;

                if (!is_unit_being_refueled(punit)) {
                  carrier = transporter_for_unit(punit);
                  if (carrier) {
                    unit_transport_load_tp_status(punit, carrier, FALSE);
                  }
                }

                /* Auto-refuel is not a human-enacted move so does not incur UWT: */
                punit->server.action_timestamp = original_timestamp;

                if (coastal) {
                   notify_player(pplayer, unit_tile(punit),
                                E_UNIT_ORDERS, ftc_server,
                                _("[`spiral`] Your %s %s has returned to safe coast."),
                                UNIT_EMOJI(punit), unit_link(punit));
                } else {
                    notify_player(pplayer, unit_tile(punit),
                                E_UNIT_ORDERS, ftc_server,
                                _("[`fuel`] Your %s %s has returned to refuel."),
                                UNIT_EMOJI(punit), unit_link(punit));
                }
              }
              pf_path_destroy(path);
              break;
            }
          } pf_map_move_costs_iterate_end;
          pf_map_destroy(pfm);

          if (!alive) {
            /* Unit died trying to move to refuel point. */
            return;
	        }
        }
      }

      /* 5) Update fuel */
      punit->fuel--;

      /* 6) Automatically refuel air units in cities, airbases, and
       *    transporters (carriers). */
      if (is_unit_being_refueled(punit)) {
	      punit->fuel = utype_fuel(unit_type_get(punit));
      }
    }
  } unit_list_iterate_safe_end;

  /* 7) Check if there are air units without fuel */
  unit_list_iterate_safe(pplayer->units, punit) {
    const struct unit_type *utype = unit_type_get(punit);

    if (punit->fuel <= 0 && utype_fuel(unit_type_get(punit))) {
      if (utype_has_flag(utype, UTYF_COAST)) {
        notify_player(pplayer, unit_tile(punit), E_UNIT_LOST_MISC, ftc_server,
                      _("[`warning`]Your %s %s strayed from coast for %d turns, and %s lost at sea!"),
                      unit_tile_link(punit), UNIT_EMOJI(punit),
                      utype_fuel(unit_type_get(punit)),
                      (is_unit_plural(punit) ? "were" : "was"));
      } else {
        notify_player(pplayer, unit_tile(punit), E_UNIT_LOST_MISC, ftc_server,
                      _("[`warning`]Your %s %s %s lost when %s ran out of fuel."),
                      unit_tile_link(punit), UNIT_EMOJI(punit),
                      (is_unit_plural(punit) ? "were" : "was"),
                      (is_unit_plural(punit) ? "they" : "it"));
      }
      wipe_unit(punit, ULR_FUEL, NULL);
    }
  } unit_list_iterate_safe_end;

  /* Send all updates. */
  unit_list_iterate(pplayer->units, punit) {
    send_unit_info(NULL, punit);
  } unit_list_iterate_end;
}

/**********************************************************************//**
  add hitpoints to the unit, hp_gain_coord returns the amount to add
  united nations will speed up the process by 2 hp's / turn, means helicopters
  will actually not lose hp's every turn if player have that wonder.
  Units which have moved don't gain hp, except the United Nations and
  helicopter effects still occur.

  If 'game.server.killunhomed' is greater than 0, unhomed units lose
  'game.server.killunhomed' hitpoints each turn, killing the unit at the end.
**************************************************************************/
static void unit_restore_hitpoints(struct unit *punit)
{
  bool was_lower;
  int save_hp;
  struct unit_class *pclass = unit_class_get(punit);
  struct city *pcity = tile_city(unit_tile(punit));

  was_lower = (punit->hp < unit_type_get(punit)->hp);
  save_hp = punit->hp;

  if (!punit->moved) {
    punit->hp += hp_gain_coord(punit);
  }

  /* Bonus recovery HP (traditionally from the United Nations) */
  punit->hp += get_unit_bonus(punit, EFT_UNIT_RECOVER);
  punit->hp += (unit_type_get(punit)->hp
                * get_unit_bonus(punit, EFT_UNIT_RECOVER_PCT) / 100);

  if (!punit->homecity && 0 < game.server.killunhomed
      && !unit_has_type_flag(punit, UTYF_GAMELOSS)) {
    /* Hit point loss of units without homecity; at least 1 hp! */
    /* Gameloss units are immune to this effect. */
    int hp_loss = MAX(unit_type_get(punit)->hp * game.server.killunhomed / 100,
                      1);
    punit->hp = MIN(punit->hp - hp_loss, save_hp - 1);
  }

  if (!pcity && !tile_has_native_base(unit_tile(punit), unit_type_get(punit))
      && !unit_transported(punit)) {
    punit->hp -= unit_type_get(punit)->hp * pclass->hp_loss_pct / 100;
  }

  if (punit->hp >= unit_type_get(punit)->hp) {
    punit->hp = unit_type_get(punit)->hp;
    /* Wake up injured sentry units who became fully restored */
    if (was_lower && punit->activity == ACTIVITY_SENTRY) {
      set_unit_activity(punit, ACTIVITY_IDLE);
    }
    /* Wake up injured FORTIFIED units after healing, if in a city.
       (Fortified gives no bonus in a city EXCEPT healing faster.) Why:
       Better UX for the usual case of fortifying to heal faster: remove
       the penalty of needing to heal slower just to get wake-up UX
       convenience. TODO: if the (ACTIVITY_FORTIFIED || in_city==true)
       condition for receiving 1.5x D-bonus is ever moved out of hard-coded
       server, this feature needs a server setting or other conditional
       logic to not wake the unit iff it will get a lower defense bonus as
       a result of waking */
    if (was_lower && punit->activity == ACTIVITY_FORTIFIED
        && tile_city(unit_tile(punit))) {
      set_unit_activity(punit, ACTIVITY_IDLE);
    }
  }

  if (punit->hp < 0) {
    punit->hp = 0;
  }

  punit->moved = FALSE;
  punit->paradropped = FALSE;
}

/**********************************************************************//**
  Move points are trivial, only modifiers to the base value is if it's
  sea units and the player has certain wonders/techs. Then add veteran
  bonus, if any.
**************************************************************************/
static void unit_restore_movepoints(struct player *pplayer, struct unit *punit)
{
  punit->moves_left = unit_move_rate(punit);
  punit->done_moving = FALSE;
  /* remaining attacks is something to restore also: */
  punit->server.attacks_this_turn = 0;
}

/**********************************************************************//**
  Iterate through all units for a player and restore their move points.
  Has to be called before player/unit activities and orders processing
  in order to avoid some units getting their mp refreshed AFTER another
  player's units affected their mp.
**************************************************************************/
void update_unit_move_points(struct player *pplayer)
{
  unit_list_iterate_safe(pplayer->units, punit) {
  /* Cache moves_left for later calculating of unit activity progress: */
    punit->server.moves_left_at_start = punit->moves_left;
    unit_restore_movepoints(pplayer, punit);
  } unit_list_iterate_safe_end;
}

/**********************************************************************//**
  Iterate through all units and update them.

  Called only by srv_main.c::begin_phase(..) for TC processing
**************************************************************************/
void update_unit_activities(struct player *pplayer)
{
  time_t now = time(NULL);
  unit_list_iterate_safe(pplayer->units, punit) {
    update_unit_activity(punit, now);
    /* This is where we would reset punit->server.moves_left_at_start to some kinda -1 or #defined FLAG */
  } unit_list_iterate_safe_end;
}

/**********************************************************************//**
  Iterate through all units and execute their orders.
**************************************************************************/
void execute_unit_orders(struct player *pplayer)
{
  unit_list_iterate_safe(pplayer->units, punit) {
    if (unit_has_orders(punit)) {
      /* Execute_orders except IFF: Delay_Goto in use & activity=GOTO & uwt restricted */
      if ((game.server.unitwaittime_style & UWT_DELAY_GOTO) && punit->has_orders) {
        /* Check if unit still has UWT: */
        time_t dt = time(NULL) - punit->server.action_timestamp;
        if (dt < game.server.unitwaittime && punit->activity == ACTIVITY_IDLE ) {
          /* DON'T execute GOTO if UWT restricted. Give a courtesy message: */
          char buf[64];
          if (dt>0.99) {
            format_time_duration(game.server.unitwaittime - dt, buf, sizeof(buf));
            notify_player(punit->owner, unit_tile(punit),
                          E_UNIT_ORDERS, ftc_server,
                          _(" [`hourglass`] %s %s movement delayed %s."),
                          UNIT_EMOJI(punit), unit_link(punit), buf);
          }
        } else execute_orders(punit, FALSE); /* Delay_Goto not applicable */
      } else execute_orders(punit, FALSE); /* Delay_Goto not in use. */
    }
  } unit_list_iterate_safe_end;
}

/**********************************************************************//**
  Iterate through all units and remember their current activities.
**************************************************************************/
void finalize_unit_phase_beginning(struct player *pplayer)
{
  /* Remember activities only after all knock-on effects of unit activities
   * on other units have been resolved */
  unit_list_iterate(pplayer->units, punit) {
    punit->changed_from = punit->activity;
    punit->changed_from_target = punit->activity_target;
    punit->changed_from_count = punit->activity_count;
    send_unit_info(NULL, punit);
  } unit_list_iterate_end;
}

/**********************************************************************//**
  returns how many hp's a unit will gain on this square
  depends on whether or not it's inside city or fortress.
  barracks will regen landunits completely
  airports will regen airunits  completely
  ports    will regen navalunits completely
  fortify will add a little extra.
**************************************************************************/
static int hp_gain_coord(struct unit *punit)
{
  int hp = 0;
  const int base = unit_type_get(punit)->hp;

  /* Includes barracks (100%), fortress (25%), etc. */
  hp += base * get_unit_bonus(punit, EFT_HP_REGEN) / 100;

  /* In city: +33% (rounded down) */
  if (tile_city(unit_tile(punit))) {
    /* Apply only which is higher between EFT_HP_REGEN and 33% city bonus */
    hp = MAX(hp, base / 3);
  }

  /* +10% for resting ("Math.ceil" round-up) */
  if (!unit_class_get(punit)->hp_loss_pct) {
    hp += (base + 9) / 10;
  }

  /* Additional +10% for fortify (10+10=20) ("Math.ceil" round-up) */
  if (punit->activity == ACTIVITY_FORTIFIED) {
    hp += (base + 9) / 10;
  }

  return MAX(hp, 0);
}

/**********************************************************************//**
  Calculate the total amount of activity performed by all units on a tile
  for a given task and target.
**************************************************************************/
static int total_activity(struct tile *ptile, enum unit_activity act,
                          struct extra_type *tgt)
{
  int total = 0;
  bool tgt_matters = activity_requires_target(act);

  unit_list_iterate(ptile->units, punit) {
    if (unit_is_alive(punit->id) && punit->activity == act
/* 28Jan2022 added unit_is_alive() && ... to hunt segfault. REMOVE
   if it ends up being some other problem:
signal SIGSEGV, Segmentation fault:
#0  total_activity (ptile=0x55dc95922d10, tgt=0x0, act=ACTIVITY_MINE)
    at ../../freeciv/server/unittools.c:861
861         if (punit->activity == act
[Current thread is 1 (Thread 0x7fb43c04a800 (LWP 26250))]
#0  total_activity (ptile=0x55dc95922d10, tgt=0x0, act=ACTIVITY_MINE)
    at ../../freeciv/server/unittools.c:861 */
        && (!tgt_matters || punit->activity_target == tgt)) {
      total += punit->activity_count;
    }
  } unit_list_iterate_end;

  return total;
}

/**********************************************************************//**
  Check the total amount of activity performed by all units on a tile
  for a given task.
**************************************************************************/
static bool total_activity_done(struct tile *ptile, enum unit_activity act,
                                struct extra_type *tgt)
{
  return total_activity(ptile, act, tgt) >= tile_activity_time(act, ptile, tgt);
}

/**********************************************************************//**
  Common notification for all experience levels.
**************************************************************************/
void notify_unit_experience(struct unit *punit)
{
  const struct veteran_system *vsystem;
  const struct veteran_level *vlevel;

  if (!punit) {
    return;
  }

  vsystem = utype_veteran_system(unit_type_get(punit));
  fc_assert_ret(vsystem != NULL);
  fc_assert_ret(vsystem->levels > punit->veteran);

  vlevel = utype_veteran_level(unit_type_get(punit), punit->veteran);
  fc_assert_ret(vlevel != NULL);

  notify_player(unit_owner(punit), unit_tile(punit),
            E_UNIT_BECAME_VET, ftc_server,
            //  TRANS: Your <unit> became ... rank of <veteran level>.
            _("[`medal`] <font color='#fff'>v%d</font>. Your %s gained experience and %s now %s. <span class='nowrap'>%s[`v%d`]</span>"),
            punit->veteran, unit_link(punit),
            (is_unit_plural(punit) ? "are" : "is"),
            name_translation_get(&vlevel->name), UNIT_EMOJI(punit), punit->veteran);
}

/**********************************************************************//**
  Convert a single unit to another type.
**************************************************************************/
static void unit_convert(struct unit *punit)
{
  const struct unit_type *to_type;
  const struct unit_type *from_type;

  from_type = unit_type_get(punit);
  to_type = from_type->converted_to;

  if (unit_can_convert(punit)) {
    transform_unit(punit, to_type, TRUE);
    notify_player(unit_owner(punit), unit_tile(punit),
                  E_UNIT_UPGRADED, ftc_server,
                  _("[`recycle`] %s converted to %s %s"),
                  utype_name_translation(from_type),
                  utype_name_translation(to_type), UNIT_EMOJI(punit));
  } else {
    notify_player(unit_owner(punit), unit_tile(punit),
                  E_UNIT_UPGRADED, ftc_server,
                  _("%s %s cannot be converted."),
                  UNIT_EMOJI(punit),
                  utype_name_translation(from_type));
  }
}

/**********************************************************************//**
  Cancel all illegal activities done by units at the specified tile.
**************************************************************************/
void unit_activities_cancel_all_illegal(const struct tile *ptile)
{
  unit_list_iterate(ptile->units, punit2) {
    if (!can_unit_continue_current_activity(punit2)) {
      if (unit_has_orders(punit2)) {
        notify_player(unit_owner(punit2), unit_tile(punit2),
                      E_UNIT_ORDERS, ftc_server,
                      _("Orders for %s aborted because activity "
                        "is no longer available."),
                      unit_link(punit2));
        free_unit_orders(punit2);
      }

      set_unit_activity(punit2, ACTIVITY_IDLE);
      send_unit_info(NULL, punit2);
    }
  } unit_list_iterate_end;
}

/**********************************************************************//**
  Finish all the effects of unit activity.
**************************************************************************/
void unit_activity_complete(struct unit *punit)
{
  bool unit_activity_done = FALSE;
  enum unit_activity activity = punit->activity;
  struct tile *ptile = unit_tile(punit);

  switch (activity) {

  /* DELAYED GOTO HANDLING: */
  case ACTIVITY_IDLE: /* (ACTIVITY_IDLE && has_orders) means GOTO */
  case ACTIVITY_GOTO:
    /* Only do handling if settings delay GOTO, and unit is doing a GOTO: */
    if ((game.server.unitwaittime_style & UWT_DELAY_GOTO) && punit->has_orders) {
      /* Don't execute GOTO if it is UWT restricted: */
      time_t dt = time(NULL) - punit->server.action_timestamp;
      if (dt < game.server.unitwaittime) {
        char buf[64];
        if (dt>0.99) {
          format_time_duration(game.server.unitwaittime - dt, buf, sizeof(buf));
          notify_player(punit->owner, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                    _(" [`hourglass`] %s %s movement delayed %s."),
                    UNIT_EMOJI(punit), unit_link(punit), buf);
        }
      } else { /* Else, no UWT remaining. Force GOTO to happen: */
        /* DEBUG leftover
        notify_player(punit->owner, NULL, E_UNIT_RELOCATED, ftc_server,
        _("uac: %s #%d execute call (a GOTO with uwt satisfied)."),unit_link(punit),punit->id);*/
        execute_orders(punit, true);
      }
      return;
    }
  break;

  /* DELAYED FORTIFY HANDLING: */
  case ACTIVITY_FORTIFYING:
    /* Criterion for delayed Fortify is UWT_FORTIFY=enabled */
    if ((game.server.unitwaittime_style & UWT_FORTIFY)) {
      /* Check unit has accumulated enough activity_count to finish:*/
      if (punit->activity_count >= action_id_get_act_time(ACTION_FORTIFY,
                                  punit, ptile, punit->activity_target)) {
        /* Check if 'fortifywaittime' has expired: */
        time_t dt = time(NULL) - punit->server.action_timestamp;
        if (dt < game.server.fortifywaittime) {
          /* FWT not expired. This task is in the unit_wait_list to handle later.*/
          return;
        }
        else {
          punit->activity = ACTIVITY_FORTIFIED; /* Force a prompt mid-turn state change */
          send_unit_info(NULL, punit);
          /* "Fortify complete" messages might be verbose. They would go here:
             notify_player(punit->owner, NULL, E_UNIT_ORDERS, ftc_server,
                      _("%s finished fortifying."), unit_link(punit));*/
          return;
        }
      }
    }
  break;

  case ACTIVITY_CONVERT:
  case ACTIVITY_FORTIFIED:
  case ACTIVITY_SENTRY:
  case ACTIVITY_VIGIL:
  case ACTIVITY_PATROL_UNUSED:
  case ACTIVITY_LAST:
    break;

  case ACTIVITY_EXPLORE:
    do_explore(punit);
    return;

  case ACTIVITY_PILLAGE:
    if (total_activity_done(ptile, ACTIVITY_PILLAGE,
                            punit->activity_target)) {
      struct player *victim = tile_owner(ptile); /* Owner before fortress gets destroyed */

      destroy_extra(ptile, punit->activity_target);
      unit_activity_done = TRUE;
      punit->server.iPillage_no = false; // never carries over after successful pillage.

      bounce_units_on_terrain_change(ptile);

      call_incident(INCIDENT_PILLAGE, unit_owner(punit), victim);

      /* Change vision if effects have changed. */
      unit_list_refresh_vision(ptile->units);
    }
    break;

  case ACTIVITY_POLLUTION:
    /* TODO: Remove fallback target setting when target always correctly set */
    if (punit->activity_target == NULL) {
      punit->activity_target = prev_extra_in_tile(ptile, ERM_CLEANPOLLUTION,
                                                  NULL, punit);
    }
    if (total_activity_done(ptile, ACTIVITY_POLLUTION, punit->activity_target)) {
      destroy_extra(ptile, punit->activity_target);
      unit_activity_done = TRUE;
    }
    break;

  case ACTIVITY_FALLOUT:
    /* TODO: Remove fallback target setting when target always correctly set */
    if (punit->activity_target == NULL) {
      punit->activity_target = prev_extra_in_tile(ptile, ERM_CLEANFALLOUT,
                                                  NULL, punit);
    }
    if (total_activity_done(ptile, ACTIVITY_FALLOUT, punit->activity_target)) {
      destroy_extra(ptile, punit->activity_target);
      unit_activity_done = TRUE;
    }
    break;

  case ACTIVITY_BASE:
    {
      if (total_activity(ptile, ACTIVITY_BASE, punit->activity_target)
          >= tile_activity_time(ACTIVITY_BASE, ptile, punit->activity_target)) {
        create_extra(ptile, punit->activity_target, unit_owner(punit));
        unit_activity_done = TRUE;
      }
    }
    break;

  case ACTIVITY_GEN_ROAD:
    {
      if (total_activity(ptile, ACTIVITY_GEN_ROAD, punit->activity_target)
          >= tile_activity_time(ACTIVITY_GEN_ROAD, ptile, punit->activity_target)) {
        create_extra(ptile, punit->activity_target, unit_owner(punit));
        unit_activity_done = TRUE;
      }
    }
    break;

  case ACTIVITY_IRRIGATE:
  case ACTIVITY_MINE:
  case ACTIVITY_CULTIVATE:
  case ACTIVITY_PLANT:
  case ACTIVITY_TRANSFORM:
    if (total_activity_done(ptile, activity, punit->activity_target)) {
      struct terrain *old = tile_terrain(ptile);

      /* The function below could change the terrain. Therefore, we have to
       * check the terrain (which will also do a sanity check for the tile). */
      tile_apply_activity(ptile, activity, punit->activity_target);
      check_terrain_change(ptile, old);
      unit_activity_done = TRUE;
    }
    break;

  case ACTIVITY_OLD_ROAD:
  case ACTIVITY_OLD_RAILROAD:
  case ACTIVITY_FORTRESS:
  case ACTIVITY_AIRBASE:
    fc_assert(FALSE);
    break;
  }

  if (unit_activity_done) {
    update_tile_knowledge(ptile);
    if (ACTIVITY_IRRIGATE == activity
        || ACTIVITY_MINE == activity
        || ACTIVITY_CULTIVATE == activity
        || ACTIVITY_PLANT == activity
        || ACTIVITY_TRANSFORM == activity) {
      /* FIXME: As we might probably do the activity again, because of the
       * terrain change cycles, we need to treat these cases separatly.
       * Probably ACTIVITY_TRANSFORM should be associated to its terrain
       * target, whereas ACTIVITY_IRRIGATE and ACTIVITY_MINE should only
       * used for extras. */
      unit_list_iterate(ptile->units, punit2) {
        if (punit2->activity == activity) {
          set_unit_activity(punit2, ACTIVITY_IDLE);
          unit_forget_last_activity(punit2);
          send_unit_info(NULL, punit2);
        } else if (punit2->changed_from == activity) {
          unit_forget_last_activity(punit2);
          send_unit_info(NULL, punit2);
        }
      } unit_list_iterate_end;
    } else {
      unit_list_iterate(ptile->units, punit2) {
        if (!can_unit_continue_current_activity(punit2)) {
          set_unit_activity(punit2, ACTIVITY_IDLE);
          send_unit_info(NULL, punit2);
        }
      } unit_list_iterate_end;
    }

    tile_changing_activities_iterate(act) {
      if (act == activity) {
        /* Some units nearby may not be able to continue their action,
         * such as building irrigation if we removed the only source
         * of water from them. */
        adjc_iterate(&(wld.map), ptile, ptile2) {
          unit_activities_cancel_all_illegal(ptile2);
        } adjc_iterate_end;
        break;
      }
    } tile_changing_activities_iterate_end;
  }

  if (activity == ACTIVITY_FORTIFYING) {
    if (punit->activity_count
        >= action_id_get_act_time(ACTION_FORTIFY,
                                  punit, ptile, punit->activity_target)) {
      set_unit_activity(punit, ACTIVITY_FORTIFIED);
    }
  }

  if (activity == ACTIVITY_CONVERT) {
    if (punit->activity_count
        >= action_id_get_act_time(ACTION_CONVERT,
                                  punit, ptile, punit->activity_target)) {
      unit_convert(punit);
      set_unit_activity(punit, ACTIVITY_IDLE);
    }
  }
}

/**************************************************************************
  Progress settlers in their current tasks, and units that are pillaging.
  also move units that are on a goto.

  This function should only be called by update_unit_activities()
  which itself is only called once during TC processing in begin_phase()
**************************************************************************/
static void update_unit_activity(struct unit *punit, time_t now)
{
  //struct player *pplayer = unit_owner(punit);
  enum unit_activity activity = punit->activity;
  // bool flag TRUE means TC processing:
  int activity_rate = real_get_activity_rate_this_turn(punit, TRUE);
  struct unit_wait *wait;
  time_t wake_up;
  /* Value now has to be cached by update_unit_move_points()
  long moves_left_at_start = punit->moves_left; */
  long moves_left_at_start = punit->server.moves_left_at_start;

  /* Fortify order has separate wait time setting (or lack thereof) */
  if (activity==ACTIVITY_FORTIFYING && (game.server.unitwaittime_style & UWT_FORTIFY) ) {
    wake_up = punit->server.action_timestamp + (time_t)game.server.fortifywaittime;
  } else {
    wake_up = punit->server.action_timestamp + (time_t)game.server.unitwaittime;
  }

  /* Now that Freeciv has actions from some units that affect the mp of others,
     mp restoration must happen for all players' units prior to any other
     activity/order processing. See update_unit_move_points() called by
     srv_main() prior to any other player/unit iterating.

  unit_restore_movepoints(pplayer, punit); */

  switch (activity) {
  /*  These activities have no TC exploitability thus no uwt handling */
  case ACTIVITY_EXPLORE:
  case ACTIVITY_FORTIFIED:
  case ACTIVITY_SENTRY:
  case ACTIVITY_PATROL_UNUSED:
  case ACTIVITY_VIGIL:
  case ACTIVITY_LAST:
    break;

  /* DELAYED GOTO handling */
  case ACTIVITY_GOTO: /* DELAYED GOTO */
  case ACTIVITY_IDLE: /* units with GOTO orders really show up with this activity code */
    if (!(punit->has_orders)) break; /* for a real idle unit, has_orders==false */
    if (game.server.unitwaittime
        && punit->has_orders
        && (game.server.unitwaittime_style & UWT_DELAY_GOTO)
        && wake_up > now) {
      wait = fc_malloc(sizeof(*wait));
      wait->activity_count = activity_rate;
      wait->id = punit->id;
      wait->wake_up = scramble_uwt_stamp(wake_up);
      /* DEBUG LEFTOVER
      notify_player(punit->owner, NULL, E_UNIT_RELOCATED, ftc_server,
              _("uua.%s #%d appending to waitlist. activity_code==%d"),unit_link(punit),punit->id, (int)activity );*/
      unit_wait_list_append(server.unit_waits, wait);
//      unit_wait_list_sort(server.unit_waits, unit_wait_cmp);
      return;
    }
    break;

  /* DELAYED ACTIVITY handling */
  /* Some activities may cause promotion: */
  case ACTIVITY_POLLUTION:
  case ACTIVITY_MINE:
  case ACTIVITY_IRRIGATE:
  case ACTIVITY_PILLAGE:
  case ACTIVITY_CULTIVATE:
  case ACTIVITY_PLANT:
  case ACTIVITY_TRANSFORM:
  case ACTIVITY_FALLOUT:
  case ACTIVITY_BASE:
  case ACTIVITY_GEN_ROAD:
    if (maybe_become_veteran_real(punit, TRUE)) {
    notify_unit_experience(punit);
    }
  /* Remaining activities can't cause promotion: */
  case ACTIVITY_FORTIFYING:
  case ACTIVITY_CONVERT:
    if (game.server.unitwaittime
        && ( (activity != ACTIVITY_FORTIFYING)
             || ( (activity==ACTIVITY_FORTIFYING) && (game.server.unitwaittime_style & UWT_FORTIFY) )
           )
        && (game.server.unitwaittime_style & UWT_ACTIVITIES)
        && wake_up > now) {
      wait = fc_malloc(sizeof(*wait));
      wait->activity_count = activity_rate;
      wait->id = punit->id;
      wait->wake_up = scramble_uwt_stamp(wake_up);
      unit_wait_list_append(server.unit_waits, wait);

      time_t dt = wake_up - time(NULL);
      char buf[64]; format_time_duration(dt, buf, sizeof(buf));
      /* Courtesy message: activity isn't completed yet */
      if (moves_left_at_start && punit->ai_controlled == FALSE) {
        if (punit->activity==ACTIVITY_FORTIFYING) {
          if (!tile_city(unit_tile(punit))) {
          // fortifying in a city isn't reported, more of a "client UI convenience"
            notify_player(punit->owner, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                      _("  [`hourglass`] %s %s will finish Fortifying in %s."),
                      UNIT_EMOJI(punit), unit_link(punit), buf);
          }
        } else {
          /* Only report activities that will be finished THIS TURN after the UWT. */
          int turns = 0;
          const char *activity_text = unit_tile_activity_text(punit, &turns);
          if (turns<=1) { /* UWT reports are only for activities that finish this turn */
            notify_player(punit->owner, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                    _("  [`hourglass`] %s %s doing %s will finish in %s."),
                    UNIT_EMOJI(punit), unit_link(punit), activity_text, buf);
          }
        }
      }
      return;
    }
    punit->activity_count += activity_rate;
    break;

   case ACTIVITY_OLD_ROAD:
   case ACTIVITY_OLD_RAILROAD:
   case ACTIVITY_FORTRESS:
   case ACTIVITY_AIRBASE:
     fc_assert(FALSE);
     return;
  }
  unit_activity_complete(punit);
}

/**********************************************************************//**
  Finish activity of a unit that was deferred by unitwaittime.
**************************************************************************/
void finish_unit_wait(struct unit *punit, int activity_count)
{
  punit->activity_count += activity_count;
  bool possibly_moved = false;
  bool had_orders = (punit->orders.length >= 1);
  struct tile *original_tile = punit->tile;
  bool orders_finished = false;
  char buf[64];

  switch (punit->activity) {
      case ACTIVITY_FORTIFYING:
         sprintf(buf,"%s",_("fortifying"));
         break;
      case ACTIVITY_CONVERT:
         sprintf(buf,"%s",_("converting"));
         break;
      case ACTIVITY_POLLUTION:
         sprintf(buf,"%s",_("cleaning Pollution"));
         break;
      case ACTIVITY_MINE:
         sprintf(buf,"%s",_("mining"));
         break;
      case ACTIVITY_IRRIGATE:
         sprintf(buf,"%s",_("irrigating"));
         break;
      case ACTIVITY_PILLAGE:
         sprintf(buf,"%s %s",_("pillaging"),
                 punit->activity_target ? extra_name_translation(punit->activity_target)
                 : "");
         break;
      case ACTIVITY_TRANSFORM:
         sprintf(buf,"%s",_("transforming terrain"));
         break;
      case ACTIVITY_FALLOUT:
         sprintf(buf,"%s",_("cleaning Fallout"));
         break;
      case ACTIVITY_BASE:
         sprintf(buf,"%s %s",_("building"),extra_name_translation(punit->activity_target));
         break;
      case ACTIVITY_GEN_ROAD:
         if (punit->activity_target == extra_type_by_rule_name("River")) {
           sprintf(buf,"%s",_("digging Well"));
         } else sprintf(buf,"%s %s",_("building"),extra_name_translation(punit->activity_target));
         break;
      default:
         sprintf(buf,"%s",_("moving"));
         possibly_moved=true;
  }
/* DEBUG LEFTOVER
  notify_player(punit->owner, unit_tile(punit), E_UNIT_RELOCATED, ftc_server,
        _("fuw.%s #%d getting a uac call to execute."),unit_link(punit),punit->id); */

  /* Save id some info in case the unit doesn't exist after doing its action: */
  int saved_id = punit->id;
  const struct unit_type *saved_type = unit_type_get(punit);
  const struct player *saved_player = unit_owner(punit);
  const struct tile *saved_tile = unit_tile(punit);

  /* Call the function for finishing activities: */
  unit_activity_complete(punit);

  /* Unit may have joined a city, established embassy, got auto-attacked, etc. */
  bool is_dead = !unit_is_alive(saved_id);

  /* Send a message if legitimate activity completed */
  if (!is_dead) {
    /* If unit had orders but not anymore, then unit is no longer doing activity */
    orders_finished = had_orders && !punit->has_orders;

    /* Catch false movement cases, bogus orders, etc.: don't print message for these */
    if (possibly_moved==true && (original_tile == punit->tile))
      orders_finished = false;

    /* Report activity is finished: */
    if (orders_finished && punit->activity==ACTIVITY_IDLE)
        notify_player(unit_owner(punit), unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                      _(" [`clock`] %s %s finished %s."), unit_link(punit), UNIT_EMOJI(punit), buf);
  } else {
    /* Unit no longer exists after unit_activity_complete() */
    notify_player(saved_player, saved_tile, E_UNIT_ORDERS, ftc_server,
                      _(" [`clock`] %s %s finished."),
                      utype_name_translation(saved_type),
                      (is_word_plural(utype_name_translation(saved_type)) ? "are" : "is"));
  }
}

/**********************************************************************//**
  Scramble the timestamp for when UWT_ACTIVITIES and UWT_DELAY_GOTO units
  'wake up' to do their mid-turn orders. Disallows abuse of UwT_ACTIVITIES
  for overly precise "time scripted exploits."
**************************************************************************/
time_t scramble_uwt_stamp(time_t stamptime)
{
#define SCRAMBLE_OFFSET_SECONDS 2
  time_t scramble_time;

  if (++unit_wait_cycle >= NUM_UWT_CYCLES)
    unit_wait_cycle = 0;

  /* Add 0-9 seconds to the time a delayed action will be executed
   * (UWT_ACTIVITIES / UWT_DELAY_GOTO). Do it in such a that mass-orders
   * given to 10 units will evenly distribute over that time range, yet
   * each is "unpredictably uneven" by 1 second. */
  scramble_time = stamptime + (time_t)(unit_wait_cycle * SCRAMBLE_OFFSET_SECONDS
                            + fc_rand(SCRAMBLE_OFFSET_SECONDS));

  /* Catch 32-bit unsigned time_t making negative numbers into false huge vals */
  if (stamptime>4000000000||scramble_time>4000000000/*2038CE*/||stamptime<0)
    scramble_time = stamptime;

  return scramble_time;
}

/**********************************************************************//**
  Forget the unit's last activity so that it can't be resumed. This is
  used for example when the unit moves or attacks.
**************************************************************************/
void unit_forget_last_activity(struct unit *punit)
{
  punit->changed_from = ACTIVITY_IDLE;
  punit->server.iPillage_no = false;
  if (punit->server.wait) {
    unit_wait_list_erase(server.unit_waits, punit->server.wait);
  }
}

/**********************************************************************//**
  Return TRUE iff activity requires some sort of target to be specified by
  the client.
**************************************************************************/
bool unit_activity_needs_target_from_client(enum unit_activity activity)
{
  switch (activity) {
  case ACTIVITY_PILLAGE:
    /* Can be set server side. */
    return FALSE;
  default:
    return activity_requires_target(activity);
  }
}

/**********************************************************************//**
  For some activities (currently only pillaging), the precise target can
  be assigned by the server rather than explicitly requested by the client.
  This function assigns a specific activity+target if the current
  settings are open-ended (otherwise leaves them unchanged).

  Please update unit_activity_needs_target_from_client() if you add server
  side unit activity target setting to more activities.
**************************************************************************/
void unit_assign_specific_activity_target(struct unit *punit,
                                          enum unit_activity *activity,
                                          struct extra_type **target)
{
  if (*activity == ACTIVITY_PILLAGE
      && *target == NULL) {
    struct tile *ptile = unit_tile(punit);
    struct extra_type *tgt;

    bv_extras extras = *tile_extras(ptile);

    while ((tgt = get_preferred_pillage(extras))) {

      BV_CLR(extras, extra_index(tgt));

      if (can_unit_do_activity_targeted(punit, *activity, tgt)) {
        *target = tgt;
        return;
      }
    }
    /* Nothing we can pillage here. */
    *activity = ACTIVITY_IDLE;
  }
}

/**********************************************************************//**
  Find place to place partisans. Returns whether such spot was found, and
  if it has been found, dst_tile contains that tile.
**************************************************************************/
static bool find_a_good_partisan_spot(struct tile *pcenter,
                                      struct player *powner,
                                      struct unit_type *u_type,
                                      int sq_radius,
                                      struct tile **dst_tile)
{
  int bestvalue = 0;

  /* coords of best tile in arg pointers */
  circle_iterate(&(wld.map), pcenter, sq_radius, ptile) {
    int value;

    if (!is_native_tile(u_type, ptile)) {
      continue;
    }

    if (NULL != tile_city(ptile)) {
      continue;
    }

    if (0 < unit_list_size(ptile->units)) {
      continue;
    }

    /* City may not have changed hands yet; see place_partisans(). */
    value = get_virtual_defense_power(NULL, u_type, powner,
				      ptile, FALSE, 0);
    value *= 10;

    if (tile_continent(ptile) != tile_continent(pcenter)) {
      value /= 2;
    }

    value -= fc_rand(value/3);

    if (value > bestvalue) {
      *dst_tile = ptile;
      bestvalue = value;
    }
  } circle_iterate_end;

  return bestvalue > 0;
}

/**********************************************************************//**
  Place partisans for powner around pcenter (normally around a city).
**************************************************************************/
void place_partisans(struct tile *pcenter, struct player *powner,
                     int count, int sq_radius)
{
  struct tile *ptile = NULL;
  struct unit_type *u_type = get_role_unit(L_PARTISAN, 0);
  int vet_level = 0;

#ifdef FREECIV_WEB
  /* FCW uses bitwise trickery to specify the unit_type. TODO: this function
     should be rewritten to let LUA specify the unit_type to generate, as it
     would generalize a lot more game events than only partisan spawning. */
  if (count > 255) {
    int utype_idx = count;
    /* First 8 bits are # of partisans */
    count &= 255;
    /* utype index is everything past the first 8 bits */
    utype_idx -= count;
    utype_idx = utype_idx >> 8;
    u_type = utype_by_number((Unit_type_id)utype_idx);
    if (!u_type) return;
  }

  /* Cities with Barracks or players with Sun Tzu get vet partisans: */
  vet_level  = get_target_bonus_effects(NULL,
                                        powner,
                                        NULL,
                                        tile_city(pcenter),
                                        NULL,
                                        pcenter,
                                        NULL,
                                        u_type,
                                        NULL,
                                        NULL,
                                        NULL,
                                        EFT_VETERAN_BUILD,
                                        V_COUNT);
#endif

  while (count-- > 0
         && find_a_good_partisan_spot(pcenter, powner, u_type,
                                      sq_radius, &ptile)) {
    struct unit *punit;

    punit = create_unit(powner, ptile, u_type, vet_level, 0, -1);
    if (can_unit_do_activity(punit, ACTIVITY_FORTIFYING)) {
      punit->activity = ACTIVITY_FORTIFIED; /* yes; directly fortified */
      send_unit_info(NULL, punit);
    }
  }
}

/**********************************************************************//**
  Teleport punit to city at cost specified. Returns success. Note that unit
  may die if it succesfully moves, i.e., even when return value is TRUE.
  (If specified cost is -1, then teleportation costs all movement.)
**************************************************************************/
bool teleport_unit_to_city(struct unit *punit, struct city *pcity,
                           long move_cost, bool verbose)
{
  struct tile *src_tile = unit_tile(punit), *dst_tile = pcity->tile;

  if (city_owner(pcity) == unit_owner(punit)) {
    log_verbose("Teleported %s %s from (%d,%d) to %s",
                nation_rule_name(nation_of_unit(punit)),
                unit_rule_name(punit), TILE_XY(src_tile), city_name_get(pcity));
    if (verbose) {
      notify_player(unit_owner(punit), city_tile(pcity),
                    E_UNIT_RELOCATED, ftc_server,
                    _("Teleported your %s %s to %s."),
                    unit_link(punit), UNIT_EMOJI(punit),
                    city_link(pcity));
    }

    /* Silently free orders since they won't be applicable anymore. */
    free_unit_orders(punit);

    if (move_cost == -1) {
      move_cost = punit->moves_left;
    }
    unit_move(punit, dst_tile, move_cost, NULL, FALSE, FALSE);

    return TRUE;
  }
  return FALSE;
}

/**********************************************************************//**
  Move or remove a unit due to stack conflicts. This function will try to
  find a random safe tile within a two tile distance of the unit's current
  tile and move the unit there. If no tiles are found, the unit is
  disbanded. If 'verbose' is TRUE, a message is sent to the unit owner
  regarding what happened.
**************************************************************************/
void bounce_unit(struct unit *punit, bool verbose)
{
  struct player *pplayer;
  struct tile *punit_tile;
  struct unit_list *pcargo_units;
  int count = 0;

  /* I assume that there are no topologies that have more than
   * (2d + 1)^2 tiles in the "square" of "radius" d. */
  const int DIST = 2;
  struct tile *tiles[(2 * DIST + 1) * (2 * DIST + 1)];

  if (!punit) {
    return;
  }

  pplayer = unit_owner(punit);
  punit_tile = unit_tile(punit);

  /* First preference, bounce to a tile unit can survive */
  square_iterate(&(wld.map), punit_tile, DIST, ptile) {
    if (count >= ARRAY_SIZE(tiles)) {
      break;
    }

    if (ptile == punit_tile) {
      continue;
    }

    if (can_unit_survive_at_tile(&(wld.map), punit, ptile)
        && !is_non_allied_city_tile(ptile, pplayer)
        && !is_non_allied_unit_tile(ptile, pplayer)) {
      tiles[count++] = ptile;
    }
  } square_iterate_end;
  /* Second preference, bounce to a tile where unit can exist
   * i.e., might lose fuel or helicopter hp */
  if (count == 0) {
    square_iterate(&(wld.map), punit_tile, DIST, ptile) {
      if (count >= ARRAY_SIZE(tiles)) break;
      if (
        ptile == punit_tile) continue;
      if (can_unit_exist_at_tile(&(wld.map), punit, ptile)
          && !is_non_allied_city_tile(ptile, pplayer)
          && !is_non_allied_unit_tile(ptile, pplayer)) {
        tiles[count++] = ptile;
      }
    } square_iterate_end;
  }

  if (count > 0) {
    struct tile *ptile = tiles[fc_rand(count)];

    if (verbose) {
      notify_player(pplayer, ptile, E_UNIT_RELOCATED, ftc_server,
                    /* TRANS: A unit is moved to resolve stack conflicts. */
                    _("Moved your %s %s"),
                    unit_link(punit), UNIT_EMOJI(punit));
    }
    /* TODO: should a unit be able to bounce to a transport like is done
     * below? What if the unit can't legally enter the transport, say
     * because the transport is Unreachable and the unit doesn't have it in
     * its embarks field or because "Transport Embark" isn't enabled? Kept
     * like it was to preserve the old rules for now. -- Sveinung */
    unit_move(punit, ptile, 0, NULL, TRUE, FALSE);
    return;
  }

  /* Didn't find a place to bounce the unit, going to disband it.
   * Try to bounce transported units. */
  if (0 < get_transporter_occupancy(punit)) {
    pcargo_units = unit_transport_cargo(punit);
    unit_list_iterate(pcargo_units, pcargo) {
      bounce_unit(pcargo, verbose);
    } unit_list_iterate_end;
  }

  if (verbose) {
    notify_player(pplayer, punit_tile, E_UNIT_LOST_MISC, ftc_server,
                  /* TRANS: A unit is disbanded to resolve stack conflicts. */
                  _("[`warning`] Disbanded your %s %s"),
                  unit_tile_link(punit), UNIT_EMOJI(punit));
  }
  wipe_unit(punit, ULR_STACK_CONFLICT, NULL);
}


/**********************************************************************//**
  Throw pplayer's units from non allied cities

  If verbose is true, pplayer gets messages about where each units goes.
**************************************************************************/
static void throw_units_from_illegal_cities(struct player *pplayer,
                                            bool verbose)
{
  struct tile *ptile;
  struct city *pcity;
  struct unit *ptrans;
  struct unit_list *pcargo_units;

  /* Unload undesired units from transports, if possible. */
  unit_list_iterate(pplayer->units, punit) {
    ptile = unit_tile(punit);
    pcity = tile_city(ptile);
    if (NULL != pcity
        && !pplayers_allied(city_owner(pcity), pplayer)
        && 0 < get_transporter_occupancy(punit)) {
      pcargo_units = unit_transport_cargo(punit);
      unit_list_iterate(pcargo_units, pcargo) {
        if (!pplayers_allied(unit_owner(pcargo), pplayer)) {
          if (can_unit_exist_at_tile(&(wld.map), pcargo, ptile)) {
            unit_transport_unload_send(pcargo);
          }
        }
      } unit_list_iterate_end;
    }
  } unit_list_iterate_end;

  /* Bounce units except transported ones which will be bounced with their
   * transport. */
  unit_list_iterate_safe(pplayer->units, punit) {
    ptile = unit_tile(punit);
    pcity = tile_city(ptile);
    if (NULL != pcity
        && !pplayers_allied(city_owner(pcity), pplayer)) {
      ptrans = unit_transport_get(punit);
      if (NULL == ptrans || pplayer != unit_owner(ptrans)) {
        bounce_unit(punit, verbose);
      }
    }
  } unit_list_iterate_safe_end;

#ifdef FREECIV_DEBUG
  /* Sanity check. */
  unit_list_iterate(pplayer->units, punit) {
    ptile = unit_tile(punit);
    pcity = tile_city(ptile);
    fc_assert_msg(NULL == pcity
                  || pplayers_allied(city_owner(pcity), pplayer),
                  "Failed to throw %s %d from %s %d (%d, %d)",
                  unit_rule_name(punit),
                  punit->id,
                  city_name_get(pcity),
                  pcity->id,
                  TILE_XY(ptile));
  } unit_list_iterate_end;
#endif /* FREECIV_DEBUG */
}

/**********************************************************************//**
  For each pplayer's unit, check if we stack illegally, if so,
  bounce both players' units. If on ocean tile, bounce everyone but ships
  to avoid drowning. This function assumes that cities are clean.

  If verbose is true, the unit owner gets messages about where each
  units goes.
**************************************************************************/
static void resolve_stack_conflicts(struct player *pplayer,
                                    struct player *aplayer, bool verbose)
{
  unit_list_iterate_safe(pplayer->units, punit) {
    struct tile *ptile = unit_tile(punit);

    if (is_non_allied_unit_tile(ptile, pplayer)) {
      unit_list_iterate_safe(ptile->units, aunit) {
        if (unit_owner(aunit) == pplayer
            || unit_owner(aunit) == aplayer
            || !can_unit_survive_at_tile(&(wld.map), aunit, ptile)) {
          bounce_unit(aunit, verbose);
        }
      } unit_list_iterate_safe_end;
    }
  } unit_list_iterate_safe_end;
}

/**********************************************************************//**
  When in civil war or an alliance breaks there will potentially be units
  from both sides coexisting on the same squares.  This routine resolves
  this by first bouncing off non-allied units from their cities, then by
  bouncing both players' units in now illegal multiowner stacks.  To avoid
  drowning due to removal of transports, we bounce everyone (including
  third parties' units) from ocean tiles.

  If verbose is true, the unit owner gets messages about where each
  units goes.
**************************************************************************/
void resolve_unit_stacks(struct player *pplayer, struct player *aplayer,
                         bool verbose)
{
  throw_units_from_illegal_cities(pplayer, verbose);
  throw_units_from_illegal_cities(aplayer, verbose);

  resolve_stack_conflicts(pplayer, aplayer, verbose);
  resolve_stack_conflicts(aplayer, pplayer, verbose);
}

/**********************************************************************//**
  Returns the list of the units seen by 'pplayer' potentially seen only
  thanks to an alliance with 'aplayer'. The returned pointer is newly
  allocated and should be freed by the caller, using unit_list_destroy().
**************************************************************************/
struct unit_list *get_units_seen_via_ally(const struct player *pplayer,
                                          const struct player *aplayer)
{
  struct unit_list *seen_units = unit_list_new();

  /* Anybody's units inside ally's cities */
  city_list_iterate(aplayer->cities, pcity) {
    unit_list_iterate(city_tile(pcity)->units, punit) {
      if (can_player_see_unit(pplayer, punit)) {
        unit_list_append(seen_units, punit);
      }
    } unit_list_iterate_end;
  } city_list_iterate_end;

  /* Ally's own units inside transports */
  unit_list_iterate(aplayer->units, punit) {
    if (unit_transported(punit) && can_player_see_unit(pplayer, punit)) {
      unit_list_append(seen_units, punit);
    }
  } unit_list_iterate_end;

  /* Make sure the same unit is not added in multiple phases
   * (unit within transport in a city) */
  unit_list_unique(seen_units);

  return seen_units;
}

/**********************************************************************//**
  When two players cancel an alliance, a lot of units that were visible may
  no longer be visible (this includes units in transporters and cities).
  Call this function to inform the clients that these units are no longer
  visible. Pass the list of seen units returned by get_units_seen_via_ally()
  before alliance was broken up.
**************************************************************************/
void remove_allied_visibility(struct player *pplayer, struct player *aplayer,
                              const struct unit_list *seen_units)
{
  unit_list_iterate(seen_units, punit) {
    /* We need to hide units previously seen by the client. */
    if (!can_player_see_unit(pplayer, punit)) {
      unit_goes_out_of_sight(pplayer, punit);
    }
  } unit_list_iterate_end;

  city_list_iterate(aplayer->cities, pcity) {
    /* The player used to know what units were in these cities.  Now that he
     * doesn't, he needs to get a new short city packet updating the
     * occupied status. */
    if (map_is_known_and_seen(pcity->tile, pplayer, V_MAIN)) {
      send_city_info(pplayer, pcity);
    }
  } city_list_iterate_end;
}

/**********************************************************************//**
  Refresh units visibility of 'aplayer' for 'pplayer' after alliance have
  been contracted.
**************************************************************************/
void give_allied_visibility(struct player *pplayer,
                            struct player *aplayer)
{
  unit_list_iterate(aplayer->units, punit) {
    if (can_player_see_unit(pplayer, punit)) {
      send_unit_info(pplayer->connections, punit);
    }
  } unit_list_iterate_end;
}

/**********************************************************************//**
  Is unit being refueled in its current position
**************************************************************************/
bool is_unit_being_refueled(const struct unit *punit)
{
  if (unit_transported(punit)           /* Carrier */
      || tile_city(unit_tile(punit))              /* City    */
      || tile_has_refuel_extra(unit_tile(punit),
                               unit_type_get(punit))) { /* Airbase */
    return TRUE;
  }
  if (unit_has_type_flag(punit, UTYF_COAST)) {
    return is_safe_ocean(&(wld.map), unit_tile(punit));
  }

  return FALSE;
}

/**********************************************************************//**
  Can unit refuel on tile. Considers also carrier capacity on tile.
  FIXME: Rename funnction, as it's not only for air units anymore.
**************************************************************************/
bool is_airunit_refuel_point(const struct tile *ptile,
                             const struct player *pplayer,
                             const struct unit *punit)
{
  const struct unit_class *pclass;

  if (NULL != is_non_allied_unit_tile(ptile, pplayer)) {
    return FALSE;
  }

  if (NULL != is_allied_city_tile(ptile, pplayer)) {
    return TRUE;
  }

  /* Coastal-fueled units refuel on safe ocean tiles */
  if (utype_has_flag(unit_type_get(punit), UTYF_COAST)
      && is_safe_ocean(&(wld.map), ptile)) {
    return TRUE;
  }

  pclass = unit_class_get(punit);
  if (NULL != pclass->cache.refuel_bases) {
    const struct player_tile *plrtile = map_get_player_tile(ptile, pplayer);

    extra_type_list_iterate(pclass->cache.refuel_bases, pextra) {
      if (BV_ISSET(plrtile->extras, extra_index(pextra))) {
        return TRUE;
      }
    } extra_type_list_iterate_end;
  }

  return unit_could_load_at(punit, ptile);
}

/**********************************************************************//**
  Really transforms a single unit to another type.

  This function performs no checks. You should perform the appropriate
  test first to check that the transformation is legal (test_unit_upgrade()
  or test_unit_convert()).

  is_free: Does unit owner need to pay upgrade price.

  Note that this function is strongly tied to unit.c:test_unit_upgrade().
**************************************************************************/
void transform_unit(struct unit *punit, const struct unit_type *to_unit,
                    bool is_free)
{
  struct player *pplayer = unit_owner(punit);
  const struct unit_type *old_type = punit->utype;
  int old_mr = unit_move_rate(punit);
  int old_hp = unit_type_get(punit)->hp;
  int old_fu = utype_fuel(old_type),
      new_fu = utype_fuel(to_unit),
      cur_fu = punit->fuel;
  /* Stash a copy of which players can see the unit prior to upgrade/convert. */
  bv_player unit_was_visible;
  players_iterate(vplayer) {
    BV_SET_VAL(unit_was_visible, player_index(vplayer), can_player_see_unit(vplayer, punit));
  } players_iterate_end;

  if (!is_free) {
    pplayer->economic.gold -=
	unit_upgrade_price(pplayer, unit_type_get(punit), to_unit);
  }

  punit->utype = to_unit;

  /* New type may not have the same veteran system, and we may want to
   * knock some levels off. */
  punit->veteran = MIN(punit->veteran,
                       utype_veteran_system(to_unit)->levels - 1);
  if (is_free) {
    punit->veteran = MAX(punit->veteran
                         - game.server.autoupgrade_veteran_loss, 0);
  } else {
    punit->veteran = MAX(punit->veteran
                         - game.server.upgrade_veteran_loss, 0);
  }

  /* Scale HP and MP, rounding down. Be careful with integer arithmetic,
   * and don't kill the unit. unit_move_rate() is used to take into account
   * global effects like Magellan's Expedition. */
  punit->hp = MAX(punit->hp * unit_type_get(punit)->hp / old_hp, 1);
  if (old_mr == 0) {
    punit->moves_left = unit_move_rate(punit);
  } else {
    punit->moves_left = punit->moves_left * unit_move_rate(punit) / old_mr;
  }
  /* Scale Fuel. Avoid "unfair" death by covering every case in the logic tree:
   * CASE 1. Old type has no fuel? Fill up with 100% fuel.  ==(Don't start with no fuel)
   * CASE 2. New type has more fuel? Add the difference.    ==(Same amount of burnt fuel)
   * CASE 3: New type has less fuel? Keep max.legal amount. ==(Avoid unfair death) */
  punit->fuel
    = (!old_fu) ? new_fu : MAX(cur_fu + (new_fu - old_fu), MIN(cur_fu, new_fu));

  unit_forget_last_activity(punit);

  /* update unit upkeep */
  city_units_upkeep(game_city_by_number(punit->homecity));

  conn_list_do_buffer(pplayer->connections);

  unit_refresh_vision(punit);

  /*\  If punit switched from invisible to visible vlayer or vice versa
  ~*~  (or vradius changed from a vlayer change, then record the change.
  \*/
  players_iterate(vplayer) {
    const bool is_seen  = can_player_see_unit(vplayer, punit);
    const bool was_seen = BV_ISSET(unit_was_visible, player_index(vplayer));
    if (is_seen && !was_seen)
       BV_SET(punit->server.moving->can_see_unit, player_index(vplayer));
    else if (was_seen && !is_seen)
       unit_goes_out_of_sight(vplayer, punit);
  } players_iterate_end;

  CALL_PLR_AI_FUNC(unit_transformed, pplayer, punit, old_type);
  CALL_FUNC_EACH_AI(unit_info, punit);

  send_unit_info(NULL, punit);
  conn_list_do_unbuffer(pplayer->connections);
}

/**********************************************************************//**
  Wrapper of the below
**************************************************************************/
struct unit *create_unit(struct player *pplayer, struct tile *ptile,
			                   const struct unit_type *type, int veteran_level,
                         int homecity_id, int moves_left)
{
  return create_unit_full(pplayer, ptile, type, veteran_level, homecity_id,
                          moves_left, -1, NULL);
}

/**********************************************************************//**
  Set carried goods for unit.
**************************************************************************/
void unit_get_goods(struct unit *punit)
{
  if (punit->homecity != 0) {
    struct city *home = game_city_by_number(punit->homecity);

    if (home != NULL && game.info.goods_selection == GSM_LEAVING) {
      punit->carrying = goods_from_city_to_unit(home, punit);
    }
  }
}

/**********************************************************************//**
  Creates a unit, and set it's initial values, and put it into the right
  lists.
  If moves_left is less than zero, unit will get max moves.
**************************************************************************/
struct unit *create_unit_full(struct player *pplayer, struct tile *ptile,
                              const struct unit_type *type, int veteran_level,
                              int homecity_id, int moves_left, int hp_left,
                              struct unit *ptrans)
{
  struct unit *punit = unit_virtual_create(pplayer, NULL, type, veteran_level);
  struct city *pcity;

  /* Register unit */
  punit->id = identity_number();
  idex_register_unit(&wld, punit);

  fc_assert_ret_val(ptile != NULL, NULL);
  unit_tile_set(punit, ptile);

  pcity = game_city_by_number(homecity_id);
  if (utype_has_flag(type, UTYF_NOHOME)) {
    punit->homecity = 0; /* none */
  } else {
    punit->homecity = homecity_id;
  }

  if (hp_left >= 0) {
    /* Override default full HP */
    punit->hp = hp_left;
  }

  if (moves_left >= 0) {
    /* Override default full MP */
    punit->moves_left = MIN(moves_left, unit_move_rate(punit));
  }

  if (ptrans) {
    /* Set transporter for unit. */
    unit_transport_load_tp_status(punit, ptrans, FALSE);
  } else {
    fc_assert_ret_val(!ptile
                      || can_unit_exist_at_tile(&(wld.map), punit, ptile), NULL);
  }

  /* Assume that if moves_left < 0 then the unit is "fresh",
   * and not moved; else the unit has had something happen
   * to it (eg, bribed) which we treat as equivalent to moved.
   * (Otherwise could pass moved arg too...)  --dwp */
  /* TODO: this is resulting in newly made units with all their
     moves left to be registerd as moved. If we fix this later,
     then remove the hack-patch in city_create_unit(). */
  punit->moved = (moves_left >= 0);

  unit_list_prepend(pplayer->units, punit);
  unit_list_prepend(ptile->units, punit);
  if (pcity && !utype_has_flag(type, UTYF_NOHOME)) {
    fc_assert(city_owner(pcity) == pplayer);
    unit_list_prepend(pcity->units_supported, punit);
    /* Refresh the unit's homecity. */
    city_refresh(pcity);
    send_city_info(pplayer, pcity);
  }

  punit->server.vision = vision_new(pplayer, ptile);
  unit_refresh_vision(punit);

  send_unit_info(NULL, punit);
  maybe_make_contact(ptile, unit_owner(punit));
  wakeup_neighbor_sentries(punit, true);

  /* update unit upkeep */
  city_units_upkeep(game_city_by_number(homecity_id));

  /* The unit may have changed the available tiles in nearby cities. */
  city_map_update_tile_now(ptile);
  sync_cities();

  unit_get_goods(punit);

  CALL_FUNC_EACH_AI(unit_created, punit);
  CALL_PLR_AI_FUNC(unit_got, pplayer, punit);

  return punit;
}

/**********************************************************************//**
  Set the call back to run when the server removes the unit.
**************************************************************************/
void unit_set_removal_callback(struct unit *punit,
                               void (*callback)(struct unit *punit))
{
  /* Tried to overwrite another call back. If this assertion is triggered
   * in a case where two call back are needed it may be time to support
   * more than one unit removal call back at a time. */
  fc_assert_ret(punit->server.removal_callback == NULL);

  punit->server.removal_callback = callback;
}

/**********************************************************************//**
  Remove the call back so nothing runs when the server removes the unit.
**************************************************************************/
void unit_unset_removal_callback(struct unit *punit)
{
  punit->server.removal_callback = NULL;
}

/**********************************************************************//**
  We remove the unit and see if it's disappearance has affected the homecity
  and the city it was in.
**************************************************************************/
static void server_remove_unit_full(struct unit *punit, bool transported,
                                    enum unit_loss_reason reason)
{
  struct packet_unit_remove packet;
  struct tile *ptile = unit_tile(punit);
  struct city *pcity = tile_city(ptile);
  struct city *phomecity = game_city_by_number(punit->homecity);
  struct unit *ptrans;
  struct player *pplayer = unit_owner(punit);

  /* The unit is doomed. */
  punit->server.dying = TRUE;

#ifdef FREECIV_DEBUG
  unit_list_iterate(ptile->units, pcargo) {
    fc_assert(unit_transport_get(pcargo) != punit);
  } unit_list_iterate_end;
#endif /* FREECIV_DEBUG */

  CALL_PLR_AI_FUNC(unit_lost, pplayer, punit);
  CALL_FUNC_EACH_AI(unit_destroyed, punit);

  /* Save transporter for updating below. */
  ptrans = unit_transport_get(punit);
  /* Unload unit. */
  unit_transport_unload(punit);

  /* Since settlers plot in new cities in the minimap before they
     are built, so that no two settlers head towards the same city
     spot, we need to ensure this reservation is cleared should
     the settler disappear on the way. */
  adv_unit_new_task(punit, AUT_NONE, NULL);

  /* Clear the vision before sending unit remove. Else, we might duplicate
   * the PACKET_UNIT_REMOVE if we lose vision of the unit tile. */
  vision_clear_sight(punit->server.vision);
  vision_free(punit->server.vision);
  punit->server.vision = NULL;

  /* Clear a unit wait if present. */
  if (punit->server.wait) {
    unit_wait_list_erase(server.unit_waits, punit->server.wait);
  }

  packet.unit_id = punit->id;
  /* Send to onlookers. */
  players_iterate(aplayer) {
    if (can_player_see_unit_at(aplayer, punit, unit_tile(punit),
                               transported)) {
      lsend_packet_unit_remove(aplayer->connections, &packet);
    }
  } players_iterate_end;
  /* Send to global observers. */
  conn_list_iterate(game.est_connections, pconn) {
    if (conn_is_global_observer(pconn)) {
      send_packet_unit_remove(pconn, &packet);
    }
  } conn_list_iterate_end;

  if (punit->server.moving != NULL) {
    /* Do not care of this unit for running moves. */
    punit->server.moving->punit = NULL;
  }

  if (punit->server.removal_callback != NULL) {
    /* Run the unit removal call back. */
    punit->server.removal_callback(punit);
  }

  /* check if this unit had UTYF_GAMELOSS flag */
  if (unit_has_type_flag(punit, UTYF_GAMELOSS) && unit_owner(punit)->is_alive) {
    notify_conn(game.est_connections, ptile, E_UNIT_LOST_MISC, ftc_server,
                _("[`boom`] Unable to defend %s %s, %s has lost the game."),
                unit_link(punit), UNIT_EMOJI(punit),
                player_name(pplayer));
    notify_player(pplayer, ptile, E_GAME_END, ftc_server,
                  _("[`warning`] Losing %s %s meant losing the game! "
                  "Be more careful next time!"),
                  unit_link(punit), UNIT_EMOJI(punit));
    player_status_add(unit_owner(punit), PSTATUS_DYING);
  }

  script_server_signal_emit("unit_lost", punit, unit_owner(punit),
                            unit_loss_reason_name(reason));

  script_server_remove_exported_object(punit);
  game_remove_unit(&wld, punit);
  punit = NULL;

  if (NULL != ptrans) {
    /* Update the occupy info. */
    send_unit_info(NULL, ptrans);
  }

  /* This unit may have blocked tiles of adjacent cities. Update them. */
  city_map_update_tile_now(ptile);
  sync_cities();

  if (phomecity) {
    city_refresh(phomecity);
    send_city_info(city_owner(phomecity), phomecity);
  }

  if (pcity && pcity != phomecity) {
    city_refresh(pcity);
    send_city_info(city_owner(pcity), pcity);
  }

  if (pcity && unit_list_size(ptile->units) == 0) {
    /* The last unit in the city was killed: update the occupied flag. */
    send_city_info(NULL, pcity);
  }
}

/**********************************************************************//**
  We remove the unit and see if it's disappearance has affected the homecity
  and the city it was in.
**************************************************************************/
static void server_remove_unit(struct unit *punit,
                               enum unit_loss_reason reason)
{
  server_remove_unit_full(punit, unit_transported(punit), reason);
}

/**********************************************************************//**
  Handle units destroyed when their transport is destroyed
**************************************************************************/
static void unit_lost_with_transport(const struct player *pplayer,
                                     struct unit *pcargo,
                                     const struct unit_type *ptransport,
                                     struct player *killer)
{
  notify_player(pplayer, unit_tile(pcargo), E_UNIT_LOST_MISC, ftc_server,
                _("[`warning`] %s %s lost when %s [`%s`] was lost."),
                unit_tile_link(pcargo), UNIT_EMOJI(pcargo),
                utype_name_translation(ptransport),
                utype_name_translation(ptransport) );
  /* Unit is not transported any more at this point, but it has jumped
   * off the transport and drowns outside. So it must be removed from
   * all clients.
   * However, we don't know if given client has received ANY updates
   * about the swimming unit, and we can't remove it if it's not there
   * in the first place -> we send it once here just to be sure it's
   * there. */
  send_unit_info(NULL, pcargo);
  wipe_unit_full(pcargo, FALSE, ULR_TRANSPORT_LOST, killer);
}

/**********************************************************************//**
  Returns true if generally, a pcargo unit would die if its transport died
  on the current tile pcargo occupies. NOTE: Even if this function returns
  "generally" true, unit might not ACTUALLY die: e.g, there may be another
  transport on the tile which might save the unit by taking it as cargo.
  This function was created as a generalized nexus for this game logic.
  It will eventually handle all the more complex rules of whether cargo
  units are lost by the destruction of their transporting unit.
**************************************************************************/
static bool unit_dies_when_transport_dies(struct unit *pcargo)
{
  struct tile *ptile = unit_tile(pcargo);

  /* Reduce processing, handle simplest case first. */
  if (!can_unit_exist_at_tile(&(wld.map), pcargo, ptile)) {
    return true; /* doomed */
  }

  /* "Missile" user-UCF is a RUUCF. See unittype.h */
  if (uclass_has_user_unit_class_flag_named(
             unit_class_get(pcargo), "Missile")) {

    /* Missiles on transports in cities don't die. */
    if (tile_city(ptile)) return false; /* saved */

    /* Missiles in native bases don't die. */
    const struct unit_type *ptype = unit_type_get(pcargo);
    extra_type_by_cause_iterate(EC_BASE, pextra) {
      if (tile_has_extra(ptile, pextra)
          && is_native_extra_to_utype(pextra, ptype)) {
        return false; /*saved*/
      }
    } extra_type_by_cause_iterate_end;

    /* Missile is on a transport out in the open seas or country. If its
     * transport is lost, the missile is lost! Fixes lots of cases like, e.g.,
     * sinking a ship with missiles on it, leaving the missiles floating in
     * the air because they were native to all terrain types. */
    return true; /* doomed */
  }

  return false; /* saved */
}

/**********************************************************************//**
  Remove the unit, and passengers if it is a carrying any. Remove the
  _minimum_ number, eg there could be another boat on the square.
**************************************************************************/
static void wipe_unit_full(struct unit *punit, bool transported,
                           enum unit_loss_reason reason,
                           struct player *killer)
{
  //struct tile *ptile = unit_tile(punit);
  struct player *pplayer = unit_owner(punit);
  const struct unit_type *putype_save = unit_type_get(punit); /* for notify messages */
  struct unit_list *helpless = unit_list_new();
  struct unit_list *imperiled = unit_list_new();
  struct unit_list *unsaved = unit_list_new();
  struct unit *ptrans = unit_transport_get(punit);
  struct city *pexclcity;

  /* The unit is doomed. */
  punit->server.dying = TRUE;

  /* If a unit is being lost due to loss of its city, ensure that we don't
   * try to teleport any of its cargo to that city (which may not yet
   * have changed hands or disappeared). (It is assumed that the unit's
   * home city is always the one that is being lost/transferred/etc.) */
  if (reason == ULR_CITY_LOST) {
    pexclcity = unit_home(punit);
  } else {
    pexclcity = NULL;
  }

  /* Remove unit itself from its transport */
  if (ptrans != NULL) {
    unit_transport_unload(punit);
    send_unit_info(NULL, ptrans);
  }

  /* First pull all units off of the transporter. */
  if (get_transporter_occupancy(punit) > 0) {
    /* Use iterate_safe as unloaded units will be removed from the list
     * while iterating. */
    unit_list_iterate_safe(unit_transport_cargo(punit), pcargo) {
      bool healthy = FALSE;

      /* Handle and assemble three classes of cargo:
         1. Units who cannot deboard:
              * put in the helpless list
         2. Units who can (theoretically) deboard but can't survive on tile:
              * put in the imperiled list
         3. Units who can (theoretically) deboard:
              * mark as healthy for deboard or "disembark-to-same-tile" */
      if (!can_unit_unload(pcargo, punit)) {
        /* !can_unit_unload = (a) has NO theoretic ability to
         * deboard AND (b) is not in a city or native base */
        unit_list_prepend(helpless, pcargo);
      } else {   /* can_unit_unload == true
                  * unit has theoretic ability to deboard OR
                  * is in a city or native base: */
        if (unit_dies_when_transport_dies(pcargo)) {
          /* unit can (theoretically) deboard
           * but can't survive on the tile: imperiled */
          unit_list_prepend(imperiled, pcargo);
        } else {
        /* These units can theoretically deboard
           (no actionenabler check!) but get arbitrarily
           declared as saved anyway(!), then dumped on the
           survivable tile where they are. */
          healthy = TRUE;
        }
      }

      if (healthy) {
        /* "Healthy" units are units who can theoretically deboard
           (no actionenabler check), and are on a survivable
           tile. Hard-coded legacy rules just dumped them on their
           current tile with no move_cost and left it at that.

           >> This created an exploit where all units can deboard from
           ships with full mp if ships do a "sacrificial disbanding".
           Voilà, Howitzers transported down the river in a Trireme
           then attacking with full moves, like Marines!

           The fix, below, is that we must charge cargo units the
           proper "exit fee" for offloading from the destroyed ship! */

        /* DEBUG notify_player(unit_owner(pcargo), ptile, E_UNIT_RELOCATED, ftc_server,
                    _("[`anger`] %s is considered a healthy unit."),
                    unit_link(pcargo)); */

        // Try deboard:
        if (is_action_enabled_unit_on_unit(ACTION_TRANSPORT_DEBOARD,
                                          pcargo, punit)) {
          /* DEBUG notify_player(unit_owner(pcargo), ptile, E_UNIT_RELOCATED, ftc_server,
                        _("[`anger`] %s can legally deboard and will try to."),
                        unit_link(pcargo)); */

          unit_do_action(unit_owner(pcargo), pcargo->id, punit->id,
                          0, "", ACTION_TRANSPORT_DEBOARD);
        }
        // Try unload:
        else if (is_action_enabled_unit_on_unit(ACTION_TRANSPORT_UNLOAD,
                                            punit, pcargo)) {
            /* DEBUG notify_player(unit_owner(pcargo), ptile, E_UNIT_RELOCATED, ftc_server,
                          _("[`anger`] %s can legally be unloaded and will try to."),
                          unit_link(pcargo)); */

            unit_do_action(unit_owner(punit), punit->id, pcargo->id,
                            0, "", ACTION_TRANSPORT_UNLOAD);
        }
        // Illegal deboard/unload is treated as "disembark-to-same-tile". It loses all mp:
        else {
          /* notify_player(unit_owner(pcargo), ptile, E_UNIT_RELOCATED, ftc_server,
              _("[`anger`] %s couldn't legally deboard/disembark. Force moves=0 and unloading..."),
              unit_link(pcargo)); */

            pcargo->moves_left = 0;
        }

        if (unit_transported(pcargo)) {
          /* DEBUG notify_player(unit_owner(pcargo), ptile, E_UNIT_RELOCATED, ftc_server,
              _("[`anger`] %s which should no longer be passenger, still is. Force moves=0 and unloading..."),
              unit_link(pcargo)); */

          pcargo->moves_left = 0;
          unit_transport_unload(pcargo);
        }
        /* DEBUG else {
          notify_player(unit_owner(pcargo), ptile, E_UNIT_RELOCATED, ftc_server,
              _("[`anger`] %s succeeded at being offloaded by above action."),
              unit_link(pcargo));
        } */
      }
      // not healthy:
      else {
        /* Could use unit_transport_unload_send here, but that would
        * call send_unit_info for the transporter unnecessarily.
        * Note that this means that unit might to get seen briefly
        * by clients other than owners, for example as a result of
        * update of homecity common to this cargo and some other
        * destroyed unit. */
        unit_transport_unload(pcargo);
      }
      if (pcargo->activity == ACTIVITY_SENTRY) {
        /* Activate sentried units - like planes on a disbanded carrier.
         * Note this will activate ground units even if they just change
         * transporter. */
        set_unit_activity(pcargo, ACTIVITY_IDLE);
      }
      send_unit_info(NULL, pcargo);

    } unit_list_iterate_safe_end;
  }

  /* Now remove the unit. */
  server_remove_unit_full(punit, transported, reason);

  switch (reason) {
  case ULR_KILLED:
  case ULR_EXECUTED:
  case ULR_SDI:
  case ULR_NUKE:
  case ULR_BRIBED:
  case ULR_CAPTURED:
  case ULR_CAUGHT:
  case ULR_ELIMINATED:
  case ULR_TRANSPORT_LOST:
    if (killer != NULL) {
      killer->score.units_killed++;
    }
    pplayer->score.units_lost++;
    break;
  case ULR_BARB_UNLEASH:
  case ULR_CITY_LOST:
  case ULR_STARVED:
  case ULR_NONNATIVE_TERR:
  case ULR_ARMISTICE:
  case ULR_HP_LOSS:
  case ULR_FUEL:
  case ULR_STACK_CONFLICT:
  case ULR_SOLD:
    pplayer->score.units_lost++;
    break;
  case ULR_RETIRED:
  case ULR_DISBANDED:
  case ULR_USED:
  case ULR_EDITOR:
  case ULR_PLAYER_DIED:
  case ULR_DETONATED:
  case ULR_MISSILE:
    break;
  }

  /* First, sort out helpless cargo. */
  if (unit_list_size(helpless) > 0) {
    struct unit_list *remaining = unit_list_new();

    /* Grant priority to gameloss units and units with the EvacuateFirst
     * unit type flag. */
    unit_list_iterate_safe(helpless, pcargo) {
      if (unit_has_type_flag(pcargo, UTYF_EVAC_FIRST)
          || unit_has_type_flag(pcargo, UTYF_GAMELOSS)) {
        if (!try_to_save_unit(pcargo, putype_save, TRUE,
                              unit_has_type_flag(pcargo,
                                                 UTYF_EVAC_FIRST),
                              pexclcity)) {
          unit_list_prepend(unsaved, pcargo);
        }
      } else {
        unit_list_prepend(remaining, pcargo);
      }
    } unit_list_iterate_safe_end;

    /* Handle non-priority units. */
    unit_list_iterate_safe(remaining, pcargo) {
      if (!try_to_save_unit(pcargo, putype_save, TRUE, FALSE, pexclcity)) {
        unit_list_prepend(unsaved, pcargo);
      }
    } unit_list_iterate_safe_end;

    unit_list_destroy(remaining);
  }
  unit_list_destroy(helpless);

  /* Then, save any imperiled cargo. */
  if (unit_list_size(imperiled) > 0) {
    struct unit_list *remaining = unit_list_new();

    /* Grant priority to gameloss units and units with the EvacuateFirst
     * unit type flag. */
    unit_list_iterate_safe(imperiled, pcargo) {
      if (unit_has_type_flag(pcargo, UTYF_EVAC_FIRST)
          || unit_has_type_flag(pcargo, UTYF_GAMELOSS)) {
        if (!try_to_save_unit(pcargo, putype_save, FALSE,
                              unit_has_type_flag(pcargo,
                                                 UTYF_EVAC_FIRST),
                              pexclcity)) {
          unit_list_prepend(unsaved, pcargo);
        }
      } else {
        unit_list_prepend(remaining, pcargo);
      }
    } unit_list_iterate_safe_end;

    /* Handle non-priority units. */
    unit_list_iterate_safe(remaining, pcargo) {
      if (!try_to_save_unit(pcargo, putype_save, FALSE, FALSE, pexclcity)) {
        unit_list_prepend(unsaved, pcargo);
      }
    } unit_list_iterate_safe_end;

    unit_list_destroy(remaining);
  }
  unit_list_destroy(imperiled);

  /* Finally, kill off the unsaved units. */
  if (unit_list_size(unsaved) > 0) {
    unit_list_iterate_safe(unsaved, dying_unit) {
      unit_lost_with_transport(pplayer, dying_unit, putype_save, killer);
    } unit_list_iterate_safe_end;
  }
  unit_list_destroy(unsaved);
}

/**********************************************************************//**
  Remove the unit, and passengers if it is a carrying any. Remove the
  _minimum_ number, eg there could be another boat on the square.
**************************************************************************/
void wipe_unit(struct unit *punit, enum unit_loss_reason reason,
               struct player *killer)
{
  wipe_unit_full(punit, unit_transported(punit), reason, killer);
}

/**********************************************************************//**
  Determine if it is possible to save a given unit, and if so, save them.
  'pexclcity' is a city to avoid teleporting to, if 'teleporting' is set.
  Note that despite being saved from drowning, teleporting the units to
  "safety" may have killed them in the end.
**************************************************************************/
static bool try_to_save_unit(struct unit *punit, const struct unit_type *pttype,
                             bool helpless, bool teleporting,
                             const struct city *pexclcity)
{
  struct tile *ptile = unit_tile(punit);
  struct player *pplayer = unit_owner(punit);
  struct unit *ptransport = transporter_for_unit(punit);

  /* Helpless units cannot board a transport in their current state. */
  if (!helpless
      && ptransport != NULL) {
    unit_transport_load_tp_status(punit, ptransport, FALSE);
    send_unit_info(NULL, punit);
    return TRUE;
  } else {
    /* Only units that cannot find transport are considered for teleport. */
    if (teleporting) {
      struct city *pcity = find_closest_city(ptile, pexclcity,
                                             unit_owner(punit),
                                             FALSE, FALSE, FALSE, TRUE, FALSE,
                                             utype_class(pttype));
      if (pcity != NULL) {
        char tplink[MAX_LEN_LINK]; /* In case unit dies when teleported */

        sz_strlcpy(tplink, unit_link(punit));

        if (teleport_unit_to_city(punit, pcity, 0, FALSE)) {
          notify_player(pplayer, ptile, E_UNIT_RELOCATED, ftc_server,
                        _("[`anger`] %s escaped the destruction of %s, and fled to %s."),
                        tplink,
                        utype_name_translation(pttype),
                        city_link(pcity));
          return TRUE;
        }
      }
    }
  }
  /* The unit could not use transport on the tile, and could not teleport. */
  return FALSE;
}

/**********************************************************************//**
  We don't really change owner of the unit, but create completely new
  unit as its copy. The new pointer to 'punit' is returned.
**************************************************************************/
struct unit *unit_change_owner(struct unit *punit, struct player *pplayer,
                               int homecity, enum unit_loss_reason reason)
{
  struct unit *gained_unit;

  fc_assert(!utype_player_already_has_this_unique(pplayer,
                                                  unit_type_get(punit)));

  /* Convert the unit to your cause. Fog is lifted in the create algorithm. */
  gained_unit = create_unit_full(pplayer, unit_tile(punit),
                                 unit_type_get(punit), punit->veteran,
                                 homecity, punit->moves_left,
                                 punit->hp, NULL);

  /* Owner changes, nationality not. */
  gained_unit->nationality = punit->nationality;

  /* Copy some more unit fields */
  gained_unit->fuel = punit->fuel;
  gained_unit->paradropped = punit->paradropped;
  gained_unit->server.birth_turn = punit->server.birth_turn;

  send_unit_info(NULL, gained_unit);

  /* update unit upkeep in the homecity of the victim */
  if (punit->homecity > 0) {
    /* update unit upkeep */
    city_units_upkeep(game_city_by_number(punit->homecity));
  }
  /* update unit upkeep in the new homecity */
  if (homecity > 0) {
    city_units_upkeep(game_city_by_number(homecity));
  }

  /* Be sure to wipe the converted unit! */
  wipe_unit(punit, reason, NULL);

  return gained_unit;   /* Returns the replacement. */
}

/**********************************************************************//**
  Called when one unit kills another in combat (this function is only
  called in one place).  It handles all side effects including
  notifications and killstack.
**************************************************************************/
void kill_unit(struct unit *pkiller, struct unit *punit, bool vet)
{
  char pkiller_link[MAX_LEN_LINK],
       punit_link[MAX_LEN_LINK],                 // stack defender
       casualty_type_name[MAX_LEN_LINK];         // unit type name for secondary casualties
  struct player *pvictim = unit_owner(punit);
  struct player *pvictor = unit_owner(pkiller);
  struct city *pcity = tile_city(unit_tile(punit));

  int ransom, unitcount = 0;
  bool escaped;
  /* whether CanEscape units flee to adjacent tile (or stay on current): */
  bool escapers_flee = true;
  /* number of secondary casualties to list before abridging to
     "x other units." */
  const int MAX_SECONDARY_CASUALTIES_TO_REPORT = 6;
  const int MAX_KILLED_UNITS_TO_REPORT_TO_ALL_PLAYERS = 128;
  int others = 0;

  sz_strlcpy(pkiller_link, unit_link(pkiller));
  sz_strlcpy(punit_link, unit_tile_link(punit));

  // Make a reference copy for use.
  char punit_emoji[MAX_LEN_LINK], pkiller_emoji[MAX_LEN_LINK];
  sprintf(punit_emoji, "%s", UNIT_EMOJI(punit));
  sprintf(pkiller_emoji, "%s", UNIT_EMOJI(pkiller));

  /* The unit is doomed. */
  punit->server.dying = TRUE;

  // CASE HANDLING: Game Loss Loot unit (e.g., Barbarian Leader)
  if ((game.info.gameloss_style & GAMELOSS_STYLE_LOOT)
      && unit_has_type_flag(punit, UTYF_GAMELOSS)) {
    ransom = fc_rand(1 + pvictim->economic.gold);
    int n;

    /* give map */
    give_distorted_map(pvictim, pvictor, 1, 1, TRUE);

    log_debug("victim has money: %d", pvictim->economic.gold);
    pvictor->economic.gold += ransom;
    pvictim->economic.gold -= ransom;

    n = 1 + fc_rand(3);

    while (n > 0) {
      Tech_type_id ttid = steal_a_tech(pvictor, pvictim, A_UNSET);

      if (ttid == A_NONE) {
        log_debug("Worthless enemy doesn't have more techs to steal.");
        break;
      } else {
        log_debug("Pressed tech %s from captured enemy",
                  research_advance_rule_name(research_get(pvictor), ttid));
        if (!fc_rand(3)) {
          break; /* out of luck */
        }
        n--;
      }
    }

    { /* try to submit some cities */
      int vcsize = city_list_size(pvictim->cities);
      int evcsize = vcsize;
      int conqsize = evcsize;

      if (evcsize < 3) {
        evcsize = 0;
      } else {
        evcsize -=3;
      }
      /* about a quarter on average with high numbers less probable */
      conqsize = fc_rand(fc_rand(evcsize));

      log_debug("conqsize=%d", conqsize);

      if (conqsize > 0) {
        bool palace = game.server.savepalace;
        bool submit = FALSE;

        game.server.savepalace = FALSE; /* moving it around is dumb */

        city_list_iterate_safe(pvictim->cities, scity) {
          /* kindly ask the citizens to submit */
          if (fc_rand(vcsize) < conqsize) {
            submit = TRUE;
          }
          vcsize--;
          if (submit) {
            conqsize--;
            /* Transfer city to the victorious player
             * kill all its units outside of a radius of 7,
             * give verbose messages of every unit transferred,
             * and raze buildings according to raze chance
             * (also removes palace) */
            (void) transfer_city(pvictor, scity, 7, TRUE, TRUE, TRUE,
                                 !is_barbarian(pvictor));
            submit = FALSE;
          }
          if (conqsize <= 0) {
            break;
          }
        } city_list_iterate_safe_end;
        game.server.savepalace = palace;
      }
    }
  } // </end> Game loss loot unit being killed.

  /* BARBARIAN LEADER RANSOM HACK */
  if (is_barbarian(pvictim) && unit_has_type_role(punit, L_BARBARIAN_LEADER)
      && (unit_list_size(unit_tile(punit)->units) == 1)
      && uclass_has_flag(unit_class_get(pkiller), UCF_COLLECT_RANSOM)) {
    /* Occupying units can collect ransom if leader is alone in the tile */
    ransom = (pvictim->economic.gold >= game.server.ransom_gold)
             ? game.server.ransom_gold : pvictim->economic.gold;
    notify_player(pvictor, unit_tile(pkiller), E_UNIT_WIN_ATT, ftc_server,
                  PL_("[`gold`] Barbarian leader%s captured; %d gold ransom paid.",
                      "[`gold`] Barbarian leader%s captured; %d gold ransom paid.",
                      ransom),
                  punit_emoji, ransom);
    pvictor->economic.gold += ransom;
    pvictim->economic.gold -= ransom;
    send_player_info_c(pvictor, NULL);   /* let me see my new gold :-) */
    unitcount = 1;
  } // </end BARBARIAN LEADER RANSOM HACK>

  if (unitcount == 0) {
    unit_list_iterate(unit_tile(punit)->units, vunit) {
      if (pplayers_at_war(pvictor, unit_owner(vunit))
          /* important, previous versions forgot to check reachability here! */
          && is_unit_reachable_at(vunit, pkiller, unit_tile(punit))) {
	      unitcount++;
      }
    } unit_list_iterate_end;
  }

  if (!is_stack_vulnerable(unit_tile(punit)) || unitcount == 1 || unit_has_type_flag(pkiller, UTYF_ONLY_HITS_TARGETS)) {
    notify_player(pvictor, unit_tile(pkiller), E_UNIT_WIN_ATT, ftc_server,
                  /* TRANS: "[`boom`]Your attacking 🏇Horsemen eliminated the Polish Horsemen.🏇" */
                  _("[`boom`]Your attacking %s %s the %s %s."),
                  /*pkiller_emoji,*/ pkiller_link,
                  get_battle_winner_verb(0),
                  nation_adjective_for_player(pvictim),
                  punit_link/*, punit_emoji*/);
    if (vet) {
      notify_unit_experience(pkiller);
    }
    notify_player(pvictim, unit_tile(punit), E_UNIT_LOST_DEF, ftc_server,
                  /* TRANS: "[`warning`]Your Horsemen🏇 lost to an attack by [a] Russian 🏇Horsemen." */
                  _("[`warning`]Your %s %s %s lost to an attack by %s %s %s %s"),
                  (pcity ? city_link(pcity) : ""),
                  punit_link, punit_emoji,
                  is_unit_plural(pkiller) ? "" : indefinite_article_for_word(nation_adjective_for_player(pvictor), false),
                  nation_adjective_for_player(pvictor),
                  pkiller_emoji, pkiller_link);

    wipe_unit(punit, ULR_KILLED, pvictor);
  } else { /* unitcount > 1 */
    int i;
    int num_killed[player_slot_count()];
    int num_escaped[player_slot_count()];
    struct unit *other_killed[player_slot_count()];
    struct unit killed_units[MAX_KILLED_UNITS_TO_REPORT_TO_ALL_PLAYERS];
    int kill_counter = 0;
    struct tile *ptile = unit_tile(punit);

    fc_assert(unitcount > 1);

    /* initialize */
    for (i = 0; i < player_slot_count(); i++) {
      num_killed[i] = 0;
      other_killed[i] = NULL;
      num_escaped[i] = 0;
    }

    /* When a surviving "NoStackDeath" unit occupies the tile, "escapees" don't
     * flee to adjacent tiles, since the stack isn't gone yet. */
    unit_list_iterate(ptile->units, vunit) {
      if (unit_has_type_flag(vunit, UTYF_NOSTACKDEATH) && !vunit->server.dying) {
        escapers_flee = false;
      }
    } unit_list_iterate_end;

    /* count killed units after letting some units (possibly) escape */
    unit_list_iterate(ptile->units, vunit) {
      struct player *vplayer = unit_owner(vunit);
      bool nostackdeath = unit_has_type_flag(vunit, UTYF_NOSTACKDEATH);

      if (pplayers_at_war(pvictor, vplayer)
          && is_unit_reachable_at(vunit, pkiller, ptile)) {
        escaped = FALSE;

        if ((nostackdeath && vunit->hp > 0)
             || (unit_has_type_flag(vunit, UTYF_CANESCAPE)
                 && !unit_has_type_flag(pkiller, UTYF_CANKILLESCAPING) // TODO: should be a % chance to kill escaping, not hard-coded 100%
                 && vunit->hp > 0
                 && vunit->moves_left >= pkiller->moves_left)
            ) { /* Unit might survive stack-kill because UTYF_NOSTACKDEATH || UTYF_CANESCAPE: */
          if (nostackdeath) {
            /* UTYF_NOSTACKDEATH units always survive: */
            num_escaped[player_index(vplayer)]++;
            escaped = TRUE;
            unitcount--;
          }
          /* CanEscape is possible. Adjust 50% base odds, based on ruleset effects: */
          else {
            int escape_chance = 50 + get_target_bonus_effects(NULL,
                                          vplayer,
                                          pvictor,
                                          tile_city(unit_tile(vunit)),
                                          NULL,
                                          unit_tile(vunit),
                                          vunit,
                                          unit_type_get(vunit),
                                          NULL,
                                          NULL,
                                          action_by_number(ACTION_ATTACK),
                                          EFT_STACK_ESCAPE_PCT,
                                          V_COUNT);
            // Escape Charm. +1% odds for each move point more the defender has over attacker:
            escape_chance += ((vunit->moves_left - pkiller->moves_left) / SINGLE_MOVE);

            // Roll the dice:
            if (fc_rand(100)<escape_chance) {
              // Successful roll: vunit will escape iff there is legal tile to escape.
              int curr_def_bonus;
              int def_bonus = 0;
              struct tile *dsttile = NULL;
              long move_cost;

              fc_assert(vunit->hp > 0);

              /* Units who successfully escaped ... */
              if (escapers_flee == false) {
                /* stay on the tile because a NoStackDeath is present */
                num_escaped[player_index(vplayer)]++;
                escaped = TRUE;
                unitcount--;
              }
              else {
                /* or, flee to an adjacent tile ... */
                adjc_iterate(&(wld.map), ptile, ptile2) {
                  if (can_exist_at_tile(&(wld.map), vunit->utype, ptile2)
                      && NULL == tile_city(ptile2)) {
                    move_cost = map_move_cost_unit(&(wld.map), vunit, ptile2);
                    if (pkiller->moves_left <= vunit->moves_left - move_cost
                        && (is_allied_unit_tile(ptile2, pvictim)
                            || unit_list_size(ptile2->units)) == 0) {
                      curr_def_bonus = tile_extras_defense_bonus(ptile2,
                                                                vunit->utype);
                      if (def_bonus <= curr_def_bonus) {
                        def_bonus = curr_def_bonus;
                        dsttile = ptile2;
                      }
                    }
                  }
                } adjc_iterate_end;

                if (dsttile != NULL) {
                  /* TODO: Consider if forcing the unit to perform actions that
                  * includes a move, like "Transport Embark", should be done when
                  * a regular move is illegal or rather than a regular move. If
                  * yes: remember to set action_requester to ACT_REQ_RULES. */
                  move_cost = map_move_cost_unit(&(wld.map), vunit, dsttile);
                  /* FIXME: Shouldn't unit_move_handling() be used here? This is
                  * the unit escaping by moving itself. It should therefore
                  * respect movement rules. */
                  unit_move(vunit, dsttile, move_cost, NULL, FALSE, FALSE);
                  num_escaped[player_index(vplayer)]++;
                  escaped = TRUE;
                  unitcount--;
                }
              }
            }
          }
        }

        if (!escaped) {
          num_killed[player_index(vplayer)]++;
          /* marked for death */
          vunit->server.dying = TRUE;

          if (vunit != punit) {
            other_killed[player_index(vplayer)] = vunit;
            other_killed[player_index(pvictor)] = vunit;
            if (kill_counter < MAX_KILLED_UNITS_TO_REPORT_TO_ALL_PLAYERS) {
              killed_units[kill_counter++] = *vunit;
            }
          }
        }
      }
    } unit_list_iterate_end;

    // Inform victorious attacker of multiple killed units:
    // ...
    // Too many secondary casualties to list: give abridged report.
    if (unitcount-1 > MAX_SECONDARY_CASUALTIES_TO_REPORT
        || kill_counter > MAX_KILLED_UNITS_TO_REPORT_TO_ALL_PLAYERS) {
      notify_player(pvictor, unit_tile(pkiller), E_UNIT_WIN_ATT, ftc_server,
          // won't ever be singular, but kept in case we revert to simpler message:
          /* TRANS: "[`boom`]Your attacking 🏇Horsemen eliminated the Finnish Horsemen🏇 and 10 other units!" */
                    PL_("[`boom`]Your attacking %s %s the %s %s "
                        "and <b>%d</b> other unit!", // This wouldn't happen unless MAX reported casualties is set to 0.
                        "[`boom`]Your attacking %s %s the %s %s "
                        "and <b>%d</b> other units!", unitcount - 1),
                    /*pkiller_emoji,*/ pkiller_link,
                    get_battle_winner_verb(kill_counter),
                    nation_adjective_for_player(pvictim),
                    punit_link, /*punit_emoji,*/
                    unitcount - 1);
    }
    // List up to {MAX_SECONDARY_CASUALTIES_TO_REPORT} other units killed on the tile:
    else if (unitcount-1 <= MAX_SECONDARY_CASUALTIES_TO_REPORT
             && kill_counter <= MAX_KILLED_UNITS_TO_REPORT_TO_ALL_PLAYERS) {
        char dead_units_str[1024];
        char killed_unit_str[512];

        memset(dead_units_str, '\0', sizeof(dead_units_str));
        // Make a string out of all the secondary casualty unit types and nationalities.
        for (int k = 0; k < kill_counter; k++) {
          // Don't show primary stack defender as secondary casualty
          if (killed_units[k].id != punit->id) {
            // Concatenate the result string for secondary casualties
            sz_strlcpy(casualty_type_name, unit_name_translation(&killed_units[k]));
            sprintf(killed_unit_str, " [`boom`]%s %s %s", nation_adjective_for_player(unit_owner(&killed_units[k])),
                    // deverbosify longer lists. >3 secondary casualties just become nation+unit_emoji:
                    (kill_counter<4 ? casualty_type_name : ""),
                    UNIT_EMOJI(&killed_units[k]));
            strcat(dead_units_str, killed_unit_str);
            if (k<kill_counter-1) { // not the last unit in list: penultimate list item or before
              strcat(dead_units_str, (k==kill_counter-2 ? ", and" : ","));
            }
          }
        }
        // Send final report.
        if (unitcount-1 == 1) {
          notify_player(pvictor, unit_tile(pkiller), E_UNIT_WIN_ATT, ftc_server,
          /* TRANS "[`boom`]Your attacking 🏇Horsemen massacred the Chinese Horsemen🏇 and the [`boom`]North Korean Horsemen🏇."" */
                _("[`boom`]Your attacking %s %s the %s %s %s and the %s"),
                /*(pkiller_emoji,*/ pkiller_link,
                get_battle_winner_verb(1),
                nation_adjective_for_player(pvictim),
                punit_link, punit_emoji,
                dead_units_str);
        } else {
          // Need to cut it up into shorter packets, send two messages.
          notify_player(pvictor, unit_tile(pkiller), E_UNIT_WIN_ATT, ftc_server,
          /* TRANS "[`boom`]Your attacking 🏇Horsemen massacred the Chinese Horsemen🏇 and the [`boom`]North Korean Horsemen🏇."" */
                _("[`boom`]Your attacking %s %s the %s %s %s and <b>%d</b> other units:"),
                /*(pkiller_emoji,*/ pkiller_link,
                get_battle_winner_verb(kill_counter),
                nation_adjective_for_player(pvictim),
                punit_link, punit_emoji,
                unitcount-1);
          notify_player(pvictor, unit_tile(pkiller), E_UNIT_WIN_ATT, ftc_server,
                        _("%s."), dead_units_str);
        }
    } // </end> Inform attacking victor of multiple unit stack deaths.

    if (vet) {
      notify_unit_experience(pkiller);
    }

    /* Inform the victim-owners: this only tells about owned units that were killed,
     * not units from other players. Also, if there are more than MAX_SECONDARY_CASUALTIES_TO_REPORT
     * secondary casualties, players only get a number, not what they all were. */
     // ...
    // Iterate every player in the game to see if they lost one or more units...
    for (i = 0; i < player_slot_count(); i++) {

      // Case handling for each player who lost exactly one unit in the stack:
      if (num_killed[i] == 1) {
        // Player owns the lost stack defender unit
        if (i == player_index(pvictim)) {
          fc_assert(other_killed[i] == NULL);
          notify_player(player_by_number(i), ptile,
                        E_UNIT_LOST_DEF, ftc_server,
                        /* TRANS: "Horsemen🏇 lost to an attack by [a] Polish 🏇Horsemen." */
                        _("[`warning`]%s %s %s lost to an attack by %s %s %s %s"),
                        (pcity ? city_link(pcity) : ""),
                        punit_link, punit_emoji,
                        is_unit_plural(pkiller) ? "" : indefinite_article_for_word(nation_adjective_for_player(pvictor), false),
                        nation_adjective_for_player(pvictor),
                        pkiller_emoji, pkiller_link);
        }
        /* Player's unit was a single secondary casualty in a stack whose stack defender
           belonged to another player: */
        else {
          fc_assert(other_killed[i] != punit);
          notify_player(player_by_number(i), ptile,
                        E_UNIT_LOST_DEF, ftc_server,
                        /* TRANS: "Horsemen🏇 lost when [a] Polish 🏇Horsemen attacked the Latvian Horsemen🏇". */
                        _("[`warning`]%s %s %s lost when %s %s %s %s attacked the %s %s."),
                        (pcity ? city_link(pcity) : ""),
                        unit_link(other_killed[i]), UNIT_EMOJI(other_killed[i]),
                        is_unit_plural(pkiller) ? "" : indefinite_article_for_word(nation_adjective_for_player(pvictor), false),
                        nation_adjective_for_player(pvictor),
                        pkiller_emoji, pkiller_link,
                        nation_adjective_for_player(pvictim),
                        punit_link/*, punit_emoji*/);
        }
      }
      // CASE HANDLING FOR EACH PLAYER WHO LOST MORE THAN ONE UNIT:
      else if (num_killed[i] > 1) {
        // REPORT for SAME PLAYER as the primary stack defender
        if (i == player_index(pvictim)) {
          others = num_killed[i] - 1;
          /* Used to have two separate blocks for whether you had one or more than one secondary casualty:
             This block is no longer necessary but kept around for reference history
          if (others == 1) {  // 2 units lost, meaning one secondary casualty to list
            notify_player(player_by_number(i), ptile,
                          E_UNIT_LOST_DEF, ftc_server,
                          // TRANS: "Musketeers (and Cannon) lost to an
                          // attack from the Polish Destroyer."
                          _("[`warning`]%s (and %s) were lost to %s %s %s."),
                          punit_link,
                          unit_link(other_killed[i]),
                          indefinite_article_for_word(nation_adjective_for_player(pvictor), false),
                          nation_adjective_for_player(pvictor),
                          pkiller_link);
          }  */

          // CASE HANDLING: primary stack defender had too many secondary casualties to list individually, OR,
          // the total number of all player units killed was so high that we gave up recording them all
          if (num_killed[i]-1 > MAX_SECONDARY_CASUALTIES_TO_REPORT // "if player's secondary casualties is more than max allowed to report on, or...
              || kill_counter > MAX_KILLED_UNITS_TO_REPORT_TO_ALL_PLAYERS) {  // ...too many total units were killed to make invidual reports"
              // Use the old abridged message: unit and x other units lost.
              notify_player(player_by_number(i), ptile,
                        E_UNIT_LOST_DEF, ftc_server,
                        // TRANS: "Horsemen🏇 and 3 other units lost to an attack from [a] Polish 🏇Horsemen."
                        PL_("[`warning`]%s %s %s and %d other unit lost to "
                            "%s %s %s %s.",
                            "[`warning`]%s %s %s and %d other units lost to "
                            "%s %s %s %s.", others),
                        (pcity ? city_link(pcity) : ""),
                        punit_link, punit_emoji,
                        others,
                        is_unit_plural(pkiller) ? "" : indefinite_article_for_word(nation_adjective_for_player(pvictor), false),
                        nation_adjective_for_player(pvictor),
                        pkiller_emoji, pkiller_link);
          }
          // CASE HANDLING: Owner's secondary casualties are fewer than the max allowed to enumerate: report every unit lost.
          else if (num_killed[i]-1 <= MAX_SECONDARY_CASUALTIES_TO_REPORT
                   && kill_counter <= MAX_KILLED_UNITS_TO_REPORT_TO_ALL_PLAYERS) {
            char dead_units_str[1024];
            char killed_unit_str[512];
            char plural_string[32];
            others = num_killed[i]-1;

            plural_string[0] = 0;
            memset(dead_units_str, '\0', sizeof(dead_units_str));
            int my_killed_count = 0; // used for punctuation by adding "," and ", and" into the string, based on index
            for (int k = 0; k < kill_counter; k++) {
               /* 1. Don't show primary stack defender as secondary casualty
                  2. Only show casualties belonging to this player */
              if (unit_owner(&killed_units[k])==player_by_number(i) && killed_units[k].id != punit->id) {
                my_killed_count++;
                // Concatenate the result string for secondary casualties
                sz_strlcpy(casualty_type_name, unit_name_translation(&killed_units[k]));
                sprintf(killed_unit_str, " ◽%s %s", casualty_type_name, UNIT_EMOJI(&killed_units[k]));
                strcat(dead_units_str, killed_unit_str);
                if (my_killed_count < others) {
                  strcat(dead_units_str, ",");
                }
                if (my_killed_count == others-1) {
                  strcat(dead_units_str, " and");
                }
              }
            }
            if (num_killed[i]-1 > 1) {
              sprintf(plural_string, "<b>%d</b>", num_killed[i]-1);
            }
            /* if 2 units were killed then we don't need to break up two message packets */
            if (num_killed[i]-1 == 1) {
              notify_player(player_by_number(i), unit_tile(pkiller), E_UNIT_LOST_DEF, ftc_server,
                    // TRANS: "Horsemen🏇 and Horsemen🏇 lost to [a] Polish Horsemen🏇."
                    "[`warning`]%s %s %s and %s lost to %s %s %s %s.",  // last %s is null for singular situations
                    (pcity ? city_link(pcity) : ""),
                    punit_link, punit_emoji,
                    dead_units_str,
                    is_unit_plural(pkiller) ? "" : indefinite_article_for_word(nation_adjective_for_player(pvictor), false),
                    nation_adjective_for_player(pvictor),
                    pkiller_emoji, pkiller_link);
            } else {
            /* otherwise, we need to break into two messages so we don't overflow packet length */
              notify_player(player_by_number(i), unit_tile(pkiller), E_UNIT_LOST_DEF, ftc_server,
                    /* TRANS: "[a] Viking 🏇 Horsemen killed our London Horsemen🏇 and 2 other units:  */
                    _("[`warning`]%s %s %s %s killed our %s %s %s and %s other units:"),
                    is_unit_plural(pkiller) ? "" : indefinite_article_for_word(nation_adjective_for_player(pvictor), true),
                    nation_adjective_for_player(pvictor),
                    pkiller_emoji, pkiller_link,
                    (pcity ? city_link(pcity) : ""),
                    punit_link, punit_emoji,
                    plural_string);
              notify_player(player_by_number(i), unit_tile(pkiller), E_UNIT_LOST_DEF, ftc_server,
                    /*   Horsemen🏇, and Horsemen🏇." */
                    _("%s"), dead_units_str);
            }
          }
        } // </end> case handling for casualty report for owner of the killed stack defender unit

        // Player had secondary casualties but was NOT THE STACK DEFENDER:
        else {
          bool too_many_casualties = (num_killed[i] > MAX_SECONDARY_CASUALTIES_TO_REPORT
                   || kill_counter > MAX_KILLED_UNITS_TO_REPORT_TO_ALL_PLAYERS);
          bool incoming_list = !too_many_casualties;

          /* In the case of not being the stack defender, we ALWAYS get a report of #n unit(s) lost
             when the Attacker killed the [allied] stack defender. If the number of casualties is
             too long to list, we stop there; otherwise we insert a colon at the end of that string
             to prompt the later notification which lists the casualties: */
          notify_player(player_by_number(i), ptile,
                  E_UNIT_LOST_DEF, ftc_server,
                  /* TRANS: "2 units lost when [an] Italian 🏇Horsemen attacked [a] German Horsemen🏇:" */
                  PL_("[`warning`] %d %s unit lost when %s %s %s %s attacked %s %s %s%s",
                      "[`warning`] %d %s units lost when %s %s %s %s attacked %s %s %s%s", num_killed[i]),
                  num_killed[i],
                  (pcity ? city_link(pcity) : ""),
                  is_unit_plural(pkiller) ? "" : indefinite_article_for_word(nation_adjective_for_player(pvictor), false),
                  nation_adjective_for_player(pvictor),
                  pkiller_emoji, pkiller_link,
                  is_unit_plural(punit) ? "" : indefinite_article_for_word(nation_adjective_for_player(pvictim), false),
                  nation_adjective_for_player(pvictim),
                  punit_link,
                  (incoming_list ? ":" : "."));

            /* Player's secondary casualties not more than MAX_SECONDARY_CASUALTIES_TO_REPORT,
               so we report them: */
            if (!too_many_casualties) {
              char dead_units_str[1024];
              char killed_unit_str[512];

              memset(dead_units_str, '\0', sizeof(dead_units_str));
              for (int k = 0; k < kill_counter; k++) {
                /* Only show casualties belonging to this player */
                if (unit_owner(&killed_units[k])==player_by_number(i)) {
                  // Concatenate the result string for secondary casualties
                  sz_strlcpy(casualty_type_name, unit_name_translation(&killed_units[k]));
                  sprintf(killed_unit_str, " ◽%s %s", casualty_type_name, UNIT_EMOJI(&killed_units[k]));
                  strcat(dead_units_str, killed_unit_str);
                }
              }
              //if (num_killed[i]-1 > 0) sprintf(plural_string, "<b>%d</b>", num_killed[i]);
              notify_player(player_by_number(i), ptile, E_UNIT_LOST_DEF, ftc_server,
                    /* TRANS: "Horsemen🏇, Horsemen🏇, and Horsemen🏇"  */
                    _("%s %s."),
                    (pcity ? city_link(pcity) : ""),
                    dead_units_str);
            }
        } // </end> case handling for player with secondary casualties who did not own the stack defender.
      } // </end> case handling for each player who lost more than one unit
    } // </end> report to every player who lost a unit

    /* Inform the owners of their units who escaped. */
    for (i = 0; i < player_slot_count(); ++i) {
      if (num_escaped[i] > 0) {
        // TODO: could list the units who escaped if less than
        // MAX_SECONDARY_CASUALTIES_TO_REPORT (same logic as above)
        notify_player(player_by_number(i), unit_tile(punit),
                      E_UNIT_ESCAPED, ftc_server,
                      /* TRANS: "2 units escaped from attack by a Swiss Battleship." ;~) */
                      PL_("[`running`] %d unit wasn't killed by the %s %s",
                          "[`running`] %d units weren't killed by the %s %s",
                          num_escaped[i]),
                      num_escaped[i],
                      //is_unit_plural(pkiller) ? "" : indefinite_article_for_word(nation_adjective_for_player(pvictor), false),
                      nation_adjective_for_player(pkiller->nationality),
                      pkiller_link);
      }
    }

    /* remove the units - note the logic of which units actually die
     * must be mimiced exactly in at least one place up above. */
    punit = NULL; /* wiped during following iteration so unsafe to use */

    unit_list_iterate_safe(ptile->units, punit2) {
      if (punit2->server.dying
          && pplayers_at_war(pvictor, unit_owner(punit2))
	        && is_unit_reachable_at(punit2, pkiller, ptile)) {
        wipe_unit(punit2, ULR_KILLED, pvictor);
      } else punit2->server.dying = FALSE; /* shouldn't happen */
    } unit_list_iterate_safe_end;
  }
}

/**********************************************************************//**
  Package a unit_info packet.  This packet contains basically all
  information about a unit.
**************************************************************************/
void package_unit(struct unit *punit, struct packet_unit_info *packet)
{
  packet->id = punit->id;
  packet->owner = player_number(unit_owner(punit));
  packet->nationality = player_number(unit_nationality(punit));
  packet->tile = tile_index(unit_tile(punit));
  packet->facing = punit->facing;
  packet->homecity = punit->homecity;
  output_type_iterate(o) {
    packet->upkeep[o] = punit->upkeep[o];
  } output_type_iterate_end;
  packet->veteran = punit->veteran;
  packet->type = utype_number(unit_type_get(punit));
  packet->movesleft = punit->moves_left;
  packet->hp = punit->hp;
  packet->activity = punit->activity;
  packet->activity_count = punit->activity_count;

  if (punit->activity_target != NULL) {
    packet->activity_tgt = extra_index(punit->activity_target);
  } else {
    packet->activity_tgt = EXTRA_NONE;
  }

  packet->changed_from = punit->changed_from;
  packet->changed_from_count = punit->changed_from_count;

  if (punit->changed_from_target != NULL) {
    packet->changed_from_tgt = extra_index(punit->changed_from_target);
  } else {
    packet->changed_from_tgt = EXTRA_NONE;
  }

  packet->ai = punit->ai_controlled;
  packet->fuel = punit->fuel;
  packet->goto_tile = (NULL != punit->goto_tile
                       ? tile_index(punit->goto_tile) : -1);
  packet->paradropped = punit->paradropped;
  packet->done_moving = punit->done_moving;
  packet->stay        = punit->stay;
  if (!unit_transported(punit)) {
    packet->transported = FALSE;
    packet->transported_by = 0;
  } else {
    packet->transported = TRUE;
    packet->transported_by = unit_transport_get(punit)->id;
  }
  if (punit->carrying != NULL) {
    packet->carrying = goods_index(punit->carrying);
  } else {
    packet->carrying = -1;
  }
  packet->occupied = (get_transporter_occupancy(punit) > 0);
  packet->battlegroup = punit->battlegroup;
  packet->has_orders = punit->has_orders;
  if (punit->has_orders) {
    packet->orders_length = punit->orders.length;
    packet->orders_index = punit->orders.index;
    packet->orders_repeat = punit->orders.repeat;
    packet->orders_vigilant = punit->orders.vigilant;
    memcpy(packet->orders, punit->orders.list,
           punit->orders.length * sizeof(struct unit_order));
  } else {
    packet->orders_length = packet->orders_index = 0;
    packet->orders_repeat = packet->orders_vigilant = FALSE;
    /* No need to initialize array. */
  }

  packet->action_decision_want = punit->action_decision_want;
  packet->action_decision_tile = (punit->action_decision_tile
                                  ? tile_index(punit->action_decision_tile)
                                  : IDENTITY_NUMBER_ZERO);
}

/**********************************************************************//**
  Package a short_unit_info packet.  This contains a limited amount of
  information about the unit, and is sent to players who shouldn't know
  everything (like the unit's owner's enemies).
**************************************************************************/
void package_short_unit(struct unit *punit,
			struct packet_unit_short_info *packet,
                        enum unit_info_use packet_use, int info_city_id)
{
  packet->packet_use = packet_use;
  packet->info_city_id = info_city_id;

  packet->id = punit->id;
  packet->owner = player_number(unit_owner(punit));
  packet->tile = tile_index(unit_tile(punit));
  packet->facing = punit->facing;
  packet->veteran = punit->veteran;
  packet->type = utype_number(unit_type_get(punit));
  packet->hp = punit->hp;
  packet->occupied = (get_transporter_occupancy(punit) > 0);
  if (punit->activity == ACTIVITY_EXPLORE
      || punit->activity == ACTIVITY_GOTO) {
    packet->activity = ACTIVITY_IDLE;
  } else {
    packet->activity = punit->activity;
  }

  if (punit->activity_target == NULL) {
    packet->activity_tgt = EXTRA_NONE;
  } else {
    packet->activity_tgt = extra_index(punit->activity_target);
  }

  /* Transported_by information is sent to the client even for units that
   * aren't fully known.  Note that for non-allied players, any transported
   * unit can't be seen at all.  For allied players we have to know if
   * transporters have room in them so that we can load units properly. */
  if (!unit_transported(punit)) {
    packet->transported = FALSE;
    packet->transported_by = 0;
  } else {
    packet->transported = TRUE;
    packet->transported_by = unit_transport_get(punit)->id;
  }
}

/**********************************************************************//**
  Handle situation where unit goes out of player sight.
**************************************************************************/
void unit_goes_out_of_sight(struct player *pplayer, struct unit *punit)
{
  dlsend_packet_unit_remove(pplayer->connections, punit->id);
  if (punit->server.moving != NULL) {
    /* Update status of 'pplayer' vision for 'punit'. */
    BV_CLR(punit->server.moving->can_see_unit, player_index(pplayer));
  }
}

/**********************************************************************//**
  Send the unit to the players who need the info.
  dest = NULL means all connections (game.est_connections)
**************************************************************************/
void send_unit_info(struct conn_list *dest, struct unit *punit)
{
  const struct player *powner;
  struct packet_unit_info info;
  struct packet_unit_short_info sinfo;
  struct unit_move_data *pdata;

  if (dest == NULL) {
    dest = game.est_connections;
  }

  //CHECK_UNIT(punit);
  // Segfault hunting
  if (!punit
     || !unit_type_get(punit)
     || !unit_owner(punit)
     || player_by_number(player_index(unit_owner(punit)))
            != unit_owner(punit)
     || !game_unit_by_number(punit->id)) {

    log_error("send_unit_info attempted on non-existent unit or player");
    return;
  }

  powner = unit_owner(punit);
  package_unit(punit, &info);
  package_short_unit(punit, &sinfo, UNIT_INFO_IDENTITY, 0);
  pdata = punit->server.moving;

  conn_list_iterate(dest, pconn) {
    struct player *pplayer = conn_get_player(pconn);

    /* Be careful to consider all cases where pplayer is NULL... */
    if (pplayer == NULL) {
      if (pconn->observer) {
        send_packet_unit_info(pconn, &info);
      }
    } else if (pplayer == powner) {
      send_packet_unit_info(pconn, &info);
      if (pdata != NULL) {
        BV_SET(pdata->can_see_unit, player_index(pplayer));
      }
    } else if (can_player_see_unit(pplayer, punit)) {
      send_packet_unit_short_info(pconn, &sinfo, FALSE);
      if (pdata != NULL) {
        BV_SET(pdata->can_see_unit, player_index(pplayer));
      }
    }
  } conn_list_iterate_end;
}

/**********************************************************************//**
  For each specified connections, send information about all the units
  known to that player/conn.
**************************************************************************/
void send_all_known_units(struct conn_list *dest)
{
  conn_list_do_buffer(dest);
  conn_list_iterate(dest, pconn) {
    struct player *pplayer = pconn->playing;

    if (NULL == pplayer && !pconn->observer) {
      continue;
    }

    players_iterate(unitowner) {
      unit_list_iterate(unitowner->units, punit) {
        send_unit_info(dest, punit);
      } unit_list_iterate_end;
    } players_iterate_end;
  }
  conn_list_iterate_end;
  conn_list_do_unbuffer(dest);
  flush_packets();
}

/**********************************************************************//**
  Possibly put fallout on a nuked tile.
**************************************************************************/
static void maybe_do_fallout(struct tile *ptile, int pct_chance) {
  /* In legacy freeciv, a standard nuke has a 50% chance of doing fallout
     on 9 tiles. Now we call the ground_zero twice, which is 10 calls total.
     Balance the odds for the amount of generated fallout to be roughly same.
     50% * 9 = x * 10. x = 45%. (Although we could make this an EFT, it's
     probably not worth the "cost" of inflating the effects list.)
  */
  if (fc_rand(100) < pct_chance) {
    struct extra_type *pextra = rand_extra_for_tile(ptile, EC_FALLOUT, FALSE);

    if (pextra != NULL && !tile_has_extra(ptile, pextra)) {
      tile_add_extra(ptile, pextra);
      update_tile_knowledge(ptile);
    }
  }
}
/**********************************************************************//**
  Nuke a tile: 1) remove or damage a percentage of units on the tile,
  2) reduce the size of the city on the tile, 3) send odds to
  maybe_do_fallout() for adding some fallout, then notify the client
  about the changes.

  'base_survival_chance' - a modifier for the percent of citizens
  and units to kill, that was determined from the effects assigned to
  the (now wiped) nuclear unit. Base value gets adjusted herein.

  'ground_zero' - whether the tile nuked is ground zero of the explosion.

  'is_fusion' - lets us know if calling function will totally annihilate
                the city so that we don't need to reduce population here.
**************************************************************************/
static void do_nuke_tile(struct player *pplayer, struct tile *ptile,
                         int base_survival_chance, bool ground_zero,
                         bool is_fusion)
{
  struct city *pcity = NULL;
  int nuke_flag_id = get_user_flag_id_by_name("Nuclear");
  int survival_chance = 0;  // adjusted ver. of base_survival_chance
  int pop_loss;

  bool protected = is_tile_nuke_proof(ptile);
  if (protected) {
    unit_list_iterate_safe(ptile->units, punit) {
      notify_player(unit_owner(punit), ptile, E_UNIT_LOST_MISC, ftc_server,
                    _("[`nuclearexplosion`] Your tile was unaffected by the %s nuclear blast."),
                    pplayer == unit_owner(punit)
                    ? _("self-induced")
                    : nation_adjective_for_player(pplayer));
      break; /* only one unit per tile triggers this message */
    } unit_list_iterate_safe_end;
    return;  /* protected tile: avoid all further nuke action below */
  }

  pcity = tile_city(ptile);

//---NUKE UNITS on the tile. Result is killed, damaged, or unharmed. ---------//
  unit_list_iterate_safe(ptile->units, punit) {
    bool defender_is_nuke = (nuke_flag_id < 0)
                          ? FALSE
                          : unit_has_type_flag(punit, nuke_flag_id);

    /* ruleset specified modifier to defender, to survive the nuke: */
    int counter_eft = 0;
    /* For simplicity, EFT_NUKE_SURVIVAL_PCT aggregates both defenders and
     * attackers with a single effect. For defending nuke units, don't count
     * their EFT meant as an offensive bonus, as a penalty when they are a
     * defender. Just the opposite, Nuke units are sheltered carefully
     * underground to provide Mutually Assured Destruction deterrence */
    if (!defender_is_nuke) {
      counter_eft = get_target_bonus_effects(
                          NULL,                       // effect_list *plist
                          unit_owner(punit),          // target player
                          pplayer,                    // other player
                          pcity,                      // target city
                          NULL,                       // target building
                          ptile,                      // target tile
                          punit,                      // target unit
                          unit_type_get(punit),       // target unittype
                          NULL,                       // target output
                          NULL,                       // target specialist
                          NULL,                       // target action
                          EFT_NUKE_SURVIVAL_PCT,
                          V_COUNT);
    } else {
      counter_eft = 10;  // Give a M.A.D. boost of +10
    }

    /* final chance = EFT_ATTACKER (base_survival_chance)
                      + nuke_defender_survival_chance_pct (from ruleset)
                      + EFT_DEFENDER (counter_eft)                   */
    survival_chance = base_survival_chance
                    + (pcity ? game.info.nuke_defender_survival_chance_pct : 0)
                    + counter_eft;
    // Opt-in for user unit type flag "Nuclear" to receive the M.A.D. bonus.
    if (unit_has_user_flag_named(punit, "Nuclear")) {
      survival_chance *= 2;
    }
    survival_chance = CLIP(0, survival_chance, 100);

    /* DEBUG */
    notify_player(unit_owner(punit), ptile, E_BEGINNER_HELP, ftc_server,
                  _("Chance for %s to survive is %d+%d+%d == %d"),
                  unit_link(punit),
                  base_survival_chance,
                  (pcity ? game.info.nuke_defender_survival_chance_pct : 0),
                  counter_eft,
                  survival_chance);

    /* KILL UNITS */
    if (survival_chance <= fc_rand(100)) {
      notify_player(unit_owner(punit), ptile, E_UNIT_LOST_MISC, ftc_server,
                    _("[`reddiamond`] Your %s %s %s nuked by %s."),
                    unit_tile_link(punit), UNIT_EMOJI(punit),
                    (is_unit_plural(punit) ? "were" : "was"),
                    pplayer == unit_owner(punit)
                    ? _("yourself")
                    : nation_plural_for_player(pplayer));
      if (unit_owner(punit) != pplayer && !pcity) {      // Can't see what happened inside a city.
        notify_player(pplayer, ptile, E_NUKE, ftc_server,
                      _("[`headstone`] The %s %s %s %s nuked."),
                      nation_adjective_for_player(unit_owner(punit)),
                      unit_tile_link(punit), UNIT_EMOJI(punit),
                      (is_unit_plural(punit) ? "were" : "was"));
      }
      wipe_unit(punit, ULR_NUKE, pplayer);
    }
    /* INJURE UNITS */
    else {
      int max_hp_loss = punit->hp;

      /* Chance that a unit in a city survives totally unscathed! */
      if (pcity && fc_rand(100) < game.info.nuke_defender_survival_chance_pct) {
        max_hp_loss = 0; // e.g., if n_d_s_c_p is 25%, then 25% survivors are unscathed.
        //continue; Commented out so that we get a survival message.
      }

      int hp_lost = fc_rand(max_hp_loss);
      punit->hp -= hp_lost;

      if (punit->hp < 1) {
        hp_lost -= (1 - punit->hp);
        punit->hp = 1; // Insurance: avoid rounding error
      }

      if (hp_lost) {
        notify_player(unit_owner(punit), ptile, E_UNIT_WIN_DEF, ftc_server,
                      _("[`yellowdiamond`] Your %s %s survived the nuke by %s, losing %d hp."),
                      unit_tile_link(punit), UNIT_EMOJI(punit),
                      (pplayer == unit_owner(punit)
                      ? _("yourself")
                      : nation_plural_for_player(pplayer)),
                      hp_lost);
        // Injured units need to refresh clients' hp info:
        send_unit_info(NULL, punit);
      } else {
          notify_player(unit_owner(punit), ptile, E_UNIT_ESCAPED, ftc_server,
                        _("[`greendiamond`] Your %s %s survived the nuke by %s."),
                        unit_tile_link(punit), UNIT_EMOJI(punit),
                        (pplayer == unit_owner(punit)
                        ? _("yourself")
                        : nation_plural_for_player(pplayer)));
      }
    }
  } unit_list_iterate_safe_end;

//---NUKE CITIZENS in a city: reduce city population----------------------------------------//
//---Thermonuclear fusion annihilation at Ground Zero is handled by caller, not here--------//
  if (pcity && !(is_fusion && ground_zero)) {

    notify_player(city_owner(pcity), ptile, E_CITY_NUKED, ftc_server,
                  _("[`nuclearexplosion`] %s was nuked by %s."),
                  city_link(pcity),
                  pplayer == city_owner(pcity)
                  ? _("yourself")
                  : nation_plural_for_player(pplayer));

    if (city_owner(pcity) != pplayer) {
      notify_player(pplayer, ptile, E_CITY_NUKED, ftc_server,
                    _("[`nuclearexplosion`] You nuked %s."),
                    city_link(pcity));
    }

    // Reduce city population.

    // Destroy size one cities:
    if (city_size_get(pcity) == 1) {
      int saved_id = pcity->id;

      notify_player(city_owner(pcity), ptile, E_CITY_NUKED, ftc_server,
        _("[`skull`] %s was annihilated by a nuclear detonation."),
          city_link(pcity));

      if (city_owner(pcity) != pplayer) {
        notify_player(pplayer, ptile, E_CITY_NUKED, ftc_server,
        _("[`skull`] %s was annihilated by a nuclear detonation."),
          city_link(pcity));
      }
      script_server_signal_emit("city_destroyed", pcity, city_owner(pcity), pplayer);
      /* We cant't be sure of city existence after running some script */
      if (city_exist(saved_id)) {
        remove_city(pcity);
      }
    }
    // Reduce size by (nuke_pop_loss_pct - base_survival_chance) %
    else {
      int death_pct = CLIP(0, game.info.nuke_pop_loss_pct - base_survival_chance, 100);
      pop_loss = MAX(1, death_pct * city_size_get(pcity) / 100);

      notify_player(pplayer, ptile, E_CITY_NUKED, ftc_server,
                    _("%s loses %d%% of its population. (%d deaths)"),
                    city_link(pcity),
                    death_pct,
                    pop_loss);

      if (city_reduce_size(pcity, pop_loss, pplayer, "nuke")) {
        send_city_info(NULL, pcity);
      }
      update_tile_knowledge(ptile);
    }
  }
  /* Fallout. Increase odds at ground_zero or if fusion explosion */
  maybe_do_fallout(ptile, 45);                    // 45.00% odds
  if (ground_zero) maybe_do_fallout(ptile,45);    // 69.75% odds
  else if (is_fusion) maybe_do_fallout(ptile,32); // 62.50% odds
}

/**********************************************************************//**
  Nuke all the squares in a sqrt(2+extra_radius_sq) area around the center
  of the explosion. High radius is considered fusion explosion with worse
  fallout. 'pplayer' is the player that caused the explosion.
  The nuke has already been spent when we get here, so 'survival_chance'
  was pre-calculated from the effects that do so, and passed in.
**************************************************************************/
void do_nuclear_explosion(struct player *pplayer, struct tile *ptile,
                          int extra_radius_sq, const char *unit_name,
                          int survival_chance)
{
  int max_radius_sq = DEFAULT_DETONATION_RADIUS_SQ + extra_radius_sq;
  bool is_fusion = (max_radius_sq >= FUSION_DETONATION_RADIUS_SQ);
  struct city *pcity = NULL;

  /* DEBUG
  notify_player(pplayer, ptile, E_BEGINNER_HELP, ftc_server,
      _("[`nuclearexplosion`] Began a nuclear explosion with survival chance of %d"),
        survival_chance); */

  circle_dxyr_iterate(&(wld.map), ptile, max_radius_sq, ptile1, dx, dy, dr) {
    bool ground_zero = (ptile==ptile1);
    do_nuke_tile(pplayer, ptile1, survival_chance, ground_zero, is_fusion);
  } circle_dxyr_iterate_end;

  script_server_signal_emit("nuke_exploded", 2, API_TYPE_TILE, ptile,
                            API_TYPE_PLAYER, pplayer);

  // Direct ground-zero hit by Hydrogen-Bomb / Fusion warhead, etc.
  if (is_fusion) {  // H-bomb, etc.
    pcity = tile_city(ptile);
    if (pcity) {
      int saved_id = pcity->id;

      notify_player(city_owner(pcity), ptile, E_CITY_NUKED, ftc_server,
         _("[`skull`] %s was annihilated at Ground Zero of a thermonuclear fusion explosion."),
           city_link(pcity));

      if (city_owner(pcity) != pplayer) {
        notify_player(pplayer, ptile, E_CITY_NUKED, ftc_server,
         _("[`skull`] %s was annihilated at Ground Zero of a thermonuclear fusion explosion."),
           city_link(pcity));
      }
      script_server_signal_emit("city_destroyed", pcity, city_owner(pcity), pplayer);
      /* We cant't be sure of city existence after running some script */
      if (city_exist(saved_id)) {
        remove_city(pcity);
      }
    }
  }
}

/**********************************************************************//**
  Go by airline, if both cities have an airport and neither has been used this
  turn the unit will be transported by it and have its moves set to 0
**************************************************************************/
bool do_airline(struct unit *punit, struct city *pdest_city)
{
  struct city *psrc_city = tile_city(unit_tile(punit));

  notify_player(unit_owner(punit), city_tile(pdest_city),
                E_UNIT_RELOCATED, ftc_server,
                _("%s %s airlifted to %s."),
                UNIT_EMOJI(punit), unit_link(punit),
                city_link(pdest_city));

  /* Set cargo to 1 move left BEFORE doing airlift. This way, send_unit_info()
   * will send updated moves_left. In rulesets with no passive movement, this
   * leaves such units a chance to disembark. In rulesets with passive movement,
   * it leaves 1/60th of a move left, allowing bombs, missiles, allies, etc.,
   * to deboard. */
  unit_cargo_iterate(punit, pcargo) {
    if (pcargo->moves_left > 1) {
      pcargo->moves_left = 1;
    }
  } unit_cargo_iterate_end;

  unit_move(punit, pdest_city->tile, punit->moves_left, NULL,
            /* Can only airlift to allied and domestic cities */
            FALSE, FALSE);

  /* Update airlift fields. */
  if (!(game.info.airlifting_style & AIRLIFTING_UNLIMITED_SRC)) {
    psrc_city->airlift--;
    send_city_info(city_owner(psrc_city), psrc_city);
  }
  if (!(game.info.airlifting_style & AIRLIFTING_UNLIMITED_DEST)) {
    pdest_city->airlift--;
    send_city_info(city_owner(pdest_city), pdest_city);
  }

  return TRUE;
}

/**********************************************************************//**
  Autoexplore with unit.
**************************************************************************/
void do_explore(struct unit *punit)
{
  switch (manage_auto_explorer(punit)) {
   case MR_DEATH:
     /* don't use punit! */
     return;
   case MR_NOT_ALLOWED:
     /* Needed for something else */
     return;
   case MR_OK:
     /* FIXME: manage_auto_explorer() isn't supposed to change the activity,
      * but don't count on this.  See PR#39792.
      */
     if (punit->activity == ACTIVITY_EXPLORE) {
       break;
     }
     /* fallthru */
   default:
     unit_activity_handling(punit, ACTIVITY_IDLE);

     /* FIXME: When the manage_auto_explorer() call changes the activity from
      * EXPLORE to IDLE, in unit_activity_handling() ai.control is left
      * alone.  We reset it here.  See PR#12931. */
     punit->ai_controlled = FALSE;
     break;
  }

  send_unit_info(NULL, punit); /* probably duplicate */
}

/**********************************************************************//**
  Returns whether the drop was made or not. Note that it also returns 1
  in the case where the drop was succesful, but the unit was killed by
  barbarians in a hut.
**************************************************************************/
bool do_paradrop(struct unit *punit, struct tile *ptile,
                 const struct action *paction)
{
  struct player *pplayer = unit_owner(punit);
  struct player *tgt_player = tile_owner(ptile);

  if (map_is_known_and_seen(ptile, pplayer, V_MAIN)) {
    if (!can_unit_exist_at_tile(&(wld.map), punit, ptile)
        && (!game.info.paradrop_to_transport
            || !unit_could_load_at(punit, ptile))) {
      notify_player(pplayer, ptile, E_BAD_COMMAND, ftc_server,
                    _("This unit cannot paradrop into %s."),
                    terrain_name_translation(tile_terrain(ptile)));
      return FALSE;
    }

    if (NULL != is_non_attack_city_tile(ptile, pplayer)) {
      notify_player(pplayer, ptile, E_BAD_COMMAND, ftc_server,
                    _("Cannot attack unless you declare war first."));
      return FALSE;
    }

    unit_list_iterate(ptile->units, pother) {
      if (can_player_see_unit(pplayer, pother)
          && pplayers_non_attack(pplayer, unit_owner(pother))) {
        notify_player(pplayer, ptile, E_BAD_COMMAND, ftc_server,
                      _("Cannot attack unless you declare war first."));
        return FALSE;
      }
    } unit_list_iterate_end;

    if (is_military_unit(punit)
        && !player_can_invade_tile(pplayer, ptile)) {
      notify_player(pplayer, ptile, E_BAD_COMMAND, ftc_server,
                    _("Cannot invade unless you break peace with "
                      "%s first."),
                    player_name(tile_owner(ptile)));
      return FALSE;
    }
  } else {
    /* Only take in account values from player map. */
    const struct player_tile *plrtile = map_get_player_tile(ptile, pplayer);

    if (NULL == plrtile->site
        && !is_native_to_class(unit_class_get(punit), plrtile->terrain,
                               &(plrtile->extras))) {
      notify_player(pplayer, ptile, E_BAD_COMMAND, ftc_server,
                    _("This unit cannot paradrop into %s."),
                    terrain_name_translation(plrtile->terrain));
      return FALSE;
    }

    if (NULL != plrtile->site
        && plrtile->owner != NULL
        && pplayers_non_attack(pplayer, plrtile->owner)) {
      notify_player(pplayer, ptile, E_BAD_COMMAND, ftc_server,
                    _("Cannot attack unless you declare war first."));
      return FALSE;
    }

    if (is_military_unit(punit)
        && NULL != plrtile->owner
        && players_non_invade(pplayer, plrtile->owner)) {
      notify_player(pplayer, ptile, E_BAD_COMMAND, ftc_server,
                    _("Cannot invade unless you break peace with "
                      "%s first."),
                    player_name(plrtile->owner));
      return FALSE;
    }

    /* Safe terrain, really? Not transformed since player last saw it. */
    if (!can_unit_exist_at_tile(&(wld.map), punit, ptile)
        && (!game.info.paradrop_to_transport
            || !unit_could_load_at(punit, ptile))) {
      map_show_circle(pplayer, ptile, unit_type_get(punit)->vision_radius_sq);
      notify_player(pplayer, ptile, E_UNIT_LOST_MISC, ftc_server,
                    _("[`warning`]Your %s %s paradropped into the %s and %s lost."),
                    UNIT_EMOJI(punit), unit_tile_link(punit),
                    terrain_name_translation(tile_terrain(ptile)),
                    (is_unit_plural(punit) ? "were" : "was"));
      pplayer->score.units_lost++;
      server_remove_unit(punit, ULR_NONNATIVE_TERR);
      return TRUE;
    }
  }

  if (is_non_attack_city_tile(ptile, pplayer)
      || is_non_allied_unit_tile(ptile, pplayer)) {
    map_show_circle(pplayer, ptile, unit_type_get(punit)->vision_radius_sq);
    maybe_make_contact(ptile, pplayer);
    notify_player(pplayer, ptile, E_UNIT_LOST_MISC, ftc_server,
                  _("[`warning`]Your %s %s %s killed by enemy units at the "
                    "paradrop destination."),
                    UNIT_EMOJI(punit), unit_tile_link(punit),
                    (is_unit_plural(punit) ? "were" : "was"));
    /* TODO: Should defender score.units_killed get increased too?
     * What if there's units of several allied players? Should the
     * city owner or owner of the first/random unit get the kill? */
    pplayer->score.units_lost++;
    server_remove_unit(punit, ULR_KILLED);
    return TRUE;
  }

  /* All ok */
  punit->paradropped = TRUE;
  if (unit_move(punit, ptile, unit_type_get(punit)->paratroopers_mr_sub,
                NULL, game.info.paradrop_to_transport,
                /* A paradrop into a non allied city results in a city
                 * occupation. */
                /* FIXME: move the following actor requirements to the
                 * ruleset. One alternative is to split "Paradrop Unit".
                 * Another is to use different enablers. */
                (pplayer->ai_common.barbarian_type != ANIMAL_BARBARIAN
                 && uclass_has_flag(unit_class_get(punit),
                                    UCF_CAN_OCCUPY_CITY)
                 && !unit_has_type_flag(punit, UTYF_CIVILIAN)
                 && is_non_allied_city_tile(ptile, pplayer)))) {
    /* Ensure we finished on valid state. */
    fc_assert(can_unit_exist_at_tile(&(wld.map), punit, unit_tile(punit))
              || unit_transported(punit));
  }

  /* May cause an incident */
  action_consequence_success(paction, pplayer, unit_type_get(punit),
                             tgt_player, ptile, tile_link(ptile));

  return TRUE;
}

/**********************************************************************//**
  Give 25 Gold or kill the unit. For H_LIMITEDHUTS
  Return TRUE if unit is alive, and FALSE if it was killed
**************************************************************************/
static bool hut_get_limited(struct unit *punit)
{
  bool ok = TRUE;
  int hut_chance = fc_rand(12);
  struct player *pplayer = unit_owner(punit);
  /* 1 in 12 to get barbarians */
  if (hut_chance != 0) {
    int cred = 25;
    notify_player(pplayer, unit_tile(punit), E_HUT_GOLD, ftc_server,
                  PL_("[`gold`] You found %d gold.",
                      "[`gold`] You found %d gold.", cred), cred);
    pplayer->economic.gold += cred;
  } else if (city_exists_within_max_city_map(unit_tile(punit), TRUE)
             || unit_has_type_flag(punit, UTYF_GAMELOSS)) {
    notify_player(pplayer, unit_tile(punit),
                  E_HUT_BARB_CITY_NEAR, ftc_server,
                  _("An abandoned village is here."));
  } else {
    notify_player(pplayer, unit_tile(punit), E_HUT_BARB_KILLED, ftc_server,
                  _("[`warning`] Your %s %s has been killed by barbarians!"),
                  UNIT_EMOJI(punit), unit_tile_link(punit));
    wipe_unit(punit, ULR_BARB_UNLEASH, NULL);
    ok = FALSE;
  }
  return ok;
}

/**********************************************************************//**
  Due to the effects in the scripted hut behavior can not be predicted,
  unit_enter_hut returns nothing.
**************************************************************************/
static void unit_enter_hut(struct unit *punit)
{
  struct player *pplayer = unit_owner(punit);
  int id = punit->id;
  enum hut_behavior behavior = unit_class_get(punit)->hut_behavior;
  struct tile *ptile = unit_tile(punit);
  bool hut = FALSE;

  if (behavior == HUT_NOTHING) {
    return;
  }

  extra_type_by_rmcause_iterate(ERM_ENTER, pextra) {
    if (tile_has_extra(ptile, pextra)
        && are_reqs_active(pplayer, tile_owner(ptile), NULL, NULL, ptile,
                           NULL, NULL, NULL, NULL, NULL, &pextra->rmreqs,
                           RPT_CERTAIN, V_COUNT)
       ) {
      hut = TRUE;
      /* FIXME: are all enter-removes extras worth counting? */
      pplayer->server.huts++;

      destroy_extra(ptile, pextra);
      update_tile_knowledge(unit_tile(punit));

      /* FIXME: enable different classes
       * to behave differently with different huts */
      if (behavior == HUT_FRIGHTEN) {
        script_server_signal_emit("hut_frighten", punit,
                                  extra_rule_name(pextra));
      } else if (is_ai(pplayer) && has_handicap(pplayer, H_LIMITEDHUTS)) {
        /* AI with H_LIMITEDHUTS only gets 25 gold (or barbs if unlucky) */
        (void) hut_get_limited(punit);
      } else {
        script_server_signal_emit("hut_enter", punit, extra_rule_name(pextra));
      }

      /* We need punit for the callbacks, can't continue if the unit died */
      if (!unit_is_alive(id)) {
        break;
      }
    }
  } extra_type_by_rmcause_iterate_end;

  if (hut) {
    send_player_info_c(pplayer, pplayer->connections); /* eg, gold */
  }
  return;
}

/**********************************************************************//**
  Put the unit onto the transporter, and tell everyone.
**************************************************************************/
void unit_transport_load_send(struct unit *punit, struct unit *ptrans)
{
  bv_player can_see_unit;

  fc_assert_ret(punit != NULL);
  fc_assert_ret(ptrans != NULL);

  BV_CLR_ALL(can_see_unit);
  players_iterate(pplayer) {
    if (can_player_see_unit(pplayer, punit)) {
      BV_SET(can_see_unit, player_index(pplayer));
    }
  } players_iterate_end;

  unit_transport_load(punit, ptrans, FALSE);

  players_iterate(pplayer) {
    if (BV_ISSET(can_see_unit, player_index(pplayer))
        && !can_player_see_unit(pplayer, punit)) {
      unit_goes_out_of_sight(pplayer, punit);
    }
  } players_iterate_end;

  send_unit_info(NULL, punit);
  send_unit_info(NULL, ptrans);
}

/**********************************************************************//**
  Load unit to transport, send transport's loaded status to everyone.
**************************************************************************/
static void unit_transport_load_tp_status(struct unit *punit,
                                          struct unit *ptrans,
                                          bool force)
{
  bool had_cargo;

  fc_assert_ret(punit != NULL);
  fc_assert_ret(ptrans != NULL);

  had_cargo = get_transporter_occupancy(ptrans) > 0;

  unit_transport_load(punit, ptrans, force);

  if (!had_cargo) {
    /* Transport's loaded status changed */
    send_unit_info(NULL, ptrans);
  }
}

/**********************************************************************//**
  Pull the unit off of the transporter, and tell everyone.
**************************************************************************/
void unit_transport_unload_send(struct unit *punit)
{
  struct unit *ptrans;

  fc_assert_ret(punit);

  ptrans = unit_transport_get(punit);

  fc_assert_ret(ptrans);

  unit_transport_unload(punit);

  send_unit_info(NULL, punit);
  send_unit_info(NULL, ptrans);
}

/**********************************************************************//**
  Used when unit_survive_autoattack()'s autoattack_prob_list
  autoattack frees its items.
**************************************************************************/
static void autoattack_prob_free(struct autoattack_prob *prob)
{
  free(prob);
}

/**********************************************************************//**
  This function is passed to autoattack_prob_list_sort() to sort a list of
  units and action probabilities according to their win chance against the
  autoattack target, modified by transportation relationships.

  The reason for making sure that a cargo unit is ahead of its
  transporter(s) is to leave transports out of combat if at all possible.
  (The transport could be destroyed during combat.)
**************************************************************************/
static int compare_units(const struct autoattack_prob *const *p1,
                         const struct autoattack_prob *const *q1)
{
  const struct unit *p1unit = game_unit_by_number((*p1)->unit_id);
  const struct unit *q1unit = game_unit_by_number((*q1)->unit_id);

  /* Sort by transport depth first. This makes sure that no transport
   * attacks before its cargo does -- cargo sorts earlier in the list. */
  {
    const struct unit *p1trans = p1unit, *q1trans = q1unit;

    /* Walk the transport stacks in parallel, so as to bail out as soon as
     * one of them is empty (avoid walking deep stacks more often than
     * necessary). */
    while (p1trans && q1trans) {
      p1trans = unit_transport_get(p1trans);
      q1trans = unit_transport_get(q1trans);
    }
    if (!p1trans && q1trans) {
      /* q1 is at greater depth (perhaps it's p1's cargo). It should sort
       * earlier in the list (p1 > q1). */
      return 1;
    } else if (p1trans && !q1trans) {
      /* p1 is at greater depth, so should sort earlier (p1 < q1). */
      return -1;
    }
    /* else same depth, so move on to checking win chance: */
  }

  /* Put the units with the highest probability of success first. The up
   * side of this is that units with bonuses against the victim attacks
   * before other units. The downside is that strong units can be led
   * away by sacrificial units. */
  return (-1
          /* Assume the worst. */
          * action_prob_cmp_pessimist((*p1)->prob, (*q1)->prob));
}

/**********************************************************************//**
  Returns a permission_code for possibility of p_moving_unit to provoke
  auto-attack from p_adj_unit.  Return codes are:
          AA_NO               auto-attack illegal
          AA_ODDS             auto-attacks if odds legality fulfilled
          AA_ALWAYS           always auto-attacks

  Called only when autoattack_style == AA_ADVANCED
**************************************************************************/
static int can_unit_autoattack_unit(const struct unit *p_adj_unit,
                                    const struct unit *p_moving_unit)
{

/* Autoattack may happen based on which flags attacker and defender have:
                       attacker ⏩
——————————————————————————————————————————————————————————————————————————————————
⬇️defender       ""    AvidAttacker  O1   O2   O3    A1   A2   A3    !if_attacker†
——————————————————————————————————————————————————————————————————————————————————
NonProvoking     N-    N-            N-   N-   N-    N-   N-   N-    N-
""               --    ODDS          --   --   --    --   --   --    N-
Provoking        ODDS  ODDS          ODDS ODDS ODDS  ODDS ODDS ODDS  N-
ProvokingClass1  --    ODDS          ODDS --   --    YES  --   --    N-
ProvokingClass2  --    ODDS          --   ODDS --    --   YES  --    N-
ProvokingClass3  --    ODDS          --   --   ODDS  --   --   YES   N-
——————————————————————————————————————————————————————————————————————————————————
notes:
O1-3 = OddsAttackClass1-3
A1-3 = AlwaysAttackClass1-3
""   = Has no UTYF flags related to autoattack
N-   = AA_NO     = overrides any possible autoattack, will never auto-attack
YES  = AA_ALWAYS = ALWAYS auto-attacks (unless overridden by "N-" or abort_threshold‡)
ODDS = AA_ODDS   = auto-attack if odds are better (unless overridden by N- or YES or or abort_threshold‡)
--   = AA_NO     = no auto-attack (unless overridden by YES or ODDS)

†if_attacker = (from game.ruleset) - means this unit will never autoattack. This
               gets filtered during the construction of the autoattack prob_list

‡abort_threshold is currently hard-coded to 25%. And override-aborts ANY other
condition for an attack including AA_ALWAYS.

SEQUENTIAL FLOW LOGIC for an autoattack candidate to decide whether to attack or not:
  ALL CASES, pre-processing
    🔹NOT ON VIGIL?                             ABORT
    🔹NON-PROVOKING                             ABORT
    🔹ODDS < 25%                                ABORT
  🔻...... if no prior abort has occurred, then .....🔻
    🔹Auto_attack ALWAYS = YES?              💥 ATTACK 💥
  AA_ODDS:
    🔹Attacking their tile is better odds
    than them attacking our tile?          💥 ATTACK 💥 (NOTE abort_threshold<25% pre-fails before this check.)
    🔹Attack anyway odds ≥ 5/6 83⅓% ?      💥 ATTACK 💥

〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰EVOLUTION NOTES:〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰
In future when we program more layers to vigil, abort_threshold of 25% will be
far too low for a player to voluntarily choose low-cost attrition tactics
(e.g., throwing away disbandable foot soldiers, Zealots, etc.). This is because
a 1% chance to win is an expected loss of about 3 attackers, BEFORE the next
attacker has >83% chance to win. This means that several vigil units whose tactical
purpose is to be aggressive cannonfodder, would be disallowed from this tactic by
the 25% abort_threshold. Consequently, in future we'll have alternative
abort_threshold(s) for allowing more tactical commitment decision-trees in the
use of vigil. Could even be interesting to have a user-selected abort_threshold
that's stored in punit->server->abort_threshold, instead of all these extra
ACTIVITY_VIGIL2,3,4, etc. I can envision a statistical study on the exact percentages
required for expected losses of 1, 2, 3, 4, 5, 6 units before next unit gets >50% (83%?)
chance of victory. Then the player when alternate vigil gets a pop-up dialog and
enters 1-6 and that goes in the punit->server->abort_threshold according to the
table, and the activity_icon gets a little 1-6 next to it representing how many
deaths are acceptable before next unit gets its normal 83% odds of an acceptable
vigil. This allows e.g., setting 3 units to Vigil-5 and 1 unit to Vigil-0 to
follow up if the units before were successful in reducing hp to an odds favorable
 value for the last unit! 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰*/

  /* N-, Priority 1: Immediately kick out overriding cases that can never attack: */
  if (p_adj_unit->activity != ACTIVITY_VIGIL) {
    return AA_NO;
  }
  if (!pplayers_at_war(unit_owner(p_adj_unit),
                       unit_owner(p_moving_unit))) {
    return AA_NO;
  }
  /* for performance this is checked only once @ start of unit_survive_autoattack()
  if (unit_has_type_flag(p_moving_unit, UTYF_NONPROVOKING)) return AA_NO; */

  /* YES, Priority 2: cases that always attack override cases that attack based on good odds: */
  if (unit_has_type_flag(p_moving_unit, UTYF_PROVOKINGCLASS1)) {
    if (unit_has_type_flag(p_adj_unit, UTYF_ALWAYSATTACKCLASS1)) {
      return AA_ALWAYS;
    }
  }
  if (unit_has_type_flag(p_moving_unit, UTYF_PROVOKINGCLASS2)) {
    if (unit_has_type_flag(p_adj_unit, UTYF_ALWAYSATTACKCLASS2)) {
      return AA_ALWAYS;
    }
  }
  if (unit_has_type_flag(p_moving_unit, UTYF_PROVOKINGCLASS3)) {
    if (unit_has_type_flag(p_adj_unit, UTYF_ALWAYSATTACKCLASS3)) {
      return AA_ALWAYS;
    }
  }
  /* ODDS, Priority 3: cases that attack if the odds are good */
  if (unit_has_type_flag(p_moving_unit, UTYF_PROVOKING)) return AA_ODDS;
  if (unit_has_type_flag(p_adj_unit, UTYF_AVIDATTACKER)) return AA_ODDS;
  if (unit_has_type_flag(p_moving_unit, UTYF_PROVOKINGCLASS1)) {
    if (unit_has_type_flag(p_adj_unit, UTYF_ODDSATTACKCLASS1)) {
      return AA_ODDS;
    }
  }
  if (unit_has_type_flag(p_moving_unit, UTYF_PROVOKINGCLASS2)) {
    if (unit_has_type_flag(p_adj_unit, UTYF_ODDSATTACKCLASS2)) {
      return AA_ODDS;
    }
  }
  if (unit_has_type_flag(p_moving_unit, UTYF_PROVOKINGCLASS3)) {
    if (unit_has_type_flag(p_adj_unit, UTYF_ODDSATTACKCLASS3)) {
      return AA_ODDS;
    }
  }

/* --, Priority 4: Fulfilled NO criteria for an autoattack */
  return AA_NO;
}

/**********************************************************************//**
  Check if a moving unit survives (potential) enemy autoattacks from
  adjacent units. We assume that any unit that is adjacent to
  p_moving_unit can see it.

  👉🏽 Since this is called for every tile for every movement made by real and
  virtual units in the game, performance is vital. Seek to exit as quickly
  as possible for majority of cases where there will be no autoattack!
**************************************************************************/
static bool unit_survive_autoattack(struct unit *p_moving_unit)
{
#undef AUTOATTACK_DEBUG
// When debugging whether to send messages to mover or autoattacker
#define DEBUG_NOTIFY_MOVER 1
                    #ifdef AUTOATTACK_DEBUG
                        // can't notify attacker yet because we don't know if/who it is.
                        notify_player(unit_owner(p_moving_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                          _("[`ghost`] 1. Begin: %s checked to get autoattacked."), unit_link(p_moving_unit));
                    #endif

  /* FAST EXIT when autoattack OFF or it's a nonprovoking unit: */
  if (!game.server.autoattack
      || unit_has_type_flag(p_moving_unit, UTYF_NONPROVOKING)) {
    return TRUE;
  }

  bool harmless_cargo = false;
  bool harmless_cargo_was_set = false; // Performance: set until/if needed

  /* 1) Keep ID in case of death;
     2) HACK: prevent attack power from dropping to zero during calc: */
  int sanity1 = p_moving_unit->id;
  const struct player *moving_player = unit_owner(p_moving_unit);
  int moves = p_moving_unit->moves_left;
  p_moving_unit->moves_left = MAX(p_moving_unit->moves_left, 1);

  /* PHASE ONE: Construct new list of adjacent autoattacker CANDIDATES.
     A candidate is someone who is able to attack : */
  struct autoattack_prob_list *autoattack = autoattack_prob_list_new_full(autoattack_prob_free);

  /* Check every adjacent tile: */
  adjc_iterate(&(wld.map), unit_tile(p_moving_unit), ptile) {
    /* Add all eligible units on tile to the unified autoattack candidates list: */
    unit_list_iterate(ptile->units, p_adj_unit) {

      /* Dismiss units who can't legally auto-attack */
      int can_attack = true;
      if (game.server.autoattack_style == AA_ADVANCED) {
        can_attack = can_unit_autoattack_unit(p_adj_unit, p_moving_unit);
        if (!can_attack) {
          continue;
        }
      }

      struct autoattack_prob *probability = fc_malloc(sizeof(*probability));
      struct tile *mover_tile = unit_tile(p_moving_unit);

      /* Why is this getting called repeatedly inside this scope on
        a mover_tile that doesn't ever change inside this func?! */
      fc_assert_action(mover_tile, continue);

      probability->prob =
          action_auto_perf_unit_prob(AAPC_UNIT_MOVED_ADJ,
                                     p_adj_unit, moving_player, NULL,
                                     mover_tile, tile_city(mover_tile),
                                     p_moving_unit, NULL);

      probability->can_attack = can_attack;  // Stash for performant re-usability later.

                    #ifdef AUTOATTACK_DEBUG
                      notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_adj_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                          _("[`dice`] %s Legit Prob<sub>min,max</sub>: (%d, %d)"),
                          unit_link(p_adj_unit), probability->prob.min, probability->prob.max );
                    #endif

      if (action_prob_possible(probability->prob)
          && is_unit_reachable_at(p_moving_unit, p_adj_unit, unit_tile(p_moving_unit))) {
          probability->unit_id = p_adj_unit->id;

        // Produced values of prob.min==0 are technically accurate, we ameliorate edge cases where prob.min == 0:
        if (probability->prob.min == 0 && can_attack == AA_ODDS) {
          if (!harmless_cargo_was_set) { // Performance: we avoid all this unless we need to do it!
            harmless_cargo_was_set = true;
            /* Algorithm works MUCH better if it knows when cargo can never defend better than its transport! */
            harmless_cargo = uclass_has_user_unit_class_flag_named(unit_class_get(p_moving_unit), "HarmlessCargo");

                    #ifdef AUTOATTACK_DEBUG
                          if (harmless_cargo)
                              notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_adj_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                                _("[`freight`] moving_unit's harmless cargo set to true."));
                            #endif

          }
          probability->can_bombard = can_unit_bombard(p_adj_unit);  // Stash for later use 😘
          /* Invisible cargo makes prob.min=0, which scares AA_ODDS auto-attackers. But units known to carry NO
             threatening cargo (or for attackers only doing bombard), we [semi-]intelligently override this: */
          if (harmless_cargo   /* 👇🏼 FIXME - Assumes ruleset ALWAYS favors auto-bombard to auto-attacking. A
                                  better way might be "would_unit_bombard(p_adj_unit, p_moving_unit)": 👇🏼  */
              || probability->can_bombard) { // 👈🏼 so cannons can bombard coastal ships if (transport_capacity>0)
            probability->prob.min = probability->prob.max;

                    #ifdef AUTOATTACK_DEBUG
                      notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_adj_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                        _("[`freight`] %s bombard/harmless_cargo Prob<sub>min,max</sub>: (%d, %d)"),
                        unit_link(p_adj_unit), probability->prob.min, probability->prob.max );
                    #endif
          }
        }

        autoattack_prob_list_prepend(autoattack, probability);
      }
      else {
        FC_FREE(probability);
      }
    } unit_list_iterate_end;
  } adjc_iterate_end;

  /* INTERMISSION BETWEEN PHASE ONE AND PHASE TWO.
     NB: THIS IS AN IMPORTANT AREA FOR FUTURE UPGRADES TO AUTO-ATTACK. The &compare_units function makes all
     the difference. The sort order determines the order in which multiple attacks will happen and we know
     that's tactically significant if upgraded Vigil starts implementing layers and ability to set
     "suicidal cannonfodder" to attack above a certain expected number of deaths before attacker is
     expected to be taken out by the 83% threshold of the next attacking unit. Consequently it should be
     some kind of scoring system where a premium unit over 83% isn't afraid to attack... or is it,
     because expected_death_chance x unit_cost might be 0.17 * 160 = 27.2, whereas a 25 shield
     Zealot attacking first renders it as essentially NO chance to lose your 160 shield auto-attacker.
     Score system can be based on avidness to attack (always/cannonfodder mode vs. odds), certainty
     of victory (ofc) which starts rewarding much higher the closer to 100 you get and it does that
     nicely enough by taking (death_chance * unit_cost) as a way to achieve that semi-exponential
     increase in score as one gets closer and closer to 100, nicely eliminating the preferability
     of the cannonfodder units to engage at that point. */
  /* Sort the potential attackers from highest to lowest success probability. */
  if (autoattack_prob_list_size(autoattack) >= 2) {
    /* NB: the count of units is wonderful info for deciding whether to attack, because it lets a
       single unit know if it has expected backup for making a lower-odds attack! */
    autoattack_prob_list_sort(autoattack, &compare_units);
  }

  /* PHASE TWO: Iterate candidates and auto-attack with the ones who qualify final checks: */
  autoattack_prob_list_iterate_safe(autoattack, peprob, p_aa_unit) {
    int will_attack = peprob->can_attack;
    /* AA_ADVANCED has ruleset filters for whether to auto-attack */
    if (game.server.autoattack_style == AA_ADVANCED && will_attack == AA_NO) {
      continue;   // Shouldn't happen because AA_NO is never prepended to list?
    }
    else { /* autoattack_style==AA_DEFAULT: Legacy hard-coded logic */
      if (unit_has_type_flag(p_moving_unit, UTYF_PROVOKING)) {
        will_attack = AA_ALWAYS;
      }
    }

    int sanity2 = p_aa_unit->id;
    struct tile *ptile = unit_tile(p_aa_unit);
    struct unit *p_aa_unit_tile_defender = get_defender(p_moving_unit, ptile);
    double odds_moving_unit_wins, odds_aa_unit_wins;
    double abort_threshold = 0.25;                 /* game.server.autoattack_abort_odds   TODO-should be server setting */
    double attack_anyway_threshold = 0.8333333;    /* game.server.autoattack_always_odds  TODO-should be server setting */
    struct tile *mover_tile = unit_tile(p_moving_unit);

              #ifdef AUTOATTACK_DEBUG
                        notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                          _("[`freight`] Tile defender unit.id is real? (def:%d, tile:%d)"),
                          (p_aa_unit_tile_defender == NULL ? 0 : p_aa_unit_tile_defender->id),
                                (p_aa_unit_tile_defender == NULL ? 0 : ptile->index) );
                      #endif

     // Make a reference copy for use.
    char p_moving_unit_emoji[MAX_LEN_LINK], p_aa_unit_emoji[MAX_LEN_LINK];
    sprintf(p_moving_unit_emoji, "%s", UNIT_EMOJI(p_moving_unit));
    sprintf(p_aa_unit_emoji, "%s", UNIT_EMOJI(p_aa_unit));

    fc_assert(mover_tile);

    if (tile_city(ptile) && unit_list_size(ptile->units) == 1) {
      /* Don't leave city defenseless */
      abort_threshold = 0.90;                      /* game.server.autoattack_lone_city_odds  TODO-should be server setting */
    }

    if (NULL != p_aa_unit_tile_defender) {
      odds_moving_unit_wins = unit_win_chance(p_moving_unit, p_aa_unit_tile_defender);
    } else {
      /*  Apparently the vigil unit has no tile defender so there's a 100% chance
          of the moving unit would win if IT were the attacker, so this makes sense
          and should only motivate it to attack more. But I ask you, when/how would
          this ever happen and what's not reciprocal? When can a tile occupied by a
          vigil unit NOT defend itself(?):
          'p_aa_unit' can attack 'p_moving_unit' but it may be not reciprocal. */
       /* Does it mean that the autoattacker is unreachable because then that should
          odds_moving_unit_wins = 0.0 */
                  #ifdef AUTOATTACK_DEBUG
                                  notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                                    _("%s has no reachable defender on tile, should other moving unit get 0%% or 100%% chance to win if IT were to attack?!"),
                                    unit_link(p_aa_unit) );
                                #endif
      /* old code: moving unit can't attack, QED it got a 100% chance to win the attack? This
         is EXACTLY why we renamed all the vars more specifically in the rewrite of this fun! 😱
      odds_moving_unit_wins = 1.0; 👀 👀 👁️ 👁️ 👁️ 👁️ 👁️ 👁️ 👁️ 👁️ 👁️ 👁️ WATCH ME BLAME ME FIXME TODO WATCH ME !👁️👁️!*/
      odds_moving_unit_wins = 0.0;
    }

    /* Previous attacks may have changed the odds. Recalculate. FUCK this means transporters with harmless cargo again */
                  #ifdef AUTOATTACK_DEBUG
                        notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                          _(":::::: autoattack_prob was: (uid:%d, MIN:%d MAX:%d, can_attack: %d, can_bombard: %d)"),
                            peprob->unit_id,  peprob->prob.min, peprob->prob.max, peprob->can_attack, peprob->can_bombard);
                      #endif

    /* This will RESET carefully calculated overrides about not being scared of harmless_cargo, or to go ahead
       and bombard (because duh, no retaliation, so why worry about mere possibility of 0 odds when max odds
       are extremely likely to be the real odds?) Don't worry though, we saved a copy of what we needed! */
    bool can_bombard = peprob->can_bombard;
    int can_attack = peprob->can_attack;
    peprob->prob =
        action_auto_perf_unit_prob(AAPC_UNIT_MOVED_ADJ,
                                   p_aa_unit, moving_player, NULL,
                                   mover_tile, tile_city(mover_tile),
                                   p_moving_unit, NULL);
                  #ifdef AUTOATTACK_DEBUG
                        notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                          _(":::::: and is now:          (uid:%d, MIN:%d MAX:%d, can_attack: %d, can_bombard: %d)"),
                            peprob->unit_id,  peprob->prob.min, peprob->prob.max, peprob->can_attack, peprob->can_bombard);
                      #endif
    if (harmless_cargo || can_bombard) {
      peprob->can_bombard = true;
      peprob->prob.min = peprob->prob.max; // There we go!
    }
    if (!action_prob_possible(peprob->prob)) {
      /* No longer legal. */
      if (can_attack == AA_ALWAYS && peprob->prob.max > 0) {
        // Don't continue; this is an Always Attacker with legal chance to attack!
      } else {
        continue;
      }
    }

    /* Assume the worst. (i.e., hidden cargo may be ultra-strong defender)*/
    odds_aa_unit_wins = action_prob_to_0_to_1_pessimist(peprob->prob);
  /* For AA_ADVANCED games, handle two special cases:
      I. The Transporter is KNOWN to carry defenseless cargo:

      For example, we wouldn't want a Jet Fighter on vigil to be afraid of a Jet Bomber just because
      it carries bombs. Rather than make a special hard-coded uclass_flag for these cases, just let
      the ruleset-coder make their own custom uclass-flag named "HarmlessCargo", for such cases.
      (This also lets rulesets define whether invisible cargo is never considered a barrier to
      autoattack: simply give all unit-classes the HarmlessCargo flag.)

      II. auto-BOMBARDERS aren't afraid of invisible cargo as long as they're not afraid of
      its transport:

      In AA_ADVANCED rulesets, for now, Bombard is the first (preferred) form of autoattack, due to
      reduced risk of exploitation from autoattack-baiting. In such games, an autoattacker
      who (1) is a bombarder, and (2) experiences a odds_aa_unit_wins of 0.0, is very likely facing a case
      of INVISIBLE CARGO which pessimistically is considered as a "superdefender" with 0 chance
      to win.

      HOWEVER, a Bombard-autoattack (a) usually faces no retaliation (b) in cases where it does,
      the cargo by being transported will rarely qualify to retaliate, (c) in cases where it could,
      will rarely have enough bombard-retaliate combat rounds to result in killing the
      auto-bombarder.

      THUS, for cases where odds_aa_unit_wins came back as 0.0, we _probably_ got a 0.0 because of having
      an _undefined_ win % due to invisible cargo. But we DO know (a,b,c) above to be true. And we DO
      know that a,b,c together represent a higher % chance to win/survive such a bombard-autoattack
      than even the case of normal qualifying autoattacks whose thresholds are usually set between
      80% and 90%. AND we know as devs we want to prevent an exploit where a transporter carrying
      dummy worthless units, can first occupy a tile in order to allow subsequent movers-to-the-tile
      to bypass all autoattacks with 100% success. In addition, for the rare case where
      odds_aa_unit_wins came back as 0.0 not because of invisible cargo, but because the adjacent defender
      itself is Godzilla, we happen to know unit_win_chance(p_aa_unit, p_moving_unit). So if that is a 0.0,
      then we know the odds_aa_unit_wins of 0.0 was created by that and not by invisible enemy cargo.

      In other words, we know everything we need, in order to set a more accurate odds_aa_unit_wins for just
      such a case. */
    if (odds_aa_unit_wins == 0 && game.server.autoattack_style == AA_ADVANCED) {
      if (harmless_cargo || peprob->can_bombard) {

                              #ifdef AUTOATTACK_DEBUG
                                      notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                                                _("[`book`] 1. AutAtk_UNIT %s had %f %% chance"), unit_link(p_aa_unit), odds_aa_unit_wins);
                              #endif
        odds_aa_unit_wins = unit_win_chance(p_aa_unit, get_defender(p_aa_unit, mover_tile));

                              #ifdef AUTOATTACK_DEBUG
                                      notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                                                _("[`arrowup`] 2. AutAtk_UNIT %s upgraded(?) to %f %% chance (hrmlscrg||bmbrd)"), unit_link(p_aa_unit), odds_aa_unit_wins);
                                      struct unit *debug_def = get_defender(p_aa_unit, unit_tile(p_moving_unit));
                                      notify_player(unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_UNIT_ORDERS, ftc_server,
                                                _("[`anger`] ENEMY %s switched 0 odds to (%f), and defender is: %s "),
                                                unit_rule_name(p_aa_unit), odds_aa_unit_wins, debug_def ? unit_rule_name(debug_def) : "NULLPTR");
                              #endif

      }
    }

    /* Do the attack if the conditions for autoattack are fulfilled: */
    if ( (odds_aa_unit_wins > 1.0 - odds_moving_unit_wins || (will_attack == AA_ALWAYS) || odds_aa_unit_wins >= attack_anyway_threshold)
         && odds_aa_unit_wins > abort_threshold) {

                              #ifdef AUTOATTACK_DEBUG
                                      notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_UNIT_ORDERS, ftc_server,
                                              _("AA %s vs %s (%d,%d) EW:%.2f > 1-MW:%.2f && AT> %.2f"),
                                            unit_rule_name(p_aa_unit), unit_rule_name(p_moving_unit),
                                            TILE_XY(unit_tile(p_moving_unit)), odds_aa_unit_wins,
                                            1.0 - odds_moving_unit_wins, abort_threshold);
                              #endif
        notify_player(unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_UNIT_ORDERS, ftc_server,
              _("[`anger`] Your %s %s engaged %s %s %s %s while under vigil."),
              p_aa_unit_emoji, unit_link(p_aa_unit),
              (is_unit_plural(p_moving_unit) ? "" : indefinite_article_for_word(nation_rule_name(nation_of_unit(p_moving_unit)), false)),
              nation_rule_name(nation_of_unit(p_moving_unit)),
              unit_rule_name(p_moving_unit), p_moving_unit_emoji );

        notify_player(moving_player, unit_tile(p_moving_unit), E_UNIT_ORDERS, ftc_server,
              _("[`anger`] Your %s %s %s engaged by %s %s %s %s under vigil."),
              unit_link(p_moving_unit), p_moving_unit_emoji,
              (is_unit_plural(p_moving_unit) ? "were" : "was"),
              (is_unit_plural(p_moving_unit) ? "" : indefinite_article_for_word(nation_rule_name(nation_of_unit(p_aa_unit)), false)),
              nation_rule_name(nation_of_unit(p_aa_unit)),
              p_aa_unit_emoji, unit_rule_name(p_aa_unit) );

                              #ifdef AUTOATTACK_DEBUG
                                        notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                                          _("AA %s -> %s (%d,%d) %.2f > %.2f && > %.2f"),
                                            unit_rule_name(p_aa_unit), unit_rule_name(p_moving_unit),
                                            TILE_XY(unit_tile(p_moving_unit)), odds_aa_unit_wins,
                                            1.0 - odds_moving_unit_wins, abort_threshold);
                              #endif
      /* AA_ADVANCED leaves unit on vigil so it's not baited by a cheap runner: */
      if (game.server.autoattack_style == AA_DEFAULT) {
        unit_activity_handling(p_aa_unit, ACTIVITY_IDLE);
      }
      action_auto_perf_unit_do(AAPC_UNIT_MOVED_ADJ,
                               p_aa_unit, moving_player, NULL,
                               mover_tile, tile_city(mover_tile), p_moving_unit, NULL);
      /* This block of code would optionally obey some EFFECT or other ruleset
         configuration to selectively set some units back to vigil but not
         others. Currently, only AA_DEFAULT sets units back to idle (3 lines up.)

         This should now avoid segfault from unit_activity_handling() on a possibly
         dead unit. If we ever change/add features such that we use this code again,
         it's now more secure because it was edited to:
         (1) Check the unit is still alive
         (2) Not use unit_activity_handling() which does a free_unit_orders:
            a. units can be in a perma-vigil state while having orders
               e.g., an ABM
            b. not open possibility of freeing orders on a dead unit
               even though we did already fix that in (1) .....

      if (game.server.autoattack_style == AA_ADVANCED) {
        if (game_unit_by_number(sanity2)) {
          if (target_bonus_effects || UTYF_PERMA_VIGIL || etc)
            set_unit_activity(p_aa_unit, ACTIVITY_IDLE);
        }
      } */

    } else {
        notify_player(unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_UNIT_ORDERS, ftc_server,
              _("[`anger`] Your %s %s declined engaging %s %s %s %s while under vigil."),
              p_aa_unit_emoji, unit_rule_name(p_aa_unit),
              is_unit_plural(p_moving_unit) ? "" : indefinite_article_for_word(nation_rule_name(nation_of_unit(p_moving_unit)), false),
              nation_rule_name(nation_of_unit(p_moving_unit)),
              unit_link(p_moving_unit), p_moving_unit_emoji );
                            #ifdef AUTOATTACK_DEBUG
                                      notify_player(DEBUG_NOTIFY_MOVER ? moving_player : unit_owner(p_aa_unit), unit_tile(p_moving_unit), E_AI_DEBUG, ftc_server,
                                                    _("!AA %s -> %s (%d,%d) %.2f > %.2f && > %.2f"),
                                                    unit_rule_name(p_aa_unit), unit_rule_name(p_moving_unit),
                                                    TILE_XY(unit_tile(p_moving_unit)), odds_aa_unit_wins,
                                                    1.0 - odds_moving_unit_wins, abort_threshold);
                            #endif
      continue;
    }

    if (game_unit_by_number(sanity2)) {
      send_unit_info(NULL, p_aa_unit);
    }
    if (game_unit_by_number(sanity1)) {
      send_unit_info(NULL, p_moving_unit);
    } else {
      autoattack_prob_list_destroy(autoattack);
      return FALSE; /* moving unit dead */
    }
  } autoattack_prob_list_iterate_safe_end;

  autoattack_prob_list_destroy(autoattack);
  if (game_unit_by_number(sanity1)) {
    /* We could have lost movement in combat */
    p_moving_unit->moves_left = MIN(p_moving_unit->moves_left, moves);
    send_unit_info(NULL, p_moving_unit);
    return TRUE;
  } else {
    return FALSE;
  }
}

/**********************************************************************//**
  Cancel orders for the unit.
**************************************************************************/
static void cancel_orders(struct unit *punit, char *dbg_msg)
{
  free_unit_orders(punit);
  send_unit_info(NULL, punit);
  log_debug("%s", dbg_msg);
}

/**********************************************************************//**
  Will wake up any neighboring enemy sentry units or patrolling
  units. 'departure' indicates a departure from the tile rather
  than arrival at it (used to suppress double-messaging in some cases)
**************************************************************************/
static void wakeup_neighbor_sentries(struct unit *punit, bool departure)
{
  bool longturn = is_longturn();
  bool alone_in_city;
  int stile_x, stile_y;   // tile of waking sentry unit
  int mtile_x, mtile_y;   // tile of moving unit

  // Make a reference copy for use.
  char punit_emoji[MAX_LEN_LINK];
  sprintf(punit_emoji, "%s", UNIT_EMOJI(punit));

  if (NULL != tile_city(unit_tile(punit))) {
    int count = 0;

    unit_list_iterate(unit_tile(punit)->units, aunit) {
      /* Consider only units not transported. */
      if (!unit_transported(aunit)) {
        count++;
      }
    } unit_list_iterate_end;

    alone_in_city = (1 == count);
  } else {
    alone_in_city = FALSE;
  }

  /* There may be sentried units with a sightrange > 3, but we don't
     wake them up if the punit is farther away than 3. */
  int num_wakings[MAX_NUM_PLAYERS] = {0}; // used to limit spam of wake-up messages

  square_iterate(&(wld.map), unit_tile(punit), 3, ptile) {
    int distance_sq = sq_map_distance(unit_tile(punit), ptile);

    /* if the tile has an extra who reports movement; e.g., Buoy, do that first: */
    const struct extra_type *reporting_extra = tile_get_extra_by_flag(ptile, EF_REPORTS);
    if (!departure && reporting_extra) {
      int radius_sq = 0; /* "dumb" extras can see someone on their own tile only */
      if (extra_base_get(reporting_extra)) { /* base extras have a vision radius */
        radius_sq = extra_base_get(reporting_extra)->vision_main_sq;
      }
      if (extra_owner(ptile)
         && radius_sq >= distance_sq
         && can_player_see_unit(extra_owner(ptile), punit)
         && !pplayers_allied(unit_owner(punit), extra_owner(ptile))) {

        if (++num_wakings[player_number(extra_owner(ptile))] <= 1) {
          index_to_map_pos(&stile_x, &stile_y, tile_index(ptile));
          index_to_map_pos(&mtile_x, &mtile_y, tile_index(unit_tile(punit)) );

          notify_player(extra_owner(ptile), unit_tile(punit),
                E_UNIT_SENTRY_WAKE, ftc_server,
                _("[`eye`] %s (%d,%d) saw %s %s %s<span class='sc'>%c</span> moving at (%d,%d)"),
                extra_name_translation(reporting_extra),
                stile_x, stile_y,
                nation_rule_name(nation_of_unit(punit)),
                unit_name_translation(punit), punit_emoji,
                unit_scrambled_id(punit->id),
                mtile_x, mtile_y );
        }
      }
    }

    unit_list_iterate(ptile->units, penemy) {
      // don't notify the same player twice for movement to this tile
      int enemy_playerno = player_number(unit_owner(penemy));
      int radius_sq = get_unit_vision_at(penemy, unit_tile(penemy), V_MAIN);

      if (!pplayers_allied(unit_owner(punit), unit_owner(penemy))
          && (penemy->activity == ACTIVITY_SENTRY
             || unit_has_type_flag(penemy, UTYF_SENTRYALWAYS))
          && radius_sq >= distance_sq
          /* If the unit moved on a city, and the unit is alone, consider
           * it is visible. */
          && (alone_in_city
              || can_player_see_unit(unit_owner(penemy), punit))
          /* on board transport; don't awaken */
          && can_unit_exist_at_tile(&(wld.map), penemy, unit_tile(penemy))) {

        /* in !longturn games, ACTIVITY_SENTRY units wake to be ready for orders. */
        if (!longturn && penemy->activity == ACTIVITY_SENTRY) {
          set_unit_activity(penemy, ACTIVITY_IDLE);
        }
        send_unit_info(NULL, penemy);

        // reporting a departure from a stack can be confused as an arrival to a stack
        // and tbh any excuse to limit number of messages is a good excuse.
        if (!departure && ++num_wakings[enemy_playerno] <= 1) {
          /* longturn games wake only the unit reporting, thus, a single unit moving into
              an area won't unsentry all other units who could report on future moves: */
          if (longturn && penemy->activity == ACTIVITY_SENTRY) {
            set_unit_activity(penemy, ACTIVITY_IDLE);
          }

          index_to_map_pos(&stile_x, &stile_y, tile_index(ptile));
          index_to_map_pos(&mtile_x, &mtile_y, tile_index(unit_tile(punit)) );

          notify_player(unit_owner(penemy), unit_tile(punit),
                E_UNIT_SENTRY_WAKE, ftc_server,
                _("[`eye`] %s (%d,%d) saw %s %s %s<span class='sc'>%c</span> moving at (%d,%d)"),
                unit_link(penemy),
                stile_x, stile_y,
                nation_rule_name(nation_of_unit(punit)),
                unit_name_translation(punit), punit_emoji,
                unit_scrambled_id(punit->id),
                mtile_x, mtile_y );
        }
      }
    } unit_list_iterate_end;
  } square_iterate_end;

  /* Wakeup patrolling units we bump into.
     We do not wakeup units further away than 3 squares... */
  square_iterate(&(wld.map), unit_tile(punit), 3, ptile) {
    unit_list_iterate(ptile->units, ppatrol) {
      if (punit != ppatrol
	  && unit_has_orders(ppatrol)
	  && ppatrol->orders.vigilant) {
	if (maybe_cancel_patrol_due_to_enemy(ppatrol)) {
	  cancel_orders(ppatrol, "  stopping because of nearby enemy");
          notify_player(unit_owner(ppatrol), unit_tile(ppatrol),
                        E_UNIT_ORDERS, ftc_server,
                        _("Patrol for %s %s aborted when enemy movement was "
                          "spotted."), UNIT_EMOJI(ppatrol), unit_link(ppatrol));
        }
      }
    } unit_list_iterate_end;
  } square_iterate_end;
}

/**********************************************************************//**
  Does: 1) updates the unit's homecity and the city it enters/leaves (the
           city's happiness varies). This also takes into account when the
           unit enters/leaves a fortress.
        2) updates adjacent cities' unavailable tiles.

  FIXME: Sometimes it is not necessary to send cities because the goverment
         doesn't care whether a unit is away or not.
**************************************************************************/
static bool unit_move_consequences(struct unit *punit,
                                   struct tile *src_tile,
                                   struct tile *dst_tile,
                                   bool passenger,
                                   bool conquer_city_allowed)
{
  struct city *fromcity = tile_city(src_tile);
  struct city *tocity = tile_city(dst_tile);
  struct city *homecity_start_pos = NULL;
  struct city *homecity_end_pos = NULL;
  int homecity_id_start_pos = punit->homecity;
  int homecity_id_end_pos = punit->homecity;
  struct player *pplayer_start_pos = unit_owner(punit);
  struct player *pplayer_end_pos = pplayer_start_pos;
  const struct unit_type *type_start_pos = unit_type_get(punit);
  const struct unit_type *type_end_pos = type_start_pos;
  bool refresh_homecity_start_pos = FALSE;
  bool refresh_homecity_end_pos = FALSE;
  int saved_id = punit->id;
  bool alive = TRUE;
#ifdef FREECIV_WEB
  int facing = punit->facing;
#endif

  if (tocity && conquer_city_allowed) {
    if (!passenger) {
      /* The unit that does the move may conquer. */
      unit_conquer_city(punit, tocity);
    }

    /* Run for passengers too. A passenger may have been killed when its
     * transport conquered a city. (unit_conquer_city() can cause Lua code
     * to run) */

    alive = unit_is_alive(saved_id);
    if (alive) {
      /* In case script has changed something about unit */
      pplayer_end_pos = unit_owner(punit);
      type_end_pos = unit_type_get(punit);
      homecity_id_end_pos = punit->homecity;
    }
  }

  if (homecity_id_start_pos != 0) {
    homecity_start_pos = game_city_by_number(homecity_id_start_pos);
  }
  if (homecity_id_start_pos != homecity_id_end_pos) {
    homecity_end_pos = game_city_by_number(homecity_id_end_pos);
  } else {
    homecity_end_pos = homecity_start_pos;
  }

  /* We only do refreshes for non-AI players to now make sure the AI turns
     doesn't take too long. Perhaps we should make a special refresh_city
     functions that only refreshed happines. */

  /* might have changed owners or may be destroyed */
  tocity = tile_city(dst_tile);

  if (tocity) { /* entering a city */
    if (tocity->owner == pplayer_end_pos) {
      if (tocity != homecity_end_pos && is_human(pplayer_end_pos)) {
        city_refresh(tocity);
        send_city_info(pplayer_end_pos, tocity);
      }
    }
    if (homecity_start_pos) {
      refresh_homecity_start_pos = TRUE;
    }
  }

  if (fromcity) { /* leaving a city */
    if (homecity_start_pos) {
      refresh_homecity_start_pos = TRUE;
    }
    if (fromcity != homecity_start_pos
        && fromcity->owner == pplayer_start_pos
        && is_human(pplayer_start_pos)) {
      city_refresh(fromcity);
      send_city_info(pplayer_start_pos, fromcity);
    }
  }

  /* entering/leaving a fortress or friendly territory */
  if (homecity_start_pos || homecity_end_pos) {
    if ((game.info.happyborders != HB_DISABLED && tile_owner(src_tile) != tile_owner(dst_tile))
        || (tile_has_base_flag_for_unit(dst_tile,
                                        type_end_pos,
                                        BF_NOT_AGGRESSIVE)
            && is_friendly_city_near(pplayer_end_pos, dst_tile))
        || (tile_has_base_flag_for_unit(src_tile,
                                        type_start_pos,
                                        BF_NOT_AGGRESSIVE)
            && is_friendly_city_near(pplayer_start_pos, src_tile))) {
      refresh_homecity_start_pos = TRUE;
      refresh_homecity_end_pos = TRUE;
    }
  }

  if (refresh_homecity_start_pos && is_human(pplayer_start_pos)) {
    city_refresh(homecity_start_pos);
    send_city_info(pplayer_start_pos, homecity_start_pos);
  }
  if (refresh_homecity_end_pos
      && (!refresh_homecity_start_pos
          || homecity_start_pos != homecity_end_pos)
      && is_human(pplayer_end_pos)) {
    city_refresh(homecity_end_pos);
    send_city_info(pplayer_end_pos, homecity_end_pos);
  }

  city_map_update_tile_now(dst_tile);
  sync_cities();

#ifdef FREECIV_WEB
    /* Update unhappiness-causality for units vis-à-vis their home cities. We only need to update
       those units whose unhappy-causality got modified. The exception is passengers because their
       unhappy-causality already got modified when their transport moved, so we don't know if they
       were modified or not. Lets client know which units are angering their cities. */
    if (alive && (passenger || punit->facing != facing)) send_unit_info(player_reply_dest(unit_owner(punit)), punit);
#endif

  return alive;
}

/**********************************************************************//**
  Check if the units activity is legal for a move , and reset it if
  it isn't.
**************************************************************************/
static void check_unit_activity(struct unit *punit)
{
  switch (punit->activity) {
  case ACTIVITY_VIGIL:
    if (!unit_transported(punit)) {
      set_unit_activity(punit, ACTIVITY_IDLE);
    }
    break;
  case ACTIVITY_IDLE:
  case ACTIVITY_SENTRY:
  case ACTIVITY_EXPLORE:
  case ACTIVITY_GOTO:
    break;
  case ACTIVITY_POLLUTION:
  case ACTIVITY_MINE:
  case ACTIVITY_IRRIGATE:
  case ACTIVITY_CULTIVATE:
  case ACTIVITY_PLANT:
  case ACTIVITY_FORTIFIED:
  case ACTIVITY_FORTRESS:
  case ACTIVITY_PILLAGE:
  case ACTIVITY_TRANSFORM:
  case ACTIVITY_AIRBASE:
  case ACTIVITY_FORTIFYING:
  case ACTIVITY_FALLOUT:
  case ACTIVITY_PATROL_UNUSED:
  case ACTIVITY_BASE:
  case ACTIVITY_GEN_ROAD:
  case ACTIVITY_CONVERT:
  case ACTIVITY_OLD_ROAD:
  case ACTIVITY_OLD_RAILROAD:
  case ACTIVITY_LAST:
    set_unit_activity(punit, ACTIVITY_IDLE);
    break;
  };
}

/**********************************************************************//**
  Create a new unit move data, or use previous one if available.
**************************************************************************/
static struct unit_move_data *unit_move_data(struct unit *punit,
                                             struct tile *psrctile,
                                             struct tile *pdesttile)
{
  struct unit_move_data *pdata;
  struct player *powner = unit_owner(punit);
  /* TODO: This is hard-code assuming 3 layers when we might have more
     later. In addition, each call to get_unit_vision(..) is doing the
     same work multiple times. See OSDN #45627 for functions there which
     improved performance. */
  const v_radius_t radius_sq =
        V_RADIUS(get_unit_vision_at(punit, pdesttile, V_MAIN),
                 get_unit_vision_at(punit, pdesttile, V_INVIS),
                 get_unit_vision_at(punit, pdesttile, V_SUBSURFACE));
  struct vision *new_vision;
  bool success;

  if (punit->server.moving) {
    /* Recursive moving (probably due to a script). */
    pdata = punit->server.moving;
    pdata->ref_count++;
    fc_assert_msg(pdata->punit == punit,
                  "Unit number %d (%p) was going to die, but "
                  "server attempts to move it.",
                  punit->id, punit);
    fc_assert_msg(pdata->old_vision == NULL,
                  "Unit number %d (%p) has done an incomplete move.",
                  punit->id, punit);
  } else {
    pdata = fc_malloc(sizeof(*pdata));
    pdata->ref_count = 1;
    pdata->punit = punit;
    punit->server.moving = pdata;
    BV_CLR_ALL(pdata->can_see_unit);
  }
  pdata->powner = powner;
  BV_CLR_ALL(pdata->can_see_move);
  pdata->old_vision = punit->server.vision;

  /* Remove unit from the source tile. */
  fc_assert(unit_tile(punit) == psrctile);
  success = unit_list_remove(psrctile->units, punit);
  fc_assert(success == TRUE);

  /* Set new tile. */
  unit_tile_set(punit, pdesttile);
  unit_list_prepend(pdesttile->units, punit);

  if (unit_transported(punit)) {
    /* Silently free orders since they won't be applicable anymore. */
    free_unit_orders(punit);
  }

  /* Check unit activity. */
  check_unit_activity(punit);
  unit_did_action(punit);
  unit_forget_last_activity(punit);

  /* We first unfog the destination, then send the move,
   * and then fog the old territory. This means that the player
   * gets a chance to see the newly explored territory while the
   * client moves the unit, and both areas are visible during the
   * move */

  /* Enhance vision if unit steps into a fortress */
  new_vision = vision_new(powner, pdesttile);
  punit->server.vision = new_vision;
  vision_change_sight(new_vision, radius_sq);
  ASSERT_VISION(new_vision);

  return pdata;
}

/**********************************************************************//**
  Decrease the reference counter and destroy if needed.
**************************************************************************/
static void unit_move_data_unref(struct unit_move_data *pdata)
{
  fc_assert_ret(pdata != NULL);
  fc_assert_ret(pdata->ref_count > 0);
  fc_assert_msg(pdata->old_vision == NULL,
                "Unit number %d (%p) has done an incomplete move.",
                pdata->punit != NULL ? pdata->punit->id : -1, pdata->punit);

  pdata->ref_count--;
  if (pdata->ref_count == 0) {
    if (pdata->punit != NULL) {
      fc_assert(pdata->punit->server.moving == pdata);
      pdata->punit->server.moving = NULL;
    }
    free(pdata);
  }
}

/**********************************************************************//**
 Wrapper function for unit_move_real. This handles all unit_move cases
 that aren't on a GOTO looping through a multi-tile voyage. See
 unit_move_real for further explanation.
**************************************************************************/
bool unit_move(struct unit *punit, struct tile *pdesttile, long move_cost,
               struct unit *embark_to, bool find_embark_target,
               bool conquer_city_allowed)
{
  return unit_move_real(punit, pdesttile, move_cost, embark_to,
                find_embark_target, conquer_city_allowed, TRUE);
}

/**********************************************************************//**
  Moves a unit. No checks whatsoever! This is meant as a practical
  function for other functions, like do_airline, which do the checking
  themselves.

  If you move a unit you should always use this function or the wrapper
  function above, as it also sets the transport status of the unit
  correctly. Note that the source tile (the current tile of the unit) and
  pdesttile need not be adjacent.

  'first_move' - indicates whether the unit is on a GOTO departing from
  its first tile. This serves two purposes: (1) A big increase to
  performance: wakeup_neighbor_sentries() can now get called n+1 times
  on a path of n tiles instead of 2*(n-1)+1 times; (2) For servers which
  use sentry waking as a useful intel function to report movemments to
  the console, this reduces doubling of sentry intel messages which were
  appearing when a unit arrived on a tile AND when the unit left the tile.

  Returns TRUE iff unit still alive.
**************************************************************************/
bool unit_move_real(struct unit *punit, struct tile *pdesttile, long move_cost,
               struct unit *embark_to, bool find_embark_target,
               bool conquer_city_allowed, bool first_move)
{
  struct player *pplayer;
  struct tile *psrctile;
  struct city *pcity;
  struct unit *ptransporter;
  struct packet_unit_info src_info, dest_info;
  struct packet_unit_short_info src_sinfo, dest_sinfo;
  struct unit_move_data_list *plist =
      unit_move_data_list_new_full(unit_move_data_unref);
  struct unit_move_data *pdata;
  int saved_id;
  bool unit_lives;
  bool adj;
  enum direction8 facing;
  struct player *bowner;

  /* Some checks. */
  fc_assert_ret_val(punit != NULL, FALSE);
  fc_assert_ret_val(pdesttile != NULL, FALSE);

  pplayer = unit_owner(punit);
  saved_id = punit->id;
  psrctile = unit_tile(punit);
  adj = base_get_direction_for_step(&(wld.map), psrctile, pdesttile, &facing);

  conn_list_do_buffer(game.est_connections);

  /* Unload the unit if on a transport. */
  ptransporter = unit_transport_get(punit);
  if (ptransporter != NULL) {
    /* Unload unit _before_ setting the new tile! */
    unit_transport_unload(punit);
    /* Send updated information to anyone watching that transporter
     * was unloading cargo. */
    send_unit_info(NULL, ptransporter);
  }

  /* Wakup units next to us before we move. Only called on the first
     move to avoid duplicate arrival/departure wakings + spam */
  if (first_move) {
    wakeup_neighbor_sentries(punit, true);
  }

  /* Make info packets at 'psrctile'. */
  if (adj) {
    /* If tiles are adjacent, we will show the move to users able
     * to see it. */
    package_unit(punit, &src_info);
    package_short_unit(punit, &src_sinfo, UNIT_INFO_IDENTITY, 0);
  }

  /* Make new data for 'punit'. */
  pdata = unit_move_data(punit, psrctile, pdesttile);
  unit_move_data_list_prepend(plist, pdata);

#ifndef FREECIV_WEB
  /* Set unit orientation */
  if (adj) {
    /* Only change orientation when moving to adjacent tile */
    punit->facing = facing;
  }
#endif

  /* Move magic. */
  //if (!unit_transported(punit)) punit->moved = TRUE;
  punit->moved = TRUE;
  punit->moves_left = MAX(0, punit->moves_left - move_cost);
  if (punit->moves_left == 0 && !unit_has_orders(punit)) {
    /* The next order may not require any remaining move fragments. */
    punit->done_moving = TRUE;
  }

  /* No longer relevant. */
  punit->action_decision_tile = NULL;
  punit->action_decision_want = ACT_DEC_NOTHING;

  if (!adj
      && action_tgt_city(punit, pdesttile, FALSE)) {
    /* The unit can perform an action to the city at the destination tile.
     * A long distance move (like an airlift) doesn't ask what action to
     * perform before moving. Ask now. */

    punit->action_decision_want = ACT_DEC_PASSIVE;
    punit->action_decision_tile = pdesttile;
  }

  /* Claim ownership of fortress? */
  bowner = extra_owner(pdesttile);
  if ((bowner == NULL || pplayers_at_war(bowner, pplayer))
      && tile_has_claimable_base(pdesttile, unit_type_get(punit))) {
    /* Yes. We claim *all* bases if there's *any* claimable base(s).
     * Even if original unit cannot claim other kind of bases, the
     * first claimed base will have influence over other bases,
     * or something like that. */
    tile_claim_bases(pdesttile, pplayer);
  }


  /* FIXME: Reqs seem to have no way of checking transported_by so that we can avoid
     charging EFT_PASSENGER_MOVE_COST_BP to Paratroopers on an Airborne Transport.
     So the UTYF_FREE_RIDE flag works for now, until rulesets want more complicated
     rules for what gets you a free ride. Doing it ugly for now! */
  bool is_free_ride = utype_has_flag(unit_type_get(punit), UTYF_FREE_RIDE);

  /* Move all contained units. */
  unit_cargo_iterate(punit, pcargo) {
    pdata = unit_move_data(pcargo, psrctile, pdesttile);
    unit_move_data_list_append(plist, pdata);
    /* EFT_PASSENGER_MOVE_COST_BP:
     * Each cargo unit loses moves proportionate to the moves lost by the transport.
     * If the transport took a year to get somewhere, the cargo also waited all year to
     * get there. Finally, a solution to double-haul move problems! Leaving the effect
     * EFT_PASSENGER_MOVE_COST_BP as 0 leaves legacy behaviour (no moves charged to
     * units on long voyages). A value of SINGLE_MOVE gives full real proportonality
     * (an 8mp transport using 50% of its range will charge a 4mp cargo 2mp==50%).
     * Somewhere between 0-SINGLE_MOVE can be used if you want to leniently leave some
     * moves left to disembark or start an activity.
     *
     * Notice utype_move_rate() is used for the pcargo because it might be on a non-native
     * tile while transported, or is getting flown over a move-penalty tile like mountains,
     * and such terrain penalties shouldn't apply to it while it's passive cargo in a
     * different transporter. EFT_PASSENGER_MOVE_COST_BP is not recommended for rulesets
     * with low movefrags. Recommended: use an HCN (wikipedia: high composite number) for
     * the number of movefrags in the ruleset.
     *
     * An ease-of-life / quality-of-life exception to the "laws of physics" is made for
     * proportioned move-cost charged to cargo units, such that they are never charged more
     * than 1.0 move-point per tile traveled while transported. Why? The exception only
     * affects high-move units on slower transports (i.e., planes and missiles on carriers).
     * Without this little "white lie" fiction, one would be forced by realism, to deboard
     * all planes and missiles before their transport moved, in order to preserve more
     * move-points and be charged only 1.0mp per tile traveled...then re-land on carrier to
     * preserve more move-points for the possibility of an attack at longer range. This
     * degree of ultra-realism is unwanted, as it creates unnecessary UI/UX micromanagement.
     * NB: If we ever face a ruleset where this heuristic isn't wanted, we either create
     * a new effect that does it "pure" or perhaps flag the value with as negative sign to
     * indicate the unit gets the "ease-of-life" exception.
     *
     */

    /* pcargo has moved or not, as far as MovedThisTurn reqs go, we're making it so pcargo has
       not moved. This makes it so ability for units on Carriers to vigil is preserved,
       treating carriers like a city is preserved, and does have side effect that
       other MovedThisTurn stipulations aren't activated such as SUA or other things:

    pcargo->moved = TRUE;   */
    double cargo_move_rate = utype_move_rate(unit_type_get(pcargo),
                                           NULL, unit_owner(pcargo),
                                           pcargo->veteran, pcargo->hp,
                                           NULL);
    double cargo_move_cost = MIN(SINGLE_MOVE,  // "EASE OF LIFE EXCEPTION" never charges >1mp see README.effects
                                 (double)move_cost/(double)unit_move_rate(punit)
                                 * cargo_move_rate
                                 * get_unit_bonus(pcargo, EFT_PASSENGER_MOVE_COST_BP) / SINGLE_MOVE
                                );

    /* FIXME: See above. paratroopers_range is a "free rider" flag, usable by any utype
       Problem is that all Paratroopers will always be free riders. */
    if (is_free_ride && unit_type_get(pcargo)->paratroopers_range > 0) {
      cargo_move_cost = 0;
    }

/* BREAK GLASS IN CASE OF DEBUG
    notify_player(pplayer, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                  _("%s passive cargo move_cost = %.0lfmp - %.01f {{(%.0lf/%.0lf) * %.0lf * %.1lf}} = %.0lf "),
                  unit_link(pcargo),
                  (double)(pcargo->moves_left + 0.5),
                  cargo_move_cost,
                  (double)(move_cost),
                  (double)(unit_move_rate(punit)),
                  cargo_move_rate,
                  (double)get_unit_bonus(pcargo, EFT_PASSENGER_MOVE_COST_BP) / SINGLE_MOVE,

                  (double)(pcargo->moves_left + 0.5   // move_frag round
                       - ((double)move_cost/(double)unit_move_rate(punit))
                       * cargo_move_rate
                       * get_unit_bonus(pcargo, EFT_PASSENGER_MOVE_COST_BP) / SINGLE_MOVE)
                  ); */

    pcargo->moves_left = (double)pcargo->moves_left + 0.5 // frags will get rounded to nearest int, not trunc'd
                       - cargo_move_cost; // never > SINGLE_MOVE;
    pcargo->moves_left = MAX(0, pcargo->moves_left);

  } unit_cargo_iterate_end;

  /* Get data for 'punit'. */
  pdata = unit_move_data_list_front(plist);

  /* Determine the players able to see the move(s), now that the player
   * vision has been increased. */
  if (adj) {
    /*  Main unit for adjacent move: the move is visible for every player
     * able to see on the matching unit layer. */
    enum vision_layer vlayer = unit_type_get(punit)->vlayer;

    players_iterate(oplayer) {
      if (map_is_known_and_seen(psrctile, oplayer, vlayer)
          || map_is_known_and_seen(pdesttile, oplayer, vlayer)) {
        BV_SET(pdata->can_see_unit, player_index(oplayer));
        BV_SET(pdata->can_see_move, player_index(oplayer));
      }
    } players_iterate_end;
  }
  unit_move_data_list_iterate(plist, pmove_data) {
    if (adj && pmove_data == pdata) {
      /* If positions are adjacent, we have already handled 'punit'. See
       * above. */
      continue;
    }

    players_iterate(oplayer) {
      if ((adj
           && can_player_see_unit_at(oplayer, pmove_data->punit, psrctile,
                                     pmove_data != pdata))
          || can_player_see_unit_at(oplayer, pmove_data->punit, pdesttile,
                                    pmove_data != pdata)) {
        BV_SET(pmove_data->can_see_unit, player_index(oplayer));
        BV_SET(pmove_data->can_see_move, player_index(oplayer));
      }
      if (can_player_see_unit_at(oplayer, pmove_data->punit, psrctile,
                                 pmove_data != pdata)) {
        /* The unit was seen with its source tile even if it was
         * teleported. */
        BV_SET(pmove_data->can_see_unit, player_index(oplayer));
      }
    } players_iterate_end;
  } unit_move_data_list_iterate_end;

  /* Check timeout settings. */
  if (current_turn_timeout() != 0 && game.server.timeoutaddenemymove > 0) {
    bool new_information_for_enemy = FALSE;

    phase_players_iterate(penemy) {
      /* Increase the timeout if an enemy unit moves and the
       * timeoutaddenemymove setting is in use. */
      if (penemy->is_connected
          && pplayer != penemy
          && pplayers_at_war(pplayer, penemy)
          && BV_ISSET(pdata->can_see_move, player_index(penemy))) {
        new_information_for_enemy = TRUE;
        break;
      }
    } phase_players_iterate_end;

    if (new_information_for_enemy) {
      increase_timeout_because_unit_moved();
    }
  }

  /* Notifications of the move to the clients. */
  if (adj) {
    /* Special case: 'punit' is moving to adjacent position. Then we show
     * 'punit' move to all users able to see 'psrctile' or 'pdesttile'. */

    /* Make info packets at 'pdesttile'. */
    package_unit(punit, &dest_info);
    package_short_unit(punit, &dest_sinfo, UNIT_INFO_IDENTITY, 0);

    conn_list_iterate(game.est_connections, pconn) {
      struct player *aplayer = conn_get_player(pconn);

      if (aplayer == NULL) {
        if (pconn->observer) {
          /* Global observers see all... */
          send_packet_unit_info(pconn, &src_info);
          send_packet_unit_info(pconn, &dest_info);
        }
      } else if (BV_ISSET(pdata->can_see_move, player_index(aplayer))) {
        if (aplayer == pplayer) {
          send_packet_unit_info(pconn, &src_info);
          send_packet_unit_info(pconn, &dest_info);
        } else {
          send_packet_unit_short_info(pconn, &src_sinfo, FALSE);
          send_packet_unit_short_info(pconn, &dest_sinfo, FALSE);
        }
      }
    } conn_list_iterate_end;
  }

  /* Other moves. */
  unit_move_data_list_iterate(plist, pmove_data) {
    if (adj && pmove_data == pdata) {
      /* If positions are adjacent, we have already shown 'punit' move.
       * See above. */
      continue;
    }

    /* Make info packets at 'pdesttile'. */
    package_unit(pmove_data->punit, &dest_info);
    package_short_unit(pmove_data->punit, &dest_sinfo,
                       UNIT_INFO_IDENTITY, 0);

    conn_list_iterate(game.est_connections, pconn) {
      struct player *aplayer = conn_get_player(pconn);

      if (aplayer == NULL) {
        if (pconn->observer) {
          /* Global observers see all... */
          send_packet_unit_info(pconn, &dest_info);
        }
      } else if (BV_ISSET(pmove_data->can_see_move, player_index(aplayer))) {
        if (aplayer == pmove_data->powner) {
          send_packet_unit_info(pconn, &dest_info);
        } else {
          send_packet_unit_short_info(pconn, &dest_sinfo, FALSE);
        }
      }
    } conn_list_iterate_end;
  } unit_move_data_list_iterate_end;

  /* Clear old vision. */
  unit_move_data_list_iterate(plist, pmove_data) {
    vision_clear_sight(pmove_data->old_vision);
    vision_free(pmove_data->old_vision);
    pmove_data->old_vision = NULL;
  } unit_move_data_list_iterate_end;

  /* Move consequences. */
  unit_move_data_list_iterate(plist, pmove_data) {
    struct unit *aunit = pmove_data->punit;

    if (aunit != NULL
        && unit_owner(aunit) == pmove_data->powner
        && unit_tile(aunit) == pdesttile) {
      (void) unit_move_consequences(aunit, psrctile, pdesttile,
                                    pdata != pmove_data,
                                    conquer_city_allowed);
    }
  } unit_move_data_list_iterate_end;

  unit_lives = (pdata->punit == punit);

  /* Wakeup units and make contact. */
  if (unit_lives) {
    wakeup_neighbor_sentries(punit, false);
  }
  maybe_make_contact(pdesttile, pplayer);

  if (unit_lives) {
    /* Special checks for ground units in the ocean. */
    if (embark_to || !can_unit_survive_at_tile(&(wld.map), punit, pdesttile)) {
      if (embark_to != NULL) {
        ptransporter = embark_to;
      } else if (find_embark_target) {
        /* TODO: Consider to stop supporting find_embark_target and make all
         * callers that wants auto loading set embark_to. */
        ptransporter = transporter_for_unit(punit);
      } else {
        ptransporter = NULL;
      }
      /* EMBARK UNIT ON TRANSPORT (second part of "dual action" of 1)move, 2)board */
      if (ptransporter) {
        /* Being here is a promise to embark! We've passed legality for ACTION_TRANSPORT_EMBARK, and moved to the
           transport's tile. The 3rd param was changed to TRUE to fix bug where units lost moves_left by moving,
           then can't board if moves_left is a req for boarding; leaving units drowning in the water!
           ~*~ NOTE: ~*~
           Brief tests didn't show this breaks anything. Seems OK: being here is a 'promise' we could embark AND
           the second of two steps in doing so. However, if illegal embarkations occur, this may be to blame. */
        unit_transport_load_tp_status(punit, ptransporter, TRUE); // NB: 'force' was previously set FALSE;

        /* Set activity to sentry if boarding a ship. */
        if (is_human(pplayer)
            && !unit_has_orders(punit)
            && !punit->ai_controlled
            && !can_unit_exist_at_tile(&(wld.map), punit, pdesttile)) {
          set_unit_activity(punit, ACTIVITY_SENTRY);
        }

        send_unit_info(NULL, punit);
      }
    }
  }

  /* Remove units going out of sight. */
  unit_move_data_list_iterate_rev(plist, pmove_data) {
    struct unit *aunit = pmove_data->punit;

    if (aunit == NULL) {
      continue; /* Died! */
    }

    players_iterate(aplayer) {
      if (BV_ISSET(pmove_data->can_see_unit, player_index(aplayer))
          && !can_player_see_unit(aplayer, aunit)) {
        unit_goes_out_of_sight(aplayer, aunit);
      }
    } players_iterate_end;
  } unit_move_data_list_iterate_rev_end;

  /* Inform the owner's client about actor unit arrival. Can, depending on
   * the client settings, cause the client to start the process that makes
   * the action selection dialog pop up. */
  if ((pcity = tile_city(pdesttile))) {
    /* Arrival in a city counts. */

    unit_move_data_list_iterate(plist, pmove_data) {
      struct unit *ptrans;
      bool ok;
      struct unit *act_unit;
      struct player *act_player;

      act_unit = pmove_data->punit;
      act_player = unit_owner(act_unit);

      if (act_unit == NULL
          || !unit_is_alive(act_unit->id)) {
        /* The unit died before reaching this point. */
        continue;
      }

      if (unit_tile(act_unit) != pdesttile) {
        /* The unit didn't arrive at the destination tile. */
        continue;
      }

      if (!is_human(act_player)) {
        /* Only humans need reminders. */
        continue;
      }

      if (!unit_transported(act_unit)) {
        /* Don't show the action selection dialog again. Non transported
         * units are handled before they move to the tile.  */
        continue;
      }

      /* Open action dialog only if 'act_unit' and all its transporters
       * (recursively) don't have orders. */
      if (unit_has_orders(act_unit)) {
        /* The unit it self has orders. */
        continue;
      }

      for (ptrans = unit_transport_get(act_unit);;
           ptrans = unit_transport_get(ptrans)) {
        if (NULL == ptrans) {
          /* No (recursive) transport has orders. */
          ok = TRUE;
          break;
        } else if (unit_has_orders(ptrans)) {
          /* A unit transporting the unit has orders */
          ok = FALSE;
          break;
        }
      }

      if (!ok) {
        /* A unit transporting act_unit has orders. */
        continue;
      }

      if (action_tgt_city(act_unit, pdesttile, FALSE)) {
        /* There is a valid target. */

        act_unit->action_decision_want = ACT_DEC_PASSIVE;
        act_unit->action_decision_tile = pdesttile;

        /* Let the client know that this unit wants the player to decide
         * what to do. */
        send_unit_info(player_reply_dest(act_player), act_unit);
      }
    } unit_move_data_list_iterate_end;
  }

  unit_move_data_list_destroy(plist);

  /* Check cities at source and destination. */
  if ((pcity = tile_city(psrctile))) {
    refresh_dumb_city(pcity);
  }
  if ((pcity = tile_city(pdesttile))) {
    refresh_dumb_city(pcity);
  }

  if (unit_lives) {
    /* Let the scripts run ... */
    script_server_signal_emit("unit_moved", punit, psrctile, pdesttile);
    unit_lives = unit_is_alive(saved_id);
  }

  if (unit_lives) {
    /* Autoattack. */
    unit_lives = unit_survive_autoattack(punit);
  }

  if (unit_lives) {
    /* Is there a hut? */
    unit_enter_hut(punit);
    unit_lives = unit_is_alive(saved_id);
  }

  conn_list_do_unbuffer(game.est_connections);

  if (unit_lives) {
    CALL_FUNC_EACH_AI(unit_move_seen, punit);
  }

  return unit_lives;
}

/**********************************************************************//**
  Maybe cancel the goto if there is an enemy in the way
**************************************************************************/
static bool maybe_cancel_goto_due_to_enemy(struct unit *punit,
                                           struct tile *ptile)
{
  return (is_non_allied_unit_tile(ptile, unit_owner(punit))
	  || is_non_allied_city_tile(ptile, unit_owner(punit)));
}

/**********************************************************************//**
  Maybe cancel the patrol as there is an enemy near.

  If you modify the wakeup range you should change it in
  wakeup_neighbor_sentries() too.
**************************************************************************/
static bool maybe_cancel_patrol_due_to_enemy(struct unit *punit)
{
  bool cancel = FALSE;
  int radius_sq = get_unit_vision_at(punit, unit_tile(punit), V_MAIN);
  struct player *pplayer = unit_owner(punit);

  circle_iterate(&(wld.map), unit_tile(punit), radius_sq, ptile) {
    struct unit *penemy = is_non_allied_unit_tile(ptile, pplayer);

    struct vision_site *pdcity = map_get_player_site(ptile, pplayer);

    if ((penemy && can_player_see_unit(pplayer, penemy))
	|| (pdcity && !pplayers_allied(pplayer, vision_site_owner(pdcity))
	    && pdcity->occupied)) {
      cancel = TRUE;
      break;
    }
  } circle_iterate_end;

  return cancel;
}

/**********************************************************************//**
  Returns TRUE iff it is reasonable to assume that the player is wathing
  the unit.

  Since the player is watching the unit there is no need to inform him
  about things he could see happening. Remember that it still may
  be necessary to explain why something happened.
**************************************************************************/
static inline bool player_is_watching(struct unit *punit, const bool fresh)
{
  /* The player just sent the orders to the unit. The unit has moves left.
   * It is therefore safe to assume that the player already is paying
   * attention to the unit. */
  return fresh && punit->moves_left > 0;
}

/**********************************************************************//**
  Executes a unit's orders stored in punit->orders.  The unit is put on idle
  if an action fails or if "patrol" is set and an enemy unit is encountered.

  The return value will be TRUE if the unit lives, FALSE otherwise.  (This
  function used to return a goto_result enumeration, declared in gotohand.h.
  But this enumeration was never checked by the caller and just led to
  confusion.  All the caller really needs to know is if the unit lived or
  died; everything else is handled internally within execute_orders.)

  If the orders are repeating the loop starts over at the beginning once it
  completes.  To avoid infinite loops on railroad we stop for this
  turn when the unit is back where it started, even if it have moves left.

  A unit will attack under orders only on its final action.

  The fresh parameter is true if the order execution happens because the
  orders just were received.
**************************************************************************/
bool execute_orders(struct unit *punit, const bool fresh)
{
  struct tile *dst_tile;
  struct city *tgt_city;
  struct unit *tgt_unit;
  struct act_prob prob;
  int tgt_id;
  bool performed;
  const char *name;
  bool res, last_order;
  int unitid = punit->id;
  struct player *pplayer = unit_owner(punit);
  int moves_made = 0;
  enum unit_activity activity;
  struct extra_type *pextra;

  fc_assert_ret_val(unit_has_orders(punit), TRUE);

  if (punit->activity != ACTIVITY_IDLE) {
    /* Unit's in the middle of an activity; wait for it to finish. */
    punit->done_moving = TRUE;
    return TRUE;
  }

  log_debug("Executing orders for %s %d", unit_rule_name(punit), punit->id);

  /* Any time the orders are canceled we should give the player a message. */
  while (TRUE) {
    struct unit_order order;

    if (punit->done_moving) {
      log_debug("  stopping because we're done this turn");
      return TRUE;
    }

    if (punit->orders.vigilant && maybe_cancel_patrol_due_to_enemy(punit)) {
      /* "Patrol" orders are stopped if an enemy is near. */
      cancel_orders(punit, "  stopping because of nearby enemy");
      notify_player(pplayer, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                    _("Orders for %s aborted as there are units nearby."),
                    unit_link(punit));
      return TRUE;
    }

    if (moves_made == punit->orders.length) {
      /* For repeating orders, don't repeat more than once per turn. */
      log_debug("  stopping because we ran a round");
      punit->done_moving = TRUE;
      send_unit_info(NULL, punit);
      return TRUE;
    }
    moves_made++;

    order = punit->orders.list[punit->orders.index];

    /* ORDER_PERFORM_ACTION that doesn't specify an action shouldn't get here */
    fc_assert_action((order.order != ORDER_PERFORM_ACTION
                      || action_id_exists(order.action)),
                     continue);

    pextra = (order.sub_target == EXTRA_NONE ?
                NULL :
                extra_by_number(order.sub_target));

    switch (order.order) {
    case ORDER_MOVE:
    case ORDER_ACTION_MOVE:
    case ORDER_FULL_MP:
      if (0 == punit->moves_left) {
        log_debug("  stopping because of no more move points");
        return TRUE;
      }
      break;
    case ORDER_PERFORM_ACTION:
      if (action_mp_full_makes_legal(punit, order.action)) {
        log_debug("  stopping. Not enough move points this turn");
        return TRUE;
      }
      break;
    case ORDER_ACTIVITY:
    case ORDER_LAST:
      /* Those actions don't require moves left. */
      break;
    }

    last_order = (!punit->orders.repeat
		  && punit->orders.index + 1 == punit->orders.length);

    if (last_order) {
      /* Clear the orders before we engage in the move.  That way any
       * has_orders checks will yield FALSE and this will be treated as
       * a normal move.  This is important: for instance a caravan goto
       * will popup the caravan dialog on the last move only. */
      free_unit_orders(punit);
    }

    /* Advance the orders one step forward.  This is needed because any
     * updates sent to the client as a result of the action should include
     * the new index value.  Note that we have to send_unit_info somewhere
     * after this point so that the client is properly updated. */
    punit->orders.index++;

    switch (order.order) {
    case ORDER_FULL_MP:
      if (punit->moves_left < unit_move_rate(punit)) {
        if (order.activity == ACTIVITY_GOTO && punit->moves_left > 0) {
           /* ACTIVITY_GOTO encoded inside ORDER_FULL_MP overrides a wait: */
          break;
        }
        else {
        /* If the unit doesn't have full MP then it just waits until the
        * next turn.  We assume that the next turn it will have full MP
        * (there's no check for that). */
          punit->done_moving = TRUE;
          log_debug("  waiting this turn");
          send_unit_info(NULL, punit);
          break;
        }
      } else if (order.activity == ACTIVITY_SENTRY) {
        /* ACTIVITY_SENTRY encoded inside ORDER_FULL_MP means forced wait.*/
        punit->done_moving = TRUE;
        send_unit_info(NULL, punit);
        break;
      }
      break;

    case ORDER_ACTIVITY:
      activity = order.activity;
      {
        if (pextra == NULL && activity_requires_target(order.activity)) {
          /* Try to find a target extra before giving up this order or, if
           * serious enough, all orders. */

          enum unit_activity new_activity = order.activity;

          unit_assign_specific_activity_target(punit,
                                               &new_activity, &pextra);

          if (new_activity != order.activity) {
            /* At the time this code was written the only possible activity
             * change from unit_assign_specific_activity_target() was from
             * ACTIVITY_PILLAGE to ACTIVITY_IDLE. That would only happen
             * when a target extra couldn't be found. -- Sveinung */
            fc_assert_msg((order.activity == ACTIVITY_PILLAGE
                           && new_activity == ACTIVITY_IDLE),
                          "Skipping an order when canceling all orders may"
                          " have been the correct thing to do.");

            /* Already removed, let's continue. */
            break;
          }

          /* Should have given up or, if supported, changed the order's
           * activity to the activity suggested by
           * unit_activity_handling_targeted() before this line was
           * reached.
           * Remember that unit_activity_handling_targeted() has the power
           * to change the order's target extra directly. */
          fc_assert_msg(new_activity == order.activity,
                        "Activity not updated. Target may have changed.");

          /* Should have found a target or given up before reaching this
           * line. */
          fc_assert_msg((pextra != NULL
                         || !activity_requires_target(order.activity)),
                        "Activity requires a target. No target found.");
        }

        if (can_unit_do_activity_targeted(punit, activity, pextra)) {
          /* 1. When connect-activity does cultivate, it would fail maybe because cultivate
             isn't a unit_activity_targeted? This code block fixes that.
             2. 👉🏽Also, FCW connect-activity irrigates same tile after cultivate. This
             caused failed orders when activity_useful_at_tile() is false, as EXTRA_IRRIGATION
             can't go on Jungle; thus you lose connect-orders. By being above code-block
             below, that no longer happens. See comment below. */
          if (activity == ACTIVITY_CULTIVATE && can_unit_do_activity(punit, activity)) {
            punit->done_moving = TRUE;
            set_unit_activity(punit, activity);
            send_unit_info(NULL, punit);
            break;
          }
          /* Putting this code block above the one above, will result in cultivating units
             aborting their connect-orders whenever joining another unit's work isn't
             "useful". (Rare case, only Tribesmen on Jungle because they work at 1
             work unit per turn and Jungle is an even numbered build-time.) The choice is
             abort orders then, or just be on super rare occasions inefficient and keep a
             perhaps long connect-orders chain active. Obviously the latter, for now. */
          if (!is_activity_useful_at_tile(activity, unit_tile(punit), pextra, punit)) {
            if (!last_order) notify_player(pplayer, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                                 _("Orders for this tile aren't useful. %s skipping to next orders."),
                                 unit_link(punit));
            else             notify_player(pplayer, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                                 _("Orders for %s aborted since it's not helpful on "
                                 "this tile."), unit_link(punit));

            break;
          }

          punit->done_moving = TRUE;
          set_unit_activity_targeted(punit, activity, pextra);
          send_unit_info(NULL, punit);

          // Doing these 4 in foreign territory may trigger casus belli:
          if (activity == ACTIVITY_PILLAGE) {
            action_consequence_success(action_by_number(ACTION_PILLAGE),
                                       unit_owner(punit), unit_type_get(punit),
                                       tile_owner(unit_tile(punit)),
                                       unit_tile(punit),
                                       tile_link(unit_tile(punit)));
          }
          else if (activity == ACTIVITY_GEN_ROAD) {
            action_consequence_success(action_by_number(ACTION_ROAD),
                                       unit_owner(punit), unit_type_get(punit),
                                       tile_owner(unit_tile(punit)),
                                       unit_tile(punit),
                                       tile_link(unit_tile(punit)));
          }
          else if (activity == ACTIVITY_BASE) {
            action_consequence_success(action_by_number(ACTION_BASE),
                                       unit_owner(punit), unit_type_get(punit),
                                       tile_owner(unit_tile(punit)),
                                       unit_tile(punit),
                                       tile_link(unit_tile(punit)));
          }
          break;
        } else {

          if (pextra == NULL) {
            log_error("No extra for ordered unit");
            return TRUE;
          } else if ((activity == ACTIVITY_BASE
               || activity == ACTIVITY_GEN_ROAD
               || activity == ACTIVITY_IRRIGATE
               || activity == ACTIVITY_MINE)
              && tile_has_extra(unit_tile(punit), pextra)) {
            break; /* Already built, let's continue. */
          } else if ((activity == ACTIVITY_POLLUTION
                      || activity == ACTIVITY_FALLOUT
                      || activity == ACTIVITY_PILLAGE)
                     && !tile_has_extra(unit_tile(punit), pextra)) {
            break; /* Already removed, let's continue. */
          }
        }
      }

      cancel_orders(punit, "  orders canceled because of failed activity");
      notify_player(pplayer, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                    _("Orders for %s aborted since they "
                      "give an invalid activity."),
                    unit_link(punit));
      return TRUE;
    case ORDER_MOVE:
    case ORDER_ACTION_MOVE:
      /* Move unit */
      if (!(dst_tile = mapstep(&(wld.map), unit_tile(punit), order.dir))) {
        cancel_orders(punit, "  move order sent us to invalid location");
        notify_player(pplayer, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                      _("Orders for %s aborted since they "
                        "give an invalid location."),
                      unit_link(punit));
        return TRUE;
      }

      if (order.order != ORDER_ACTION_MOVE
          && maybe_cancel_goto_due_to_enemy(punit, dst_tile)) {
        /* Plain move required: no attack, trade route etc. */
        cancel_orders(punit, "  orders canceled because of enemy");
        notify_player(pplayer, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                      _("Orders for %s %s aborted as there "
                        "are units in the way."),
                        UNIT_EMOJI(punit), unit_link(punit));
        return TRUE;
      }

      log_debug("  moving to %d,%d", TILE_XY(dst_tile));

/* DEBUG:notify_conn(game.est_connections, unit_tile(punit), E_UNIT_LOST_MISC, ftc_server,
              _("about to call unit_move_handling() with %d moves_made"),moves_made);*/

      res = unit_move_handling_real(punit, dst_tile, FALSE,
                               order.order != ORDER_ACTION_MOVE, moves_made == 1);
      if (!player_unit_by_number(pplayer, unitid)) {
        log_debug("  unit died while moving.");
        /* A player notification should already have been sent. */
        return FALSE;
      }

      if (res && !same_pos(dst_tile, unit_tile(punit))) {
        /* Movement succeeded but unit didn't move. */
        log_debug("  orders resulted in combat.");
        send_unit_info(NULL, punit);
        return TRUE;
      }

      if (!res) {
        fc_assert(0 <= punit->moves_left);

        /* Movement failed (ZOC, etc.) */
        if (game.server.unitwaittime_style & UWT_DELAY_GOTO) {
          time_t dt = time(NULL) - punit->server.action_timestamp;
            if (dt < game.server.unitwaittime) {
              /* DON'T CANCEL ORDERS: they need to be kept to delay GOTO later */
              // ....
              /* This message was coming up redundant to the message in unit_can_do_action_now,
                 for all unit move orders, thus unneeded in that case. It was suspected of
                 making the spurious messages about 9 hours 59 minutes on units that could move,
                 likely because it was forgetting to check if (punit->server.action_turn == game.info.turn - 1),
                 AND it was suspected of giving FALSE positives about UWT preventing an action
                 when the action was simply reported illegal for some other reason. For all
                 these reasons it's commented out now, but might have had some reason before,
                 which could be made to work again, if we filter out ANYTHING that's NOT
                 the unit in a state of a LEGAL delayed GOTO, remove the redundant message
                 about UWT from unit_can_do_action_now(..) under those conditions there, and
                 check the server.action_turn like we weren't doing before. For now, it's just
                 commented out and we'll see how it goes.
              char buf[64];
              if (dt>0.99) {
                format_time_duration(game.server.unitwaittime - dt, buf, sizeof(buf));
                notify_player(pplayer, unit_tile(punit),
                          E_UNIT_ORDERS, ftc_server,
                          _("  [`hourglass`] %s %s movement postponed %s by unitwaittime."),
                          UNIT_EMOJI(punit), unit_link(punit), buf);
              } */
              // ....
              /* We must undo the earlier 'premature' increment of order_index++ which assumed success */
              punit->orders.index--;
              /* Courtesy feature: put fresh user-given orders in unit_wait_list to execute later */
              if (fresh) {
                time_t wake_up = punit->server.action_timestamp + (time_t)game.server.unitwaittime;
                punit->activity = ACTIVITY_IDLE;
                /* TODO: make a GOTO to dest tile if !has_orders, this means they hit a cursor key */
                struct unit_wait *wait = fc_malloc(sizeof(*wait));
                wait->activity_count = get_activity_rate_this_turn(punit);
                wait->id = punit->id;
                wait->wake_up = scramble_uwt_stamp(wake_up);/* DEBUG LEFTOER
                notify_player(punit->owner, NULL, E_UNIT_RELOCATED, ftc_server,
                              _("xo.%s #%d appending to waitlist."),unit_link(punit),punit->id);*/
                unit_forget_last_activity(punit); // prevent last activity getting a wait on this turn
                unit_wait_list_append(server.unit_waits, wait);
              }
              return true;
            }
        } // END DELAYED GOTO HANDLING
        cancel_orders(punit, "  attempt to move failed.");

        if (!player_is_watching(punit, fresh)
            /* The final move "failed" because the unit needs to ask the
             * player what action it should take.
             *
             * The action decision request notifies the player. Its
             * location at the unit's last order makes it clear to the
             * player who the decision is for. ("The Spy I sent to Berlin
             * has arrived.")
             *
             * A notification message is therefore redundant. */
            && !(last_order
                 && punit->action_decision_want == ACT_DEC_ACTIVE
                 && punit->action_decision_tile == dst_tile)) {
          /* The player may have missed this. No one else will announce it
           * in a satisfying manner. Inform the player. */
          notify_player(pplayer, unit_tile(punit),
                        E_UNIT_ORDERS, ftc_server,
                        _("Orders for %s aborted because of failed move."),
                        unit_link(punit));
        }

        return TRUE;
      }
      break;
    case ORDER_PERFORM_ACTION:
      log_debug("  orders: doing action %d", order.action);

      if (!direction8_is_valid(order.dir)) {
        /* The target of the action is on the actor's tile. */
        dst_tile = unit_tile(punit);
      } else {
        /* The target of the action is on a tile next to the actor. */
        dst_tile = mapstep(&(wld.map), unit_tile(punit), order.dir);
      }

      if (dst_tile == NULL) {
        /* Could be at the edge of the map while trying to target a tile
         * outside of it. */

        cancel_orders(punit, "  target location doesn't exist");
        illegal_action_msg(unit_owner(punit), E_UNIT_ORDERS, punit,
                           order.action, dst_tile, NULL, NULL);

        return TRUE;
      }

      /* Get the target city from the target tile. */
      tgt_city = tile_city(dst_tile);

      if (tgt_city == NULL
          && action_id_get_target_kind(order.action) == ATK_CITY) {
        /* This action targets a city but no city target was found. */

        cancel_orders(punit, "  perform action vs city with no city");
        illegal_action_msg(unit_owner(punit), E_UNIT_ORDERS, punit,
                           order.action, dst_tile, tgt_city, NULL);

        return TRUE;
      }

      /* Get a target unit at the target tile. */
      tgt_unit = action_tgt_unit(punit, dst_tile, TRUE);

      if (tgt_unit == NULL
          && action_id_get_target_kind(order.action) == ATK_UNIT) {
        /* This action targets a unit but no target unit was found. */

        cancel_orders(punit, "  perform action vs unit with no unit");
        illegal_action_msg(unit_owner(punit), E_UNIT_ORDERS, punit,
                           order.action, dst_tile, tgt_city, tgt_unit);

        return TRUE;
      }

      /* No target selected. */
      tgt_id = -1;

      /* Assume impossible until told otherwise. */
      prob = ACTPROB_IMPOSSIBLE;

      switch (action_id_get_target_kind(order.action)) {
      case ATK_UNITS:
        prob = action_prob_vs_units(punit, order.action,
                                    dst_tile);
        tgt_id = dst_tile->index;
        break;
      case ATK_TILE:
        prob = action_prob_vs_tile(punit, order.action,
                                   dst_tile, pextra);
        tgt_id = dst_tile->index;
        break;
      case ATK_CITY:
        prob = action_prob_vs_city(punit, order.action,
                                   tgt_city);
        tgt_id = tgt_city->id;
        break;
      case ATK_UNIT:
        prob = action_prob_vs_unit(punit, order.action,
                                   tgt_unit);

        tgt_id = tgt_unit->id;
        break;
      case ATK_SELF:
        prob = action_prob_self(punit, order.action);

        tgt_id = unitid;
        break;
      case ATK_COUNT:
        log_error("Invalid action target kind");

        /* The check below will abort and cancel the orders because prob
         * was initialized to impossible above this switch statement. */

        break;
      }

      if (!action_prob_possible(prob)) {
        /* The player has enough information to know that this action is
         * against the rules. Don't risk any punishment by trying to
         * perform it. */

        cancel_orders(punit, "  illegal action");
        notify_player(pplayer, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                      _("%s could not do %s to %s."),
                      unit_link(punit),
                      action_id_name_translation(order.action),
                      tile_link(dst_tile));

        /* Try to explain what rule made it illegal. */
        illegal_action_msg(unit_owner(punit), E_BAD_COMMAND, punit,
                           order.action, dst_tile, tgt_city, tgt_unit);

        return TRUE;
      }

      if (action_id_has_result_safe(order.action, ACTION_FOUND_CITY)) {
        /* This action needs a name. */
        name = city_name_suggestion(pplayer, unit_tile(punit));
      } else {
        /* This action doesn't need a name. */
        name = "";
      }

      performed = unit_perform_action(pplayer,
                                      unitid,
                                      tgt_id,
                                      order.sub_target,
                                      name,
                                      order.action,
                                      ACT_REQ_PLAYER);

      if (!player_unit_by_number(pplayer, unitid)) {
        /* The unit "died" while performing the action. */
        return FALSE;
      }

      if (!performed) {
        /* The action wasn't performed as ordered. */

        cancel_orders(punit, "  failed action");
        notify_player(pplayer, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                      _("Orders for %s aborted because "
                        "doing %s %sfailed."),
                      unit_link(punit),
                      action_id_name_translation(order.action),
                      tile_link(dst_tile));

        return TRUE;
      }

      if (action_id_get_act_time(order.action, punit, dst_tile, pextra)
          != ACT_TIME_INSTANTANEOUS) {
        /* Done at turn change. */
        punit->done_moving = TRUE;
        send_unit_info(NULL, punit);
        break;
      }

      break;
    case ORDER_LAST:
      cancel_orders(punit, "  client sent invalid order!");
      notify_player(pplayer, unit_tile(punit), E_UNIT_ORDERS, ftc_server,
                    _("Your %s has invalid orders."),
                    unit_link(punit));
      return TRUE;
    }

    if (last_order) {
      fc_assert(punit->has_orders == FALSE);
      log_debug("  stopping because orders are complete");
      return TRUE;
    }

    if (punit->orders.index == punit->orders.length) {
      fc_assert(punit->orders.repeat);
      /* Start over. */
      log_debug("  repeating orders.");
      punit->orders.index = 0;
    }
  } /* end while */
}

/**********************************************************************//**
  Return the vision the unit will have at the given tile.  The base vision
  range may be modified by effects.

  Note that vision MUST be independent of transported_by for this to work
  properly.
**************************************************************************/
int get_unit_vision_at(struct unit *punit, const struct tile *ptile,
                       enum vision_layer vlayer)
{
  const int base = unit_type_get(punit)->vision_radius_sq;
  const int bonus = get_unittype_bonus(unit_owner(punit), ptile,
                                       unit_type_get(punit),
                                       EFT_UNIT_VISION_RADIUS_SQ, vlayer);
  switch (vlayer) {
  case V_MAIN:
   /* Take base V_MAIN vradius but not < 0, add the bonus, then return
      vradius not less than 0. */
    return MAX(0, MAX(0, base) + bonus);
  case V_INVIS:
  case V_SUBSURFACE:
   /* Take base V_MAIN vradius but not > 2, add bonus not < than -2, then
      return vradius not less than 0. */
    return MAX(0, (CLIP(0, base, 2) + MAX(-2, bonus)));
  case V_COUNT:
    break;
  }

  log_error("Unsupported vision layer variant: %d.", vlayer);
  return 0;
}

/**********************************************************************//**
  Refresh the unit's vision.

  This function has very small overhead and can be called any time effects
  may have changed the vision range of the city.
**************************************************************************/
void unit_refresh_vision(struct unit *punit)
{
  struct vision *uvision = punit->server.vision;
  const struct tile *utile = unit_tile(punit);
  const v_radius_t radius_sq =
      V_RADIUS(get_unit_vision_at(punit, utile, V_MAIN),
               get_unit_vision_at(punit, utile, V_INVIS),
               get_unit_vision_at(punit, utile, V_SUBSURFACE));

  vision_change_sight(uvision, radius_sq);
  ASSERT_VISION(uvision);
}

/**********************************************************************//**
  Refresh the vision of all units in the list - see unit_refresh_vision.
**************************************************************************/
void unit_list_refresh_vision(struct unit_list *punitlist)
{
  unit_list_iterate(punitlist, punit) {
    unit_refresh_vision(punit);
  } unit_list_iterate_end;
}

/**********************************************************************//**
  Used to implement the game rule controlled by the unitwaittime setting.
  Notifies the unit owner if the unit is unable to act.
**************************************************************************/
bool unit_can_do_action_now(const struct unit *punit, char *caller_string)
{
  time_t dt;
  bool give_uwt_message = false;
  bool is_movement_action = (strcmp(caller_string, "unit_move_handling")==0);
  bool is_perform_action = (strcmp(caller_string, "unit_perform_action")==0);

  if (!punit) {
    return FALSE;
  }
  if (game.server.unitwaittime <= 0) {
    return TRUE;
  }
  if (punit->server.action_turn != game.info.turn - 1) {
    return TRUE;
  }

  dt = time(NULL) - punit->server.action_timestamp;

  /* Is unit restricted by UWT? */
  if (dt < game.server.unitwaittime) {
    give_uwt_message = true; /* UWT is on punit: default to give a fail message. */

    /* Exceptions to fail message---------------------- */
    /* Every possible activity will be done after UWT, so don't do fail message.*/
    if ( (game.server.unitwaittime_style & UWT_ACTIVITIES & UWT_DELAY_GOTO)
         && !is_perform_action) /*action not activity*/
    {
      give_uwt_message = false;
    }
    /* UWT_ACTIVITIES is on and it's not a movement or GOTO. Will do activity later. No message.*/
    if ((game.server.unitwaittime_style & UWT_ACTIVITIES)
        && punit->activity != ACTIVITY_IDLE
        && !is_movement_action
        && !is_perform_action /*action not activity*/) {
          give_uwt_message = false;
    }
    /* Exceptions to exceptions------------------------- */
    /* Delay_Goto is OFF and unit was given a GOTO command */
    if ((game.server.unitwaittime_style & !UWT_DELAY_GOTO)
        && (punit->activity == ACTIVITY_IDLE || is_movement_action)
        && punit->has_orders) {
        give_uwt_message = true;
    }
    /* Auto-explore not supported */
    if (punit->activity == ACTIVITY_EXPLORE)
      return TRUE;
    /* Always give fail message if no actions can be queued to do mid-turn:*/
    if (game.server.unitwaittime_style & !UWT_ACTIVITIES) {
      give_uwt_message = true;
    }
    if (give_uwt_message == false) return FALSE; /* Skip message */

    /* Give fail message: */
    char buf[64];
    format_time_duration(game.server.unitwaittime - dt, buf, sizeof(buf));
    // TODO: This is where, if we can somehow know it's a GOTO and not a cursor key
    // to adjacent tile, we can give a specially nice message about unit
    // "orders will be executed in 2 hours, 32 minutes." For now it's && false to
    // block it out:
    if (false && is_movement_action && (game.server.unitwaittime_style & UWT_DELAY_GOTO)) {
      /* UWT_DELAY_GOTO means some actions WILL perform with a delay, others not
        (e.g. investigate city, attack unit) */
      notify_player(unit_owner(punit), unit_tile(punit), E_UNIT_ORDERS,
                    ftc_server, _("[`hourglass`] %s %s has wait time and will move "
                                  " in %s.\n"),
                                  UNIT_EMOJI(punit), unit_link(punit),
                                  buf);
    }
    else {
      if (!is_perform_action) {
        // An activity is being delayed
        notify_player(unit_owner(punit), unit_tile(punit), E_UNIT_ORDERS,
                      ftc_server, _("[`hourglass`] %s %s delayed for %s."
                                  "<span class='e_beginner_help'> See /help unitwaittime.</span>"),
                                  UNIT_EMOJI(punit), unit_link(punit),
                                  buf);
      } else {
        // Simply can't give an action order because we have no delayed fulfillent. You have
        // to wait to give the order.
        notify_player(unit_owner(punit), unit_tile(punit), E_UNIT_ORDERS,
                        ftc_server, _("[`hourglass`] %s %s can't perform actions for %s."
                                    "<span class='e_beginner_help'> See /help unitwaittime.</span>"),
                                    UNIT_EMOJI(punit), unit_link(punit),
                                    buf);
      }
    }
    return FALSE; /* Unit can't do action. */
  }

  /* Unit can do action now */
  return TRUE;
}

/**********************************************************************//**
  Mark a unit as having done something at the current time. This is used
  in conjunction with unit_can_do_action_now() and the unitwaittime setting.
**************************************************************************/
void unit_did_action(struct unit *punit)
{
  if (!punit) {
    return;
  }

  punit->server.action_timestamp = time(NULL);
  punit->server.action_turn = game.info.turn;
}

/**********************************************************************//**
  Units (usually barbarian units) may disband spontaneously if they are
  far from any enemy units or cities. It is to remove barbarians that do
  not engage into any activity for a long time.
**************************************************************************/
bool unit_can_be_retired(struct unit *punit)
{
  /* check if there is enemy nearby */
  square_iterate(&(wld.map), unit_tile(punit), 3, ptile) {
    if (is_enemy_city_tile(ptile, unit_owner(punit))
        || is_enemy_unit_tile(ptile, unit_owner(punit))) {
      return FALSE;
    }
  }
  square_iterate_end;

  return true;
}

/**********************************************************************//**
  If unit type's name is plural, returns true. Otherwise, false.
**************************************************************************/
bool is_unit_plural(struct unit *punit)
{
  if (!punit) return false;

  return is_word_plural( utype_name_translation(unit_type_get(punit)) );
}

/**********************************************************************//**
  Sanity-check unit order arrays from a packet and create a unit_order array
  from their contents if valid.
**************************************************************************/
struct unit_order *create_unit_orders(int length,
                                      const struct unit_order *orders)
{
  int i;
  struct unit_order *unit_orders;

  for (i = 0; i < length; i++) {
    if (orders[i].order < 0 || orders[i].order > ORDER_LAST) {
      log_error("invalid order %d at index %d", orders[i].order, i);
      return NULL;
    }
    switch (orders[i].order) {
    case ORDER_MOVE:
    case ORDER_ACTION_MOVE:
      if (!map_untrusted_dir_is_valid(orders[i].dir)) {
        log_error("in order %d, invalid move direction %d.", i, orders[i].dir);
	return NULL;
      }
      break;
    case ORDER_ACTIVITY:
      switch (orders[i].activity) {
      case ACTIVITY_FALLOUT:
      case ACTIVITY_POLLUTION:
      case ACTIVITY_PILLAGE:
      case ACTIVITY_MINE:
      case ACTIVITY_IRRIGATE:
      case ACTIVITY_PLANT:
      case ACTIVITY_CULTIVATE:
      case ACTIVITY_TRANSFORM:
      case ACTIVITY_CONVERT:
      case ACTIVITY_VIGIL:
	/* Simple activities. */
	break;
      case ACTIVITY_FORTIFYING:
      case ACTIVITY_SENTRY:
        if (i != length - 1) {
          /* Only allowed as the last order. */
          log_error("activity %d is not allowed at index %d.", orders[i].activity,
                    i);
          return NULL;
        }
        break;
      case ACTIVITY_BASE:
        if (!is_extra_caused_by(extra_by_number(orders[i].sub_target),
                                EC_BASE)) {
          log_error("at index %d, %s isn't a base.", i,
                    extra_rule_name(extra_by_number(orders[i].sub_target)));
          return NULL;
        }
        break;
      case ACTIVITY_GEN_ROAD:
        if (!is_extra_caused_by(extra_by_number(orders[i].sub_target),
                                EC_ROAD)) {
          log_error("at index %d, %s isn't a road.", i,
                    extra_rule_name(extra_by_number(orders[i].sub_target)));
          return NULL;
        }
        break;
      /* Not supported yet. */
      case ACTIVITY_EXPLORE:
      case ACTIVITY_IDLE:
      /* Not set from the client. */
      case ACTIVITY_GOTO:
      case ACTIVITY_FORTIFIED:
      /* Compatiblity, used in savegames. */
      case ACTIVITY_OLD_ROAD:
      case ACTIVITY_OLD_RAILROAD:
      case ACTIVITY_FORTRESS:
      case ACTIVITY_AIRBASE:
      /* Unused. */
      case ACTIVITY_PATROL_UNUSED:
      case ACTIVITY_LAST:
        log_error("at index %d, unsupported activity %d.", i, orders[i].activity);
        return NULL;
      }

      if (orders[i].sub_target == EXTRA_NONE
          && unit_activity_needs_target_from_client(orders[i].activity)) {
        /* The orders system can't do server side target assignment for
         * this activity. */
        log_error("activity %d at index %d requires target.", orders[i].activity,
                  i);
        return NULL;
      }

      break;
    case ORDER_PERFORM_ACTION:
      if (!action_id_exists(orders[i].action)) {
        /* Non-existent action. */
        log_error("at index %d, the action %d doesn't exist.", i, orders[i].action);
        return NULL;
      }

      if (action_id_distance_inside_max(orders[i].action, 2)) {
        /* Long range actions aren't supported in unit orders. Clients
         * should order them performed via the unit_do_action packet.
         *
         * Reason: A unit order stores an action's target as the tile it is
         * located on. The tile is stored as a direction (when the target
         * is at a tile adjacent to the actor unit tile) or as no
         * direction (when the target is at the same tile as the actor
         * unit). The order system will pick a suitable target at the
         * specified tile during order execution. This makes it impossible
         * to target something that isn't at or next to the actors tile.
         * Being unable to exploit the full range of an action handicaps
         * it.
         *
         * A patch that allows a distant target in an order should remove
         * this check and update the comment in the Qt client's
         * go_act_menu::create(). */
        log_error("at index %d, the action %s isn't supported in unit "
                  "orders.", i, action_id_name_translation(orders[i].action));
        return NULL;
      }

      if (!action_id_distance_inside_max(orders[i].action, 1)
          && map_untrusted_dir_is_valid(orders[i].dir)) {
        /* Actor must be on the target tile. */
        log_error("at index %d, cannot do %s on a neighbor tile.", i,
                  action_id_rule_name(orders[i].action));
        return NULL;
      }

      /* Validate individual actions. */
      switch ((enum gen_action) orders[i].action) {
      case ACTION_SPY_TARGETED_SABOTAGE_CITY:
      case ACTION_SPY_TARGETED_SABOTAGE_CITY_ESC:
      case ACTION_STRIKE_BUILDING:
        /* Sub target is a building. */
        if (!improvement_by_number(orders[i].sub_target)) {
          /* Sub target is invalid. */
          log_error("at index %d, cannot do %s without a target.", i,
                    action_id_rule_name(orders[i].action));
          return NULL;
        }
        break;
      case ACTION_SPY_TARGETED_STEAL_TECH:
      case ACTION_SPY_TARGETED_STEAL_TECH_ESC:
        if (orders[i].sub_target == A_NONE
            || (!valid_advance_by_number(orders[i].sub_target)
                && orders[i].sub_target != A_FUTURE)) {
          /* Target tech is invalid. */
          log_error("at index %d, cannot do %s without a target.", i,
                    action_id_rule_name(orders[i].action));
          return NULL;
        }
        break;
      case ACTION_ROAD:
      case ACTION_BASE:
      case ACTION_MINE:
      case ACTION_IRRIGATE:
        if (orders[i].sub_target == EXTRA_NONE
            || (orders[i].sub_target < 0
                || orders[i].sub_target >= game.control.num_extra_types)
            || extra_by_number(orders[i].sub_target)->ruledit_disabled) {
          /* Target extra is invalid. */
          log_error("at index %d, cannot do %s without a target.", i,
                    action_id_rule_name(orders[i].action));
          return NULL;
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
      case ACTION_SPY_SABOTAGE_CITY_PRODUCTION:
      case ACTION_SPY_SABOTAGE_CITY_PRODUCTION_ESC:
      case ACTION_SPY_STEAL_TECH:
      case ACTION_SPY_STEAL_TECH_ESC:
      case ACTION_SPY_INCITE_CITY:
      case ACTION_SPY_INCITE_CITY_ESC:
      case ACTION_TRADE_ROUTE:
      case ACTION_MARKETPLACE:
      case ACTION_HELP_WONDER:
      case ACTION_SPY_BRIBE_UNIT:
      case ACTION_SPY_ATTACK:
      case ACTION_SPY_SABOTAGE_UNIT:
      case ACTION_SPY_SABOTAGE_UNIT_ESC:
      case ACTION_CAPTURE_UNITS:
      case ACTION_FOUND_CITY:
      case ACTION_JOIN_CITY:
      case ACTION_STEAL_MAPS:
      case ACTION_STEAL_MAPS_ESC:
      case ACTION_BOMBARD:
      case ACTION_BOMBARD2:
      case ACTION_BOMBARD3:
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
      case ACTION_ATTACK:
      case ACTION_SUICIDE_ATTACK:
      case ACTION_STRIKE_PRODUCTION:
      case ACTION_CONQUER_CITY:
      case ACTION_CONQUER_CITY2:
      case ACTION_PARADROP:
      case ACTION_AIRLIFT:
      case ACTION_HEAL_UNIT:
      case ACTION_TRANSFORM_TERRAIN:
      case ACTION_CULTIVATE:
      case ACTION_PLANT:
      case ACTION_PILLAGE:
      case ACTION_CLEAN_FALLOUT:
      case ACTION_CLEAN_POLLUTION:
      case ACTION_FORTIFY:
      case ACTION_CONVERT:
      case ACTION_TRANSPORT_DEBOARD:
      case ACTION_TRANSPORT_UNLOAD:
      case ACTION_TRANSPORT_DISEMBARK1:
      case ACTION_TRANSPORT_DISEMBARK2:
      case ACTION_TRANSPORT_BOARD:
      case ACTION_TRANSPORT_EMBARK:
      case ACTION_USER_ACTION1:
      case ACTION_USER_ACTION2:
      case ACTION_USER_ACTION3:
        /* No validation required. */
        break;
      /* Invalid action. Should have been caught above. */
      case ACTION_COUNT:
        fc_assert_ret_val_msg(orders[i].action != ACTION_NONE, NULL,
                              "ACTION_NONE in ORDER_PERFORM_ACTION order. "
                              "Order number %d.", i);
      }

      /* Don't validate that the target tile really contains a target or
       * that the actor player's map think the target tile has one.
       * The player may target a something from his player map that isn't
       * there any more, a target he thinks is there even if his player map
       * doesn't have it or even a target he assumes will be there when the
       * unit reaches the target tile.
       *
       * With that said: The client should probably at least have an
       * option to only aim city targeted actions at cities. */

      break;
    case ORDER_FULL_MP:
      break;
    case ORDER_LAST:
      /* An invalid order.  This is handled in execute_orders. */
      break;
    }
  }

  unit_orders = fc_malloc(length * sizeof(*(unit_orders)));
  memcpy(unit_orders, orders, length * sizeof(*(unit_orders)));

  return unit_orders;
}
