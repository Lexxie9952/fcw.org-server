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

var TAX_GRANULE = 10;
var s_tax = null;
var s_lux = null;
var s_sci = null;

var tax;
var sci;
var lux;

var maxrate = 80;
var freeze = false;  // this now freezes updating map,city,empire,and tech tab
var government_list;
var current_government;

var rate_updater_interval;
var rates_changed=false;

var sliders_adjusted = false;


/**************************************************************************
  ...
**************************************************************************/
function show_tax_rates_dialog()
{
  if (client_rules_flag[CRF_MP2_D]) {
    TAX_GRANULE = simpleStorage.get("txGrnl");
    if (TAX_GRANULE == null) {
      TAX_GRANULE = 10;
      simpleStorage.set('txGrnl', TAX_GRANULE);
    }
  }

  sliders_adjusted = false;
  if (client_is_observer()) return;
  
  var id = "#rates_dialog";
  $(id).remove();
  
  // Having an active_city while adjusting rates degrades events/updates/refreshes
  if (active_city) {
    close_city_dialog_trigger();    
    active_city = null;
  }

  $("<div id='rates_dialog'></div>").appendTo("div#game_page");

  var panel_html = "<input id='show_hp' type='checkbox' class='css-checkbox' title='Show hit points' name='chHP' value='false' onclick='toggle_empire_show_hitpoints();'>"
  + "<label for='show_hp' name='show_hp_lbl' class='css-label dark-check-red'>HP</label>&ensp;"

  var dhtml = "<h2>Disburse taxes to:</h2>"
    + "<form name='rates'><table border='0' style='color: #ffffff;'>"
    + "<tr> <td>Treasury:</td>"
    + "<td> <div class='slider' id='slider-tax' tabIndex='1'></div></td>"
    + "<td><div id='tax_result' class='gold_text' style='float:left;'></div></td>"
    + "<td> <INPUT id='lock_gold' class='css-checkbox' TYPE='CHECKBOX' NAME='lock'>"
    + "<label for='lock_gold' name='lock_gold_lbl' class='css-label dark-check-orange'>Lock</label></td></tr>"

    + "<tr> <td>Luxury:</td><td><div class='slider' id='slider-lux' tabIndex='1'></div></td>"
    + "<td> <div id='lux_result' class='lux_text' style='float:left;'></div></td>"
    + "<td><INPUT id='lock_lux' class='css-checkbox' TYPE='CHECKBOX' NAME='lock'>"
    + "<label for='lock_lux' name='lock_lux_lbl' class='css-label dark-check-purple'>Lock</label></td></tr>"

    + "<tr><td>Science:</td><td><div class='sci_handle slider' id='slider-sci' tabIndex='1'></div></td>"
    + "<td><div id='sci_result' class='sci_text' style='float:left;'></div></td>"
    + "<td><INPUT id='lock_sci' class='css-checkbox' TYPE='CHECKBOX' NAME='lock'>"
    + "<label for='lock_sci' name='lock_sci_lbl' class='css-label dark-check-cyan'>Lock</label></td></tr>"
    + "</table></form>"

    + "<table style='margin:10px; text-align:right;'>"
    + "<tr><td>Net Income: </td><td><span class='gold_text' id='income_info'></span></td></tr>"
    + "<tr><td>Research:  </td> <td><span class='sci_text' id='bulbs_info'></span></td></tr>"
    + "<tr><td>Net Luxury:  </td> <td><span class='lux_text' id='lux_info'></span></td></tr>"
    + "</table>"
    
    + "<div id='max_tax_rate' style='text-align:center; margin:10px;'></div>"

  $(id).html(dhtml);

  $(id).attr("title", "Tax rates");
  $(id).dialog({
			bgiframe: true,
      modal: true,
      dialogClass: 'rate_slider',
      width: is_small_screen() ? "90%" : "40%",
			  buttons: {
        "Resolution (𝗥)" : function() {
          TAX_GRANULE = TAX_GRANULE == 10 ? 5 : 10;
          simpleStorage.set("txGrnl", TAX_GRANULE);
          set_resolution_button_title();
        },
				"Done (𝗪)" : function() {
          submit_player_rates();
          close_rates_dialog();
				}}
  });
  $(id).dialog('widget').keydown(tax_rate_key_listener);
  $(id).css("color", default_dialog_text_color);

  // Show and set title for resolution button, if applicable:
  if (!client_rules_flag[CRF_MP2_D]) {
    $("#rates_dialog").next().children().first().children().first().hide();
  } else {
    set_resolution_button_title();
    $("#rates_dialog").next().children().first().children().first().show();
  }

  update_rates_dialog();
  // Remove [X] to close, because it bypasses clean-up functions  
  $(".ui-dialog-titlebar-close").hide();
  freeze=true; // turn off updates to cities,empire,tech,map tabs

  rate_updater_interval = setInterval(rate_refresh, 500);
}
function set_resolution_button_title() {
  let new_increment = (TAX_GRANULE == 10 ? 5 : 10);

  $("#rates_dialog").next().children().first().children().first().html(
      ""+new_increment+"% Rates (𝗥)");

  $("#rates_dialog").next().children().first().children().first().prop('title', 
      "switch to "+new_increment+"% increments");

  $("#rates_dialog").next().children().first().children().first().blur();
}
function tax_rate_key_listener(ev)
{
    // Check if focus is in chat field, where these keyboard events are ignored.
    if ($('input:focus').length > 0 || !keyboard_input) return;
    if (C_S_RUNNING != client_state()) return;
    var keyboard_key = String.fromCharCode(ev.keyCode).toUpperCase();
    var key_code = ev.keyCode;
  
    switch (key_code) {
      case 13: //hit enter on 'Done'
        ev.stopPropagation();
        clearInterval(rate_updater_interval);
        rate_output_update=null;
        $("#rates_dialog").dialog('close');
        $("#rates_dialog").remove();
        break;
    }
    switch (keyboard_key) {
      case 'W':
        ev.stopPropagation();
        close_rates_dialog();
        $("#rates_dialog").remove();
        break;
      case 'R':
        ev.stopPropagation();
        TAX_GRANULE = TAX_GRANULE == 10 ? 5 : 10
        if (ev.shiftKey) TAX_GRANULE /= TAX_GRANULE; //remove after debug test
        simpleStorage.set("txGrnl", TAX_GRANULE);
        set_resolution_button_title();
    }
}

/**************************************************************************
  This is periodically called to submit and display rates, in order to 
  avoid laggy overload and unneeded server packet sending/receiving
**************************************************************************/
function rate_refresh()
{
  // only submit rates if they changed
  if (rates_changed) {
    rates_changed = false;
    submit_player_rates();
  }
  // this might be needed iff something else isn't updating for us, otherwise remove, needs a test <<<<<<<<<<<<<<<<<<<<<<<
  update_net_income();
  update_net_bulbs();
  if (!sliders_adjusted) {
    $("#slider-tax").children().next().next().css("background-image", "url('/images/slider_gold.png')");
    $("#slider-lux").children().next().next().css("background-image", "url('/images/slider_lux.png')");
    $("#slider-sci").children().next().next().css("background-image", "url('/images/slider_sci.png')");  
  }
}

/**************************************************************************
  ...
**************************************************************************/
function update_rates_dialog()
{
  if (client_is_observer() || client.conn.playing == null) return;

  maxrate = government_max_rate(client.conn.playing['government']);

  $("#slider-tax").html("<input class='slider-input' id='slider-tax-input' name='slider-tax-input'/>");
  $("#slider-lux").html("<input class='slider-input' id='slider-lux-input' name='slider-lux-input'/>");
  $("#slider-sci").html("<input class='slider-input' id='slider-sci-input' name='slider-sci-input'/>");

  create_rates_dialog(client.conn.playing['tax'],
                      client.conn.playing['luxury'],
                      client.conn.playing['science'], maxrate);

  var govt = governments[client.conn.playing['government']];

  $("#max_tax_rate").html("<i style='color:#a88'>" + govt['name'] + " max rate: &nbsp;</i>" + maxrate + "%");
  update_net_income();
  update_net_bulbs();
}

/**************************************************************************
  ...
**************************************************************************/
function update_net_income()
{
  var net_income = client.conn.playing['expected_income'];
  if (client.conn.playing['expected_income'] > 0) {
    net_income = "+" + client.conn.playing['expected_income'];
  }
  $("#income_info").html(net_income);
}

/**************************************************************************
  ...
**************************************************************************/
function update_net_bulbs(bulbs, lux)
{
  var cbo, lux;
  if (bulbs === undefined || lux === undefined) {
    var cbo = get_current_bulbs_output();
    bulbs = cbo.self_bulbs - cbo.self_upkeep;
    lux = cbo.self_luxury;
  }
  if (bulbs > 0) {
    bulbs = "+" + bulbs;
  }
  if (lux > 0) {
    lux = "+" + lux;
  }
  $("#bulbs_info").html(bulbs);
  $("#lux_info").html(lux)
}

/**************************************************************************
  ...
**************************************************************************/
function create_rates_dialog(tax, lux, sci, max)
{
  s_tax = new Slider(document.getElementById("slider-tax"),
                   document.getElementById("slider-tax-input"));
  s_tax.setValue(tax);
  s_tax.setMaximum(max);
  s_tax.setMinimum(0);
  s_tax.setBlockIncrement(TAX_GRANULE);
  s_tax.setUnitIncrement(TAX_GRANULE);
  s_tax.onchange = update_tax_rates;

  s_lux = new Slider(document.getElementById("slider-lux"),
                   document.getElementById("slider-lux-input"));
  s_lux.setValue(lux);
  s_lux.setMaximum(max);
  s_lux.setMinimum(0);
  s_lux.setBlockIncrement(TAX_GRANULE);
  s_lux.setUnitIncrement(TAX_GRANULE);
  s_lux.onchange = update_lux_rates;


  s_sci = new Slider(document.getElementById("slider-sci"),
                   document.getElementById("slider-sci-input"));
  s_sci.setValue(sci);
  s_sci.setMaximum(max);
  s_sci.setMinimum(0);
  s_sci.setBlockIncrement(TAX_GRANULE);
  s_sci.setUnitIncrement(TAX_GRANULE);
  s_sci.onchange = update_sci_rates;

  maxrate = max ;

  update_rates_labels();
}

/**************************************************************************
  ...
**************************************************************************/
function update_rates_labels ()
{
  tax = s_tax.getValue();
  lux = s_lux.getValue();
  sci = s_sci.getValue();

  $("#tax_result").html(tax + "%");
  $("#lux_result").html(lux + "%");
  $("#sci_result").html(sci + "%");
}

/**************************************************************************
  ...
**************************************************************************/
function update_tax_rates ()
{
  if (s_tax.getValue() % TAX_GRANULE != 0) s_tax.setValue(s_tax.getValue() - (s_tax.getValue() % TAX_GRANULE));
  if (s_lux.getValue() % TAX_GRANULE != 0) s_lux.setValue(s_lux.getValue() - (s_lux.getValue() % TAX_GRANULE));
  if (s_sci.getValue() % TAX_GRANULE != 0) s_sci.setValue(s_sci.getValue() - (s_sci.getValue() % TAX_GRANULE));

  var lock_lux = document.rates.lock[1].checked;
  var lock_sci = document.rates.lock[2].checked;

  tax = s_tax.getValue();
  lux = s_lux.getValue();
  sci = s_sci.getValue();

  if (tax + lux + sci  != 100 && lock_lux == false) {
    lux = Math.min(Math.max(100 - tax - sci, 0), maxrate);
  }
  if (tax + lux + sci  != 100 && lock_sci == false) {
    sci = Math.min(Math.max(100 - lux - tax, 0), maxrate);
  }

  if (tax + lux + sci  != 100) {
    s_tax.setValue(100 - lux - sci);
    return;
  }

  s_tax.setValue(tax);
  s_lux.setValue(lux);
  s_sci.setValue(sci);

  $("#tax_result").html(tax + "%");
  $("#lux_result").html(lux + "%");
  $("#sci_result").html(sci + "%");

  rates_changed=true;
  //submit_player_rates();
}

/**************************************************************************
  ...
**************************************************************************/
function update_lux_rates ()
{
  if (s_tax.getValue() % TAX_GRANULE != 0) s_tax.setValue(s_tax.getValue() - (s_tax.getValue() % TAX_GRANULE));
  if (s_lux.getValue() % TAX_GRANULE != 0) s_lux.setValue(s_lux.getValue() - (s_lux.getValue() % TAX_GRANULE));
  if (s_sci.getValue() % TAX_GRANULE != 0) s_sci.setValue(s_sci.getValue() - (s_sci.getValue() % TAX_GRANULE));

  var lock_tax = document.rates.lock[0].checked;
  var lock_sci = document.rates.lock[2].checked;

  tax = s_tax.getValue();
  lux = s_lux.getValue();
  sci = s_sci.getValue();

  if (tax + lux + sci  != 100 && lock_tax == false) {
    tax = Math.min(Math.max(100 - lux - sci, 0), maxrate);
  }
  if (tax + lux + sci  != 100 && lock_sci == false) {
    sci = Math.min(Math.max(100 - lux - tax, 0), maxrate);
  }

  if (tax + lux + sci  != 100) {
    s_lux.setValue(100 - tax - sci);
    return;
  }

  s_tax.setValue(tax);
  s_lux.setValue(lux);
  s_sci.setValue(sci);

  $("#tax_result").html(tax + "%");
  $("#lux_result").html(lux + "%");
  $("#sci_result").html(sci + "%");

  rates_changed=true;
  //submit_player_rates();
}

/**************************************************************************
  ...
**************************************************************************/
function update_sci_rates ()
{
  if (s_tax.getValue() % TAX_GRANULE != 0) s_tax.setValue(s_tax.getValue() - (s_tax.getValue() % TAX_GRANULE));
  if (s_lux.getValue() % TAX_GRANULE != 0) s_lux.setValue(s_lux.getValue() - (s_lux.getValue() % TAX_GRANULE));
  if (s_sci.getValue() % TAX_GRANULE != 0) s_sci.setValue(s_sci.getValue() - (s_sci.getValue() % TAX_GRANULE));

  var lock_tax = document.rates.lock[0].checked;
  var lock_lux = document.rates.lock[1].checked;

  tax = s_tax.getValue();
  lux = s_lux.getValue();
  sci = s_sci.getValue();

  if (tax + lux + sci  != 100 && lock_lux == false) {
    lux = Math.min(Math.max(100 - tax - sci, 0), maxrate);
  }
  if (tax + lux + sci  != 100 && lock_tax == false) {
    tax = Math.min(Math.max(100 - sci - lux, 0), maxrate);
  }

  if (tax + lux + sci  != 100) {
    s_sci.setValue(100 - lux - tax);
    return;
  }

  s_tax.setValue(tax);
  s_lux.setValue(lux);
  s_sci.setValue(sci);

  $("#tax_result").html(tax + "%");
  $("#lux_result").html(lux + "%");
  $("#sci_result").html(sci + "%");

  rates_changed=true;
  //submit_player_rates();
}

/**************************************************************************
  ...
**************************************************************************/
function close_rates_dialog()
{
  freeze=false;
  submit_player_rates();
  clearInterval(rate_updater_interval);
  rate_output_update=null;
  $("#rates_dialog").dialog('close');
}

/**************************************************************************
  ...
**************************************************************************/
function submit_player_rates()
{
  if (tax >= 0 && tax <= 100 && lux >= 0 && lux <= 100 && sci >= 0 && sci <= 100) {
    var packet = {"pid" : packet_player_rates,
                  "tax" : tax, "luxury" : lux, "science" : sci };
    send_request(JSON.stringify(packet));
  } else {
    swal("Invalid tax rate values");
    setSwalTheme();
  }
}
