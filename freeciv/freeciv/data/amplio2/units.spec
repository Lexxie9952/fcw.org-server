
[spec]

; Format and options of this spec file: 
options = "+Freeciv-spec-Devel-2015-Mar-25"

[info]

; Apolyton Tileset created by CapTVK with thanks to the Apolyton Civ2
; Scenario League.

; Special thanks go to:
; Alex Mor and Captain Nemo for their excellent graphics work
; in the scenarios 2194 days war, Red Front, 2nd front and other misc graphics. 
; Fairline for his huge collection of original Civ2 unit spanning centuries
; Bebro for his collection of mediveal units and ships

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
gfx = "amplio2/units"

[grid_main]

x_top_left = 1
y_top_left = 1
dx = 64
dy = 48
pixel_border = 1

tiles = { "row", "column", "tag"
				; Scenario League tags in brackets
  0,  0, "u.armor"	  	; [Nemo] & [Lexxie]
  0,  1, "u.howitzer"		; [Nemo] & [Lexxie]--fallback: u_howitzer_o is in units_oversize.spec<<FCW:remove this line if sprite sheet building fails
  0,  2, "u.battleship"	; [Lexxie]
  0,  3, "u.bomber"		  ; [GB]
  0,  4, "u.cannon"		  ; [Lexxie]
  0,  5, "u.caravan"		; [Alex] & [CT]
  0,  6, "u.carrier"		; [Nemo] & [Lexxie]
  0,  7, "u.catapult"		; [CT] & [Lexxie]
  0,  8, "u.horsemen"		; [GB] & [Lexxie]
  0,  9, "u.chariot"		; [BB] & [GB] & [Lexxie]
  0, 10, "u.cruiser"		; [Nemo] & [Lexxie]
  0, 11, "u.diplomat"		; [Nemo] & [Lexxie]
  0, 12, "u.fighter"		; [Sor] & [Lexxie]
  0, 13, "u.frigate"		; [BB]
  0, 14, "u.ironclad"		; [Nemo] & [Lexxie]
  0, 15, "u.knights"		; [BB] & [Lexxie]
  0, 16, "u.legion"		  ; [GB] & [Lexxie]
  0, 17, "u.mech_inf"		; [GB] & [Lexxie]
  0, 18, "u.warriors"		; [GB] & [Lexxie]
  0, 19, "u.musketeers" ; [Lexxie]
  1,  0, "u.nuclear"		; [Nemo] & [CS] & [Lexxie]
  1,  1, "u.phalanx"		; [GB] & [CT] & [Lexxie]
  1,  2, "u.riflemen"		; [Lexxie]
  1,  3, "u.caravel"		; [BB]
  1,  4, "u.settlers"		; [MHN] & [Lexxie]
  1,  5, "u.submarine"	; [GP]
  1,  6, "u.transport"	; [Nemo]
  1,  7, "u.trireme"		; [BB]
  1,  8, "u.archers"		; [GB] & [Lexxie]
  1,  9, "u.cavalry"		; [Lexxie]
  1, 10, "u.cruise_missile"	; [CS] & [Lexxie]
  1, 11, "u.destroyer"	  	; [Nemo] & [Lexxie]
  1, 12, "u.dragoons"		    ; [GB]
  1, 13, "u.explorer"		    ; [Alex] & [CT] & [Lexxie]
  1, 14, "u.freight"		    ; [CT] & qwm
  1, 15, "u.galleon"		    ; [BB]
  1, 16, "u.partisan"		    ; [BB] & [CT] & [Lexxie]
  1, 17, "u.pikemen"		    ; [T] & [Lexxie]
  1, 18, "u.escort_fighter" ; [Lexxie]
  1, 19, "u.medium_bomber"  ; [Lexxie]
  2,  0, "u.marines"		    ; [GB] & [Lexxie]
  2,  1, "u.spy"		        ; [EW] & [CT] & [Lexxie]
  2,  2, "u.engineers"		  ; [Nemo] & [CT] & [Lexxie]
  2,  3, "u.artillery"	   	; [Lexxie]
  2,  4, "u.helicopter"		  ; [T] & [Lexxie]
  2,  5, "u.alpine_troops"	; [Nemo] & [Lexxie]
  2,  6, "u.stealth_bomber"	; [GB] & [Lexxie]
  2,  7, "u.stealth_fighter"; [Lexxie]
  2,  8, "u.aegis_cruiser"	; [GP] & [Lexxie]
  2,  9, "u.paratroopers"	  ; [Alex] & [Lexxie]
  2, 10, "u.elephants"		  ; [Alex] & [GG] & [CT] & [Lexxie]
  2, 11, "u.crusaders"	  	; [BB]
  2, 12, "u.fanatics"		    ; [GB] & [CT] & [Lexxie]
  2, 13, "u.awacs"		      ; [Lexxie]
  2, 14, "u.worker"		      ; [GB]
  2, 15, "u.leader"		      ; [GB]
  2, 16, "u.barbarian_leader"	; FiftyNine
  2, 17, "u.migrants"		    ; Eleazar
  2, 18, "u.anti_aircraft"    ; [Lexxie] 
  3,  0, "u.well_digger"		  ; [Lexxie]
  3,  1, "u.balloon"          ; [Lexxie]
  3,  2, "u.missile_destroyer" ; [Lexxie]
  3,  3, "u.war_galley"       
  3,  4, "u.longboat"         ; Lexxie
; 3,  5, "u.battleship"      ; Lexxie
  3,  6, "u.atom_bomb"        ; Lexxie  
  3,  7, "u.galley"           ; Lexxie
  3,  8, "u.jet_fighter"      ; [Nemo] & [AHS] & [Lexxie]
  3,  9, "u.ram_ship"         ; Lexxie
  3, 10, "u.armor_ii"         ; Wahazar & Lexxie
  3, 18, "u.queen"            ; Lexxie 
}
