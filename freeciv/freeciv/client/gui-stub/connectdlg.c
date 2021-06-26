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

#include <errno.h>

/* utility */
#include "fcintl.h"
#include "log.h"
#include "support.h"

/* gui main header */
#include "gui_stub.h"

#include "connectdlg_g.h"

/* client */
#include "chatline_common.h"	/* for append_output_window */
#include "client_main.h"
#include "connectdlg.h"
#include "packhand_gen.h"


/**********************************************************************//**
  Close and destroy the dialog. But only if we don't have a local
  server running (that we started).
**************************************************************************/
void gui_close_connection_dialog(void)
{
  /* PORTME */
}

/**********************************************************************//**
  Configure the dialog depending on what type of authentication request the
  server is making.
**************************************************************************/
void handle_authentication_req(enum authentication_type type,
                               const char *message)
{
  switch (type) {
  case AUTH_NEWUSER_FIRST:
     /* PORTME: switch configs if need be */
    return;
  case AUTH_NEWUSER_RETRY:
     /* PORTME: switch configs if need be */
    return;
  case AUTH_LOGIN_FIRST:
    /* if we magically have a password already present in 'password'
     * then, use that and skip the password entry dialog */
    if (password[0] != '\0') {
      struct packet_authentication_reply reply;

      sz_strlcpy(reply.password, password);
      send_packet_authentication_reply(&client.conn, &reply);
      return;
    } else {
     /* PORTME: switch configs if need be */
    }
    return;
  case AUTH_LOGIN_RETRY:
     /* PORTME: switch configs if need be */
    return;
  }

  log_error("Unsupported authentication type %d: %s.", type, message);
}

/**********************************************************************//**
  Provide a packet handler for packet_game_load.

  This regenerates the player information from a loaded game on the
  server.
**************************************************************************/
void handle_game_load(bool load_successful, const char *filename)
{ 
  /* PORTME */
}


/**********************************************************************//**
  Provide an interface for connecting to a Freeciv server.
**************************************************************************/
void gui_server_connect(void)
{
  /* PORTME */
}
