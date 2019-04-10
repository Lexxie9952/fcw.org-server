# Makefile for PO directory in any package using GNU gettext.
# Copyright (C) 1995-1997, 2000-2007, 2009-2010 by Ulrich Drepper <drepper@gnu.ai.mit.edu>
#
# Copying and distribution of this file, with or without modification,
# are permitted in any medium without royalty provided the copyright
# notice and this notice are preserved.  This file is offered as-is,
# without any warranty.
#
# Origin: gettext-0.19.7
GETTEXT_MACRO_VERSION = 0.19

PACKAGE = freeciv
VERSION = 3.0.91-dev
PACKAGE_BUGREPORT = https://www.hostedredmine.com/projects/freeciv

SED = /bin/sed
SHELL = /bin/sh


srcdir = .
top_srcdir = ../..


prefix = /home/vagrant/freeciv
exec_prefix = ${prefix}
datarootdir = ${prefix}/share
datadir = ${datarootdir}
localedir = ${datarootdir}/locale
gettextsrcdir = $(datadir)/gettext/po

INSTALL = /usr/bin/install -c
INSTALL_DATA = ${INSTALL} -m 644

# We use $(mkdir_p).
# In automake <= 1.9.x, $(mkdir_p) is defined either as "mkdir -p --" or as
# "$(mkinstalldirs)" or as "$(install_sh) -d". For these automake versions,
# ${SHELL} /vagrant/freeciv/freeciv/bootstrap/install-sh does not start with $(SHELL), so we add it.
# In automake >= 1.10, $(MKDIR_P) is derived from ${MKDIR_P}, which is defined
# either as "/path/to/mkdir -p" or ".../install-sh -c -d". For these automake
# versions, $(mkinstalldirs) and $(install_sh) are unused.
mkinstalldirs = $(SHELL) ${SHELL} /vagrant/freeciv/freeciv/bootstrap/install-sh -d
install_sh = $(SHELL) ${SHELL} /vagrant/freeciv/freeciv/bootstrap/install-sh
MKDIR_P = /bin/mkdir -p
mkdir_p = $(MKDIR_P)

# When building gettext-tools, we prefer to use the built programs
# rather than installed programs.  However, we can't do that when we
# are cross compiling.
CROSS_COMPILING = @CROSS_COMPILING@

GMSGFMT_ = :
GMSGFMT_no = :
GMSGFMT_yes = :
GMSGFMT = $(GMSGFMT_$(USE_MSGCTXT))
MSGFMT_ = :
MSGFMT_no = :
MSGFMT_yes = :
MSGFMT = $(MSGFMT_$(USE_MSGCTXT))
XGETTEXT_ = :
XGETTEXT_no = :
XGETTEXT_yes = :
XGETTEXT = $(XGETTEXT_$(USE_MSGCTXT))
MSGMERGE = msgmerge
MSGMERGE_UPDATE = : --update
MSGINIT = msginit
MSGCONV = msgconv
MSGFILTER = msgfilter

POFILES =  ar.po bg.po cs.po ca.po da.po de.po el.po en_GB.po eo.po es.po et.po fa.po fi.po fr.po ga.po gd.po he.po hu.po id.po it.po ja.po ko.po lt.po nl.po nb.po pl.po pt.po pt_BR.po ro.po ru.po sr.po sv.po tr.po uk.po zh_CN.po zh_TW.po
GMOFILES =  ar.gmo bg.gmo cs.gmo ca.gmo da.gmo de.gmo el.gmo en_GB.gmo eo.gmo es.gmo et.gmo fa.gmo fi.gmo fr.gmo ga.gmo gd.gmo he.gmo hu.gmo id.gmo it.gmo ja.gmo ko.gmo lt.gmo nl.gmo nb.gmo pl.gmo pt.gmo pt_BR.gmo ro.gmo ru.gmo sr.gmo sv.gmo tr.gmo uk.gmo zh_CN.gmo zh_TW.gmo
UPDATEPOFILES =  ar.po-update bg.po-update cs.po-update ca.po-update da.po-update de.po-update el.po-update en_GB.po-update eo.po-update es.po-update et.po-update fa.po-update fi.po-update fr.po-update ga.po-update gd.po-update he.po-update hu.po-update id.po-update it.po-update ja.po-update ko.po-update lt.po-update nl.po-update nb.po-update pl.po-update pt.po-update pt_BR.po-update ro.po-update ru.po-update sr.po-update sv.po-update tr.po-update uk.po-update zh_CN.po-update zh_TW.po-update
DUMMYPOFILES =  ar.nop bg.nop cs.nop ca.nop da.nop de.nop el.nop en_GB.nop eo.nop es.nop et.nop fa.nop fi.nop fr.nop ga.nop gd.nop he.nop hu.nop id.nop it.nop ja.nop ko.nop lt.nop nl.nop nb.nop pl.nop pt.nop pt_BR.nop ro.nop ru.nop sr.nop sv.nop tr.nop uk.nop zh_CN.nop zh_TW.nop
DISTFILES.common = Makefile.in.in remove-potcdate.sin \
$(DISTFILES.common.extra1) $(DISTFILES.common.extra2) $(DISTFILES.common.extra3)
DISTFILES = $(DISTFILES.common) Makevars POTFILES.in \
$(POFILES) $(GMOFILES) \
$(DISTFILES.extra1) $(DISTFILES.extra2) $(DISTFILES.extra3)

POTFILES = \
     ../../ai/default/aicity.c \
     ../../ai/default/daidiplomacy.c \
     ../../ai/difficulty.c \
     ../../ai/handicaps.c \
     ../../ai/threaded/threadedai.c \
     ../../ai/tex/texai.c \
     ../../client/agents/cma_core.c \
     ../../client/agents/cma_fec.c \
     ../../client/attribute.c \
     ../../client/audio.c \
     ../../client/chatline_common.c \
     ../../client/citydlg_common.c \
     ../../client/cityrepdata.c \
     ../../client/client_main.c \
     ../../client/climisc.c \
     ../../client/clinet.c \
     ../../client/connectdlg_common.c \
     ../../client/control.c \
     ../../client/editor.c \
     ../../client/global_worklist.c \
     ../../client/gui-gtk-3.0/action_dialog.c \
     ../../client/gui-gtk-3.0/chatline.c \
     ../../client/gui-gtk-3.0/citizensinfo.c \
     ../../client/gui-gtk-3.0/citydlg.c \
     ../../client/gui-gtk-3.0/cityrep.c \
     ../../client/gui-gtk-3.0/cma_fe.c \
     ../../client/gui-gtk-3.0/dialogs.c \
     ../../client/gui-gtk-3.0/diplodlg.c \
     ../../client/gui-gtk-3.0/editgui.c \
     ../../client/gui-gtk-3.0/editprop.c \
     ../../client/gui-gtk-3.0/finddlg.c \
     ../../client/gui-gtk-3.0/gamedlgs.c \
     ../../client/gui-gtk-3.0/gotodlg.c \
     ../../client/gui-gtk-3.0/gui_main.c \
     ../../client/gui-gtk-3.0/gui_stuff.c \
     ../../client/gui-gtk-3.0/happiness.c \
     ../../client/gui-gtk-3.0/helpdlg.c \
     ../../client/gui-gtk-3.0/inteldlg.c \
     ../../client/gui-gtk-3.0/luaconsole.c \
     ../../client/gui-gtk-3.0/mapctrl.c \
     ../../client/gui-gtk-3.0/mapview.c \
     ../../client/gui-gtk-3.0/menu.c \
     ../../client/gui-gtk-3.0/messagedlg.c \
     ../../client/gui-gtk-3.0/messagewin.c \
     ../../client/gui-gtk-3.0/optiondlg.c \
     ../../client/gui-gtk-3.0/pages.c \
     ../../client/gui-gtk-3.0/plrdlg.c \
     ../../client/gui-gtk-3.0/repodlgs.c \
     ../../client/gui-gtk-3.0/soundset_dlg.c \
     ../../client/gui-gtk-3.0/spaceshipdlg.c \
     ../../client/gui-gtk-3.0/sprite.c \
     ../../client/gui-gtk-3.0/theme_dlg.c \
     ../../client/gui-gtk-3.0/tileset_dlg.c \
     ../../client/gui-gtk-3.0/transportdlg.c \
     ../../client/gui-gtk-3.0/unitselect.c \
     ../../client/gui-gtk-3.0/unitselextradlg.c \
     ../../client/gui-gtk-3.0/unitselunitdlg.c \
     ../../client/gui-gtk-3.0/voteinfo_bar.c \
     ../../client/gui-gtk-3.0/wldlg.c \
     ../../client/gui-gtk-3.22/action_dialog.c \
     ../../client/gui-gtk-3.22/chatline.c \
     ../../client/gui-gtk-3.22/citizensinfo.c \
     ../../client/gui-gtk-3.22/citydlg.c \
     ../../client/gui-gtk-3.22/cityrep.c \
     ../../client/gui-gtk-3.22/cma_fe.c \
     ../../client/gui-gtk-3.22/dialogs.c \
     ../../client/gui-gtk-3.22/diplodlg.c \
     ../../client/gui-gtk-3.22/editgui.c \
     ../../client/gui-gtk-3.22/editprop.c \
     ../../client/gui-gtk-3.22/finddlg.c \
     ../../client/gui-gtk-3.22/gamedlgs.c \
     ../../client/gui-gtk-3.22/gotodlg.c \
     ../../client/gui-gtk-3.22/gui_main.c \
     ../../client/gui-gtk-3.22/gui_stuff.c \
     ../../client/gui-gtk-3.22/happiness.c \
     ../../client/gui-gtk-3.22/helpdlg.c \
     ../../client/gui-gtk-3.22/inputdlg.c \
     ../../client/gui-gtk-3.22/inteldlg.c \
     ../../client/gui-gtk-3.22/luaconsole.c \
     ../../client/gui-gtk-3.22/mapctrl.c \
     ../../client/gui-gtk-3.22/mapview.c \
     ../../client/gui-gtk-3.22/menu.c \
     ../../client/gui-gtk-3.22/messagedlg.c \
     ../../client/gui-gtk-3.22/messagewin.c \
     ../../client/gui-gtk-3.22/optiondlg.c \
     ../../client/gui-gtk-3.22/pages.c \
     ../../client/gui-gtk-3.22/plrdlg.c \
     ../../client/gui-gtk-3.22/repodlgs.c \
     ../../client/gui-gtk-3.22/soundset_dlg.c \
     ../../client/gui-gtk-3.22/spaceshipdlg.c \
     ../../client/gui-gtk-3.22/sprite.c \
     ../../client/gui-gtk-3.22/theme_dlg.c \
     ../../client/gui-gtk-3.22/tileset_dlg.c \
     ../../client/gui-gtk-3.22/transportdlg.c \
     ../../client/gui-gtk-3.22/unitselect.c \
     ../../client/gui-gtk-3.22/unitselextradlg.c \
     ../../client/gui-gtk-3.22/unitselunitdlg.c \
     ../../client/gui-gtk-3.22/voteinfo_bar.c \
     ../../client/gui-gtk-3.22/wldlg.c \
     ../../client/gui-qt/chatline.cpp \
     ../../client/gui-qt/citydlg.cpp \
     ../../client/gui-qt/cityrep.cpp \
     ../../client/gui-qt/dialogs.cpp \
     ../../client/gui-qt/diplodlg.cpp \
     ../../client/gui-qt/fc_client.cpp \
     ../../client/gui-qt/gotodlg.cpp \
     ../../client/gui-qt/gui_main.cpp \
     ../../client/gui-qt/helpdlg.cpp \
     ../../client/gui-qt/hudwidget.cpp \
     ../../client/gui-qt/luaconsole.cpp \
     ../../client/gui-qt/mapctrl.cpp \
     ../../client/gui-qt/mapview.cpp \
     ../../client/gui-qt/menu.cpp \
     ../../client/gui-qt/messagedlg.cpp \
     ../../client/gui-qt/messagewin.cpp \
     ../../client/gui-qt/optiondlg.cpp \
     ../../client/gui-qt/pages.cpp \
     ../../client/gui-qt/plrdlg.cpp \
     ../../client/gui-qt/ratesdlg.cpp \
     ../../client/gui-qt/repodlgs.cpp \
     ../../client/gui-qt/shortcuts.cpp \
     ../../client/gui-qt/sidebar.cpp \
     ../../client/gui-qt/spaceshipdlg.cpp \
     ../../client/gui-qt/voteinfo_bar.cpp \
     ../../client/gui-sdl2/action_dialog.c \
     ../../client/gui-sdl2/chatline.c \
     ../../client/gui-sdl2/citydlg.c \
     ../../client/gui-sdl2/cityrep.c \
     ../../client/gui-sdl2/cma_fe.c \
     ../../client/gui-sdl2/connectdlg.c \
     ../../client/gui-sdl2/dialogs.c \
     ../../client/gui-sdl2/diplodlg.c \
     ../../client/gui-sdl2/finddlg.c \
     ../../client/gui-sdl2/gotodlg.c \
     ../../client/gui-sdl2/graphics.c \
     ../../client/gui-sdl2/gui_main.c \
     ../../client/gui-sdl2/gui_tilespec.c \
     ../../client/gui-sdl2/helpdlg.c \
     ../../client/gui-sdl2/inteldlg.c \
     ../../client/gui-sdl2/mapctrl.c \
     ../../client/gui-sdl2/mapview.c \
     ../../client/gui-sdl2/menu.c \
     ../../client/gui-sdl2/messagewin.c \
     ../../client/gui-sdl2/optiondlg.c \
     ../../client/gui-sdl2/pages.c \
     ../../client/gui-sdl2/plrdlg.c \
     ../../client/gui-sdl2/repodlgs.c \
     ../../client/gui-sdl2/spaceshipdlg.c \
     ../../client/gui-sdl2/sprite.c \
     ../../client/gui-sdl2/themes.c \
     ../../client/gui-sdl2/themespec.c \
     ../../client/gui-sdl2/wldlg.c \
     ../../client/helpdata.c \
     ../../client/include/helpdlg_g.h \
     ../../client/luaconsole_common.c \
     ../../client/mapctrl_common.c \
     ../../client/options.c \
     ../../client/packhand.c \
     ../../client/plrdlg_common.c \
     ../../client/repodlgs_common.c \
     ../../client/servers.c \
     ../../client/text.c \
     ../../client/tilespec.c \
     ../../common/actions.c \
     ../../common/actions.h \
     ../../common/ai.c \
     ../../common/calendar.c \
     ../../common/city.c \
     ../../common/clientutils.c \
     ../../common/effects.c \
     ../../common/events.c \
     ../../common/extras.h \
     ../../common/fc_cmdhelp.c \
     ../../common/fc_types.h \
     ../../common/game.h \
     ../../common/government.c \
     ../../common/mapimg.c \
     ../../common/player.c \
     ../../common/player.h \
     ../../common/research.c \
     ../../common/reqtext.c \
     ../../common/requirements.c \
     ../../common/server_settings.c \
     ../../common/team.c \
     ../../common/tech.c \
     ../../common/tech.h \
     ../../common/terrain.h \
     ../../common/unit.c \
     ../../common/unittype.c \
     ../../common/unittype.h \
     ../../common/version.c \
     ../../common/networking/connection.c \
     ../../common/networking/packets.c \
     ../../common/networking/packets_json.c \
     ../../data/civ1/buildings.ruleset \
     ../../data/civ1/cities.ruleset \
     ../../data/civ1/game.ruleset \
     ../../data/civ1/governments.ruleset \
     ../../data/civ1/nations.ruleset \
     ../../data/civ1/script.lua \
     ../../data/civ1/styles.ruleset \
     ../../data/civ1/techs.ruleset \
     ../../data/civ1/terrain.ruleset \
     ../../data/civ1/units.ruleset \
     ../../data/civ2/buildings.ruleset \
     ../../data/civ2/cities.ruleset \
     ../../data/civ2/game.ruleset \
     ../../data/civ2/governments.ruleset \
     ../../data/civ2/nations.ruleset \
     ../../data/civ2/script.lua \
     ../../data/civ2/styles.ruleset \
     ../../data/civ2/techs.ruleset \
     ../../data/civ2/terrain.ruleset \
     ../../data/civ2/units.ruleset \
     ../../data/default/default.lua \
     ../../data/default/nationlist.ruleset \
     ../../data/classic/buildings.ruleset \
     ../../data/classic/cities.ruleset \
     ../../data/classic/game.ruleset \
     ../../data/classic/governments.ruleset \
     ../../data/classic/script.lua \
     ../../data/classic/styles.ruleset \
     ../../data/classic/techs.ruleset \
     ../../data/classic/terrain.ruleset \
     ../../data/classic/units.ruleset \
     ../../data/sandbox/buildings.ruleset \
     ../../data/sandbox/cities.ruleset \
     ../../data/sandbox/game.ruleset \
     ../../data/sandbox/governments.ruleset \
     ../../data/sandbox/script.lua \
     ../../data/sandbox/styles.ruleset \
     ../../data/sandbox/techs.ruleset \
     ../../data/sandbox/terrain.ruleset \
     ../../data/sandbox/units.ruleset \
     ../../data/civ2civ3/buildings.ruleset \
     ../../data/civ2civ3/cities.ruleset \
     ../../data/civ2civ3/game.ruleset \
     ../../data/civ2civ3/governments.ruleset \
     ../../data/civ2civ3/script.lua \
     ../../data/civ2civ3/styles.ruleset \
     ../../data/civ2civ3/techs.ruleset \
     ../../data/civ2civ3/terrain.ruleset \
     ../../data/civ2civ3/units.ruleset \
     ../../data/alien/buildings.ruleset \
     ../../data/alien/cities.ruleset \
     ../../data/alien/game.ruleset \
     ../../data/alien/governments.ruleset \
     ../../data/alien/nations.ruleset \
     ../../data/alien/script.lua \
     ../../data/alien/styles.ruleset \
     ../../data/alien/techs.ruleset \
     ../../data/alien/terrain.ruleset \
     ../../data/alien/units.ruleset \
     ../../data/alien/nation/adventurers.ruleset \
     ../../data/alien/nation/galacticsound.ruleset \
     ../../data/alien/nation/jw.ruleset \
     ../../data/alien/nation/kindergarden.ruleset \
     ../../data/alien/nation/lunatics.ruleset \
     ../../data/alien/nation/madmen.ruleset \
     ../../data/alien/nation/mathclub.ruleset \
     ../../data/alien/nation/secretsociety.ruleset \
     ../../data/alien/nation/teamgladiators.ruleset \
     ../../data/webperimental/buildings.ruleset \
     ../../data/webperimental/cities.ruleset \
     ../../data/webperimental/game.ruleset \
     ../../data/webperimental/governments.ruleset \
     ../../data/webperimental/script.lua \
     ../../data/webperimental/styles.ruleset \
     ../../data/webperimental/techs.ruleset \
     ../../data/webperimental/terrain.ruleset \
     ../../data/webperimental/units.ruleset \
     ../../data/helpdata.txt \
     ../../data/multiplayer/buildings.ruleset \
     ../../data/multiplayer/cities.ruleset \
     ../../data/multiplayer/game.ruleset \
     ../../data/multiplayer/governments.ruleset \
     ../../data/multiplayer/script.lua \
     ../../data/multiplayer/styles.ruleset \
     ../../data/multiplayer/techs.ruleset \
     ../../data/multiplayer/terrain.ruleset \
     ../../data/multiplayer/units.ruleset \
     ../../data/multiplayer/script.lua \
     ../../data/nation/american.ruleset \
     ../../data/nation/animals.ruleset \
     ../../data/nation/apache.ruleset \
     ../../data/nation/arab.ruleset \
     ../../data/nation/austrian.ruleset \
     ../../data/nation/aztec.ruleset \
     ../../data/nation/babylonian.ruleset \
     ../../data/nation/barbarian.ruleset \
     ../../data/nation/brazilian.ruleset \
     ../../data/nation/byzantium.ruleset \
     ../../data/nation/carthaginian.ruleset \
     ../../data/nation/celtic.ruleset \
     ../../data/nation/cherokee.ruleset \
     ../../data/nation/chinese.ruleset \
     ../../data/nation/danish.ruleset \
     ../../data/nation/dutch.ruleset \
     ../../data/nation/egyptian.ruleset \
     ../../data/nation/english.ruleset \
     ../../data/nation/ethiopian.ruleset \
     ../../data/nation/french.ruleset \
     ../../data/nation/german.ruleset \
     ../../data/nation/greek.ruleset \
     ../../data/nation/hittite.ruleset \
     ../../data/nation/hunnic.ruleset \
     ../../data/nation/inca.ruleset \
     ../../data/nation/indian.ruleset \
     ../../data/nation/indonesian.ruleset \
     ../../data/nation/iroquois.ruleset \
     ../../data/nation/italian.ruleset \
     ../../data/nation/japanese.ruleset \
     ../../data/nation/khmer.ruleset \
     ../../data/nation/korean.ruleset \
     ../../data/nation/mali.ruleset \
     ../../data/nation/mayan.ruleset \
     ../../data/nation/mongol.ruleset \
     ../../data/nation/persian.ruleset \
     ../../data/nation/pirate.ruleset \
     ../../data/nation/polish.ruleset \
     ../../data/nation/polynesian.ruleset \
     ../../data/nation/portuguese.ruleset \
     ../../data/nation/roman.ruleset \
     ../../data/nation/russian.ruleset \
     ../../data/nation/sioux.ruleset \
     ../../data/nation/songhai.ruleset \
     ../../data/nation/spanish.ruleset \
     ../../data/nation/sumerian.ruleset \
     ../../data/nation/swedish.ruleset \
     ../../data/nation/taino.ruleset \
     ../../data/nation/thai.ruleset \
     ../../data/nation/tupi.ruleset \
     ../../data/nation/turk.ruleset \
     ../../data/nation/viking.ruleset \
     ../../data/nation/zulu.ruleset \
     ../../data/alio.tilespec \
     ../../data/cimpletoon.tilespec \
     ../../data/isotrident.tilespec \
     ../../data/amplio2.tilespec \
     ../../data/isophex.tilespec \
     ../../data/hexemplio.tilespec \
     ../../data/hex2t.tilespec \
     ../../data/trident.tilespec \
     ../../data/scenarios/british-isles.sav \
     ../../data/scenarios/earth-large.sav \
     ../../data/scenarios/earth-small.sav \
     ../../data/scenarios/europe.sav \
     ../../data/scenarios/france.sav \
     ../../data/scenarios/hagworld.sav \
     ../../data/scenarios/iberian-peninsula.sav \
     ../../data/scenarios/italy.sav \
     ../../data/scenarios/japan.sav \
     ../../data/scenarios/north_america.sav \
     ../../data/scenarios/europe_1900_WWI.sav \
     ../../data/scenarios/tutorial.sav \
     ../../translations/Strings.txt \
     ../../tools/civmanual.c \
     ../../tools/download.c \
     ../../tools/modinst.c \
     ../../tools/modinst.h \
     ../../tools/mpcli.c \
     ../../tools/mpcmdline.c \
     ../../tools/mpdb.c \
     ../../tools/mpgui_gtk3.c \
     ../../tools/mpgui_gtk4.c \
     ../../tools/mpgui_qt.cpp \
     ../../tools/mpgui_qt_worker.cpp \
     ../../tools/ruleup.c \
     ../../server/actiontools.c \
     ../../server/aiiface.c \
     ../../server/auth.c \
     ../../server/barbarian.c \
     ../../server/cityhand.c \
     ../../server/citytools.c \
     ../../server/cityturn.c \
     ../../server/civserver.c \
     ../../server/commands.c \
     ../../server/connecthand.c \
     ../../server/console.c \
     ../../server/diplhand.c \
     ../../server/diplomats.c \
     ../../server/edithand.c \
     ../../server/fcdb.c \
     ../../server/gamehand.c \
     ../../server/generator/mapgen.c \
     ../../server/generator/mapgen_topology.c \
     ../../server/generator/startpos.c \
     ../../server/handchat.c \
     ../../server/maphand.c \
     ../../server/meta.c \
     ../../server/plrhand.c \
     ../../server/report.c \
     ../../server/rscompat.c \
     ../../server/rssanity.c \
     ../../server/ruleset.c \
     ../../server/savecompat.c \
     ../../server/savegame.c \
     ../../server/savegame2.c \
     ../../server/savegame3.c \
     ../../server/scripting/api_server_edit.c \
     ../../server/sernet.c \
     ../../server/settings.c \
     ../../server/settings.h \
     ../../server/spacerace.c \
     ../../server/srv_main.c \
     ../../server/stdinhand.c \
     ../../server/techtools.c \
     ../../server/unithand.c \
     ../../server/unittools.c \
     ../../server/voting.c \
     ../../utility/astring.c \
     ../../utility/bugs.c \
     ../../utility/fc_cmdline.c \
     ../../utility/fciconv.c \
     ../../utility/inputfile.c \
     ../../utility/log.c \
     ../../utility/netfile.c \
     ../../utility/netintf.c \
     ../../utility/registry_ini.c \
     ../../utility/registry_xml.c \
     ../../utility/shared.c \
     ../../utility/support.c

CATALOGS =  ar.gmo bg.gmo cs.gmo ca.gmo da.gmo de.gmo el.gmo en_GB.gmo eo.gmo es.gmo et.gmo fa.gmo fi.gmo fr.gmo ga.gmo gd.gmo he.gmo hu.gmo id.gmo it.gmo ja.gmo ko.gmo lt.gmo nl.gmo nb.gmo pl.gmo pt.gmo pt_BR.gmo ro.gmo ru.gmo sr.gmo sv.gmo tr.gmo uk.gmo zh_CN.gmo zh_TW.gmo

POFILESDEPS_ = $(srcdir)/$(DOMAIN).pot
POFILESDEPS_yes = $(POFILESDEPS_)
POFILESDEPS_no =
POFILESDEPS = $(POFILESDEPS_$(PO_DEPENDS_ON_POT))

DISTFILESDEPS_ = update-po
DISTFILESDEPS_yes = $(DISTFILESDEPS_)
DISTFILESDEPS_no =
DISTFILESDEPS = $(DISTFILESDEPS_$(DIST_DEPENDS_ON_UPDATE_PO))

# Makevars gets inserted here. (Don't remove this line!)
# Makefile variables for PO directory in any package using GNU gettext.

# Usually the message domain is the same as the package name.
DOMAIN = freeciv-core

# These two variables depend on the location of this directory.
subdir = translations/core
top_builddir = ../..

# These options get passed to xgettext.
XGETTEXT_OPTIONS = \
  --keyword=_ --flag=_:1:pass-c-format \
  --keyword=N_ --flag=N_:1:pass-c-format \
  --flag=error:3:c-format --flag=error_at_line:5:c-format \
  --flag=asprintf:2:c-format --flag=vasprintf:2:c-format \
  --flag=xasprintf:1:c-format --flag=error_logger:1:c-format \
  --flag=po_error:3:c-format --flag=po_error_at_line:5:c-format \
  --flag=po_gram_error:1:c-format --flag=po_gram_error_at_line:2:c-format

# This is the copyright holder that gets inserted into the header of the
# $(DOMAIN).pot file.  Set this to the copyright holder of the surrounding
# package.  (Note that the msgstr strings, extracted from the package's
# sources, belong to the copyright holder of the package.)  Translators are
# expected to transfer the copyright for their translations to this person
# or entity, or to disclaim their copyright.  The empty string stands for
# the public domain; in this case the translators are expected to disclaim
# their copyright.
COPYRIGHT_HOLDER = Freeciv Project

# This tells whether or not to prepend "GNU " prefix to the package
# name that gets inserted into the header of the $(DOMAIN).pot file.
# Possible values are "yes", "no", or empty.  If it is empty, try to
# detect it automatically by scanning the files in $(top_srcdir) for
# "GNU packagename" string.
PACKAGE_GNU =

# This is the email address or URL to which the translators shall report
# bugs in the untranslated strings:
# - Strings which are not entire sentences, see the maintainer guidelines
#   in the GNU gettext documentation, section 'Preparing Strings'.
# - Strings which use unclear terms or require additional context to be
#   understood.
# - Strings which make invalid assumptions about notation of date, time or
#   money.
# - Pluralisation problems.
# - Incorrect English spelling.
# - Incorrect formatting.
# It can be your email address, or a mailing list address where translators
# can write to without being subscribed, or the URL of a web page through
# which the translators can contact you.
MSGID_BUGS_ADDRESS =

# This is the list of locale categories, beyond LC_MESSAGES, for which the
# message catalogs shall be used.  It is usually empty.
EXTRA_LOCALE_CATEGORIES =

# This tells whether the $(DOMAIN).pot file contains messages with an 'msgctxt'
# context.  Possible values are "yes" and "no".  Set this to yes if the
# package uses functions taking also a message context, like pgettext(), or
# if in $(XGETTEXT_OPTIONS) you define keywords with a context argument.
USE_MSGCTXT = yes

# These options get passed to msgmerge.
# Useful options are in particular:
#   --previous            to keep previous msgids of translated messages,
#   --quiet               to reduce the verbosity.
MSGMERGE_OPTIONS = --previous --quiet

# These options get passed to msginit.
# If you want to disable line wrapping when writing PO files, add
# --no-wrap to MSGMERGE_OPTIONS, XGETTEXT_OPTIONS, and
# MSGINIT_OPTIONS.
MSGINIT_OPTIONS =

# This tells whether or not to regenerate a PO file when $(DOMAIN).pot
# has changed.  Possible values are "yes" and "no".  Set this to no if
# the POT file is checked in the repository and the version control
# program ignores timestamps.
PO_DEPENDS_ON_POT = no

# This tells whether or not to forcibly update $(DOMAIN).pot and
# regenerate PO files on "make dist".  Possible values are "yes" and
# "no".  Set this to no if the POT file and PO files are maintained
# externally.
DIST_DEPENDS_ON_UPDATE_PO = yes

.SUFFIXES:
.SUFFIXES: .po .gmo .mo .sed .sin .nop .po-create .po-update

.po.mo:
	@echo "$(MSGFMT) -c -o $@ $<"; \
	$(MSGFMT) -c -o t-$@ $< && mv t-$@ $@

.po.gmo:
	@lang=`echo $* | sed -e 's,.*/,,'`; \
	test "$(srcdir)" = . && cdcmd="" || cdcmd="cd $(srcdir) && "; \
	echo "$${cdcmd}rm -f $${lang}.gmo && $(GMSGFMT) -c --statistics --verbose -o $${lang}.gmo $${lang}.po"; \
	cd $(srcdir) && rm -f $${lang}.gmo && $(GMSGFMT) -c --statistics --verbose -o t-$${lang}.gmo $${lang}.po && mv t-$${lang}.gmo $${lang}.gmo

.sin.sed:
	sed -e '/^#/d' $< > t-$@
	mv t-$@ $@


all: all-no

all-yes: stamp-po
all-no:

# Ensure that the gettext macros and this Makefile.in.in are in sync.
CHECK_MACRO_VERSION = \
	test "$(GETTEXT_MACRO_VERSION)" = "0.19" \
	  || { echo "*** error: gettext infrastructure mismatch: using a Makefile.in.in from gettext version $(GETTEXT_MACRO_VERSION) but the autoconf macros are from gettext version 0.19" 1>&2; \
	       exit 1; \
	     }

# $(srcdir)/$(DOMAIN).pot is only created when needed. When xgettext finds no
# internationalized messages, no $(srcdir)/$(DOMAIN).pot is created (because
# we don't want to bother translators with empty POT files). We assume that
# LINGUAS is empty in this case, i.e. $(POFILES) and $(GMOFILES) are empty.
# In this case, stamp-po is a nop (i.e. a phony target).

# stamp-po is a timestamp denoting the last time at which the CATALOGS have
# been loosely updated. Its purpose is that when a developer or translator
# checks out the package via CVS, and the $(DOMAIN).pot file is not in CVS,
# "make" will update the $(DOMAIN).pot and the $(CATALOGS), but subsequent
# invocations of "make" will do nothing. This timestamp would not be necessary
# if updating the $(CATALOGS) would always touch them; however, the rule for
# $(POFILES) has been designed to not touch files that don't need to be
# changed.
stamp-po: $(srcdir)/$(DOMAIN).pot
	@$(CHECK_MACRO_VERSION)
	test ! -f $(srcdir)/$(DOMAIN).pot || \
	  test -z "$(GMOFILES)" || $(MAKE) $(GMOFILES)
	@test ! -f $(srcdir)/$(DOMAIN).pot || { \
	  echo "touch stamp-po" && \
	  echo timestamp > stamp-poT && \
	  mv stamp-poT stamp-po; \
	}

# Note: Target 'all' must not depend on target '$(DOMAIN).pot-update',
# otherwise packages like GCC can not be built if only parts of the source
# have been downloaded.

# This target rebuilds $(DOMAIN).pot; it is an expensive operation.
# Note that $(DOMAIN).pot is not touched if it doesn't need to be changed.
# The determination of whether the package xyz is a GNU one is based on the
# heuristic whether some file in the top level directory mentions "GNU xyz".
# If GNU 'find' is available, we avoid grepping through monster files.
$(DOMAIN).pot-update: $(POTFILES) $(srcdir)/POTFILES.in remove-potcdate.sed
	package_gnu="$(PACKAGE_GNU)"; \
	test -n "$$package_gnu" || { \
	  if { if (LC_ALL=C find --version) 2>/dev/null | grep GNU >/dev/null; then \
		 LC_ALL=C find -L $(top_srcdir) -maxdepth 1 -type f \
			       -size -10000000c -exec grep 'GNU freeciv' \
			       /dev/null '{}' ';' 2>/dev/null; \
	       else \
		 LC_ALL=C grep 'GNU freeciv' $(top_srcdir)/* 2>/dev/null; \
	       fi; \
	     } | grep -v 'libtool:' >/dev/null; then \
	     package_gnu=yes; \
	   else \
	     package_gnu=no; \
	   fi; \
	}; \
	if test "$$package_gnu" = "yes"; then \
	  package_prefix='GNU '; \
	else \
	  package_prefix=''; \
	fi; \
	if test -n '$(MSGID_BUGS_ADDRESS)' || test '$(PACKAGE_BUGREPORT)' = '@'PACKAGE_BUGREPORT'@'; then \
	  msgid_bugs_address='$(MSGID_BUGS_ADDRESS)'; \
	else \
	  msgid_bugs_address='$(PACKAGE_BUGREPORT)'; \
	fi; \
	case `$(XGETTEXT) --version | sed 1q | sed -e 's,^[^0-9]*,,'` in \
	  '' | 0.[0-9] | 0.[0-9].* | 0.1[0-5] | 0.1[0-5].* | 0.16 | 0.16.[0-1]*) \
	    $(XGETTEXT) --default-domain=$(DOMAIN) --directory=$(top_srcdir) \
	      --add-comments=TRANSLATORS: $(XGETTEXT_OPTIONS)  --keyword=Q_ --keyword=PL_:1,2 --language=C --escape --add-comments=TRANS: --from-code=UTF-8 \
	      --files-from=$(srcdir)/POTFILES.in \
	      --copyright-holder='$(COPYRIGHT_HOLDER)' \
	      --msgid-bugs-address="$$msgid_bugs_address" \
	    ;; \
	  *) \
	    $(XGETTEXT) --default-domain=$(DOMAIN) --directory=$(top_srcdir) \
	      --add-comments=TRANSLATORS: $(XGETTEXT_OPTIONS)  --keyword=Q_ --keyword=PL_:1,2 --language=C --escape --add-comments=TRANS: --from-code=UTF-8 \
	      --files-from=$(srcdir)/POTFILES.in \
	      --copyright-holder='$(COPYRIGHT_HOLDER)' \
	      --package-name="$${package_prefix}freeciv" \
	      --package-version='3.0.91-dev' \
	      --msgid-bugs-address="$$msgid_bugs_address" \
	    ;; \
	esac
	test ! -f $(DOMAIN).po || { \
	  if test -f $(srcdir)/$(DOMAIN).pot-header; then \
	    sed -e '1,/^#$$/d' < $(DOMAIN).po > $(DOMAIN).1po && \
	    cat $(srcdir)/$(DOMAIN).pot-header $(DOMAIN).1po > $(DOMAIN).po; \
	    rm -f $(DOMAIN).1po; \
	  fi; \
	  if test -f $(srcdir)/$(DOMAIN).pot; then \
	    sed -f remove-potcdate.sed < $(srcdir)/$(DOMAIN).pot > $(DOMAIN).1po && \
	    sed -f remove-potcdate.sed < $(DOMAIN).po > $(DOMAIN).2po && \
	    if cmp $(DOMAIN).1po $(DOMAIN).2po >/dev/null 2>&1; then \
	      rm -f $(DOMAIN).1po $(DOMAIN).2po $(DOMAIN).po; \
	    else \
	      rm -f $(DOMAIN).1po $(DOMAIN).2po $(srcdir)/$(DOMAIN).pot && \
	      mv $(DOMAIN).po $(srcdir)/$(DOMAIN).pot; \
	    fi; \
	  else \
	    mv $(DOMAIN).po $(srcdir)/$(DOMAIN).pot; \
	  fi; \
	}

# This rule has no dependencies: we don't need to update $(DOMAIN).pot at
# every "make" invocation, only create it when it is missing.
# Only "make $(DOMAIN).pot-update" or "make dist" will force an update.
$(srcdir)/$(DOMAIN).pot:
	$(MAKE) $(DOMAIN).pot-update

# This target rebuilds a PO file if $(DOMAIN).pot has changed.
# Note that a PO file is not touched if it doesn't need to be changed.
$(POFILES): $(POFILESDEPS)
	@lang=`echo $@ | sed -e 's,.*/,,' -e 's/\.po$$//'`; \
	if test -f "$(srcdir)/$${lang}.po"; then \
	  test -f $(srcdir)/$(DOMAIN).pot || $(MAKE) $(srcdir)/$(DOMAIN).pot; \
	  test "$(srcdir)" = . && cdcmd="" || cdcmd="cd $(srcdir) && "; \
	  echo "$${cdcmd}$(MSGMERGE_UPDATE) $(MSGMERGE_OPTIONS) --lang=$${lang} $${lang}.po $(DOMAIN).pot"; \
	  cd $(srcdir) \
	    && { case `$(MSGMERGE) --version | sed 1q | sed -e 's,^[^0-9]*,,'` in \
	           '' | 0.[0-9] | 0.[0-9].* | 0.1[0-7] | 0.1[0-7].*) \
	             $(MSGMERGE_UPDATE) $(MSGMERGE_OPTIONS) $${lang}.po $(DOMAIN).pot;; \
	           *) \
	             $(MSGMERGE_UPDATE) $(MSGMERGE_OPTIONS) --lang=$${lang} $${lang}.po $(DOMAIN).pot;; \
	         esac; \
	       }; \
	else \
	  $(MAKE) $${lang}.po-create; \
	fi


install: install-exec install-data
install-exec:
install-data: install-data-no
	if test "$(PACKAGE)" = "gettext-tools"; then \
	  $(mkdir_p) $(DESTDIR)$(gettextsrcdir); \
	  for file in $(DISTFILES.common) Makevars.template; do \
	    $(INSTALL_DATA) $(srcdir)/$$file \
			    $(DESTDIR)$(gettextsrcdir)/$$file; \
	  done; \
	  for file in Makevars; do \
	    rm -f $(DESTDIR)$(gettextsrcdir)/$$file; \
	  done; \
	else \
	  : ; \
	fi
install-data-no: all
install-data-yes: all
	@catalogs='$(CATALOGS)'; \
	for cat in $$catalogs; do \
	  cat=`basename $$cat`; \
	  lang=`echo $$cat | sed -e 's/\.gmo$$//'`; \
	  dir=$(localedir)/$$lang/LC_MESSAGES; \
	  $(mkdir_p) $(DESTDIR)$$dir; \
	  if test -r $$cat; then realcat=$$cat; else realcat=$(srcdir)/$$cat; fi; \
	  $(INSTALL_DATA) $$realcat $(DESTDIR)$$dir/$(DOMAIN).mo; \
	  echo "installing $$realcat as $(DESTDIR)$$dir/$(DOMAIN).mo"; \
	  for lc in '' $(EXTRA_LOCALE_CATEGORIES); do \
	    if test -n "$$lc"; then \
	      if (cd $(DESTDIR)$(localedir)/$$lang && LC_ALL=C ls -l -d $$lc 2>/dev/null) | grep ' -> ' >/dev/null; then \
	        link=`cd $(DESTDIR)$(localedir)/$$lang && LC_ALL=C ls -l -d $$lc | sed -e 's/^.* -> //'`; \
	        mv $(DESTDIR)$(localedir)/$$lang/$$lc $(DESTDIR)$(localedir)/$$lang/$$lc.old; \
	        mkdir $(DESTDIR)$(localedir)/$$lang/$$lc; \
	        (cd $(DESTDIR)$(localedir)/$$lang/$$lc.old && \
	         for file in *; do \
	           if test -f $$file; then \
	             ln -s ../$$link/$$file $(DESTDIR)$(localedir)/$$lang/$$lc/$$file; \
	           fi; \
	         done); \
	        rm -f $(DESTDIR)$(localedir)/$$lang/$$lc.old; \
	      else \
	        if test -d $(DESTDIR)$(localedir)/$$lang/$$lc; then \
	          :; \
	        else \
	          rm -f $(DESTDIR)$(localedir)/$$lang/$$lc; \
	          mkdir $(DESTDIR)$(localedir)/$$lang/$$lc; \
	        fi; \
	      fi; \
	      rm -f $(DESTDIR)$(localedir)/$$lang/$$lc/$(DOMAIN).mo; \
	      ln -s ../LC_MESSAGES/$(DOMAIN).mo $(DESTDIR)$(localedir)/$$lang/$$lc/$(DOMAIN).mo 2>/dev/null || \
	      ln $(DESTDIR)$(localedir)/$$lang/LC_MESSAGES/$(DOMAIN).mo $(DESTDIR)$(localedir)/$$lang/$$lc/$(DOMAIN).mo 2>/dev/null || \
	      cp -p $(DESTDIR)$(localedir)/$$lang/LC_MESSAGES/$(DOMAIN).mo $(DESTDIR)$(localedir)/$$lang/$$lc/$(DOMAIN).mo; \
	      echo "installing $$realcat link as $(DESTDIR)$(localedir)/$$lang/$$lc/$(DOMAIN).mo"; \
	    fi; \
	  done; \
	done

install-strip: install

installdirs: installdirs-exec installdirs-data
installdirs-exec:
installdirs-data: installdirs-data-no
	if test "$(PACKAGE)" = "gettext-tools"; then \
	  $(mkdir_p) $(DESTDIR)$(gettextsrcdir); \
	else \
	  : ; \
	fi
installdirs-data-no:
installdirs-data-yes:
	@catalogs='$(CATALOGS)'; \
	for cat in $$catalogs; do \
	  cat=`basename $$cat`; \
	  lang=`echo $$cat | sed -e 's/\.gmo$$//'`; \
	  dir=$(localedir)/$$lang/LC_MESSAGES; \
	  $(mkdir_p) $(DESTDIR)$$dir; \
	  for lc in '' $(EXTRA_LOCALE_CATEGORIES); do \
	    if test -n "$$lc"; then \
	      if (cd $(DESTDIR)$(localedir)/$$lang && LC_ALL=C ls -l -d $$lc 2>/dev/null) | grep ' -> ' >/dev/null; then \
	        link=`cd $(DESTDIR)$(localedir)/$$lang && LC_ALL=C ls -l -d $$lc | sed -e 's/^.* -> //'`; \
	        mv $(DESTDIR)$(localedir)/$$lang/$$lc $(DESTDIR)$(localedir)/$$lang/$$lc.old; \
	        mkdir $(DESTDIR)$(localedir)/$$lang/$$lc; \
	        (cd $(DESTDIR)$(localedir)/$$lang/$$lc.old && \
	         for file in *; do \
	           if test -f $$file; then \
	             ln -s ../$$link/$$file $(DESTDIR)$(localedir)/$$lang/$$lc/$$file; \
	           fi; \
	         done); \
	        rm -f $(DESTDIR)$(localedir)/$$lang/$$lc.old; \
	      else \
	        if test -d $(DESTDIR)$(localedir)/$$lang/$$lc; then \
	          :; \
	        else \
	          rm -f $(DESTDIR)$(localedir)/$$lang/$$lc; \
	          mkdir $(DESTDIR)$(localedir)/$$lang/$$lc; \
	        fi; \
	      fi; \
	    fi; \
	  done; \
	done

# Define this as empty until I found a useful application.
installcheck:

uninstall: uninstall-exec uninstall-data
uninstall-exec:
uninstall-data: uninstall-data-no
	if test "$(PACKAGE)" = "gettext-tools"; then \
	  for file in $(DISTFILES.common) Makevars.template; do \
	    rm -f $(DESTDIR)$(gettextsrcdir)/$$file; \
	  done; \
	else \
	  : ; \
	fi
uninstall-data-no:
uninstall-data-yes:
	catalogs='$(CATALOGS)'; \
	for cat in $$catalogs; do \
	  cat=`basename $$cat`; \
	  lang=`echo $$cat | sed -e 's/\.gmo$$//'`; \
	  for lc in LC_MESSAGES $(EXTRA_LOCALE_CATEGORIES); do \
	    rm -f $(DESTDIR)$(localedir)/$$lang/$$lc/$(DOMAIN).mo; \
	  done; \
	done

check: all

info dvi ps pdf html tags TAGS ctags CTAGS ID:

mostlyclean:
	rm -f remove-potcdate.sed
	rm -f stamp-poT
	rm -f core core.* $(DOMAIN).po $(DOMAIN).1po $(DOMAIN).2po *.new.po
	rm -fr *.o

clean: mostlyclean

distclean: clean
	rm -f Makefile Makefile.in POTFILES *.mo

maintainer-clean: distclean
	@echo "This command is intended for maintainers to use;"
	@echo "it deletes files that may require special tools to rebuild."
	rm -f stamp-po $(GMOFILES)

distdir = $(top_builddir)/$(PACKAGE)-$(VERSION)/$(subdir)
dist distdir:
	test -z "$(DISTFILESDEPS)" || $(MAKE) $(DISTFILESDEPS)
	@$(MAKE) dist2
# This is a separate target because 'update-po' must be executed before.
dist2: stamp-po $(DISTFILES)
	dists="$(DISTFILES)"; \
	if test "$(PACKAGE)" = "gettext-tools"; then \
	  dists="$$dists Makevars.template"; \
	fi; \
	if test -f $(srcdir)/$(DOMAIN).pot; then \
	  dists="$$dists $(DOMAIN).pot stamp-po"; \
	fi; \
	if test -f $(srcdir)/ChangeLog; then \
	  dists="$$dists ChangeLog"; \
	fi; \
	for i in 0 1 2 3 4 5 6 7 8 9; do \
	  if test -f $(srcdir)/ChangeLog.$$i; then \
	    dists="$$dists ChangeLog.$$i"; \
	  fi; \
	done; \
	if test -f $(srcdir)/LINGUAS; then dists="$$dists LINGUAS"; fi; \
	for file in $$dists; do \
	  if test -f $$file; then \
	    cp -p $$file $(distdir) || exit 1; \
	  else \
	    cp -p $(srcdir)/$$file $(distdir) || exit 1; \
	  fi; \
	done

update-po: Makefile
	$(MAKE) $(DOMAIN).pot-update
	test -z "$(UPDATEPOFILES)" || $(MAKE) $(UPDATEPOFILES)
	$(MAKE) update-gmo

# General rule for creating PO files.

.nop.po-create:
	@lang=`echo $@ | sed -e 's/\.po-create$$//'`; \
	echo "File $$lang.po does not exist. If you are a translator, you can create it through 'msginit'." 1>&2; \
	exit 1

# General rule for updating PO files.

.nop.po-update:
	@lang=`echo $@ | sed -e 's/\.po-update$$//'`; \
	if test "$(PACKAGE)" = "gettext-tools" && test "$(CROSS_COMPILING)" != "yes"; then PATH=`pwd`/../src:$$PATH; fi; \
	tmpdir=`pwd`; \
	echo "$$lang:"; \
	test "$(srcdir)" = . && cdcmd="" || cdcmd="cd $(srcdir) && "; \
	echo "$${cdcmd}$(MSGMERGE) $(MSGMERGE_OPTIONS) --lang=$$lang $$lang.po $(DOMAIN).pot -o $$lang.new.po"; \
	cd $(srcdir); \
	if { case `$(MSGMERGE) --version | sed 1q | sed -e 's,^[^0-9]*,,'` in \
	       '' | 0.[0-9] | 0.[0-9].* | 0.1[0-7] | 0.1[0-7].*) \
	         $(MSGMERGE) $(MSGMERGE_OPTIONS) -o $$tmpdir/$$lang.new.po $$lang.po $(DOMAIN).pot;; \
	       *) \
	         $(MSGMERGE) $(MSGMERGE_OPTIONS) --lang=$$lang -o $$tmpdir/$$lang.new.po $$lang.po $(DOMAIN).pot;; \
	     esac; \
	   }; then \
	  if cmp $$lang.po $$tmpdir/$$lang.new.po >/dev/null 2>&1; then \
	    rm -f $$tmpdir/$$lang.new.po; \
	  else \
	    if mv -f $$tmpdir/$$lang.new.po $$lang.po; then \
	      :; \
	    else \
	      echo "msgmerge for $$lang.po failed: cannot move $$tmpdir/$$lang.new.po to $$lang.po" 1>&2; \
	      exit 1; \
	    fi; \
	  fi; \
	else \
	  echo "msgmerge for $$lang.po failed!" 1>&2; \
	  rm -f $$tmpdir/$$lang.new.po; \
	fi

$(DUMMYPOFILES):

update-gmo: Makefile $(GMOFILES)
	@:

# Recreate Makefile by invoking config.status. Explicitly invoke the shell,
# because execution permission bits may not work on the current file system.
# Use /bin/bash, which is the shell determined by autoconf for the use by its
# scripts, not $(SHELL) which is hardwired to /bin/sh and may be deficient.
Makefile: Makefile.in.in Makevars $(top_builddir)/config.status POTFILES.in
	cd $(top_builddir) \
	  && /bin/bash ./config.status $(subdir)/$@.in po-directories

force:

# Tell versions [3.59,3.63) of GNU make not to export all variables.
# Otherwise a system limit (for SysV at least) may be exceeded.
.NOEXPORT:
