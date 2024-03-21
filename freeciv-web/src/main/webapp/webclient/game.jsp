
    <div id="game_page" style="display: none;">

		<div id="tabs">

			<ul id="tabs_menu">
			    <div id="freeciv_logo" ></div>
					<div id="ixtjkiller1" style="position: absolute; cursor: pointer; background: rgba(0, 0, 0, 0.0); overflow: hidden; left: 93px; top: 0px; z-index: 999 !important;" onclick="clickMask(event, 1)"><img id="ixtjkiller11" src="/images/ixtjkiller.png"></div>

					<li class="fcw_tab" id="map_tab"><a href="#tabs-map"><img style='float:left; margin-right:5px;' src='/images/map_tab_icon_m.png'> Map</a></li>
				<li class="fcw_tab" id="empire_tab"><a href="#tabs-empire"><img style='float:left; margin-right:5px;' src='/images/empire_tab_icon.png'> Empire</a></li>
				<li class="fcw_tab" id="civ_tab"><a href="#tabs-civ"><img style='float:left; margin-right:5px;' src='/images/gov_tab_icon.png'> Gov.</a></li>

				<li class="fcw_tab" id="tech_tab"><a id="tech_tab_item" href="#tabs-tec"><img style='float:left; margin-right:5px;' src='/images/tech_tab_icon_m.png'> Tech</a></li>
				<li class="fcw_tab" id="players_tab"><a href="#tabs-nat"><img style='float:left; margin-right:5px;' src='/images/nation_tab_icon.png'> Nations</a></li>
				<li class="fcw_tab" id="cities_tab"><a href="#tabs-cities"><img style='float:left; margin-right:5px;' src='/images/cities_tab_icon.png'> Cities</a></li>
				<li class="fcw_tab" id="opt_tab"><a href="#tabs-opt"><img style='float:left; margin-right:5px;' src='/images/prefs_tab_icon.png'> Prefs</a></li>
									<%--			<li class="fcw_tab" id="chat_tab"><a href="#tabs-chat">💬 Chat</a></li> --%>
				<li class="fcw_tab" id="hel_tab"><a href="#tabs-hel"><img style='float:left; margin-right:5px;' src='/images/help_tab_icon.png'> Help</a></li>
				<li class="fcw_tab" id="warcalc_tab"><a href="#tabs-warcalc">&#x1F3B2;Odds</a></li>

                <div id="game_status_panel_top"></div>

				<div id="turn_done_button_div">
            			  <button id="turn_done_button" type="button"
						class="button" title="Ends your turn. (Shift+Enter)">Turn Done</button>
						<img id="compass" onClick="compass_click();" style="position:absolute; float:right; background-color:transparent;margin-top:-3px;margin-left:-100px; margin-right:3px;margin-top:40px" src="/images/iso-compass.png">
        </div>
			</ul>

			<div id="tabs-map" tabindex="-1" style='overflow:hidden'>
			  <jsp:include page="canvas.jsp" flush="false"/>
			</div>
			<div id="tabs-empire">
				<jsp:include page="empire.jsp" flush="false"/>
	        </div>
			  <div id="tabs-civ">
				<jsp:include page="civilization.jsp" flush="false"/>
			</div>
			<div id="tabs-tec">
				<jsp:include page="technologies.jsp" flush="false"/>
			</div>
			<div id="tabs-nat">
				<jsp:include page="nations.jsp" flush="false"/>
			</div>
			<div id="tabs-cities">
				<jsp:include page="cities.jsp" flush="false"/>
			</div>
	<%--		<div id="tabs-chat"> --%>
	<%--				<jsp:include page="chat.jsp" flush="false"/> --%>
	<%--		</div> --%>

			<div id="tabs-hel" class="manual_doc">
			</div>

			<div id="tabs-opt">
				<jsp:include page="options.jsp" flush="false"/>
			</div>

			<div id="tabs-warcalc">
					<jsp:include page="warcalc.jsp" flush="false"/>
			</div>

		</div>
	</div>


    <div id="dialog" ></div>
    <div id="city_name_dialog" ></div>


