/**********************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2009-2015  The Freeciv-web project. GNU Affero GPL.
***********************************************************************/
var my_hp  = "";
var my_str = "";
var my_fp  = 1;
var my_uid = null;
var their_hp = "";
var their_str= "";
var their_fp = 1;
var their_uid = null;
const WARCALC_ATTACKING = 0;
const WARCALC_DEFENDING = 1;
var warcalc_role_mode = WARCALC_ATTACKING;

/**************************************************************************
 Updates the Warcalc tab when clicked.
**************************************************************************/
function warcalc_screen()
{
  $('#warcalc_scroll').css("width", "auto");
  //$("#wc_done_btn").hide();
  $("#warcalc_tab").show();
  $("#warcalc_tab").children().show();

  warcalc_reset_roles();

  // If there is a current_focus unit, replace with values from this one:
  if (current_focus && current_focus.length>0)
    warcalc_set_default_vals(current_focus[0]);

  //strength
  $("#id_astr").val(my_str);
  $("#id_dstr").val(their_str);
  //hitpoints
  $("#id_ahp").val(my_hp);
  $("#id_dhp").val(their_hp);
  //firepower
  $("#id_afp").val(my_fp);
  $("#id_dfp").val(their_fp);
  //clear prior results
  $("#att_win").html("");
  $("#def_win").html("");
  $("#exp_hp").html("");

  //set focus on first field
  setTimeout(function(){$("#id_astr").focus();$("#id_astr").select()},200);
  warcalc_update_titles();
}
/**************************************************************************
  When new warcalc sessions are requested, we have to reset roles so that
  proper attack strength and defense strength show.
*************************************************************************/
function warcalc_reset_roles()
{ // Reset default role mode in case it was previously changed.
  if (warcalc_role_mode != WARCALC_ATTACKING) {
    warcalc_role_mode = WARCALC_ATTACKING;
    // With a role change of att/def comes a change in strength, so recompute:
    if (my_uid && units[my_uid])
      warcalc_set_default_vals(units[my_uid]);
    if (their_uid && units[their_uid])
      warcalc_set_default_vals(units[their_uid]);
  }
}
/**************************************************************************
  Update labels
*************************************************************************/
function warcalc_update_titles()
{
  if (!my_uid || !their_uid || !units[my_uid] || !units[their_uid])
    return;

  if (warcalc_role_mode == WARCALC_ATTACKING) { //default, we are attacker
    $("#wcamsg").prop("title", "Your "+unit_types[units[my_uid]['type']]['name']+" is set as attacker.\n\nOnly Veteran bonus is auto-calculated");
    $("#wcamsg").html("A:&#11088;"+unit_types[units[my_uid]['type']]['name']);

    $("#wcdmsg").prop("title", "Foreign "+unit_types[units[their_uid]['type']]['name']+" is set as defender.\n\nOnly Veteran, Terrain, and Fortify bonuses are included.");
    $("#wcdmsg").html("D:"+unit_types[units[their_uid]['type']]['name']);
  }
  else if (warcalc_role_mode == WARCALC_DEFENDING) {// swapped role
    $("#wcamsg").prop("title", "Foreign "+unit_types[units[their_uid]['type']]['name']+" is set as attacker.\n\nOnly Veteran bonus is auto-calculated");
    $("#wcamsg").html("A:"+unit_types[units[their_uid]['type']]['name']);

    $("#wcdmsg").prop("title", "Your "+unit_types[units[my_uid]['type']]['name']+" is set as defender.\n\nOnly Veteran, Terrain, and Fortify bonuses are included.");
    $("#wcdmsg").html("D:&#11088;"+unit_types[units[my_uid]['type']]['name']);
  }
}

/**************************************************************************
  Flip who is attacker and defender
*************************************************************************/
function warcalc_swap_roles()
{
   if (!my_uid || !their_uid) return; // need two real units to swap
   // Def. strength is existentially dependent on a real unit on a
   // real tile with terrain bonus, fortify state, etc.; other things
   // depend on it being real too, so abort if there aren't 2 real units:
   if ( !(units[my_uid] && units[their_uid]) ) return;

   warcalc_role_mode = 1 - warcalc_role_mode; // swap roles of att/def

  if (warcalc_compute_role_strength(my_uid, their_uid)) {
    warcalc_update_titles();
  }
}
/**************************************************************************
  Ask server to factor all bonuses.
*************************************************************************/
function warcalc_request_server()
{
  if (!my_uid || !their_uid) return; // need two real units to swap
  // Def. strength is existentially dependent on a real unit on a
  // real tile with terrain bonus, fortify state, etc.; other things
  // depend on it being real too, so abort if there aren't 2 real units:
  if ( !(units[my_uid] && units[their_uid]) ) return;

  var packet = {
      "pid"         : packet_warcalc_req,
      "attacker_id" : (warcalc_role_mode == WARCALC_ATTACKING ? my_uid : their_uid),
      "defender_id" : (warcalc_role_mode == WARCALC_ATTACKING ? their_uid : my_uid)
    }

  console.log(packet);

  send_request(JSON.stringify(packet));
}

/**************************************************************************
  Flipping attacker and defender may result in different bonuses
  Returns false if there was an invalid unit / dead unit
*************************************************************************/
function warcalc_compute_role_strength(my_uid, their_uid)
{
  var punit;
  var ptype;
  var power_fact = 100;

  if ( !(my_uid && their_uid && units[their_uid] && units[my_uid]) )
    return false;

  if (warcalc_role_mode == WARCALC_ATTACKING)
  { // This is the default role, just refresh all inputs:
    warcalc_set_default_vals(units[my_uid]);
    warcalc_set_default_vals(units[their_uid]);
    //strength
    $("#id_astr").val(my_str);
    $("#id_dstr").val(their_str);
    //hitpoints
    $("#id_ahp").val(my_hp);
    $("#id_dhp").val(their_hp);
    //firepower
    $("#id_afp").val(my_fp);
    $("#id_dfp").val(their_fp);
    //clear prior results
    $("#att_win").html("");
    $("#def_win").html("");
    $("#exp_hp").html("");     // reset prior results
  }
  else if (warcalc_role_mode == WARCALC_DEFENDING)
  { // Non-default mode. We are defender and they are attacker. Compute.
    // SET UP "THEIR UNIT" AS ATTACKER
    punit = units[their_uid];

    ptype = unit_types[punit['type']];

    if (punit['veteran']) {
      if (ptype['veteran_levels'] > 0) {
        power_fact = ptype['power_fact'][punit['veteran']];
      } else {
        power_fact = game_rules['power_fact'][punit['veteran']];
      }
    }
    their_hp  = punit['hp'];
    their_fp  = ptype['firepower'];
    their_str = utype_real_base_attack_strength(ptype);
    their_str *= (power_fact/100);
    if (their_str-Math.trunc(their_str))
    their_str = trim_decimals(their_str);

    // SET UP "MY UNIT" AS DEFENDER
    if (units[my_uid])
      punit = units[my_uid];
    else return false;
    ptype = unit_types[punit['type']];
    power_fact = warcalc_get_defense_bonus(punit);
    my_hp  = punit['hp'];
    my_str = utype_real_base_defense_strength(ptype);
    my_fp  = ptype['firepower'];

    my_str *= (power_fact/100);
    my_str = trim_decimals(my_str);
    // Fill the input fields with opposite values from usual now:
    //strength
    $("#id_dstr").val(my_str);
    $("#id_astr").val(their_str);
    //hitpoints
    $("#id_dhp").val(my_hp);
    $("#id_ahp").val(their_hp);
    //firepower
    $("#id_dfp").val(my_fp);
    $("#id_afp").val(their_fp);
    //clear results
    $("#att_win").html("");
    $("#def_win").html("");
    $("#exp_hp").html("");     // reset prior results

  }
  return true;
}

/**************************************************************************
  Called when a unit is clicked to guess default values
*************************************************************************/
function warcalc_set_default_vals(punit)
{
  var ptype = unit_types[punit['type']];

  // Get veteran power factor for punit
  var power_fact = 100;

  // Assume a clicked player unit is being considered for an attacker
  if (!client_is_observer() && punit['owner'] == client.conn.playing.playerno) {
    if (punit['veteran']) {
      if (ptype['veteran_levels'] > 0) {
        power_fact = ptype['power_fact'][punit['veteran']];
      } else {
        power_fact = game_rules['power_fact'][punit['veteran']];
      }
    }
    my_hp  = punit['hp'];
    // accounts for wrong hard-coded assumption that v0 is always power_fact=100:
    my_str = (power_fact == 100) ? utype_real_base_attack_strength(ptype) : utype_attack_power(ptype);
    my_fp  = ptype['firepower'];
    my_uid = punit['id'];

    my_str *= (power_fact/100);
    if (my_str-Math.trunc(my_str))
    my_str = trim_decimals(my_str);
  }
  // Assume a clicked non-player unit is being considered for a defender
  else {
    power_fact = warcalc_get_defense_bonus(punit);
    their_hp  = punit['hp'];
    their_str = (power_fact == 100) ? utype_real_base_defense_strength(ptype) : utype_defense_power(ptype);
    their_fp  = ptype['firepower'];
    their_uid = punit['id'];

    their_str *= (power_fact/100);
    their_str = trim_decimals(their_str);
  }
}
function trim_decimals(value)
{
  if (value<1) return value; // Math.round(parseFloat(value) * 1000) / 1000;
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
    var terrain_fact = (1+terrain['defense_bonus']/100);

    if (tile_has_river(ptile)) {
      if (client_rules_flag[CRF_MP2_C]) terrain_fact += 0.50; // +0.5 river defense for rivers
      else terrain_fact *= (1+extras[EXTRA_RIVER]['defense_bonus']/100);
    }

    power_fact *= terrain_fact;
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
  /* Global var is set true if we are calling this immediately after
     receiving a reply from server. ver_color differentiates server-
     authenticated data to help verify the result */
  var ver_color = warcalc_server_reply ? "; color:#9d9" : "";
  warcalc_server_reply = false;

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
  $("#att_win").html("<br>Attacker has a <b style='font-size:115%"+ver_color+"'>"+prob.toFixed(2)+"%</b> chance to win.");
  $("#def_win").html("Defender has a "+(100-prob).toFixed(2)+"% chance to win.");
  $("#wc_done_btn").show();
  expected_hitpoints(att,ahp,afp,def,dhp,dfp);
}
/**************************************************************************
  The FORMULAS
*************************************************************************/
/* these functions can be used for extreme edge cases like high FP or
   any situation where it only takes 1 or 2 hits to kill, where it is
   greatly more accurate i.e., not completely inaccurate like the other
   estimate. So they're here in commented code for now. The case of only
   1 hit needed is a lot simpler and hard coded in one line and that's
   all we're using for now
function factorial(a) {
  return a*(a>1)?factorial(a-1):1;
}
function binomial_coeff (n, k)  {
  return factorial(n)/(factorial(k)*factorial(n-k));
}
function P_X_is_x(x, N, p)  {
  return binomial_coeff(N,x)*Math.pow(p,x)*Math.pow(1-p,N-x);
}
function P_X_is_ge_x (x, N, p) {
   return P_X_is_x(x,N,p)+(x<N)?P_X_is_ge_x(x+1,N,p):0;
}
*/
function warcalc_win_chance(as,ahp,afp,ds,dhp,dfp) {
  var as = parseFloat(as);   var ds = parseFloat(ds);
  var ahp = parseFloat(ahp); var dhp = parseFloat(dhp);
  var afp = parseFloat(afp); var dfp = parseFloat(dfp);

  // Special case: attacker firepower wins in one hit, needs
  // different formula to be accurate:
  if (afp >= dhp) {
    //console.log("using as="+as);
    return 1 - Math.pow( ds/(as+ds),ahp); // 1 minus "the chance defender hits every time"
    // since it's only 1 hit we don't need the below, which we could use
    // for cases with 1-3 hits to be more accurate, IF we could find the tiny bug
    // in the formula, which I'm 99% sure was we didn't do ParseFloat since that made
    // the formula above also not work until we put it underneath.
    //return P_X_is_ge_x (1, ahp, as/(as+ds))
  }

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

/**************************************************************************
  Optional function for those wanting ruleset specific hard-coded helptext
   in their warcalc. May be modified as desired or deleted if unwanted.
*************************************************************************/
function warcalc_set_tooltips()
{
  $(".tiny_button").show(); // Player may have changed ruleset, start with all buttons showing
  //$(".tiny_button").tooltip({
  //  show: { delay:360, effect:"none", duration: 0 }, hide: {delay:50, effect:"none", duration: 0}
  //});
  $(".tt").tooltip({ tooltipClass: "tt_slim", show: { delay:360, effect:"none", duration: 0 },
                      hide: {delay:0, effect:"none", duration: 0} });

  $(".wcttmsg").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "400px");}});
  $(".wcttmsg").tooltip({
    show: { delay:80, effect:"none", duration: 0 }, hide: {delay:0, effect:"none", duration: 0}
  });
  $(".wcttmsg").css("cursor","help");
  const bl = "* ";    // bullet
  const nbl = "\n* ";

  // Wider tool tips for attaker / defender label info:
  $("#wcamsg").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "450px");}});
  $("#wcdmsg").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "450px");}});

  if ( ruleset_control['name'].startsWith("MP2")  // from MP2 Brava onward all MP2 rules start with "MP2"
   || ruleset_control['name'].startsWith("Avant-garde")
   || ruleset_control['name']=="Multiplayer-Evolution ruleset" ) {
        if (is_small_screen()) {
          $('#wcth1').hide(); $('#wcth2').hide(); // "attack","defend" text near applier buttons
          $("#wcttmsg").prop( "disabled", true );
          $("#wc400").hide(); // no room for rare destroyer button, they can use 2x twice for 4x
          var scale = parseFloat( $( window ).width()-9 )/352*0.77;
          var transX = 88*scale-82;
          if (scale>1) scale=1;
          var tran_str = "scale("+scale+") translateX("+transX+"%)"//scale and undo horizontal movement caused by scale %
          $('#wcbtbl').css({ transform: tran_str });
        }
        // DEFEND BUTTONS
        $("#wc500").hide(); // no 5x bonus in MP2/AG
        $("#wc125").prop("title", bl+"In city with SAM Battery dvs Stealth Aircraft");
        $("#wc133").prop("title", bl+"River"+nbl+"Swamp"+nbl+"Forest"+nbl+"Land/Heli in Fort dvs Land/Sea/Missile (not Armor)"+nbl+"Fighter over Fort/Fortress dvs Land/Sea/Missile (not Armor)"+nbl+"Sea unit in Naval base");
        $("#wc150").prop("title", bl+"Veteran-1 ('Veteran')"+nbl+"Jungle"+nbl+"Land unit Fortified OR inside city");
        $("#wc167").prop("title", bl+"Land/Heli in Fortress dvs Armor/Aircraft"+nbl+"Land/Heli in Naval Base dvs Armor/Aircraft");
        $("#wc175").prop("title", bl+"Veteran-2 ('Hardened')");
        $("#wc200").prop("title", bl+"Veteran-3 ('Elite')"+nbl+"Hills"+nbl+"Land/Heli in Fortress dvs Land/Sea/Missile"+nbl+"In city with Coastal Defense dvs Sea"+nbl
          + "In city with SAM Battery dvs Air (not Stealth)"+nbl+"In city with SDI dvs Missile"+nbl+"Pikemen dvs Horse (not Cavalry)"+nbl+"Knight dvs Foot soldier"+nbl
          + "Cruiser,Battleship,M.Destroyer,AEGIS dvs Submarine"+nbl+"Sea unit dvs Marines"+nbl+"AAA/Mobile SAM dvs Aircraft"+nbl+"Missile Destroyer dvs Air/Missile"+nbl+"Armor II dvs Missile");
        $("#wc210").prop("title", bl+"Veteran-4 ('Crack')");
        $("#wc220").prop("title", bl+"Veteran-5 ('Master')");
        $("#wc230").prop("title", bl+"Veteran-6 ('Champion')");
        $("#wc300").prop("title", bl+"Mountains"+nbl+"In city with City Walls dvs Land (not Howitzer)"+nbl+"Knight dvs Horse (not Cavalry)"+nbl+"AEGIS dvs Air/Missile");
        $("#wc400").prop("title", bl+"Destroyer dvs Submarine");
        // ATTACK BUTTONS
        $("#wca133").hide(); // unused except for table alignment
        $("#wca167").hide(); //   "      "     "    "      "

        $("#wca125").prop("title", bl+"Stealth Aircraft avs AAA/Mobile SAM/AEGIS Cruiser");
        $("#wca150").prop("title", bl+"Veteran-1 ('Veteran')"+nbl+"Phalanx/Pikemen + Agoge of Sparta");
        $("#wca175").prop("title", bl+"Veteran-2 ('Hardened')");
        $("#wca200").prop("title", bl+"Veteran-3 ('Elite')"+nbl+"AAA/Mobile SAM avs Aircraft"+nbl+"Fighter dvs Heli (also: Heli FP=1)")+nbl+"Any unit avs Ship in a city: Defend FP1, Attack FP x2";
        $("#wca210").prop("title", bl+"Veteran-4 ('Crack')");
        $("#wca220").prop("title", bl+"Veteran-5 ('Master')");
        $("#wca230").prop("title", bl+"Veteran-6 ('Champion')");
        // TOOLTIPS NEEDING MORE SPACE
        $("#wc125").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "450px");}});
        $("#wc133").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "450px");}});
        $("#wc167").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "450px");}});
        $("#wc200").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "460px");}});
        $("#wc300").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "450px");}});

        if (ruleset_control['name'].startsWith("Avant-garde")
           || ruleset_control['name'].startsWith("MP2")) //MP2 Brava onward starts with "MP2"
        {
          $("#wc133").prop("title", bl+"River"+nbl+"Swamp"+nbl+"Forest"+nbl+"Land/Heli in Fort dvs Land/Sea/Missile (not Armor)"+nbl+"Fighter over Fort/Fortress dvs Land/Sea/Missile (not Armor)"
             +nbl+"Dive Bomber, Ground Strike Fighter dvs Anti-Air");
          $("#wc150").prop("title", bl+"Veteran-1 ('Veteran')"+nbl+"Jungle"+nbl+"Land unit Fortified OR inside city"
             +nbl+"Helicopter dvs Foot or Mounted units");
          $("#wc167").prop("title", bl+"Land/Heli in Fortress dvs Armor/Aircraft"+nbl+"Land/Heli/Sea in Naval Base dvs Armor/Aircraft");
          $("#wc200").prop("title", bl+"Veteran-3 ('Elite')"+nbl+"Hills"+nbl+"Land/Heli in Fortress dvs Land/Sea/Missile"+nbl+"Land/Heli/Sea in Naval Base dvs Land/Sea/Missile"+nbl+"In city with Coastal Defense dvs Sea"+nbl
          + "In city with SAM Battery dvs Air/Heli (not Stealth)"+nbl+"In city with SDI dvs Missile"+nbl+"Pikemen dvs Horse (not Cavalry)"+nbl+"Knight dvs Foot soldier"+nbl
          + "Cruiser,Battleship,M.Destroyer,AEGIS dvs Submarine"+nbl+"Sea unit dvs Marines"+nbl+"AAA/Mobile SAM dvs Aircraft"+nbl+"Missile Destroyer dvs Air/Missile"+nbl+"Armor II dvs Missile");

          $("#wca150").prop("title", bl+"Veteran-1 ('Veteran')"+nbl+"Phalanx/Pikemen + Agoge of Sparta"+nbl+"Dive Bomber avs Land or Sea");
          $("#wca200").prop("title", bl+"Veteran-3 ('Elite')"+nbl+"AAA/Mobile SAM avs Aircraft");
        }
        if (client_rules_flag[CRF_MP2_C]) {
          $("#wc133").prop("title", bl+"Swamp"+nbl+"Forest"+nbl+"Land/Heli in Fort dvs Land/Sea/Missile (not Armor)"+nbl+"Fighter over Fort/Fortress dvs Land/Sea/Missile (not Armor)"
          +nbl+"Dive Bomber, Ground Strike Fighter dvs Anti-Air");
          $("#wc175").prop("title", bl+"Veteran-2 ('Hardened')");
          $("#wc150").prop("title", bl+"Veteran-1 ('Veteran')"+nbl+"Jungle"+nbl+"Land unit Fortified OR inside city"
          +nbl+"Helicopter dvs Foot or Mounted units"+nbl+"In city with Fortifications dvs Land (not Ballistic)");
          $("#wc167").prop("title", bl+"Land/Heli in Fortress dvs Armor/Aircraft"+nbl+"Land/Heli/Sea in Naval Base dvs Armor/Aircraft"+nbl+"Jungle in city with Fortifications");
          $("#wc125").prop("title", bl+"In city with Fortifications dvs Catapult"+nbl+"In city with SAM Battery dvs Stealth Aircraft");
          $("#wca125").prop("title", bl+"Stealth Aircraft avs AAA/Mobile SAM/AEGIS Cruiser");
          $("#wca150").prop("title", bl+"Veteran-1 ('Veteran')"+nbl+"Phalanx/Pikemen + Agoge of Sparta"+nbl+"Dive Bomber avs Land or Sea");
          $("#wca175").prop("title", bl+"Veteran-2 ('Hardened')");
        }
        if (client_rules_flag[CRF_MP2_D]) {
          $("#wca133").show();
          $("#wca133").prop("title", bl+"FP2 ships attacking land (Firepower is reduced to 1)");
          $("#wc125").prop("title", bl+"In city with City Walls dvs Artillery"+nbl+"In city with SAM Battery dvs Stealth Aircraft");
          $("#wc150").prop("title", bl+"Veteran-1 ('Veteran')"+nbl+"Jungle"+nbl+"Flatland terrain in city with Fortifications"+nbl+"Land unit Fortified OR inside city"+nbl+"In city with City Walls dvs Cannon"
          +nbl+"Helicopter dvs Foot or Mounted units"+nbl+"Armor II dvs Missile" );
          $("#wc167").prop("title", bl+"Swamp in city with Fortifications"+nbl+"Forest in city with Fortifications"+nbl+"Land/Heli in Fortress dvs Armor/Aircraft"+nbl+"Land/Heli/Sea in Naval Base dvs Armor/Aircraft");
          $("#wc175").prop("title", bl+"Veteran-2 ('Hardened')"+nbl+"In city with City Walls dvs Catapult")+nbl+"Knight dvs Mounted (not Cavalry)";
          $("#wc300").prop("title", bl+"Mountains"+nbl+"AEGIS dvs Air/Missile");
          $("#wc200").prop("title", bl+"Veteran-3 ('Elite')"+nbl+"Hills"+nbl+"In city with City Walls dvs Land (not Ballistic class)"+nbl+"In city with Coastal Defense dvs Sea"
          +nbl+"In city with SAM Battery dvs Air/Heli (not Stealth)"+nbl+"In city with SDI dvs Missile"+nbl+"Land/Heli in Fortress dvs Land/Sea/Missile"+nbl+"Land/Heli/Sea in Naval Base dvs Land/Sea/Missile"
          +nbl+"Pikemen dvs Horse (not Cavalry)"
          +nbl+"Cruiser,Battleship,M.Destroyer,AEGIS dvs Submarine"+nbl+"Sea unit dvs Marines"+nbl+"AAA/Mobile SAM dvs Aircraft"+nbl+"Mobile SAM dvs Missile"+nbl+"Missile Destroyer dvs Air/Missile");
        }
        return;
  }

  // Suppress UI buttons not present in remaining rulesets
  $("#wc133").hide(); $("#wc167").hide(); $("#wc210").hide(); $("#wc220").hide(); $("#wc230").hide(); $("#wc400").hide();
  $("#wca125").hide(); $("#wca133").hide(); $("#wca167").hide(); $("#wca210").hide(); $("#wca220").hide(); $("#wca230").hide();

  // Classic/MP/MP+:
  if (ruleset_control['name']=="Multiplayer-Plus ruleset"
  || ruleset_control['name']=="Multiplayer ruleset"
  || ruleset_control['name']=="Classic ruleset" ) {
    // DEFEND BUTTONS
    $("#wc125").hide(); // unused

    $("#wc150").prop("title", bl+"Veteran-1 ('Veteran')"+nbl+"River"+nbl+"Swamp"+nbl+"Forest"+nbl+"Jungle"+nbl+"Land unit Fortified OR inside city");
    $("#wc175").prop("title", bl+"Veteran-2 ('Hardened')");
    $("#wc200").prop("title", bl+"Veteran-3 ('Elite')"+nbl+"Hills"+nbl+"Land/Heli in Fortress dvs Land/Sea units"+nbl+"Pikemen dvs Horse (not Cavalry)"+nbl+"In city with Coastal Defense dvs Sea"+nbl+"In city with SAM Battery dvs Aircraft"+nbl+"In city with SDI dvs Missile");
    $("#wc300").prop("title", bl+"Mountains"+nbl+"In city with City Walls dvs Land/Heli (not Howitzer)");
    $("#wc500").prop("title", bl+"AEGIS dvs Air/Missile");
    // ATTACK BUTTONS
    $("#wca150").prop("title", bl+"Veteran-1 ('Veteran')");
    $("#wca175").prop("title", bl+"Veteran-2 ('Hardened')");
    $("#wca200").prop("title", bl+"Veteran-3 ('Elite')"+nbl+"Fighter avs Heli (also: Heli FP=1)");
    // TOOLTIPS NEEDING MORE SPACE
    $("#wc200").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "400px");}});
    $("#wc300").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "400px");}});
  }

  //Civ2Civ3
  if (ruleset_control['name']=="Civ2Civ3 ruleset") {
    // DEFEND BUTTONS
    $("#wc300").hide(); // unused
    $("#wc125").prop("title", bl+"River"+nbl+"Swamp"+nbl+"Forest"+nbl+"Jungle");
    $("#wc150").prop("title", bl+"Veteran-1 ('Veteran')"+nbl+"Hills"+nbl+"Land unit Fortified OR inside city"+nbl+"Sea unit inside city"+nbl+"Land unit in Fort dvs Land/Sea"+nbl
      + "On Airstrip dvs Aircraft"+nbl+"In Airbase dvs Land/Sea"+nbl+"In city and Nation has Great Wall");
    $("#wc175").prop("title", bl+"Veteran-2 ('Hardened')");
    $("#wc200").prop("title", bl+"Veteran-3 ('Elite')"+nbl+"Mountains"+nbl+"Destroyer dvs Submarine"+nbl+""
      + "Land unit in Fortress dvs Land/Sea"+nbl+"In Airbase dvs Aircraft"+nbl+"In city with City Walls dvs Land unit"+nbl+"In city with Coastal Defense dvs Sea"+nbl
      + "In city with SAM Battery dvs Air/Heli"+nbl+"In city with SDI dvs Missile" );
    $("#wc500").prop("title", bl+"AEGIS dvs Air/Missile");
    // ATTACK BUTTONS
    $("#wca150").prop("title", bl+"Veteran-1 ('Veteran')");
    $("#wca175").prop("title", bl+"Veteran-2 ('Hardened')");
    $("#wca200").prop("title", bl+"Veteran-3 ('Elite')");
    // TOOLTIPS NEEDING MORE SPACE
    $("#wc150").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "400px");}});
    $("#wc200").tooltip({open: function (event, ui) {ui.tooltip.css("max-width", "400px");}});
  }
}