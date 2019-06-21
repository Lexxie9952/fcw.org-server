
[spec]

; Format and options of this spec file:
options = "+Freeciv-spec-Devel-2015-Mar-25"

[info]

artists = "
    GriffonSpade
"

[file]
gfx = "misc/specialists"

[grid_main]

x_top_left = 0
y_top_left = 0
dx = 15
dy = 20

tiles = { "row", "column", "tag"
  0,  0, "specialist.elvis_0"
  0,  1, "specialist.elvis_1"
  0,  0, "specialist.entertainer_0"
  0,  1, "specialist.entertainer_1"
  0,  2, "specialist.scientist_0"
  0,  3, "specialist.scientist_1"
  0,  4, "specialist.taxman_0"
  0,  5, "specialist.taxman_1"
  0,  12,"specialist.police_0"  ;put out of place because sprite sheet order is hard-coded as the cycling order and this belongs before the others
  0,  13,"specialist.police_1"  ;some things are hard-coded to expect two alternating images 
  0,  6, "specialist.worker_0"
  0,  7, "specialist.worker_1"
  0,  8, "specialist.farmer_0"
  0,  9, "specialist.farmer_1"
  0, 10, "specialist.merchant_0"
  0, 11, "specialist.merchant_1"
}
