<center>

<h2>Game Options</h2>

<div style="white-space: nowrap; display:inline; padding:0px; margin-left:9px;"><span><b style="display:inline">Music:</b><select title="Music style (ctrl-alt-B)" name="select_music_modality" id="select_music_modality" onchange="change_modality(this.value)">
  <option id="mmo_normal" name="mmo_normal" title="Everything except hardcore battle music" value="normal" selected>Normal</option>
  <option id="mmo_battle" name="mmo_battle" title="Only battle music" value="battle">Battle</option>
  <option id="mmo_peaceful" name="mmo_peaceful" title="No battle music nor 'intense' music" value="peaceful">Peaceful</option>
  <option id="mmo_all" name="mmo_all" value="all">All</option>
</select><audio id="audioplayer" style="display:inline" preload="none">Music</audio></span></div>
<table>
<tr>
  <td>
    <div class="main_menu_buttons">
      <button id="save_button" type="button" class="button setting_button" onClick="save_game();" title="Saves your current game so you can continue later. Press Ctrl+S to quick save the game.">Save Game (Ctrl+S)</button>
    </div>
  </td>
  <td>
    <div class="main_menu_buttons">
      <button id="fullscreen_button" type="button" class="button setting_button" onClick="show_fullscreen_window();" title="Enables fullscreen window mode" >Fullscreen (Alt+S)</button>
    </div>
  </td>
</tr>
</table>

<div title="Length of turn" class="main_menu_buttons" id="timeout_setting_div">
  Timeout (seconds per turn): &nbsp; <input style="background-color:#101020; color:rgb(194, 194, 194); width:60px" type='number' name='timeout_setting' id='timeout_setting' size='6' length='3' max='3600' step='1'>
  <span id="timeout_info"></span>
</div>

<font color="#b0e5ff"></font>

<table style="font-family:Helvetica; font-size: 90%;" cellspacing="0" cellpadding="0">
<tr class="options_row">
  <td>
    <div style="margin-top:15px" class="main_menu_buttons">
      <b style='color:white'>Map Display:</b>
  </div>
  </td>
  <td></td>
</tr>

<tr class="options_row">
  <td>
    <div title="(SHIFT-W) Shows worked city tile output on main map" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='draw_city_output' id='draw_city_output'>
        <label for="draw_city_output" name="draw_city_output_lbl" class="css-label dark-check-cyan"><font color="#b0f4ff">Show worked city tiles</font></label>
    </div>
  </td>
  <td>
    <div title="(CTRL-M) Shows citizen mood for cities on the main map." class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='draw_city_mood' id='draw_city_mood'>
        <label for="draw_city_mood" name="draw_city_mood_lbl" class="css-label dark-check-cyan"><font color="#b0f4ff">Show city moods</font></label>
    </div>
  </td>
</tr>

<tr class="options_row">
  <td>
    <div title="(CTRL-ALT-P) Highlights polluted tiles everywhere on map" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='draw_highlighted_pollution' id='draw_highlighted_pollution'>
        <label for="draw_highlighted_pollution" name="draw_highlighted_pollution_lbl" class="css-label dark-check-cyan"><font color="#b0f4ff">Highlight pollution</font></label>
    </div>
  </td>
  <td>
    <div title="(CTRL-L) Shows incoming/outgoing airlift capacity in city labels on the map." class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='airlift_setting' id='airlift_setting' checked>
        <label for="airlift_setting" name="airlift_setting_lbl" class="css-label dark-check-cyan"><font color="#b0f4ff">City airlift counters</font></label>
    </div>
  </td>
</tr>

<tr class="options_row">
  <td>
    <div title="(CTRL-G) Draw grids over map tiles." class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='draw_map_grid' id='draw_map_grid' checked>
        <label for="draw_map_grid" name="draw_map_grid_lbl" class="css-label dark-check-cyan"><font color="#b0f4ff">Draw map grid</font></label>
    </div>
  </td>
  <td>
    <div title="(SHIFT-M) Movement Point Percentage displayed over units on map" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='show_unit_mp' id='show_unit_mp'>
        <label for="show_unit_mp" name="show_unit_mp_lbl" class="css-label dark-check-cyan"><font color="#b0f4ff">Unit move points</font></label>
    </div>
  </td>
</tr>

<tr class="options_row">
  <td>
    <div title="Show compass in upper right corner of map" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='show_compass' id='show_compass'>
        <label for="show_compass" name="show_compass_lbl" class="css-label dark-check-cyan"><font color="#b0f4ff">Show compass</font></label>
    </div>
  </td>
  <td></td>
</tr>

<tr class="options_row">
  <td>
    <div style="margin-top:15px" class="main_menu_buttons">
      <b style='color:white'>National Borders:</b>
    </div>
  </td>
  <td></td>
</tr>

<tr class="options_row">
  <td>
    <div title="(ALT-B) Shows borders as a solid line in the three national colors of the nation" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='tricolor_borders' id='tricolor_borders' checked>
        <label for="tricolor_borders" name="tricolor_borders_lbl" class="css-label dark-check-orange"><font color="#f0e0c0">Tricolor borders</font></label>
    </div>
  </td>
  <td>
    <div title="Draws borders with extra thickness" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='thick_borders' id='thick_borders' checked>
        <label for="thick_borders" name="thick_borders_lbl" class="css-label dark-check-orange"><font color="#f0e0c0">Thick borders</font></label>
    </div>
  </td>
</tr>

<tr class="options_row">
  <td>
    <div title="(CTRL-B) Put flags along national borders" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='fill_borders' id='fill_borders'>
        <label for="fill_borders" name="fill_borders_lbl" class="css-label dark-check-orange"><font color="#f0e0c0">Show border flags</font></label>
    </div>
  </td>
  <td>
    <div title="(ALT-SHIFT-B) Animates borders for increased visibility" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='moving_borders' id='moving_borders'>
        <label for="moving_borders" name="moving_borders_lbl" class="css-label dark-check-orange"><font color="#f0e0c0">Moving borders</font></label>
    </div>
  </td>
</tr>

<tr class="options_row">
  <td>
    <div title="Use classic dashed line in primary national color. (Prevents bi-color and tricolor.)" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='dashed_borders' id='dashed_borders' checked>
        <label for="dashed_borders" name="dashed_borders_lbl" class="css-label dark-check-orange"><font color="#f0e0c0">Classic borders</font></label>
    </div>
  </td>
    <td>
      <div title="(ALT-B) Whether to draw borders" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='no_borders' id='no_borders' checked>
        <label for="no_borders" name="no_borders_lbl" class="css-label dark-check-orange"><font color="#f0e0c0">No borders</font></label>
      </div>
    </td>
</tr>

<tr class="options_row">
  <td>
    <div style="margin-top:15px" class="main_menu_buttons">
      <b style='color:white'>User Interface:</b>
    </div>
  </td>
  <td></td>
</tr>

<tr class="options_row">
  <td>
    <div title="Whether double-tap-drag moves the map canvas" class="main_menu_buttons">
      <input type="checkbox" class="css-checkbox" name="map_drag_enabled" id="map_drag_enabled" checked="checked" />
      <label for="map_drag_enabled" name="map_drag_enabled_lbl" class="css-label dark-check-green"><font color="#e8f8e0">Map dragging</font></label>
    </div>
  </td>
  <td>
    <div title="Whether touch-and-dragging a unit begins a GOTO order" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='enable_goto_drag' id='enable_goto_drag' checked>
        <label for="enable_goto_drag" name="enable_goto_drag_lbl" class="css-label dark-check-green"><font color="#e8f8e0">GOTO dragging</font></label>
    </div>
  </td>
</tr>

<tr class="options_row">
  <td>
    <div title='Replaces double-click unit orders menu with single tap. (Recommended for mobile devices only.)' class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='unit_click_menu' id='unit_click_menu' checked>
        <label for="unit_click_menu" name="unit_click_menu_lbl" class="css-label dark-check-green"><font color="#e8f8e0">Tap unit for orders</font></label>
    </div>
  </td>
  <td>
    <div title="(ALT-SHIFT-F) Keeps selected unit centered on map" class="main_menu_buttons">
      <input type='checkbox' class="css-checkbox" name='focuslock_setting' id='focuslock_setting'>
      <label for="focuslock_setting" name="focuslock_setting_lbl" class="css-label dark-check-green"><font color="#e8f8e0">Focus-lock active unit</font></label>
   </div>
 </td>
</tr>

<tr class="options_row">
  <td>
    <div title="Shortcut buttons for unit orders at bottom of screen" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='show_order_buttons' id='show_order_buttons' checked>
        <label for="show_order_buttons" name="show_order_buttons_lbl" class="css-label dark-check-green"><font color="#e8f8e0">Orders Buttons</font></label>
    </div>
  </td>
  <td>
    <div title="(CTRL-A) Units auto-attack without showing odds or asking confirmation" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='auto_attack' id='auto_attack'>
        <label for="auto_attack" name="auto_attack_lbl" class="css-label dark-check-green"><font color="#e8f8e0">Auto-attack</font></label>
    </div>
  </td>
</tr>

<tr class="options_row">
  <td>
    <div title="Enable Auto-explore 'X' hotkey" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='enable_autoexplore' id='enable_autoexplore' checked>
        <label for="enable_autoexplore" name="enable_autoexplore_lbl" class="css-label dark-check-green"><font color="#e8f8e0">Enable auto-explore</font></label>
    </div>
  </td>
  <td>
    <div title="Fits more info but may need scrolling" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='scroll_narrow_x' id='scroll_narrow_x'>
        <label for="scroll_narrow_x" name="scroll_narrow_x_lbl" class="css-label dark-check-green"><font color="#e8f8e0">Mobile: wider rows</font></label>
    </div>
  </td>
</tr>

<tr class="options_row">
  <td>
    <div title="Show timestamps for critical events that occurred while logged off (Longturn)" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='show_timestamps' id='show_timestamps' checked>
        <label for="show_timestamps" name="show_timestamps_lbl" class="css-label dark-check-green"><font color="#e8f8e0">Show timestamps</font></label>
    </div>
  </td>
  <td>
    <div title="Set Help-click to ALT-SHIFT-Click (for users who can't Win-Click or CMD-Click)" class="main_menu_buttons">
      <input type='checkbox' class="css-checkbox" name='reconfig_metakey' id='reconfig_metakey' checked>
      <label for="reconfig_metakey" name="reconfig_metakey_lbl" class="css-label dark-check-green"><font id="metakeytext" color="#e8f8e0">ALT-SHIFT-Click = Help-click</font></label>
  </div>
  </td>
</tr>

<tr class="options_row">
  <td>
    <div style="margin-top:15px" class="main_menu_buttons">
      <b style='color:white'>Tabs:</b>
    </div>
  </td>
  <td></td>
</tr>

<tr class="options_row">
  <td>
    <div title="Enables the Empire Tab (for advanced players)" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='show_empire' id='show_empire'>
        <label for="show_empire" name="show_empire_lbl" class="css-label dark-check-white"><font color="#e7e7e7">Show Empire Tab</font></label>
    </div>
  </td>
  <td>
    <div title="(ALT-W) Enters the War Calculator" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='show_warcalc' id='show_warcalc'>
        <label for="show_warcalc" name="show_warcalc_lbl" class="css-label dark-check-cyan"><font color="#e7e7e7">Enter Warcalc</font></label>
    </div>
  </td>
</tr>

<tr class="options_row">
  <td>
    <div style="margin-top:15px" class="main_menu_buttons">
      <b style='color:white'>Audio:</b>
    </div>
  </td>
  <td></td>
</tr>

<tr class="options_row">
  <td>
    <div title="Play sound effects for movement, combat, etc." class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='play_sounds_setting' id='play_sounds_setting' checked>
        <label for="play_sounds_setting" name="play_sounds_setting_lbl" class="css-label dark-check-red"><font color="#ffbaca">Sound effects</font></label>
    </div>
  </td>
  <td>
    <div title="Computer generated speech for console messages" class="main_menu_buttons">
        <input type='checkbox' class="css-checkbox" name='speech_enabled_setting' id='speech_enabled_setting'>
        <label for="speech_enabled_setting" name="speech_enabled_setting_lbl" class="css-label dark-check-red"><font color="#ffbaca">Speech messages</font></label>
    </div>
  </td>
</tr>
</table>

<table cellpadding="0" cellspacing="0">
<tr class="options_row">
  <td>
    <div style="margin-top:15px" class="main_menu_buttons">
      <button id="surrender_button" type="button" class="button setting_button" onClick="surrender_game();" title="Surrenders in multiplayer games and thus ends the game for you.">Surrender</button>
    </div>
  </td>
  <td>
    <div style="margin-top:15px" class="main_menu_buttons">
      <button id="end_button" type="button" class="button setting_button" onClick="window.location='/';" title="Ends the game, and returns to the main page of Freeciv-web." >End Game</button>
    </div>
  </td>
  <td>
    <div style="margin-top:15px" class="main_menu_buttons">
      <button id="replay_button" type="button" class="button setting_button" onClick="show_replay();">Game replay</button>
    </div>
  </td>
  <td>
    <div style="margin-top:15px" class="main_menu_buttons">
      <button style="display:none" id="switch_renderer_button" type="button" class="button setting_button" onClick="switch_renderer();"></button>
    </div>
  </td>
</tr>
</table>

    <div hidden>&nbsp;&nbsp;&nbsp;&nbsp;<b>Graphic Theme:</b><br>
      <select name="graphic_theme" id="graphic_theme">
        <OPTION Value="faroese"    >Faroese (Civ6)</OPTION>
        <OPTION Value="greek"      >Greek</OPTION>
        <OPTION Value="mesopotamia">Mesopotomia (original)</OPTION>
        <OPTION Value="persian"    >Persian</OPTION>
      </select>
    </div>

<div class="main_menu_buttons" id="title_setting_div">
  <b>Game title:</b> <input type='text' name='metamessage_setting' id='metamessage_setting' size='28' maxlength='42'>
</div>

</center>

