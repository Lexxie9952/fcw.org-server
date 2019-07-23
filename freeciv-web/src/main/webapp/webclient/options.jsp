  
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
    <button id="switch_renderer_button" type="button" class="button setting_button" onClick="switch_renderer();"></button>
  </td>
  <td>
    <div id="renderer_help" style="font-size: 85%; max-width: 450px;"></div>
  </td>
</tr>
<tr>
  <td>
    <button id="replay_button" type="button" class="button setting_button" onClick="show_replay();">Show game replay</button>
  </td>
  <td>
    Show game replay
  </td>
</tr>
</table>

</div>


<div class="main_menu_buttons" id="timeout_setting_div">
  <b>Timeout (seconds per turn):</b> <input type='number' name='timeout_setting' id='timeout_setting' size='6' length='3' max='3600' step='1'>
  <span id="timeout_info"></span>
</div>


<table>
<tr>
<td>
  <div class="main_menu_buttons">
      <input type='checkbox' name='play_sounds_setting' id='play_sounds_setting' checked><b>Play sounds</b>
  </div>
</td>

<td>
  <div class="main_menu_buttons">
      <input type='checkbox' name='speech_enabled_setting' id='speech_enabled_setting'><b>Speech messages</b> 
  </div>
</td>
</tr>

<tr>
    <td>
        <div class="main_menu_buttons">
            <input type='checkbox' name='draw_map_grid' id='draw_map_grid' checked><b>Draw map grid</b> 
        </div>
      </td>
    <td>
        <div class="main_menu_buttons">
            <input type='checkbox' name='map_drag_enabled' id='map_drag_enabled' checked><b>Enable map dragging</b> 
        </div>
    </td>
</tr>

<tr>
    <td>
        <div title='Whether left-click gives pop-up orders menu' class="main_menu_buttons">
            <input type='checkbox' name='unit_click_menu' id='unit_click_menu' checked><b>Click Unit for Menu</b> 
        </div>
    </td>
     <td> 
        <div class="main_menu_buttons">
            <input type='checkbox' name='show_order_buttons' id='show_order_buttons' checked><b>Show Orders Buttons</b>  
        </div>
    </td>
</tr>

<tr>
    <td>
        <div class="main_menu_buttons">
            <input type='checkbox' name='auto_attack' id='auto_attack'><b>Auto-attack</b> 
        </div>
    </td>
    <td>
        <div class="main_menu_buttons">
            <input type='checkbox' name='airlift_setting' id='airlift_setting' checked><b>Show city airlift capacity</b>
        </div>
    </td>
</tr>
<tr>
  <td>
    <div>Graphic Theme:<br>
      <select name="graphic_theme" id="graphic_theme">
        <OPTION Value="themes/faroese/"    >Faroese        (Civ6)</OPTION>
        <OPTION Value="themes/greek/"      >Greek                </OPTION>
        <OPTION Value="themes/mesopotamia/">Mespotomia (original)</OPTION>
        <OPTION Value="themes/persian/"    >Persian              </OPTION>
        
      </select>
    </div>
  </td>
</tr>


<tr>
<td>
<div class="main_menu_buttons">
  <button id="save_button" type="button" class="button setting_button" onClick="save_game();" title="Saves your current game so you can continue later. Press Ctrl+S to quick save the game.">Save Game (Ctrl+S)</button>
</div>
</td>
<td>
<div class="main_menu_buttons">
  <button id="fullscreen_button" type="button" class="button setting_button" onClick="show_fullscreen_window();" title="Enables fullscreen window mode" >Fullscreen</button>
</div>
</td>
</tr>
<tr>
<td>
<div class="main_menu_buttons">
  <button id="surrender_button" type="button" class="button setting_button" onClick="surrender_game();" title="Surrenders in multiplayer games and thus ends the game for you.">Surrender Game</button>
</div>
</td>
<td>
<div class="main_menu_buttons">
  <button id="end_button" type="button" class="button setting_button" onClick="window.location='/';" title="Ends the game, and returns to the main page of Freeciv-web." >End Game</button>
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


<div class="main_menu_buttons" id="title_setting_div">
  <b>Game title:</b> <input type='text' name='metamessage_setting' id='metamessage_setting' size='28' maxlength='42'>
</div>


</center>
</div>

</div>

