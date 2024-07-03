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

--Handle events that happen on certain turns in history
function history_turn_notifications(turn, year)
  game_turn = turn

  -- Bulbs for Nomads in the first 5 turns (given at TC going to next turn)
  if turn >= 2 and turn <= 6 then
    for p in players_iterate() do
      local has_city = 0

      -- Each Settler type gets 1 bulb in first 5 turns
      for u in p:units_iterate() do
        local uname = u.utype:rule_name()
        if uname == "Settlers" or uname == "Founders" then
          p:give_bulbs(1)
        end
      end

    end
  end

  if turn > 78 and turn < 85 then
    notify.all("Philosophy will no longer award a bonus on turn 85.")
  end

  if turn == 85 then
  -- Philosophy no longer gives advances after 1600 AD
    notify.all("<font>Philosophers around the world mourn the execution of Giordano Bruno. Philosophy no longer gives a bonus advance.</font>")
    philosophy_possible = 0
    notify.event(nil, nil, E.BEGINNER_HELP,
_("[`events/giordano`]<br>[`fire`] Philosophers hide their books after Giordano Bruno is burned.<br>Philosophy no longer gives a bonus advance."))
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

-- Manage effects of triggers when certain techs are researched.
-- 1. Grant a blueprint tech when the tech Philosophy is researched.
-- 2. Announce Horseback ridng before T15
-- 3. Democracy upgrades to Workers II
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
          _("<font color=#ffff60>[`scout`] Travellers say the %s now ride horses, near %s. (%i,%i)</font>"),
          player.nation:plural_translation(), c.name, c.tile.x, c.tile.y )
          notify.all( _("<img src='/images/e/scout.png'> A tribe has learned to ride horses near %s (%i,%i)"),
           c.name, c.tile.x, c.tile.y)
        end
        if c:has_building(find.building_type("Palace")) and first_horse_warning == 0 then
          first_horse_warning = 1
          notify.event(NIL, c.tile, E.TECH_GAIN,
          _("[`events/wildbeasts`]<br><font color=#ffff60>[`scout`] Travellers tell of the %s, who ride horses near %s! (%i,%i)</font>"),
          player.nation:plural_translation(), c.name, c.tile.x, c.tile.y )
          notify.all( _("<img src='/images/e/scout.png'> A tribe has learned to ride wild beasts near %s (%i,%i)"),
           c.name, c.tile.x, c.tile.y)
        end
      end
    end
  end
--------------------------------
  -- Inform of free Workers II upgrade upon discovering Democracy
  if id == find.tech_type("Democracy").id then
    notify.event(player, NIL, E.TECH_GAIN,
    _("[`events/democracy`]<br><font color=#ffff90><b>Discovery of Democracy sparks educational socioeconomic trends.<br>Workers everywhere upgrade to Workers II for free.</b></font>"))

    for u in player:units_iterate() do
      local uname = u.utype:rule_name()
      if uname == "Workers" then
        -- This works fine for direct upgrade:  local success = u:upgrade(0)
        -- local success = u:transform(u:can_upgrade(), 0);   << this is supposed to work but maybe doesn't, but we don't need it.
        -- The below is used because we don't want a free upgrade to Engineers, only to first obsoleted_by type which is Workers II:
        local pre_gold = player:gold()
        local success = u:transform(u.utype.obsoleted_by, 0)
        if success then
           local lost_gold = pre_gold - player:gold()
            notify.event(player, u.tile, E.UNIT_UPGRADED, ("[`gift`] Workers <font color=#9090ff>upgraded for free.</font>"))
          -- This is a hack to ensure the upgrade is free. In some cases like having Explosives already, it wasn't free.
            if lost_gold > 0 then
              --DEBUG: notify.event(player, u.tile, E.UNIT_UPGRADED, ("[`gift`] %i <font color=#9090ff>gold compensated.</font>"), lost_gold)
              edit.change_gold(player, lost_gold)
            end
        end
      end
    end
  end
-------------------------------- Removed in order to nerf Theocracy
  -- Inform of Theocracy blueprints upon discovering Theology
  -- if id == find.tech_type("Theology").id then
  --   gained = player:give_tech(find.tech_type("Theocracy"), 35, false, "researched")
  --   notify.event(player, NIL, E.TECH_GAIN,
  --   _("[`events/theology`]<br><font color=#ffff90><b>Theology shows the way to divine laws and new forms of rule. <br>Priests give you blueprints for Theocracy.</b></font>"))
  -- end
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
        notify.event(player, NIL, E.TECH_GAIN,
          _("<font color=#ffdf90><b>The knowledge of Banking prevents a bonus from Philosophy.</b></font>"))
        return
      end

      forbidden_tech = find.tech_type("Medicine")
      if researcher:knows_tech(forbidden_tech) then
        notify.event(player, NIL, E.TECH_GAIN,
          _("<font color=#ffdf90><b>The knowledge of Medicine prevents a bonus from Philosophy.</b></font>"))
        return
      end

      forbidden_tech = find.tech_type("University")
      if researcher:knows_tech(forbidden_tech) then
        notify.event(player, NIL, E.TECH_GAIN,
          _("<font color=#ffdf90><b>The knowledge of University prevents a bonus from Philosophy.</b></font>"))
        return
      end

      forbidden_tech = find.tech_type("Invention")
      if researcher:knows_tech(forbidden_tech) then
        notify.event(player, NIL, E.TECH_GAIN,
          _("<font color=#ffdf90><b>The knowledge of Invention prevents a bonus from Philosophy.</b></font>"))
        return
      end

      forbidden_tech = find.tech_type("Physics")
      if researcher:knows_tech(forbidden_tech) then
        notify.event(player, NIL, E.TECH_GAIN,
          _("<font color=#ffdf90><b>The knowledge of Physics prevents a bonus from Philosophy.</b></font>"))
        return
      end

      forbidden_tech = find.tech_type("Monotheism")
      if researcher:knows_tech(forbidden_tech) then
        notify.event(player, NIL, E.TECH_GAIN,
          _("<font color=#ffdf90><b>The knowledge of Monotheism prevents a bonus from Philosophy.</b></font>"))
        return
      end

    -- Give the player free blueprints
    -- This will give a free advance for each player that shares research.
    gained = player:give_tech(nil, 35, false, "researched")

      -- Notify the player. Include the tech names in a way that makes it
      -- look natural no matter if each tech is announced or not.
    notify.event(player, NIL, E.TECH_GAIN,
                 _("[`events/philosophy`]<br><font color=#ffff90><b>Great philosophers from all the world join your civilization: you get blueprints for %s.</b></font>"),
                 gained:name_translation())

    -- Notify research partners
    notify.research(player, false, E.TECH_GAIN,
                    _("[`events/philosophy`]<br><font color=#ffff90>Great philosophers from all the world join the %s: you get blueprints for %s.</font>"),
                    player.nation:plural_translation(),
                    gained:name_translation())

    -- default.lua informs the embassies when the tech source is a hut.
    -- They should therefore be informed about the source here too.
    notify.research_embassies(player, E.TECH_EMBASSY,
            -- /* TRANS: first %s is leader or team name */
            _("[`events/philosophy2`]<br><font color=#ffff90>Great philosophers from all the world give the %s %s.</font>"),
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
Wild animals are part of the Stone Age diet. Cities can use animal tiles for extra food.\
   (TIP: Shift-W, then Ctrl-Shift-Click tiles to manage resource opportunities.)\
"))
notify.event(nil, nil, E.BEGINNER_HELP,
_("[`events/hunt`]<br>Wild animal resources are available for food."))
  end

  if turn == 20 then
    notify.event(nil, nil, E.SCRIPT,
_("<b>Ecology Report</b>\n\
Hunting has reduced wild animal populations and frightened them from human settlements.\
"))
notify.event(nil, nil, E.BEGINNER_HELP,
_("[`events/runningdeer`][`events/oldtribesmen`]<br>Animal populations no longer come near human settlements.<br>Next turn, Elder Tribesmen lose bonus for movement, work, vision, and recycle.<br>"))
  end
end

signal.connect('turn_begin', 'turn_callback')

-- Currently this is only used for calculating bounty from hunt kills:
function unit_lost_callback(unit, loser, reason)
  local num_owners = 0
  local owner = nil
  local killed_utype_name = unit.utype:rule_name()
  local fur_name = "furs"
  local gold = 2
  local food = 0
  local culture = 0

  -- Heuristic to find who killed the animal. Look for owners of units on
  -- adjacent tiles. If there is only one nationality for all the adjacent
  -- unit(s), then we know 100% for sure who killed the animal.
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

    -- We know for certain an animal was killed and who killed it:
    if num_owners == 1 then
      -- remove [] from name of animal
      killed_utype_name = killed_utype_name:sub(2, #killed_utype_name - 1)

      -- Hunt reward values:
      if killed_utype_name == "Wolf" then
        gold = 1
      elseif killed_utype_name == "Leopard" then
        gold = 3
      elseif killed_utype_name == "Tiger" then
        gold = 3
      elseif killed_utype_name == "Lion" then
        food = 1
        culture = 1
      elseif killed_utype_name == "Bear" then
        food = 1
        gold = 3
        fur_name = "hides"
      elseif killed_utype_name == "Crocodile" then
        food = 2
        gold = 3
        fur_name = "skins"
      elseif killed_utype_name == "Hippo" then
        food = 5
        fur_name = "tusks"
      elseif killed_utype_name == "Rhino" then
        gold = 3
        food = 3
        fur_name = "ivory"
      elseif killed_utype_name == "Polar Bear" then
        gold = 4
      elseif killed_utype_name == "Giant Squid" then
        food = 5
        culture = 1
        fur_name = "ink"
      else
        notify.player(owner,"%s false", killed_utype_name)
      end

      -- If food was obtained then find nearest city that collects it:
      if food > 0 then
        nearest_city = nil
        nc_dist_sq = 0
        for c in owner:cities_iterate() do
          if nearest_city == nil then
            nearest_city = c
            nc_dist_sq = unit.tile:sq_distance(c.tile)
          end
          c_dist_sq = unit.tile:sq_distance(c.tile)
          if c_dist_sq < nc_dist_sq then
            nearest_city = c
            nc_dist_sq = c_dist_sq
          end
        end
      end

      -- culture award
      edit.add_player_history(owner, culture)

      if gold > 0 or food > 0 then
        edit.change_gold(owner, gold)

        if nearest_city then
          nearest_city:give_food(food)
        else
          food = 0
        end

        if owner:is_human() then
          if food > 0 then
            notify.event(owner, unit.tile, E.UNIT_WIN_ATT,
            _("%s gets %d meat from the %s hunt, and %d gold from %s!"),
               nearest_city.name, food, killed_utype_name, gold, fur_name)
          else
            notify.event(owner, unit.tile, E.UNIT_WIN_ATT,
            _("The %s hunt gives %d gold from %s!"), killed_utype_name, gold, fur_name)
          end
        end
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

  -- Grant Code of Laws when the wonder Code of Hammurabi is built.
  if building:rule_name() == "Code of Hammurabi" then
    local player = city.owner
    local city_name = city.name
    local gained = nil;

    if player:give_tech(find.tech_type("Code of Laws"), -1, false, "researched") then
      notify.player(player, "The Code of Hammurabi provides blueprints for Code of Laws.")
    elseif player:give_tech(find.tech_type("Writing"), -1, false, "researched") then
      notify.player(player, "The Code of Hammurabi provides blueprints for Writing.")
    end

    return false
  end
  -- continue processing
  return false
end

signal.connect("building_built", "building_built_callback")

-- Mobile SAMs, AEGIS, M.Destroyer, Missile Sub, and Carrier get free ABMs if Space.2 is known
function unit_built_callback(u, city)
  local owner = u.owner
  local utype = find.unit_type('Anti-Ballistic Missile')
  --local vigil = find.action('Vigil')
  local req_tech = find.tech_type("Space.2")
  local created_ABM
  if owner:knows_tech(req_tech) then
    if u.utype:rule_name() == "Mobile SAM" or u.utype:rule_name() == "AEGIS Cruiser" or u.utype:rule_name() == "Missile Destroyer" or u.utype:rule_name() == "Missile Submarine" or u.utype:rule_name() == "Carrier" then
      created_ABM = edit.create_unit_full(owner, u.tile, utype, 0, city, 1, 1, u)
      if created_ABM then
        --edit.unit_kill(created_ABM, "killed", owner)
        edit.unit_turn(created_ABM, created_ABM:facing())
        notify.event(owner, city.tile, E.UNIT_BUILT, _("[`hammer`][`anti-ballisticmissile`] Anti-Ballistic Missile delivered to %s in %s"),u.utype:rule_name(),city.name)
        -- edit.perform_action(created_ABM, vigil)  ## TODO: when lua core is caught up and ACTION_VIGIL put in, this is the right way to do it.
        --when that day happens, remove the commit from 9 Sept 2022
        return true
      end
    end
    if u.utype:rule_name() == "Anti-Ballistic Missile" then
        edit.unit_turn(u, u:facing())
        return true
    end
 end

  -- continue processing
  return false
end

signal.connect("unit_built", "unit_built_callback")

function action_started_unit_city_callback(action, actor, city)

  -- Destroy City script (action.id==39)
    if action.id == 39 then
      local dplayer = actor.owner
      local city_owner = city.owner
      local do_partisan_message = 0
      local partisan_utype = 17
      local migrant_utype = 6

      notify.event(NIL, city.tile, E.CITY_NUKED,
      _("[`events/citydestroy`]<br>[`redexclamation`]<font color=#ffef50> The %s massacred %s—slaying all who didn't escape!</font>"),
      dplayer.nation:plural_translation(), city.name )

      -- City annihilation spawns Partisans and refugee Migrants
      local partisans = random(0, 0 + (city.size + 1) / 2) + 1
      local migrants = random(1, 0 + (city.size + 1) / 2) + 1
      if partisans > 5 then
        partisans = 5
      end
      if migrants > 5 then
        migrants = 5
      end
      if migrants + partisans > 8 then
        migrants = migrants - 1
        partisans = partisans - 1
      end

      if dplayer == city_owner then
        partisans = 0
      else
        if city:inspire_partisans(city_owner) > 0 then
          do_partisan_message = 1
          city.tile:place_partisans(city_owner, partisans + (partisan_utype*256), city:map_sq_radius())
        end
      end

      if do_partisan_message == 1 then
        notify.event(city_owner, city.tile, E.CITY_LOST,
        _("[`partisan`][`migrants`] The sack of %s releases %d Partisans and %d refugee Migrants!"), city.name, partisans, migrants)
        notify.event(dplayer, city.tile, E.UNIT_WIN_ATT,
        _("[`partisan`][`migrants`] The sack of %s releases %d Partisans and %d refugee Migrants!"), city.name, partisans, migrants)
      else
        notify.event(city_owner, city.tile, E.CITY_LOST,
        _("[`migrants`] The sack of %s releases %d refugee Migrants!"), city.name, migrants)
        notify.event(dplayer, city.tile, E.UNIT_WIN_ATT,
        _("[`migrants`] The sack of %s releases %d refugee Migrants!"), city.name, migrants)
      end

      -- map_sq_radius: 5 + 10 = 15 (everything < 4 tiles away)
      city.tile:place_partisans(city_owner, migrants + (migrant_utype*256), city:map_sq_radius()+10)

      -- Looting
      local gold = random(0, city.size * 20) + city.size
      notify.event(dplayer, city.tile, E.UNIT_WIN_ATT, _("[`gold`] Plundering <u>%s</u> yields <b>%d gold</b>!"), city.name, gold)
      dplayer:change_gold(gold)
    end
  -- continue processing
  return false
end

signal.connect("action_started_unit_city", "action_started_unit_city_callback")


