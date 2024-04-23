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

/**************************************************************************
  Returns the [first] resource type on a tile, if any; otherwise null
**************************************************************************/
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

/**************************************************************************
  Returns if the tile has a river

  (not canal unless ruleset hard-coded it to be in extra_synonyms[])
**************************************************************************/
function tile_has_river(ptile)
{
  // Ideally we'd look for roadflag RF_RIVER, but since we can't,
  // we look for EXTRA_RIVER and any clone synonyms it may have:
  if (!ptile) {
    return false;
  }

  const extra = EXTRA_RIVER;

  if (ptile['extras'].isSet(extra)) return true;

  let clone = extra_has_synonym(extra);
  if (clone && ptile['extras'].isSet(clone)) return true;

  return false;
}

/**************************************************************************
  Returns true iff the specified tile has an adjacent tile which contains
  the specified extra. The 'cardinal' parameter tells us to only look
  for CAdjacent tiles.
**************************************************************************/
function is_extra_adjacent(ptile, extra, cardinal)
{
  if (ptile == null || extra == null) return false;

  for (dir = 0; dir < 8; dir++) {

    if (cardinal && !is_cardinal_dir(dir)) {
      continue;
    }

    let tile1 = mapstep(ptile, dir);

    if (tile1 != null && tile_get_known(tile1) != TILE_UNKNOWN) {
      if (tile_has_extra(tile1, extra)) {
        return true;
      }
    }

  }

  return false;
}

/************************************************************************//**
  Check if tile contains an extra type that claim territory
****************************************************************************/
function tile_has_territory_claiming_extra(ptile)
{
  var extra;

  for (extra = 0; extra < MAX_EXTRA_TYPES; extra++) {
    if (tile_has_extra(ptile, extra)
        && territory_claiming_extra(extra_by_number(extra))) {
      return true;
    }
  }

  return false;
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
function tile_has_base(ptile)
{
  if (typeof EXTRA_FORTRESS !== "undefined" && tile_has_extra(ptile, EXTRA_FORTRESS))
    return true;
  if (typeof EXTRA_FORT !== "undefined" && tile_has_extra(ptile, EXTRA_FORT))
    return true;
  if (typeof EXTRA_AIRBASE !== "undefined" && tile_has_extra(ptile, EXTRA_AIRBASE))
    return true;
  if (typeof EXTRA_NAVALBASE !== "undefined" && tile_has_extra(ptile, EXTRA_NAVALBASE))
    return true;
  if (typeof EXTRA_CASTLE !== "undefined" && tile_has_extra(ptile, EXTRA_CASTLE))
    return true;
  if (typeof EXTRA_BUNKER !== "undefined" && tile_has_extra(ptile, EXTRA_BUNKER))
    return true;
  /* not a real base but included in order to exclude allowing building hideout */
  if (typeof EXTRA_TILE_CLAIM !== "undefined" && tile_has_extra(ptile, EXTRA_TILE_CLAIM))
    return true;
  if (typeof EXTRA_WATCHTOWER !== "undefined" && tile_has_extra(ptile, EXTRA_WATCHTOWER))
    return true;
  if (typeof EXTRA_ !== "undefined" && tile_has_extra(ptile, EXTRA_))  // hideout
    return true;
  if (typeof EXTRA_AIRSTRIP !== "undefined" && tile_has_extra(ptile, EXTRA_AIRSTRIP))
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
 Liaison for launching help_redirect from a link in the Tile Info window.
**************************************************************************/
function tile_info_help_redirect(kind, value) {
  help_redirect(kind, value);
  close_dialog_message();
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

  // Make help links to all improvements reported on a city center tile (wonders and defense improvements basically)
  for (im in improvements) {
    let imname = improvements[im]['name'];
    if (imname.length < 2) continue;

    if (message.includes("<b>"+imname)
        || message.includes(", "+imname+", ")
        || message.includes("and "+imname+"</b>")) {

      if (message != message.replace("<b>"+imname, "<span style='color:#ffe080; cursor:pointer' title='CLICK: Help on "
                                                                    // <b>&hairsp;Fortifications can't be confused for <b>Fort anymore:
            + imname + "' onclick='javascript:tile_info_help_redirect(VUT_IMPROVEMENT, "+im+")' class='black_shadow tt'><u><b>&hairsp;"
            + imname + "</u></span>")) {

         message = message.replace("<b>"+imname, "<span style='color:#ffe080; cursor:pointer' title='CLICK: Help on "
                    + imname + "' onclick='javascript:tile_info_help_redirect(VUT_IMPROVEMENT, "+im+")' class='black_shadow tt'><u><b>&hairsp;"
                    + imname+"</u></span>");
      }
      else if (message != message.replace(", "+imname+", ", "<span style='color:#ffe080; cursor:pointer' title='CLICK: Help on "
            + imname + "' onclick='javascript:tile_info_help_redirect(VUT_IMPROVEMENT, "+im+")' class='black_shadow tt'>, <u>&hairsp;"
            + imname + "</u></span>, ")) {

          message = message.replace(", "+imname+", ", "<span style='color:#ffe080; cursor:pointer' title='CLICK: Help on "
                    + imname + "' onclick='javascript:tile_info_help_redirect(VUT_IMPROVEMENT, "+im+")' class='black_shadow tt'>, <u>&hairsp;"
                    + imname+"</u></span>, ");
      }
      else if (message != message.replace("and "+imname+"</b>", "and <span style='color:#ffe080; cursor:pointer' title='CLICK: Help on "
            + imname + "' onclick='javascript:tile_info_help_redirect(VUT_IMPROVEMENT, "+im+")' class='black_shadow tt'><u>&hairsp;"
            + imname + "</b></u></span>")) {

          message = message.replace("and "+imname+"</b>", "and <span style='color:#ffe080; cursor:pointer' title='CLICK: Help on "
                    + imname + "' onclick='javascript:tile_info_help_redirect(VUT_IMPROVEMENT, "+im+")' class='black_shadow tt'><u>&hairsp;"
                    + imname+"</b></u></span>");
      }
    }
  }

  // Make help links to all extras on the tile:
  for (ex in extras) {
    let exname = extras[ex]['name'];
    if (exname.length < 2) continue; // Hideout,Depth, etc.
    if (exname == ex) continue;      // key = extras[key], redundant extras keyed by extra_name, skip
    //console.log(ex+"(ex). "+exname);

    if (message.includes("<b>"+exname)
        || message.includes(exname+"/")
        || message.includes("/"+exname)
        || message.includes("("+exname+")</b>")
        || message.includes("Activity: <b>"+exname+"</b>")
      ) {

      //console.log("  message includes");

      if (message != message.replace("Activity: <b>"+exname+"</b>", "<span style='color:#80f0ff; cursor:pointer' title='CLICK: Help on "
                + exname + "' onclick='javascript:tile_info_help_redirect(VUT_EXTRA, "+ex+")' class='black_shadow tt'>Activity: <u><b>"
                + exname+"</b></u></span>")) {

          message = message.replace("Activity: <b>"+exname+"</b>", "<span style='color:#80f0ff; cursor:pointer' title='CLICK: Help on "
                          + exname + "' onclick='javascript:tile_info_help_redirect(VUT_EXTRA, "+ex+")' class='black_shadow tt'>Activity: <u><b>"
                          + exname+"</b></u></span>");
      }
      else if (message != message.replace("<b>"+exname, "<span style='color:#80f0ff; cursor:pointer' title='CLICK: Help on "
                + exname + "' onclick='javascript:tile_info_help_redirect(VUT_EXTRA, "+ex+")' class='black_shadow tt'><u><b>"
                + exname+"</b></u></span>")) {

          message = message.replace("<b>"+exname, "<span style='color:#80f0ff; cursor:pointer' title='CLICK: Help on "
                          + exname + "' onclick='javascript:tile_info_help_redirect(VUT_EXTRA, "+ex+")' class='black_shadow tt'><u><b>"
                          + exname+"</b></u></span>");
      }
      else if (message != message.replace(exname+"/", "<span style='color:#80f0ff; cursor:pointer' title='CLICK: Help on "
          + exname + "' onclick='javascript:tile_info_help_redirect(VUT_EXTRA, "+ex+")' class='black_shadow tt'><u><b>"
          + exname+"</b></u></span>/") ) {

        message = message.replace(exname+"/", "<span style='color:#80f0ff; cursor:pointer' title='CLICK: Help on "
                + exname + "' onclick='javascript:tile_info_help_redirect(VUT_EXTRA, "+ex+")' class='black_shadow tt'><u><b>"
                + exname+"</b></u></span>/")
      }
      else if (message != message.replace("/"+exname, "/<span style='color:#80f0ff; cursor:pointer' title='CLICK: Help on "
                + exname + "' onclick='javascript:tile_info_help_redirect(VUT_EXTRA, "+ex+")' class='black_shadow tt'><u><b>"
                + exname+"</b></u></span>")) {

        message = message.replace("/"+exname, "/<span style='color:#80f0ff; cursor:pointer' title='CLICK: Help on "
                + exname + "' onclick='javascript:tile_info_help_redirect(VUT_EXTRA, "+ex+")' class='black_shadow tt'><u><b>"
                + exname+"</b></u></span>");
      }
      else if (message != message.replace("("+exname+")</b>", "<span style='color:#80f0ff; cursor:pointer' title='CLICK: Help on "
                + exname + "' onclick='javascript:tile_info_help_redirect(VUT_EXTRA, "+ex+")' class='black_shadow tt'>(<u><b>"
                + exname+"</b></u>)</span>")) {

        message = message.replace("("+exname+")</b>", "(<span style='color:#80f0ff; cursor:pointer' title='CLICK: Help on "
                + exname + "' onclick='javascript:tile_info_help_redirect(VUT_EXTRA, "+ex+")' class='black_shadow tt'><u><b>"
                + exname+"</b></u></span>)</b>");
      }
    }
  }
  // Make helptext for unit types
  for (ut in unit_types) {
    let utname = unit_types[ut]['name'];
    //console.log(ut+"(ut). "+utname);

    if (message.includes("<b>"+utname+"</b>")
        || message.includes("("+utname+")")) {

      //console.log("  message includes")

      if (message != message.replace("<b>"+utname+"</b>", "<span style='color:#faeb9a; cursor:pointer' title='CLICK: Help on "
      + utname + "' onclick='javascript:tile_info_help_redirect(VUT_UTYPE, "+ut+")' class='black_shadow tt'><u><b>"
      + utname+"</b></u></span>")) {

        message = message.replace("<b>"+utname+"</b>", "<span style='color:#faeb9a; cursor:pointer' title='CLICK: Help on "
                + utname + "' onclick='javascript:tile_info_help_redirect(VUT_UTYPE, "+ut+")' class='black_shadow tt'><u><b>"
                + utname+"</b></u></span>");
      }
      if (message != message.replaceAll("("+utname+")", "(<span style='color:#faeb9a; cursor:pointer' title='CLICK: Help on "
      + utname + "' onclick='javascript:tile_info_help_redirect(VUT_UTYPE, "+ut+")' class='black_shadow tt'><u><b>"
      + utname+"</b></u></span>)")) {

        message = message.replaceAll("("+utname+")", "(<span style='color:#faeb9a; cursor:pointer' title='CLICK: Help on "
                + utname + "' onclick='javascript:tile_info_help_redirect(VUT_UTYPE, "+ut+")' class='black_shadow tt'><u><b>"
                + utname+"</b></u></span>)");
      }
    }
  }

  // Terrain alteration info:
  if (ttype) {
    // Calculate defense bonus
    var has_river = "";
    var db = parseFloat(1) + parseFloat(ttype['defense_bonus'])/100;
    if (message.includes("River</b>")
        || message.includes("River/")
        || message.includes("/River") ) {  // these exact strings ensure no other text gives false positive
      has_river = " (<span style='color:#5d97ed; cursor:pointer' title='CLICK: Help on River' onclick='javascript:tile_info_help_redirect(VUT_EXTRA, EXTRA_RIVER);' class='black_shadow tt'><u><b>River</b></u></span>)";
      if (client_rules_flag[CRF_MP2_C]) db += 0.5;  // additive bonus as in for example real civ2, mp2c
      else db *= (1+extras[EXTRA_RIVER]['defense_bonus']/100);
      db = Math.round((db + Number.EPSILON) * 100) / 100;
    }
    added_text += "<br><br><span class='black_shadow tt' title='CLICK: Help on "+ttype['name']+"' onclick='javascript:tile_info_help_redirect(VUT_TERRAIN, "+ttype.id+");' style='cursor:pointer;color:rgb("
               + ttype['color_red']+","+ttype['color_green']+","+ttype['color_blue']
               +  ")'><u><b>" + ttype['name'] + "</b></u></span>"+has_river+"<br>";

    added_text += "Defense Bonus: <b>" + db + "&times;</b> &nbsp;&nbsp;&nbsp; Movement Cost: <b>"
    + (server_settings.move_cost_in_frags.val ? move_points_text(ttype['movement_cost']) : ttype['movement_cost'])+ "</b><br>"

    if (ttype['irrigation_time']) {
      added_text += "<span class='highlight_irrigation'>Irrigate:<b>" + Math.ceil(ttype['irrigation_time']/wt)+"</b></span>"
      if (ttype['irrigation_food_incr']) added_text+= " (+"+ttype['irrigation_food_incr']+")";
    }
    if (ttype['irrigation_result'] != null && ttype['irrigation_result'] != tindex && ttype['irrigation_result'] != tinvalid)
      added_text+="&#10145;"+terrains[ttype['irrigation_result']]['name']

    if (ttype['mining_time']) {
      added_text += "&nbsp;&nbsp; <span class='highlight_mining'>Mine:<b>" + Math.ceil(ttype['mining_time']/wt)+"</b></span>";
      if (ttype['mining_shield_incr']) added_text+= " (+"+ttype['mining_shield_incr']+")";
    }
    if (ttype['mining_result'] != null && ttype['mining_result'] != tindex && ttype['mining_result'] != tinvalid)
      added_text+="&#10145;"+terrains[ttype['mining_result']]['name']

    if (ttype['transform_time'])
      added_text += "&nbsp;&nbsp; <span class='highlight_transforming'>Transform:<b>" + Math.ceil(ttype['transform_time']/wt)+"</b></span>";
    if (ttype['transform_result'] != null && ttype['transform_result'] != tindex && ttype['transform_result'] != tinvalid)
      added_text+="&#10145;"+terrains[ttype['transform_result']]['name']

    if (ttype['road_time'])
      added_text += "&nbsp;&nbsp; <span class='highlight_roading'>Road:<b>" + Math.ceil(ttype['road_time']/wt)+"</b></span>";

    var resource_present = extras[tile_resource(mclick_tile)];
    var resource_text = resource_present
                      ? "<br><img class='v' src='/images/e/_"
                        + freemoji_name_from_universal(ttype.name)
                        + freemoji_name_from_universal(resource_present.name)+".png'>"
                        + cleaned_text(resource_present.helptext + "<br><br>")
                      : "<br><br>";

    added_text += "<br>" + cleaned_text(ttype['helptext'])+resource_text;
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

    let myutname = unit_types[units[my_uid]['type']]['name'];
    let my_unit = "<span style='color:#faeb9a; cursor:pointer' title='CLICK: Help on "
                + myutname + "' onclick='javascript:tile_info_help_redirect(VUT_UTYPE, "+units[my_uid]['type']+")' class='black_shadow tt'><u><b>"
                + myutname + "</b></u></span>";
    let theirutname = unit_types[sunits[0]['type']]['name'];
    let their_unit = "<span style='color:#faeb9a; cursor:pointer' title='CLICK: Help on "
                + theirutname + "' onclick='javascript:tile_info_help_redirect(VUT_UTYPE, "+sunits[0]['type']+")' class='black_shadow tt'><u><b>"
                + theirutname+"</b></u></span>";
    added_text += "<b>Combat odds:</b><span style='font-size:75%'> (*before base or unit-type bonus)</span><br>";

    //added_text += "A:<b>"+A_val+"</b>  HP:<b>"+my_hp+"</b>  FP:<b>"+my_fp+"</b>  ("+unit_types[units[my_uid]['type']]['name']+")<br>";
    added_text += "A:<b>"+A_val+"</b>  HP:<b>"+my_hp+"</b>  FP:<b>"+my_fp+"</b>  ("+my_unit+")<br>";

    added_text += "D:<b>"+D_val+"</b>  HP:<b>"+their_hp+"</b>  FP:<b>"+their_fp+"</b>  ";

    //added_text += "("+unit_types[sunits[0]['type']]['name']+")<br>";
    added_text += "("+their_unit+")<br>";

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

