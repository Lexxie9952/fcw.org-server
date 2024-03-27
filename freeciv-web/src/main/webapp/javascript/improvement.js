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

// incomplete list of (well defined) building names - populate as needed
// Remove in favor of [Effects](https://github.com/freeciv/freeciv-web/issues/208) when implemented.
// IDs are dynamic based on ruleset
const B_AIRPORT_NAME = 'Airport'
const B_RECYCLING_CENTER = "Recycling Center"
const B_PALACE_NAME = 'Palace'
const B_ECC_PALACE_NAME = 'Ecclesiastical Palace'
//--
const B_ADAM_SMITH_NAME = "A.Smith's Trading Co."
const B_AGOGE = "Agoge of Sparta"
const B_ANGKOR_WAT = "Angkor Wat"
const B_APPIAN_WAY = "Appian Way"
const B_CHAND_BAORI = "Chand Baori"
const B_COLOSSUS = "Colossus"
const B_GIBRALTAR_FORTRESS = "Gibraltar Fortress"
const B_HOOVER_DAM = "Hoover Dam"
const B_LIGHTHOUSE = "Lighthouse"
const B_MAGNA_CARTA = "Magna Carta"
const B_MAUSOLEUM = "Mausoleum of Mausolos"
const B_MEDICI_BANK = "Medici Bank"
const B_STATUE_OF_LIBERTY_NAME = "Statue of Liberty"
const B_TESLAS_LABORATORY = "Tesla's Laboratory"

var B_LAST = MAX_NUM_BUILDINGS;

const improvements = {};
/** @private */
const improvements_name_index = {};

// Used to sort improvements alphabetically and by genus so ruleset doesn't have to...
// Why? So ruleset improvement order will represent what the "Advisor" suggests making,
// Thus each ruleset gets to program its own advisor for what it suggests to prioritize making.
const SORT_AFTER = 1;
const SORT_SAME = 0;
const SORT_BEFORE = -1;
var sorted_improvements = [];

// Discounted price lists from MP2 rules
var communist_discounts = {
  "Riflemen": 5,
  "Ground Troops": 5,
  "Light Armor": 5,
  "Dive Bomber": 10,
  "Armor": 10,
  "Armor II": 10
};
var nationalist_discounts = {
    "Police Station": 10
};
var colossus_discounts = {
  "Boat": 3,
  "Goods": 5,
  "Trireme": 5,
  "Galley": 5,
  "Caravel": 5,
};
var appian_discounts = {
  "Wagon": 5
}
var angkorwat_discounts = {
  "Elephants": 5
}
var mausoleum_discounts = {
  "Courthouse": 5
}
var mausoleum_despot_discounts = {
  "Courthouse": 10
}
var agoge_discounts = {
  "Phalanx": 3
}

/**************************************************************************
 Prepare improvements for use, resetting state from any previous ruleset
 **************************************************************************/
function improvements_init()
{
  Object.keys(improvements).forEach(k => delete improvements[k]);
  Object.keys(improvements_name_index).forEach(k => delete improvements_name_index[k]);
}

/**************************************************************************
 Add a new improvement definition
 **************************************************************************/
function improvements_add_building(improvement) {
  improvements[improvement.id] = improvement;
  improvements_name_index[improvement.name] = improvement.id
}

/**************************************************************************
 Returns a list containing improvements which are available from a tech.
**************************************************************************/
function get_improvements_from_tech(tech_id)
{
  var result = [];
  for (var improvement_id in improvements) {
    var pimprovement = improvements[improvement_id];
    var reqs = get_improvement_requirements(improvement_id);
    for (var i = 0; i < reqs.length; i++) {
      if (reqs[i] == tech_id) {
        result.push(pimprovement);
      }
    }
  }
  return result;
}

/**************************************************************************
...
**************************************************************************/
function is_wonder(improvement)
{
  return (improvement['soundtag'][0] == 'w');
}

/**************************************************************************
 returns list of tech ids which are a requirement for the given improvement
**************************************************************************/
function get_improvement_requirements(improvement_id)
{
  var result = [];
  var improvement = improvements[improvement_id];
  if (improvement != null && improvement['reqs'] != null) {
    for (var i = 0; i < improvement['reqs'].length; i++) {
      if (improvement['reqs'][i]['kind'] == 1
          && improvement['reqs'][i]['present']) {
        result.push(improvement['reqs'][i]['value']);
      }
    }
  }
  return result;
}

/**************************************************************************
 Finds improvement id by exact name, or -1 if not found.
 **************************************************************************/
function improvement_id_by_name(name)
{
  // 0 is a valid id, so cannot use `|| -1`
  return improvements_name_index.hasOwnProperty(name)
    ? improvements_name_index[name]
    : -1;
}

/**************************************************************************
...Figures out discounts for universals (units or buildings)
**************************************************************************/
function get_universal_discount_price(ptype, pcity)
{
  if (!pcity) pcity = active_city;

  var playerno;
  if (!pcity) playerno = client.conn.playing.playerno;
  else playerno = pcity.owner;

  // Since 'name' and 'build_cost' are the only fields checked and
  // are universal to both improvements and units, we can adapt this
  // for everything when needed:

  // MP2 communist discounts
  if (client_rules_flag[CRF_MP2_SPECIAL_UNITS] &&
      governments[players[playerno].government].name == "Communism") {

    if (communist_discounts[ptype['name']]) {
      if (!client_rules_flag[CRF_MP2_C]) {
        if (ptype['name'] == "Armor") return ptype['build_cost']
      }
      if (ptype['name'] == "Armor II") {
        if (!client_rules_flag[CRF_MP2_D]) return ptype['build_cost']
      }
      return ptype['build_cost'] - communist_discounts[ptype['name']];
    }
  }
  // MP2 nationalist discounts
  if (client_rules_flag[CRF_MP2_C] &&
      governments[players[playerno].government].name == "Nationalism") {

    if (nationalist_discounts[ptype['name']])
      return ptype['build_cost'] - nationalist_discounts[ptype['name']];
  }
  // MP2 Building Prices:
  if (client_rules_flag[CRF_MP2_C]) {
    // City Walls increase with Metallurgy
    if (ptype['name'] == "City Walls"
        && (player_invention_state(players[playerno], tech_id_by_name('Metallurgy')) == TECH_KNOWN)) {
            return ptype['build_cost'] + 10;
    }
    if (ptype['name'] == "Coastal Defense"
        && player_has_wonder(playerno,
           improvement_id_by_name(B_GIBRALTAR_FORTRESS))) {
            return ptype['build_cost'] - 15;
    }
    if (ptype['name'] == "Hydro Plant"
        && player_has_wonder(playerno,
           improvement_id_by_name(B_HOOVER_DAM))) {
            return ptype['build_cost'] - 5;
    }
  }
  if (client_rules_flag[CRF_MP2_D]) {
    if (ptype['name'] == "Fortifications"
        && (player_invention_state(players[playerno], tech_id_by_name('Metallurgy')) == TECH_KNOWN)) {
            return ptype['build_cost'] + 10;
    }
  }

  // MP2 discounts for having Colossus
  if (pcity && client_rules_flag[CRF_COLOSSUS_DISCOUNT]
    && player_invention_state(players[playerno], tech_id_by_name('Steam Engine')) != TECH_KNOWN
    && city_has_building(pcity, improvement_id_by_name(B_COLOSSUS))) {

    if (colossus_discounts[ptype['name']])
        return ptype['build_cost'] - colossus_discounts[ptype['name']];
  }
  // MP2 discount for Appian Way
  if (pcity && client_rules_flag[CRF_MP2_C]
    && player_invention_state(players[playerno], tech_id_by_name('Railroad')) != TECH_KNOWN
    && city_has_building(pcity, improvement_id_by_name(B_APPIAN_WAY))) {
      if (appian_discounts[ptype['name']])
      return ptype['build_cost'] - appian_discounts[ptype['name']];
  }
  // MP2 discount for Angkor Wat
  if (pcity && client_rules_flag[CRF_MP2_C]
    && governments[players[playerno].government].name != "Nationalism"
    && governments[players[playerno].government].name != "Democracy"
    && governments[players[playerno].government].name != "Theocracy"
    && governments[players[playerno].government].name != "Communism"
    && player_has_wonder(playerno, improvement_id_by_name(B_ANGKOR_WAT))) {
      if (angkorwat_discounts[ptype['name']])
      return ptype['build_cost'] - angkorwat_discounts[ptype['name']];
  }
  // MP2D discounts for Mausoleum:
  if (pcity && client_rules_flag[CRF_MP2_D]
    && player_has_wonder(playerno, improvement_id_by_name(B_MAUSOLEUM))
    && mausoleum_discounts[ptype['name']])
  {
    let discount = 0;
    discount += mausoleum_discounts[ptype['name']];
    if (governments[players[playerno].government].name == "Despotism") {
      discount += mausoleum_despot_discounts[ptype['name']];
    }
    return ptype['build_cost'] - discount;
  }
  if (pcity && client_rules_flag[CRF_MP2_D]
      && player_has_wonder(playerno, improvement_id_by_name(B_AGOGE))) {

      if (agoge_discounts[ptype['name']])
        return ptype['build_cost'] - agoge_discounts[ptype['name']];
  }

  // default, no discount:
  return ptype['build_cost'];
}

/**************************************************************************
...Make a copy of the improvements object list that is an array sorted
   by genus and alphabet. Why? Because this is easier to search through
   than the "Advisor-prioritised order" in the ruleset.
**************************************************************************/
function build_sorted_improvements_array()
{
  for (var id1 in improvements) {   // Copy object list to array.
    sorted_improvements.push(improvements[id1]);
  }
  var len = sorted_improvements.length;
  var swapped;
  var iteration=0; // paranoid failsafe for do{}while
  do {
    swapped = false;
    iteration ++;
    for (let i = 0; i < len-1; i++) {
        if (improvement_sorts_lower(sorted_improvements[i],sorted_improvements[i+1])) {
            let tmp = sorted_improvements[i];
            sorted_improvements[i] = sorted_improvements[i + 1];
            sorted_improvements[i + 1] = tmp;
            swapped = true;
        }
    }
  } while (swapped && iteration < 3000);
}

function improvement_sorts_lower(improvement1, improvement2) {
  g1 = improvement1.genus; g2 = improvement2.genus;
  genus_compare = genus_sorts_lower(g1,g2)
  if (genus_compare == SORT_AFTER) return true;
  if (genus_compare == SORT_SAME) {
    let name1 = improvement1.name.replace("The ","");  //e.g. don't sort The Internet with 'T' words
    let name2 = improvement2.name.replace("The ","");
        //hacky trick to group powerplants together
        if (name1.includes(" Plant")) name1 = "Plant"+name1;
        if (name2.includes(" Plant")) name2 = "Plant"+name2;
    if (name1 > name2) return true;
    else return false;
  }
  return false;
}

// Genus 0=great wonder, 1=small wonder, 2=building 3=spaceship/coinage
function genus_sorts_lower(g1, g2) {
  // Re-order the genera:
  if (g1==0) g1 = 1;      // wonders second
  else if (g1==2) g1 = 0; // improvs first. (spaceship,coinage last)
  if (g2==0) g2 = 1;
  else if (g2==2) g2 = 0;
  // Now we have 0=building, 1=wonder, 3=coinage or spaceship:
  if (g1 < g2)  return SORT_BEFORE;
  if (g1 == g2) return SORT_SAME;
  return SORT_AFTER;
}

