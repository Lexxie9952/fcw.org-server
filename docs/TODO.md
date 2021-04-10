TODO:
-----

Current TODO-list in prioritized order here:

- Bugs are often reported to Freeciv-web on Github here: https://github.com/freeciv/freeciv-web/issues - any fixes to these bugs is very welcome. Some of the bugs are also well suited for new developers interested in contributing to Freeciv-web.

Basically you can help improve Freeciv-web in any way you like, as long at it actually makes the game better! Other things to improve there:

Unimplemented Freeciv client features:
- action selection dialog pops up and down based on unit focus rather than
  opening all at once.
  - the Freeciv C clients give units that wants an action decision higher
    priority in the unit focus queue. This keeps player decisions fast.
  - makes turn change less confusing when many units on a goto reaches their
    targets.
  - gives the user freedom to delay a response without losing the reminder.
  - open action selection dialogs are stored in save games.
  - action selection dialogs are based on more up to date information.
    (Since it asks right before showing the dialog)
  - Implementation hints:
    - a unit's request for the player to chose an action is stored in its
      fields action_decision_want and action_decision_tile.
    - action_decision_want tells if an action decision is wanted and if it
      was caused by the unit being moved inside a transport
      (ACT_DEC_PASSIVE) or by the unit itself moving (ACT_DEC_ACTIVE). It is
      defined and explained in fc_types.js
    - action_decision_tile is the tile the unit wonders what to do to.
    - a unit's request for the player to chose an action can be set by the
      server based on unit movement or by the client via
      PACKET_UNIT_SSCS_SET(unit_id, type, value) where type is USSDT_QUEUE
      like key_unit_action_select() does.
    - once the player has made a decision (deciding not to act by pressing
      cancel is a decision too) the client must ask the server to clear the
      unit's action_decision_want by sending a USSDT_UNQUEUE typed
      PACKET_UNIT_SSCS_SET(unit_id, type, value).
    - the action selection dialog lives in action_dialog.js. It has recently
      become less repetitive. This should make it easier to send
      PACKET_UNIT_SSCS_SET with USSDT_UNQUEUE on all user choices.
    - when a client sends a PACKET_UNIT_GET_ACTIONS(actor_unit_id,
      target_unit_id, target_tile_id, disturb_player) the
      server will respond with the information needed for the action
      selection dialog in a PACKET_UNIT_ACTIONS.
    - the current situation is that the Freeciv-web client sends a
      PACKET_UNIT_GET_ACTIONS as soon as a unit's action decision state
      changes and the new state wants a decision. (See
      unit_actor_wants_input() and process_diplomat_arrival()) Multiple
      action selection dialogs will hide behind each other.
    - the current situation is that the Freeciv-web client clears the action
      decision as soon as an action selection dialog is received. (See
      handle_unit_actions())
    - in Freeciv C clients a PACKET_UNIT_GET_ACTIONS is sent when a unit
      gets focus OR when a unit already in focus changes action decision
      state to one that wants a decision.
    - Freeciv's common/networking/packets.def has up to date packet field
      info.
- the popup_attack_actions client setting (so attack pop up can be avoided)
- global work lists
- advanced unit selection
- rearranging items in the city production worklist
  - Maybe allow rearranging items by drag and drop?
- the cities tab
- the auto generated part of the help texts
  - the code is big (it also refers to other Freeciv C code)
  - "just rewrite the code in JavaScript"
    - would be much work
    - keeping it updated as the corresponding code changes in Freeciv would be a nightmare
    - high probability of it ending up telling lies
  - parts of the freeciv-manual output is now marked. This makes it more
    machine readable.
    - have freeciv-manual output more auto generated help texts in a form
      Freeciv-web can use.
- between turns timer count down

Unimplemented rule variation support:
- The topology server setting
  The Freeciv-web client can only display the TF_WRAPX and the non wrapping
  topology. Isometric, hex and WRAP_Y maps are unsupported.
  Testing: to test new topology support the Freeciv server must be changed.
  Open server/settings.c. Find topology_callback(). Remove the blocking of
  the toplogy you are working to support.
- The ID of certain extras are hard coded.
  - EXTRA_NONE isn't from the ruleset. There is no need to do anything about
    it.
  - replace the hard coded drawing code with code that draws the extra as
    specified by the tileset Freeciv-web extracts from and by the extra
    related packages the server sends.
  - replace the hard coded control code. Maybe delay this part until unit
    activities to becomes action enabler controlled?
- The graphic tags of certain extras are hard coded.
- Wikipedia help is only extracted for items that appear in the classic
  ruleset.
- Freeciv-web has no client side effect evaluation.
  - Building_Build_Cost_Pct doesn't work.
  - Unit_Build_Cost_Pct doesn't work.

Simplify Freeciv server upgrade:
- get rid of the worst merge conflict causes
  - freeciv_web_all_packets_def_changes:
