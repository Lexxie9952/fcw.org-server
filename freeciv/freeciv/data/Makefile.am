## Process this file with automake to produce Makefile.in

##removed: cimpletoon.tilespec		\	hex2t.tilespec			\	hexemplio.tilespec		\	isophex.tilespec		\	isotrident.tilespec		\	toonhex.tilespec		\	alio.tilespec			\	stdmusic.musicspec		\

if CLIENT
CLIENT_FILES =				\
	amplio2.tilespec		\
	trident.tilespec		\
	stdsounds.soundspec		\
	helpdata.txt
if CLIENT_GUI_GTK_3_0
CLIENT_FILES += \
	gtk3_menus.xml
endif
if CLIENT_GUI_GTK_3_22
CLIENT_FILES += \
	gtk3.22_menus.xml
endif
if CLIENT_GUI_GTK_3X
	gtk4_menus.xml
endif
else
CLIENT_FILES =
endif

SRV_RE_FILES = \
	civ1.serv \
	civ2.serv \
	classic.serv \
	classicplus.serv \
	default.serv \
	multiplayer.serv \
	alien.serv \
	civ2civ3.serv \
	sandbox.serv \
	mpplus.serv \
	mp2-ag.serv \
	mp2-brava.serv \
	mp2-caravel.serv \
	mp2-dragoon.serv \
	mp2a.serv \
	mp2b.serv \
	mp2c.serv \
	mp2d.serv \
	mp2e.serv

if SERVER
SERVER_FILES = $(SRV_RE_FILES)
else
if RULEDIT
SERVER_FILES = $(SRV_RE_FILES)
else
SERVER_FILES =
endif
endif

pkgdata_DATA = $(SERVER_FILES) $(CLIENT_FILES)


##removed
#	cimpletoon.tilespec \
#	hex2t.tilespec	\
#	hexemplio.tilespec	\
#	isophex.tilespec	\
#	isotrident.tilespec \
#	toonhex.tilespec	\
#	alio.tilespec	\
#	trident.tilespec	\
#	stdmusic.musicspec


EXTRA_DIST = \
	freeciv-client.png \
	gtk3_menus.xml	\
	gtk3.22_menus.xml	\
	gtk4_menus.xml	\
	amplio2.tilespec \
	stdsounds.soundspec	\
	helpdata.txt	\
	civ1.serv	\
	civ2.serv	\
	classic.serv	\
	alien.serv \
	civ2civ3.serv \
	sandbox.serv \
	mpplus.serv \
	mp2a.serv \
	mp2b.serv \
	mp2c.serv \
	mp2d.serv \
	mp2e.serv


##cimpletoon isotrident trident sophex hex2t hexemplio alio stdmusic
if CLIENT
CLIENTDATADIRS = amplio2 misc flags buildings \
 stdsounds themes wonders
else
CLIENTDATADIRS =
endif

SRV_RE_DATADIRS = default classic civ1 civ2 multiplayer alien civ2civ3 webperimental nation
if SERVER
SERVERDATADIRS = $(SRV_RE_DATADIRS) scenarios
else
if RULEDIT
SERVERDATADIRS = $(SRV_RE_DATADIRS)
else
SERVERDATADIRS =
endif
endif

if RULEDIT
RULEDITDIRS = ruledit
else
RULEDITDIRS =
endif

if CLIENT
ICONS = freeciv-client.png
else
ICONS =
endif

icondir = $(prefix)/share/pixmaps
icon_DATA=$(ICONS)

## removed: icons
SUBDIRS = $(CLIENTDATADIRS) $(SERVERDATADIRS) $(RULEDITDIRS) override
