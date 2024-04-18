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
/* State machine vars: */
var goto_exception_processing = false;    // "true" alerts other threads that we're failing out of a goto error. Disallow/abort goto clicks and client/server goto packets
var goto_active = false;                  // state for selecting goto target for a unit: i.e., mouse position changes ask server for new path
var patrol_mode = false;                  // repeat goto_path forward then backward
var rally_active = false;                 // modifies goto_active to be setting a rally point
var old_rally_active = false;             // Transitional state var remembers rally_active in Go...And mode (rally_active pathing off while dialog is up)
const RALLY_PERSIST = 2;                  // value for rally_active indicating a persistent rally point will be set */
const RALLY_DEFAULT_UTYPE_ID = 22;        // Since utype_move_rate influences pathing, a "dumb default placeholder" utype for rally pathing. City production utype comes first, Armor comes next. This is a fall-thru only for city has no types in queue nor " Armor" in ruleset
var rally_virtual_utype_id = RALLY_DEFAULT_UTYPE_ID; // Which utype gets use when requesting rally path; see line above.
var rally_city_id = null;                 // City being asked to set a rally point
var delayed_goto_active = false;          // Modifies goto_active state to give a delayed goto command
var paradrop_active = false;
var airlift_active = false;
/* # of times to force request_goto_path on the same tile: performance hack to prevent constant requests on the same tile.
 * We used to constantly request_goto_path on the same tile because the first couple of times didn't give enough time to
 * properly construct a clean path: */
const FORCE_CHECKS_AGAIN = -4;
const LAST_FORCED_CHECK = -1;  // When FORCE_CHECKS_AGAIN++ arrives at this value, we stop requesting goto paths for the same tile
var prev_goto_tile;            // counter for above
var last_dest = null;          // Only used if DEBUG_SHORT_PACKETS is on; helps us watch construction of goto segments/paths

/* States for Connect Orders (worker roads/irrigates along path) */
var connect_active = false;               // indicates that goto_active goto_path is for connect mode
var connect_extra = -1;                   // type of EXTRA to make, e.g., EXTRA_ROAD, EXTRA_IRRIGATION
var connect_activity = ACTIVITY_LAST;     // e.g., ACTIVITY_GEN_ROAD, ACTIVITY_IRRIGATE

/* State vars for blocking UI from goto updates when it's not a real GOTO */
var goto_path_skip_count = 0;             // prevents oversensitive changing of unit panel to goto panel, because even the slightest click trggers a millisecond of goto mode; this is a hack var that might not be needed anymore or could be cleaned up
const goto_path_trigger = 4;              // # of repeated calls to diplay goto_info_panel in unit info, before triggering to display it (fixes goto-drag being oversensitive in ms after the click)

/* State vars for GO...AND or lack of any "AND". Set when the goto is activated. */
var goto_last_order = -1;
var goto_last_action = -1;

/* Vars which store info about an active GOTO mode: */
var goto_dirs = [];                       // Keeps track of each tile on the map, if a goto path goes through it, which direction it goes.
var goto_request_map = {};                // Key is "unit.id,dest.x,dest.y". Caches packets for paths from server for this unit to dest so as mouse moves around we don't over-ping the server for the same paths repeatedly. If player clicks the dest while goto_active, it will also pull this map when generated the real goto order to fire off.
var goto_turns_request_map = {};          // Legacy relic appears to be residual var no longer used, slated for deletion ?
var current_goto_turns = 0;               // # of turns path has up to this point; from most recent goto_req packet; can be excised/removed: no longer used for global purposes
var legal_goto_path = null;               // set to true if last goto packet was a valid goto path; tells goto mode whether to show crosshair or "not allowed" mouse cursor
var goto_way_points = {};                 // For multi-turn gotos, records which tiles a unit end its turn on, using tile index as key
var goto_from_tile = {};                  // For sanity when drawing goto lines, knowing the tile we came from reduces logical complexity by 32x

/* In user-built paths, this stores the concatenation of decisions up to the point where user is still "indecisively" selecting the next segment */
var goto_segment = {           // If building a goto path segment, this stores the info we need
  "unit_id": -1,
  "start_tile": -1,                     // The tile_index of the START tile of the LAST (newly-being-selected-and-not-yet-concatenated) segment
  "moves_left_initially": FC_NEG_HUGE,  // moves_left on the start tile of the new segment; FC_NEG_HUGE means "use punit.movesleft"
  "fuel_left_initially": -1,   // fuel_left  "   "    "    "   "   "   "     "
  "saved_path": []             /* Contains all path info for any prior user-built pathing
  * from punit.tile up to the start tile of a newly-being-selected path segment: i.e., this
  * is a concatenation of all previously built path segments into a single historical one
  * that leads right up to the beginning of the new one being made now. This array is info-rich
  * with member data from all goto_packets and contains:
  *     dest - last tile of saved path
  *     dir[] - directions from punit.tile to dest
  *     tile[] - tile indices of each tile from punit.tile to the one before 'dest'
  *     turn[] - when arriving at tile[x+1] using dir[x], turn[x] is how many turns used getting there
  *     length - len of path in dirs
  *     movesleft - movefrags left as of arriving at 'dest'
  *     total_mc - total move cost in frags to arrive at 'dest'
  *     fuelleft - amount of fuel left as of arriving at 'dest'
  *     unit_id - punit.id
  */
};

/**************************************************************************
  Clear any existing goto path segments. Call if starting a new GOTO or
  clearing/aborting prior path segments of an existing path construction.
**************************************************************************/
function clear_goto_segment() {
  goto_segment = {           // if building a goto path segment, this stores the info we need
    "unit_id": -1,
    "start_tile": -1,                     // the tile.index of the start tile of the last segment
    "moves_left_initially": FC_NEG_HUGE,  // moves_left on the start tile of the last segment
    "fuel_left_initially": -1,            // fuel_left  "   "    "    "   "   "   "     "
    "saved_path": []                      // path, in dirs, from punit.tile to the start tile of the last segment
  };
}
/**************************************************************************
 Removes goto lines and clears goto tiles.
**************************************************************************/
function clear_goto_tiles()
{
  /* old way, > 5x performance cost
  if (renderer == RENDERER_2DCANVAS) {
    for (var x = 0; x < map['xsize']; x++) {
      for (var y = 0; y < map['ysize']; y++) {
        tiles[x + y * map['xsize']]['goto_dir'] = null;
      }
    }
  } */

/*  second way, also if we have 2D and 3D renderers:
    if (renderer == RENDERER_2DCANVAS) {
    const num_tiles = map['xsize'] * map['ysize'];
    goto_dirs = Array(num_tiles).fill(null);
  } else {    // RENDERER_WEBGL
    if (scene != null && goto_lines != null) {
      for (var i = 0; i < goto_lines.length; i++) {
        scene.remove(goto_lines[i]);
      }
      goto_lines = [];
    }
  } */
  // The new third way, all the above is replaced:
  const num_tiles = map['xsize'] * map['ysize'];
  goto_dirs = Array(num_tiles).fill(null);

  legal_goto_path = null;
}
/**************************************************************************
 Whether any user-built path concatenation has been stashed as the
 base-path on which current goto path reqs are building.
**************************************************************************/
function is_goto_segment_active() {
  return (goto_segment.start_tile > -1);
}

/**************************************************************************
  If a new path-segment starting at tile_index is requested, we must first
  make sure that tile isn't in previous path, in order to prevent the
  same tile from appearing twice or more in the same goto_path. Although
  often it would work, we're conservatvely restricting it for sanity:
    (1) it's inefficient to revisit the same tile later in the path,
    (2) goto_dirs[tile.index] only stores one dir for a tile, not 2.
    (3) 'dest' in the key of goto_request_map could cause overwrite error
        if dest ends on a tile that has a previous goto_request_map, tho
        we could fix that (probably we already did).
**************************************************************************/
function is_tile_already_in_goto_segment(tile_index) {
  //console.log("New segment request for tile %d:",tile_index);
  //var debug_str = "Ask new seg @ tile "+tile_index+" || ";

  if (goto_segment['saved_path']
      && goto_segment['saved_path']['tile']
      && goto_segment['saved_path']['tile'].length) {

    for (i=0; i<goto_segment['saved_path']['tile'].length; i++) {
      //debug_str += goto_segment['saved_path']['tile'][i] + ":" + dir_get_name(goto_segment['saved_path']['dir'][i]) +" "
      if (goto_segment['saved_path']['tile'][i] == tile_index) {
        //console.log(debug_str);
        //console.log("*** Error, segment start already in saved_path");
        return true;
      }
    }
    //console.log(debug_str);
  }
  //console.log(debug_str+" No existing saved_path.")
  return false;
}
/**************************************************************************
  Called when hitting 'g' or tab during GOTO to set a user waypoint
**************************************************************************/
function request_goto_waypoint() {
  if (rally_active) return; // TODO: add support for rally pathing too
  if (!goto_active && !connect_active) return;

  if (get_units_in_focus().length > 1) {
    // Could be different paths for multiple units, can't stash it all.
    return;
  }
  if (!is_tile_already_in_goto_segment(canvas_pos_to_tile(mouse_x, mouse_y)['tile'])) {
    /* We only start a new segment IFF: it's a single unit getting the order,
     * the start_tile of the new segment is not in any existing segment */
    start_goto_path_segment();
  }
}
/**************************************************************************
  Called by request_goto_waypoint() to do the actual work. Locks and
  freezes a waypoint and prior path to that waypoint, into the pathing as
  a BASE-PATH which all new goto path requests will concatenate upon as if
  the unit is already on the waypoint-tile with the moves_left and
  fuel_left it will have when arriving there. i.e., save-path-up-to-here
  and let me select a path from here to add to it.
**************************************************************************/
function start_goto_path_segment()
{
  if (!goto_active || rally_active) return;

  var punit = current_focus[0];
  var ptile = canvas_pos_to_tile(mouse_x, mouse_y);

  // Grab a copy of the path that got us here to the tile we clicked TAB on:
  var prior_goto_packet;
  if (goto_request_map[punit.id + "," + ptile.x + "," + ptile.y]) {
    prior_goto_packet = goto_request_map[punit.id + "," + ptile.x + "," + ptile.y]; // REFERENCE not copy!
  }

  if (!prior_goto_packet || prior_goto_packet.length == 0) {
    goto_exception_abort("New waypoint requested before goto_request_map was built.");
    return false; // fail/abort code
  }

  current_goto_turns = prior_goto_packet['turns'];

  // Stash path to this point, pushing it to any existing segment from earlier:
  if (goto_segment.saved_path.length) { // Append to prior path
    goto_segment.saved_path = merged_goto_packet(prior_goto_packet, punit);
    if (goto_segment.saved_path===false) return false; // abort code
  } else { // Make a new path
    goto_segment.saved_path = JSON.parse(JSON.stringify(prior_goto_packet));
  }
  // Stash the starting tile for this new goto path segment!
  goto_segment.start_tile = ptile['index'];
  goto_segment["unit_id"] = punit['id'];
  // Stash moves and fuel to this point
  goto_segment.moves_left_initially = prior_goto_packet['movesleft'];
  goto_segment.fuel_left_initially = prior_goto_packet['fuelleft'];

  /* goto_segment.saved_path is going to be concatted on with future
   * goto_request_maps, so we have to clear the current goto_request_map
   * to handle the case of moving mouse around in the same tile (which
   * deliberately RE-USES any existing goto_request_map in order to not
   * over-query the server for goto_paths we've already requested and
   * got information on, and therefore would concat the same goto_request_map
   * for this waypoint on top of itself!: the dreaded "squiggle on same
   * tile problem, finally solved!") */
  goto_request_map = {};
}

/**************************************************************************
  Merges new goto path packet to any existing segments or makes a new seg
  if first merge request. Wrapper for function below.
**************************************************************************/
function merged_goto_packet(new_packet, punit) {
  return merge_goto_path_segments(goto_segment.saved_path, new_packet, punit);
}

/**************************************************************************
  Takes a new goto_packet and merges it to an old one to make a unified
  single path stored in a single goto_packet-compatible object
**************************************************************************/
function merge_goto_path_segments(old_packet, new_packet, punit)
{
  try {
    // Deep copy the old packet, don't clone a reference to it.
    var result_packet = JSON.parse(JSON.stringify(old_packet));
    // Put the ending information into it:
    if (result_packet['turn'] === undefined) {
      result_packet['turn'] = [];   // Was meant to catch an undefined error but didn't. See (*) below
    }
    result_packet['dest'] = new_packet['dest'];
    result_packet['turns'] = new_packet['turns']; // movesleft propagates into next segment request and server sends us updated turns in next packet
    result_packet['arrival_turns'] = new_packet['arrival_turns'];
    result_packet['total_mc'] += new_packet['total_mc'];
    result_packet['movesleft'] = new_packet['movesleft'];
    result_packet['length'] += new_packet['length'];
    result_packet['fuelleft'] = new_packet['fuelleft'];
    result_packet['moverate'] = new_packet['moverate'];
    if (result_packet['dir'] && result_packet['dir'].length
        && new_packet['dir'] && new_packet['dir'].length) {
      result_packet['dir'] = result_packet['dir'].concat(new_packet['dir']); // makes a new copy
    }
    if (new_packet['turn'] && new_packet['turn'].length > 0) {
      for (var i=0; i<new_packet['turn'].length; i++) {
        if (new_packet['turn'][i] !== undefined) {// (*) Shouldn't happen but apparently does
          result_packet['turn'].push(new_packet['turn'][i]/* + old_packet['turns']*/)
        }
      }
    }
    if (new_packet['arrival_turn'] && new_packet['arrival_turn'].length > 0) {
      for (var i=0; i<new_packet['arrival_turn'].length; i++) {
        if (new_packet['arrival_turn'][i] !== undefined) {// (*) Shouldn't happen but ...
          result_packet['arrival_turn'].push(new_packet['arrival_turn'][i])
        }
      }
    }
    /* Log every tile in the path */
    if (!punit) punit = current_focus[0];
    result_packet['tile'] = [];
    result_packet['tile'].push(punit['tile']);

    for (var i=1; i<result_packet['dir'].length; i++) {
      const index = i-1;
      var dir = result_packet['dir'][index];

      /* Handle waypoint-refueling layovers */
      let ptile = mapstep(index_to_tile(result_packet['tile'][index]), dir)/*['index'];*/
      if (!ptile || dir < 0) {
        if (index >= 0) { // refueling layover on same tile
          result_packet['tile'].push(result_packet['tile'][index])
        } else { // no path yet, earliest possible tile is start tile
          result_packet['tile'].push(punit.tile)
        }
      }
      /* Normal processing, no layover tile: */
      else {
        result_packet['tile'].push(mapstep(index_to_tile(result_packet['tile'][index]),
                                    dir)['index']);
      }
    }

    result_packet['tile'].push(new_packet['dest']);

    /* DEBUG */
    if (DEBUG_SHORT_PACKETS) {
      if (last_dest != new_packet.dest) { // suppress redundant debug messages
        last_dest = new_packet.dest;
        console.log("%cSEG1: %s",'color: #4AA',JSON.stringify(old_packet))
        console.log("%cSEG2: %s",'color: #7CC',JSON.stringify(new_packet))
        console.log("%cS1+2: %s",'color: #9FF',JSON.stringify(result_packet))
      }
    }
  }
  catch (error) {
    /* A known way to fail is wildly moving the mouse over many tiles setting waypoints before internal goto data
     * gets made from received server packets. Corrupt goto data can mess up client or server. Catch it here: */
    goto_exception_abort("Caught error in merge_goto_path_segment():");
    console.log(error);
    return false; // fail/abort code
  }

  return result_packet;
}

/****************************************************************************
 Waypoints made before client has time to reconstruct server pathing packets
 results in bad goto data. This function gracefully fails in such cases.
****************************************************************************/
function goto_exception_abort(code)
{
  goto_exception_processing = true;
  legal_goto_path = null;
  console.log("GOTO EXCEPTION ABORT. "+code);
  clear_all_modes();
  deactivate_goto(false);
  // Give time to flush out incoming server packets for requested GOTO paths:
  setTimeout(goto_exception_cleanup, 750);
}
function goto_exception_cleanup()
{
  // Insurance: sometimes it cleared goto_lines before server sent new ones?
  // Shouldn't be needed because we block server while goto_exception_processing,
  // but maybe goto_exception_processing was turning off too soon. TODO: just try
  // the delay on goto_exception_processing being toggled, instead.
  deactivate_goto(false);
  goto_exception_processing = false;
}
/****************************************************************************
  Show the GOTO path in the unit_goto_path packet. Ultimately this means
  putting goto_dirs[tindex] = dir, after we figure out all our other logic.
****************************************************************************/
function update_goto_path(goto_packet)
{
  var punit = units[goto_packet['unit_id']];
  var join_to_existing_segment = is_goto_segment_active();

  if (!join_to_existing_segment) {
    goto_way_points = {};       // Clear old waypoints IFF it's a new path only
    goto_from_tile = {};
  } else goto_request_map = {}; // Insurance: stashing multiple grm's in join-mode could make circularity/overwrite issues.

  var goto_path_packet = null;
  if (join_to_existing_segment && punit) {
    goto_path_packet = merged_goto_packet(goto_packet, punit);
    if (goto_path_packet===false) return false; // abort code
  } else {
    goto_path_packet = goto_packet;
  }
  legal_goto_path = goto_packet.length !== undefined;
  /* No unit_id means rally_active or path has no length. This block is
     required to show the goto info when path_len is 0 on the start tile,
     so player can see the original moves/fuel left @ start: */
  if (goto_packet['unit_id'] === undefined) {
    if (goto_active && !rally_active) {
      if (current_focus.length > 0) {
        focus_unit_id = current_focus[0]['id'];
        if (focus_unit_id) {
          update_goto_path_panel(0,0,0,units[focus_unit_id].movesleft);
        }
      }
    }
    return;
  }

  var ptile;
  var movesleft = 0;
  var ptype;

/* SET THE START AND DEST TILE: */
  /* GOTO PATH FOR A UNIT: */
  if (punit) {
    ptype = unit_type(punit);
    movesleft = punit.movesleft;
    /* This would be if we only want to draw last segment, not full path:
    ptile = join_to_existing_segment ? index_to_tile(goto_segment.start_tile) : index_to_tile(punit['tile']); */
    ptile = index_to_tile(punit['tile']);
  }
  /* otherwise, RALLY PATHING: */
  else if (goto_packet['unit_id'] == 0) { // flag for rally path
    var pcity = cities[rally_city_id];
    if (pcity == null) { // if no unit nor city then abort
      return;
    }
    // If we got here we have a city and are doing a rally path
    ptile = city_tile(pcity);
    ptype = get_next_unittype_city_has_queued(pcity);
    if (!ptype) {
      movesleft = 2 * SINGLE_MOVE; // rallies with an unknown unittype move_rate default to a path made for move_rate 2
    } else {
      movesleft = ptype.move_rate;
    }
  }
  if (ptile == null) return;
  var goaltile = index_to_tile(goto_packet['dest']);
/* </end SET THE START AND DEST TILE> */

  // Don't bother checking goto for same tile unit is on
  if (ptile==goaltile) {
    // Just change the unit goto info for the pathing and return
    if (!rally_active) update_goto_path_panel(0,0,0,punit.movesleft);
    return;
  }

/* This code block does 3 things:
    1. Calculate and record where to draw the turn boundary markers on the path.
    2. Skip over "invalid dirs" in the path: i.e., refueling layovers.
    3. Record goto_dirs so mapview can draw a lines for each tile. */
  var refuel = 0;
    /*if (renderer == RENDERER_WEBGL) {
      webgl_render_goto_line(ptile, goto_packet['dir']);
    } else {*/
    goto_way_points[ptile.index] = movesleft ? 0 : SOURCE_WAYPOINT; // no moves_left on src_tile = turn boundary
    var old_tile=null;
    var old_turn_boundary = false;
    for (let i = 0; i < goto_path_packet['dir'].length; i++) {
      if (ptile == null) break;
      let dir = goto_path_packet['dir'][i];
      let turn_boundary = (goto_path_packet['turn'][i] != goto_path_packet['arrival_turn'][i])

      if (i != 0) {
        //goto_way_points[ptile.index] &= ~DEST_WAYPOINT;
        goto_way_points[ptile.index] = 0;
      }
      if (old_turn_boundary) {
        if (old_tile) goto_way_points[old_tile.index] |= DEST_WAYPOINT; // prevent overwrite
      }
      if (i == goto_path_packet['dir'].length - 1) { // does last tile needs terminus turn-boundary marker?
          if (turn_boundary) goto_way_points[ptile.index] |= DEST_WAYPOINT;
          // Uncomment me if erroneous turn boundary markers ever happen on last tile:
          //else goto_way_points[ptile.index] = 0;
      }/*
      else if (i != 0) { // No turn boundary (except src_tile if unit has no movesleft)
        goto_way_points[ptile.index] = 0;
      }*/
      /* DEBUG missing turn boundary markers OR markers that shouldn't be there:
      console.log("i:%d == gpp.len-1 %d ... tb:%s draw_dest:%d",
                  i,goto_path_packet['dir'].length-1,turn_boundary,goto_way_points[ptile.index])*/

      old_turn_boundary = turn_boundary;

      if (dir == -1) {
        refuel++;
        continue;
      }
      goto_dirs[ptile.index] = dir;
      old_tile = ptile;
      ptile = mapstep(ptile, dir);
      goto_from_tile[ptile.index] = old_tile.index;
      if (ptile && turn_boundary) goto_way_points[ptile.index] |= SOURCE_WAYPOINT;
    }
  //}
/* </end code block does 3 things> */

  goto_request_map[goto_packet['unit_id'] + "," + goaltile['x'] + "," + goaltile['y']] = goto_packet
  current_goto_turns = goto_path_packet['arrival_turns'];

  /* This line is legacy relic that can be ignored and eventually deleted
  goto_turns_request_map[goto_packet['unit_id'] + "," + goaltile['x'] + "," + goaltile['y']]
	  = current_goto_turns; */

  if (current_goto_turns !== undefined && punit) {
    let path_length = goto_path_packet['length'];
    // Fuel units inject extra non-path 'refuel data' in the goto_packet: +++
    if (refuel) path_length -= refuel;  // remove "refuel path steps" from path_length

    let turns = current_goto_turns;
    if (turns<0) turns = 0;
    let movecost = goto_path_packet['total_mc'];
    //let remaining = parseInt(punit.movesleft - movecost);     THIS WORKS but let's try the server for getting info on multi-turn paths?
    let remaining = goto_path_packet['movesleft'];
    update_goto_path_panel(movecost,path_length,turns,remaining);
  }
  update_mouse_cursor();
}
function update_goto_path_panel(goto_move_cost, path_length, turns, remaining)
{
  /* Prevent oversensitive replacing of unit stats panel when we aren't in goto
     mode; caused by every click potentially being the start of a goto drag. */
  if (!goto_active) return;

  if (enable_goto_drag && path_length==0) {
    goto_path_skip_count++;
    if (goto_path_skip_count>goto_path_trigger) goto_path_skip_count=0;
    else return;
  }

  $("#active_unit_info").html("<span style='color:#9d9;font-size:90%'><b>"+move_points_text(goto_move_cost, false, true)+"</b></span> <span style='color:#ddd;font-size:90%'>move"+(parseInt(goto_move_cost/SINGLE_MOVE)>1 ? "s" : "")+"</span><br>"
  +( (turns>0) ? ("<span style='color:#"+(turns<1?"fd5":"f76")+";font-size:90%'><b>"+turns+"</b></span> <span style='color:#ddd;font-size:90%'> turn"+(turns>=2?"s":"")+"</span>"):"<span style='color:#bbb;font-size:90%'>in range</span>")
  +"<span style='font-size:90%;margin-left:auto;float:right;margin-right:20px;color:#7af'><span style='color:#eee'>t</span><b>"+path_length+"</b></span> <span style='color:#ddd;font-size:90%'></span><br>"
  +"<span style='font-size:90%;color:#"+(remaining>=0&&turns<1?"d7f":"f55")+"'><b>"+(remaining>=0?move_points_text(remaining, false, true):"&#8211")+"</b></span> <span style='color:#ddd;font-size:90%'> left"+"</span><br>"
  );
}

/****************************************************************************
  Show the GOTO path for middle clicked units
****************************************************************************/
function show_goto_path(goto_packet)
{
  // separate function to potentially handle cases differently
  update_goto_path(goto_packet);
}

/****************************************************************************
  When goto_active or rally_active, we periodically check mouse position
  to see if we should query the server for an updated goto path.
****************************************************************************/
function check_request_goto_path()
{
  var ptile;
  const do_new_check = (prev_mouse_x != mouse_x || prev_mouse_y != mouse_y || prev_goto_tile<=LAST_FORCED_CHECK);
  var do_goto_check = goto_active && current_focus.length > 0 && do_new_check;
  var do_rally_check = !do_goto_check && rally_active && do_new_check;

  if (do_goto_check || do_rally_check) {
    /*ptile = (renderer == RENDERER_2DCANVAS) ? canvas_pos_to_tile(mouse_x, mouse_y)
                                              : webgl_canvas_pos_to_tile(mouse_x, mouse_y); */

    ptile = canvas_pos_to_tile(mouse_x, mouse_y);

    if (ptile != null) {
      if (ptile['tile'] != prev_goto_tile) {
        clear_goto_tiles();
        /* Send request for path to server. */
        if (do_rally_check) {
          request_rally_path(rally_city_id, ptile['x'], ptile['y']);
        } else { // normal goto
          for (var i = 0; i < current_focus.length; i++) {
            request_goto_path(current_focus[i]['id'], ptile['x'], ptile['y'])
          }
        }
      }
      // We don't want to constantly request the same tile if it hasn't changed, but we used to do that because sometimes
      // the first request_goto_path+clear_goto_tiles didn't have time(?) to clean old paths and construct a new path properly:
      if (prev_goto_tile <= LAST_FORCED_CHECK) {
        prev_goto_tile ++;
        if (prev_goto_tile > LAST_FORCED_CHECK) {
          if (ptile) prev_goto_tile = ptile['tile']; // Flag to not make continuous server requests for the same tile.
        }
      } // FLAG to force request_goto_path more times to clean path redraw glitch.  FORCE_CHECKS_AGAIN can be tuned to -x which forces...
      else prev_goto_tile = FORCE_CHECKS_AGAIN; // ... request_goto_path x more times before blocking requests on the same tile.
    }
  }

  prev_mouse_x = mouse_x;
  prev_mouse_y = mouse_y;
}
