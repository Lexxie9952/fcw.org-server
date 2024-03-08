/*****************************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2009-2021  The Freeciv-web project

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
******************************************************************************/
var DEBUG_AUDIO = false;
var audio = null;

var playcount;                // BitVector for whether each song has been played
var tracklist_loaded = false;
var filtered_tracklist = [];  // A constructed list from tracklist of all tracks that are legal to be played
var music_modality = null;    // client can switch modes for what kinda music to play (battle music)

/* Breaks every nth song get separate list and management vars: */
const breakfrequency = 4;     // the 'n' for breaking every nth song
var filtered_breaklist = [];  // A constructed list from breaklist of all break-tracks that are legal to play
var trackcounter = 0;         // # of tracks played so far (used to determine if we get a break)

/**************************************************************************
...Called the first time in a session before a track is to be played. This
   sets up all our data structures and maintenance vars.
**************************************************************************/
function tracklist_init() {
  if (tracklist_loaded) return;
  if (DEBUG_AUDIO) console.log("tracklist_init()");

  handle_game_uid();

  // Set all .id properties
  for (track in tracklist) {
    tracklist[track]['id'] = parseInt(track);
  }
  // Retrieve or set playcount bitvector here:
  let playcount_data = simpleStorage.get("playcount"+Game_UID);
  if (DEBUG_AUDIO) console.log(playcount_data);

  if (playcount_data == null) {
    playcount = new BitVector([]);
    if (DEBUG_AUDIO) console.log("tracklist_init() retrieved null BitVector. Making a new one.");
  } else {
    playcount = new BitVector(playcount_data);
    if (DEBUG_AUDIO) console.log("tracklist_init() retrieved a BitVector for Game_UID:"+Game_UID);
  }
  // Make the filtered tracklist:
  do_filtered_tracklist();

  /* Do same as all the above for the breaklist (except no simpleStorage for these) */
  for (track in breaklist) {
    breaklist[track]['id'] = parseInt(track);
  }
  do_filtered_breaklist();

  tracklist_loaded = true;
}

/**************************************************************************
  Constructs a parallel filtered_tracklist of legal tracks available,
  used by the DJ selection algorithm. 'override' sets all tracks as legal.
  'override' is flag if no legal tracks, to force all tracks as legal.
**************************************************************************/
function do_filtered_tracklist(override) {
  // Reset the tracklist
  filtered_tracklist = [];
  for (track in tracklist) {
    if (!override && !is_legal_track(track)) continue;
    // Priority tracks go to the top of the list
    if (is_priority_track(track, false)) {
      //console.log("PRIORITY FOUND");
      filtered_tracklist.splice(0, 0, tracklist[track]);
    }
    // Normal case:
    else {
      filtered_tracklist.push(tracklist[track]);
    }
  }
}
/**************************************************************************
  Whether track #tr has a priority tag.  'is_filtered_tracklist', if
  true, instructs it to check filtered_tracklist rather than tracklist
**************************************************************************/
function is_priority_track(tr, is_filtered_tracklist) {
  if (is_filtered_tracklist) {
    if (filtered_tracklist[tr].conditions[0][0].priority == "priority") {
      return true;
    }
    else return false;
  }
  else {
    if (tracklist[tr].conditions[0][0].priority == "priority") {
      return true;
    }
    else return false;
  }
}

/**************************************************************************
   After we've played every legal song once, there are no more to play.
   This function reconstructs the filtered_tracklist again for a fresh
   playlist. And resets the playcount BitVector.

   override is a "shouldn't happen" condition when no tags render a
   playlist, to force all songs to be legal.
**************************************************************************/
function reset_filtered_tracklist(override) {
  if (DEBUG_AUDIO) console.log("reset_filtered_tracklist()");
  // Clear the playcounts for all tracks
  for (track in tracklist) {
    playcount.unset(track);
  }
  if (override) {
    do_filtered_tracklist(override);
  } else do_filtered_tracklist();
  simpleStorage.set("playcount"+Game_UID, playcount.raw);
}

/**************************************************************************
   Receives a track number index to the master tracklist.
   Returns whether it is valid according to its tag conditions.
**************************************************************************/
function is_legal_track(track) {
  //if (DEBUG_AUDIO) console.log("\n----------------------------------------"+tracklist[track].filepath+":")
  if (client_is_observer()) {
    /* For now, best way to handle that we have no player info to evaluate
       logical conditions. In future, we can take the player with the
       nth best score and 'become them' in a virtual pseudo entity */
    if (playcount.isSet(track)) return false;
    else return true;
  }
  plr_idx = client.conn.playing.playerno;

  /* If this track has been played before, it's not legal to play again: */
  if (playcount.isSet(track)) return false;

  /* The legality of tracklist[track].conditions are evaluated here:
     We evaluate logic conditions in the form of "OR'd operands", such as:
        (A) || (B && C) || !D || (E && !F && !G)    {4 parenthesized operands}

     *(Any operand of the form (B || !C) can be evaluated by simplifying the
     single operand out into two higher tier operands: e.g., (B) || (!C) ...

     Each parenthesized operand between OR's is an "or_index": only one of them
     is needed to evaluate the whole "expression" as true. Inside each operand
     is an array of and_index length where all must evaluate true for that single
     operand to be true—and thus also the whole thing since only one or_index
     need be true. (See tracklist.js for how a 2D array specifies an expression
     like the example higher above.) */
  var or_legal = false;
  for (or_index in tracklist[track].conditions) {
    let and_legal = true;
    for (and_index in tracklist[track].conditions[or_index]) {
      if (!evaluate_condition(tracklist[track].conditions[or_index][and_index], plr_idx)) {
        and_legal = false; //if (DEBUG_AUDIO) console.log("   sub-operand was FALSE: renders whole operand FALSE.")
        break;
      } //else if (DEBUG_AUDIO) console.log("  sub-operand was TRUE: (if all true, operand true)");
    }
    if (and_legal == true) {
      or_legal = true; //if (DEBUG_AUDIO) console.log(" all sub-operands were TRUE, renders whole expression TRUE.")
      break;
    }
  }
  if (or_legal) return true;
  //if (DEBUG_AUDIO) console.log(" all sub-operands were FALSE, renders whole expression FALSE.")
  return false;
}
/**************************************************************************
  Wrapper that evaluates a single {tag,value} pair in tracklist conditions
  as true or false:
**************************************************************************/
function evaluate_condition(obj, plr_idx)
{
  var result = false;
  var not = false;

  var key = Object.keys(obj)[0];
  var val = obj[key];

  //if (DEBUG_AUDIO) console.log("  evaluate condition: ("+key+":"+val+")");

  // Undefined key/value pairs return true
  if (!key) return true;

  // Handle NOT operator:
  if (key.startsWith("!")) {
    not = true;             // flag to return !result
    key = key.substring(1); // strip off the !
  }

  switch(key) {
    case "priority":  result = false; break; // in and of itself doesn't qualify track to always be played
    case "turn>":     result = (game_info.turn > val); break;
    case "turn<":     result = (game_info.turn < val); break;
    case "gov":       result = (governments[players[plr_idx]['government']].name == val); break;
    case "tech":      result = (playerno_knows_tech(plr_idx, val)); break;
    case "wonderplr": result = eval_wonderplr(plr_idx,val); break;
    case "wonderwld": result = eval_wonderwld(val); break;
    case "civ":       result = (styles[players[plr_idx].style].toLowerCase() == val.toLowerCase()); break;
    case "modality":  result = (music_modality == val); break;
    default:
      result = true;  // unrecognised keys evaluate as true
  }

  if (not) return !result;
  return result;
}
/**************************************************************************
...evaluate tag .conditions for wonders:
***************************************************************************/
function eval_wonderwld(val) {
  w = improvement_id_by_name(val);
  // if ruleset doesn't have wonder:
  if (w==-1) {
    // !wonderwld == !false == true; wonderwld == false
    return false;
  }
  for (var p=0; p < Object.keys(players).length; p++) {
    if (players[p].wonders[w] != 0) {
      return true;
    }
  }
  return false;
}
function eval_wonderplr(plr_idx, val) {
  w = improvement_id_by_name(val);
  if (w==-1) {
    // !wonderplr == !false = true; wondrplr == false
    return false;
  }
  return player_has_wonder(plr_idx, w);
}

/**************************************************************************
   Constructs a filtered_breaklist of legal tracks available, used
   for in-between short break songs. 'override' sets all tracks as legal.
**************************************************************************/
function do_filtered_breaklist(override) {
  // Reset the breaklist
  filtered_breaklist = [];
  for (track in breaklist) {
    if (!override && !is_legal_break(track)) {
      continue;
    }
    filtered_breaklist.push(breaklist[track]);
  }
}
/**************************************************************************
   When we've played every legal song once, then there are no more to
   play. Thus this function reconstructs the filtered_tracklist
   again for a fresh playlist.
   'override' is for rare condition if all tag conditions rendered false,
   which then allows any song to play.
**************************************************************************/
function reset_filtered_breaklist(override) {
  if (DEBUG_AUDIO) console.log("reset_filtered_breaklist()");

  if (override) {
    do_filtered_breaklist(override);
  } else do_filtered_breaklist();
}

/**************************************************************************
   Receives a track number index to the master tracklist.
   Returns whether tags evaluate as allowed to be played.
   (NB: that all tracks in the filtered_tracklist are valid.)
**************************************************************************/
function is_legal_break(track) {
  if (client_is_observer()) {
    return true;
  }
  plr_idx = client.conn.playing.playerno;

  var or_legal = false;
  for (or_index in breaklist[track].conditions) {
    let and_legal = true;
    for (and_index in breaklist[track].conditions[or_index]) {
      if (!evaluate_condition(breaklist[track].conditions[or_index][and_index], plr_idx)) {
        and_legal = false;
        break;
      }
    }
    if (and_legal == true) {
      or_legal = true;
      break;
    }
  }
  return or_legal;
}

/**************************************************************************
...Picks a random track to play for audioplayer
**************************************************************************/
function get_filtered_break() {
  var f_track;

  /* Pick a random break-track from the filtered_breaklist of songs,
     with approved qualities for the game context: */
  if (filtered_breaklist.length == 0) {
    reset_filtered_breaklist();
    if (filtered_breaklist.length == 0) {
      reset_filtered_breaklist(true);
    }
  }
  f_track = Math.floor(Math.random() * filtered_breaklist.length);

  track_name = filtered_breaklist[f_track]['filepath'] + ".mp3";
  if (DEBUG_AUDIO) console.log("Break #"+(f_track+1)+" of "+filtered_breaklist.length+". Playing "+track_name);
  filtered_breaklist.splice(f_track, 1);

  return track_name;
}

/**************************************************************************
...Picks a random track to play for audioplayer
**************************************************************************/
function pick_next_track() {
  if (DEBUG_AUDIO) console.log("pick_next_track()");
  if (!audio) return;

  var f_track;
  var track_name;
  /* When game first loads we still need to prime the audio pump and get it
     playing something; and preferably not start music right away: */
  if (!tracklist_loaded) {
    track_name = silent_track + ".mp3";
  }
  else {
    trackcounter ++;
    /* Every nth track is a short interlude */
    if (trackcounter % breakfrequency == 0) {
      track_name = get_filtered_break();
    }
    /* Not a break-track, but rather a normal track. Pick a random track from the
       filtered_tracklist of songs with approved qualities for the game context: */
    else {
      if (filtered_tracklist.length == 0) {
        reset_filtered_tracklist();
        if (filtered_tracklist.length == 0) {
          reset_filtered_tracklist(true);
        }
      }
      // If we have a priority track queued at top of list, pick it:
      if (filtered_tracklist.length > 0 && is_priority_track(0, true)) {
        f_track = 0;
      }
      // Otherwise pick a random track from remaining list of unplayed appropriate tracks:
      else {
        f_track = Math.floor(Math.random() * filtered_tracklist.length);
      }
      //if (DEBUG_AUDIO) console.log("f_track "+(f_track)+" f_t.len== "+filtered_tracklist.length);
      track_name = filtered_tracklist[f_track]['filepath'] + ".mp3";

      if (DEBUG_AUDIO) console.log("Song track #"+(f_track+1)+" of "+filtered_tracklist.length+". Playing "+track_name);

      /* Register this track as played, for future sessions. Note the index in our
      filtered_tracklist is not same as in tracklist; we use retrieved 'id':  */
      playcount.set(filtered_tracklist[f_track].id)
      simpleStorage.set("playcount"+Game_UID, playcount.raw);
      // Remove this track from list of legal future selections:
      filtered_tracklist.splice(f_track, 1);
    }
  }
  try {
    audio.load("/music/" + track_name);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

/**************************************************************************
...
**************************************************************************/
function audio_initialize()
{
  if (DEBUG_AUDIO) console.log("audio_initialize()");

  /* Initialze audio.js music player */
  audiojs.events.ready(function() {
    var as = audiojs.createAll({
          trackEnded: function() {
            if (supports_mp3()) {
              if (pick_next_track()) audio.play();
            }
          },
          play: function() {
            play_music = true;
            simpleStorage.set('play_music', true);
            $(".play").show();
            $(".pause").hide();
            $(".error").hide();
          },
          pause: function() {
            play_music = false;
            simpleStorage.set('play_music', false);
            $(".pause").show();
            $(".play").hide();
            $(".error").hide();
          }
        });
    audio = as[0];
    audio.setVolume(0.10); // make music proportionate to other sound effects
  });

}

/**************************************************************************
...
**************************************************************************/
function supports_mp3() {
  var a = document.createElement('audio');
  return !!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
}
