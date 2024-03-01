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

// Global so we can re-sort
var units_sorted_by_type = [];

var master_empire_checkbox;
var empire_checkbox_states= {};
var empire_show_hitpoints = false;
var empire_show_movesleft = false;
var empire_show_present_buildings = true;
var empire_show_absent_buildings = false;
var empire_show_wonders_only = false;

var empire_worklist_clipboard = [];

// User defined zoom levels for some tabs
var empire_bldg_tab_saved_mag  = 0; // 0= not user defined, computer decides
var empire_upkp_tab_saved_mag  = 0;
var empire_wklst_tab_saved_mag = 0;

var EMPIRE_UNIT_TYPE_MODE      = 0;
var EMPIRE_UNIT_HOMECITY_MODE  = 1;
var EMPIRE_UNIT_IN_CITY_MODE   = 2;
var EMPIRE_ECON_IMPROVEMENTS   = 3;
var EMPIRE_ECON_UPKEEP         = 4;
var EMPIRE_ECON_WORKLISTS      = 5;
var empire_mode = EMPIRE_UNIT_TYPE_MODE;

const SORT_NONE  = 0;
const SORT_HP    = 1;
const SORT_MOVES = 2;
const SORT_VET   = 3;
const DO_NO_SORT = -1;
var empire_sort_mode = SORT_NONE;

// which kinds of upkeep to show in Unit Home Cities
var empire_upkeep_show_food    = true;
var empire_upkeep_show_gold    = true;
var empire_upkeep_show_shields = true;
var empire_upkeep_show_free    = true;
var empire_upkeep_show_zero    = false;  // Default to not show zero-upkeep units


empire_screen_updater = new EventAggregator(update_empire_screen, 250, EventAggregator.DP_NONE, 250, 3, 250);

/**************************************************************************
 Updates the Empire tab when clicked. Does basic common setup, then based
 on what empire_mode the player is in, calls the appropriate function
 to display that mode and populate the tables.
**************************************************************************/
function update_empire_screen()
{
  if (observing || freeze) return;

  // Do all the setup of width, buttons in top panel for switching mode,
  // then call a separate function based on what mode we're in

  // start at default width
  $('#empire_scroll').css("width", "100%");

  // -------------------------------------------------------------------
  // Carefully set up display mode controls:  wide, reduced standard, tiny:
  var wide_screen = $(window).width()<1340 ? false : true;
  var narrow_screen = $(window).width()<1000 ? true : false;
  var small_screen = is_small_screen();
  var landscape_screen = $(window).width() > $(window).height() ? true : false;
  var tiny_screen=false;
  var redux_screen=false;  // mid-size screen

  // narrow screen triggers tiny screen (becase we need width for city rows)
  // if small_screen and not landscape, that's also a tiny screen:
  if ( (small_screen) || (narrow_screen && !scroll_narrow_x)) {
    /* Exception: scroll_narrow_x is option for users wanting horiz-scroll for
     * more info. They get redux screen instead of tiny: */
    if (scroll_narrow_x) {
      tiny_screen = true; redux_screen=true; wide_screen = false;
      if (scroll_narrow_x && narrow_screen && !landscape_screen) $('#cities_scroll').css("width", "110%");
    } else {
      tiny_screen = true; redux_screen=false; wide_screen = false;
    }
  } else if (!wide_screen) {
      if (narrow_screen) {
        redux_screen=true; tiny_screen=true; wide_screen = false;
      }
      else {
        redux_screen=true; tiny_screen=false; wide_screen = false;
      }
  }
  /*  console.log("Wide:   "+wide_screen);
      console.log("Landscp:"+landscape_screen);
      console.log("Redux:  "+redux_screen);
      console.log("Small:  "+small_screen);
      console.log("Narrow: "+narrow_screen);
      console.log("Tiny:   "+tiny_screen);
      console.log("Scrollx:"+scroll_narrow_x); */

  switch (empire_mode) {
    case EMPIRE_UNIT_TYPE_MODE:
        empire_unittype_screen(wide_screen,narrow_screen,small_screen,landscape_screen,tiny_screen,redux_screen);
        break;
    case EMPIRE_UNIT_HOMECITY_MODE:
        empire_unit_homecity_screen(wide_screen,narrow_screen,small_screen,landscape_screen,tiny_screen,redux_screen);
        break;
    case EMPIRE_UNIT_IN_CITY_MODE:
        empire_unitcity_screen(wide_screen,narrow_screen,small_screen,landscape_screen,tiny_screen,redux_screen);
        break;
    case EMPIRE_ECON_IMPROVEMENTS:
        empire_econ_improvements_screen(wide_screen,narrow_screen,small_screen,landscape_screen,tiny_screen,redux_screen);
        break;
    case EMPIRE_ECON_UPKEEP:
        empire_econ_upkeep_screen(wide_screen,narrow_screen,small_screen,landscape_screen,tiny_screen,redux_screen);
        break;
    case EMPIRE_ECON_WORKLISTS:
        empire_econ_worklists_screen(wide_screen,narrow_screen,small_screen,landscape_screen,tiny_screen,redux_screen);
        break;
  }
}

/**************************************************************************
 Display Empire tab when it's in EMPIRE_UNIT_HOMECITY_MODE
**************************************************************************/
function empire_unit_homecity_screen(wide_screen,narrow_screen,small_screen,
  landscape_screen,tiny_screen,redux_screen)
{
  $("#empire_title").html("Unit Home Cites and Upkeep");
  if (small_screen) $("#empire_title").hide();
  else $("#empire_title").show();

  //$("#empire_static").css({"height":"100%", "width":"100%"})

  // Set up panel functions for National Units

  var panel_html = "<input id='show_hp' type='checkbox' class='css-checkbox' title='Show hit points' name='chHP' value='false' onclick='toggle_empire_show_hitpoints();'>"
  + "<label for='show_hp' name='show_hp_lbl' class='css-label dark-check-red'>HP</label>&ensp;"
  + "<input id='show_mp' type='checkbox' class='css-checkbox' title='Show movement points' name='chMP' value='false' onclick='toggle_empire_show_movepoints();'>"
  + "<label for='show_mp' name='show_mp_lbl' class='css-label dark-check-green'>Moves</label>";
  //var panel_html = "<input type='checkbox' id='show_hp' title='Show hit points' name='cbHP' value='false' onclick='toggle_empire_show_hitpoints();'>HP"
  //                + "<input type='checkbox' id='show_mp' title='Show movement points' name='cbMP' value='false' onclick='toggle_empire_show_movepoints();'>Moves";
  panel_html += "&nbsp;&nbsp;<button id='button_sorthp' type='button' class='button ui-button ui-corner-all ui-widget' onclick='empire_sort_hp();'"
              + "title='Sort units rows by Hitpoints' style='padding:5px; margin-bottom:2px;'>&#x2943HP</button>";
  panel_html += "<button id='button_sortmp' type='button' class='button ui-button ui-corner-all ui-widget' onclick='empire_sort_mp();'"
  + "title='Sort unit rows by Moves Left' style='padding:5px; margin-bottom:2px;'>&#x2943Moves</button>";
  panel_html += "<button id='button_sortvet' type='button' class='button ui-button ui-corner-all ui-widget' onclick='empire_sort_vet();'"
  + "title='Sort unit rows by Vet level' style='padding:5px; margin-bottom:2px;'>&#x2943Vet</button>";
  panel_html += "&nbsp;&nbsp;&nbsp;&nbsp; show upkeep: &nbsp;"
                  + "<input type='checkbox' class='css-checkbox' id='show_food' name='cbFU' value='false' onclick='toggle_empire_show_upkeep(\"food\");'>"
                  + "<label for='show_food' name='show_food_lbl' title='Show units with food upkeep' class='css-label dark-check-green'>Food</label>&ensp;"
                  + "<input type='checkbox' class='css-checkbox' id='show_gold' name='cbGU' value='false' onclick='toggle_empire_show_upkeep(\"gold\");'>"
                  + "<label for='show_gold' name='show_gold_lbl' title='Show units with gold upkeep' class='css-label dark-check-orange'>Gold</label>&ensp;"
                  + "<input type='checkbox' class='css-checkbox' id='show_shield' name='cbSU' value='false' onclick='toggle_empire_show_upkeep(\"shields\");'>"
                  + "<label for='show_shield' name='show_shield_lbl' title='Show units with shield upkeep' class='css-label dark-check-red'>Shield</label>&ensp;";
  panel_html += "<input type='checkbox' class='css-checkbox' id='show_free' name='cbFR' value='false' onclick='toggle_empire_show_upkeep(\"free\");'>"
                  + "<label for='show_free' name='show_free_lbl' title='Show units with upkeep cost who are receiving free bonus upkeep' class='css-label dark-check-white'>Free</label>&ensp;";
  panel_html += "<input type='checkbox' class='css-checkbox' id='show_zero' name='cbZR' value='false' onclick='toggle_empire_show_upkeep(\"zero\");'>"
                  + "<label for='show_zero' name='show_zero_lbl' title='Show unit types who never pay upkeep' class='css-label dark-check-cyan'>Zero</label>";
  panel_html += "<span style='margin-left: 90px;'>&nbsp;</span>"; // spacer
  panel_html += "<button id='button_hpy_rpt' type='button' class='button ui-button ui-corner-all ui-widget' onclick='empire_do_unit_unhappy_report();'"
  + "title='Show report on all aggressive units in the empire which anger citizens. (Hotkey: CTRL-U)' style='padding:5px; margin-bottom:2px;'>&#x270A;&#x1F3FD; National Units Impact Report &#x270A;&#x1F3FD;</button>";

  $("#empire_mode_panel").html(panel_html);
  $("#show_hp").prop("checked", empire_show_hitpoints);
  $("#show_mp").prop("checked", empire_show_movesleft);
  $("#show_food").prop("checked", empire_upkeep_show_food);
  $("#show_gold").prop("checked", empire_upkeep_show_gold);
  $("#show_shield").prop("checked", empire_upkeep_show_shields);
  $("#show_free").prop("checked", empire_upkeep_show_free);
  $("#show_zero").prop("checked", empire_upkeep_show_zero);


  $('#empire_scroll').css({"height": $(window).height()-160, "overflow-y":"scroll", "overflow-x":"hidden" });

  var sortList = [];
  var headers = $('#empire_table thead th');
  headers.filter('.tablesorter-headerAsc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 0]);
  });
  headers.filter('.tablesorter-headerDesc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 1]);
  });

  if (narrow_screen || tiny_screen) $("#empire_prompt").hide();
  else $("#empire_prompt").show();

  const updown_sort_arrows = "<img class='lowered_gov' src='data:image/gif;base64,R0lGODlhFQAJAIAAAP///////yH5BAEAAAEALAAAAAAVAAkAAAIXjI+AywnaYnhUMoqt3gZXPmVg94yJVQAAOw=='>";

  var empire_list_html = "";

  if (true /*wide_screen*/)  // fully standard deluxe wide-screen mode, include all info
  {
    empire_list_html = "<table class='tablesorter-dark' id='empire_table' style='border=0px;border-spacing=0;padding=0;'>"
        + "<thead id='empire_table_head'>"
        + "<tr>"  // City coulumn
        + "<th title='Sort alphabetically' style='text-align:right; font-size:93%;'><span style='white-space:nowrap'>Home City"+updown_sort_arrows+"</span></th>"
        // Upkeep columns
        + "<th id='food_upkeep'   class='food_upkeep_column'   title='Sort FOOD UPKEEP'   style='text-align:center; width:28px'><img style='margin-top:-3px;' class='lowered_gov' src='/images/wheat.png'></th>"
        + "<th id='gold_upkeep'   class='gold_upkeep_column'   title='Sort GOLD UPKEEP'   style='text-align:center; width:28px'><img class='lowered_gov' src='/images/gold.png'></th>"
        + "<th id='shield_upkeep' class='shield_upkeep_column' title='Sort SHIELD UPKEEP' style='text-align:center; width:28px'><img class='lowered_gov' src='/images/shield14x18.png'></th>"
        // Units column
        + "<th title='Home city units' style='padding-left:10px; font-size:93%;'>&nbsp;Units</th>"
        + "</tr>"
        + "</thead><tbody>";

  } else if (redux_screen) // semi-standard rendition of the above with minor trimming
  { // -1 column (selection box). Economised columns: Sort Arrows, Grows In>>Grows, Name of Production/Image >> Image only, Turns/Progress>>Progress
    //console.log("MODE: Reduced Standard")
  } else {  // tiny - brutally cut non-crucial info
    // -2 columns (selection box, cost). Economised: Sort arrows, Grows In>>grows, Granary>>Grain, Producing>>Output:Image only, Turns/Progress>>Turns
    //console.log("MODE: Small Narrow")
  }
  // First row for totals
  empire_list_html += "<tr class='cities_row' style='height:"+rheight+"px;'>"
    + "<td style='font-size:85%; color:#d0d0d0; text-align:right; padding-right:10px;'>"
    + "<span style='font-size:1%; color: rgba(0, 0, 0, 0);'>!</span>"  // tiny invisible ! will sort it to top of list
    + "TOTAL UPKEEP</td>"
    + "<td class='food_upkeep_column'   font-size:95%; style='text-align:right; padding-right:10px; color:#ced434; font-weight:520;' id='f_upkeep_total'> </td>"
    + "<td class='gold_upkeep_column'   font-size:95%; style='text-align:right; padding-right:10px; color:#ffd52c; font-weight:520;' id='g_upkeep_total'> </td>"
    + "<td class='shield_upkeep_column' font-size:95%; style='text-align:right; padding-right:10px; color:#ff4030; font-weight:520;' id='s_upkeep_total'> </td>"
    + "<td style='padding-left:10px;'></tr>";

  // SORT PLAYER UNITS BY TYPE
  var adjust_oversize = ""; // for style-injecting margin/alignment adjustment on oversize unit images
  var unit_row_html = "";
  var city_count = 0; // number of cities (total rows)

  /* Pre-sort units by type to avoid exponentially more iterations:
    * If we are in sort mode, then we already created data and just want to resort it. Otherwise,
      we just arrived and need to refresh it, because units may have changed */
  if (empire_sort_mode)  {
    // do not refresh data: it was just re-sorted for re-display
  } else {
    units_sorted_by_type = [];
    for (var unit_type_id in unit_types) {
      units_sorted_by_type[unit_type_id] = []; // new blank array for each unit of this unit type
    }
    for (var unit_id in units) {  // pre-sort units belonging to player, by type, into this array
      var sunit = units[unit_id];
      var stype = unit_types[sunit.type];
      if (client.conn.playing != null && unit_owner(sunit).playerno == client.conn.playing.playerno) {
        // See if unit qualifies to be displayed based on upkeep types desired to be shown
        var show_unit = false;
        var f1,g1,s1,z=false;
        if (stype['upkeep'] != null) {
          s1 = parseInt(stype['upkeep'][O_SHIELD],10);
          f1 = parseInt(stype['upkeep'][O_FOOD],10);
          g1 = parseInt(stype['upkeep'][O_GOLD],10);
          if (f1+g1+s1 == 0) z = true;
        }
        var f,g,s,l;
        if (sunit['upkeep'] != null) {
          s = parseInt(sunit['upkeep'][O_SHIELD],10);
          f = parseInt(sunit['upkeep'][O_FOOD],10);
          g = parseInt(sunit['upkeep'][O_GOLD],10);
          l = f+g+s; // if zero it's a free upkeep unit
          if   (empire_upkeep_show_shields && s>0) show_unit=true;
          else if (empire_upkeep_show_food && f>0) show_unit=true;
          else if (empire_upkeep_show_gold && g>0) show_unit=true;
          else if (empire_upkeep_show_free && l==0) show_unit=true;
        } else if (empire_upkeep_show_free) show_unit=true;
        if (!empire_upkeep_show_zero && z==true) show_unit=false;
        else if (empire_upkeep_show_zero && z==true) show_unit=true;
        if (show_unit) {
          units_sorted_by_type[sunit['type']].push(sunit);
        }
      }
    }
  }

  var ptype_img_html = "";
  var hit_point_html = "";
  var moves_left_html = "";
  var vet_badge_html = "";
  var ukf = new Array(cities.length);
  var ukg = new Array(cities.length);
  var uks = new Array(cities.length);

// Go through each city in the order sorted in the cities list, and pluck out units by type, so they're arranged by type:
  if ($("#city_table_head").length == 0) update_city_screen();              // If cities list has never been created, create it.
  var current_city_row = $("#city_table_head").next().children().first();   // Get first row of the sorted cities list.
  // Iterate through all player cities in the order they're sorted in the sorted cities list:
  while (current_city_row.length > 0) {
  //for (var city_id in cities) { //rows (cities)
    var city_id = current_city_row.attr('id').substr(12);
    current_city_row = current_city_row.next(); // bump up to next city row for when we iterate the loop back up here
    var pcity = cities[city_id];

    ukf[city_id] = 0;  // set counters at 0 before adding it up
    ukg[city_id] = 0;
    uks[city_id] = 0;
    // Only process legal cities owned by player
    if (client.conn.playing == null || city_owner(pcity) == null || city_owner(pcity).playerno != client.conn.playing.playerno) {
      continue;
    } else city_count++;

    //TO DO, we can only adjust height later after we add a unit_count tally then would have to do a $().css("height",rheight)

    var rheight = 28 * Math.ceil( (/*unit_count*/11*40) /  ($(window).width()-140) );
    unit_row_html = "<tr class='cities_row' style='height:"+rheight+"px;'>";
    unit_row_html += "<td style='cursor:pointer; font-size:85%; width:35%; text-align:right; padding-right:10px;' onclick='javascript:show_city_dialog_by_id(" + pcity['id']+")' id='citycell"+city_id+"'>"+pcity['name']+"</td>";
    unit_row_html += "<td class='food_upkeep_column'   style='font-size:95%; font-weight:520; text-align:right; padding-right:10px; color:#ced434;' id='f_upkeep"+city_id+"'> </td>";
    unit_row_html += "<td class='gold_upkeep_column'   style='font-size:95%; font-weight:520; text-align:right; padding-right:10px; color:#ffd52c;' id='g_upkeep"+city_id+"'> </td>";
    unit_row_html += "<td class='shield_upkeep_column' style='font-size:95%; font-weight:520; text-align:right; padding-right:10px; color:#ff4030;' id='s_upkeep"+city_id+"'> </td>";
    unit_row_html += "<td style='padding-left:10px;' id='u"+city_id+"'>";

    // Go through the player units pre-sorted by type, one type at a time
    for (unit_type_id in units_sorted_by_type) {
      for (var unit_index in units_sorted_by_type[unit_type_id]) { //row elements (individual units)
        var punit = units_sorted_by_type[unit_type_id][unit_index];

        if (punit['homecity'] != city_id) continue;  // Only add units belonging to this city.

        // Tally upkeep for each unit supported by this city:
        if (punit['upkeep'] != null) {
          ukf[city_id] += parseInt(punit['upkeep'][O_FOOD],10);
          ukg[city_id] += parseInt(punit['upkeep'][O_GOLD],10);
          uks[city_id] += parseInt(punit['upkeep'][O_SHIELD],10);
        }

        var ptype = unit_type(punit);

        // Generate micro-sprite
        var ptype_sprite = {"type":ptype,"sprite":get_unit_type_image_sprite(ptype)};
        var hptype_sprite = {"type":ptype,"sprite":get_full_hp_sprite(punit)};
        var mptype_sprite = {"type":ptype,"sprite":get_full_mp_sprite(punit)};
        var vtype_sprite = {"type":ptype,"sprite":get_full_vet_sprite(punit)};

        if (ptype_sprite != null) {
          sprite = ptype_sprite['sprite'];
          var hp_sprite = hptype_sprite['sprite'];
          var mp_sprite = mptype_sprite['sprite'];
          var vet_sprite = vtype_sprite['sprite'];

          adjust_oversize = (sprite['width']>64) ? -34 : -26;  // "oversize" images space differently

          ptype_img_html = "<span class='prod_img' title='"+html_safe(get_unit_city_info(punit))+"' style='float:left; padding-left:0px padding-right:0px; content-align:right; margin-top:-8px;"
                  + "margin-left:"+adjust_oversize+"px' margin-right:-4px; onclick='city_dialog_activate_unit(event, units[" + punit['id'] + "]);'>"
                  + "<div style='float:left; content-align:left;"
                  + "background: transparent url("
                  + sprite['image-src']
                  + ");transform: scale(0.625); background-position:-" + sprite['tileset-x'] + "px -" + (sprite['tileset-y'])
                  + "px;  width: " + (sprite['width']) + "px;height: " + (sprite['height']) + "px;"
                  + " content-align: left;"
                  + "vertical-align:top; float:left;'>"
                  + "</div>";

          hit_point_html = "<div style='margin-left:-83px; margin-top:-10px; margin-right:-24px; float:left; content-align:left;"
                  + "background: transparent url("
                  + hp_sprite['image-src']
                  + ");transform: scale(0.625); background-position:-" + hp_sprite['tileset-x'] + "px -" + (hp_sprite['tileset-y'])
                  + "px;  width: " + (hp_sprite['width']) + "px;height: " + (hp_sprite['height']) + "px;"
                  + " content-align: left;"
                  + "vertical-align:top; float:left;'>"
                  + "</div>";

          moves_left_html = "<div style='margin-left:-83px; margin-top:-6px; margin-right:-24px; float:left; content-align:left;"
                  + "background: transparent url("
                  + mp_sprite['image-src']
                  + ");transform: scale(0.625); background-position:-" + mp_sprite['tileset-x'] + "px -" + (mp_sprite['tileset-y'])
                  + "px;  width: " + (mp_sprite['width']) + "px;height: " + (mp_sprite['height']) + "px;"
                  + " content-align: left;"
                  + "vertical-align:top; float:left;'>"
                  + "</div>";

          if (punit['veteran'] > 0) {
            vet_badge_html = "<div style='margin-left:-50px; margin-top:-16px; margin-right: -24px; float:left; content-align:left;"
                  + "background: transparent url("
                  + vet_sprite['image-src']
                  + ");transform: scale(0.7); background-position:-" + vet_sprite['tileset-x'] + "px -" + (vet_sprite['tileset-y'])
                  + "px;  width: " + (vet_sprite['width']) + "px;height: " + (vet_sprite['height']) + "px;"
                  + " content-align: left;"
                  + "vertical-align:top; float:left;'>"
                  + "</div>";
          } else vet_badge_html = "";
        }

        if (empire_show_movesleft) ptype_img_html+=moves_left_html;
        if (empire_show_hitpoints) ptype_img_html+=hit_point_html;
        if (punit['veteran'] > 0) ptype_img_html+=vet_badge_html;

        unit_row_html += "<span id='u_img" + unit_type_id + "'>"+ptype_img_html+"</span>";
      }
    }
    empire_list_html += (unit_row_html +"</td></tr>");      // Add the row
  }

  empire_list_html += "</tbody></table>";

  $("#empire_list").html(empire_list_html);

  // Inject the upkeep counts after we tally up the upkeep---------------
  var sum_ukf=0;sum_ukg=0;sum_uks=0;
  for (city_id in cities) {
    // Only check cities the player owns
    if (client.conn.playing == null || city_owner(cities[city_id]) == null || city_owner(cities[city_id]).playerno != client.conn.playing.playerno) {
      continue;
    }

    sum_ukf += ukf[city_id];  // sum national upkeep totals
    sum_ukg += ukg[city_id];
    sum_uks += uks[city_id];

    // only inject non-zero values: blank is easier to read than lots of 0's (and faster performance)
    if (ukf[city_id] > 0) $("#f_upkeep"+city_id).html(ukf[city_id]);
    if (ukg[city_id] > 0) $("#g_upkeep"+city_id).html(ukg[city_id]);
    if (uks[city_id] > 0) $("#s_upkeep"+city_id).html(uks[city_id]);
  }
  // Inject total sums in special row for totals; if f/g are zero, eliminate the column
  if (sum_ukf > 0) $("#f_upkeep_total").html(sum_ukf);
  else $(".food_upkeep_column").remove();
  if (sum_ukg > 0) $("#g_upkeep_total").html(sum_ukg);
  else $(".gold_upkeep_column").remove();
  if (sum_uks > 0) $("#s_upkeep_total").html(sum_uks);
  // Remove empty shield upkeep column if they don't want to see shield upkeep OR
  // there's at least one other visible upkeep column; this way someone with no
  // upkeep at all still sees 0 shield upkeep to know they have no upkeep at all:
  else if (sum_ukf+sum_ukg>0 || !empire_upkeep_show_shields)
    $(".shield_upkeep_column").remove();
  //---------------------------------------------------------------------

  if (city_count == 0) {                 // city count
    $("#empire_table").html("You have no cities.");
  }

  $("#empire_table").tablesorter({theme:"dark", sortList: sortList});

  if (tiny_screen) {
  }
  else if (redux_screen) {
  } else if (wide_screen) {
  }
}
/**************************************************************************
 Button click in unit home cities to generate nationwide report on all
 units causing unhappines, in the console.
**************************************************************************/
function empire_do_unit_unhappy_report()
{
  unit_unhappy_report();
  $("#map_tab").click();
}

/**************************************************************************
 Display Empire tab when it's in EMPIRE_UNIT_IN_CITY_MODE
**************************************************************************/
function empire_unitcity_screen(wide_screen,narrow_screen,small_screen,
  landscape_screen,tiny_screen,redux_screen)
{
  $("#empire_title").html("City Deployment");
  if (small_screen) $("#empire_title").hide(); else $("#empire_title").show();

  //$("#empire_static").css({"height":"100%", "width":"100%"})

  // Set up panel functions for National Units
  var panel_html = "<input id='show_hp' type='checkbox' class='css-checkbox' title='Show hit points' name='chHP' value='false' onclick='toggle_empire_show_hitpoints();'>"
                 + "<label for='show_hp' name='show_hp_lbl' class='css-label dark-check-red'>HP</label>&ensp;"
                 + "<input id='show_mp' type='checkbox' class='css-checkbox' title='Show movement points' name='chMP' value='false' onclick='toggle_empire_show_movepoints();'>"
                 + "<label for='show_mp' name='show_mp_lbl' class='css-label dark-check-green'>Moves</label>";
  //var panel_html = "<input type='checkbox' id='show_hp' title='Show hit points' name='cbHP' value='false' onclick='toggle_empire_show_hitpoints();'>HP"
  //               + "<input type='checkbox' id='show_mp' title='Show movement points' name='cbMP' value='false' onclick='toggle_empire_show_movepoints();'>Moves";
  panel_html += "&nbsp;&nbsp;<button id='button_sorthp' type='button' class='button ui-button ui-corner-all ui-widget' onclick='empire_sort_hp();'"
              + "title='Sort units rows by Hitpoints' style='padding:5px; margin-bottom:2px;'>&#x2943HP</button>";
  panel_html += "<button id='button_sortmp' type='button' class='button ui-button ui-corner-all ui-widget' onclick='empire_sort_mp();'"
  + "title='Sort unit rows by Moves Left' style='padding:5px; margin-bottom:2px;'>&#x2943Moves</button>";
  panel_html += "<button id='button_sortvet' type='button' class='button ui-button ui-corner-all ui-widget' onclick='empire_sort_vet();'"
  + "title='Sort unit rows by Vet level' style='padding:5px; margin-bottom:2px;'>&#x2943Vet</button>";
  $("#empire_mode_panel").html(panel_html);
  $("#show_hp").prop("checked", empire_show_hitpoints);
  $("#show_mp").prop("checked", empire_show_movesleft);

  $('#empire_scroll').css({"height": $(window).height()-160, "overflow-y":"scroll", "overflow-x":"hidden" });

  var sortList = [];
  var headers = $('#empire_table thead th');
  headers.filter('.tablesorter-headerAsc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 0]);
  });
  headers.filter('.tablesorter-headerDesc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 1]);
  });

  if (narrow_screen || tiny_screen) $("#empire_prompt").hide();
  else $("#empire_prompt").show();

  const updown_sort_arrows = "<img class='lowered_gov' src='data:image/gif;base64,R0lGODlhFQAJAIAAAP///////yH5BAEAAAEALAAAAAAVAAkAAAIXjI+AywnaYnhUMoqt3gZXPmVg94yJVQAAOw=='>";

  var empire_list_html = "";

  if (true /*wide_screen*/)  // fully standard deluxe wide-screen mode, include all info
  {
    empire_list_html = "<table class='tablesorter-dark' id='empire_table' style='border=0px;border-spacing=0;padding=0;'>"
        + "<thead id='empire_table_head'>"
        + "<tr>"
        // WEU
        + "<th style='text-align:right;' title='Defense Strength in Warrior Equivalent Units (WEU).\n"
          +"\nIncludes: Veteran, Terrain, Inside-city.\n"
          +"\nLacks where the Attacker must be known:\n"
          +"City Improvements, BadCityDefender, Versus Type.'><span style='text-align:right; color:#c8c8c8; font-size:85%; width:80px'>WEU</span></th>"
        // City coulumn
        + "<th title='Sort alphabetically' style='text-align:right; font-size:93%;'><span style='white-space:nowrap'>City"+updown_sort_arrows+"</span></th>"
        // Units column
        + "<th title='Units present in city' style='padding-left:10px; font-size:93%;'>&nbsp;Present Units</th>"
        + "</tr>"
        + "</thead><tbody>";

  } else if (redux_screen) // semi-standard rendition of the above with minor trimming
  { // -1 column (selection box). Economised columns: Sort Arrows, Grows In>>Grows, Name of Production/Image >> Image only, Turns/Progress>>Progress
    //console.log("MODE: Reduced Standard")
  } else {  // tiny - brutally cut non-crucial info
    // -2 columns (selection box, cost). Economised: Sort arrows, Grows In>>grows, Granary>>Grain, Producing>>Output:Image only, Turns/Progress>>Turns
    //console.log("MODE: Small Narrow")
  }
  // SORT PLAYER UNITS BY TYPE
  var adjust_oversize = ""; // for style-injecting margin/alignment adjustment on oversize unit images
  var unit_row_html = "";
  var city_count = 0; // number of cities (total rows)

  /* Pre-sort units by type to avoid exponentially more iterations:
    * If we are in sort mode, then we already created data and just want to resort it. Otherwise,
      we just arrived and need to refresh it, because units may have changed */
  if (empire_sort_mode)  {
    // do not refresh data: it was just re-sorted for re-display
  } else {
    units_sorted_by_type = [];
    for (var unit_type_id in unit_types) {
      units_sorted_by_type[unit_type_id] = []; // new blank array for each unit of this unit type
    }
    for (var unit_id in units) {  // pre-sort units belonging to player, by type, into this array
      var sunit = units[unit_id];
      if (client.conn.playing != null && unit_owner(sunit).playerno == client.conn.playing.playerno) {
        units_sorted_by_type[sunit['type']].push(sunit);
      }
    }
  }

  var ptype_img_html = "";
  var hit_point_html = "";
  var moves_left_html = "";
  var vet_badge_html = "";

  var sumHPD = new Array(cities.length);

// Go through each city in the order sorted in the cities list, and pluck out units by type, so they're arranged by type:
  if ($("#city_table_head").length == 0) update_city_screen();              // If cities list has never been created, create it.
  var current_city_row = $("#city_table_head").next().children().first();   // Get first row of the sorted cities list.
  // Iterate through all player cities in the order they're sorted in the sorted cities list:
  while (current_city_row.length > 0) {
  //for (var city_id in cities) { //rows (cities)
    var city_id = current_city_row.attr('id').substr(12);
    current_city_row = current_city_row.next(); // bump up to next city row for when we iterate the loop back up here
    var pcity = cities[city_id];

    // Only process legal cities owned by player
    if (client.conn.playing == null || city_owner(pcity) == null || city_owner(pcity).playerno != client.conn.playing.playerno) {
      continue;
    } else city_count++;

    sumHPD[city_id] = 0;

    //TO DO, we can only adjust height later after we add a unit_count tally then would have to do a $().css("height",rheight)
    var rheight = 28 * Math.ceil( (/*unit_count*/11*40) /  ($(window).width()-140) );
    unit_row_html = "<tr class='cities_row' style='height:"+rheight+"px;'>";
    unit_row_html += "<td style='cursor:default; font-size:95%; font-weight:520; text-align:right; padding-right:10px; color:#a8a8a8;' id='sumHPD"+city_id+"'> </td>";
    unit_row_html += "<td style='cursor:pointer; font-size:85%; text-align:right; padding-right:10px;' onclick='javascript:show_city_dialog_by_id(" + pcity['id']+")' id='citycell"+city_id+"'>"+pcity['name']+"</td>";
    unit_row_html += "<td style='padding-left:10px;' id='u"+city_id+"'>";

    // Go through the player units pre-sorted by type, one type at a time
    for (unit_type_id in units_sorted_by_type) {
      for (var unit_index in units_sorted_by_type[unit_type_id]) { //row elements (individual units)
        var punit = units_sorted_by_type[unit_type_id][unit_index];

        if (!punit['tile'] || punit['tile'] != pcity['tile']) continue;  // Only add units present in this city.

        var ptype = unit_type(punit);

        // Tally the HP * defense strength for all units present in city
        // Get veteran power factor for punit
        var power_fact = warcalc_get_defense_bonus(punit);
        if (unit_has_class_flag(punit, UCF_TERRAIN_DEFENSE)) {
          // HEURISTIC: currently all rulesets give city bonus of 1.5 only to
          // land units and land units are the only units with terrain bonuses.
            power_fact *= 1.5;
        }
        sumHPD[city_id] += (power_fact/100)*(parseInt(punit['hp'],10) * parseInt(utype_defense_power(ptype),10) * parseInt(ptype['firepower'],10));
        //-------------------------------------------------------------------

        // Generate micro-sprite
        var ptype_sprite = {"type":ptype,"sprite":get_unit_type_image_sprite(ptype)};
        var hptype_sprite = {"type":ptype,"sprite":get_full_hp_sprite(punit)};
        var mptype_sprite = {"type":ptype,"sprite":get_full_mp_sprite(punit)};
        var vtype_sprite = {"type":ptype,"sprite":get_full_vet_sprite(punit)};

        if (ptype_sprite != null) {
          sprite = ptype_sprite['sprite'];
          var hp_sprite = hptype_sprite['sprite'];
          var mp_sprite = mptype_sprite['sprite'];
          var vet_sprite = vtype_sprite['sprite'];

          adjust_oversize = (sprite['width']>64) ? -34 : -26;  // "oversize" images space differently

          ptype_img_html = "<span class='prod_img' title='"+html_safe(get_unit_city_info(punit))+"' style='float:left; padding-left:0px padding-right:0px; content-align:right; margin-top:-8px;"
                  + "margin-left:"+adjust_oversize+"px' margin-right:-4px; onclick='city_dialog_activate_unit(event, units[" + punit['id'] + "]);'>"
                  + "<div style='float:left; content-align:left;"
                  + "background: transparent url("
                  + sprite['image-src']
                  + ");transform: scale(0.625); background-position:-" + sprite['tileset-x'] + "px -" + (sprite['tileset-y'])
                  + "px;  width: " + (sprite['width']) + "px;height: " + (sprite['height']) + "px;"
                  + " content-align: left;"
                  + "vertical-align:top; float:left;'>"
                  + "</div>";

          hit_point_html = "<div style='margin-left:-83px; margin-top:-10px; margin-right:-24px; float:left; content-align:left;"
                  + "background: transparent url("
                  + hp_sprite['image-src']
                  + ");transform: scale(0.625); background-position:-" + hp_sprite['tileset-x'] + "px -" + (hp_sprite['tileset-y'])
                  + "px;  width: " + (hp_sprite['width']) + "px;height: " + (hp_sprite['height']) + "px;"
                  + " content-align: left;"
                  + "vertical-align:top; float:left;'>"
                  + "</div>";

          moves_left_html = "<div style='margin-left:-83px; margin-top:-6px; margin-right:-24px; float:left; content-align:left;"
                  + "background: transparent url("
                  + mp_sprite['image-src']
                  + ");transform: scale(0.625); background-position:-" + mp_sprite['tileset-x'] + "px -" + (mp_sprite['tileset-y'])
                  + "px;  width: " + (mp_sprite['width']) + "px;height: " + (mp_sprite['height']) + "px;"
                  + " content-align: left;"
                  + "vertical-align:top; float:left;'>"
                  + "</div>";

          if (punit['veteran'] > 0) {
            vet_badge_html = "<div style='margin-left:-50px; margin-top:-16px; margin-right: -24px; float:left; content-align:left;"
                  + "background: transparent url("
                  + vet_sprite['image-src']
                  + ");transform: scale(0.7); background-position:-" + vet_sprite['tileset-x'] + "px -" + (vet_sprite['tileset-y'])
                  + "px;  width: " + (vet_sprite['width']) + "px;height: " + (vet_sprite['height']) + "px;"
                  + " content-align: left;"
                  + "vertical-align:top; float:left;'>"
                  + "</div>";
          } else vet_badge_html = "";
        }

        if (empire_show_movesleft) ptype_img_html+=moves_left_html;
        if (empire_show_hitpoints) ptype_img_html+=hit_point_html;
        if (punit['veteran'] > 0) ptype_img_html+=vet_badge_html;

        unit_row_html += "<span id='u_img" + unit_type_id + "'>"+ptype_img_html+"</span>";
      }
    }
    empire_list_html += (unit_row_html +"</td></tr>");      // Add the row
  }

  empire_list_html += "</tbody></table>";

  $("#empire_list").html(empire_list_html);

  // Inject the HPxD scores after we tally up all cities---------------
  for (city_id in cities) {
    // Only check cities the player owns
    if (client.conn.playing == null || city_owner(cities[city_id]) == null || city_owner(cities[city_id]).playerno != client.conn.playing.playerno) {
      continue;
    }

    if (sumHPD[city_id] > 0) {
      var weu = parseFloat((sumHPD[city_id]/10).toFixed(1));
      $("#sumHPD"+city_id).html(weu);
      $("#sumHPD"+city_id).prop("title", weu + " Warrior Equivalent Units");
    } else { // flag undefended in red
      $("#sumHPD"+city_id).html("<span style='color:#ff4030'>0</span>");
    }
  }
  //---------------------------------------------------------------------

  if (city_count == 0) {                 // city count
    $("#empire_table").html("You have no cities.");
  }

  $("#empire_table").tablesorter({theme:"dark", sortList: sortList});

  if (tiny_screen) {
  }
  else if (redux_screen) {
  } else if (wide_screen) {
  }
}

/**************************************************************************
  User adjustment of Magnification factors for Empire tabs
**************************************************************************/
function emp_bldgs_mag_plus1(mag) {
  empire_bldg_tab_saved_mag = mag * (100/99); update_empire_screen();
  simpleStorage.set('bldgZoom', empire_bldg_tab_saved_mag);
}
function emp_bldgs_mag_less1(mag) {
  empire_bldg_tab_saved_mag = mag * (99/100); update_empire_screen();
  simpleStorage.set('bldgZoom', empire_bldg_tab_saved_mag);
}
function emp_upkp_mag_plus2(mag) {
  empire_upkp_tab_saved_mag = mag * (101/99); update_empire_screen();
  simpleStorage.set('upkpZoom', empire_upkp_tab_saved_mag);
}
function emp_upkp_mag_less2(mag) {
  empire_upkp_tab_saved_mag = mag * (99/101); update_empire_screen();
  simpleStorage.set('upkpZoom', empire_upkp_tab_saved_mag);
}
function emp_wklst_mag_plus2(mag) {
  empire_wklst_tab_saved_mag = mag * (101/99); update_empire_screen();
  simpleStorage.set('wklZoom', empire_wklst_tab_saved_mag);
}
function emp_wklst_mag_less2(mag) {
  empire_wklst_tab_saved_mag = mag * (99/101); update_empire_screen();
  simpleStorage.set('wklZoom', empire_wklst_tab_saved_mag);
}
function reset_mag(){
  empire_bldg_tab_saved_mag=0;  simpleStorage.set('bldgZoom',0);
  empire_upkp_tab_saved_mag=0;  simpleStorage.set('upkpZoom',0);
  empire_wklst_tab_saved_mag=0; simpleStorage.set('wklZoom',0);
}
/**************************************************************************
 Display Empire tab when it's in EMPIRE_ECON_IMPROVEMENTS
**************************************************************************/
function empire_econ_improvements_screen(wide_screen,narrow_screen,small_screen,
  landscape_screen,tiny_screen,redux_screen)
{
  $("#empire_title").html("National Buildings");
  if (small_screen) $("#empire_title").hide(); else $("#empire_title").show();

  //$("#empire_static").css({"height":"100%", "width":"100%"})

  var real_width = ($(window).width()-230); //window is approx 190 for city name and 35 for junk borders/scrollbars/etc.
  //mag factor then becomes % of 66px needed to fit 38 buildings in the available space
  var mag_factor = (real_width/38)/67;  //console.log("1. win.width: "+$(window).width()+"   mag factor:"+mag_factor);
  // If user adjusted mag level before, use that instead
  if (empire_bldg_tab_saved_mag>0) {
    mag_factor = empire_bldg_tab_saved_mag;
  } else { // If fitting 38 buildings in 1 row makes them just too tiny, keep boosting mag by exact amount to add one extra row,
           // until the building icons are no longer too tiny. "Too tiny" defined as mag:0.35
    for (var n=1; n<100; n++) {
      if (mag_factor<.4) mag_factor = mag_factor * ((n+1)/n);  // if mag<0.4 it's too tiny, increase mag% enough for 1 more row
      else break;
    }
    if (mag_factor<.4) mag_factor = .45;
  }
  //console.log("Final Mag Factor: "+mag_factor);
  var magnification = "zoom:"+mag_factor+"; -moz-transform:"+mag_factor+";";

  // Set up panel controls for Building display
  var abs_chxbox = "Absent Buildings"; var pres_chxbox = "Present Buildings"; var wndr_chxbox = "Wonders only &nbsp;";
  if (small_screen) { abs_chxbox = "Absent"; pres_chxbox = "Present"; wndr_chxbox = "Wonders "; }

  var panel_html = "<input id='show_pb' type='checkbox' class='css-checkbox' title='Show present buildings' name='cbPB' value='true' onclick='toggle_empire_show_present_buildings();'>"
  + "<label for='show_pb' name='show_pb_lbl' class='css-label dark-check-green'>"+pres_chxbox+"</label>&ensp;"
  + "<input id='show_ab' type='checkbox' class='css-checkbox' title='Show absent buildings' name='cbAB' value='false' onclick='toggle_empire_show_absent_buildings();'>"
  + "<label for='show_ab' name='show_ab_lbl' class='css-label dark-check-red'>"+abs_chxbox+"</label>&ensp;"
  + "<input id='show_wonders' type='checkbox' class='css-checkbox' title='Show wonders instead of buildings' name='cbSW' value='false' onclick='toggle_empire_show_wonders_only();'>"
  + "<label for='show_wonders' name='show_wonders_lbl' class='css-label dark-check-cyan'>"+wndr_chxbox+"</label>&ensp;"
  //var panel_html = "<input type='checkbox' id='show_pb' title='Show present buildings' name='cbPB' value='true' onclick='toggle_empire_show_present_buildings();'>"+pres_chxbox
  //  + "<input type='checkbox' id='show_ab' title='Show absent buildings' name='cbAB' value='false' onclick='toggle_empire_show_absent_buildings();'>"+abs_chxbox
  //  + "<input type='checkbox' id='show_wonders' title='Show wonders instead of buildings' name='cbSW' value='false' onclick='toggle_empire_show_wonders_only();'>"+wndr_chxbox
      + "<input class='tiny_button' type='button' style='font-size:90%; padding:2px;' value='+1%' onclick='emp_bldgs_mag_plus1("+mag_factor+");'> "
      + "<input class='tiny_button' type='button' style='font-size:90%; padding:2px;' value='-1%' onclick='emp_bldgs_mag_less1("+mag_factor+");'>Zoom ";

  $("#empire_mode_panel").html(panel_html);
  $("#show_pb").prop("checked", empire_show_present_buildings);
  $("#show_ab").prop("checked", empire_show_absent_buildings);
  $("#show_wonders").prop("checked", empire_show_wonders_only);

  $('#empire_scroll').css({"height": $(window).height()-160, "overflow-y":"scroll", "overflow-x":"hidden" });

  var sortList = [];
  var headers = $('#empire_table thead th');
  headers.filter('.tablesorter-headerAsc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 0]);
  });
  headers.filter('.tablesorter-headerDesc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 1]);
  });

  if (narrow_screen || tiny_screen) $("#empire_prompt").hide();
  else $("#empire_prompt").show();

  const updown_sort_arrows = "<img class='lowered_gov' src='data:image/gif;base64,R0lGODlhFQAJAIAAAP///////yH5BAEAAAEALAAAAAAVAAkAAAIXjI+AywnaYnhUMoqt3gZXPmVg94yJVQAAOw=='>";

  var empire_list_html = "";

  if (true /*wide_screen || redux_screen*/)  // fully standard deluxe wide-screen mode, include all info
  {
    empire_list_html = "<table class='tablesorter-dark' id='empire_table' style='border=0px;border-spacing=0;padding=0;'>"
        + "<thead id='empire_table_head'>"
        + "<tr>"
        // City coulumn
        + "<th title='Sort alphabetically' style='text-align:right; font-size:93%;'><span style='white-space:nowrap'>City"+updown_sort_arrows+"</span></th>"
        // Units column
        + "<th style='padding-left:10px; font-size:93%;'>&nbsp;Buildings</th>"
        + "</tr>"
        + "</thead><tbody>";
  }
  var alt_click_method = "oncontextmenu";
  if (small_screen) alt_click_method = "ondblclick";

  var improvements_html = "";
  var city_count = 0; // number of cities (total rows)

// Go through each city in the order sorted in the cities list, and pluck out units by type, so they're arranged by type:
  if ($("#city_table_head").length == 0) update_city_screen();              // If cities list has never been created, create it.
  var current_city_row = $("#city_table_head").next().children().first();   // Get first row of the sorted cities list.
  // Iterate through all player cities in the order they're sorted in the sorted cities list:
  while (current_city_row.length > 0) {
  //for (var city_id in cities) { //rows (cities)
    var city_id = current_city_row.attr('id').substr(12);
    current_city_row = current_city_row.next(); // bump up to next city row for when we iterate the loop back up here
    var pcity = cities[city_id];

    // Only process legal cities owned by player
    if (client.conn.playing == null || city_owner(pcity) == null || city_owner(pcity).playerno != client.conn.playing.playerno) {
      continue;
    } else city_count++;

    //TO DO, we can only adjust height later after we add a unit_count tally then would have to do a $().css("height",rheight)
    var rheight = 28 * Math.ceil( (/*col_count*/22*40) / ($(window).width()-140) );
    improvements_html = "<tr class='cities_row' style='border-bottom: 3px solid #000; height:"+rheight+"px;'>";
    improvements_html += "<td style='cursor:pointer; font-size:85%; text-align:right; padding-right:10px;' onclick='javascript:show_city_dialog_by_id("
                      + pcity['id']+")' id='citycell"+city_id+"'>"+pcity['name']+"</td>";
    improvements_html += "<td style='padding-left:10px;' id='u"+city_id+"'>";
    // Go through the improvements one at a time and determine whether to show it
    for (var z = 0; z < ruleset_control.num_impr_types-1 /*-1 don't show coinage*/; z ++) {
      // Handle 3 different checkboxes for which improvements to show or not show-----------------------
      // FILTER MODE: show only wonders or only improvements
      var genus = improvements[z]['genus'];
      var is_wonder = (genus <= GENUS_SMALL_WONDER ? true : false); //this detects both Great and Small wonders.
      if (is_wonder != empire_show_wonders_only) continue;

      var present = city_has_building(pcity, z);
      var show_building = false;
      if (present && empire_show_present_buildings) show_building=true;
      if (!present && empire_show_absent_buildings) show_building=true;
      // ------------------------------------------------------------------------------------------------

      var sprite = get_improvement_image_sprite(improvements[z]);

      // Set cell colour/opacity based on: if present / can build
      var opacity = 1;
      var border = "";
      var bg = "background:#335 ";
      var title_text = "";
      var right_click_action = alt_click_method+"='city_sell_improvement_in(" +city_id+","+ z + ");' ";
       // Colour and text tags for current production and completion thereof:
       var product_finished = false;
       var verb = " is making ";
       var is_city_making = (pcity['production_kind'] == VUT_IMPROVEMENT && pcity['production_value']==z);
       if (is_city_making) { // colour code currently produced items which are bought/finished
         var shields_invested = pcity['shield_stock'];
         if (shields_invested>=improvements[z]['build_cost']) {
           product_finished=true;
           var verb = " is finishing ";
         }
       }

      if (pcity['improvements'].isSet(z)) {  // city has improvement: white bg
        opacity = 1;
        border = "border:3px solid #000000;";
        bg     = "background:#FEED ";
        title_text = "title='"+html_safe(pcity['name'])+":\n\nRIGHT-CLICK: Sell " + html_safe(improvements[z]['name'])+".'";
        right_click_action = alt_click_method+"='city_sell_improvement_in(" +city_id+","+ z + ");' ";
      } else {
        if (!can_city_build_improvement_now(pcity, z)) {  // city has improvement but CAN'T MAKE IT
          opacity=0.19;
          border = "border:3px solid #231a13;"
          bg =     "background:#F43F ";
          title_text = "title='" + pcity['name']+": " + improvements[z]['name'] + " unavailable.\n\nRIGHT-CLICK: Add to worklist.\n\n"+browser.metaKey+"-CLICK: get help on building.'";
          right_click_action = alt_click_method+"='city_add_improv_to_worklist(event" +city_id+","+ z + ");' ";
        } else {    // city has improvement AND CAN MAKE IT
          opacity = 1;
          border = (is_city_making ? (product_finished ? "border:3px solid #308000;" : "border:3px solid #80E0FF;") : "border:3px solid #000000;");
          bg =     (is_city_making ? (product_finished ? "background:#BFBE " : "background:#8D87 ") : "background:#AD68 ");
          right_click_action = alt_click_method+"='city_change_prod_and_buy(event," +city_id+","+ z + ");' "
          title_text = is_city_making
            ? ("title='"+html_safe(pcity['name'])+verb+improvements[z]['name']+".\n\nRIGHT_CLICK: Buy "+html_safe(improvements[z]['name'])+"\n\n"+browser.metaKey+"-CLICK: get help on building.\n\n")
            : ("title='"+html_safe(pcity['name'])+":\n\nCLICK: Change production\n\nRIGHT-CLICK: Buy "+html_safe(improvements[z]['name'])+"\n\n"+browser.metaKey+"-CLICK: get help on building.\n\n'");
        }
      }
      if (!show_building) opacity = 0.21;  // we show a ghost ability to see grid.
      if (is_city_making) opacity = 1;     // always show current production
      // Put improvement sprite in the cell:
      improvements_html = improvements_html +
        "<div style='padding:0px; opacity:"+opacity+"; "+magnification
            +"' id='city_improvement_element'><span style='padding:0px; margin:0px; "+border+" "+bg+" url("
            + sprite['image-src'] +
            ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
            + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left;' "
            + title_text
            + right_click_action
            + "onclick='change_city_prod_to(event," +city_id+","+ z + ");'>"
            +"</span></div>";
    }
    empire_list_html += (improvements_html +"</td></tr>");      // Add the row
  }

  empire_list_html += "</tbody></table>";

  $("#empire_list").html(empire_list_html);
  //---------------------------------------------------------------------
  if (city_count == 0) {
    $("#empire_table").html("You have no cities.");
  }
  $("#empire_table").tablesorter({theme:"dark", sortList: sortList});

  if (tiny_screen) {
  }
  else if (redux_screen) {
  } else if (wide_screen) {
  }
}
/**************************************************************************
  Compute building upkeep bonuses from Wonders and Governments
  TO DO: make this ruleset independent when the server gives us a way.
***************************************************************************/
function get_player_building_upkeep_bonus(player_id)
{
  var bonus = 0;
  const gov = governments[players[player_id]['government']]['name']
  if (player_has_wonder(player_id, improvement_id_by_name(B_ADAM_SMITH_NAME))) {
    bonus += 1;
  }
  if (client_rules_flag[CRF_COMMIE_BLDG_UPKEEP]) {
    if (gov=="Communism") {
      bonus += 1;
    }
  }
  return bonus;
}
/**************************************************************************
 Display Empire tab when it's in EMPIRE_ECON_UPKEEP
**************************************************************************/
function empire_econ_upkeep_screen(wide_screen,narrow_screen,small_screen,
  landscape_screen,tiny_screen,redux_screen)
{
  $("#empire_title").html("Building Upkeep");
  if (small_screen) $("#empire_title").hide(); else $("#empire_title").show();

  //$("#empire_static").css({"height":"100%", "width":"100%"})

  upkeep_gold_bonus = get_player_building_upkeep_bonus(client.conn.playing.playerno);

  estimated_max_bldgs = 5 + 28 * (game_info['turn']/130);
  if (estimated_max_bldgs>38) estimated_max_bldgs = 38;

  var real_width = ($(window).width()-250); //window is approx 190 for city name and 35 for junk borders/scrollbars/etc.
  //mag factor then becomes % of 66px needed to fit 38 buildings in the available space
  var mag_factor = (real_width/estimated_max_bldgs)/67;  //console.log("1. win.width: "+$(window).width()+"   mag factor:"+mag_factor);
  // If user adjusted mag level before, use that instead
  if (empire_upkp_tab_saved_mag>0) {
    mag_factor = empire_upkp_tab_saved_mag;
  } else { // If fitting 38 buildings in 1 row makes them just too tiny, keep boosting mag by exact amount to add one extra row,
           // until the building icons are no longer too tiny. "Too tiny" defined as mag:0.35
    for (var n=1; n<100; n++) {
      if (mag_factor<.4) mag_factor = mag_factor * ((n+1)/n);  // if mag<0.4 it's too tiny, increase mag% enough for 1 more row
      else break;
    }
    if (mag_factor<.4) mag_factor = .45;
    if (mag_factor>1) mag_factor = 1.0;
  }
  var magnification = "zoom:"+mag_factor+"; -moz-transform:"+mag_factor+";";

  // Set up panel controls for Building display
  var panel_html = "<input class='tiny_button' type='button' style='font-size:90%; padding:2px;' value='+2%' onclick='emp_upkp_mag_plus2("+mag_factor+");'> "
                 + "<input class='tiny_button' type='button' style='font-size:90%; padding:2px;' value='-2%' onclick='emp_upkp_mag_less2("+mag_factor+");'>Zoom ";
  $("#empire_mode_panel").html(panel_html);

  $('#empire_scroll').css({"height": $(window).height()-160, "overflow-y":"scroll", "overflow-x":"hidden" });

  var sortList = [];
  var headers = $('#empire_table thead th');
  headers.filter('.tablesorter-headerAsc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 0]);
  });
  headers.filter('.tablesorter-headerDesc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 1]);
  });

  if (narrow_screen || tiny_screen) $("#empire_prompt").hide();
  else $("#empire_prompt").show();

  const updown_sort_arrows = "<img class='lowered_gov' src='data:image/gif;base64,R0lGODlhFQAJAIAAAP///////yH5BAEAAAEALAAAAAAVAAkAAAIXjI+AywnaYnhUMoqt3gZXPmVg94yJVQAAOw=='>";

  var empire_list_html = "";

  if (true /*wide_screen || redux_screen*/)  // fully standard deluxe wide-screen mode, include all info
  {
    empire_list_html = "<table class='tablesorter-dark' id='empire_table' style='border=0px;border-spacing=0;padding=0;'>"
        + "<thead id='empire_table_head'>"
        + "<tr>"
        // City coulumn
        + "<th title='Sort alphabetically' style='text-align:right; font-size:93%;'><span style='white-space:nowrap'>City"+updown_sort_arrows+"</span></th>"
        + "<th id='gold_upkeep' class='gold_upkeep_column' title='Sort GOLD UPKEEP' style='text-align:center; width:28px'><img class='lowered_gov' src='/images/gold.png'></th>"
        // Buildings column
        + "<th style='padding-left:10px; font-size:93%;'>&nbsp;Buildings</th>"
        + "</tr>"
        + "</thead><tbody>";
  }
  // First row for total
  empire_list_html += "<tr class='cities_row' style='height:"+rheight+"px;'>"
  + "<td style='font-size:85%; color:#d0d0d0; text-align:right; padding-right:10px;'>"
  + "<span style='font-size:1%; color: rgba(0, 0, 0, 0);'>!</span>"  // tiny invisible ! will sort it to top of list
  + "TOTAL UPKEEP</td>"
  + "<td class='gold_upkeep_column'   font-size:95%; style='text-align:right; padding-right:10px; color:#ffd52c; font-weight:520;' id='g_upkeep_total'> </td>"
  + "<td style='padding-left:10px;'></td></tr>";

  var alt_click_method = "oncontextmenu";
  if (small_screen) alt_click_method = "ondblclick";

  var improvements_html = "";
  var city_count = 0; // number of cities (total rows)
  let city_upkeep = new Array(cities.length);

  // Go through each city in the order sorted in the cities list, and pluck out units by type, so they're arranged by type:
  if ($("#city_table_head").length == 0) update_city_screen();              // If cities list has never been created, create it.
  var current_city_row = $("#city_table_head").next().children().first();   // Get first row of the sorted cities list.
  // Iterate through all player cities in the order they're sorted in the sorted cities list:
  while (current_city_row.length > 0) {
  //for (var city_id in cities) { //rows (cities)
    var city_id = current_city_row.attr('id').substr(12);
    current_city_row = current_city_row.next(); // bump up to next city row for when we iterate the loop back up here
    var pcity = cities[city_id];
    city_upkeep[city_id] = 0; // start counter
    // Only process legal cities owned by player
    if (client.conn.playing == null || city_owner(pcity) == null || city_owner(pcity).playerno != client.conn.playing.playerno) {
      continue;
    } else city_count++;

    //TO DO, we can only adjust height later after we add a unit_count tally then would have to do a $().css("height",rheight)
    var rheight = 28 * Math.ceil( (/*col_count*/22*40) / ($(window).width()-140) );
    improvements_html = "<tr class='cities_row' style='border-bottom: 3px solid #000; height:"+rheight+"px;'>";
    improvements_html += "<td style='cursor:pointer; font-size:85%; text-align:right; padding-right:10px;' onclick='javascript:show_city_dialog_by_id("
                      + pcity['id']+")' id='citycell"+city_id+"'>"+pcity['name']+"</td>";
    improvements_html += "<td class='gold_upkeep_column' font-size:85%; style='text-align:right; padding-right:10px; color:#ffd52c; font-weight:520;' id='g_upkeep_total"+city_id+"'> </td>"
    improvements_html += "<td style='padding-left:10px; padding-bottom:18px' id='u"+city_id+"'>";

    // Go through the improvements one at a time and determine whether to show it
    for (var z = 0; z < ruleset_control.num_impr_types-1 /*-1 don't show coinage*/; z ++) {
      var present = city_has_building(pcity, z);
      var show_building = present;
      if (!show_building) continue;
      // ------------------------------------------------------------------------------------------------
      var upkeep = improvements[z]['upkeep'];
      if (upkeep>=0 && upkeep<=upkeep_gold_bonus) upkeep = 0;  // Render free upkeep effects, only for non-negative upkeep buildings
      city_upkeep[city_id] += upkeep;
      if (upkeep==0) upkeep = "";  // Leave 0 upkeep blank
      var sprite = get_improvement_image_sprite(improvements[z]);

      // Set display vars
      var opacity = 1;
      const border = "border:1px solid #000000;";
      var bg = upkeep>0 ? "background:#FEED " : "background:#FEED ";
      var upkp_color = upkeep<0 ? "#77EF77" : "#FFD52C" // negative upkeep or "upkeep support buildings" get green.
      var title_text = "title='"+html_safe(pcity['name'])+":\n\nRIGHT-CLICK: Sell " + html_safe(improvements[z]['name'])+".'";
      var right_click_action = alt_click_method+"='city_sell_improvement_in(" +city_id+","+ z + ");' ";
      // Put improvement sprite in the cell:
      improvements_html = improvements_html +
        "<div style='padding:0px; opacity:"+opacity+"; "+magnification
            +"' id='city_improvement_element'><span style='padding:0px; margin:0px; "+border+" "+bg+" url("
            + sprite['image-src'] +
            ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
            + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left;' "
            + title_text
            + right_click_action
            + "onclick='change_city_prod_to(event," +city_id+","+ z + ");'>"
            +"</span><span style='font-size:90%; color:"+upkp_color+"'>"+upkeep+"</span></div>";
    }
    empire_list_html += (improvements_html +"</td></tr>");      // Add the row
  }
  empire_list_html += "</tbody></table>";
  $("#empire_list").html(empire_list_html);

  // Inject total gold upkeep after
  var total_upkeep = 0;
  for (city_id in cities) {
    // Only check cities the player owns
    if (client.conn.playing == null || city_owner(cities[city_id]) == null || city_owner(cities[city_id]).playerno != client.conn.playing.playerno) {
      continue;
    }
    if (city_upkeep[city_id] > 0) {
      total_upkeep += city_upkeep[city_id];
      $("#g_upkeep_total"+city_id).html(city_upkeep[city_id]);
      $("#g_upkeep_total"+city_id).prop("title", city_upkeep[city_id] + " gold upkeep for buildings in "+cities[city_id]['name']);
    }
  }
  $("#g_upkeep_total").html(total_upkeep);
  $("#g_upkeep_total").prop("title", " Total national upkeep");
  //---------------------------------------------------------------------
  if (city_count == 0) {
    $("#empire_table").html("You have no cities.");
  }
  $("#empire_table").tablesorter({theme:"dark", sortList: sortList});

  if (tiny_screen) {
  }
  else if (redux_screen) {
  } else if (wide_screen) {
  }
}
/**************************************************************************
 Click an improvement in Empire Worklist Tab
**************************************************************************/
function redraw_improv_clipboard()
{
  var clipboard_html = "";
  var bg = "background:#FEED ";
  const border = "border:2px solid #FFFFFF;"
  var mag_factor = ($(window).width()-70)/(67*39);
  if (mag_factor > 1.0) mag_factor = 1.0;
  else if (mag_factor < 0.3597) {
    mag_factor *= 2;
    if (mag_factor < 0.3597) mag_factor = 0.3597;
  }
  var magnification = "zoom:"+mag_factor+"; -moz-transform:"+mag_factor+";";
  const title_text = "title='CLICK: Remove from clipboard' ";  // hover + cursor = move before/after?

  for (var z = 0; z < empire_worklist_clipboard.length; z ++) {
    if (empire_worklist_clipboard[z]['kind']==VUT_IMPROVEMENT) {
      sprite = get_improvement_image_sprite(improvements[empire_worklist_clipboard[z]['value']]);
      bg = "background:#EFFD ";
    } else {
      sprite = get_unit_type_image_sprite(unit_types[empire_worklist_clipboard[z]['value']])
      bg = "background:#EFFD ";
    }
    if (sprite == null) continue;

    var marginleft = z == 0 ? 10 : -1;

    var opacity = 1;
    const click_action = "onclick='cut_improv_clipboard(event, " + z + ");' ";
    // Put improvement sprite in the cell:
    clipboard_html = clipboard_html +
      "<div style='cursor:pointer; padding:0px; opacity:"+opacity+"; "+magnification
          +"'><span style='padding:0px; margin:0px; margin-left:"+marginleft+"px; "+border+" "+bg+" url("
          + sprite['image-src'] + ");background-position:-" + sprite['tileset-x'] + "px -"
          + sprite['tileset-y'] + "px;  width: " + sprite['width'] + "px;height: "
          + sprite['height'] + "px;float:left;' "
          + title_text + click_action
          +"</span></div>";
  }
  const plural = (empire_worklist_clipboard.length > 1) ? "s" : ""
  if (empire_worklist_clipboard.length > 0) clipboard_html += empire_worklist_clipboard.length+"&nbsp;item"+plural;
  $("#empire_worklist_clipboard").html(clipboard_html);
}
/**************************************************************************
 User clicked to remove an element from the clipboard.
**************************************************************************/
function cut_improv_clipboard(event, z)
{
  empire_worklist_clipboard.splice(z,1);
  redraw_improv_clipboard();
}

/**************************************************************************
 Click an improvement in Empire Worklist Tab
**************************************************************************/
function handle_improv_clipboard(event, kind, z)
{
  if (event.metaKey) {
    help_redirect(kind, z);
    return;
  } // end show help
  if (event.ctrlKey) {   // future command
  }
  else if (event.shiftKey) {   // append to clipboard
    // No multiple appending of same building:
    if (kind == VUT_IMPROVEMENT) {
      if (empire_worklist_clipboard.some(e => (e.kind === kind && e.value === z))
          && improvements[z].genus != GENUS_SPECIAL) { // !(Coinage || Space parts)
        return;
      }
    }
    empire_worklist_clipboard.push({"kind": kind, "value": z});
  }
  else {                  // replace (copy to) clipboard
    empire_worklist_clipboard = [{"kind": kind, "value": z}];
  }
  redraw_improv_clipboard();
}
/**************************************************************************
 Display Empire tab when it's in EMPIRE_ECON_WORKLISTS
**************************************************************************/
function empire_econ_worklists_screen(wide_screen,narrow_screen,small_screen,
  landscape_screen,tiny_screen,redux_screen)
{
  $("#empire_title").html("National Production");
  //if (small_screen) $("#empire_title").hide(); else $("#empire_title").show();
  $("#empire_title").hide(); // always hide: maximise panel space.

  // MAGNIFICATION ---------------------------------------------------------
  var real_width = ($(window).width()-270);
  //mag factor then becomes % of 66px needed to fit 38 buildings in the available space
  var mag_factor = (real_width/8)/67;  //console.log("1. win.width: "+$(window).width()+"   mag factor:"+mag_factor);
  // If user adjusted mag level before, use that instead
  if (empire_wklst_tab_saved_mag>0) {
    mag_factor = empire_wklst_tab_saved_mag;
  } else { // If fitting 38 buildings in 1 row makes them just too tiny, keep boosting mag by exact amount to add one extra row,
           // until the building icons are no longer too tiny. "Too tiny" defined as mag:0.35
    for (var n=1; n<100; n++) {
      if (mag_factor<.4) mag_factor = mag_factor * ((n+1)/n);  // if mag<0.4 it's too tiny, increase mag% enough for 1 more row
      else break;
    }
    if (mag_factor<.4) mag_factor = .45;
    if (mag_factor>1) mag_factor = 1.0;
  }
  if (small_screen) mag_factor = 0.8;
  var magnification = "zoom:"+mag_factor+"; -moz-transform:"+mag_factor+";";
  // ---------------------------------------------------------------------
  // SET UP SUPER PANELS
  if (true /*wide_screen || redux_screen*/) // TO DO: mobile super panel will need serious restructuring
  var panel_html = create_worklist_improv_div()
                 + (small_screen ? "" : create_worklist_wonder_div() )    // should be wonder_mode ? wonder_div : improv_div for space economy
                 + create_worklist_unit_div()
                 + "<div><span>"
             //    + "<input type='button' style='font-size:90%; padding:2px;' value='+2%' onclick='emp_wklst_mag_plus2("+mag_factor+");'>"
             //    + "<input type='button' style='font-size:90%; padding:2px;' value='-2%' onclick='emp_wklst_mag_less2("+mag_factor+");'>
                 + "</span>"
                 + "<span style='margin-top:3px' id='empire_worklist_clipboard'></span></div>";
  $("#empire_mode_panel").html(panel_html);
  redraw_improv_clipboard();

  // MAIN AREA -------------------------------------------------------------
  $('#empire_scroll').css({"height": $(window).height()-160, "overflow-y":"scroll", "overflow-x":"hidden" });

  var sortList = [];
  var headers = $('#empire_table thead th');
  headers.filter('.tablesorter-headerAsc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 0]);
  });
  headers.filter('.tablesorter-headerDesc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 1]);
  });

  if (narrow_screen || tiny_screen) $("#empire_prompt").hide();
  else $("#empire_prompt").show();

  const updown_sort_arrows = "<img class='lowered_gov' src='data:image/gif;base64,R0lGODlhFQAJAIAAAP///////yH5BAEAAAEALAAAAAAVAAkAAAIXjI+AywnaYnhUMoqt3gZXPmVg94yJVQAAOw=='>";

  var empire_list_html = "";

  if (true /*wide_screen || redux_screen*/)  // fully standard deluxe wide-screen mode, include all info
  {
    empire_list_html = "<table class='tablesorter-dark' id='empire_table' style='border=0px;border-spacing=0;padding=0;'>"
        + "<thead id='empire_table_head'>"
        + "<tr>"
        // City coulumn
        + "<th title='Sort alphabetically' style='text-align:right; font-size:93%; width:10px;'><span style='white-space:nowrap'>City"+updown_sort_arrows+"</span></th>"
        // Worklist column
        + "<th style='padding-left:10px; font-size:93%;'>&nbsp;Worklist</th>"
        + "</tr>"
        + "</thead><tbody>";
  }

  // saved for later but currently not used
  var alt_click_method = "oncontextmenu";
  if (small_screen) alt_click_method = "ondblclick";

  var queue_html = "";
  var city_count = 0; // number of cities (total rows)

// Go through each city in the order sorted in the cities list, and pluck out units by type, so they're arranged by type:
  if ($("#city_table_head").length == 0) update_city_screen();              // If cities list has never been created, create it.
  var current_city_row = $("#city_table_head").next().children().first();   // Get first row of the sorted cities list.
  // Iterate through all player cities in the order they're sorted in the sorted cities list:
  while (current_city_row.length > 0) {
  //for (var city_id in cities) { //rows (cities)
    var city_id = current_city_row.attr('id').substr(12);
    current_city_row = current_city_row.next(); // bump up to next city row for when we iterate the loop back up here
    var pcity = cities[city_id];
    // Only process legal cities owned by player
    if (client.conn.playing == null || city_owner(pcity) == null || city_owner(pcity).playerno != client.conn.playing.playerno) {
      continue;
    } else city_count++;

    var rheight = 10; // set it short then let it expand it only as high as it needs
    // Mobile users have to click empty row to append clipboard:
    //var empty_row_click = small_screen ? " onclick='tap_empty_production_row(event, "+city_id+")'" : "";
    // Now all users can click an empty row to append to clipboard
    var empty_row_click = is_small_screen()
                        ? " onclick='tap_empty_production_row(event, "+city_id+")'"
                        : " title='CLICK: paste worklist\nCTRL-CLICK: clear worklist\nSHIFT-CLICK: copy worklist' onclick='tap_empty_production_row(event, "+city_id+")'";
    queue_html = "<tr class='cities_row' style='border-bottom: 3px solid #000; height:"+rheight+"px;'>";
    queue_html += "<td style='cursor:pointer; font-size:85%; text-align:right; padding-right:10px;' onclick='javascript:show_city_dialog_by_id("
                      + pcity['id']+")' id='citycell"+city_id+"'>"+pcity['name']+"</td>";
    queue_html += "<td style='padding-left:10px;' id='WL"+city_id+"'"+empty_row_click+">";

    // Go through the worklist
    for (var z = -1; z < pcity['worklist'].length; z++) { // current prod is not in worklist array but separate, so start at -1
      // Get item from current prod or future worklist---------
      var prod_kind, prod_value;
      if (z==-1) {
        prod_kind  = pcity['production_kind'];
        prod_value = pcity['production_value'];
      } else {
        //console.log("Checking city "+pcity['id']+" to grab worklist value")
        prod_kind  = pcity['worklist'][z]['kind'];
        prod_value = pcity['worklist'][z]['value'];
      }
      // Get sprite and tech_req status: ----------------------------------
      var sprite, req_state;
      if (prod_kind == VUT_IMPROVEMENT) {
        sprite = get_improvement_image_sprite(improvements[prod_value]);
        //console.log("Checking improvement#"+prod_value);
        if (improvements[prod_value]['reqs_count']==0) {
          req_state = TECH_KNOWN;  // no tech required so we pretend we know it
        } else {
           req_state = player_invention_state(client.conn.playing, improvements[prod_value]['reqs'][0]['value']);
        }
      }
      else if (prod_kind == VUT_UTYPE) {
        sprite = get_unit_type_image_sprite(unit_types[prod_value]);
        req_state = player_invention_state(client.conn.playing, unit_types[prod_value]['tech_requirement']);
      }
      // ------------------------------------------------------------------
      // Set display vars
      var border = "border:2px solid #000000;";
      var bg = req_state == TECH_KNOWN ? "background:#FEED " : "background:#A769 "
      var title_text =  "title='";
      var right_click_action = "";

      // Special handling of title and background for current production---------------
      if (z==-1) { // -1 == current production (not future worklist)
        var finish_turns = get_city_production_time(pcity);
        // Figure out if production is finished
        var shields_invested = pcity['shield_stock'];
        var shields_needed = -1;  // stays -1 only if Coinage
        if (pcity['production_kind'] == VUT_UTYPE) {
          const punit_type = unit_types[pcity['production_value']];
          shields_needed = universal_build_shield_cost(pcity, punit_type);
        }
        if (pcity['production_kind'] == VUT_IMPROVEMENT) {
          var improvement = improvements[pcity['production_value']];
          if (improvement['name'] != "Coinage") {
            shields_needed = universal_build_shield_cost(pcity, improvement)
          }
        }
        if (shields_needed != -1) { // -1 == coinage
          title_text +=  finish_turns + " turns &nbsp;&nbsp;(" + get_production_progress(pcity) + ")\n\n"
          if (shields_invested>=shields_needed) {
            bg = "background:#BFBE ";
            border = "border:2x solid 308000;"
          } else {
              title_text += "RIGHT-CLICK: Buy\n";
              right_click_action = "oncontextmenu='request_city_id_buy("+pcity['id']+")'";
              if (finish_turns==1) {
              bg = "background:#DFDD ";
              border = "border:2x solid 002000;"
            }
          }
        }
      } // -----------------------------------------------------------------------------
      title_text += "CLICK: Remove\nCTRL-CLICK: Insert before\nSHIFT-CLICK: Add after'";
      if (is_small_screen()) title_text = "";

      // Put improvement sprite in the cell:
      queue_html = queue_html +
        "<div style='padding:0px; "+magnification
            +"' id='worklist_element'><span style='padding:0px; margin:0px; "+border+" "+bg+" url("
            + sprite['image-src'] +
            ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
            + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left;' "
            + title_text
            + right_click_action
            + "onclick='handle_worklist_action(event,"+city_id+","+ z + ");' "
            +"</span></div>";
    }
    empire_list_html += (queue_html +"</td></tr>");      // Add the row
  }
  empire_list_html += "</tbody></table>";
  $("#empire_list").html(empire_list_html);
  //---------------------------------------------------------------------
  if (city_count == 0) {
    $("#empire_table").html("You have no cities.");
  }
  $("#empire_table").tablesorter({theme:"dark", sortList: sortList});

  if (tiny_screen) {
  }
  else if (redux_screen) {
  } else if (wide_screen) {
  }
}
/**************************************************************************
 Handle a worklist action click in Worklist tab
**************************************************************************/
function handle_worklist_action(event,city_id, z)
{
  event.stopPropagation(); // prevent row click / item click from double firing
      //console.log("handle_worklist_action("+cities[city_id]['name']+","+z+")")
  active_city = cities[city_id];
      //console.log("CURPROD.{kind:"+active_city.production_kind+",value:"+active_city.production_value+"}");
      //console.log(active_city.worklist);
  production_selection = empire_worklist_clipboard.slice();  // make a copy of clipboard
  if (event.ctrlKey) {          // Paste clipboard BEFORE this item
    if (z!=-1) {
      worklist_selection = [z];
      city_insert_in_worklist();
    } else { //user clicked on cur_prod not worklist, we have to play a little shell game:
      // Append current city prod into temp. clipboard at last position
      console.log(production_selection)
      const cur_prod = {"kind":active_city['production_kind'], "value":active_city['production_value']};
      production_selection.push(cur_prod);
      console.log(production_selection)
      // Insert new clipboard to top of worklist
      worklist_selection = [0]; // have to reset
      city_insert_in_worklist();
      // Now just delete the current production item to shift it all up
      worklist_selection = [0]; // have to reset
      city_remove_current_prod();
    }
  } else if (event.shiftKey) {  // Paste clipboard AFTER this item
    worklist_selection = [z+1];  // (+1 changes before to after)
    city_insert_in_worklist();
  } else {                      // Remove city worklist item
    if (z==-1) {
      worklist_selection = [0]; // have to reset **************************************************** added mindlessly to test
      city_remove_current_prod(); //user clicked on cur_prod not worklist
    }
    else {
      worklist_selection = [z];
      city_worklist_task_remove();
    }
  }
  //console.log("CURPROD.{kind:"+active_city.production_kind+",value:"+active_city.production_value+"}");
  //console.log(active_city.worklist);
  active_city = null;
  return;
}
/**************************************************************************
 Called when a user taps a BLANK part of the row; does same thing as shift-
   click on a worklist item.  Shift-click will copy whole worklist to
   clipboard. Ctrl-click will "nuke" the current worklist.
**************************************************************************/
function tap_empty_production_row(event, city_id)
{
  event.stopPropagation(); // prevent row click / item click from double firing
  active_city = cities[city_id];

  if (event.shiftKey)
  { // Shift-click: copy worklist to clipboard
    empire_worklist_clipboard = Array.from(active_city['worklist']);
    redraw_improv_clipboard();
  }
  else if (event.ctrlKey)
  { // Remove whole worklist.
    active_city['worklist'] = [];
    send_city_worklist(active_city['id']);
  }
  else
  { // Main function:  append clipboard after worklist
    production_selection = empire_worklist_clipboard.slice();  // make a copy of clipboard

    var z = active_city['worklist'].length-1; // pretend we clicked last item in clipboard
    worklist_selection = [z+1];  // (+1 changes before to after)
    city_insert_in_worklist();
  }
  active_city = null;
}

/**************************************************************************
 Super Panel for improvements in National Production/Worklist tab
**************************************************************************/
function create_worklist_improv_div()
{
  var improvements_html = "";
  var bg = "";
  const border = "border:2px solid #000000;"
  var mag_factor = ($(window).width()-70)/(67*39);
  if (mag_factor > 1.0) mag_factor = 1.0;
  else if (mag_factor < 0.3597) {
    mag_factor *= 2;
    if (mag_factor < 0.3597) mag_factor = 0.3597;
  }
  var magnification = "zoom:"+mag_factor+"; -moz-transform:"+mag_factor+";";
  const constant_title = "CLICK: Copy to clipboard\n\nSHIFT-CLICK: Add to clipboard\n\n"+browser.metaKey+"-CLICK: go to help manual.' ";

  for (var z = 0; z < ruleset_control.num_impr_types; z ++) {
    if (improvements[z].genus<=GENUS_SMALL_WONDER) continue; // filter out great/small wonders from this div

    sprite = get_improvement_image_sprite(improvements[z]);
    if (sprite == null) continue;

    // Filter out obsolete buildings:
    if (improvements[z]['obs_count'] > 0) {
      if (player_invention_state(client.conn.playing, improvements[z]['obs_reqs'][0]['value']) == TECH_KNOWN) {
        continue;
      }
    }
    // Filter out buildings that are two techs or more away
    if (improvements[z]['reqs'].length > 0) {
      var req_state = player_invention_state(client.conn.playing, improvements[z]['reqs'][0]['value']);
      if (req_state != TECH_KNOWN) {
        if (req_state != TECH_PREREQS_KNOWN) continue;
      }
    }
    // Set cell colour/opacity based on player has tech_req
    if (improvements[z]['reqs'].length > 0) {
      if (player_invention_state(client.conn.playing, improvements[z]['reqs'][0]['value']) != TECH_KNOWN) {
        bg = "background:#5003 ";
        //opacity = 1;
      }
      else bg = "background:#EFF4 ";
    } else bg = "background:#EFF4 ";  // some have no reqs
    var title_text = "title='"+html_safe(improvements[z]['name'])+"\n\n"+constant_title;
    var opacity = 1;
    const click_action = "onclick='handle_improv_clipboard(event, "+VUT_IMPROVEMENT+","+ z + ");' "; // copy/add/remove to clipboard < >/<shift>/<ctrl>
    // Put improvement sprite in the cell:
    improvements_html = improvements_html +
      "<div style='cursor:pointer; padding:0px; opacity:"+opacity+"; "+magnification
          +"'><span style='padding:0px; margin:0px; margin-left:-1px; "+border+" "+bg+" url("
          + sprite['image-src'] + ");background-position:-" + sprite['tileset-x'] + "px -"
          + sprite['tileset-y'] + "px;  width: " + sprite['width'] + "px;height: "
          + sprite['height'] + "px;float:left;' "
          + title_text + click_action
          +"</span></div>";
  }
  return improvements_html;
}
/**************************************************************************
 Super Panel for wonders in National Production/Worklist tab
**************************************************************************/
function create_worklist_wonder_div()
{
  var improvements_html = "";
  var bg = "background:#0000 ";
  const border = "border:2px solid #000000;"
  var mag_factor = ($(window).width()-70)/(67*39);
  if (mag_factor > 1.0) mag_factor = 1.0;
  else if (mag_factor < 0.3597) {
    mag_factor *= 2;
    if (mag_factor < 0.3597) mag_factor = 0.3597;
  }
  var magnification = "zoom:"+mag_factor+"; -moz-transform:"+mag_factor+";";
  const constant_title = "CLICK: Copy to clipboard\n\nSHIFT-CLICK: Add to clipboard\n\n"+browser.metaKey+"-CLICK: go to help manual.' ";

  // Create array of owned wonders now: 72 checks instead of 72x72=5184 checks
  var owned_wonders = new Array(ruleset_control.num_impr_types).fill(0);
  for (var w = 0; w < ruleset_control.num_impr_types; w++) {
    owned_wonders[w] = player_has_wonder(client.conn.playing.playerno, w);
  }

  for (var z = 0; z < ruleset_control.num_impr_types; z ++) {
    if (improvements[z].genus>GENUS_SMALL_WONDER) continue; // filter out everything except wonders
    sprite = get_improvement_image_sprite(improvements[z]);
    if (sprite == null) continue;

    // FILTER INAPPROPRIATE WONDERS FROM LIST --------------------------
    // OWNED:
    if (owned_wonders[z]) {
      continue; // Filter out wonders already owned.
    }
    // OBSOLETE:
    if (improvements[z]['obs_count'] > 0) {
      if (player_invention_state(client.conn.playing, improvements[z]['obs_reqs'][0]['value']) == TECH_KNOWN) {
        continue;
      }
    }
    // UNREACHABLE and 2 techs away or more:  (TECHS_PREREQS_KNOWN is 1 away)
    if (improvements[z]['reqs'].length > 0) {
      if (player_invention_state(client.conn.playing, improvements[z]['reqs'][0]['value']) == TECH_UNKNOWN) {
        continue;
      }
    } //------------------------------------------------------------------
    // Great Wonders already built in the world.
    if (improvements[z].genus == GENUS_GREAT_WONDER && world_has_wonder(improvements[z]['name'])) {
      continue;
    } //------------------------------------------------------------------
    // Small Wonders which are only enabled after a duplicate-named Great Wonder has been built in the world
    if (client_rules_flag[CRF_MP2_C]) {
      if (improvements[z]['name'] == "Women's Suffrage"
          && !world_has_wonder("Women's Suffrage​")/*zero-width space at end marks G.W.*/) {
        continue;
      }
    } //------------------------------------------------------------------

    var title_text = "title='"+html_safe(improvements[z]['name'])+"\n\n"+constant_title;
    const click_action = "onclick='handle_improv_clipboard(event, "+VUT_IMPROVEMENT+","+ z + ");' "; // copy/add/remove to clipboard < >/<shift>/<ctrl>
    // Put improvement sprite in the cell:
    improvements_html = improvements_html +
      "<div style='cursor:pointer; opacity: 1.0; padding:0px; "+magnification
          +"'><span style='padding:0px; margin:0px; margin-left:-1px; "+border+" "+bg+" url("
          + sprite['image-src'] + ");background-position:-" + sprite['tileset-x'] + "px -"
          + sprite['tileset-y'] + "px;  width: " + sprite['width'] + "px;height: "
          + sprite['height'] + "px;float:left;' "
          + title_text + click_action
          +"</span></div>";
  }
  return improvements_html;
}

/**************************************************************************
 Super Panel for units in National Production/Worklist tab
**************************************************************************/
function create_worklist_unit_div()
{
  const cur_gov = governments[client.conn.playing['government']];
  const gov_id = players[client.conn.playing.playerno].government;

  var units_html = "";
  var bg = "";
  const border = "border:2px solid #000000;"
  var mag_factor = ($(window).width()-70)/(67*39);
  if (mag_factor > 1.0) mag_factor = 1.0;
  else if (mag_factor < 0.3597) {
    mag_factor *= 2;
    if (mag_factor < 0.3597) mag_factor = 0.3597;
  }
  var magnification = "zoom:"+mag_factor+"; -moz-transform:"+mag_factor+";";
  const constant_title = "CLICK: Copy to clipboard\n\nSHIFT-CLICK: Add to clipboard\n\n"+browser.metaKey+"-CLICK: go to help manual.' ";

  // THIS was a clean-up of DIRTY hard-coding. If it fails, see commits for 23Feb2021 to revert.
  for (var z = 0; z < ruleset_control.num_unit_types; z ++) {
    if (utype_has_flag(unit_types[z],UTYF_NOBUILD)) continue; // Leader, Barbarian Leader, Animals, Tribesmen, etc.
    if (unit_types[z].government_req < GOV_LAST) {             // IF Unit has a government requirement
      if (unit_types[z].goverment_req != gov_id) continue;     // then if it's not GOV_LAST and not the player's GOV, we're not allowed to build.
      // Special case, gov_req AND an impr_req, a "sub-gov activated by an improvement"
      if (unit_types[z]['name'] == "Peasants" && (!player_has_wonder(client.conn.playing.playerno, B_MAGNA_CARTA))) continue;
    }

    // OBSOLETE - See if we have the tech for the unit which obsoletes it:
    const obs_by_type = unit_types[z]['obsoleted_by'];
    if (obs_by_type < ruleset_control.num_unit_types) {  // highest index+1 == flag for never obsolete
      //console.log("Checking "+unit_types[z]['name'])
      if (unit_types[obs_by_type]['tech_requirement']>0) {
        if (player_invention_state(client.conn.playing, unit_types[obs_by_type]['tech_requirement']) == TECH_KNOWN) {
          continue;
        }
      }
    }
    // FARTHER THAN ONE TECH AWAY:
    var req_state = player_invention_state(client.conn.playing,unit_types[z]['tech_requirement']);
    if (req_state != TECH_KNOWN) {
        if (req_state != TECH_PREREQS_KNOWN) continue;
    }
    // -----------------------------------------------------------------------------------------
    sprite = get_unit_type_image_sprite(unit_types[z]);
    if (sprite == null) continue;

    // Set cell colour/opacity based on player has tech_req
    if (unit_types[z]['tech_requirement'] > 0) {
      if (req_state == TECH_PREREQS_KNOWN) {
        bg = "background:#5003 ";
        //opacity = 1;
      }
      else bg = "background:#EFF4 ";
    } else bg = "background:#EFF4 ";  // some have no reqs

    var opacity = 1;
    var title_text="title='"+unit_types[z]['name']+"\n\n"+constant_title;
    const click_action = "onclick='handle_improv_clipboard(event, "+VUT_UTYPE+","+ z + ");' "; // copy/add/remove to clipboard < >/<shift>/<ctrl>
    // Put improvement sprite in the cell:
    units_html = units_html +
      "<div style='cursor:pointer; padding:0px; opacity:"+opacity+"; "+magnification
          +"'><span style='padding:0px; margin:0px; margin-left:-1px; "+border+" "+bg+" url("
          + sprite['image-src'] + ");background-position:-" + sprite['tileset-x'] + "px -"
          + sprite['tileset-y'] + "px;  width: " + sprite['width'] + "px;height: "
          + sprite['height'] + "px;float:left;' "
          + title_text + click_action
          +"</span></div>";
  }
  return units_html;
}
/**************************************************************************
 toggles which upkeep types to show for unit home cities
**************************************************************************/
function toggle_empire_show_upkeep(upkeep_type)
{

  switch (upkeep_type) {
    case "food":
      empire_upkeep_show_food = !empire_upkeep_show_food;
      $("#show_food").prop("checked", empire_upkeep_show_food);
      break;
    case "gold":
      empire_upkeep_show_gold = !empire_upkeep_show_gold;
      $("#show_gold").prop("checked", empire_upkeep_show_gold);
      break;
    case "shields":
      empire_upkeep_show_shields = !empire_upkeep_show_shields;
      $("#show_shield").prop("checked", empire_upkeep_show_shields);
      break;
    case "free":
      empire_upkeep_show_free = !empire_upkeep_show_free;
      $("#show_free").prop("checked", empire_upkeep_show_free);
      break;
    case "zero":
      empire_upkeep_show_zero = !empire_upkeep_show_zero;
      $("#show_zero").prop("checked", empire_upkeep_show_zero);
      break;
  }
  empire_sort_mode = SORT_NONE;
  update_empire_screen();
  empire_sort_mode = SORT_NONE;
}
/**************************************************************************
 Toggle whether to show present buildings
**************************************************************************/
function toggle_empire_show_present_buildings()
{
  empire_show_present_buildings = !empire_show_present_buildings;
  $("#show_pb").prop("checked", empire_show_present_buildings);

  empire_sort_mode = DO_NO_SORT;
  update_empire_screen();
  empire_sort_mode = SORT_NONE;
}
/**************************************************************************
 Toggle whether to show absent buildings
**************************************************************************/
function toggle_empire_show_absent_buildings()
{
  empire_show_absent_buildings = !empire_show_absent_buildings;
  $("#show_ab").prop("checked", empire_show_absent_buildings);

  empire_sort_mode = DO_NO_SORT;
  update_empire_screen();
  empire_sort_mode = SORT_NONE;
}
/**************************************************************************
 Toggle whether to show wonders instead of buildings
**************************************************************************/
function toggle_empire_show_wonders_only()
{
  empire_show_wonders_only = !empire_show_wonders_only;
  $("#show_wonders").prop("checked", empire_show_wonders_only);

  empire_sort_mode = DO_NO_SORT;
  update_empire_screen();
  empire_sort_mode = SORT_NONE;
}
/**************************************************************************
 Toggle whether to show hitpoints on units in Empire tab, applies to all
 modes which show units.
**************************************************************************/
function toggle_empire_show_hitpoints()
{
  empire_show_hitpoints = !empire_show_hitpoints;
  $("#show_hp").prop("checked", empire_show_hitpoints);

  empire_sort_mode = DO_NO_SORT;
  update_empire_screen();
  empire_sort_mode = SORT_NONE;
}
/**************************************************************************
 Toggle whether to show hitpoints on units in Empire tab, applies to all
 modes which show units.
**************************************************************************/
function toggle_empire_show_movepoints()
{
  empire_show_movesleft = !empire_show_movesleft;
  $("#show_mp").prop("checked", empire_show_movesleft);

  empire_sort_mode = DO_NO_SORT;
  update_empire_screen();
  empire_sort_mode = SORT_NONE;
}
/**************************************************************************
 Sort all unit rows in empire tab by Hit points
**************************************************************************/
function empire_sort_hp()
{
  empire_sort_mode = SORT_HP;

  // Sort each unit_type row of units by hitpoints
  for (unit_type_id in unit_types) {
    units_sorted_by_type[unit_type_id].sort(compare_hp_sort);
  }
  update_empire_screen();
  empire_sort_mode = SORT_NONE; // reset so data can be refreshed later
}
function compare_hp_sort(u1, u2)
{ // units with more hp come first
  if (u1['hp'] < u2['hp']) return 1;
  if (u2['hp'] < u1['hp']) return -1;

  // Equal, winner goes to higher vet
  if (u1['veteran'] < u2['veteran']) return 1;
  if (u2['veteran'] < u1['veteran']) return -1;

  // Equal again, winner goes to higher move points
  if (u1['movesleft'] < u2['movesleft']) return 1;
  if (u2['movesleft'] < u1['movesleft']) return -1;

  // Equal in every way, just return 0
  return 0;
}
/**************************************************************************
 Sort all unit rows in empire tab by Hit points
**************************************************************************/
function empire_sort_mp()
{
  empire_sort_mode = SORT_MOVES;

  // Sort each unit_type row of units by hitpoints
  for (unit_type_id in unit_types) {
    units_sorted_by_type[unit_type_id].sort(compare_mp_sort);
  }
  update_empire_screen();
  empire_sort_mode = SORT_NONE; // reset so data can be refreshed later
}
function compare_mp_sort(u1, u2)
{ // units with more moves left come first
  if (u1['movesleft'] < u2['movesleft']) return 1;
  if (u2['movesleft'] < u1['movesleft']) return -1;

  // Equal, winner goes to higher hp
  if (u1['hp'] < u2['hp']) return 1;
  if (u2['hp'] < u1['hp']) return -1;

  // Equal again, winner goes to higher vet
  if (u1['veteran'] < u2['veteran']) return 1;
  if (u2['veteran'] < u1['veteran']) return -1;

  // Equal in every way, just return 0
  return 0;
}
/**************************************************************************
 Sort all unit rows in empire tab by Hit points
**************************************************************************/
function empire_sort_vet()
{
  empire_sort_mode = SORT_VET;

  // Sort each unit_type row of units by hitpoints
  for (unit_type_id in unit_types) {
    units_sorted_by_type[unit_type_id].sort(compare_vet_sort);
  }
  update_empire_screen();
  empire_sort_mode = SORT_NONE; // reset so data can be refreshed later
}
function compare_vet_sort(u1, u2)
{ // units with more veterancy come first
  if (u1['veteran'] < u2['veteran']) return 1;
  if (u2['veteran'] < u1['veteran']) return -1;

  // Equal, winner goes to higher hp
  if (u1['hp'] < u2['hp']) return 1;
  if (u2['hp'] < u1['hp']) return -1;

  // Equal again, winner goes to higher move points
  if (u1['movesleft'] < u2['movesleft']) return 1;
  if (u2['movesleft'] < u1['movesleft']) return -1;

  // Equal in every way, just return 0
  return 0;
}


/**************************************************************************
 Display Empire tab when it's in EMPIRE_UNIT_TYPE_MODE
**************************************************************************/
function empire_unittype_screen(wide_screen,narrow_screen,small_screen,
                                landscape_screen,tiny_screen,redux_screen)
{
  //$("#empire_static").css({"height":"100%", "width":"100%"})
  $("#empire_title").html("National Units");
  if (small_screen) $("#empire_title").hide();
  else $("#empire_title").show();

  var panel_html = "<input id='show_hp' type='checkbox' class='css-checkbox' title='Show hit points' name='chHP' value='false' onclick='toggle_empire_show_hitpoints();'>"
  + "<label for='show_hp' name='show_hp_lbl' class='css-label dark-check-red'>HP</label>&ensp;"
  + "<input id='show_mp' type='checkbox' class='css-checkbox' title='Show movement points' name='chMP' value='false' onclick='toggle_empire_show_movepoints();'>"
  + "<label for='show_mp' name='show_mp_lbl' class='css-label dark-check-green'>Moves</label>";
  // Set up panel functions for National Units
  //var panel_html = "<input type='checkbox' id='show_hp' title='Show hit points' name='cbHP' value='false' onclick='toggle_empire_show_hitpoints();'>HP"
  //               + "<input type='checkbox' id='show_mp' title='Show movement points' name='cbMP' value='false' onclick='toggle_empire_show_movepoints();'>Moves";
  panel_html += "&nbsp;&nbsp;<button id='button_sorthp' type='button' class='button ui-button ui-corner-all ui-widget' onclick='empire_sort_hp();'"
              + "title='Sort units rows by Hitpoints' style='padding:5px; margin-bottom:2px;'>&#x2943HP</button>";
  panel_html += "<button id='button_sortmp' type='button' class='button ui-button ui-corner-all ui-widget' onclick='empire_sort_mp();'"
  + "title='Sort unit rows by Moves Left' style='padding:5px; margin-bottom:2px;'>&#x2943Moves</button>";
  panel_html += "<button id='button_sortvet' type='button' class='button ui-button ui-corner-all ui-widget' onclick='empire_sort_vet();'"
  + "title='Sort unit rows by Vet level' style='padding:5px; margin-bottom:2px;'>&#x2943Vet</button>";
  $("#empire_mode_panel").html(panel_html);
  $("#show_hp").prop("checked", empire_show_hitpoints);
  $("#show_mp").prop("checked", empire_show_movesleft);

  $('#empire_scroll').css({"height": $(window).height()-160, "overflow-y":"scroll", "overflow-x":"hidden" });

  var sortList = [];
  var headers = $('#empire_table thead th');
  headers.filter('.tablesorter-headerAsc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 0]);
  });
  headers.filter('.tablesorter-headerDesc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 1]);
  });

  if (narrow_screen || tiny_screen) $("#empire_prompt").hide();
  else $("#empire_prompt").show();

  const updown_sort_arrows = "<img class='lowered_gov' src='data:image/gif;base64,R0lGODlhFQAJAIAAAP///////yH5BAEAAAEALAAAAAAVAAkAAAIXjI+AywnaYnhUMoqt3gZXPmVg94yJVQAAOw=='>";

  var empire_list_html = "";

  if (true /*wide_screen*/)  // fully standard deluxe wide-screen mode, include all info
  {
    empire_list_html = "<table class='tablesorter-dark' id='empire_table' style='border=0px;border-spacing=0;padding=0;'>"
        + "<thead id='empire_table_head'>"
        + "<tr>"
        + "<th title='Sort by total' style='text-align:right;'>"+updown_sort_arrows+"</th>"
        + "<th title='Sort alphabetically' style=''>Type"+updown_sort_arrows+"</th>"
        + "<th title='Sort by similar types' style='text-align:left; padding-left:10px;'>&nbsp;Units"+updown_sort_arrows+"</th>"
        + "</tr>"
        + "</thead><tbody>";

  } else if (redux_screen) // semi-standard rendition of the above with minor trimming
  { // -1 column (selection box). Economised columns: Sort Arrows, Grows In>>Grows, Name of Production/Image >> Image only, Turns/Progress>>Progress
    //console.log("MODE: Reduced Standard")
  } else {  // tiny - brutally cut non-crucial info
    // -2 columns (selection box, cost). Economised: Sort arrows, Grows In>>grows, Granary>>Grain, Producing>>Output:Image only, Turns/Progress>>Turns
    //console.log("MODE: Small Narrow")
  }

  var adjust_oversize = "";               // for style-injecting margin/alignment adjustment on oversize unit images
  var unit_row_html = "";
  var type_count = 0; // number of types of units (total rows)

  /* Pre-sort units by type to avoid exponentially more iterations:
   * If we are in sort mode, then we already created data and just want to resort it. Otherwise,
     we just arrived and need to refresh it, because units may have changed */
  if (empire_sort_mode)  {
    // do not refresh data: it was just re-sorted for re-display
  } else {
    units_sorted_by_type = [];
    for (var unit_type_id in unit_types) {
      units_sorted_by_type[unit_type_id] = []; // new blank array for each unit of this unit type
    }
    for (var unit_id in units) {  // pre-sort units belonging to player, by type, into this array
      var sunit = units[unit_id];
      if (client.conn.playing != null && unit_owner(sunit).playerno == client.conn.playing.playerno) {
        units_sorted_by_type[sunit['type']].push(sunit);
      }
    }
  }

  var ptype_img_html = "";
  var hit_point_html = "";
  var moves_left_html = "";
  var vet_badge_html = "";

  var count = new Array(unit_types.length); // keeps track of how many units of each type
  for (var unit_type_id in unit_types) { //rows (unit types)
    count[unit_type_id] = 0;

    var rheight = 28 * Math.ceil( (units_sorted_by_type[unit_type_id].length*40) /  ($(window).width()-140) );
    unit_row_html = "<tr class='cities_row' style='height:"+rheight+"px;'>";
    unit_row_html += "<td style='font-size:85%; text-align:right;' id='ucount"+unit_type_id+"'></td>";
    unit_row_html += "<td style='padding-left:10px; padding-right:10px; font-size:85%; color:#d0d0d0'>"+unit_types[unit_type_id]['name']+"</td>";
    unit_row_html += "<td style='padding-left:10px;' id='u"+unit_type_id+"'>";

    for (var unit_index in units_sorted_by_type[unit_type_id]) { //row elements (individual units)
      var punit = units_sorted_by_type[unit_type_id][unit_index];

      count[unit_type_id]++; //to do: this can be summed in the earlier iteration and we can skip the step of injecting html later
      var ptype = unit_type(punit);

      // Generate micro-sprite
      var ptype_sprite = {"type":ptype,"sprite":get_unit_type_image_sprite(ptype)};
      var hptype_sprite = {"type":ptype,"sprite":get_full_hp_sprite(punit)};
      var mptype_sprite = {"type":ptype,"sprite":get_full_mp_sprite(punit)};
      var vtype_sprite = {"type":ptype,"sprite":get_full_vet_sprite(punit)};

      if (ptype_sprite != null) {
        sprite = ptype_sprite['sprite'];
        var hp_sprite = hptype_sprite['sprite'];
        var mp_sprite = mptype_sprite['sprite'];
        var vet_sprite = vtype_sprite['sprite'];

        adjust_oversize = (sprite['width']>64) ? -34 : -26;  // "oversize" images space differently

        ptype_img_html = "<span class='prod_img' title='"+html_safe(get_unit_city_info(punit))+"' style='float:left; padding-left:0px padding-right:0px; content-align:right; margin-top:-8px;"
                + "margin-left:"+adjust_oversize+"px' margin-right:-4px; onclick='city_dialog_activate_unit(event, units[" + punit['id'] + "]);'>"
                + "<div style='float:left; content-align:left;"
                + "background: transparent url("
                + sprite['image-src']
                + ");transform: scale(0.625); background-position:-" + sprite['tileset-x'] + "px -" + (sprite['tileset-y'])
                + "px;  width: " + (sprite['width']) + "px;height: " + (sprite['height']) + "px;"
                + " content-align: left;"
                + "vertical-align:top; float:left;'>"
                + "</div>";

        hit_point_html = "<div style='margin-left:-83px; margin-top:-10px; margin-right:-24px; float:left; content-align:left;"
                + "background: transparent url("
                + hp_sprite['image-src']
                + ");transform: scale(0.625); background-position:-" + hp_sprite['tileset-x'] + "px -" + (hp_sprite['tileset-y'])
                + "px;  width: " + (hp_sprite['width']) + "px;height: " + (hp_sprite['height']) + "px;"
                + " content-align: left;"
                + "vertical-align:top; float:left;'>"
                + "</div>";

        moves_left_html = "<div style='margin-left:-83px; margin-top:-6px; margin-right:-24px; float:left; content-align:left;"
                + "background: transparent url("
                + mp_sprite['image-src']
                + ");transform: scale(0.625); background-position:-" + mp_sprite['tileset-x'] + "px -" + (mp_sprite['tileset-y'])
                + "px;  width: " + (mp_sprite['width']) + "px;height: " + (mp_sprite['height']) + "px;"
                + " content-align: left;"
                + "vertical-align:top; float:left;'>"
                + "</div>";

        if (punit['veteran'] > 0) {
          vet_badge_html = "<div style='margin-left:-50px; margin-top:-16px; margin-right: -24px; float:left; content-align:left;"
                + "background: transparent url("
                + vet_sprite['image-src']
                + ");transform: scale(0.7); background-position:-" + vet_sprite['tileset-x'] + "px -" + (vet_sprite['tileset-y'])
                + "px;  width: " + (vet_sprite['width']) + "px;height: " + (vet_sprite['height']) + "px;"
                + " content-align: left;"
                + "vertical-align:top; float:left;'>"
                + "</div>";
        } else vet_badge_html = "";
      }

      if (empire_show_movesleft) ptype_img_html+=moves_left_html;
      if (empire_show_hitpoints) ptype_img_html+=hit_point_html;
      if (punit['veteran'] > 0) ptype_img_html+=vet_badge_html;

      unit_row_html += "<span id='u_img" + unit_type_id + "'>"
        + "<span style='font-size:1%; color: rgba(0, 0, 0, 0);'>"+(String.fromCharCode(65+unit_type_id))+"</span>"+ptype_img_html+"</span></span>";
        //invisible tiny char for sorting by native unit_type order; defeats js sorting 10 as prior to 2,3,4,...

    }
    // only add a row if we have more than 0 units of this type:
    if (count[unit_type_id]>0) {
      type_count++;
      empire_list_html += (unit_row_html +"</td></tr>");
    }
  }
  empire_list_html += "</tbody></table>";

  $("#empire_list").html(empire_list_html);

 // Inject the unit type counts after the list becomes active HTML
  // (didn't know counts for rows in the middle of constructing)
  for (unit_type_id in unit_types) {
    if (count[unit_type_id] > 0)
      $("#ucount"+unit_type_id).html(count[unit_type_id]+"&nbsp;");
  }

  if (type_count == 0) {
    $("#empire_table").html("You have no units.");
  }

  $("#empire_table").tablesorter({theme:"dark", sortList: sortList});

  if (tiny_screen) {
  }
  else if (redux_screen) {
  } else if (wide_screen) {
  }
}

/**************************************************************************
 Called when button in #empire_mode_options is pressed to change mode:
**************************************************************************/
function change_empire_mode(mode_selected)
{
  empire_mode = mode_selected;
  update_empire_screen();
}

/**************************************************************************
 Callback to handle keyboard events for the empire tab: NOT IMPLEMENTED YET
**************************************************************************/
/*
function empire_keyboard_listener(ev)
{
  // Check if focus is in chat field, where these keyboard events are ignored.
  if ($('input:focus').length > 0 || !keyboard_input) return;

  if (C_S_RUNNING != client_state()) return;

  var keyboard_key = String.fromCharCode(ev.keyCode);
  var key_code = ev.keyCode;

  switch (key_code) {
    case 0:
      ev.stopImmediatePropagation();
      setTimeout(function(){

      }, 300);
     break;
  }
  switch (keyboard_key) {

    case 'W': // same command as ESC above (code 27)
      //ev.stopPropagation();
      //chatbox_scroll_to_bottom(false);
      break;
  }
}
*/
