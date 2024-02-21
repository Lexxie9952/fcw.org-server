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


// Global strip code for removing the └ that Chrome renders at line breaks,
// also 
var stripChar = [];
stripChar[0] = new RegExp(String.fromCharCode(3), "g");
//stripChar[1] = new RegExp("", "g");
const STRIPCHAR_LAST = 1;

// if old browser lacks String.repeat, add it here:
String.prototype.repeat = String.prototype.repeat ||
function(n) {
  if (n < 0) throw new RangeError("invalid count value");
  if (n == 0) return "";
  return new Array(n + 1).join(this.toString())
};

/****************************************************************************
 ...
****************************************************************************/
function clone(obj){
  if(obj == null || typeof(obj) != 'object') {
    return obj;
  }
  var temp = obj.constructor(); // changed

  for (var key in obj) {
    temp[key] = clone(obj[key]);
  }

  return temp;
}

/*
 * DIVIDE() divides and rounds down, rather than just divides and
 * rounds toward 0.  It is assumed that the divisor is positive.
 */
function DIVIDE (n, d) {
  return parseInt( (n) / (d) - (( (n) < 0 && (n) % (d) < 0 ) ? 1 : 0) );
}

/****************************************************************************
 ...
****************************************************************************/
function FC_WRAP(value, range)
{
    return ((value) < 0
     ? ((value) % (range) != 0 ? (value) % (range) + (range) : 0)
     : ((value) >= (range) ? (value) % (range) : (value)));
}

/****************************************************************************
 ...
****************************************************************************/
function XOR(a,b) {
  return ( a || b ) && !( a && b );
}

/**************************************************************************
 Check if x is between min and max
**************************************************************************/
const between = (min, x, max) => {
  return x >= min && x <= max;
}
/**************************************************************************
 Check if x is inside (but not equal to) min and max
**************************************************************************/
const inside = (min, x, max) => {
  return x > min && x < max;
}

/****************************************************************************
 Reduce a fraction by finding the Greatest Common Divisor and dividing by it.
****************************************************************************/
function fraction_reduce(numerator,denominator) {
  /* For highly composite movefrag systems immune to rounding errors,
   * we don't want to see 2/168 move points. Round UP to the nearest
   * 60th (since a micro movefrag is still able to do an action). */
  if (denominator > 60) {
    numerator = Math.ceil(numerator / denominator * 60);
    denominator = 60;
    // This will now (probably) get fraction reduced to a simpler fraction.
  }
  var gcd = function gcd(a,b){
    return b ? gcd(b, a%b) : a;
  };
  gcd = gcd(numerator,denominator);
  //avoid fifths -- they're more complex than tenths in the base-10 system:
  if (denominator/gcd == 5) gcd /=2;
  //in base-60 time- or move-systems, we avoid 12th,15ths,20ths, and 30ths:
  //i.e., people like halves, thirds, and quarters, but not more complex:
  else if (denominator/gcd == 12) gcd /=5;
  else if (denominator/gcd == 15) gcd /=4;
  else if (denominator/gcd == 20) gcd /=3;
  else if (denominator/gcd == 30) gcd /=2;
  return {"numerator": (numerator/gcd), "denominator": (denominator/gcd)};
}

/****************************************************************************
 ...
****************************************************************************/
$.extend({
  getUrlVars: function(){
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  },
  getUrlVar: function(name){
    return $.getUrlVars()[name];
  }
});



var benchmark_start = 0;

/****************************************************************************
 Benchmark the Freeciv.net webclient.
****************************************************************************/
function civclient_benchmark(frame)
{

  if (frame == 0) benchmark_start = new Date().getTime();

  var ptile = map_pos_to_tile(frame+5, frame+5);
  center_tile_mapcanvas(ptile);

  if (frame < 30) {
    setTimeout("civclient_benchmark(" + (frame + 1) + ");", 10);
  } else {

    var end = new Date().getTime();
    var time = (end - benchmark_start) / 25;
    swal('Redraw time: ' + time);
    setSwalTheme();
  }
}

/****************************************************************************
 ...
****************************************************************************/
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**************************************************************************
...
**************************************************************************/
function to_title_case(str)
{
  return str.replace(/\w\S*/g,
         function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

/**************************************************************************
  Remove a string's translation qualifier.

  The Freeciv server qualifies some strings for translation purposes. The
  qualifiers shouldn't be shown to the user.
**************************************************************************/
function string_unqualify(str)
{
  if (str.charAt(0) == "?" && str.indexOf(":") != -1) {
    /* This string is qualified. Remove it. */
    return str.substr(str.indexOf(":") + 1);
  } else {
    /* This string isn't qualified. */
    return str;
  }
}

/**************************************************************************
...
**************************************************************************/
function get_random_int(min, max) {
  return Math.floor(fc_seedrandom() * (max - min)) + min;
}

/****************************************************************************
  Mac OS X and Chrome OS does not support the right-click-and-drag to select
  units on the map in Freeciv-web at the moment.
****************************************************************************/
function is_right_mouse_selection_supported()
{
  if (is_touch_device() || platform.description.indexOf("Mac OS X") > 0 || platform.description.indexOf("Chrome OS") > 0
      || platform.description.indexOf("CrOS") > 0 ) {
    return false;
  } else {
    return true;
  }

}

/**************************************************************************
...
**************************************************************************/
function seconds_to_human_time(input_seconds) {
  if (input_seconds <= 0) return 0 + 's';
  var hours   = Math.floor(input_seconds / 3600);
  var minutes = Math.floor((input_seconds - (hours * 3600)) / 60);
  var seconds = input_seconds - (hours * 3600) - (minutes * 60);
  if ( !is_small_screen() )   {    // big screen, display full XXh YYm:
    if (hours > 0) return hours+'h '+minutes+'m ';
    else if (hours == 0 && minutes > 0) return minutes+'m '+seconds + 's';
    else if (hours == 0 && minutes == 0) return seconds + 's';
  } else {              // more compact for mobile:
    if (hours > 0) return hours+'.'+Math.floor( (minutes*10) / 60)+'h';    //23h 59m shows as 23.9h
    else if (hours == 0 && minutes > 9) return minutes+'m';                //10m 32s shows as 10m
    else return minutes+':'+seconds;                                       //9m 59s shows as 9:59
  }
}

/**************************************************************************
 Returns the supported file format for the tileset.
**************************************************************************/
function get_tileset_file_extention()
{
    return ".png";
}

/**************************************************************************
 For the purposes of looking for server words in a string that mean it
 should be handled differently.
**************************************************************************/
function is_any_word_in_string(string,words_array)
{
    for (var i = 0; i < words_array.length; i++) {
      if (string.indexOf(words_array[i]) != -1) return true;
    }
    return false;
}

/**************************************************************************
 Copies a string to the clipboard.
**************************************************************************/
function copy_string_to_clipboard (str) {
  var el = document.createElement('textarea');
  el.value = str;
  el.setAttribute('readonly', '');
  el.style = {position: 'absolute', left: '-9999px'};
  document.body.appendChild(el);
  el.select(); // Select text inside element
  document.execCommand('copy');   // Copy text to clipboard
  document.body.removeChild(el);
}

/**************************************************************************
 Allows changing the properties of a css class itself, instead of just
 changing properties of existing elements with that class. This is useful
 when you want the class itself to have the new property, so that it will
 universally affect all instances of that class which appear in the future,
 instead of changing only currently existing elements with that class.
**************************************************************************/
function changeCss(className, classValue) {
  // we need invisible container to store additional css definitions
  var cssMainContainer = $('#css-modifier-container');
  if (cssMainContainer.length == 0) {
      var cssMainContainer = $('<div id="css-modifier-container"></div>');
      cssMainContainer.hide();
      cssMainContainer.appendTo($('body'));
  }

  // and we need one div for each class
  classContainer = cssMainContainer.find('div[data-class="' + className + '"]');
  if (classContainer.length == 0) {
      classContainer = $('<div data-class="' + className + '"></div>');
      classContainer.appendTo(cssMainContainer);
  }

  // append additional style
  classContainer.html('<style>' + className + ' {' + classValue + '}</style>');
}

/**************************************************************************
 Finds a time string in a message that has a class .ts timestamp and then
 localizes the time from GMT to the browser's local time zone, and returns
 the original message with local time in it instead of GMT.
**************************************************************************/
function time_localize(message) {
  const t_start = message.indexOf("class='ts'") + 11;
  const t_end = message.indexOf("class='ts'") + 16;

  const GMT = message.substring(t_start, t_end);
  const GMT_hour = parseInt(GMT.substring(0,2));
  const GMT_minute = GMT.substring(3,5);

  const date = new Date()
  const minutes_offset = date.getTimezoneOffset();
  const hours_offset = minutes_offset / 60;

  var local_hour = GMT_hour - hours_offset - SERVER_GMT_OFFSET;

  if (local_hour < 0) {
    local_hour = 24 + local_hour;
  }
  else if (local_hour >= 24) {
    local_hour -= 24;
  }

  const local_hour_string = "" + (local_hour < 10 ? "0" : "") + local_hour.toString();
  var zone = date.toLocaleTimeString(undefined,{timeZoneName:'short'}).split(' ')[2];
  if (!zone || zone=="undefined") zone = "";
  const local_time = local_hour_string + ":" + GMT_minute + "&nbsp;" + zone;

  return message.replace(GMT, local_time);
}

/**************************************************************************
 Comes back false (null) if it is not an unaccented lower or upper case
 character in the Latin alphabet.
**************************************************************************/
function is_alphabetic(text)
{
    var regex = /([\u0041-\u005A\u0061-\u007A]+)/g;
    var result = text.match(regex);

    // If there are illegal characters, they become separators and result comes back as an array
    if (result == null || result.length>1) return null;

    return result;
}

/**************************************************************************
 Returns original string iff it is composed of legal alphanumeric characters
  and/or basic ASCII spaces and punctuation. Otherwise returns null.
  Accepts most accented characters, such as: é,ç,ä etc.
**************************************************************************/
function alphanumeric_cleaner(text)
{
    var regex = /([\u0020-\u0021\u0026-\u0039\u0026-\u0027\u0041-\u005A\u0061-\u007A\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]+)/g;
    var result = text.match(regex);

    // If there are illegal characters, they become separators and result comes back as an array
    if (result == null || result.length>1) return "";

    return result;
}
/**************************************************************************
 Same as above. Why we need this: because a genius decided to put \u2019
 into some pacific islander nation city names.
**************************************************************************/
function alphanumeric_cleaner_city_names(text)
{
    var regex = /([\u0020-\u0021\u0026-\u0039\u0026-\u0027\u0041-\u005A\u0061-\u007A\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2019\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]+)/g;
    var result = text.match(regex);

    // If there are illegal characters, they become separators and result comes back as an array
    if (result == null || result.length>1) return "";

    return result;
}
/**************************************************************************
  Minimized jquery #dialog-extend-fixed-container has undesirable
    behaviour of being z-index:9999 and screen-wide, blocking clicks on
    more important objects. A call to this function below can be put in the
    inline declared minimize function where the dialog init_ is done, to
    fix this issue.
**************************************************************************/
function unobstruct_minimized_dialog_container()
{ // Prevent screen-wide container from blocking clicks when minimized
  // TO DO: this should really be put into jquery.dialogextend.js so we
  // don't have to do it for every minimized container.
  $("#dialog-extend-fixed-container").children().css("visibility","visible");
  $("#dialog-extend-fixed-container").css("visibility","hidden");
}

/**************************************************************************
   Some strings such as those going into title attribute hovertext, etc.,
   need to be html-safe and have encoding for some characters such ' "
**************************************************************************/
function html_safe(text)
{
  text = text.replace(/'/g, "&#39;");
  text = text.replace(/"/g, "&#34;");
  text = text.replace(/[\x03]/g,"\n");
  return text;
}

/**************************************************************************
   Takes the name of a game universal (unit, building, wonder, etc.), and
   returns the html-ready emoji element ready for insertion into html
   code. click_action is optionaly specifiable onclick behaviour of element
**************************************************************************/
function html_emoji_from_universal(universal_name)
{
  // Force lower case and remove white space and escape sequences
  var freemoji_name = freemoji_name_from_universal(universal_name);
  var path = "/images/e/"+freemoji_name+".png";
  var element = "<img class='v' src='"+path+"'>";
  return element;
}

/**************************************************************************
   Takes the name of a game universal (unit, building, wonder, etc.), and
   returns the stripped down emoji_name representing emoji_name.png;
   Spaces, punctuation, and capitalisation removed.
**************************************************************************/
function freemoji_name_from_universal(universal_name)
{
  var freemoji_name = universal_name.toLowerCase();
  freemoji_name = freemoji_name.replace(/\s+/g, '');
  freemoji_name = freemoji_name.replace('.', '');
  freemoji_name = freemoji_name.replace('_', '');   // TODO: /_/g and similar on others is causing blank freemoji string
  freemoji_name = freemoji_name.replace('_', '');   // FIXME: hack for emoji with word<space>word<space>word e.g., Isaac Newton's College
  freemoji_name = freemoji_name.replace('_', '');   // FIXME: hack for emoji with word<space>word<space>word<space>word e.g., Genghis Khan's Equestion School
  freemoji_name = freemoji_name.replace("'", "");
  //      freemoji_name = freemoji_name.replace("​", ""); //0-width space. only ONE of these 3 is needed, TODO; find which works and remove the other 2
  //      freemoji_name = freemoji_name.replace("​&#8203;", "");
  //      freemoji_name = freemoji_name.replace("​%E2%80%B8", "");
        // e.g., "A. Smith's Trading Co." will become "asmithstradingco"
  return freemoji_name;
}

/**************************************************************************
   Makes a unique hash (not absolutely guaranteed unique but good enough)
**************************************************************************/
function getHash(input){
  var hash = 0, len = input.length;
  for (var i = 0; i < len; i++) {
    hash  = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0; // to 32bit integer
  }
  return Math.abs(hash).toString();
}

/**************************************************************************
  Reverse lookup: get an object key by its value
**************************************************************************/
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

/**************************************************************************
   Force execution to delay by x milliseconds.
**************************************************************************/
function wait(ms)
{
  var start = new Date().getTime();
  var end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}

/**************************************************************************
   Remove from strings, garbage that may come from line feeds or escape
   characters.
**************************************************************************/
function cleaned_text(str)
{
  // Remove each type of ugly spurious character or escape code.
  for (i=0; i<STRIPCHAR_LAST; i++) {
    str = str.replace(stripChar[i],"");
  }
  return str;
}
/**************************************************************************
   Render universal[].helptext into a friendly format for html
   representation.
**************************************************************************/
function cleaned_helptext(str)
{
  str = str.replaceAll("\n", "<br>");
  return cleaned_text(str);
}

/**************************************************************************
   Capitalize first letter of string
**************************************************************************/
function capitalize(s) {
  if (typeof s !== 'string') return "";
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**************************************************************************
   Capitalize first letter of string
**************************************************************************/
function uncapitalize(s) {
  if (typeof s !== 'string') return "";
  return s.charAt(0).toLowerCase() + s.slice(1)
}

/**************************************************************************
   Replaces decimals with common fractions 1/4, 1/2, 3/4, etc.
**************************************************************************/
function fractionalize(s) {

  if (s.toString().endsWith(".5")) s = ""+Math.trunc(s) + "&#189;";
  else if (s.toString().endsWith(".75")) s = "" + (Math.trunc(s) ? Math.trunc(s) : "") + "&#xBE;";
  else if (s.toString().endsWith(".25")) s = "" + (Math.trunc(s) ? Math.trunc(s) : "") + "&#xBC;";
  else if (s.toString().endsWith(".05")) s = "" + (Math.trunc(s) ? Math.trunc(s) : "") + "&#8203;1&#x2044;20";
  else if (s.toString().endsWith(".1")) s = "" + (Math.trunc(s) ? Math.trunc(s) : "") + "&#x2152;";
//  else if (s.toString().endsWith(".33")) s = "" + (Math.trunc(s) ? Math.trunc(s) : "") + "&#x2153;";
//  else if (s.toString().endsWith(".34")) s = "" + (Math.trunc(s) ? Math.trunc(s) : "") + "&#x2153;";
//  else if (s.toString().endsWith(".66")) s = "" + (Math.trunc(s) ? Math.trunc(s) : "") + "&#x2154;";
//  else if (s.toString().endsWith(".67")) s = "" + (Math.trunc(s) ? Math.trunc(s) : "") + "&#x2154;";

  return s;
}

/**************************************************************************
   Get the length of an Object list
***************************************************************************/
function getLength(obj) {
  if (obj) return Object.keys(obj).length;
  else return 0;
}
/**************************************************************************
   Pluralize and number most regular nouns.
   e.g. pluralize("turn",1) returns "1 turn"
        pluralize("turn",2) returns "2 turns"
***************************************************************************/
function pluralize(str, num) {
  if (num > 1) {
    // add rules for making more plurals here, when needed
    if (str.endsWith("y")) {
      str = str.substring(0, str.length - 1) + "ies";
    } else {
      str +="s";
    }
    return ""+num+" "+str;
  }

  else return "1 "+str;
}

/************************************************************************//**
  Return true if the word is probably plural
  has equivalent in nation.c also
 ****************************************************************************/
function is_word_plural(word)
{
  if (!word) return false;
  var len = word.length;
  if (len<3) return false;
  if (word.endsWith("ss")) return false; // -ss are singular
  if (word.endsWith("s II")) return true; // Workers II, Barracks II
  if (word.endsWith("men")) return true; // Pikemen, Riflemen, etc.
  if (word.endsWith("nfantry")) return true; // Mechanized Infantry
  if (word.endsWith("rtillery")) return true;

  /* Exceptions I */
  if (word.endsWith("AWACS")) return false; // names end in small 's'
  if (word.endsWith("JTIDS")) return false; // names end in small 's'
  if (word.endsWith("United Nations")) return false; // debatable ;)*/
  /* Exceptions II, currently not needed / unimportant.
  if (word.endsWith("s III")) return true;  // Barracks III, et similia
  if (word.endsWith("solos")) return false; // Mausoleum of Mausolos
  if (word.endsWith("temis")) return false; // Temple of Artemis
  if (word.endsWith("Zeus")) return false;} // Statue of Zeus
  the above don't come up or in the case of Barracks, plurality seems loose */

  if (word.endsWith("s")) return true;

  return false;
}

/************************************************************************//**
  A way to get a random number from a seed, since javascript can't.
 ****************************************************************************/
function mulberry_random(seed, max) {
  var t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return Math.trunc(((t ^ t >>> 14) >>> 0) / 4294967296 * max);
}

