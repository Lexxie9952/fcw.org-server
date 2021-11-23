/* simpleStorage memory from last session of how user positioned their emoji
   dialog pop-up */
 var restore_emojibox_vals = { "h" : null,
                               "w" : null,
                               "x": null, 
                               "y": null,
};

const HEIGHT_LOSS_UNRECORDED = -10000; // used in getting user pref for exact height calibrated.

/* Emojis used in FCW. Each of these values is the same as a filename in "../images/e/"
   with a .png extension */
var freemoji = [
// Faces
'wink',
'grin',
'happy',
'alien',
'angel',
'angry',
'annoyed',
'astonished',
'blankface',
'blowingkiss',
'concerned',
'confounded',
'confused',
'cool',
'disappointed',
'dizzy',
'evillaugh',
'expressionless',
'fedup',
'flushed',
'fuming',
'ghost',
'goblin',
'angrydevil',
'happydevil',
'mad',
'goofy',
'hurt',
'kiss',
'kiss2',
'kiss3',
'laughingtears',
'loveface',
'maskface',
'nervous',
'neutralface',
'pained',
'pensive',
'persevering',
'police',
'princess',
'relieved',
'sad',
'santa',
'scared',
'scream',
'sleeping',
'smiling',
'smiling2',
'smiling3',
'smirk',
'stressed',
'surprised',
'sweatlaugh',
'tearsofjoy',
'tongue',
'unamused',
'unhappy',
'weary',
'winktongue',
'yawn',
'tears',
'impatient',
'dancer',

//sign language
'applause',
'fist',
'ok',
'openhands',
'pointdown',
'pointleft',
'pointright',
'pointup',
'pray',
'punch',
'raisinghands',
'stophand',
'thumbup',
'thumbdown',
'victoryhand',
'wavehand',

//body parts and emotives
'ear',
'eyes',
'lips',
'nose',
'zzz',
'cool2',
'shit',

//hearts
'brokenheart',
'heart',
'gift',
'lovegift',

//symbolic
'warning',
'wtf',
'redexclamation',
'redx',
'no',
'noentry',
'nogo',
'online',
'whatever',

//astrologic
'earth',
'earth2',
'earth3',
'sun',
'sun2',
'suncloud',
'moon',
'moon1',
'star',
'star2',
'comet',
'shootingstar',

//animals
'bear',
'bee',
'boar',
'camel',
'camel2',
'cat',
'cat2',
'rooster',
'chicken',
'cow',
'cow2',
'dog',
'dog2',
'dog3',
'elephant',
'fox',
'frog',
'goat',
'horse',
'horse2',
'koala',
'ladybug',
'monkey',
'monkey2',
'hearnoevil',
'seenoevil',
'speaknoevil',
'mouse',
'mouse2',
'panda',
'penguin',
'pig',
'pig2',
'rabbit',
'rabbit2',
'sheep',
'silkworm',
'tiger',
'snail',
'snake',
'crocodile',
'turtle',
'fish2',
'octopus',
'dolphin',
'whale',
'whale2',

//plants
'flower',
'flower2',
'flower3',
'rose',
'rose2',
'sunflower',
'cactus',
'leaves',
'mushroom',
'palm',
'pine',
'noel',
'shamrock',
'tree',

//instruments/music
'music',
'guitar',
'horn',
'piano',
'trumpet',
'violin',
'sax',

//oral
'pill',
'cigarette',
'burger',
'birthday',
'cake',
'drumstick',
'fries',
'honey',
'pizza',
'shrimp',
'spaghetti',
'sushi',
'coffee',
'tea',
'beer',
'cincin',
'longisland',
'martini',
'wine2',
'corn',
'tomato',
'pumpkin',
'apple',
'banana',
'cherry',
'grape',
'lemon',
'peach',
'pear',
'pineapple',
'orange',
'strawberry',
'watermelon',

//stuff
'airplane2',
'anchor',
'bath',
'bomb',
'bulb',
'camera',
'castle',
'check',
'cityscape',
'cloud',
'cookie',
'crown',
'dice',
'drop',
'easterisland',
'fire',
'fireworks',
'flashlight',
'football',
'footprints',
'free',
'fuel',
'golf',
'gun',
'hat',
'unihat',
'house',
'key',
'lipstick',
'nails',
'megaphone',
'knife',
'lightning',
'microscope',
'muscles',
'newspaper',
'party',
'phone',
'phone2',
'phonered',
'pumps',
'raceflag',
'radio',
'rain',
'rainbow',
'ribbon',
'satellitedish',
'scissors',
'search',
'seashell',
'ski',
'sneakers',
'snow',
'snowman',
'sparkle',
'spiral',
'telescope',
'toilet',
'trophy',
'tsunami',
'tv',
'wind',

//technical signs
'audio',
'audiooff',
'battery',
'bell',
'belloff',
'bright',
'computer',
'lock',
'unlock',
'wrench',
'arrowdown',
'arrowleft',
'arrowright',
'arrowup',

// NUMBERS
'0',
'1',
'2',
'3',
'4',
'5',
'6',
'7',
'8',
'9',
'10',

// diplomacy
'war',
'cease-fire',
'armistice',
'peace',
'alliance',

// GAME SYMBOLS
'50pct',
'50',
'75',
'100',
'200',
'airlift',
'bluediamond',
'chat',
'clock',
'equal',
'hammer',
'headstone',
'hourglass',
'hourglassempty',
'hourglassfull',
'knifeandfork',
'nuclearexplosion',
'fallout',
'pollution',
'recycle',
'snowflake',
'stonehenge',
'v1',
'v2',
'v3',
'v4',
'v5',
'v6',

// FPT
'food',
'shield',
'trade',
// Gold/Sci/Lux
'gold',
'luxury',
'science',
'goldpershield',

//WONDERS
'agoge',
'angkorwat',
'apolloprogram',
'appianway',
'asmith',
'chandbaori',
'colossus',
'copernicusobservatory',
'cureforcancer',
'ecclesiasticalpalace',
'eiffeltower',
'fusionreactor',
'genghiskhan',
'gibraltarfortress',
'greatwall',
'hammurabi',
'hanginggardens',
'hooverdam',
'hypogeum',
'internet',
'isaacnewtonscollege',
'jsbachscathedral',
'jtids',
'kingrichardscrusade',
'leonardosworkshop',
'lighthouse',
'magellansexpedition',
'magnacarta',
'manhattanproject',
'marcopolosembassy',
'mausoleum',
'medicibank',
'michelangeloschapel',
'olympics',
'oracle',
'palace',
'paxdei',
'pyramids',
'shakespearestheater',
'sphinx',
'statueofliberty',
'statueofzeus',
'suntzuswaracademy',
'supremecourt',
'templeofartemis',
'teslaslaboratory',
'unitednations',
'voyageofdarwin',
'womenssuffrage',

// BUILDINGS
'airport',
'amphitheater',
'aqueduct',
'bank',
'barracks',
'barracksii',
'barracksiii',
'cathedral',
'citywalls',
'coalplant',
'coastaldefense',
'courthouse',
'enrichmentfacility',
'factory',
'fortifications',
'granary',
'harbor',
'homelandsecurity',
'library',
'manufacturingplant',
'hydroplant',
'marketplace',
'masstransit',
'nuclearplant',
'offshoreplatform',
'policestation',
'portfacility',
'radartower',
'recyclingcenter',
'researchlab',
'sambattery',
'sdidefense',
'sewersystem',
'solarplant',
'spacecomponent',
'spacemodule',
'spaceship',
'spacestructural',
'stockexchange',
'superhighways',
'supermarket',
'temple',
'university',
'windplant',
'coinage',

//GOVERNMENTS
'anarchy',
'despotism',
'monarchy',
'monarchyconstitutional',
'republic',
'democracy',
'theocracy',
'communism',
'nationalism',
'unknowngov',
'fundamentalism',
'federation',
'tribal',

//UNITS:
//-----------
//CIVILIAN
'settlers',
'founders',
'tribesmen',
'well-digger',
'peasants',
'pilgrims',
'proletarians',
'migrants',
'workers',
'engineers',

//landcomerce
'goods',
'wagon',
'caravan',
'train',
'truck',
'freight',
//other
'explorer',
//diplomatic
'diplomat',
'spy',

//FOOT
'warriors',
'phalanx',
'archers',
'pikemen',
'legion',
'musketeers',
'falconeers',
//'fanatics',
'zealots',
'riflemen',
'partisan',
'alpinetroops',
'marines',
'paratroopers',
'mechanizedinfantry',

//MOUNTED
'horsemen',
'chariot',
'elephants',
'knights',
'crusaders',
'dragoons',
'cavalry',
'armor',
'armorii',

//BALLISTIC
'catapult',
'siegeram',
'cannon',
'artillery',
'howitzer',
'anti-aircraftartillery',
'mobilesam',

//FLIGHT
'balloon',
'zeppelin',
'airplane',
'awacs',
'spyplane',
'fighter',
'divebomber',
'escortfighter',
'jetfighter',
"multi-fighter",
'groundstrikefighter',
'stealthfighter',
'mediumbomber',
'heavybomber',
'strategicbomber',
'jetbomber',
'stealthbomber',
'transporthelicopter',
'helicopter',
'satellite',

//SHIP
'boat',
'trireme',
'longboat',
'galley',
'wargalley',
'ramship',
'caravel',
'galleon',
'frigate',
'cargoship',
'ironclad',
'transport',
'destroyer',
'cruiser',
'submarine',
'missiledestroyer',
'aegiscruiser',
'battleship',
'carrier',

//BOMB MISSILE
'atombomb',
'hydrogenbomb',
'doomsdaybomb',
'cruisemissile',
'nuclearmissile',
'tacticalnuke',

//MISC UNITS
'leader',
'queen',
'barbarianleader',

// TERRAIN
'arcticoil',
'arctic',
'buffalo',
'coal',
'deer',
'desert',
'desertriver',
'elk',
'fish',
'forest',
'fruit',
'furs',
'gems',
'tgold',
'grassland',
'grasslandshield',
'hills',
'iron',
'ivory',
'jungle',
'mountains',
'oasis',
'ocean',
'oil',
'peat',
'pheasant',
'rubber',
'silk',
'spice',
'swamp',
'tundragold',
'tundra',
'whales',
'twheat',
'wildboar',
'wine',
];

/**************************************************************************
 User selects to pop-up emoji selector with CTRL-E or pressing the emoji
 activator icon. Show emoji selector dialog.
**************************************************************************/
function emoji_popup() {
  var id = "#emoji_dialog";
  var dhtml = "";

  const row_count = 15; // group the spans by 15; this does nothing but 
                        // possibly allow smart upgrades one day later

  /* Reset/refresh dialog */
  remove_active_dialog(id);
  $("<div id='emoji_dialog'></div>").appendTo("div#game_page");
  /* Inject a whole bunch of emoji into the html of this dialog */
  for (var i=0; i<freemoji.length; i+= row_count) {
   dhtml += "<span>";
   for (var j=0; j<row_count; j++) {
     var index = i+j;
     if (index>=freemoji.length) break;
     dhtml+="<img title='"+freemoji[index]+"'"
          +" onclick='emoji_insert(\""+freemoji[index]+"\")'"
          +" src='/images/e/"+freemoji[index]+".png'>"
     }
   dhtml += "</span>"; 
  }
  $(id).html(dhtml);
  /* Add a cancel button and a SEND button (for convenience) */
  var other_buttons = {	"exit": function() { remove_active_dialog(id); },
  				"send": function() {
                 send_text_input($("#game_text_input"));}
  };

  /* Our dialog loses height after making a thin titlebar. The very first time we go through this, 
   * we don't even have user_prefs for the height. So we have to do spaghetti jquery gymnastics */
  var first_loss = null; // first time loss of dialog height? assume no at first
  var height_loss = HEIGHT_LOSS_UNRECORDED; // assume this is the unrecorded first time
  if (restore_emojibox_vals) {
    if (restore_emojibox_vals.height_loss) {
      height_loss = restore_emojibox_vals.height_loss // can u believe i had to code this?!? :P
    }
  }

  /* Set up height and width of the emoji dialog:
  ******************************************************/
  // Small screen is easy: always full size with no position changes or height adjustments:
  if (is_small_screen()) {
    $(id).dialog({bgiframe: true,
      modal: false,
      buttons: other_buttons,
      height: "auto",
      width:  "100%"
    });
  } else { // Big screen. Pick a default height/width the very first time we create this dialog:
    if (height_loss == HEIGHT_LOSS_UNRECORDED) {
      // First time ever doing an emoji box, use a default size.
      $(id).dialog({bgiframe: true,
                    modal: false,
                    buttons: other_buttons,
                    height: "auto",
                    width:  "50%"
      });
    } else {
      // Not the first time; use recorded user_pref values for UI positioning instead:
      $(id).dialog({bgiframe: true,
        modal: false,
        buttons: other_buttons,
        height: (is_small_screen() ? "auto" 
                                  : (restore_emojibox_vals.h ? restore_emojibox_vals.h : "auto")
                ),
        width:  (is_small_screen() ? "100%" 
                                  : (restore_emojibox_vals.w ? restore_emojibox_vals.w : "50%")
                )
      });
    }  
  }
  /* Emoji has been sized for height and width ***********************/


  /* Finally, open our emoji dialog.
  ******************************************************/
  $(id).dialog('open');
  // If it's our first time we're going to need to record difference in dialog height from slimmer titlebar
  var h1 = parseInt($(id).siblings().first().css("height"));
  $(id).siblings().first().css("height","5px");   // Regardless if above is true, we're DOING a slimmer titlebar!
  var h2 = parseInt($(id).siblings().first().css("height"));

  // First time dialog creation case; bake our fixed dialog height into the system:
  if (height_loss === HEIGHT_LOSS_UNRECORDED) {
    first_loss = h1 - h2 + 6.172; // worse than it looks, it's also a "messy" boolean later !
    // Permanently store the lost height for future.
    restore_emojibox_vals.height_loss = first_loss;
    emojibox_save(false); // in doing this, we liberate ourselves forever from spaghetti worries
  }
  /* Emoji dialog has been opened ***********************/


  /* Position the dialog:
  ******************************************************/
  // Small screen, it's nice and easy for a change:
  if (is_small_screen()) {
    $(id).dialog('widget').position({my:"left top", at:"left top", of:window})
  } 
  // Big screen:
  else {
      if (first_loss) { // A messy boolean, but suffices to know it's first time; pick a default dialog positioning 
        $(id).dialog('widget').position({my:"center top", at:"center top", of:window})
      } 
      else { // Not the first time, use user_pref dialog positioning:
        $(id).dialog('widget').position({my:"left+"+restore_emojibox_vals.x+"px top+"+restore_emojibox_vals.y,
                                         at:"left top", of:window}) 
      }
  }
  /* Dialog positioned *************************************/

  
  // Don't let mini-map or other windows obscure the emoji dialog:
  $("#emoji_dialog").parent().css("zIndex","1000");
  
  // Register the dialog:
  dialog_register(id);

  // After pop-up, courtesy focus into the chatbox to allow typing:
  if (current_message_dialog_state == "minimized") {
     $(".chatbox_dialog .ui-icon-bullet").click(); // restore chatbox if necessary
  }
  $("#game_text_input").focus();

  // If user resizes the dialog, we're saving their prefs for them:
  $("#emoji_dialog").parent().resize( function(e,ui) { emojibox_save(false); });
}

/**************************************************************************
 User clicked an emoji. Inject it into chatbox.
**************************************************************************/
function emoji_insert(emoji) {
  $("#game_text_input").val(
      $("#game_text_input").val()+"[`"+emoji+"`]"
  );
  if (current_message_dialog_state == "minimized") {
    $(".chatbox_dialog .ui-icon-bullet").click();
  }
  $("#game_text_input").focus();
}

/**************************************************************************
 Remembers or saves the user resized chatbox size and positioning.
   "save" action - do when leaving "normal" state
   "load" action - do when restoring to "normal" state
**************************************************************************/
function emojibox_save(position_only)
{
  if (!position_only) {
    restore_emojibox_vals.h = $("#emoji_dialog").parent().height();
    if (restore_emojibox_vals.height_loss) 
      restore_emojibox_vals.h += restore_emojibox_vals.height_loss;

    restore_emojibox_vals.w = $("#emoji_dialog").parent().width();
  }

  var offset = $("#emoji_dialog").parent().offset();
  if (!offset) return; // emoji box must be closed; avoid an error

  // Save any position changes:
  restore_emojibox_vals.x = offset.left;
  restore_emojibox_vals.y = offset.top;
  simpleStorage.set('emojiDlg', restore_emojibox_vals);
}

/* The following unused .png files COULD be deleted if you're super careful to not delete 
   the ones markked 'don't delete' since the server will send those as a code in some rulesets,
   AND if you're super careful to review them all for one that was forgotten to be marked as 
   "don't delete" */
//'kr',
//'leonardo',
//'magellan',
//'mausoleumofhalicarnassus',   don't delete
//'mausoleumofmausolos',        don't delete
//'oplatform',
//'tesla',
//'theinternet',                don't delete
//'theolympics',                don't delete
//'scourt',
//'epalace',
//'darwinsvoyage',               don't delete
//'away',
//'aprogram',
//'artemis',
//'awat',
//'bach',
//'c4cancer',
//'cobservatory',
//'colosseum',                  don't delete
//'cdefense',
//'copernicus',
//'dvoyage',
//'etower',
//'freactor',
//'genghiskhansequestrianschool',   don't delete
//'gfortress',
//'gkhan',
//'greatlibrary',        don't delete
//'gwall',
//'hdam',
//'hg',
//'hgardens',
//'isaac',
//'jsb',
//'marcopolo',
//'michelangelo',
//'newton',
//'setiprogram',        don't delete
//'suntzu',
//'amphitheatre',       don't delete (rule_name?)
//'coastaldefence',
//'cplant',
//'cwalls',
//'efacility',
//'hplant',
//'hsecurity',
//'mfgplant',      don't delete
//'mplace',
//'mplant',
//'mproject',
//'mtransit',
//'nplant',
//'powerplant',     don't delete
//'pplant',
//'pstation',
//'rcenter',
//'recyclingcentre',
//'rlab',
//'rtower',
//'sbattery',
//'scomponent',
//'sdefense',
//'sexchange',
//'shakespeare',
//'shighways',
//'splant',
//'ssystem',
//'aaa',
//'alpines',
//'armor2',
//'cm',
//'mechinf',         don't delete
//'nuke',            don't delete 
//'oldfreight',
//'swordsmen',
//'commie',
//'demo',
//'fundie',
//'tribalism',       don't delete?
