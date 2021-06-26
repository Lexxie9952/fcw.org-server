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
#include "fcintl.h"
#include "log.h"

/* common */
#include "game.h"
#include "packets.h"
#include "victory.h"

/* client */
#include "client_main.h"
#include "text.h"

/* gui-sdl2 */
#include "graphics.h"
#include "gui_id.h"
#include "gui_main.h"
#include "gui_tilespec.h"
#include "mapview.h"
#include "widget.h"

#include "spaceshipdlg.h"

#define SPECLIST_TAG dialog
#define SPECLIST_TYPE struct SMALL_DLG
#include "speclist.h"

#define dialog_list_iterate(dialoglist, pdialog) \
    TYPED_LIST_ITERATE(struct SMALL_DLG, dialoglist, pdialog)
#define dialog_list_iterate_end  LIST_ITERATE_END

static struct dialog_list *dialog_list = NULL;
static bool dialog_list_has_been_initialised = FALSE;

/**********************************************************************//**
  Find spaceship dialog related to specified player.
**************************************************************************/
static struct SMALL_DLG *get_spaceship_dialog(struct player *pplayer)
{
  if (!dialog_list_has_been_initialised) {
    dialog_list = dialog_list_new();
    dialog_list_has_been_initialised = TRUE;
  }

  dialog_list_iterate(dialog_list, pDialog) {
    if (pDialog->pEndWidgetList->data.player == pplayer) {
      return pDialog;
    }
  } dialog_list_iterate_end;

  return NULL;
}

/**********************************************************************//**
  User interacted with spaceship dialog window.
**************************************************************************/
static int space_dialog_window_callback(struct widget *pWindow)
{
  if (PRESSED_EVENT(Main.event)) {
    move_window_group(pWindow->private_data.small_dlg->pBeginWidgetList, pWindow);
  }

  return -1;
}

/**********************************************************************//**
  User interacted with spaceship dialog close button.
**************************************************************************/
static int exit_space_dialog_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    popdown_spaceship_dialog(pWidget->data.player);
    flush_dirty();
  }

  return -1;
}

/**********************************************************************//**
  User interacted with spaceship dialog launch button.
**************************************************************************/
static int launch_spaceship_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    send_packet_spaceship_launch(&client.conn);
  }

  return -1;
}

/**********************************************************************//**
  Refresh (update) the spaceship dialog for the given player.
**************************************************************************/
void refresh_spaceship_dialog(struct player *pPlayer)
{
  struct SMALL_DLG *pSpaceShp;
  struct widget *pbuf;

  if (!(pSpaceShp = get_spaceship_dialog(pPlayer))) {
    return;
  }

  /* launch button */
  pbuf = pSpaceShp->pEndWidgetList->prev->prev;
  if (victory_enabled(VC_SPACERACE)
      && pPlayer == client.conn.playing
      && pPlayer->spaceship.state == SSHIP_STARTED
      && pPlayer->spaceship.success_rate > 0.0) {
    set_wstate(pbuf, FC_WS_NORMAL);
  }

  /* update text info */
  pbuf = pbuf->prev;
  copy_chars_to_utf8_str(pbuf->string_utf8,
                         get_spaceship_descr(&pPlayer->spaceship));
  /* ------------------------------------------ */

  /* redraw */
  redraw_group(pSpaceShp->pBeginWidgetList, pSpaceShp->pEndWidgetList, 0);
  widget_mark_dirty(pSpaceShp->pEndWidgetList);

  flush_dirty();
}

/**********************************************************************//**
  Popup (or raise) the spaceship dialog for the given player.
**************************************************************************/
void popup_spaceship_dialog(struct player *pPlayer)
{
  struct SMALL_DLG *pSpaceShp;

  if (!(pSpaceShp = get_spaceship_dialog(pPlayer))) {
    struct widget *pBuf, *pWindow;
    utf8_str *pstr;
    char cbuf[128];
    SDL_Rect area;

    pSpaceShp = fc_calloc(1, sizeof(struct SMALL_DLG));

    fc_snprintf(cbuf, sizeof(cbuf), _("The %s Spaceship"),
                nation_adjective_for_player(pPlayer));
    pstr = create_utf8_from_char(cbuf, adj_font(12));
    pstr->style |= TTF_STYLE_BOLD;

    pWindow = create_window_skeleton(NULL, pstr, 0);

    pWindow->action = space_dialog_window_callback;
    set_wstate(pWindow, FC_WS_NORMAL);
    pWindow->data.player = pPlayer;
    pWindow->private_data.small_dlg = pSpaceShp;
    add_to_gui_list(ID_WINDOW, pWindow);
    pSpaceShp->pEndWidgetList = pWindow;

    area = pWindow->area;

    /* ---------- */
    /* create exit button */
    pBuf = create_themeicon(current_theme->Small_CANCEL_Icon, pWindow->dst,
                            WF_WIDGET_HAS_INFO_LABEL
                            | WF_RESTORE_BACKGROUND);
    pBuf->info_label = create_utf8_from_char(_("Close Dialog (Esc)"),
                                             adj_font(12));
    pBuf->data.player = pPlayer;
    pBuf->action = exit_space_dialog_callback;
    set_wstate(pBuf, FC_WS_NORMAL);
    pBuf->key = SDLK_ESCAPE;
    area.w = MAX(area.w, (pBuf->size.w + adj_size(10)));

    add_to_gui_list(ID_BUTTON, pBuf);

    pBuf = create_themeicon_button_from_chars(current_theme->OK_Icon, pWindow->dst,
                                              _("Launch"), adj_font(12), 0);

    pBuf->action = launch_spaceship_callback;
    area.w = MAX(area.w, pBuf->size.w);
    area.h += pBuf->size.h + adj_size(20);
    add_to_gui_list(ID_BUTTON, pBuf);

    pstr = create_utf8_from_char(get_spaceship_descr(NULL), adj_font(12));
    pstr->bgcol = (SDL_Color) {0, 0, 0, 0};
    pBuf = create_iconlabel(NULL, pWindow->dst, pstr, WF_RESTORE_BACKGROUND);
    area.w = MAX(area.w, pBuf->size.w);
    area.h += pBuf->size.h + adj_size(20);
    add_to_gui_list(ID_LABEL, pBuf);

    pSpaceShp->pBeginWidgetList = pBuf;
    /* -------------------------------------------------------- */

    area.w = MAX(area.w, adj_size(300) - (pWindow->size.w - pWindow->area.w));

    resize_window(pWindow, NULL, NULL,
                  (pWindow->size.w - pWindow->area.w) + area.w,
                  (pWindow->size.h - pWindow->area.h) + area.h);

    area = pWindow->area;

    widget_set_position(pWindow,
                        (main_window_width() - pWindow->size.w) / 2,
                        (main_window_height() - pWindow->size.h) / 2);

    /* exit button */
    pBuf = pWindow->prev;
    pBuf->size.x = area.x + area.w - pBuf->size.w - 1;
    pBuf->size.y = pWindow->size.y + adj_size(2);

    /* launch button */
    pBuf = pBuf->prev;
    pBuf->size.x = area.x + (area.w - pBuf->size.w) / 2;
    pBuf->size.y = area.y + area.h - pBuf->size.h - adj_size(7);

    /* info label */
    pBuf = pBuf->prev;
    pBuf->size.x = area.x + (area.w - pBuf->size.w) / 2;
    pBuf->size.y = area.y + adj_size(7);

    dialog_list_prepend(dialog_list, pSpaceShp);

    refresh_spaceship_dialog(pPlayer);
  } else {
    if (select_window_group_dialog(pSpaceShp->pBeginWidgetList,
                                   pSpaceShp->pEndWidgetList)) {
      widget_flush(pSpaceShp->pEndWidgetList);
    }
  }
}

/**********************************************************************//**
  Close the spaceship dialog for the given player.
**************************************************************************/
void popdown_spaceship_dialog(struct player *pPlayer)
{
  struct SMALL_DLG *pSpaceShp;

  if ((pSpaceShp = get_spaceship_dialog(pPlayer))) {
    popdown_window_group_dialog(pSpaceShp->pBeginWidgetList,
                                pSpaceShp->pEndWidgetList);
    dialog_list_remove(dialog_list, pSpaceShp);
    FC_FREE(pSpaceShp);
  }
}
