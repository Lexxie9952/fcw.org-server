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

var CLAUSE_ADVANCE = 0;
var CLAUSE_GOLD = 1;
var CLAUSE_MAP = 2;
var CLAUSE_SEAMAP = 3;
var CLAUSE_CITY = 4;
var CLAUSE_CEASEFIRE = 5;
var CLAUSE_PEACE = 6;
var CLAUSE_ALLIANCE = 7;
var CLAUSE_VISION = 8;
var CLAUSE_EMBASSY = 9;
var SPECENUM_COUNT = 10;

var clause_infos = {};
var diplomacy_clause_map = {};

// sneaky way to send second parameter to key listener.
var last_dialog_counterpart = -1;

/**************************************************************************
 ...
**************************************************************************/
function diplomacy_init_meeting_req(counterpart)
{
  var packet = {"pid" : packet_diplomacy_init_meeting_req,
	        "counterpart" : counterpart};
  send_request(JSON.stringify(packet));
}


/**************************************************************************
 ...
**************************************************************************/
function show_diplomacy_dialog(counterpart)
{
 var pplayer = players[counterpart];
 create_diplomacy_dialog(pplayer, Handlebars.templates['diplomacy_meeting']);
}

/**************************************************************************
 ...
**************************************************************************/
function accept_treaty_req(counterpart_id)
{
  var packet = {"pid" : packet_diplomacy_accept_treaty_req,
                "counterpart" : counterpart_id};
  send_request(JSON.stringify(packet));
}

/**************************************************************************
 ...
**************************************************************************/
function accept_treaty(counterpart, I_accepted, other_accepted)
{
  if (I_accepted == true && other_accepted == true) {
    diplomacy_clause_map[counterpart] = [];
    cleanup_diplomacy_dialog(counterpart);

  } else {

  const is_ai = players[counterpart]['flags'].isSet(PLRF_AI);

  var agree_sprite = get_treaty_agree_thumb_up();
  var disagree_sprite = get_treaty_disagree_thumb_down();


  var agree_html = "<div style='float:left; background: transparent url("
           + agree_sprite['image-src']
           + "); background-position:-" + agree_sprite['tileset-x'] + "px -"
	   + agree_sprite['tileset-y']
           + "px;  width: " + agree_sprite['width'] + "px;height: "
	   + agree_sprite['height'] + "px; margin: 5px;' onclick='accept_treaty_req("+counterpart+");'>"
           + "</div>";

  var disagree_html = "<div style='float:left; background: transparent url("
           + disagree_sprite['image-src']
           + "); background-position:-" + disagree_sprite['tileset-x'] + "px -"
	   + disagree_sprite['tileset-y']
           + "px;  width: " + disagree_sprite['width'] + "px;height: "
	   + disagree_sprite['height'] + "px; margin: 5px;' onclick='accept_treaty_req("+counterpart+");'>"
           + "</div>";
    // Us = YES.              We have accepted (thumb up):
    if (I_accepted == true) {
      $("#btn_acpt_trty").html("<b> </b>Reject treaty");
      $("#btn_acpt_trty").attr("title", "");
      $("#agree_self_" + counterpart).html(agree_html);
      $("#agree_self_" + counterpart).attr("title", "Click to reject." );
    }
    // Us = NO.               We have not accepted (thumb down):
    else {
      // Us = NO; Them = YES
      if (other_accepted) {  // AI can show 'false acceptance' and flip-flop when you accept ...
        if (is_ai) {         // ...so we have somewhat different hovertext here:
          $("#btn_acpt_trty").html("<b> </b>Accept treaty");
          $("#btn_acpt_trty").attr("title", "");
          $("#agree_self_" + counterpart).attr("title", "Click to accept.");
        }
        else {        /* Counterpart is Human -- clicking results in a done deal! */
          $("#btn_acpt_trty").html("<b> </b>Sign treaty");
          $("#btn_acpt_trty").attr("title", "Activate treaty.");
          $("#agree_self_" + counterpart).attr("title", "Click to sign treaty.");
        }
      }
      // Us = NO; Them = NO
      else {
        $("#btn_acpt_trty").html("<b> </b>Offer treaty");
        $("#agree_self_" + counterpart).attr("title", "Click to offer treaty.");
      }
      $("#agree_self_" + counterpart).html(disagree_html);
    }

    if (other_accepted) {
      $("#agree_counterpart_" + counterpart).html(agree_html);
    } else {
      $("#agree_counterpart_" + counterpart).html(disagree_html);
    }

    // Block counterpart's thumb from clicks and hovertext:
    $("#agree_counterpart_" + counterpart).css("pointer-events", "none");
  }
}

/**************************************************************************
 ...
**************************************************************************/
function cancel_meeting_req(counterpart_id)
{
  var packet = {"pid" : packet_diplomacy_cancel_meeting_req,
	        "counterpart" : counterpart_id};
  send_request(JSON.stringify(packet));
}

/**************************************************************************
 ...
**************************************************************************/
function create_clause_req(counterpart_id, giver, type, value)
{
  if (type == CLAUSE_CEASEFIRE || type == CLAUSE_PEACE || type == CLAUSE_ALLIANCE) {
    // eg. creating peace treaty requires removing ceasefire first.
    var clauses = diplomacy_clause_map[counterpart_id];
    for (var i = 0; i < clauses.length; i++) {
      var clause = clauses[i];
      if (clause['type'] == CLAUSE_CEASEFIRE || clause['type'] == CLAUSE_PEACE|| clause['type'] == CLAUSE_ALLIANCE) {
        remove_clause_req(counterpart_id, i);
      }
    }
  }

  var packet = {"pid" : packet_diplomacy_create_clause_req,
                "counterpart" : counterpart_id,
                "giver" : giver,
                "type" : type,
                "value" : value};
  send_request(JSON.stringify(packet));
}


/**************************************************************************
 ...
**************************************************************************/
function cancel_meeting(counterpart)
{
  diplomacy_clause_map[counterpart] = [];
  cleanup_diplomacy_dialog(counterpart);
}

/**************************************************************************
 Remove diplomacy dialog.
**************************************************************************/
function cleanup_diplomacy_dialog(counterpart_id)
{
  var diplomacy_dialog = "diplomacy_dialog_" + counterpart_id
  $("#"+diplomacy_dialog).empty();
  $("#"+diplomacy_dialog).remove();
  $("#dialog-extend-fixed-container > [aria-describedby="+diplomacy_dialog+"]").remove(); //Take care of the minimised version, if there is one
}

/**************************************************************************
 Remove all diplomacy dialogs and empty clauses map.
**************************************************************************/
function discard_diplomacy_dialogs()
{
  for (var counterpart in diplomacy_clause_map) {
    cleanup_diplomacy_dialog(counterpart);
  }
  diplomacy_clause_map = {};
}

/**************************************************************************
 ...
**************************************************************************/
function show_diplomacy_clauses(counterpart_id)
{
    var clauses = diplomacy_clause_map[counterpart_id];
    var diplo_html = "";
    for (var i = 0; i < clauses.length; i++) {
      var clause = clauses[i];
      var diplo_str = client_diplomacy_clause_string(clause['counterpart'],
 		          clause['giver'],
                  clause['type'],
                  clause['value']);
      diplo_html += "<span style='cursor:pointer' onclick='remove_clause_req("
                  + counterpart_id + ", " + i + ");'>" + diplo_str + "</span><br>";

    }

    $("#diplomacy_messages_" + counterpart_id).html(diplo_html);
}

/**************************************************************************
 ...
**************************************************************************/
function remove_clause_req(counterpart_id, clause_no)
{
  var clauses = diplomacy_clause_map[counterpart_id];
  var clause = clauses[clause_no];

  var packet = {"pid" : packet_diplomacy_remove_clause_req,
	            "counterpart" : clause['counterpart'],
                "giver": clause['giver'],
                "type" : clause['type'],
                "value": clause['value'] };
  send_request(JSON.stringify(packet));
}

/**************************************************************************
 ...
**************************************************************************/
function remove_clause(remove_clause_obj)
{
  var counterpart_id = remove_clause_obj['counterpart'];
  var clause_list = diplomacy_clause_map[counterpart_id];
  for (var i = 0; i < clause_list.length; i++) {
    var check_clause = clause_list[i];
    if (counterpart_id == check_clause['counterpart']
	&& remove_clause_obj['giver'] == check_clause['giver']
        && remove_clause_obj['type'] == check_clause['type']
        && remove_clause_obj['value'] == check_clause['value']) {

      clause_list.splice(i, 1);
      break;
    }
  }

  show_diplomacy_clauses(counterpart_id);
}

/**************************************************************************
 ...
**************************************************************************/
function client_diplomacy_clause_string(counterpart, giver, type, value)
{
  var pplayer = players[giver];
  var nation = nations[pplayer['nation']]['adjective'];

  /* FIXME: server sends out giver and counterpart as the same player when
     it offers a dipl_state clause to the counterpart (i.e., to the
     receiver/non-giver). This hack fixes it. TODO: fix the server @
     diplhand.c::handle_diplomacy_create_clause_req */
  if (counterpart == giver && value == 1) {
    counterpart = client.conn.playing.playerno;
  }

  var cb1 = players[counterpart].diplstates[giver]['has_reason_to_cancel'];
  var cb2 = players[giver].diplstates[counterpart]['has_reason_to_cancel'];
  const casus_belli = cb1 || cb2;
  const giver_state = players[giver].diplstates[counterpart].state;
  const counterpart_state = players[counterpart].diplstates[giver].state;
  /* giver and counterpart diplstate should always be the same but the info
     for one or the other may not be known. OR'ing them together always
     results in the correct dipl_state: */
  const dipl_state = giver_state | counterpart_state;
  const new_clause_is_old_state =
    (type == CLAUSE_CEASEFIRE && dipl_state == DS_CEASEFIRE)
    || (type == CLAUSE_PEACE && dipl_state == DS_ARMISTICE)
    || (type == CLAUSE_PEACE && dipl_state == DS_PEACE)
    || (type == CLAUSE_ALLIANCE && dipl_state == DS_ALLIANCE);
  const re_affirm = new_clause_is_old_state;

  /* DEBUG
  console.log("--------DIPL LANGUAGE DEBUG----------")
  console.log("cprt, giver, type, value = %d,%d,%d,%d",counterpart,giver,type,value);
  console.log("giver_state       "+giver_state);
  console.log("counterpart_state "+counterpart_state);
  console.log("dipl_state        "+dipl_state);
  console.log("new_clause_is_old "+new_clause_is_old_state);
  console.log("casus_belli       "+casus_belli);
  console.log("re_affirm         "+re_affirm);
  console.log("--------------------------------------")
  */

  switch (type) {
  case CLAUSE_ADVANCE:
    var ptech = techs[value];
    return "The " + nation + " give " + ptech['name'];
  case CLAUSE_CITY:
    var pcity = cities[value];

    if (pcity != null) {
      return "The " + nation + " give " + decodeURIComponent(pcity['name']);
    } else {
      return "The " + nation + " give unknown city.";
    }
    break;
  case CLAUSE_GOLD:
    if (giver == client.conn.playing['playerno']) {
      $("#self_gold_" + counterpart).val(value);
    } else {
      $("#counterpart_gold_" + counterpart).val(value);
    }
    return "The " + nation + " give " + value + " gold";
  case CLAUSE_MAP:
    return "The " + nation + " give their worldmap";
  case CLAUSE_SEAMAP:
    return "The " + nation + " give their seamap";
  case CLAUSE_CEASEFIRE:
    if (re_affirm && casus_belli) return "The parties re-affirm cease-fire and clear casus belli.";
    // The case below occurs when cease-fire will expire in <3 turns and a renewal is offered:
    if (re_affirm) return "The parties renew and extend the cease-fire.";
    if (casus_belli) return "The parties agree on a cease-fire and clear casus belli.";
    return "The parties agree on a cease-fire."
  case CLAUSE_PEACE:
    if (re_affirm && casus_belli) return "The parties re-affirm peace and clear casus belli.";
    // The case below shouldn't happen, but could happen when server gets limited duration peace pacts:
    if (re_affirm) return "The parties renew and extend the peace.";
    if (casus_belli) return "The parties agree on a peace and clear casus belli.";
    return "The parties agree on a peace."
  case CLAUSE_ALLIANCE:
    if (re_affirm && casus_belli) return "The parties re-affirm the alliance and clear casus belli.";
    // The case below shouldn't happen, but could happen when server gets limited duration alliances:
    if (re_affirm) return "The parties renew and extend the alliance.";
    if (casus_belli) return "The parties create an alliance and clear casus belli.";
    return "The parties create an alliance.";
  case CLAUSE_VISION:
    return "The " + nation + " give shared vision";
  case CLAUSE_EMBASSY:
    return "The " + nation + " give an embassy";
  }

  return "";
}



/**************************************************************************
 ...
**************************************************************************/
function diplomacy_cancel_treaty(player_id)
{
  var packet = {"pid" : packet_diplomacy_cancel_pact,
	        "other_player_id" : player_id,
                "clause" : DS_CEASEFIRE};
  send_request(JSON.stringify(packet));

  update_nation_screen();

  setTimeout(update_nation_screen, 500);
  setTimeout(update_nation_screen, 1500);
}



/**************************************************************************
 ...
**************************************************************************/
function create_diplomacy_dialog(counterpart, template) {
  var pplayer = client.conn.playing;
  var counterpart_id = counterpart['playerno'];

  var counterpart_nation_flag = "/images/e/flag/"
                              + nations[counterpart['nation']].graphic_str
                              + ".png";

  var embassy_meeting;
  // Whether meeting via embassy
  if ( !(client_rules_flag[CRF_PACTS_SANS_EMBASSY]) )
       embassy_meeting = true;
  else embassy_meeting = pplayer.real_embassy[counterpart['playerno']]
       || counterpart.real_embassy[pplayer['playerno']];

  $("#game_page").append(template({
    self: meeting_template_data(embassy_meeting, pplayer, counterpart),
    counterpart: meeting_template_data(embassy_meeting, counterpart, pplayer)
  }));

  var title = " Diplomacy: " + counterpart['name']
		 + " of the " + nations[counterpart['nation']]['adjective'];

  var dialog_id = "#diplomacy_dialog_"+counterpart_id;
  var diplomacy_dialog = $(dialog_id);

  // Set dialog height - (more height is better for fitting more clauses)
  var dialog_height = 500; // 500 minimum
  if ($(window).height()>550) dialog_height = $(window).height() - 50;
  if (dialog_height > 600) dialog_height = 600;


  $("#dlg").dialog({
    buttons :  {
       "MyButton" : {
           text: "My Button",
           id: "my-button-id",
           click: function(){
               alert("here");
           }
        }
     }
  });

  diplomacy_dialog.dialog({
      title: title,
			bgiframe: true,
      modal: false,
      width: is_small_screen() ? "95%" : "50%",
      height: dialog_height,
			buttons: {
				"Accept treaty": {
           html: "<b> </b>Accept treaty",
           title: "Changes your stance to the proposed treaty.",
           id: "btn_acpt_trty",
           click: function() {
				     accept_treaty_req(counterpart_id);
				   }
        },
				"Cancel meeting": {
          html: "Cancel meeting (<b>W</b>)",
          title: "Rejects current proposal AND ends the treaty negotiation.",
          id: "btn_quit_treaty",
          click: function () {
            cancel_meeting_req(counterpart_id);
          }
        }
			},
			close: function() {
  	     cancel_meeting_req(counterpart_id);
			}
		}).dialogExtend({
           "minimizable" : true,
           "closable" : false,
           "minimize" : function(evt, dlg) {
            // clip title to 16 chars when minimized
            $("#dialog-extend-fixed-container").children().css({"max-width":"16ch",
                                                                "width":"60px",
                                                                "overflow": "hidden"});
            $("#dialog-extend-fixed-container .ui-dialog-title").css("color", "transparent");
            unobstruct_minimized_dialog_container(); // don't let wide container block clicks
            },
           "icons" : {
             "minimize" : "ui-icon-circle-minus",
             "restore" : "ui-icon-bullet"
           }});

  diplomacy_dialog_register(dialog_id, counterpart_id);
  // This title is a long string, override the 140% default font-size.
  $(dialog_id).parent().children().first().css({"padding":"0px","font-size":"95%","text-overflow": "ellipsis"});
  /* insert flag in titlebar */
     $(dialog_id).parent().children().first().children().first().html(
         "<img title='"+title+"' height='15' src='"+counterpart_nation_flag+"'>"
         + $(dialog_id).parent().children().first().children().first().html());

  if (is_small_screen()) {
    $(dialog_id).css("padding", "0px");
    $(dialog_id).parent().children().first().css("font-size", "70%");
    // Move give-gold input fields above clause dropdowns on narrow mobile screen:
    $(".dipl_div").first().children().last().prependTo($(".dipl_div").first());
    $(".dipl_div").last().children().last().prependTo($(".dipl_div").last());
    // Push each side to farthest edge for more room
    $(".dipl_div").first().css("float", "left");
    $(".dipl_div").last().css("float", "right");
    // Remove obtuse jquery margins from <a> buttons
    $("div.dipl_div a").css("margin", "0px");
    // Reduce huge h3 font on national leader names for more room
    $(".diplomacy_player_box h3").css("font-size", "100%");
    // Align each national leader to edge.
    $(".diplomacy_player_box h3").first().css("text-align", "left");
    $(".diplomacy_player_box h3").last().css("text-align", "right");
    // Scale flags a little smaller so thumbs can fit next to them.
    $(".flag_self,.flag_counterpart").css("transform","scale(.90)");
    // Main treaty list box, do standard instead of huge font.
    $(".diplomacy_messages").css("font-size", "100%");
  }

  create_clauses_menu($('#hierarchy_self_' + counterpart_id));
  create_clauses_menu($('#hierarchy_counterpart_' + counterpart_id));

  if (game_info.trading_gold && embassy_meeting && clause_infos[CLAUSE_GOLD]['enabled']) {
    $("#self_gold_" + counterpart_id).attr({
       "max" : pplayer['gold'],
       "min" : 0
    });

    $("#counterpart_gold_" + counterpart_id).attr({
       "max" : counterpart['gold'],
       "min" : 0
    });

    var wto;
    $("#counterpart_gold_" + counterpart_id).change(function() {
      clearTimeout(wto);
      $("#counterpart_gold_" + counterpart_id).val(
        Math.min(Math.abs($("#counterpart_gold_" + counterpart_id).val()),counterpart['gold']));
      wto = setTimeout(function() {
        meeting_gold_change_req(counterpart_id, counterpart_id,
                                parseFloat($("#counterpart_gold_" + counterpart_id).val()));
      }, 500);
    });

    $("#self_gold_" + counterpart_id).change(function() {
      clearTimeout(wto);
      $("#self_gold_" + counterpart_id).val(
        Math.min(Math.abs($("#self_gold_" + counterpart_id).val()),pplayer['gold']));
      wto = setTimeout(function() {
        meeting_gold_change_req(counterpart_id, pplayer['playerno'],
                                parseFloat($("#self_gold_" + counterpart_id).val()));
      }, 500);
    });

  } else {
    $("#self_gold_" + counterpart_id).prop("disabled", true).parent().hide();
    $("#counterpart_gold_" + counterpart_id).prop("disabled", true).parent().hide();
  }

  diplomacy_dialog.css("overflow", "visible");
  diplomacy_dialog.parent().css("z-index", 1000);
}

/**************************************************************************
 Custom registration for diplomacy dialog, so that proper cleanup triggered
 when player hits 'W' to close pop-up dialog.
**************************************************************************/
function diplomacy_dialog_register(id, counterpart_id)
{
  $(id).dialog('widget').keydown(
    function() {
      //sneaky way to send a parameter to key listener
      last_dialog_counterpart = counterpart_id;
      diplomacy_dialog_key_listener(event);
    });
  $(id).dialog({ autoOpen: true }).bind('dialogclose', function(event, ui) {
    cancel_meeting_req(counterpart_id);
  });

  $(id).dialog('widget').position({my:"center top", at:"center top", of:window});
  $(id).css("color", default_dialog_text_color);
}
/*********************************************************************** */
function diplomacy_dialog_key_listener(ev)
{
/* Get counterpart_id from global var that was set microseconds ago by
   the wrapper to this (since keylistener can't take a second parameter): */
  counterpart_id = last_dialog_counterpart;
  // Check if focus is in chat field, where these keyboard events are ignored.
  if ($('input:focus').length > 0 || !keyboard_input) return;
  if (C_S_RUNNING != client_state()) return;

  var keyboard_key = String.fromCharCode(ev.keyCode).toUpperCase();
  if (keyboard_key == 'W') {
        ev.stopPropagation();
        cancel_meeting_req(counterpart_id);
  }
}
/************************************************************************ */

/* Nonfunctional
function meeting_paint_custom_flag(nation, flag_canvas)
{
  var tag = "f." + nation['graphic_str'];
  var flag_canvas_ctx = flag_canvas.getContext("2d");
  flag_canvas_ctx.scale(1.5, 1.5);
  flag_canvas_ctx.drawImage(sprites[tag], 0, 0);
}
*/
function create_clauses_menu(content) {
  content.css({'position': 'relative', 'color': default_dialog_text_color});
  var children = content.children();
  var button = children.eq(0);
  var menu = children.eq(1);
  menu.menu();
  menu.hide();
  menu.css({
    position: 'absolute',
    top: button.height()
       + parseFloat(button.css('paddingTop'))
       + parseFloat(button.css('paddingBottom'))
       + parseFloat(button.css('borderTopWidth')),
    left: parseFloat(button.css('marginLeft')),
    color: default_dialog_text_color
  });
  var menu_open = function () {
    menu.show();
    menu.data('diplAdd', 'open');
  };
  var menu_close = function () {
    menu.hide();
    menu.data('diplAdd', 'closed');
  };
  button.click(function () {
    if (menu.data('diplAdd') == 'open') {
      menu_close();
    } else {
      menu_open();
    }
  });
  menu.click(function (e) {
    if (e && e.target && e.target.tagName == 'A') {
      menu_close();
    }
  });
  content.hover(menu_open, menu_close);
}

/**************************************************************************
 Request update of gold clause
**************************************************************************/
function meeting_gold_change_req(counterpart_id, giver, gold)
{
  var clauses = diplomacy_clause_map[counterpart_id];
  if (clauses != null) {
    for (var i = 0; i < clauses.length; i++) {
      var clause = clauses[i];
      if (clause['giver'] == giver && clause['type'] == CLAUSE_GOLD) {
        if (clause['value'] == gold) return;
        remove_clause_req(counterpart_id, i);
      }
    }
  }

  if (gold > 0) {
    var packet = {"pid" : packet_diplomacy_create_clause_req,
                  "counterpart" : counterpart_id,
                  "giver" : giver,
                  "type" : CLAUSE_GOLD,
                  "value" : gold};
    send_request(JSON.stringify(packet));
  }
}

/**************************************************************************
 Build data object for the dialog template.
**************************************************************************/
function meeting_template_data(embassy_meeting, giver, taker)
{
  var data = {};
  var nation = nations[giver['nation']];

  data.flag = nation['graphic_str'] + "-web" + fullsize_flag_extension;
  data.adjective = nation['adjective'];
  data.name = giver['name'];
  data.pid = giver['playerno'];

  var all_clauses = [];

  var clauses = [];
  if (embassy_meeting && clause_infos[CLAUSE_MAP]['enabled']) {
    clauses.push({type: CLAUSE_MAP, value: 1, name: 'World-map'});
  }
  if (embassy_meeting && clause_infos[CLAUSE_SEAMAP]['enabled']) {
    clauses.push({type: CLAUSE_SEAMAP, value: 1, name: 'Sea-map'});
  }
  if (clauses.length > 0) {
    all_clauses.push({title: 'Maps...', clauses: clauses});
  }

  if (embassy_meeting && game_info.trading_tech && clause_infos[CLAUSE_ADVANCE]['enabled']) {
    clauses = [];
    for (var tech_id in techs) {
      if (player_invention_state(giver, tech_id) == TECH_KNOWN
            && (
                 (player_invention_state(taker, tech_id) == TECH_UNKNOWN && game_info['tech_trade_allow_holes'])
                  || player_invention_state(taker, tech_id) == TECH_PREREQS_KNOWN)
               ) {
          clauses.push({
            type: CLAUSE_ADVANCE,
            value: tech_id,
            name: techs[tech_id]['name']
          });
      }
    }
    if (clauses.length > 0) {
      all_clauses.push({title: 'Advances...', clauses: clauses});
    }
  }

  if (embassy_meeting && game_info.trading_city // && !is_longturn() -- no need for hard-coded control:use game settings
      && clause_infos[CLAUSE_CITY]['enabled']) {
    clauses = [];
    for (var city_id in cities) {
      var pcity = cities[city_id];
      if (city_owner(pcity) == giver
          && !does_city_have_improvement(pcity, "Palace")) {
        clauses.push({
          type: CLAUSE_CITY,
          value: city_id,
          name: decodeURIComponent(pcity['name'])
        });
      }
    }
    if (clauses.length > 0) {
      all_clauses.push({title: 'Cities...', clauses: clauses});
    }
  }

  if (embassy_meeting && clause_infos[CLAUSE_VISION]['enabled']) {
    all_clauses.push({type: CLAUSE_VISION, value: 1, name: 'Give shared vision'});
  }
  if (embassy_meeting && clause_infos[CLAUSE_EMBASSY]['enabled']) {
    all_clauses.push({type: CLAUSE_EMBASSY, value: 1, name: 'Give embassy'});
  }

  if (giver == client.conn.playing) {
    clauses = [];
    if (clause_infos[CLAUSE_CEASEFIRE]['enabled']) {
      clauses.push({type: CLAUSE_CEASEFIRE, value: 1, name: 'Cease-fire'});
    }
    if (clause_infos[CLAUSE_PEACE]['enabled']) {
      clauses.push({type: CLAUSE_PEACE, value: 1, name: 'Peace'});
    }
    if (embassy_meeting && clause_infos[CLAUSE_ALLIANCE]['enabled']) {
      clauses.push({type: CLAUSE_ALLIANCE, value: 1, name: 'Alliance'});
    }
    if (clauses.length > 0) {
      all_clauses.push({ title: 'Pacts...', clauses: clauses });
    }
  }

  data.clauses = all_clauses;

  return data;
}

