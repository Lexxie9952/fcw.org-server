/**********************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2018  The Freeciv-web project

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

***********************************************************************/

/* TODO: update after changes in tile or other units.
 * Or at least add a refresh button.
 * Current workaround: cancel and give the order again.
 */

/****************************************************************************
  Ask the player to select a target.
****************************************************************************/
function popup_pillage_selection_dialog(punit)
{
  if (punit == null) return;
  var tgt = get_what_can_unit_pillage_from(punit, null);
  if (tgt.length == 0) return;

  var id = '#pillage_sel_dialog_' + punit['id'];

  remove_active_dialog(id);
  $("<div id='pillage_sel_dialog_" + punit['id'] + "'></div>").appendTo("div#game_page");
  $("#pillage_sel_dialog_"+punit['id']).css("white-space","pre-wrap"); // allow \n to work.
  // Prepare needed text strings used inside the dialog: *****
  var pstats = unit_get_extra_stats(punit);
  var odds = pstats.iPillage_odds + 5 * punit.veteran; // +5% for each veteran level.
  var moves_remaining = punit.movesleft - (pstats.iPillage_moves*SINGLE_MOVE);
  if (moves_remaining < 0) moves_remaining = 0;
  var regular_pillage_available = unit_has_dual_pillage_options(punit);
  // **********
  $(id).append(document.createTextNode(unit_types[punit['type']]['name']
              + " performing " + unit_get_pillage_name(punit) + ":\n"
              + (unit_can_iPillage(punit) ? "(" + unit_moves_left(punit) + " moves - " + pstats.iPillage_moves + " spent "
                                        + " = " + move_points_text(moves_remaining, false) + " left)\n"
                                        : "")
              ));

  var button_id_prefix = 'pillage_sel_' + punit['id'] + '_';
  var buttons = [];
  for (var i = 0; i < tgt.length; i++) {
    var extra_id = tgt[i];
    if (extra_id == EXTRA_NONE) continue;
    buttons.push({
      id     : button_id_prefix + extra_id,
      'class': 'act_sel_button',
      text   : extras[extra_id]['name'] + (regular_pillage_available ? " -- "+unit_get_pillage_name(punit)+": "+odds+"%" : ""),
      click  : function() { pillage_target_selected(event); remove_active_dialog(id); /* might need "#"+id*/ 
                            setTimeout(update_unit_focus, update_focus_delay); }
    });
  }
  if (!regular_pillage_available)
    buttons.push({
      id     : button_id_prefix + 'ANYTHING',
      'class': 'act_sel_button',
      text   : 'Just do something!',
      click  : function () {pillage_target_selected(event); remove_active_dialog(id);/* might need "#"+id*/
                            setTimeout(update_unit_focus, update_focus_delay); }
    });
  else if (regular_pillage_available) { //iPillage unit who can also do standard pillage
    var button_id_prefix = 'std_pillage_sel_' + punit['id'] + '_';
    for (var i = 0; i < tgt.length; i++) {
      var extra_id = tgt[i];
      if (extra_id == EXTRA_NONE) continue;
      buttons.push({
        id     : button_id_prefix + extra_id,
        'class': 'act_sel_button',
        text   : extras[extra_id]['name']+" -- Pillage: 100%",
        click  : function () {pillage_target_selected(event); remove_active_dialog(id); /* might need "#"+id*/
                              setTimeout(update_unit_focus, update_focus_delay); }
      });
    }
  }

  buttons.push({
    id     : 'pillage_sel_cancel_' + punit['id'],
    'class': 'act_sel_button',
    text   : 'Cancel (𝗪)',
    click  : function() {remove_active_dialog(id); /* might need "#"+id*/}
  });

  $(id).attr('title', 'Choose Target'
                      + (pstats.iPillage && !regular_pillage_available ? " (" + odds + "% odds)" : '')
  );
  $(id).dialog({
    bgiframe: true,
    modal: false,
    dialogClass: 'act_sel_dialog',
    width: 390,
    buttons: buttons,
    close: function () {remove_active_dialog(id);},
    autoOpen: true
  });

  $(id).dialog('open');
  $(id).dialog('widget').position({my:"center top", at:"center top", of:window})
  dialog_register(id);
}

/****************************************************************************
  Respond to the target selection.
****************************************************************************/
function pillage_target_selected(ev)
{
  // Standard Pillage: flag overrides iPillage default action.
  const ACTIVITY_IPILLAGE_OVERRIDE_FLAG = 1024; 

  var id = ev.target.id;
  var params, extra_id;

  if (id.startsWith("std")) {  // override iPillage for standard pillage.
    params = id.match(/std_pillage_sel_(\d*)_([^_]*)/);
    extra_id = params[2] == 'ANYTHING' ? EXTRA_NONE : parseInt(params[2], 10);
    extra_id |= ACTIVITY_IPILLAGE_OVERRIDE_FLAG; //tell server not to iPillage
  }
  else {
    params = id.match(/pillage_sel_(\d*)_([^_]*)/);
    extra_id = params[2] == 'ANYTHING' ? EXTRA_NONE : parseInt(params[2], 10);
  }
  request_new_unit_activity(units[parseInt(params[1], 10)],
                            ACTIVITY_PILLAGE, extra_id);
  
  remove_active_dialog(id);
}
