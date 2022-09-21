/**********************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2009-2017  The Freeciv-web project

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


/**************************************************************************
 Show the intelligence report dialog, with data depending on the
 stablishment of an embassy.
**************************************************************************/
function show_intelligence_report_dialog()
{
  if (selected_player == -1) return;
  var pplayer = players[selected_player];

  if (client_is_observer()
      || selected_player == client.conn.playing['playerno']
      || client.conn.playing.real_embassy[selected_player]) {
    show_intelligence_report_embassy(pplayer);
  } else {
    show_intelligence_report_hearsay(pplayer);
  }
}

/**************************************************************************
 Show the intelligence report dialog when there's no embassy.
**************************************************************************/
function show_intelligence_report_hearsay(pplayer)
{
  var msg = "Ruler " + pplayer['name'] + "<br>";
  if (pplayer['government'] > 0) {
    var gov_mod = get_gov_modifier(pplayer.playerno, "", true);
    var gov_name = governments[pplayer['government']]['name'];
    if (gov_mod) gov_name = gov_mod + " " + gov_name;
    msg += "Government: " + gov_name + "<br>";
  }

  /* TODO: server should not leak this for hearsay contacts
  if (pplayer['gold'] > 0) {
      msg += "Gold: " + pplayer['gold'] + "<br>";
    }
  

  if (pplayer['researching'] != null && pplayer['researching'] > 0 && techs[pplayer['researching']] != null) {
    msg += "Researching: " + techs[pplayer['researching']]['name'] + "<br>";
  }
  */

  msg += "<br><br>Establishing an embassy enables a detailed intelligence report, treaties, and trade."

  show_dialog_message("Intelligence report for " + pplayer['name'],
      msg);

}

/**************************************************************************
 Show the intelligence report dialog when there's an embassy.
**************************************************************************/
function show_intelligence_report_embassy(pplayer)
{
  // reset dialog page.
  remove_active_dialog("#intel_dialog");
  $("<div id='intel_dialog'></div>").appendTo("div#game_page");

  const capital = player_capital(pplayer);

  var gov_mod = get_gov_modifier(pplayer.playerno, "", true);
  var gov_name = governments[pplayer['government']]['name'];
  const natl_adj = nations[pplayer['nation']]['noun_plural'].replace("?plural:", "");
  if (gov_mod) gov_name = gov_mod + " " + gov_name;

  var intel_data = {
    ruler: pplayer['name'],
    government: gov_name,
    capital: capital ? capital.name : '(capital unknown)',
    gold: pplayer['gold'],
    tax: pplayer['tax'] + '%',
    science: pplayer['science'] + '%',
    luxury: pplayer['luxury'] + '%',
    researching: '(Unknown)',
    dipl: [],
    tech: [],
    wndr: []
  };

  // WONDERS
  for (var w=0; w < Object.keys(improvements).length; w++)  {        // check all wonders
    if (players[pplayer.playerno].wonders[w] != 0  // player has wonder
        && improvements[w].genus <= 1   ) {  // 0==great wonder, 1==small wonder, 2==normal improv.
          intel_data['wndr'].push({
            name: improvements[w].name,
            helptext: html_safe(improvements[w].helptext)
          });
    }
  }

  // TECHS.   TODO: FutureTech_n
  var research = research_get(pplayer);
  if (research !== undefined) {
    var researching = techs[research['researching']];
    if (researching !== undefined) {
      intel_data['researching'] = researching['name'] + ' ('
                                + research['bulbs_researched'] + '/'
                                + research['researching_cost'] + ')';
    } else {
      intel_data['researching'] = '(Nothing)';
    }
    var myresearch = client_is_observer()
                     ? null
                     : research_get(client.conn.playing)['inventions'];

    for (var tech_id in techs) {
      // Who has blueprints (instead of actual possession of the tech):
      let bp_me_code = player_has_blueprints(client.conn.playing, tech_id) ? "1" : "0";
      let bp_them_code = player_has_blueprints(pplayer, tech_id) ? "1" : "0";
      let bp_active = bp_me_code == "1" || bp_them_code == "1";

      if (research['inventions'][tech_id] == TECH_KNOWN 
          || (myresearch != null && myresearch[tech_id] == TECH_KNOWN) 
          || bp_active ) {

        let style = "";
        style = (myresearch != null && myresearch[tech_id] == TECH_KNOWN)
                 ? (research['inventions'][tech_id] == TECH_KNOWN ? 'both' : 'me_only') : 'them';

        if (myresearch != null && myresearch[tech_id] == TECH_KNOWN) {
          if (research['inventions'][tech_id] == TECH_KNOWN) style = "both";
          else style = "me_only";
        } else {
          if (research['inventions'][tech_id] == TECH_KNOWN) style = "them";
          else style = "neither";
        }

        // You/they may not have a tech but have blueprints for it, which will
        // still alter the display style and text:
        /*let bp_title = "";
        if (bp_them_code == "1") {
          bp_title += nations[pplayer.nation].adjective + " have blueprints."
        }        
        if (bp_me_code == "1") {
          bp_title += " We have blueprints."
        }*/
        let tech_name = techs[tech_id]['name']
                      + (bp_active == "1" ? " 📘" : "");
        
        intel_data['tech'].push({
          name: tech_name,
          who: style + bp_me_code + bp_them_code
        });
      }
    }
  }

  // DIPLOMATIC STATES
  if (pplayer['diplstates'] !== undefined) {
    pplayer['diplstates'].forEach(function (st, i) {
      if (st['state'] !== DS_NO_CONTACT && i !== pplayer['playerno']) {
        var dplst = intel_data['dipl'][st['state']];
        if (dplst === undefined) {
          dplst = {
            state: get_diplstate_text(st['state']),
            nations: []
          };
          intel_data['dipl'][st['state']] = dplst;
        }
        dplst['nations'].push(nations[players[i]['nation']]['adjective']);
      }
    });
  } else if (client_is_observer() && is_supercow()) {
    var dplst = {
      state: "Embassy",
      nations: []
    }
    for (let plr=0; plr<players.length; plr++) {
      if (pplayer.real_embassy[selected_player]) {
        dplst['nations'].push(nations[players[plr]['nation']]['adjective']);
      }
    }
  }

  $("#intel_dialog").html(Handlebars.templates['intel'](intel_data));
  $("#intel_dialog").dialog({
			bgiframe: true,
			modal: true,
			title: "" + nations[pplayer['nation']]['adjective'] + " Intel Report",
                             width: is_small_screen() ? "91%" : "auto"
                     });

  $("#intel_dialog").dialog('open');
  // Smaller titlebar font to fit long titles better:
  $("#intel_dialog").parent().children().first().css("font-size", "85%");

  if (gov_name) 
    $("#intel_gov").css({"color": color_gov_color(gov_name,1),
                         "text-shadow": "1px 1px "+color_gov_color(gov_name,2)});

  /*************** Set up report UI for interacting with 3 classes of tech in the report ****************/
    // Refresh visibility for all 3 classes of tech, when showing a new report:
    $("li.tech-them00").css("display", "");
    $("li.tech-them10").css("display", "");
    $("li.tech-neither01").css("display", "");
    $("li.tech-neither10").css("display", "");
    $("li.tech-neither11").css("display", "");
    $("li.tech-me_only00").css("display", "");
    $("li.tech-me_only01").css("display", "");
    $("li.tech-both00").css("display", "");

    // Set helptext:
    $("li.tech-them00").attr("title",""+natl_adj+" have. We don't.\nCLICK to remove these.");
    $("li.tech-them10").attr("title",""+natl_adj+" have. We have blueprints.\nCLICK to remove these.");
    $("li.tech-neither01").attr("title","We don't have. "+natl_adj+" have blueprints.\nCLICK to remove these.");
    $("li.tech-neither10").attr("title",""+natl_adj+" don't have. We have blueprints.\nCLICK to remove these.");
    $("li.tech-neither11").attr("title",""+natl_adj+" have blueprints. We have blueprints.\nCLICK to remove these.");
    $("li.tech-me_only00").attr("title","We have. "+natl_adj+" don't.\nCLICK to remove these.");
    $("li.tech-me_only01").attr("title","We have. "+natl_adj+" have blueprints.\nCLICK to remove these.");
    $("li.tech-both00").attr("title", ""+natl_adj+" have and we have.\nCLICK to remove these.");

    // Set that user may click one of the three classes of tech to remove it from report:
    $("li.tech-them00").on('click', function(event){
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-them00").css("display", "none");
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-them10").css("display", "none");
    });
    $("li.tech-them10").on('click', function(event){
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-them00").css("display", "none");
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-them10").css("display", "none");
    });
    $("li.tech-neither01").on('click', function(event){
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-neither01").css("display", "none");
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-neither10").css("display", "none");
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-neither11").css("display", "none");
    });
    $("li.tech-neither10").on('click', function(event){
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-neither01").css("display", "none");
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-neither10").css("display", "none");
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-neither11").css("display", "none");
    });
    $("li.tech-neither11").on('click', function(event){
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-neither01").css("display", "none");
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-neither10").css("display", "none");
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-neither11").css("display", "none");
    });
    $("li.tech-me_only00").on('click', function(event){
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-me_only00").css("display", "none");
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-me_only01").css("display", "none");
    });
    $("li.tech-me_only01").on('click', function(event){
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-me_only00").css("display", "none");
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-me_only01").css("display", "none");
    });
    $("li.tech-both00").on('click', function(event){
      event.stopPropagation(); event.stopImmediatePropagation(); $("li.tech-both00").css("display", "none");
    });
  /*******************************/

  if (is_small_screen())
    $("#intel_tabs li").children().css("padding", "6px");

  dialog_register("#intel_dialog");
  
  $("#intel_tabs").tabs();
  $("#game_text_input").blur();
}

