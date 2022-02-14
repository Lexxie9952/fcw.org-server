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
#ifndef FC__HELPDATA_H
#define FC__HELPDATA_H

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

#include <stddef.h>		/* size_t */

/* common */
#include "improvement.h" 	/* Impr_type_id */

#include "helpdlg_g.h"		/* enum help_page_type */

struct help_item {
  char *topic, *text;
  enum help_page_type type;
};

void helpdata_init(void);
void helpdata_done(void);

void boot_help_texts(void);
void free_help_texts(void);

int num_help_items(void);
const struct help_item *get_help_item(int pos);
const struct help_item *get_help_item_spec(const char *name,
                                           enum help_page_type htype,
                                           int *pos);
void help_iter_start(void);
const struct help_item *help_iter_next(void);

char *helptext_building(char *buf, size_t bufsz, struct player *pplayer,
                        const char *user_text, const struct impr_type *pimprove);
char *helptext_unit(char *buf, size_t bufsz, struct player *pplayer,
                    const char *user_text, const struct unit_type *utype);
void helptext_advance(char *buf, size_t bufsz, struct player *pplayer,
                      const char *user_text, int i);
void helptext_terrain(char *buf, size_t bufsz, struct player *pplayer,
                      const char *user_text, struct terrain *pterrain);
void helptext_extra(char *buf, size_t bufsz, struct player *pplayer,
                    const char *user_text, struct extra_type *pextra);
void helptext_goods(char *buf, size_t bufsz, struct player *pplayer,
                    const char *user_text, struct goods_type *pgood);
void helptext_specialist(char *buf, size_t bufsz, struct player *pplayer,
                         const char *user_text, struct specialist *pspec);
void helptext_government(char *buf, size_t bufsz, struct player *pplayer,
                         const char *user_text, struct government *gov);
void helptext_nation(char *buf, size_t bufsz, struct nation_type *pnation,
                     const char *user_text);

char *helptext_unit_upkeep_str(const struct unit_type *punittype);
const char *helptext_road_bonus_str(const struct terrain *pterrain,
                                    const struct road_type *proad);
const char *helptext_extra_for_terrain_str(struct extra_type *pextra,
                                           struct terrain *pterrain,
                                           enum unit_activity act);

#define help_items_iterate(pitem) {       \
        const struct help_item *pitem;    \
        help_iter_start();                \
        while ((pitem = help_iter_next())) {   
#define help_items_iterate_end }}

#ifdef __cplusplus
}
#endif /* __cplusplus */

#endif  /* FC__HELPDATA_H */
