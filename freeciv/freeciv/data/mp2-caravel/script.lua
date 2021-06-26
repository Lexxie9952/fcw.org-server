-- Freeciv - Copyright (C) 2007 - The Freeciv Project
--   This program is free software; you can redistribute it and/or modify
--   it under the terms of the GNU General Public License as published by
--   the Free Software Foundation; either version 2, or (at your option)
--   any later version.
--
--   This program is distributed in the hope that it will be useful,
--   but WITHOUT ANY WARRANTY; without even the implied warranty of
--   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
--   GNU General Public License for more details.

-- This file is for lua-functionality that is specific to a given
-- ruleset. When freeciv loads a ruleset, it also loads script
-- file called 'default.lua'. The one loaded if your ruleset
-- does not provide an override is default/default.lua.


-- This flags whether philosophy awards a bonus advance, and gets set to off (0) after T85.
philosophy_possible = 1
game_turn = 0
first_horse_warning = 0
first_womens_suffrage = 0

--Give players custom messages on certain years.  Currently at 1600 AD (T85), Philosophy expires. Let them know.
function history_turn_notifications(turn, year)
  game_turn = turn

  if turn > 78 and turn < 85 then
    notify.all("Philosophy will no longer award a bonus tech after turn 85.")
  end

  if turn == 85 then
  -- Philosophy no longer gives advances after 1600 AD
    notify.all("<font color=#000000>Philosophers around the world mourn the execution of Giordano Bruno. Philosophy no longer gives a bonus advance.</font>")
    philosophy_possible = 0
    notify.event(nil, nil, E.BEGINNER_HELP,
_("[`events/giordano`]<br>🔥 Philosophers hide their books after Giordano Bruno is burned.<br>Philosophy no longer gives a bonus advance."))
  end
  
  return false
end 
signal.connect("turn_begin", "history_turn_notifications")          --  *************** turn_started deprecated in 3.1, renamed turn_begin

-- Place Ruins at the location of the destroyed city.
function city_destroyed_callback(city, loser, destroyer)
  city.tile:create_extra("Ruins", NIL)
  -- continue processing
  return false
end

signal.connect("city_destroyed", "city_destroyed_callback")


-- Hack: record which players already got Philosophy, to avoid
-- teams getting it multiple times with team_pooled_research.
-- Stored as a string as this is a type simple enough to be included
-- in savefiles.
-- (It`s probably not necessary to test for existence as savefile
-- data is loaded after this script is executed.)
if philo_players == nil then
  philo_players = ""
end

-- Record that a player got Philosophy in our hacky string.
function record_philo(player)
  local pos = player.id + 1
  philo_players = string.sub(philo_players, 1, pos-1) ..
                  string.rep(" ", math.max(0, pos - 1 - #philo_players)) ..
                  "." .. string.sub(philo_players, pos+1)
end

-- Grant one tech when the tech Philosophy is researched.
function tech_researched_handler(tech, player, how)
  local id
  local gained

  if tech == nil then
    -- no tech was researched.
    return
  end

  id = tech.id
-- Report early Horseback riding.
  if id == find.tech_type("Horseback Riding").id and how == "researched" then
    if game_turn < 15 then
      for c in player:cities_iterate() do 
        if c:has_building(find.building_type("Palace")) and first_horse_warning > 0 then
          notify.event(NIL, c.tile, E.TECH_GAIN,
          _("<font color=#ffff00>🐎 Travellers say the %s now ride horses, near %s. (%i,%i)</font>"),
          player.nation:plural_translation(), c.name, c.tile.x, c.tile.y )
          notify.all( _("🐎 Tribesmen have learned to ride horses near %s (%i,%i)"), c.name, c.tile.x, c.tile.y)          
        end
        if c:has_building(find.building_type("Palace")) and first_horse_warning == 0 then
          first_horse_warning = 1
          notify.event(NIL, c.tile, E.TECH_GAIN,
          _("[`events/wildbeasts`]<br><font color=#ffff00>🐎 Travellers tell of the %s, who ride horses near %s! (%i,%i)</font>"),
          player.nation:plural_translation(), c.name, c.tile.x, c.tile.y )
          notify.all( _("🐎 Tribesmen have learned to ride wild beasts near %s (%i,%i)"), c.name, c.tile.x, c.tile.y)          
        end
      end  
    end
  end
-------------------------
  if id == find.tech_type("Philosophy").id and how == "researched" then

    -- Check potential teammates.
    for p in players_iterate() do
      if player:shares_research(p)
         and string.sub(philo_players, p.id+1, p.id+1) == "." then
        -- Another player in the same team already got Philosophy.
        record_philo(player)
        return
      end
    end

    record_philo(player)

    
    -- Philosophy does not give a bonus tech under certain conditions. Check for those conditions -------------------
    if philosophy_possible == 0 then
      -- No Philosophy advance after turn 85 (1600 CE)
        return
      end
  
      -- Philosophy can only give advances if you know NO techs from the next tier --------------
      -- Even knowing any of these techs makes an advance impossible !
      
      local researcher = player
  
      local forbidden_tech = find.tech_type("Banking")
      if researcher:knows_tech(forbidden_tech) then
        return
      end
  
      forbidden_tech = find.tech_type("Medicine")
      if researcher:knows_tech(forbidden_tech) then
        return
      end
  
      forbidden_tech = find.tech_type("University")
      if researcher:knows_tech(forbidden_tech) then
        return
      end
  
      forbidden_tech = find.tech_type("Invention")
      if researcher:knows_tech(forbidden_tech) then
        return
      end
  
      forbidden_tech = find.tech_type("Physics")
      if researcher:knows_tech(forbidden_tech) then
        return
      end
  
      forbidden_tech = find.tech_type("Monotheism")
      if researcher:knows_tech(forbidden_tech) then
        return
      end
  
    -- Give the player a free advance.
    -- This will give a free advance for each player that shares research.
    gained = player:give_tech(nil, -1, false, "researched")

      -- Notify the player. Include the tech names in a way that makes it
      -- look natural no matter if each tech is announced or not.
    notify.event(player, NIL, E.TECH_GAIN,
                 _("[`events/philosophy`]<font color=#ffff00>Great philosophers from all the world join your civilization: you get the immediate advance %s.</font>"),
                 gained:name_translation())

    -- Notify research partners
    notify.research(player, false, E.TECH_GAIN,
                    _("[`events/philosophy`]<br><font color=#ffff00>Great philosophers from all the world join the %s: you get the immediate advance %s.</font>"),
                    player.nation:plural_translation(),
                    gained:name_translation())

    -- default.lua informs the embassies when the tech source is a hut.
    -- They should therefore be informed about the source here too.
    notify.research_embassies(player, E.TECH_EMBASSY,
            -- /* TRANS: first %s is leader or team name */
            _("[`events/philosophy2`]<font color=#ffff00>Great philosophers from all the world join %s: they get %s as an immediate advance.</font>"),
            player:research_name_translation(),
            gained:name_translation())
  end
end 

signal.connect("tech_researched", "tech_researched_handler")

function turn_callback(turn, year)
  if turn == 99 then
    notify.event(nil, nil, E.SCRIPT,
_("<b>Prophets have Visions!</b>\n\
Evangelists warn the End Times are near.\
"))
notify.event(nil, nil, E.BEGINNER_HELP,
_("[`events/endtimes`]<br>Philosophers are concerned that weapons technology is becoming too advanced."))
  end

  if turn == 2 then
    notify.event(nil, nil, E.SCRIPT,
_("<b>Hunt for Food!</b>\n\
Meat from wild animals is an important part of the Stone Age diet. Use wandering Deer and Wild Boar for extra food.\
   (TIP: Use Shift-W and Ctrl-Shift-Click to monitor and manage these resource opportunities.)\
"))
notify.event(nil, nil, E.BEGINNER_HELP,
_("[`events/hunt`]<br>Wild animals are available to hunt for food."))
  end

  if turn == 17 then
    notify.event(nil, nil, E.SCRIPT,
_("<b>Ecology Report</b>\n\
Frequent hunting has reduced wild animal populations and frightened them from human settlements.\
"))
notify.event(nil, nil, E.BEGINNER_HELP,
_("[`events/runningdeer`][`events/oldtribesmen`]<br>Animal populations no longer come near human settlements.<br>Tribesmen are getting old.<br>"))
  end
end

signal.connect('turn_begin', 'turn_callback')

function unit_lost_callback(unit, loser, reason)
  num_owners = 0
  owner = ""
  if reason == "killed" then
    nation = loser.nation:name_translation()
    if nation == "Animal Kingdom" then
      for tile in unit.tile:square_iterate(1) do
        for foe in tile:units_iterate() do
          if unit.tile ~= tile then
            foe_nation = foe.owner.nation:name_translation()
            if owner ~= foe.owner and foe_nation ~= "Animal Kingdom" then
              num_owners = num_owners + 1
              owner = foe.owner
            end
          end
        end
      end
    end

    if num_owners == 1 then
      gold = 3
      culture = 1
      edit.change_gold(owner, gold)
      edit.add_player_history(owner, 1)
      if owner:is_human() then
        notify.player(owner,
                    "Wild animal killed, furs and meats are worth %d gold", gold)
      end
    end
  end

  -- continue processing
  return false
end

signal.connect("unit_lost", "unit_lost_callback")

function building_built_callback(building, city)

  if building:rule_name() == "Chand Baori" then
    local owner = city.owner
    local city_name = city.name

    notify.player(owner, "Chand Baori's deep well gives %s a free river.", city_name)
    city.tile:create_extra("River", NIL)
    -- continue processing
    return false
  end

  if building:rule_name() == "Women's Suffrage​" and first_womens_suffrage < 1 then
    first_womens_suffrage = 1
    notify.event(nil, nil, E.SCRIPT,
    _("<b>Women in Republics and Democracies demand Women's Suffrage.</b>\n\
       All cities under these governments now have one unhappy citizen demanding Women's Suffrage.\
    "))
    notify.event(nil, nil, E.BEGINNER_HELP,
    _("[`events/womenssuffrage`]<br><font color=#ff20ff>Discontent reported in representative governments who lack Women's Suffrage.</font>"))
  end

  -- continue processing
  return false
end

signal.connect("building_built", "building_built_callback")



