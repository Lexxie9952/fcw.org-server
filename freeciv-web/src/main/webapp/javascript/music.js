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
var DEBUG_AUDIO = 0;            // 0=none, 1=light, 2=normal, 3=verbose
var DEBUG_TESTLOAD_ALL = false;  // force load all tracks to check for errors
var audio = null;

var playcount;                  // BitVector for whether each song has been played
var banned_tracks;              // BitVector for songs out of which the user has opted ;)
var tracklist_loaded = false;
var filtered_tracklist = [];    // A constructed list from tracklist of all tracks that are legal to be played
var music_modality = "normal";  // client can switch modes for what kinda music to play (battle music)

/* Breaks every nth song get separate list and management vars: */
const breakfrequency = 4;       // the 'n' for breaking every nth song
var filtered_breaklist = [];    // A constructed list from breaklist of all break-tracks that are legal to play
var trackcounter = 0;           // # of tracks played so far (used to determine if we get a break)
var current_track_info;         // allows inspecting the current playing track (for debug or other purposes)
/**************************************************************************
...Called the first time in a session before a track is to be played. This
   sets up all our data structures and maintenance vars.
**************************************************************************/
function tracklist_init() {
  music_modality = simpleStorage.get("music_modality");
  if (!music_modality) music_modality = "normal";
  $("#select_music_modality").val(music_modality);
  if (tracklist_loaded) return;
  if (DEBUG_AUDIO >= 2) console.log("tracklist_init()");

  handle_game_uid();

  // Set all .id properties
  for (track in tracklist) {
    tracklist[track]['id'] = parseInt(track);
  }
  // Retrieve or set playcount bitvector here:
  let playcount_data = simpleStorage.get("playcount"+Game_UID);

  if (DEBUG_AUDIO >= 3) console.log(playcount_data);

  if (playcount_data == null) {
    playcount = new BitVector([]);
    if (DEBUG_AUDIO >= 2) console.log("tracklist_init() playcount null BitVector. Making a new one.");
  } else {
    playcount = new BitVector(playcount_data);
    if (DEBUG_AUDIO >= 2) console.log("tracklist_init() got a playcount BitVector for Game_UID:"+Game_UID);
  }

  let banned_tracks_data = simpleStorage.get("banned_tracks");
  if (DEBUG_AUDIO >= 3) console.log(banned_tracks_data);

  if (banned_tracks_data == null) {
    banned_tracks = new BitVector([]);
    if (DEBUG_AUDIO >= 2) console.log("tracklist_init() banned_tracks null BitVector. Making a new one.");
  } else {
    banned_tracks = new BitVector(banned_tracks_data);
    if (DEBUG_AUDIO >= 2) console.log("tracklist_init() got a banned_tracks BitVector ");
  }

  // Make the filtered tracklist:
  do_filtered_tracklist();

  /* Do same as all the above for the breaklist (except no simpleStorage for these) */
  for (track in breaklist) {
    breaklist[track]['id'] = parseInt(track);
  }
  do_filtered_breaklist();

  tracklist_loaded = true;
  audio_add_skip_button();
}

/**************************************************************************
  Constructs a parallel filtered_tracklist of legal tracks available,
  used by the DJ selection algorithm. 'override' sets all tracks as legal.
  'override' forces all tracks as legal.
**************************************************************************/
function do_filtered_tracklist(override) {
  // Reset the tracklist
  filtered_tracklist = [];
  for (track in tracklist) {
    if (!override && !is_legal_track(track)) continue;
    // Priority tracks go to the top of the list
    if (is_priority_track(track, false)) {
      filtered_tracklist.splice(0, 0, tracklist[track]);
    }
    // Normal case:
    else {
      filtered_tracklist.push(tracklist[track]);
    }
  }
}
/**************************************************************************
  Whether track #tr has a priority tag.  'test_filtered', if true,
  instructs it to check filtered_tracklist rather than tracklist
**************************************************************************/
function is_priority_track(tr, test_filtered) {
  try {

    if (test_filtered) {
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

  } // Caught exceptions expose corrupt data from data entry errors:
  catch(err) {
    console.log(err);
    console.log("is_priority_track("
                +(test_filtered?"filtered":"master"+") failed on track "+tr))
  }
  return false;
}

/**************************************************************************
   After every legal song played once, this function is used to reconstruct
   a fresh filtered_tracklist. And resets the playcount BitVector.

   If condition tags render no legal playlist, 'override' flag can be used
   to force all tracks to be rendered legal.
**************************************************************************/
function reset_filtered_tracklist(override) {
  if (DEBUG_AUDIO >= 1) console.log("reset_filtered_tracklist()");

  // Clear the playcounts for all tracks
  for (track in tracklist) {
    /* After a reset, we don't want to FIFO all the priority tracks, because
       'priority' tracks are for playing a track when a context first comes
       true. Not predictably and overmuch playing it first every time we
       reset the filtered_tracklist. So, literally un-prioritize such tracks: */
    if (playcount.isSet(track)
        && tracklist[track].conditions[0][0].priority == "priority") {
      tracklist[track].conditions[0][0].priority = null;
      /* After next login it gains its priority again but, then it's too
         late to really come first. ;) TODO? simpleStorage.set another bit
         vector for fulfilled priorities? Yeah if we start to experience
         annoyance at how often reset tracklists overplay certain songs.
         But it might not be too bad since a large soundtrack means old
         contexts expire and new contexts come true by the time the tracklist
         finishes. NB: this is especially true the more we chronological
         sort all the tracks in tracklist.js. */
    }
    /* NB: We do NOT unset the playcount of all tracks because we might be in a different
     * modality. We only want to reset all the tracks that have been played within the
     * current modality. Otherwise we'd get repetition of songs in other modalities
     * when returning to those modalities, just from depleting all songs in cur.modality.
     * Here some reductive logic works nicely: we don't care about tracks that are already
     * not set (invalid for other reasons), such that any SET track that comes up legal
     * when unset is a test for it being within the current modality, and those are the
     * only ones we want to reset, QED.
     */
    if (playcount.isSet(track)) {      // No need to unset a track that's not set
      /* logic trick: unsetting before we know if it's legal in our modality allows us
         to TEST if it's in our modality (because songs invalid for other reasons
         weren't set and don't arrive at this code anyway! */
      playcount.unset(track);
      if (is_legal_track(track)) {     // the track is legal so needs to remain unset so it can be played again
        /* do nothing, track was already unset in order to test it. */
      } else { /* The track was not legal, so not in our modality. Set it back to
                  'played' so it's not replayed when we return to its modality. */
        playcount.set(track);
      }
    }
  }

  if (override) {
    do_filtered_tracklist(override);
  }
  else {
    do_filtered_tracklist();
  }
  simpleStorage.set("playcount"+Game_UID, playcount.raw);
}

/**************************************************************************
   Receives a track number index to the master tracklist.
   Returns whether it is valid according to its tag conditions.
**************************************************************************/
function is_legal_track(track) {
  if (DEBUG_AUDIO >= 3) console.log("\n"+track+". ---------------------------------------"+tracklist[track].filepath+":")

  if (banned_tracks.isSet(track)) return false;

  if (client_is_observer()) {
    if (playcount.isSet(track)) return false;
    /* For now, EVERY unplayed track is legal to observers. In future,
       we could find the player with the nth best score and set plr_idx
       to that; but how important is context-DJ for observers? */
    return true;
  }

  var plr_idx = client.conn.playing.playerno;
  if (playcount.isSet(track)) return false; // Skip already played tracks

  /* tracklist[track].conditions are evaluated as true/false here.
  👉🏽 We evaluate logic in the form of (Operand_1 || ... || Operand_n) where
     each Operand is in the form of (Suboperand_1 && ... && Suboperand_n).
     For example, 4 Operands, some with multiple Suboperands:
     (A) || (B && C) || (!D) || (E && !F && !G)

     Under DeMorgan's Laws, any expression with any possible composition of
     AND, OR, (), and NOT, can be reformulated in the above structure (but
     it won't always be the simplest human-readable formulation.)
     TIP: if you want to do OR inside an Operand, you must split it into two
     Operands: e.g., (A && (B || !C)) gets rendered as (A && B) || (A && !C)

  An array of OR'd Operands interates via "or_index". Each Operand is an array of
  AND'd Suboperands iterated by "and_index". All Suboperands must be true for the
  Operand to be true. If ANY Operand is true, the whole expression is true.
  (See tracklist.js to see how the 'conditions' property structures the above.) */
  var or_legal = false;
  for (or_index in tracklist[track].conditions) {
    let and_legal = true;
    for (and_index in tracklist[track].conditions[or_index]) {
      if (!evaluate_condition(tracklist[track].conditions[or_index][and_index], plr_idx)) {
        and_legal = false; if (DEBUG_AUDIO >= 3) console.log("   sub-operand FALSE: renders operand FALSE.")
        break;
      } else if (DEBUG_AUDIO >= 3) console.log("  sub-operand TRUE &&");
    }
    if (and_legal == true) {
      or_legal = true;
      if (DEBUG_AUDIO >= 3) console.log(" all sub-operands TRUE: renders operand TRUE.")
      break;
    }
  }

  if (or_legal) {
    // Normal logic .conditions were true, now check modality
    let check_modality = true;  // defaults to true unless invalidated below:
    if (music_modality != "normal" || tracklist[track].modality) {
      // less data wasted to assume null/undefined track.modality means "normal":
      if (!tracklist[track].modality) {
        check_modality = evaluate_condition({"modality":"normal"});
      } else {
        check_modality = evaluate_condition({"modality":tracklist[track].modality})
      }
    }
    // If modality didn't invalidate, return true==this track is valid.
    return (check_modality != false);
  }

      if (DEBUG_AUDIO >= 3) console.log(" all operands FALSE: renders expression FALSE.")

      if (DEBUG_TESTLOAD_ALL) return true;
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

  // Undefined key/value pairs return true
  if (!key) return true;

  // Handle NOT operator:
  if (key.startsWith("!")) {
    not = true;             // flag to return !result
    key = key.substring(1); // strip off the !
  }
  // Not proper format but you'd be surprised how many typos come this way:
  if (typeof val === "string" && val.startsWith("!")) {
    not = true;
    val = val.substring(1);
    console.log("Condition has ! operator in value instead of key *************")
  }

  switch(key) {
    case "priority":  result = false; break; // in and of itself doesn't qualify track to always be played
    case "turn>":     result = (game_info.turn > parseInt(val)); break;
    case "turn<":     result = (game_info.turn < parseInt(val)); break;
    case "gov":       result = (governments[players[plr_idx]['government']].name == val); break;
    case "tech":      result = eval_tech(plr_idx,val);
     if (result==-1) {result=false;console.log(obj)};
     break;
    case "wonderplr": result = eval_wonderplr(plr_idx,val); break;
    case "wonderwld": result = eval_wonderwld(val); break;
    case "civ":       result = (styles[players[plr_idx].style].toLowerCase() == val.toLowerCase()); break;
    case "modality":  result = eval_modality(val); break;
    default:
      console.log("Music evaluate_condition() unrecognized key:"+key+". Please report!")
      result = true;  // unrecognised keys evaluate as true
  }
  if (DEBUG_AUDIO >= 2)
    console.log("evaluate: ("+(not?"!":"")+key+":"+val+"):"+ ((not ? !result : result)));
  if (not) return !result;
  return result;
}
/**************************************************************************
...evaluate tag .conditions:
***************************************************************************/
function eval_tech(plr_idx, val) {
  if (tech_id_by_name(val) === null) {
    console.log("********************************************* WARNING !!!");
    console.log("music.js:eval_tech tried to evaluate non-existent tech: "+val
    +", which may render song as never/always playable.");
    return -1;
  }
  return (playerno_knows_tech(plr_idx, val));
}
function eval_wonderwld(val) {
  w = improvement_id_by_name(val);
  // if ruleset doesn't have wonder:
  if (w==-1) {rr
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
  evals some tricky logic:  for battle music there are two kinds and
  multiple modalities to face it.
  1. tracks that are acceptable for a player wanting battle music only, but
     also normal acceptable in the soundtrack
  2. tracks that are so intense they are only acceptable for a player
     who wants battle music only.
  MEANWHILE, if player wants peaceful music, anything at all qualifying
    as possible battle music is filtered out; and also "!peaceful" tracks
**************************************************************************/
function eval_modality(val) {
                                                                                                if (DEBUG_AUDIO >= 2) console.log("music_modality:'"+music_modality+"' track.modality:'"+val+"'");
  // Player wants battle music:
  if (music_modality == "battle") {
    if (val == "normal" || val == "!peaceful") {  // !peaceful is how we disqualify from peaceful modality without playing it in battle modality
                                                                                                if (DEBUG_AUDIO >= 2) console.log("  wanted 'battle' modality, but not a battle track: eval_modality returns FALSE!")
      return false;
    }
    if (val.includes("battle")) {
                                                                                                if (DEBUG_AUDIO >= 2) console.log("  wanted 'battle' modality, and is a battle track: eval_modality returns TRUE!");
      return true;
    }
    if (val == "war&peace") { //"war&peace" is like "normal" but gets INCLUDED in battle modality
                                                                                                if (DEBUG_AUDIO >= 2) console.log("  wanted 'battle' modality, and qualifies under war&peace: eval_modality returns TRUE!");
      return true;
    }
                                                                                                if (DEBUG_AUDIO >= 2) console.log("  *** ERROR!: wanted 'battle' modality; fell thru to failover to TRUE! ****** SHOULDN'T HAPPEN");
    return true;
  }
  if (music_modality == "normal") {
    if (val == "battle only") {
                                                                                                if (DEBUG_AUDIO >= 2) console.log("  'battle only' track without battle modality, eval_modality returns FALSE!");
      return false;
    }
                                                                                                if (DEBUG_AUDIO >= 2) console.log("    '"+val+"' track allowed under 'normal' music_modality. eval_modality returns TRUE!");
    return true;
  }
  else if (music_modality == "peaceful") {
    if (val.includes("battle")) {
                                                                                                if (DEBUG_AUDIO >= 2) console.log("  'peaceful' modality rejecting a 'battle/[only]' track, eval_modality returns FALSE!");
      return false;
    }
    if (val == "!peaceful") {
                                                                                                if (DEBUG_AUDIO >= 2) console.log("  'peaceful' modality rejecting a '!peaceful' track, eval_modality returns FALSE!");
      return false;
    }
                                                                                                if (DEBUG_AUDIO >= 2) console.log("  'peaceful' modality accepted val:"+val+". eval_modality returns TRUE!");
    return true; // normal and war@peace get to this point and get qualified
  }
  if (music_modality == "all") {
                                                                                                if (DEBUG_AUDIO >= 2) console.log("  'all' modality: eval_modality returns TRUE!");
    return true;
  }
  console.log("************  Shouldn't happen: eval_modality() double fail-falls through and returns TRUE! *********** ERROR!!");
  console.log(val+":val, "+music_modality+":music_modality");

  return true;
}

/**************************************************************************
  Function to change modality of the music. Does not reset the playcount,
  (unless it needs to), so that changing modality doesn't force us to re-
  hear stuff again. possible vals:
  〰 〰 〰 〰 〰 〰 〰 〰 〰 〰 〰 〰 〰
  normal  = play all modalities except "battle only"
  battle  = play only "battle" and "battle only" modalities
  peaceful= do not play modalities "battle", "battle only", "!peaceful"
  all     = play all modalities
**************************************************************************/
function change_modality(val) {
  if (DEBUG_AUDIO >= 2) console.log("change_modality("+val+")");

  if (!val) val = "normal";

  if (music_modality == val) {
    if (DEBUG_AUDIO >= 2) console.log(music_modality+" == "+val+"; no change executed.")
    return;
  }
  else {
    music_modality = val;
    // Any change of music_modality needs to always do housekeeping:
    simpleStorage.set("music_modality", val);
    $("#select_music_modality").val(val);

    do_filtered_tracklist();
    if (!filtered_tracklist.length) {
      reset_filtered_tracklist();
      if (!filtered_tracklist.length) {
        reset_filtered_tracklist(true);
      }
    }
  }
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
  if (DEBUG_AUDIO >= 1) console.log("reset_filtered_breaklist()");

  if (override) {
    do_filtered_breaklist(override);
  } else do_filtered_breaklist();
}

/**************************************************************************
   Receives a track number index to the master tracklist.
   Returns whether tags evaluate as allowed to be played.
   music_modality not evaluated in breaklist
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

  track_name = filtered_breaklist[f_track]['filepath']
             + get_extension(filtered_breaklist[f_track]);

        if (DEBUG_AUDIO >= 1) console.log("  Break #"+(f_track+1)
                           + " of "+filtered_breaklist.length
                           + ". Playing "+track_name);

  filtered_breaklist.splice(f_track, 1);

  return track_name;
}

/**************************************************************************
...Gets the format file extension if not default (mp3)
**************************************************************************/
function get_extension(track_object) {
  if (!track_object) return ".mp3";
  if (track_object.f) {
    return "." + track_object.f;
  }
  else return ".mp3";
}

/**************************************************************************
...Picks a random track to play for audioplayer
**************************************************************************/
function pick_next_track() {
  if (DEBUG_AUDIO >= 2) console.log("pick_next_track()");
  if (!audio) return;

  if (DEBUG_TESTLOAD_ALL) setTimeout(pick_next_track, 1450);

  var f_track;
  var track_name;
  /* When game first loads we still need to prime the audio pump and get it
     playing something; and preferably not start music right away: */
  if (!tracklist_loaded) {
    track_name = silent_track;
  }
  else {
    trackcounter ++;
    /* Every nth track is a short interlude */
    if (trackcounter % breakfrequency == 0) {
      track_name = get_filtered_break();
      current_track_info = null;
      audio_ban_button_state("hide"); // can't ban break tracks
    }
    else if (Math.floor(Math.random() * 10) == 0) {  // 25% + (1/10 × 3/4) = 32.5 %
      track_name = silent_track;
      current_track_info = null;
      audio_ban_button_state("hide");  // can't ban silent breaks
      if (DEBUG_AUDIO >= 1) console.log("  Random silent break injected. Playing "+track_name);
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
      track_name = filtered_tracklist[f_track]['filepath'] + get_extension(filtered_tracklist[f_track]);

      if (DEBUG_AUDIO >= 1) console.log("Song track #"+(f_track+1)+" of "+filtered_tracklist.length+". Playing "+track_name);

      /* Register this track as played, for future sessions. Note the index in our
      filtered_tracklist is not same as in tracklist; we use retrieved 'id':  */
      playcount.set(filtered_tracklist[f_track].id)
      simpleStorage.set("playcount"+Game_UID, playcount.raw);
      // Remove this track from list of legal future selections:
      current_track_info = filtered_tracklist[f_track];
      filtered_tracklist.splice(f_track, 1);
      audio_ban_button_state("show");  // songs from main soundtrack are 'bannable', make ban button enabled
    }
  }
  try {
    audio.load("/music/" + track_name);
    return true;
  } catch (err) {
    console.log(track_name+": audio.load() had exception:");
    console.log(err);
    return false; // Three strikes you're out.
  }
}

/**************************************************************************
...
**************************************************************************/
function unban_tracks() {
  for (tr in tracklist) {
    banned_tracks.unset(tr);
  }
  simpleStorage.set("banned_tracks", banned_tracks.raw);
}
/**************************************************************************
...
**************************************************************************/
function ban_current_track() {

  if (current_track_info) {
    if (banned_tracks.isSet(current_track_info['id'])) {
      // clicking twice (i.e. banning an already banned), unbans all tracks:
      unban_tracks();
      add_client_message("All banned tracks reset to playable.")
      return;
    }
    // clicking an unbanned track bans it:
    banned_tracks.set(current_track_info['id']);
    simpleStorage.set("banned_tracks", banned_tracks.raw);
  }
}
/**************************************************************************
...
**************************************************************************/
function audio_initialize()
{
  if (DEBUG_AUDIO >= 2) console.log("audio_initialize()");

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
    audio.setVolume(0.225); // make music proportionate to other sound effects
  });
}

/**************************************************************************
...add in a hacked button to play next track to the audio component;
   clean up some other styling while we're at it.
**************************************************************************/
function audio_add_skip_button() {
  skip_html = '<span id="audio_skip" onclick="javascript:{if (pick_next_track()) audio.play();}" title="Skip to next track (shift-\\)" style="cursor:pointer; width: 25px; height: 40px; padding: 0px 8px 0px 8px; margin-top: -1px; float:right; overflow: hidden; border-left: 1px solid #000; font-size:16px">&#9197;</span>';
  ban_html = '<span id="audio_ban" onclick="javascript:{ban_current_track();if (pick_next_track()) audio.play();}" style="cursor:pointer; width: 25px; height: 40px; padding: 0px 8px 0px 8px; margin-top: -1px; float:right; overflow: hidden; border-left: 1px solid #000; font-size:16px" title="Start soundtrack">👉🏼</span>';

  $("#audiojs_wrapper0").children().first().next().next().next().children().first().next().after(skip_html);
  $("#audiojs_wrapper0").children().first().next().next().next().children().first().next().next().after(ban_html);

  $('#audio_skip').tooltip({
    tooltipClass: "wider-tooltip" , position: { my:"center bottom", at: "center top-3"},
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });
  $('#audio_ban').tooltip({
    tooltipClass: "wider-tooltip" , position: { my:"center bottom", at: "center top-3"},
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });
  $('#select_music_modality').tooltip({
    tooltipClass: "wider-tooltip" , position: { my:"center bottom", at: "center top-3"},
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });
  $('.play').tooltip({
    tooltipClass: "wider-tooltip" , position: { my:"left bottom", at: "left-90 bottom-40"},
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });
  $('.pause').tooltip({
    tooltipClass: "wider-tooltip" , position: { my:"left bottom", at: "left-90 bottom-40"},
    show: { delay:200, effect:"none", duration: 0 }, hide: {delay:120, effect:"none", duration: 0}
  });
  $(".play").attr("title", "Pause this track.")
  $(".pause").attr("title", "Play this track.")
}
/**************************************************************************
...
**************************************************************************/
function audio_ban_button_state(state) {
  if (state=="hide") {
    $("#audio_ban").html("👉🏼");
    $("#audio_ban").attr("title","Start next track");
  }
  else {
    $("#audio_ban").html("👎🏼");
    $("#audio_ban").attr("title","Ban this track\nClick twice to reset all bans.");
  }
}
/**************************************************************************
...
**************************************************************************/
function supports_mp3() {
  var a = document.createElement('audio');
  return !!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
}
