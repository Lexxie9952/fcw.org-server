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
#ifndef FC__CLIMISC_H
#define FC__CLIMISC_H

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

/* common */
#include "fc_types.h"
#include "featured_text.h"      /* struct ft_color */
#include "events.h"
#include "unittype.h"
#include "unitlist.h"

struct Clause;
struct nation_type;
struct nation_set;

typedef int cid;

void client_remove_player(int plrno);
void client_remove_city(struct city *pcity);
void client_remove_unit(struct unit *punit);

void client_change_all(struct universal *from,
                       struct universal *to);

const char *get_embassy_status(const struct player *me,
				const struct player *them);
const char *get_vision_status(const struct player *me,
				const struct player *them);
void client_diplomacy_clause_string(char *buf, int bufsiz,
				    struct Clause *pclause);

void global_warming_scaled(int *chance, int *rate, int max);
void nuclear_winter_scaled(int *chance, int *rate, int max);

struct sprite *client_research_sprite(void);
struct sprite *client_warming_sprite(void);
struct sprite *client_cooling_sprite(void);
struct sprite *client_government_sprite(void);

void center_on_something(void);

/* 
 * A compound id (cid) can hold all objects a city can build:
 * improvements (with wonders) and units. This is achieved by
 * seperation the value set: a cid < B_LAST denotes a improvement
 * (including wonders). A cid >= B_LAST denotes a unit with the
 * unit_type_id of (cid - B_LAST).
 */

cid cid_encode(struct universal target);
cid cid_encode_unit(const struct unit_type *punittype);
cid cid_encode_building(const struct impr_type *pimprove);
cid cid_encode_from_city(const struct city *pcity);

struct universal cid_decode(cid cid);
#define cid_production cid_decode

bool city_unit_supported(const struct city *pcity,
                         const struct universal *target);
bool city_unit_present(const struct city *pcity,
                       const struct universal *target);
bool city_building_present(const struct city *pcity,
                           const struct universal *target);

struct item {
  struct universal item;
  char descr[MAX_LEN_NAME + 40];
};

typedef bool (*TestCityFunc)(const struct city *, const struct universal *);

#define MAX_NUM_PRODUCTION_TARGETS (U_LAST + B_LAST)
void name_and_sort_items(struct universal *targets, int num_items,
                         struct item *items,
                         bool show_cost, struct city *pcity);
int collect_production_targets(struct universal *targets,
                               struct city **selected_cities,
                               int num_selected_cities, bool append_units,
                               bool append_wonders, bool change_prod,
                               TestCityFunc test_func);
int collect_currently_building_targets(struct universal *targets);
int collect_buildable_targets(struct universal *targets);
int collect_eventually_buildable_targets(struct universal *targets,
                                         struct city *pcity,
                                         bool advanced_tech);
int collect_already_built_targets(struct universal *targets,
                                  struct city *pcity);

/* the number of units in city */
int num_present_units_in_city(struct city* pcity);
int num_supported_units_in_city(struct city* pcity);	

void handle_event(const char *featured_text, struct tile *ptile,
                  enum event_type event, int turn, int phase, int conn_id);
void create_event(struct tile *ptile, enum event_type event,
                  const struct ft_color color, const char *format, ...)
                  fc__attribute((__format__ (__printf__, 4, 5)));

struct city *get_nearest_city(const struct unit *punit, int *sq_dist);

void cityrep_buy(struct city *pcity);
void common_taxrates_callback(int i);

bool can_units_do_connect(struct unit_list *punits,
                          enum unit_activity activity,
                          struct extra_type *tgt);

void client_unit_init_act_prob_cache(struct unit *punit);

enum unit_bg_color_type { UNIT_BG_HP_LOSS,
                          UNIT_BG_LAND,
                          UNIT_BG_SEA,
                          UNIT_BG_AMPHIBIOUS,
                          UNIT_BG_FLYING };

enum unit_bg_color_type unit_color_type(const struct unit_type *punittype);

void buy_production_in_selected_cities(void);

void unit_focus_set_status(struct player *pplayer);

void client_player_init(struct player *pplayer);

void client_player_maps_reset(void);

bool mapimg_client_define(void);
bool mapimg_client_createmap(const char *filename);

struct nation_set *client_current_nation_set(void);
bool client_nation_is_in_current_set(const struct nation_type *pnation);

enum ai_level server_ai_level(void);

#ifdef __cplusplus
}
#endif /* __cplusplus */

#endif  /* FC__CLIMISC_H */
