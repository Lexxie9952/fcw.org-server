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

var citydlg_map_width = 384;      // default values for most rulesets
var citydlg_map_height = 192;     // default value for most rulesets

const tileset_width = 96;         // amplio2 based tileset
const tileset_height = 48;

income_calculated_by_client = false;

var cities = {};
var city_rules = {};
var city_trade_routes = {};

/* saved state of checkboxes in city list that need to be restored if screen
 * gets redrawn to show changes (after a buy or change prod event): */
var city_checkbox_states= {};
var master_checkbox = false;     // header checkbox for toggling all selections
var retain_checkboxes_on_update = false; // whether next city list redraw retains cb's

var goods = {};

var active_city = null;

var closed_dialog_already = false; // differentiate user closing vs. triggered event closing of city dialog

var inactive_city = null;   // active_city's twin, to prevent request_city_buy from needing active_city which then forces city_dialog to pop up.
var prod_selection_city =null;  // the city_id whose current production will be used to set the current production in all selected cities.

var worklist_dialog_active = false;
var production_selection = [];
var worklist_selection = [];
var prodlists_have_been_fitted = 0; // First time prodlist is viewed, it must be custom-fitted to screensize: it won't work if not being viewed.

// User definable row in city list:   *****************************
var city_user_row_val = 0;
const CURV_NOTHING        = 0;
const CURV_CORRUPTION     = 1;
const CURV_POLLUTION      = 2;
const CURV_TRADE_REVENUE  = 3;
const CURV_GOLD_PER_SHIELD= 4;
const CURV_FOREIGNERS     = 5;
const CURV_TURN_FOUNDED   = 6;
const CURV_BUILD_SLOTS    = 7;
const CURV_MIL_UNHAPPY    = 8;
const CURV_LAST           = 9;
const clkmsg = "\n\nClick top to sort.\nClick column BELOW to set info type";
const CURV_icons = ["/images/city_user_row.png",
                    "/images/corrupt.png",
                    "/images/pollution.png",
                    "/images/camel.png",
                    "/images/goldpershield.png",
                    "/images/foreigner.png",
                    "/images/stone_henge.png",
                    "/images/e/factory.png",
                    "/images/e/warriors.png"];
const CURV_title = ["User Info Column:\nClick top to sort\nClick column BELOW to choose",
                    "Corruption"+clkmsg,
                    "Pollution Probability"+clkmsg,
                    "Trade from Trade Routes"+clkmsg,
                    "Gold cost per Shield"+clkmsg,
                    "Foreign Citizens"+clkmsg,
                    "Turn Founded"+clkmsg,
                    "Unit Build Slots"+clkmsg,
                    "RED = Unhappy about Military.\nBLUE = Pacified by Martial Law"+clkmsg];

// *****************************************************************

/* The city_options enum. */
var CITYO_DISBAND      = 0;
var CITYO_NEW_EINSTEIN = 1;
var CITYO_NEW_TAXMAN   = 2;
var CITYO_LAST         = 3;

var FEELING_BASE = 0;		/* before any of the modifiers below */
var FEELING_LUXURY = 1;		/* after luxury */
var FEELING_EFFECT = 2;		/* after building effects */
var FEELING_NATIONALITY = 3;  	/* after citizen nationality effects */
var FEELING_MARTIAL = 4;	/* after units enforce martial order */
var FEELING_FINAL = 5;		/* after wonders (final result) */

var selected_specialist = -1; // which type of specialist to replace with clicking. -1=cycle
var show_specialist_pane = false;

var MAX_LEN_WORKLIST = 64;

var INCITE_IMPOSSIBLE_COST = (1000 * 1000 * 1000);

var city_tab_index = 0;
var city_prod_clicks = 0;

var city_screen_updater = new EventAggregator(update_city_screen, 250,
                                              EventAggregator.DP_NONE,
                                              250, 3, 250);

/* Information for mapping workable tiles of a city to local index */
var city_tile_map = null;

var opt_show_unreachable_items = false;
var opt_show_improvements_only = false;

// refresh superpanel for this city when update_city_screen called:
var active_superpanel_cityid = -1;
// don't reset the above var to -1 if waiting for user input on a dialog:
var active_superpanel_dialog_refresh_delay = false;

/**************************************************************************
 ...
**************************************************************************/
function city_tile(pcity)
{
  if (pcity == null) return null;

  return index_to_tile(pcity['tile']);
}

/**************************************************************************
 ...
**************************************************************************/
function city_owner_player_id(pcity)
{
  if (pcity == null) return null;
  return pcity['owner'];
}

/**************************************************************************
 ...
**************************************************************************/
function city_owner(pcity)
{
  return players[city_owner_player_id(pcity)];
}

/**************************************************************************
 Returns true if a player can see inside the city.
**************************************************************************/
function player_can_see_inside_city(pcity)
{
/*  Formerly we assumed only the owner can see inside a city.
    That's wrong (investigate city, allied shared vision, etc.)
    If the client has info on the city's worklist, then we can
    see inside the city. */
  return (pcity.worklist !== undefined);
}

/**************************************************************************
 Removes a city from the game
**************************************************************************/
function remove_city(pcity_id)
{
  if (pcity_id == null || client.conn.playing == null) return;
  var pcity = cities[pcity_id];
  if (pcity == null) return;

  var update = client.conn.playing.playerno && city_owner(pcity).playerno == client.conn.playing.playerno;
  var ptile = city_tile(cities[pcity_id]);
  delete cities[pcity_id];
  if (renderer == RENDERER_WEBGL) update_city_position(ptile);

  if (update) {
    city_screen_updater.update();
    bulbs_output_updater.update();
  }
}

/**************************************************************************
 ...
**************************************************************************/
function is_city_center(city, tile) {
  return (city['tile'] == tile['index']);
}

/**************************************************************************
 ...
**************************************************************************/
function is_free_worked(city, tile) {
  return (city['tile'] == tile['index']);
}

/**************************************************************************
 ...
 **************************************************************************/
function is_capital(city) {
  return city_has_building(city, improvement_id_by_name(B_PALACE_NAME));
}


/**************************************************************************
 ...
**************************************************************************/
function show_city_dialog_by_id(pcity_id)
{
  //console.log(" show_city_dialog_by_id  caller is " + show_city_dialog_by_id.caller);

  show_city_dialog(cities[pcity_id]);
}

/**************************************************************************
  Used to lower font for improvements with a long word in them
**************************************************************************/
function findLongestWord(str) {
  var strSplit = str.split(' ');
  var longestWord = 0;
  for(var i = 0; i < strSplit.length; i++){
    if(strSplit[i].length > longestWord){
	     longestWord = strSplit[i].length;
     }
  }
  return longestWord;
}

/**************************************************************************
 Server has web_player_info packet to update player income, but we don't
  get refreshed info after incoming city info packets. When we don't get
  the info we can calculate it client-side.
**************************************************************************/
function city_force_income_update()
{
  if (observing) return;

  var income = 0;
  // Go through all cities
  for (cid in cities) {
    var pcity = cities[cid];
    // Look at player cities only
    if (pcity['owner'] == client.conn.playing.playerno && pcity['surplus'] != null) {
      // add net gold income from tax collection
      income += pcity['surplus'][O_GOLD];

      // add net gold income from Coinage, if applicable
      if (pcity['production_kind'] == VUT_IMPROVEMENT) {
        if (improvements[pcity['production_value']]['name'] == "Coinage") {
          var multiplier = 1.0;
          if (client_rules_flag[CRF_MP2_C]) {
            multiplier = 1.5;
            multiplier += city_has_building(pcity, improvement_id_by_name("Marketplace"))
               ? 0.25 : 0;
            multiplier += city_has_building(pcity, improvement_id_by_name("Bank"))
               ? 0.25 : 0;
            multiplier += city_has_building(pcity, improvement_id_by_name("Stock Exchange"))
               ? 0.25 : 0;
            if (has_wonder(B_MEDICI_BANK)) multiplier *= 1.07;
          }
          income += multiplier * (pcity['surplus'][O_SHIELD] + pcity['shield_stock']);
          // Server rounds income to nearest integer but if it's exactly .5 it rounds randomly
          if (Math.round(income)-income != .5) income = Math.round(income);
          income_calculated_by_client = true;
        }
      }
    }
  }

  client.conn.playing['expected_income'] = income;
  income_needs_refresh = false;
}
/**************************************************************************
 Show the city dialog, by loading a Handlebars template, and filling it
 with data about the city.
**************************************************************************/
function show_city_dialog(pcity)
{
  const playerno = pcity.owner;
  const is_small = is_small_screen();
  const not_large = not_large_screen();
  const is_medium = not_large && !is_small;
  const is_large = !is_small && !is_medium;
  const winwidth = $(window).width();
  const winheight = $(window).height();
  const is_med_large = is_large && (winheight > 768) && (winheight < 1050) && (winwidth > 1400) && (winwidth < 1720);

  //console.log("show_city_dialog() called.")
  //console.log("    caller is " + show_city_dialog.caller.toString().substring(0,35));
  var turns_to_complete;
  var sprite;
  //var shield_sprite;
  var punit;

  var the_time = new Date().getTime();
  var from_tab = null;
  // We got here from updating the City Governor. Don't override
  // back to main city overview view.
  if (the_time-gov_refresh_timer < 1100) {
    city_tab_index = 6;
    $("#ctg").click();
  }

  if (active_city != pcity || active_city == null) {
    city_prod_clicks = 0;
    production_selection = [];
    worklist_selection = [];
  }

  if (active_city != null) close_city_dialog_trigger();
  active_city = pcity;
  if (pcity == null) return;

  // reset dialog page.
  $("#city_dialog").remove();

  $("<div id='city_dialog'></div>").appendTo("div#game_page");

  var city_data = {};

  $("#city_dialog").html(Handlebars.templates['city'](city_data));

  $("#city_canvas").click(city_mapview_mouse_click);

  show_city_traderoutes();
  show_city_happy_tab();
  // Attempt to show city governor tab button, and hide it if
  // city governor tab is not allowed to generate:
  if (show_city_governor_tab() == false) {
    $("#ctg").parent().hide()
  }

  var dialog_buttons = {};

  if (!is_small && !touch_device) {
    dialog_buttons = $.extend(dialog_buttons,
      {
        "Previous city" : function() {
         previous_city();
       },
       "Next city" : function() {
         next_city();
       },
       "Buy" : function() {
         request_city_buy();
       },
       "Rename" : function() {
         rename_city();
       },
       "Exit (W)" : function() {
        close_city_dialog_trigger();
      }
     });
     //dialog_buttons = $.extend(dialog_buttons, {"Exit ((W)": close_city_dialog_trigger});

  } else {   // small screen control buttons
       dialog_buttons = $.extend(dialog_buttons,
         {
           // Mobile: we have to give these ultra-short names until parent element height is
           // locked and we later RESIZE these to smaller; otherwise they don't fit and sizing
           // becomes a train wreck.
          "<": function() {
            previous_city();
          },
          ">" : function() {
            next_city();
          },
          "B" : function() {
            request_city_buy();
          },
          "N" : function() {
            rename_city();
          }
        });
        dialog_buttons = $.extend(dialog_buttons, {"Exit": close_city_dialog_trigger});
   }

  // CREATE THE TITLE AND THE SPECIALIST CONTROL PANE IN THE TITLE (for large screens) --------------------------------------
  var city_dialog_title = "<div><span style='float:left;margin-right:70px;'>"
                        + decodeURIComponent(pcity['name']) + " (" + pcity['size'] + ")</span>";
  if (!is_small && !client_is_observer() && client.conn.playing.playerno == pcity['owner'] && specialists != null && Object.keys(specialists) != null) {
    // Create specialist control pane in title bar.
    var num_specialists = Object.keys(specialists).length;
    if (client_rules_flag[CRF_ASMITH_SPECIALISTS]) {
      // client has no way to check reqs for extended specialists
      if ( !player_has_wonder(playerno, improvement_id_by_name(B_ADAM_SMITH_NAME)) ) {
        num_specialists = 3; // need A.Smith get access specialists 4-6
      }
    }
    var specialist_control_html = "<div style='padding-top:4px;' id='SC_pane'>";

    for (var u = 0; u < num_specialists; u++) {
      var spec_type_name = specialists[u]['plural_name'];
      var spec_gfx_key = specialists[u]['graphic_str'] + "_0";
      var border = (selected_specialist == u) ? specialist_border_select : specialist_border_normal;
      var htitle = (selected_specialist == u) ? ("Unselect "+spec_type_name)
                                              : ("Assign "+spec_type_name);
      sprite = get_specialist_image_sprite(spec_gfx_key);

      specialist_control_html =  specialist_control_html +
      "<span id='sp_t"+u+"' class='specialist_item' style='border-bottom:"+border+";margin-bottom:1px;"
            + "cursor:pointer; background: transparent url(" + sprite['image-src'] + ");background-position:-"
            + sprite['tileset-x'] + "px -" + sprite['tileset-y'] + "px;  width: " +sprite['width']
            + "px;height: " + sprite['height'] + "px;float:left; '"
            + " onclick='city_select_specialist(event, "+specialists[u]['id'] + ");'"
            +" title='"+htitle+"'></span>";
    }
    specialist_control_html += "</div>"
    if (show_specialist_pane) {
      city_dialog_title += specialist_control_html;
    } else {
      city_dialog_title += "<div id='scp_show' style='font-size:95%;cursor:copy;' title='Specialist Control Pane' "
      +"onclick='toggle_specialist_control_pane();'"
      +"><img class='v' style='border-radius:2px' src='/images/specialistpane.png'></div>";
    }
  }
  city_dialog_title += "</div>";
  //----------------------------------------------------------------------------------------------------------------------
  const city_dialog_height = is_large ? $(window).height() - 80
                                    : $(window).height() + 10;
  let city_dialog_width;
  if (is_large) city_dialog_width = "80%";
  else if (is_small) city_dialog_width = "99%";
  else if (winwidth<1025 && winwidth>912) city_dialog_width = "912px";
  else if (winwidth<=912) city_dialog_width = "99%";
  else city_dialog_width = "80%";

  $("#city_dialog").dialog({
      bgiframe: true,
      titleIsHtml: true,
			modal: false,
			width: city_dialog_width,
                        height: city_dialog_height,
                        close : close_city_dialog,
            buttons: dialog_buttons
                   }).dialogExtend({
                     "minimizable" : true,
                     "closable" : false,
                     "minimize" : function(evt, dlg){ set_default_mapview_active(); },
                     "icons" : {
                       "minimize" : "ui-icon-circle-minus",
                       "restore" : "ui-icon-bullet"
                     }});

  var dialogTitle = $('#city_dialog').closest('.ui-dialog').find('.ui-dialog-title');
  dialogTitle.html(city_dialog_title);
  $("#city_dialog").dialog('widget').keydown(city_keyboard_listener);

  /* We can potential adjust the button pane for Next/Buy/Exit here
  $("#city_dialog").dialog('widget').children().css( {"margin-top":"20px", "padding":"0px", "visibility":"hidden"} ); */

  // Fine tune mobile screen elements
  if (!is_large) {
    if (is_small) {
      // Next/Buy/Exit buttons more compact for Mobile
      $("#city_dialog").dialog('widget').children().children().children().css( {"padding-top":"2px", "padding-bottom":"3px",
          "padding-right":"6px", "padding-left":"6px", "margin-bottom":"3px", "margin-right":"0px" } );
      // If there is another way to put unicode in these buttons, let me know! But you'd still
      // get problems with iPhone 5 and narrower screens auto-sizing elements to wrong size.
      // We name these buttons here, after the buttons are resized and parent height is locked.
      $("#city_dialog").next().children()[0].children[0].innerHTML = "&#9194;Last";
      $("#city_dialog").next().children()[0].children[1].innerHTML = "Next&#9193;"
      $("#city_dialog").next().children()[0].children[2].innerHTML = "Buy";
      $("#city_dialog").next().children()[0].children[3].innerHTML = "Name";
      // Swipeleft Swiperight go to prev/next city:
      /* TODO: when jquery.mobile.min.js is installed right, this will add swipe left/swipe right
        for next/prev city. Just need to know how to install. ALSO, will be important to do the
        .off() function when city dialog exited.
      $("#city_dialog").next().children()[0].children[0].id="prev_city_button"; // give id to buttons so we can virtual click them
      $("#city_dialog").next().children()[0].children[1].id="next_city_button"; // when we swipe left/right
      $(document).on("swipeleft", "html", function(e) { console.log("SWIPE LEFT!!!") } )
      $(document).on("swiperight", "html", function(e) { console.log("SWIPE RIGHT!!!") } )
      */
      // City worked tiles map canvas, tight fit positioning
      $("#city_canvas_top_div").css("padding", "0px");
      $("#city_canvas_top_div").css("margin", "0px");
      $("#city_canvas_top_div").css("width", "100%");
      $("#city_canvas_top_div").css("margin-left", "-5px");

      $("#city_panel").css("padding", "0px")
      $("#city_dialog").addClass("noscrollbars");
      $("#city_dialog").css("overflow-y", "hidden");
      $("#city_dialog").css("overflow-x", "hidden"); // let children overflow if needed but not the whole dialog
      $("#city_dialog_info").css("width", "100%");
      $("#city_dialog_info").addClass("noscrollbars");
      $("#city_viewport").addClass("noscrollbars");
      $("#city_tabs-0").css("padding","0px");
      $("#city_dialog").css("margin-left", "-3px");
      $(".ui-dialog .ui-dialog-title").css("font-size","125%"); // down from 140% default
    }
    else { // is_medium screen: e.g. 1366x768 laptops
      // Shrinks a LOT of different components within the city dialog for tighter fit:
      $("#city_dialog").dialog('widget').children().children().children().css( {"padding-top":"0px", "padding-bottom":"0px",
          "padding-right":"0px", "padding-left":"0px", "margin-bottom":"0px", "margin-right":"0px" } );

      $("#city_overview_tab").css({"padding-top":"0px", "padding-bottom":"0px",
          "padding-right":"0px", "padding-left":"0px", "margin-bottom":"0px", "margin-right":"0px"})
      $("#city_canvas_top_div").css("padding", "0px");
      $("#city_canvas_top_div").css("margin", "0px");
      $("#city_canvas_top_div").css("width", "100%");
      $("#city_canvas_top_div").css("margin-left", "-5px");
      $("#city_panel").css("padding", "0px")
      $("#city_tabs-0").css("padding","0px");
      const pheight = $("#city_tabs").parent().parent().height();
      $("#city_tabs").css("height",pheight);
      $("worklist_control").css("padding-top","0px");
      $(".wc_spacer").css("height","2%");
      $(".ui-dialog .ui-dialog-title").css("font-size","115%"); // down from default 140%: vert.space at premium
      /* At this point we have shrunken Previous/Next/Rename/Buy buttons which are suitable and necessary even for 1024horiz screen, but
         unnecessarily small and mismatched out of place on >1280horiz screens: */
      if (winwidth>1270) {
        // Button container, space efficient and positioned right:
        $(".ui-dialog-buttonset").last().css({"padding-top":"0px", "padding-bottom":"0px",
        "padding-right":"0px", "padding-left":"0px", "margin-top":"11px", "margin-right":"-8px" });
        // Buttons themselves:
        $(".ui-dialog-buttonset").last().children().css({"padding-top":"4px", "padding-bottom":"4px",
        "padding-right":"13px", "padding-left":"13px", "margin-bottom":"0px", "margin-right":"0px" })
      } else {  // Medium screen with compromised <1280p horizontal:
        // Buttons container
        $(".ui-dialog-buttonset").last().css({"padding-top":"0px", "padding-bottom":"0px",
        "padding-right":"0px", "padding-left":"0px", "margin-top":"11px", "margin-right":"-15px" });
        // Reduce font size on buttons by 1px
        $(".ui-dialog-buttonset").last().children().css({"font-size":"14.5px" });
        // Heighten but don't widen button
        $(".ui-dialog-buttonset").last().children().css({"padding-top":"4px", "padding-bottom":"4px"});
      }
    }
  } else { // is_large screen
    // 16:10 screens of certain size tend to need some verticality on worklist_control buttons:
    if (is_med_large) {
      $(".wc_spacer").css("height","6.5%");
      $(".ui-dialog-buttonset").last().css({"padding-top":"0px", "padding-bottom":"0px",
      "padding-right":"0px", "padding-left":"0px", "margin-bottom":"-11px", "margin-top":"11px", "margin-right":"-8px" });
      // Buttons themselves:
      $(".ui-dialog-buttonset").last().children().css({"padding-top":"4px", "padding-bottom":"4px",
      "padding-right":"13px", "padding-left":"13px", "margin-bottom":"0px", "margin-right":"0px" })
    }
    // align "Change Production" and "Add to Worklist" buttons with the wood panel and tab selector buttons to their left.
    //$("#prod_buttons").css({"margin-top": "39px", "margin-right": "2px"});   // these buttons were removed.
    if (!touch_device) { // Highlight keyboard shortcuts for large screens with keyboards (i.e. not touch device)
      $("#city_dialog").next().children().children().first().html("<u><b>P</b></u>revious City");
      $("#city_dialog").next().children().children().first().next().html("<u><b>N</b></u>ext City");
      $("#city_dialog").next().children().children().first().next().next().html("<u><b>B</b></u>uy");
      $("#city_dialog").next().children().children().first().next().next().next().html("<b> </b>Rename"); // forces equal button height
      $("#city_dialog").next().children().children().first().next().next().next().next().html("Exit (<u><b>W</b></u>)");
    }
  }
  $("#city_dialog").dialog('open');
  // prevent tool-tip from janking the layout on some helptext
  $("#city_dialog").parent().css("overflow-y", "hidden");

  $("#game_text_input").blur();
  // IXTJ killer: Prevent Firefox from focusing MAIN tab to produce a stupid url preview for the href="#"
  document.activeElement.blur();
  document.activeElement = $("#city_dialog").parent();
  $("#city_dialog").parent().focus();

  /* prepare city dialog for small screens. */
  if (!is_small) {
    $("#city_tabs-i").hide();       // "Inside" tab for units, not needed on large screen.
    $(".extra_tabs_small").remove();  // class identified for "Inside" tab for units, not needed on large screen.
    $("#mobile_cma_checkbox").remove();
    $("#ct2").html("<u><b>R</b></u>outes"+ (pcity['traderoute_count']!=0
      ?"&nbsp;&nbsp; <img style='position:absolute; margin-left:-5px;' src='/images/e/trade.png'>"
      :""));
    $("#ctg").html("<u><b>G</b></u>overnor"+(pcity.cma_enabled?" &#x1F539;":"")); // blue diamond to show governor active.
  } else {
    // CMA tab elements: (tight fit)
    $("#cma_surplus_hdr").css("font-size", "105%");
    //$("#cma_surplus_hdr").html("Surplus");
    $("#cma_priorities_hdr").css("font-size", "105%");
    //$("#cma_priorities_hdr").html("Priorities");
    $("#cma_status").css({"font-size": "100%", "margin-top": "-8px"});
    $("#btn_toggle_cma").prependTo($("#cma_status"));
    $("#btn_cma_help").prependTo($("#cma_status"));
    $("#btn_toggle_cma").css("padding", "4px");
    $("#btn_cma_help").css("padding", "4px");
    $(".mobile_remove").hide(); // don't use remove(), or it gets an undefined for allow disorder
    $(".mobile_shrink").css({"padding": "2px", "margin":"1px", "margin-right":"-2px"});
    $(".mobile_shrink").css("font-size", "100%")
    $("#btn_apply_cma").html("Set");
    $("#btn_cma_refreshall").html("Refresh All");
    $("#btn_cma_setall").html("Set All");
    $("#btn_cma_saveall").html("Save All");
    // Units inside city:
    var units_element = $("#city_improvements_panel").detach();  // Remove this from main tab and put it in "Inside" tab
    $('#city_units_tab').append(units_element);  // "Inside" tab:units inside
    $("#city_tabs").css( {"margin":"-21px", "margin-top":"-11px"} ); // Compact tabs for mobile fit
    // Abbreviate all tab title buttons to fit:
    $("#ct0").html("Main");     $("#ct1").html("Prod");
    $("#ct2").html("Routes");   $("#ct3").html("Option");
    $("#ct4").html("Happy");    $("#cti").html("Inside");
    $("#ctg").html("Gov"+(pcity.cma_enabled?"&#x1F539;":""));
    $("#cma_allow_disorder").remove();
    if (is_medium) {  // medium size screen e.g. 1366x768
      $("#city_overview_tab").css("height", ($("#city_overview_tab").parent().parent().height()))
    }
   }

  $("#city_tabs").tabs({ active: city_tab_index});

  if (is_medium) {
    $(".citydlg_tabs").height($(window).height() - 120);
  } else if (is_small) {
    $(".citydlg_tabs").height($(window).height() - 110);
  } else { // is_large
    $(".citydlg_tabs").height($(window).height() - 225);
  }

  city_worklist_dialog(pcity);
  $("#worklist_dialog_headline").unbind('click');
  $("#worklist_dialog_headline").click(function(ev) { ev.stopImmediatePropagation(); city_remove_current_prod(ev)} );

  var orig_renderer = renderer;
  if (renderer == RENDERER_WEBGL) renderer = RENDERER_2DCANVAS;

  set_citydlg_dimensions(pcity);
  set_city_mapview_active();

  // Center map on area around city for when they leave the city
  //save_map_return_position(city_tile(pcity)); //save tile locations for shift-spacebar return position function
  center_tile_mapcanvas(city_tile(pcity));
  update_map_canvas(0, 0, mapview['store_width'], mapview['store_height']);

  if (orig_renderer == RENDERER_WEBGL) renderer = orig_renderer;

  var pop_string = is_small ? city_population(pcity)+"K" : numberWithCommas(city_population(pcity)*1000);
  var change_string = pcity['granary_turns'] < 0 ? "Starves in: " : "Growth in: ";
  $("#city_size").html("Population: "+ pop_string + "<br>"
                       + "Size: " + pcity['size'] + "<br>"
                       + "Grain: " + pcity['food_stock'] + "/" + pcity['granary_size'] + "<br>"
                       + change_string + city_turns_to_growth_text(pcity));

  var prod_type = get_city_production_type_sprite(pcity);
  var prod_string = "";
  if (prod_type != null) {
    // Show an emoji to the left of the name of what the city is producing. Clicking it takes you to prod screen.
    prod_string += html_emoji_from_universal(prod_type['type']['name'])+"&thinsp;";
  }
  prod_string += "<b style='color:#fed'>" + (prod_type != null ? prod_type['type']['name']+"</b>" : "None</b>");
  if (is_small && prod_type != null && prod_type['type']['name'] != null && prod_type['type']['name'].length>16)
    prod_string = "<span style='font-size:90%'>" + prod_string + "</span>";
  let prod_name = (prod_type != null ? prod_type['type']['name'] : "");
  $("#city_production_overview").html("<span style='cursor:pointer' title='CLICK: Change production.\n\n"
  + browser.metaKey+"-CLICK: See the help manual for " + prod_name +".' "
  +" onclick='city_prod_tab(event);'>"+prod_string+"</span>");
  $("#city_production_overview").tooltip({
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });
  turns_to_complete = get_city_production_time(pcity);

  if (turns_to_complete != FC_INFINITY) {
    $("#city_production_turns_overview").html(turns_to_complete + " turns &nbsp;&nbsp;(" + get_production_progress(pcity) + ")");
  } else {
    $("#city_production_turns_overview").html("-");
  }

  /*if (turns_to_complete != FC_INFINITY) {
    $("#city_production_turns_overview").html(turns_to_complete + " turns &nbsp;&nbsp;(" + get_production_progress(pcity) + ")");
  } else {
    $("#city_production_turns_overview").html("-");
  }*/

  if (city_has_building(pcity, improvement_id_by_name(B_AIRPORT_NAME))) {
     $("#city_dialog_info").css("padding-bottom","3px");
     var airlift_send_text;
     var airlift_font_size = '1em;'
     if (game_info['airlifting_style'] & 4) {
        airlift_send_text = "&infin;";
        airlift_font_size = '2em;'
     }
     else
     {
        airlift_send_text = Math.max(0,pcity["airlift"]);
     }
     var city_airlift_capacity_html = '<div id="airlift_send_capacity" title="Airlift send capacity"><div style="float:left"><img src="/images/orders/airlift.png" height="26" width="26"></div><div style="font-size:'+airlift_font_size+'float:left;height:26px;line-height:26px;margin-left:1px">'+airlift_send_text+'</div></div>';
     if (game_info['airlift_dest_divisor'] > 0) {
         airlift_font_size = '1em;'
         var airlift_receive_text;
         if (game_info['airlifting_style'] & 8) {
            airlift_receive_text = "&infin;";
            airlift_font_size = '2em;'
         }
         else {
            var airlift_receive_max_capacity = Math.round(pcity['size'] / game_info['airlift_dest_divisor']);
            airlift_receive_text = Math.max(0,pcity["airlift"] + airlift_receive_max_capacity - effects[1][0]['effect_value'])+"/"+airlift_receive_max_capacity;
         }
         city_airlift_capacity_html += '<div id="airlift_receive_capacity" title="Airlift receive capacity"><div style="float:left;"><img src="/images/airlift-dest.png" height="26" width="26"></div><div style="font-size:'+airlift_font_size+'float:left;height:26px;line-height:26px;margin-left:1px">'+airlift_receive_text+'</div></div>';
     }
     $("#city_airlift_capacity").html(city_airlift_capacity_html);
     $("#airlift_send_capacity").tooltip({
        show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
     });
     $("#airlift_receive_capacity").tooltip({
        show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
     });
  }

  var uk_bonus = get_player_building_upkeep_bonus(pcity['owner']);
  var reduction_pct;
  var longest_word;
  var long_name_font_reducer = "";
  var improvements_html = "";
  for (var z = 0; z < ruleset_control.num_impr_types; z ++) {
    if (pcity['improvements'] != null && pcity['improvements'].isSet(z)) {
       sprite = get_improvement_image_sprite(improvements[z]);
       if (sprite == null) {
         console.log("Missing sprite for improvement " + z);
         continue;
       }
       // Reduce font size for city improvements with long names so they don't overwrite each other.
       // Also move long names 6px left to use unused margin space.
       long_name_font_reducer = "<div>"; // Default to a plain div with no style adjustment.
       longest_word = findLongestWord(improvements[z]['name']); // Find longest word in city improvement name
       if (improvements[z]['name'] != null && improvements[z]['name'].length==10) longest_word = 10; // Two word names 10 long don't get new line, so treat like 1 word.
       reduction_pct = 100-(longest_word-7)*5;    // For words over 7 in length, reduce font 5% for each letter over 7 length.
       if (reduction_pct<70) reduction_pct = 70;  // Maximum 30% reduction in size.
       // Now generate the special style adjustment for longer names, to reduce the font size and adjust margin:
       if (longest_word>7) long_name_font_reducer ="<div style='margin-left:-6px; font-size:"+reduction_pct+"%;'>";

      // non-negative base upkeeps which are zero or negative after upkeep bonus will be zero upkeep ("none")
      var upkeep = (improvements[z]['upkeep']-uk_bonus <= 0 && improvements[z]['upkeep'] >= 0)
                   ? "none"
      // positive upkeep OR upkeep that was already negative before bonus (so called "infra-support" improvement like wind plant which have neg. upkeep)
                   : (improvements[z]['upkeep']+" gold");

      improvements_html = improvements_html +
       "<div id='city_improvement_element'><div class='buildings_present' style='background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
           + "title=\"" + html_safe(cleaned_text(improvements[z]['helptext'])) +"\n\nUpkeep: "+ upkeep + "\n\n"+browser.metaKey+"-CLICK to see help in manual." + "\" "
	   + "onclick='city_sell_improvement(event," + z + ");'>"
           +"</div>"+ long_name_font_reducer+improvements[z]['name']+"</div>" + "</div>";
    }
  }
  $("#city_improvements_list").html(improvements_html);
  $(".buildings_present").tooltip({
    show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  });

  var punits = tile_units(city_tile(pcity));
  if (punits != null) {
    var present_units_html = "";
    for (var r = 0; r < punits.length; r++) {
      punit = punits[r];
      sprite = get_unit_image_sprite(punit);
      if (sprite == null) {
         console.log("Missing sprite for " + punit);
         continue;
       }
        //Unit sprite for present domestic unit:
        if (punit['owner'] == client.conn.playing.playerno) {
          present_units_html = present_units_html +
          "<div class='game_unit_list_item' title='" + html_safe(get_unit_city_info(punit))
              + "' style='cursor:pointer; background: transparent url("
              + sprite['image-src'] +
              ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
              + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
              + " onclick='city_dialog_activate_unit(event, units[" + punit['id'] + "]);'"
              +"></div>";

        }
        // Foreign unit gets a flag drawn on it too
        else {
          var tag = nations[players[punit['owner']]['nation']]['graphic_str']

          var civ_flag_url = "";

          if (!nations[players[punit['owner']]['nation']]['customized'] ) {
            civ_flag_url += "/images/flags/" + tag + "-web" + get_tileset_file_extention();

              // flag
              present_units_html = present_units_html +
              "<div class='game_unit_list_item' title='" + nations[players[punit['owner']]['nation']]['adjective']
                  + "' style='cursor:pointer; background: transparent url("
                  + civ_flag_url
                  + "); background-size:contain; background-repeat:no-repeat; width:22px; height:14px; float:left; ' "
                  + "onclick='city_dialog_activate_unit(event, units[" + punit['id'] + "]);'"
                  +"></div>";

              // unit
              present_units_html = present_units_html +
              "<div class='game_unit_list_item' title='" + html_safe(get_unit_city_info(punit))
                  + "' style='cursor:pointer; background: transparent url("
                  + sprite['image-src'] +
                  ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
                  + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; margin-left:-21px; martin-top:-14px;'"
                  + " onclick='city_dialog_activate_unit(event, units[" + punit['id'] + "]);'"
                  +"></div>";
          }
        }
        present_units_html = present_units_html
                           + get_html_vet_sprite(punit)
                           + get_html_hp_sprite(punit, false)
                           + get_html_activity_sprite(punit)
                           + (unit_happy_cost(punit) ? get_html_cause_unhappy_sprite(punit) : "");
      }
      $("#city_present_units_list").html(present_units_html);
      // trick to compensate for removed scrollbar clipping the top:
      $("#city_present_units_list").css({"margin-top":"-10px","padding-top":"20px"});
    }


  var sunits = get_supported_units(pcity);
  if (sunits != null) {
    var supported_units_html = "";
    var upkeep_str = "";
    var fu=0,gu=0,su=0,mu=0;   // total upkeep counters
    for (var t = 0; t < sunits.length; t++) {
      punit = sunits[t];
      var happy_cost = unit_happy_cost(punit);
      if (punit['upkeep'] != null) {
        su += parseInt(punit['upkeep'][O_SHIELD],10);
        fu += parseInt(punit['upkeep'][O_FOOD],10);
        gu += parseInt(punit['upkeep'][O_GOLD],10);
      } // Unhappy upkeep:
      mu += happy_cost;

      sprite = get_unit_image_sprite(punit);
      if (sprite == null) {
         console.log("Missing sprite for " + punit);
         continue;
       }

      supported_units_html = supported_units_html +
      "<div class='game_unit_list_item' title='" + html_safe(get_unit_city_info(punit))
          + "' style='cursor:pointer; background: transparent url("
          + sprite['image-src'] +
          ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
          + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
          + " onclick='city_dialog_activate_unit(event, units[" + punit['id'] + "]);'"
          +"></div>";
      supported_units_html = supported_units_html
                           + get_html_vet_sprite(punit)
                           + get_html_hp_sprite(punit,false)
                           + get_html_activity_sprite(punit)
                           + (happy_cost ? get_html_cause_unhappy_sprite(punit): "");
    }
    if (fu) upkeep_str += "" + fu + "<img title='City pays "+fu+" food for unit upkeep.' class='vu' src='/images/wheat.png'>";
    if (su) upkeep_str += "" + su + "<img title='City pays "+(pluralize("shield", su))+" for unit upkeep.' class='vu' style='margin-left:0px' src='/images/e/shield.png'>";
    if (gu) upkeep_str += "" + gu + "<img title='City pays "+gu+" gold for unit upkeep.' class='vu' style='margin-left:-3px' src='/images/gold.png'>";
    if (mu) upkeep_str += "" + mu + "<img title='"+mu+" Citizens unhappy about military units.\n"
                       + "CLICK for console report.' onclick='unit_unhappy_report(" + pcity['id']
                       + ")' class='vu' style='margin-left:-3px; transform: scale(0.8)' src='/images/e/fist.png'>";

    $("#city_supported_units_title").html("Supported Units: <span style='float:right; margin:-1px'>"+upkeep_str+"</span>");
    $("#city_supported_units_list").html(supported_units_html);
    // trick to compensate for removed scrollbar clipping the top:
    $("#city_supported_units_list").css({"margin-top":"-10px","padding-top":"20px"});
  }
  $(".game_unit_list_item").tooltip({
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });
  $(".buildings_present").tooltip({
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });

  if ('prod' in pcity && 'surplus' in pcity) {
    var food_txt = "";
    if (pcity['surplus'][O_FOOD] > 0) food_txt += "+<b class='food_text'>";
    else if (pcity['surplus'][O_FOOD] < 0) food_txt += "<b class='negative_food_text'>";
    else food_txt += "<b>";
    food_txt += pcity['surplus'][O_FOOD] + "</b>";
    var food_txt2 = pcity['surplus'][O_FOOD]==pcity['prod'][O_FOOD] ? "" : "(" + pcity['prod'][O_FOOD] + ")";

    var shield_txt = "";
    if (pcity['surplus'][O_SHIELD] > 0) shield_txt += "+<b class='prod_text'>";
    else shield_txt += "<b>";
    shield_txt += pcity['surplus'][O_SHIELD] + "</b>";
    var shield_txt2 = pcity['surplus'][O_SHIELD]==pcity['prod'][O_SHIELD] ? "" : "(" + pcity['prod'][O_SHIELD] + ")";
    if (pcity.build_slots && pcity.build_slots > 1) shield_txt2 += " (<b style='cursor:help; color:red' title='"+pcity.build_slots+" Unit Build Slots'>"+pcity.build_slots+"</b>)"

    var trade_txt = "";
    if (pcity['surplus'][O_TRADE] > 0) trade_txt += "+<b class='trade_text'>";
    else trade_txt += "<b>";
    trade_txt += pcity['surplus'][O_TRADE] + "</b>";
    var trade_txt2 = pcity['surplus'][O_TRADE]==pcity['prod'][O_TRADE] ? "" : "(" + pcity['prod'][O_TRADE] + ")";
    if (pcity.traderoute_count) {
      trade_txt2 +=
      "<span style='cursor:help' title='Trade Route Revenue' onclick='$(\"#ct2\").click();'>"
      + "<img style='margin-bottom:-7px; margin-top:-4px; margin-left:1px; padding:0px' src='/images/e/caravan.png'>"
      + "<b class='trade_text'>" + get_city_traderoute_revenue(pcity['id'])+"</b></span>";
    }

    var gold_txt = "";
    if (pcity['surplus'][O_GOLD] > 0) gold_txt += "+<b class='gold_text'>";
    else gold_txt += "<b>";
    gold_txt += pcity['surplus'][O_GOLD] + "</b>";
    var gold_txt2 = pcity['surplus'][O_GOLD]==pcity['prod'][O_GOLD] ? "" : "(" + pcity['prod'][O_GOLD] + ")";

    var luxury_txt = pcity['surplus'][O_LUXURY] > 0 ? "<b class='lux_text'>" : "";
    luxury_txt += pcity['surplus'][O_LUXURY] + "</b>";
    var luxury_txt2 = pcity['surplus'][O_LUXURY]==pcity['prod'][O_LUXURY] ? "" : "(" + pcity['prod'][O_LUXURY] + ")";

    var science_txt = pcity['surplus'][O_SCIENCE] > 0 ? "<b class='sci_text'>" : "";
    science_txt += pcity['surplus'][O_SCIENCE] + "</b>";
    var science_txt2 = pcity['surplus'][O_SCIENCE]==pcity['prod'][O_SCIENCE] ? "" : "(" + pcity['prod'][O_SCIENCE] + ")";

    $("#city_food").html(food_txt);      $("#city_food2").html(food_txt2);
    $("#city_prod").html(shield_txt);    $("#city_prod2").html(shield_txt2);
    $("#city_trade").html(trade_txt);    $("#city_trade2").html(trade_txt2);
    $("#city_gold").html(gold_txt);      $("#city_gold2").html(gold_txt2);
    $("#city_luxury").html(luxury_txt);  $("#city_luxury2").html(luxury_txt2);
    $("#city_science").html(science_txt);$("#city_science2").html(science_txt2);
    $("#city_corruption").html(pcity['waste'][O_TRADE]);
    // Don't show Waste if ruleset has special flag that it doesn't have it:
    if (client_rules_flag[CRF_NO_WASTE]) $("#city_waste_row").remove();
    else $("#city_waste").html(pcity['waste'][O_SHIELD]);

    if ( (pcity['steal'] && pcity['owner'] == client.conn.playing.playerno)
         || (client_rules_flag[CRF_MP2_C] && city_get_foreign_pct(pcity.id) >= 49)
     ) {
      // If impossible to steal from this city (lawless after conquest rule):
      if (client_rules_flag[CRF_MP2_C] && city_get_foreign_pct(pcity.id) >= 49) {
        $("#city_steal").html("<b>Blocked</b>");
        $("#city_steal_row").show();
      } else {
        $("#city_steal").html(pcity['steal']);
        $("#city_steal_row").show();
      }
    } else $("#city_steal_row").hide();

    $("#city_pollution").html(pcity['pollution']);

    if (pcity['rally_point_length']) {
      $("#city_rally_row").show();
      var rally_type = (pcity['rally_point_persistent'] ? "Constant " : "Temporary ")
      var ptile = index_to_tile(pcity['rally_point_dest_tile']);
      var coords = ptile['x']+","+ptile['y'];
      const rally_span = "<span style='white-space: nowrap; cursor:pointer; position:absolute' title='"
                       + "Click to cancel rally point.\nMiddle-click city from map to show path.\nALT-R from map to show all.' "
                       + "onclick='city_cancel_rally_point("+pcity['id']+");'>"
      $("#city_rally").html(rally_span+"&#x1F3AF; "+rally_type+" Rally Point: {"+coords+"}</span>");
      $("#city_rally").tooltip({
        show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
      });

    } else $("#city_rally_row").hide();
  }

  /* Handle citizens and specialists */
  var specialist_html = "";
  var citizen_types = ["angry", "unhappy", "content", "happy"];
  for (var s = 0; s < citizen_types.length; s++) {

    // The line right below the line below this, was throwing undefined errors, test hack to see if this avoids it:
    if (pcity == null || (pcity['ppl_' + citizen_types[s]] != null && pcity['ppl_' + citizen_types[s]].length<1) || pcity['ppl_' + citizen_types[s]] == null) continue;
    if (pcity['ppl_' + citizen_types[s]] == null) continue;
    for (var i = 0; i < pcity['ppl_' + citizen_types[s]][FEELING_FINAL]; i ++) {
      sprite = get_specialist_image_sprite("citizen." + citizen_types[s] + "_"
         + (i % 2));
      specialist_html = specialist_html +
      "<div class='specialist_item' style='background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
           +" title='One " + citizen_types[s] + " citizen'></div>";
    }
  }

  for (var u = 0; u < pcity['specialists_size']; u++) {
    var spec_type_name = specialists[u]['plural_name'];
    var spec_gfx_key = specialists[u]['graphic_str'] + "_0";
    for (var j = 0; j < pcity['specialists'][u]; j++) {
      sprite = get_specialist_image_sprite(spec_gfx_key);
      specialist_html = specialist_html +
      "<div class='specialist_item' style='cursor:pointer; background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
           + " onclick='city_change_specialist(event, " + pcity['id'] + "," + specialists[u]['id'] + ");'"
           +" title='" + spec_type_name + " (click to change)'></div>";

    }
  }

  $('#specialist_panel').html(specialist_html);

  var rapture_citizen_html = "";

  if (pcity['size']<41) { // No room for totals panel showing happy/content/angry, in mega-large cities.
    for (var i = 0; i < 4; i++) {
        if (pcity['ppl_' + citizen_types[i]][FEELING_FINAL] > 0) {
          sprite = get_specialist_image_sprite("citizen." + citizen_types[i] + "_" + (Math.floor(i / 2)));

          rapture_citizen_html += "<div class='city_dialog_rapture_citizen' style='margin-left:auto;' title='"+citizen_types[i].charAt(0).toUpperCase() + citizen_types[i].slice(1)+" citizens'><div style='float:left;background: transparent url("
          + sprite['image-src'] + ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y'] + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;'>"
          +"</div><div style='float:left;height: "+sprite['height']+"px;margin-left:2px;'>"+pcity['ppl_' + citizen_types[i]][FEELING_FINAL]+"</div></div>";
        }
    }
    $('#rapture_citizen_panel').html(rapture_citizen_html);
    $('#rapture_citizen_panel').show();
  } else $('#rapture_citizen_panel').hide();

  //Shave pixels off citizen sprites in very large cities, to get them to fit:
  var sp_adjust = (pcity['size']-32)/-7;
  if (sp_adjust<0) $(".specialist_item").css("margin-left",sp_adjust+"px");
  else $(".specialist_item").css("margin-left","0px");


  $('.city_dialog_rapture_citizen').tooltip({
    position: { my:"center bottom", at: "center top-4"},
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });

  var city_surplus_colour = "#d7d4cf"; // default non-negative non-positive value (i.e. zero)
  var city_surplus_sign = "";

  if (pcity['surplus'][O_FOOD] > 0) {
      city_surplus_colour = "#9bff7d"; // surplus food
      city_surplus_sign = "+";
  }

  else if (pcity['surplus'][O_FOOD] < 0) {
      city_surplus_colour = "#c55c55"; // deficit food
  }

  var rapture_food_status_html = "<div><div style='float:left;background: transparent url(/images/wheat.png);width:20px;height:20px;'></div><div style='margin-left:4px;float:left;color:"+city_surplus_colour+";'</div><b>"+city_surplus_sign+pcity['surplus'][O_FOOD]+"</b></div></div>"

  // Calculate colour code for rapture status
  let next_state = "Peace";                               // default / fall-thru
  var rapture_status_class="city_dialog_peace";           // default / fall-thru
  $('#rapture_status').attr('title', "Peace next turn");  // default / fall-thru
  let pissed = pcity['hangry'] || (server_settings.fulldisorder.val && pcity['anarchy']);
  var happy_people   = pcity['ppl_happy'][FEELING_FINAL];
  var unhappy_angry_people = pcity['ppl_unhappy'][FEELING_FINAL]+pcity['ppl_angry'][FEELING_FINAL];
  // Color code for upcoming state under current configuration of tiles/luxury rate/improvements/deployed units:
  if (happy_people >= pcity['size']*0.4999 && unhappy_angry_people==0 && pcity['size']>=city_celebrate_size(pcity)) {
    next_state = "Celebrating"; $('#rapture_status').attr('title', "Celebration next turn");
    if (!pissed) {
      rapture_status_class = "city_dialog_celeb";
    }
  }
  if (pissed) {
    if (next_state == "Celebrating") rapture_status_class = "city_dialog_celebrate_after_anarchy"
    else rapture_status_class = "city_dialog_restoring_anarchy";
  }
  if (unhappy_angry_people > happy_people || server_settings.hangry.val && pcity.granary_turns == -1) {
    rapture_status_class = "city_dialog_disorder"
    next_state = "Lawless"
  }

  if (pcity.granary_turns == -1 && server_settings.hangry.val) next_state = "Famine";
  $('#rapture_status').attr('title', get_city_state_description(get_city_state(pcity),next_state));

  $('#rapture_food').html(rapture_food_status_html);

  var rapture_status_icon = "";
  /* 4-bit code. BIT values:
      1 = raptured this turn
      2 = raptures next turn.  (pause this turn)
      4 = raptures in 2 turns. (pause next turn)
      8 = raptures in 3 turns. (pause 2 turns)
   */
  const RLAST = 1,
        RNOW = 2,
        R2 = 4,
        R3 = 8;
  // Use 0-3 braille dots to show next 3 turns of rapture status:
  var braille_code = city_rapture_dots(pcity.rapture_status);
  switch (pcity.rapture_status) {
    case RLAST:
      rapture_status_icon = "<img id='rstatus_icon' class='v' src='/images/e/3.png' title='rapture paused 3 turns '><img id='rstatus_icon' class='v' src='/images/e/comet.png' title='rapture paused 3 turns '>"
      break;
    /* all possibilities of bit 2 being on, i.e., can rapture this turn*/
    case RNOW:
    case RNOW+RLAST:
    case RNOW+R2:
    case RNOW+RLAST+R2:
    case RNOW+R3:
    case RNOW+R3+RLAST:
    case RNOW+R2+R3:
    case RNOW+RLAST+R2+R3:
      rapture_status_icon = "<img id='rstatus_icon' class='v' src='/images/e/star2.png' title='can continue rapture'>"+braille_code;
      break;
    /* bit 4, can rapture next turn BUT NOT this turn */
    case R2:
    case R2+RLAST:
    case R2+R3:
    case R2+R3+RLAST:
      rapture_status_icon = "<img id='rstatus_icon' class='v' src='/images/e/comet.png' title='rapture paused, can rapture next turn'>"+braille_code
      break;
    /* bit 8 can rapture in 2 turns BUT NOT this turn or next turn */
    case R3:
    case R3+RLAST:
      rapture_status_icon = "<img id='rstatus_icon' class='v' src='/images/e/2.png' title='rapture paused 2 turns'><img id='rstatus_icon' class='v' src='/images/e/comet.png' title='rapture paused, can rapture in 2 turns'>"+braille_code
      break;
  }
  $('#rapture_status').html("<div>"+ rapture_status_icon + "<span class='"+rapture_status_class+"' style='font-weight:bold;padding-bottom:9px;'>"
    + get_city_state(pcity)+"</span></div>");
  $('#rapture_status').tooltip({
    tooltipClass: "wider-tooltip" , position: { my:"center bottom", at: "center top-3"},
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });

  /* Fix the citzen panel overlaps the "citizen amounts" panel for bigger cities with 5 city_radius_sq
   * Those with larger city_radius_sq get a bigger canvas with more room */
  if (pcity.city_radius_sq<=5 && pcity['size'] >= 27) {
    $("#city_canvas_top_div").width(pcity['size']*15-30);
  }

  $('#disbandable_city').off();
  $('#disbandable_city').prop('checked',
                              pcity['city_options'] != null && pcity['city_options'].isSet(CITYO_DISBAND));
  $('#disbandable_city').click(function() {
    var options = pcity['city_options'];
    var packet = {
      "pid"     : packet_city_options_req,
      "city_id" : active_city['id'],
      "options" : options.raw
    };

    /* Change the option value referred to by the packet. */
    if ($('#disbandable_city').prop('checked')) {
      options.set(CITYO_DISBAND);
    } else {
      options.unset(CITYO_DISBAND);
    }

    /* Send the (now updated) city options. */
    send_request(JSON.stringify(packet));

  });

  // HANDLE FOREIGN CITIZENS, APPEND AFTER UNIT PANELS
  var spacer = is_small ? "" : "<br>";
  var foreigners_html = "<div id='city_foreigners'>"+spacer+"Citizen nationality:";
  if (pcity['nationalities_count']>0) { // foreigners present !
    for (ethnicity in pcity['nation_id']) {
      var epop = pcity['nation_citizens'][ethnicity] == pcity['size'] ? "<font color='#55cc55''>ALL</font>" : pcity['nation_citizens'][ethnicity];
      foreigners_html += " &bull; " + nations[ players[pcity['nation_id'][ethnicity]]['nation'] ]['adjective']
                      + ": <b>" + epop + "</b>";
    }
    foreigners_html+="</div>"

    $("#city_improvements_panel").append(foreigners_html);
  }

  if ($("#city_improvements").parent().width() - $("#city_improvements").width() < 50) {
    $("#city_improvements").css( {"width":"100%"} );
    $("#city_improvements").css( {"height":"100%"} );
    //$("#city_improvements").css( {"overflow":"hidden"} );
    $("#city_improvements_title").css( {"width":"4096px"} );
    $("#city_improvements_list").css( {"width":"4096px"} );
    $("#city_improvements").css( {"padding-bottom":"0px"} );
  }

  if (is_small) {
    $(".ui-tabs-anchor").css("padding", "2px");
    $("#city_panel_stats").css( {"width":"100%", "margin-top":"17px", "padding":"0px"} );
    $("#city_panel_top").css( {"width":"100%"} );
    // Continuous horizontal scrolling for mobile:
    $("#city_improvements").css( {"width":"100%"} );
    $("#city_improvements_title").css( {"width":"4096px"} );
    $("#city_improvements_list").css( {"width":"4096px"} );
    // Continuous horizontal scrolling for mobile:
    $("#city_present_units").css( {"width":"100%"} );
    $("#city_present_units_title").css( {"width":"4096px"} );
    $("#city_present_units_list").css( {"width":"4096px"} );
    // Continuous horizontal scrolling for mobile:
    $("#city_supported_units").css( {"width":"100%"} );           // technically no longer necessary because we defined it thus in the .css for everyone
    $("#city_supported_units_title").css( {"width":"4096px"} );
    $("#city_supported_units_list").css( {"width":"4096px"} );
    // Position adjustment hack
    $("#city_tabs-i").css( {"margin-top":"-20px", "padding":"0px"} );
    $("#city_dialog_info").css( {"width":"100%", "padding":"0px"} );
    // Adjust vertical to remove 9 pixels of "slack"
    $("#city_overview_tab").css("height", ($("#city_overview_tab").height()-9) );
    // Hide container for minimized windows when in city screen so they don't occlude things on mobile:
    $("#dialog-extend-fixed-container").hide();
  }
  // Either/OR, worked better on iPad:
  if (!is_large || is_med_large || touch_device) {
    // City tab buttons lock to bottom of screen in landscape:
    if(window.innerHeight < window.innerWidth) {
      $('#city_tabs').css( {"position":"static"} );
    }
  }
  if (!is_small) adjust_prodlist_sizes_to_screen();
}

/**************************************************************************
  Currently not for mobile. For all other screen sizes, this function
  does delicate fittings to get the worklist, prodlist, and worklist
  control buttoms sized and positioned optimally.
**************************************************************************/
function adjust_prodlist_sizes_to_screen() {
  const winheight = $(window).height();
  var mp, mw, b;

  if (winheight<1025)      {mp=10000; mw=10000; b=-7;}     // 1280x1024,1600x1000 or x900,1366x768 etc.
  else if (winheight<1081) {mp=54; mw=51; b=33;}           // HD
  else if (winheight<1601) {mp=50; mw=49; b=33;}           // QHD 1600p
  else if (winheight<2161) {mp=55; mw=38; b=32;}           // UHD "4K"
  else                     {mp=50; mw=49; b=33;}           // "8K"
  // -------------------------------------------------

  // Worklist control buttons:
  $("#worklist_control").css("padding","0");
  let prod_tab_height = $("#worklist_control").parent().height();
  $("#worklist_control").height(prod_tab_height);
  // Worklist height
  $("#worklist_right").height(prod_tab_height);
  let prodlist_height =  $("#worklist_right").height() - $("#tasks_heading").height() - b;
  prodlist_height -= (winheight-656)/mp; // slack space needed grows proportional to winheight
  $("#worklist_production_choices").css("height", prodlist_height);
  // Production choices height
  $("#worklist_left").height(prod_tab_height);
  let worklist_height = $("#worklist_left").height() - $("#worklist_dialog_headline").height() - $("#worklist_heading").height() - b;
  worklist_height -= (winheight-656)/mw; // slack space needed grows proportional to winheight
  $("#city_current_worklist").css("height",worklist_height);
}

/**************************************************************************
 Returns the braille symbol representing the next three turns of rapture
 qualification for rulesets with variable rapture rates. (Braille numbers
 directly map over to the pcity.rapture_status bitfield. ;~)
**************************************************************************/
function city_rapture_dots(rapture_status) {
  return "<span style='cursor:help' title='"+city_rapture_text(rapture_status)+"'>"
         + String.fromCharCode((rapture_status>>1) + 0x2800)
         + "</span>";
}

/**************************************************************************
 Returns the natural language text explaining the braille dot pattern
 from above.
**************************************************************************/
function city_rapture_text(rapture_status) {
  if (!rapture_status) return "";

  const THIS_TURN = 2;
  const NEXT_TURN = 4;
  const TURN_AFTER_NEXT = 8;

  var text = "";

  rapture_status = rapture_status & (THIS_TURN+NEXT_TURN+TURN_AFTER_NEXT)

  switch (rapture_status) {
    case 0:
      text = "Pauses rapture next three turns."
      break;
    case THIS_TURN:
      text = "Can rapture this turn.\nPauses rapture next turn and turn after-next."
      break;
    case NEXT_TURN:
      text = "Pauses rapture this turn and turn after-next.\nCan rapture next turn."
      break;
    case (THIS_TURN + NEXT_TURN):
      text = "Can rapture next two turns.\nPauses rapture turn after-next."
      break;
    case (TURN_AFTER_NEXT):
      text = "Pauses rapture next two turns.\nCan rapture turn after-next."
      break;
    case (THIS_TURN + TURN_AFTER_NEXT):
      text = "Can rapture this turn and turn after-next.\nPauses rapture next turn."
      break;
    case (NEXT_TURN + TURN_AFTER_NEXT):
      text = "Pauses rapture this turn.\nCan rapture next turn and turn after-next."
      break;
    case (THIS_TURN + NEXT_TURN + TURN_AFTER_NEXT):
      text = "Can rapture next three turns."
      break;
    default:
      text = "";
  }

  return (text);
}

/**************************************************************************
 Each city tab from city.hbs is set to call this when it's clicked.
**************************************************************************/
function city_change_tab(tab_num) {
  city_tab_index = tab_num;
  if (tab_num==1 && ++prodlists_have_been_fitted < 2)
    setTimeout(adjust_prodlist_sizes_to_screen, 500);
}

/**************************************************************************
 The size at which a city can celebrate.
**************************************************************************/
function city_celebrate_size(pcity) {
  var csize = game_info.celebratesize;

  // TODO: evaluate effects[137] (EFT_CELEBRATE_SIZE_ADD) instead of hard-coded:
  if (client_rules_flag[CRF_MP2_D]) {
    if (player_has_wonder(players[pcity.owner].playerno, improvement_id_by_name(B_ANGKOR_WAT))) {
      csize -= 1;
    } else if (client_rules_flag[CRF_MP2_E]) {  // "else if" because Angkor and Despotism can't both be co-active
        if (
          governments[players[pcity.owner]['government']]['name']=="Despotism") {
          csize -= 1;
        }
    }
  }
  return csize;
}

/**************************************************************************
 Returns the name and sprite of the current city production.
**************************************************************************/
function get_city_production_type_sprite(pcity)
{
  if (pcity == null) return null;
  if (pcity['production_kind'] == VUT_UTYPE) {
    var punit_type = unit_types[pcity['production_value']];
    return {"type":punit_type,"sprite":get_unit_type_image_sprite(punit_type)};
  }

  if (pcity['production_kind'] == VUT_IMPROVEMENT) {
    var improvement = improvements[pcity['production_value']];
    return {"type":improvement,"sprite":get_improvement_image_sprite(improvement)};
  }

  return null;
}

/**************************************************************************
 Returns the name of the current city production.
**************************************************************************/
function get_city_production_type(pcity)
{
  if (pcity == null) return null;
  if (pcity['production_kind'] == VUT_UTYPE) {
    var punit_type = unit_types[pcity['production_value']];
    return punit_type;
  }

  if (pcity['production_kind'] == VUT_IMPROVEMENT) {
    var improvement = improvements[pcity['production_value']];
    return improvement;
  }

  return null;
}

/**************************************************************************
 Returns the next unittype the city has queued, or null if it has none.
**************************************************************************/
function get_next_unittype_city_has_queued(pcity)
{
  if (pcity == null) return null;

  var ptype = null;

  if (pcity['production_kind'] == VUT_UTYPE) {
    ptype = unit_types[pcity['production_value']];
    return ptype;
  } else if (pcity['worklist'].length) {
    for (let i=0; i<pcity['worklist'].length; i++) {
      if (pcity['worklist'][i]['kind'] == VUT_UTYPE) {
        ptype = unit_types[pcity['worklist'][i]['value']];
        return ptype;
      }
    }
  }
  return null;
}

/**************************************************************************
 Returns the number of turns to complete current city production.
**************************************************************************/
function get_city_production_time(pcity)
{
 if (pcity == null) return FC_INFINITY;

  if (pcity['production_kind'] == VUT_UTYPE) {
    var punit_type = unit_types[pcity['production_value']];
    return city_turns_to_build(pcity, punit_type, true, true);
  }

  if (pcity['production_kind'] == VUT_IMPROVEMENT) {
    var improvement = improvements[pcity['production_value']];
    if (improvement['name'] == "Coinage") {
      return FC_INFINITY;
    }

    return city_turns_to_build(pcity, improvement, true, false);
  }

  return FC_INFINITY;
}


/**************************************************************************
 Returns city production progress, eg. the string "5 / 30"
**************************************************************************/
function get_production_progress(pcity)
{
  if (pcity == null) return " ";

  if (touch_device)
  {
    if (pcity['production_kind'] == VUT_UTYPE) {
      return "<span style='font-size:70%;'>(" + pcity['shield_stock'] + ")</span>";
    }

    if (pcity['production_kind'] == VUT_IMPROVEMENT) {
      var improvement = improvements[pcity['production_value']];
      if (improvement['name'] == "Coinage") {
        return "<span style='font-size:70%;'>(" + pcity['shield_stock']
        + "<img class='v' src='/images/e/shield.png'>)</span>";
      }
      return "<span style='font-size:70%;'>(" + pcity['shield_stock'] + ")</span>";
    }
  } else {
      if (pcity['production_kind'] == VUT_UTYPE) {
        var punit_type = unit_types[pcity['production_value']];
        return pcity['shield_stock'] + "/"
              + universal_build_shield_cost(pcity, punit_type);
      }

      if (pcity['production_kind'] == VUT_IMPROVEMENT) {
        var improvement = improvements[pcity['production_value']];
        if (improvement['name'] == "Coinage") {
          return pcity['shield_stock']+"<img class='v' src='/images/e/shield.png'>";
        }
        return  pcity['shield_stock'] + "/"
                + universal_build_shield_cost(pcity, improvement);
      }
  }
  return " ";
}

/**************************************************************************
 Returns the gold cost per shield to buy off current city prod target
**************************************************************************/
function get_gold_cost_per_shield(pcity)
{
  var accumulated = pcity['shield_stock'], // shields invested
      buy_cost = pcity['buy_cost'],        // gold cost to buy product
      total_shields = 0, // total shield cost of product
      remaining = 0,     // remaining shields
      gcps = 0;          // gold cost per shield

  if (buy_cost == 0) return "No";  // can't buy

  if (pcity['production_kind'] == VUT_UTYPE) {
    var punit_type = unit_types[pcity['production_value']];
    total_shields = universal_build_shield_cost(pcity, punit_type);
  }
  else if (pcity['production_kind'] == VUT_IMPROVEMENT) {
    var improvement = improvements[pcity['production_value']];
    if (improvement['name'] != "Coinage")
      total_shields = universal_build_shield_cost(pcity, improvement);
  }

  remaining = total_shields - accumulated;
  gcps = buy_cost / remaining;
  return gcps.toFixed(2);
}
/**************************************************************************
 Returns the remaining shields left on a city's production target
**************************************************************************/
function get_shields_remaining(pcity)
{
  var accumulated = pcity['shield_stock'], // shields invested
  total_shields = 0, // total shield cost of product
  remaining = 0;     // remaining shields

  if (pcity['production_kind'] == VUT_UTYPE) {
    var punit_type = unit_types[pcity['production_value']];
    total_shields = universal_build_shield_cost(pcity, punit_type);
  }
  else if (pcity['production_kind'] == VUT_IMPROVEMENT) {
    var improvement = improvements[pcity['production_value']];
    if (improvement['name'] != "Coinage")
      total_shields = universal_build_shield_cost(pcity, improvement);
  }

  remaining = total_shields - accumulated;

  return remaining > 0 ? remaining : 0;
}

/**************************************************************************
...
**************************************************************************/
function generate_production_list(pcity)
{
  var production_list = [];
  const gov_id = city_owner(pcity).government;

  // THIS was a clean-up of DIRTY hard-coding. If it fails, see commits for 23Feb2021 to revert.
  for (var unit_type_id in unit_types) {
    var punit_type = unit_types[unit_type_id];

    if (utype_has_flag(punit_type, UTYF_NOBUILD)) continue;

    if (punit_type.government_req < GOV_LAST) {         // IF Unit has a government requirement
      if (punit_type.goverment_req != gov_id) continue; // gov_req != player's GOV: can't build
    }

    // Exclude major nukes and minor nukes based on whether server settings say to do so:
    if (utype_has_flag(punit_type, UTYF_NUCLEAR)) {
      if (!server_settings['nukes_minor']['val']) continue; // Nukes totally turned off in this game, skip them
      if (!server_settings['nukes_major']['val']) { // bombard_rate !=0 or !=-1 is a major nuke, skip if game settings have turned it off.
        if (punit_type['bombard_rate']>0) continue;
        if (punit_type['bombard_rate']<-1) continue;
      }
    }

    if (is_small_screen())
    {
      production_list.push({"kind": VUT_UTYPE, "value" : punit_type['id'],
                            "text": punit_type['name'],
                        "helptext": cleaned_text(punit_type['helptext']),
                       "rule_name": punit_type['rule_name'],
                      "build_cost": get_universal_discount_price(punit_type),
                    "unit_details": "A<b style='font-family:Helvetica'>" + fractionalize(utype_real_base_attack_strength(punit_type))
                                  + "</b>D<b style='font-family:Helvetica'>" + fractionalize(utype_real_base_defense_strength(punit_type))
                                  + (punit_type['firepower']>1 ? "F<b style='font-family:Helvetica'>"+punit_type['firepower']+"</b> " : "")
                                  + "</b>H<b style='font-family:Helvetica'>"+punit_type['hp'],
                         "sprite" : get_unit_type_image_sprite(punit_type)});

    } else {
      var move_bonus = parseInt(punit_type['move_bonus'][0]) ? parseInt(punit_type['move_bonus'][0]) : 0;
      production_list.push({"kind": VUT_UTYPE, "value" : punit_type['id'],
                            "text": punit_type['name'],
	                      "helptext": cleaned_text(punit_type['helptext']),
                       "rule_name": punit_type['rule_name'],
                      "build_cost": get_universal_discount_price(punit_type),
                    "unit_details": (utype_real_base_attack_strength(punit_type) > 0
                                    ? ("A<b style='font-family:Helvetica'>"+fractionalize(utype_real_base_attack_strength(punit_type)) + "</b> ")
                                    : ("")) //("<s>A</s><style='font-family:Helvetica'> "))
                                  + (utype_real_base_defense_strength(punit_type) > 0
                                    ? ("D<b style='font-family:Helvetica'>"+fractionalize(utype_real_base_defense_strength(punit_type)) + "</b> ")
                                    : ("")) //("<s>D</s><style='font-family:Helvetica'> "))
                                  + (punit_type['firepower']>1 ? "F<b style='font-family:Helvetica'>"+punit_type['firepower']+"</b> " : "")
                                  + "H<b style='font-family:Helvetica'>"+punit_type['hp']+"</b> "
                                  + "M<b style='font-family:Helvetica'>"
                                  + move_points_text((parseInt(punit_type['move_rate'])+move_bonus), true)+""
                                    + (punit_type['fuel'] ? "</b><sub>"+punit_type['fuel']+"</sub>" : "</b>")
                                  + (punit_type['transport_capacity'] ? " C<b style='font-family:Helvetica'>"+punit_type['transport_capacity']+"</b>" : "")+"",
                          "sprite": get_unit_type_image_sprite(punit_type)});
    }
  }

  for (var improvement_id in sorted_improvements) {
    var pimprovement = improvements[sorted_improvements[improvement_id].id];
    var build_cost = universal_build_shield_cost(active_city, pimprovement);
    var building_details = pimprovement['upkeep'];
    if (pimprovement['name'] == "Coinage") {
        build_cost = "-";
        building_details = "-";
    }
    // Suppress improvements if server settings don't allow them:
    if (!server_settings['nukes_major']['val']
        && pimprovement['name'] == "Enrichment Facility") {
          continue; // if major nukes are OFF, suppress illegal prod choice.
    }
    else if (!server_settings['nukes_minor']['val']
             && pimprovement['name'] == "Manhattan Project") {
          continue; // if minor nukes are OFF, suppress illegal prod choice.
    }
    // Suppress improvements with special obsolete conditions
    if (client_rules_flag[CRF_MP2] // MP2 all versions
               && pimprovement['name'] == "Great Wall"
               && player_invention_state(client.conn.playing, tech_id_by_name('Machine Tools')) == TECH_KNOWN) {
                 continue;
    }

    production_list.push({"kind": VUT_IMPROVEMENT,
                         "value": pimprovement['id'],
                          "text": pimprovement['name'],
                      "helptext": cleaned_text(pimprovement['helptext']),
                     "rule_name": pimprovement['rule_name'],
                    "build_cost": build_cost,
                  "unit_details": building_details,
                        "sprite": get_improvement_image_sprite(pimprovement) });
  }
  return production_list;
}

/**************************************************************************
  Return whether given city can build given unit; returns FALSE if unit is
  obsolete.
**************************************************************************/
function can_city_build_unit_now(pcity, punittype_id)
{
  return (pcity != null && pcity['can_build_unit'] != null
          && pcity['can_build_unit'][punittype_id] == "1");
}

/**************************************************************************
  Return whether given city can build given building; returns FALSE if
  the building is obsolete.
**************************************************************************/
function can_city_build_improvement_now(pcity, pimprove_id)
{
  if (pimprove_id === null || pimprove_id === undefined) return false;

  return (pcity != null && pcity['can_build_improvement'] != null
          && !city_has_building(pcity, pimprove_id) //redundant insurance for line below
          && pcity['can_build_improvement'][pimprove_id] == "1");
}
/**************************************************************************
  Return: * true,  if a city can build an improvement now,
          * true,  if city can't build now but can add to queue,
          * false, if city can neither build now nor add to queue.
**************************************************************************/
function can_city_queue_improvement(pcity, pimprove_id)
{
  if (pimprove_id === null || pimprove_id === undefined) return false;

  // City CAN'T queue what it already has:
  if (city_has_building(pcity, pimprove_id)) return false;
  // Don't show items already queued:
  if (city_has_building_in_queue(pcity, pimprove_id)) return false;
  // ...and it CAN queue what it's allowed to build now:
  if (can_city_build_improvement_now(pcity, pimprove_id)) return true;

  // OTHERWISE, City can queue IF it has the tech && pre-req building is in worklist:
  // if building has reqs
  if (improvements[pimprove_id]['reqs'].length > 0) {
    // if player has required tech
    if (player_invention_state(client.conn.playing, improvements[pimprove_id]['reqs'][0]['value']) == TECH_KNOWN) {
      // if building has a second req
      if (improvements[pimprove_id]['reqs'].length > 1) {
        // if second req is another building
        if (improvements[pimprove_id]['reqs'][1]['kind'] == VUT_IMPROVEMENT) {
          // if the building req is already queued
          if (city_has_building_in_queue(pcity, improvements[pimprove_id]['reqs'][1]['value'])) {
            return true; // req for this building is in queue, so let player append this to queue
          } // else return false; // req for this building is not in worklist
        } // else return false; // second req is not a building (probably terrain req)
      } // else return false; // can't build now and has tech = something else was wrong
    } // else return false; // player lacked the tech
  }
  return false;
}
/**************************************************************************
  Return whether given city can queue given item to worklist
**************************************************************************/
function can_city_queue_item(pcity, kind, value)
{
  var can_build = can_city_build_now(pcity, kind, value);
  var can_build_later = can_city_build_later(pcity, kind, value);

    // Suppress improvements already in queue (except Coinage and Space Parts)
    if (can_build && kind==VUT_IMPROVEMENT) {
      if (improvements[value]['genus'] != GENUS_SPECIAL
          && (city_has_building_in_queue(pcity, value)
          || city_has_building(pcity, value))
          ) {

        return false;
      }
    }

    return (can_build | can_build_later);
}
/**************************************************************************
  Return whether given city can build given item.
**************************************************************************/
function can_city_build_now(pcity, kind, value)
{
  return kind != null && value != null &&
       ((kind == VUT_UTYPE)
       ? can_city_build_unit_now(pcity, value)
       : can_city_build_improvement_now(pcity, value));
}
/**************************************************************************
  Return whether given city can build the item very soon because upcoming
  research or a pre-req building in the queue ahead of it.
**************************************************************************/
function can_city_build_later(pcity, kind, value)
{
  const gov_id = city_owner(pcity).government
  var can_build_later = false;
  var can_build = can_city_build_now(pcity, kind, value)
  var req_num = undefined;

  // Suppress improvements already in queue (except Coinage and Space Parts)
  if (can_build && kind==VUT_IMPROVEMENT) {
    if (improvements[value]['genus'] != GENUS_SPECIAL
        && city_has_building_in_queue(pcity, value)) {
          can_build_later=false;
    }
  }
  else if (!can_build && techs[client.conn.playing['researching']]) { // player must be researching something
    if (kind == VUT_IMPROVEMENT) {
      if (improvements[value]['reqs'].length > 0 && client.conn.playing['researching'] ) {
        /* FIX: former code assumed improvements[value]['reqs'][0]['kind'] == 1 (tech req kind), and that the
           ruleset has the tech req first. What this code does now is loop through all reqs looking for kind==1,
           find the index of that req instead of hard-coding req index 0. This fixes bugs such as a req that
           building 56 is not present in req index 0 was interpreted as improvement had tech 56 as a req, so if
           researching tech 56, it would falsely show this improvement as "can_build_later."
        ....................
        Briefly tested fix which replaces hardcoded [0] with [req_num] for testing a positive tech requirement of
        the improvement. Replaced the [0] with [req_num] in the code block below it...*/
        for (req_index=0; req_index<improvements[value]['reqs'].length; req_index++) {
          if (improvements[value]['reqs'][req_index]['kind'] == 1
              && improvements[value]['reqs'][req_index]['present'] == true) {

              // found a req that positively requires presence/possession of a tech; record the req_num and exit
              req_num = req_index;
              break;
          }
        }
        if (req_num !== undefined) { // <end fix>
          if (improvements[value]['reqs'][req_num]['value'] == techs[client.conn.playing['researching']]['id']) {
            if (!city_has_building_in_queue(pcity, value)) {
              // check if there is second req blocking this (i.e. req for coastal/river)
              if (improvements[value]['reqs'].length > 1) {
                //second req type, 1==tech, 3==building, 14=coastal, 23=river adjacency
                var req_type = improvements[value]['reqs'][1]['kind'];
                // TODO: this lazy heuristic hack disqualifies all req_type>3 because checking for coastal is 14
                // but checking for other common stuff is almost always kind 1,2,3. TODO, a big chain of req type
                // checking in a separate function for seeing which reqs are fulfilled, gradually expanded as
                // made necessary by rulesets...
                if (req_type > 3) can_build_later = false; // forbid unusual reqs (avoid showing illegal choices)
                else can_build_later = true;
              } else can_build_later = true; // no second req, so show item
            }
          }
        }
      }
    } else if (kind == VUT_UTYPE) {
      // Player is researching the tech for the unit, so we usually will let them queue it later in list:
      if (unit_types[value]['tech_requirement'] == techs[client.conn.playing['researching']]['id']) {
        if (unit_types[value].gov_requirement < GOV_LAST && unit_types[value].gov_requirement != gov_id) {
          /* ...unless there is also a Govt req for it, e.g., Fanatics, and they aren't the right Gov:  */
          can_build_later = false;
        }
        else can_build_later = true;
        /* ...unless it's a ship and someone wants to hard-code for checking landlocked, river, canal, ocean, and compare to
           unit_class native types and all that jazz which gets very complex and performance laggy for every unit in the list:  */
        var class_name = unit_classes[unit_types[value]['unit_class_id']]['name'].replace("?unitclass:","");
        if (class_name == "Sea" || class_name == "RiverShip" || class_name == "Submarine" || class_name == "Trireme")
          can_build_later = false;
      }
    }
  }
  // Special case: tech reqs met but required building not present; add to list if the pre-req building is in the worklist
  if (!can_build && kind == VUT_IMPROVEMENT) {
    if (can_city_queue_improvement(pcity, value))
      can_build_later = true;
  }

  return can_build_later;
}
/**************************************************************************
  Return TRUE iff the city has this building in it.
**************************************************************************/
function city_has_building(pcity, improvement_id)
{
  if (improvement_id === null || improvement_id === undefined) return false;

  return 0 <= improvement_id && improvement_id < ruleset_control.num_impr_types
    && pcity['improvements'] && pcity['improvements'].isSet(improvement_id);
}
/**************************************************************************
  Return TRUE iff the city has this building in its production worklist
**************************************************************************/
function city_has_building_in_queue(pcity, improvement_id)
{
  if (improvement_id === null || improvement_id === undefined) return false;
  if (pcity == null || pcity['worklist'] == null) return false;

  // Go through each item in worklist looking for improvement
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
    if (prod_kind == VUT_IMPROVEMENT && prod_value == improvement_id)
      return true;
  }
  return false;
}


/**************************************************************************
 Calculates the turns which are needed to build the requested
 improvement in the city.  GUI Independent.
**************************************************************************/
function city_turns_to_build(pcity, target, include_shield_stock, is_unit)
{
  var city_shield_surplus =  pcity['surplus'][O_SHIELD];
  var city_shield_stock = include_shield_stock ? pcity['shield_stock'] : 0;
  var cost = universal_build_shield_cost(pcity, target);

  if (include_shield_stock == true && (pcity['shield_stock'] >= cost)) {
    return 1;
  } else if ( pcity['surplus'][O_SHIELD] > 0) {
    return Math.floor((cost - city_shield_stock - 1) / city_shield_surplus + 1);
  } else {
    return FC_INFINITY;
  }
}

/**************************************************************************
Clicking on what a city is producing from the city list activates that city
  and sets the tab to the prod tab
**************************************************************************/
function city_change_prod(city_id)
{
  active_city = city_id;

  city_tab_index = 1;   // 1 is the city production screen
  show_city_dialog_by_id(active_city);  // show the production screen
}

/**************************************************************************
Send buy command for a non-active city. (Called from city list or elsewhere
**************************************************************************/
function request_city_id_buy(city_id)
{
  active_city = null;               // this function called without an active city, make sure it stays that way
  inactive_city = cities[city_id];  // lets request_city_buy() know which city wants to buy
  request_city_buy();
  active_superpanel_cityid = city_id; // keep superpanel active after city list redraw
  //inactive_city = null;           // reset to null
}

/**************************************************************************
 Show buy production in city dialog
**************************************************************************/
function request_city_buy()
{
  var pcity = null;

  if (active_city == null) {
    pcity = inactive_city; // if active_city was null this function was called from city list without an active_city
  }
  else {
    pcity = active_city;
  }

  var pplayer = client.conn.playing;

  // reset dialog page.
  remove_active_dialog("#dialog");
  $("<div id='dialog'></div>").appendTo("div#game_page");
  var buy_price_string = "";
  var buy_question_string = "";

  if (pcity['production_kind'] == VUT_UTYPE) {
    var punit_type = unit_types[pcity['production_value']];
    if (punit_type != null) {
      buy_price_string = punit_type['name'] + " costs " + pcity['buy_cost'] + " gold.";
      buy_question_string = "Buy " + punit_type['name'] + " for <b>" + pcity['buy_cost'] + "</b> gold";
    }
  } else {
    var improvement = improvements[pcity['production_value']];
    if (improvement != null) {
      buy_price_string = improvement['name'] + " costs " + pcity['buy_cost'] + " gold.";
      buy_question_string = "Buy " + improvement['name'] + " for <b>" + pcity['buy_cost'] + "</b> gold";
    }
  }

  var cost_per_shield_text = " @ "+get_gold_cost_per_shield(pcity)+"g/shield ?";
  var treasury_text = "<br>Treasury contains " + pplayer['gold'] + " gold.";

  if (pcity['buy_cost'] == 0 || pcity['buy_cost'] > pplayer['gold']) {
    show_dialog_message("Purchase not possible",
      buy_price_string + treasury_text);
    return;
  }

  var dhtml = buy_question_string + cost_per_shield_text + treasury_text;


  $("#dialog").html(dhtml);

  $("#dialog").attr("title", "Buy It!");
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "95%" : "50%",
			buttons: {
				"Yes": function() {
            send_city_buy();
            remove_active_dialog("#dialog");
				},
				"No (𝗪)": function() {
            remove_active_dialog("#dialog");
				}
			}
		});

  $("#dialog").dialog('open');
  dialog_register("#dialog");
}

/**************************************************************************
 Buy whatever is being built in the city.
**************************************************************************/
function send_city_buy()
{
   //active_city is if player in a city dialog
   //inactive_city is if a player bought from the list without activating the city

  if (active_city != null) {
    var packet = {"pid" : packet_city_buy, "city_id" : active_city['id']};
    send_request(JSON.stringify(packet));
  }
  else if (inactive_city != null) {
    var packet = {"pid" : packet_city_buy, "city_id" : inactive_city['id']};
    send_request(JSON.stringify(packet));
  }
  else show_dialog_message("Please Report bug:", "send_city_buy() in city.js has no active or inactive city specified. Code:767");
}

/**************************************************************************
 Change city production.
**************************************************************************/
function send_city_change(city_id, kind, value)
{
  var packet = {"pid" : packet_city_change, "city_id" : city_id,
                "production_kind": kind, "production_value" : value};
  send_request(JSON.stringify(packet));
}

/**************************************************************************
 Does a simple close of the city dialog, which will trigger the
  event-based close_city_dialog() further below
**************************************************************************/
function close_city_dialog_trigger()
{
  closed_dialog_already = true;
  $("#city_dialog").dialog('close');
}

/**************************************************************************
 Close city dialog - shutdown and housekeeping: handle 4 different ways it
  could close in 2 different tabs
**************************************************************************/
function close_city_dialog()
{
  if (closed_dialog_already == false) $("#city_dialog").dialog('close');
  else closed_dialog_already = false; // reset value for next time.

  var active_tab = $("#tabs").tabs("option", "active");
  if (active_tab != TAB_MAP) {
    keyboard_input=false;  // stops ESC from propagating up to 'double-ESC' out of cities tab
    setTimeout(function(){keyboard_input=true},250); // turn back on when finished
  }
  else set_default_mapview_active();

  worklist_dialog_active = false;
  setup_window_size(); // Reset map to full size after it was a city worked tile map

  if (active_city) {  // map will be centered on city that was being viewed
    center_tile_mapcanvas(city_tile(active_city));
    active_city = null;
    //if (renderer == RENDERER_2DCANVAS) update_map_canvas_full();
    update_map_canvas_full();
  }

  // Closing city dialog re-shows container for minimized windows:
  if (is_small_screen())
    $("#dialog-extend-fixed-container").show();
}

/**************************************************************************
 The city map has been clicked.
**************************************************************************/
function do_city_map_click(ptile)
{
  var packet = null;
  var city_id = active_city['id'];
  if (ptile['worked'] == city_id) {

    // Disallow attempting specialist if clicking someone else's worked tile:
    if (ptile.owner != client.conn.playing.playerno
      && ptile.owner != UNCLAIMED_LAND) {
      play_sound("click_illegal.ogg");
      return;
    }

    packet = {"pid"     : packet_city_make_specialist,
              "city_id" : city_id,
              "tile_id" : ptile['index'],
              "specialist_to": (selected_specialist ? selected_specialist : 0)
             };
  } else {
    // Disallow attempting to work a tile not in the city's workable map:
    if (!city_map_includes_tile(ptile, active_city)) {
      play_sound("click_illegal.ogg");
      return;
    }

    packet = {"pid"     : packet_city_make_worker,
              "city_id" : city_id,
              "tile_id" : ptile['index']};
  }

  send_request(JSON.stringify(packet));
  //play_sound("click_legal.ogg");
}

/**************************************************************************
..
**************************************************************************/
function does_city_have_improvement(pcity, improvement_name)
{
  if (pcity == null || pcity['improvements'] == null) return false;

  for (var z = 0; z < ruleset_control.num_impr_types; z++) {
    if (pcity['improvements'] != null && pcity['improvements'].isSet(z) && improvements[z] != null
        && improvements[z]['name'] == improvement_name) {
      return true;
    }
  }
  return false;
}

/**************************************************************************
  Shows the Request city name dialog to the user.
**************************************************************************/
function city_name_dialog(suggested_name, unit_id) {
  // reset dialog page.
  $("#city_name_dialog").remove();
  $("<div id='city_name_dialog'></div>").appendTo("div#game_page");

  $("#city_name_dialog").html($("<div>What shall we call our new city?</div>"
                              + "<input id='city_name_req' type='text' spellcheck='false'>"));

  /* A suggested city name can contain an apostrophe ("'"). That character
   * is also used for single quotes. It shouldn't be added unescaped to a
   * string that later is interpreted as HTML. */
  /* TODO: Forbid city names containing an apostrophe or make sure that all
   * JavaScript using city names handles it correctly. Look for places
   * where a city name string is added to a string that later is
   * interpreted as HTML. Avoid the situation by directly using JavaScript
   * like below or by escaping the string. */
  $("#city_name_req").attr("value", suggested_name);

  $("#city_name_dialog").attr("title", "Build New City");
  $("#city_name_dialog").dialog({
			bgiframe: true,
			modal: true,
			width: "300",
			close: function() {
				keyboard_input=true;
        act_sel_queue_done(unit_id);
			},
			buttons: [	{
					text: "Cancel",
				        click: function() {
                  $("#city_name_dialog").remove();
                  keyboard_input=true;
                  act_sel_queue_done(unit_id);
          }
        },{
					text: "Ok",
				        click: function() {
						var name = alphanumeric_cleaner_city_names($("#city_name_req").val());
						if (name.length == 0 || name.length >= MAX_LEN_CITYNAME - 6
						    || encodeURIComponent(name).length  >= MAX_LEN_CITYNAME - 3) {
						  swal("City name is invalid. Please try a shorter name.");
              setSwalTheme();
						  return;
						}

                        var actor_unit = game_find_unit_by_number(unit_id);
                        request_unit_do_action(ACTION_FOUND_CITY,
                          unit_id, actor_unit['tile'], 0,
                          encodeURIComponent(name));
						$("#city_name_dialog").remove();
						keyboard_input=true;
            act_sel_queue_done(unit_id);
					}
					}
				]
		});

  $("#city_name_req").attr('maxlength', "30");

  $("#city_name_dialog").dialog('open');
  $("#city_name_dialog").css('color', default_dialog_text_color);

  $('#city_name_dialog').keyup(function(e) {
    if (e.keyCode == 13) {
      var name = alphanumeric_cleaner_city_names($("#city_name_req").val());

      if (name.length == 0 || name.length >= MAX_LEN_CITYNAME - 6
        || encodeURIComponent(name).length  >= MAX_LEN_CITYNAME - 3) {
        swal("City name is invalid. Please try a shorter name.");
        setSwalTheme();
        return;
      }
      var actor_unit = game_find_unit_by_number(unit_id);
      request_unit_do_action(ACTION_FOUND_CITY,
        unit_id, actor_unit['tile'], 0, encodeURIComponent(name));
	  $("#city_name_dialog").remove();
      keyboard_input=true;
      act_sel_queue_done(unit_id);
    }
  });

  blur_input_on_touchdevice();
  keyboard_input=false;
}

/**************************************************************************
..
**************************************************************************/
function next_city()
{
  if (!client.conn.playing) return;

  update_city_screen(); // force an update:, city_screen_updater is now more
  // efficient at not firing when cities tab isn't open
  //city_screen_updater.fireNow(); for some reason this wasn't firing?

  var next_row = $('#cities_list_' + active_city['id']).next();
  if (next_row.length === 0) {
    // Either the city is not in the list anymore or it was the last item.
    // Anyway, go to the beginning
    next_row = $('#city_table tbody tr').first();
  }
  if (next_row.length > 0) {
    // If there's a city
    show_city_dialog(cities[next_row.attr('id').substr(12)]);
  }
}

/**************************************************************************
..
**************************************************************************/
function previous_city()
{
  if (!client.conn.playing) return;

  update_city_screen(); // force an update: city_screen_updater is now more
  // efficient at not firing when cities tab isn't open
  //city_screen_updater.fireNow(); for some reason this wasn't firing?

  var prev_row = $('#cities_list_' + active_city['id']).prev();
  if (prev_row.length === 0) {
    // Either the city is not in the list anymore or it was the last item.
    // Anyway, go to the end
    prev_row = $('#city_table tbody tr').last();
  }
  if (prev_row.length > 0) {
    // If there's a city
    show_city_dialog(cities[prev_row.attr('id').substr(12)]);
  }
}

/**************************************************************************
..
**************************************************************************/
function city_sell_improvement(event, improvement_id)
{
  // meta-Click is for show help
  if (metaKey(event)) {
    /* Manually set quick_help_in_progress because the city dialog can jostle
     * the touchy sensitive help screen which blanks out when it detects and
     * resizing or UI changes, and here we triggering the help tab PRIOR to
     * calling help_redirect() */
    quick_help_in_progress = true;
    if (TAB_MAP === $("#tabs").tabs("option", "active")) {
      close_city_dialog_trigger();
      $('#ui-id-7').trigger("click");  // help tab
    }
    else {
      close_city_dialog_trigger();
      $('#ui-id-7').trigger("click");  // help tab
    }
    setTimeout(function() {
      help_redirect(VUT_IMPROVEMENT, improvement_id);
    },0);
    return;
  }
  // end show_help

  city_sell_improvement_in(active_city['id'], improvement_id);
}
/**************************************************************************
 This can sell an improvement without an active city, such as from Cities
 List. It's called from SuperPanel. It will redraw the improvement pane
 several times to refresh after packet has triggered a redraw of the page.
**************************************************************************/
function city_sell_improvement_in(city_id, improvement_id)
{
  swal({
    title: "Sell Building",
    text: "Sell "+improvements[improvement_id].name+" in "+cities[city_id]['name']+"?",
    type: "warning",
    showCancelButton: true,
    //confirmButtonColor: "#308030",
    confirmButtonText: "SELL",
    closeOnConfirm: true,
    html : true
  }, function(){
       var packet = {"pid" : packet_city_sell, "city_id" : cities[city_id]['id'],
                    "build_id": improvement_id};
        send_request(JSON.stringify(packet));
        active_superpanel_cityid = city_id;
        // Play sound for normal building sale but not wonders (which can't happen)
        //if (improvements[improvement_id].genus == GENUS_IMPROVEMENT)
         // play_sound(soundset["e_imp_sold"]);
    });
  setSwalTheme();
}
/**************************************************************************
  Create text describing city growth.
**************************************************************************/
function city_turns_to_growth_text(pcity)
{
  var turns = pcity['granary_turns'];
  var small = is_small_screen();

  if (turns == 0) {
    return "blocked";
  } else if (turns > 1000000) {
    return " ";
  } else if (turns == -1) {
    return small ? "&#9662; <b><u>1 turn</u></b>" : "&#9662; <b><u>1 turn</u></b>";  // plural to singular and bold message for starvation crisis
  } else if (turns < -1) {
    return small ? "&#9662; " + Math.abs(turns) : "&#9662; " + Math.abs(turns) + " turns";
  } else if (turns ==1) {
    return small ? "<b>&nbsp;1 turn</b>" : "<b>&nbsp;1 turn</b>";
} else {
    return turns + " turns";
  }
}

/**************************************************************************
  Returns an index for a flat array containing x,y data.
  dx,dy are displacements from the center, r is the "radius" of the data
  in the array. That is, for r=0, the array would just have the center;
  for r=1 it'd be (-1,-1), (-1,0), (-1,1), (0,-1), (0,0), etc.
  There's no check for coherence.
**************************************************************************/
function dxy_to_center_index(dx, dy, r)
{
  return (dx + r) * (2 * r + 1) + dy + r;
}

/**************************************************************************
  Converts from coordinate offset from city center (dx, dy),
  to index in the city_info['food_output'] packet.
**************************************************************************/
function get_city_dxy_to_index(dx, dy, pcity)
{
  build_city_tile_map(pcity.city_radius_sq);
  var city_tile_map_index = dxy_to_center_index(dx, dy, city_tile_map.radius);
  var ctile = city_tile(pcity);
  return get_city_tile_map_for_pos(ctile.x, ctile.y)[city_tile_map_index];
}

/**************************************************************************
  Builds city_tile_map info for a given squared city radius.
**************************************************************************/
function build_city_tile_map(radius_sq)
{
  if (city_tile_map == null || city_tile_map.radius_sq < radius_sq) {
    var r = Math.floor(Math.sqrt(radius_sq));
    var vectors = [];

    for (var dx = -r; dx <= r; dx++) {
      for (var dy = -r; dy <= r; dy++) {
        var d_sq = map_vector_to_sq_distance(dx, dy);
        if (d_sq <= radius_sq) {
          vectors.push([dx, dy, d_sq, dxy_to_center_index(dx, dy, r)]);
        }
      }
    }

    vectors.sort(function (a, b) {
      var d = a[2] - b[2];
      if (d !== 0) return d;
      d = a[0] - b[0];
      if (d !== 0) return d;
      return a[1] - b[1];
    });

    var base_map = [];
    for (var i = 0; i < vectors.length; i++) {
      base_map[vectors[i][3]] = i;
    }

    city_tile_map = {
      radius_sq: radius_sq,
      radius: r,
      base_sorted: vectors,
      maps: [base_map]
    };
  }
}

/**************************************************************************
  Helper for get_city_tile_map_for_pos.
  From position, radius and size, returns an array with delta_min,
  delta_max and clipped tile_map index.
**************************************************************************/
function delta_tile_helper(pos, r, size)
{
  var d_min = -pos;
  var d_max = (size-1) - pos;
  var i = 0;
  if (d_min > -r) {
    i = r + d_min;
  } else if (d_max < r) {
    i = 2*r - d_max;
  }
  return [d_min, d_max, i];
}

/**************************************************************************
  Builds the city_tile_map with the given delta limits.
  Helper for get_city_tile_map_for_pos.
**************************************************************************/
function build_city_tile_map_with_limits(dx_min, dx_max, dy_min, dy_max)
{
  var clipped_map = [];
  var v = city_tile_map.base_sorted;
  var vl = v.length;
  var index = 0;
  for (var vi = 0; vi < vl; vi++) {
    var tile_data = v[vi];
    if (tile_data[0] >= dx_min && tile_data[0] <= dx_max &&
        tile_data[1] >= dy_min && tile_data[1] <= dy_max) {
      clipped_map[tile_data[3]] = index;
      index++;
    }
  }
  return clipped_map;
}

/**************************************************************************
  Returns the mapping of position from city center to index in city_info.
**************************************************************************/
function get_city_tile_map_for_pos(x, y)
{
  if (topo_has_flag(TF_WRAPX)) {
    if (topo_has_flag(TF_WRAPY)) {

      // Torus
      get_city_tile_map_for_pos = function (x, y) {
        return city_tile_map.maps[0];
      };

    } else {

      // Cylinder with N-S axis
      get_city_tile_map_for_pos = function (x, y) {
        var r = city_tile_map.radius;
        var d = delta_tile_helper(y, r, map.ysize)
        if (city_tile_map.maps[d[2]] == null) {
          var m = build_city_tile_map_with_limits(-r, r, d[0], d[1]);
          city_tile_map.maps[d[2]] = m;
        }
        return city_tile_map.maps[d[2]];
      };

    }
  } else {
    if (topo_has_flag(TF_WRAPY)) {

      // Cylinder with E-W axis
      get_city_tile_map_for_pos = function (x, y) {
        var r = city_tile_map.radius;
        var d = delta_tile_helper(x, r, map.xsize)
        if (city_tile_map.maps[d[2]] == null) {
          var m = build_city_tile_map_with_limits(d[0], d[1], -r, r);
          city_tile_map.maps[d[2]] = m;
        }
        return city_tile_map.maps[d[2]];
      };

    } else {

      // Flat
      get_city_tile_map_for_pos = function (x, y) {
        var r = city_tile_map.radius;
        var dx = delta_tile_helper(x, r, map.xsize)
        var dy = delta_tile_helper(y, r, map.ysize)
        var map_i = (2*r + 1) * dx[2] + dy[2];
        if (city_tile_map.maps[map_i] == null) {
          var m = build_city_tile_map_with_limits(dx[0], dx[1], dy[0], dy[1]);
          city_tile_map.maps[map_i] = m;
        }
        return city_tile_map.maps[map_i];
      };

    }
  }

  return get_city_tile_map_for_pos(x, y);
}

/**************************************************************************
  Returns true if a tile is legally workable by a city
**************************************************************************/
function city_map_includes_tile(ptile, pcity)
{
  if (!ptile || !pcity) return false;

  var radius = pcity.city_radius_sq;
  var ctile = city_tile(pcity);
  var dist = sq_map_distance(ptile, ctile);

  /* To be in the workable city map, a tile must be:
     1. ...in the city's workable city_radius_sq
     2. ...not owned by a player other than city's owner */
  if (dist > radius) {
    return false;
  }
  else if (ptile.owner == UNCLAIMED_LAND) {
    return true;
  }
  else if (ptile.owner != pcity.owner) {
    return false;
  }

  return true;
}

/**************************************************************************
  Toggles specialist control pane in city title bar.
**************************************************************************/
function toggle_specialist_control_pane()
{
  if (show_specialist_pane==false)  {
    show_specialist_pane = !show_specialist_pane;
    $("#scp_show").hide(); // hide indicator to open/show the pane since it's opening
    show_city_dialog(active_city); // force update
  } else {
    selected_specialist = -1; // redundant safety for future use
    show_specialist_pane = !show_specialist_pane;
    $("#scp_show").show(); // show indicator to reopen/show the pane since it's opening
    show_city_dialog(active_city);
  }
}
/**************************************************************************
 Select a certain type of specialist as the replacement type by clicking
  on the selector title panel.
**************************************************************************/
//
var specialist_border_select = "2px solid #fff";
var specialist_border_normal = "2px solid #000";
//
function city_select_specialist(event, to_specialist_id)
{
  const num_specialists = Object.keys(specialists).length;
  var spec_type_name;

  // Reset any selected/underlined specialist from previously
  for (i=0; i<num_specialists; i++) {
    spec_type_name = specialists[i]['plural_name'];
    $("#sp_t"+i).css({"border-bottom":specialist_border_normal});
    $("#sp_t"+i).attr({"title":"Assign "+spec_type_name});
  }
  if (selected_specialist != to_specialist_id) {
    selected_specialist = to_specialist_id;
    spec_type_name = specialists[selected_specialist]['plural_name'];
    $("#sp_t"+selected_specialist).css({"border-bottom":specialist_border_select});
    $("#sp_t"+selected_specialist).attr({"title":"Unselect "+spec_type_name});
  } else {
    selected_specialist = -1; //clicking selected specialist will unselect it
    toggle_specialist_control_pane();  // unselecting turns the pane off
  }
}
/**************************************************************************
 Change a specialist in a city to a different type by clicking on it.
**************************************************************************/
function city_change_specialist(event, city_id, from_specialist_id)
{
  var updated = 1;  // 0=running on un-updated server, 1=server was updated
  var city_message;
  var to_specialist_id;
  var num_specialists = Object.keys(specialists).length;
  // Standard rules: cycle through 3 specialists if ruleset isn't flagged with CRF_ASMITH_SPECIALISTS:
  if (!client_rules_flag[CRF_ASMITH_SPECIALISTS]) {
    to_specialist_id = selected_specialist == -1 ? ((from_specialist_id + 1) % num_specialists) : selected_specialist;
    city_message = {"pid": packet_city_change_specialist,
    "city_id" : city_id,
    "from" : from_specialist_id,
    "to" : to_specialist_id};
  }
  else  // mp2 has specialists accessible under specific conditions
  {     // unfortunately this has to be hard-coded because the server lets you select "dead" specialists who don't meet reqs
    to_specialist_id = selected_specialist == -1 ? (from_specialist_id + 1) : selected_specialist;
    // The first 3 specialists are universally accessible. Specialists 4-6 are unlocked
    // only if the player has the Adam Smith wonder. Cycle through 3 specialists UNLESS
    // the player has Adam Smith, otherwise cycle through 6.
    if ( player_has_wonder(client.conn.playing.playerno, improvement_id_by_name(B_ADAM_SMITH_NAME)) ) {
      if (to_specialist_id == num_specialists) to_specialist_id = 0;
      // Hitting CTRL, ALT, or COMMAND-key optionally bypasses the 3 extra specialists:
      if ((event.ctrlKey||event.altKey) && to_specialist_id >=3) to_specialist_id = 0;
    } else { // no Adam Smith, also just cycle first 3
      if (to_specialist_id == 3) to_specialist_id = 0;
    }

    city_message = {"pid": packet_city_change_specialist,
    "city_id" : city_id,
    "from" : from_specialist_id,
    "to" : (event.shiftKey ? (to_specialist_id+100*updated) : to_specialist_id)};
    // adding 100 to the specialist code tells it to change all specialists.
    // this maintains compatibility to old versions
  }

  send_request(JSON.stringify(city_message));
  if (!updated) {
  /* old method: send packets one-at-a-time to change all specialists
     if using shift-click to change all specialists of this type */
    if (event.shiftKey) { // for every specialist of this type, send another packet.
      for (var s=1; s<cities[city_id].specialists[from_specialist_id]; s++) { // start at s=1, because we already sent one packet
        send_request(JSON.stringify(city_message));
      }
    }
  }
}


/**************************************************************************
...  (simplified)
**************************************************************************/
function city_can_buy(pcity)
{
  var improvement = improvements[pcity['production_value']];

  return (!pcity['did_buy'] && pcity['turn_founded'] != game_info['turn']
          && improvement['name'] != "Coinage");

}

/**************************************************************************
 Returns how many thousand citizen live in this city.
**************************************************************************/
function city_population(pcity)
{
  /*  Sum_{i=1}^{n} i  ==  n*(n+1)/2  */
  return pcity['size'] * (pcity['size'] + 1) * 5;
}


/**************************************************************************
 Rename a city
**************************************************************************/
function rename_city()
{
  if (active_city == null) return;

  // reset dialog page.
  $("#city_name_dialog").remove();
  $("<div id='city_name_dialog'></div>").appendTo("div#game_page");

  $("#city_name_dialog").html($("<div>What should we call this city?</div>"
                                + "<input id='city_name_req' type='text' spellcheck='false'>"));
  /* The city name can contain an apostrophe ("'"). That character is also
   * used for single quotes. It shouldn't be added unescaped to a
   * string that later is interpreted as HTML. */
  $("#city_name_req").attr("value", active_city['name']);
  $("#city_name_dialog").attr("title", "Rename City");
  $("#city_name_dialog").dialog({
			bgiframe: true,
			modal: true,
			width: "300",
			close: function() {
				keyboard_input=true;
			},
			buttons: [	{
					text: "Cancel",
				        click: function() {
						$("#city_name_dialog").remove();
        					keyboard_input=true;
					}
				},{
					text: "Ok",
				        click: function() {
						var name = alphanumeric_cleaner_city_names($("#city_name_req").val());
						if (name.length == 0 || name.length >= MAX_LEN_NAME - 6
						    || encodeURIComponent(name).length  >= MAX_LEN_NAME - 3) {
						  swal("City name is invalid. Please try a shorter name.");
              setSwalTheme();
						  return;
						}

						var packet = {"pid" : packet_city_rename, "name" : encodeURIComponent(name), "city_id" : active_city['id'] };
						send_request(JSON.stringify(packet));
						$("#city_name_dialog").remove();
						keyboard_input=true;
					}
					}
				]
		});
  $("#city_name_req").attr('maxlength', "30");

  $("#city_name_dialog").dialog('open');
  $("#city_name_dialog").css('color', default_dialog_text_color);

  $('#city_name_dialog').keyup(function(e) {
    if (e.keyCode == 13) {
      var name = alphanumeric_cleaner_city_names($("#city_name_req").val());

      if (name.length == 0 || name.length >= MAX_LEN_CITYNAME - 6
        || encodeURIComponent(name).length  >= MAX_LEN_CITYNAME - 3) {
        swal("City name is invalid. Please try a shorter name.");
        setSwalTheme();
        return;
      }

      var packet = {"pid" : packet_city_rename, "name" : encodeURIComponent(name), "city_id" : active_city['id'] };
      send_request(JSON.stringify(packet));
      $("#city_name_dialog").remove();
      keyboard_input=true;
    }
  });
}

/**************************************************************************
 Shows breakdown of citizen happiness by cause
**************************************************************************/
function show_city_happy_tab()
{
  if (active_city == null) {
    /* No city to show. */
    return;
  }
  const pcity = active_city;
  var citizen_types = ["angry", "unhappy", "content", "happy"];
  var causes = ["Cities","Luxury","Buildings","Nationality","Units","Wonders"];
  var cause_titles = [
      "The more cities a nation has, the harder it is to govern cities with higher population. This might cause unhappiness. Details depend on government type. See help on Governments.",
      "Each city allots Luxury according to the national luxury rate, and also through Entertainers. Luxury can also be boosted indirectly by buildings such as Marketplaces.",
      "Some types of buildings directly appease citizenry without giving Luxury; for example: Temples",
      "In some rulesets, foreign nationals may be displeased if you are at war with their home nation.",
      "In some governments, military units in the city can keep order by martial law. In other governments, units deployed abroad cause unhappiness.",
      "Wonders and Palaces in the city may give bonus effects on happiness. Wonders elsewhere in the nation may give bonuses to all cities in the nation."
  ];

  var happy_tab_html = "<header><div style='font-size: 150%'><b>Citizen Happiness</b></div><br></header>";

  happy_tab_html += "<table id='happy_table' style='border=3px;border-spacing=3;padding=30;'>"
                  + "<thead id='happy_table_head'><tr>"
                  + "<th style='text-align:left;'>Cause</th><th style='text-align:left;'>Citizens</th>"
                  + "</tr></thead><tbody>";

  for (cause in causes) {
    // Cause text table cell with title
    happy_tab_html += "<tr><td><div class='happy_cause_help' title='"+html_safe(cause_titles[cause])+"'>";
    happy_tab_html += causes[cause] + "</div></td>"
    // Table cell of all the people
    happy_tab_html += "<td><div>";

    //---------------------------------
    //Make a citizen sprite for each citizen based on mood type and specialist type
    //---------------------------------

      //MOODS
      var citizen_html = "";
      for (var s = 0; s < citizen_types.length; s++) {
        if (pcity == null || !pcity['ppl_' + citizen_types[s]] || pcity['ppl_' + citizen_types[s]].length<1) continue;
        if (pcity['ppl_' + citizen_types[s]] == null) continue;
        for (var i = 0; i < pcity['ppl_' + citizen_types[s]][cause]; i ++) {
          sprite = get_specialist_image_sprite("citizen." + citizen_types[s] + "_"
            + (i % 2));
            citizen_html = citizen_html +
          "<div class='specialist_item' style='background: transparent url("
              + sprite['image-src'] +
              ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
              + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
              +" title='One " + citizen_types[s] + " citizen'></div>";
        }
      }

      //SPECIALISTS
      for (var u = 0; u < pcity['specialists_size']; u++) {
        var spec_type_name = specialists[u]['plural_name'];
        var spec_gfx_key = specialists[u]['graphic_str'] + "_0";
        for (var j = 0; j < pcity['specialists'][u]; j++) {
          sprite = get_specialist_image_sprite(spec_gfx_key);
          citizen_html = citizen_html +
          "<div class='specialist_item' style='cursor:pointer; background: transparent url("
              + sprite['image-src'] +
              ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
              + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
              + " onclick='city_change_specialist(event, " + pcity['id'] + "," + specialists[u]['id'] + ");'"
              +" title='" + spec_type_name + " (click to change)'></div>";
        }
      }

      /* possible TO DO: this could be another table column that shows the total count for each mood
      var rapture_citizen_html = "";

      for (var i = 0; i < 4; i++) {
          if (pcity['ppl_' + citizen_types[i]][cause] > 0) {
            sprite = get_specialist_image_sprite("citizen." + citizen_types[i] + "_" + (Math.floor(i / 2)));
            rapture_citizen_html += "<div class='city_dialog_rapture_citizen' style='margin-right:auto;' title='"+citizen_types[i].charAt(0).toUpperCase() + citizen_types[i].slice(1)+" citizens'><div style='float:left;background: transparent url("
            + sprite['image-src'] + ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y'] + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;'>"
            +"</div><div style='float:left;height: "+sprite['height']+"px;margin-left:2px;'>"+pcity['ppl_' + citizen_types[i]][cause]+"</div></div>";
          }
      }
      */
      //-------------------------------

    happy_tab_html += citizen_html + "</div></td></tr>";
  }

  happy_tab_html += "</tbody></table>"
  $("#city_happy_tab").html(happy_tab_html);
  $(".happy_cause_help").tooltip({
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });

}
/**************************************************************************
 Shows traderoutes of active city
**************************************************************************/
function show_city_traderoutes()
{
  var msg;
  var routes;

  if (active_city == null) {
    /* No city to show. */
    return;
  }

  routes = city_trade_routes[active_city['id']];

  if (active_city['traderoute_count'] != 0
      && routes == null) {
    /* This city is supposed to have trade routes. It doesn't.  */
    console.log("Can't find the trade routes " + active_city['name']
                + " is said to have");
    return;
  }

  msg = "";
  for (var i = 0; i < active_city['traderoute_count']; i++) {
    var tcity_id;
    var tcity;
    var good;

    if (routes[i] == null) continue;

    tcity_id = routes[i]['partner'];

    if (tcity_id == 0 || tcity_id == null) {
      continue;
    }

    good = goods[routes[i]['goods']];
    if (good == null) {
      console.log("Missing goods type " + routes[i]['goods']);
      good = {'name': "Unknown"};
    }

    tcity = cities[tcity_id];
    if (tcity == null) continue;
    var city_flag_tag = nations[players[tcity['owner']]['nation']]['graphic_str'];
    var city_flag_url = "/images/flags/" + city_flag_tag + "-web" + get_tileset_file_extention();
    var city_flag = "<div title='Leader: "+players[tcity['owner']].name
                      + "' style='background: transparent url(" + city_flag_url
                      + "); background-size:contain; width:21px; height:14px; float:left; '></div>";
    var city_link = "<span title = 'View on map' style='cursor:pointer; color:#99ccff' "
                  + "onclick='close_city_dialog_trigger(); chatbox_scroll_to_bottom(false); center_tile_id_click("
                  + tcity.tile +")'><u>" + tcity.name+"</u></span>";
    msg += city_flag + " <div>&nbsp;Trade Route to the " + nations[players[tcity.owner].nation].adjective
        + " city of " + city_link + ": ";
    msg += "+<b class='trade_text'>" + routes[i]['value'] + "</b> base trade each turn." + "<br></div>";
  }

  if (msg == "") {
    msg = "<b>No Trade Routes.</b><br><br>";
    msg += " For info on Trade Routes:<br>Help >> Manual >> Full Game Manual >> Economy >> Trade Routes";
  }

  $("#city_traderoutes_tab").html(msg);
}

/**************************************************************************
 Gets total trade route revenue for a city
**************************************************************************/
function get_city_traderoute_revenue(city_id)
{
  var pcity = cities[city_id], total_revenue = 0;
  if (pcity == null) return 0;

  var routes = city_trade_routes[city_id];

  if (pcity['traderoute_count'] != 0 && routes == null) {
    console.log("Can't find the trade routes "+pcity['name']+" is said to have");
    return 0;
  }

  for (var i = 0; i < pcity['traderoute_count']; i++) {
    var tcity_id;
    if (routes[i] == null) continue;
    tcity_id = routes[i]['partner'];
    if (tcity_id == 0 || tcity_id == null) continue;
    total_revenue += routes[i]['value'];
  }
  return total_revenue;
}

/**************************************************************************
 Populates data to the production tab in the city dialog.
**************************************************************************/
function city_worklist_dialog(pcity)
{
  if (pcity == null) return;
  var universals_list = [];
  var kind;
  var value;

  if (pcity['worklist'] != null && pcity['worklist'].length != 0) {
    var work_list = pcity['worklist'];
    for (var i = 0; i < work_list.length; i++) {
      var work_item = work_list[i];
      kind = work_item['kind'];
      value = work_item['value'];
      if (kind == null || value == null || work_item.length == 0) continue;
      if (kind == VUT_IMPROVEMENT) {
        var pimpr = improvements[value];
	var build_cost = universal_build_shield_cost(pcity,pimpr);
	if (pimpr['name'] == "Coinage") build_cost = "-";
	universals_list.push({"name" : pimpr['name'],
		"kind" : kind,
		"value" : value,
		"helptext" : cleaned_text(pimpr['helptext']),
		"build_cost" : build_cost,
		"sprite" : get_improvement_image_sprite(pimpr)});
      } else if (kind == VUT_UTYPE) {
        var putype = unit_types[value];
        universals_list.push({"name" : putype['name'],
		"kind" : kind,
		"value" : value,
		"helptext" : cleaned_text(putype['helptext']),
		"build_cost" : get_universal_discount_price(putype, pcity),
		"sprite" : get_unit_type_image_sprite(putype)});
      } else {
        console.log("unknown kind: " + kind);
      }
    }
  }

  var worklist_html = "<table class='worklist_table'><tr style='background-color:#0004'><td>Type</td><td>Name</td><td>Cost</td></tr>";
  for (var j = 0; j < universals_list.length; j++) {
    var universal = universals_list[j];
    var sprite = universal['sprite'];
    if (sprite == null) {
      console.log("Missing sprite for " + universal[j]['name']);
      continue;
    }

    let multislot = "";
    if (universal['kind'] == VUT_UTYPE
        && utype_has_flag(unit_types[universal['value']], UTYF_MULTISLOT)) {
      multislot = "<span title='Multislot'>🔹</span>";
    }

    worklist_html += "<tr class='prod_choice_list_item"
     + (can_city_build_now(pcity, universal['kind'], universal['value']) ?
        "" : " cannot_build_item")
     + "' data-wlitem='" + j + "' "
     + " title=\"" + html_safe(cleaned_text(universal['helptext'])) + (" \n\n"+browser.metaKey)+"-CLICK: See the help manual for "+universal['name'] + "\">"
     + "<td><div class='production_list_item_sub' "
           + "style=' background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;'"
           +"></div></td>"
     + "<td class='prod_choice_name'>" + universal['name'] + "</td>"
     + "<td class='prod_choice_cost'>" + universal['build_cost']+multislot+"</td></tr>";
  }
  worklist_html += "</table>";
  $("#city_current_worklist").html(worklist_html);

  populate_worklist_production_choices(pcity);

  $('#show_unreachable_items').off('click');
  $('#show_unreachable_items').click(function() {
    opt_show_unreachable_items = !opt_show_unreachable_items;
    $('#show_unreachable_items').prop('checked', opt_show_unreachable_items);
    // TODO: properly update the selection only when needed, instead of always emptying it.
    if (production_selection.length !== 0) {
      production_selection = [];
      update_worklist_actions();
    }
    populate_worklist_production_choices(pcity);
  });

  $('#show_improvements_only').off('click');
  $('#show_improvements_only').click(function() {
    opt_show_improvements_only = !opt_show_improvements_only;
    $('#show_improvements_only').prop('checked', opt_show_improvements_only);
    // TODO: properly update the selection only when needed, instead of always emptying it.
    if (production_selection.length !== 0) {
      production_selection = [];
      update_worklist_actions();
    }
    populate_worklist_production_choices(pcity);
  });

  $('#show_unreachable_items').prop('checked', opt_show_unreachable_items);
  $('#show_improvements_only').prop('checked', opt_show_improvements_only);

  worklist_dialog_active = true;
  var turns_to_complete = get_city_production_time(pcity);
  var prod_type = get_city_production_type_sprite(pcity);
  let title_text = "title='CLICK: Remove from worklist, and move remaining worklist up.\n\n"
                 + browser.metaKey+"-CLICK: See the help manual for "+(prod_type != null ? prod_type['type']['name'] : "None")+".' ";
  var prod_img_html = "";
  if (prod_type != null) {
    sprite = prod_type['sprite'];
    prod_img_html = "<div "
           + title_text
           + "style='background: transparent url("
           + sprite['image-src']
           + ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float: left; '>"
           +"</div>";
  }

  var headline = prod_img_html + "<div "+title_text+" id='prod_descr'>"
    + (is_small_screen() ? "" : "<b>")
    + (prod_type != null ? prod_type['type']['name'] : "None")
    + (is_small_screen() ? "" : "</b>");

  let multislot = "";
  if (pcity['production_kind'] == VUT_UTYPE
      && utype_has_flag(unit_types[pcity['production_value']], UTYF_MULTISLOT)) {
    multislot = "🔹";
  }

  if (!is_small_screen() )
    headline += multislot + " &nbsp; (" + get_production_progress(pcity) + ")";
  else
    headline += " " + get_production_progress(pcity);

  if (turns_to_complete != FC_INFINITY && !is_small_screen() ) {
    headline += ", turns: " + turns_to_complete;
    if (pcity.build_slots && pcity.build_slots > 1) {
      headline += "<span onclick='javascript:event.stopPropagation();' title='"
               + pcity.build_slots + " Unit Build Slots' style='float:right; cursor:help; font-size: 80%'><b style='color:red'>"
               + pcity.build_slots + "</b> slots</span>";
    }
  }

  if (is_small_screen() ) headline = "<span style='font-size:70%;'>"+headline+"</span>";

  $("#worklist_dialog_headline").html(headline + "</div>");
  //this method messes up unicode
  //const worklist_headline_title = "CLICK: Remove from worklist and move remaining worklist up.\n\n"
  //                            + browser.metaKey + "-CLICK: Get help on this type from the manual.\n"
  //$("#worklist_dialog_headline").attr("title", worklist_headline_title);

  $(".prod_choice_list_item").tooltip({
    show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  });
  $(".production_list_item_sub").tooltip({
    show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  });

  /* prod buttons removed
  if (is_touch_device()) {
    $("#prod_buttons").html("<x-small>1st&thinsp;tap:&thinsp;change. Next&thinsp;taps:&thinsp;add. Tap-tap:&thinsp;clear</x-small>");
  }*/

  $(".button").button();

  // -----------------------------hacky
  var tab_h = $("#city_production_tab").height();
  $("#city_current_worklist").height(tab_h - 150);
  $("#worklist_production_choices").height(tab_h - 121);
  /* TODO: remove all hacky sizing and positioning */
  /* It would have been nice to use $("#city_current_worklist").position().top
     for worklist_control padding-top, but that's 0 on first run.
     73 is also wrong, as it depends on text size. */
  if (tab_h > 250) {
    $("#worklist_control").height(tab_h - 148).css("padding-top", 73);
  } else {
    $("#worklist_control").height(tab_h - 77);
  }
  // Small screen in Landscape - adjustments
  /*
  if (is_small_screen())
    if ($(window).width() > $(window).height()) {
      $("#city_current_worklist").css({"height":"auto"});
      $("#worklist_production_choices").css({"height":"auto"});
    }*/
  //-------------------

  var worklist_items = $("#city_current_worklist .prod_choice_list_item");
  var max_selection = Math.min(MAX_LEN_WORKLIST, worklist_items.length);
  for (var k = 0; k < worklist_selection.length; k++) {
    if (worklist_selection[k] >= max_selection) {
      worklist_selection.splice(k, worklist_selection.length - k);
      break;
    }
    worklist_items.eq(worklist_selection[k]).addClass("ui-selected");
  }

  if (!touch_device) {
    $("#city_current_worklist .worklist_table").selectable({
       filter: "tr",
       selected: handle_current_worklist_select,
       unselected: handle_current_worklist_unselect
    });
    worklist_items.click(handle_worklist_meta_click);
  } else {
    worklist_items.click(handle_current_worklist_click);
  }

  worklist_items.dblclick(handle_current_worklist_direct_remove);

  update_worklist_actions();

  $("#worklist_control").children().tooltip({
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });

  adjust_prodlist_sizes_to_screen();
}

/**************************************************************************
 Update the production choices.
**************************************************************************/
function populate_worklist_production_choices(pcity)
{
  var small = is_small_screen();
  var can_build = false;
  var can_build_later = false;

  if (!sorted_improvements.length) build_sorted_improvements_array();

  var production_list = generate_production_list(pcity);
  var production_html = "<table class='worklist_table'><tr style='background-color:#0004'><td>Type</td><td>Name</td><td style='padding-right:30px; text-align:right'>Info</td><td>Cost</td></tr>";
  for (var a = 0; a < production_list.length; a++) {
    var sprite = production_list[a]['sprite'];
    if (sprite == null) {
      console.log("Missing sprite for " + production_list[a]['value']);
      continue;
    }
    var kind = production_list[a]['kind'];
    var value = production_list[a]['value'];

    // Don't show units if user clicked option to only show improvements
    if (kind == VUT_UTYPE && opt_show_improvements_only) continue;

    can_build = can_city_build_now(pcity, kind, value);

    // SUPPRESSIONS of improvements from the list:
    if (can_build && kind==VUT_IMPROVEMENT) {
      // Suppress improvements already in queue (except Coinage and Space Parts)
      if (improvements[value]['genus'] != GENUS_SPECIAL
          && city_has_building_in_queue(pcity, value)) {
            can_build=false;
      }
    }

    // flag for items buildable after tech discovery or making a pre-req building
    can_build_later = can_city_build_later(pcity, kind, value);

    if (can_build || can_build_later || opt_show_unreachable_items) {
      production_html += "<tr class='prod_choice_list_item kindvalue_item"
       + (can_build ? "" : " cannot_build_item")
       + "' data-value='" + value + "' data-kind='" + kind + "'>"
       + "<td><div class='production_list_item_sub' title=\"" + html_safe(cleaned_text(production_list[a]['helptext'])) + "\n\n"+browser.metaKey+"-CLICK: Get help for this type."
           + "\" style=' background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;'"
           +"></div></td>"
       + "<td class='prod_choice_name'>" + production_list[a]['text'] + "</td>";

       if (kind == VUT_UTYPE /*&& !small*/) {
          let multislot = utype_has_flag(unit_types[value], UTYF_MULTISLOT) ? "<span title='Multislot'>🔹</span>" : "";
          production_html += "<td title='Attack/Defense/Firepower, HP, Moves' class='prod_choice_info' "
          + "style='padding-right:30px; text-align:right'>"
          + production_list[a]['unit_details'] + "</td>"
          + "<td class='prod_choice_cost'>" + get_universal_discount_price(unit_types[value],pcity) +
          multislot + "</td></tr>";
       }
       else if (kind == VUT_IMPROVEMENT /*&& !small*/) {
          production_html += "<td title='Upkeep' class='prod_choice_info' "
          + "style='padding-right:30px; text-align:right'>"
          + production_list[a]['unit_details'] + "</td>"
          + "<td class='prod_choice_cost'>" + production_list[a]['build_cost'] + "</td></tr>";
       }
          //moved above production_html += "<td class='prod_choice_cost'>" + production_list[a]['build_cost'] + "</td></tr>";
     }

  }
  production_html += "</table>";

  $("#worklist_production_choices").html(production_html);
  $("#worklist_production_choices .production_list_item_sub").tooltip({
    // longer delay to avoid too much hover noise while perusing list
    show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  });
  $("#worklist_production_choices .prod_choice_info").tooltip({
    show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  });

  if (!touch_device) {
    $("#worklist_production_choices .worklist_table").selectable({
       filter: "tr",
       selected: handle_worklist_select,
       unselected: handle_worklist_unselect
    });

    if (production_selection.length > 0) {
      var prod_items = $("#worklist_production_choices .kindvalue_item");
      var sel = [];
      production_selection.forEach(function (v) {
        sel.push("[data-value='" + v.value + "']" +
                 "[data-kind='"  + v.kind  + "']");
      });
      prod_items.filter(sel.join(",")).addClass("ui-selected");
    }

    $(".kindvalue_item").click(function(e) {
      var value = parseFloat($(this).data('value'));
      var kind = parseFloat($(this).data('kind'));
      // meta-Click is for show help
      if (metaKey(e)) {
        /* Manually set quick_help_in_progress because the city dialog can jostle
        * the touchy sensitive help screen which blanks out when it detects and
        * resizing or UI changes, and here we triggering the help tab PRIOR to
        * calling help_redirect() */
        quick_help_in_progress = true;
        if (TAB_MAP === $("#tabs").tabs("option", "active")) {
          close_city_dialog_trigger();
          $('#ui-id-7').trigger("click");  // help tab
        }
        else {
          close_city_dialog_trigger();
          $('#ui-id-7').trigger("click");  // help tab
        }
        setTimeout(function() {
          help_redirect(kind, value)
        },0);
      }
    });

    $(".kindvalue_item").dblclick(function(e) {
      var value = parseFloat($(this).data('value'));
      var kind = parseFloat($(this).data('kind'));
      if (e.ctrlKey || e.altKey) {
        city_change_production();
        return;
      }
      // Shouldn't really happen but, frustrated clicky when it is stuck, who knows?
      if (metaKey(e)) {   // meta-Click is for show help
        quick_help_in_progress = true;
        if (TAB_MAP === $("#tabs").tabs("option", "active")) {
          close_city_dialog_trigger();
          $('#ui-id-7').trigger("click");  // help tab
        }
        else {
          close_city_dialog_trigger();
          $('#ui-id-7').trigger("click");  // help tab
        }
        help_redirect(value, kind);
        return;
      }

      send_city_worklist_add(pcity['id'], kind, value);
      production_selection = [];
    });
  }
  // TOUCH DEVICE:
  else {
    $(".kindvalue_item").click(function() {
      var value = parseFloat($(this).data('value'));
      var kind = parseFloat($(this).data('kind'));
      if (city_prod_clicks == 0) {
        send_city_change(pcity['id'], kind, value);
      } else {
        send_city_worklist_add(pcity['id'], kind, value);
      }
      city_prod_clicks += 1;

    });
  }
  if (small) $("#info_city_prod").hide();
  else {
    $("#info_city_prod").html("&#x2753;");
    $("#info_city_prod").css('cursor', "help");

    //$('#info_city_prod').css("overflow", "visible");
    //$('#info_city_prod').parent().css("overflow", "visible");
    var city_prod_help =
    "CLICK Current Production    Remove\n"+
    "DOUBLE CLICK Worklist       Remove Item\n"+
    "ALT CLICK Prod.Choice         Replace Current Production\n"+
    "SHIFT CLICK Prod.Choice      Add to Worklist\n"+
    "DOUBLE CLICK Prod.Choice    \"     \"        \"\n"+
    "CTRL CLICK Items                  Select multiple items\n"+
    "DOUBLE-TAP DRAG Items         \"           \"       \"\n"+
    "/\\  UP ARROW                       Flip to City Overview\n"+
    "\\/  DOWN ARROW                Flip to City Production\n"+
    "<SPACE>                             Flip Overview/Production\n"+
    "B     Buy Current Production\n"+
    "N    Next City\n"+
    "P     Previous City\n"+
    "\n"+
    "Top Left:    Current Production\n"+
    "Left Side:   Worklist Items\n"+
    "Right Side: Production Choices";

    $("#info_city_prod").prop('title', city_prod_help);
  }

}

/**************************************************************************
 Handle selection in the production list.
**************************************************************************/
function extract_universal(element)
{
  return {
    value: parseFloat($(element).data("value")),
    kind:  parseFloat($(element).data("kind"))
  };
}

function find_universal_in_worklist(universal, worklist)
{
  for (var i = 0; i < worklist.length; i++) {
    if (worklist[i].kind === universal.kind &&
        worklist[i].value === universal.value) {
      return i;
    }
  }
  return -1;
}

function handle_worklist_select(event, ui)
{
  var selected = extract_universal(ui.selected);
  var idx = find_universal_in_worklist(selected, production_selection);
  if (idx < 0) {
    production_selection.push(selected);
    update_worklist_actions();
  }

 // alt click and shift-alt click
 if (event.altKey && event.shiftKey) {
  city_insert_in_worklist(); // shift-alt-click insert into first worklist position
  worklist_selection = [];
 }
 else if (event.shiftKey) {
  city_add_to_worklist(); // shift-alt-click insert into first worklist position
 }
 else if (event.altKey) {
  city_change_production();  // alt-click change current prod
 }
}

function handle_worklist_unselect(event, ui)
{
  var selected = extract_universal(ui.unselected);
  var idx = find_universal_in_worklist(selected, production_selection);
  if (idx >= 0) {
    production_selection.splice(idx, 1);
    update_worklist_actions();
  }
}

/**************************************************************************
 Handles the selection of another item in the tasklist.
**************************************************************************/
function handle_current_worklist_select(event, ui)
{
  var idx = parseInt($(ui.selected).data('wlitem'), 10);
  var i = worklist_selection.length - 1;
  while (i >= 0 && worklist_selection[i] > idx)
    i--;
  if (i < 0 || worklist_selection[i] < idx) {
    worklist_selection.splice(i + 1, 0, idx);
    update_worklist_actions();
  }
}

/**************************************************************************
 Handles the removal of an item from the selection in the tasklist.
**************************************************************************/
function handle_current_worklist_unselect(event, ui)
{
  var idx = parseInt($(ui.unselected).data('wlitem'), 10);
  var i = worklist_selection.length - 1;
  while (i >= 0 && worklist_selection[i] > idx)
    i--;
  if (i >= 0 && worklist_selection[i] === idx) {
    worklist_selection.splice(i, 1);
    update_worklist_actions();
  }
}

/**************************************************************************
 Handles an item selection from the worklist (for touch devices).
**************************************************************************/
function handle_current_worklist_click(event)
{
  event.stopPropagation();

  var element = $(this);
  var item = parseInt(element.data('wlitem'), 10);

  if (worklist_selection.length === 1 && worklist_selection[0] === item) {
     element.removeClass('ui-selected');
     worklist_selection = [];
  } else {
     element.siblings().removeClass('ui-selected');
     element.addClass('ui-selected');
     worklist_selection = [item];
  }

  update_worklist_actions();
}
/**************************************************************************
 Metaclick a worklist item for help on it.
**************************************************************************/
function handle_worklist_meta_click(event)
{
  // meta-Click is for show help
  if (metaKey(event)) {
    /* Manually set quick_help_in_progress because the city dialog can jostle
     * the touchy sensitive help screen which blanks out when it detects and
     * resizing or UI changes, and here we triggering the help tab PRIOR to
     * calling help_redirect() */
    quick_help_in_progress = true;
    // Extract whatever unit or building was meta-clicked upon
    let element = $(this);
    let item = parseInt(element.data('wlitem'), 10);
    let kind = active_city.worklist[item].kind;
    let value = active_city.worklist[item].value;

    if (TAB_MAP === $("#tabs").tabs("option", "active")) {
      close_city_dialog_trigger();
      $('#ui-id-7').trigger("click");  // docs tab
    }
    else {
      //w$('#ui-id-1').trigger("click");   // ensures exit from city tab
      close_city_dialog_trigger();
      $('#ui-id-7').trigger("click");  // docs tab
    }
    setTimeout(function() {
      help_redirect(kind, value)
    },0);
  }
}
/**************************************************************************
 Enables/disables buttons in production tab.
**************************************************************************/
function update_worklist_actions()
{
  if (worklist_selection.length > 0) {
    $("#city_worklist_up_btn").button("enable");
    $("#city_worklist_remove_btn").button("enable");

    if (worklist_selection[worklist_selection.length - 1] ===
        active_city['worklist'].length - 1) {
      $("#city_worklist_down_btn").button("disable");
    } else {
      $("#city_worklist_down_btn").button("enable");
    }

  } else {
    $("#city_worklist_up_btn").button("disable");
    $("#city_worklist_down_btn").button("disable");
    $("#city_worklist_exchange_btn").button("disable");
    $("#city_worklist_remove_btn").button("disable");
  }

  if (production_selection.length > 0) {
    //$("#prod_buttons").show();  //prod buttons removed
    $("#city_add_to_worklist_btn").button("enable");
    $("#city_worklist_insert_btn").button("enable");
    $("#city_worklist_append_btn").button("enable");

    if (production_selection.length == 1)
      $("#city_worklist_change_btn").button("enable");
    else
      $("#city_worklist_change_btn").button("disable");

    if (production_selection.length == worklist_selection.length ||
        worklist_selection.length == 1) {
      $("#city_worklist_exchange_btn").button("enable");
    } else {
      $("#city_worklist_exchange_btn").button("disable");
    }

  } else {
    //$("#prod_buttons").hide();   //prod buttons removed
    $("#city_add_to_worklist_btn").button("disable");
    $("#city_worklist_insert_btn").button("disable");
    $("#city_worklist_change_btn").button("disable");
    $("#city_worklist_append_btn").button("disable");
    $("#city_worklist_exchange_btn").button("disable");
  }

  if (production_selection.length === 1) {
    $("#city_change_production_btn").button("enable");
  } else {
    $("#city_change_production_btn").button("disable");
  }
}

/**************************************************************************
 Notifies the server about a change in the city worklist.
**************************************************************************/
function send_city_worklist(city_id)
{
  if (cities[city_id] == null) return;

  var worklist = cities[city_id]['worklist'];
  var overflow = worklist.length - MAX_LEN_WORKLIST;
  if (overflow > 0) {
    worklist.splice(MAX_LEN_WORKLIST, overflow);
  }

  send_request(JSON.stringify({pid     : packet_city_worklist,
                               city_id : city_id,
                               worklist: worklist}));
}

/**************************************************************************
...
**************************************************************************/
function send_city_worklist_add(city_id, kind, value)
{
  var pcity = cities[city_id];
  if (pcity['worklist'].length >= MAX_LEN_WORKLIST) {
    return;
  }

  if (can_city_queue_item(pcity, kind, value)) {
    pcity['worklist'].push({"kind" : kind, "value" : value});
    send_city_worklist(city_id);
  }
}

/**************************************************************************
...
**************************************************************************/
function city_change_production()
{
  var kind = production_selection[0].kind;
  var value = production_selection[0].value;

  if (production_selection.length === 1) {
    if (can_city_build_now(active_city, kind, value)) {

          send_city_change(active_city['id'], production_selection[0].kind,
                          production_selection[0].value);

          unselect_improvements();
    }
  }
  // default this prod selection for mass-selection change prod button:
  set_mass_prod_city(active_city['id']);
  save_city_checkbox_states();
  retain_checkboxes_on_update = true;
}

/**************************************************************************
...
*************************************************************************/
function city_add_to_worklist()
{
  if (production_selection.length > 0) {

    for (var i=0; i<production_selection.length; i++) {
      let kind = production_selection[i].kind;
      let value = production_selection[i].value;

      if (!can_city_queue_item(active_city, kind, value)) {
        return;  // Don't add illegal items to worklist!
      }
    }

    active_city['worklist'] = active_city['worklist'].concat(production_selection);
    send_city_worklist(active_city['id']);
    unselect_improvements();
  }
}
/**************************************************************************
 When adding/changing production, a building added to the list should
 be unselected because you don't want to add same building multiple times.
 Also because it will be removed from the list anyway.
*************************************************************************/
function unselect_improvements()
{
   /* only units remain selected in right panel after adding to worklist,
    * because you might want to add more of them. Buildings already
    * queued should be removed: */
   production_selection = production_selection.filter(function(element, index, arr){
    if (arr[index].kind == VUT_UTYPE) return element;
    // Coinage and Space parts can go in multiple worklist slots
    if (arr[index].kind == VUT_IMPROVEMENT
        && improvements[arr[index].value]['genus'] == GENUS_SPECIAL)
      return element;
  });
}

/**************************************************************************
  Adds improvement z to city's worklist: called from SuperPanel
*************************************************************************/
function city_add_improv_to_worklist(event, city_id, z)
{
  // meta-Click is for show help
  if (metaKey(event)) {
    help_redirect(VUT_IMPROVEMENT, z);
    return;
  } // end show help

  if (!can_city_queue_item(cities[city_id], kind, value)) {
    return;  // Don't add illegal items to worklist!
  }

  //console.log("city_add_improv_to_worklist("+cities[city_id]['name']+","+improvements[z]['name']+")");
  send_city_worklist_add(city_id, 3, z); //3=worklist genus code for improvement

  // Show confirmation message for adding to worklist.
  swal("Sent order to add "+improvements[z]['name']+" to Worklist in "+cities[city_id]['name']);
  setSwalTheme();
  active_superpanel_cityid = city_id;
}

/**************************************************************************
  Remove current production item from worklist (on double click)
  ...requires there to be an item below it.
*************************************************************************/
function city_remove_current_prod(event, override_metaKey_pressed)
{
  if (metaKey(event) || override_metaKey_pressed) {
    /* Manually set quick_help_in_progress because the city dialog can jostle
     * the touchy sensitive help screen which blanks out when it detects and
     * resizing or UI changes, and here we triggering the help tab PRIOR to
     * calling help_redirect() */
    quick_help_in_progress = true;
    // Get whatever unit or building city is making and was meta-clicked upon:
    let kind = active_city.production_kind;
    let value = active_city.production_value;

    if (TAB_MAP === $("#tabs").tabs("option", "active")) {
      close_city_dialog_trigger();
      $('#ui-id-7').trigger("click");  // docs tab
    }
    else {
      //w$('#ui-id-1').trigger("click");   // ensures exit from city tab
      close_city_dialog_trigger();
      $('#ui-id-7').trigger("click");  // docs tab
    }
    setTimeout(function() {
      help_redirect(kind, value)
    },0);

    return;
  }

  var wl = active_city['worklist'];

  // if worklist items below, move them up
  if (wl.length > 0) {
    var next_item = wl[0];
    // Change production to 'next up' in the worklist
    send_city_change(active_city['id'], next_item.kind, next_item.value);

    // Since it replaces current production, remove from worklist
    wl.splice(worklist_selection[0], 1);

    // Update
    send_city_worklist(active_city['id']);
  /*} else if (production_selection.length === 1) {
    // otherwise, check for a selected item to replace it with
    send_city_change(active_city['id'], production_selection[0].kind,
                     production_selection[0].value); */
  } else {
    // reserved for double clicking it when no worklist below and not
    // alternate replacement is selected on list to the right.
  }
}

/**************************************************************************
 Handles dblclick-issued removal
**************************************************************************/
function handle_current_worklist_direct_remove(e)
{

  var idx = parseInt($(this).data('wlitem'), 10);
  active_city['worklist'].splice(idx, 1);

  // User may dblclick a task while having other selected
  var i = worklist_selection.length - 1;
  while (i >= 0 && worklist_selection[i] > idx) {
    worklist_selection[i]--;
    i--;
  }
  if (i >= 0 && worklist_selection[i] === idx) {
    worklist_selection.splice(i, 1);
  }

  send_city_worklist(active_city['id']);
}

/**************************************************************************
 Inserts selected production items into the worklist.
 Inserts at the beginning if no worklist items are selected, or just before
 the first one if there's a selection.
**************************************************************************/
function city_insert_in_worklist()
{
  for (var j=0; j<production_selection.length; j++) {
    var kind = production_selection[j].kind;
    var value = production_selection[j].value;

    if (!can_city_queue_item(active_city, kind, value)) {
      return;  // Don't add illegal items to worklist!
    }
  }

  var count = Math.min(production_selection.length, MAX_LEN_WORKLIST);
  if (count === 0) return;

  var i;
  var wl = active_city['worklist'];

  if (worklist_selection.length === 0) {

    wl.splice.apply(wl, [0, 0].concat(production_selection));

    // Initialize the selection with the inserted items
    for (i = 0; i < count; i++) {
      worklist_selection.push(i);
    }

  } else {

    wl.splice.apply(wl, [worklist_selection[0], 0].concat(production_selection));

    for (i = 0; i < worklist_selection.length; i++) {
      worklist_selection[i] += count;
    }
  }

  send_city_worklist(active_city['id']);

  unselect_improvements();
}

/**************************************************************************
 Moves the selected tasks one place up.
 If the first task is selected, the current production is changed.
 TODO: Some combinations may send unnecessary updates.
 TODO: If change + worklist, we reopen the dialog twice and the second
       does not keep the tab.
**************************************************************************/
function city_worklist_task_up()
{
  var count = worklist_selection.length;
  if (count === 0) return;

  var swap;
  var wl = active_city['worklist'];

  if (worklist_selection[0] === 0) {
    worklist_selection.shift();
    if (wl[0].kind !== active_city['production_kind'] ||
        wl[0].value !== active_city['production_value']) {
      swap = wl[0];
      wl[0] = {
        kind : active_city['production_kind'],
        value: active_city['production_value']
      };

      send_city_change(active_city['id'], swap.kind, swap.value);
    }
    count--;
  }

  for (var i = 0; i < count; i++) {
    var task_idx = worklist_selection[i];
    swap = wl[task_idx - 1];
    wl[task_idx - 1] = wl[task_idx];
    wl[task_idx] = swap;
    worklist_selection[i]--;
  }

  send_city_worklist(active_city['id']);
}

/**************************************************************************
 Moves the selected tasks one place down.
**************************************************************************/
function city_worklist_task_down()
{
  var count = worklist_selection.length;
  if (count === 0) return;

  var swap;
  var wl = active_city['worklist'];

  if (worklist_selection[--count] === wl.length - 1) return;

  while (count >= 0) {
    var task_idx = worklist_selection[count];
    swap = wl[task_idx + 1];
    wl[task_idx + 1] = wl[task_idx];
    wl[task_idx] = swap;
    worklist_selection[count]++;
    count--;
  }

  send_city_worklist(active_city['id']);
}

/**************************************************************************
 Removes the selected tasks, changing them for the selected production.
**************************************************************************/
function city_exchange_worklist_task()
{
  var prod_l = production_selection.length;
  if (prod_l === 0) return;

  for (var j=0; j<production_selection.length; j++) {
    var kind = production_selection[j].kind;
    var value = production_selection[j].value;

    if (!can_city_queue_item(active_city, kind, value)) {
      return;  // Don't add illegal items to worklist!
    }
  }

  var i;
  var same = true;
  var wl = active_city['worklist'];
  var task_l = worklist_selection.length;
  if (prod_l === task_l) {
    for (i = 0; i < prod_l; i++) {
      if (same && wl[worklist_selection[i]] != null &&
          (wl[worklist_selection[i]].kind !== production_selection[i].kind ||
           wl[worklist_selection[i]].value !== production_selection[i].value)) {
        same = false;
      }
      wl[worklist_selection[i]] = production_selection[i];
    }
  } else if (task_l === 1) {
    i = worklist_selection[0];
    wl.splice.apply(wl, [i, 1].concat(production_selection));
    same = false;
    while (--prod_l) {
      worklist_selection.push(++i);
    }
  }

  if (!same) {
    send_city_worklist(active_city['id']);
  }
  unselect_improvements();
}

/**************************************************************************
 Removes the selected tasks.
**************************************************************************/
function city_worklist_task_remove()
{
  var count = worklist_selection.length;
  if (count === 0) return;

  var wl = active_city['worklist'];

  while (--count >= 0) {
    wl.splice(worklist_selection[count], 1);
  }
  worklist_selection = [];

  send_city_worklist(active_city['id']);
}

/**************************************************************************
 Creates the hover pane for hovering over a city in the city list
**************************************************************************/
function show_city_improvement_pane(city_id)
{
  // This function's purpose is depicting which improvements are present AND not present
  // therefore, it doesn't show wonders and sticks to genus==2, but it also makes improvements
  // always in the same place whether present or not, so Gestalt processing can check for the
  // improvement.
  var z = 0;
  var pcity = cities[city_id];
  if (!pcity) return;  // sometimes happens after it's razed, disbanded, etc.

  var improvements_html = "";
  var opacity = 1;
  var border = "";
  var mag_factor = ($(window).width()-519)/2470;   //was 2450 which was .57 on 1920x1080
  //add_client_message("Mag factor: "+mag_factor)
  //console.log("width: "+$(window).width()+"mag factor:"+mag_factor);
  //var magnification = "zoom:"+mag_factor+";"; // doesn't work right on Firefox, use line below insead:
  var magnification = "transform:scale("+mag_factor+"); transform-origin: top left;";

  var bg = "background:#335 ";
  var title_text = "";
  var right_click_action;
  var shift_click_text = "\n\nSHIFT-CLICK: Highlight ON/OFF cities with this building.\n\nCTRL-CLICK: &#x2611; select ON/OFF cities with this building. "+
                         "\n\n"+browser.metaKey+"-CLICK: get help on building.'"
    for (zz = -1; zz < ruleset_control.num_impr_types; zz ++) {
        // Read ugly hack farther below for why we construct TWO improvement number zero, (one is an invisible dummy) 🤣
        z = zz == -1 ? 0 : zz;
        var right_click_action = "oncontextmenu='city_sell_improvement_in(" +city_id+","+ z + ");' ";

        if (pcity['improvements'] != null /*&& pcity['improvements'].isSet(z) if present*/ && improvements[z].genus==GENUS_IMPROVEMENT) {
        sprite = get_improvement_image_sprite(improvements[z]);
        if (sprite == null) {
          continue;
        }

        // Filter out OBSOLETE:
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
        }

        if (!server_settings['nukes_major']['val'] && improvements[z]['name'] == "Enrichment Facility")
              continue; // major nukes set to OFF, don't show illegal prod choice.

        // Colour and text tags for current production and completion thereof:
        var product_finished = false;
        var verb = " is making ";
        var is_city_making = (pcity['production_kind'] == VUT_IMPROVEMENT && pcity['production_value']==z);
        if (is_city_making) { // colour code currently produced items which are bought/finished
          var shields_invested = pcity['shield_stock'];
          if (shields_invested>=universal_build_shield_cost(pcity,improvements[z])) {
            product_finished=true;
            var verb = " is finishing ";
          }
        }
        let spacing = "padding:0px; margin: 0px; ";

        // Set cell colour/opacity based on: if present / can build
        if (pcity['improvements'].isSet(z)) {     // city has improvement: white cell
          opacity = 1;
          border = "border:3px solid #000000;"
          bg     = "background:#FEED ";
          title_text = "title='"+html_safe(pcity['name'])+":\n\nRIGHT-CLICK: Sell " + html_safe(improvements[z]['name'])+"."+shift_click_text;
          right_click_action = "oncontextmenu='city_sell_improvement_in(" +city_id+","+ z + ");' ";
        } else {
          if (!can_city_build_improvement_now(pcity, z)) {  // doesn't have and can't build: faded
            opacity=0.35;
            border = "border:3px solid #231A13;"
            bg =     "background:#9873 ";
            title_text = "title='" + html_safe(pcity['name'])+": " + html_safe(improvements[z]['name']) + " unavailable.\n\nRIGHT-CLICK: Add to worklist."+shift_click_text;
            right_click_action = "oncontextmenu='city_add_improv_to_worklist(event, " +city_id+","+ z + ");' ";
          } else {                  // doesn't have and CAN build - dark blue
            opacity = 1;
            border = (is_city_making ? (product_finished ? "border:3px solid #308000;" : "border:3px solid #80E0FF;") : "border:3px solid #000000;");  // highlight if current prod
            bg =     (is_city_making ? (product_finished ? "background:#BFBE " : "background:#8D87 ") : "background:#147F ");
            right_click_action = "oncontextmenu='city_change_prod_and_buy(event," +city_id+","+ z + ");' "
            title_text = is_city_making
              ? ("title='"+html_safe(pcity['name'])+verb+html_safe(improvements[z]['name'])+".\n\nRIGHT_CLICK: Buy "+html_safe(improvements[z]['name'])+shift_click_text)
              : ("title='"+html_safe(pcity['name'])+":\n\nCLICK: Change production\n\nRIGHT-CLICK: Buy "+html_safe(improvements[z]['name'])+shift_click_text);
          }
        }
        // Put improvement sprite in the cell:
        if (zz != -1) {
          improvements_html = improvements_html +
            "<div style='padding:0px; opacity:"+opacity+"; "
                +"' id='city_improvement_element' class='cip'><span style='"+spacing+border+" "+bg+" url("
                + sprite['image-src'] +
                ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
                + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left;"+magnification+"' "
                + title_text
                + right_click_action
                + "onclick='change_city_prod_to(event," +city_id+","+ z + ");'>"
                +"</span></div>";
        } else {  /* Ugly hack, because of JS/Jquery bug in browser itself. IF (city-list-screen is entered at a zoom-level on a >=UHD display, even if it's emulating 1920x1080p
                     through its "virtual scaling"), THEN: meta-clicking the 0th improvement often fails in spite of the exact same function with exact same parameters being called.
                     It literally "forgets" the parameters with which the function was called (and verified to have received via console.logs), and clicks into some random part
                     of the helpmenu like Terrain or City Improvements, as the passed parameters somehow get corrupted when accessed by JQuery (but not by console.logs). The
                     solution was to start iterating at -1 and if at -1, conditionally treat it as another improvement #0, but with no pointer-events and fully transparent. The
                     real improvement #0 is added again but now is in the next position as "improvement #1", so that it enjoys the fact that no improvement whose position in the
                     pane is greater than 0th experiences the 36-hours-wasted bug! 😱 😮 */
          improvements_html = improvements_html +
            "<div style='pointer-events:none; padding:0px; opacity:"+0+"; "
                +"' id='city_improvement_element' class='cip'><span style='"+spacing+border+" "+bg+" url("
                + sprite['image-src'] +
                ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
                + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left;"+magnification+"' "
                + ">"
                +"</span></div>";
        }
      }
  }
  $("#city_improvements_hover_list").html(improvements_html);
  $(".cip").width(mag_factor*64); // improvement images are 64px wide
  $(".cip").height(mag_factor*48); // improvement images are 64px wide
  $(".cip").tooltip({
    show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  });
}
/**************************************************************************
 Changes production in city_id to improvement type #z THEN buys it
   this function is called from a click from SuperPanel in the city list,
   also empire tab.
**************************************************************************/
function city_change_prod_and_buy(event, city_id, z)
{
  if (event) {
    if (event.ctrlKey) {
      // TO-DO: slice this improvement from the production queue
      return;
    }
    // meta-Click is for show help
    else if (metaKey(event)) {
      help_redirect(VUT_IMPROVEMENT, z);
      return;
    }
  } // end show help

  // First change production
  change_city_prod_to(null, city_id, z);

  // Delay to let first packet get on its way to server
  setTimeout(function() {
    request_city_id_buy(city_id);
  }, 300);

  active_superpanel_dialog_refresh_delay = true; //wait for user input before reset
  active_superpanel_cityid = city_id; // keep panel up after refresh/update
}

/**************************************************************************
 shift-click: Highlight all cities producing same output item as this city
 ctrl-click:  Select all cities producing same output item as this city
 normal click:Change production in this city
**************************************************************************/
function city_filter_prod_type(event, city_id)
{
  var kind=null, z=null;
  pcity = cities[city_id];
  if (pcity == null) return;
  kind = pcity['production_kind'];
  z = pcity['production_value'];

  // meta-click: get help
  if (metaKey(event)) {
    help_redirect(kind, z);
  }
  // shift-click: HIGHLIGHT all cities making same as this city
  else if (event.shiftKey) {
    highlight_rows_by_output(kind, z, false);
  }
  // ctrl-click: SELECT all cities make same as this city
  else if (event.ctrlKey) {
    select_rows_by_output(kind, z, false);
  }
  // normal click: just change current prod
  else city_change_prod(city_id);
}
/**************************************************************************
 Changes production in city_id to improvement type #z: clicked from improv
   panel in the city list screen; or from empire tab
**************************************************************************/
function change_city_prod_to(event, city_id, z)
{
  console.log("z=="+z)
  if (event) {
    // meta-Click is for show help
    if (metaKey(event)) {
        help_redirect(VUT_IMPROVEMENT, z);
      return;
    } else if (event.shiftKey) {   //intercept shift-click and call the right function
      highlight_rows_by_improvement(z, false);
      return;
    } else if (event.ctrlKey) {
      select_rows_by_improvement(z, false);
      return;
    }
  }
  var pcity = cities[city_id];
  send_city_change(pcity['id'], VUT_IMPROVEMENT, z);
  set_mass_prod_city(pcity['id']); // default this prod selection for mass-selection
  save_city_checkbox_states();
  retain_checkboxes_on_update = true;

  active_superpanel_dialog_refresh_delay = true; //wait for user input before reset
  active_superpanel_cityid = city_id; // keep panel up after refresh/update
}

/**************************************************************************
 Toggles highlighted city rows by what they're making: kind and type #z:
   shift-clicked from production column in the city list screen
**************************************************************************/
function highlight_rows_by_output(kind, z, clear)
{ // clear==true means don't toggle, just clear them all
  for (var city_id in cities) {
    var pcity = cities[city_id]
    if (client.conn.playing != null && city_owner(pcity) != null && city_owner(pcity).playerno == client.conn.playing.playerno) {
      // if city has same output type, toggle the highlighting:
      if (clear || (kind==pcity['production_kind'] && z==pcity['production_value'])) {
        if (clear || $("#cities_list_"+city_id).css("background-color") == "rgb(0, 0, 255)" ) {
          $("#cities_list_"+city_id).css({"background-color":"rgba(0, 0, 0, 0)"});
        } else $("#cities_list_"+city_id).css({"background-color":"rgb(0, 0, 255)"});  // TODO, insert a fake sort character to the name of the city?
      }
    }
  }
}
/**************************************************************************
 Toggles selection checkboxes in city rows by what they're making:
   kind and type #z: ctrl-clicked from Super PAnel in the city list screen
**************************************************************************/
function select_rows_by_output(kind, z, clear)
{ // clear==true means don't toggle, just clear them all
  for (var city_id in cities) {
    var pcity = cities[city_id]
    if (client.conn.playing != null && city_owner(pcity) != null && city_owner(pcity).playerno == client.conn.playing.playerno) {
      // if city has improvement, toggle the checkbox
      if (clear || (kind==pcity['production_kind'] && z==pcity['production_value'])) {
        if (clear || $("#cb"+city_id).prop("checked") == true ) {
          $("#cb"+city_id).prop("checked", false);
        } else $("#cb"+city_id).prop("checked", true);
      }
    }
  }
}
/**************************************************************************
 Toggles highlighted city rows by improvement type #z:
   shift-clicked from Super PAnel in the city list screen
**************************************************************************/
function highlight_rows_by_improvement(z, clear)
{ // clear==true means don't toggle, just clear them all
  for (var city_id in cities) {
    var pcity = cities[city_id]
    if (client.conn.playing != null && city_owner(pcity) != null && city_owner(pcity).playerno == client.conn.playing.playerno) {
      // if city has improvement, toggle the highlighting:
      if (clear || city_has_building(pcity, z)) {
        if (clear || $("#cities_list_"+city_id).css("background-color") == "rgb(0, 0, 255)" ) {
          $("#cities_list_"+city_id).css({"background-color":"rgba(0, 0, 0, 0)"});
        } else $("#cities_list_"+city_id).css({"background-color":"rgb(0, 0, 255)"});  // TODO, insert a fake sort character to the name of the city?
      }
    }
  }
}
/**************************************************************************
 Toggles selection checkboxes in city rows by improvement type #z:
   ctrl-clicked from Super PAnel in the city list screen
**************************************************************************/
function select_rows_by_improvement(z, clear)
{ // clear==true means don't toggle, just clear them all
  for (var city_id in cities) {
    var pcity = cities[city_id]
    if (client.conn.playing != null && city_owner(pcity) != null && city_owner(pcity).playerno == client.conn.playing.playerno) {
      // if city has improvement, toggle the checkbox
      if (clear || city_has_building(pcity, z)) {
        if (clear || $("#cb"+city_id).prop("checked") == true ) {
          $("#cb"+city_id).prop("checked", false);
        } else $("#cb"+city_id).prop("checked", true);
      }
    }
  }
}

/**************************************************************************
 Updates the Cities tab when clicked, populating the table.
**************************************************************************/
function update_city_screen()
{
  if (observing || freeze) return;
  //console.log("----------------------")
  //console.log("Update city screen.")

  // start at default width
  $('#cities_scroll').css("width", "100%");

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
  /*
  console.log("Wide:   "+wide_screen);
  console.log("Landscp:"+landscape_screen);
  console.log("Redux:  "+redux_screen);
  console.log("Small:  "+small_screen);
  console.log("Narrow: "+narrow_screen);
  console.log("Tiny:   "+tiny_screen);
  console.log("Scrollx:"+scroll_narrow_x); */
  // -------------------------------------------------------------------

  var sortList = [];
  var headers = $('#city_table thead th');
  headers.filter('.tablesorter-headerAsc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 0]);
  });
  headers.filter('.tablesorter-headerDesc').each(function (i, cell) {
    sortList.push([cell.cellIndex, 1]);
  });

  var citizen_types = ["unhappy","content","happy"]
  var sprite;
  var city_list_citizen_html = "";
  var updown_sort_arrows = "<img class='v' src='data:image/gif;base64,R0lGODlhFQAJAIAAAP///////yH5BAEAAAEALAAAAAAVAAkAAAIXjI+AywnaYnhUMoqt3gZXPmVg94yJVQAAOw=='>";
  // Used for generating micro-icon of current prooduction:
  var prod_sprite;
  var prod_img_html;
  // Generate table header for happy,content,unhappy citizen icons:
  for (var i = 0; i < 3; i++) {
    sprite = get_specialist_image_sprite("citizen." + citizen_types[i] + "_1");
    city_list_citizen_html = "<th id='city_list_citizen_"+ citizen_types[i]+"' class='' style='padding-right:0px; margin-right:-3px;' title=''><div style='float:right; background: transparent url("
    + sprite['image-src'] + ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y'] + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;'></div></th>"
    + city_list_citizen_html
  }

  var city_list_html = "";
  if (wide_screen)  // fully standard deluxe wide-screen mode, include all info
  {
    //console.log("MODE: Widescreen")
    city_list_html = "<table class='tablesorter-dark' id='city_table' style='border=0px;border-spacing=0;padding=0;'>"
        + "<thead id='city_table_head'><tr>"
        + "<th style='text-align:right;'>Name"+updown_sort_arrows+"</th><th style='text-align:right;'>Size"+updown_sort_arrows+"</th>"+city_list_citizen_html
        + "<th style='text-align:right;' title='Text: Current state. Color: Next turn state'>State<img class='v' src='data:image/gif;base64,R0lGODlhFQAJAIAAAP///////yH5BAEAAAEALAAAAAAVAAkAAAIXjI+AywnaYnhUMoqt3gZXPmVg94yJVQAAOw=='></img> </th>"
        + "<th id='food' title='Food surplus' class='food_text' style='text-align:right;padding-right:0px'><img style='margin-right:-6px; margin-top:-3px;' class='v' src='/images/wheat.png'></th>"
        + "<th title='Production surplus (shields)' class='prod_text' style='text-align:right;padding-right:0px'> <img class='v' src='/images/shield14x18.png'></th>"
        + "<th title='Trade' class='trade_text' style='text-align:right;padding-right:0px;'><img class='v' src='/images/trade.png'></th>"
        + "<th title='"+CURV_title[city_user_row_val]+"' class='non_priority' style='text-align:right;padding-left:0px;padding-right:30px;'><img class='v' src='"+CURV_icons[city_user_row_val]+"'></th>"
    //    + "<th>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</th>"
        + "<th title='Gold' class='gold_text' style='text-align:right;padding-right:0px;'><img class='v' src='/images/gold.png'></th>"
        + "<th title='Luxury' class='lux_text' style='text-align:right;padding-right:0px'><img class='v' src='/images/luxury2.png'></th>"
        + "<th title='Science (bulbs)' class='sci_text' style='text-align:right'><img class='v' src='/images/sci.png'></th>"
        + "<th style='text-align:right;'>Grows In"+updown_sort_arrows+"</th><th style='text-align:right;'>Granary"
              +updown_sort_arrows+"</th><th style='text-align:right;' title='Click to change'>Producing"+updown_sort_arrows+"</th>"
        + "<th style='text-align:right;' title='Turns to finish &nbsp;&nbsp; Prod completed/needed'>Turns"+updown_sort_arrows
              +"&nbsp; Progress</th><th style='text-align:right;' title='Click to buy'>Cost"+updown_sort_arrows+"</th>"
        + "<th style='text-align:left;'><input type='checkbox' class='css-checkbox' id='master_checkbox' title='CLICK:  Toggle all cities\n\nSHIFT-CLICK:  Toggle highlighted cities' name='cbAll' value='false' onclick='toggle_city_row_selections(event);'>"
        + "<label title='CLICK:  Toggle all cities\n\nSHIFT-CLICK:  Toggle highlighted cities' for='master_checkbox' name='master_checkbox_lbl' class='css-label dark-check-white'></label></th>"
        + "</tr></thead><tbody class='alternate-row-color'>";

  } else if (redux_screen) // semi-standard rendition of the above with minor trimming
  { // -1 column (selection box). Economised columns: Sort Arrows, Grows In>>Grows, Name of Production/Image >> Image only, Turns/Progress>>Progress
    //console.log("MODE: Reduced Standard")
    city_list_html = "<table class='tablesorter-dark' id='city_table' style='border=0px;border-spacing=0;padding=0;'>"
    + "<thead id='city_table_head'><tr>"
    + "<th style='text-align:right;'>Name"+"</th><th style='text-align:center;'>Pop"+"</th>"+city_list_citizen_html
    + "<th style='text-align:center;' title='Text: Current state. Color: Next turn state'>Mood</th>"
    + "<th id='food' title='Food surplus' class='food_text' style='text-align:right;padding-right:0px'><img style='margin-right:-6px; margin-top:-3px;' class='v' src='/images/wheat.png'></th>"
    + "<th title='Production surplus (shields)' class='prod_text' style='text-align:right;padding-right:0px'> <img class='v' src='/images/shield14x18.png'></th>"
    + "<th title='Trade' class='trade_text' style='text-align:right;padding-right:0px;'><img class='v' src='/images/trade.png'></th>"
    + "<th>&nbsp;&nbsp;&nbsp;&nbsp;</th>"
    + "<th title='Gold' class='gold_text' style='text-align:right;padding-right:0px;'><img class='v' src='/images/gold.png'></th>"
    + "<th title='Luxury' class='lux_text' style='text-align:right;padding-right:0px'><img class='v' src='/images/luxury2.png'></th>"
    + "<th title='Science (bulbs)' class='sci_text' style='text-align:right'><img class='v' src='/images/sci.png'></th>"
    /*+ "<th style='text-align:right;'>Grows"+"</th><th style='text-align:right;'>Grain"*/
    + ( (!tiny_screen) ? ("<th style='text-align:right;'>Grows"+"</th><th style='text-align:right;'>Grain")
                     : ("<th style='text-align:center;'>Grow"+"</th><th style='text-align:right;'>Food") )
     /* +"</th><th style='text-align:right;' title='Click to change'>Making"+"</th>" */
    + ( (!tiny_screen) ? ("</th><th style='text-align:right;' title='Click to change'>Making"+"</th>")
                       : ("</th><th style='text-align:right;'>Build"+"</th>" ) )
    + "<th style='text-align:right;' title='Turns to finish &nbsp;&nbsp; Prod completed/needed'>"
    /*+ "Progress</th><th style='padding-right:1em; text-align:right;' title='Click to buy'>Cost"+"</th>"*/
    + ( (!tiny_screen) ? ("Progress</th><th style='padding-right:1em; text-align:right;' title='Click to buy'>Cost"+"</th>")
                       : ("in</th><th style='padding-right:1em; text-align:right;'>Cost"+"</th>") )
    + ( (!tiny_screen) ? ("<th style='text-align:left;'><input type='checkbox' class='css_checkbox' id='master_checkbox' title='CLICK:  Toggle all cities\n\nSHIFT-CLICK:  Toggle highlighted cities' name='cbAll' value='false' onclick='toggle_city_row_selections(event);'></th>")
                     : "" )   // skip checkbox column for tiny redux mode
    + "</tr></thead><tbody>";
  } else {  // tiny - brutally cut non-crucial info
    // -2 columns (selection box, cost). Economised: Sort arrows, Grows In>>grows, Granary>>Grain, Producing>>Output:Image only, Turns/Progress>>Turns
    //console.log("MODE: Small Narrow")
    city_list_html = "<table class='tablesorter-dark' id='city_table' style='border=0px;border-spacing=0;padding=0;'>"
    + "<thead id='city_table_head'><tr>"
    + "<th style='text-align:right;'>Name"+"</th><th style='text-align:center;'>Pop"+"</th>"+city_list_citizen_html
    + "<th style='text-align:center;' title='Text: Current state. Color: Next turn state'>Mood</th>"
    + "<th id='food' title='Food surplus' class='food_text' style='text-align:right;padding-right:0px'><img style='margin-right:-6px; margin-top:-3px;' class='v' src='/images/wheat.png'></th>"
    + "<th title='Production surplus (shields)' class='prod_text' style='text-align:right;padding-right:0px'> <img class='v' src='/images/shield14x18.png'></th>"
    + "<th title='Trade' class='trade_text' style='text-align:right;padding-right:0px;'><img class='v' src='/images/trade.png'></th>"
    + "<th>&nbsp;&nbsp;&nbsp;</th>"
    + "<th title='Gold' class='gold_text' style='text-align:right;padding-right:0px;'><img class='v' src='/images/gold.png'></th>"
    + "<th title='Luxury' class='lux_text' style='text-align:right;padding-right:0px'><img class='v' src='/images/luxury2.png'></th>"
    + "<th title='Science (bulbs)' class='sci_text' style='text-align:right'><img class='v' src='/images/sci.png'></th>"
    + "<th style='text-align:center;'>Grow"+"</th><th style='text-align:right;'>Food"
          +"</th><th style='text-align:right;' title='Click to change'>Build"+"</th>"
    + "<th style='text-align:right;' title='Turns to finish &nbsp;&nbsp; Prod completed/needed'>in</th>"
    + "</tr></thead><tbody>";
  }

  var count = 0;
  var happy_people, content_people, unhappy_angry_people;
  var city_name;
  var city_food, city_prod, city_trade;
  var city_gold, city_lux, city_sci;
  var city_user = "";                     // user defined row
  var city_growth, city_food_stock;       // grows in x turns, how much is in grain storage
  var city_granary_size, city_buy_cost;   // grain needed to grow, cost to buy city's production
  var city_state;
  var shield_cost;
  var adjust_oversize = "";               // for style-injecting margin/alignment adjustment on oversize city production images

  for (var city_id in cities){
     // shortcut for replacing <td> tags with clickable <td> tags that take to city dialogue:
    var pcity = cities[city_id]

    // TO DO, don't make these for cities that won't even show up in the list, put under the if statement below that checks ownership
    var td_hover_html = wide_screen
      ? "<td class='tdc1' style='padding-right:1em; text-align:right;' onmouseover='show_city_improvement_pane("+pcity['id']+");' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>"
      : "<td class='tdc1' style='padding-right:1em; text-align:right;' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>";
    var td_click_html = "<td class='tdc1' style='padding-right:1em; text-align:right;' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>";
    var td_click2_html = "<td class='tdc2' style='text-align:right;' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>";
    var td_buy_html =   "<td style='padding-right:1em; text-align:right;' onclick='javascript:request_city_id_buy("+ pcity['id'] + ");'>";
    var td_change_prod_html = "<td title='Click to change' style='text-align:right;' onclick='javascript:city_filter_prod_type(event,"+ pcity['id'] + ");'>";

    if (client.conn.playing != null && city_owner(pcity) != null && city_owner(pcity).playerno == client.conn.playing.playerno) {
      count++;
      var prod_type = get_city_production_type(pcity);
      var turns_to_complete_str;
      var progress_string;          // accumulated shields/total shields needed

      // max city size of 40 generates numbers with 9 characters max, pad the string with 10 so the numbers align better:
     // var population_string = "<span class='number_element'>"+numberWithCommas(city_population(pcity)*1000)+"</span>";
      // max city size is 2 digits, so pad a space to create right alignment:
      var city_size_string = "";
      if (wide_screen)
        city_size_string = "<span class='mobile_centre non_priority'>"+pcity['size']+"</span>";
      else  city_size_string = "<span class='mobile_centre redux_centre non_priority'>" + pcity['size'] + "</span>";

      turns_to_complete = get_city_production_time(pcity);
      if (get_city_production_time(pcity) == FC_INFINITY) {
          turns_to_complete_str = "<span class='non_priority'>&nbsp;&nbsp; </span>";   //client does not know how long production will take yet.
        } else {
          if (wide_screen)
            turns_to_complete_str = "<span class='non_priority'>"+turns_to_complete+"</span>";
          else
            turns_to_complete_str = "<span class='non_priority'>"+turns_to_complete+"</span>";
          // bold to indicate finishing at TC.  invisible tiny 0 at start is a sorting hack
          if (turns_to_complete == 1)
            turns_to_complete_str = (wide_screen)
                                     ? "<span style='font-size:1%; color:rgba(0,0,0,0);'>0</span>"+"<b>next</b>"
                                     : "<span style='font-size:1%; color:rgba(0,0,0,0);'>0</span>"+"<b>1</b>";
        }

        // construct coloured and formatted x/y shield progress string where x=shields invested and y=total shield cost:
        var purchase;
        var shields_invested = pcity['shield_stock'];
        if (pcity['production_kind'] == VUT_UTYPE) {
          purchase = unit_types[pcity['production_value']];
        } else if (pcity['production_kind'] == VUT_IMPROVEMENT) {
          purchase = improvements[pcity['production_value']];
        }
        if (purchase['name']=="Coinage") progress_string=" ";
        else {
          shields_invested = shields_invested.toString();
          // pad numbers <3 digits with one space for each missing digit, in order to align them:
          if (shields_invested.length<3)
              shields_invested = "&nbsp;&nbsp;".repeat(3-shields_invested.length) + shields_invested;

          progress_string=shields_invested + "<span class='contrast_text'>/</span>";

          shield_cost = universal_build_shield_cost(pcity, purchase).toString();
          // pad numbers <3 digits with one space for each missing digit, in order to align them:
          if (shield_cost.length<3)
              shield_cost = "&nbsp;&nbsp;".repeat(3-shield_cost.length) + shield_cost;

          progress_string="<span class='non_priority'>"+progress_string+shield_cost+"</span>"
        }
        happy_people   = pcity['ppl_happy'][FEELING_FINAL];
        content_people = pcity['ppl_content'][FEELING_FINAL];
        unhappy_angry_people = pcity['ppl_unhappy'][FEELING_FINAL]+pcity['ppl_angry'][FEELING_FINAL];

        // PEACE, CELEBRATING, OR DISORDER:
        city_state = get_city_state(pcity);
        let current_state = city_state;
        // Default fall-thru state:
        let city_state_span = "id='city_state"+pcity.id+"' class='redux_centre mobile_centre non_priority' style='cursor:help; text-align:center;'>"+city_state;     // state of peace is all other conditions = regular text
        let next_state = "Peace"; // default unless changed below
        let state_desc = "";
        if (tiny_screen) {
          switch (city_state) {
            case "Peace":
              city_state = "&#x262E;";   // peace
              break;
            case "Famine":
            case "Lawless":
            case "Disorder":
              city_state = "&#x270A;"    // fist
              break;
            case "Celebrating":
              city_state = "&#x1F388;";  // balloon
              break;
          }
        }
        city_state+="</span>";

        let pissed = pcity['hangry'] || (server_settings.fulldisorder.val && pcity['anarchy']);

        // Color code for upcoming state under current configuration of tiles/luxury rate/improvements/deployed units:
        if (happy_people >= pcity['size']*0.4999 && unhappy_angry_people==0 && pcity['size']>=city_celebrate_size(pcity)) {
          next_state = "Celebrating";
          if (!pissed)
            city_state_span = "id='city_state"+pcity.id+"' class='redux_centre mobile_centre hint_of_green' style='cursor:help; text-align:center;'>"+city_state;    // half or more happy, no unhappy = city will (continue to) celebrate, green code.
        }
        if (pissed) {
          if (next_state == "Celebrating")
            city_state_span = "id='city_state"+pcity.id+"' class='redux_centre mobile_centre city_dialog_celebrate_after_anarchy' style='cursor:help; text-align:center;'>"+city_state;    // not going to produce, but not red because will calm down next turn.
          else city_state_span = "id='city_state"+pcity.id+"' class='redux_centre mobile_centre restored_anarchy_text' style='cursor:help; text-align:center;'>"+city_state;    // not going to produce, but not red because will calm down next turn.
        }
        if (unhappy_angry_people > happy_people || server_settings.hangry.val && pcity.granary_turns == -1) {
          city_state_span = "id='city_state"+pcity.id+"' class='redux_centre mobile_centre negative_text' style='cursor:help; text-align:center;'>"+city_state;    // more unhappy than happy = disorder, red code
          if (pcity.granary_turns == -1 && server_settings.hangry.val) next_state = "Famine";
          else next_state = "Lawless";
        }
        city_state = "<span title='"+html_safe(get_city_state_description(current_state,next_state))+"' "+city_state_span;
        // Put braille code for next 3 turns of rapture after the celebrating state
        if (!tiny_screen) {
          city_state += "<span";

          if (!(pcity.rapture_status & 2))          // won't rapture next turn, red color warns of it
            city_state += " class='negative_text'>";
          else if (pcity.rapture_status & 14)       // raptures 3 turns in a row, cool blue, don't worry
            city_state += " class='hint_of_blue'>";
          else
            city_state += ">";

          city_state += city_rapture_dots(pcity.rapture_status) + "</span>";
        }

        happy_people   = "<span class='hint_of_green'>"+happy_people+"</span>";
        content_people = "<span class='hint_of_blue'>" +content_people+"</span>";
        unhappy_angry_people = "<span class='hint_of_orange'>"+unhappy_angry_people+"</span>";

        // FPT
        var food_check = pcity['surplus'][O_FOOD];
        if (food_check > 0) {
          city_food = "<td style='text-align:right;' class='food_text' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>"
          + "<span class='food_text'>" + pcity['surplus'][O_FOOD]+"</span>" + "</td>";
        } else if (food_check == 0) {
          city_food = "<td style='text-align:right;' class='food_text' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>"
          + " "+ "</td>";      // showing nothing is more informative to the eye than showing a numeral.
        } else if (food_check < 0) {
          city_food = "<td style='text-align:right;' class='negative_food_text' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>"
          + "<span class='negative_food_text'>" + pcity['surplus'][O_FOOD]+"</span>" + "</td>";
        }
        city_prod = "<td style='text-align:right;' class='prod_text' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>"
          + "<span class='prod_text'>" + pcity['surplus'][O_SHIELD]+"</span>" + "</td>";
        city_trade= "<td style='text-align:right;' class='trade_text' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>"
          + "<span class='trade_text'>" + pcity['surplus'][O_TRADE]+"</span>" + "</td>";

         // GLS
        city_gold= "<td style='text-align:right;' class='gold_text' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>"
          + "<span class='gold_text'>" + pcity['prod'][O_GOLD] +"</span>" +  "</td>"
        city_lux = "<td style='text-align:right;' class='lux_text' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>"
          + "<span class='lux_text'>" + pcity['prod'][O_LUXURY] +"</span>" +  "</td>";
        city_sci = "<td style='text-align:right;' class='sci_text' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'>"
          + "<span class='sci_text'>" + pcity['prod'][O_SCIENCE] + "</span>" + "</td>";

        // Widescreen only:  user defined info column:
        switch (city_user_row_val) {
          case CURV_CORRUPTION:
            city_user = "<td class='non_priority' style='text-align:right; padding-right:32px' onclick='javascript:change_city_user_row(" + pcity['id'] + ");'>"
              + "<span style='color:#d65'>" + (pcity['waste'][O_TRADE]<1 ? " " : pcity['waste'][O_TRADE]) +"</span>" +  "</td>";
            break;
          case CURV_POLLUTION:
            city_user = "<td class='non_priority' style='text-align:right; padding-right:32px' onclick='javascript:change_city_user_row(" + pcity['id'] + ");'>"
              + "<span style='color:#A73'>" + (pcity['pollution']<1 ? " " : pcity['pollution']) +"%</span>" +  "</td>";
            break;
          case CURV_TRADE_REVENUE:
            const rev = get_city_traderoute_revenue(pcity['id']);
            city_user = "<td class='non_priority' style='text-align:right; padding-right:32px' onclick='javascript:change_city_user_row(" + pcity['id'] + ");'>"
              + "<span style='color:#fdff7d;'>" + (rev<1 ? " " : rev) + "</span>" +  "</td>";
            break;
          case CURV_GOLD_PER_SHIELD:
            const gcps = get_gold_cost_per_shield(pcity);
            city_user = "<td class='non_priority' style='text-align:right; padding-right:32px' onclick='javascript:change_city_user_row(" + pcity['id'] + ");'>"
            + "<span style='color:#fdff7d;'>" + (gcps=="No" ? " " : gcps) + "</span>" +  "</td>";
            break;
          case CURV_TURN_FOUNDED:
            city_user = "<td class='non_priority' style='text-align:right; padding-right:32px' onclick='javascript:change_city_user_row(" + pcity['id'] + ");'>"
              + "<span style='color:#999'>" + pcity['turn_founded'] +"</span>" +  "</td>";
            break;
          case CURV_BUILD_SLOTS:
            city_user = "<td class='non_priority' style='text-align:right; padding-right:32px' onclick='javascript:change_city_user_row(" + pcity['id'] + ");'>"
              + "<span style='color:#f44'>" + ((pcity['build_slots'] && pcity['build_slots'] > 1) ? pcity['build_slots'] : "") +"</span>" +  "</td>";
            break;
          case CURV_MIL_UNHAPPY:
            //check that these vars are not undefined
            //const unit_unhappy = pcity['ppl_angry'][FEELING_MARTIAL] * 2 + pcity['ppl_unhappy'][FEELING_MARTIAL];
            //const natl_unhappy = pcity['ppl_angry'][FEELING_NATIONALITY] * 2 + pcity['ppl_unhappy'][FEELING_NATIONALITY];
            const mil_unhappy = unit_military_unhappy_in_city(pcity);
            let mil_title = (mil_unhappy >= 0) ? (pluralize("citizen", Math.abs(mil_unhappy)) + " unhappy from aggressive units")
                                                  : (pluralize("citizen", Math.abs(mil_unhappy)) + " pacified by Martial Law");
            city_user = "<td title='"+mil_title+"' class='non_priority' style='text-align:right; padding-right:32px' onclick='javascript:change_city_user_row("
              + pcity['id'] + ");'>"
              + "<span style='color:" + (mil_unhappy>0 ? "#f44" : "#67f")
              + "'>" + ((mil_unhappy) ? Math.abs(mil_unhappy) : "") +"</span>" +  "</td>";
            break;
          case CURV_FOREIGNERS:
            /* Determine which position in the national populations array is the current owner */
            let owner_idx = 0;
            for (let nat in pcity.nation_id) {
              if (pcity.nation_id[nat] == pcity.owner)
               owner_idx = parseInt(nat);
            }
            city_user = "<td class='non_priority' style='text-align:right; padding-right:32px' onclick='javascript:change_city_user_row(" + pcity['id'] + ");'>"
              + "<span style='color:#F92'>" +
              (pcity['nationalities_count'] < 2 ? " " : (pcity['size'] - pcity['nation_citizens'][owner_idx]) +"</span>" +  "</td>");
            break;
          default:
            city_user = "<td class='non_priority' style='text-align:right; padding-right:32px' onclick='javascript:change_city_user_row(" + pcity['id'] + ");'>"
            + "<span style='color:#ffff'>0</span></td>";
          }

        // Calculate turns to grow or " " if not growing
        if (tiny_screen) { // tiny screen, numerals only
          city_growth = pcity['granary_turns'];
          if (city_growth>1000) city_growth = " ";
          else if (city_growth != 1 && city_growth != -1) city_growth="<span class='mobile_centre non_priority'>" + city_growth + "</span>";
          else city_growth="<span class='mobile_centre'>" + city_growth + "</span>";
        } else { // (wide_screen || redux_screen)
          city_growth = city_turns_to_growth_text(pcity);
          if (city_growth.startsWith("&#9662;")) {
            city_growth="<span title = '"
              + (pcity.granary_turns == -1 ? "Starving next turn!" : "Starves in "+Math.abs(pcity.granary_turns)+" turns.")
              + "' class='negative_text'>" + city_growth + "</span>";
          } else {
            city_growth="<span class='non_priority'>" + city_growth + "</span>";
          }
        }

        if (!wide_screen) {
          city_food_stock = "<span class='non_priority'>" + pcity['food_stock']+"</span>";
          city_granary_size = "<span class='non_priority'>" + pcity['granary_size']+"</span>";
        } else { // (wide_screen)
          city_food_stock = "<span class='non_priority'>" + pcity['food_stock']+"</span>";
          city_granary_size = pcity['granary_size'].toString();
          // insert a " " for every digit short of 3 digits, for alignment:
          if (city_granary_size.length<3)
            city_granary_size = "&nbsp;&nbsp;".repeat(3-city_granary_size.length) + city_granary_size;

          city_granary_size = "<span class='non_priority'>" + city_granary_size+"</span>";
        }

        // Generate and align buy cost with link to buy, or blank if can't be bought because no shields remain.
        if (pcity['buy_cost'] == 0) {
          city_buy_cost = " ";   // blank is less visual noise than a 0.
        } else if (wide_screen) {
          city_buy_cost = "<u>"+pcity['buy_cost']+"</u>";
          city_buy_cost = "<div class='empire_tooltip' title='Click to buy' style='padding-right:10px;'>" + city_buy_cost + "</div>" // last column not forced to very edge of screen
        } else {
          city_buy_cost = "<u>"+pcity['buy_cost']+"</u>"
          city_buy_cost = "<div style='text-align:right; title='Click to buy' style='padding-right:1em;'>" + city_buy_cost + "</div>" // last column not forced to very edge of screen
        }

        // Generate micro-sprite for production
        prod_sprite = get_city_production_type_sprite(pcity);
        prod_img_html = "";
        if (prod_sprite != null) {
          sprite = prod_sprite['sprite'];

          adjust_oversize = (sprite['width']>64) ? "margin-right:-20px;" : "";  // "oversize" images are 20 pixels wider so need alignment

          prod_img_html = "<div class='prod_img' oncontextmenu='set_mass_prod_city("+pcity['id']+");' "
                  //+ "onclick='city_filter_prod_type(event,"+pcity['id']+");' "
                  + "title='RIGHT-CLICK:  Set mass-selection target\n\nSHIFT-CLICK:  Highlight ON/OFF cities making this item\n\n"
                  + "CTRL-CLICK:   Select ON/OFF cities making this item\n\n"+browser.metaKey+"-CLICK:      See manual documentation for this item.' "
                  + "style='max-height:24px; float:right; padding-left:0px padding-right:0px; content-align:right; margin-top:-14px;"
                  + adjust_oversize+"'>"
                  + "<div style='float:right; content-align:right;"
                  + "background: transparent url("
                  + sprite['image-src']
                  + ");transform: scale(0.625); background-position:-" + sprite['tileset-x'] + "px -" + (sprite['tileset-y'])
                  + "px;  width: " + (sprite['width']) + "px;height: " + (sprite['height']) + "px;"
                  + " content-align: right;"
                  + "vertical-align:top; float:right;'>"
                  +"</div></div>";
        }

        // City name: Capital markers and CMA markers, length shortening for tiny screen
        city_name = "";
        if (is_capital(pcity)) city_name += "<span title='Capital' style='color:cyan'>&#9733; </span>";
        if (city_has_building(pcity, improvement_id_by_name(B_ECC_PALACE_NAME))) city_name += "<span title='Ecclesiastic Capital' style='color:yellow'>&#x2CE9; </span>";
        // tiny mobile: abbreviate city name to first 11 letters plus small "..."
        city_name += ( (tiny_screen && pcity['name'].length>11)
              ? (pcity['name'].substring(0,10) + "<span style='font-size:66%;'>&#x22ef;</span></td>")
              : (pcity['name'] + (pcity.cma_enabled ? "<span title='Governor controlled'> &#x1F539;</span>" :"")+ "</td>") );
                 // added CMA blue diamond to show if city governor present

        city_list_html += "<tr class='cities_row' id='cities_list_" + pcity['id'] + "'>"
                + td_hover_html + city_name + "</td>" // tiny mobile: abbreviate city name to first 11 letters plus "..."
                + td_click_html + city_size_string + "</td>"
                + td_click2_html + happy_people+"</td>"
                + td_click2_html + content_people+"</td>"
                + td_click2_html + unhappy_angry_people+"</td>"
                + td_click_html + city_state + "</td>"
                + city_food + city_prod + city_trade
                + (wide_screen ? city_user : td_click_html + "</td>")
                + city_gold + city_lux + city_sci
                + td_click_html + city_growth + "</td>"
                + td_click_html+ city_food_stock + "<span class='contrast_text'>/</span>" + city_granary_size + "</td>"
                + td_change_prod_html +
                      (  wide_screen  ? ("&nbsp;&nbsp;<u>"+prod_type['name']+"</u> "+prod_img_html+"</td>")
                                      : ("<span style='font-size:1%; color: rgba(0, 0, 0, 0);'>"+prod_type['name'].charAt(0)+"</span>"+prod_img_html+"</td>") ) //invisible tiny first letter for column sorting
                + td_click_html +
                      (   wide_screen ? (turns_to_complete_str+" &nbsp;&nbsp;&nbsp;&nbsp; "+progress_string +"</td>")
                                      : (redux_screen && !tiny_screen ? "("+turns_to_complete_str+") "+progress_string+"</td>"
                                                      : turns_to_complete_str.replace("turns", "")+"</td>")   )
                + ( (wide_screen || redux_screen) ? (td_buy_html+city_buy_cost+"</td>") : "" )
                + ( !tiny_screen
                    ? "<td style='text-align:left;'><input type='checkbox' class='css-checkbox' oncontextmenu='set_mass_prod_city("+pcity['id']+");' id='cb"+pcity['id']+"' value=''><label for='cb"+pcity['id']+"' name='cb_lbl"+pcity['id']+"' class='css-label dark-check-cyan'></label></td>"
                    : "" )
        city_list_html += "</tr>";
    }
  }

  // Title Header Area:
  var title_text = "<span id='cities_title_cma_panel' style='text-align:left; float:left; padding-right:10px;'>Your Cities ("+count+")</span>";
  if (!is_small_screen() ) {
    title_text +=
       " <span id='city_improvements_hover_list'></span>"
     + " <span id='mass_production'></span>"    // mass-select functionality not available on mobile
     + " <button title='Change production in selected cities' class='button ui-button ui-corner-all ui-widget' style='padding:5px; margin:4px; font-size:70%; float:right;' onclick='mass_change_prod();'>Change &#x2611; to:</button>"
     + " <button title='BUY in selected cities' class='button ui-button ui-corner-all ui-widget' style='padding:5px; margin:4px; font-size:70%; float:right;' onclick='request_buy_all_selected_cities();'>&#x2611; Buy selected</button>";
  } else $('#cities_title').css({"font-size":"100%"});
  $('#cities_title').html(title_text);
  $("#cities_title").tooltip({
    show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  });


  if (power_cma==true) {
    var power_panel =
      "<button title='Click: Refresh tile arrangement in selected cities.\nCTRL-Click: Save Governor Clipboard to selected cities.\nShift-Click: Use Governor Clipboard to arrange tiles, without saving.' class='button ui-button ui-corner-all ui-widget' style='padding:1px; margin:1px; font-size:100%; float:left;' onclick='cma_clipboard_macro(event,false);'>&#x1F4CB; "+pluralize("City", count)+"<span>&nbsp;</span></button>";
    $("#cities_title_cma_panel").html(power_panel);
  }

  city_list_html += "</tbody></table>";
  $("#cities_list").html(city_list_html);

  //$('#city_list_citizen_unhappy').css("padding-right", "20px");
  $('#city_list_citizen_unhappy').tooltip({
    content: "Unhappy + angry citizens", position: { my:"center bottom", at: "center top+10"},
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });
  $('#city_list_citizen_content').tooltip({
    content: "Content citizens", position: { my:"center bottom", at: "center top+10"},
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });
  $('#city_list_citizen_happy').tooltip({
    content: "Happy citizens", position: { my:"center bottom", at: "center top+10"},
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });

  if (count == 0) {
    $("#city_table").html("You have no cities. Build new cities with the Settlers unit.");
  }

  /* old method : assume 200px above the element to safely fit it (works but doesn't use all real estate)
  $('#cities_scroll').css("height", $(window).height() - 200); */
  // New method: Try to calculate height to use all vertical real estate on the screen:
  $('#cities_scroll').css("height", $(window).height() - $("#cities_scroll").offset().top-3);

  $("#city_table").tablesorter({theme:"dark", sortList: sortList});

  if (tiny_screen) {
    //$("#city_table").css({"zoom":"0.6"});  // doesn't work right on Firefox, use 3 lines below insead
    // -40% scaling if screen is small AND narrow
    $("#city_table").css({"transform":"scale(0.6)","transform-origin":"0 0"});
    $("#cities").css({"width":"166.66%"}); // compensate that transform-scale doesn't change zoom level, so it occupies whole screen
    if (scroll_narrow_x) { // mobile wider table rows option
      // don't disable horiz. scroll: users get a little more width for buy cost columnn
    }
    else {
      $("#cities_scroll").css({"overflow-x":"hidden"}); // now clip overflow from it
    }

    $("#city_table_head").css({"font-size":"85%"});
    $(".prod_img").css({"margin-top":"-19px"});
    $(".tdc1").css({"padding-right":"0px"});
    $(".tdc2").css({"padding-right":"0px"});
    $(".mobile_centre").parent().css({"text-align":"center"});
    $(".mobile_centre").css({"text-align":"center"});
  }
  else if (redux_screen) {
    //$("#city_table").css({"zoom":"0.91"});  // doesn't work right on Firefox, use 3 lines below insead
    //-9% scaling if screen is only slightly smaller
    $("#city_table").css({"transform":"scale(0.91)","transform-origin":"0 0"});
    $("#cities").css({"width":"110%",}); // compensate that transform-scale doesn't change zoom level, so it occupies whole screen
    $("#cities_scroll").css({"overflow-x":"hidden"}); // now clip overflow from it

    $("#city_table_head").css({"font-size":"95%"});
    $(".tdc1").css({"padding-right":"0px"});
    $(".tdc2").css({"padding-right":"0px"});
    $(".redux_centre").parent().css({"text-align":"center"});
    $(".redux_centre").css({"text-align":"center"});
  } else if (wide_screen) {
    $("#cities").css({"width":"100%",});   // reset in case of screen or window resize
  }

  if (retain_checkboxes_on_update)
  {
    retain_checkboxes_on_update = false;
    restore_city_checkboxes();
  }
  // Update display for current mass production selection:
  set_mass_prod_city(prod_selection_city);

  // Update an active SuperPanel if we had a refresh of screen after a
  // SuperPanel action:
  if (active_superpanel_cityid > 0) {
    show_city_improvement_pane(active_superpanel_cityid);
    if (active_superpanel_dialog_refresh_delay==true)
      // Don't reset state the first time if waiting for user input.
      // By the time the next refresh comes, user will have answered
      // a dialog question (such as whether to buy/sell a building)
      active_superpanel_dialog_refresh_delay = false;
    else
      active_superpanel_cityid = -1; // deactive refresh mode.
  }

  $(".prod_img").tooltip({
    show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  });
  $(".empire_tooltip").tooltip({
    show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  });
  $(".cities_row").tooltip({
    show: { delay:460, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  });
}


/**************************************************************************
  User defined city info row
**************************************************************************/
function change_city_user_row(city_id)
{
  city_user_row_val ++;

  if (city_user_row_val >= CURV_LAST)
    city_user_row_val = 0;

  update_city_screen();
}

/**************************************************************************
  Restores retained checkbox states if update_city_screen() refreshes
  itself while viewing (e.g., bought something, changed production item)
**************************************************************************/
function restore_city_checkboxes()
{
  //console.log("Restoring checkboxes.");
  // Restore checkbox state in individual city rows:
  if (city_checkbox_states != null) {
    for (var city_id in cities)  {
      if (city_checkbox_states[city_id] == true) {
        //console.log("  "+city_id+":"+cities[city_id].name+" == true.  (setting now)");
        $("#cb"+city_id).prop('checked', true);
      }
    }
  }
  // Restore checkbox state of "master" header checkbox
  $("#master_checkbox").prop('checked', master_checkbox);
}

/**************************************************************************
  Save all checkboxes in city list for restoring if screen updates.
**************************************************************************/
function save_city_checkbox_states()
{
  for (var city_id in cities)  {
    if ($("#cb"+city_id).is(":checked")) {
      city_checkbox_states[city_id] = true;
    } else city_checkbox_states[city_id] = false;
  }
}

/**************************************************************************
  Left-click:  Toggle all checkboxes in city list for selected cities
  Shift-click: Toggle all checkboxes in city list iff row is highlighted
**************************************************************************/
function toggle_city_row_selections(event)
{
  if (event.shiftKey) { // Toggle based on highlighted state
    for (var city_id in cities)  {
      if ($("#cities_list_"+city_id).css("background-color") == "rgb(0, 0, 255)" ) {
        $("#cb"+city_id).prop('checked', !($("#cb"+city_id).is(":checked")) );
      }
    }
  } else {                // Toggle current check-state
      for (var city_id in cities)  {
        $("#cb"+city_id).prop('checked', !($("#cb"+city_id).is(":checked")) );
      }
      master_checkbox = $("#master_checkbox").is(":checked");
    }
}

/**************************************************************************
  Depending on parameters,
  1. Auto-arranges tiles in selected cities using the CMA Clipboard,
  2. Saves the CMA Clipboard as a new Governor in all selected cities,
  3. Auto-arranges tiles in selected cities, which will either use
     their Governor if enabled, or the server's default CMA if not.
  ...
  'called_by_CMA' parameter means the CMA tab called this function
  to auto-arrange tiles in all cities with governors, instead of all
  cities that were selected in the Cities List.
**************************************************************************/
function cma_clipboard_macro(event, called_by_CMA)
{
  var apply_once = false, save = false;
  if (!event) event = new Event(""); // avoid null exceptions if called by CMA tab.

  // City_List was caller, Shift-Click to apply Clipboard settings without Save:
  if (event.ctrlKey) save = true;
  // City List was caller, CTRL-Click to save Clipboard as governor:
  else if (event.shiftKey) apply_once = true;
  // City List was caller with normal-Click || CMA tab called this function:
  var autoarrange = !(apply_once || save) || called_by_CMA;

  var sent_orders = false;
  // Arrange tiles according to the CMA clipboard in all selected cities:
  if (apply_once || save) {
    for (var city_id in cities)  {
      if ($("#cb"+city_id).is(":checked")) {
        cma_paste_to_city_id(parseInt(city_id), apply_once);
        city_checkbox_states[city_id] = true;
        sent_orders = true;
      } else city_checkbox_states[city_id] = false;
    }
    play_sound( (sent_orders ? soundset["e_success"] : soundset["e_fail"]) );
    retain_checkboxes_on_update = true;
    return;
  }
  // Refresh tiles according to their current CMA (or server default CMA):
  else if (autoarrange) {
    var cities_string="";
    var count = 0;
    for (var city_id in cities)  {
       // if City List was caller, selected cities only:
      if ($("#cb"+city_id).is(":checked")
        // if CMA tab was caller, all governed cities:
        || (called_by_CMA && cities[city_id].cma_enabled)
         ) {
        // Emulates clicking the city centre, causing auto-arrange tiles:
        var packet = {"pid"     : packet_city_make_specialist,
                      "city_id" : parseInt(city_id),
                      "tile_id" : city_tile(cities[city_id]).index,
                      "specialist_to": -1
                     };
        send_request(JSON.stringify(packet));
        city_checkbox_states[city_id] = true;
        count++;
        cities_string += cities[city_id].name+", "
      } else city_checkbox_states[city_id] = false;
    }
    retain_checkboxes_on_update = true;
    if (count) {
      if (count>5) cities_string = ""+count+" cities, "
      cities_string = "&#x1F539; Ordered Governor to refresh tiles in <font color='yellow'>"+cities_string
                    + "</font>using existing Governor settings.";
      // Emulate incoming server packet for CMA, so it is intercepted and processed properly.
      packet = {"pid":25,"message":cities_string, "event":E_CITY_CMA_RELEASE};
      handle_chat_msg(packet);
      play_sound(soundset["e_success"]);
      if (called_by_CMA) {
        $("#cma_unsaved_warning").html(cities_string);
        global_governor_message = cities_string;
      }
    } else {
      packet = {"pid":25, "message":"&#x26A0;&#xFE0F; <b>Failed:</b> no cities were selected for tile refresh.",
                "event":E_CITY_CMA_RELEASE};
      handle_chat_msg(packet);
      play_sound(soundset["e_fail"]);
      global_governor_message = "&#x26A0;&#xFE0F; <b>Failed:</b> no goverened cities were found.";
    }
  }
}
/**************************************************************************
  Shows dialog to confirm a mass-purchase for every production item in
  every selected city.
**************************************************************************/
function request_buy_all_selected_cities()
{
  var pplayer = client.conn.playing;

  // compute total cost and item count
  var total_cost = 0;
  var item_count = 0;
  var cost = 0;
  var total_shields = 0;
  for (var city_id in cities)  {
    if ($("#cb"+city_id).is(":checked")) {
      cost = cities[city_id]['buy_cost'];
      total_cost += cost;
      total_shields += get_shields_remaining(cities[city_id]);
      if (cost > 0) {item_count += 1;}
    }
  }

  var plural = item_count > 1 ? true : false

  if (total_cost == 0 || total_cost > pplayer['gold']) {
    var title_string = total_cost == 0 ? "Nothing to Buy!" : "Not Enough Gold!";
    var rejection_string = total_cost == 0 ? "Cost of selected purchase is 0." :
      total_cost +" gold for " + item_count + " item" + (plural ? "s" :"")
                          + " exceeds " + pplayer['gold'] + " treasury gold.";
    swal({
          title: title_string,
          text: rejection_string,
          type: "warning",
          showCancelButton: false,
          //confirmButtonColor: "#803030",
          confirmButtonText: "OK",
          closeOnConfirm: true
         });
    setSwalTheme();
    return;
  }

  // reset dialog page.
  remove_active_dialog("#dialog");
  $("<div id='dialog'></div>").appendTo("div#game_page");
  var gcps = total_cost / total_shields;
  var buy_question_string = "Buy " + item_count + " item"+(plural?"s":"")
                          +" for <b>" + total_cost + "</b> gold @ "
                          + gcps.toFixed(2)+"g/shield ?";
  var treasury_text = "<br>Treasury contains " + pplayer['gold'] + " gold.";
  var dhtml = buy_question_string + treasury_text;

  $("#dialog").html(dhtml);

  $("#dialog").attr("title", "Buy It!");
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "95%" : "50%",
			buttons: {
				"Yes": function() {
            send_buy_all_selected_cities();
            remove_active_dialog("#dialog");
				},
				"No (𝗪)": function() {
            remove_active_dialog("#dialog");
				}
			}
		});

  $("#dialog").dialog('open');
  dialog_register("#dialog");
}
/**************************************************************************
  Buys (or attempts to buy) every production item in every selected city.
**************************************************************************/
function send_buy_all_selected_cities()
{
  for (var city_id in cities)  {
    if ($("#cb"+city_id).is(":checked")) {
      var packet = {"pid" : packet_city_buy, "city_id" : cities[city_id].id};
      send_request(JSON.stringify(packet));
      city_checkbox_states[city_id] = true;
    } else city_checkbox_states[city_id] = false;
  }
  retain_checkboxes_on_update = true;
}

/*************************************************************************
  Changes production in all cities to be same as the selected city
**************************************************************************/
function mass_change_prod()
{
  //console.log("  mass_change_prod() called")
  var c = prod_selection_city;  // the city to model for what all others should produce
  for (var city_id in cities)  {
    if ($("#cb"+city_id).is(":checked") && cities[city_id] != null && cities[c] != null) {
      send_city_change(cities[city_id].id, cities[c].production_kind,cities[c].production_value);
      city_checkbox_states[city_id] = true;
    } else city_checkbox_states[city_id] = false;
  }
  retain_checkboxes_on_update = true;
}

/*************************************************************************
  Sets prod_selection_city - this records which city's production
  selection will be the "model" if the user does a mass-selection
  production change
**************************************************************************/
function set_mass_prod_city(city_id)
{
  //console.log("  set_mass_prod_city() called")
  prod_selection_city = city_id;
  pcity = cities[city_id];
  var prod_type = get_city_production_type_sprite(pcity);
  var prod_img_html = "";
  if (prod_type != null) {
    sprite = prod_type['sprite'];
    prod_img_html = "<span title='" + (prod_type!=null ? "Selected cities will change production to: "+prod_type['type']['name'] : "") + "' style='background: transparent url("
           + sprite['image-src']
           + ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px; float:right; transform:scale(0.7); "
           + " cursor:pointer; margin-bottom:-20px;' "
           + "onclick='javascript:city_change_prod("+ pcity['id'] + ");'"
           + ">"
           +"</span>";
  }
  $("#mass_production").html(prod_img_html);
}

/**************************************************************************
  Return TRUE iff the city is unhappy.  An unhappy city will fall
  into disorder soon.
**************************************************************************/
function city_unhappy(pcity)
{
  return (pcity['ppl_happy'][FEELING_FINAL]
          < pcity['ppl_unhappy'][FEELING_FINAL]
            + 2 * pcity['ppl_angry'][FEELING_FINAL]);
}

/**************************************************************************
 Returns the city state: Celebrating, Disorder or Peace.
**************************************************************************/
function get_city_state(pcity)
{
  if (pcity == null) return;

  if (pcity['was_happy'] && pcity['size'] >= city_celebrate_size(pcity)) {
    return "Celebrating";
  } else if (pcity['hangry']) {
    return "Famine";
  } else if (server_settings.fulldisorder.val && pcity['anarchy']) {
    return "Lawless"
  } else if (pcity['unhappy']) {
    return "Disorder";
  } else {
    return "Peace";
  }
}
/**************************************************************************
 Describe city state mood vector of {current, next} in normal language.
**************************************************************************/
function get_city_state_description(current, next) {
  var desc = "";
  switch (current) {
    case "Celebrating":
      desc = "Celebrating.";
      break;
    case "Famine":
      desc = "Famine.";
      if (server_settings.hangry.val) desc+= " Can't produce this turn."
      break;
    case "Lawless":
      if (server_settings.fulldisorder.val)
        desc = "Lawless. Can't produce this turn."
      else desc = "Disorder."
      break;
    case "Disorder":
      desc = "Disorder threatened. May produce this turn."
      break;
    default:
      desc = "Peace."
  }
  switch (next) {
    case "Celebrating":
      desc += "\nCelebrates next turn.";
      break;
    case "Famine":
      if (server_settings.fulldisorder.val) {
        if (desc=="Peace." || desc=="Celebrating.") {
          desc += " May produce this turn."
        }
        desc += "\nFamine next turn. Production will halt.";
      }
      else
        desc += "\nStarves next turn.";
      break;
    case "Disorder":
    case "Lawless":
      if (server_settings.fulldisorder.val) {
        if (desc=="Peace." || desc=="Celebrating.") {
          desc += " May produce this turn."
        }
        desc += "\nLawless next turn. Production will halt.";
      }
      else desc += "\nDisorder next turn."
      break;
    default:
      desc += "\nPeace next turn.";
      break;
  }
  return desc;
}

/**************************************************************************
 Callback to handle keyboard events for the city dialog.
**************************************************************************/
function city_keyboard_listener(ev)
{
  // Check if focus is in chat field, where these keyboard events are ignored.
  if ($('input:focus').length > 0 || !keyboard_input) return;

  if (C_S_RUNNING != client_state()) return;

  /* if (!ev) ev = window.event; INTERNET EXPLORER DEPRECATED */
  var keyboard_key = String.fromCharCode(ev.keyCode);
  var key_code = ev.keyCode;

  if (active_city != null) {
    switch (key_code) {
      case 38: // 8/up arrow
      case 104:
        ev.stopImmediatePropagation();
        setTimeout(function(){
          city_tab_index = 0;  // Main view screen
          $("#city_tabs").tabs({ active: city_tab_index});
        }, 300);
        break;
      case 40: // 2/down arrow
      case 98:
        ev.stopImmediatePropagation();
        setTimeout(function(){
          city_tab_index = 1;  // Production screen
          $("#city_tabs").tabs({ active: city_tab_index});
        }, 300);
        break;
      case 27:
          ev.stopPropagation();
          close_city_dialog();
          chatbox_scroll_to_bottom(false);
          break;
      case 32:
          ev.stopImmediatePropagation();
          // SPACE - flip-flop between production/main screen
          // if not in one of those 2 screens, go to main screen
          if (city_tab_index > 1) city_tab_index = 0;
          else city_tab_index = 1-city_tab_index;  // flip production/main screen
          $("#city_tabs").tabs({ active: city_tab_index});
          break;
        }
    switch (keyboard_key) {
      case 'P':
        ev.stopPropagation();
        previous_city();
        break;

      case 'V':
      case 'M':
        ev.stopPropagation();
        city_tab_index = 0;  // Main screen / View
        $("#city_tabs").tabs({ active: city_tab_index});
        break;

      case 'D':
        ev.stopPropagation();
        city_tab_index = 1;  // Production screen
        $("#city_tabs").tabs({ active: city_tab_index});
        break;

      case 'T':
      case 'R':
        ev.stopPropagation();
        city_tab_index = 2;  // Trade routes
        $("#city_tabs").tabs({ active: city_tab_index});
        break;

      case 'O':
        ev.stopPropagation();
        city_tab_index = 3;  // Options/Settings
        $("#city_tabs").tabs({ active: city_tab_index});
        break;

      case 'H':
        ev.stopPropagation();
        city_tab_index = 4;  // Happy
        $("#city_tabs").tabs({ active: city_tab_index});
        break;

      // The following 2 tabs remove under certain conditions
      // and don't have reliable tab index because of it.
      // However, an artificial click is done to ensure transition.
      case 'G':
        ev.stopPropagation();
        city_tab_index = 5;
        $("#city_tabs").tabs({ active: city_tab_index});
        $("#ctg").click();
        break;

      case 'I':
        ev.stopPropagation();
        city_tab_index = 6;
        $("#city_tabs").tabs({ active: city_tab_index});
        $("#cti").click();
        break;

       case 'W': // same command as ESC above (code 27)
         ev.stopPropagation();
         close_city_dialog_trigger();
         chatbox_scroll_to_bottom(false);
         break;

       case 'N':
          ev.stopPropagation();
          next_city();
         break;

       case 'B':
          ev.stopPropagation();
          request_city_buy();
         break;
    }
  }
}
/**************************************************************************
 Switches to the city's prod tab. Called from main tab when clicking
 icon of what is being currently made.
**************************************************************************/
function city_prod_tab(e)
{
  // meta-Click is for show help
  if (metaKey(e)) {
    // Function below does exactly what we want  so call it:
    city_remove_current_prod(e, true);
    return;
  } // end show help

  city_tab_index = 1;
  $("#city_tabs").tabs({ active: city_tab_index});
}

/**************************************************************************
 Cancel's the city's rally point
**************************************************************************/
function city_cancel_rally_point(city_id)
{
  // Set rally point to city's own tile (which cancels rally point):
  var pcity = cities[city_id];
  var ptile = city_tile(pcity);
  rally_city_id = city_id;
  // "0" = rally_path. non-null dummy value triggers cancel logic:
  goto_request_map["0" + "," + ptile['x'] + "," + ptile['y']] = true;

  send_city_rally_point(ptile);
}


/**************************************************************************
 Get % of city's citizens who are foreign
**************************************************************************/
function city_get_foreign_pct(city_id)
{
  var pcity = cities[city_id];
  var total_citizens = pcity.size;
  var domestic_citizens = 0;
  var foreign_citizens = 0;

  for (ethnicity in pcity['nation_id']) {
    let num_ethnics = pcity['nation_citizens'][ethnicity];

    if (pcity['nation_id'][ethnicity] == pcity.owner) {
      domestic_citizens += num_ethnics;
    } else foreign_citizens += num_ethnics;
  }

  return (foreign_citizens / total_citizens) * 100;
}

/**************************************************************************
 Returns the 3d model name for the given city.
**************************************************************************/
function city_to_3d_model_name(pcity)
{
  var size = 0;
  if (pcity['size'] >=3 && pcity['size'] <=6) {
    size = 1;
  } else if (pcity['size'] > 6 && pcity['size'] <= 9) {
    size = 2;
  } else if (pcity['size'] > 9 && pcity['size'] <= 11) {
    size = 3;
  } else if (pcity['size'] > 11) {
    size = 4;
  }

  var style_id = pcity['style'];
  if (style_id == -1) style_id = 0;
  var city_rule = city_rules[style_id];

  var city_style_name = "european";
  if (city_rule['rule_name'] == "Industrial" || city_rule['rule_name'] == "ElectricAge" || city_rule['rule_name'] == "Modern"
      || city_rule['rule_name'] == "PostModern" || city_rule['rule_name'] == "Asian") {
    city_style_name = "modern"
  }

  return "city_" + city_style_name + "_" + size;
}

/**************************************************************************
 Returns the city walls scale of for the given city.
**************************************************************************/
function get_citywalls_scale(pcity)
{
  var scale = 8;
  if (pcity['size'] >=3 && pcity['size'] <=6) {
    scale = 9;
  } else if (pcity['size'] > 6 && pcity['size'] <= 9) {
    scale = 10;
  } else if (pcity['size'] > 9 && pcity['size'] <= 11) {
    scale = 11;
  } else if (pcity['size'] > 11) {
    scale = 12;
  }

  return scale;
}

/**************************************************************************
 Set the city canvas size for a city based on its radius
**************************************************************************/
function set_citydlg_dimensions(pcity)
{
  var radius_tiles = Math.ceil(Math.sqrt(pcity.city_radius_sq));

  citydlg_map_width = tileset_width + radius_tiles * tileset_width;
  citydlg_map_height = tileset_height + radius_tiles * tileset_height;

  /* In some cases the formula needs adjustment */
  switch (pcity.city_radius_sq) {
    case 3:
    case 4:
    case 8:
    case 9:
      citydlg_map_height += tileset_height;
      citydlg_map_width += tileset_width;
    break;
    default:
      if (pcity.city_radius_sq > 12) {
        citydlg_map_width += tileset_width;
        citydlg_map_height += tileset_height;
      }
  }
  //DEBUG
  //console.log("%d,%d",citydlg_map_width,citydlg_map_height)

  $("#city_canvas_div").css({"width":citydlg_map_width, "height":citydlg_map_height});
  $("#city_canvas_top_div").css({"width":citydlg_map_width, "height":citydlg_map_height});
  //$("#city_canvas").css({"width":citydlg_map_width, "height":citydlg_map_height});
  $("#city_canvas").attr('width', citydlg_map_width);
  $("#city_canvas").attr('height', citydlg_map_height);
}
