  
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


<table>
<tr>
<td>
  <div title="Play sound effects for movement, combat, etc." class="main_menu_buttons">
      <input type='checkbox' name='play_sounds_setting' id='play_sounds_setting' checked><b>Play sounds</b>
  </div>
</td>

<td>
  <div title="Computer generated speech for console messages" class="main_menu_buttons">
      <input type='checkbox' name='speech_enabled_setting' id='speech_enabled_setting'><b><font color="#0000c0">Speech messages</font></b> 
  </div>
</td>
</tr>

<tr>
    <td>
        <div title="Draw grids over map tiles. (CTRL-G)" class="main_menu_buttons">
            <input type='checkbox' name='draw_map_grid' id='draw_map_grid' checked><b>Draw map grid</b> 
        </div>
      </td>
    <td>
        <div title="Whether double-tap-drag moves the map canvas" class="main_menu_buttons">
            <input type='checkbox' name='map_drag_enabled' id='map_drag_enabled' checked><b>Enable map dragging</b> 
        </div>
    </td>
</tr>

<tr>
    <td>
        <div title='1 or 2 clicks for Unit pop-up orders menu. Suggested = mobile:1 PC:2' class="main_menu_buttons">
            <input type='checkbox' name='unit_click_menu' id='unit_click_menu' checked><b>Unit Pop-up Menu: 1 click=&#x2611 2 clicks=&#x2610</b> 
        </div>
    </td>
     <td> 
        <div title="Shortcut buttons for unit orders at bottom of screen" class="main_menu_buttons">
            <input type='checkbox' name='show_order_buttons' id='show_order_buttons' checked><b><font color="#0000c0">Show Orders Buttons</font></b>  
        </div>
    </td>
</tr>

<tr>
    <td>
        <div title="Units auto-attack without showing odds or asking confirmation. (SHIFT-A)" class="main_menu_buttons">
            <input type='checkbox' name='auto_attack' id='auto_attack'><b><font color="#0000c0">Auto-attack</font></b> 
        </div>
    </td>
    <td>
        <div title="Shows incoming/outgoing airlift capacity in city labels on the map. (CTRL-L)" class="main_menu_buttons">
            <input type='checkbox' name='airlift_setting' id='airlift_setting' checked><b>Show city airlift capacity</b>
        </div>
    </td>
</tr>

<tr>
  <td>
      <div title="Shows worked city tile output on main map. (SHIFT-W)" class="main_menu_buttons">
          <input type='checkbox' name='draw_city_output' id='draw_city_output'><b>Show worked tiles on map</b> 
      </div>
  </td>
  <td>
     <div title="Fits more info but may need scrolling" class="main_menu_buttons">
       <input type='checkbox' name='scroll_narrow_x' id='scroll_narrow_x'><b>Mobile: wider table rows</b> 
    </div>
  </td>
</tr>
<tr>
  <td>
      <div title="Fills territories with national colors (CTRL-B)" class="main_menu_buttons">
          <input type='checkbox' name='fill_borders' id='fill_borders'><b><font color="#0000c0">Fill national boundaries</font></b> 
      </div>
  </td>
  <td>
    <div title="Enables the Empire Tab (under development: use at own risk)" class="main_menu_buttons">
        <input type='checkbox' name='show_empire' id='show_empire'><b>Show Empire Tab</b> 
    </div>
  </td>
</tr>
<tr>
    <td>
      <div title="Movement Point Percentage displayed on units on main map (SHIFT-M)" class="main_menu_buttons">
          <input type='checkbox' name='show_unit_mp' id='show_unit_mp'><b><font color="#0000c0">Movement Point Display</font></b> 
      </div>
    </td>
    <td>
      <div title="Show Warcalc Odds (ALT-W)" class="main_menu_buttons">
          <input type='checkbox' name='show_warcalc' id='show_warcalc'><b><font color="#0000c0">Show Warcalc Odds</font></b> 
      </div>
    </td>
</tr>

<tr>
  <td>
    <div title="Show compass in upper right corner of map" class="main_menu_buttons">
        <input type='checkbox' name='show_compass' id='show_compass'><b><font color="#000000">Show Map Compass</font></b> 
    </div>
  </td>
    <td>
        <div title="Whether touch-and-dragging a unit begins a GOTO order" class="main_menu_buttons">
            <input type='checkbox' name='enable_goto_drag' id='enable_goto_drag' checked><b>Enable GOTO dragging</b> 
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

<tr>
  <td>
    <div class="main_menu_buttons">
      <button id="update_model_button" type="button" class="button setting_button" onClick="update_webgl_model();" title="Update a webgl model" >Update 3D model</button>
    </div>
  </td>
  <td>
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

