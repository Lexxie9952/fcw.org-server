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

/* utility */
#include "astring.h"

/* common */
#include "fc_types.h"
#include "tile.h"

#include "clientutils.h"

/* This module contains functions that would belong to the client,
 * except that in case of freeciv-web, server does handle these
 * for the web client. */

/************************************************************************//**
  Creates the activity progress text for a single unit on its tile.

  This should be kept as identical as possible to 
  concat_tile_activity_text() one function below it. The difference is that
  it doesn't concatenate all the activities of all the units on the tile.
  The number of turns the single punit needs to finish its activity, 
  is passed back via the *finish_turns parameter.
****************************************************************************/
const char *unit_tile_activity_text(struct unit *punit,
                                           int *finish_turns)
{
  if (!punit) return NULL;
  struct tile *ptile = unit_tile(punit);
  int activity_total[ACTIVITY_LAST] = {0};
  int activity_units[ACTIVITY_LAST] = {0};
  int extra_total[MAX_EXTRA_TYPES] = {0};
  int extra_units[MAX_EXTRA_TYPES] = {0};
  int rmextra_total[MAX_EXTRA_TYPES] = {0};
  int rmextra_units[MAX_EXTRA_TYPES] = {0};
  int remains, turns = 0;
  static struct astring str = ASTRING_INIT;
  astr_clear(&str);

  unit_list_iterate(ptile->units, aunit) {
    if (is_clean_activity(aunit->activity)) {
      int eidx = extra_index(aunit->activity_target);
      rmextra_total[eidx] += aunit->activity_count;
      rmextra_total[eidx] += get_activity_rate_this_turn(aunit);
      rmextra_units[eidx] += get_activity_rate(aunit);
    } else if (is_build_activity(aunit->activity, ptile)) {
      int eidx = extra_index(aunit->activity_target);
      extra_total[eidx] += aunit->activity_count;
      extra_total[eidx] += get_activity_rate_this_turn(aunit);
      extra_units[eidx] += get_activity_rate(aunit);
    } else {
      activity_total[aunit->activity] += aunit->activity_count;
      activity_total[aunit->activity] += get_activity_rate_this_turn(aunit);
      activity_units[aunit->activity] += get_activity_rate(aunit);
    }
  } unit_list_iterate_end;

  enum unit_activity i = punit->activity;

  if (is_build_activity(i, ptile)) {
    enum extra_cause cause = EC_NONE;
    switch (i) {
    case ACTIVITY_GEN_ROAD:
      cause = EC_ROAD;
      break;
    case ACTIVITY_BASE:
      cause = EC_BASE;
      break;
    case ACTIVITY_IRRIGATE:
      cause = EC_IRRIGATION;
      break;
    case ACTIVITY_MINE:
      cause = EC_MINE;
      break;
    default:
      fc_assert(cause != EC_NONE);
      break;
    };
    if (cause != EC_NONE) {
      int ei = extra_index(punit->activity_target);
      if (extra_units[ei] > 0) {
        remains = tile_activity_time(i, ptile, punit->activity_target) - extra_total[ei];
        if (remains > 0) {
          turns = 1 + (remains + extra_units[ei] - 1) / extra_units[ei];
        } else {
          /* extra will be finished this turn */
          turns = 1;
        }
        astr_add(&str, "%s(%d)", extra_name_translation(punit->activity_target), turns);
      }
    }
  } else if (is_clean_activity(i)) {
    enum extra_rmcause rmcause = ERM_NONE;
    switch (i) {
    case ACTIVITY_PILLAGE:
      rmcause = ERM_PILLAGE;
      break;
    case ACTIVITY_POLLUTION:
      rmcause = ERM_CLEANPOLLUTION;
      break;
    case ACTIVITY_FALLOUT:
      rmcause = ERM_CLEANFALLOUT;
      break;
    default:
      fc_assert(rmcause != ERM_NONE);
      break;
    };
    if (rmcause != ERM_NONE) {
      extra_type_by_rmcause_iterate(rmcause, ep) {
        int ei = extra_index(ep);

        if (rmextra_units[ei] > 0) {
          remains = tile_activity_time(i, ptile, ep) - rmextra_total[ei];
          if (remains > 0) {
            turns = 1 + (remains + rmextra_units[ei] - 1) / rmextra_units[ei];
          } else {
            /* extra will be removed this turn */
            turns = 1;
          }
          astr_add(&str, rmcause == ERM_PILLAGE ? _("Pillage %s(%d)") : _("Clean %s(%d)"),
                    extra_name_translation(ep), turns);
        }
      } extra_type_by_rmcause_iterate_end;
    }
  } else if (is_tile_activity(i)) {
    if (activity_units[i] > 0) {
      remains = tile_activity_time(i, ptile, NULL) - activity_total[i];
      if (remains > 0) {
        turns = 1 + (remains + activity_units[i] - 1) / activity_units[i];
      } else {
        /* activity will be finished this turn */
        turns = 1;
      }
      astr_add(&str, "%s(%d)", get_activity_text(i), turns);
    }
  }
  *finish_turns = turns;
  return astr_str(&str);
}

/************************************************************************//**
  Creates the activity progress text for the given tile.

  Caller is responsible now for passing an int *, this empowers other
  code to also use this function to calculate turns left on the tile.

  FIXME: Any changes to this should be transferred as identical as possible
  to the unit_tile_activity_text() function directly above, which does
  the same as this, but for a single punit (it doesn't concatenate multiple
  unit activities.)
****************************************************************************/
const char *concat_tile_activity_text(struct tile *ptile)
{
  int activity_total[ACTIVITY_LAST];
  int activity_units[ACTIVITY_LAST];
  int extra_total[MAX_EXTRA_TYPES];
  int extra_units[MAX_EXTRA_TYPES];
  int rmextra_total[MAX_EXTRA_TYPES];
  int rmextra_units[MAX_EXTRA_TYPES];
  int num_activities = 0;
  int remains, turns;
  static struct astring str = ASTRING_INIT;

  astr_clear(&str);

  memset(activity_total, 0, sizeof(activity_total));
  memset(activity_units, 0, sizeof(activity_units));
  memset(extra_total, 0, sizeof(extra_total));
  memset(extra_units, 0, sizeof(extra_units));
  memset(rmextra_total, 0, sizeof(rmextra_total));
  memset(rmextra_units, 0, sizeof(rmextra_units));

  unit_list_iterate(ptile->units, punit) {
    if (is_clean_activity(punit->activity)) {
      int eidx = extra_index(punit->activity_target);

      rmextra_total[eidx] += punit->activity_count;
      rmextra_total[eidx] += get_activity_rate_this_turn(punit);
      rmextra_units[eidx] += get_activity_rate(punit);
    } else if (is_build_activity(punit->activity, ptile)) {
      int eidx = extra_index(punit->activity_target);

      extra_total[eidx] += punit->activity_count;
      extra_total[eidx] += get_activity_rate_this_turn(punit);
      extra_units[eidx] += get_activity_rate(punit);
    } else {
      activity_total[punit->activity] += punit->activity_count;
      activity_total[punit->activity] += get_activity_rate_this_turn(punit);
      activity_units[punit->activity] += get_activity_rate(punit);
    }
  } unit_list_iterate_end;

  activity_type_iterate(i) {
    if (is_build_activity(i, ptile)) {
      enum extra_cause cause = EC_NONE;

      switch (i) {
      case ACTIVITY_GEN_ROAD:
        cause = EC_ROAD;
        break;
      case ACTIVITY_BASE:
        cause = EC_BASE;
        break;
      case ACTIVITY_IRRIGATE:
        cause = EC_IRRIGATION;
        break;
      case ACTIVITY_MINE:
        cause = EC_MINE;
        break;
      default:
        fc_assert(cause != EC_NONE);
        break;
      };

      if (cause != EC_NONE) {
        extra_type_by_cause_iterate(cause, ep) {
          int ei = extra_index(ep);

          if (extra_units[ei] > 0) {
            remains = tile_activity_time(i, ptile, ep) - extra_total[ei];
            if (remains > 0) {
              turns = 1 + (remains + extra_units[ei] - 1) / extra_units[ei];
            } else {
              /* extra will be finished this turn */
              turns = 1;
            }
            if (num_activities > 0) {
              astr_add(&str, "/");
            }
            astr_add(&str, "%s(%d)", extra_name_translation(ep), turns);
            num_activities++;
          }
        } extra_type_by_cause_iterate_end;
      }
    } else if (is_clean_activity(i)) {
      enum extra_rmcause rmcause = ERM_NONE;

      switch (i) {
      case ACTIVITY_PILLAGE:
        rmcause = ERM_PILLAGE;
        break;
      case ACTIVITY_POLLUTION:
        rmcause = ERM_CLEANPOLLUTION;
        break;
      case ACTIVITY_FALLOUT:
        rmcause = ERM_CLEANFALLOUT;
        break;
      default:
        fc_assert(rmcause != ERM_NONE);
        break;
      };

      if (rmcause != ERM_NONE) {
        extra_type_by_rmcause_iterate(rmcause, ep) {
          int ei = extra_index(ep);

          if (rmextra_units[ei] > 0) {
            remains = tile_activity_time(i, ptile, ep) - rmextra_total[ei];
            if (remains > 0) {
              turns = 1 + (remains + rmextra_units[ei] - 1) / rmextra_units[ei];
            } else {
              /* extra will be removed this turn */
              turns = 1;
            }
            if (num_activities > 0) {
              astr_add(&str, "/");
            }
            astr_add(&str, rmcause == ERM_PILLAGE ? _("Pillage %s(%d)") : _("Clean %s(%d)"),
                     extra_name_translation(ep), turns);
            num_activities++;
          }
        } extra_type_by_rmcause_iterate_end;
      }
    } else if (is_tile_activity(i)) {
      if (activity_units[i] > 0) {
        remains = tile_activity_time(i, ptile, NULL) - activity_total[i];
        if (remains > 0) {
          turns = 1 + (remains + activity_units[i] - 1) / activity_units[i];
        } else {
          /* activity will be finished this turn */
          turns = 1;
        }
        if (num_activities > 0) {
          astr_add(&str, "/");
        }
        astr_add(&str, "%s(%d)", get_activity_text(i), turns);
        num_activities++;
      }
    }
  } activity_type_iterate_end;

  return astr_str(&str);
}
