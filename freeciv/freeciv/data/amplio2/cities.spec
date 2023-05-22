;
; The names for city tiles are not free and must follow the following rules.
; The names consists of 'style name' + '_' + 'index'. The style name is as
; specified in cities.ruleset file and the index only defines the read order
; of the images. The definitions are read starting with index 0 till the first
; missing value The index is checked against the city bonus of effect
; EFT_CITY_IMAGE and the resulting image is used to draw the city on the tile.
;
; Obviously the first tile must be 'style_name'_city_0 and the sizes must be
; in ascending order. There must also be a 'style_name'_wall_0 tile used to
; draw the wall and an occupied tile to indicate a military units in a city.
; The maximum number of images is only limited by the maximum size of a city
; (currently MAX_CITY_SIZE = 255).
;

[spec]

; Format and options of this spec file:
options = "+Freeciv-spec-Devel-2019-Jul-03"

[info]

artists = "
   CaptainTVK[TVK]
   Erwan[E]
   Smiley <www.firstcultural.com>[S]
   Hogne Håskjold <hogne@freeciv.org>[HH]
   Lexxie
"

[file]
gfx = "amplio2/cities"

[grid_main]

x_top_left = 1
y_top_left = 1
dx = 96
dy = 72
pixel_border = 1

tiles = { "row", "column", "tag"
;[E][TVK][Lexxie]
 0,  0, "city.celtic_city_0"
 0,  1, "city.celtic_city_1"
 0,  2, "city.celtic_city_2"
 0,  3, "city.celtic_city_3"
 0,  4, "city.celtic_city_4"
;[E][TVK][HH][Lexxie]
 0,  5, "city.celtic_wall_0"
 0,  6, "city.celtic_wall_1"
 0,  7, "city.celtic_wall_2"
 0,  8, "city.celtic_wall_3"
 0,  9, "city.celtic_wall_4"
;[TVK][Lexxie]
 1,  0, "city.european_city_0"
 1,  1, "city.european_city_1"
 1,  2, "city.european_city_2"
 1,  3, "city.european_city_3"
 1,  4, "city.european_city_4"
;[TVK][HH][Lexxie]
 1,  5, "city.european_wall_0"
 1,  6, "city.european_wall_1"
 1,  7, "city.european_wall_2"
 1,  8, "city.european_wall_3"
 1,  9, "city.european_wall_4"
;[TVK][Lexxie]
 2,  0, "city.classical_city_0"
 2,  1, "city.classical_city_1"
 2,  2, "city.classical_city_2"
 2,  3, "city.classical_city_3"
 2,  4, "city.classical_city_4"
;[TVK][HH][Lexxie]
 2,  5, "city.classical_wall_0"
 2,  6, "city.classical_wall_1"
 2,  7, "city.classical_wall_2"
 2,  8, "city.classical_wall_3"
 2,  9, "city.classical_wall_4"
;[E][TVK][Lexxie]
 3,  0, "city.babylonian_city_0"
 3,  1, "city.babylonian_city_1"
 3,  2, "city.babylonian_city_2"
 3,  3, "city.babylonian_city_3"
 3,  4, "city.babylonian_city_4"
;[E][TVK][HH][Lexxie]
 3,  5, "city.babylonian_wall_0"
 3,  6, "city.babylonian_wall_1"
 3,  7, "city.babylonian_wall_2"
 3,  8, "city.babylonian_wall_3"
 3,  9, "city.babylonian_wall_4"
;[TVK][Lexxie]
 4,  0, "city.asian_city_0"
 4,  1, "city.asian_city_1"
 4,  2, "city.asian_city_2"
 4,  3, "city.asian_city_3"
 4,  4, "city.asian_city_4"
;[TVK][HH][Lexxie]
 4,  5, "city.asian_wall_0"
 4,  6, "city.asian_wall_1"
 4,  7, "city.asian_wall_2"
 4,  8, "city.asian_wall_3"
 4,  9, "city.asian_wall_4"
;[TVK][Lexxie]
 5,  0, "city.tropical_city_0"
 5,  1, "city.tropical_city_1"
 5,  2, "city.tropical_city_2"
 5,  3, "city.tropical_city_3"
 5,  4, "city.tropical_city_4"
;[TVK][HH][Lexxie]
 5,  5, "city.tropical_wall_0"
 5,  6, "city.tropical_wall_1"
 5,  7, "city.tropical_wall_2"
 5,  8, "city.tropical_wall_3"
 5,  9, "city.tropical_wall_4"
;[S][Lexxie]
 6,  0, "city.industrial_city_0"
 6,  1, "city.industrial_city_1"
 6,  2, "city.industrial_city_2"
 6,  3, "city.industrial_city_3"
 6,  4, "city.industrial_city_4"
;[S][HH][Lexxie]
 6,  5, "city.industrial_wall_0"
 6,  6, "city.industrial_wall_1"
 6,  7, "city.industrial_wall_2"
 6,  8, "city.industrial_wall_3"
 6,  9, "city.industrial_wall_4"
 6, 10, "city.chand_baori_underlay" ; [Lexxie]
;[S][Lexxie]
 7,  0, "city.electricage_city_0"
 7,  1, "city.electricage_city_1"
 7,  2, "city.electricage_city_2"
 7,  3, "city.electricage_city_3"
 7,  4, "city.electricage_city_4"
;[S][HH][Lexxie]
 7,  5, "city.electricage_wall_0"
 7,  6, "city.electricage_wall_1"
 7,  7, "city.electricage_wall_2"
 7,  8, "city.electricage_wall_3"
 7,  9, "city.electricage_wall_4"
 7, 10, "city.sphinx_underlay" ; [Lexxie]
;[S][Lexxie]
 8,  0, "city.modern_city_0"
 8,  1, "city.modern_city_1"
 8,  2, "city.modern_city_2"
 8,  3, "city.modern_city_3"
 8,  4, "city.modern_city_4"
;[S][HH][Lexxie]
 8,  5, "city.modern_wall_0"
 8,  6, "city.modern_wall_1"
 8,  7, "city.modern_wall_2"
 8,  8, "city.modern_wall_3"
 8,  9, "city.modern_wall_4"
 8, 10, "city.hammurabi"      ;overlay but not replacement    ; [Lexxie]
;[S][Lexxie]
 9,  0, "city.postmodern_city_0"
 9,  1, "city.postmodern_city_1"
 9,  2, "city.postmodern_city_2"
 9,  3, "city.postmodern_city_3"
 9,  4, "city.postmodern_city_4"
;[S][HH][Lexxie]
 9,  5, "city.postmodern_wall_0"
 9,  6, "city.postmodern_wall_1"
 9,  7, "city.postmodern_wall_2"
 9,  8, "city.postmodern_wall_3"
 9,  9, "city.postmodern_wall_4"
 ;[Lexxie]
 9, 10, "city.mausoleum_overlay" ; replaces whole city graphic
 ;[Lexxie]
 10, 0, "city.coastal_overlay"
 10, 1, "city.coastal_underlay"
 10, 2, "city.fortifications_overlay"
 10, 3, "city.fortifications_underlay"
 10, 4, "city.sam_overlay"
 10, 5, "city.pyramid_overlay"  ; replaces whole city graphic
 10, 6, "city.citadel_overlay"  ; replaces whole city graphic
 10, 7, "city.ziggurat_overlay" ; replaces whole city graphic
 10, 8, "city.chichen_overlay"  ; replaces whole city graphic
 10, 9, "city.angkor_overlay"   ; replaces whole city graphic 
 10, 10,"city.hgarden_overlay"  ; replaces whole city graphic

; replaces "celtic" for the generic city style. name is nicer than "generic" and has high frequency of northern tribes. 
;[Lexxie]                               
11,  0, "city.northern_city_0"
11,  1, "city.northern_city_1"
11,  2, "city.northern_city_2"
11,  3, "city.northern_city_3"
11,  4, "city.northern_city_4"
;[Lexxie][HH]
11,  5, "city.northern_wall_0"
11,  6, "city.northern_wall_1"
11,  7, "city.northern_wall_2"
11,  8, "city.northern_wall_3"
11,  9, "city.northern_wall_4"
;Eastern Eurasian mongol,turkic,etc.
;[Lexxie]
12,  0, "city.steppes_city_0"
12,  1, "city.steppes_city_1"
12,  2, "city.steppes_city_2"
12,  3, "city.steppes_city_3"
12,  4, "city.steppes_city_4"
;[Lexxie][HH]
12,  5, "city.steppes_wall_0"
12,  6, "city.steppes_wall_1"
12,  7, "city.steppes_wall_2"
12,  8, "city.steppes_wall_3"
12,  9, "city.steppes_wall_4"
}
