<b><a href="https://freeciv.fandom.com/wiki/Game_Manual" target="_blank">Classic Game Manual</a></b>
Click link for: <a href="https://freecivweb.fandom.com/wiki/Strategy_Guide" target='_blank'>Strategy Guide</a>
<a href="https://freeciv.fandom.com/wiki/Terrain#Terrain_Catalog" target="_blank">Terrain</a>
<a href="https://freeciv.fandom.com/wiki/Combat" target="_blank">Combat</a>
<a href="https://freeciv.fandom.com/wiki/Government" target="_blank">Governments</a>
<a href="https://freeciv.fandom.com/wiki/Economy" target="_blank">Economy</a>
<a href="https://freeciv.fandom.com/wiki/Diplomacy" target="_blank">Diplomacy</a>
<a href="https://freeciv.fandom.com/wiki/Hotkeys.mp" target="_blank">Hotkeys and Mouse Control</a>

<u>History</u>
Classic+ is a refresh of Classic to incorporate years of experience, as well as advances and features in Freeciv development.

The original Classic ruleset has a long history. It started before Civilization II&trade; came out. After Civ2, Classic became a synthesis of three things. Civilization I, which it was built from, new features from Civilization II&trade; that were better, a few other improvements from Civ3, and a touch of salt and spice. The result is a Classic Civilization experience that is more "classic" than any of the original games—in some people's view at least! 

Classic+ starts with Classic and stays true to its spirit, with some better graphics, sounds, bug fixes, units, and some fun new features. Since Classic+ has to stay true to original Classic, the extra features are intended more as a transition and gateway drug into the world of MP2 rulesets.

After getting your feet wet with Classic+, you are encouraged to try more modern rulesets, such as:

Multiplayer+ - Like Classic, but with refinements and balance changes so that it functions well even in massive multiplayer human conditions.

Multiplayer II Evolution (MP2) - The cutting edge and ultimate synthesis of Classic Civilization with modern features and advancements. All the best classical mechanics are kept, and only the best newer features and units are added. This preserves the hard-edged chess match of older Civ with finer balance and large portfolio of new features, units, and improvements.

<img style="margin-left:auto;margin-right:auto;display:block" src='/images/chapter_mark.png'>

<h2>Brief Explanations of goals and challenges</h2>>
Make a Classic+ ruleset for people who want a faithful recreation of the Classic game, but without the flukes and imbalances that haven't aged so well. 2x movement to give oxygen to game pace and provide starting experience for modern multiplayer games. A few more units, wonders, or buildings to spice things up, but no changing the meat of the game.


<h1>Changelog:</h1>
Tech costs changed to Classic+. Each tech has its own cost and is not tied to previous tech costs

All units get 2x moves, 2x vision: improves pace and playability.

Added Theocracy government (like Civ2 Fundamentalism).

Railroads use 1/9 move point and aren't infinite.

RestrictInfra on rails: non-allied foreign rails give no monus movement. The roads under them do.

The movement fractions are granular, 60 fragments per move-point like a minute to the hour.

Submarine is A9 the balanced sweet spot between Civ1 and Civ2. Carries 4 missiles not 8.
   Visible by Helicopters at 2 tiles distance, as in original Civ2.

6 veteran levels. V4-V6 get +1 move bonus

Added the Fort as a weaker base prior to the Fortress. Gives 1.33x defense.

Foodbox put very close to MP2D but a little closer to the range of Civ2Civ3, for simplicity and better pace
   granary_food_ini  = 15, 20, 24, 30, 36, 44, 52, 60

Huts balanced better
   Huts don't give cities
   Hut mercenaries are phalanx not legion
   Much larger chance to discover a larger map

Courthouses make +1 content for all govs, provide bonuses against 
   diplomatic actions, eliminate tile corruption, and cost 10 less.

Fixed City walls to real classic 2x defense, and changed SAM Battery
   to get 2x vs helicopter.

Added Ecclesiastical Palace.

Cleaned up tech tree, redundant reqs and a few bad paths

Added Code of Hammurabi and The Sphinx

Added Nile River bonus effects: desert rivers make +2 food if irrigated. Manually irrigated on a city, +3 food.


UNITS
-----
Balloons and Zeppelins

Fanatics

Ground Troops, which upgrade Riflemen and Alpine Troops in the later game.

Added Jet Fighter
Added Elephants
Added Crusaders.

Project Poseidon Lite
   Wood boats can travel on rivers.

   Trireme cost 20. Tech req alphabet, can go on rivers.
      can enter Deep Ocean, but run out of fuel if not near shore on T2
      They can attack and travel on rivers, but can’t attack the shore.
      Triremes can do trade routes and help build wonders. Triremes do not cause unhappiness.

   Added Galley and War Galley

   Caravel now A4 D4 cost 30, M7, can go on rivers.

   Galleon A2 D3, Frigate A4 D3

Project Neptune Lite
   Battleships can bombard 3 rounds
   AEGIS Cruiser carries 5 missiles.
   Carrier cost 150 carries 10.
   Battleship:Cruiser:Destroyer move ratios 10:11:12

Cost of Early foot units decreased 20%. From Pikemen onward approx. -10%

Phalanx and Pikemen attack at 1.5 (was 1)

Legions can build roads and Fortresses

Cost of Early mounted units and some other units, -10%

Paratroopers range is 14 tiles.

Explorer changed to Scout, available with Horseback riding, cost reduced to 18,
   has better vision.

Start units are 3 workers, 3 settlers, 1 caravan, 1 scout. Changeable with /set startunits

Added Migrants, a population unit only, not a Worker. Can transfer population from overpopulated cities to smaller.

Archers can do volley attack for 2 rounds on every unit on a tile from a distance of 2 tiles.\

Partisans are upkeep free, home free, and can investigate conquered/occupied cities.

Air units fall into 2 types, those which protect/block a tile and those that allow units underneath to be attacked.
   Fighter is the unreachableprotects class, the rest aren't. 
   Fighter bonus against Helicopters reduced to +50% instead of 4x. still an easy kill but Helis have a chance if vet
      to defend against semi-injured or green Fighters now.
   Fighter now A4 D3.5
   Brought in Escort Fighter A3.5 D5
   Stealth Fighter is A9 D5.
   Stealth Bomber is A19 D5

Helicopters are 13 moves not 12 and lose 1hp per turn not 2 and can carry 1 land unit and can see Submarines at distance of 2

Armor A10 increased to A11.

Caravans 30 shields.

Capture and Expel added from MP2 rules.

Everything but Ships and Zeppelins can be airlifted.

<img style="margin-left:auto;margin-right:auto;display:block" src='/images/chapter_mark.png'>

