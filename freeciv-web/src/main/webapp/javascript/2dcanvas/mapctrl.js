/**********************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2009-2015  The Freeciv-web project

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


var doubletaptimer = 0;
var touch_start_x;
var touch_start_y;

var map_select_setting_enabled = true;
var map_select_check = false;
var map_select_check_started = 0;
var map_select_active = false;
var map_select_x;
var map_select_y;
var mouse_touch_started_on_unit = false;
var mouse_click_mod_key = {shiftKey:false};
var dblclick_count = 0;
var dblclick_timeout = 0;

/****************************************************************************
  Init 2D mapctrl
****************************************************************************/
function mapctrl_init_2d()
{
  // Register keyboard and mouse listener using JQuery.
  $("#canvas").mouseup(mapview_mouse_click);
  $("#canvas").mousedown(mapview_mouse_down);
  $(window).mousemove(mouse_moved_cb);

  if (is_touch_device()) {
    $('#canvas').bind('touchstart', mapview_touch_start);
    $('#canvas').bind('touchend', mapview_touch_end);
    $('#canvas').bind('touchmove', mapview_touch_move);
  }

}

/****************************************************************************
  Triggered when the mouse button is clicked UP on the mapview canvas.
****************************************************************************/
function mapview_mouse_click(e)
{
  var rightclick = false;
  var middleclick = false;

  mouse_click_mod_key = e;  // stored to remember if shift- or ctrl- click

  //console.log("mapview_mouse_click called for mouse UP.");
                        
  /* if (!e) e = window.event; internet explorer deprecated */
  if (e.which) {
    rightclick = (e.which == 3);
    middleclick = (e.which == 2);
  } else if (e.button) {
    rightclick = (e.button == 2);
    middleclick = (e.button == 1 || e.button == 4);
  }

  if (rightclick) {
    // Handle shift-right-click and ctrl-shift-right-click for copy/paste production target
    if (mouse_click_mod_key.shiftKey && mouse_click_mod_key.ctrlKey && !mouse_click_mod_key.altKey) {
      paste_tile_target_for_prod(mouse_x, mouse_y);
    } else if (mouse_click_mod_key.shiftKey && !mouse_click_mod_key.ctrlKey && !mouse_click_mod_key.altKey) {
      copy_tile_target_for_prod(mouse_x, mouse_y);  
    } else if (mouse_click_mod_key.altKey && mouse_click_mod_key.ctrlKey) {
      key_paste_link_under_cursor();  // paste a link to a unit or tile
    }

    /* right click to re-center or get context menu on unit. */
    else if ( (!e.shiftKey && !e.altKey && !e.ctrlKey) // mod-keys don't trigger these actions
           && (!map_select_active || !map_select_setting_enabled) ) { // in drag-select mode we don't it either
      context_menu_active = true;
      recenter_button_pressed(mouse_x, mouse_y);
    } else { // map_select_active from right-click-drag: button release means select and clean up
      context_menu_active = false;
      map_select_units(mouse_x, mouse_y);
    }
    map_select_active = false;
    map_select_check = false;

  } else if (!middleclick) { // left-click
    // map_select_active could be active from an alt-left-click
    if (map_select_active) {   // button up = release from this mode, select all units in box
      context_menu_active = false;
      map_select_units(mouse_x, mouse_y);
      map_select_active = false;
      map_select_check = false;
      mapview_mouse_movement = false;
    } else {   // PROCESS NORMAL LEFT CLICK HERE
      //console.log("mapview_mouse_click about to call action_button_pressed")
      action_button_pressed(mouse_x, mouse_y, SELECT_POPUP);
    
      mapview_mouse_movement = false;
      update_mouse_cursor();
    }
  }
  keyboard_input = true;
}

/****************************************************************************
  Triggered when the mouse button is clicked DOWN on the mapview canvas.
****************************************************************************/
function mapview_mouse_down(e)
{
  //console.log("mapview_mouse_down called for mouse DOWN.");

  if (touch_device)
  {
    // TO DO: we can put alternate behaviour for touch devices here
    if ($(".context-menu-list").is(":visible"))
    {
      mouse_touch_started_on_unit = false; 
      context_menu_active = true; 
      came_from_context_menu = false;
      mapview_mouse_movement = false;
      real_mouse_move_mode = false;
      return; // leave to avoid triggering a mouse event
    }
  }
  else if ($(".context-menu-list").is(":visible")) // Context menu click-to-leave functionality for non-touch devices  
  { /* Any mouse-down event during an active context menu will:
        -Release/kill the context menu
        -Not activate other types of mouse mechanics or special states
        -Reset all mouse/UI states to a fresh clean condition
    */
    mouse_touch_started_on_unit = false; 
    context_menu_active = true; 
    came_from_context_menu = false;
    mapview_mouse_movement = false;
    real_mouse_move_mode = false;
    //last_unit_clicked = -1;  ??? optional
    return; // leave to avoid triggering a mouse-drag event
  } 

  var rightclick = false;
  var middleclick = false;

  mouse_click_mod_key = e;  // stored to remember if shift- or ctrl- click

  /* if (!e) e = window.event; INTERNET EXPLORER */
  if (e.which) {
    rightclick = (e.which == 3);
    middleclick = (e.which == 2);
  } else if (e.button) {
    rightclick = (e.button == 2);
    middleclick = (e.button == 1 || e.button == 4);
  }

  if (!rightclick && !middleclick) { /* Left mouse button is down */
    // Alt-click substitute for right-click drag for trackpad users:
    if (e.altKey && /* !e.shiftKey && !e.ctrlKey && */ !map_select_active && is_right_mouse_selection_supported()) {
      map_select_check = true;
      map_select_x = mouse_x;
      map_select_y = mouse_y;
      map_select_check_started = new Date().getTime();
  
      // The context menu blocks the right-click mouse up event on some browsers. 
      context_menu_active = false;
      return;
    }
    //console.log("Left mouse button DOWN.");
    // if (airlift_active) return;  <<<<<<<<<< TODO was this line missing?
    if (goto_active) return;
    if (paradrop_active) return; // left-clicking on your own unit in paradrop mode was selecting it, in spite of 
                                 // action_button_pressed and do_map_click checking for paradrop_active; test for fix.      
    set_mouse_touch_started_on_unit(canvas_pos_to_tile(mouse_x, mouse_y));
    // After exhaustive debugging, it was determined that check_mouse_drag_unit breaks shift-clicking
    if (!mouse_click_mod_key['shiftKey']) {
      check_mouse_drag_unit(canvas_pos_to_tile(mouse_x, mouse_y));
      // initial condition for possibly starting map drag mode
      if (!map_select_check // no map drag if we're in selection rectangle or leaving it 
          && !mouse_touch_started_on_unit // no map drag if we're dragging a unit to move it
          && map_drag_enabled             // can't drag if user disabled the mode
          && !came_from_context_menu) {   // we don't start a drag if coming out of context menu
         
          mapview_mouse_movement = true; // if you clicked out of a context menu, don't do map drag
      }
    }
    touch_start_x = mouse_x;
    touch_start_y = mouse_y;
  } else if (rightclick && e.altKey && e.ctrlKey) {
    // ctrl-alt-rightclick, which pastes link to chat
    // this section just prevents other things like tile info or 
    // context menu from happening
    context_menu_active = false;
    return false;
  } else if (middleclick || e['altKey']) {
    if (!e['ctrlKey']) { 
      popit();
      context_menu_active = false;
      return false;
    } 
  } else if (rightclick && !map_select_active && is_right_mouse_selection_supported()) {
    map_select_check = true;
    map_select_x = mouse_x;
    map_select_y = mouse_y;
    map_select_check_started = new Date().getTime();

    // The context menu blocks the right-click mouse up event on some browsers. 
    context_menu_active = false;
  }
}

/****************************************************************************
  This function is triggered when beginning a touch event on a touch device,
  eg. finger down on screen.
****************************************************************************/
function mapview_touch_start(e)
{
  //console.log("mapview_touch_start(e)");
  e.preventDefault();

  if (is_touch_device())
    add_client_message("mapview_touch_start::action_button_pressed will call, rmm==false");


  touch_start_x = e.originalEvent.touches[0].pageX - $('#canvas').position().left;
  touch_start_y = e.originalEvent.touches[0].pageY - $('#canvas').position().top;
  var ptile = canvas_pos_to_tile(touch_start_x, touch_start_y);

  var time_elapsed = Date.now()-doubletaptimer;
  if (time_elapsed < 350) {
    mclick_tile = ptile;
    popit_req(ptile);
  }

  set_mouse_touch_started_on_unit(ptile);

  doubletaptimer = Date.now();
}

/****************************************************************************
  This function is triggered when ending a touch event on a touch device,
  eg finger up from screen.
****************************************************************************/
function mapview_touch_end(e)
{
  ////
  if (is_touch_device())
    add_client_message("\nmapview_touch_end::rmm=="+real_mouse_move_mode);
  //console.log("mapview_touch_end(e) called: about to call action_button_pressed");
  //console.log("    mapview_mouse_movement=="+mapview_mouse_movement+" real_mouse_move_mode=="+real_mouse_move_mode);

  if (real_mouse_move_mode==true) {
    /* We're on a touch device and just came out of map dragging, therefore 
     * this touch_end event is NOT the user actually tapping an action.
     * Interpreting such would make the tile the drag ended on become the 
     * target for airlift, paradrop, and goto !! */
    real_mouse_move_mode = false; // dragging has ended, turn off and return
    if (is_touch_device())
      add_client_message("mapview_touch_end::abort action_button_pressed: rmm was true");

    return;
  }
  ////
  if (is_touch_device())
    add_client_message("mapview_touch_end::action_button_pressed will call, rmm==false");
  action_button_pressed(touch_start_x, touch_start_y, SELECT_POPUP);
}

/****************************************************************************
  This function is triggered on a touch move event on a touch device.
****************************************************************************/
function mapview_touch_move(e)
{
  // Evil hack
  var time_elapsed = Date.now()-doubletaptimer;

  real_mouse_move_mode = true;
  ////
  console.log("mapview_touch_move(e) called, dt="+time_elapsed);

  mouse_x = e.originalEvent.touches[0].pageX - $('#canvas').position().left;
  mouse_y = e.originalEvent.touches[0].pageY - $('#canvas').position().top;

  var diff_x = (touch_start_x - mouse_x) * 2;
  var diff_y = (touch_start_y - mouse_y) * 2;

  touch_start_x = mouse_x;
  touch_start_y = mouse_y;

  ////
  //console.log("diff_x: "+diff_x+"   diff_y: "+diff_y)
  //if (is_touch_device())
  //  add_client_message("\nmapview_touch_move -- rmm->TRUE  diff_x:"+diff_x+"   diff_y:"+diff_y);

  if (!goto_active) {
    check_mouse_drag_unit(canvas_pos_to_tile(mouse_x, mouse_y));

    mapview['gui_x0'] += diff_x;
    mapview['gui_y0'] += diff_y;
  }

  if (client.conn.playing == null) return;

  /* Request preview goto path */
  goto_preview_active = true;
  if (goto_active && current_focus.length > 0) {
    var ptile = canvas_pos_to_tile(mouse_x, mouse_y);
    if (ptile != null) {
      for (var i = 0; i < current_focus.length; i++) {
        if (i >= 20) return;  // max 20 units goto a time.
        if (goto_request_map[current_focus[i]['id'] + "," + ptile['x'] + "," + ptile['y']] == null) {
          request_goto_path(current_focus[i]['id'], ptile['x'], ptile['y']);
        }
      }
    }
  }
}

/****************************************************************************
  This function is triggered when the mouse is clicked on the city canvas.
****************************************************************************/
function city_mapview_mouse_click(e)
{
  var rightclick;
  /* if (!e) e = window.event; INTERNET EXPLORER */
  if (e.which) {
    rightclick = (e.which == 3);
  } else if (e.button) {
    rightclick = (e.button == 2);
  }

  if (!rightclick) {
    city_action_button_pressed(mouse_x, mouse_y);
  }
}

/**************************************************************************
  Do some appropriate action when the "main" mouse button (usually
  left-click) is pressed.  For more sophisticated user control use (or
  write) a different xxx_button_pressed function.
**************************************************************************/
function action_button_pressed(canvas_x, canvas_y, qtype)
{
  //console.log("action_button_pressed(..))")
  var ptile = canvas_pos_to_tile(canvas_x, canvas_y);
  clicked_city = tile_city(ptile); // record last clicked city or reset this to null

  //console.log("FUNCTION CALLED:  action_button_pressed()");
  //console.log("       abp: current_focus.length at this point is "+current_focus.length);
  //console.log("         abp: current_focus[0] location is: "+tiles[current_focus[0]['tile']]['x']+","+tiles[current_focus[0]['tile']]['y']);

  if (can_client_change_view() && ptile != null) {
    /* FIXME: Some actions here will need to check can_client_issue_orders.
     * But all we can check is the lowest common requirement. */
    //console.log("  action_button_pressed about to call do_map_click()");

     do_map_click(ptile, qtype, true);
     //console.log("       abp2: current_focus.length at this point is "+current_focus.length);
     //console.log("         abp2: current_focus[0] location is: "+tiles[current_focus[0]['tile']]['x']+","+tiles[current_focus[0]['tile']]['y']);
  } 

}


/**************************************************************************
  Do some appropriate action when the "main" mouse button (usually
  left-click) is pressed.  For more sophisticated user control use (or
  write) a different xxx_button_pressed function.
**************************************************************************/
function city_action_button_pressed(canvas_x, canvas_y)
{
  var ptile = canvas_pos_to_tile(canvas_x, canvas_y);

  if (can_client_change_view() && ptile != null) {
    /* FIXME: Some actions here will need to check can_client_issue_orders.
     * But all we can check is the lowest common requirement. */
    do_city_map_click(ptile);
  }
}


/**************************************************************************
  This will select and set focus to all the units which are in the 
  selected rectangle on the map when the mouse is selected using the right
  mouse button. 
  [canvas_x, canvas_y, map_select_x, map_select_y].
**************************************************************************/
function map_select_units(canvas_x, canvas_y)
{
  var selected_tiles = {};
  var selected_units = [];
  if (client_is_observer()) return;

  var start_x = (map_select_x < canvas_x) ? map_select_x : canvas_x; 
  var start_y = (map_select_y < canvas_y) ? map_select_y : canvas_y; 
  var end_x = (map_select_x < canvas_x) ? canvas_x : map_select_x; 
  var end_y = (map_select_y < canvas_y) ? canvas_y : map_select_y; 


  for (var x = start_x; x < end_x; x += 15) {
    for (var y = start_y; y < end_y; y += 15) {
      var ptile = canvas_pos_to_tile(x, y);
      if (ptile != null) {
        selected_tiles[ptile['tile']] = ptile;
      }
    }
  }

  for (var tile_id in selected_tiles) {
    var ptile = selected_tiles[tile_id];
    var cunits = tile_units(ptile);
    if (cunits == null) continue;
    for (var i = 0; i < cunits.length; i++) {
      var aunit = cunits[i];
      if (aunit['owner'] == client.conn.playing.playerno) {
        selected_units.push(aunit);
      }
    }
  }

  current_focus = selected_units;
  update_active_units_dialog();
}

/**************************************************************************
  Recenter the map on the canvas location, on user request.  Usually this
  is done with a right-click.
**************************************************************************/
function recenter_button_pressed(canvas_x, canvas_y)
{
  var map_scroll_border = 8;
  var big_map_size = 24;
  var ptile = canvas_pos_to_tile(canvas_x, canvas_y);
  var orig_tile = ptile;

  /* Prevent the user from scrolling outside the map. */
  if (ptile != null && ptile['y'] > (map['ysize'] - map_scroll_border)
      && map['xsize'] > big_map_size && map['ysize'] > big_map_size) {
    ptile = map_pos_to_tile(ptile['x'], map['ysize'] - map_scroll_border);
  }
  if (ptile != null && ptile['y'] < map_scroll_border
      && map['xsize'] > big_map_size && map['ysize'] > big_map_size) {
    ptile = map_pos_to_tile(ptile['x'], map_scroll_border);
  }

  if (can_client_change_view() && ptile != null && orig_tile != null) {
    var sunit = find_visible_unit(orig_tile);
    if (!client_is_observer() && sunit != null
        && sunit['owner'] == client.conn.playing.playerno) {
      /* the user right-clicked on own unit, show context menu instead of recenter. */
      if (current_focus.length <= 1) set_unit_focus(sunit);
      $("#canvas").contextMenu(true);
      $("#canvas").contextmenu();
      clicked_city = tile_city(ptile)
    } else {
      $("#canvas").contextMenu(false);
      /* FIXME: Some actions here will need to check can_client_issue_orders.
       * But all we can check is the lowest common requirement. */
      enable_mapview_slide(ptile);
      center_tile_mapcanvas(ptile);
    }
  }
}

/**************************************************************************
  Prevent a double-tap for GOTO on a city, from doing context menu or 
  show_city_dialog. Return TRUE if cooldown period is fulfilled.
**************************************************************************/
function city_click_goto_cooldown(ptile)
{
  // If clicked city was target of the last GOTO...
  if (ptile == LAST_GOTO_TILE) {
    var elapsed_time = Date.now() - LAST_GOTO_TIMESTAMP;
    if (elapsed_time < GOTO_CLICK_COOLDOWN) {
      return false; // Clicked on a city only milliseconds after GOTO to this
                    // city! Return false to block unwanted click-actions.
    }
  } 
  return true;
}


/**************************************************************************
...
**************************************************************************/
function handle_info_text_message(packet)
{
  var message = decodeURIComponent(packet['message']);
  var lines = message.split('\n');

  /* When a line starts with the key, the regex value is used to break it
   * in four elements:
   * - text before the player's name
   * - player's name
   * - text after the player's name and before the status insertion point
   * - text after the status insertion point
  **/
  var matcher = {
    'Terri': /^(Territory of )([^(]*)(\s+\([^,]*)(.*)/,
    'City:': /^(City:[^|]*\|\s+)([^(]*)(\s+\([^,]*)(.*)/,
    'Unit:': /^(Unit:[^|]*\|\s+)([^(]*)(\s+\([^,]*)(.*)/
  }

  for (var i = 0; i < lines.length; i++) {
    var re = matcher[lines[i].substr(0, 5)];
    if (re !== undefined) {
      var pplayer = null;
      var split_txt = lines[i].match(re);
      if (split_txt != null && split_txt.length > 4) {
        pplayer = player_by_full_username(split_txt[2]);
      }
      if (pplayer != null &&
          (client.conn.playing == null || pplayer != client.conn.playing)) {
        lines[i] = split_txt[1]
                 + "<a href='#' onclick='javascript:nation_table_select_player("
                 + pplayer['playerno']
                 + ");' style='color:#134; font-weight:500;'>"
                 + split_txt[2]
                 + "</a>"
                 + split_txt[3]
                 + ", "
                 + get_player_connection_status(pplayer)
                 + split_txt[4];
      }
    }
  }
  // Make freeciv server layout issues to be more web presentable.
  message = lines.join("<br>\n");
  message = message.replace(/team<br>\n/g,"team ");
  message = message.replace(/turn<br>\n/g,"turn ");
  message = message.replace(/\|<br>\n/g,"| ");
  message = message.replace(/\|/g,"&bull;");

  message = message.replace(/Occupied with<br>\n/g,"Occupied with ");
  message = message.replace(/Not<br>\n/g,"Not ");

  message = message.replace(/<br>\n<b>Hostile/g, " <b style='color:DarkRed'>Hostile");
  message = message.replace(/<br>\nHostile/g, " <b style='color:DarkRed'>Hostile</b>");
  message = message.replace(/<b>Hostile/g, "<b style='color:DarkRed'>Hostile");
  
  message = message.replace(/<br>\n<b>Friendly/g, " <b style='color:DarkGreen'>Friendly");
  message = message.replace(/<br>\nFriendly/g, " <b style='color:DarkGreen'>Friendly</b>");
  message = message.replace(/<b>Friendly/g, "<b style='color:DarkGreen'>Friendly");
  
  message = message.replace(/<br>\n<b>Neutral/g, " <b style='color:#134'>Neutral");
  message = message.replace(/<br>\nNeutral/g, " <b style='color:#134'>Neutral</b>");
  message = message.replace(/<b>Neutral/g, "<b style='color:#134'>Neutral");
  
  message = message.replace(/<br>\n<b>Mysterious/g, " <b style='color:#304'>Mysterious");
  message = message.replace(/<br>\nMysterious/g, " <b style='color:#304'Mysterious</b>");
  message = message.replace(/<b>Mysterious/g, "<b style='color:#304'>Mysterious");

  message = message.replace(/<br>\n<b>Peaceful/g, " <b style='color:#043'>Peaceful");
  message = message.replace(/<br>\nPeaceful/g, " <b style='color:#043'Peaceful</b>");
  message = message.replace(/<b>Peaceful/g, "<b style='color:#043'>Peaceful");

  // show warning colour for 1 turn left on cease-fire
  message = message.replace(/1 turn cease-fire/g,   "<b style='color:#610'><u>1 turn</u> Cease-fire</b>");
  // standard cease-fire
  message = message.replace(/turn cease-fire/g, "turn <b style='color:#340'>Cease-fire</b>");

  message = message.replace(/<br>\nunit/g, " unit");
  message = message.replace("<br>\n   with"," &#11088; with");
  message = message.replace("[","[Continent #");
  message = message.replace("[Continent #-","[Sea #");

  show_dialog_message("Tile Information", message);
}

