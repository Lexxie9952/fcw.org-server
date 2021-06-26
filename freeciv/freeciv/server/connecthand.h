/**********************************************************************
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
#ifndef FC__CONNECTHAND_H
#define FC__CONNECTHAND_H

#include "support.h"            /* bool type */

#include "fc_types.h"

struct connection;
struct conn_list;
struct packet_authentication_reply;
struct packet_login_request;
struct packet_server_join_req;

void conn_set_access(struct connection *pconn, enum cmdlevel new_level,
                     bool granted);

void establish_new_connection(struct connection *pconn);
void reject_new_connection(const char *msg, struct connection *pconn);

bool handle_login_request(struct connection *pconn,
                          struct packet_server_join_req *req);

void lost_connection_to_client(struct connection *pconn);

void send_conn_info(struct conn_list *src, struct conn_list *dest);
void send_conn_info_remove(struct conn_list *src, struct conn_list *dest);

struct player *find_uncontrolled_player(struct connection *pconn);
struct player *find_uncontrolled_idle_player_longturn(void);
bool connection_attach(struct connection *pconn, struct player *pplayer,
                       bool observing);
void connection_detach(struct connection *pconn, bool remove_unused_player);

bool connection_delegate_take(struct connection *pconn,
                              struct player *pplayer);
bool connection_delegate_restore(struct connection *pconn);

void connection_close_server(struct connection *pconn, const char *reason);

void do_longturn_tech_latejoiner_effect(struct player *pplayer);

void attach_longturn_player(struct connection *pc, struct player *pplayer);

#endif /* FC__CONNECTHAND_H */
