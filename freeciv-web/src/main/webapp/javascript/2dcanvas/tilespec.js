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


// Unit offset arrays for graphics placement of units and their various icon components
var UO_dx = [], UO_dy = []; // Unit graphic delta.
var UO_sx = [], UO_sy = []; // Shield graphic
var UO_vx = [], UO_vy = []; // Vet badge graphic
var UO_mx = [], UO_my = []; // Multi-unit graphic (stacked "+" icon)

var num_cardinal_tileset_dirs = 4;

var cardinal_tileset_dirs = [DIR8_NORTH, DIR8_EAST, DIR8_SOUTH, DIR8_WEST];
var DIR4_TO_DIR8 = [ DIR8_NORTH, DIR8_SOUTH, DIR8_EAST, DIR8_WEST];
var NUM_CORNER_DIRS = 4;

var border_flag_offsets = {
  // Cardinal
  1: {"x": 56, "y": 13},  // north
  4: {"x": 56, "y": 28},  // east
  3: {"x": 26, "y": 13},  // west
  6: {"x": 26, "y": 28},  // south
  // Corners
  2: {"x": 66, "y": 20},  // northeast
  0: {"x": 42, "y":  6},  // northwest
  5: {"x": 16, "y": 20},  // southwest
  7: {"x": 42, "y": 34},  // southeast
}


const CITY_WALLS = 1,
      CITY_COASTAL_DEFENSE = 2,
      CITY_FORTIFICATIONS = 4,
      CITY_CITADEL = 8,
      CITY_SAM = 16;
      CITY_ZIGGURAT = 32,
      CITY_PYRAMID = 64,
      CITY_ANGKOR_WAT = 128,
      CITY_HANGING_GARDEN = 256,
      //CITY_CHICHEN_ITZA = 512,
      CITY_MAUSOLEUM = 1024,
      CITY_HAMMURABI = 2048,
      CITY_CHAND_BAORI = 4096,
      CITY_SPHINX = 8192;
// MASK Bit field for determining quickly if city is replaced by a wonder sprite
const CITY_REPLACED_BY_WONDER_MASK = (CITY_HANGING_GARDEN | CITY_ANGKOR_WAT | CITY_MAUSOLEUM | CITY_ZIGGURAT | CITY_PYRAMID | CITY_CITADEL /* | CITY_CHICHEN_ITZA*/);

var current_select_sprite = 0;
var max_select_sprite = 4;

var explosion_anim_map = {};
var anim_swords_instead = {};  // bools for whether to show swords instead of explosion.
var show_tile_marker_instead = {}; // bools for whether to show a tile marker indicator instead of combat animation.

const USER_MARK_1     = 1
const USER_MARK_2     = 2;
const USER_MARK_3     = 3;
const USER_MARK_4     = 4;
const USER_MARKS = ["","grid.usermark","grid.userarea","user.attention","grid.userspot"];

/* Items on the mapview are drawn in layers.  Each entry below represents
 * one layer.  The names are basically arbitrary and just correspond to
 * groups of elements in fill_sprite_array().  Callers of fill_sprite_array
 * must call it once for each layer. */
var LAYER_TERRAIN1 = 0;
var LAYER_TERRAIN2 = 1;
var LAYER_TERRAIN3 = 2;
var LAYER_ROADS = 3;
var LAYER_SPECIAL1 = 4;
var LAYER_CITY1 = 5;
var LAYER_SPECIAL2 = 6;
var LAYER_UNIT = 7;
var LAYER_FOG = 8;
var LAYER_SPECIAL3 = 9;
var LAYER_TILELABEL = 10;
var LAYER_CITYBAR = 11;
var LAYER_GOTO = 12;
var LAYER_COUNT = 13;

// these layers are not used at the moment, for performance reasons.
//var LAYER_BACKGROUND = ; (not in use)
//var LAYER_EDITOR = ; (not in use)
//var LAYER_GRID* = ; (not in use)

/* An edge is the border between two tiles.  This structure represents one
 * edge.  The tiles are given in the same order as the enumeration name. */
var EDGE_NS = 0; /* North and south */
var EDGE_WE = 1; /* West and east */
var EDGE_UD = 2; /* Up and down (nw/se), for hex_width tilesets */
var EDGE_LR = 3; /* Left and right (ne/sw), for hex_height tilesets */
var EDGE_COUNT = 4;

var MATCH_NONE   = 0;
var MATCH_SAME   = 1;		/* "boolean" match */
var MATCH_PAIR   = 2;
var MATCH_FULL   = 3;
var MATCH_RANDOM = 4;   /* semi-random selection for chaos effect, not really matched to adjacent */

var CELL_WHOLE = 0;		/* entire tile */
var CELL_CORNER = 1;	/* corner of tile */

/* Darkness style.  Don't reorder this enum since tilesets depend on it. */
/* No darkness sprites are drawn. */
var DARKNESS_NONE = 0;

/* 1 sprite that is split into 4 parts and treated as a darkness4.  Only
 * works in iso-view. */
var DARKNESS_ISORECT = 1;

/* 4 sprites, one per direction.  More than one sprite per tile may be
 * drawn. */
var DARKNESS_CARD_SINGLE = 2;

/* 15=2^4-1 sprites.  A single sprite is drawn, chosen based on whether
 * there's darkness in _each_ of the cardinal directions. */
var DARKNESS_CARD_FULL = 3;

/* Corner darkness & fog.  3^4 = 81 sprites. */
var DARKNESS_CORNER = 4;

var terrain_match = {"t.l0.hills1" : MATCH_NONE,
"t.l0.mountains1" : MATCH_NONE,
"t.l0.plains1" : MATCH_NONE,
"t.l0.desert1" : MATCH_NONE

};

/**************************************************************************
  Returns true iff the tileset has graphics for the specified tag.
**************************************************************************/
function tileset_has_tag(tagname)
{
  return (sprites[tagname] != null);
}

/**************************************************************************
  Returns the tag name of the sprite of a ruleset entity where the
  preferred tag name is in the 'graphic_str' field, the fall back tag in
  case the tileset don't support the first tag is the 'graphic_alt' field
  and the entity name is stored in the 'name' field.
**************************************************************************/
function tileset_ruleset_entity_tag_str_or_alt(entity, kind_name)
{
  if (entity == null) {
    console.log("No " + kind_name + " to return tag for.");
    return null;
  }

  if (tileset_has_tag(entity['graphic_str'])) {
    return entity['graphic_str'];
  }

  if (tileset_has_tag(entity['graphic_alt'])) {
    return entity['graphic_alt'];
  }

  console.log("No graphic for " + kind_name + " " + entity['name']);
  return null;
}
/**************************************************************************
  Above function doesn't work for bases or roads but we're hard coded not
  to call them for those when drawing the map. However, the below function
  is more robust for other cases wanting to retrieve a valid tag.
  But slower so not replacing the above.
**************************************************************************/
function tileset_extra_tag_robust(extra)
{
  let kind_name = "extra";
  if (extra == null) {
    console.log("No " + kind_name + " to return tag for.");
    return null;
  }

  if (tileset_has_tag(extra['graphic_str'])) {
    return extra['graphic_str'];
  }
  if (tileset_has_tag(extra['graphic_str']+"_mg")) {
    return extra['graphic_str'];
  }
  if (tileset_has_tag(extra['graphic_str']+"_bg")) {
    return extra['graphic_str'];
  }
  if (tileset_has_tag(extra['graphic_str']+"_nw")) {
    return extra['graphic_str'];
  }
  if (tileset_has_tag(extra['graphic_str']+"_s_n1e0s1w0")) {
    return extra['graphic_str'];
  }
  if (tileset_has_tag(extra['graphic_alt'])) {
    return extra['graphic_alt'];
  }
  if (tileset_has_tag(extra['graphic_alt']+"_mg")) {
    return extra['graphic_alt'];
  }
  if (tileset_has_tag(extra['graphic_alt']+"_bg")) {
    return extra['graphic_alt'];
  }
  if (tileset_has_tag(extra['graphic_alt']+"_nw")) {
    return extra['graphic_alt'];
  }
  if (tileset_has_tag(extra['graphic_alt']+"_s_n1e0s1w0")) {
    return extra['graphic_alt'];
  }
  console.log("\ntileset_extra_tag_robust() found no graphic for " + kind_name + " " + extra['name']);
  return null;
}

/**************************************************************************
  Returns the tag name of the graphic showing the specified Extra on the
  map.
**************************************************************************/
function tileset_extra_graphic_tag(extra)
{
  return tileset_ruleset_entity_tag_str_or_alt(extra, "extra");
}

/**************************************************************************
  Returns the tag name of the graphic showing the specified unit type.
**************************************************************************/
function tileset_unit_type_graphic_tag(utype)
{
  return tileset_ruleset_entity_tag_str_or_alt(utype, "unit type");
}

/**************************************************************************
  Returns the tag name of the graphic showing the specified building.
**************************************************************************/
function tileset_building_graphic_tag(pimprovement)
{
  return tileset_ruleset_entity_tag_str_or_alt(pimprovement, "building");
}

/**************************************************************************
  Returns the tag name of the graphic showing the specified tech.
**************************************************************************/
function tileset_tech_graphic_tag(ptech)
{
  return tileset_ruleset_entity_tag_str_or_alt(ptech, "tech");
}

/**************************************************************************
  Returns the tag name of the graphic showing the Extra specified by ID on
  the map.
**************************************************************************/
function tileset_extra_id_graphic_tag(extra_id)
{
  return tileset_extra_graphic_tag(extras[extra_id]);
}

/**************************************************************************
  Returns the tag name of the graphic showing that a unit is building the
  specified Extra.
**************************************************************************/
function tileset_extra_activity_graphic_tag(extra)
{
  if (extra == null) {
    console.log("No extra to return tag for.");
    return null;
  }

  if (tileset_has_tag(extra['activity_gfx'])) {
    return extra['activity_gfx'];
  }

  if (tileset_has_tag(extra['act_gfx_alt'])) {
    return extra['act_gfx_alt'];
  }

  if (tileset_has_tag(extra['act_gfx_alt2'])) {
    return extra['act_gfx_alt2'];
  }

  console.log("No activity graphic for extra " + extra['name']);
  return null;
}

/**************************************************************************
  Returns the tag name of the graphic showing that a unit is building the
  Extra specified by the id.
**************************************************************************/
function tileset_extra_id_activity_graphic_tag(extra_id)
{
  return tileset_extra_activity_graphic_tag(extras[extra_id]);
}

/****************************************************************************
  Fill in the sprite array for the given tile, city, and unit.

  ptile, if specified, gives the tile.  If specified the terrain and specials
  will be drawn for this tile.  In this case (map_x,map_y) should give the
  location of the tile.

  punit, if specified, gives the unit.  For tile drawing this should
  generally be get_drawable_unit(); otherwise it can be any unit.

  pcity, if specified, gives the city.  For tile drawing this should
  generally be tile_city(ptile); otherwise it can be any city.

  citymode specifies whether this is part of a citydlg.  If so some drawing
  is done differently.
****************************************************************************/
function fill_sprite_array(layer, ptile, pedge, pcorner, punit, pcity, citymode)
{
  var sprite_array = [];

  switch (layer) {
    case LAYER_TERRAIN1:
    if (ptile != null) {
      var tterrain_near = tile_terrain_near(ptile);
      var pterrain = tile_terrain(ptile);
      sprite_array = sprite_array.concat(fill_terrain_sprite_layer(0, ptile, pterrain, tterrain_near));

    }
    break;

    case LAYER_TERRAIN2:
    if (ptile != null) {
      var tterrain_near = tile_terrain_near(ptile);
      var pterrain = tile_terrain(ptile);
      sprite_array = sprite_array.concat(fill_terrain_sprite_layer(1, ptile, pterrain, tterrain_near));
    }
    break;

    case LAYER_TERRAIN3:
      if (ptile != null) {
        var tterrain_near = tile_terrain_near(ptile);
        var pterrain = tile_terrain(ptile);

        sprite_array = sprite_array.concat(fill_terrain_sprite_layer(2, ptile, pterrain, tterrain_near));
        if (draw_map_grid) sprite_array = sprite_array.concat({"key":"grid.map"});
        sprite_array = sprite_array.concat(fill_irrigation_sprite_array(ptile, pcity));
      }
    break;

    case LAYER_ROADS:
      if (ptile != null) {
        // Roads and rivers
        sprite_array = sprite_array.concat(fill_road_rail_sprite_array(ptile, pcity));
      }
    break;

    case LAYER_SPECIAL1:
      if (ptile != null) {
        // TEST: borders moved from last sub-layer of LAYER_SPECIAL1 to here:
        //  it was drawing on top of resources, and seemed better here:
        sprite_array = sprite_array.concat(get_border_line_sprites(ptile));

        var spec_sprite = get_tile_specials_sprite(ptile);
        if (spec_sprite != null) sprite_array.push(spec_sprite);


        if (tile_has_extra(ptile, EXTRA_MINE)) {
          sprite_array.push({"key" :
                              tileset_extra_id_graphic_tag(EXTRA_MINE)});
        }
        if (tile_has_extra(ptile, EXTRA_OIL_WELL)) {
          sprite_array.push({"key" :
                              tileset_extra_id_graphic_tag(EXTRA_OIL_WELL)});
        }

        sprite_array = sprite_array.concat(fill_layer1_sprite_array(ptile, pcity));

        if (tile_has_extra(ptile, EXTRA_HUT)) {
          sprite_array.push({"key" :
                              tileset_extra_id_graphic_tag(EXTRA_HUT)});
        }

        if (tile_has_extra(ptile, EXTRA_POLLUTION)) {
          sprite_array.push({"key" :
                              tileset_extra_id_graphic_tag(EXTRA_POLLUTION)});
          //if (draw_highlighted_pollution)
          //  sprite_array.push(get_user_highlighted_pollution_sprite());
        }

        if (tile_has_extra(ptile, EXTRA_FALLOUT)) {
          sprite_array.push({"key" :
                              tileset_extra_id_graphic_tag(EXTRA_FALLOUT)});
        }
        // (Optional) frontier-facing flags on borders
        if (draw_border_flags)
          sprite_array = sprite_array.concat(get_frontier_flag_sprites(ptile));
      }
    break;

    // City Layer  AND  Highlight Polluted Tiles
    case LAYER_CITY1:
      var polluted = tile_has_extra(ptile, EXTRA_POLLUTION);

      // Due to visibility difficulty, city tiles ALWAYS show highlighted pollution
      if (pcity != null) {
        if (polluted) sprite_array.push({"key" : "grid.pollute_ring"}); //ring under city "wraps" around it

        var layer_sprite = get_city_wonder_underlay_sprite(pcity);
        if (layer_sprite) sprite_array.push(layer_sprite);
        sprite_array = sprite_array.concat(layer_sprite);

        layer_sprite = get_city_fortifications_underlay_sprite(pcity);   // underlays (coastal defence, fortifications)
        if (layer_sprite) sprite_array.push(layer_sprite);
        layer_sprite = get_city_coastal_underlay_sprite(pcity);
        if (layer_sprite) sprite_array.push(layer_sprite);

        sprite_array.push(get_city_sprite(pcity));                      //city

        layer_sprite = get_city_fortifications_overlay_sprite(pcity);  // overlays (coastal defence, fortifications)
        if (layer_sprite) sprite_array.push(layer_sprite);
        layer_sprite = get_city_coastal_overlay_sprite(pcity);
        if (layer_sprite) sprite_array.push(layer_sprite);
        layer_sprite = get_city_sam_battery_overlay_sprite(pcity);
        if (layer_sprite) sprite_array.push(layer_sprite);
        layer_sprite = get_city_wonder_overlay_sprite(pcity);
        if (layer_sprite) sprite_array.push(layer_sprite);

        if (polluted) sprite_array.push({"key" : "grid.pollute_icon"}); //pollution icon clearly over top

        /* Lawless, Disorder, and Famine feared: ----------------------------*/
        // Lawless fists:  goes under a famine plate and under a Disorder fist
        if (pcity.anarchy) {         //
          sprite_array.push({"key" : "city.revolt"});
        }
        // Starving: Empty plate goes over double fists and under Disorder fist
        if (pcity.granary_turns == -1) {
          sprite_array.push({"key" : "city.starve"});
        }
        // Disorder (Lawlessness feared): goes over famine plate to be visible
        if (pcity['unhappy']) {
          sprite_array.push({"key" : "city.disorder"});
        }
        /*-------------------------------------------------------------------*/
      }
      // Otherwise show highlighted pollution only if user pref is on:
      else if (draw_highlighted_pollution && polluted) {
        sprite_array.push({"key" : "grid.pollute_ring"});
        sprite_array.push({"key" : "grid.pollute_icon"});
      }
    break;

    case LAYER_SPECIAL2:
      if (ptile != null) {
        sprite_array = sprite_array.concat(fill_layer2_sprite_array(ptile, pcity));
      }
      break;

    case LAYER_UNIT:
      var do_draw_unit = (punit != null && (draw_units || ptile == null || (draw_focus_unit
				     && unit_is_in_focus(punit))));
      var is_stacked = false;    // stacked units get a "+" icon drawn over them

      if (do_draw_unit && active_city == null) {
        is_stacked = (ptile['units'] != null && ptile['units'].length > 1) ? ptile['units'].length : false;
        if (is_stacked>9) is_stacked =9;  // 9 or more will just show a "9+" stack icon
        //var backdrop = false; /* !pcity; // this was unused var, eliminated for performance */

        if (unit_is_in_focus(punit)) {
          sprite_array.push(get_select_sprite());
        }

        /* TODO: Special case for drawing the selection rectangle.  The blinking
        * unit is handled separately, inside get_drawable_unit(). */
        sprite_array = sprite_array.concat(fill_unit_sprite_array(punit, is_stacked));
      }
        // Front walls of Forts and Fortresses are drawn immediately over a unit on a tile in the same layer.
        // This puts the front wall over the unit on that tile, but prevents front walls on other tiles from
        // improperly occluding units on other tiles.
        if (!pcity && ptile != null)
          sprite_array = sprite_array.concat(fill_layer3_sprite_array(ptile, is_stacked, punit));

    /* show explosion animation on current tile.*/
     if (ptile != null && explosion_anim_map[ptile['index']] != null) {
       var explode_step = explosion_anim_map[ptile['index']];

       var swords = anim_swords_instead[ptile['index']];
       if (!swords) swords = 0;
       var marker = show_tile_marker_instead[ptile['index']];
       key_prefix = swords ? "swords.unit_" : "explode.unit_";
       frame_repeat = swords ? 3 : 5;
       frame = Math.abs(Math.round((23-explode_step)/frame_repeat));
       explosion_anim_map[ptile['index']] =  explode_step - 1;

       if (marker) {
         key_prefix = (explode_step>16 && explode_step<34) ? "" : USER_MARKS[USER_MARK_1];
         frame ="";
       }
       if (explode_step <= 1) {
         delete explosion_anim_map[ptile['index']];
         delete anim_swords_instead[ptile['index']];
         delete show_tile_marker_instead[ptile['index']];
       }
       else {
         const xo = marker ? 0 : (unit_offset_x+swords*8);
         const yo = marker ? 0 : (unit_offset_y+swords*-15);
         sprite_array.push({"key": key_prefix+frame,
           "offset_x" : xo,
           "offset_y" : yo});
       } /* the above 8 lines replace the below for supporting 2 explosion types.
       if (explode_step > 20) {
         sprite_array.push({"key" : "explode.unit_0",
           "offset_x" : unit_offset_x,
           "offset_y" : unit_offset_y});
       } else if (explode_step > 15) {
         sprite_array.push({"key" : "explode.unit_1",
           "offset_x" : unit_offset_x,
           "offset_y" : unit_offset_y});
       } else if (explode_step > 10) {
         sprite_array.push({"key" : "explode.unit_2",
           "offset_x" : unit_offset_x,
           "offset_y" : unit_offset_y});
       } else if (explode_step > 5) {
         sprite_array.push({"key" : "explode.unit_3",
           "offset_x" : unit_offset_x,
           "offset_y" : unit_offset_y});
       } else if (explode_step > 0) {
         sprite_array.push({"key" : "explode.unit_4",
           "offset_x" : unit_offset_x,
           "offset_y" : unit_offset_y});
       }
       else {
         delete explosion_anim_map[ptile['index']];
       } */
     }


    break;

    case LAYER_FOG:
      sprite_array = sprite_array.concat(fill_fog_sprite_array(ptile, pedge, pcorner));

      break;

    ////1
    /* don't draw front walls of Forts and Fortresses as separate layer, it improperly occludes units on other tiles
    case LAYER_SPECIAL3:
      if (ptile != null) {
        sprite_array = sprite_array.concat(fill_layer3_sprite_array(ptile, pcity));
      }
      break;
    */
    case LAYER_TILELABEL:
      if (ptile != null && ptile['label'] != null && ptile['label'].length > 0) {
        sprite_array.push(get_tile_label_text(ptile));
      }
      // User markup sprite
      if (!user_marking_mode || !ptile) break;
      const tkey = "cPlan"+ptile['index'];  // key/val for user mark-up tiles
      if (myGameVars[tkey]) {
        sprite_array.push(get_user_mark_sprite(myGameVars[tkey]));
      }
      break;

    // This layer puts down worked tile info on main map THEN city label on top of that
    case LAYER_CITYBAR:
      if (draw_city_output && active_city == null && ptile != null && ptile['worked']>0 ) {
        var acity = cities[ptile['worked']];
        if (acity) {                         //might be undefined
          if (acity['food_output'] != null)  //this checks it's not foreign city with null info
          {
            var ctile = city_tile(acity);
            var d = map_distance_vector(ctile, ptile);
            var idx = get_city_dxy_to_index(d[0], d[1], acity);

            var food_output = acity['food_output'].substring(idx, idx + 1);
            var shield_output = acity['shield_output'].substring(idx, idx + 1);
            var trade_output = acity['trade_output'].substring(idx, idx + 1);

            sprite_array.push(get_city_food_output_sprite(food_output));
            sprite_array.push(get_city_shields_output_sprite(shield_output));
            sprite_array.push(get_city_trade_output_sprite(trade_output));
          }
        }
      }

      // City Label shares this layer but goes on top
      if (pcity != null && active_city==null && show_citybar) {
        sprite_array.push(get_city_info_text(pcity));
      }

      // This section is for drawing map inside the city
      if (active_city != null && ptile != null && ptile['worked'] != null
          && active_city['id'] == ptile['worked'] && active_city['food_output'] != null) {
        var ctile = city_tile(active_city);
        var d = map_distance_vector(ctile, ptile);
        var idx = get_city_dxy_to_index(d[0], d[1], active_city);

        var food_output = active_city['food_output'].substring(idx, idx + 1);
        var shield_output = active_city['shield_output'].substring(idx, idx + 1);
        var trade_output = active_city['trade_output'].substring(idx, idx + 1);

        sprite_array.push(get_city_food_output_sprite(food_output));
        sprite_array.push(get_city_shields_output_sprite(shield_output));
        sprite_array.push(get_city_trade_output_sprite(trade_output));
      } else if (active_city != null && ptile != null && ptile['worked'] != 0) {
        sprite_array.push(get_city_invalid_worked_sprite()); // some other city is using this tile
      }
      break;

    case LAYER_GOTO:
      if (ptile != null && goto_dirs[ptile.index] != null) {
        sprite_array = sprite_array.concat(fill_goto_line_sprite_array(ptile));
      }

      if (ptile != null && ptile['nuke'] > 0) {
        ptile['nuke'] = ptile['nuke'] - 1;
        sprite_array.push({"key" : "explode.nuke",
               "offset_x" : -45,
               "offset_y" : -45});
      }

      break;
  }


  return sprite_array;

}


/****************************************************************************
  Add sprites for the base tile to the sprite list.  This doesn't
  include specials or rivers.
****************************************************************************/
function fill_terrain_sprite_layer(layer_num, ptile, pterrain, tterrain_near)
{
  /* FIXME: handle blending and darkness. */

  return fill_terrain_sprite_array(layer_num, ptile, pterrain, tterrain_near);

}

/****************************************************************************
  Helper function for fill_terrain_sprite_layer.
****************************************************************************/
function fill_terrain_sprite_array(l, ptile, pterrain, tterrain_near)
{
  // TERRIBLE HACK to replace unconfigured ice cliffs with coastal shore. moved to map_topology_init
  // tile_types_setup["l0.arctic"].match_index[0]=2;

  if (tile_types_setup["l" + l + "." + pterrain['graphic_str']] == null) {
    //console.log("missing " + "l" + l + "." + pterrain['graphic_str']);
    return [];
  }

  var dlp = tile_types_setup["l" + l + "." + pterrain['graphic_str']];

  switch (dlp['sprite_type']) {
    case CELL_WHOLE:
    {
      switch (dlp['match_style']) {
        case MATCH_NONE:
        {
          var result_sprites = [];
      	   if (dlp['dither'] == true) {
             for (var i = 0; i < num_cardinal_tileset_dirs; i++) {
               if (ts_tiles[tterrain_near[DIR4_TO_DIR8[i]]['graphic_str']] == null) continue;
               var near_dlp = tile_types_setup["l" + l + "." + tterrain_near[DIR4_TO_DIR8[i]]['graphic_str']];

             var terrain_near = (pterrain['graphic_str']=='arctic' && !(near_dlp['dither'] == true))
               ? "swamp" // hard-coded for now, but dithers so much nicer into shore graphics
	             : (near_dlp['dither'] == true) ?  tterrain_near[DIR4_TO_DIR8[i]]['graphic_str'] : pterrain['graphic_str'];
	           var dither_tile = i + pterrain['graphic_str'] + "_" +  terrain_near;
               var x = dither_offset_x[i];
               var y = dither_offset_y[i];
	           result_sprites.push({"key": dither_tile, "offset_x" : x, "offset_y" : y});
             }
	        return result_sprites;

	       } else {
             return [ {"key" : "t.l" + l + "." + pterrain['graphic_str'] + 1} ];
	       }
        }
        case MATCH_SAME:
        {
          var tileno = 0;
          var this_match_type = ts_tiles[pterrain['graphic_str']]['layer' + l + '_match_type'];

          for (var i = 0; i < num_cardinal_tileset_dirs; i++) {
            if (ts_tiles[tterrain_near[i]['graphic_str']] == null) continue;
            var that = ts_tiles[tterrain_near[i]['graphic_str']]['layer' + l + '_match_type'];
            if (that == this_match_type) {
              tileno |= 1 << i;
            }
          }
          var gfx_key = "t.l" + l + "." + pterrain['graphic_str'] + "_" + cardinal_index_str(tileno);
          var y = tileset_tile_height - tileset[gfx_key][3];
          return [ {"key" : gfx_key, "offset_x" : 0, "offset_y" : y} ];
        }
        case MATCH_RANDOM:
        {
            gfx_key = "t.l" + l + "." + pterrain['graphic_str'] + mulberry_random(ptile.tile,16);
            var y = tileset_tile_height - tileset[gfx_key][3];
            return [ {"key" : gfx_key, "offset_x" : 0, "offset_y" : y} ];
        }
      }
    }

    case CELL_CORNER:
    {
      /* Divide the tile up into four rectangular cells.  Each of these
       * cells covers one corner, and each is adjacent to 3 different
       * tiles.  For each cell we pick a sprite based upon the adjacent
       * terrains at each of those tiles.  Thus, we have 8 different sprites
       * for each of the 4 cells (32 sprites total).
       *
       * These arrays correspond to the direction4 ordering. */

      var W = normal_tile_width;
      var H = normal_tile_height;
      var iso_offsets = [ [W / 4, 0], [W / 4, H / 2], [W / 2, H / 4], [0, H / 4]];
      var this_match_index = ('l' + l + '.' + pterrain['graphic_str'] in tile_types_setup) ? tile_types_setup['l' + l + '.' + pterrain['graphic_str']]['match_index'][0] : -1;
      var that_match_index = ('l' + l + '.' + pterrain['graphic_str'] in tile_types_setup) ? tile_types_setup['l' + l + '.' + pterrain['graphic_str']]['match_index'][1] : -1;
      var result_sprites = [];

      /* put corner cells */
      for (var i = 0; i < NUM_CORNER_DIRS; i++) {
	    var count = dlp['match_indices'];
	    var array_index = 0;
	    var dir = dir_ccw(DIR4_TO_DIR8[i]);
	    var x = iso_offsets[i][0];
	    var y = iso_offsets[i][1];

	    var m = [('l' + l + '.' + tterrain_near[dir_ccw(dir)]['graphic_str'] in tile_types_setup) ? tile_types_setup['l' + l + '.' + tterrain_near[dir_ccw(dir)]['graphic_str']]['match_index'][0] : -1 ,
	             ('l' + l + '.' + tterrain_near[dir]['graphic_str'] in tile_types_setup) ? tile_types_setup['l' + l + '.' + tterrain_near[dir]['graphic_str']]['match_index'][0] : -1,
	             ('l' + l + '.' + tterrain_near[dir_cw(dir)]['graphic_str'] in tile_types_setup) ? tile_types_setup['l' + l + '.' + tterrain_near[dir_cw(dir)]['graphic_str']]['match_index'][0] : -1];

        /* synthesize 4 dimensional array? */
	    switch (dlp['match_style']) {
	    case MATCH_NONE:
	      /* We have no need for matching, just plug the piece in place. */
	      break;
	    case MATCH_SAME:
        var b1 = (m[2] != this_match_index) ? 1 : 0;
        var b2 = (m[1] != this_match_index) ? 1 : 0;
        var b3 = (m[0] != this_match_index) ? 1 : 0;
        array_index = array_index * 2 + b1;
			  array_index = array_index * 2 + b2;
	  		array_index = array_index * 2 + b3;
	      break;
	    case MATCH_PAIR:
            // FIXME: This doesn't work!
            /*var b1 = (m[2] == that_match_index) ? 1 : 0;
            var b2 = (m[1] == that_match_index) ? 1 : 0;
            var b3 = (m[0] == that_match_index) ? 1 : 0;
            array_index = array_index * 2 + b1;
            array_index = array_index * 2 + b2;
            array_index = array_index * 2 + b3;*/

            return [];

	      break;
	    case MATCH_FULL:
  	      {
	      var n = [];
	      var j = 0;
	      for (; j < 3; j++) {
	        var k = 0;
	        for (; k < count; k++) {
		      n[j] = k; /* default to last entry */
		      if (m[j] == dlp['match_index'][k]) {
		        break;
              }
	        }
	      }
	      array_index = array_index * count + n[2];
	      array_index = array_index * count + n[1];
	      array_index = array_index * count + n[0];
	    }
	    break;
	  };
	  array_index = array_index * NUM_CORNER_DIRS + i;
	  result_sprites.push({"key" : cellgroup_map[pterrain['graphic_str'] + "." + array_index]  + "." + i, "offset_x" : x, "offset_y" : y});

      }

      return result_sprites;
    }
  }

  return [];

}


/**********************************************************************
  Determine the sprite_type string.
***********************************************************************/
function check_sprite_type(sprite_type)
{
  if (sprite_type == "corner") {
    return CELL_CORNER;
  }
  if (sprite_type == "single") {
    return CELL_WHOLE;
  }
  if (sprite_type == "whole") {
    return CELL_WHOLE;
  }
  return CELL_WHOLE;
}


/**************************************************************************
 ...Highly modified, look at commits prior to 25.March.2020 if debug/
  comparison needed.
**************************************************************************/
function fill_unit_sprite_array(punit, num_stacked)
{
  //var ptype = unit_type(punit);
  var id = punit['type'];

  var unit_offset = get_unit_anim_offset(punit);
  unit_offset = get_unit_anim_offset(punit);
  unit_offset = get_unit_anim_offset(punit);
  unit_offset = get_unit_anim_offset(punit);

  /* NOTE: Yes we call it twice. Explanation: formerly this was called twice anyway,
  once above, then one more time inside get_unit_nation_flag_sprite(). The second call
  inside get_unit_nation_flag_sprite effectively halved our animation frames for a GOTO,
  which was good because browser animations can't achieve the FPS of native client.
  HOWEVER, the result was jiggly because the shield was always one frame ahead of the
  unit. Now we call it twice at the start and both the unit and send the offset to the
  get_unit_nation_flag_sprite function. Result: the shield are now always on the same
  animation frame, skipping every other frame together (instead of skipping every other
  but the shields always +1 frame ahead of the unit.) TODO: performance could be
  increased by finding a way to call the above function only once and having it increment
  TWO frames in one call. Then we'd avoid doing a double call here.
  */

  // Shield
  var result = [get_unit_nation_flag_sprite(punit, unit_offset)];
  if (result[0]['offset_x']) {
    result[0]['offset_x'] += UO_sx[id];      // adjust shield x placement
    result[0]['offset_y'] -= (UO_sy[id]-1);  // adjust shield y placement, black border overlaps black hp bar.
  }

  // Unit
  result.push(
    {"key" : tileset_unit_type_graphic_tag(unit_type(punit)),
      "offset_x": unit_offset['x'] + UO_dx[id],
      "offset_y": unit_offset['y'] - UO_dy[id]} );
  var activities = get_unit_activity_sprite(punit);
  if (activities != null) {
    activities['offset_x'] = activities['offset_x'] + unit_offset['x'];
    activities['offset_y'] = activities['offset_y'] + unit_offset['y'];
    result.push(activities);
    // also push "connect mode" sprite for units connecting roads/irrigation
    if (activities['connect']==true) {
      result.push({ "key" : "unit.connect",
                    "offset_x" : unit_offset['x']-6,
                    "offset_y" : activities['offset_y'] + unit_offset['y']+19 });
    }
  }
  if (should_ask_server_for_actions(punit)) {
    result.push({
      "key"      : "unit.action_decision_want",
      "offset_x" : unit_activity_offset_x + unit_offset['x'],
      "offset_y" : -unit_activity_offset_y + unit_offset['y'],
    });
  }
  if (unit_offset['x'] == 0 && unit_offset['y'] == 0) { // if unit is moving, don't draw these
    // Move point bar
    if (show_unit_movepct && punit['movesleft']!=null) result.push(get_mp_sprite(punit));
    // Hit point bar
    result.push(get_unit_hp_sprite(punit));
    // Stacked "+" icon
    if (num_stacked) {
      var push_right=0; // whether to push small stack icon right 2 pixels (for right aligned shield)
      // Optional shield ring for stacked units
      if ((!UO_sy[id]) && draw_stacked_unit_mode & dsum_RING) {  // y-aligned shield doesn't get a ring for now.
        if (UO_sx[id]>0){ // right-aligned shield:
          result.push({"key" : "unit.stk_shld_r",
                "offset_x" : unit_offset['x'],
                "offset_y" : -31-unit_offset['y']});
          push_right = 2; // small "+" needs +2 pixels for right-aligned shield
        }
        else           // left-aligned shield:
          result.push({"key" : "unit.stk_shld_l",
                "offset_x" : unit_offset['x']-UO_sx[id],
                "offset_y" : -31-unit_offset['y']-UO_sy[id]});
      }
      // Yellow "+" (small or normal) to show unit is in a stack:
      var stacked = get_unit_stack_sprite(num_stacked);
      if (draw_stacked_unit_mode & dsum_SMALL) {
        stacked['offset_x'] += push_right;
      }
      else {  // normal mode has custom offsets
        stacked['offset_x'] += UO_mx[id];
        stacked['offset_y'] -= UO_my[id];
      }
      result.push(stacked);
    }
  }
  // Veteran Badge
  if (punit['veteran'] > 0) {
    var veteran = get_unit_veteran_sprite(punit);
    veteran['offset_x'] +=  UO_vx[id] + unit_offset['x'];
    veteran['offset_y'] -= (UO_vy[id] - unit_offset['y']); // bundle in unit_offset so badge moves with the unit
    result.push(veteran);
  }

  return result;
}

/**************************************************************************
 ...Fixing the fort drawing bug meant that when front walls of a base are
 drawn they can obscure the stacked icon, which gets redrawn in this case.
**************************************************************************/
function fill_stacked_in_base_sprite_array(punit, num_stacked)
{
  var stacked = get_unit_stack_sprite(num_stacked);

  if (!(draw_stacked_unit_mode & dsum_SMALL) ) {  //// regular mode has custom offsets
    var id = punit['type'];
    const mx = UO_mx[id];   const my = UO_my[id];
    stacked['offset_x'] += mx;
    stacked['offset_y'] -= my;
  }
  return stacked;
}

/**************************************************************************
  Return the tileset name of the direction.  This is similar to
  dir_get_name but you shouldn't change this or all tilesets will break.
**************************************************************************/
function dir_get_tileset_name(dir)
{
  switch (dir) {
  case DIR8_NORTH:
    return "n";
  case DIR8_NORTHEAST:
    return "ne";
  case DIR8_EAST:
    return "e";
  case DIR8_SOUTHEAST:
    return "se";
  case DIR8_SOUTH:
    return "s";
  case DIR8_SOUTHWEST:
    return "sw";
  case DIR8_WEST:
    return "w";
  case DIR8_NORTHWEST:
    return "nw";
  }

  return "";
}


/****************************************************************************
  Return a directional string for the cardinal directions.  Normally the
  binary value 1000 will be converted into "n1e0s0w0".  This is in a
  clockwise ordering.
****************************************************************************/
function cardinal_index_str(idx)
{
  var c = "";

  for (var i = 0; i < num_cardinal_tileset_dirs; i++) {
    var value = (idx >> i) & 1;

    c += dir_get_tileset_name(cardinal_tileset_dirs[i]) + value;
  }

  return c;
}


/**********************************************************************
  Return the flag graphic to be used by the city.
***********************************************************************/
function get_city_flag_sprite(pcity) {
  var owner_id = pcity['owner'];
  if (owner_id == null) return {};
  var owner = players[owner_id];
  if (owner == null) return {};
  var nation_id = owner['nation'];
  if (nation_id == null) return {};
  var nation = nations[nation_id];
  if (nation == null) return {};
  return {"key" : "f." + nation['graphic_str'],
          "offset_x" : city_flag_offset_x,
          "offset_y" : - city_flag_offset_y};
}

/**********************************************************************
  Return the flag graphic to be used by the base on tile
***********************************************************************/
function get_base_flag_sprite(ptile) {
  var owner_id = ptile['extras_owner'];
  if (owner_id == null) return {};
  var owner = players[owner_id];
  if (owner == null) return {};
  var nation_id = owner['nation'];
  if (nation_id == null) return {};
  var nation = nations[nation_id];
  if (nation == null) return {};
  return {"key" : "f." + nation['graphic_str'],
          "offset_x" : buoy_flag_offset_x,
          "offset_y" : - buoy_flag_offset_y,
          "scale" : 0.60};
}

/**********************************************************************
 Returns the sprite key for the number of defending units in a city.
***********************************************************************/
function get_city_occupied_sprite(pcity) {
  var owner_id = pcity['owner'];
  var ptile = city_tile(pcity);
  var punits = tile_units(ptile);

  if (!observing && client.conn.playing != null
      && owner_id != client.conn.playing.playerno && pcity['occupied']) {
    return "citybar.occupied";
  } else if (punits.length > 0) {
    return punits.length >= 20 ? "citybar.occupancy_20" : ("citybar.occupancy_"+punits.length);
  } else {
    return "citybar.occupancy_0";
  }

  /*
  else if (punits.length == 1) {
    return "citybar.occupancy_1";
  } else if (punits.length == 2) {
    return "citybar.occupancy_2";
  } else if (punits.length >= 3) {
    return "citybar.occupancy_3";
  } else {
    return "citybar.occupancy_0";
  }*/
}

/**********************************************************************
...
***********************************************************************/
function get_city_food_output_sprite(num) {
  return {"key" : "city.t_food_" + num,
          "offset_x" : normal_tile_width/4,
          "offset_y" : -normal_tile_height/4};
}

/**********************************************************************
...
***********************************************************************/
function get_city_shields_output_sprite(num) {
  return {"key" : "city.t_shields_" + num,
          "offset_x" : normal_tile_width/4,
          "offset_y" : -normal_tile_height/4};
}

/**********************************************************************
...
***********************************************************************/
function get_city_trade_output_sprite(num) {
  return {"key" : "city.t_trade_" + num,
          "offset_x" : normal_tile_width/4,
          "offset_y" : -normal_tile_height/4};
}


/**********************************************************************
  Return the sprite for an invalid city worked tile.
***********************************************************************/
function get_city_invalid_worked_sprite() {
  return {"key" : "grid.unavailable",
          "offset_x" : 0,
          "offset_y" : 0};
}

/**********************************************************************
  Return the sprite for an user marking the map with notes.
***********************************************************************/
function get_user_mark_sprite(index) {
  return {"key" : USER_MARKS[index],
  "offset_x" : 0,
  "offset_y" : 0};
}

/**********************************************************************
...
***********************************************************************/
function fill_goto_line_sprite_array(ptile)
{
  return {"key" : "goto_line", "goto_dir" : goto_dirs[ptile.index]};
}

/**********************************************************************
  Thus function puts flags on the frontier-facing edge of border tiles.
***********************************************************************/
function get_frontier_flag_sprites(ptile)
{
  var result = [];

  var border_dirs = {};  // which directions have a border on them
  var drawn_dirs  = {};  // which directions will get a flag sprite

  for (var i = 0; i < num_cardinal_tileset_dirs; i++) {
    var dir = cardinal_tileset_dirs[i];
    var checktile = mapstep(ptile, dir);

    if (checktile != null && checktile['owner'] != null
        && ptile['owner'] != null
        && ptile['owner'] != checktile['owner']
        && ptile['owner'] != 255 /* 255 indicates the tile is not owned by anyone. */
        && players[ptile['owner']] != null) {

          var pnation = nations[players[ptile['owner']]['nation']];
          /* Former filling of all land with semi-transparent nation color
              var bcolor = pnation['color'].replace(")", ",0.15)").replace("rgb", "rgba");
              result.push({"key" : "territory", "offset_x" : 0, "offset_y" : 0, "color": bcolor}); */

          border_dirs[dir] = true;
    }
  }
  // Welcome to the LOGIC TREE! Which flags to draw on which BORDERS.
  // Step One. Orthogonal cardinal borders collapse their two flags into one in their shared corner:
  if (border_dirs[DIR8_NORTH]) {
    // North and East borders
    if (border_dirs[DIR8_EAST]) {
      drawn_dirs[DIR8_NORTHEAST] = true;
      drawn_dirs[DIR8_NORTH] = false;
      drawn_dirs[DIR8_EAST] = false;
    }
    // North and West borders
    if (border_dirs[DIR8_WEST]) {
      drawn_dirs[DIR8_NORTHWEST] = true;
      drawn_dirs[DIR8_NORTH] = false;
      drawn_dirs[DIR8_WEST] = false;
    }
  }
  if (border_dirs[DIR8_SOUTH]) {
    // South and East borders
    if (border_dirs[DIR8_EAST]) {
      drawn_dirs[DIR8_SOUTHEAST] = true;
      drawn_dirs[DIR8_SOUTH] = false;
      drawn_dirs[DIR8_EAST] = false;
    }
    // South and West borders
    if (border_dirs[DIR8_WEST]) {
      drawn_dirs[DIR8_SOUTHWEST] = true;
      drawn_dirs[DIR8_SOUTH] = false;
      drawn_dirs[DIR8_WEST] = false;
    }
  }
  // Step Two. Indicate the cardinal frontiers to be drawn unless they were flagged above to not be drawn.
  // If any cardinal frontier === undefined, it was NOT flagged to prohibit being drawn.
  if (border_dirs[DIR8_NORTH] && drawn_dirs[DIR8_NORTH] === undefined)
    drawn_dirs[DIR8_NORTH] = true;
  if (border_dirs[DIR8_EAST] && drawn_dirs[DIR8_EAST] === undefined)
    drawn_dirs[DIR8_EAST] = true;
  if (border_dirs[DIR8_WEST] && drawn_dirs[DIR8_WEST] === undefined)
    drawn_dirs[DIR8_WEST] = true;
  if (border_dirs[DIR8_SOUTH] && drawn_dirs[DIR8_SOUTH] === undefined)
    drawn_dirs[DIR8_SOUTH] = true;

  // Step Three. Collapse double corners into the shared cardinal between them:
  if (drawn_dirs[DIR8_NORTHEAST] && drawn_dirs[DIR8_NORTHWEST]) {
    drawn_dirs[DIR8_NORTHEAST] = false;
    drawn_dirs[DIR8_NORTHWEST] = false;
    drawn_dirs[DIR8_NORTH] = true;
  }
  else if (drawn_dirs[DIR8_NORTHEAST] && drawn_dirs[DIR8_SOUTHEAST]) {
    drawn_dirs[DIR8_NORTHEAST] = false;
    drawn_dirs[DIR8_SOUTHEAST] = false;
    drawn_dirs[DIR8_EAST] = true;
  }
  else if (drawn_dirs[DIR8_SOUTHEAST] && drawn_dirs[DIR8_SOUTHWEST]) {
    drawn_dirs[DIR8_SOUTHEAST] = false;
    drawn_dirs[DIR8_SOUTHWEST] = false;
    drawn_dirs[DIR8_SOUTH] = true;
  }
  else if (drawn_dirs[DIR8_SOUTHWEST] && drawn_dirs[DIR8_NORTHWEST]) {
    drawn_dirs[DIR8_SOUTHWEST] = false;
    drawn_dirs[DIR8_NORTHWEST] = false;
    drawn_dirs[DIR8_WEST] = true;
  }

  for (const dir in drawn_dirs) {
    if (drawn_dirs[dir]) {
      result.push({"key" : "f." + pnation['graphic_str'],
      "offset_x" : border_flag_offsets[dir].x,
      "offset_y" : border_flag_offsets[dir].y,
      "scale": 0.4}); // 30x20 -> 12x8
    }
  }
  return result;
}


/**********************************************************************
  Thus function pushes border-line sprites to the sprite array.
***********************************************************************/
function get_border_line_sprites(ptile)
{
  var result = [];
  for (var i = 0; i < num_cardinal_tileset_dirs; i++) {
    var dir = cardinal_tileset_dirs[i];
    var checktile = mapstep(ptile, dir);

    if (checktile != null && checktile['owner'] != null
        && ptile['owner'] != null
        && ptile['owner'] != checktile['owner']
        && ptile['owner'] != 255 /* 255 is a special constant indicating that the tile is not owned by anyone. */
        && players[ptile['owner']] != null) {
      var pnation = nations[players[ptile['owner']]['nation']];
      result.push({"key" : "border", "dir" : dir,
                    "color": pnation.color, "color2": pnation.color2, "color3": pnation.color3});
    }
  }
  return result;
}

/**********************************************************************
  ...returns the shield (not the flag)
***********************************************************************/
function get_unit_nation_flag_sprite(punit, unit_offset)
{
  var owner_id = punit['owner'];
  var owner = players[owner_id];
  var nation_id = owner['nation'];
  var nation = nations[nation_id];
  //var unit_offset = get_unit_anim_offset(punit);
  // line above removed because, now we pass this value since the
  // function calling this already got this info; this also fixed
  // jiggly movement since making the two get_unit_anim_offset calls
  // returned different values for the same frame!

  return {"key" : "f.shield." + nation['graphic_str'],
          "offset_x" : unit_flag_offset_x + unit_offset['x'],
          "offset_y" : - unit_flag_offset_y + unit_offset['y']};
}
/**********************************************************************
  ...returns the shield (not the flag) in html usable form
***********************************************************************/
function get_html_nation_shield_sprite(nation)
{
  var tag ="f.shield." +  nation['graphic_str'];
  var sprite = {"type":null,"sprite":get_sprite_from_tag(tag)};
  var shield_sprite = sprite['sprite'];

    return "<span class='v' title='"+nation['adjective']+"' style='cursor:help;"
      + "background: transparent url("
      + shield_sprite['image-src']
      + ");transform: scale(1.0); background-position:-" + shield_sprite['tileset-x'] + "px -" + (shield_sprite['tileset-y'])
      + "px;  width: " + (shield_sprite['width']) + "px;height: " + (shield_sprite['height']) + "px;"
      + " content-align: left;"
      + "vertical-align:top; float:left;'>"
      + "</span>";
}

/**********************************************************************
  ...
***********************************************************************/
function get_unit_nation_flag_normal_sprite(punit)
{
  var owner_id = punit['owner'];
  var owner = players[owner_id];
  var nation_id = owner['nation'];
  var nation = nations[nation_id];
  var unit_offset = get_unit_anim_offset(punit);

  return {"key" : "f." + nation['graphic_str'],
          "offset_x" : unit_flag_offset_x + unit_offset['x'],
          "offset_y" : - unit_flag_offset_y + unit_offset['y']};
}

/**********************************************************************
  ...
***********************************************************************/
function get_unit_stack_sprite(stacksize)
{
  if (draw_stacked_unit_mode & dsum_SMALL) {   //// alternate small mode of showing stack near hpbar
    return {"key" : "unit.stack"+stacksize+"",
    "offset_x" : unit_flag_offset_x + -25,
    "offset_y" : - unit_flag_offset_y - 15};
  }
  else return {"key" : "unit.stack",
          "offset_x" : unit_flag_offset_x + -25,
          "offset_y" : - unit_flag_offset_y - 15};
}

/**********************************************************************
  ...
***********************************************************************/
function get_unit_hp_sprite(punit)
{
  var hp = punit['hp'];
  var unit_type = unit_types[punit['type']];
  var max_hp = unit_type['hp'];
  var healthpercent = (10 * Math.floor((20 * hp) / max_hp))/2; //0-100 by 5's
  var unit_offset = get_unit_anim_offset(punit);

  // don't push up hp bar for foreign units for which we don't know movesleft
  var bar_offset = (punit['movesleft']!=null) ? hp_bar_offset : 0;

  return {"key" : "unit.hp_" + healthpercent,
          "offset_x" : unit_flag_offset_x + -25 + unit_offset['x'],
          "offset_y" : - unit_flag_offset_y - 15 + bar_offset + unit_offset['y']};
}
/**********************************************************************
  ...
***********************************************************************/
function get_mp_sprite(punit)
{
  // Compute the sprite for the number of moves left (we steal the hitpoint counter)
  var mp = punit['movesleft'];
  var unit_type = unit_types[punit['type']];
  var max_mp = unit_type['move_rate'];
  var movepercent = (10 * Math.floor((20 * mp) / max_mp))/2; //0-100 by 5's
  if (movepercent>100) movepercent=100; // move bonuses can give numbers >100%
  var unit_offset = get_unit_anim_offset(punit);

  return {"key" : "unit.hp_" + movepercent,
          "offset_x" : unit_flag_offset_x + -25 + unit_offset['x'],
          "offset_y" : - unit_flag_offset_y - 15 + unit_offset['y']};
}
/****************************************************************************
 constructs an html-usable sprite for a unit's hp
****************************************************************************/
function get_full_hp_sprite(punit)
{
  // Compute the sprite for the number of hitpoints left
  var hp = punit['hp'];
  var unit_type = unit_types[punit['type']];
  var max_hp = unit_type['hp'];
  var healthpercent = (10 * Math.floor((20 * hp) / max_hp))/2; //0-100 by 5's
  var tag = "unit.hp_" + healthpercent;

  return get_sprite_from_tag(tag);
}
/**************************************************************************
  Returns a <div> string that can be appended to an html string containing
    a unit sprite, that will place the hp meter over it in the right
    place and keep the image underneath clickable.
**************************************************************************/
function get_html_hp_sprite(punit, unit_panel_pos)
{
  var htype_sprite = {"type":null,"sprite":get_full_hp_sprite(punit)};
  var hp_sprite = htype_sprite['sprite'];

  var left_adj = -90;
  var top_adj  = -16;
  if (unit_panel_pos) {
    left_adj -= 12;
    top_adj  += 1;
  }

return "<div style='pointer-events: none; margin-left:"+left_adj+"px; margin-top:"+top_adj+"px; margin-right: -96px; float:left; content-align:left;"
  + "background: transparent url("
  + hp_sprite['image-src']
  + ");transform: scale(0.5); background-position:-" + hp_sprite['tileset-x'] + "px -" + (hp_sprite['tileset-y'])
  + "px;  width: " + (hp_sprite['width']) + "px;height: " + (hp_sprite['height']) + "px;"
  + " content-align: left;"
  + "vertical-align:top; float:left;'>"
  + "</div>";
}
/****************************************************************************
 constructs an html-usable movepoint sprite for a unit's moves_left
****************************************************************************/
function get_full_mp_sprite(punit)
{
  // Compute the sprite for the number of moves left (we steal the hitpoint counter)
  var mp = punit['movesleft'];
  var unit_type = unit_types[punit['type']];
  var max_mp = unit_type['move_rate'];
  var movepercent = (10 * Math.floor((20 * mp) / max_mp))/2; //0-100 by 5's
  if (movepercent>100) movepercent=100; // move bonuses can give numbers >100
  var tag = "unit.hp_" + movepercent;   // hp tag serves for mp too

  return get_sprite_from_tag(tag);
}
/**************************************************************************
  Returns a <div> string that can be appended to an html string containing
    a unit sprite, that will place the movesleft meter over it in the right
    place and keep the image underneath clickable.
**************************************************************************/
function get_html_mp_sprite(punit, unit_panel_pos)
{
  var mtype_sprite = {"type":null,"sprite":get_full_mp_sprite(punit)};
  var mp_sprite = mtype_sprite['sprite'];

  var left_adj = -90;
  var top_adj  = -13;
  if (unit_panel_pos) {
    left_adj -= 12;
    top_adj  += 1;
  }

  return "<div style='pointer-events: none; margin-left:"+left_adj+"; margin-top:"+top_adj+"px; margin-right: -64px; float:left; content-align:left;"
    + "background: transparent url("
    + mp_sprite['image-src']
    + ");transform: scale(0.5); background-position:-" + mp_sprite['tileset-x'] + "px -" + (mp_sprite['tileset-y'])
    + "px;  width: " + (mp_sprite['width']) + "px;height: " + (mp_sprite['height']) + "px;"
    + " content-align: left;"
    + "vertical-align:top; float:left;'>"
    + "</div>";
}
/****************************************************************************
 constructs an html-usable veteran icon sprite for a unit's veteran level
****************************************************************************/
function get_full_vet_sprite(punit)
{
  if (punit['veteran']>0) {
    var tag = "unit.vet_" + punit['veteran'];
    return get_sprite_from_tag(tag);
  } else return null;
}
/**************************************************************************
  Returns a <div> string that can be appended to an html string containing
    a unit sprite, that will place the vet level over it in the right place
    and keep the image underneath clickable.
**************************************************************************/
function get_html_vet_sprite(punit)
{
    if (!punit['veteran'] || punit['veteran']<1) return "";

    var vtype_sprite = {"type":null,"sprite":get_full_vet_sprite(punit)};
    var vet_sprite = vtype_sprite['sprite'];

    return "<div style='pointer-events: none; margin-left:-46px; margin-top:-24px; margin-right: -24px; float:left; content-align:left;"
      + "background: transparent url("
      + vet_sprite['image-src']
      + ");transform: scale(1.0); background-position:-" + vet_sprite['tileset-x'] + "px -" + (vet_sprite['tileset-y'])
      + "px;  width: " + (vet_sprite['width']) + "px;height: " + (vet_sprite['height']) + "px;"
      + " content-align: left;"
      + "vertical-align:top; float:left;'>"
      + "</div>";
}
/**************************************************************************
  Returns a <div> string that can be appended to an html string containing
    a unit sprite, that will place the activity sprite over it in the
    right place and keep the image underneath clickable.
**************************************************************************/
function get_html_activity_sprite(punit)
{
  var proto_sprite = get_unit_activity_sprite(punit);
  if (proto_sprite) {
    var atype_sprite = {"type":null,"sprite":get_sprite_from_tag(proto_sprite['key'])};
    var action_sprite = atype_sprite['sprite'];

    let ml = -25; let mr = -14; let mt = -14;
    // ugly exception: this one is in tiles.spec and is 96x48 instead of 28x24
    if (proto_sprite['key']=="unit.auto_settler") {  // 96-28-68. 68/2 = 34
      ml -= 38; mr -= 30; mt = -9;
    }
    return "<div style='pointer-events: none; margin-left:"+ml+"px; margin-top:"+mt+"px; margin-right: "+mr+"px; float:left; content-align:left;"
      + "background: transparent url("
      + action_sprite['image-src']
      + ");transform: scale(0.95); background-position:-" + action_sprite['tileset-x'] + "px -" + (action_sprite['tileset-y'])
      + "px;  width: " + (action_sprite['width']) + "px;height: " + (action_sprite['height']) + "px;"
      + " content-align: left;"
      + "vertical-align:top; float:left;'>"
      + "</div>";
  }
  return "";
}
/**************************************************************************
  Returns a <div> string that can be appended to an html string containing
    a unit sprite, that will place the unhappy sprite over it in the
    right place and keep the image underneath clickable.
**************************************************************************/
function get_html_cause_unhappy_sprite(punit)
{
  const protest_url = "/images/e/fist.png";
  const ml = -44; const mr = -14; const mt = 44;
  return "<div style='pointer-events: none; margin-left:"+ml+"px; margin-top:"+mt+"px; margin-right: "+mr+"px; float:left; content-align:left;"
  + "background: transparent url("
  + protest_url
  + ");transform: scale(0.75); width: 24px;height: 24px;"
  + " content-align: left;"
  + "vertical-align:top; float:left;'>"
  + "</div>";
}

/****************************************************************************
 gives an html-ready sprite from the tileset, by tag name
****************************************************************************/
function get_sprite_from_tag(tag)
{
  if (!tag) return null;

  var tileset_x = tileset[tag][0];
  var tileset_y = tileset[tag][1];
  var width = tileset[tag][2];
  var height = tileset[tag][3];
  var i = tileset[tag][4];

  return {"tag": tag,
          "image-src" : "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
          "tileset-x" : tileset_x,
          "tileset-y" : tileset_y,
          "width" : width,
          "height" : height
          };
}


/**********************************************************************
  ...
***********************************************************************/
function get_unit_veteran_sprite(punit)
{
  return {"key" : "unit.vet_" + punit['veteran'],
          "offset_x" : unit_activity_offset_x - 20,
          "offset_y" : - unit_activity_offset_y - 10};
}

/**********************************************************************
  ...resequenced in order of frequency
***********************************************************************/
function get_unit_activity_sprite(punit)
{
  var activity = punit['activity'];
  var act_tgt  = punit['activity_tgt'];

  // Special case: idle/sentry units on transport will show themselves
  // as "cargo" even though server has no ACTIVITY_CODE for it:
  if (punit['transported']) {
    if (activity == ACTIVITY_SENTRY || activity == ACTIVITY_IDLE)
      return {"key" : "unit.cargo",
        "offset_x" : unit_activity_offset_x,
        "offset_y" : - unit_activity_offset_y};
  }

  switch (activity) {
    case ACTIVITY_GEN_ROAD:
        return   {"key" : tileset_extra_id_activity_graphic_tag(act_tgt),
                  "offset_x" : unit_activity_offset_x,
                  "offset_y" : - unit_activity_offset_y,
                  /*flag to also push a connect sprite on top */
                  "connect" : ((punit['orders_length']>0) ? true : false)
                };

    case ACTIVITY_IRRIGATE:
        return {"key" : -1 == act_tgt ?
                          "unit.irrigate" :
                          tileset_extra_id_activity_graphic_tag(act_tgt),
                "offset_x" : unit_activity_offset_x,
                "offset_y" : - unit_activity_offset_y,
                /*flag to also push a connect sprite on top */
                "connect" : ((punit['orders_length']>0) ? true : false)
               };

    case ACTIVITY_CULTIVATE:
       return {"key"      : "unit.irrigate",
               "offset_x" : unit_activity_offset_x,
               "offset_y" : - unit_activity_offset_y,
               /*flag to also push a connect sprite on top */
               "connect" : ((punit['orders_length']>0) ? true : false)
              };

    case ACTIVITY_GOTO:
        return {"key" : "unit.goto",
            "offset_x" : unit_activity_offset_x,
            "offset_y" : - unit_activity_offset_y};

    case ACTIVITY_FORTIFYING:
      if (client_rules_flag[CRF_EXTRA_HIDEOUT]) {
        if (tile_has_extra(tiles[punit['tile']], EXTRA_)) {
          return {"key" : "unit.fortifying_hidden",
          "offset_x" : unit_activity_offset_x,
          "offset_y" : - unit_activity_offset_y};
        }
      }
      return {"key" : "unit.fortifying",
          "offset_x" : unit_activity_offset_x,
          "offset_y" : - unit_activity_offset_y};

    case ACTIVITY_SENTRY:
      if (client_rules_flag[CRF_EXTRA_HIDEOUT]) {
        if (tile_has_extra(tiles[punit['tile']], EXTRA_)) {
          return {"key" : "unit.sentry_hidden",
            "offset_x" : unit_activity_offset_x,
            "offset_y" : - unit_activity_offset_y};
        }
      }
      if (client_rules_flag[CRF_MP2_D]) {
        if (tile_has_extra(tiles[punit['tile']], EXTRA_DEEPDIVE) && get_unit_class_name(punit) == "Submarine") {
          return {"key" : "unit.sentry_hidden",
            "offset_x" : unit_activity_offset_x,
            "offset_y" : - unit_activity_offset_y};
        }
      }
      return {"key" : "unit.sentry",
          "offset_x" : unit_activity_offset_x,
          "offset_y" : - unit_activity_offset_y};

    case ACTIVITY_FORTIFIED:
      if (client_rules_flag[CRF_EXTRA_HIDEOUT]) {
        if (tile_has_extra(tiles[punit['tile']], EXTRA_)) {
          return {"key" : "unit.fortified_hidden",
            "offset_x" : unit_activity_offset_x,
            "offset_y" : - unit_activity_offset_y};
        }
      }
      return {"key" : "unit.fortified",
            "offset_x" : unit_activity_offset_x,
            "offset_y" : - unit_activity_offset_y};

    case ACTIVITY_MINE:
      return {"key"      : -1 == act_tgt ?
                             "unit.plant" :
                             tileset_extra_id_activity_graphic_tag(act_tgt),
              "offset_x" : unit_activity_offset_x,
              "offset_y" : - unit_activity_offset_y,
              /*flag to also push a connect sprite on top */
              "connect" : ((punit['orders_length']>0) ? true : false)
              };

    case ACTIVITY_PLANT:
       return {"key"      : "unit.plant",
               "offset_x" : unit_activity_offset_x,
               "offset_y" : - unit_activity_offset_y,
               /*flag to also push a connect sprite on top */
               "connect" : ((punit['orders_length']>0) ? true : false)
               };

    case ACTIVITY_BASE:
      return {"key" : tileset_extra_id_activity_graphic_tag(act_tgt),
              "offset_x" : unit_activity_offset_x,
              "offset_y" : - unit_activity_offset_y,
              /*flag to also push a connect sprite on top */
              "connect" : ((punit['orders_length']>0) ? true : false)
              };

    case ACTIVITY_PILLAGE:
      return {"key" : "unit.pillage",
          "offset_x" : unit_activity_offset_x,
          "offset_y" : - unit_activity_offset_y,
          /*flag to also push a connect sprite on top */
          "connect" : ((punit['orders_length']>0) ? true : false)
          };

    case ACTIVITY_VIGIL:
        if (observing
           || ((client.conn.playing != null || is_supercow())
               && (client.conn.playing.playerno == punit.owner
                   || players[punit.owner]['gives_shared_vision'].isSet(client.conn.playing.playerno)))
            ) {
          return {"key" : "unit.vigil",
              "offset_x" : unit_activity_offset_x,
              "offset_y" : - unit_activity_offset_y};
        }
        break;

    case ACTIVITY_EXPLORE:
      return {"key" : "unit.auto_explore",
          "offset_x" : unit_activity_offset_x,
          "offset_y" : - unit_activity_offset_y};

    case ACTIVITY_TRANSFORM:
      return {"key" : "unit.transform",
          "offset_x" : unit_activity_offset_x,
          "offset_y" : - unit_activity_offset_y,
          /*flag to also push a connect sprite on top */
          "connect" : ((punit['orders_length']>0) ? true : false)
          };

    case ACTIVITY_POLLUTION:
        return {"key" : "unit.pollution",
            "offset_x" : unit_activity_offset_x,
            "offset_y" : - unit_activity_offset_y,
            /*flag to also push a connect sprite on top */
            "connect" : ((punit['orders_length']>0) ? true : false)
            };

    case ACTIVITY_FALLOUT:
      return {"key" : "unit.fallout",
          "offset_x" : unit_activity_offset_x,
          "offset_y" : - unit_activity_offset_y,
          /*flag to also push a connect sprite on top */
          "connect" : ((punit['orders_length']>0) ? true : false)
          };

    case ACTIVITY_CONVERT:
        return {"key" : "unit.convert",
            "offset_x" : unit_activity_offset_x,
            "offset_y" : - unit_activity_offset_y};
  }

  if (unit_has_goto(punit)) {
    /* DETERMINE WHETHER TO USE AN HOURGLASS ICON FOR A UWT DELAYED GOTO */
    // if (punit['movesleft']>=unit_types[punit['type']]['move_rate'] // may have vet bonus or wonder bonus, so use >= .
    if (punit['movesleft']>0 // The above didn't work on injured units because they begin with less than full move points.
    // It could be made to work by calculating the exact # of moves they should have for their injuries, but instead we're
    // now trying: **if movesleft>0** and then using a simpler way to distinguish an issue with using >0--the problem with
    // using moves>0 is that units given a DelayGoto/shift-G command would also show an hourglass unless there is a way to
    // distinguish them; which indeed, is that they have moved, so should have a done_moving flag; whereas the UWT delayed
    // units didn't get to move yet. This worked in tests, but should be watched to confirm it works in all cases:
    && punit['done_moving'] == false   // distinguisher between shift-G delayGoto and a UWT_DELAY_GOTO forced wait.
    && punit['changed_from'] == activity
    && !(typeof server_settings['unitwaittime_style'] === 'undefined')
    && (server_settings['unitwaittime_style']['val'] & 4)  // UWT_DELAY_GOTO is on
    && act_tgt == punit['changed_from_tgt'] ) {
      return {"key" : "unit.goto_delay",
        "offset_x" : unit_activity_offset_x,
        "offset_y" : - unit_activity_offset_y};
    } // Show patrol or patrol_back icon if unit is on patrol
    if (punit['orders_vigilant'] && punit['orders_repeat']) {
      if (punit['orders_index']/(punit['orders_length']-1) <= 0.50)
        return {"key" : "unit.patrol",
        "offset_x" : unit_activity_offset_x,
        "offset_y" : - unit_activity_offset_y};
      else // indicates unit is on the return journey of its patrol
        return {"key" : "unit.patrol_back",
        "offset_x" : unit_activity_offset_x,
        "offset_y" : - unit_activity_offset_y};
    } // Otherwise, show GO_AND icon if last order isn't a move, or else show standard GOTO icon:
    return {"key" : (punit['orders'][punit['orders'].length-1]['order'] != ORDER_ACTION_MOVE ? "unit.go_and" : "unit.goto"),
        "offset_x" : unit_activity_offset_x,
        "offset_y" : - unit_activity_offset_y};
  }
  if (punit['ai'] == true) {
      return {"key" : "unit.auto_settler",
          "offset_x" : 20, //FIXME.
          "offset_y" : - unit_activity_offset_y};
  }

  if (client_rules_flag[CRF_EXTRA_HIDEOUT]) {
    if (tile_has_extra(tiles[punit['tile']], EXTRA_)) {
      return {"key" : "unit.hidden",
        "offset_x" : unit_activity_offset_x,
        "offset_y" : - unit_activity_offset_y};
    }
  }
  if (client_rules_flag[CRF_MP2_D]) {
    if (tile_has_extra(tiles[punit['tile']], EXTRA_DEEPDIVE) && get_unit_class_name(punit) == "Submarine") {
      return {"key" : "unit.hidden",
        "offset_x" : unit_activity_offset_x,
        "offset_y" : - unit_activity_offset_y};
    }
  }
  return null;
}
function get_city_coastal_overlay_sprite(pcity) {
  // LAYER THREE: Overlays
  if (pcity['walls'] & CITY_COASTAL_DEFENSE && !(pcity['walls'] & CITY_CITADEL)) {
    return {"key": "city.coastal_overlay", "offset_x" : -4, "offset_y" : -24};
  }
  return null; // no overlay.
}
function get_city_coastal_underlay_sprite(pcity) {
  // LAYER ONE: Underlays
  if (pcity['walls'] & CITY_COASTAL_DEFENSE && !(pcity['walls'] & CITY_CITADEL)) {
    return {"key": "city.coastal_underlay", "offset_x" : -4, "offset_y" : -24};
  }
  return null; // no underlay.
}
function get_city_fortifications_overlay_sprite(pcity) {
  // LAYER THREE: Overlays
  if ((pcity['walls'] & CITY_FORTIFICATIONS) && !(pcity['walls'] & CITY_WALLS) && !(pcity['walls'] & CITY_CITADEL)) {
    // !(&1) means, don't show if there are also City Walls
    return {"key": "city.fortifications_overlay", "offset_x" : -4, "offset_y" : -24};
  }
  return null; // no overlay.
}
function get_city_fortifications_underlay_sprite(pcity) {
  // LAYER ONE: Underlays
      // !(&1) means, don't show if there are also City Walls
  if ((pcity['walls'] & CITY_FORTIFICATIONS) && !(pcity['walls'] & CITY_WALLS) && !(pcity['walls'] & CITY_CITADEL)) {
    return {"key": "city.fortifications_underlay", "offset_x" : -4, "offset_y" : -24};
  }
  return null; // no underlay.
}
function get_city_sam_battery_overlay_sprite(pcity) {
  if ((pcity['walls'] & CITY_SAM)) {
    return {"key": "city.sam_overlay", "offset_x" : -16, "offset_y" : -24};
  }
  return null; // no underlay.
}
// For wonder sprites that sit on top of the city graphic
function get_city_wonder_underlay_sprite(pcity) {
  var result = [];

  // TOP LEFT: only show one by priority
  if ((pcity['walls'] & CITY_SPHINX)) {
    result.push({"key": "city.sphinx_underlay", "offset_x" : -16, "offset_y" : -24});
  }
  // BOTTOM LEFT: only show one by priority:
  if ((pcity['walls'] & CITY_CHAND_BAORI)) {
    result.push({"key": "city.chand_baori_underlay", "offset_x" : -16, "offset_y" : -24});
  }
  // more can go here later, including the other corners and some logic of which to show together
  return result; // no underlay.
}
// For wonder sprites that sit on top of the city graphic
function get_city_wonder_overlay_sprite(pcity) {
  if ((pcity['walls'] & CITY_HAMMURABI)) {
    return {"key": "city.hammurabi", "offset_x" : -16, "offset_y" : -24};
  }
  // more can go here later, including even logic of which to show together or not
  return null; // no underlay.
}
 /*
/****************************************************************************
  Return the sprite in the city_sprite listing that corresponds to this
  city - based on city style and size.

  See also load_city_sprite, free_city_sprite.
****************************************************************************/
function get_city_sprite(pcity)
{
  var tag;
  /* Wonders that define the entire sprite of the city go here... Make quick
     exit from checking every type by checking if there are any at all, first: */
  if (pcity['walls'] & (CITY_REPLACED_BY_WONDER_MASK)) {
    if (pcity['walls'] & CITY_MAUSOLEUM) tag = "city.mausoleum_overlay";
    else if (pcity['walls'] & CITY_ANGKOR_WAT) tag = "city.angkor_overlay";
    else if (pcity['walls'] & CITY_CITADEL) tag = "city.citadel_overlay";
    else if (pcity['walls'] & CITY_PYRAMID) tag = "city.pyramid_overlay";
    else if (pcity['walls'] & CITY_HANGING_GARDEN) tag = "city.hgarden_overlay";
    else if (pcity['walls'] & CITY_ZIGGURAT) tag = "city.ziggurat_overlay";
//  else if (pcity['walls'] & CITY_CHICHEN_ITZA) tag = "city.chichen_overlay";   RESERVED FOR FUTURE
  }
  else {
    var style_id = pcity['style'];
    if (style_id == -1) style_id = 0;   /* sometimes a player has no city_style. */
    var city_rule = city_rules[style_id];

    /* Old method
    var size = 0;
    if (pcity['size'] >=4 && pcity['size'] <=7) {
      size = 1;
    } else if (pcity['size'] >=8 && pcity['size'] <=11) {
      size = 2;
    } else if (pcity['size'] >=12 && pcity['size'] <=15) {
      size = 3;
    } else if (pcity['size'] >=16) {
      size = 4;
    } */

    /* New High Performance Method: Fewer comparisons by avoiding compound expressions (a && b)
       Fewer comparisons for larger cities: optimized for late game, not early game */
    let size = 4;
    if (pcity['size']<=15) {
      if      (pcity['size'] >=12) size = 3;
      else if (pcity['size'] >=8)  size = 2;
      else if (pcity['size'] >=4)  size = 1;
      else                         size = 0;
    }

    var city_walls = (pcity['walls'] & CITY_WALLS) ? "wall" : "city";

    tag = city_rule['graphic'] + "_" + city_walls + "_" + size;
    if (sprites[tag] == null) {
      tag = city_rule['graphic_alt'] + "_" + city_walls + "_" + size;
    }
  }

  // the numbers -4 and -24 are where we adjust offsets:
  return {"key" :  tag, "offset_x": -4, "offset_y" : -24 };
}


/****************************************************************************
  Add sprites for fog (and some forms of darkness).
****************************************************************************/
function fill_fog_sprite_array(ptile, pedge, pcorner)
{

  var i, tileno = 0;

  if (pcorner == null) return [];

  for (i = 3; i >= 0; i--) {
    var unknown = 0, fogged = 1, known = 2;
    var value = -1;

    if (pcorner['tile'][i] == null) {
	  value = unknown;
    } else {
	  switch (tile_get_known(pcorner['tile'][i])) {
	    case TILE_KNOWN_SEEN:
	      value = known;
	      break;
	    case TILE_KNOWN_UNSEEN:
	      value = fogged;
	      break;
	    case TILE_UNKNOWN:
	      value = unknown;
	      break;
      }
    }
    tileno = tileno * 3 + value;
  }

  if (tileno >= 80) return [];

  return [{"key" : fullfog[tileno]}];

}

/****************************************************************************
 ...
****************************************************************************/
function get_select_sprite()
{
  // update selected unit sprite 6 times a second.
  current_select_sprite = (Math.floor(new Date().getTime() * 6 / 1000) % max_select_sprite);
  return {"key" : "unit.select" + current_select_sprite };
}

/****************************************************************************
 ...
****************************************************************************/
function get_city_info_text(pcity)
{
  return {"key" : "city_text", "city" : pcity,
  		  "offset_x": citybar_offset_x, "offset_y" : citybar_offset_y};
}

/****************************************************************************
 ...
****************************************************************************/
function get_tile_label_text(ptile)
{
  return {"key" : "tile_label", "tile" : ptile,
  		  "offset_x": tilelabel_offset_x, "offset_y" : tilelabel_offset_y};
}

/****************************************************************************
 ...
****************************************************************************/
function get_tile_specials_sprite(ptile)
{
  const extra_id = tile_resource(ptile);

  if (extra_id !== null) {
    const extra = extras[extra_id];
    if (extra != null) {
      // Resources that disappear can't be knowable on fog of war tiles: e.g.,
      // Deer, Boar, Fallout in rulesets where Fallout disappears over time. Server
      // tells client that all extras have 15‱ (RS_DEFAULT_EXTRA_DISAPPEARANCE)
      // to signal the chance is 0. So odds != RS_DEFAULT_EXTRA_DISAPPEARANCE
      // means this extra can't show in fogofwar:
      if (tile_get_known(ptile)==TILE_KNOWN_UNSEEN &&
          extras[extra_id].disappearance_chance != RS_DEFAULT_EXTRA_DISAPPEARANCE)
         return null;
      // All other cases: return sprite for the extra:
      return  {"key" : extra['graphic_str']} ;
    }
  }
  return null;
}

/****************************************************************************
 ..."Like" means: cardinal connect, and completes an outlet sprite to coast
****************************************************************************/
function get_tile_river_like_sprite(ptile, extra, prefix, abort_outlets)
{
  if (ptile == null) {
    return null;
  }
  // set up co-connectives: e.g., navalbases connect to rivers (because ocean traffic passes thru)
  var extra2 = extra;

  // look for synonymous 'twin' e.g. "Mountain River" in mp2e: this is performance preferrable to
  // calling this function multiple times in every ruleset just because one ruleset uses a twin-type.
  var clone_extra = extra_has_synonym(extra);

  var integrate_extras = [];

  // Due to how canals and rivers integrate into naval bases (for graphical pleasure only),
  // we have to make a fake naval base that will never be used, for rulesets which don't
  // have it.
  if (typeof EXTRA_NAVALBASE === 'undefined') var EXTRA_NAVALBASE = EXTRA_NONE;

  // TO DO: if these are predefined it might be less processing time. Rulesets could have any
  // combination of Canal, Waterway, or Navalbase, and this just assumes what we've done with
  // MP2 and AG.
  // Handle "integrates" feature of roads. Has to be hard-coded until server gives this info.


  // MP2_E onward
  if (client_rules_flag[CRF_MTN_RIVERS]) {
    // process in order of frequency
    if (extra == EXTRA_RIVER) {
      extra2 = EXTRA_NAVALBASE;
      integrate_extras = [EXTRA_MOUNTAINRIVER, EXTRA_WATERWAY, EXTRA_NAVALBASE, EXTRA_CANAL];
    }
    else if (extra == EXTRA_CANAL) {
      extra2 = EXTRA_NAVALBASE;
      integrate_extras = [EXTRA_WATERWAY, EXTRA_NAVALBASE, EXTRA_RIVER, EXTRA_MOUNTAINRIVER];
    }
    else if (extra == EXTRA_WATERWAY) {
      extra2 = EXTRA_NAVALBASE;
      integrate_extras = [EXTRA_RIVER, EXTRA_CANAL, EXTRA_MOUNTAINRIVER, EXTRA_NAVALBASE];
    }
    else if (extra == EXTRA_NAVALBASE) {
      extra2 = EXTRA_RIVER;
      integrate_extras = [EXTRA_RIVER, EXTRA_CANAL, EXTRA_WATERWAY, EXTRA_MOUNTAINRIVER];
    } // Isn't needed as long as we only call this function with the clone_extra of EXTRA_RIVER.
    /*   Which we do to save CPU. But if we get rid of clone_extra then we need to call this
     *   function with EXTRA_MOUNTAINRIVER also, and have this code block below activated:r
    else if (extra == EXTRA_MOUNTAINRIVER) {
      extra2 = EXTRA_NAVALBASE;
      integrate_extras = [EXTRA_RIVER, EXTRA_WATERWAY, EXTRA_NAVALBASE, EXTRA_CANAL];
    }*/
  }
  // Ruleset with Naval base but no Waterway (old MP2):
  else if (client_rules_flag[CRF_CANALS] && typeof EXTRA_WATERWAY === 'undefined') {
    // process in order of frequency
    if (extra == EXTRA_RIVER) {
      extra2 = EXTRA_NAVALBASE;
      integrate_extras = [EXTRA_NAVALBASE, EXTRA_CANAL];
    }
    else if (extra == EXTRA_CANAL) {
      extra2 = EXTRA_NAVALBASE;
      integrate_extras = [EXTRA_NAVALBASE, EXTRA_RIVER];
    }
    else if (extra == EXTRA_NAVALBASE) {
      extra2 = EXTRA_RIVER;
      integrate_extras = [EXTRA_RIVER, EXTRA_CANAL];
    }
  }
  else if (client_rules_flag[CRF_CANALS]) // Ruleset with Canal and Waterway
  {  // process in order of frequency
    if (extra == EXTRA_RIVER) {
      extra2 = EXTRA_NAVALBASE;
      integrate_extras = [EXTRA_WATERWAY, EXTRA_NAVALBASE, EXTRA_CANAL];
    }
    else if (extra == EXTRA_CANAL) {
      extra2 = EXTRA_NAVALBASE;
      integrate_extras = [EXTRA_WATERWAY, EXTRA_NAVALBASE, EXTRA_RIVER];
    }
    else if (extra == EXTRA_WATERWAY) {
      extra2 = EXTRA_NAVALBASE;
      integrate_extras = [EXTRA_RIVER, EXTRA_CANAL, EXTRA_NAVALBASE];
    }
    else if (extra == EXTRA_NAVALBASE) {
      extra2 = EXTRA_RIVER;
      integrate_extras = [EXTRA_RIVER, EXTRA_CANAL, EXTRA_WATERWAY];
    }
  }

  // SEABRIDGE computes differently because it has opposite outlets: i.e., sea to land, not land to sea
  if (typeof EXTRA_SEABRIDGE !== 'undefined' && extra == EXTRA_SEABRIDGE) {
    if (tile_has_extra(ptile, extra)) {
      var river_str = "";
      for (var i = 0; i < num_cardinal_tileset_dirs; i++) {
        var dir = cardinal_tileset_dirs[i];
        var checktile = mapstep(ptile, dir);
        if (checktile
            && (tile_has_extra(checktile, extra)
            || !is_ocean_tile(checktile)
            || tile_has_extra(checktile, EXTRA_ROAD)  )  ) {
          river_str = river_str + dir_get_tileset_name(dir) + "1";
        } else {
          river_str = river_str + dir_get_tileset_name(dir) + "0";
        }
      }
      return {"key" : prefix + "_s_" + river_str};
    }

    var pterrain = tile_terrain(ptile);
    if (pterrain['graphic_str'] != "coast") {
      for (var i = 0; i < num_cardinal_tileset_dirs; i++) {
        var dir = cardinal_tileset_dirs[i];
        var checktile = mapstep(ptile, dir);
        if (checktile != null && (tile_has_extra(checktile, extra) || tile_has_extra(checktile, extra2)) ) {
          return {"key" : prefix + "_outlet_" + dir_get_tileset_name(dir)};
        }
      }
    }
  }
  else {  // Dealing with a normal "river-ish" extra with cardinal connect keys and same type of outlet codes:
    if (tile_has_extra(ptile, extra)
        || (clone_extra != false && tile_has_extra(ptile, clone_extra))) {
      var river_str = "";
      for (var i = 0; i < num_cardinal_tileset_dirs; i++) {
        var dir = cardinal_tileset_dirs[i];
        var checktile = mapstep(ptile, dir);
        if (checktile
            && (
              (tile_has_extra(checktile, extra) /*|| (clone_extra != false && tile_has_extra(checktile, clone_extra))*/ // should be caught by the integrates we put in
              )
            || (is_ocean_tile(checktile) && abort_outlets !==true)
            || tile_has_extra(checktile, integrate_extras[0])
            || tile_has_extra(checktile, integrate_extras[1])
            || tile_has_extra(checktile, integrate_extras[2])
            || tile_has_extra(checktile, integrate_extras[3]) )  ) {
          river_str = river_str + dir_get_tileset_name(dir) + "1";
        } else {
          river_str = river_str + dir_get_tileset_name(dir) + "0";
        }
      }
      return {"key" : prefix + "_s_" + river_str};
    }

    var pterrain = tile_terrain(ptile);
    if (pterrain['graphic_str'] == "coast") {
      for (var i = 0; i < num_cardinal_tileset_dirs; i++) {
        var dir = cardinal_tileset_dirs[i];
        var checktile = mapstep(ptile, dir);
        if (checktile != null && (tile_has_extra(checktile, extra) || tile_has_extra(checktile, extra2)) ) {
          return {"key" : prefix + "_outlet_" + dir_get_tileset_name(dir)};
        }
      }
    }
  }

  return null;
}

/****************************************************************************
 ...
****************************************************************************/
function get_unit_image_sprite(punit)
{
  var from_type = get_unit_type_image_sprite(unit_type(punit));

  /* TODO: Find out what the purpose of this is, if it is needed here and if
   * it is needed in get_unit_type_image_sprite() too. It was the only
   * difference from get_unit_type_image_sprite() before
   * get_unit_image_sprite() started to use it. It was added in
   * f4a3ef358d1462d1f0ef7529982c417ddc402583 but that commit is to huge for
   * me to figure out what it does. */
  if (from_type != null && from_type["height"] != null)
    from_type["height"] = from_type["height"] - 2;

  return from_type;
}


/****************************************************************************
 ...
****************************************************************************/
function get_unit_type_image_sprite(punittype)
{
  var tag = tileset_unit_type_graphic_tag(punittype);

  if (tag == null) {
    return null;
  }

  var tileset_x = tileset[tag][0];
  var tileset_y = tileset[tag][1];
  var width = tileset[tag][2];
  var height = tileset[tag][3];
  var i = tileset[tag][4];
  return {"tag": tag,
            "image-src" : "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
            "tileset-x" : tileset_x,
            "tileset-y" : tileset_y,
            "width" : width,
            "height" : height
            };
}

/****************************************************************************
 ...
****************************************************************************/
function get_improvement_image_sprite(pimprovement)
{
  var tag = tileset_building_graphic_tag(pimprovement);

  if (tag == null) {
    return null;
  }

  var tileset_x = tileset[tag][0];
  var tileset_y = tileset[tag][1];
  var width = tileset[tag][2];
  var height = tileset[tag][3];
  var i = tileset[tag][4];
  return {"tag": tag,
            "image-src" : "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
            "tileset-x" : tileset_x,
            "tileset-y" : tileset_y,
            "width" : width,
            "height" : height
            };
}

/****************************************************************************
 ...
****************************************************************************/
function get_specialist_image_sprite(tag)
{
  if (tileset[tag] == null) return null;

  var tileset_x = tileset[tag][0];
  var tileset_y = tileset[tag][1];
  var width = tileset[tag][2];
  var height = tileset[tag][3];
  var i = tileset[tag][4];
  return {"tag": tag,
            "image-src" : "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
            "tileset-x" : tileset_x,
            "tileset-y" : tileset_y,
            "width" : width,
            "height" : height
            };
}


/****************************************************************************
 ...
****************************************************************************/
function get_technology_image_sprite(ptech)
{
  var tag = tileset_tech_graphic_tag(ptech);

  if (tag == null) return null;

  var tileset_x = tileset[tag][0];
  var tileset_y = tileset[tag][1];
  var width = tileset[tag][2];
  var height = tileset[tag][3];
  var i = tileset[tag][4];
  return {"tag": tag,
            "image-src" : "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
            "tileset-x" : tileset_x,
            "tileset-y" : tileset_y,
            "width" : width,
            "height" : height
            };
}

/****************************************************************************
 ...
****************************************************************************/
function get_nation_flag_sprite(pnation)
{
  var tag = "f." + pnation['graphic_str'];

  if (tileset[tag] == null) return null;

  var tileset_x = tileset[tag][0];
  var tileset_y = tileset[tag][1];
  var width = tileset[tag][2];
  var height = tileset[tag][3];
  var i = tileset[tag][4];
  return {"tag": tag,
            "image-src" : "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
            "tileset-x" : tileset_x,
            "tileset-y" : tileset_y,
            "width" : width,
            "height" : height
            };
}

/****************************************************************************
 ...
****************************************************************************/
function get_treaty_agree_thumb_up()
{
  var tag = "treaty.agree_thumb_up";

  var tileset_x = tileset[tag][0];
  var tileset_y = tileset[tag][1];
  var width = tileset[tag][2];
  var height = tileset[tag][3];
  var i = tileset[tag][4];
  return {"tag": tag,
            "image-src" : "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
            "tileset-x" : tileset_x,
            "tileset-y" : tileset_y,
            "width" : width,
            "height" : height
            };
}

/****************************************************************************
 ...
****************************************************************************/
function get_treaty_disagree_thumb_down()
{
  var tag = "treaty.disagree_thumb_down";

  var tileset_x = tileset[tag][0];
  var tileset_y = tileset[tag][1];
  var width = tileset[tag][2];
  var height = tileset[tag][3];
  var i = tileset[tag][4];
  return {"tag": tag,
            "image-src" : "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
            "tileset-x" : tileset_x,
            "tileset-y" : tileset_y,
            "width" : width,
            "height" : height
            };
}


/****************************************************************************
  Returns a list of tiles to draw to render roads and railroads.
  TODO: add support for road and railroad on same tile.
****************************************************************************/
function fill_road_rail_sprite_array(ptile, pcity)
{
  var hwy = client_rules_flag[CRF_EXTRA_HIGHWAY] ? tile_has_extra(ptile, EXTRA_HIGHWAY) : false;
  var road = tile_has_extra(ptile, EXTRA_ROAD) || hwy;
  var rail = tile_has_extra(ptile, EXTRA_RAIL);
  // Road/river types ruleset may or may not have:
  const MAGLEV_active = (typeof EXTRA_MAGLEV !== "undefined");
  const CANAL_active =  (typeof EXTRA_CANAL !== "undefined");
  const WATERWAY_active = (typeof EXTRA_WATERWAY !== "undefined");
  const QUAY_active = (typeof EXTRA_QUAY !== "undefined");
  const QUAY2_active = (typeof EXTRA_QUAY2 !== "undefined");
  const SEABRIDGE_active = (typeof EXTRA_SEABRIDGE !== "undefined");
  const WALLS_active = (typeof EXTRA_WALLS !== "undefined");
  const HWY_active = (typeof EXTRA_HIGHWAY !== "undefined");

  if (MAGLEV_active) {
    var maglev = tile_has_extra(ptile, EXTRA_MAGLEV);
  }
  if (SEABRIDGE_active) {
    var seabridge = tile_has_extra(ptile, EXTRA_SEABRIDGE)
  }
  if (WALLS_active) {
    var walls = tile_has_extra(ptile, EXTRA_WALLS)
  }
  if (HWY_active) {
    var hwy = tile_has_extra(ptile, EXTRA_HIGHWAY);
  }

  var road_near = [];
  var rail_near = [];
  var maglev_near = [];
  var draw_rail = [];
  var draw_road = [];
  var draw_maglev = [];

  var result_sprites = [];

  var draw_single_road = road == true && pcity == null && rail == false;
  var draw_single_rail = rail && pcity == null && maglev == false;
  var draw_single_maglev = maglev == true && pcity == null;

  for (var dir = 0; dir < 8; dir++) {
    /* Check if there is adjacent road/rail. */
    var tile1 = mapstep(ptile, dir);
    if (tile1 != null && tile_get_known(tile1) != TILE_UNKNOWN) {
      road_near[dir] = tile_has_extra(tile1, EXTRA_ROAD);

      // Highways are exactly roads, just a different graphic:
      if (HWY_active) {
        road_near[dir] |=  tile_has_extra(tile1, EXTRA_HIGHWAY);
      }

      // Quays integrate with roads "one-way", so we draw the road on the tile that
      // has it but not the quay tile, showing the road going TOWARD the quay.
      if (QUAY_active) {
        road_near[dir] |= tile_has_extra(tile1, EXTRA_QUAY);
        if (QUAY2_active) {
          road_near[dir] |= tile_has_extra(tile1, EXTRA_QUAY2);
        }
      }

      rail_near[dir] = tile_has_extra(tile1, EXTRA_RAIL);

      // Sea Bridges integrate with roads, so the road-tile itself will draw a road
      // up to the bridge, IFF it's cardinally connected to that bridge.
      if (SEABRIDGE_active) {
        if (cardinal_tileset_dirs.includes(dir)) {  // only cardinal tiles are valid road-connectors
          road_near[dir] |= tile_has_extra(tile1, EXTRA_SEABRIDGE);
        }
        // For non-cardinal adjacent sea-bridges, we also want rails to not show, but
        // rails go on top so we catch it contrarily here:
        else {  // non-cardinal (diagonally adjacent) tiles don't connect rails if EITHER has a sea bridge
          if (seabridge || tile_has_extra(tile1, EXTRA_SEABRIDGE)) rail_near[dir] = false; // absolute override
        }
      }
      if (MAGLEV_active) maglev_near[dir] = tile_has_extra(tile1, EXTRA_MAGLEV);

      /* Draw rail/road/maglev if this tile connects to the adjacent tile. But don't
       * draw road/rail if there is also a rail/maglev connection. */
      if (MAGLEV_active) {
        draw_maglev[dir] = maglev && maglev_near[dir];
        draw_rail[dir] = rail && rail_near[dir] && !draw_maglev[dir];
        draw_road[dir] = road && road_near[dir] && !draw_rail[dir] && !draw_maglev[dir];

        draw_single_maglev &= !draw_maglev[dir];
        draw_single_rail &= !draw_maglev[dir] && !draw_rail[dir];
        draw_single_road &= !draw_maglev[dir] && !draw_rail[dir] && !draw_road[dir];
      } else { /* Same as above for rules with no EXTRA_MAGLEV:  Draw rail/road if
        * this tile connects to adjacent tile; but don't draw road if there is a rail */
       draw_rail[dir] = rail && rail_near[dir];
       draw_road[dir] = road && road_near[dir] && !draw_rail[dir];

       draw_single_rail &= !draw_rail[dir];
       draw_single_road &= !draw_rail[dir] && !draw_road[dir];
      }
    }
  }
    /* With roadstyle 0, we simply draw one road/rail for every connection.
     * This means we only need a few sprites, but a lot of drawing is
     * necessary and it generally doesn't look very good. */
    var i;

    /* Do roads first, under river-like sprites. */
    if (road) {
      for (i = 0; i < 8; i++) {
        if (draw_road[i]) {
          let rtype = hwy ? "hwy" : "road";
          /* if we make a different graphic for bridges just uncommennt this et voilà!
          if (tile_has_river(ptile)
              || (CANAL_active  && tile_has_extra(ptile, EXTRA_CANAL))
              || (WATERWAY_active && tile_has_extra(ptile, EXTRA_WATERWAY))) {
                rtype = "bridge";
              }*/
          result_sprites.push({"key" : "road."+rtype+"_" + dir_get_tileset_name(i)});
	      }
      }
    }

    /// Rivers, canals, waterways are next.
    var river_sprite = get_tile_river_like_sprite(ptile, EXTRA_RIVER, "road.river");
    var canal_sprite = null;
    var seabridge_sprite = null;
    var walls_sprite = null;
    if (CANAL_active) {
      canal_sprite = get_tile_river_like_sprite(ptile, EXTRA_CANAL, "road.canal");
    }
    if (!canal_sprite && WATERWAY_active) {
      canal_sprite = get_tile_river_like_sprite(ptile, EXTRA_WATERWAY, "road.canal");
    }
    if (SEABRIDGE_active) {
      seabridge_sprite = get_tile_river_like_sprite(ptile, EXTRA_SEABRIDGE, "road.sea_bridge")
    }
    if (WALLS_active && walls) {
      walls_sprite = get_tile_river_like_sprite(ptile, EXTRA_WALLS, "road.wall", true /*aborts sea outlets*/)
    }

    if (river_sprite != null) result_sprites.push(river_sprite);
    if (canal_sprite != null) result_sprites.push(canal_sprite);
    if (seabridge_sprite != null) result_sprites.push(seabridge_sprite);

    /* Draw rails over rivers and roads. */
    if (rail) {
      for (i = 0; i < 8; i++) {
        if (draw_rail[i]) {
	      result_sprites.push({"key" : "road.rail_" + dir_get_tileset_name(i)});
        }
      }
    }

    /* TODO: this is ready to uncomment if bridge graphics are available.
    // Bridges go over rails and rivers
    if (road && (river_sprite || canal_sprite)) {
      for (i = 0; i < 8; i++) {
        if (draw_road[i]) {
	        result_sprites.push({"key" : "road.bridge_" + dir_get_tileset_name(i)});
        }
      }
    } */

    /* MagLevs go on top of all roads, rivers, canals. */
    if (MAGLEV_active) {
      if (maglev) {
        for (i = 0; i < 8; i++) {
          if (draw_maglev[i]) {
          result_sprites.push({"key" : "road.maglev_" + dir_get_tileset_name(i)});
          }
        }
      }
    }

  /* Draw isolated rail/road/maglev separately (styles 0 and 1 only). */
  if (draw_single_rail) {
      result_sprites.push({"key" : "road.rail_isolated"});
  } else if (draw_single_road) {
      let rtype = hwy ? "hwy" : "road";
      result_sprites.push({"key" : "road."+rtype+"_isolated"});
  } else if (MAGLEV_active) {
      if (draw_single_maglev) {
        result_sprites.push({"key" : "road.maglev_isolated"});
      }
  }

  /* Walls go on top of everything */
  if (walls_sprite != null) result_sprites.push(walls_sprite);

  return result_sprites;
}

/****************************************************************************
  ...
****************************************************************************/
function fill_irrigation_sprite_array(ptile, pcity)
{
  var result_sprites = [];

  /* We don't draw the irrigation if there's a city (it just gets overdrawn
   * anyway, and ends up looking bad). */
  if (tile_has_extra(ptile, EXTRA_IRRIGATION) && pcity == null) {
    if (tile_has_extra(ptile, EXTRA_FARMLAND)) {
      result_sprites.push({"key" :
                            tileset_extra_id_graphic_tag(EXTRA_FARMLAND)});
    } else {
      result_sprites.push({"key" :
                            tileset_extra_id_graphic_tag(EXTRA_IRRIGATION)});
    }
  }

  return result_sprites;
}

/****************************************************************************
  ...
****************************************************************************/
function fill_layer1_sprite_array(ptile, pcity)
{
  var result_sprites = [];

  /* We don't draw the bases if there's a city */
  if (pcity == null) {
    if (typeof EXTRA_NAVALBASE !== 'undefined')  {
      if (tile_has_extra(ptile, EXTRA_NAVALBASE)) {
        // draw river outlets to make connective channel exits to other nearby water
        var river_sprite = get_tile_river_like_sprite(ptile, EXTRA_NAVALBASE, "road.river");
        if (river_sprite != null) result_sprites.push(river_sprite);

        result_sprites.push({"key" : "base.navalbase_bg",
                              "offset_y" : -normal_tile_height / 2});
        return result_sprites;
      }
    }
    // bunker hides everything under it, but is drawn in other layer since it's _mg
    if (typeof EXTRA_BUNKER !== 'undefined')  {
      if (tile_has_extra(ptile, EXTRA_BUNKER)) {
        return result_sprites;
      }
    }
    // show in top-down order and return early, to not show hidden foundational
    // based underneath:
    if (typeof EXTRA_CASTLE !== 'undefined') {
      if (tile_has_extra(ptile, EXTRA_CASTLE)) {
        result_sprites.push({"key" : "base.castle_bg",
                           "offset_y" : -normal_tile_height / 2});
        return result_sprites;
      }
    }
    if (tile_has_extra(ptile, EXTRA_FORTRESS)) {
      result_sprites.push({"key" : "base.fortress_bg",
                           "offset_y" : -normal_tile_height / 2});
    }
    // We can only draw the Fort if there's not a Naval Base or Fortress (which hide it):
    // But we also have to check if it's defined because some rulesets don't define it
    else if (typeof EXTRA_FORT !== 'undefined')  {
      if (tile_has_extra(ptile, EXTRA_FORT)) {
        result_sprites.push({"key" : "base.outpost_bg",
                             "offset_y" : -normal_tile_height / 2});
      }
    }
  }
  return result_sprites;
}

/****************************************************************************
  ...
****************************************************************************/
function fill_layer2_sprite_array(ptile, pcity)
{
  var result_sprites = [];

  /* We don't draw the bases if there's a city */
  if (pcity == null) {
    if (typeof EXTRA_BUNKER !== 'undefined' && tile_has_extra(ptile, EXTRA_BUNKER)) {
      result_sprites.push({"key" : "base.bunker_mg",
                           "offset_y" : -normal_tile_height / 2});
      //result_sprites.push(get_base_flag_sprite(ptile));   //uncomment to show base flag on bunkers.
      return result_sprites; // hides all others under it
    }
    if (tile_has_extra(ptile, EXTRA_AIRBASE)) {
      result_sprites.push({"key" : "base.airbase_mg",
                           "offset_y" : -normal_tile_height / 2});
    }
    else if (tile_has_extra(ptile, EXTRA_BUOY))  {
      result_sprites.push(get_base_flag_sprite(ptile));
      result_sprites.push({"key" : "base.buoy_mg",
                           "offset_y" : -normal_tile_height / 2});
    } else if (typeof EXTRA_FISHTRAP !== 'undefined' && tile_has_extra(ptile, EXTRA_FISHTRAP)) {
      result_sprites.push({"key" : "ts.fishtrap",
                           "offset_y" : 0});
    }
    if (typeof EXTRA_TILE_CLAIM !== 'undefined' && tile_has_extra(ptile, EXTRA_TILE_CLAIM)) {
      result_sprites.push({"key" : "base.tileclaim_mg",
                           "offset_y" : -normal_tile_height / 2});
      result_sprites.push(get_base_flag_sprite(ptile));
    }
    if (tile_has_extra(ptile, EXTRA_FORTRESS)
             || (typeof EXTRA_NAVALBASE !== 'undefined'
             && tile_has_extra(ptile, EXTRA_NAVALBASE)))
    {
      result_sprites.push(get_base_flag_sprite(ptile));
    }
    if (tile_has_extra(ptile, EXTRA_RUINS)) {
      result_sprites.push({"key" : "extra.ruins_mg",
                           "offset_y" : -normal_tile_height / 2});
    }
    if (typeof EXTRA_RADAR !== 'undefined')  {
      if (tile_has_extra(ptile, EXTRA_RADAR)) {
        result_sprites.push({"key" : "base.radar_mg",
                            "offset_y" : -normal_tile_height / 2});
      }
    }
    if (typeof EXTRA_QUAY !== 'undefined')  {
      if (tile_has_extra(ptile, EXTRA_QUAY)) {
        result_sprites.push({"key" : "base.quay_mg",
                            "offset_y" : -normal_tile_height / 2});
      }
    }
    if (typeof EXTRA_WATCHTOWER !== 'undefined' && tile_has_extra(ptile, EXTRA_WATCHTOWER)) {
      result_sprites.push({"key" : "base.tower_mg",
                           "offset_y" : -normal_tile_height / 2});
    }
  }

  return result_sprites;
}

/****************************************************************************
  Foreground layer of walled bases
...st_unit is unit shown on top of stack (if any)
****************************************************************************/
function fill_layer3_sprite_array(ptile, stacked, st_unit)
{
  var result_sprites = [];

  // bunker hides everything under it, but is drawn in other layer since it's _mg
  if (typeof EXTRA_BUNKER !== 'undefined')  {
    if (tile_has_extra(ptile, EXTRA_BUNKER)) {
      return result_sprites;
    }
  }
  // castle on top of fortress, have to check for it first then return
  if (typeof EXTRA_CASTLE !== 'undefined')  {
    if (tile_has_extra(ptile, EXTRA_CASTLE)) {
    result_sprites.push({"key" : "base.castle_fg",
                          "offset_y" : -normal_tile_height / 2});
    if (stacked)
      result_sprites.push(fill_stacked_in_base_sprite_array(st_unit, stacked));
    return result_sprites;
    }
  }
  // fortress on top of fort, have to check for it first then return
  if (tile_has_extra(ptile, EXTRA_FORTRESS)) {
    result_sprites.push({"key" : "base.fortress_fg",
                          "offset_y" : -normal_tile_height / 2});
    if (stacked)
      result_sprites.push(fill_stacked_in_base_sprite_array(st_unit, stacked));
    return result_sprites;
  }
  // navalbase on top of fort, have to check for it first then return
  if (typeof EXTRA_NAVALBASE !== 'undefined')  {
    if (tile_has_extra(ptile, EXTRA_NAVALBASE)) {
      result_sprites.push({"key" : "base.navalbase_fg",
                            "offset_y" : -normal_tile_height / 2});
      if (stacked)
        result_sprites.push(fill_stacked_in_base_sprite_array(st_unit, stacked));
      return result_sprites;
    }
  }
  // We can only draw the Fort if there's no Fortress or Naval Base
  if (typeof EXTRA_FORT !== 'undefined')  {
    if (tile_has_extra(ptile, EXTRA_FORT)) {
      result_sprites.push({"key" : "base.outpost_fg",
                          "offset_y" : -normal_tile_height / 2});
      if (stacked)
        result_sprites.push(fill_stacked_in_base_sprite_array(st_unit, stacked));
      return result_sprites;
    }
  }

  return result_sprites; // returns empty array
}

/**************************************************************************
 Insert unit_type into the UO_ offset arrays for optimized tile positioning
 of the unit and its auxiliary icon graphics (vet, nation, etc.)
 'i' is the index of the unit_type
 ...
 This could eventually be loaded once from a single file.
**************************************************************************/
function insert_utype_into_offset_arrays(i)
{
    var ptype = unit_types[i];
    // **WARNING for all y values: positive moves up, negative moves down
    var dx = unit_offset_adj_x;  // this is a base value to allow adjusting all unit offsets
    var dy = unit_offset_adj_y;
    var sx = 0, sy = 0;       // custom shield placement
    var vx = 0,  vy = 0;      // custom vet badge placement
    var mx = -10, my = -19;   // a "starting base value" for position of multi-unit
                              // (stacked "+") sprite. Some units will change this.

    // This section allows custom offset adjustments for any particular unit. This helps with the
    // fact a 64x48 sprite can occupy parts of an area larger than the 96x48 tile area, and the fact
    // that sprites have distinct shapes and sizes.

    switch(ptype['name']) {
      case "AEGIS Cruiser":
          dx -= 2;  dy -= 7;
          vx -= 11; vy += 8;
          mx -= 6; my += 7;
          break;
      case "Alpine Troops":
          dx -= 3; dy -= 1;
          vx -= 4; vy -= 4;
          break;
      case "Archer":
          dx += 1;
          vx -= 8; vy -= 8;
          break;
      case "Armor":
          dx -= 3; dy -= 6;
          vx += 17; vy -= 14;
          break;
      case "Armor II":
          vx += 11; vy += 4;
          break;
      case "Artillery":
          dx -= 12;
          vx += 8; vy -= 8;
          break;
      case "AWACS":
          dx -= 17; dy += 3;
          mx -= 7; my += 6;
          sx = 8;
          break;
      case "Battleship":
          dx -= 5; dy -= 7;
          vx += 4; vy -= 11;
          //mx -= 6; my += 7;
          break;
      case "Cannon":
          vx += 1; vy -= 4;
          break;
      case "Caravan":
          dx -= 0; dy -= 3;
          break;
      case "Caravel":
          dx -= 3; dy -= 3;
          vx += 3; vy -= 3;
          break;
      case "Cargo Plane":
          dy -= 1;
          sx = 8;
          break;
      case "Carrier":
          dx -= 3; dy -= 4;
          vx -= 12; vy +=12;
          mx -= 10; my +=7;
          break;
      case "Cargo Ship":
          dx -= 1; dy -= 2;
          mx -= 6; my += 7;
          break;
      case "Catapult":
          vx -= 14; vy += 15;
          dx +=2; dy -= 2;
          break;
      case "Cavalry":
          vx += 5; vy -= 16;
          dx += 4; dy -= 3;
          break;
      case "Chariot":
          sx = 8;
          dx -= 2; dy -= 3;
          vx -= 11; vy += 4;
          mx -= 6;  my += 7;
          break;
      case "Cruiser":
          vx -= 13; vy += 15;
          break;
      case "Cruise Missile":
          dx -= 8; dy -= 7;
          vx -= 23; vy += 15;
          break;
      case "Crusaders":
          vx -= 3; vy -= 12;
          break;
      case "Destroyer":
          dx -= 3; dy -= 3;
          vx -= 13; vy += 12;
          break;
      case "Diplomat":
          dx += 1; dy -= 2;
          break;
      case "Dive Bomber":
          sx = 8;
          dx -= 11; dy -= 1;
          vx -= 3; vy -= 4;
          mx += 2; my -= 2;
          break;
      case "Dragoons":
          dx -= 3; dy -= 4;
          vx -= 48; vy -= 16;
          break;
      case "Engineers":
          dx -= 3; dy -= 4;
          break;
      case "Elephants":
          vx += 8; vy -= 9;
          dx -= 6; dy -= 7;
          break;
      case "Escort Fighter":
          sx = 8;
          dx -= 8; dy -= 4;
          vx += 2; vy += 2;
          mx -= 6; my += 4;
          break;
      case "Explorer":
          dx -= 3; dy -= 5;
          break;
      case "Falconeers":
          dx += 2; dy += 2;
          vx += 3; vy -= 5;
          break;
      case "Fighter":
          sx = 8;
          dx -= 11; dy -= 6;
          vx -= 14; vy += 10;
          break;
      case "Founders":
          dx -= 6; dy -= 1;
          break;
      case "Frigate":
          vx += 3;  vy += 2;
          break;
      case "Galley":
          vx -= 12; vy += 14;
          break;
      case "Ground Strike Fighter":
          sx = 8;
          dx += 2; dy -= 1;
          vx -= 4; vy += 15;
          mx -= 6; my += 7;
          break;
      case "Ground Troops":
          dy += 2;
          vx -= 3; vy -= 7;
        break;
      case "Heavy Bomber":
            case "Bomber":
          sx = 8;
          dx += 2; dy += 2;
          vx -= 13; vy += 12;
          mx -= 6; my += 5;
          break;
      case "Helicopter":
          sx = 8;
          vx += 5; vy -= 5;
          mx -= 6; my += 7;
          break;
      case "Horsemen":
          dx -= 3; dy -= 3;
          vx -= 47; vy -= 16;
          break;
      case "Howitzer":
          dx -= 9;  dy += 1;
          vx -= 43; vy -= 9;
          break;
      case "Ironclad":
          dx -= 4; dy -= 5;
          vx += 5; vy += 2
          break;
      case "Jet Bomber":
          sx = 8;
          dx -= 24; dy += 7;
          vx += 11; vy += 1;
          mx += 3;  my -= 3;
          break;
      case "Jet Fighter":
          dx += 2; dy += 3;
          vx += 9; vy += 16;
          break;
      case "Knights":
          dx += 3; dy -= 3;
          vx += 9; vy += 4;
          break;
      case "Legion":
          vx += 1; vy -= 8;
          break;
      case "Light Armor":
          dx -= 1; dy -= 7
          vx += 11; vy -= 11;
          break;
      case "Marines":
          dx += 2; dy += 2;
          vx -= 11; vy -= 13;
          break;
      case "Mechanized Infantry":
      case "Mech. Inf.":
          vx -= 23; vy += 13;
          break;
      case "Medium Bomber":
          sx = 8;
          dx += 5; dy += 2;
          vx += 7; vy += 18;
          break;
      case "Missile Destroyer":
          dx -= 3; dy -= 3;
          vx -= 12; vy += 11;
          break;
      case "Missile Submarine":
          dx -= 2; dy -= 6;
          vx -= 12; vy += 5;
          break;
      case "Magnum Turret":
          dx -= 16; dy -= 2;
          vx += 8; vy -= 14;
          break;
      case "Musketeers":
          dx += 1; dy -= 4;
          vx += 1; vy -= 19;
          break;
      case "Phalanx":
          dx += 0; dy -= 3;
          vx +=2; vy -= 8;
          break;
      case "Paratroopers":
          vy -= 7;
          break;
      case "Pikemen":
          dx += 1; dy -= 4;
          vx -= 1; vy -= 7;
          break;
      case "Riflemen":
          dx -= 4; dy -= 2;
          vx -= 9; vy -= 4;
          break;
      case "Ram Ship":
          vx -= 1; vy -= 1;
          break;
      case "Scout":
          dx -= 2; dy -= 3;
          break;
      case "Settlers":
          dx -= 3; dy -= 2;
          break;
      case "Siege Ram":
          dx -= 2; dy -= 4;
          vx += 3; vy += 2;
          break;
      case "Spy Plane":
          sx = 8;
          dx -= 27; dy += 0;
          mx -= 4;  my -= 6;
          break;
      case "Stealth Bomber":
          dx -= 31; dy -= 4;
          vx -= 45; vy += 4;
          mx -= 2;  my -= 1;
          break;
      case "Stealth Fighter":
          dx -= 2; dy -= 1;
          vx += 4; vy -= 14;
          break;
      case "Strategic Bomber":
          sx = 8;
          dx -= 3; dy += 4;
          vx -= 13; vy += 15;
          mx -= 2;  my -= 1;
          break;
      case "Submarine":
          dx -= 3; dy -= 4;
          vx -= 11; vy += 8;
          break;
      case "Train":
          dx += 5; dy -= 8;
          break;
      case "Transport":
          dx -= 3; dy -= 1;
          vx -= 23; vy += 12;
          break;
      case "Transport Helicopter":
          vx -= 24; vy += 15;
          break;
      case "Trawler":
          dx -= 13; dy += 6;
          mx -= 6; my += 7;
          break;
      case "Trireme":
          vx += 2; vy += 1;
          break;
      case "Tribesmen":
          dx += 2;
          break;
      case "Wagon":
          dx -= 9; dy -= 5;
          mx -= 7; my -= 3;
          break;
      case "War Galley":
          vx -= 4; vy += 3;
          break;
      case "Warriors":
          dx -= 3; dy -= 2;
          vx -= 2; vy -= 2;
          break;
      case "Zeppelin":
          sx = -13; sy = 5;
          dx -= 19; dy += 4;
          vx += 11; vy -= 5;
          mx += 3;  my -= 3;
          break;
    }
    // Adjustment to standard + location:
    if (mx==-10 && my==-19) {
      mx -= 5; my += 6;
    }

    // Put above information into the UO unit offset arrays for units and their icon components:
    UO_dx[i] = dx + unit_offset_x;
    UO_dy[i] = dy + unit_offset_y;
    UO_sx[i] = sx; UO_sy[i] = sy;
    UO_vx[i] = vx; UO_vy[i] = vy;
    UO_mx[i] = mx; UO_my[i] = my;

}
