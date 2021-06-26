
[spec]

; Format and options of this spec file:
options = "+Freeciv-2.6-spec"

[info]

; Animal units
; All them made from Public Domain (CC0) images

artists = "
    Bardo [Bd]
    SilviaP [SP]
"

[file]
gfx = "amplio2/animals"

[grid_main]

x_top_left = 1
y_top_left = 1
dx = 64
dy = 48
pixel_border = 1

tiles = { "row", "column", "tag"
  0,  0, "u.wolf"       ; grassland, hills
  0,  1, "u.leopard"    ; forest 
  0,  2, "u.tiger"      ; jungle
  0,  3, "u.lion"       ; plains
  0,  4, "u.bear"       ; mountains
  0,  5, "u.snake"      ;
  0,  6, "u.crocodile"  ; swamp
  0,  7, "u.gorilla"    ;
  0,  8, "u.hippo"      ; lake
  0,  9, "u.rhino"      ; desert
  0, 10, "u.elephant"   ;
  0, 11, "u.polar_bear" ; tundra, arctic
  0, 12, "u.squid"      ; deep ocean
  0, 13, "u.storm"      ; ocean, mountains
}

