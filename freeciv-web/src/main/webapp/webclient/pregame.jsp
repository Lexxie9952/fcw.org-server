
<div id="pregame_page">
  <div id="pregame_options">
	<div id="pregame_buttons">
		<div id="freeciv_logo" style="margin-top: 11px; cursor:pointer;" onclick="window.open('/', '_new');">
		</div>
      <button id="pregame_settings_button" title="Select newer game versions, change map, number of players, other settings." type="button" class="button"><b style="font-size:80%">&#9881;&#65039; SETUP</b></button>
      <button id="load_game_button" title="Load a saved game" type="button" class="button"><b style="font-size:80%">&#x1F4C0; LOAD</b></button>
      <button id="pick_nation_button" title="Pick your nation" type="button" class="button"><b style="display: inline-block; height: 0px; margin-top: -5px; margin-bottom: 5px;">&#127466;&#127482;</b><b style="font-size:80%">&nbsp;NATION</b></button>
      <button id="start_game_button" title="Starting the game confirms consent to Site Rules" type="button" class="button"><b style="font-size:80%">&#x2705; START</b></button>
    </div>
  </div>

<!--
  /*
  height: 18px;
font-size: 130%;
margin-top: -5px;
margin-bottom: 5px;
padding: 0px;
display: block;
*/
-->

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
