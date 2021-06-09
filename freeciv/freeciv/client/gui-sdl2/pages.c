/***********************************************************************
 Freeciv - Copyright (C) 1996-2004 - The Freeciv Team
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
#include "fc_types.h"
#include "version.h"

/* client */
#include "connectdlg_common.h"

/* gui-sdl2 */
#include "chatline.h"
#include "colors.h"
#include "connectdlg.h"
#include "graphics.h"
#include "gui_id.h"
#include "gui_tilespec.h"
#include "mapctrl.h"
#include "mapview.h"
#include "menu.h"
#include "messagewin.h"
#include "optiondlg.h"
#include "themespec.h"
#include "widget.h"

#include "pages.h"

static enum client_pages old_page = PAGE_MAIN;

/**************************************************************************
                                  MAIN PAGE
**************************************************************************/
static struct SMALL_DLG *pStartMenu = NULL;

static void popdown_start_menu(void);

/**********************************************************************//**
  User interacted with the Start New Game button.
**************************************************************************/
static int start_new_game_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    popdown_start_menu();
    if (is_server_running() || client_start_server()) {
      /* saved settings are sent in client/options.c load_settable_options() */
    }
  }

  return -1;
}

/**********************************************************************//**
  User interacted with the Load Game button.
**************************************************************************/
static int load_game_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    set_client_page(PAGE_LOAD);
  }

  return -1;
}

/**********************************************************************//**
  User interacted with the Join Game button.
**************************************************************************/
static int join_game_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    set_client_page(PAGE_NETWORK);
  }

  return -1;
}

/**********************************************************************//**
  User interacted with the Join Pubserver button - open connection dialog.
**************************************************************************/
static int servers_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    bool lan_scan = (pWidget->ID != ID_JOIN_META_GAME);

    popdown_start_menu();
    popup_connection_dialog(lan_scan);
  }

  return -1;
}

/**********************************************************************//**
  User interacted with the Options button - open options dialog.
**************************************************************************/
static int options_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    queue_flush();
    popdown_start_menu();
    popup_optiondlg();
  }

  return -1;
}

/**********************************************************************//**
  User interacted with the Quit button.
**************************************************************************/
static int quit_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    popdown_start_menu();
  }

  return 0;/* exit from main game loop */
}

/**********************************************************************//**
  Update view to show main page.
**************************************************************************/
static void show_main_page(void)
{
  SDL_Color bg_color = {255, 255, 255, 96};
  SDL_Color line_color = {128, 128, 128, 255};
  int count = 0;
  struct widget *pWidget = NULL, *pWindow = NULL;
  SDL_Surface *pBackground;
  int h = 0;
  SDL_Rect area;
  char verbuf[200];
  const char *rev_ver;

  /* create dialog */
  pStartMenu = fc_calloc(1, sizeof(struct SMALL_DLG));

  pWindow = create_window_skeleton(NULL, NULL, 0);
  add_to_gui_list(ID_WINDOW, pWindow);
  pStartMenu->pEndWidgetList = pWindow;

  area = pWindow->area;

  /* Freeciv version */
  /* TRANS: Freeciv 2.4.0 */
  fc_snprintf(verbuf, sizeof(verbuf), _("Freeciv %s"), VERSION_STRING);
  pWidget = create_iconlabel_from_chars(NULL, pWindow->dst, verbuf,
                                        adj_font(12),
                                        (WF_SELECT_WITHOUT_BAR|WF_RESTORE_BACKGROUND|WF_FREE_DATA));

  pWidget->string_utf8->style |= SF_CENTER | TTF_STYLE_BOLD;

  area.w = MAX(area.w, pWidget->size.w);
  h = MAX(h, pWidget->size.h);
  count++;

  add_to_gui_list(ID_LABEL, pWidget);

  /* TRANS: gui-sdl2 client */
  fc_snprintf(verbuf, sizeof(verbuf), _("%s client"), client_string);
  pWidget = create_iconlabel_from_chars(NULL, pWindow->dst, verbuf,
                                        adj_font(12),
                                        (WF_SELECT_WITHOUT_BAR|WF_RESTORE_BACKGROUND|WF_FREE_DATA));

  pWidget->string_utf8->style |= SF_CENTER | TTF_STYLE_BOLD;

  area.w = MAX(area.w, pWidget->size.w);
  h = MAX(h, pWidget->size.h);
  count++;

  add_to_gui_list(ID_LABEL, pWidget);

  /* Start New Game */
  pWidget = create_iconlabel_from_chars(NULL, pWindow->dst, _("Start New Game"),
                                        adj_font(14),
                                        (WF_SELECT_WITHOUT_BAR|WF_RESTORE_BACKGROUND|WF_FREE_DATA));

  pWidget->action = start_new_game_callback;
  pWidget->string_utf8->style |= SF_CENTER;
  set_wstate(pWidget, FC_WS_NORMAL);

  area.w = MAX(area.w, pWidget->size.w);
  h = MAX(h, pWidget->size.h);
  count++;

  add_to_gui_list(ID_START_NEW_GAME, pWidget);

  /* Load Game */
  pWidget = create_iconlabel_from_chars(NULL, pWindow->dst, _("Load Game"),
                                        adj_font(14),
                                        (WF_SELECT_WITHOUT_BAR|WF_RESTORE_BACKGROUND));

  pWidget->action = load_game_callback;
  pWidget->string_utf8->style |= SF_CENTER;
  set_wstate(pWidget, FC_WS_NORMAL);

  add_to_gui_list(ID_LOAD_GAME, pWidget);

  area.w = MAX(area.w, pWidget->size.w);
  h = MAX(h, pWidget->size.h);
  count++;

  /* Join Game */
  pWidget = create_iconlabel_from_chars(NULL, pWindow->dst, _("Join Game"),
                                        adj_font(14),
                                        WF_SELECT_WITHOUT_BAR|WF_RESTORE_BACKGROUND);

  pWidget->action = join_game_callback;
  pWidget->string_utf8->style |= SF_CENTER;
  set_wstate(pWidget, FC_WS_NORMAL);

  add_to_gui_list(ID_JOIN_GAME, pWidget);

  area.w = MAX(area.w, pWidget->size.w);
  h = MAX(h, pWidget->size.h);
  count++;

  /* Join Pubserver */
  pWidget = create_iconlabel_from_chars(NULL, pWindow->dst, _("Join Pubserver"),
                                        adj_font(14),
                                        WF_SELECT_WITHOUT_BAR|WF_RESTORE_BACKGROUND);

  pWidget->action = servers_callback;
  pWidget->string_utf8->style |= SF_CENTER;
  set_wstate(pWidget, FC_WS_NORMAL);

  add_to_gui_list(ID_JOIN_META_GAME, pWidget);

  area.w = MAX(area.w, pWidget->size.w);
  h = MAX(h, pWidget->size.h);
  count++;

  /* Join LAN Server */
  pWidget = create_iconlabel_from_chars(NULL, pWindow->dst, _("Join LAN Server"),
                                        adj_font(14),
                                        WF_SELECT_WITHOUT_BAR|WF_RESTORE_BACKGROUND);

  pWidget->action = servers_callback;
  pWidget->string_utf8->style |= SF_CENTER;
  set_wstate(pWidget, FC_WS_NORMAL);

  add_to_gui_list(ID_JOIN_GAME, pWidget);

  area.w = MAX(area.w, pWidget->size.w);
  h = MAX(h, pWidget->size.h);
  count++;

  /* Options */
  pWidget = create_iconlabel_from_chars(NULL, pWindow->dst, _("Options"),
                                        adj_font(14),
                                        WF_SELECT_WITHOUT_BAR|WF_RESTORE_BACKGROUND);

  pWidget->action = options_callback;
  pWidget->string_utf8->style |= SF_CENTER;
  set_wstate(pWidget, FC_WS_NORMAL);

  add_to_gui_list(ID_CLIENT_OPTIONS_BUTTON, pWidget);

  area.w = MAX(area.w, pWidget->size.w);
  h = MAX(h, pWidget->size.h);
  count++;

  /* Quit */
  pWidget = create_iconlabel_from_chars(NULL, pWindow->dst, _("Quit"),
                                        adj_font(14),
                                        WF_SELECT_WITHOUT_BAR|WF_RESTORE_BACKGROUND);

  pWidget->action = quit_callback;
  pWidget->string_utf8->style |= SF_CENTER;
  pWidget->key = SDLK_ESCAPE;
  set_wstate(pWidget, FC_WS_NORMAL);
  add_to_gui_list(ID_QUIT, pWidget);

  area.w = MAX(area.w, pWidget->size.w);
  h = MAX(h, pWidget->size.h);
  count++;

  pStartMenu->pBeginWidgetList = pWidget;

  /* ------*/

  area.w += adj_size(30);
  h += adj_size(6);

  area.h = MAX(area.h, h * count);

  /* ------*/

  pBackground = theme_get_background(theme, BACKGROUND_STARTMENU);
  if (resize_window(pWindow, pBackground, NULL,
                    (pWindow->size.w - pWindow->area.w) + area.w,
                    (pWindow->size.h - pWindow->area.h) + area.h)) {
    FREESURFACE(pBackground);
  }

  area = pWindow->area;

  group_set_area(pWidget, pWindow->prev, area);

  setup_vertical_widgets_position(1, area.x, area.y, area.w, h, pWidget, pWindow->prev);

  area.h = h * 2;
  fill_rect_alpha(pWindow->theme, &area, &bg_color);

  widget_set_position(pWindow,
                      (main_window_width() - pWindow->size.w) - adj_size(20),
                      (main_window_height() - pWindow->size.h) - adj_size(20));

  draw_intro_gfx();

  redraw_group(pStartMenu->pBeginWidgetList, pStartMenu->pEndWidgetList, FALSE);

  create_line(pWindow->dst->surface,
              area.x, area.y + (h * 2 - 1),
              area.x + area.w - 1, area.y + (h * 2 - 1),
              &line_color);

  set_output_window_text(_("SDL2-client welcomes you..."));

#if IS_BETA_VERSION
  set_output_window_text(beta_message());
#endif /* IS_BETA_VERSION */

  rev_ver = fc_git_revision();
  if (rev_ver != NULL) {
    char buffer[512];

    fc_snprintf(buffer, sizeof(buffer), _("Commit: %s"), rev_ver);
    set_output_window_text(buffer);
  }

  chat_welcome_message(FALSE);

  meswin_dialog_popup(TRUE);

  flush_all();
}

/**********************************************************************//**
  Close start menu
**************************************************************************/
static void popdown_start_menu(void)
{
  if (pStartMenu) {
    popdown_window_group_dialog(pStartMenu->pBeginWidgetList,
                                pStartMenu->pEndWidgetList);
    FC_FREE(pStartMenu);
    flush_dirty();
  }
}

/**************************************************************************
                             PUBLIC FUNCTIONS
**************************************************************************/

/**********************************************************************//**
  Sets the "page" that the client should show.  See documentation in
  pages_g.h.
**************************************************************************/
void real_set_client_page(enum client_pages page)
{
  switch (old_page) {
  case PAGE_MAIN:
    popdown_start_menu();
    break;
  case PAGE_LOAD:
    popdown_load_game_dialog();
    break;
  case PAGE_NETWORK:
    close_connection_dialog();
    break;
  case PAGE_START:
    popdown_conn_list_dialog();
    break;
  case PAGE_GAME:
    close_game_page();
    break;
  default:
    break;
  }

  old_page = page;

  switch (page) {
  case PAGE_MAIN:
    show_main_page();
    break;
  case PAGE_LOAD:
    client_start_server();
    break;
  case PAGE_NETWORK:
    popup_join_game_dialog();
    break;
  case PAGE_START:
    conn_list_dialog_update();
    break;
  case PAGE_GAME:
    show_game_page();
    enable_main_widgets();
    update_info_label();
    unit_focus_update();
    update_unit_info_label(get_units_in_focus());
    update_turn_done_button_state();
    refresh_overview();
    menus_update();
    break;
  default:
    break;
  }
}

/**********************************************************************//**
  Set the list of available rulesets.  The default ruleset should be
  "default", and if the user changes this then set_ruleset() should be
  called.
**************************************************************************/
void set_rulesets(int num_rulesets, char **rulesets)
{
  /* PORTME */
}

/**********************************************************************//**
  Returns current client page
**************************************************************************/
enum client_pages get_current_client_page(void)
{
  return old_page;
}

/**********************************************************************//**
  Update the start page.
**************************************************************************/
void update_start_page(void)
{
  conn_list_dialog_update();
}
