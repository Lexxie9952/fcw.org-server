TODO:
-----

Current TODO-list in prioritized order here:

- Bugs are often reported to Freeciv-web on Github here: https://github.com/freeciv/freeciv-web/issues - any fixes to these bugs is very welcome. Some of the bugs are also well suited for new developers interested in contributing to Freeciv-web.

Basically you can help improve Freeciv-web in any way you like, as long at it actually makes the game better! Other things to improve there:

Unimplemented Freeciv client features:
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
