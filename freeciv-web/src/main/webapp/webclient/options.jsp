  
<div>

<div style="text-align: center;">
<center>

<h2>Game Options</h2>

<div class="main_menu_buttons">
<b>Music:</b><br>
  <audio preload="none"></audio>
</div>

<div class="main_menu_buttons">
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
<tr>


</tr>
</table>

</div>


<div title="Length of turn" class="main_menu_buttons" id="timeout_setting_div">
  <b>Timeout (seconds per turn):</b> <input type='number' name='timeout_setting' id='timeout_setting' size='6' length='3' max='3600' step='1'>
  <span id="timeout_info"></span>
</div>


<table style="font-family:Segoe">
<tr>
<td>
  <div title="Play sound effects for movement, combat, etc." class="main_menu_buttons">
      <input type='checkbox' name='play_sounds_setting' id='play_sounds_setting' checked>Play sounds
  </div>
</td>

<td>
  <div title="Computer generated speech for console messages" class="main_menu_buttons">
      <input type='checkbox' name='speech_enabled_setting' id='speech_enabled_setting'><font color="#4cf">Speech messages</font>
  </div>
</td>
</tr>

<tr>
    <td>
        <div title="Draw grids over map tiles. (CTRL-G)" class="main_menu_buttons">
            <input type='checkbox' name='draw_map_grid' id='draw_map_grid' checked>Draw map grid
        </div>
      </td>
    <td>
        <div title="Whether double-tap-drag moves the map canvas" class="main_menu_buttons">
            <input type='checkbox' name='map_drag_enabled' id='map_drag_enabled' checked>Enable map dragging
        </div>
    </td>
</tr>

<tr>
    <td>
        <div title='1 or 2 clicks for Unit pop-up orders menu. Suggested = mobile:1 PC:2' class="main_menu_buttons">
            <input type='checkbox' name='unit_click_menu' id='unit_click_menu' checked>Unit Pop-up Menu: 1 click=&#x2611 2 clicks=&#x2610
        </div>
    </td>
     <td> 
        <div title="Shortcut buttons for unit orders at bottom of screen" class="main_menu_buttons">
            <input type='checkbox' name='show_order_buttons' id='show_order_buttons' checked><font color="#4cf">Show Orders Buttons</font>
        </div>
    </td>
</tr>

<tr>
    <td>
        <div title="Units auto-attack without showing odds or asking confirmation. (SHIFT-A)" class="main_menu_buttons">
            <input type='checkbox' name='auto_attack' id='auto_attack'><font color="#4cf">Auto-attack</font>
        </div>
    </td>
    <td>
        <div title="Shows incoming/outgoing airlift capacity in city labels on the map. (CTRL-L)" class="main_menu_buttons">
            <input type='checkbox' name='airlift_setting' id='airlift_setting' checked>Show city airlift capacity
        </div>
    </td>
</tr>

<tr>
  <td>
      <div title="Shows worked city tile output on main map. (SHIFT-W)" class="main_menu_buttons">
          <input type='checkbox' name='draw_city_output' id='draw_city_output'>Show worked tiles on map
      </div>
  </td>
  <td>
     <div title="Fits more info but may need scrolling" class="main_menu_buttons">
       <input type='checkbox' name='scroll_narrow_x' id='scroll_narrow_x'>Mobile: wider table rows
    </div>
  </td>
</tr>
<tr>
  <td>
      <div title="Fills territories with national colors (CTRL-B)" class="main_menu_buttons">
          <input type='checkbox' name='fill_borders' id='fill_borders'><font color="#4cf">Fill national boundaries</font>
      </div>
  </td>
  <td>
    <div title="Enables the Empire Tab (under development: use at own risk)" class="main_menu_buttons">
        <input type='checkbox' name='show_empire' id='show_empire'>Show Empire Tab
    </div>
  </td>
</tr>
<tr>
    <td>
      <div title="Movement Point Percentage displayed on units on main map (SHIFT-M)" class="main_menu_buttons">
          <input type='checkbox' name='show_unit_mp' id='show_unit_mp'>Movement Point Display
      </div>
    </td>
    <td>
      <div title="Show Warcalc Odds (ALT-W)" class="main_menu_buttons">
          <input type='checkbox' name='show_warcalc' id='show_warcalc'><font color="#4cf">Show Warcalc Odds</font>
      </div>
    </td>
</tr>

<tr>
  <td>
    <div title="Show compass in upper right corner of map" class="main_menu_buttons">
        <input type='checkbox' name='show_compass' id='show_compass'>Show Map Compass
    </div>
  </td>
    <td>
        <div title="Whether touch-and-dragging a unit begins a GOTO order" class="main_menu_buttons">
            <input type='checkbox' name='enable_goto_drag' id='enable_goto_drag' checked>Enable GOTO dragging
        </div>
    </td>
</tr>

<tr>
  <td>
    <div title="Enable Auto-explore 'X' hotkey" class="main_menu_buttons">
        <input type='checkbox' name='enable_autoexplore' id='enable_autoexplore' checked>Enable Explore &apos;X&apos; Hotkey
    </div>
  </td>
  <td>
    <div title="Shows citizen mood for cities on the main map. (CTRL-M)" class="main_menu_buttons">
        <input type='checkbox' name='draw_city_mood' id='draw_city_mood'>Show city mood on map
    </div>
  </td>
</tr>

<tr>
  <td>
    <div title="Highlights polluted tiles everywhere on map (CTRL-ALT-P)" class="main_menu_buttons">
        <input type='checkbox' name='draw_highlighted_pollution' id='draw_highlighted_pollution'>Highlight polluted tiles on map
    </div>
  </td>
  <td>
    <div title="Keeps selected unit centered on map (ALT-SHIFT-W)" class="main_menu_buttons">
      <input type='checkbox' name='focuslock_setting' id='focuslock_setting'>Focus-lock on active unit
   </div>
 </td>
</tr>

<tr>
  <td>
    <div class="main_menu_buttons">
      <button id="replay_button" type="button" class="button setting_button" onClick="show_replay();">Show game replay</button>
    </div>  
  </td>
  <td>
    <div class="main_menu_buttons">
      <button id="surrender_button" type="button" class="button setting_button" onClick="surrender_game();" title="Surrenders in multiplayer games and thus ends the game for you.">Surrender Game</button>
    </div>
  </td>
</tr>

<tr>
  <td>
    <div class="main_menu_buttons">
      <button id="end_button" type="button" class="button setting_button" onClick="window.location='/';" title="Ends the game, and returns to the main page of Freeciv-web." >End Game</button>
    </div>
  </td>
  <td>
    <div class="main_menu_buttons">
      <button id="switch_renderer_button" type="button" class="button setting_button" onClick="switch_renderer();"></button>
    </div>
  </td>
</tr>
</table>

    <div>&nbsp;&nbsp;&nbsp;&nbsp;<b>Graphic Theme:</b><br>
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
</div>

</div>

