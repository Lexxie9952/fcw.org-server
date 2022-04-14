var console_filters = {
'combat':     true,
'actions':    true,
'sentry':     true,
'governor':   true,
'tech':       true,
'diplomacy':  true,
'cityprod':   true,
'citywarn':   true,
'chat':       true,
'setting':    true
};


function console_filter_radio_clicked(which_btn)
{
  if (which_btn)
    console_filters[which_btn] = !console_filters[which_btn];
  
    if (console_filters['combat']) {
    $("li.e_unit_win_att").show();
    $("li.e_unit_win_def").show();
    $("li.e_unit_lost_att").show();
    $("li.e_unit_lost_def").show();
    $("li.e_unit_escaped").show();
    $("li.e_unit_became_vet").show();
  } else {
    $("li.e_unit_win_att").hide();
    $("li.e_unit_win_def").hide();
    $("li.e_unit_lost_att").hide();
    $("li.e_unit_lost_def").hide();
    $("li.e_unit_escaped").hide();
    $("li.e_unit_became_vet").hide();
  }
  if (console_filters['sentry'])
    $("li.e_unit_sentry_wake").show();
  else 
    $("li.e_unit_sentry_wake").hide();
  if (console_filters['actions']) {
    $("li.e_unit_relocated").show();
    $("li.e_unit_did_expel").show();
    $("li.e_unit_action_failed").show();
    $("li.e_my_unit_did_heal").show();
    $("li.e_my_unit_was_healed").show();
    $("li.e_unit_was_expelled").show();
    $("li.e_unit_orders").show();
    $("li.e_unit_upgraded").show();
    $("li.e_unit_illegal_action").show();
    $("li.e_unit_lost_misc").show();
  } else {
    $("li.e_unit_relocated").hide();
    $("li.e_unit_did_expel").hide();
    $("li.e_unit_action_failed").hide();
    $("li.e_my_unit_did_heal").hide();
    $("li.e_my_unit_was_healed").hide();
    $("li.e_unit_was_expelled").hide();
    $("li.e_unit_orders").hide();
    $("li.e_unit_upgraded").hide();
    $("li.e_unit_illegal_action").hide();
    $("li.e_unit_lost_misc").hide();
  }
  if (console_filters['governor']) {
    $("li.e_city_cma_release").show();
  } else {
    $("li.e_city_cma_release").hide();
  }
  if (console_filters['diplomacy']) {
    $("li.e_revolt_done").show();
    $("li.e_revolt_start").show();
    $("li.e_spaceship").show();
    $("li.e_new_government").show();
    $("li.e_uprising").show();
    $("li.e_anarchy").show();
    $("li.e_embassy_was_expelled").show();
    $("li.e_embassy_did_expel").show();
    $("li.e_wonder_started").show();
    $("li.e_wonder_stopped").show();
    $("li.e_wonder_will_be_built").show();
    $("li.e_first_contact").show();
    $("li.e_diplomacy").show();
    $("li.e_enemy_diplomat_failed").show();
    $("li.e_my_diplomat_poison").show();
    $("li.e_my_spy_steal_map").show();
    $("li.e_my_diplomat_escape").show();
    $("li.e_my_diplomat_bribe").show();
    $("li.e_my_spy_steal_gold").show();
    $("li.e_my_diplomat_incite").show();
    $("li.e_my_diplomat_embassy").show();
    $("li.e_my_diplomat_sabotage").show();
    $("li.e_my_diplomat_theft").show();
    $("li.e_my_diplomat_failed").show();
    $("li.e_enemy_diplomat_poison").show();
    $("li.e_enemy_spy_nuke").show();
    $("li.e_enemy_diplomat_bribe").show();
    $("li.e_enemy_diplomat_embassy").show();
    $("li.e_enemy_diplomat_incite").show();
    $("li.e_enemy_diplomat_poison").show();
    $("li.e_enemy_diplomat_sabotage").show();
    $("li.e_enemy_diplomat_theft").show();
    $("li.e_enemy_spy_steal_map").show();
    $("li.e_treaty_shared_vision").show();
    $("li.e_treaty_alliance").show();
    $("li.e_treaty_peace").show();
    $("li.e_treaty_ceasefire").show();
    $("li.e_treaty_embassy").show();
    $("li.e_diplomatic_incident").show();
    $("li.e_treaty_broken").show();
    $("li.e_civil_war").show();
    $("li.e_city_transfer").show();
  }
  else {
    $("li.e_revolt_done").hide();
    $("li.e_revolt_start").hide();
    $("li.e_spaceship").hide();
    $("li.e_new_government").hide();
    $("li.e_uprising").hide();
    $("li.e_anarchy").hide();
    $("li.e_embassy_was_expelled").hide();
    $("li.e_embassy_did_expel").hide();
    $("li.e_wonder_started").hide();
    $("li.e_wonder_stopped").hide();
    $("li.e_wonder_will_be_built").hide();
    $("li.e_first_contact").hide();
    $("li.e_diplomacy").hide();
    $("li.e_enemy_diplomat_failed").hide();
    $("li.e_my_diplomat_poison").hide();
    $("li.e_my_spy_steal_map").hide();
    $("li.e_my_diplomat_escape").hide();
    $("li.e_my_diplomat_bribe").hide();
    $("li.e_my_spy_steal_gold").hide();
    $("li.e_my_diplomat_incite").hide();
    $("li.e_my_diplomat_embassy").hide();
    $("li.e_my_diplomat_sabotage").hide();
    $("li.e_my_diplomat_theft").hide();
    $("li.e_my_diplomat_failed").hide();
    $("li.e_enemy_diplomat_poison").hide();
    $("li.e_enemy_spy_nuke").hide();
    $("li.e_enemy_diplomat_bribe").hide();
    $("li.e_enemy_diplomat_embassy").hide();        
    $("li.e_enemy_diplomat_incite").hide();
    $("li.e_enemy_diplomat_poison").hide();
    $("li.e_enemy_diplomat_sabotage").hide();
    $("li.e_enemy_diplomat_theft").hide();
    $("li.e_enemy_spy_steal_map").hide();        
    $("li.e_treaty_shared_vision").hide();
    $("li.e_treaty_alliance").hide();
    $("li.e_treaty_peace").hide();
    $("li.e_treaty_ceasefire").hide();
    $("li.e_treaty_embassy").hide();        
    $("li.e_diplomatic_incident").hide();        
    $("li.e_treaty_broken").hide();
    $("li.e_civil_war").hide();              
    $("li.e_city_transfer").hide();              
  }
  if (console_filters['cityprod']) {
    $("li.e_imp_build").show();
    $("li.e_unit_built").show();
    $("li.e_imp_sold").show();
    $("li.e_imp_buy").show();
    $("li.e_unit_buy").show();
    $("li.e_unit_built_pop_cost").show();
    $("li.e_city_build").show();
    $("li.e_city_production_changed").show();
  } else {
    $("li.e_imp_build").hide();
    $("li.e_unit_built").hide();
    $("li.e_imp_sold").hide();
    $("li.e_imp_buy").hide();
    $("li.e_unit_buy").hide();
    $("li.e_unit_built_pop_cost").hide();
    $("li.e_city_build").hide();
    $("li.e_city_production_changed").hide();
  }
  if (console_filters['citywarn']) {
    $("li.e_disaster").show();
    $("li.e_city_plague").show();
    $("li.e_city_lost").show();
    $("li.e_city_disorder").show();
    $("li.e_city_famine").show();
    $("li.e_city_famine_feared").show();
    $("li.e_city_love").show();
    $("li.e_city_growth").show();
    $("li.e_city_may_soon_grow").show();
    $("li.e_city_aqueduct").show();
    $("li.e_city_aq_building").show();
    $("li.e_city_normal").show();
    $("li.e_city_gran_throttle").show();
  } else {
    $("li.e_disaster").hide();
    $("li.e_city_plague").hide();
    $("li.e_city_lost").hide();
    $("li.e_city_disorder").hide();
    $("li.e_city_famine").hide();
    $("li.e_city_famine_feared").hide();
    $("li.e_city_love").hide();
    $("li.e_city_growth").hide();
    $("li.e_city_may_soon_grow").hide();
    $("li.e_city_aqueduct").hide();
    $("li.e_city_aq_building").hide();
    $("li.e_city_normal").hide();
    $("li.e_city_gran_throttle").hide();
  }
  if (console_filters['tech']) {
    $("li.e_hut_tech").show();
    $("li.e_tech_gain").show();
    $("li.e_tech_learned").show();
    $("li.e_tech_lost").show();
    $("li.e_tech_embassy").show();
    $("li.e_tech_goal").show();
  } else {
    $("li.e_hut_tech").hide();
    $("li.e_tech_gain").hide();
    $("li.e_tech_learned").hide();
    $("li.e_tech_lost").hide();
    $("li.e_tech_embassy").hide();
    $("li.e_tech_goal").hide();
  }  
  if (console_filters['chat']) {
    $("li.e_chat_error").show();
    $("li.e_chat_msg").show();
    $("li.e_chat_msg_public").show();
    $("li.e_chat_msg_private_sent").show();
    $("li.e_chat_msg_private_rcvd").show();
    $("li.e_chat_msg_ally").show();
    $("li.cht_prv_sndr").show();
    $("li.cht_ally_sndr").show();
    $("li.cht_you").show();
  } else {
    $("li.e_chat_error").hide();
    $("li.e_chat_msg").hide();
    $("li.e_chat_msg_public").hide();
    $("li.e_chat_msg_private_sent").hide();
    $("li.e_chat_msg_private_rcvd").hide();
    $("li.e_chat_msg_ally").hide();
    $("li.cht_prv_sndr").hide();
    $("li.cht_ally_sndr").hide();
    $("li.cht_you").hide();
  }
  if (console_filters['setting']) {
    $("li.e_setting").show();
    $("li.e_connection").show();
  } else {
    $("li.e_setting").hide();
    $("li.e_connection").hide();
  }
}


function console_filters_set(action)
{
  if (action==='flip') {
    for (key in console_filters) {
      console_filters[key] = !console_filters[key]
    }
  }
  else {
    for (key in console_filters) {
      console_filters[key] = action;
    }
  }
  console_filter_radio_clicked();
  console_filter_dialog();
}


function console_filter_dialog()
{
  var i;

  var rid     = "console_class_filter";
  var id      = "#" + rid;
  var dhtml   = "";

  /* Reset dialog page. */
  remove_active_dialog(id);
  $("<div id='" + rid + "'></div>").appendTo("div#game_page");

  dhtml += "Apply filters to existing messages:<br><br>";
  
  dhtml += "<input type='checkbox' class='css-checkbox' id='f_combat' value='false' onclick='console_filter_radio_clicked(\"combat\");'>"
  + "<label for='f_combat' title='' class='css-label dark-check-blue'><span class='e_unit_win_att'>Unit Combat</span></label><br>";

  dhtml += "<input type='checkbox' class='css-checkbox' id='f_actions' value='false' onclick='console_filter_radio_clicked(\"actions\");'>"
  + "<label for='f_actions' title='' class='css-label dark-check-blue'><span class='e_unit_win_att'>Unit Activity</span></label><br>";

  dhtml += "<input type='checkbox' class='css-checkbox' id='f_sentry' name='cbSS' value='false' onclick='console_filter_radio_clicked(\"sentry\");'>"
  + "<label for='f_sentry' name='lblSS' title='' class='css-label dark-check-blue'><span class='e_unit_sentry_wake' style='font-size:100%'>Sentry Reports</span></label><br>";

  dhtml += "<input type='checkbox' class='css-checkbox' id='f_governor' value='false' onclick='console_filter_radio_clicked(\"governor\");'>"
  + "<label for='f_governor' title='' class='css-label dark-check-blue'><span class='e_city_cma_release'>City Governor</span></label><br>";

  dhtml += "<input type='checkbox' class='css-checkbox' id='f_tech' value='false' onclick='console_filter_radio_clicked(\"tech\");'>"
  + "<label for='f_tech' title='' class='css-label dark-check-cyan'><span class='e_tech_gain'>Technology</span></label><br>";
  
  dhtml += "<input type='checkbox' class='css-checkbox' id='f_diplomacy' value='false' onclick='console_filter_radio_clicked(\"diplomacy\");'>"
  + "<label for='f_diplomacy' title='' class='css-label dark-check-green'><span class='e_diplomacy'>Diplomatic Events</span></label><br>";
  
  dhtml += "<input type='checkbox' class='css-checkbox' id='f_cityprod' value='false' onclick='console_filter_radio_clicked(\"cityprod\");'>"
  + "<label for='f_cityprod' title='' class='css-label dark-check-yellow'><span class='e_unit_buy'>City Production</span></label><br>";
    
  dhtml += "<input type='checkbox' class='css-checkbox' id='f_citywarn' value='false' onclick='console_filter_radio_clicked(\"citywarn\");'>"
  + "<label for='f_citywarn' title='' class='css-label dark-check-red'><span class='e_city_famine'>City Warnings</span></label><br>";

  dhtml += "<input type='checkbox' class='css-checkbox' id='f_chat' value='false' onclick='console_filter_radio_clicked(\"chat\");'>"
  + "<label for='f_chat' title='' class='css-label dark-check-orange'><span class='e_chat_msg_private_sent'>Chat</span></label><br>";

  dhtml += "<input type='checkbox' class='css-checkbox' id='f_setting' value='false' onclick='console_filter_radio_clicked(\"setting\");'>"
  + "<label for='f_setting' title='' class='css-label dark-check-white'><span class='e_setting'>Player Delegation & System Events</span></label><br><br>";
  
  $(id).html(dhtml);
  $("#f_combat").prop("checked", console_filters['combat']);
  $("#f_actions").prop("checked", console_filters['actions']);
  $("#f_sentry").prop("checked", console_filters['sentry']);
  $("#f_tech").prop("checked", console_filters['tech']);
  $("#f_governor").prop("checked", console_filters['governor']);
  $("#f_diplomacy").prop("checked", console_filters['diplomacy']);
  $("#f_cityprod").prop("checked", console_filters['cityprod']);
  $("#f_citywarn").prop("checked", console_filters['citywarn']);
  $("#f_chat").prop("checked", console_filters['chat']);
  $("#f_setting").prop("checked", console_filters['setting']);

  var buttons = { 'Set All': function() {console_filters_set(true);},
                  'Clear': function() {console_filters_set(false);},
                  'Flip':function() {console_filters_set('flip');},
                  'Apply':    function() {console_filter_radio_clicked(); remove_active_dialog(id);}
                };

  $(id).dialog({
      title    : "Filter console messages",
      bgiframe : true,
      modal    : false,
      width    : "400px",
      buttons  : buttons });

  $(id).dialog('open');
 // $(".ui-widget-overlay.ui-front").remove(); // don't put dark overlay fade over rest of screen
  $(id).css("background","url(/images/bg-dark50.png)");
  $(id).next().css("text-align", "center");
  $(id).dialog('widget').position({my:"center top", at:"center top", of:window})
  dialog_register(id);
}
