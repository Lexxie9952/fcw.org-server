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

/* SDL2 */
#ifdef SDL2_PLAIN_INCLUDE
#include <SDL.h>
#else  /* SDL2_PLAIN_INCLUDE */
#include <SDL2/SDL.h>
#endif /* SDL2_PLAIN_INCLUDE */

/* utility */
#include "fcintl.h"
#include "log.h"

/* common */
#include "game.h"
#include "government.h"
#include "movement.h"

/* client */
#include "client_main.h"
#include "helpdata.h"

/* gui-sdl2 */
#include "colors.h"
#include "graphics.h"
#include "gui_id.h"
#include "gui_main.h"
#include "gui_tilespec.h"
#include "mapview.h"
#include "repodlgs.h"
#include "sprite.h"
#include "themespec.h"
#include "widget.h"

#include "helpdlg.h"

static struct ADVANCED_DLG *pHelpDlg = NULL;

struct TECHS_BUTTONS {
  struct widget *pTargets[6], *pSub_Targets[6];
  struct widget *pRequirementButton[2], *pSub_Req[4];
  struct widget *pDock;
  bool show_tree;
  bool show_full_tree;
};

struct UNITS_BUTTONS {
  struct widget *pObsoleteByButton;
  struct widget *pRequirementButton;
  struct widget *pDock;
};

enum help_page_type current_help_dlg = HELP_LAST;

static const int bufsz = 8192;

static int change_tech_callback(struct widget *pWidget);

/**********************************************************************//**
  Open Help Browser without any specific topic in mind
**************************************************************************/
void popup_help_browser(void)
{
  popup_tech_info(A_NONE);
}

/**********************************************************************//**
  Popup the help dialog to get help on the given string topic.  Note that
  the topic may appear in multiple sections of the help (it may be both
  an improvement and a unit, for example).

  The string will be untranslated.
**************************************************************************/
void popup_help_dialog_string(const char *item)
{
  popup_help_dialog_typed(Q_(item), HELP_ANY);
}

/**********************************************************************//**
  Popup the help dialog to display help on the given string topic from
  the given section.

  The string will be translated.
**************************************************************************/
void popup_help_dialog_typed(const char *item, enum help_page_type eHPT)
{
  log_debug("popup_help_dialog_typed : PORT ME");
}

/**********************************************************************//**
  Close the help dialog.
**************************************************************************/
void popdown_help_dialog(void)
{
  if (pHelpDlg) {
    popdown_window_group_dialog(pHelpDlg->pBeginWidgetList,
                                pHelpDlg->pEndWidgetList);
    FC_FREE(pHelpDlg->pScroll);
    FC_FREE(pHelpDlg);
    current_help_dlg = HELP_LAST;
  }
}

/**********************************************************************//**
  User interacted with help dialog window
**************************************************************************/
static int help_dlg_window_callback(struct widget *pWindow)
{
  return -1;
}

/**********************************************************************//**
  User requested closing of the help dialog
**************************************************************************/
static int exit_help_dlg_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    popdown_help_dialog();
    flush_dirty();
  }

  return -1;
}

/**********************************************************************//**
  User requested new government help
**************************************************************************/
static int change_gov_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    popup_gov_info(MAX_ID - pWidget->ID);
  }

  return -1;
}

/**********************************************************************//**
  Show government info
**************************************************************************/
void popup_gov_info(int gov)
{
}

/**********************************************************************//**
  User requested new improvement help
**************************************************************************/
static int change_impr_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    popup_impr_info(MAX_ID - pWidget->ID);
  }

  return -1;
}

/**********************************************************************//**
  Refresh improvement help dialog
**************************************************************************/
static void redraw_impr_info_dlg(void)
{
  SDL_Color bg_color = {255, 255, 255, 64};
  struct widget *pWindow = pHelpDlg->pEndWidgetList;
  struct UNITS_BUTTONS *pStore = (struct UNITS_BUTTONS *)pWindow->data.ptr;
  SDL_Rect dst;

  redraw_group(pWindow->prev, pWindow, FALSE);

  dst.x = pStore->pDock->prev->size.x - adj_size(10);
  dst.y = pStore->pDock->prev->size.y - adj_size(10);
  dst.w = pWindow->size.w - (dst.x - pWindow->size.x) - adj_size(10);
  dst.h = pWindow->size.h - (dst.y - pWindow->size.y) - adj_size(10);

  fill_rect_alpha(pWindow->dst->surface, &dst, &bg_color);

  create_frame(pWindow->dst->surface,
               dst.x, dst.y, dst.w, dst.h,
               get_theme_color(COLOR_THEME_HELPDLG_FRAME));

  /*------------------------------------- */
  redraw_group(pHelpDlg->pBeginWidgetList, pWindow->prev->prev, FALSE);
  widget_flush(pWindow);
}

/**********************************************************************//**
  Show improvement info
**************************************************************************/
void popup_impr_info(Impr_type_id impr)
{
  SDL_Color bg_color = {255, 255, 255, 128};
  struct widget *pWindow;
  struct UNITS_BUTTONS *pStore;
  struct widget *pCloseButton = NULL;
  struct widget *pListToggleButton = NULL;
  struct widget *pImprovementButton = NULL;
  struct widget *pImprNameLabel = NULL;
  struct widget *pCostLabel = NULL;
  struct widget *pUpkeepLabel = NULL;
  struct widget *pRequirementLabel = NULL;
  struct widget *pRequirementLabel2 = NULL;
  struct widget *pObsoleteByLabel = NULL;
  struct widget *pObsoleteByLabel2 = NULL;
  struct widget *pHelptextLabel = NULL;
  struct widget *pDock;
  utf8_str *title;
  utf8_str *pstr;
  SDL_Surface *pSurf;
  int h, start_x, start_y, impr_type_count;
  bool created, text = FALSE;
  int scrollbar_width = 0;
  struct impr_type *pImpr_type;
  char buffer[64000];
  SDL_Rect area;
  struct advance *obsTech = NULL;

  if (current_help_dlg != HELP_IMPROVEMENT) {
    popdown_help_dialog();
  }

  if (!pHelpDlg) {
    SDL_Surface *pBackgroundTmpl, *pBackground, *pText, *pIcon;
    SDL_Rect dst;

    current_help_dlg = HELP_IMPROVEMENT;
    created = TRUE;

    /* create dialog */
    pHelpDlg = fc_calloc(1, sizeof(struct ADVANCED_DLG));
    pStore = fc_calloc(1, sizeof(struct UNITS_BUTTONS));

    /* create window */
    title = create_utf8_from_char(_("Help : Improvements"), adj_font(12));
    title->style |= TTF_STYLE_BOLD;

    pWindow = create_window_skeleton(NULL, title, WF_FREE_DATA);
    pWindow->action = help_dlg_window_callback;
    set_wstate(pWindow , FC_WS_NORMAL);
    pWindow->data.ptr = (void *)pStore;
    add_to_gui_list(ID_WINDOW, pWindow);

    pHelpDlg->pEndWidgetList = pWindow;

    area = pWindow->area;
    /* ------------------ */

    /* close button */
    pCloseButton = create_themeicon(current_theme->Small_CANCEL_Icon, pWindow->dst,
                                    WF_WIDGET_HAS_INFO_LABEL
                                    | WF_RESTORE_BACKGROUND);
    pCloseButton->info_label =
        create_utf8_from_char(_("Close Dialog (Esc)"), adj_font(12));
    pCloseButton->action = exit_help_dlg_callback;
    set_wstate(pCloseButton, FC_WS_NORMAL);
    pCloseButton->key = SDLK_ESCAPE;

    add_to_gui_list(ID_BUTTON, pCloseButton);

    /* ------------------ */
    pDock = pCloseButton;

    pstr = create_utf8_str(NULL, 0, adj_font(10));
    pstr->style |= (TTF_STYLE_BOLD | SF_CENTER);

    /* background template for entries in scroll list */
    pBackgroundTmpl = create_surf(adj_size(135), adj_size(40), SDL_SWSURFACE);
    SDL_FillRect(pBackgroundTmpl, NULL, map_rgba(pBackgroundTmpl->format, bg_color));

    create_frame(pBackgroundTmpl,
                 0, 0, pBackgroundTmpl->w - 1, pBackgroundTmpl->h - 1,
                 get_theme_color(COLOR_THEME_HELPDLG_FRAME));

    impr_type_count = 0;
    improvement_iterate(pImprove) {

      /* copy background surface */  
      pBackground = copy_surface(pBackgroundTmpl);

      /* blit improvement name */
      copy_chars_to_utf8_str(pstr, improvement_name_translation(pImprove));
      pText = create_text_surf_smaller_than_w(pstr, adj_size(100 - 4));
      dst.x = adj_size(40) + (pBackground->w - pText->w - adj_size(40)) / 2;
      dst.y = (pBackground->h - pText->h) / 2;
      alphablit(pText, NULL, pBackground, &dst, 255);
      FREESURFACE(pText);

      /* blit improvement icon */
      pIcon = ResizeSurfaceBox(get_building_surface(pImprove),
                               adj_size(36), adj_size(36), 1, TRUE, TRUE);
      dst.x = adj_size(5);
      dst.y = (pBackground->h - pIcon->h) / 2;
      alphablit(pIcon, NULL, pBackground, &dst, 255);
      FREESURFACE(pIcon);

      pImprovementButton = create_icon2(pBackground, pWindow->dst,
                                        WF_FREE_THEME | WF_RESTORE_BACKGROUND);

      set_wstate(pImprovementButton, FC_WS_NORMAL);
      pImprovementButton->action = change_impr_callback;
      add_to_gui_list(MAX_ID - improvement_number(pImprove), pImprovementButton);

      if (impr_type_count++ >= 10) {
        set_wflag(pImprovementButton, WF_HIDDEN);
      }

    } improvement_iterate_end;

    FREESURFACE(pBackgroundTmpl);

    pHelpDlg->pEndActiveWidgetList = pDock->prev;
    pHelpDlg->pBeginWidgetList = pImprovementButton ? pImprovementButton : pCloseButton;
    pHelpDlg->pBeginActiveWidgetList = pHelpDlg->pBeginWidgetList;

    if (impr_type_count > 10) {
      pHelpDlg->pActiveWidgetList = pHelpDlg->pEndActiveWidgetList;
      scrollbar_width = create_vertical_scrollbar(pHelpDlg, 1, 10, TRUE, TRUE);
    }

    /* toggle techs list button */
    pListToggleButton = create_themeicon_button_from_chars(current_theme->UP_Icon,
                                                           pWindow->dst,
                                                           _("Improvements"),
                                                           adj_font(10), 0);
#if 0
   pListToggleButton->action = toggle_full_tree_mode_in_help_dlg_callback;
   if (pStore->show_tree) {
      set_wstate(pListToggleButton, FC_WS_NORMAL);
   }
#endif

    widget_resize(pListToggleButton, adj_size(160), adj_size(15));
    pListToggleButton->string_utf8->fgcol = *get_theme_color(COLOR_THEME_HELPDLG_TEXT);

    add_to_gui_list(ID_BUTTON, pListToggleButton);

    pDock = pListToggleButton;
    pStore->pDock = pDock;
  } else {
    created = FALSE;
    scrollbar_width = (pHelpDlg->pScroll ? pHelpDlg->pScroll->pUp_Left_Button->size.w : 0);
    pWindow = pHelpDlg->pEndWidgetList;
    pStore = (struct UNITS_BUTTONS *)pWindow->data.ptr;
    pDock = pStore->pDock;

    area = pWindow->area;

    /* delete any previous list entries */
    if (pDock != pHelpDlg->pBeginWidgetList) {
      del_group_of_widgets_from_gui_list(pHelpDlg->pBeginWidgetList,
                                         pDock->prev);
      pHelpDlg->pBeginWidgetList = pDock;
    }
  }

  pImpr_type = improvement_by_number(impr);

  pSurf = get_building_surface(pImpr_type);
  pImprNameLabel = create_iconlabel_from_chars(
                     ResizeSurfaceBox(pSurf, adj_size(64), adj_size(48), 1, TRUE, TRUE),
                     pWindow->dst, city_improvement_name_translation(NULL, pImpr_type),
                     adj_font(24), WF_FREE_THEME);

  pImprNameLabel->ID = ID_LABEL;
  DownAdd(pImprNameLabel, pDock);
  pDock = pImprNameLabel;

  if (!improvement_has_flag(pImpr_type, IF_GOLD)) {
    sprintf(buffer, "%s %d", _("Cost:"), impr_build_shield_cost(NULL, pImpr_type));
    pCostLabel = create_iconlabel_from_chars(NULL, pWindow->dst,
                                             buffer, adj_font(12), 0);
    pCostLabel->ID = ID_LABEL;
    DownAdd(pCostLabel, pDock);
    pDock = pCostLabel;

    if (!is_wonder(pImpr_type)) {
      sprintf(buffer, "%s %d", _("Upkeep:"), pImpr_type->upkeep);
      pUpkeepLabel = create_iconlabel_from_chars(NULL, pWindow->dst,
                                                 buffer, adj_font(12), 0);
      pUpkeepLabel->ID = ID_LABEL;
      DownAdd(pUpkeepLabel, pDock);
      pDock = pUpkeepLabel;
    }
  }

  /* requirement */
  pRequirementLabel = create_iconlabel_from_chars(NULL, pWindow->dst,
                                                  _("Requirement:"),
                                                  adj_font(12), 0);
  pRequirementLabel->ID = ID_LABEL;
  DownAdd(pRequirementLabel, pDock);
  pDock = pRequirementLabel;

  if (requirement_vector_size(&pImpr_type->reqs) == 0) {
    pRequirementLabel2 = create_iconlabel_from_chars(NULL, pWindow->dst,
                                                     Q_("?req:None"),
                                                     adj_font(12), 0);
    pRequirementLabel2->ID = ID_LABEL;
  } else {
    /* FIXME: this should show ranges, negated reqs, and all the
     * MAX_NUM_REQS reqs.
     * Currently it's limited to 1 req. Remember MAX_NUM_REQS is a compile-time
     * definition. */
    requirement_vector_iterate(&pImpr_type->reqs, preq) {
      if (!preq->present) {
        continue;
      }
      pRequirementLabel2 = create_iconlabel_from_chars(NULL, pWindow->dst,
                             universal_name_translation(&preq->source, buffer, sizeof(buffer)),
                             adj_font(12), WF_RESTORE_BACKGROUND);
      if (preq->source.kind != VUT_ADVANCE) {
        break; /* FIXME */
      }
      pRequirementLabel2->ID = MAX_ID - advance_number(preq->source.value.advance);
      pRequirementLabel2->string_utf8->fgcol = *get_tech_color(advance_number(preq->source.value.advance));
      pRequirementLabel2->action = change_tech_callback;
      set_wstate(pRequirementLabel2, FC_WS_NORMAL);
      break;
    } requirement_vector_iterate_end;
  }
  DownAdd(pRequirementLabel2, pDock);
  pDock = pRequirementLabel2;
  pStore->pRequirementButton = pRequirementLabel2;

  /* obsolete by */
  pObsoleteByLabel = create_iconlabel_from_chars(NULL, pWindow->dst,
                                                 _("Obsolete by:"),
                                                 adj_font(12), 0);
  pObsoleteByLabel->ID = ID_LABEL;
  DownAdd(pObsoleteByLabel, pDock);
  pDock = pObsoleteByLabel;


  requirement_vector_iterate(&pImpr_type->obsolete_by, pobs) {
    if (pobs->source.kind == VUT_ADVANCE) {
      obsTech = pobs->source.value.advance;
      break;
    }
  } requirement_vector_iterate_end;
  if (obsTech == NULL) {
    pObsoleteByLabel2 = create_iconlabel_from_chars(NULL, pWindow->dst,
                                                    _("Never"), adj_font(12), 0);
    pObsoleteByLabel2->ID = ID_LABEL;
  } else {
    pObsoleteByLabel2 = create_iconlabel_from_chars(NULL, pWindow->dst,
                                                    advance_name_translation(obsTech),
                                                    adj_font(12), WF_RESTORE_BACKGROUND);
    pObsoleteByLabel2->ID = MAX_ID - advance_number(obsTech);
    pObsoleteByLabel2->string_utf8->fgcol = *get_tech_color(advance_number(obsTech));
    pObsoleteByLabel2->action = change_tech_callback;
    set_wstate(pObsoleteByLabel2, FC_WS_NORMAL);
  }
  DownAdd(pObsoleteByLabel2, pDock);
  pDock = pObsoleteByLabel2;
  pStore->pObsoleteByButton = pObsoleteByLabel2;

  /* helptext */
  start_x = (area.x + 1 + scrollbar_width + pHelpDlg->pEndActiveWidgetList->size.w + adj_size(20));

  buffer[0] = '\0';
  helptext_building(buffer, sizeof(buffer), client.conn.playing, NULL, pImpr_type);
  if (buffer[0] != '\0') {
    utf8_str *bstr = create_utf8_from_char(buffer, adj_font(12));

    convert_utf8_str_to_const_surface_width(bstr, adj_size(640) - start_x - adj_size(20));
    pHelptextLabel = create_iconlabel(NULL, pWindow->dst, bstr, 0);
    pHelptextLabel->ID = ID_LABEL;
    DownAdd(pHelptextLabel, pDock);
    pDock = pHelptextLabel;
    text = TRUE;
  }

  pHelpDlg->pBeginWidgetList = pHelptextLabel ? pHelptextLabel : pObsoleteByLabel2;

  /* --------------------------------------------------------- */
  if (created) {

    pSurf = theme_get_background(theme, BACKGROUND_HELPDLG);
    if (resize_window(pWindow, pSurf, NULL, adj_size(640), adj_size(480))) {
      FREESURFACE(pSurf);
    }

    area = pWindow->area;

    widget_set_position(pWindow,
                        (main_window_width() - pWindow->size.w) / 2,
                        (main_window_height() - pWindow->size.h) / 2);

    /* exit button */
    pCloseButton = pWindow->prev;
    widget_set_position(pCloseButton,
                        area.x + area.w - pCloseButton->size.w - 1,
                        pWindow->size.y + adj_size(2));

    /* list toggle button */
    pListToggleButton = pStore->pDock;
    widget_set_position(pListToggleButton, area.x, area.y);

    /* list entries */
    h = setup_vertical_widgets_position(1, area.x + scrollbar_width,
                                        area.y + pListToggleButton->size.h, 0, 0,
                                        pHelpDlg->pBeginActiveWidgetList,
                                        pHelpDlg->pEndActiveWidgetList);

    /* scrollbar */
    if (pHelpDlg->pScroll) {
      setup_vertical_scrollbar_area(pHelpDlg->pScroll,
                                    area.x, area.y + pListToggleButton->size.h,
                                    h, FALSE);
    }
  }

  pImprNameLabel = pStore->pDock->prev;
  widget_set_position(pImprNameLabel, start_x, area.y + adj_size(16));

  start_y = pImprNameLabel->size.y + pImprNameLabel->size.h + adj_size(10);

  if (!improvement_has_flag(pImpr_type, IF_GOLD)) {
    pCostLabel = pImprNameLabel->prev;
    widget_set_position(pCostLabel, start_x, start_y);
    if (!is_wonder(pImpr_type)) {
      pUpkeepLabel = pCostLabel->prev;
      widget_set_position(pUpkeepLabel,
                          pCostLabel->size.x + pCostLabel->size.w + adj_size(20),
                          start_y);
    }
    start_y += pCostLabel->size.h;
  }

  pRequirementLabel = pStore->pRequirementButton->next;
  widget_set_position(pRequirementLabel, start_x, start_y);

  pRequirementLabel2 = pStore->pRequirementButton;
  widget_set_position(pRequirementLabel2,
                      pRequirementLabel->size.x + pRequirementLabel->size.w + adj_size(5),
                      start_y);

  if (pStore->pObsoleteByButton) {
    pObsoleteByLabel = pStore->pObsoleteByButton->next;
    widget_set_position(pObsoleteByLabel,
                        pRequirementLabel2->size.x + pRequirementLabel2->size.w + adj_size(10),
                        start_y);

    pObsoleteByLabel2 = pStore->pObsoleteByButton;
    widget_set_position(pObsoleteByLabel2,
                        pObsoleteByLabel->size.x + pObsoleteByLabel->size.w + adj_size(5),
                        start_y);

    start_y += pObsoleteByLabel2->size.h;
  }

  start_y += adj_size(30);

  if (text) {
    widget_set_position(pHelptextLabel, start_x, start_y);
  }

  redraw_impr_info_dlg();
}

/**********************************************************************//**
  User requested new unit help
**************************************************************************/
static int change_unit_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    popup_unit_info(MAX_ID - pWidget->ID);
  }

  return -1;
}

/**********************************************************************//**
  Refresh unit help dialog
**************************************************************************/
static void redraw_unit_info_dlg(void)
{
  SDL_Color bg_color = {255, 255, 255, 64};
  struct widget *pWindow = pHelpDlg->pEndWidgetList;
  struct UNITS_BUTTONS *pStore = (struct UNITS_BUTTONS *)pWindow->data.ptr;
  SDL_Rect dst;

  redraw_group(pWindow->prev, pWindow, FALSE);

  dst.x = pStore->pDock->prev->size.x - adj_size(10);
  dst.y = pStore->pDock->prev->size.y - adj_size(10);
  dst.w = pWindow->size.w - (dst.x - pWindow->size.x) - adj_size(10);
  dst.h = pWindow->size.h - (dst.y - pWindow->size.y) - adj_size(10);

  fill_rect_alpha(pWindow->dst->surface, &dst, &bg_color);

  create_frame(pWindow->dst->surface,
               dst.x, dst.y, dst.w, dst.h,
               get_theme_color(COLOR_THEME_HELPDLG_FRAME));

  /*------------------------------------- */
  redraw_group(pHelpDlg->pBeginWidgetList, pWindow->prev->prev, FALSE);
  widget_flush(pWindow);
}

/**********************************************************************//**
  Show improvement info
**************************************************************************/
void popup_unit_info(Unit_type_id type_id)
{
  SDL_Color bg_color = {255, 255, 255, 128};
  struct widget *pWindow;
  struct UNITS_BUTTONS *pStore;
  struct widget *pCloseButton = NULL;
  struct widget *pListToggleButton = NULL;
  struct widget *pUnitButton = NULL;
  struct widget *pUnitNameLabel = NULL;
  struct widget *pUnitInfoLabel = NULL;
  struct widget *pRequirementLabel = NULL;
  struct widget *pRequirementLabel2 = NULL;
  struct widget *pObsoleteByLabel = NULL;
  struct widget *pObsoleteByLabel2 = NULL;
  struct widget *pHelptextLabel = NULL;
  struct widget *pDock;
  utf8_str *title;
  utf8_str *pstr;
  SDL_Surface *pSurf;
  int h, start_x, start_y, utype_count;
  bool created, text = FALSE;
  int scrollbar_width = 0;
  struct unit_type *pUnitType;
  char buffer[bufsz];
  SDL_Rect area;

  if (current_help_dlg != HELP_UNIT) {
    popdown_help_dialog();
  }

  /* create new dialog if it doesn't exist yet */
  if (!pHelpDlg) {
    SDL_Surface *pBackgroundTmpl, *pBackground, *pText, *pIcon;
    SDL_Rect dst;

    current_help_dlg = HELP_UNIT;
    created = TRUE;

    /* create dialog */
    pHelpDlg = fc_calloc(1, sizeof(struct ADVANCED_DLG));
    pStore = fc_calloc(1, sizeof(struct UNITS_BUTTONS));

    /* create window */
    title = create_utf8_from_char(_("Help : Units"), adj_font(12));
    title->style |= TTF_STYLE_BOLD;

    pWindow = create_window_skeleton(NULL, title, WF_FREE_DATA);
    pWindow->action = help_dlg_window_callback;
    set_wstate(pWindow , FC_WS_NORMAL);
    pWindow->data.ptr = (void *)pStore;
    add_to_gui_list(ID_WINDOW, pWindow);

    pHelpDlg->pEndWidgetList = pWindow;

    area = pWindow->area;

    /* ------------------ */

    /* close button */
    pCloseButton = create_themeicon(current_theme->Small_CANCEL_Icon, pWindow->dst,
                                    WF_WIDGET_HAS_INFO_LABEL
                                    | WF_RESTORE_BACKGROUND);
    pCloseButton->info_label =
        create_utf8_from_char(_("Close Dialog (Esc)"), adj_font(12));
    pCloseButton->action = exit_help_dlg_callback;
    set_wstate(pCloseButton, FC_WS_NORMAL);
    pCloseButton->key = SDLK_ESCAPE;

    add_to_gui_list(ID_BUTTON, pCloseButton);

    /* ------------------ */
    pDock = pCloseButton;

    /* --- create scrollable unit list on the left side ---*/

    pstr = create_utf8_str(NULL, 0, adj_font(10));
    pstr->style |= (TTF_STYLE_BOLD | SF_CENTER);

    /* background template for entries in scroll list */
    pBackgroundTmpl = create_surf(adj_size(135), adj_size(40), SDL_SWSURFACE);
    SDL_FillRect(pBackgroundTmpl, NULL, map_rgba(pBackgroundTmpl->format, bg_color));

    create_frame(pBackgroundTmpl,
                 0, 0, pBackgroundTmpl->w - 1, pBackgroundTmpl->h - 1,
                 get_theme_color(COLOR_THEME_HELPDLG_FRAME));

    utype_count = 0;
    unit_type_iterate(ut) {

      /* copy background surface */
      pBackground = copy_surface(pBackgroundTmpl);

      /* blit unit name */
      copy_chars_to_utf8_str(pstr, utype_name_translation(ut));
      pText = create_text_surf_smaller_than_w(pstr, adj_size(100 - 4));
      dst.x = adj_size(35) + (pBackground->w - pText->w - adj_size(35)) / 2;
      dst.y = (pBackground->h - pText->h) / 2;
      alphablit(pText, NULL, pBackground, &dst, 255);
      FREESURFACE(pText);

      /* blit unit icon */
      pIcon = ResizeSurfaceBox(get_unittype_surface(ut, direction8_invalid()),
                               adj_size(36), adj_size(36), 1, TRUE, TRUE);
      dst.x = (adj_size(35) - pIcon->w) / 2;
      dst.y = (pBackground->h - pIcon->h) / 2;
      alphablit(pIcon, NULL, pBackground, &dst, 255);
      FREESURFACE(pIcon);

      pUnitButton = create_icon2(pBackground, pWindow->dst,
                                 WF_FREE_THEME | WF_RESTORE_BACKGROUND);

      set_wstate(pUnitButton, FC_WS_NORMAL);
      pUnitButton->action = change_unit_callback;
      add_to_gui_list(MAX_ID - utype_number(ut), pUnitButton);

      if (utype_count++ >= 10) {
        set_wflag(pUnitButton, WF_HIDDEN);
      }

    } unit_type_iterate_end;

    FREESURFACE(pBackgroundTmpl);

    pHelpDlg->pEndActiveWidgetList = pDock->prev;
    pHelpDlg->pBeginWidgetList = pUnitButton ? pUnitButton : pCloseButton;
    pHelpDlg->pBeginActiveWidgetList = pHelpDlg->pBeginWidgetList;

    if (utype_count > 10) {
      pHelpDlg->pActiveWidgetList = pHelpDlg->pEndActiveWidgetList;
      scrollbar_width = create_vertical_scrollbar(pHelpDlg, 1, 10, TRUE, TRUE);
    }

    /* toggle techs list button */
    pListToggleButton = create_themeicon_button_from_chars(current_theme->UP_Icon,
                          pWindow->dst,  _("Units"), adj_font(10), 0);
#if 0
    pListToggleButton->action = toggle_full_tree_mode_in_help_dlg_callback;
    if (pStore->show_tree) {
      set_wstate(pListToggleButton, FC_WS_NORMAL);
    }
#endif

    widget_resize(pListToggleButton, adj_size(160), adj_size(15));
    pListToggleButton->string_utf8->fgcol = *get_theme_color(COLOR_THEME_HELPDLG_TEXT);

    add_to_gui_list(ID_BUTTON, pListToggleButton);

    pDock = pListToggleButton;
    pStore->pDock = pDock;
  } else {
    created = FALSE;
    scrollbar_width = (pHelpDlg->pScroll ? pHelpDlg->pScroll->pUp_Left_Button->size.w : 0);
    pWindow = pHelpDlg->pEndWidgetList;
    pStore = (struct UNITS_BUTTONS *)pWindow->data.ptr;
    pDock = pStore->pDock;

    area = pWindow->area;

    /* delete any previous list entries */
    if (pDock != pHelpDlg->pBeginWidgetList) {
      del_group_of_widgets_from_gui_list(pHelpDlg->pBeginWidgetList,
                                         pDock->prev);
      pHelpDlg->pBeginWidgetList = pDock;
    }
  }

  pUnitType = utype_by_number(type_id);
  pUnitNameLabel= create_iconlabel_from_chars(
                adj_surf(get_unittype_surface(pUnitType, direction8_invalid())),
                pWindow->dst, utype_name_translation(pUnitType),
                adj_font(24), WF_FREE_THEME);

  pUnitNameLabel->ID = ID_LABEL;
  DownAdd(pUnitNameLabel, pDock);
  pDock = pUnitNameLabel;


  {
    char buf[2048];

    fc_snprintf(buf, sizeof(buf), "%s %d %s",
                _("Cost:"), utype_build_shield_cost_base(pUnitType),
                PL_("shield", "shields", utype_build_shield_cost_base(pUnitType)));

    if (pUnitType->pop_cost) {
      cat_snprintf(buf, sizeof(buf), " %d %s",
                   pUnitType->pop_cost, PL_("citizen", "citizens",
                                            pUnitType->pop_cost));
    }

    cat_snprintf(buf, sizeof(buf), "      %s",  _("Upkeep:"));

    if (pUnitType->upkeep[O_SHIELD]) {
      cat_snprintf(buf, sizeof(buf), " %d %s",
                   pUnitType->upkeep[O_SHIELD], PL_("shield", "shields",
                                                    pUnitType->upkeep[O_SHIELD]));
    }
    if (pUnitType->upkeep[O_FOOD]) {
      cat_snprintf(buf, sizeof(buf), " %d %s",
                   pUnitType->upkeep[O_FOOD], PL_("food", "foods",
                                                  pUnitType->upkeep[O_FOOD]));
    }
    if (pUnitType->upkeep[O_GOLD]) {
      cat_snprintf(buf, sizeof(buf), " %d %s",
                   pUnitType->upkeep[O_GOLD], PL_("gold", "golds",
                                                  pUnitType->upkeep[O_GOLD]));
    }
    if (pUnitType->happy_cost) {
      cat_snprintf(buf, sizeof(buf), " %d %s",
                   pUnitType->happy_cost, PL_("citizen", "citizens",
                                              pUnitType->happy_cost));
    }

    cat_snprintf(buf, sizeof(buf), "\n%s %d %s %d %s %s\n%s %d %s %d %s %d",
              _("Attack:"), pUnitType->attack_strength,
              _("Defense:"), pUnitType->defense_strength,
              _("Move:"), move_points_text(pUnitType->move_rate, TRUE),
              _("Vision:"), pUnitType->vision_radius_sq,
              _("FirePower:"), pUnitType->firepower,
              _("Hitpoints:"), pUnitType->hp);

    pUnitInfoLabel = create_iconlabel_from_chars(NULL, pWindow->dst, buf,
                                                 adj_font(12), 0);
    pUnitInfoLabel->ID = ID_LABEL;
    DownAdd(pUnitInfoLabel, pDock);
    pDock = pUnitInfoLabel;
  }

  /* requirement */
  pRequirementLabel = create_iconlabel_from_chars(NULL, pWindow->dst,
                                                  _("Requirement:"),
                                                  adj_font(12), 0);
  pRequirementLabel->ID = ID_LABEL;
  DownAdd(pRequirementLabel, pDock);
  pDock = pRequirementLabel;

  if (A_NEVER == pUnitType->require_advance
      || advance_by_number(A_NONE) == pUnitType->require_advance) {
    pRequirementLabel2 = create_iconlabel_from_chars(NULL, pWindow->dst,
                                                     Q_("?tech:None"), adj_font(12), 0);
    pRequirementLabel2->ID = ID_LABEL;
  } else {
    pRequirementLabel2 = create_iconlabel_from_chars(NULL, pWindow->dst,
          advance_name_translation(pUnitType->require_advance),
          adj_font(12),
          WF_RESTORE_BACKGROUND);
    pRequirementLabel2->ID = MAX_ID - advance_number(pUnitType->require_advance);
    pRequirementLabel2->string_utf8->fgcol = *get_tech_color(advance_number(pUnitType->require_advance));
    pRequirementLabel2->action = change_tech_callback;
    set_wstate(pRequirementLabel2, FC_WS_NORMAL);
  }
  DownAdd(pRequirementLabel2, pDock);
  pDock = pRequirementLabel2;
  pStore->pRequirementButton = pRequirementLabel2;

  /* obsolete by */
  pObsoleteByLabel = create_iconlabel_from_chars(NULL, pWindow->dst,
                                                 _("Obsolete by:"),
                                                 adj_font(12), 0);
  pObsoleteByLabel->ID = ID_LABEL;
  DownAdd(pObsoleteByLabel, pDock);
  pDock = pObsoleteByLabel;

  if (pUnitType->obsoleted_by == U_NOT_OBSOLETED) {
    pObsoleteByLabel2 = create_iconlabel_from_chars(NULL, pWindow->dst,
                                                    Q_("?utype:None"),
                                                    adj_font(12), 0);
    pObsoleteByLabel2->ID = ID_LABEL;
  } else {
    const struct unit_type *utype = pUnitType->obsoleted_by;

    pObsoleteByLabel2 = create_iconlabel_from_chars(NULL, pWindow->dst,
                                                    utype_name_translation(utype),
                                                    adj_font(12),
                                                    WF_RESTORE_BACKGROUND);
    pObsoleteByLabel2->string_utf8->fgcol = *get_tech_color(advance_number(utype->require_advance));
    pObsoleteByLabel2->ID = MAX_ID - utype_number(pUnitType->obsoleted_by);
    pObsoleteByLabel2->action = change_unit_callback;
    set_wstate(pObsoleteByLabel2, FC_WS_NORMAL);
  }
  DownAdd(pObsoleteByLabel2, pDock);
  pDock = pObsoleteByLabel2;
  pStore->pObsoleteByButton = pObsoleteByLabel2;

  /* helptext */
  start_x = (area.x + 1 + scrollbar_width + pHelpDlg->pActiveWidgetList->size.w + adj_size(20));

  buffer[0] = '\0';
  helptext_unit(buffer, sizeof(buffer), client.conn.playing, "", utype_by_number(type_id));
  if (buffer[0] != '\0') {
    utf8_str *ustr = create_utf8_from_char(buffer, adj_font(12));

    convert_utf8_str_to_const_surface_width(ustr, adj_size(640) - start_x - adj_size(20));
    pHelptextLabel = create_iconlabel(NULL, pWindow->dst, ustr, 0);
    pHelptextLabel->ID = ID_LABEL;
    DownAdd(pHelptextLabel, pDock);
    pDock = pHelptextLabel;
    text = TRUE;
  }

  pHelpDlg->pBeginWidgetList = pHelptextLabel ? pHelptextLabel : pObsoleteByLabel2;

  /* --------------------------------------------------------- */
  if (created) {

    pSurf = theme_get_background(theme, BACKGROUND_HELPDLG);
    if (resize_window(pWindow, pSurf, NULL, adj_size(640), adj_size(480))) {
      FREESURFACE(pSurf);
    }

    area = pWindow->area;

    widget_set_position(pWindow,
                        (main_window_width() - pWindow->size.w) / 2,
                        (main_window_height() - pWindow->size.h) / 2);

    /* exit button */
    pCloseButton = pWindow->prev;
    widget_set_position(pCloseButton,
                        area.x + area.w - pCloseButton->size.w - 1,
                        pWindow->size.y + adj_size(2));

    /* list toggle button */
    pListToggleButton = pStore->pDock;
    widget_set_position(pListToggleButton, area.x, area.y);

    /* list entries */
    h = setup_vertical_widgets_position(1, area.x + scrollbar_width,
                                           area.y + pListToggleButton->size.h, 0, 0,
                                           pHelpDlg->pBeginActiveWidgetList,
                                           pHelpDlg->pEndActiveWidgetList);

    /* scrollbar */
    if (pHelpDlg->pScroll) {
      setup_vertical_scrollbar_area(pHelpDlg->pScroll,
                                    area.x, area.y + pListToggleButton->size.h,
                                    h, FALSE);
    }
  }

  pUnitNameLabel = pStore->pDock->prev;
  widget_set_position(pUnitNameLabel, start_x, area.y + adj_size(16));

  start_y = pUnitNameLabel->size.y + pUnitNameLabel->size.h + adj_size(10);

  pUnitInfoLabel = pUnitNameLabel->prev;
  widget_set_position(pUnitInfoLabel, start_x, start_y);

  start_y += pUnitInfoLabel->size.h;

  pRequirementLabel = pStore->pRequirementButton->next;
  widget_set_position(pRequirementLabel, start_x, start_y);

  pRequirementLabel2 = pStore->pRequirementButton;
  widget_set_position(pRequirementLabel2,
                      pRequirementLabel->size.x + pRequirementLabel->size.w + adj_size(5),
                      start_y);

  pObsoleteByLabel = pStore->pObsoleteByButton->next;
  widget_set_position(pObsoleteByLabel,
                      pRequirementLabel2->size.x + pRequirementLabel2->size.w + adj_size(10),
                      start_y);

  pObsoleteByLabel2 = pStore->pObsoleteByButton;
  widget_set_position(pObsoleteByLabel2,
                      pObsoleteByLabel->size.x + pObsoleteByLabel->size.w + adj_size(5),
                      start_y);

  start_y += pObsoleteByLabel2->size.h + adj_size(20);

  if (text) {
    pHelptextLabel = pStore->pObsoleteByButton->prev;
    widget_set_position(pHelptextLabel, start_x, start_y);
  }

  redraw_unit_info_dlg();
}

/* =============================================== */
/* ==================== Tech Tree ================ */
/* =============================================== */

/**********************************************************************//**
  User requested new tech help
**************************************************************************/
static int change_tech_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    popup_tech_info(MAX_ID - pWidget->ID);
  }

  return -1;
}

/**********************************************************************//**
  User requested new tech tree
**************************************************************************/
static int show_tech_tree_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    struct TECHS_BUTTONS *pStore = (struct TECHS_BUTTONS *)pHelpDlg->pEndWidgetList->data.ptr;

    pStore->show_tree = !pStore->show_tree;
    if (!pStore->show_tree) {
      pStore->show_full_tree = FALSE;
      pStore->pDock->theme2 = current_theme->UP_Icon;
    }
    popup_tech_info(MAX_ID - pStore->pDock->prev->ID);
  }

  return -1;
}

/**********************************************************************//**
  Refresh tech help dialog
**************************************************************************/
static void redraw_tech_info_dlg(void)
{
  SDL_Color bg_color = {255, 255, 255, 64};
  struct widget *pWindow = pHelpDlg->pEndWidgetList;
  struct TECHS_BUTTONS *pStore = (struct TECHS_BUTTONS *)pWindow->data.ptr;
  SDL_Surface *pText0, *pText1 = NULL;
  utf8_str *pstr;
  SDL_Rect dst;

  redraw_group(pWindow->prev, pWindow, FALSE);

  dst.x = pStore->pDock->prev->prev->size.x - adj_size(10);
  dst.y = pStore->pDock->prev->prev->size.y - adj_size(10);
  dst.w = pWindow->size.w - (dst.x - pWindow->size.x) - adj_size(10);
  dst.h = pWindow->size.h - (dst.y - pWindow->size.y) - adj_size(10);

  fill_rect_alpha(pWindow->dst->surface, &dst, &bg_color);

  create_frame(pWindow->dst->surface,
               dst.x, dst.y, dst.w, dst.h,
               get_theme_color(COLOR_THEME_HELPDLG_FRAME));

  /* -------------------------- */
  pstr = create_utf8_from_char(_("Allows"), adj_font(14));
  pstr->style |= TTF_STYLE_BOLD;

  pText0 = create_text_surf_from_utf8(pstr);
  dst.x = pStore->pDock->prev->prev->size.x;
  if (pStore->pTargets[0]) {
    dst.y = pStore->pTargets[0]->size.y - pText0->h;
  } else {
    dst.y = pStore->pDock->prev->prev->size.y
              + pStore->pDock->prev->prev->size.h + adj_size(10);
  }

  alphablit(pText0, NULL, pWindow->dst->surface, &dst, 255);
  FREESURFACE(pText0);

  if (pStore->pSub_Targets[0]) {
    int i;

    change_ptsize_utf8(pstr, adj_font(12));

    copy_chars_to_utf8_str(pstr, _("( with "));
    pText0 = create_text_surf_from_utf8(pstr);

    copy_chars_to_utf8_str(pstr, _(" )"));
    pText1 = create_text_surf_from_utf8(pstr);
    i = 0;
    while (i < 6 && pStore->pSub_Targets[i]) {
      dst.x = pStore->pSub_Targets[i]->size.x - pText0->w;
      dst.y = pStore->pSub_Targets[i]->size.y;

      alphablit(pText0, NULL, pWindow->dst->surface, &dst, 255);
      dst.x = pStore->pSub_Targets[i]->size.x + pStore->pSub_Targets[i]->size.w;
      dst.y = pStore->pSub_Targets[i]->size.y;

      alphablit(pText1, NULL, pWindow->dst->surface, &dst, 255);
      i++;
    }

    FREESURFACE(pText0);
    FREESURFACE(pText1);
  }
  FREEUTF8STR(pstr);

  redraw_group(pHelpDlg->pBeginWidgetList, pWindow->prev->prev, FALSE);
  widget_flush(pWindow);
}

/**********************************************************************//**
  Create tech info widgets
**************************************************************************/
static struct widget *create_tech_info(Tech_type_id tech, int width,
                                       struct widget *pWindow,
                                       struct TECHS_BUTTONS *pStore)
{
  struct widget *pWidget;
  struct widget *pLast, *pBudynki;
  struct widget *pDock = pStore->pDock;
  int i, targets_count,sub_targets_count, max_width = 0;
  int start_x, start_y, imp_count, unit_count, flags_count, gov_count;
  char buffer[bufsz];
  SDL_Surface *pSurf;

  start_x = (pWindow->area.x + adj_size(1) + width + pHelpDlg->pActiveWidgetList->size.w + adj_size(20));

  /* tech tree icon */
  pWidget = create_icon2(current_theme->Tech_Tree_Icon, pWindow->dst,
                         WF_RESTORE_BACKGROUND);

  set_wstate(pWidget, FC_WS_NORMAL);
  pWidget->action = show_tech_tree_callback;
  pWidget->ID = MAX_ID - tech;
  DownAdd(pWidget, pDock);
  pDock = pWidget;

  /* tech name (heading) */
  pWidget = create_iconlabel_from_chars(get_tech_icon(tech),
                    pWindow->dst,
                    advance_name_translation(advance_by_number(tech)),
                    adj_font(24),
                    WF_FREE_THEME);

  pWidget->ID = ID_LABEL;
  DownAdd(pWidget, pDock);
  pDock = pWidget;

  /* target techs */
  targets_count = 0;
  advance_index_iterate(A_FIRST, aidx) {
    if ((targets_count < 6)
        && (advance_required(aidx, AR_ONE) == tech
            || advance_required(aidx, AR_TWO) == tech)) {
      pWidget = create_iconlabel_from_chars(NULL, pWindow->dst,
              advance_name_translation(advance_by_number(aidx)),
              adj_font(12),
              WF_RESTORE_BACKGROUND);
      pWidget->string_utf8->fgcol = *get_tech_color(aidx);
      max_width = MAX(max_width, pWidget->size.w);
      set_wstate(pWidget, FC_WS_NORMAL);
      pWidget->action = change_tech_callback;
      pWidget->ID = MAX_ID - aidx;
      DownAdd(pWidget, pDock);
      pDock = pWidget;
      pStore->pTargets[targets_count++] = pWidget;
    }
  } advance_index_iterate_end;
  if (targets_count < 6) {
    pStore->pTargets[targets_count] = NULL;
  }

  sub_targets_count = 0;
  if (targets_count > 0) {
    int sub_tech;

    for (i = 0; i < targets_count; i++) {
      sub_tech = MAX_ID - pStore->pTargets[i]->ID;
      if (advance_required(sub_tech, AR_ONE) == tech
          && advance_required(sub_tech, AR_TWO) != A_NONE) {
        sub_tech = advance_required(sub_tech, AR_TWO);
      } else if (advance_required(sub_tech, AR_TWO) == tech
                 && advance_required(sub_tech, AR_ONE) != A_NONE) {
        sub_tech = advance_required(sub_tech, AR_ONE);
      } else {
        continue;
      }
      pWidget = create_iconlabel_from_chars(NULL, pWindow->dst,
              advance_name_translation(advance_by_number(sub_tech)),
              adj_font(12),
              WF_RESTORE_BACKGROUND);
      pWidget->string_utf8->fgcol = *get_tech_color(sub_tech);
      set_wstate(pWidget, FC_WS_NORMAL);
      pWidget->action = change_tech_callback;
      pWidget->ID = MAX_ID - sub_tech;
      DownAdd(pWidget, pDock);
      pDock = pWidget;
      pStore->pSub_Targets[sub_targets_count++] = pWidget;
    }
  }
  if (sub_targets_count < 6) {
    pStore->pSub_Targets[sub_targets_count] = NULL;
  }

  /* fill array with iprvm. icons */
  pBudynki = pWidget;

  /* target governments */
  gov_count = 0;
  governments_iterate(gov) {
    requirement_vector_iterate(&(gov->reqs), preq) {
      if (VUT_ADVANCE == preq->source.kind
          && advance_number(preq->source.value.advance) == tech) {

        pWidget = create_iconlabel_from_chars(adj_surf(get_government_surface(gov)),
                pWindow->dst,
                government_name_translation(gov),
                adj_font(14),
                WF_RESTORE_BACKGROUND | WF_SELECT_WITHOUT_BAR | WF_FREE_THEME);
        set_wstate(pWidget, FC_WS_NORMAL);
        pWidget->action = change_gov_callback;
        pWidget->ID = MAX_ID - government_index(gov);
        DownAdd(pWidget, pDock);
        pDock = pWidget;
        gov_count++;
      }
    } requirement_vector_iterate_end;
  } governments_iterate_end;

  /* target improvements */
  imp_count = 0;
  improvement_iterate(pImprove) {
    /* FIXME: this should show ranges and all the MAX_NUM_REQS reqs.
     * Currently it's limited to 1 req. Remember MAX_NUM_REQS is a compile-time
     * definition. */
    requirement_vector_iterate(&(pImprove->reqs), preq) {
      if (VUT_ADVANCE == preq->source.kind
          && advance_number(preq->source.value.advance) == tech) {
        pSurf = get_building_surface(pImprove);
        pWidget = create_iconlabel_from_chars(
                ResizeSurfaceBox(pSurf, adj_size(48), adj_size(48), 1, TRUE, TRUE),
                pWindow->dst,
                improvement_name_translation(pImprove),
                adj_font(14),
                WF_RESTORE_BACKGROUND | WF_SELECT_WITHOUT_BAR);
        set_wstate(pWidget, FC_WS_NORMAL);
        if (is_wonder(pImprove)) {
          pWidget->string_utf8->fgcol = *get_theme_color(COLOR_THEME_CITYDLG_LUX);
        }
        pWidget->action = change_impr_callback;
        pWidget->ID = MAX_ID - improvement_number(pImprove);
        DownAdd(pWidget, pDock);
        pDock = pWidget;
        imp_count++;
      }

      break;
    } requirement_vector_iterate_end;
  } improvement_iterate_end;

  unit_count = 0;
  unit_type_iterate(un) {
    struct unit_type *pUnitType = un;

    if (advance_number(pUnitType->require_advance) == tech) {
      pWidget = create_iconlabel_from_chars(
                                   ResizeSurfaceBox(get_unittype_surface(un, direction8_invalid()),
                                   adj_size(48), adj_size(48), 1, TRUE, TRUE),
                  pWindow->dst, utype_name_translation(pUnitType), adj_font(14),
                  (WF_FREE_THEME | WF_RESTORE_BACKGROUND | WF_SELECT_WITHOUT_BAR));
      set_wstate(pWidget, FC_WS_NORMAL);
      pWidget->action = change_unit_callback;
      pWidget->ID = MAX_ID - utype_number(un);
      DownAdd(pWidget, pDock);
      pDock = pWidget;
      unit_count++;
    }
  } unit_type_iterate_end;

  buffer[0] = '\0';
  if (tech != A_NONE) {
    helptext_advance(buffer, sizeof(buffer), client.conn.playing, "", tech);
  }
  if (buffer[0] != '\0') {
    utf8_str *pstr = create_utf8_from_char(buffer, adj_font(12));

    convert_utf8_str_to_const_surface_width(pstr, adj_size(640) - start_x - adj_size(20));
    pWidget = create_iconlabel(NULL, pWindow->dst, pstr, 0);
    pWidget->ID = ID_LABEL;
    DownAdd(pWidget, pDock);
    pDock = pWidget;
    flags_count = 1;
  } else {
    flags_count = 0;
  }

  pLast = pWidget;
  /* --------------------------------------------- */

  /* tree button */
  pWidget = pStore->pDock->prev;
  pWidget->size.x = pWindow->area.x + pWindow->area.w - pWidget->size.w - adj_size(17);
  pWidget->size.y = pWindow->area.y + adj_size(16);

  /* Tech label */
  pWidget = pWidget->prev;
  pWidget->size.x = start_x;
  pWidget->size.y = pWindow->area.y + adj_size(16);
  start_y = pWidget->size.y + pWidget->size.h + adj_size(30);

  if (targets_count) {
    int j, t0, t1;

    i = 0;
    j = 0;
    t1 = MAX_ID - pStore->pSub_Targets[j]->ID;
    while (i < 6 && pStore->pTargets[i]) {
      pStore->pTargets[i]->size.x = pWindow->size.x + start_x;
      pStore->pTargets[i]->size.y = start_y;

      if (pStore->pSub_Targets[j]) {
        t0 = MAX_ID - pStore->pTargets[i]->ID;
        t1 = MAX_ID - pStore->pSub_Targets[j]->ID;
        if (advance_required(t0, AR_ONE) == t1
            || advance_required(t0, AR_TWO) == t1) {
          pStore->pSub_Targets[j]->size.x = pWindow->size.x + start_x + max_width + 60;
          pStore->pSub_Targets[j]->size.y = pStore->pTargets[i]->size.y;
          j++;
        }
      }

      start_y += pStore->pTargets[i]->size.h;
      i++;
    }

    start_y += adj_size(10);
  }
  pWidget = NULL;

  if (gov_count) {
    pWidget = pBudynki->prev;
    while (gov_count-- && pWidget) {
      pWidget->size.x = pWindow->size.x + start_x;
      pWidget->size.y = start_y;
      start_y += pWidget->size.h + adj_size(2);
      pWidget = pWidget->prev;
    }
  }

  if (imp_count) {
    if (!pWidget) {
      pWidget = pBudynki->prev;
    }
    while (imp_count-- && pWidget) {
      pWidget->size.x = pWindow->size.x + start_x;
      pWidget->size.y = start_y;
      start_y += pWidget->size.h + adj_size(2);
      pWidget = pWidget->prev;
    }
  }

  if (unit_count) {
    if (!pWidget) {
      pWidget = pBudynki->prev;
    }
    while (unit_count-- && pWidget) {
      pWidget->size.x = pWindow->size.x + start_x;
      pWidget->size.y = start_y;
      start_y += pWidget->size.h + adj_size(2);
      pWidget = pWidget->prev;
    }
  }

  if (flags_count) {
    if (!pWidget) {
      pWidget = pBudynki->prev;
    }
    while (flags_count-- && pWidget) {
      pWidget->size.x = pWindow->size.x + start_x;
      pWidget->size.y = start_y;
      start_y += pWidget->size.h + adj_size(2);
      pWidget = pWidget->prev;
    }
  }

  return pLast;
}

/**********************************************************************//**
  Refresh tech tree dialog
**************************************************************************/
static void redraw_tech_tree_dlg(void)
{
  SDL_Color *line_color = get_theme_color(COLOR_THEME_HELPDLG_LINE);
  SDL_Color bg_color = {255, 255, 255, 64};
  struct widget *pWindow = pHelpDlg->pEndWidgetList;
  struct widget *pSub0, *pSub1;
  struct TECHS_BUTTONS *pStore = (struct TECHS_BUTTONS *)pWindow->data.ptr;
  struct widget *pTech = pStore->pDock->prev;
  int i,j, tech, count;
  int step;
  int mod;
  SDL_Rect dst;

  /* Redraw Window with exit button */
  redraw_group(pWindow->prev, pWindow, FALSE);

  dst.x = pWindow->area.x + pWindow->area.w - adj_size(459) - adj_size(7);
  dst.y = pWindow->area.y + adj_size(6);
  dst.w = pWindow->area.w - (dst.x - pWindow->area.x) - adj_size(10);
  dst.h = pWindow->area.h - (dst.y - pWindow->area.y) - adj_size(10);

  fill_rect_alpha(pWindow->dst->surface, &dst, &bg_color);

  create_frame(pWindow->dst->surface,
               dst.x, dst.y, dst.w, dst.h,
               get_theme_color(COLOR_THEME_HELPDLG_FRAME));

  /* Draw Req arrows */
  i = 0;
  while (i < 4 && pStore->pSub_Req[i]) {
    i++;
  }
  count = i;

  i = 0;
  while (i < 2 && pStore->pRequirementButton[i]) {
    tech = MAX_ID - pStore->pRequirementButton[i]->ID;

    /*find Sub_Req's */
    if (i) {
      pSub0 = NULL;
      for (j = count - 1; j >= 0; j--) {
        if (MAX_ID - pStore->pSub_Req[j]->ID == advance_required(tech, AR_ONE)) {
          pSub0 = pStore->pSub_Req[j];
          break;
        }
      }

      pSub1 = NULL;
      for (j = count - 1; j >= 0; j--) {
        if (MAX_ID - pStore->pSub_Req[j]->ID == advance_required(tech, AR_TWO)) {
          pSub1 = pStore->pSub_Req[j];
          break;
        }
      }
    } else {
      pSub0 = NULL;
      for (j = 0; j < 4 && pStore->pSub_Req[j]; j++) {
        if (MAX_ID - pStore->pSub_Req[j]->ID == advance_required(tech, AR_ONE)) {
          pSub0 = pStore->pSub_Req[j];
          break;
        }
      }

      pSub1 = NULL;
      for (j = 0; j < 4 && pStore->pSub_Req[j]; j++) {
        if (MAX_ID - pStore->pSub_Req[j]->ID == advance_required(tech, AR_TWO)) {
          pSub1 = pStore->pSub_Req[j];
          break;
        }
      }
    }

    /* draw main Arrow */
    create_line(pStore->pRequirementButton[i]->dst->surface,
           pStore->pRequirementButton[i]->size.x + pStore->pRequirementButton[i]->size.w,
           pStore->pRequirementButton[i]->size.y + pStore->pRequirementButton[i]->size.h / 2,
           pTech->size.x,
           pStore->pRequirementButton[i]->size.y + pStore->pRequirementButton[i]->size.h / 2,
           line_color);

    /* Draw Sub_Req arrows */
    if (pSub0 || pSub1) {
      create_line(pStore->pRequirementButton[i]->dst->surface,
             pStore->pRequirementButton[i]->size.x - adj_size(10),
             pStore->pRequirementButton[i]->size.y + pStore->pRequirementButton[i]->size.h / 2,
             pStore->pRequirementButton[i]->size.x ,
             pStore->pRequirementButton[i]->size.y + pStore->pRequirementButton[i]->size.h / 2,
             line_color);
    }

    if (pSub0) {
      create_line(pStore->pRequirementButton[i]->dst->surface,
             pStore->pRequirementButton[i]->size.x - adj_size(10),
             pSub0->size.y + pSub0->size.h / 2,
             pStore->pRequirementButton[i]->size.x - adj_size(10),
             pStore->pRequirementButton[i]->size.y + pStore->pRequirementButton[i]->size.h / 2,
             line_color);
      create_line(pStore->pRequirementButton[i]->dst->surface,
             pSub0->size.x + pSub0->size.w,
             pSub0->size.y + pSub0->size.h / 2,
             pStore->pRequirementButton[i]->size.x - adj_size(10),
             pSub0->size.y + pSub0->size.h / 2,
             line_color);
    }

    if (pSub1) {
      create_line(pStore->pRequirementButton[i]->dst->surface,
             pStore->pRequirementButton[i]->size.x - adj_size(10),
             pSub1->size.y + pSub1->size.h / 2,
             pStore->pRequirementButton[i]->size.x - adj_size(10),
             pStore->pRequirementButton[i]->size.y + pStore->pRequirementButton[i]->size.h / 2,
             line_color);
      create_line(pStore->pRequirementButton[i]->dst->surface,
             pSub1->size.x + pSub1->size.w,
             pSub1->size.y + pSub1->size.h / 2,
             pStore->pRequirementButton[i]->size.x - adj_size(10),
             pSub1->size.y + pSub1->size.h / 2,
             line_color);
    }
    i++;
  }

  i = 0;
  while (i < 6 && pStore->pTargets[i]) {
    i++;
  }
  count = i;

  if (count > 4) {
    mod = 3;
  } else {
    mod = 2;
  }

  for (i = 0; i < count; i++) {
    tech = MAX_ID - pStore->pTargets[i]->ID;
    step = pTech->size.h / (count + 1);

    switch ((i % mod)) {
    case 2:
      line_color = get_theme_color(COLOR_THEME_HELPDLG_LINE2);
      break;
    case 1:
      line_color = get_theme_color(COLOR_THEME_HELPDLG_LINE3);
      break;
    default:
      line_color = get_theme_color(COLOR_THEME_HELPDLG_LINE);
      break;
    }

    /* find Sub_Req's */
    if (advance_required(tech, AR_ONE) == MAX_ID - pTech->ID) {
      pSub0 = pTech;
    } else {
      pSub0 = NULL;
      for (j = 0; j < 6 && pStore->pSub_Targets[j]; j++) {
        if (MAX_ID - pStore->pSub_Targets[j]->ID == advance_required(tech, AR_ONE)) {
          pSub0 = pStore->pSub_Targets[j];
          break;
        }
      }
    }

    if (advance_required(tech, AR_TWO) == MAX_ID - pTech->ID) {
      pSub1 = pTech;
    } else {
      pSub1 = NULL;
      for (j = 0; j < 6 && pStore->pSub_Targets[j]; j++) {
        if (MAX_ID - pStore->pSub_Targets[j]->ID == advance_required(tech, AR_TWO)) {
          pSub1 = pStore->pSub_Targets[j];
          break;
        }
      }
    }

    /* Draw Sub_Targets arrows */
    if (pSub0 || pSub1) {
      create_line(pStore->pTargets[i]->dst->surface,
                  pStore->pTargets[i]->size.x - ((i % mod) + 1) * 6,
                  pStore->pTargets[i]->size.y + pStore->pTargets[i]->size.h / 2,
                  pStore->pTargets[i]->size.x ,
                  pStore->pTargets[i]->size.y + pStore->pTargets[i]->size.h / 2,
                  line_color);
    }

    if (pSub0) {
      int y;

      if (pSub0 == pTech) {
        y = pSub0->size.y + step * (i + 1);
      } else {
        y = pSub0->size.y + pSub0->size.h / 2;
      }

      create_line(pStore->pTargets[i]->dst->surface,
                  pStore->pTargets[i]->size.x - ((i % mod) + 1) * 6,
                  y,
                  pStore->pTargets[i]->size.x - ((i % mod) + 1) * 6,
                  pStore->pTargets[i]->size.y + pStore->pTargets[i]->size.h / 2,
                  line_color);
      create_line(pStore->pTargets[i]->dst->surface,
                  pSub0->size.x + pSub0->size.w,
                  y,
                  pStore->pTargets[i]->size.x - ((i % mod) + 1) * 6,
                  y,
                  line_color);
    }

    if (pSub1) {
      int y;

      if (pSub1 == pTech) {
        y = pSub1->size.y + step * (i + 1);
      } else {
        y = pSub1->size.y + pSub1->size.h / 2;
      }

      create_line(pStore->pTargets[i]->dst->surface,
                  pStore->pTargets[i]->size.x - ((i % mod) + 1) * 6,
                  y,
                  pStore->pTargets[i]->size.x - ((i % mod) + 1) * 6,
                  pStore->pTargets[i]->size.y + pStore->pTargets[i]->size.h / 2,
                  line_color);
      create_line(pStore->pTargets[i]->dst->surface,
                  pSub1->size.x + pSub1->size.w,
                  y,
                  pStore->pTargets[i]->size.x - ((i % mod) + 1) * 6,
                  y,
                  line_color);
    }
  }

  /* Redraw rest */
  redraw_group(pHelpDlg->pBeginWidgetList, pWindow->prev->prev, FALSE);

  widget_flush(pWindow);
}

/**********************************************************************//**
  User requested toggling between full tech tree and single tech
**************************************************************************/
static int toggle_full_tree_mode_in_help_dlg_callback(struct widget *pWidget)
{
  if (PRESSED_EVENT(Main.event)) {
    struct TECHS_BUTTONS *pStore = (struct TECHS_BUTTONS *)pHelpDlg->pEndWidgetList->data.ptr;

    if (pStore->show_full_tree) {
      pWidget->theme2 = current_theme->UP_Icon;
    } else {
      pWidget->theme2 = current_theme->DOWN_Icon;
    }
    pStore->show_full_tree = !pStore->show_full_tree;
    popup_tech_info(MAX_ID - pStore->pDock->prev->ID);
  }

  return -1;
}

/**********************************************************************//**
  Create tech tree widgets
**************************************************************************/
static struct widget *create_tech_tree(Tech_type_id tech, int width,
                                       struct widget *pWindow,
                                       struct TECHS_BUTTONS *pStore)
{
  int i, w, h, req_count , targets_count, sub_req_count, sub_targets_count;
  struct widget *pWidget;
  struct widget *pTech;
  utf8_str *pstr;
  SDL_Surface *pSurf;
  struct widget *pDock = pStore->pDock;

  pstr = create_utf8_str(NULL, 0, adj_font(10));
  pstr->style |= (TTF_STYLE_BOLD | SF_CENTER);

  copy_chars_to_utf8_str(pstr, advance_name_translation(advance_by_number(tech)));
  pSurf = create_select_tech_icon(pstr, tech, FULL_MODE);
  pWidget = create_icon2(pSurf, pWindow->dst,
                WF_FREE_THEME | WF_RESTORE_BACKGROUND);

  set_wstate(pWidget, FC_WS_NORMAL);
  pWidget->action = show_tech_tree_callback;
  pWidget->ID = MAX_ID - tech;
  DownAdd(pWidget, pDock);
  pTech = pWidget;
  pDock = pWidget;

  req_count  = 0;
  for (i = AR_ONE; i <= AR_TWO; i++) {
    Tech_type_id ar = advance_required(tech, i);
    struct advance *vap = valid_advance_by_number(ar);

    if (NULL != vap && A_NONE != ar) {
      copy_chars_to_utf8_str(pstr, advance_name_translation(vap));
      pSurf = create_select_tech_icon(pstr, ar, SMALL_MODE);
      pWidget = create_icon2(pSurf, pWindow->dst,
                WF_FREE_THEME | WF_RESTORE_BACKGROUND);
      set_wstate(pWidget, FC_WS_NORMAL);
      pWidget->action = change_tech_callback;
      pWidget->ID = MAX_ID - ar;
      DownAdd(pWidget, pDock);
      pDock = pWidget;
      pStore->pRequirementButton[i] = pWidget;
      req_count++;
    } else {
      pStore->pRequirementButton[i] = NULL;
    }
  }

  sub_req_count = 0;

  if (pStore->show_full_tree && req_count) {
    int j, sub_tech;

    for (j = 0; j < req_count; j++) {
      sub_tech = MAX_ID - pStore->pRequirementButton[j]->ID;
      for (i = AR_ONE; i <= AR_TWO; i++) {
        Tech_type_id ar = advance_required(sub_tech, i);
        struct advance *vap = valid_advance_by_number(ar);

        if (NULL != vap && A_NONE != ar) {
          copy_chars_to_utf8_str(pstr, advance_name_translation(vap));
          pSurf = create_select_tech_icon(pstr, ar, SMALL_MODE);
          pWidget = create_icon2(pSurf, pWindow->dst,
                WF_FREE_THEME | WF_RESTORE_BACKGROUND);
          set_wstate(pWidget, FC_WS_NORMAL);
          pWidget->action = change_tech_callback;
          pWidget->ID = MAX_ID - ar;
          DownAdd(pWidget, pDock);
          pDock = pWidget;
          pStore->pSub_Req[sub_req_count++] = pWidget;
        }
      }
    }
  }

  if (sub_req_count < 4) {
    pStore->pSub_Req[sub_req_count] = NULL;
  }

  targets_count = 0;
  advance_index_iterate(A_FIRST, aidx) {
    if ((targets_count < 6)
        && (advance_required(aidx, AR_ONE) == tech
            || advance_required(aidx, AR_TWO) == tech)) {
      copy_chars_to_utf8_str(pstr, advance_name_translation(advance_by_number(aidx)));
      pSurf = create_select_tech_icon(pstr, aidx, SMALL_MODE);
      pWidget = create_icon2(pSurf, pWindow->dst,
                WF_FREE_THEME | WF_RESTORE_BACKGROUND);

      set_wstate(pWidget, FC_WS_NORMAL);
      pWidget->action = change_tech_callback;
      pWidget->ID = MAX_ID - aidx;
      DownAdd(pWidget, pDock);
      pDock = pWidget;
      pStore->pTargets[targets_count++] = pWidget;
    }
  } advance_index_iterate_end;
  if (targets_count < 6) {
    pStore->pTargets[targets_count] = NULL;
  }

  sub_targets_count = 0;
  if (targets_count) {
    int sub_tech;

    for (i = 0; i < targets_count; i++) {
      sub_tech = MAX_ID - pStore->pTargets[i]->ID;
      if (advance_required(sub_tech, AR_ONE) == tech
          && advance_required(sub_tech, AR_TWO) != A_NONE) {
        sub_tech = advance_required(sub_tech, AR_TWO);
      } else if (advance_required(sub_tech, AR_TWO) == tech
                 && advance_required(sub_tech, AR_ONE) != A_NONE) {
        sub_tech = advance_required(sub_tech, AR_ONE);
      } else {
        continue;
      }

      copy_chars_to_utf8_str(pstr, advance_name_translation(advance_by_number(sub_tech)));
      pSurf = create_select_tech_icon(pstr, sub_tech, SMALL_MODE);
      pWidget = create_icon2(pSurf, pWindow->dst,
        WF_FREE_THEME | WF_RESTORE_BACKGROUND);
      set_wstate(pWidget, FC_WS_NORMAL);
      pWidget->action = change_tech_callback;
      pWidget->ID = MAX_ID - sub_tech;
      DownAdd(pWidget, pDock);
      pDock = pWidget;
      pStore->pSub_Targets[sub_targets_count++] = pWidget;
    }
  }
  if (sub_targets_count < 6) {
    pStore->pSub_Targets[sub_targets_count] = NULL;
  }

  FREEUTF8STR(pstr);

  /* ------------------------------------------ */
  if (sub_req_count) {
    w = (adj_size(20) + pStore->pSub_Req[0]->size.w) * 2;
    w += (pWindow->size.w - (20 + pStore->pSub_Req[0]->size.w + w + pTech->size.w)) / 2;
  } else {
    if (req_count) {
      w = (pWindow->area.x + 1 + width + pStore->pRequirementButton[0]->size.w * 2 + adj_size(20));
      w += (pWindow->size.w - ((adj_size(20) + pStore->pRequirementButton[0]->size.w) + w + pTech->size.w)) / 2;
    } else {
      w = (pWindow->size.w - pTech->size.w) / 2;
    }
  }

  pTech->size.x = pWindow->size.x + w;
  pTech->size.y = pWindow->area.y + (pWindow->area.h - pTech->size.h) / 2;

  if (req_count) {
    h = (req_count == 1 ? pStore->pRequirementButton[0]->size.h :
        req_count * (pStore->pRequirementButton[0]->size.h + adj_size(80)) - adj_size(80));
    h = pTech->size.y + (pTech->size.h - h) / 2;
    for (i = 0; i < req_count; i++) {
      pStore->pRequirementButton[i]->size.x = pTech->size.x - adj_size(20) - pStore->pRequirementButton[i]->size.w;
      pStore->pRequirementButton[i]->size.y = h;
      h += (pStore->pRequirementButton[i]->size.h + adj_size(80));
    }
  }

  if (sub_req_count) {
    h = (sub_req_count == 1 ? pStore->pSub_Req[0]->size.h :
     sub_req_count * (pStore->pSub_Req[0]->size.h + adj_size(20)) - adj_size(20));
    h = pTech->size.y + (pTech->size.h - h) / 2;
    for (i = 0; i < sub_req_count; i++) {
      pStore->pSub_Req[i]->size.x = pTech->size.x - (adj_size(20) + pStore->pSub_Req[i]->size.w) * 2;
      pStore->pSub_Req[i]->size.y = h;
      h += (pStore->pSub_Req[i]->size.h + adj_size(20));
    }
  }

  if (targets_count) {
    h = (targets_count == 1 ? pStore->pTargets[0]->size.h :
     targets_count * (pStore->pTargets[0]->size.h + adj_size(20)) - adj_size(20));
    h = pTech->size.y + (pTech->size.h - h) / 2;
    for (i = 0; i < targets_count; i++) {
      pStore->pTargets[i]->size.x = pTech->size.x + pTech->size.w + adj_size(20);
      pStore->pTargets[i]->size.y = h;
      h += (pStore->pTargets[i]->size.h + adj_size(20));
    }
  }

  if (sub_targets_count) {
    if (sub_targets_count < 3) {
      pStore->pSub_Targets[0]->size.x = pTech->size.x + pTech->size.w - pStore->pSub_Targets[0]->size.w;
      pStore->pSub_Targets[0]->size.y = pTech->size.y - pStore->pSub_Targets[0]->size.h - adj_size(10);
      if (pStore->pSub_Targets[1]) {
        pStore->pSub_Targets[1]->size.x = pTech->size.x + pTech->size.w - pStore->pSub_Targets[1]->size.w;
        pStore->pSub_Targets[1]->size.y = pTech->size.y + pTech->size.h + adj_size(10);
      }
    } else {
      if (sub_targets_count < 5) {
        for (i = 0; i < MIN(sub_targets_count, 4); i++) {
          pStore->pSub_Targets[i]->size.x = pTech->size.x + pTech->size.w - pStore->pSub_Targets[i]->size.w;
          if (i < 2) {
            pStore->pSub_Targets[i]->size.y = pTech->size.y - (pStore->pSub_Targets[i]->size.h + adj_size(5)) * ( 2 - i );
          } else {
            pStore->pSub_Targets[i]->size.y = pTech->size.y + pTech->size.h + adj_size(5)  + (pStore->pSub_Targets[i]->size.h + adj_size(5)) * ( i - 2 );
          }
        }
      } else {
        h = (pStore->pSub_Targets[0]->size.h + adj_size(6));
        for (i = 0; i < MIN(sub_targets_count, 6); i++) {
          switch (i) {
          case 0:
            pStore->pSub_Targets[i]->size.x = pTech->size.x + pTech->size.w - pStore->pSub_Targets[i]->size.w;
            pStore->pSub_Targets[i]->size.y = pTech->size.y - h * 2;
            break;
          case 1:
            pStore->pSub_Targets[i]->size.x = pTech->size.x + pTech->size.w - pStore->pSub_Targets[i]->size.w * 2 - adj_size(10);
            pStore->pSub_Targets[i]->size.y = pTech->size.y - h - h / 2;
            break;
          case 2:
            pStore->pSub_Targets[i]->size.x = pTech->size.x + pTech->size.w - pStore->pSub_Targets[i]->size.w;
            pStore->pSub_Targets[i]->size.y = pTech->size.y - h;
            break;
          case 3:
            pStore->pSub_Targets[i]->size.x = pTech->size.x + pTech->size.w - pStore->pSub_Targets[i]->size.w;
            pStore->pSub_Targets[i]->size.y = pTech->size.y + pTech->size.h + adj_size(6);
            break;
          case 4:
            pStore->pSub_Targets[i]->size.x = pTech->size.x + pTech->size.w - pStore->pSub_Targets[i]->size.w;
            pStore->pSub_Targets[i]->size.y = pTech->size.y + pTech->size.h + adj_size(6) + h;
            break;
          default:
            pStore->pSub_Targets[i]->size.x = pTech->size.x + pTech->size.w - pStore->pSub_Targets[i]->size.w * 2 - adj_size(10);
            pStore->pSub_Targets[i]->size.y = pTech->size.y + pTech->size.h + adj_size(6) + h / 2 ;
            break;
          }
        }
      }
    }
  }

  return pWidget;
}

/**********************************************************************//**
  Show tech info
**************************************************************************/
void popup_tech_info(Tech_type_id tech)
{
  struct widget *pWindow;
  struct TECHS_BUTTONS *pStore;
  struct widget *pCloseButton = NULL;
  struct widget *pAdvanceLabel = NULL;
  struct widget *pListToggleButton = NULL;
  struct widget *pDock;
  utf8_str *title;
  utf8_str *pstr;
  SDL_Surface *pSurf;
  int h, tech_count;
  bool created;
  int scrollbar_width = 0;
  SDL_Rect area;

  if (current_help_dlg != HELP_TECH) {
    popdown_help_dialog();
  }

  /* create new dialog if it doesn't exist yet */
  if (!pHelpDlg) {
    current_help_dlg = HELP_TECH;
    created = TRUE;

    /* create dialog */
    pHelpDlg = fc_calloc(1, sizeof(struct ADVANCED_DLG));
    pStore = fc_calloc(1, sizeof(struct TECHS_BUTTONS));

    pStore->show_tree = FALSE;
    pStore->show_full_tree = FALSE;

    /* create window */
    title = create_utf8_from_char(_("Help : Advances Tree"), adj_font(12));
    title->style |= TTF_STYLE_BOLD;

    pWindow = create_window_skeleton(NULL, title, WF_FREE_DATA);
    pWindow->data.ptr = (void *)pStore;
    pWindow->action = help_dlg_window_callback;
    set_wstate(pWindow , FC_WS_NORMAL);

    add_to_gui_list(ID_WINDOW, pWindow);

    pHelpDlg->pEndWidgetList = pWindow;

    area = pWindow->area;

    /* ------------------ */

    /* close button */
    pCloseButton = create_themeicon(current_theme->Small_CANCEL_Icon, pWindow->dst,
                                    WF_WIDGET_HAS_INFO_LABEL
                                    | WF_RESTORE_BACKGROUND);
    pCloseButton->info_label =
        create_utf8_from_char(_("Close Dialog (Esc)"), adj_font(12));
    pCloseButton->action = exit_help_dlg_callback;
    set_wstate(pCloseButton, FC_WS_NORMAL);
    pCloseButton->key = SDLK_ESCAPE;

    add_to_gui_list(ID_BUTTON, pCloseButton);

    /* ------------------ */
    pDock = pCloseButton;

    /* --- create scrollable advance list on the left side ---*/
    pstr = create_utf8_str(NULL, 0, adj_font(10));
    pstr->style |= (TTF_STYLE_BOLD | SF_CENTER);

    tech_count = 0;
    advance_index_iterate(A_FIRST, i) {
      struct advance *vap = valid_advance_by_number(i);

      if (vap) {
        copy_chars_to_utf8_str(pstr, advance_name_translation(vap));
        pSurf = create_select_tech_icon(pstr, i, SMALL_MODE);
        pAdvanceLabel = create_icon2(pSurf, pWindow->dst,
                                     WF_FREE_THEME | WF_RESTORE_BACKGROUND);

        set_wstate(pAdvanceLabel, FC_WS_NORMAL);
        pAdvanceLabel->action = change_tech_callback;
        add_to_gui_list(MAX_ID - i, pAdvanceLabel);

        if (tech_count++ >= 10) {
          set_wflag(pAdvanceLabel, WF_HIDDEN);
        }
      }
    } advance_index_iterate_end;

    FREEUTF8STR(pstr);

    pHelpDlg->pEndActiveWidgetList = pDock->prev;
    pHelpDlg->pBeginWidgetList = pAdvanceLabel ? pAdvanceLabel : pCloseButton;
    pHelpDlg->pBeginActiveWidgetList = pHelpDlg->pBeginWidgetList;

    if (tech_count > 10) {
      pHelpDlg->pActiveWidgetList = pHelpDlg->pEndActiveWidgetList;
      scrollbar_width = create_vertical_scrollbar(pHelpDlg, 1, 10, TRUE, TRUE);
    }

    /* toggle techs list button */
    pListToggleButton = create_themeicon_button_from_chars(current_theme->UP_Icon,
                                                           pWindow->dst,
                                                           _("Advances"),
                                                           adj_font(10), 0);
    pListToggleButton->action = toggle_full_tree_mode_in_help_dlg_callback;
    if (pStore->show_tree) {
      set_wstate(pListToggleButton, FC_WS_NORMAL);
    }
    widget_resize(pListToggleButton, adj_size(160), adj_size(15));
    pListToggleButton->string_utf8->fgcol = *get_theme_color(COLOR_THEME_HELPDLG_TEXT);

    add_to_gui_list(ID_BUTTON, pListToggleButton);

    pDock = pListToggleButton;
    pStore->pDock = pDock;
  } else {
    created = FALSE;
    scrollbar_width = (pHelpDlg->pScroll ? pHelpDlg->pScroll->pUp_Left_Button->size.w: 0);
    pWindow = pHelpDlg->pEndWidgetList;
    pStore = (struct TECHS_BUTTONS *)pWindow->data.ptr;
    pDock = pStore->pDock;

    area = pWindow->area;

    /* delete any previous list entries */
    if (pDock != pHelpDlg->pBeginWidgetList) {
      del_group_of_widgets_from_gui_list(pHelpDlg->pBeginWidgetList, pDock->prev);
      pHelpDlg->pBeginWidgetList = pDock;
    }

    /* show/hide techs list */
    pListToggleButton = pDock;

    if (pStore->show_tree) {
      set_wstate(pListToggleButton, FC_WS_NORMAL);
    } else {
      set_wstate(pListToggleButton, FC_WS_DISABLED);
    }

    if (pStore->show_full_tree) {
      /* all entries are visible without scrolling */
      hide_group(pHelpDlg->pBeginActiveWidgetList,
                 pHelpDlg->pEndActiveWidgetList);
      hide_scrollbar(pHelpDlg->pScroll);
    } else {
      int count = pHelpDlg->pScroll->active;

      pAdvanceLabel = pHelpDlg->pActiveWidgetList;
      while (pAdvanceLabel && count--) {
        pAdvanceLabel = pAdvanceLabel->prev;
      }
      pAdvanceLabel = pAdvanceLabel->next;
      show_group(pAdvanceLabel, pHelpDlg->pActiveWidgetList);
      show_scrollbar(pHelpDlg->pScroll);
    }
  }

  /* --------------------------------------------------------- */
  if (created) {

    pSurf = theme_get_background(theme, BACKGROUND_HELPDLG);
    if (resize_window(pWindow, pSurf, NULL, adj_size(640), adj_size(480))) {
      FREESURFACE(pSurf);
    }

    area = pWindow->area;

    widget_set_position(pWindow,
                        (main_window_width() - pWindow->size.w) / 2,
                        (main_window_height() - pWindow->size.h) / 2);

    /* exit button */
    pCloseButton = pWindow->prev;
    widget_set_position(pCloseButton,
                        area.x + area.w - pCloseButton->size.w - 1,
                        pWindow->size.y + adj_size(2));

    /* list toggle button */
    pListToggleButton = pStore->pDock;
    widget_set_position(pListToggleButton, area.x, area.y);

    /* list entries */
    h = setup_vertical_widgets_position(1, area.x + scrollbar_width,
                                        area.y + pListToggleButton->size.h, 0, 0,
                                        pHelpDlg->pBeginActiveWidgetList,
                                        pHelpDlg->pEndActiveWidgetList);
    /* scrollbar */
    if (pHelpDlg->pScroll) {
      setup_vertical_scrollbar_area(pHelpDlg->pScroll,
                                    area.x, area.y + pListToggleButton->size.h,
                                    h, FALSE);
    }
  }

  if (pStore->show_tree) {
    pHelpDlg->pBeginWidgetList = create_tech_tree(tech, scrollbar_width, pWindow, pStore);
    redraw_tech_tree_dlg();
  } else {
    pHelpDlg->pBeginWidgetList = create_tech_info(tech, scrollbar_width, pWindow, pStore);
    redraw_tech_info_dlg();
  }
}
