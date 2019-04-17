
[spec]

; Format and options of this spec file:
options = "+Freeciv-spec-Devel-2015-Mar-25"

[info]
; ALLOWS amplio2 UNIT IMAGES TO ACCESS THE ENTIRE SPACE INSIDE THEIR TILE. NOW, RELATIVELY LARGER UNITS NEED
; NOT BE SIZE-REDUCED TO SEEM MUCH SMALLER THAN UNITS WHICH THEY ARE LARGER THAN IN REAL LIFE.
;
; PLEASE MAKE SURE TO REFERENCE units_oversize.spec in your amplio2.tilespec file, in the directory above this file.
;
; "Oversized" units are not necessarily oversized, but rather, they are units that may want to use some of their 
; "legitimate tile" that 64x48 size denies them. This is a slim triangular area on the far left and right of amplio2
; tile area.
;
; units_oversize (spec & png) extends units.spec & units.png. Typical units are 64x48 fitting inside a 96x48
; tile rectangle **whose corners are shared with other tiles**.  Typical 64x48 unit images can overwrite outside tile
; bounds, or stay within them. This is also true for an "oversized" image, which can stay completely within its 
; "legitimate tile."  64x48 image corners go over the bounds of shared tile corners YET CANNOT access some of the
; 16 pixels on either side that ARE INSIDE THEIR OWN LEGITIMATE TILE. Awareness of the "corner overwrite area"
; is even more important for 96x48, as it is larger. But the 96x48 size allows access to the rest of the
; "legitimate tile" the unit occupies. units_oversize.xcf has been provided (GIMP format) with a Box Outline layer
; that will show artists what parts of the "legtimate tile" are being used and which parts are in "corner overwrite" area. 
; 
; NOTE: many original 64x48 units use "corner overwrite". Thus, one should not think of using this area as forbidden.
; However, use caution when entering the extra and previously inaccessible "corner overwrite" area that 96x48 
; images allow.
;
; Note also that some clients did not anticipate these issues and hard-coded image positioning without using
; the correct "PLACE IMAGE CENTER AT TILE CENTER" methodology.  Changing image placement to tile-center is an easy code
; change, but you may want to consider being conservative in the number of pixels which cross outside the 64x48 area,
; in order to keep reasonably decent backward compatibility with non-updated clients.
;
; "Oversized" images are good for units such as battleships, large aircraft, or any other unit whose shape forces it to
; be unnaturally small when it can't use its "legitimate tile" area.
;
; An arbitrary convention is introduced to name oversized 96x48 units with _o appended. That is: u.unit_name_o

artists = "
  [Lexxie] + original artists listed in units.spec 
"

[file]
gfx = "amplio2/units_oversize"

[grid_main]

x_top_left = 1
y_top_left = 1
dx = 96
dy = 48
pixel_border = 1

tiles = { "row", "column", "tag"
				; Scenario League tags in brackets
  0,  0, "u.stealth_bomber_o"	; [GB] + [Lexxie]
  0,  1, "u.battleship_o"	    ; [Nemo] + [Lexxie]
  0,  2, "u.bomber_o"         ; [GB] 
  0,  3, "u.jet_bomber_o"     ; [Lexxie]
}
