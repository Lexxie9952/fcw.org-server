
[spec]

; Format and options of this spec file: 
options = "+Freeciv-spec-Devel-2015-Mar-25"

[info]

;84 x 48 images give an extra 20 horizontal pixels for "oversize" images.

artists = "
    Lexxie9952 [Lexxie]
    Alex Mor [Alex]
    Allard H.S. Höfelt [AHS]
    Bebro [BB]
    Captain Nemo [Nemo][MHN]
    CapTVK [CT] <thomas@worldonline.nl>
    Curt Sibling [CS]
    Erwan [EW]
    Fairline [GB]
    GoPostal [GP]
    Oprisan Sorin [Sor]
    Tanelorn [T]
    Paul Klein Lankhorst / GukGuk [GG]
    Andrew ''Panda´´ Livings [APL]
    Vodvakov
    J. W. Bjerk / Eleazar <www.jwbjerk.com>
    qwm
    FiftyNine
"

[file]
gfx = "amplio2/units_oversize"

[grid_main]

x_top_left = 1
y_top_left = 1
dx = 84
dy = 48
pixel_border = 1

tiles = { "row", "column", "tag"
  0,  0, "u.stealth_bomber_o" ; [GB],   Lexxie
  0,  1, "u.howitzer_o"       ; [Nemo], Lexxie
  0,  2, "u.ultra_heavy_bomber_o"     ; Lexxie
  0,  3, "u.jet_bomber_o"             ; Lexxie
  0,  4, "u.heavy_bomber_o"           ; GB, Lexxie
}
