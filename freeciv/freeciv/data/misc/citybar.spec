
[spec]

; Format and options of this spec file:
options = "+Freeciv-spec-Devel-2019-Jul-03"

[info]

artists = "
     Freim <...>
     Madeline Book <madeline.book@gmail.com> (citybar.trade)
"

[file]
gfx = "misc/citybar"

[grid_big]

x_top_left = 1
y_top_left = 1
pixel_border = 1
dx = 18
dy = 18

tiles = { "row", "column", "tag"

  0,  0, "citybar.shields"
  0,  1, "citybar.food"
  0,  2, "citybar.trade"

}

[grid_star]

x_top_left = 1
y_top_left = 20
pixel_border = 1
dx = 11
dy = 18

tiles = { "row", "column", "tag"

  0,  0, "citybar.occupied"
  0,  1, "citybar.occupancy_0"
  0,  2, "citybar.occupancy_1"
  0,  3, "citybar.occupancy_2"
  0,  4, "citybar.occupancy_3"
  0,  5, "citybar.occupancy_4"
  0,  6, "citybar.occupancy_5"
  0,  7, "citybar.occupancy_6"
  0,  8, "citybar.occupancy_7"
  0,  9, "citybar.occupancy_8"
  0, 10, "citybar.occupancy_9"
  0, 11, "citybar.occupancy_10"
  0, 12, "citybar.occupancy_11"
  0, 13, "citybar.occupancy_12"
  0, 14, "citybar.occupancy_13"
  0, 15, "citybar.occupancy_14"
  0, 16, "citybar.occupancy_15"
  0, 17, "citybar.occupancy_16"
  0, 18, "citybar.occupancy_17"
  0, 19, "citybar.occupancy_18"
  0, 20, "citybar.occupancy_19"
  0, 22, "citybar.occupancy_20"


}

[grid_bg]
x_top_left = 1
y_top_left = 47
pixel_border = 1
dx = 398
dy = 152

tiles = { "row", "column", "tag"

  0,  0, "citybar.background"

}
