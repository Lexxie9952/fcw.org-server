/**********************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2009-2021  The Freeciv-web project

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

/****************************************************************************
  Assigns the nation's colors based on the color of their flag, 
  CURRENTLY: Three most frequent dissimilar colors are rank-sorted.
  FORMERLY: The most common color in the flag was chosen.
****************************************************************************/

const default_dialog_text_color = "#ccc";

function assign_nation_color(nation_id)
{
  const RED=0,GRN=1,BLU=2,OPQ=3;

  var nation = nations[nation_id];
  if (nation == null || nation['color'] != null) return;

  var flag_key = "f." + nation['graphic_str']+"-large";
  var flag_sprite = sprites[flag_key];
  if (flag_sprite == null) return;

  var c = flag_sprite.getContext('2d');
  var width = tileset[flag_key][2];
  var height = tileset[flag_key][3];
  var color_counts = {};

  /* Gets the flag image data sans any border. */
  if (c == null) return;
  var img_data = c.getImageData(1, 1, width-2, height-2).data;

  /* Count the number of pixels for each color */
  for (var i = 0; i < img_data.length; i+=4) {
    var current_color = "rgb(" + img_data[i+RED] + "," + img_data[i+GRN] + ","
                        + img_data[i+BLU] + ")";
    if (current_color in color_counts) {
      if (img_data[i+OPQ]>128) // Transparent pixels don't get ranked                    
        color_counts[current_color] ++;
    } else {
      if (img_data[i+OPQ]>128) // New opaque pixel, insert into ranking array                   
        color_counts[current_color] = 1;
      else 
        color_counts[current_color] = 0; // Register transparent as 0; avoids undefined situation
    }
  }

  /* New algorithm: rank 3 most significant colors: 
        (former algorithm is commented at end of function) */

  // Create sortable array: 
  var sorted_colors = [];
  for (var current_color in color_counts) {
    var element = {color: current_color, count: color_counts[current_color]};
    sorted_colors.push(element);
  }

  // Sort array:
  sorted_colors.sort(function(a,b) {return b.count-a.count});

  // We now have an array sorted by most common colors in it.
  // Next, we must 'demote' the rank of colors that are too similar:
  const discrimination = 70; // threshold for color is too similar.
  for (i=1; i<sorted_colors.length; i++) {  // start at 1: sorted_colors[0] can't be demoted
    for (j=0; j<i; j++) { // compare sorted_color[i] to all colors ranked higher, to test it's too similar
      if (color_SSD(sorted_colors[i].color, sorted_colors[j].color) < discrimination) {
        // A "color collision" happened: therefore, set the count of the lower ranked color to 1. A repercussion
        // of this is that the higher ranked color "eats and absorbs" the count of the less common color,
        // (which will help settle more accurate ranking in the final sorting later.)
        sorted_colors[j].count += sorted_colors[i].count; // higher ranking color absorbs the score of demoted color
        sorted_colors[i].count = 1; // demote colliding color to lowest rank.
      }
    }
  }

  // Now we get heuristical to the human psychology of color...
  // "Monochromish" colors are less distinctive; and often by-products of border-region-blending issues in PNG compression.
  // We don't rank these colors as high as the "really colorful colors" in the list: for example, white is not as important
  // in the Italian flag, as green and red; nor are grey by-product pixels from a black stripe in a white flag.
  for (i=0; i<sorted_colors.length; i++) {
    // heuristically penalise certain monochromish colors by certain amounts decided in that function:
    sorted_colors[i].count *= colorfulness(sorted_colors[i].color);
  }

  // Now our array of colors is (a) sorted by frequency, (b) collision colors too similar to higher ranked colors are demoted
  // to allow non-colliding colors of lower rank to rise up in a new sort, (c) less colorful colors and compression by-product
  // pixels have been penalized. So we're ready for a final sort. At the end of sorting it all, this will leave the 3 most
  // distinct colors, nicely ranked.
  sorted_colors.sort(function(a,b) {return b.count-a.count});

  // Flags with only 1 or 2 colors. We need to extend the array to be standardised tricolore:
  if (sorted_colors.length == 1)
    sorted_colors.push(sorted_colors[0]);
  if (sorted_colors.length == 2)
    sorted_colors.push(sorted_colors[0]);

  nation['color']  = sorted_colors[0].color;
  nation['color2'] = sorted_colors[1].color;
  nation['color3'] = sorted_colors[2].color;
  color_counts = null;
  img_data = null;
  //console.log(nation.rule_name+" nation was assigned colors of "+nation['color']+", "+nation['color2']+", "+nation['color3']);
}
  /*****************************************************
   * Former algorithm -- just pick the most common color
  var max = -1;
  var max_color = null;

  for (var current_color in color_counts) {
    for (i=0; i<3; i++) {
      if (color_counts[current_color] > max[i]) {
        max[i] = color_counts[current_color];
        max_color[] = current_color;
      }
    }
  }
  nation['color'] = max_color;
  color_counts = null;
  img_data = null;
  *******************************************************/

/****************************************************************************
  Returns sum squared difference of two colors, also multiplying HUE delta.
****************************************************************************/
function color_SSD(color_a, color_b)
{
  const RED=0,GRN=1,BLU=2,OPQ=3;

  if (color_a == null || color_b == null) return false;

  var pcolor_a = color_rgb_to_list(color_a);
  var pcolor_b = color_rgb_to_list(color_b);

  var color_distance = Math.sqrt( Math.pow(pcolor_a[RED] - pcolor_b[RED], 2)
		  + Math.pow(pcolor_a[GRN] - pcolor_b[GRN], 2)
		  + Math.pow(pcolor_a[BLU] - pcolor_b[BLU], 2));

  // Avoid "false positives" between dark colors of different hues and
  // "false negatives" between different luminosities of same hues.
  // (Similar hues are a lot less distant to the eye than SSD would
  // have us believe, while different hues are more distant):
  
  var hue1 = get_hue(pcolor_a[RED], pcolor_a[GRN], pcolor_a[BLU]);
  var hue2 = get_hue(pcolor_b[RED], pcolor_b[GRN], pcolor_b[BLU]);
  var diff = angular_difference(hue1, hue2);
  if (diff<60)  {
    color_distance /= 1.33;
    if (diff<45)  color_distance /= 1.33;
    if (diff<30)  color_distance /= 1.33;
  }
  else if (diff>120) {
    color_distance *= 1.33;
    if (diff>135) color_distance *= 1.33;
    if (diff>150) color_distance *= 1.33;
  }
  
  return color_distance;
}

/****************************************************************************
  Gets the hue value of a color, in angular degrees
****************************************************************************/
function get_hue(red, green, blue) {
  var min = Math.min(Math.min(red, green), blue);
  var max = Math.max(Math.max(red, green), blue);
  var hue = 0;

  if (min == max) return 0;
  
  if (max == red) hue = (green - blue) / (max - min);
  else if (max == green)
    hue = 2 + (blue - red) / (max - min);
  else hue = 4 + (red - green) / (max - min);

  hue *= 60;
  if (hue < 0) hue += 360;

  return Math.round(hue);
}

/****************************************************************************
  Gets the difference between two angles (i.e., hues which are angular)
****************************************************************************/
function angular_difference(alpha, beta) {
  var phi = Math.abs(beta - alpha) % 360;   // This is either the diff or 360 - diff
  var diff = phi > 180 ? 360 - phi : phi;
  return diff;
}

/****************************************************************************
  Returns a coefficient on colorfulness, to lower the rank of less colorful
  colors. Returns 1 for all colors above a "colorful threshold.""
  Returns a value progressively lower, the more 'monochrome' the color is.
****************************************************************************/
function colorfulness(color) {
  const RED=0,GRN=1,BLU=2,OPQ=3;

  if (!color) return 0;

  color = color_rgb_to_list(color);

  var hue = get_hue(color[RED], color[GRN], color[BLU]);

  // Transparent pixels get the lowest rank possible.
  if (color[OPQ]<128) return 0;

  // Sum of percent variations between all 3 possible color pairings,
  // +1 to avoid div by zero.
  var colorishness = Math.abs(1 - ( (color[RED]+1) / (color[GRN]+1) ))
                   + Math.abs(1 - ( (color[RED]+1) / (color[BLU]+1) ))
                   + Math.abs(1 - ( (color[GRN]+1) / (color[BLU]+1) ));

  // Greyishness is a quality of monochrome colors that are not very black or white,
  // and also a quality of dull colors that are close to a medium grey.
  var non_greyish = (Math.abs(color[RED]-128)) 
                  + (Math.abs(color[GRN]-128))
                  + (Math.abs(color[RED]-128));
  
  var coef = 1;
  // Heuristics which more heavily undervalue bland monochromish greyish colors
  if (colorishness < .15 && non_greyish<220)     coef = 0.4285; // WORST PENALTY:  very monochrome and also a little greyish         
  else if (colorishness < .30 && non_greyish<60) coef = 0.5714; // HUGE PENALTY:   rather monochromish and quite greyish
  else if (colorishness < .8 && non_greyish<120) coef = 0.66;   // STRONG PENALTY: kinda monochrome and kinda grey
  else if (colorishness < .8 && non_greyish>360) coef = 0.91;   // LIGHT PENALTY:  white/black are more "colorful" than greys
  else if (colorishness < .8) coef = .8; // NORMAL PENALTY: not too greyish; but somewhat monochromish.
  
  // give a slight tie-breaker to NON-red colors, since it's the most overused flag color:
  if (angular_difference(hue, 0) < 30) coef *= 0.90;  

  return coef; // Weigh all other colors at 100%, if they survived the penalty cutoffs above.
}

/****************************************************************************
...Converts an rgb color string to an r,g,b array, OR, as failsafe, if it
   is already an r,g,b array, returns it as is.
****************************************************************************/
function color_rgb_to_list(pcolor)
{
  if (pcolor == null) return null;
  if (pcolor.length == 3) return pcolor;   
  var color_rgb = pcolor.match(/\d+/g);
  color_rgb[0] = parseFloat(color_rgb[0]);
  color_rgb[1] = parseFloat(color_rgb[1]);
  color_rgb[2] = parseFloat(color_rgb[2]);
  return color_rgb;
}

