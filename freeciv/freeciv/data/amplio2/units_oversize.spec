
[spec]

; Format and options of this spec file:
options = "+Freeciv-spec-Devel-2015-Mar-25"

[info]

;84 x 60 images give an extra 20 horizontal pixels and 12 vertical pixels for "oversize" images.

artists = "
    Fairline     [GB]
    Lexxie9952   [Lexxie]
    Captain Nemo [Nemo]
    Tanelorn     [T]
"

[file]
gfx = "amplio2/units_oversize"

[grid_main]

x_top_left = 1
y_top_left = 1
dx = 84
dy = 60
pixel_border = 1

tiles = { "row", "column", "tag"
  0,  0, "u.stealth_bomber_o"         ; GB, Lexxie
  0,  1, "u.howitzer_o"               ; Nemo, Lexxie
  0,  2, "u.ultra_heavy_bomber_o"     ; Lexxie
  0,  3, "u.jet_bomber_o"             ; Lexxie
  0,  4, "u.heavy_bomber_o"           ; GB, Lexxie
  0,  5, "u.artillery_o"              ; Lexxie
  0,  6, "u.awacs_o"                  ; Lexxie
  0,  7, "u.spy_plane_o"              ; Lexxie
  0,  8, "u.wagon"                    ; Lexxie
  0,  9, "u.truck"                    ; Lexxie
  0, 10, "u.carrier_o"                ; Lexxie
  1,  0, "u.zeppelin"                 ; Lexxie
  1,  1, "u.founder_o"                ; Lexxie
  1,  2, "u.phalanx_o"                ; Lexxie
  1,  3, "u.pikemen_o"                ; Lexxie, Tanelorn
  1,  4, "u.ballista_o"               ; Lexxie
  1,  5, "u.siege_tower_o"            ; Lexxie
  1,  6, "u.patriarch_o"              ; Lexxie
  1,  7, "u.trawler_o"                ; Lexxie
  1,  8, "u.turret_guns_o"            ; Lexxie
  1,  9, "u.armor_ii_o"               ; Lexxie, GB
  1, 10, "u.armor_o"                  ; Nemo, Lexxie
  2,  0, "u.pbomber_o"                ; Lexxie
  2,  1, "u.cargo_plane"
}
