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

var toplevel_menu_items = ["help_terrain", "help_economy", "help_cities",
    "help_city_improvements", "help_wonders_of_the_world", "help_units",
    "help_combat", "help_technology", "help_government"];
var hidden_menu_items = ["help_connecting", "help_languages", "help_governor",
    "help_chatline", "help_about", "help_worklist_editor", "help_nations",
    "help_copying", "help_overview", "help_strategy_and_tactics",
    "help_economy", "help_goods", "help_cities", "help_combat",
    "help_policies", "help_resources"
  ];

const terrain_help = {
  "Lake1": "Fish:  3/0/2  Harbor: 4/0/2  +Offshore Platform: 4/1/2",
  "Ocean1": "Fish:  3/0/2  Harbor: 4/0/2  +Offshore Platform: 4/1/2",
  "Ocean2": "Whales:  2/1/2  Harbor: 3/1/2  +Offshore Platform: 3/2/2",
  "Forest1": "Pheasant:  3/2/0",
  "Forest2": "Silk:  1/2/3",
  "Forest3": "Wild Boar:  4/2/0",
  "Forest4": "Berries:  2/2/2",
  "Grassland1": "Resources:  2/1/0  Road+Irrigate: 3/1/1",
  "Grassland2": "Deer:  5/0/0",
  "Hills1": "Coal:  1/2/0  Mined: 1/5/0",
  "Hills2": "Wine:  1/0/4  Mined: 1/3/4",
  "Hills3": "Mountain Goat:  3/1/0",
  "Jungle1": "Fruit:  5/1/2",
  "Jungle2": "Gems:  1/1/5",
  "Jungle3": "Rubber:  1/3/2",
  "Plains1": "Wheat:  3/1/0.  Road+Irrigate: 4/1/1",
  "Plains2": "Buffalo:  1/3/0.  Road+Irrigate: 2/3/1",
  "Desert1": "Oasis:  3/1/0.  Road+Irrigate:  4/1/1.  Road+Mined: 3/2/1",
  "Desert2": "Oil:  0/4/0.  Road+Irrigate:  1/4/1.  Road+Mined:  0/5/1.  +Refining:  0/6/1",
  "Desert3": "River:  0/1/1.  Bridge+Irrigate:  2/1/2.  +Irrigated City:  3/1/2",
  "Desert4": "Hippopotamus:  3/1/1",
  "Mountains1": "Iron:  0/4/0.  Mined: 0/5/0",
  "Mountains2": "Gold:  0/1/8.  Mined: 0/2/8",
  "Mountains3": "Mountain Goat:  3/1/0",
  "Swamp1": "Spice:  3/0/4",
  "Swamp2": "Peat:  1/4/0",
  "Tundra1": "Elk:  3/2/0.  Road+Irrigate: 4/2/1",
  "Tundra2": "Furs:  2/1/3.  Road+Irrigate: 3/1/4",
  "Tundra3": "Gold:  0/0/8.  Road+Irrigate: 2/0/9",
  "Arctic1": "Oil:  0/3/0.  Mined: 0/6/0 (requires Refining)",
  "Arctic2": "Ivory:  1/1/4",
  "Arctic3": "Furs:  2/1/3"
};

var max_help_pane_width;
var MAX_ALLOWED_HELP_WIDTH = 984;

/**************************************************************************
 Show the Freeciv-web Help Dialog
**************************************************************************/
function show_help()
{
  $("#tabs-hel").show();
  $("#help_footer").hide();$("#help_footer").remove();
  $("#help_menu").remove();
  $("#help_info_page").remove();
  $("<ul id='help_menu'></ul><div id='help_info_page'></div>").appendTo("#tabs-hel");

  generate_help_menu("help_gen_ruleset");

  for (var sec_id in helpdata_order) {
    var key = helpdata_order[sec_id];
    if (sec_id)

    if (hidden_menu_items.indexOf(key) > -1 || key == "help_gen_ruleset") {
      continue;
    } else if (key.indexOf("help_gen") != -1) {
      generate_help_menu(key);
    } else if (toplevel_menu_items.indexOf(key) > -1) {
      generate_help_toplevel(key);
    } else {
      var parent_key = find_parent_help_key(key);
      $("<li id='" + key +  "' data-helptag='" + key +  "'>"
        + helpdata_tag_to_title(key) + "</li>").appendTo(parent_key);
    }
  }

  $("#help_menu").menu({
    select: function( event, ui ) {handle_help_menu_select(ui); }
  });

  show_help_intro();
  $("#tabs-hel").css("height", $(window).height() - 60);

  if (is_small_screen()) {
    $("#help_info_page").css("max-width", $(window).width()-165);
    $("#help_info_page").css({"margin":"0px","padding":"0px","font-size":"90%"});
    $("#help_footer").remove();
    $("#help_footer").hide();
  } else {
    max_help_pane_width = $(window).width() - $("#help_menu").width() - 60;
    if (max_help_pane_width > MAX_ALLOWED_HELP_WIDTH)
      max_help_pane_width = MAX_ALLOWED_HELP_WIDTH;
    $("#help_info_page").css("max-width", max_help_pane_width);
    $("#help_footer").show();
  }
}

/**************************************************************************
...
**************************************************************************/
function show_help_intro()
{
  $.get( "/docs/help_intro.txt", function( data ) {
      $("#help_info_page").html(data);
      var help_banner = "/static/images/fcw-front-page"
      + Math.ceil(Math.random()*61) + ".png";

      $("#help_banner").prop("src",help_banner);
  });
}

/**************************************************************************
...
**************************************************************************/
function generate_help_menu(key)
{
  var impr_id;
  var improvement;
  if (key == "help_gen_terrain") {
    for (var terrain_id in terrains) {
      var terrain = terrains[terrain_id];
      $("<li data-helptag='" + key + "_" + terrain['id'] + "'>"
        + terrain['name'] + "</li>").appendTo("#help_terrain_ul");
    }
  } else if (key == "help_gen_improvements") {
    // Alphabetically sort buildings (because some are unalphabetically grouped by similar type for prod list.)
    var sortedBuildings = []; const impr_idx = 0;
    for (impr_id in improvements) {
      sortedBuildings.push([impr_id, improvements[impr_id]]);
    }
    sortedBuildings.sort(function(a, b) {
      return (a[1]['name'] > b[1]['name'] ? 1 : -1);
    });
    // done sorting
    for (id in sortedBuildings) {
      improvement = improvements[sortedBuildings[id][impr_idx]];
      if (is_wonder(improvement)) continue;

      // Suppress improvements if server settings don't allow them:
      if (!server_settings['nukes_major']['val']
          && improvement['name'] == "Enrichment Facility") {
            continue; // if major nukes are OFF, suppress illegal prod choice.
      }

      $("<li data-helptag='" + key + "_" + improvement['id'] + "'>"
        + improvement['name'] + "</li>").appendTo("#help_city_improvements_ul");
    }
  } else if (key == "help_gen_wonders") {
    for (impr_id in improvements) {
      improvement = improvements[impr_id];
      if (!is_wonder(improvement)) continue;

      //check for 0-width space for virtual duplicates (required because server has no world-range on small wonders)
      s = improvement['name'].slice(-1)
      if (s != alphanumeric_cleaner(s)) continue;

      // Suppress improvements if server settings don't allow them:
      if (!server_settings['nukes_minor']['val']
          && improvement['name'] == "Manhattan Project") {
          continue; // if major nukes are OFF, suppress illegal prod choice.
      }

      $("<li data-helptag='" + key + "_" + improvement['id'] + "'>"
        + improvement['name'] + "</li>").appendTo("#help_wonders_of_the_world_ul");
    }
  } else if (key == "help_gen_units") {
    for (var i = 0; i < unittype_ids_alphabetic().length; i++) {
      var unit_id = unittype_ids_alphabetic()[i];
      var punit_type = unit_types[unit_id];

      if (utype_has_flag(punit_type, UTYF_NUCLEAR)) {
        if (!server_settings['nukes_minor']['val']) continue; // Nukes totally turned off in this game, skip them
        if (!server_settings['nukes_major']['val']) { // bombard_rate !=0 or !=-1 is a major nuke, skip if game settings have turned it off.
          if (punit_type['bombard_rate']>0) continue;
          if (punit_type['bombard_rate']<-1) continue;
        }
      }

      $("<li data-helptag='" + key + "_" + punit_type['id'] + "'>"
         + punit_type['name'] + "</li>").appendTo("#help_units_ul");
    }
  } else if (key == "help_gen_techs") {
    for (var tech_id in techs) {
      var tech = techs[tech_id];
      if (tech_id == 0) continue;
      $("<li data-helptag='" + key + "_" + tech['id'] + "'>"
          + tech['name'] + "</li>").appendTo("#help_technology_ul");
    }
  } else if (key == "help_gen_governments") {
    for (var gov_id in governments) {
      var pgov = governments[gov_id];

      $("<li data-helptag='" + key + "_" + pgov['id'] + "'>"
          + pgov['name'] + "</li>").appendTo("#help_government_ul");
    }
  } else if (key == "help_gen_ruleset") {
    $("<li id='" + key +  "' data-helptag='" + key +  "'>"
       + "Manual" + "</li>").appendTo(
          find_parent_help_key(key));
  }
}

/**************************************************************************
...
**************************************************************************/
function render_sprite(sprite)
{
  var msg = "<div class='help_unit_image' style=' background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;'"
           +"></div>";
  return msg;
}

/**************************************************************************
...
**************************************************************************/
function generate_help_toplevel(key)
{
  var parent_key = find_parent_help_key(key);
  $("<li id='" + key +  "' data-helptag='" + key +  "'>"
     + helpdata_tag_to_title(key) + "</li>").appendTo(parent_key);
  $("<ul id='" + key + "_ul' class='help_submenu'></ul>").appendTo("#" + key);
}

/**************************************************************************
...
**************************************************************************/
function find_parent_help_key(key)
{
  if (key == "help_terrain_alterations") {
    return "#help_terrain_ul";
  } else if (key == "help_villages" || key == "help_borders") {
    return "#help_terrain_ul";
  } else if (key == "help_food" || key == "help_production" || key == "help_trade") {
    return "#help_economy_ul";
  } else if (key == "help_specialists" || key == "help_happiness" || key == "help_pollution"
        || key == "help_plague" || key == "help_migration") {
    return "#help_cities_ul";
  } else if (key == "help_combat_example_1" || key == "help_combat_example_2") {
    return "#help_combat_ul";
  } else  {
    return "#help_menu";
  }
}

/**************************************************************************
...
**************************************************************************/
function handle_help_menu_select( ui )
{
  var selected_tag = $(ui.item).data("helptag");
  if (selected_tag.indexOf("help_gen") != -1) {
    generate_help_text(selected_tag);
  } else if (selected_tag == "help_copying") {
    $.get( "/docs/LICENSE.txt", function( data ) {
      $("#help_info_page").html("<h1>Freeciv-Web License</h1>" + data.replace(/\n/g, "<br>"));
    });
    clear_sidebar();
  } else if (selected_tag == "help_controls") {
    $.get( "/docs/controls.txt", function( data ) {
      $("#help_info_page").html(data.replace(/\n/g, ""));
    });
    clear_sidebar();
  } else {
    var msg = "<h1>" + helpdata_tag_to_title(selected_tag) + "</h1>" + helpdata[selected_tag]['text'];
    $("#help_info_page").html(msg);
  }

  $("#help_info_page").focus();
}

/**************************************************************************
  Clears sidebar if on mobile, to make room for other stuff.
**************************************************************************/
function clear_sidebar()
{
  if (is_small_screen())
  {
    $("#help_info_page").css("max-width",$(window).width());
    $("#help_info_page").css("padding","1px");
    $("#help_menu").hide();
  }
}

/**************************************************************************
  Returns a button that shows the extracted Wikipedia data about an item.

  Returns an empty string ("") if no such data exists.
**************************************************************************/
function wiki_on_item_button(item_name)
{
  /* Item name shouldn't be a qualified string. */
  item_name = string_unqualify(item_name);

  if (freeciv_wiki_docs[item_name] == null) {
    console.log("No wiki data about " + item_name);
    return "";
  }

  return ("<button class='help_button' onclick=\"show_wikipedia_dialog('"
          + item_name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
          + "');\">Wikipedia on " + item_name +  "</button>");
}

/**************************************************************************
  Format a long text description of the current ruleset.
**************************************************************************/
function helpdata_format_current_ruleset()
{
  var msg = "";
  if (ruleset_control != null) {
    msg += "<h1>" + ruleset_control['name'] + "</h1>";
  }
  if (ruleset_summary != null) {
    msg += "<p>" + ruleset_summary.replace(/\n/g, "<br>") + "</p>";
  }
  if (ruleset_description != null) {
    msg += "<p>" + ruleset_description.replace(/\n/g, "<br>") + "</p>";
  }
  return msg;
}

/**************************************************************************
...
**************************************************************************/
function generate_help_text(key)
{
  var flx_tab = "0.30";  // alignment spacing for unit stats
  var pane_class = "helptext_pane";
  // Temporarily maximize horizontal space for mobile
  if (is_small_screen())
  {
    $("#help_info_page").css("max-width",$(window).width());
    $("#help_info_page").css("padding","1px");
    $("#help_menu").hide();
    flx_tab = "0.55";
    pane_class += "_mobile";
  }

  var rulesetdir = ruledir_from_ruleset_name(ruleset_control['name'], "");
  var msg = "";
  const hr = "<hr style='border-top: 1px solid #000'>";

  if (key.indexOf("help_gen_terrain") != -1) {
    var terrain = terrains[parseInt(key.replace("help_gen_terrain_", ""))];
    msg = "<h1>" + terrain['name'] + "</h1>"
      + "<img src='/images/terrain/"+terrain['name'].toLowerCase().replace(" ","")+".png'>"
      + "<div class='"+pane_class+"'>"
      + cleaned_text(terrain['helptext'])
	    + "<br><br>"
      + "<table class='terrain_chart'>"
      + "<tr><td>Movement cost:</td>" + "<td>"
      + (server_settings.move_cost_in_frags.val ? move_points_text(terrain['movement_cost']) : terrain['movement_cost']) + "</td></tr>"
	    + "<tr><td>Defense bonus:</td>" + "<td>" + terrain['defense_bonus']+"%" + "</td></tr>"
	    + "<tr><td>Base Output:</td>" +"<td>"
        + "<span title='Base Food Output' style='cursor: help; font-size:120%; font-family: Helvetica; color:#000; background-color:#40ff40'>&hairsp;"+ terrain['output'][0] + "&hairsp;</span>"
        + "<span title='Base Shield Output' style='cursor: help; font-size:120%; font-family: Helvetica; color:#000; background-color:#f0f0f0'>&hairsp;"+ terrain['output'][1] + "&hairsp;</span>"
        + "<span title='Base Trade Output' style='cursor: help; font-size:120%; font-family: Helvetica; color:#000; background-color:#f8f020'>&hairsp;"+ terrain['output'][2] + "&hairsp;</span>"
      + "</td></tr>"

    let divisor = 1; if (client_rules_flag[CRF_2X_MOVES]) divisor = 2;
    msg += ""
    + (terrain.road_time ? ("<tr><td>Road:</td><td>"
         + "+" + terrain.road_output_incr_pct[2]/100
         + "<img style='margin-top:-5px;margin-bottom:-5px' src='/images/e/trade.png'></td><td>"
         + terrain.road_time/divisor + " worker-turns</td></tr>") : "")

    + (terrain.irrigation_time && terrain.irrigation_result == terrain.id
        ? ("<tr><td>Irrigation:</td><td>"
           + "+" + terrain.irrigation_food_incr
           + "<img style='margin-top:-5px;margin-bottom:-5px' src='/images/e/food.png'>" + "</td><td>"
           + terrain.irrigation_time/divisor + " worker-turns") + "</td></tr>"
        : "")

    + (terrain.irrigation_time && terrain.irrigation_result != terrain.id ? ("<tr><td>Cultivation creates:</td><td>"
        + "<img style='margin-bottom:-5px;margin-top:-5px' src='/images/e/"
        + terrains[terrain.irrigation_result].name.toLowerCase().replace(" ","")+".png'> &nbsp;"
        + terrains[terrain.irrigation_result].name + "</td><td>"
        + terrain.irrigation_time/divisor + " worker-turns"
        + "</td></tr>") : "")

    + (terrain.mining_time && terrain.mining_result == terrain.id
        ? ("<tr><td>Mining:</td><td>"
           + "+" + terrain.mining_shield_incr
           + "<img style='margin-top:-5px;margin-bottom:-5px' src='/images/e/shield.png'>" + "</td><td>"
           + terrain.mining_time/divisor + " worker-turns") + "</td></tr>"
        : "")

    + (terrain.mining_time && terrain.mining_result != terrain.id ? ("<tr><td>Planting creates:</td><td>"
        + "<img style='margin-bottom:-5px;margin-top:-5px' src='/images/e/"
        + terrains[terrain.mining_result].name.toLowerCase().replace(" ","")+".png'> &nbsp;"
        + terrains[terrain.mining_result].name + "</td><td>"
        + terrain.mining_time/divisor + " worker-turns"
        + "</td></tr>") : "")

    + (terrain.transform_time && terrain.transform_result != terrain.id ? ("<tr><td>Transforms to:</td><td>"
        + "<img style='margin-bottom:-5px;margin-top:-5px' src='/images/e/"
        + terrains[terrain.transform_result].name.toLowerCase().replace(" ","")+".png'> &nbsp;"
        + terrains[terrain.transform_result].name + "</td><td>"
        + terrain.transform_time/divisor/2 + " engineer-turns"
        + "</td></tr>") : "");
    msg += "</table>"

    let num_resources = 0;
    switch (terrain.name) {
      // TODO: extract this properly from ruleset somehow
      case "Lake":
        num_resources = 1;
        break;
      case "Grassland":
        num_resources = 1;
        if (client_rules_flag[CRF_MP2_B]) num_resources++;
        break;
      case "Glacier":
      case "Arctic":
        num_resources = 2;
        if (client_rules_flag[CRF_MP2_B]) num_resources++;
        break;
      case "Mountains":
      case "Hills":
        num_resources = 2;
        if (client_rules_flag[CRF_MP2_D]) num_resources++;
        break;
      case "Plains":
      case "Swamp":
      case "Ocean":
        num_resources = 2;
        break;
      case "Desert":
        num_resources = 2;
        if (client_rules_flag[CRF_MP2_A]) num_resources ++;
        if (client_rules_flag[CRF_MP2_D]) num_resources ++;
        break;
      case "Tundra":
      case "Jungle":
        num_resources = 3;
        if (!client_rules_flag[CRF_MP2_A]) num_resources = 2;
        break;
      case "Forest":
        num_resources = 3;
        if (client_rules_flag[CRF_MP2_C]) num_resources ++;
        if (!client_rules_flag[CRF_MP2_B]) num_resources = 2;
        break;
      }
    if (num_resources) msg += "<br>Special resources:<br>";
    // MP2 rulesets.
    if (client_rules_flag[CRF_MP2]) {
      for (let r=1; r <= num_resources; r++) {
        msg += "<img style='cursor:help' title='"
            + (client_rules_flag[CRF_MP2] ? terrain_help[terrain.name+r] : "")
            + "' src='/images/terrain/"+terrain.name.toLowerCase().replace(" ","")+r+".png'>"
      }
    }
    // General construction of terrain help for other rulesets: TODO: when we can extract an extra sprite and put into a
    // <img> element with position:absolute; left:r*96, then helptext_pane class gets property position:relative, we can
    // put pretty images like the mp2 stuff above (and remove all hardcoding too)
    else {
      msg += "<table><tr>"
      for (let r=0; r < terrain.resources.length; r++) {
        msg += "<td>"
        var extra_name = extras[terrain.resources[r]].name;
        if (extra_name.startsWith("?")) extra_name = extra_name.split(":")[1]; // chops out first part of "?animals:Game"
        msg += extra_name +":</td><td>"
        + "<span title='Base Food Output' style='cursor: help; font-size:120%; font-family: Helvetica; color:#000; background-color:#40ff40'>&hairsp;"+ (terrain.output[0] + resources[terrain.resources[r]].output[0]) + "&hairsp;</span>"
        + "<span title='Base Shield Output' style='cursor: help; font-size:120%; font-family: Helvetica; color:#000; background-color:#f0f0f0'>&hairsp;"+ (terrain.output[1] + resources[terrain.resources[r]].output[1]) + "&hairsp;</span>"
        + "<span title='Base Trade Output' style='cursor: help; font-size:120%; font-family: Helvetica; color:#000; background-color:#f8f020'>&hairsp;"+ (terrain.output[2] + resources[terrain.resources[r]].output[2]) + "&hairsp;</span>"
        msg += "</td>"
      }
      msg += "</tr></table>"
    }

    msg += "</div>";
  } else if (key.indexOf("help_gen_improvements") != -1 || key.indexOf("help_gen_wonders") != -1) {
    var improvement = improvements[parseInt(key.replace("help_gen_wonders_", "").replace("help_gen_improvements_", ""))];
    msg = "<h1>" + improvement['name'] + "</h1>"+"<div class='"+pane_class+"'>"
	    + render_sprite(get_improvement_image_sprite(improvement)) + "<br>"
	    + cleaned_helptext(improvement['helptext'])
            + "<b><br><br>Cost: " + improvement['build_cost']
            + "<br>Upkeep: " + improvement['upkeep'];
    var reqs = get_improvement_requirements(improvement['id']);
    if (reqs != null) {
      msg += "<br>Requirements: ";
      for (var n = 0; n < reqs.length; n++) {
       msg += techs[reqs[n]]['name'] + " ";
      }
    }
    msg += "<br><br></b></div>";
    msg += wiki_on_item_button(improvement['name']);
  } else if (key.indexOf("help_gen_units") != -1) {
    var obsolete_by;
    var punit_type
        = unit_types[parseInt(key.replace("help_gen_units_", ""))];
    var punit_class
        = unit_classes[punit_type['unit_class_id']];
    var pstats = utype_get_extra_stats(punit_type);
    var bstats = utype_get_bombard_stats(punit_type);
    var flex = " style='display:flex;' ";
    var span1 = "<span style='flex:"+flx_tab+";'>";
    //var span2 = "<span style='font-weight:bold; color:#48F;'>";
    var span2 = "<span style='font-family:Helvetica; font-weight:bold; color:#48F;'>";
    var span2_small = "<span style='font-family:Helvetica; font-weight:bold; font-size:90%; color:#48F;'>";
    var span_end = "</span>";
    var div_end = "</span></div>"

    msg = "<h1 style='margin-top:0px;font-size:190%'>" + punit_type['name'] + "</h1>";
    msg += "<div style='margin-bottom:10px;margin-top:-10px'>"+render_sprite(get_unit_type_image_sprite(punit_type))+"</div>";
    //msg += "<br>";
    msg += "<div id='manual_non_helptext_facts' style='max-width:"+max_help_pane_width+"px;'>";
    // COST
    msg += "<div"+flex+"id='utype_fact_cost'>";
    msg += span1 + "Cost: " + span_end + span2 + punit_type['build_cost'] + div_end;
    // ATTACK
    msg += "<div"+flex+" id='utype_fact_attack_str'>";
      // Make manual properly display decimal attack strength on this unit
      // Display base attack relative to v0 vet power which may be non-100:
      var as = fractionalize(utype_real_base_attack_strength(punit_type));
      if (pstats.max_attacks>0) {
        as += " <span style='color:white'>(max. "+pstats.max_attacks+" attack"+(pstats.max_attacks>1?"s":"")+" per turn)</span>"
      }
    msg += span1 + "Attack: " + span_end + span2 + as + div_end;
    // DEFENSE
    msg += "<div"+flex+" id='utype_fact_defense_str'>";
      // Display base attack relative to v0 vet power which may be non-100:
      var ds = fractionalize(utype_real_base_defense_strength(punit_type));
    msg += span1 + "Defense: " + span_end + span2 + ds + div_end;
    // FIREPOWER
    msg += "<div"+flex+" id='utype_fact_firepower'>";
    msg += span1 + "Firepower: " + span_end + span2 + punit_type['firepower'] + div_end;
    // HITPOINTS
    msg += "<div"+flex+" id='utype_fact_hp'>";
    msg += span1 + "Hitpoints: " + span_end + span2 + punit_type['hp'] + div_end;
    // MOVE RATE
    msg += "<div"+flex+" id='utype_fact_move_rate'>";
    var move_bonus = parseInt(punit_type['move_bonus'][0]) ? parseInt(punit_type['move_bonus'][0]) : 0;
    var move_rate = ""; move_rate += move_points_text((parseInt(punit_type['move_rate'])+move_bonus), true);
    msg += span1+"Moves: " + span_end + span2
        + String(move_rate) + div_end;
    // VISION
    msg += "<div"+flex+" id='utype_fact_vision'>";
    msg += span1 + "Vision: " + span_end + span2 + Math.sqrt(parseInt(punit_type['vision_radius_sq'])).toFixed(2) + " tiles" + div_end;
    // FUEL
    if (punit_type['fuel']>0) {
      msg += "<div"+flex+" id='utype_fact_fuel'>";
      msg += span1 + "Fuel: " + span_end + span2 + punit_type['fuel'];
      msg += div_end;
    }
    // CARGO CAPACITY
    if (punit_type['transport_capacity']>0) {
      msg += "<div"+flex+" id='utype_fact_cargo'>";
      msg += span1 + "Cargo: " + span_end + span2 + punit_type['transport_capacity'];
      msg += div_end;
    }
    // MIN_SPEED
    msg += "<div"+flex+" id='utype_fact_minspeed'>";
    msg += span1 + "Min_speed: " + span_end + span2;
    if (utype_has_class_flag(punit_type, UCF_DAMAGE_SLOWS)) {
      if (punit_type.min_speed) {
        msg += move_points_text(punit_type['min_speed'],false); // see effects.js::effects_set_min_speeds()
      } else { // shouldn't happen; compatabile with client prior to effects_set_min_speeds()
        msg += move_points_text(punit_class['min_speed'],false);
      }
    }
    else msg += "100%";
    msg += div_end;
    // UPKEEP
    msg += "<div"+flex+" id='utype_fact_upkeep'></span></div>";
    // iPILLAGE
    if (pstats.iPillage) {
      msg += "<div"+flex+" id='utype_fact_ipillage'>";
      msg += span1 + "iPillage &nbsp;: "+ span_end + span2;
      msg += pstats.iPillage_odds+"% odds. "
          + pstats.iPillage_moves + (pstats.iPillage_moves > 1 ? " moves.": " move.");
      if (pstats.iPillage_random_targets)
        msg+= " " + pstats.iPillage_random_targets + " random " +
         (pstats.iPillage_random_targets > 1 ? "targets" : "target");
      msg += div_end;
    }
    // BOMBARD
    if (utype_has_flag(punit_type, UTYF_BOMBARDER)
        || punit_type.bombard_rate > 0) {
      var bombard_name = utype_get_bombard_name(punit_type);
      msg += "<div"+flex+" id='utype_fact_bombard'>";
      msg += span1 + bombard_name.replace(" ", "&nbsp;") +":&nbsp;&nbsp;"+ span_end + span2_small;

      msg += punit_type['bombard_rate']
          + (punit_type['bombard_rate'] > 1 ? " rounds. " : " round. ");

      if (pstats.bombard_retaliate_rounds) {
        if (pstats.bombard_retaliate_rounds == punit_type['bombard_rate']) {
          msg += "(+SUD). "
        } else {
          msg += "(" + pstats.bombard_retaliate_rounds;
          msg += (pstats.bombard_retaliate_rounds > 1 ? " rounds SUD). " : " round SUD). ");
        }
      }

      if (bstats.bombard_primary_targets) {
        msg += bstats.bombard_primary_targets;
        msg += (bstats.bombard_primary_targets > 1 ? " targets. " : " target. ");
      }
      else
        msg += "ALL targets. ";

      if (bstats.bombard_primary_kills) {
        msg += bstats.bombard_primary_kills;
        msg += (bstats.bombard_primary_kills > 1 ? " kills. " : " kill. ");
      }
      else
        msg += "No kills. "

      if (punit_type.bombard_move_cost)
        msg += move_points_text(punit_type.bombard_move_cost, false)
            + (punit_type.bombard_move_cost > SINGLE_MOVE ? " moves." : " move.");
      else
        msg += move_points_text(punit_type['move_rate'], false)+" moves.";

      msg += div_end;
    } else if (pstats.bombard_retaliate_rounds) { // SUD ONLY: e.g., helicopter
      var bombard_name = utype_get_bombard_name(punit_type);

      msg += "<div"+flex+" id='utype_fact_bombard'>";
      msg += span1 + bombard_name.replace(" ", "&nbsp;") +":&nbsp;&nbsp;"+ span_end + span2_small;

      msg += "SUD: " + pstats.bombard_retaliate_rounds;
      msg += (pstats.bombard_retaliate_rounds > 1 ? " rounds. " : " round. ");

      if (bstats.bombard_primary_targets) {
        msg += bstats.bombard_primary_targets;
        msg += (bstats.bombard_primary_targets > 1 ? " targets. " : " target. ");
      }
      else
        msg += "ALL targets. ";

      if (bstats.bombard_primary_kills) {
        msg += bstats.bombard_primary_kills;
        msg += (bstats.bombard_primary_kills > 1 ? " kills. " : " kill. ");
      }
      else
        msg += "No kills. "

      if (punit_type.bombard_move_cost)
        msg += move_points_text(punit_type.bombard_move_cost, false)
            + (punit_type.bombard_move_cost > SINGLE_MOVE ? " moves." : " move.");
      else
        msg += " No move cost.";

      msg += div_end;
    }

    // IMPROVEMENT REQ
    var impr_reqs;
    var first_req = true;
    for (var i = 0; i < punit_type['build_reqs'].length; i++) {
      if (punit_type['build_reqs'][i]['kind'] == VUT_IMPROVEMENT) {
        var req = improvements[punit_type['build_reqs'][i]['value']]['name'];
        if (first_req) {
          impr_reqs = req;
          first_req = false;
        } else {
          impr_reqs += ", " + req;
        }
      }
    }
    if (!first_req) { // if an impr_req exists to make this unit
      msg += "<div"+flex+" id='utype_fact_req_building'>";
      msg += span1 + "Building Reqs: " + span_end + span2;
      msg += impr_reqs + " ";
      msg +=  div_end;
    }
    // TECH REQS
    var treq = punit_type['tech_requirement'];
    if (treq != null && techs[treq] != null) {
      msg += "<div"+flex+" id='utype_fact_req_tech'>";
      msg += span1 + "Tech Req: " + span_end + span2 + techs[treq]['name'] + div_end;
    }
    // OBSOLETE BY
    obsolete_by = unit_types[punit_type['obsoleted_by']];
    msg += "<div"+flex+" id='utype_fact_obsolete'>";
    msg += span1 + "Obsolete by: " + span_end + span2;
    if (obsolete_by == U_NOT_OBSOLETED) {
      msg += "None";
    } else {
      msg += obsolete_by['name'];
    }
    msg += div_end;

    msg += "</div>"+hr;

    msg += "<div id='helptext' style='font-weight:500; max-width:"+max_help_pane_width+"px'><p>"
        + cleaned_text(punit_type['helptext']) + "</p></div>"+hr;

    msg += wiki_on_item_button(punit_type['name']);

    msg += "<div id='datastore' hidden='true'></div>";
  } else if (key.indexOf("help_gen_techs") != -1) {
    var tech = techs[parseInt(key.replace("help_gen_techs_", ""))];
    msg = "<h1>" + tech['name'] + "</h1>" + "<div class='"+pane_class+"'><b>"
	    + render_sprite(get_technology_image_sprite(tech)) + "<br>"
	    + get_advances_text(tech['id']);
    msg += "<br><br>";
    msg += "<div id='helptext'><p>" + cleaned_text(tech['helptext']) + "</p></b></div></div>";

    msg += wiki_on_item_button(tech['name']);
  } else if (key == "help_gen_ruleset") {
    msg = helpdata_format_current_ruleset();
  } else if (key.indexOf("help_gen_governments") != -1) {
    var pgov = governments[parseInt(key.replace("help_gen_governments_",
                                                ""))];
    var gov_img = "<img src='/images/e/techs/" + pgov['name'].toLowerCase() + ".png'>";

    msg = "<h1>" + gov_img + " " + pgov['name'] + "</h1>"+"<div class='"+pane_class+"'>";
    msg += "<div id='helptext'><p>" + cleaned_text(pgov['helptext']) + "</p></div></div>";

    msg += wiki_on_item_button(pgov['name']);
  }

  $("#help_info_page").html(msg);

  /* Freeciv has code that generates certain help texts based on the
   * ruleset. This code is written in C. It is huge. Replicating it in
   * JavaScript would be a huge task and probably introduce bugs. Even if
   * someone did it it would be hard to keep the replicated code in sync as
   * the corresponding Freeciv C code kept evolving.
   *
   * Freeciv has the tool freeciv-manual. It can use the ruleset based auto
   * help text generation. It can output HTML. Some of its HTML output is
   * machine readable enough to be usable for Freeciv-web.
   *
   * Use the machine readable and wanted parts of freeciv-manual's output to
   * add auto generated help texts for the current ruleset. */
  if (rulesetdir.length != 0) {
    if (key.indexOf("help_gen_units") != -1) {
      var utype_id = parseInt(key.replace("help_gen_units_", ""));

      /* Add the auto generated unit type facts freeciv-manual prepends to
       * the unit type's help text. */
      $("#helptext").load("../man/" + rulesetdir + "7.html #utype"
                          + utype_id + " .helptext");

      /* Add the utype upkeep from freeciv-manual. */
      $("#datastore").load("../man/" + rulesetdir + "7.html #utype"
                           + utype_id + " .upkeep", function() {
                             $("#utype_fact_upkeep")[0].innerHTML
                                 = $("#datastore")[0].children[0].innerHTML.replace(
                                   "Upkeep:",
                                   span1+"Upkeep:&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;"+span_end+span2);
                           });

    } else if (key.indexOf("help_gen_governments") != -1) {
      var gov_id = parseInt(key.replace("help_gen_governments_", ""));

      /* Add the auto generated government facts freeciv-manual prepends to
       * the government type's help text. */
      $("#helptext").load("../man/" + rulesetdir + "6.html #gov"
                          + gov_id + " .helptext");
    }
  }

  $(".help_button").button();
}

/**************************************************************************
...
**************************************************************************/
function helpdata_tag_to_title(tag)
{
  var result = tag.replace("_of_the_world", "").replace("help_", "").replace("gen_", "").replace("misc_", "").replace(/_/g, " ");
  return to_title_case(result);
}
