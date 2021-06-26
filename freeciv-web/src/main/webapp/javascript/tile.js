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
  if (!ptile || ptile['extras'] == null) {
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

/**************************************************************************
 Returns whether the tile has a base.  true or false
**************************************************************************/
function does_tile_have_base(ptile)
{
  if (typeof EXTRA_FORTRESS !== "undefined" && tile_has_extra(ptile, EXTRA_FORTRESS))
    return true;  
  if (typeof EXTRA_FORT !== "undefined" && tile_has_extra(ptile, EXTRA_FORT))
    return true;
  if (typeof EXTRA_AIRBASE !== "undefined" && tile_has_extra(ptile, EXTRA_AIRBASE))
    return true;
  if (typeof EXTRA_NAVALBASE !== "undefined" && tile_has_extra(ptile, EXTRA_NAVALBASE))
    return true;
  if (typeof EXTRA_AIRSTRIP !== "undefined" && tile_has_extra(ptile, EXTRA_AIRSTRIP))
    return true;
  if (typeof EXTRA_CASTLE !== "undefined" && tile_has_extra(ptile, EXTRA_CASTLE))
    return true;
  if (typeof EXTRA_BUNKER !== "undefined" && tile_has_extra(ptile, EXTRA_BUNKER))
    return true;
  if (typeof EXTRA_ !== "undefined" && tile_has_extra(ptile, EXTRA_))  // hideout
    return true;
    
  return false;
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
  // other functions: handle_info_text_message (mapctrl.js)
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
    // Calculate defense bonus
    var has_river = "";
    var db = parseFloat(1) + parseFloat(ttype['defense_bonus'])/100;
    if (message.includes("River</b>")) {  // this exact string ensures no other text gives false positive
      has_river = " (<span style='color:#5d97ed;' class='black_shadow'><b>River</b></span>)";
      if (client_rules_flag[CRF_MP2_C]) db += 0.5;  // additive bonus as in for example real civ2, mp2c
      else db *= (1+extras[EXTRA_RIVER]['defense_bonus']/100); 
      db = Math.round((db + Number.EPSILON) * 100) / 100;
    }
    added_text += "<span class='black_shadow' style='color:rgb("
               + ttype['color_red']+","+ttype['color_green']+","+ttype['color_blue']
               +  ")'><br><br><b>" + ttype['name'] + "</b>"+has_river+"<br></span>";

    added_text += "Defense Bonus: <b>" + db + "&times;</b> &nbsp;&nbsp;&nbsp; Movement Cost: <b>" + ttype['movement_cost'] + "</b><br>"
    
    if (ttype['irrigation_time']) {
      added_text += "<span class='highlight_irrigation'>Irrigate:<b>" + Math.ceil(ttype['irrigation_time']/wt)+"</b></span>"
      if (ttype['irrigation_food_incr']) added_text+= " (+"+ttype['irrigation_food_incr']+")";
    }
    if (ttype['irrigation_result'] && ttype['irrigation_result'] != tindex && ttype['irrigation_result'] != tinvalid) 
      added_text+="&#10145;"+terrains[ttype['irrigation_result']]['name']

    if (ttype['mining_time']) {
      added_text += "&nbsp;&nbsp; <span class='highlight_mining'>Mine:<b>" + Math.ceil(ttype['mining_time']/wt)+"</b></span>";
      if (ttype['mining_shield_incr']) added_text+= " (+"+ttype['mining_shield_incr']+")";
    }
    if (ttype['mining_result'] && ttype['mining_result'] != tindex && ttype['mining_result'] != tinvalid)
      added_text+="&#10145;"+terrains[ttype['mining_result']]['name']

    if (ttype['transform_time'])
      added_text += "&nbsp;&nbsp; <span class='highlight_transforming'>Transform:<b>" + Math.ceil(ttype['transform_time']/wt)+"</b></span>";
    if (ttype['transform_result'] && ttype['transform_result'] != tindex && ttype['transform_result'] != tinvalid)
      added_text+="&#10145;"+terrains[ttype['transform_result']]['name']

    if (ttype['road_time'])
      added_text += "&nbsp;&nbsp; <span class='highlight_roading'>Road:<b>" + Math.ceil(ttype['road_time']/wt)+"</b></span>";
    
    added_text += "<br>" + cleaned_text(ttype['helptext'])+"<br><br>";
  }
  
  // Warcalc odds.
  warcalc_reset_roles();
  var sunits = tile_units(mclick_tile);
 
  if (my_hp && sunits && sunits.length > 0) warcalc_set_default_vals(sunits[0]);
  if (my_hp && their_hp && sunits && units[my_uid] && units[their_uid] && sunits.length > 0) {
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
    var A_val = (parseFloat(my_str)<0.1) ? my_str.toFixed(2) : my_str.toFixed(1);
    var D_val = (parseFloat(their_str)<0.1) ? their_str.toFixed(2) : their_str.toFixed(1);

    added_text += "<b>Combat odds:</b><span style='font-size:75%'> (*before base or unit-type bonus)</span><br>";
    added_text += "A:<b>"+A_val+"</b>  HP:<b>"+my_hp+"</b>  FP:<b>"+my_fp+"</b>  ("+unit_types[units[my_uid]['type']]['name']+")<br>";
    added_text += "D:<b>"+D_val+"</b>  HP:<b>"+their_hp+"</b>  FP:<b>"+their_fp+"</b>  ";
    added_text += "("+unit_types[sunits[0]['type']]['name']+")<br>";
    added_text += $("#att_win").html();
    added_text += "\n<div id='click_calc' title='Base and special unit bonuses not included (e.g., Fort, Pikemen vs. Chariot)' "
               +  "style='cursor:pointer;' onclick='improve_tile_info_warcalc_click()'>"
               +  "<u>Click</u> to apply other bonuses</div>";
  }
  return message+added_text;
}
function improve_tile_info_warcalc_click()
{
  $("#ui-id-8").trigger("click");
  close_dialog_message(); // close tile info popup first
  warcalc_screen();
}

