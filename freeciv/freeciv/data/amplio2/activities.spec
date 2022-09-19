
[spec]

; Format and options of this spec file: 
options = "+Freeciv-spec-Devel-2019-Jul-03"

[info]

artists = "
    Tatu Rissanen <tatu.rissanen@hut.fi>
    Jeff Mallatt <jjm@codewell.com> (miscellaneous)
    GriffonSpade [GS]
    Lexxie
"

[file]
gfx = "amplio2/activities"

[grid_main]

x_top_left = 1
y_top_left = 1
dx = 28
dy = 24
pixel_border = 1

tiles = { "row", "column", "tag"
; Unit activity letters:  (note unit icons have just "u.")

; [GS]
  0, 0, "unit.road"
  0, 1, "unit.rail"
  0, 2, "unit.maglev"
  0, 3, "unit.canal"                 ; Lexxie
  0, 4, "unit.fortify_delay"         ; Lexxie
  0, 5, "unit.sentry_hidden"         ; Lexxie
  0, 6, "unit.patrol_back"           ; Lexxie

  1, 0, "unit.outpost"
  1, 1, "unit.airstrip"
  1, 2, "unit.fortress"
  1, 3, "unit.airbase"
  1, 4, "unit.buoy"
  1, 5, "unit.fortified_hidden"      ; Lexxie
  1, 6, "unit.tileclaim"             ; Lexxie

  2, 0, "unit.fortified"
  2, 1, "unit.fortifying"
  2, 2, "unit.sentry"                ; Lexxie
  2, 3, "unit.patrol"
  2, 4, "unit.pillage"               ; Lexxie
  2, 5, "unit.hideout"               ; Lexxie
  2, 6, "unit.fishing"               ; Lexxie

  3, 0, "unit.irrigate"
  3, 1, "unit.plant"                 ; Lexxie
  3, 2, "unit.transform"             ; Lexxie
  3, 3, "unit.pollution"             ; Lexxie
  3, 4, "unit.fallout"               ; Lexxie
  3, 5, "unit.hidden"                ; Lexxie
  3, 6, "unit.deepdive"              ; Lexxie

  4, 0, "unit.goto"                  ; Lexxie
  4, 1, "unit.convert"               ; Lexxie
  4, 2, "unit.auto_explore"          ; Lexxie
  4, 3, "unit.cargo"                 ; Lexxie
  4, 4, "unit.goto_delay"            ; Lexxie
  4, 5, "unit.radar"                 ; Lexxie
  4, 6, "unit.tower"                 ; Lexxie

; [GS]
  5,  0, "unit.irrigation"
  5,  1, "unit.farmland"
  5,  2, "unit.mine"
  5,  3, "unit.oil_mine"             ; Lexxie
  5,  4, "unit.oil_rig"
  5,  5, "unit.quay"                 ; Lexxie
  5,  6, "unit.hwy"                  ; Lexxie

  6,  0, "unit.navalbase"            ; Lexxie
  6,  1, "unit.vigil"                ; Lexxie
  6,  2, "unit.castle"               ; Lexxie
  6,  3, "unit.fortifying_hidden"    ; Lexxie
  6,  4, "unit.action_decision_want" ; kvilhaugsvik, Lexxie
  6,  5, "unit.go_and"               ; Lexxie
}
