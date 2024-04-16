
<div id="pregame_page">
  <div id="pregame_options">
	<div id="pregame_buttons">
		<div id="freeciv_logo" style="margin-top: 11px; cursor:pointer;" onclick="window.open('/', '_new');">
		</div>
      <button id="pregame_settings_button" title="Select newer game versions, change map, number of players, other settings." type="button" class="button"><i class="fa fa-cogs" aria-hidden="true"></i> SETUP</button>
      <button id="load_game_button" title="Load a saved game" type="button" class="button"><i class="fa fa-file-o" aria-hidden="true"></i> Load</button>
      <button id="pick_nation_button" title="Pick your nation" type="button" class="button"><i class="fa fa-flag" aria-hidden="true"></i> Nation</button>
      <button id="start_game_button" title="Starting the game confirms consent Site Rules" type="button" class="button"><i class="fa fa-check-circle-o" aria-hidden="true"></i><b> Start</b></button>
    </div>
  </div>

  <div id="pregame_player_list"></div>
  <div id="pregame_game_info"></div>
  <ol id="pregame_message_area"></ol>
  <div id="pregame_chat_box" style="margin-bottom:20px">
    <i class="fa fa-commenting-o fa-2" aria-hidden="true" style="color: white; font-size: 160%;"></i>
    <!-- Prevent browsers from assuming pregame_text_input is a password/autofill field! -->
    <input type="text" name="prevent_autofill" id="prevent_autofill" value="" style="display:none;" />
    <input type="password" name="password_fake" id="password_fake" value="" style="display:none;" />
    <!-- ^^ autofill killer ^^ -->
    <input id="pregame_text_input" type="text" readonly onfocus="this.removeAttribute('readonly');" onblur="this.setAttribute('readonly','');" style="width:75.5%" spellcheck="false" autocomplete="off" name="text_input" value=">" />
  </div>
</div>

<div id="pick_nation_dialog" ></div>
