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


var techs = {};
var techcoststyle1 = {};

var bulb_output_text = "";

var tech_canvas_text_font = "18px Arial";
var tech_canvas_text_font_redux = "17px Arial"; // smaller for bold long tech names
var tech_canvas_text_font_alt = "18px Arial";   // smaller for !bold long names

var is_tech_tree_init = false;
var tech_dialog_active = false;

var tech_xscale = 1.2;
var wikipedia_url = "http://freeciv.fandom.com/wiki/";

/* Allow checking if mouse was in a tech box for a certain time,
 * to avoid hover triggers being too sensitive */
var hover_tech_id = null;      // last tech hovered in
var hover_tech_oldest_time = null;  // oldest timestamp for when it was there
var hover_tech_delay = 130;         // how long it has to wait to trigger

/* TECH_KNOWN is self-explanatory, TECH_PREREQS_KNOWN are those for which all
 * requirements are fulfilled; all others (including those which can never
 * be reached) are TECH_UNKNOWN */
var TECH_UNKNOWN = 0;
var TECH_PREREQS_KNOWN = 1;
var TECH_KNOWN = 2;

var AR_ONE = 0;
var AR_TWO = 1;
var AR_ROOT = 2;
var AR_SIZE = 3;


var TF_BONUS_TECH = 0; /* player gets extra tech if rearched first */
var TF_BRIDGE = 1;    /* "Settler" unit types can build bridges over rivers */
var TF_RAILROAD = 2;  /* "Settler" unit types can build rail roads */
var TF_POPULATION_POLLUTION_INC = 3;  /* Increase the pollution factor created by population by one */
var TF_FARMLAND = 4;  /* "Settler" unit types can build farmland */
var TF_BUILD_AIRBORNE = 5; /* Player can build air units */
var TF_LAST = 6;

/*
  [kept for amusement and posterity]
typedef int Tech_type_id;
  Above typedef replaces old "enum tech_type_id"; see comments about
  Unit_type_id in unit.h, since mainly apply here too, except don't
  use Tech_type_id very widely, and don't use (-1) flag values. (?)
*/
/* [more accurately]
 * Unlike most other indices, the Tech_type_id is widely used, because it
 * so frequently passed to packet and scripting.  The client menu routines
 * sometimes add and substract these numbers.
 */
var A_NONE = 0;
var A_FIRST = 1;
var A_LAST = (MAX_NUM_ADVANCES + 1);
var A_FUTURE  = (A_LAST + 1);
var A_UNSET = (A_LAST + 2);
var A_UNKNOWN = (A_LAST + 3);
var A_LAST_REAL = A_UNKNOWN;

var  A_NEVER = null;

var tech_canvas = null;
var tech_canvas_ctx = null;

var tech_item_width = 222;
var tech_item_height = 52;
var maxleft = 0;
var clicked_tech_id = null;

var bulbs_output_updater = new EventAggregator(update_bulbs_output_info, 250,
                                               EventAggregator.DP_NONE,
                                               250, 3, 250);

/**************************************************************************
  Returns state of the tech for current pplayer.
  This can be: TECH_KNOWN, TECH_UNKNOWN, or TECH_PREREQS_KNOWN
  Should be called with existing techs or A_FUTURE

  If pplayer is NULL this checks whether any player knows the tech (used
  by the client).
**************************************************************************/
function player_invention_state(pplayer, tech_id)
{

  if (pplayer == null) {
    return TECH_UNKNOWN;
    /* FIXME: add support for global advances
    if (tech != A_FUTURE && game.info.global_advances[tech_id]) {
      return TECH_KNOWN;
    } else {
      return TECH_UNKNOWN;
    }*/
  } else {
    /* Research can be null in client when looking for tech_leakage
     * from player not yet received. */
    if (pplayer['inventions'] != null && pplayer['inventions'][tech_id] != null) {
      return pplayer['inventions'][tech_id];
    } else {
      return TECH_UNKNOWN;
    }
  }
}
/**************************************************************************
  95% of the time the above function is called to see if active player
  knows specific tech X. This wrapper makes it a lot easier.
**************************************************************************/
function tech_known(tech_str) {
  return (player_invention_state(client.conn.playing, tech_id_by_name(tech_str)) == TECH_KNOWN);
}

/**************************************************************************
 ...
**************************************************************************/
function init_tech_screen()
{
  if (is_small_screen()) {
    tech_canvas_text_font = "20px Arial";
  }

  // We use middle click for future goal, not for browser mouse-wheel scrolling:
  addEventListener("mousedown", function(e){ if(e.button == 1){ e.preventDefault(); } });

  $("#technologies").width($(window).width() - 20);
  $("#technologies").height($(window).height() - $("#technologies").offset().top - 15);

  if (is_tech_tree_init) return;

  // if classic is not selected, default to mpplus reqtree. Now we don't have to make code changes every time
  // we want to add or test a new ruleset:
  if (ruleset_control['name'] != "Classic ruleset") reqtree = reqtree_mpplus;
  if (ruleset_control['name'] == "Civ2Civ3 ruleset") reqtree = reqtree_civ2civ3;
  if (ruleset_control['name'] == "Multiplayer ruleset") reqtree = reqtree_multiplayer;
  if (ruleset_control['name'] == "Longturn-Web-X ruleset") reqtree = reqtree_multiplayer;
  if (ruleset_control['name'] == "Multiplayer-Plus ruleset") reqtree = reqtree_mpplus;
  if (ruleset_control['name'] == "Multiplayer-Evolution ruleset") reqtree = reqtree_mpplus;
  if (ruleset_control['name'].startsWith("Avant-garde")) reqtree = reqtree_avantgarde;
  if (ruleset_control['name'].startsWith("MP2")) reqtree = reqtree_avantgarde;   // from MP2 Brava onward all MP2 rules start with "MP2"
  if (client_rules_flag[CRF_MP2_C]) reqtree = reqtree_mp2c;

  tech_canvas = document.getElementById('tech_canvas');
  if (tech_canvas == null) {
    console.log("unable to find tech canvas.");
    return;
  }
  tech_canvas_ctx = tech_canvas.getContext("2d");
  if ("imageSmoothingEnabled" in tech_canvas_ctx) {
    // if this Boolean value is false, images won't be smoothed when scaled. This property is true by default.
    tech_canvas_ctx.imageSmoothingEnabled = false;
  }

  var max_width = 0;
  var max_height = 0;
  for (var tech_id in techs) {
    if (!(tech_id+'' in reqtree) || reqtree[tech_id+''] == null) {
      continue;
    }
    var x = reqtree[tech_id+'']['x'];
    var y = reqtree[tech_id+'']['y'];
    if (x > max_width) max_width = x;
    if (y > max_height) max_height = y;
  }

  tech_canvas.width = (max_width + tech_item_width) * tech_xscale;
  tech_canvas.height = max_height + tech_item_height;

  if (is_small_screen()) {
    tech_canvas.width = Math.floor(tech_canvas.width * 0.6);
    tech_canvas.height = Math.floor(tech_canvas.height * 0.6);
    tech_canvas_ctx.scale(0.6,0.6);
    $("#tech_info_box").css("font-size", "87%");
    $("#tech_result_text").css("font-size", "85%");
    $("#tech_color_help").css("font-size", "65%");
    $("#tech_progress_box").css("padding-left", "10px");
    $("#tech_goal_box").css("font-size", "87%");
  }

  if (!is_small_screen()) { 
    $("#mouse_info_box").html("<div title='Right-click:     Scrolls the screen.\nMiddle-click:    Sets the Future Goal.\nALT+Right-click: alternate mid-click' style='margin-right:-10px;margin-bottom:10px;float:right;width:26px;height:20px;'>&#x2753;</div>");
    $("#mouse_info_box").css('cursor', "help");
    $("#mouse_info_box").tooltip();
  }
  is_tech_tree_init = true;
  clicked_tech_id = null;
}
/**************************************************************************
 ...
**************************************************************************/
function update_tech_tree()
{
  if (freeze) return;
  var hy = 24;
  var hx = 48 + 160;
  hx = tech_item_width;

  tech_canvas_ctx.clearRect(0, 0, 5824, 726);

  for (var tech_id in techs) {
    var ptech = techs[tech_id];
    if (!(tech_id+'' in reqtree) || reqtree[tech_id+''] == null) {
      continue;
    }

    var sx = Math.floor(reqtree[tech_id+'']['x'] * tech_xscale);  //scale in X direction.
    var sy = reqtree[tech_id+'']['y'];
    for (var i = 0; i < ptech['req'].length; i++) {
      var rid = ptech['req'][i];
      if (rid == 0 || reqtree[rid+''] == null) continue;

      var dx = Math.floor(reqtree[rid+'']['x'] * tech_xscale);  //scale in X direction.
      var dy = reqtree[rid+'']['y'];

      // Alternating line colour sequence, each tech gets a different line colour to differentiate.
      var sequence = 1+Math.round(dy/55)+Math.round(dx/45);      // Create a "seed" that bumps up as we span the canvas vertically and horizontally
      sequence = sequence - (sequence-sequence%9);               // This creates a colour number from 0-8 out of our "seed"
     
      // known tech connecting to known tech: use black line
      if (tech_known(ptech['rule_name']) && tech_known(techs[rid]['rule_name'])) {
        tech_canvas_ctx.strokeStyle = 'rgb(88, 88, 88)';
        tech_canvas_ctx.lineWidth = 1;
      }
      else { // else differentiate line colours to make tracing them easier
        if (sequence == 8) tech_canvas_ctx.strokeStyle =      'rgba(55, 83, 204, 0.83)';       // egyptian blue
        else if (sequence == 7) tech_canvas_ctx.strokeStyle = 'rgba(81, 146, 187, 0.8)';       // teal
        else if (sequence == 6) tech_canvas_ctx.strokeStyle = 'rgba(121, 127, 82, 0.88)';      // olive
        else if (sequence == 5) tech_canvas_ctx.strokeStyle = 'rgba(138, 36, 78, 0.8)';        // wine
        else if (sequence == 4) tech_canvas_ctx.strokeStyle = 'rgba(161, 227, 243, 0.8)';      // faded light-cyan-grey
        else if (sequence == 3) tech_canvas_ctx.strokeStyle = 'rgba(60, 187, 146, 0.8)';       // faded sea-green
        else if (sequence == 2) tech_canvas_ctx.strokeStyle = 'rgba(0, 00, 45, 0.9)';         // midnight
        else if (sequence == 1) tech_canvas_ctx.strokeStyle = 'rgba(223, 223, 223, 0.8)';      // dim white
        else tech_canvas_ctx.strokeStyle =                    'rgba(189, 91, 79, 0.85)';       // coral
        tech_canvas_ctx.lineWidth = 3;
      }


      var node_offset = 3;
      tech_canvas_ctx.beginPath();
      tech_canvas_ctx.moveTo(sx, sy + hy);
      tech_canvas_ctx.lineTo(dx + hx+(node_offset+1), dy + hy);
      tech_canvas_ctx.stroke();

      // draw a node (helps indicate which line-colour is the real required tech: because we see a coloured node for it )
      var radius = 2;
      tech_canvas_ctx.lineWidth = 4;
      tech_canvas_ctx.beginPath();
      tech_canvas_ctx.arc(dx + hx+radius+node_offset, dy + hy, radius, 0, 2 * Math.PI, false);  
      tech_canvas_ctx.stroke();
    }

  }

  tech_canvas_ctx.lineWidth = 1;
  const KNOWN_TECH_FRAME = 'rgb(179,179,179)';
  const KNOWN_TECH_FILL = 'rgb(224,224,224)';   // #eee
  const CUR_TECH_FRAME = 'rgb(0, 0, 0)';
  const FUTURE_TECH_FRAME = 'rgb(255, 255, 255)';
  const POSSIBLE_TECH_FRAME = 'rgb(71, 92, 55)';
  const UNKNOWN_TECH_FRAME = 'rgb(50, 67, 84)';
  const POSSIBLE_AND_FUTURE_FILL = 'rgb(128, 178, 159)'

  for (var tech_id in techs) {
    var ptech = techs[tech_id];
    if (!(tech_id+'' in reqtree) || reqtree[tech_id+''] == null) continue;

    var x = Math.floor(reqtree[tech_id+'']['x'] * tech_xscale)+2;  //scale in X direction.
    var y = reqtree[tech_id+'']['y']+2;

    /* KNOWN TECHNOLOGY */
    if (player_invention_state(client.conn.playing, ptech['id']) == TECH_KNOWN) {

      var tag = tileset_tech_graphic_tag(ptech);
      tech_canvas_ctx.fillStyle = KNOWN_TECH_FILL;
      tech_canvas_ctx.fillRect(x-2, y-2, tech_item_width, tech_item_height);
      tech_canvas_ctx.strokeStyle = KNOWN_TECH_FRAME;
      tech_canvas_ctx.strokeRect(x-2, y-2, tech_item_width, tech_item_height);
      mapview_put_tile(tech_canvas_ctx, tag, x+1, y)
      // tech names >17 overflow their boxes on mobile, so use redux font for those
      if (ptech['name'].length>17) tech_canvas_ctx.font = tech_canvas_text_font_alt;
      else tech_canvas_ctx.font = tech_canvas_text_font;
      tech_canvas_ctx.fillStyle = "rgba(0, 0, 0, 1)";
      tech_canvas_ctx.fillText(ptech['name'], x + 50, y + 15);

      if (x > maxleft) maxleft = x;


    /* TECH WITH KNOWN PREREQS. */
    } else if (player_invention_state(client.conn.playing, ptech['id']) == TECH_PREREQS_KNOWN) {
      var bgcolor = (client.conn.playing != null && is_tech_req_for_goal(ptech['id'], client.conn.playing['tech_goal'])) ? "rgb(131, 170, 101)" : "rgb(91, 130, 61)";
      if (client.conn.playing['researching'] == ptech['id']) {
        bgcolor = "rgb(171, 199, 149)";
        tech_canvas_ctx.lineWidth=6;
        tech_canvas_ctx.strokeStyle = CUR_TECH_FRAME;
      } else if (client.conn.playing['tech_goal'] == ptech['id']) {
        tech_canvas_ctx.lineWidth=6;
        bgcolor = POSSIBLE_AND_FUTURE_FILL; // show as future goal but differentiate to also show tech is possible now
        tech_canvas_ctx.strokeStyle = FUTURE_TECH_FRAME;
        tech_canvas_ctx.fillStyle = 'rgb(0, 0, 0)';
      }

      var tag = tileset_tech_graphic_tag(ptech);
      tech_canvas_ctx.fillStyle = bgcolor;
      tech_canvas_ctx.fillRect(x-2, y-2, tech_item_width, tech_item_height);
      if (tech_canvas_ctx.lineWidth<6) { // don't override current research frame colour
        tech_canvas_ctx.lineWidth=2;
        tech_canvas_ctx.strokeStyle = POSSIBLE_TECH_FRAME;
      }
      tech_canvas_ctx.strokeRect(x-2, y-2, tech_item_width, tech_item_height);
      tech_canvas_ctx.lineWidth=1;
      mapview_put_tile(tech_canvas_ctx, tag, x+1, y)

      if (client.conn.playing['researching'] == ptech['id']) {
        tech_canvas_ctx.fillStyle = 'rgb(0, 0, 0)';
        // tech names >17 overflow their boxes when bold, so use redux font for those
        if (ptech['name'].length>17) tech_canvas_ctx.font = "Bold "+tech_canvas_text_font_redux;
        else tech_canvas_ctx.font = "Bold " + tech_canvas_text_font;
      } else {
        // tech names >17 overflow their boxes on mobile, so use redux font for those
        if (ptech['name'].length>17) tech_canvas_ctx.font = tech_canvas_text_font_alt;
        else tech_canvas_ctx.font = tech_canvas_text_font;
        tech_canvas_ctx.fillStyle = 'rgb(255, 255, 255)';
      }
      tech_canvas_ctx.fillText(ptech['name'], x + 51, y + 16);

    /* UNKNOWN TECHNOLOGY. */
    } else if (player_invention_state(client.conn.playing, ptech['id']) == TECH_UNKNOWN) {
      var bgcolor = (client.conn.playing != null && is_tech_req_for_goal(ptech['id'], client.conn.playing['tech_goal'])) ? "rgb(133, 167, 212)" : "rgb(61, 95, 130)";
      if (client.conn.playing['tech_goal'] == ptech['id']) {
        tech_canvas_ctx.lineWidth=6;
        tech_canvas_ctx.strokeStyle = FUTURE_TECH_FRAME;
      }

      var tag = tileset_tech_graphic_tag(ptech);
      tech_canvas_ctx.fillStyle =  bgcolor;
      tech_canvas_ctx.fillRect(x-2, y-2, tech_item_width, tech_item_height);
      if (tech_canvas_ctx.lineWidth<6) // don't override current research frame colour
        tech_canvas_ctx.strokeStyle = UNKNOWN_TECH_FRAME;
      tech_canvas_ctx.strokeRect(x-2, y-2, tech_item_width, tech_item_height);
      tech_canvas_ctx.lineWidth=1;
      mapview_put_tile(tech_canvas_ctx, tag, x+1, y)

      if (client.conn.playing['tech_goal'] == ptech['id']) {
        tech_canvas_ctx.fillStyle = 'rgb(0, 0, 0)';
        // tech names >17 overflow their boxes when bold, so use redux font for those
        if (ptech['name'].length>17) tech_canvas_ctx.font = "Bold "+tech_canvas_text_font_redux;
        else tech_canvas_ctx.font = "Bold " + tech_canvas_text_font;
      } else {
        tech_canvas_ctx.fillStyle = 'rgb(255, 255, 255)';
        // tech names >17 overflow their boxes on mobile, so use redux font for those
        if (ptech['name'].length>17) tech_canvas_ctx.font = tech_canvas_text_font_alt;
        else tech_canvas_ctx.font = tech_canvas_text_font;
      }
      tech_canvas_ctx.fillText(ptech['name'], x + 51, y + 16);
    }

    var tech_things = 0;
    var prunits = get_utypes_from_tech(tech_id);
    for (var i = 0; i < prunits.length; i++) {
      var ptype = prunits[i];

      // Suppress nuclear units if server settings don't allow them:
      if (utype_has_flag(ptype, UTYF_NUCLEAR)) {
        if (!server_settings['nukes_minor']['val']) continue; // Nukes totally turned off in this game, skip them
        if (!server_settings['nukes_major']['val']) {
          if (ptype['bombard_rate']>0) continue;   // if major nukes are OFF, suppress illegal prod choice.
          if (ptype['bombard_rate']<-1) continue;  // if major nukes are OFF, suppress illegal prod choice.
        }
      }
      
      var sprite = sprites[tileset_unit_type_graphic_tag(ptype)];
      if (sprite != null) {
        tech_canvas_ctx.drawImage(sprite, x + 50 + ((tech_things++) * 30), y + 23, 28, 24);
      }
    }

    var primprovements = get_improvements_from_tech(tech_id);
    for (var i = 0; i < primprovements.length; i++) {
      var pimpr = primprovements[i];

      // Suppress improvements if server settings don't allow them:
      if ((!server_settings['nukes_major']['val'] || !server_settings['nukes_minor']['val']) 
            && pimpr['name'] == "Enrichment Facility") {
              continue; // if major nukes are OFF, suppress illegal prod choice. if minor nukes are off, then major nukes have to be off.
      }
      if (!server_settings['nukes_minor']['val']
           && pimpr['name'] == "Manhattan Project") {
        continue; // if minor nukes are OFF, suppress illegal prod choice.
      }
      if (pimpr.name != alphanumeric_cleaner(pimpr.name)) continue; // zero-width space, duplicate great/small wonder pair. no need to show both sprites.
    

      var sprite = sprites[tileset_building_graphic_tag(pimpr)];
      if (sprite != null) {
        tech_canvas_ctx.drawImage(sprite, x + 50 + ((tech_things++) * 30), y + 23, 28, 24);
      }
    }
  }
}

/**************************************************************************
 Determines if the technology 'check_tech_id' is a requirement
 for reaching the technology 'goal_tech_id'.
**************************************************************************/
function is_tech_req_for_goal(check_tech_id, goal_tech_id)
{
  if (check_tech_id == goal_tech_id) return true;
  if (goal_tech_id == 0 || check_tech_id == 0) return false;

    var goal_tech = techs[goal_tech_id];
    if (goal_tech == null) return false;

    for (var i = 0; i < goal_tech['req'].length; i++) {
      var rid = goal_tech['req'][i];
      if (check_tech_id == rid) {
        return true;
      } else if (is_tech_req_for_goal(check_tech_id, rid)) {
        return true;
      }
    }

    return false;

}

/**************************************************************************
 Determines if the technology 'check_tech_id' is a direct requirement
 for reaching the technology 'next_tech_id'.
**************************************************************************/
function is_tech_req_for_tech(check_tech_id, next_tech_id)
{
  if (check_tech_id == next_tech_id) return false;
  if (next_tech_id == 0 || check_tech_id == 0) return false;

    var next_tech = techs[next_tech_id];
    if (next_tech == null) return false;

    for (var i = 0; i < next_tech['req'].length; i++) {
      var rid = next_tech['req'][i];
      if (check_tech_id == rid) {
        return true;
      }
    }

    return false;

}

/**************************************************************************
 ...
**************************************************************************/
function update_tech_screen()
{

  if (client_is_observer() || client.conn.playing == null) {
    show_observer_tech_dialog();
    return;
  }

  init_tech_screen();
  update_tech_tree();


  var research_goal_text = "No research target selected.<br>Please select a technology now";
  if (techs[client.conn.playing['researching']] != null) {
    research_goal_text = touch_device ? "Current Research: " : "Research:"; 
    research_goal_text += techs[client.conn.playing['researching']]['name'];
  }
  if (techs[client.conn.playing['tech_goal']] != null) {
    if (!touch_device) research_goal_text += "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Future Goal: ";
    else research_goal_text += "&nbsp;<font color='lightskyblue'>Future Goal:</font>"
    
    research_goal_text += techs[client.conn.playing['tech_goal']]['name'];
  }
  $("#tech_goal_box").html(research_goal_text);

  $("#tech_progress_text").html("Research progress: "
                                + client.conn.playing['bulbs_researched']
                                + " / "
                                + client.conn.playing['researching_cost']);

  var pct_progress = 100 * (client.conn.playing['bulbs_researched']
                            / client.conn.playing['researching_cost']);

  $("#progress_fg").css("width", pct_progress  + "%");

  var is_wide_screen = $(window).width()<1590 ? false : true;

  if (clicked_tech_id != null) {
    switch (techs[clicked_tech_id].name) {
      case "Space Flight":
      case "Automobile":
      case "Rocketry":
      case "Industrialization":
        fs = "80%";
        break;
      default:
        fs = "90%";
    } //hack to fit some techs on 768px screens
    var tech_help_text = html_safe(cleaned_text(techs[clicked_tech_id].helptext)); // splice out the └ that Chrome renders for end of line 

    if (touch_device) $("#tech_results").css("margin-left","-22px");
    $("#tech_result_text").html("<span style='font-size:"+fs+"' title='"+tech_help_text+"' id='tech_advance_helptext'>" + get_advances_text(clicked_tech_id)
        +" "+(is_wide_screen ? "" /*tech_help_text*/ : "") + "</span>");
    $("#tech_advance_helptext").tooltip({ disabled: false });
  } else if (techs[client.conn.playing['researching']] != null) {
    switch (techs[client.conn.playing['researching']].name) {
      case "Space Flight":
      case "Automobile":
      case "Rocketry":
      case "Industrialization":
        fs = "80%";
        break;
      default:
        fs = "90%";
    } //hack to fit some techs on 768px screens
    var research_help_text = html_safe(cleaned_text(techs[client.conn.playing['researching']].helptext));

    $("#tech_result_text").html("<span style='font-size:"+fs+"' title='"+research_help_text+"' id='tech_advance_helptext'>" + get_advances_text(client.conn.playing['researching'])
        +" "+(is_wide_screen ? "" /*research_help_text*/ : "") +"</span>");
    $("#tech_advance_helptext").tooltip({ disabled: false });
  }

  $("#tech_tab_item").css("color", "#000000");

  /* scroll the tech tree, so that the current research targets are on the screen..  */
  maxleft = maxleft - 280;
  if (maxleft < 0) maxleft = 0;
  if (!tech_dialog_active) {
    setTimeout(scroll_tech_tree,10);
  }

  tech_dialog_active = true;

}

/**************************************************************************
 Returns for example "Bronze working allows building phalanx."
**************************************************************************/
function get_advances_text(tech_id)
{
  const num = (value) => value === null ? 'null' : value;
  const tech_span = (name, unit_id, impr_id, title) =>
    `<span ${title ? `title='${title}'` : ''}`
    + ` onclick='show_tech_info_dialog("${name}", ${num(unit_id)}, ${num(impr_id)})'>${name}</span>`;

  const is_valid_and_required = (next_tech_id) =>
    reqtree.hasOwnProperty(next_tech_id) && is_tech_req_for_tech(tech_id, next_tech_id);

  const format_list_with_intro = (intro, list) =>
    (list = list.filter(Boolean)).length ? (intro + ' ' + list.join(', ')) : '';

  const ptech = techs[tech_id];
  var cost = ptech.cost;

  // Adjust tech cost for sciencebox
  if (game_info["sciencebox"] != 100)   {
    cost = ptech.cost * game_info["sciencebox"] / 100;
  }

  return tech_span(ptech.name, null, null) + ' (' + Math.floor(cost) + ')'
    + format_list_with_intro(' enables',
      [
        format_list_with_intro('', get_utypes_from_tech(tech_id)
          .map(unit => tech_span(unit.name, unit.id, null, 
            "A:"+fractionalize(utype_real_base_attack_strength(unit)) +" D:"+fractionalize(utype_real_base_defense_strength(unit)) +(unit.firepower>1?" F:"+unit.firepower:"") +" H:"+unit.hp
            +" M:"+move_points_text(unit.move_rate+(unit.move_bonus[0]?unit.move_bonus[0]:0),true)+(unit.fuel?"("+unit.fuel+")":"") 
            +(unit.transport_capacity?" C:"+unit.transport_capacity:"") +" Cost:"+unit.build_cost +"\n\n"
            + html_safe(cleaned_text(unit.helptext))))),
        format_list_with_intro('', get_improvements_from_tech(tech_id)
          .map(impr => tech_span(impr.name, null, impr.id,
            "Cost:"+impr.build_cost+" Upkeep:"+impr.upkeep + "\n\n"
            + html_safe(cleaned_text(impr.helptext))))),
        format_list_with_intro('', Object.keys(techs)
          .filter(is_valid_and_required)
          .map(tid => techs[tid])
          .map(tech => tech_span(tech.name, null, null, tech.rule_name+" ("+Math.trunc(tech.cost)+") "
          + uncapitalize(html_safe(cleaned_text(tech.helptext))))))
      ]) + '.';
}

/**************************************************************************
 ...
**************************************************************************/
function scroll_tech_tree()
{
  $("#technologies").scrollLeft(maxleft);
}


/**************************************************************************
 ...
**************************************************************************/
function send_player_research(tech_id)
{
  var packet = {"pid" : packet_player_research, "tech" : tech_id};
  send_request(JSON.stringify(packet));
  remove_active_dialog("#tech_dialog");
}

/**************************************************************************
 ...
**************************************************************************/
function send_player_tech_goal(tech_id)
{
  var packet = {"pid" : packet_player_tech_goal, "tech" : tech_id};
  send_request(JSON.stringify(packet));
}

/****************************************************************************
  This function is triggered when the mouse is clicked on the tech canvas.
****************************************************************************/
function tech_mapview_mouse_click(e)
{

  var mouse_button;
  /* if (!e) var e = window.event; INTERNET EXPLORER DEPRECATED */
  if (e.which) {
    mouse_button = e.which
  } else if (e.button) {
    mouse_button = e.button + 1
  }

  if (mouse_button == 3 && !e.altKey) {
    if (mouse_x > $(window).width() / 2) {
      $("#technologies").scrollLeft($("#technologies").scrollLeft() + mouse_x/2);
    } else {
        $("#technologies").scrollLeft($("#technologies").scrollLeft() - ($("#technologies").width()-mouse_x-12)/2) // Should be the width of the scrollbar
    }
   return;
  }

   if (tech_canvas != null) {
    var tech_mouse_x = mouse_x - $("#technologies").offset().left + $("#technologies").scrollLeft();
    var tech_mouse_y = mouse_y - $("#technologies").offset().top + $("#technologies").scrollTop();

    for (var tech_id in techs) {
      var ptech = techs[tech_id];
      if (!(tech_id+'' in reqtree)) continue;

      var x = Math.floor(reqtree[tech_id+'']['x'] * tech_xscale)+2;  //scale in X direction.
      var y = reqtree[tech_id+'']['y']+2;

      if (is_small_screen()) {
        x = x * 0.6;
        y = y * 0.6;
      }

      if (tech_mouse_x > x && tech_mouse_x < x + tech_item_width
          && tech_mouse_y > y && tech_mouse_y < y + tech_item_height) {
        if (mouse_button == 2 || (mouse_button == 3 && e.altKey)) send_player_tech_goal(ptech['id']);        
        else if (player_invention_state(client.conn.playing, ptech['id']) == TECH_PREREQS_KNOWN) {
          var adjusted_tech_cost = Math.max(1, Math.floor(ptech['cost']*game_info['sciencebox']/100.0))
          if (client.conn.playing['bulbs_researched'] >= adjusted_tech_cost) {
            var swal_tech_id = ptech['id'];
            var warning_text = "You will immediately discover "+ptech['name']+".";
            var extra_title = "";
            if (!(!techs[client.conn.playing['tech_goal']])) {   // !(!) == neither 0, null, nor undefined
              warning_text += ".\n\n";
              if (techs[client.conn.playing['tech_goal']]['id'] != swal_tech_id) {
                warning_text += "Extra bulbs instantly go toward " + techs[client.conn.playing['tech_goal']]['name'] +".\n";
                warning_text += "\nSet Future Goal to "+ptech['name']+ " to prevent this."
                extra_title="\nthen proceed to "+techs[client.conn.playing['tech_goal']]['name'];
              }
            }
            swal({
                title: 'Research '+ptech['name']+extra_title+'?',
                text: warning_text,
                type: 'info',
                background: '#a19886',
                showCancelButton: true,
                confirmButtonColor: '#38e',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes',
                cancelButtonText: 'No'
            },
            function(){
                send_player_research(swal_tech_id);
            });
            setSwalTheme();
          }
          else send_player_research(ptech['id']);
        }
        else if (player_invention_state(client.conn.playing, ptech['id']) == TECH_UNKNOWN) {
          send_player_tech_goal(ptech['id']);
        }
        clicked_tech_id = ptech['id'];
      }
    }
  }

  update_tech_screen();

}

/**************************************************************************
 ...
**************************************************************************/
function get_tech_infobox_html(tech_id)
{
  var infobox_html = "";
  var ptech = techs[tech_id];
  var tag = tileset_tech_graphic_tag(ptech);

  if (tag == null) return null;
  var tileset_x = tileset[tag][0];
  var tileset_y = tileset[tag][1];
  var width = tileset[tag][2];
  var height = tileset[tag][3];
  var i = tileset[tag][4];
  var image_src = "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts;
  if (is_small_screen()) {
    infobox_html += "<div class='specific_tech' style='transform: scale(1.0);' onclick='send_player_research(" + tech_id + ")'>"
          +  ptech['name']
          + "</div>";
  } else {
    infobox_html += "<div class='specific_tech' onclick='send_player_research(" + tech_id + ")'>"
           + "<div class='tech_infobox_image' style='background: transparent url("
           + image_src
	         + "); background-position:-" + tileset_x + "px -" + tileset_y
           + "px;  width: " + width + "px;height: " + height + "px;'></div>"
	         +  get_advances_text(tech_id).replace(stripChar, "")
           + "</div>";
  }
  return infobox_html;
}


/**************************************************************************
 For pbem games, checks if a tech was gained in the previous turn.
**************************************************************************/
function check_queued_tech_gained_dialog()
{
  if (!is_pbem() || players.length < 2) return;

  var queued_tech = simpleStorage.get(get_pbem_game_key(), "");

  if (queued_tech != null) {
    remove_active_dialog("#dialog");
    show_tech_gained_dialog(queued_tech);
    simpleStorage.set(get_pbem_game_key(), null);
  }

}

/**************************************************************************
 This will show the tech gained dialog for normal games. This will store 
 the gained tech, for pbem games, to be displayed at beginning of next turn.
**************************************************************************/
function queue_tech_gained_dialog(tech_gained_id)
{
  if (client_is_observer() || C_S_RUNNING != client_state()) return;

  if (is_pbem() && pbem_phase_ended) {
    simpleStorage.set(get_pbem_game_key(), tech_gained_id);
  } else {
    show_tech_gained_dialog(tech_gained_id);
  }

}

/**************************************************************************
 ...
**************************************************************************/
function show_tech_gained_dialog(tech_gained_id)
{
  if (client_is_observer() || C_S_RUNNING != client_state()) return;

  $("#tech_tab_item").css("color", "#aa0000");
  var pplayer = client.conn.playing;
  var tech = techs[tech_gained_id];
  if (tech == null) return;

  var title = tech['name'] + " discovered!";
  var message = "The " + nations[pplayer['nation']]['adjective'] + " have discovered " + tech['name'] + ".<br>";
  message += "<span id='tech_advance_helptext'>" + get_advances_text(tech_gained_id) +" "+/*techs[tech_gained_id].helptext.replace(stripChar, "") +*/ "</span>";

  var tech_choices = [];
  for (var next_tech_id in techs) {
    var ntech = techs[next_tech_id];
    if (!(next_tech_id+'' in reqtree)) continue;
    if (player_invention_state(client.conn.playing, ntech['id']) == TECH_PREREQS_KNOWN) {
      tech_choices.push(ntech);
    }
  }

  message += "<br>You can now research:<br><div id='tech_gained_choice'>";
  for (var i = 0; i < tech_choices.length; i++) {
    message += get_tech_infobox_html(tech_choices[i]['id']);
  }
  message += "</div>";

  // reset dialog page.
  remove_active_dialog("#tech_dialog");
  $("<div id='tech_dialog'></div>").appendTo("div#game_page");

  $("#tech_dialog").html(message);
  $("#tech_dialog").attr("title", title);
  $("#tech_dialog").dialog({
			bgiframe: true,
			modal: false,
			width: is_small_screen() ? "90%" : "60%",
			buttons: [
			 {
                text : "Close (𝗪)",
                click : function() {
                  remove_active_dialog("#tech_dialog");
                  $("#game_text_input").blur();
                }
            },{
				text : "Show Technology Tree",
				click : function() {
                  $("#tabs").tabs("option", "active", TAB_TECH);
                  set_default_mapview_inactive();
                  update_tech_screen();
                  remove_active_dialog("#tech_dialog");
                }
              }
             ]
		});

  $("#tech_dialog").dialog('open');
  dialog_register("#tech_dialog");
  $("#game_text_input").blur();
  $("#tech_advance_helptext").tooltip({ disabled: false });
  $(".specific_tech").tooltip({ disabled: false });

}

/**************************************************************************
 ...
**************************************************************************/
function show_wikipedia_dialog(tech_name)
{
  $("#tech_tab_item").css("color", "#aa0000");
  if (freeciv_wiki_docs == null || freeciv_wiki_docs[tech_name] == null) return;
  if (freeciv_wiki_docs[tech_name] == null) return;

  var message = "<b>Wikipedia on <a href='" + wikipedia_url
	  + freeciv_wiki_docs[tech_name]['title']
	  + "' target='_new'>" + freeciv_wiki_docs[tech_name]['title']
	  + "</a></b><br>";
  if (freeciv_wiki_docs[tech_name]['image'] != null) {
    message += "<img id='wiki_image' src='/images/wiki/" + freeciv_wiki_docs[tech_name]['image'] + "'><br>";
  }

  message += freeciv_wiki_docs[tech_name]['summary'];

  // reset dialog page.
  remove_active_dialog("#wiki_dialog");
  $("<div id='wiki_dialog'></div>").appendTo("div#game_page");

  $("#wiki_dialog").html(message);
  $("#wiki_dialog").attr("title", tech_name);
  $("#wiki_dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "90%" : "60%",
			buttons: {
				"OK (𝗪)": function() {
          remove_active_dialog("#wiki_dialog");
				}
			}
		});

  $("#wiki_dialog").dialog('open');
  dialog_register("#wiki_dialog");
  $("#wiki_dialog").css("max-height", $(window).height() - 100);
  $("#game_text_input").blur();
}

/**************************************************************************
 Shows info about a tech, unit or improvement based on helptext and wikipedia.
**************************************************************************/
function show_tech_info_dialog(tech_name, unit_type_id, improvement_id)
{
  $("#tech_tab_item").css("color", "#aa0000");

  var message = "";
  
  if (unit_type_id != null) {
     var punit_type = unit_types[unit_type_id];
     var move_bonus = parseInt(punit_type['move_bonus'][0]) ? parseInt(punit_type['move_bonus'][0]) : 0;
     var move_rate = ""; move_rate += move_points_text((parseInt(punit_type['move_rate'])+move_bonus), false);
   
     message += "<b>Unit info</b>: " + cleaned_text(punit_type['helptext']) + "<br>"
     + "</b><br>Cost: <b>" + punit_type['build_cost']
     + "</b><br>Attack: <b>" + utype_real_base_attack_strength(punit_type)//+ punit_type['attack_strength']
     + "</b><br>Defense: <b>" + utype_real_base_defense_strength(punit_type) //+ punit_type['defense_strength']
     + "</b><br>Firepower: <b>" + punit_type['firepower']
     + "</b><br>Hitpoints: <b>" + punit_type['hp']
     + "</b><br>Moves: <b>" + move_rate
     + "</b><br>Vision: <b>" + punit_type['vision_radius_sq']
     + "</b><br><br>";
  }

  if (improvement_id != null) message += "<b>Improvement info</b>: " + cleaned_text(improvements[improvement_id]['helptext']) + "<br><br>";

  if (freeciv_wiki_docs[tech_name] != null) {
    var tech_id = tech_id_by_name(tech_name);
    const num = (value) => value === null ? 'null' : value;
    const tech_span = (name, unit_id, impr_id, title) =>
      `<span ${title ? `title='${title}'` : ''}`
      + ` onclick='show_tech_info_dialog("${name}", ${num(unit_id)}, ${num(impr_id)}")'>${name}</span>`;
    const is_valid_and_required = (next_tech_id) =>
      reqtree.hasOwnProperty(next_tech_id) && is_tech_req_for_tech(tech_id, next_tech_id);
    const format_list_with_intro = (intro, list) =>
      (list = list.filter(Boolean)).length ? (intro + ' ' + list.join(', ')) : '';

    if (tech_id != null) {
      message += "<b>"+tech_name+"</b>"+format_list_with_intro(' enables',
      [
        format_list_with_intro('', get_utypes_from_tech(tech_id)
          .map(unit => tech_span(unit.name, unit.id, null, html_safe(cleaned_text(unit.helptext))))),  
        format_list_with_intro('', get_improvements_from_tech(tech_id)
          .map(impr => tech_span(impr.name, null, impr.id, html_safe(cleaned_text(impr.helptext))))),
        format_list_with_intro('', Object.keys(techs)
          .filter(is_valid_and_required)
          .map(tid => techs[tid])
          .map(tech => tech_span(tech.name, null, null)))
      ]) + '.<br>';
      message += html_safe(cleaned_text(techs[tech_id].helptext))+"<br><br>";
    }
    message += "<b>Wikipedia on <a href='" + wikipedia_url
	  + freeciv_wiki_docs[tech_name]['title']
	  + "' target='_new' style='color: black;'>" + freeciv_wiki_docs[tech_name]['title']
	  + "</a>:</b><br>";

    if (freeciv_wiki_docs[tech_name]['image'] != null) {
      message += "<img id='wiki_image' src='/images/wiki/" + freeciv_wiki_docs[tech_name]['image'] + "'><br>";
    }

    message += freeciv_wiki_docs[tech_name]['summary'];
  }

  // reset dialog page.
  remove_active_dialog("#wiki_dialog");
  $("<div id='wiki_dialog'></div>").appendTo("div#game_page");

  $("#wiki_dialog").html(message);
  $("#wiki_dialog").attr("title", tech_name);
  $("#wiki_dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "95%" : "70%",
			height: $(window).height() - 60,
			buttons: {
				"OK (𝗪)": function() {
          remove_active_dialog("#wiki_dialog");
				}
			}
		});

  $("#wiki_dialog").dialog('open');
  dialog_register("#wiki_dialog");
  $("#game_text_input").blur();
}


/**************************************************************************
 ...
**************************************************************************/
function update_tech_dialog_cursor()
{
    tech_canvas.style.cursor = "default";
    var tech_mouse_x = mouse_x - $("#technologies").offset().left + $("#technologies").scrollLeft();
    var tech_mouse_y = mouse_y - $("#technologies").offset().top + $("#technologies").scrollTop();

    for (var tech_id in techs) {
      var ptech = techs[tech_id];
      if (!(tech_id+'' in reqtree)) continue;

      var x = Math.floor(reqtree[tech_id+'']['x'] * tech_xscale)+2;  //scale in X direction.
      var y = reqtree[tech_id+'']['y']+2;

      if (is_small_screen()) {
        x = x * 0.6;
        y = y * 0.6;
      }

      // We caught the cursor hovering inside a tech!
      if (tech_mouse_x > x && tech_mouse_x < x + tech_item_width
          && tech_mouse_y > y && tech_mouse_y < y + tech_item_height) {
        if (player_invention_state(client.conn.playing, ptech['id']) == TECH_PREREQS_KNOWN) {
          tech_canvas.style.cursor = "pointer";
        } else if (player_invention_state(client.conn.playing, ptech['id']) == TECH_UNKNOWN) {
          tech_canvas.style.cursor = "pointer";
        } else {
          tech_canvas.style.cursor = "not-allowed";
        }

        // Are we hovering in a new tech? If so, reset timestamp and leave
        if (hover_tech_id != tech_id) {
          hover_tech_id = tech_id;
          hover_tech_oldest_time = Date.now();
          return;
        } else {// we've hovered here before, but is it long enough?
          if (Date.now() - hover_tech_oldest_time < hover_tech_delay)
          return; // not long enough
        }

        // We made it here, time to activate tech panel info based on where we have hovered:
        var fs;
        switch (ptech['name']) {
          case "Space Flight":
          case "Automobile":
          case "Rocketry":
          case "Industrialization":
            fs = "80%";
            break;
          default:
            fs = "90%";
        } //hack to fit some techs on 768px screens
        //if ( ptech['name']=="Space Flight" || ptech['name']=="Automobile" || ptech['name']=="Rocketry") fs="80%;"; else fs="90%;"; //hack to fit 2 techs on 768px screens
       
        var is_wide_screen = $(window).width()<1590 ? false : true;
        var tech_help_text = html_safe(cleaned_text(techs[ptech['id']].helptext));  // splice out the └ that Chrome renders for end of line 
    
        $("#tech_result_text").html("<span title='"+tech_help_text+"' style='margin-left:-4px; font-size:"+fs+"' id='tech_advance_helptext'>"+get_advances_text(ptech['id']) 
          + "</span><span style='color: #ffd588; font-size:"+fs+"'>&nbsp;"+ (is_wide_screen ? tech_help_text : "") + "</span>");
        $("#tech_advance_helptext").tooltip({ disabled: false });
      }
    }
}


/**************************************************************************
 ...
**************************************************************************/
function show_observer_tech_dialog()
{
  $("#tech_info_box").hide();
  $("#tech_canvas").hide();
  var msg = "<h2>Research</h2>";
  for (var player_id in players) {
    var pplayer = players[player_id];
    var pname = pplayer['name'];
    var pr = research_get(pplayer);
    if (pr == null) continue;

    var researching = pr['researching'];
    if (techs[researching] != null)  {
      msg += pname + ": " + techs[researching]['name'] + "<br>";
    }
  }
  $("#technologies").html(msg);
  $("#technologies").css("color", "#dcb");
}

/**************************************************************************
 Calculates current research output.

 Returns:
    self_bulbs: current "gross" bulbs output from player
    self_upkeep: upkeep cost for player (to deduce from self_bulbs)
    pooled: whether there's pooled research AND other players in the team
    team_bulbs: total bulbs output from the team, player included
    team_upkeep: total upkeep cost for the team, player included
**************************************************************************/
function get_current_bulbs_output()
{
  var self_bulbs = 0;
  var self_upkeep = 0;
  var pooled = false;
  var team_bulbs = 0;
  var team_upkeep = 0;

  if (!client_is_observer() && client.conn.playing != null) {

    var cplayer = client.conn.playing.playerno;
    for (var city_id in cities){
      var city = cities[city_id];
      if(city.owner === cplayer && city.prod != null) {
        self_bulbs += city.prod[O_SCIENCE];
      }
    }
    self_upkeep = client.conn.playing.tech_upkeep;

    if (game_info['team_pooled_research']) {
      var team = client.conn.playing.team;
      for (var player_id in players) {
        var player = players[player_id];
        if (player.team === team && player.is_alive) {
          team_upkeep += player.tech_upkeep;
          if (player.playerno !== cplayer) {
            pooled = true;
          }
        }
      }
      if (pooled) {
        team_bulbs = research_data[team].total_bulbs_prod;
      }
    }

    if (!pooled) {
      /* With no team mates, player's total_bulbs_prod may not be accurate
       * because the server doesn't send an update research info packet for
       * tax rates or specialist changes.
       */
      team_bulbs = self_bulbs;
      team_upkeep = self_upkeep;
    }
  }

  return {
    self_bulbs: self_bulbs,
    self_upkeep: self_upkeep,
    pooled: pooled,
    team_bulbs: team_bulbs,
    team_upkeep: team_upkeep
  };
}

/**************************************************************************
 Returns a textual description of current bulbs output.
**************************************************************************/
function get_current_bulbs_output_text(cbo)
{
  if (cbo === undefined) {
    cbo = get_current_bulbs_output();
  }

  var text;
  if (cbo.self_bulbs === 0 && cbo.self_upkeep === 0) {
    text = "No bulbs researched";
  } else {
    text = cbo.self_bulbs;
    var net = cbo.self_bulbs - cbo.self_upkeep;
    if (cbo.self_upkeep !== 0) {
      text = text + " - " + cbo.self_upkeep + " = " + net;
    }
    if (1 == Math.abs(net)) {
      text = text + " bulb/turn";
    } else {
      text = text + " bulbs/turn";
    }
  }
  if (cbo.pooled) {
    text = text + " (" + (cbo.team_bulbs - cbo.team_upkeep) + " team total)";
  }
  
  if (cbo.team_bulbs > 0 && client.conn.playing['researching_cost'] != 0) {
    var turns_left = Math.ceil((client.conn.playing['researching_cost'] - client.conn.playing['bulbs_researched']) / cbo.team_bulbs);
    var turns_left_plural = (turns_left > 1) ? " turns)" : " turn)";
    var turns_left_text = " ("+turns_left+turns_left_plural;
    text = text + turns_left_text;
  }
  // stored globally to avoid excessive recalculation for multiple uses
  bulb_output_text = text; 
  return text;
}

/**************************************************************************
 Updates bulbs output info.
**************************************************************************/
function update_bulbs_output_info()
{
  var cbo = get_current_bulbs_output();
  $('#bulbs_output').html(get_current_bulbs_output_text(cbo));
  update_net_bulbs(cbo.self_bulbs - cbo.self_upkeep);
}

/**************************************************************************
 Finds tech id by exact name.
 Null if not found.
**************************************************************************/
function tech_id_by_name(tname)
{
  for (var tech_id in techs) {
    if (tname == techs[tech_id]['name']) return tech_id;
  }
  return null;
}
/**************************************************************************
 Provide links or other functions a way to switch into Tech Tab
**************************************************************************/
function click_tech_tab() {
  $("#tech_tab_item").click();
}

