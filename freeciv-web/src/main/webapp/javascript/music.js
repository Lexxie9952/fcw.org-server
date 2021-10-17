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
var trackcounter = 0;  // # of tracks played so far
var jukebox = {};      // keeps track of what songs are already played


/**************************************************************************
...
**************************************************************************/
function audio_initialize()
{
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

function supports_mp3() {
  var a = document.createElement('audio');
  return !!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
}

/**************************************************************************
...Picks a random track to play for audioplayer
**************************************************************************/
function pick_next_track() {
  if (!audio) return;
  
  var category;
  var track_name = null;  
  var fallthru_counter = 100; // because multiple instances of same track 
  var dj_approved = false;
  var style;
  
  // TODO: currently based on known techs for standard rulesets. Later,
  // this function will take event-mood tags then construct other tags
  // based on YEAR, civilization style, turn #, etc., and use more special
  // "DJ tag logic" to pick a song.
  if (client_is_observer()) {
    if      (game_info.turn <= 12) category = "tribal"
    else if (game_info.turn < 45)  category = "ancient"
    else if (game_info.turn < 70)  category = "middle"
    else if (game_info.turn < 85)  category = "colonial"
    else if (game_info.turn < 100) category = "industrial"
    else category = "modern"
    dj_approved = true;
    track_name = music_list[category][Math.floor(Math.random() * music_list[category].length)] + ".mp3";
  }
  else { // Client is player
    // One of 4 tracks is a short interlude in the style of one's nation
    style = client.conn.playing.style;
    if (trackcounter/4 == Math.trunc(trackcounter/4)) {
      category = "brk_style"+(style+1);
      track_name = music_list[category][Math.floor(Math.random() * music_list[category].length)]+ ".mp3";
      dj_approved = true;
    } else { // Not a break track, pick a main selection at random
        if      (game_info.turn <= 12 && !tech_known("Alphabet"))        category = "tribal";
        else if (!tech_known("Feudalism") && !tech_known("Monotheism"))  category = "ancient";
        else if (!tech_known("Gunpowder") && !tech_known("Magnetism"))   category = "middle";
        else if (!tech_known("Industrialization") || !tech_known("Conscription")) category = "colonial"; // need both to leave colonial
        else if (!tech_known("Rocketry") && !tech_known("Robotics")) category = "industrial";
        else category = "modern";

        // Pick a random track with the approved qualities for the game context:
        do {
            var random_track = Math.floor(Math.random() * music_list[category].length);
            track_name = music_list[category][random_track] + ".mp3";
            if (jukebox[track_name]) continue; // never pick same song twice in a session
            // remove track from future picks
            if (music_list[category].length) {
              music_list[category].splice(random_track,1);
              dj_approved = true;
            }
        } while (!dj_approved && fallthru_counter-- >= 0)
    }
  }
  
  if (!track_name || !dj_approved || fallthru_counter < 1) {
    return false; // ran out of songs
  }

  if (DEBUG_AUDIO) console.log("Track %d. Playing %s",trackcounter, track_name);
  audio.load("/music/" + track_name);
  jukebox[track_name] = true;
  trackcounter ++;

  return true;
}

