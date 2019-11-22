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
  $('#warcalc_scroll').css("width", "100%");
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
  
    setTimeout(function(){$("#id_astr").focus();$("#id_astr").select()},300);
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
  if (punit['veteran']) {
    if (ptype['veteran_levels'] > 0) {
      power_fact = ptype['power_fact'][punit['veteran']];
    } else {
      power_fact = game_rules['power_fact'][punit['veteran']];
    }
  }

  // assume a clicked player unit is being considered for an attacker
  if (punit['owner'] == client.conn.playing.playerno) {
    my_hp  = punit['hp'];
    my_str = ptype['attack_strength'];
    my_fp  = ptype['firepower'];

    my_str *= (power_fact/100);
    my_str = my_str.toFixed(2);
  }
  // assume a clicked non-player unit is being considered for a defender
  else {
    their_hp  = punit['hp']
    their_str = ptype['defense_strength'];;
    their_fp  = ptype['firepower'];

    their_str *= (power_fact/100);
    their_str = their_str.toFixed(2);
  }  
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
  $("#att_win").html("The attacker has a <b>"+prob.toFixed(2)+"%</b> chance to win.");
  $("#def_win").html("The defender has a "+(100-prob).toFixed(2)+"% chance to win.");
  $("#wc_done_btn").show();
  expected_hitpoints(att,ahp,afp,def,dhp,dfp);
}

/**************************************************************************
  The FORMULA
*************************************************************************/
function warcalc_win_chance(as,ahp,afp,ds,dhp,dfp)
{
  var as = parseFloat(as);
  var ds = parseFloat(ds);
  var ahp = parseFloat(ahp);
  var dhp = parseFloat(dhp);
  var afp = parseFloat(afp);
  var dfp = parseFloat(dfp);
  
  /* Number of rounds a unit can fight without dying */
  var att_N_lose = Math.trunc( (ahp + dfp - 1) / dfp );
  var def_N_lose = Math.trunc( (dhp + afp - 1) / afp );
  /* Probability of losing one round */
  var att_P_lose1 = (as + ds == 0) ? 0.5 : ds / (as + ds);
  var def_P_lose1 = 1 - att_P_lose1;

  var binom_save = Math.pow(def_P_lose1, (def_N_lose - 1));
  var accum_prob = binom_save; /* lr = 0 */

  /* lr - the number of Lost Rounds by the attacker */
  for (let lr = 1; lr < att_N_lose; lr++) {
    /* update the coefficient */
    var n = lr + def_N_lose - 1;
    binom_save *= n;
    binom_save /= lr;
    binom_save *= att_P_lose1;
    /* use it for this lr */
    accum_prob += binom_save;
  }
  /* Every element of the sum needs a factor for the very last fight round */
  accum_prob *= def_P_lose1;

  return accum_prob;
}

/**************************************************************************
  The FORMULAS
*************************************************************************/
function warcalc_done()
{
  $("#ui-ui-8").hide();
  set_default_mapview_active();
  $("#map_tab").click();
}
function expected_hitpoints(att,ahp,afp,def,dhp,dfp)
{
  var att = parseFloat(att);
  var def = parseFloat(def);
  var ahp = parseFloat(ahp);
  var dhp = parseFloat(dhp);
  var afp = parseFloat(afp);
  var dfp = parseFloat(dfp);
  var p = att / (att + def);
  //console.log("Attacker will do "+p*afp+" damage each turn.")
  //console.log("Defender will do "+(1-p)*dfp+" damage each turn.")

  for (i=0;i<60;i++) {
    //console.log(ahp.toFixed(2)+" - "+dhp.toFixed(2));
    dhp -= ((p)*afp);
    ahp -= ((1-p)*dfp);

    if (ahp<1) {ahp="<b>DEAD</b>"; break;}
    if (dhp<1) {dhp="<b>DEAD</b>"; break;}
  }
  if (ahp<1 && dhp<1) {ahp="UNKNOWN"; dhp=ahp;} // either could die
  if (ahp>0) ahp = "<b>"+ahp.toFixed(2)+"</b> hp"
  if (dhp>0) dhp = "<b>"+dhp.toFixed(2)+"</b> hp"

  $("#exp_hp").html("Expectation:<br><br>Attacker: "+ahp+"<br>Defender: "+dhp);
}
