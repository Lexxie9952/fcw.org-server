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

var border_anim = 0;
const border_anim_delay = 750;  // frames
var mapview_canvas_ctx = null;
var mapview_canvas = null;
var buffer_canvas_ctx = null;
var buffer_canvas = null;
var city_canvas_ctx = null;
var city_canvas = null;

var city_map_display_mode = 0;
const CMDM_SIZE           = 0;   // size of city
const CMDM_FINISHED       = 1;   // when output is finished
const CMDM_BUY_COST       = 2;   // cost to buy item
const CMDM_GROWS          = 3;   // turns to city growth
const CMDM_SHIELDS        = 4;   // surplus shields
const CMDM_POLLUTION      = 5;   // pollution
// KEEP THIS PENULTIMATE, ONE BEFORE CMDM_LAST:
const CMDM_CORRUPTION     = 6;   // corruption
const CMDM_LAST           = 7;   // marks end of city_map_display_mode enum

const SOURCE_WAYPOINT     = 1;
const DEST_WAYPOINT       = 2;

var tileset_images = [];
var sprites = {};
var loaded_images = 0;

var sprites_init = false;

var canvas_text_font = "16px Candara, sans serif"; // with canvas text support

var fullfog = [];

var GOTO_DIR_DX = [0, 1, 2, -1, 1, -2, -1, 0];
var GOTO_DIR_DY = [-2, -1, 0, -1, 1, 0, 1, 2];
var dashedSupport = false;

// [0] line-edge borders, [1] main thick line, [2] tile way points, [3] inner way-point dot
var goto_colors_active = ["0,10,40,1","30,208,255,1","2,26,45,1","197,243,255,1"];       // active goto path
var goto_colors_info   = ["40,10,0,.91","255,208,30,.91","45,26,2,.91","255,243,197,.91"]; // tile/unit info
var goto_colors_road   = ["40,10,0,.91","168,84,15,.91","65,18,2,.91","255,213,167,.91"];    // connect road
var goto_colors_irr    = ["0,40,10,1","128,208,84,1","25,45,15,1","150,255,123,1"];    // connect irrigation
var goto_colors_canal  = ["198,198,198,1","46,80,248,1","0,0,71,1","198,198,198,1"];        // connect canal
var goto_colors_mine   = ["144,111,57,1","20,15,9,1","125,125,95,1","182,182,156,1"];        // connect mine
var goto_colors_pillage= ["254,252,6,1","253,75,1,1","0,0,0,1","255,117,0,1"];            // connect pillage

var goto_colors_rally = {
                      1: ["0,40,10,1","230,240,230,1","0,54,10,1","143,255,155,1"],  // temporary rally path
                      2: ["40,0,10,1","240,230,230,1","54,0,10,1","255,143,155,1"]};// persistent rally path

var goto_colors_patrol = ["0,10,40,1","30,108,255,1","2,14,45,1","197,209,255,1"];            // patrol path

/**************************************************************************
  Cycles through city map display modes for citybar when user presses
  ctrl-shift-c
**************************************************************************/
function mapview_cycle_city_display_mode()
{
  var last = CMDM_LAST;  // indicates time to cycle back to first display mode

  // Former code that shows an example of how we can filter the custom user info column in cities list.
  //if (client_rules_flag[CRF_DEMOCRACY_NONCORRUPT]
  //    && !client_is_observer()
  //    && governments[players[client.conn.playing.playerno].government].name == "Democracy") {
  //      last--;
  //}

  city_map_display_mode++;

  if (city_map_display_mode >= last)
    city_map_display_mode = 0;

  switch (city_map_display_mode) {
    case CMDM_SIZE:
      add_client_message("Showing city population.");
      break;
    case CMDM_FINISHED:
      add_client_message("Showing turns to completion.");
      break;
    case CMDM_BUY_COST:
      add_client_message("Showing buy cost.");
      break;
    case CMDM_GROWS:
      add_client_message("Showing city growth turns.");
      break;
    case CMDM_SHIELDS:
      add_client_message("Showing city production surplus.");
      break;
    case CMDM_POLLUTION:
      add_client_message("Showing city pollution probability.");
      break;
    case CMDM_CORRUPTION:
      add_client_message("Showing city corruption.");
      break;
  }
}

/**************************************************************************
  ...
**************************************************************************/
function init_mapview()
{

  $("#canvas_div").append($('<canvas/>', { id: 'canvas'}));

  /* Loads the two tileset definition files */
  $.ajax({
    url: "/javascript/2dcanvas/tileset_config_amplio2.js",
    dataType: "script",
    async: false
  }).fail(function() {
    console.error("Unable to load tileset config.");
  });

  $.ajax({
    url: "/javascript/2dcanvas/tileset_spec_amplio2.js",
    dataType: "script",
    async: false
  }).fail(function() {
    console.error("Unable to load tileset spec. Run Freeciv-img-extract.");
  });

  mapview_canvas = document.getElementById('canvas');
  mapview_canvas_ctx = mapview_canvas.getContext("2d");
  buffer_canvas = document.createElement('canvas');
  buffer_canvas_ctx = buffer_canvas.getContext('2d');

  if ("imageSmoothingEnabled" in mapview_canvas_ctx) {
    // if this Boolean value is false, images won't be smoothed when scaled. This property is true by default.
    mapview_canvas_ctx.imageSmoothingEnabled = false;
  }
  dashedSupport = ("setLineDash" in mapview_canvas_ctx);

  setup_window_size();

  mapview['gui_x0'] = 0;
  mapview['gui_y0'] = 0;



  /* Initialize fog array. */
  var i;
  for (i = 0; i < 81; i++) {
    /* Unknown, fog, known. */
    var ids = ['u', 'f', 'k'];
    var buf = "t.fog";
    var values = [];
    var j, k = i;

    for (j = 0; j < 4; j++) {
	  values[j] = k % 3;
	  k = Math.floor(k / 3);

      buf += "_" + ids[values[j]];

    }

    fullfog[i] = buf;
  }

  if (is_small_screen()) MAPVIEW_REFRESH_INTERVAL = 12;

  orientation_changed();
  init_sprites();
  requestAnimationFrame(update_map_canvas_check, mapview_canvas);

}


/**************************************************************************
  ...subtituted for below for possibly better minification performance
*************************************************************************
function is_small_screen()
{
  if ($(window).width() <= 640 || $(window).height() <= 590) {
    return true;
  } else {
    return false;
  }
}*/

/**************************************************************************
  Detects "medium" screens like 1366x768, which need css fitting
  adjustments. WARNING:  may also return true for small screens!
**************************************************************************/
const not_large_screen = () => { // helps figure out a medium screen like 1376 x 768
    if ($(window).width() <= 1400 || $(window).height() <= 768) {
      return true;
    }
}
/**************************************************************************
  Detect "small" screens e.g., mobile phones.
**************************************************************************/
const is_small_screen = () => {
  if ($(window).width() <= 640 || $(window).height() <= 590) {
    return true;
  } else {
    return false;
  }
}
/**************************************************************************
  This will load the tileset, blocking the UI while loading.
**************************************************************************/
function init_sprites()
{
  $.blockUI({ message: "<h1 style='text-align:center'><font color='#ccc'>Loading...</font>"
	  + "<br><center><img src='/images/loading.gif'></center></h1>",
      color: default_dialog_text_color });

  if (loaded_images != tileset_image_count) {
    for (var i = 0; i < tileset_image_count; i++) {
      var tileset_image = new Image();
      tileset_image.onload = preload_check;
      tileset_image.src = '/tileset/freeciv-web-tileset-'
                          + tileset_name + '-' + i + get_tileset_file_extention() + '?ts=' + ts;
      tileset_images[i] = tileset_image;
    }
  } else {
    // already loaded
    if (renderer == RENDERER_WEBGL) {
      webgl_preload();
    } else {
      $.unblockUI();
    }
  }
}

/**************************************************************************
  Determines when the whole tileset has been preloaded.
**************************************************************************/
function preload_check()
{
  loaded_images += 1;

  if (loaded_images == tileset_image_count) {
    init_cache_sprites();

    if (renderer == RENDERER_WEBGL) {
      webgl_preload();
    } else {
      $.unblockUI();
    }

  }
}

/**************************************************************************
  ...
**************************************************************************/
function init_cache_sprites()
{
 try {

  if (typeof tileset === 'undefined') {
    swal("Tileset not generated correctly. Run sync.sh in "
          + "freeciv-img-extract and recompile.");
    setSwalTheme();
    return;
  }

  for (var tile_tag in tileset) {
    var x = tileset[tile_tag][0];
    var y = tileset[tile_tag][1];
    var w = tileset[tile_tag][2];
    var h = tileset[tile_tag][3];
    var i = tileset[tile_tag][4];

    var newCanvas = document.createElement('canvas');
    newCanvas.height = h;
    newCanvas.width = w;
    var newCtx = newCanvas.getContext('2d');

    newCtx.drawImage(tileset_images[i], x, y,
                       w, h, 0, 0, w, h);
    sprites[tile_tag] = newCanvas;

  }

  sprites_init = true;
  tileset_images[0] = null;
  tileset_images[1] = null;
  tileset_images = null;

 }  catch(e) {
  console.log("Problem caching sprite: " + tile_tag);
 }

}

/**************************************************************************
  ...
**************************************************************************/
function mapview_window_resized ()
{
  // prevent the glitch: window resizing caused scrolling up the chatbox
  chatbox_scroll_to_bottom(false);

  if (active_city != null || !resize_enabled) return;
  setup_window_size();
  if (renderer == RENDERER_2DCANVAS) update_map_canvas_full();
}

/**************************************************************************
  ...
**************************************************************************/
function drawPath(ctx, x1, y1, x2, y2, x3, y3, x4, y4)
{
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.lineTo(x1, y1);
}

/**************************************************************************
  ...
**************************************************************************/
function mapview_put_tile(pcanvas, tag, canvas_x, canvas_y) {
  if (sprites[tag] == null) {
    //console.log("Missing sprite " + tag);
    return;
  }

  pcanvas.drawImage(sprites[tag], canvas_x, canvas_y);
}



/**************************************************************************
  same as mapview_put_tile but scales the image drawn
**************************************************************************/
function mapview_put_scaled_image(pcanvas, tag, canvas_x, canvas_y, scale)
{
  if (sprites[tag] == null) {
    //console.log("Missing sprite " + tag);
    return;
  }

  pcanvas.drawImage(sprites[tag], canvas_x, canvas_y, sprites[tag].width * scale, sprites[tag].height * scale);
}

/****************************************************************************
  Draw a filled-in colored rectangle onto the mapview or citydialog canvas.
****************************************************************************/
function canvas_put_rectangle(canvas_context, pcolor, canvas_x, canvas_y, width, height)
{
  canvas_context.fillStyle = pcolor;
  canvas_context.fillRect (canvas_x, canvas_y, canvas_x + width, canvas_y + height);

}

/****************************************************************************
  Draw a colored rectangle onto the mapview.
****************************************************************************/
function canvas_put_select_rectangle(canvas_context, canvas_x, canvas_y, width, height)
{
  canvas_context.beginPath();
  canvas_context.strokeStyle = "rgb(255,0,0)";
  canvas_context.rect(canvas_x, canvas_y, width, height);
  canvas_context.stroke();

}


/**************************************************************************
  Gives mapview_put_city_bar() the number and colour it will put in the
  citybar, according to user selected city_map_display_mode.
**************************************************************************/
function mapview_get_citybar_num_and_color(city_id)
{
  var num = "";
  var col = "rgba(255,255,255,1)";
  const pcity = cities[city_id];

  switch (city_map_display_mode) {
    // size of city
    case CMDM_SIZE:
      num = pcity['size'];
      break;
    // turns to finish production
    case CMDM_FINISHED:
      num = get_city_production_time(pcity);
      if (num===undefined || num>999) num = "";
      else if (num==1) {
        num = "%E2%9C%94"; // checkmark, completing!
        if (pcity['buy_cost']) { // still has shields though, show diff. color
          col = "rgb(96,255,255)";
        }
      }
      else col = "rgb(96,255,255)";
      break;
    case CMDM_BUY_COST:
      if (pcity['buy_cost'] !== undefined) {
        num = pcity['buy_cost'];
        if (num===0) {
          num = "%E2%9C%94"; // checkmark, no shields left at all
        }
        else col = "rgb(255,213,44)";   // match civclient.css .gold_text
      }
      break;
    // turns to grow
    case CMDM_GROWS:
      if (pcity.hasOwnProperty('granary_turns')) {
        num = pcity['granary_turns'];
        if (num>999) num = "";
        else if (num===0) {
          num = "--";
          col = "rgb(196,196,196)";
        }
        else if (num>0) col = "rgb(128,255,128)";
        else if (num<0) {
          col = "rgb(255,131,0)";   // starving !
          if (num==-1) num += " ** %E2%9A%A0"  // starving in one turn !!
        }
      }
      break;
    // surplus shield output
    case CMDM_SHIELDS:
      if (pcity.hasOwnProperty('surplus')) {
        num = pcity['surplus'][O_SHIELD];
        if (num>0) num = "+" + num;
        else if (num===0) {
          num = "-";  // no surplus = grey "-"
          col = "rgb(128,128,128)";
        } else { // negative upkeep WARNING!!
          num += " %E2%9A%A0";   //warning symbol
          col = "rgb(255,128,128)";
        }
      }
      break;
    case CMDM_POLLUTION:
      if (pcity['pollution']) {
        num = pcity['pollution'];
        if (num<1) num = "";
        else {
          col = "rgb(170,119,51)";
        }
      }
      break;
    case CMDM_CORRUPTION:
      if (pcity.hasOwnProperty('waste')) {
        num = pcity['waste'][O_TRADE];
        if (num<1) num = "";
        else {
          col = "rgb(255,128,102)";
        }
      }
      break;
  }

  return {"num":num, "col":col};
}
/**************************************************************************
  Draw city text onto the canvas.
**************************************************************************/
function mapview_put_city_bar(pcanvas, city, canvas_x, canvas_y) {

  var airlift_text = "";   // City Airlift Counter
  const SRC_UNLIMITED = 4;   // bit value for SRC_UNLIMITED airliftingstyle
  const DEST_UNLIMITED = 8;  // bit value for DEST_UNLIMITED airliftingstyle
  const infinity_symbol = "%E2%88%9E";
  const left_div = "%E2%9D%AC";   // unicode <> dividers
  const right_div = "%E2%9D%AD";
  const bullet = "%E2%88%99";     // bullet
  var mood_text = "";      // City mood
  var size_color;
  var size_shadow_color = "rgba(0, 0, 0, 1)"; // default black
  const peace = "%E2%98%AE ";
  const celeb = "%E2%9C%A8 ";  // %F0%9F%A5%82 champagne, "%F0%9F%8E%89 " party popper
  const disorder = "%E2%9C%8A ";
  const lose_celeb_color = "rgba(0,0,0,1)";
  const start_celeb_color = "rgb(128,255,128)";
  var start_celeb = false;
  var lose_celeb = 0;  // uses 0,1 instead of false,true to also adjust inverted shadows to look better.

  // City mood:
  if (draw_city_mood) {
    if (client.conn.playing != null && !client_is_observer()) {
      if (city['owner'] == client.conn.playing.playerno && city['ppl_happy'] != null && city['ppl_content'] != null && city['ppl_unhappy'] != null) {
        var city_state = get_city_state(city);
        happy_people   = city['ppl_happy'][FEELING_FINAL];
        content_people = city['ppl_content'][FEELING_FINAL];
        unhappy_angry_people = city['ppl_unhappy'][FEELING_FINAL] + city['ppl_angry'][FEELING_FINAL];

        switch (city_state) {
          case "Peace":
            mood_text = peace;
            break;
          case "Disorder":
            mood_text = disorder;
            break;
          case "Celebrating":
            mood_text = celeb;
            break;
        }
        if (happy_people >= city['size']*0.4999 && unhappy_angry_people==0 && city['size']>=city_celebrate_size(city))  {
          // case handling: city is going to celebrate next turn.
          if (mood_text == peace) start_celeb = true;
        }
        else if (unhappy_angry_people > happy_people) { // case: city going into disorder
          if (mood_text == celeb) { // if losing celebration, invert size color and size shadow
            size_shadow_color = "rgba(128,128,128,1)";
            size_color = lose_celeb_color;
            lose_celeb = 1;
          }
        }
        else { // case handling: city will go into peace next turn
          if (mood_text == celeb) { // if losing celebration, invert size color and size shadow
            size_shadow_color = "rgba(128,128,128,1)";
            size_color = lose_celeb_color;
            lose_celeb = 1;
          }
          else if (mood_text == peace) {
            mood_text = ""; // simplify: peace now+later = blank
          }
        }
      }
    }
  }

  // Airlift Counter
  if (draw_city_airlift_counter) {
    // source capacity = airlift counter (unless SRC_UNLIMITED==true, in which case it's infinite)
    var src_capacity = (game_info['airlifting_style'] & SRC_UNLIMITED) ? infinity_symbol : city['airlift'];
    if (src_capacity<0) src_capacity = 0;

    if (client.conn.playing != null && !client_is_observer()) {
      if (city['owner'] == client.conn.playing.playerno) {
        if (game_info['airlift_dest_divisor'] == 0) { // if no dest_divisor, there is one counter for both source and dest
          // show source airlifts if it has them, otherwise keep the label blank:
          airlift_text = ( city['airlift']>0 ? " "+left_div+src_capacity+right_div : "");
        } else if (city_has_building(city, improvement_id_by_name(B_AIRPORT_NAME))) {
          // We get here if city has airport && airliftdestdivsor > 0. This means destination-airlifts has a separate counter
          var airlift_receive_text;
          var airlift_receive_max_capacity = Math.round(city['size'] / game_info['airlift_dest_divisor']);

          if (game_info['airlifting_style'] & DEST_UNLIMITED) airlift_receive_text = infinity_symbol;
          // else destination airlifts allowed = population of city / airliftdivisor, rounded to nearest whole number:
          else airlift_receive_text = Math.max(0,city["airlift"] + airlift_receive_max_capacity - effects[1][0]['effect_value']);

          airlift_text = (city['airlift']>0  ||  airlift_receive_text==infinity_symbol  || src_capacity==infinity_symbol || airlift_receive_text != "0")
                          ? " "+left_div + src_capacity + bullet + airlift_receive_text + right_div
                          : " "+left_div + bullet + right_div ;
        }
      }
    }
  }

  var cityname = show_citybar < 2 ? city['name'] : "";
  var text = decodeURIComponent(cityname + airlift_text).toUpperCase();
  if (replace_capital_i) text = text.replace(/I/gi, "|");  // option to fix midget capital I for some bad sans-serif fonts
  var citybarinfo = mapview_get_citybar_num_and_color(city['id']);
  // "size" is now alternatively other things, based on which city_map_display_mode we're in:
  var size = decodeURIComponent(mood_text + citybarinfo['num'] /*city['size']*/ );
  if (!lose_celeb) size_color = citybarinfo['col']; // colour indicates city_map_display_mode
  var color = nations[city_owner(city)['nation']]['color'];
  var prod_type = get_city_production_type(city);

  var txt_measure = pcanvas.measureText(text);

  var size_measure = pcanvas.measureText(size);
  pcanvas.globalAlpha = 0.72;
  pcanvas.fillStyle = "rgba(0, 0, 0, 0.40)";
  pcanvas.fillRect (canvas_x - Math.floor(txt_measure.width / 2) - 14, canvas_y - 17,
                    txt_measure.width + 20, 20);


  pcanvas.fillStyle = color;
  pcanvas.fillRect(canvas_x + Math.floor(txt_measure.width / 2) + 5, canvas_y - 17,
               (prod_type != null) ? size_measure.width + 35 : size_measure.width + 8, 20);

  var city_flag = get_city_flag_sprite(city);
  pcanvas.globalAlpha = 0.77;
  pcanvas.drawImage(sprites[city_flag['key']],
              canvas_x - Math.floor(txt_measure.width / 2) - 44, canvas_y - 17);

  pcanvas.drawImage(sprites[get_city_occupied_sprite(city)],
              canvas_x - Math.floor(txt_measure.width / 2) - 12, canvas_y - 16);
/*
  pcanvas.strokeStyle = color;
  pcanvas.lineWidth = 1;
  pcanvas.beginPath();
  pcanvas.moveTo(canvas_x - Math.floor(txt_measure.width / 2) - 47, canvas_y - 18);
  pcanvas.lineTo(canvas_x + Math.floor(txt_measure.width / 2) + size_measure.width + 14,
                 canvas_y - 18);
  pcanvas.moveTo(canvas_x + Math.floor(txt_measure.width / 2) + size_measure.width + 14,
                 canvas_y + 4);
  pcanvas.lineTo(canvas_x - Math.floor(txt_measure.width / 2) - 47, canvas_y + 4);
  pcanvas.lineTo(canvas_x - Math.floor(txt_measure.width / 2) - 47, canvas_y - 18);
  pcanvas.moveTo(canvas_x - Math.floor(txt_measure.width / 2) - 15, canvas_y - 17);
  pcanvas.lineTo(canvas_x - Math.floor(txt_measure.width / 2) - 15, canvas_y + 3);
  pcanvas.stroke();
*/
  pcanvas.globalAlpha = 1.0;

  if (prod_type != null) {
    var tag = tileset_ruleset_entity_tag_str_or_alt(prod_type,
                                                    "unit or building");
    if (tag == null) return;
    pcanvas.drawImage(sprites[tag],
              canvas_x + Math.floor(txt_measure.width / 2) + size_measure.width + 13,
              canvas_y - 17, 27, 20);
  }

  var shadow_offset_fix = (lose_celeb || city_map_display_mode) ? 1 : 0; //shadow offsets of 2 only look good under white
  // shadow text
  pcanvas.fillStyle = "rgba(40, 40, 40, 1)";
  pcanvas.fillText(text, canvas_x - Math.floor(txt_measure.width / 2)     , canvas_y + 1);
  pcanvas.fillStyle = size_shadow_color; // "rgba(0, 0, 0, 1)";
  pcanvas.fillText(size, canvas_x + Math.floor(txt_measure.width / 2) + 10 - shadow_offset_fix, canvas_y + 1 - shadow_offset_fix);

  // text on top of shadows
  pcanvas.fillStyle = "rgba(255, 255, 255, 1)";
  pcanvas.fillText(text, canvas_x - Math.floor(txt_measure.width / 2) - 2, canvas_y - 1);
  pcanvas.fillStyle = size_color;
  pcanvas.fillText(size, canvas_x + Math.floor(txt_measure.width / 2) + 8, canvas_y - 1);

  if (start_celeb) {
    mood_text = decodeURIComponent(mood_text); // only do when needed - performance
    pcanvas.fillStyle = start_celeb_color;
    pcanvas.fillText(mood_text, canvas_x + Math.floor(txt_measure.width / 2) + 8, canvas_y - 1);
  }
}

/**************************************************************************
  Draw tile label onto the canvas.
**************************************************************************/
function mapview_put_tile_label(pcanvas, tile, canvas_x, canvas_y) {
  var text = tile['label'];
  if (text != null && text.length > 0) {
    var txt_measure = pcanvas.measureText(text);

    pcanvas.fillStyle = "rgba(255, 255, 255, 1)";
    pcanvas.fillText(text, canvas_x + normal_tile_width / 2 - Math.floor(txt_measure.width / 2), canvas_y - 1);
  }
}

/**************************************************************************
  Renders the national border lines onto the canvas.
  DEPRECATED BECAUSE CPU LOAD WAS TOO HEAVY
***************************************************************************
function mapview_put_grid_line(pcanvas, dir, color, canvas_x, canvas_y) {
  var x = canvas_x + 47;
  var y = canvas_y + 3;
  pcanvas.strokeStyle = color;
  mapview_canvas_ctx.lineWidth = 2;
  mapview_canvas_ctx.lineDashOffset = 0;
  mapview_canvas_ctx.setLineDash([4,4]);

  pcanvas.beginPath();

  if (dir == DIR8_NORTH) {
    pcanvas.moveTo(x, y - 2, x + (tileset_tile_width / 2));
    pcanvas.lineTo(x + (tileset_tile_width / 2),  y + (tileset_tile_height / 2) - 2);
  } else if (dir == DIR8_EAST) {
    pcanvas.moveTo(x - 3, y + tileset_tile_height - 3);
    pcanvas.lineTo(x + (tileset_tile_width / 2) - 3,  y + (tileset_tile_height / 2) - 3);
  } else if (dir == DIR8_SOUTH) {
    pcanvas.moveTo(x - (tileset_tile_width / 2) + 3, y + (tileset_tile_height / 2) - 3);
    pcanvas.lineTo(x + 3,  y + tileset_tile_height - 3);
  } else if (dir == DIR8_WEST) {
    pcanvas.moveTo(x - (tileset_tile_width / 2) + 3, y + (tileset_tile_height / 2) - 3);
    pcanvas.lineTo(x + 3,  y - 3);
  }
  pcanvas.closePath();
  pcanvas.stroke();
}
*/

/**************************************************************************
  Renders the national border lines onto the canvas.
**************************************************************************/
function mapview_put_border_line(pcanvas, dir, color, color2, color3, canvas_x, canvas_y) {
  if (draw_border_mode & 2) return;  // 2 is flag not to draw.
  var x = canvas_x + 47;
  var y = canvas_y + 3;

  const ddb = draw_dashed_borders;
  const dtc = draw_tertiary_colors;
  const dtb = draw_thick_borders;

  mapview_canvas_ctx.lineWidth = dtb ? 3 : 2;
  mapview_canvas_ctx.lineCap = 'butt';
  pcanvas.beginPath();

  if (ddb) {
    mapview_canvas_ctx.setLineDash([4,4]);
    switch (minimap_color) {
      case 2: pcanvas.strokeStyle = color2; break;
      case 3: pcanvas.strokeStyle = color3; break;
      default: pcanvas.strokeStyle = color;
    }
  }
  else {
    mapview_canvas_ctx.setLineDash([]);
    pcanvas.strokeStyle = dtc ? color3 : color;
  }

  if (draw_moving_borders) {
    border_anim ++;
    mapview_canvas_ctx.lineDashOffset = Math.trunc(border_anim/border_anim_delay);
    if (border_anim>24*border_anim_delay)
      border_anim=0;
  }

  switch (dir) {
    case DIR8_NORTH:
      //primary
      pcanvas.moveTo(x, y - 2, x + (tileset_tile_width / 2));
      pcanvas.lineTo(x + (tileset_tile_width / 2),  y + (tileset_tile_height / 2) - 2);
      pcanvas.stroke();
      if (ddb) break;
      //secondary
      pcanvas.strokeStyle = color2;
      mapview_canvas_ctx.setLineDash([6,6]);
      pcanvas.moveTo(x, y - 2, x + (tileset_tile_width / 2));
      pcanvas.lineTo(x + (tileset_tile_width / 2),  y + (tileset_tile_height / 2) - 2);
      pcanvas.stroke();
      if (!dtc) break;
      //tertiary
      pcanvas.strokeStyle = color;
      mapview_canvas_ctx.setLineDash([6,18]);
      pcanvas.moveTo(x, y - 2, x + (tileset_tile_width / 2));
      pcanvas.lineTo(x + (tileset_tile_width / 2),  y + (tileset_tile_height / 2) - 2);
      pcanvas.stroke();
      break;
    case DIR8_EAST:
      //primary
      pcanvas.moveTo(x - 3, y + tileset_tile_height - 3);
      pcanvas.lineTo(x + (tileset_tile_width / 2) - 3,  y + (tileset_tile_height / 2) - 3);
      pcanvas.stroke();
      if (ddb) break;
      //secondary
      pcanvas.strokeStyle = color2;
      mapview_canvas_ctx.setLineDash([6,6]);
      pcanvas.moveTo(x - 3, y + tileset_tile_height - 3);
      pcanvas.lineTo(x + (tileset_tile_width / 2) - 3,  y + (tileset_tile_height / 2) - 3);
      pcanvas.stroke();
      if (!dtc) break;
      //tertiary
      pcanvas.strokeStyle = color;
      mapview_canvas_ctx.setLineDash([6,18]);
      pcanvas.moveTo(x - 3, y + tileset_tile_height - 3);
      pcanvas.lineTo(x + (tileset_tile_width / 2) - 3,  y + (tileset_tile_height / 2) - 3);
      pcanvas.stroke();
      break;
    case DIR8_SOUTH:
      //primary
      pcanvas.moveTo(x - (tileset_tile_width / 2) + 3, y + (tileset_tile_height / 2) - 3);
      pcanvas.lineTo(x + 3,  y + tileset_tile_height - 3);
      pcanvas.stroke();
      if (ddb) break;
      //secondary
      pcanvas.strokeStyle = color2;
      mapview_canvas_ctx.setLineDash([6,6]);
      pcanvas.moveTo(x - (tileset_tile_width / 2) + 3, y + (tileset_tile_height / 2) - 3);
      pcanvas.lineTo(x + 3,  y + tileset_tile_height - 3);
      pcanvas.stroke();
      if (!dtc) break;
      //tertiary
      pcanvas.strokeStyle = color;
      mapview_canvas_ctx.setLineDash([6,18]);
      pcanvas.moveTo(x - (tileset_tile_width / 2) + 3, y + (tileset_tile_height / 2) - 3);
      pcanvas.lineTo(x + 3,  y + tileset_tile_height - 3);
      pcanvas.stroke();
      break;
    case DIR8_WEST:
      //primary
      pcanvas.moveTo(x - (tileset_tile_width / 2) + 3, y + (tileset_tile_height / 2) - 3);
      pcanvas.lineTo(x + 3,  y - 3);
      pcanvas.stroke();
      if (ddb) break;
      //secondary
      pcanvas.strokeStyle = color2;
      mapview_canvas_ctx.setLineDash([6,6]);
      pcanvas.moveTo(x - (tileset_tile_width / 2) + 3, y + (tileset_tile_height / 2) - 3);
      pcanvas.lineTo(x + 3,  y - 3);
      pcanvas.stroke();
      if (!dtc) break;
      //tertiary
      pcanvas.strokeStyle = color;
      mapview_canvas_ctx.setLineDash([6,18]);
      pcanvas.moveTo(x - (tileset_tile_width / 2) + 3, y + (tileset_tile_height / 2) - 3);
      pcanvas.lineTo(x + 3,  y - 3);
      pcanvas.stroke();
      break;
  }
}

/**************************************************************************
  Fills the national territoy colors on the canvas.
**************************************************************************/
function mapview_territory_fill(pcanvas, color, canvas_x, canvas_y) {
  var x = canvas_x + 47;
  var y = canvas_y + 25;

  pcanvas.beginPath();
  pcanvas.fillStyle = color;

  pcanvas.moveTo(x,  y + (tileset_tile_height / 2));
  pcanvas.lineTo(x - (tileset_tile_width / 2),  y);
  pcanvas.lineTo(x,  y - (tileset_tile_height / 2));
  pcanvas.lineTo(x + (tileset_tile_width / 2),  y);
  pcanvas.lineTo(x,  y + (tileset_tile_height / 2));

  pcanvas.closePath();
  pcanvas.fill();
}


/**************************************************************************
...Draws GOTO lines, RALLY lines, existing GOTO orders, and CONNECT
activities (road/irrigate). mark_new_turn is whether the goto path
ends/begins a turn on that tile, which lets us know to whether to draw
a normal tile dot or a turn boundary waypoint marker
**************************************************************************/
function mapview_put_goto_line(pcanvas, dir, canvas_x, canvas_y, tile_index)
{
  var x0 = canvas_x + (tileset_tile_width / 2);
  var y0 = canvas_y + (tileset_tile_height / 2);
  var x1 = x0 + GOTO_DIR_DX[dir] * (tileset_tile_width / 2);
  var y1 = y0 + GOTO_DIR_DY[dir] * (tileset_tile_height / 2);

  var mark_new_turn = goto_way_points[tile_index];
  var last_turn_marker = goto_way_points[goto_from_tile[tile_index]];
  // Use colours according to active goto or tile/unit info
  var colors = goto_active ? goto_colors_active : goto_colors_info;
  if (connect_active) {
    if (connect_extra==EXTRA_ROAD) colors = goto_colors_road;
    else if (connect_extra==EXTRA_IRRIGATION) colors=goto_colors_irr;
    else if (client_rules_flag[CRF_CANALS] && connect_extra==EXTRA_CANAL) {
      colors=goto_colors_canal;
    }
    else if (connect_activity == ACTIVITY_PILLAGE) colors = goto_colors_pillage;
    else if (connect_extra == EXTRA_MINE) colors=goto_colors_mine;
  } else if (rally_active) {
    colors = goto_colors_rally[rally_active];
  } else if (patrol_mode) {
    colors = goto_colors_patrol;
  }

  // Line edges
  pcanvas.strokeStyle = 'rgba('+colors[0]+')';
  pcanvas.lineWidth = 8;
  pcanvas.lineCap = "round";
  pcanvas.beginPath();
  pcanvas.moveTo(x0, y0);
  pcanvas.lineTo(x1, y1);
  pcanvas.stroke();
  // Main cyan line
  pcanvas.strokeStyle = 'rgba('+colors[1]+')';
  pcanvas.lineWidth = 6;
  pcanvas.beginPath();
  pcanvas.moveTo(x0, y0);
  pcanvas.lineTo(x1, y1);
  pcanvas.stroke();

  /* Waypoint circles - each segment draws 2 tile-waypoint circles, one on source and one on dest. Source overdraws the last dest and dest
    will get overdrawn by the next source (exception of start-path and end-path points.) But we do not want to color both waypoint circles
    with an indicator for a new turn, only the one tile where it happens. */

  // Source waypoint circle
  if ((mark_new_turn & SOURCE_WAYPOINT) || last_turn_marker & DEST_WAYPOINT) {
    pcanvas.lineWidth = 17;
    pcanvas.strokeStyle = 'rgba(225,47,0)';
  } else {
    pcanvas.lineWidth = 12;
    pcanvas.strokeStyle = 'rgba('+colors[2]+')';
  }
  pcanvas.beginPath();
  pcanvas.moveTo(x0, y0);
  //Chrome 116 no longer allows drawing points with zero length line, so use .01 length:
  pcanvas.lineTo(x0, y0+.01);
  pcanvas.stroke();

 // Dest waypoint circle
 if (mark_new_turn & DEST_WAYPOINT) {
    pcanvas.lineWidth = 17;
    pcanvas.strokeStyle = 'rgba(225,47,0)';
  } else {
    pcanvas.lineWidth = 12;
    pcanvas.strokeStyle = 'rgba('+colors[2]+')';
  }
  pcanvas.beginPath();
  pcanvas.moveTo(x1, y1);
  //Chrome 116 no longer allows drawing points with zero length line, so use .01 length:
  pcanvas.lineTo(x1, y1+.01);
  pcanvas.stroke();

  // Waypoint inner dots
  pcanvas.lineWidth = 4;
  pcanvas.strokeStyle = 'rgba('+colors[3]+')';
  pcanvas.lineCap = "square";
  pcanvas.beginPath();
  pcanvas.moveTo(x0, y0);
  //Chrome 116 no longer allows drawing points with zero length line, so use .01 length:
  pcanvas.lineTo(x0, y0+.01);
  pcanvas.stroke();
  pcanvas.beginPath();
  pcanvas.moveTo(x1, y1);
  //Chrome 116 no longer allows drawing points with zero length line, so use .01 length:
  pcanvas.lineTo(x1, y1+.01);
  pcanvas.stroke();
}

/**************************************************************************
  Hide compass temporarily if clicked (convenience measure)
**************************************************************************/
function compass_click()
{
  $("#compass").hide();
}

/**************************************************************************
  ...
**************************************************************************/
function set_city_mapview_active()
{
  city_canvas = document.getElementById('city_canvas');
  if (city_canvas == null) return;
  city_canvas_ctx = city_canvas.getContext('2d');
  city_canvas_ctx.font = canvas_text_font;

  mapview_canvas_ctx = city_canvas.getContext("2d");

  mapview['width'] = citydlg_map_width;
  mapview['height'] = citydlg_map_height;
  mapview['store_width'] = citydlg_map_width;
  mapview['store_height'] = citydlg_map_height;

  set_default_mapview_inactive();
}

/**************************************************************************
  ...
**************************************************************************/
function set_default_mapview_inactive()
{
  $("#compass").hide();

  if (overview_active) $("#game_overview_panel").parent().hide();
  if (unitpanel_active) $("#game_unit_panel").parent().hide();
  if (chatbox_active) {
    $("#game_chatbox_panel").parent().hide();
    $(".mobile_chatbox_dialog").hide();
    $("#dialog-extend-fixed-container").hide();
  }
  //mapview_active = false;
}


/**************************************************************************
  ...
**************************************************************************/
function set_default_mapview_active()
{
  //mapview_active = true;
  //update_map_canvas_check(); // immediately refresh stale map and restart the interval to redraw map

  $("#warcalc_tab").hide();  // hide Odds tab

  if (show_compass) $("#compass").show();
  else $("#compass").hide();

  if (renderer == RENDERER_2DCANVAS) {
    mapview_canvas_ctx = mapview_canvas.getContext("2d");
    mapview_canvas_ctx.font = canvas_text_font;
  }

  var active_tab = $('#tabs').tabs('option', 'active');
  if (active_tab == TAB_CITIES) { // cities dialog is active
    return;
  }

  // Minimized windows (diplomacy windows)
  $("#dialog-extend-fixed-container").show();

  if (!is_small_screen() && overview_active) {
    $("#game_overview_panel").parent().show();
    $(".overview_dialog").position({my: 'left bottom', at: 'left bottom', of: window, within: $("#tabs-map")});
    if (overview_current_state == "minimized") $("#game_overview_panel").dialogExtend("minimize");
  }

  if (unitpanel_active) {
    update_game_unit_panel();
  }

  if (chatbox_active) {
    $("#game_chatbox_panel").parent().show();
    $(".mobile_chatbox_dialog").show();
    if (current_message_dialog_state == "minimized") $("#game_chatbox_panel").dialogExtend("minimize");
  }

  $("#tabs").tabs("option", "active", 0);
  $("#tabs-map").height("auto");

  tech_dialog_active = false;
  allow_right_click = false;
  keyboard_input = true;

  chatbox_scroll_to_bottom(false);
}

/**************************************************************************
 Initializes mapview sliding. This is done by rendering the area to scroll
 across to a new canvas (buffer_canvas), and clip a region of this
 buffer_canvas to the mapview canvas so it looks like scrolling.
**************************************************************************/
function enable_mapview_slide(ptile)
{
  var r = map_to_gui_pos(ptile['x'], ptile['y']);
  var gui_x = r['gui_dx'];
  var gui_y = r['gui_dy'];

  gui_x -= (mapview['width'] - tileset_tile_width) >> 1;
  gui_y -= (mapview['height'] - tileset_tile_height) >> 1;

  var dx = gui_x - mapview['gui_x0'];
  var dy = gui_y - mapview['gui_y0'];
  mapview_slide['dx'] = dx;
  mapview_slide['dy'] = dy;
  mapview_slide['i'] = mapview_slide['max'];
  mapview_slide['start'] = new Date().getTime();

  if ((dx == 0 && dy == 0) || mapview_slide['active']
      || Math.abs(dx) > mapview['width'] || Math.abs(dy) > mapview['height']) {
    // sliding across map edge: don't slide, just go there directly.
    mapview_slide['active'] = false;
    update_map_canvas_full();
    return;
  }

  mapview_slide['active'] = true;

  var new_width = mapview['width'] + Math.abs(dx);
  var new_height = mapview['height'] + Math.abs(dy);
  var old_width = mapview['store_width'];
  var old_height = mapview['store_height'];

  mapview_canvas = buffer_canvas;
  mapview_canvas_ctx = buffer_canvas_ctx;

  if (dx >= 0 && dy <= 0) {
    mapview['gui_y0'] -= Math.abs(dy);
  } else if (dx <= 0 && dy >= 0) {
    mapview['gui_x0'] -= Math.abs(dx);
  }  else if (dx <= 0 && dy <= 0) {
    mapview['gui_x0'] -= Math.abs(dx);
    mapview['gui_y0'] -= Math.abs(dy);
  }

  mapview['store_width'] = new_width;
  mapview['store_height'] = new_height;
  mapview['width'] = new_width;
  mapview['height'] = new_height;

  /* redraw mapview on large back buffer. */
  if (dx >= 0 && dy >= 0) {
    update_map_canvas(old_width, 0, dx, new_height);
    update_map_canvas(0, old_height, old_width, dy);
  } else if (dx <= 0 && dy <= 0) {
    update_map_canvas(0, 0, Math.abs(dx), new_height);
    update_map_canvas(Math.abs(dx), 0, old_width, Math.abs(dy));
  } else if (dx <= 0 && dy >= 0) {
    update_map_canvas(0, 0, Math.abs(dx), new_height);
    update_map_canvas(Math.abs(dx), old_height, old_width, Math.abs(dy));
  } else if (dx >= 0 && dy <= 0) {
    update_map_canvas(0, 0, new_width, Math.abs(dy));
    update_map_canvas(old_width, Math.abs(dy), Math.abs(dx), old_height);
  }

  /* restore default mapview. */
  mapview_canvas = document.getElementById('canvas');
  mapview_canvas_ctx = mapview_canvas.getContext("2d");

  if (dx >= 0 && dy >= 0) {
    buffer_canvas_ctx.drawImage(mapview_canvas, 0, 0, old_width, old_height, 0, 0, old_width, old_height);
  } else if (dx <= 0 && dy <= 0) {
    buffer_canvas_ctx.drawImage(mapview_canvas, 0, 0, old_width, old_height, Math.abs(dx), Math.abs(dy), old_width, old_height);
  } else if (dx <= 0 && dy >= 0) {
    buffer_canvas_ctx.drawImage(mapview_canvas, 0, 0, old_width, old_height, Math.abs(dx), 0, old_width, old_height);
  } else if (dx >= 0 && dy <= 0) {
    buffer_canvas_ctx.drawImage(mapview_canvas, 0, 0, old_width, old_height, 0, Math.abs(dy), old_width, old_height);
  }
  mapview['store_width'] = old_width;
  mapview['store_height'] = old_height;
  mapview['width'] = old_width;
  mapview['height'] = old_height;

}
