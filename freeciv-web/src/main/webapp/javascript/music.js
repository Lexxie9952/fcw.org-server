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

/****************************************************************************
If including art on an instance with public access, abide by the below:

   1. Music and static or animated visual imagery ("Art") is presumed
      copyrighted by the author who created it.
   2. Only the original author can release a copyright to render Art as
      General Public License ("GPL".) Artistic content ("Material") does
      not become licensed as GPL unless submitted by its author or
      designated legal agent. 
   4. Including such Material in a repository for copy or download is a
      copyright and/or GPL violation in most jurisdictions, if no other
      licensing was made operative. This includes copyrighted Material
      which would otherwise be permissibly represented/reproduced under
      Fair Use provisions or other licensing.
   5. In some contexts, copyrighted Art may be included or externally
      accessed or referenced from a publicly accessible AGPL project
      ("Instance")——but not public respository thereof——under Fair Use,
      other licensing, or GPL exemptions. There may be strong 
      restrictions, such as but not limited to: ownership (you own the Art
      through a purchase not subject to an End User Agreement restricting the
      rights of said purchase); no entity profits from the site and the
      totality of income and donations pay operating fees (Fair Use) or
      licensing fees (royalty agreements); the Material is not essential to
      the function of the Instance (GPL). In the case of copyright or licensing
      permissions, other regional restrictions and arrangements may be operative
      between your jursidiction, the jurisdiction of the website, and in some
      cases, the jurisdictions of the users of the site. This may be excepted
      under royalty arrangements and alternative licensing agreements.
   6. An Instance may access legally available Material from external sources
      such as the Internet or user-supplied data whether referential or
      essential, though such Material is by its nature not inclusive to the GPL.
   7. When dual-licensing with Creative Commons or other licensing, or relying
      on Fair Use, it is strongly advised to retain qualified legal counsel on
      Intellectual Property law. Most internet sources on dual-licensing are
      incomplete, which renders them partially false and therefore in certain
      cases wholly false.
   8. An AGPL project with dual-licensing of Material must operate with
      non-dependence on the aforementioned; that is, not be dependent upon
      that Material for it to perform any of its essential purposes, operations,
      functions, determinations, representations, or results.
   9. Mark all CC-BY-NC-ND or other dual-licensed Material separately from
      GPL Material lest it be presumed as GPL under the provisions of same,
      and accordingly, then conflict with the Material's original rights under
      copyright and/or other licensing arrangements or Fair Use exceptions.

Freeciv-Web is AGPL inclusive of GPL. The project cannot know the
jurisdiction nor individual ownership and/or sub-licensing of Art of any
particular Instance of Freeciv-Web. Any dual-licensing arrangements partaken
by individual Instances of Freeciv-Web are not affiliated with the original
AGPL project yet must remain compliant to the original licensing thereof.
Dual-licensed Instances become the user's sole responsibility with respect
to legal and licensing compliance of Material.    
******************************************************************************/

var DEBUG_AUDIO = false;
var audio = null;
var trackcounter = 0;  // # of tracks played so far
var jukebox = {};      // keeps track of what songs are already played


/* Statement of dual-licensed content.

   July 2021. Contra Costa county, California, United States of America.
              Mittelfranken, Bayern, Bundesrepublik Deutschland (EU).

   freecivweb.org music selections are a combination of GPL in AGPL,
   CC-BY-NC-ND, sub-licensed, and Fair Use copyrighted material under
   Section 107 of the United States Copyright Act in intersectional abidance
   where applicable with Urheberrechtsgesetz, UrhG Bundesrepublik Deutschland
   and the supercession of EU Copyright Directive 93/98/EEC.
   * * *
   The content of the following is AGPL, while the content it references
   is external to the project and/or dual-licensed under one of the
   above measures except where individually denoted below. */ 
const music_list = { 
  "brk_style1": // european *
  [
    "breaks/british",  
    "breaks/byzantine",  
    "breaks/french",  
    "breaks/goth",  
    "breaks/italian",
    "breaks/magyar",  
    "breaks/portuguese",  
    "breaks/slav",  
    "breaks/spanish",  
    "breaks/teuton",  
    "breaks/viking",
    "breaks/ambientbreak1",
    "breaks/wardrumbreak",
    "breaks/Ascension",
    "breaks/FlowingRiverBreak",
    "breaks/BoysEye",
    "breaks/30secondbreak",
    "breaks/30secondbreak",
    "breaks/ColdWindBreak"
  ],
"brk_style2": // classical *
  [
    "breaks/byzantine",
    "breaks/ambientbreak1",
    "breaks/italian",
    "breaks/teuton",
    "breaks/classicbreak",
    "breaks/SaluteMessala",
    "breaks/ShofarCall",
    "breaks/SaluteGratus",
    "breaks/Rowers",
    "breaks/victorybreak",
    "breaks/victory2",
    "breaks/SaluteArrius",
    "breaks/prisonbreak",
    "breaks/circusbreak",
    "breaks/circus2",
    "breaks/circus7",
    "breaks/wardrumbreak",
    "breaks/Ascension",
    "breaks/FlowingRiverBreak",
    "breaks/BoysEye",
    "breaks/30secondbreak",
    "breaks/30secondbreak",
    "breaks/ColdWindBreak"
  ],
"brk_style3": // tropical *
  [
    "breaks/aztec",  
    "breaks/inca",  
    "breaks/ambientbreak1",
    "breaks/mayan",  
    "breaks/teuton",  
    "breaks/hun",  
    "breaks/mongol",
    "breaks/tropicalbreak",
    "breaks/tropicalbreak3",
    "breaks/tropicalbreak2",
    "breaks/wardrumbreak",
    "breaks/tropicaltribedrums",
    "breaks/dekadrum",
    "breaks/FlowingRiverBreak",
    "breaks/Ascension",
    "breaks/tropicalbreak4",
    "breaks/BoysEye",
    "breaks/30secondbreak",
    "breaks/30secondbreak",
    "breaks/ColdWindBreak"
  ],
"brk_style4": // asian *
  [
    "breaks/burmese",  
    "breaks/chinese",  
    "breaks/ambientbreak1",
    "breaks/goth",  
    "breaks/hun",  
    "breaks/indian",  
    "breaks/japanese",
    "breaks/khmer",  
    "breaks/korean",  
    "breaks/malay",  
    "breaks/mongol",  
    "breaks/vietnamese",  
    "breaks/teuton",
    "breaks/wardrumbreak",
    "breaks/gong1",
    "breaks/gong2",
    "breaks/FlowingRiverBreak",
    "breaks/Ascension",
    "breaks/kotobreak",
    "breaks/BoysEye",
    "breaks/30secondbreak",
    "breaks/30secondbreak",
    "breaks/ColdWindBreak"
  ],
"brk_style5": // babylonian *
  [
    "breaks/berber",  
    "breaks/byzantine",  
    "breaks/ambientbreak1",
    "breaks/ethiopian",  
    "breaks/indian",  
    "breaks/malian",  
    "breaks/persian",  
    "breaks/saracen",  
    "breaks/slav",  
    "breaks/spanish",  
    "breaks/teuton",  
    "breaks/Saladin_Middle_Intro",
    "breaks/wardrumbreak",
    "breaks/SitarSlide",
    "breaks/Ascension",
    "breaks/FlowingRiverBreak",
    "breaks/BoysEye",
    "breaks/30secondbreak",
    "breaks/30secondbreak",
    "breaks/ColdWindBreak",
    "middle/AlKadir"
  ],
"brk_style6": // celtic *
  [
    "breaks/british", 
    "breaks/celt",  
    "breaks/ambientbreak1",
    "breaks/teuton",  
    "breaks/goth",  
    "breaks/hun",  
    "breaks/italian",  
    "breaks/magyar",  
    "breaks/viking",  
    "breaks/slav",
    "breaks/ShofarCall",
    "breaks/wardrumbreak",
    "breaks/celticdrum",
    "breaks/Ascension",
    "breaks/FlowingRiverBreak",
    "breaks/BoysEye",
    "breaks/30secondbreak",
    "breaks/30secondbreak",
    "breaks/ColdWindBreak"
  ],
  "tribal":
  [
    "ancient/AncientSoundtrack1",
    "ancient/AncientSoundtrack3",
    "ancient/AncientSoundtrack4",
    "ancient/music9",
    "ancient/Prophecy",
    "ancient/xMusic12",
    "ancient/xMusic14",
    "ancient/xMusic15",
    "ancient/scrolls",
    "ancient/SeaDragon",
    "ancient/WarDrums_Early",
    "ancient/Walrus",
    "tribal/anvildrumintro",
    "tribal/Touchee",
    "tribal/ArktauCove",
    "tribal/ArktauGeometry",
    "tribal/DreamGen",
    "tribal/Forever",
    "tribal/GrottoStrata",
    "tribal/LoveMagic",
    "tribal/LunaStrata",
    "tribal/Mica",
    "tribal/Mica",
    "tribal/Iguana",
    "tribal/CeremonyStrata",
    "tribal/EchoSmall",
    "tribal/SilkRidgeRoach",
    "tribal/RichMoss",
    "tribal/Paleo1",
    "tribal/Paleo2",
    "tribal/Paleo3",
    "tribal/Paleo4",
    "tribal/Paleo5",
    "tribal/Paleowolf",
    "tribal/Neolithic", 
    "tribal/AiwuDrums",
    "tribal/Mammoth",
    "tribal/Chant2",
    "tribal/OldEarth",
    "tribal/MoonChant",
    "tribal/Homeworld",
    "tribal/Fella",
    "tribal/Etmn",
    "tribal/DoruTree",
    "tribal/AncientCall",
    "tribal/TribalAwakening",
    "tribal/Humani",
    "tribal/Origins",
    "tribal/Echolalia",
    "tribal/MotherTongue"
  ],
"ancient":
  [
    "tribal/anvildrumintro",
    "tribal/Foreigner",
    "ancient/Intro1",
    "ancient/Intro3",
    "ancient/lost",
    "ancient/music1",
    "ancient/music3",
    "ancient/music4",
    "ancient/music5",
    "ancient/music6",
    "ancient/music7",
    "ancient/music8",
    "ancient/music9",
    "ancient/won",
    "ancient/xlost",
    "ancient/xlost2",
    "ancient/xlost3",
    "ancient/xmusic2",
    "ancient/xmusic3",
    "ancient/xmusic4",
    "ancient/xmusic5",
    "ancient/xmusic6",
    "ancient/xmusic7",
    "ancient/xmusic8",
    "ancient/xmusic9",
    "ancient/xmusic10",
    "ancient/xMusic11",
    "ancient/xMusic12",
    "ancient/xMusic13",
    "ancient/xMusic14",
    "ancient/xMusic15",
    "ancient/xwon",
    "ancient/xwon2",
    "ancient/scrolls",
    "ancient/SeaDragon",
    "ancient/xwon3",
    "ancient/WarDrums_Early",
    "ancient/Prophecy",
    "ancient/AncientSoundtrack1",
    "ancient/AncientSoundtrack3",
    "ancient/AncientSoundtrack4",
    "ancient/TowerOfSet",
    "ancient/Hovern",
    "ancient/Walrus",
    "ancient/Attila",
    "ancient/Otrodinn",
    "ancient/PaleoWarrior",
    "ancient/DrakkarDrums",
    "ancient/Torment",
    "ancient/Animus",
    "ancient/Vigridr",
    "ancient/Carthage2",
    "ancient/Cavelion",
    "ancient/Helj",
    "ancient/Gripir",
    "ancient/Awakening",
    "ancient/DudukLove",
    "ancient/Artemis",
    "ancient/Nyx",
    "ancient/Hera",
    "ancient/Athena",
    "ancient/Hypnos",
    "ancient/Demeter",
    "ancient/Hades",
    "ancient/Persephone",
    "ancient/Marathon",
    "ancient/HouseHur",
    "ancient/EnterJerusalem",
    "ancient/ArriusParty",
    "ancient/Orgy",
    "ancient/Hector",
    "ancient/Sakura",
    "ancient/TombHorus",
    "ancient/TombOsiris",
    "ancient/TombIsis",
    "ancient/TombAnubis"
  ],
"middle":
  [
    "middle/battle-epic",               // GPL in AGPL
    "middle/AllegriMiserere",
    "middle/AnonymousAySantaMaria",
    "middle/AnonymousLaGamba",
    "middle/ChantLaudate",
    "middle/DeLaTorreAlta",
    "middle/OrtizRecercada",
    "middle/Illusion",
    "middle/PraetoriusBallet",
    "middle/PraetoriusBransle",
    "middle/PraetoriusVolte",
    "middle/lost",
    "middle/FuryGift",
    "middle/Palace2",
    "middle/lost_x2",
    "middle/town",
    "middle/Friendship",
    "middle/Kitchen",
    "middle/Dagoth",
    "middle/Theology",
    "middle/won2_x2",
    "middle/AlKadir",
    "middle/xmusic13",
    "middle/WeddingSupper",
    "middle/Poseidon",
    "middle/xmusic18",
    "middle/xmusic23",
    "middle/xtown",
    "middle/PalaceMusic",
    "middle/Alexander_Early",
    "middle/TheCourt",
    "middle/Alexander_Middle",
    "middle/Asoka_Late_Intro",
    "middle/Asoka_Late_Lp",
    "middle/Catherine_Early",
    "middle/WarDrums_Middle",
    "middle/FrogGalliard",
    "middle/Lohengrin",
    "middle/Steppes",
    "middle/Worldes",
    "middle/HeveneQuene",
    "middle/Bryd",
    "middle/Wyst",
    "middle/Soys",
    "middle/Aravot",
    "middle/LonelyRoad",
    "middle/OldEngland",
    "middle/Goelette",
    "middle/RingForFreedom",
    "middle/MountSermon",
    "middle/OrgyGuitar",
    "middle/BurningPast",
    "middle/EchoingWoods",
    "middle/WhisperingOaks",
    "middle/ForestWaltz",
    "middle/Innkeeper",
    "middle/PreludeLute",
    "middle/LuysDeMilan",
    "middle/CastleDance",
    "middle/Celebration1",
    "middle/Celebration2",
    "middle/Cobblestone",
    "middle/Harpy",
    "middle/Lute1",
    "middle/Lute2",
    "middle/Lute3",
    "middle/Lute4",
    "middle/Lute5",
    "middle/Mandolins",
    "middle/Minstrel",
    "middle/NightElf",
    "middle/OldTree",
    "middle/Summertide",
    "middle/TimberTown",
  ],
"colonial":
  [
    "colonial/Washington_Middle",
    "colonial/DeliusAppalachia",
    "colonial/Khachaturian",
    "colonial/ColonialSong",
    "colonial/Swallowtail",
    "colonial/OldFiddleTune",
    "colonial/FortColonial",
    "colonial/FolkSuiteVW",
    "colonial/Andantino",
    "colonial/Omaha",
    "colonial/BlueWhale",
    "colonial/MarcelloAdagio",
    "colonial/RomanceVW",
    "colonial/Nimrod",
    "colonial/Brooks",
    "colonial/UnknownFuture",
    "colonial/Theology2",
    "colonial/WingAndAPrayer",
    "colonial/Sarabande",
    "colonial/Sarabande2",
    "colonial/Gigue",
    "colonial/PreludeTheorbo",
    "colonial/Fantasie",
    "colonial/Canarios",
    "colonial/Jotta",
    "colonial/SerenadeVW",
    "colonial/BingeSailing",
    "colonial/BingeWatermill",
    "colonial/DarkeFantasy",
    "colonial/Draught",
    "colonial/DrunkQ",
    "colonial/GreenWillow",
    "colonial/HaydnQ1-3",
    "colonial/HaydnQ59-2",
    "colonial/RhosyVW",
    "colonial/ThymeVW",
    "colonial/LoveRemembered",
    "middle/RingForFreedom",
    "middle/EchoingWoods",
    "industrial/into_the_shadows",      // GPL in AGPL
    "industrial/DvorakAmerican1",
    "industrial/Clownfish",
    "industrial/ManOfWar",
    "industrial/OceanDeep",
    "industrial/WarDrums_Late",
    "industrial/SibeliusKarelia",
    "industrial/Albatross",
    "industrial/Ducks",
    "industrial/NightWindow",
    "industrial/Coronation",
    "industrial/Esther",
    "industrial/Judea",
    "industrial/Eventide"
  ],
"industrial":
  [
    "colonial/SerenadeVW",
    "colonial/DarkeFantasy",
    "industrial/into_the_shadows",      // GPL in AGPL
    "industrial/DvorakAmerican1",
    "industrial/Brahms32",
    "industrial/Brahms33",
    "industrial/Beethoven52",
    "industrial/Clownfish",
    "industrial/ManOfWar",
    "industrial/Beethoven62",
    "industrial/OceanDeep",
    "industrial/RimskyScheherazade3",
    "industrial/WarDrums_Late",
    "industrial/SibeliusKarelia",
    "industrial/BeforeTheConflict",
    "industrial/Albatross",
    "industrial/Ducks",
    "industrial/Saturn",
    "industrial/Venus",
    "industrial/BluePlanet",
    "industrial/NightWindow",
    "industrial/Coronation",
    "industrial/Esther",
    "industrial/Judea",
    "industrial/ReturnPromise",
    "industrial/Cronos",
    "industrial/Eventide",
    "industrial/ShropshireLad",
    "industrial/49thParallelVW",
    "industrial/AmericanInParis",
    "industrial/Antarctica1VW",
    "industrial/Antarctica3VW",
    "industrial/Chiron",
    "industrial/Clockwork",
    "industrial/FenCountryVW",
    "industrial/Hiraeth",
    "industrial/IntroitFinzi",
    "industrial/Libertalia",
    "industrial/Mahler11",
    "industrial/Mahler13",
    "industrial/Mahler21",
    "industrial/Mahler22",
    "industrial/Nightfall",
    "industrial/SolentVW",
    "industrial/Tallis1VW",
    "industrial/Tallis2VW"
  ],
"modern":
  [
    "tribal/ArktauCove",
    "tribal/ArktauGeometry",
    "tribal/Foreigner",
    "tribal/Touchee",
    "tribal/Origins",
    "tribal/GrottoStrata",
    "tribal/Forever",
    "tribal/Iguana",
    "tribal/CeremonyStrata",
    "tribal/Mammoth",
    "tribal/LunaStrata",
    "ancient/SeaDragon",
    "modern/Stellar",
    "modern/Chevaliers",
    "modern/Aurora",
    "modern/elvish-theme",                // GPL in AGPL
    "modern/Neptune",
    "modern/Kobudai",
    "modern/Scavenger",
    "modern/AnfortasWound",
    "modern/FTheme",
    "modern/Remember",
    "modern/Forest",
    "modern/ChristianZeal",
    "modern/DragonHome",
    "modern/Abyssal",
    "modern/Squid",
    "modern/SibeliusSwan",
    "modern/CommonTones",
    "modern/Souls",
    "modern/Lagoon",
    "modern/HymingSlews",
    "modern/Caution",
    "modern/DarkMother",
    "modern/Reminiscence",
    "modern/Nostalgia",
    "modern/Homecoming",
    "modern/MemoriesHatred",
    "modern/Aftermath",
    "modern/Lepers",
    "modern/RoadSorrow",
    "modern/ValleyDead",
    "modern/Procession",
    "modern/Oracle",
    "modern/Nightbird",
    "modern/Bryce",
    "modern/2049",
    "modern/ScienceMedicine",
    "modern/Wallace",
    "modern/Someone",
    "modern/Rain",
    "modern/Orphanage",
    "modern/Memory",
    "modern/Furnace",
    "modern/Flight",
    "modern/Earthbound",
    "modern/Afterprints",
    "modern/AllWay",
    "modern/Ares",
    "modern/Argonaut",
    "modern/Arkhmar",
    "modern/BehindClouds",
    "modern/Canyon",
    "modern/Cirrus",
    "modern/Distance",
    "modern/Divus",
    "modern/DreamRiver",
    "modern/DrumTrack",
    "modern/EmptyMass",
    "modern/EndRiver",
    "modern/Eon",
    "modern/FearlessStrata",
    "modern/ForgottenMagic",
    "modern/FuturePresent",
    "modern/GazingPool",
    "modern/GlowLight",
    "modern/Herald",
    "modern/Imperatrix",
    "modern/Infinite",
    "modern/Magma",
    "modern/Meraki",
    "modern/Microns",
    "modern/Mosaic4",
    "modern/Mountain",
    "modern/Nephalim",
    "modern/NewDimension",
    "modern/Nightscape",
    "modern/Nomads",
    "modern/ParallelLines",
    "modern/Passage2",
    "modern/Passage3",
    "modern/Passage4",
    "modern/PersistenceStrata",
    "modern/RavelPeak",
    "modern/Recurrence",
    "modern/ShadowLight",
    "modern/Shadows",
    "modern/Smoke",
    "modern/Solitary",
    "modern/Surrender",
    "modern/Terrain",
    "modern/TheDream",
    "modern/Umbra",
    "modern/Unreachable",
    "modern/Vapor",
    "modern/Venture2",
    "modern/Viewpoint",
    "modern/WayAhead1",
    "modern/Soul2",
    "modern/Cigar",
    "modern/DeadGirls",
    "modern/Deal",
    "modern/Foolish",
    "modern/Hands",
    "modern/HeartOffense",
    "modern/Mauvais",
    "modern/ScaredDark",
    "modern/TwoRun"
  ]
};

/**************************************************************************
...
**************************************************************************/
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
        else if (!tech_known("Railroad") && !tech_known("Conscription")) category = "colonial";
        else if (!tech_known("Space Flight") && !tech_known("Robotics")) category = "industrial";
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

