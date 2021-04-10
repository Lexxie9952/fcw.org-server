<div id="warcalc_static">
    <h2 style="text-align:center;">War Calculator</h2>

    <hr>

    <table id="wcbtbl" style="margin:auto; width:360; border-collapse:collapse" class="warcalc">
            <tbody>                    
                <tr>
                    <th style="font-size:1%"></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                </tr>
                <tr>
                    <th class="wcttmsg" id="wcth1" title='Attacker vs. Defender bonus appliers' style="font-size:90%">Attack&nbsp;</th>
                    <td align="center"><input id="wca125" class="tiny_button" type="button" value="x1.25" onClick="wc_A(1.25);"></td>
                    <td align="center"><input id="wca133" class="tiny_button" type="button" value="-" onClick="wc_A(1.33);" disabled></td>
                    <td align="center"><input id="wca150" class="tiny_button" type="button" value="x1.5&nbsp;" onClick="wc_A(1.50);"></td>
                    <td align="center"><input id="wca167" class="tiny_button" type="button" value="-" onClick="wc_A(1.67);" disabled></td>
                    <td align="center"><input id="wca175" class="tiny_button" type="button" value="x1.75" onClick="wc_A(1.75);"></td>
                    <td align="center"><input id="wca200" class="tiny_button" type="button" value="&nbsp;&nbsp;x2&nbsp;&nbsp;" onClick="wc_A(2.00);"></td>
                    <td align="center"><input id="wca210" class="tiny_button" type="button" value="x2.1&nbsp;" onClick="wc_A(2.1);"></td>
                    <td align="center"><input id="wca220" class="tiny_button" type="button" value="x2.2&nbsp;" onClick="wc_A(2.2);"></td>
                    <td align="center"><input id="wca230" class="tiny_button" type="button" value="x2.3&nbsp;" onClick="wc_A(2.3);"></td>
                </tr>
                <tr>
                    <th class="wcttmsg" id="wcth2" title='Defender vs. Attacker bonus appliers' style="font-size:90%">Defend&nbsp;</th>
                    <td align="center"><input id="wc125" class="tiny_button" type="button" value="x1.25" onClick="wc_D(1.25);"></td>
                    <td align="center"><input id="wc133" class="tiny_button" type="button" value="x1.33" onClick="wc_D(1.33);"></td>
                    <td align="center"><input id="wc150" class="tiny_button" type="button" value="x1.5&nbsp;" onClick="wc_D(1.50);"></td>
                    <td align="center"><input id="wc167" class="tiny_button" type="button" value="x1.67" onClick="wc_D(1.67);"></td>
                    <td align="center"><input id="wc175" class="tiny_button" type="button" value="x1.75" onClick="wc_D(1.75);"></td>
                    <td align="center"><input id="wc200" class="tiny_button" type="button" value="&nbsp;&nbsp;x2&nbsp;&nbsp;" onClick="wc_D(2.00);"></td>
                    <td align="center"><input id="wc210" class="tiny_button" type="button" value="x2.1&nbsp;" onClick="wc_D(2.1);"></td>
                    <td align="center"><input id="wc220" class="tiny_button" type="button" value="x2.2&nbsp;" onClick="wc_D(2.2);"></td>
                    <td align="center"><input id="wc230" class="tiny_button" type="button" value="x2.3&nbsp;" onClick="wc_D(2.3);"></td>
                    <td align="center"><input id="wc300" class="tiny_button" type="button" value="&nbsp;&nbsp;x3&nbsp;&nbsp;" onClick="wc_D(3.00);"></td>
                    <td align="center"><input id="wc400" class="tiny_button" type="button" value="&nbsp;&nbsp;x4&nbsp;&nbsp;" onClick="wc_D(4.00);"></td>
                    <td align="center"><input id="wc500" class="tiny_button" type="button" value="&nbsp;&nbsp;x5&nbsp;&nbsp;" onClick="wc_D(5.00);"></td>
                </tr>
            </tbody>
    </table>
    
    <hr>

    <div id = "warcalc_scroll">
        <table style="margin:auto; width:360px" class="warcalc">
            <tbody> 
                <tr>
                    <th></th>
                    <th>Strength</th>
                    <th>Hitpoints</th>
                    <th>Firepower</th>
                </tr>
                <tr>
                    <th id="wcamsg" class="wcttmsg" title='Your own clicked unit is assumed as attacker.&#013;&#013;Only Veteran bonus is auto-calculated'>Attacker</th>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="color:#ffd2c2; width:55%; text-align:center;" id="id_astr" name="astr" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="color:#e4ffe4; width:55%; text-align:center;" id="id_ahp" name="ahp" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="width:55%; text-align:center;" id="id_afp" name="afp" type="number" value="1"></td>
                </tr>
                
                <tr>
                    <th id="wcdmsg" class="wcttmsg" title='Foreign clicked units are assumed as defender.&#013;&#013;Veteran, Terrain, and Fortify bonuses are included.&#013;&#013;Not included:&#013; Base, Unit-type bonus, City modifiers'>Defender</th>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="color:#ffd2c2; width:55%; text-align:center;" id="id_dstr" name="dstr" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="color:#e4ffe4; width:55%; text-align:center;" id="id_dhp" name="dhp" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="width:55%; text-align:center;" id="id_dfp" name="dfp" type="number" value="1"></td>
                </tr>
            </tbody>
        </table>

        <p style="text-align:center;">
            <input class="button" type="button" value="calculate" onClick="warcalc_compute();">
            <input class="button" type="button" value="swap" title="Swaps selected Attacker and Defender units" onClick="warcalc_swap_roles();">
        </p>

        <p id="att_win" style="text-align:center;">&nbsp;<br>&nbsp;<br></p>
        <p id="def_win" style="text-align:center;">&nbsp;<br>&nbsp;<br></p>
        <p id="exp_hp" style="text-align:center;">&nbsp;<br><br>&nbsp;<br>&nbsp;</p>
        
        <p id="wc_done_btn" style="text-align:center;"><input class="button" type="button" value="done" onClick="warcalc_done();"></p>
    </div>
</div>
    