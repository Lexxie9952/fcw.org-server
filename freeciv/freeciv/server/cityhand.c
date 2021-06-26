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
#include "fcintl.h"
#include "log.h"
#include "mem.h"
#include "rand.h"
#include "support.h"

/* common */
#include "city.h"
#include "events.h"
#include "game.h"
#include "idex.h"
#include "map.h"
#include "player.h"
#include "specialist.h"
#include "unit.h"
#include "worklist.h"

/* common/aicore */
#include "cm.h"

/* server */
#include "citytools.h"
#include "cityturn.h"
#include "notify.h"
#include "plrhand.h"
#include "sanitycheck.h"
#include "unithand.h"
#include "unittools.h"

#include "cityhand.h"

/**********************************************************************//**
  Send city_name_suggestion packet back to requesting conn, with
  suggested name and with same id which was passed in (either unit id
  for city builder or existing city id for rename, we don't care here).
**************************************************************************/
void handle_city_name_suggestion_req(struct player *pplayer, int unit_id)
{
  struct unit *punit = player_unit_by_number(pplayer, unit_id);
  enum city_build_result res;

  if (NULL == punit) {
    /* Probably died or bribed. */
    log_verbose("handle_city_name_suggestion_req() invalid unit %d",
                unit_id);
    return;
  }

  if (action_prob_possible(action_prob_vs_tile(punit, ACTION_FOUND_CITY,
                                               unit_tile(punit), NULL))) {
    log_verbose("handle_city_name_suggest_req(unit_pos (%d, %d))",
                TILE_XY(unit_tile(punit)));
    dlsend_packet_city_name_suggestion_info(pplayer->connections, unit_id,
        city_name_suggestion(pplayer, unit_tile(punit)));

    /* The rest of this function is error handling. */
    return;
  }

  res = city_build_here_test(unit_tile(punit), punit);

  switch (res) {
  case CB_OK:
    /* No action enabler permitted the city to be built. */
  case CB_BAD_CITY_TERRAIN:
  case CB_BAD_UNIT_TERRAIN:
  case CB_BAD_BORDERS:
  case CB_NO_MIN_DIST:
    log_verbose("handle_city_name_suggest_req(unit_pos (%d, %d)): "
                "cannot build there.", TILE_XY(unit_tile(punit)));

    illegal_action_msg(pplayer, E_BAD_COMMAND, punit, ACTION_FOUND_CITY,
                       unit_tile(punit), NULL, NULL);
    break;
  }
}

/**********************************************************************//**
  Handle request to change specialist type
**************************************************************************/
void handle_city_change_specialist(struct player *pplayer, int city_id,
				   Specialist_type_id from,
				   Specialist_type_id to)
{
  struct city *pcity = player_city_by_number(pplayer, city_id);
  if (!pcity) {
    return;
  }
  
  bool change_all = false;
  /* Adding 100 to Specialist_type_id "to", requests to change all specialists.
    Semi-ugly but maintains compatibility between client/server versions. */
  if (to >= 100) {
    to -= 100;
    change_all = true;
  }

  if (to < 0 || to >= specialist_count()
      || from < 0 || from >= specialist_count()
      || !city_can_use_specialist(pcity, to)
      || pcity->specialists[from] == 0) {
    /* This could easily just be due to clicking faster on the specialist
     * than the server can cope with. */
    log_verbose("Error in specialist change request from client.");
    return;
  }

  if (change_all) {
    pcity->specialists[to] += pcity->specialists[from];
    pcity->specialists[from] = 0;
  } else {
    pcity->specialists[from]--;
    pcity->specialists[to]++;
  }

  city_refresh(pcity);
  sanity_check_city(pcity);
  send_city_info(pplayer, pcity);
}

/**********************************************************************//**
  Handle request to change city worker in to specialist.
**************************************************************************/
void handle_city_make_specialist(struct player *pplayer,
                                 int city_id, int tile_id)
{
  int specalist_to = DEFAULT_SPECIALIST;

#ifdef FREECIV_WEB
  // FCW uses top 3 bits to represent default specialist, thus city_id is really
  // a 12-bit number. Perhaps later we should just send a specalist_to param
  // if we ever have games over 8000 cities.  But for now this maintains packet
  // compatibility
  if (city_id > 32768) {city_id -= 32768; specalist_to += 4;}
  if (city_id > 16384) {city_id -= 16384; specalist_to += 2;}
  if (city_id >  8192) {city_id -=  8192; specalist_to += 1;}
#endif

  struct tile *ptile = index_to_tile(&(wld.map), tile_id);
  struct city *pcity = player_city_by_number(pplayer, city_id);


  if (NULL == pcity) {
    /* Probably lost. */
    log_verbose("handle_city_make_specialist() bad city number %d.",
                city_id);
    return;
  }

  if (NULL == ptile) {
    log_error("handle_city_make_specialist() bad tile number %d.", tile_id);
    return;
  }

  if (!city_map_includes_tile(pcity, ptile)) {
    log_error("handle_city_make_specialist() tile (%d, %d) not in the "
              "city map of \"%s\".", TILE_XY(ptile), city_name_get(pcity));
    return;
  }

  if (is_free_worked(pcity, ptile)) {
    auto_arrange_workers(pcity);
  } else if (tile_worked(ptile) == pcity) {
    city_map_update_empty(pcity, ptile);
    pcity->specialists[specalist_to]++;
  } else {
    log_verbose("handle_city_make_specialist() not working (%d, %d) "
                "\"%s\".", TILE_XY(ptile), city_name_get(pcity));
  }

  city_refresh(pcity);
  sanity_check_city(pcity);
  sync_cities();
}

/**********************************************************************//**
  Handle request to turn specialist in to city worker. Client cannot
  tell which kind of specialist is to be taken, but this just makes worker
  from first available specialist.
**************************************************************************/
void handle_city_make_worker(struct player *pplayer,
                             int city_id, int tile_id)
{
  struct tile *ptile = index_to_tile(&(wld.map), tile_id);
  struct city *pcity = player_city_by_number(pplayer, city_id);

  if (NULL == pcity) {
    /* Probably lost. */
    log_verbose("handle_city_make_worker() bad city number %d.",city_id);
    return;
  }

  if (NULL == ptile) {
    log_error("handle_city_make_worker() bad tile number %d.", tile_id);
    return;
  }

  if (!city_map_includes_tile(pcity, ptile)) {
    log_error("handle_city_make_worker() tile (%d, %d) not in the "
              "city map of \"%s\".", TILE_XY(ptile), city_name_get(pcity));
    return;
  }

  if (is_free_worked(pcity, ptile)) {
    auto_arrange_workers(pcity);
    sync_cities();
    return;
  }

  if (tile_worked(ptile) == pcity) {
    log_verbose("handle_city_make_worker() already working (%d, %d) \"%s\".",
                TILE_XY(ptile), city_name_get(pcity));
    return;
  }

  if (0 == city_specialists(pcity)) {
    log_verbose("handle_city_make_worker() no specialists (%d, %d) \"%s\".",
                TILE_XY(ptile), city_name_get(pcity));
    return;
  }

  if (!city_can_work_tile(pcity, ptile)) {
    log_verbose("handle_city_make_worker() cannot work here (%d, %d) \"%s\".",
                TILE_XY(ptile), city_name_get(pcity));
    return;
  }

  city_map_update_worker(pcity, ptile);

  specialist_type_iterate(i) {
    if (pcity->specialists[i] > 0) {
      pcity->specialists[i]--;
      break;
    }
  } specialist_type_iterate_end;

  city_refresh(pcity);
  sanity_check_city(pcity);
  sync_cities();
}

/**********************************************************************//**
  Handle improvement selling request. Caller is responsible to validate
  input before passing to this function if it comes from untrusted source.
**************************************************************************/
void really_handle_city_sell(struct player *pplayer, struct city *pcity,
			     struct impr_type *pimprove)
{
  enum test_result sell_result;
  int price;

  sell_result = test_player_sell_building_now(pplayer, pcity, pimprove);

  if (sell_result == TR_ALREADY_SOLD) {
    notify_player(pplayer, pcity->tile, E_BAD_COMMAND, ftc_server,
		  _("You have already sold something here this turn."));
    return;
  }

  if (sell_result != TR_SUCCESS) {
    return;
  }

  pcity->did_sell=TRUE;
  price = do_sell_building(pplayer, pcity, pimprove, "sold");
  notify_player(pplayer, pcity->tile, E_IMP_SOLD, ftc_server,
                PL_("[`gold`] You sell %s in %s for %d gold.",
                    "[`gold`] You sell %s in %s for %d gold.", price),
                improvement_name_translation(pimprove),
                city_link(pcity), price);
  
  city_refresh(pcity);

  /* If we sold the walls the other players should see it */
  send_city_info(NULL, pcity);
  send_player_info_c(pplayer, pplayer->connections);
}

/**********************************************************************//**
  Handle improvement selling request. This function does check its
  parameters as they may come from untrusted source over the network.
**************************************************************************/
void handle_city_sell(struct player *pplayer, int city_id, int build_id)
{
  struct city *pcity = player_city_by_number(pplayer, city_id);
  struct impr_type *pimprove = improvement_by_number(build_id);

  if (!pcity || !pimprove) {
    return;
  }
  really_handle_city_sell(pplayer, pcity, pimprove);
}

/**********************************************************************//**
  Handle buying request. Caller is responsible to validate input before
  passing to this function if it comes from untrusted source.
**************************************************************************/
void really_handle_city_buy(struct player *pplayer, struct city *pcity)
{
  int cost, total;

  /* This function corresponds to city_can_buy() in the client. */

  fc_assert_ret(pcity && player_owns_city(pplayer, pcity));
 
  if (pcity->turn_founded == game.info.turn) {
    notify_player(pplayer, pcity->tile, E_BAD_COMMAND, ftc_server,
                  _("Cannot buy in city created this turn."));
    return;
  }

  if (pcity->did_buy) {
    notify_player(pplayer, pcity->tile, E_BAD_COMMAND, ftc_server,
		  _("You have already bought this turn."));
    return;
  }

  if (city_production_has_flag(pcity, IF_GOLD)) {
    notify_player(pplayer, pcity->tile, E_BAD_COMMAND, ftc_server,
                  _("You don't buy %s!"),
                  improvement_name_translation(pcity->production.value.building));
    return;
  }

  if (VUT_UTYPE == pcity->production.kind && pcity->anarchy != 0 && pcity->hangry != 0) {
    notify_player(pplayer, pcity->tile, E_BAD_COMMAND, ftc_server,
                  _("😡 Can't buy units when city is in disorder."));
    return;
  }
  if (game.server.fulldisorder && VUT_IMPROVEMENT == pcity->production.kind 
      && pcity->anarchy != 0 && pcity->hangry != 0) {
    notify_player(pplayer, pcity->tile, E_BAD_COMMAND, ftc_server,
                  _("😡 Can't buy buildings when city is in disorder."));
    return;
  }

  total = city_production_build_shield_cost(pcity);
  cost = city_production_buy_gold_cost(pcity);
  if (cost <= 0) {
    return; /* sanity */
  }
  if (cost > pplayer->economic.gold) {
    /* In case something changed while player tried to buy, or player 
     * tried to cheat! */
    /* Split into two to allow localization of two pluralisations. */
    char buf[MAX_LEN_MSG];
    /* TRANS: This whole string is only ever used when included in one
     * other string (search for this string to find it). */
    fc_snprintf(buf, ARRAY_SIZE(buf), PL_("%d gold required.",
                                          "%d gold required.",
                                          cost), cost);
    notify_player(pplayer, pcity->tile, E_BAD_COMMAND, ftc_server,
                  /* TRANS: %s is a pre-pluralised string:
                   * "%d gold required." */
                  PL_("%s You only have %d gold.",
                      "%s You only have %d gold.", pplayer->economic.gold),
                  buf, pplayer->economic.gold);
    return;
  }

  pplayer->economic.gold -= cost;
  if (pcity->shield_stock < total) {
    /* As we never put penalty on disbanded_shields, we can
     * fully well add the missing shields there. */
    pcity->disbanded_shields += total - pcity->shield_stock;
    pcity->shield_stock=total; /* AI wants this -- Syela */
    pcity->did_buy = TRUE;	/* !PS: no need to set buy flag otherwise */
  }
  city_refresh(pcity);

  if (VUT_UTYPE == pcity->production.kind) {
    notify_player(pplayer, pcity->tile, E_UNIT_BUY, ftc_server,
                  /* TRANS: bought an unit. */
                  Q_("?unit:[`gold`] You bought %s in %s for %d gold."),
                  utype_name_translation(pcity->production.value.utype),
                  city_name_get(pcity), cost);
  } else if (VUT_IMPROVEMENT == pcity->production.kind) {
    notify_player(pplayer, pcity->tile, E_IMP_BUY, ftc_server,
                  /* TRANS: bought an improvement .*/
                  Q_("?improvement:[`gold`] You bought %s in %s for %d gold."),
                  improvement_name_translation(pcity->production.value.building),
                  city_name_get(pcity), cost);
  }

  conn_list_do_buffer(pplayer->connections);
  send_city_info(pplayer, pcity);
  send_player_info_c(pplayer, pplayer->connections);
  conn_list_do_unbuffer(pplayer->connections);
}

/**********************************************************************//**
  Handle city worklist update request
**************************************************************************/
void handle_city_worklist(struct player *pplayer, int city_id,
                          const struct worklist *worklist)
{
  struct city *pcity = player_city_by_number(pplayer, city_id);

  if (!pcity) {
    return;
  }

  worklist_copy(&pcity->worklist, worklist);

  send_city_info(pplayer, pcity);
}

/**********************************************************************//**
  Handle buying request. This function does properly check its input as
  it may come from untrusted source over the network.
**************************************************************************/
void handle_city_buy(struct player *pplayer, int city_id)
{
  struct city *pcity = player_city_by_number(pplayer, city_id);

  if (!pcity) {
    return;
  }

  really_handle_city_buy(pplayer, pcity);
}

/**********************************************************************//**
  Handle city refresh request
**************************************************************************/
void handle_city_refresh(struct player *pplayer, int city_id)
{
  if (city_id != 0) {
    struct city *pcity = player_city_by_number(pplayer, city_id);

    if (!pcity) {
      return;
    }

    city_refresh(pcity);
    send_city_info(pplayer, pcity);
  } else {
    city_refresh_for_player(pplayer);
  }
}

/**********************************************************************//**
  Handle request to change current production.
**************************************************************************/
void handle_city_change(struct player *pplayer, int city_id,
                        int production_kind, int production_value)
{
  struct universal prod;
  struct city *pcity = player_city_by_number(pplayer, city_id);

  if (!universals_n_is_valid(production_kind)) {
    log_error("[%s] bad production_kind %d.", __FUNCTION__,
              production_kind);
    prod.kind = VUT_NONE;
    return;
  } else {
    prod = universal_by_number(production_kind, production_value);
    if (!universals_n_is_valid(prod.kind)) {
      log_error("[%s] production_kind %d with bad production_value %d.",
                __FUNCTION__, production_kind, production_value);
      prod.kind = VUT_NONE;
      return;
    }
  }

  if (!pcity) {
    return;
  }

  if (are_universals_equal(&pcity->production, &prod)) {
    /* The client probably shouldn't send such a packet. */
    return;
  }

  if (!can_city_build_now(pcity, &prod)) {
    return;
  }
  if (!city_can_change_build(pcity)) {
    notify_player(pplayer, pcity->tile, E_BAD_COMMAND, ftc_server,
                  _("You have bought this turn, can't change."));
    return;
  }

  change_build_target(pplayer, pcity, &prod, E_CITY_PRODUCTION_CHANGED);

  city_refresh(pcity);
  sanity_check_city(pcity);
  send_city_info(pplayer, pcity);
}

/**********************************************************************//**
  'struct packet_city_rename' handler.
**************************************************************************/
void handle_city_rename(struct player *pplayer, int city_id,
                        const char *name)
{
  struct city *pcity = player_city_by_number(pplayer, city_id);
  char message[1024];

  if (!pcity) {
    return;
  }

  if (!is_allowed_city_name(pplayer, name, message, sizeof(message))) {
    notify_player(pplayer, pcity->tile, E_BAD_COMMAND,
                  ftc_server, "%s", message);
    return;
  }

  sz_strlcpy(pcity->name, name);
  city_refresh(pcity);
  send_city_info(NULL, pcity);
}

/**********************************************************************//**
  Handles a packet from the client that requests the city options for the
  given city be changed.
**************************************************************************/
void handle_city_options_req(struct player *pplayer, int city_id,
			     bv_city_options options)
{
  struct city *pcity = player_city_by_number(pplayer, city_id);

  if (!pcity) {
    return;
  }

  pcity->city_options = options;

  send_city_info(pplayer, pcity);
}

/**********************************************************************//**
  Handles a request to set city manager parameter.
**************************************************************************/
void handle_city_manager(struct player *pplayer, int city_id, bool enabled,
                         bool apply_once, struct cm_parameter parameter)
{
  struct city *pcity = player_city_by_number(pplayer, city_id);

/* debug
      notify_player(city_owner(pcity), city_tile(pcity),
            E_CITY_PRODUCTION_CHANGED, ftc_server,
            _("handle_city_manager received CMA parameter:\n"
              "apply_once         %d\n"
              "allow_disorder:    %d\n"
              "allow_specialists: %d\n"
              "max_growth:        %d\n"
              "happy_factor:      %d\n"
              "require_happy:     %d\n"
              "factors:           %d,%d,%d,%d,%d,%d\n"
              "min.surplus:       %d,%d,%d,%d,%d,%d\n"),
              apply_once,
              parameter.allow_disorder,
              parameter.allow_specialists,
              parameter.max_growth,
              parameter.happy_factor,
              parameter.require_happy,
              parameter.factor[0],parameter.factor[1],parameter.factor[2],parameter.factor[3],parameter.factor[4],parameter.factor[5],
              parameter.minimal_surplus[0],parameter.minimal_surplus[1],parameter.minimal_surplus[2],parameter.minimal_surplus[3],
                parameter.minimal_surplus[4],parameter.minimal_surplus[5]);
                */

  if (NULL == pcity) {
    /* Probably lost. */
    log_verbose("handle_city_manager() bad city number %d.", city_id);
    return;
  }

  // User requested a normal change to city governor, which we'll do here:
  if (apply_once==false) {
    // User is requesting to release the governor:
    if (!enabled) {
      if (pcity->cm_parameter) {
        free(pcity->cm_parameter);
        pcity->cm_parameter = NULL;
        send_city_info(pplayer, pcity);
        notify_player(city_owner(pcity), city_tile(pcity),
              E_CITY_CMA_RELEASE, ftc_server,
              _("🔹 Retired the Governor in %s."),
              city_link(pcity));
      }
      return;
    }
    // User is requesting to apply a new city governor:
    if (!pcity->cm_parameter) {
      pcity->cm_parameter = fc_calloc(1, sizeof(struct cm_parameter));
    }
    cm_copy_parameter(pcity->cm_parameter, &parameter);
    auto_arrange_workers(pcity);
    sync_cities();
    send_city_info(pplayer, pcity);
    if (pcity->cm_parameter) { // notify only if successful.
      notify_player(city_owner(pcity), city_tile(pcity),
                E_CITY_CMA_RELEASE, ftc_server,
                _("🔹 Governor successfully assigned to %s."),
                city_link(pcity));
    }
    return;
  }

  // User requested to apply this parameter only one time, without altering any of the current configuration.
  else {   
      struct cm_parameter backup_parameter;
      bool was_enabled = false;  // whether governor was formerly on or not

      if (!pcity->cm_parameter) {
        // wasn't enabled, so create a new parameter for this city.
        pcity->cm_parameter = fc_calloc(1, sizeof(struct cm_parameter));
        // There will be no backup paramter because was_enabled will be false.
      } else {
         // was enabled: remember that fact, and how it used to be so we can re-apply it after:
        was_enabled = true;
        backup_parameter = *(pcity->cm_parameter);
        //cm_copy_parameter(&backup_parameter, pcity->cm_parameter);
      }
      // Now arrange the city, once, according to the user supplied parameter:
      cm_copy_parameter(pcity->cm_parameter, &parameter);
      auto_arrange_workers(pcity);

      // Handle all the permutations of accepted/rejected parameter based on former
      // state of the city:

      // Cases where the city had no former CMA:
      if (!was_enabled) {
         /* CASE 1. CMA wasn't enabled and temporary order was accepted. Disable 
            the "virtual temporary" CMA while thanking it for arranging our tiles */
         if (pcity->cm_parameter) {
          free(pcity->cm_parameter);
          pcity->cm_parameter = NULL;
          send_city_info(pplayer, pcity);
          notify_player(city_owner(pcity), city_tile(pcity),
                      E_CITY_CMA_RELEASE, ftc_server,
                      _("🔹 %s, which has no Governor, has accepted your interim orders."),
                      city_link(pcity));
          return;
        }
        /* CASE 2: CMA wasn't enabled and temporary order was rejected.
           Help player to make sense of what happened. */ 
        else {
          send_city_info(pplayer, pcity);
          notify_player(city_owner(pcity), city_tile(pcity),
                      E_CITY_CMA_RELEASE, ftc_server,
                      _("🔹 (Interim Orders for %s were not attainable.)"),
                      city_link(pcity));
          return;
        }
      }
      /* CMA was enabled before: undo virtual temporary cm_parameter and restore 
         everything how it used to be: */
      else {
        /* CASE 3. CMA was enabled before and if it is still enabled, it means 
           temporary orders were accepted. */
        if (pcity->cm_parameter) {
          // Restore the old parameter  
          cm_copy_parameter(pcity->cm_parameter, &backup_parameter);
          sync_cities();
          send_city_info(pplayer, pcity);
          notify_player(city_owner(pcity), city_tile(pcity),
                      E_CITY_CMA_RELEASE, ftc_server,
                      _("🔹 Interim orders accepted by the Governor of %s."),
                      city_link(pcity));
          return;
        }
        /* CASE 4. CMA was enabled before and now it's disabled. This means the
           city released the virtual temporary governor and disabled the city's
           CMA. Clean up and restore everything back to sensibility. */  
        else { 
            /* Construct the backup cm_parameter as if it's the creation of a whole
              new Governor. */
            if (!pcity->cm_parameter) {
              pcity->cm_parameter = fc_calloc(1, sizeof(struct cm_parameter));
            }
            cm_copy_parameter(pcity->cm_parameter, &backup_parameter);
            auto_arrange_workers(pcity); // Back to how we were before failing 
            sync_cities();
            send_city_info(pplayer, pcity);
            notify_player(city_owner(pcity), city_tile(pcity),
                      E_CITY_CMA_RELEASE, ftc_server,
                      _("🔹 Failed interim orders means the old Governor of %s was re-hired."),
                      city_link(pcity));
            return;
        }
      }      
  }
}

/**********************************************************************//**
  Handles a request to set city rally point for new units.
**************************************************************************/
void handle_city_rally_point(struct player *pplayer,
                             int city_id, int length,
                             bool persistent, bool vigilant,
                             const struct unit_order *orders)
{
  struct city *pcity = player_city_by_number(pplayer, city_id);
  struct unit_order *checked_orders;

  if (NULL == pcity) {
    /* Probably lost. */
    log_verbose("handle_city_rally_point() bad city number %d.",
                city_id);
    return;
  }

  if (0 > length || MAX_LEN_ROUTE < length) {
    /* Shouldn't happen */
    log_error("handle_city_rally_point() invalid packet length %d (max %d)",
              length, MAX_LEN_ROUTE);
    return;
  }

  pcity->rally_point.length = length;

  if (length == 0) {
    pcity->rally_point.vigilant = FALSE;
    pcity->rally_point.persistent = FALSE;
    if (pcity->rally_point.orders) {
      free(pcity->rally_point.orders);
      pcity->rally_point.orders = NULL;
    }
  } else {
    checked_orders = create_unit_orders(length, orders);
    if (!checked_orders) {
      pcity->rally_point.length = 0;
      log_error("invalid rally point orders for city number %d.",
                city_id);
      return;
    }

    pcity->rally_point.persistent = persistent;
    pcity->rally_point.vigilant = vigilant;
    pcity->rally_point.orders = checked_orders;
  }

  send_city_info(pplayer, pcity);
}
