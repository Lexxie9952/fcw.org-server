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

#include <gtk/gtk.h>

/* utility */
#include "fcintl.h"

/* common */
#include "events.h"

/* client */
#include "options.h"

/* client/gui-gtk-4.0 */
#include "colors.h"
#include "gui_main.h"
#include "gui_stuff.h"

#include "messagedlg.h"

#define NUM_LISTS 1

/*************************************************************************/
static struct gui_dialog *shell;
static GtkListStore *models[NUM_LISTS];

static void create_messageopt_dialog(void);
static void messageopt_response(struct gui_dialog *dlg, int response,
                                gpointer data);
static void item_toggled(GtkCellRendererToggle *cell,
                         gchar *spath, gpointer data);

/**********************************************************************//**
  Open messageoptions dialog
**************************************************************************/
void popup_messageopt_dialog(void)
{
  if (!shell) {
    create_messageopt_dialog();
  }

  gui_dialog_raise(shell);
}

/**********************************************************************//**
  Create messageoptions dialog
**************************************************************************/
static void create_messageopt_dialog(void)
{
  GtkWidget *form, *explanation;
  int n, i = 0, j;

  gui_dialog_new(&shell, GTK_NOTEBOOK(top_notebook), NULL, TRUE);
  gui_dialog_set_title(shell, _("Message Options"));

  gui_dialog_set_default_size(shell, -1, 450);

  gui_dialog_add_button(shell, NULL, _("_OK"), GTK_RESPONSE_OK);
  gui_dialog_add_button(shell, NULL, _("_Cancel"), GTK_RESPONSE_CANCEL);

  explanation = gtk_label_new(NULL);
  g_object_set(explanation, "margin", 4, NULL);
  gtk_label_set_markup(GTK_LABEL(explanation),
    _("Where to display messages?\n"
      "<b>Out</b>put window ; "
      "<b>Mes</b>sages window ; "
      "<b>Pop</b>up individual window"));
  gtk_widget_set_name(explanation, "comment_label");
  gtk_container_add(GTK_CONTAINER(shell->vbox), explanation);
  gtk_widget_show(explanation);	

  form = gtk_grid_new();
  gtk_container_add(GTK_CONTAINER(shell->vbox), form);

  for (n = 0; n < NUM_LISTS; n++) {
    models[n] = gtk_list_store_new(5, G_TYPE_BOOLEAN, G_TYPE_BOOLEAN,
                                   G_TYPE_BOOLEAN, G_TYPE_STRING, G_TYPE_INT);
  }

  sorted_event_iterate(ev) {
    GtkTreeIter it;
    GValue value = { 0, };

    n = (i++ % NUM_LISTS);

    gtk_list_store_append(models[n], &it);

    g_value_init(&value, G_TYPE_STRING);
    g_value_set_static_string(&value, get_event_message_text(ev));
    gtk_list_store_set_value(models[n], &it, 3, &value);
    g_value_unset(&value);

    gtk_list_store_set(models[n], &it, 4, ev, -1);

    for (j = 0; j < NUM_MW; j++) {
      gtk_list_store_set(models[n], &it, j, messages_where[ev] & (1<<j), -1);
    }
  } sorted_event_iterate_end;

  for (n = 0; n < NUM_LISTS; n++) {
    GtkWidget *view, *sw;
    GtkCellRenderer *renderer;
    GtkTreeViewColumn *column;

    view = gtk_tree_view_new_with_model(GTK_TREE_MODEL(models[n]));
    gtk_widget_set_hexpand(view, TRUE);
    gtk_widget_set_vexpand(view, TRUE);
    g_object_unref(models[n]);

    renderer = gtk_cell_renderer_text_new();
    column = gtk_tree_view_column_new_with_attributes(_("Event"),
	renderer, "text", 3, NULL);
    gtk_tree_view_append_column(GTK_TREE_VIEW(view), column);
    gtk_tree_view_column_set_expand(column, TRUE);

    renderer = gtk_cell_renderer_toggle_new();
    g_object_set_data(G_OBJECT(renderer), "column", GINT_TO_POINTER(0));
    g_signal_connect(renderer, "toggled", G_CALLBACK(item_toggled), models[n]);

    gtk_tree_view_insert_column_with_attributes(GTK_TREE_VIEW(view),
                                                -1, _("Out"), renderer,
                                                "active", 0, NULL);

    renderer = gtk_cell_renderer_toggle_new();
    g_object_set_data(G_OBJECT(renderer), "column", GINT_TO_POINTER(1));
    g_signal_connect(renderer, "toggled", G_CALLBACK(item_toggled), models[n]);

    gtk_tree_view_insert_column_with_attributes(GTK_TREE_VIEW(view),
                                                -1, _("Mes"), renderer,
                                                "active", 1, NULL);

    renderer = gtk_cell_renderer_toggle_new();
    g_object_set_data(G_OBJECT(renderer), "column", GINT_TO_POINTER(2));
    g_signal_connect(renderer, "toggled", G_CALLBACK(item_toggled), models[n]);

    gtk_tree_view_insert_column_with_attributes(GTK_TREE_VIEW(view),
                                                -1, _("Pop"), renderer,
                                                "active", 2, NULL);

    sw = gtk_scrolled_window_new(NULL, NULL);
    gtk_scrolled_window_set_shadow_type(GTK_SCROLLED_WINDOW(sw),
					GTK_SHADOW_ETCHED_IN);
    gtk_container_add(GTK_CONTAINER(sw), view);

    gtk_scrolled_window_set_policy(GTK_SCROLLED_WINDOW(sw),
				   GTK_POLICY_AUTOMATIC, GTK_POLICY_ALWAYS);
    gtk_container_add(GTK_CONTAINER(form), sw);

    gtk_tree_view_focus(GTK_TREE_VIEW(view));
  }

  gui_dialog_response_set_callback(shell, messageopt_response);
  gui_dialog_show_all(shell);
}

/**********************************************************************//**
  User responded to messageoptions dialog
**************************************************************************/
static void messageopt_response(struct gui_dialog *dlg, int response,
                                gpointer data)
{
  if (response == GTK_RESPONSE_OK) {
    ITree it;
    gint n, j, i;
    gboolean toggle;

    for (i = 0; i <= event_type_max(); i++) {
      /* Include possible undefined messages. */
      messages_where[i] = 0;
    }

    for (n = 0; n < NUM_LISTS; n++) {
      GtkTreeModel *pmodel = GTK_TREE_MODEL(models[n]);

      for (itree_begin(pmodel, &it); !itree_end(&it); itree_next(&it)) {
        for (j = 0; j < NUM_MW; j++) {
          itree_get(&it, j, &toggle, 4, &i, -1);

	  if (toggle)
	    messages_where[i] |= (1<<j);
	}
      }
    }
  }
  gui_dialog_destroy(dlg);
}

/**********************************************************************//**
  User toggled item
**************************************************************************/
static void item_toggled(GtkCellRendererToggle *cell,
                         gchar *spath, gpointer data)
{
  GtkTreeModel *model = GTK_TREE_MODEL(data);
  GtkTreePath *path;
  GtkTreeIter it;
  gboolean toggle;
  gint column;

  path = gtk_tree_path_new_from_string(spath);

  column = GPOINTER_TO_INT(g_object_get_data(G_OBJECT(cell), "column"));

  gtk_tree_model_get_iter(model, &it, path);
  gtk_tree_model_get(model, &it, column, &toggle, -1);
  toggle ^= 1;
  gtk_list_store_set(GTK_LIST_STORE(model), &it, column, toggle, -1);

  gtk_tree_path_free(path);
}
