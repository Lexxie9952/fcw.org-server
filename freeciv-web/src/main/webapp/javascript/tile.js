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

  var TILE_UNKNOWN = 0;
  var TILE_KNOWN_UNSEEN = 1;
  var TILE_KNOWN_SEEN = 2;


/****************************************************************************
  Return a known_type enumeration value for the tile.

  Note that the client only has known data about its own player.
****************************************************************************/
function tile_get_known(ptile)
{
  if (ptile['known'] == null || ptile['known'] == TILE_UNKNOWN) {
    return TILE_UNKNOWN;
  } else if (ptile['known'] == TILE_KNOWN_UNSEEN) {
    return TILE_KNOWN_UNSEEN;
  } else if (ptile['known'] == TILE_KNOWN_SEEN) {
    return TILE_KNOWN_SEEN;
  }

}

/**************************************************************************
  Returns true iff the specified tile has the extra with the specified
  extra number.
**************************************************************************/
function tile_has_extra(ptile, extra)
{
  if (ptile['extras'] == null) {
    return false;
  }

  return ptile['extras'].isSet(extra);
}

function tile_resource(tile)
{
  if (tile != null && tile.extras != null) {
    const tile_extras = tile.extras.toBitSet();
    for (var extra in tile_extras) {
      if (is_extra_caused_by(extras[tile_extras[extra]], EC_RESOURCE)) {
        return tile_extras[extra];
      }
    }
  }
  return null;
}

function tile_owner(tile)
{
  return tile['owner'];
}

function tile_set_owner(tile, owner, claimer)
{
  tile['owner'] = owner;
}

function tile_worked(tile)
{
  return tile['worked'];
}

function tile_set_worked(ptile, pwork)
{
  ptile['worked'] = pwork;
}


/****************************************************************************
  Return the city on this tile (or NULL), checking for city center.
****************************************************************************/
function tile_city(ptile)
{
  if (ptile == null) return null;

  var city_id = ptile['worked'];
  var pcity = cities[city_id];

  if (pcity != null && is_city_center(pcity, ptile)) {
    return pcity;
  }
  return null;
}

/**************************************************************************
 Improve tile info message from server
**************************************************************************/
function improve_tile_info_dialog(message) 
{
  var added_text = "";

  // Default: unknown terrain
  var ttype = 0; 
  var tindex = Object.keys(terrains).length; // code for invalid/impossible terrain
  var tinvalid = Object.keys(terrains).length; 
  if (mclick_tile) {
    tindex = mclick_tile['terrain'];
    ttype = terrains[tindex];
  }

  if (mclick_tile) ttype = terrains[mclick_tile['terrain']];

  var wt = 1; // base rate of work for workers units, default=1
  // Calculate work rate for Workers unit if ruleset has it
  for (var i=0; i < Object.keys(unit_types).length; i++) {
    if (unit_types[i]['name'] == "Workers") {
      // Figure out base worker-turn unit
      wt = unit_types[i]['move_rate'] / SINGLE_MOVE;
      break;
    }
  }

  // Terrain alteration info:
  if (ttype) {
    added_text += "<span style='color:rgb("
               +  Math.round(ttype['color_red']/2)+","+Math.round(ttype['color_green']/2)+","+Math.round(ttype['color_blue']/2)
               +  ")'><br><br><b>" + ttype['name'] + "</b><br></span>";
    const db = parseFloat(1) + parseFloat(ttype['defense_bonus'])/100;
    added_text += "Defense Bonus: " + db + "&times;<br>";
    added_text += "Movement Cost: " + ttype['movement_cost'] + "<br>"
    
    if (ttype['irrigation_time']) {
      added_text += "<span style='color:#013'>Irrigate:<b>" + Math.ceil(ttype['irrigation_time']/wt)+"</b></span>"
      if (ttype['irrigation_food_incr']) added_text+= " (+"+ttype['irrigation_food_incr']+")";
    }
    if (ttype['irrigation_result'] && ttype['irrigation_result'] != tindex && ttype['irrigation_result'] != tinvalid) 
      added_text+="&#10145;"+terrains[ttype['irrigation_result']]['name']

    if (ttype['mining_time']) {
      added_text += "&nbsp;&nbsp; <span style='color:#300'>Mine:<b>" + Math.ceil(ttype['mining_time']/wt)+"</b></span>";
      if (ttype['mining_shield_incr']) added_text+= " (+"+ttype['mining_shield_incr']+")";
    }
    if (ttype['mining_result'] && ttype['mining_result'] != tindex && ttype['mining_result'] != tinvalid)
      added_text+="&#10145;"+terrains[ttype['mining_result']]['name']

    if (ttype['transform_time'])
      added_text += "&nbsp;&nbsp; <span style='color:#430'>Transform:<b>" + Math.ceil(ttype['transform_time']/wt)+"</b></span>";
    if (ttype['transform_result'] && ttype['transform_result'] != tindex && ttype['transform_result'] != tinvalid)
      added_text+="&#10145;"+terrains[ttype['transform_result']]['name']

    if (ttype['road_time'])
      added_text += "&nbsp;&nbsp; Road:<b>" + Math.ceil(ttype['road_time']/wt)+"</b>";
    
    added_text += "<br>" + ttype['helptext'].replace(stripChar, "")+"<br><br>";
  }
  
  // Warcalc odds.
  var saved_current_focus = current_focus.map((x) => x); // clone it to allow later restore
  current_focus = tile_units(mclick_tile); // need to temporarily use this for function call
  
  if (my_hp && current_focus && current_focus.length > 0) warcalc_set_default_vals();
  if (my_hp && their_hp && current_focus && current_focus.length > 0) {
    // Store values in Warcalc Tab, to allow future reference + function re-use:
    //strength
    $("#id_astr").val(my_str);
    $("#id_dstr").val(their_str);
    //hitpoints
    $("#id_ahp").val(my_hp);
    $("#id_dhp").val(their_hp);
    //firepower 
    $("#id_afp").val(my_fp);
    $("#id_dfp").val(their_fp);
    //results
    $("#att_win").html("");
    $("#def_win").html("");

    warcalc_compute();

    added_text += "<b>Combat odds:</b><br>";
    added_text += "A:<b>"+my_str.toFixed(1)+"</b>  HP:<b>"+my_hp+"</b>  FP:<b>"+my_fp+"</b>  (Attacker)<br>";
    added_text += "D:<b>"+their_str.toFixed(1)+"</b>  HP:<b>"+their_hp+"</b>  FP:<b>"+their_fp+"</b>  ";
    added_text += "("+unit_types[current_focus[0]['type']]['name']+")<br>";
    added_text += $("#att_win").html();
    added_text += "\n<div id='click_calc' style='cursor:pointer;' onclick='improve_tile_info_warcalc_click()'>"
               +  "<u>Click</u> to apply other bonuses</div>";
  }
  current_focus = saved_current_focus;  // restore current_focus back to whatever it was
  return message+added_text;
}
function improve_tile_info_warcalc_click()
{
  $("#ui-id-8").trigger("click");
  warcalc_screen();
}

