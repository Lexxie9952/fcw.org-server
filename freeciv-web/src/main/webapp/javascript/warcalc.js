/**********************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2009-2015  The Freeciv-web project. GNU Affero GPL.
***********************************************************************/
var my_hp  = "";
var my_str = "";
var my_fp  = 1;
var their_hp = "";
var their_str= "";
var their_fp = 1;

/**************************************************************************
 Updates the Warcalc tab when clicked. 
**************************************************************************/
function warcalc_screen()
{
  $('#warcalc_scroll').css("width", "auto");
  //$("#wc_done_btn").hide();
  $("#warcalc_tab").show();
  $("#warcalc_tab").children().show();

  warcalc_set_default_vals();

    //strength
    $("#id_astr").val(my_str);
    $("#id_dstr").val(their_str);
    //hitpoints
    $("#id_ahp").val(my_hp);
    $("#id_dhp").val(their_hp);
    //firepower 
    $("#id_afp").val(my_fp);
    $("#id_dfp").val(their_fp);
    //results
    $("#att_win").html("");
    $("#def_win").html("");
    //set focus on first field
  
    setTimeout(function(){$("#id_astr").focus();$("#id_astr").select()},200);
}
/**************************************************************************
  Called when a unit is clicked to guess default values
*************************************************************************/
function warcalc_set_default_vals()
{
  if (current_focus.length<1) return;

  var punit = current_focus[0];
  var ptype = unit_types[punit['type']];

  // Get veteran power factor for punit
  var power_fact = 100;

  // assume a clicked player unit is being considered for an attacker
  if (punit['owner'] == client.conn.playing.playerno) {
    if (punit['veteran']) {
      if (ptype['veteran_levels'] > 0) {
        power_fact = ptype['power_fact'][punit['veteran']];
      } else {
        power_fact = game_rules['power_fact'][punit['veteran']];
      }
    }
    my_hp  = punit['hp'];
    my_str = ptype['attack_strength'];
    my_fp  = ptype['firepower'];

    my_str *= (power_fact/100);
    if (my_str-Math.trunc(my_str))
    my_str = trim_decimals(my_str);
  }
  // assume a clicked non-player unit is being considered for a defender
  else {
    power_fact = warcalc_get_defense_bonus(punit);
    their_hp  = punit['hp'];
    their_str = ptype['defense_strength'];;
    their_fp  = ptype['firepower'];

    their_str *= (power_fact/100);
    their_str = trim_decimals(their_str);
  }  
}
function trim_decimals(value)
{
  return Math.round(parseFloat(value) * 100) / 100;
}

/**************************************************************************
  Computes BASIC bonuses for defending units who don't know their 
  attacker. That is: veteran, terrain, river.
  NOT: Bases, City walls, Coastal Defense, Bonus against mounted, etc.
  Value returned for bonus comes back x100 -- i.e., 1.5x=150
*************************************************************************/
function warcalc_get_defense_bonus(punit)
{ 
  var power_fact = 100;
  if (punit['veteran']) {
    var ptype = unit_types[punit['type']];
    if (ptype['veteran_levels'] > 0) {
      power_fact = ptype['power_fact'][punit['veteran']];
    } else {
      power_fact = game_rules['power_fact'][punit['veteran']];
    }
  }
  if (unit_has_class_flag(punit, UCF_TERRAIN_DEFENSE)) {
    var ptile = tiles[punit['tile']];
    const terrain = terrains[ptile['terrain']];
    power_fact *= (1+terrain['defense_bonus']/100);
    if (tile_has_extra(ptile, EXTRA_RIVER))
      power_fact *= (1+extras[EXTRA_RIVER]['defense_bonus']/100);
  }
  if (punit['activity']==ACTIVITY_FORTIFIED) {
    if (!tile_city(ptile)) { // Units in a city get city bonus not fortify bonus
      power_fact *= 1.5;  
    }
  }
  return power_fact;
}

/**************************************************************************
  Compute warcalc odds when calculate button is pushed
*************************************************************************/
function warcalc_compute()
{
  //strength
  var att = $("#id_astr").val();
  var def = $("#id_dstr").val();
  //hitpoints
  var ahp = $("#id_ahp").val();
  var dhp = $("#id_dhp").val();
  //firepower 
  var afp = $("#id_afp").val();
  var dfp = $("#id_dfp").val();

  var prob = 100 * warcalc_win_chance(att,ahp,afp,def,dhp,dfp);
  $("#att_win").html("<br>Attacker has a <b style='font-size:115%'>"+prob.toFixed(2)+"%</b> chance to win.");
  $("#def_win").html("Defender has a "+(100-prob).toFixed(2)+"% chance to win.");
  $("#wc_done_btn").show();
  expected_hitpoints(att,ahp,afp,def,dhp,dfp);
}
/**************************************************************************
  The FORMULAS
*************************************************************************/
function warcalc_win_chance(as,ahp,afp,ds,dhp,dfp) {
  var as = parseFloat(as);   var ds = parseFloat(ds);
  var ahp = parseFloat(ahp); var dhp = parseFloat(dhp);
  var afp = parseFloat(afp); var dfp = parseFloat(dfp);
  var att_N_lose = Math.trunc( (ahp + dfp - 1) / dfp );
  var def_N_lose = Math.trunc( (dhp + afp - 1) / afp );
  var att_P_lose1 = (as + ds == 0) ? 0.5 : ds / (as + ds);
  var def_P_lose1 = 1 - att_P_lose1;
  var binom_save = Math.pow(def_P_lose1, (def_N_lose - 1));
  var accum_prob = binom_save; /* lr = 0 */
  /* lr - the number of Lost Rounds by the attacker */
  for (let lr = 1; lr < att_N_lose; lr++) {
    var n = lr + def_N_lose - 1;
    binom_save *= n;
    binom_save /= lr;
    binom_save *= att_P_lose1;
    accum_prob += binom_save;
  }
  accum_prob *= def_P_lose1;
  return accum_prob;
}
function expected_hitpoints(att,ahp,afp,def,dhp,dfp) {
  var att = parseFloat(att);   var def = parseFloat(def);
  var ahp = parseFloat(ahp);   var dhp = parseFloat(dhp);
  var afp = parseFloat(afp);   var dfp = parseFloat(dfp);
  var p = att / (att + def);
  //console.log("Attacker will do "+p*afp+" damage each turn.")
  //console.log("Defender will do "+(1-p)*dfp+" damage each turn.")
  for (i=0; i<60; i++) {
    //console.log(ahp.toFixed(2)+" - "+dhp.toFixed(2));
    dhp -= ((p)*afp);
    ahp -= ((1-p)*dfp);
    if (ahp<1 || dhp<1) break;
  }
  if (ahp<1 && dhp<1) { } // optional TO DO: nicer text for 50/50 death 
  else {
    if (ahp<1) ahp="<b>DEAD</b>";
    if (dhp<1) dhp="<b>DEAD</b>";
  }
  if (ahp>0) ahp = "<b>"+ahp.toFixed(2)+"</b> hp"
  if (dhp>0) dhp = "<b>"+dhp.toFixed(2)+"</b> hp"

  $("#exp_hp").html("<br><br>Attacker: "+ahp+"<br>Defender: "+dhp);
}
/**************************************************************************
  User adjustments for clicking bonus buttons
*************************************************************************/
function wc_A(mult) {
  var base = $("#id_astr").val();
  base *= mult;
  base = trim_decimals(base);
  $("#id_astr").val(base);
}
function wc_D(mult) {
  var base = $("#id_dstr").val();
  base *= mult;
  base = trim_decimals(base);
  $("#id_dstr").val(base);
}
/**************************************************************************
  Clean up and leave
*************************************************************************/
function warcalc_done() {
  $("#ui-ui-8").hide();
  set_default_mapview_active();
  $("#map_tab").click();
}
