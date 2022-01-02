-- When creating new ruleset, you should copy this file only if you
-- need to override default one. Usually you should implement your
-- own scripts in ruleset specific script.lua. This way maintaining
-- ruleset is easier as you do not need to keep your own copy of
-- default.lua updated when ever it changes in Freeciv distribution.

-- only show partisan banner events the first few times it happens
partisan_spawns = 0

-- Get gold from entering a hut.
function _deflua_hut_get_gold(unit, gold)
  local owner = unit.owner

  if gold == 1 then
    notify.event(owner, unit.tile, E.HUT_GOLD, PL_("[`gold`] You found beads worth %d gold.",
                                                  "[`gold`] You found beads worth %d gold.", gold),
                gold)
    owner:change_gold(gold)
  elseif gold == 2 then  
    notify.event(owner, unit.tile, E.HUT_GOLD, PL_("[`gold`] You found medicinal herbs worth %d gold.",
                                                  "[`gold`] You found medicinal herbs worth %d gold.", gold),
                gold)
    owner:change_gold(gold)
  elseif gold == 5 then  
    notify.event(owner, unit.tile, E.HUT_GOLD, PL_("[`gold`] You found stone tools worth %d gold.",
                                                  "[`gold`] You found stone tools worth %d gold.", gold),
                gold)
    owner:change_gold(gold)
  elseif gold == 10 then  
    notify.event(owner, unit.tile, E.HUT_GOLD, PL_("[`gold`] You found furs worth %d gold.",
                                                  "[`gold`] You found furs worth %d gold.", gold),
                gold)
    owner:change_gold(gold)
  end

end

-- Get bulbs from entering a hut.
function _deflua_hut_get_bulbs(unit, bulbs)
  local owner = unit.owner

    notify.event(owner, unit.tile, E.HUT_GOLD, PL_("[`bulb`] You found ancient tablets worth %d bulb.",
                                                  "[`bulb`] You found ancient tablets worth %d bulbs.", bulbs),
                bulbs)
    owner:give_bulbs(bulbs)
end

-- Default if intended hut behavior wasn`t possible.
function _deflua_hut_consolation_prize(unit)
  _deflua_hut_get_gold(unit, 2)
end

-- Get a tech from entering a hut.
function _deflua_hut_get_tech(unit)
  local owner = unit.owner
  local tech = owner:give_tech(nil, -1, false, "hut")

  if tech then
    notify.event(owner, unit.tile, E.HUT_TECH,
                 _("[`bulb`] You found %s in ancient scrolls of wisdom."),
                 tech:name_translation())
    notify.research(owner, false, E.TECH_GAIN,
                 -- /* TRANS: One player got tech for the whole team. */
                 _("[`bulb`] The %s found %s in ancient scrolls of wisdom for you."),
                 owner.nation:plural_translation(),
                 tech:name_translation())
    notify.research_embassies(owner, E.TECH_EMBASSY,
                 -- /* TRANS: first %s is leader or team name */
                 _("[`bulb`] The %s have acquired %s from ancient scrolls of wisdom."),
                 owner:research_name_translation(),
                 tech:name_translation())
    return true
  else
    return false
  end
end

-- Get a mercenary unit from entering a hut.
function _deflua_hut_get_mercenaries(unit)
  local owner = unit.owner
  local utype = find.role_unit_type('HutTech', owner)

  if not utype or not utype:can_exist_at_tile(unit.tile) then
    utype = find.role_unit_type('Hut', nil)
    if not utype or not utype:can_exist_at_tile(unit.tile) then
      utype = nil
    end
  end

  if utype then
    notify.event(owner, unit.tile, E.HUT_MERC,
                 _("[`warriors`] A band of friendly mercenaries joins your cause."))
    owner:create_unit(unit.tile, utype, 0, nil, -1)
    return true
  end

  return false
end

-- Get a boat from entering a hut on a river.
function _deflua_hut_get_boat(unit)
  if not unit.tile:has_extra("River") then
    return false
  end

  local owner = unit.owner
  local utype = find.unit_type('Goods')
  local board = find.action('Transport Board')
  local capital = nil

  for c in owner:cities_iterate() do 
    if c:has_building(find.building_type("Palace")) then
      capital = c
      break         
    end
  end

  if owner:create_unit(unit.tile, find.unit_type("Boat"), 0, capital, -1) then
    notify.event(owner, unit.tile, E.HUT_GOLD,
                _("[`boat`] You found a boat!"))
    return true
  end

  return false
end

-- Get Goods from entering a hut.
function _deflua_hut_get_goods(unit)
  local owner = unit.owner
  local utype = find.unit_type('Goods')
  local board = find.action('Transport Board')
  local capital = nil

  for c in owner:cities_iterate() do 
    if c:has_building(find.building_type("Palace")) then
      capital = c
      break         
    end
  end

  -- if there is a capital set home city to it (otherwise nil=no_home)
  if edit.create_unit_full(owner, unit.tile, utype, 0, capital, 1, 1, unit) then
    notify.event(owner, unit.tile, E.HUT_GOLD,
                  _("[`goods`] You found a stash of exotic goods."))
    return true
  end

  -- What a shame, can't get Goods... possible consolation to get a Boat instead
  if unit.tile:has_extra("River") then
    return _deflua_hut_get_boat(unit)
  end

  return false
end

-- Get new city from hut, or settlers (nomads) if terrain is poor.
function _deflua_hut_get_city(unit)
  local owner = unit.owner
  local settlers = find.role_unit_type('Cities', owner)

  if unit:is_on_possible_city_tile() then
    owner:create_city(unit.tile, "")
    notify.event(owner, unit.tile, E.HUT_CITY,
                 _("You found a friendly city."))
    return true
  else
    if settlers and settlers:can_exist_at_tile(unit.tile) then
      notify.event(owner, unit.tile, E.HUT_SETTLER,
                   _("Friendly nomads are impressed by you, and join you."))
      owner:create_unit(unit.tile, settlers, 0, unit:get_homecity(), -1)
      return true
    else
      return false
    end
  end
end

-- Get barbarians from hut, unless close to a city, king enters, or
-- barbarians are disabled
-- Unit may die: returns true if unit is alive
function _deflua_hut_get_barbarians(unit)
  local tile = unit.tile
  local utype = unit.utype
  local owner = unit.owner

  if server.setting.get("barbarians") == "DISABLED"
    or unit.tile:city_exists_within_max_city_map(true)
    or utype:has_flag('Gameloss') then
      notify.event(owner, unit.tile, E.HUT_BARB_CITY_NEAR,
                   _("An abandoned village is here."))
    return true
  end
  
  local alive = tile:unleash_barbarians()
  if alive then
    notify.event(owner, tile, E.HUT_BARB,
                  _("[`warning`] You have unleashed a horde of barbarians!"));
  else
    notify.event(owner, tile, E.HUT_BARB_KILLED,
                  _("[`warning`] Your %s has been killed by barbarians!"),
                  utype:name_translation());
  end
  return alive
end

-- Reveal map around the hut
function _deflua_hut_reveal_map(unit)
  local owner = unit.owner

  notify.event(owner, unit.tile, E.HUT_MAP,
               _("You find a map of the surrounding terrain."))
  for revealtile in unit.tile:circle_iterate(36) do
    revealtile:show(owner)
  end
end

-- Randomly choose a hut event
function _deflua_hut_enter_callback(unit)
  local chance = random(0, 13)
  local alive = true

  if chance == 0 then
    _deflua_hut_get_gold(unit, 1)
  elseif chance >= 1 and chance <= 3 then
    _deflua_hut_get_gold(unit, 2)
  elseif chance == 4 then
    _deflua_hut_get_gold(unit, 5)
  elseif chance == 5 then
    _deflua_hut_get_gold(unit, 10)
  elseif chance == 6 then
    _deflua_hut_get_bulbs(unit, 1)
  elseif chance == 7 then
    _deflua_hut_get_bulbs(unit, 2)
  elseif chance == 8 then
    _deflua_hut_get_bulbs(unit, 5)
  elseif chance == 9 then
    if unit.tile:has_extra("River") then
      if not _deflua_hut_get_boat(unit) then
        _deflua_hut_consolation_prize(unit)
      end
    else
      _deflua_hut_consolation_prize(unit)
    end
  elseif chance == 10 then
    if not _deflua_hut_get_goods(unit) then
      _deflua_hut_consolation_prize(unit)
    end
  elseif chance == 11 then
    if not _deflua_hut_get_mercenaries(unit) then
      _deflua_hut_consolation_prize(unit)
    end
  elseif chance == 12 or chance == 13 then
    _deflua_hut_reveal_map(unit)
  end

  -- continue processing if unit is alive
  return (not alive)
end

signal.connect("hut_enter", "_deflua_hut_enter_callback")

-- Informs that the tribe has run away seeing your plane
function _deflua_hut_frighten_callback(unit, extra)
  local owner = unit.owner
  notify.event(owner, unit.tile, E.HUT_BARB,
               _("Your overflight frightens the tribe;"
                 .. " they scatter in terror."))
  return true
end
signal.connect("hut_frighten", "_deflua_hut_frighten_callback")


--[[
  Make partisans around conquered city

  if requirements to make partisans when a city is conquered is fulfilled
  this routine makes a lot of partisans based on the city`s size.
  To be candidate for partisans the following things must be satisfied:
  1) The loser of the city is the original owner.
  2) The Inspire_Partisans effect must be larger than zero.

  If these conditions are ever satisfied, the ruleset must have a unit
  with the Partisan role.

  In the default ruleset, the requirements for inspiring partisans are:
  a) Guerilla warfare must be known by at least 1 player
  b) The player must know about Communism and Gunpowder
  c) The player must run either a democracy or a communist society.
]]--

function _deflua_make_partisans_callback(city, loser, winner, reason)
  if reason ~= 'conquest' or city:inspire_partisans(loser) <= 0 then
    return
  end

  local partisan_utype = 17
  local partisan_name = "Partisans"
  local partisans = random(0, 1 + (city.size + 1) / 2) + 1
  if partisans > 8 then
    partisans = 8
  end

  if loser.government:rule_name() == "Theocracy" then
    partisan_name = "Zealots"
    partisan_utype = 16
  end

  city.tile:place_partisans(loser, partisans + (partisan_utype*256), city:map_sq_radius())

  partisan_spawns = partisan_spawns + 1
  if partisan_spawns < 5 then
    notify.event(loser, city.tile, E.CITY_LOST,
    _("[`events/partisans`]<br>[`partisan`] The loss of %s inspires %d %s!"), city.name, partisans, partisan_name)
    notify.event(winner, city.tile, E.UNIT_WIN_ATT,
    _("[`events/partisans`]<br>[`partisan`] The loss of %s inspires %d %s!"), city.name, partisans, partisan_name)
  end
end

signal.connect("city_transferred", "_deflua_make_partisans_callback")


-- Notify player about the fact that disaster had no effect if that is
-- the case
function _deflua_harmless_disaster_message(disaster, city, had_internal_effect)
  if not had_internal_effect then
    notify.event(city.owner, city.tile, E.DISASTER,
        _("We survived the disaster without serious damage."))
  end
end

signal.connect("disaster_occurred", "_deflua_harmless_disaster_message")
