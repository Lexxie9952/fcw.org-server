<div id="warcalc_static">
    <h2 style="text-align:center;">War Calculator</h2>

    <hr>

    <table style="margin:auto; width:360; border-collapse:collapse" class="warcalc">
            <tbody>                    
                <tr>
                    <th style="font-size:1%"></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                </tr>
                <tr>
                    <th style="font-size:90%">Defend&nbsp;</th>
                    <td align="center"><input class="tiny_button" type="button" value="x1.33" onClick="wc_D(1.33);"</td>
                    <td align="center"><input class="tiny_button" type="button" value="x1.5&nbsp;" onClick="wc_D(1.50);"</td>
                    <td align="center"><input class="tiny_button" type="button" value="x1.67" onClick="wc_D(1.67);"</td>
                    <td align="center"><input class="tiny_button" type="button" value="&nbsp;&nbsp;x2&nbsp;&nbsp;" onClick="wc_D(2.00);"</td>
                    <td align="center"><input class="tiny_button" type="button" value="&nbsp;&nbsp;x3&nbsp;&nbsp;" onClick="wc_D(3.00);"</td>
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
                    <th title='Your own clicked unit is assumed as attacker.&#013;&#013;Only Veteran bonus is auto-calculated'>Attacker</th>
                    <td align="center"><input autocomplete="off" style="background-color:#ffd2c2; width:55%; text-align:center;" id="id_astr" name="astr" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" style="background-color:#e4ffe4; width:55%; text-align:center;" id="id_ahp" name="ahp" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" style="width:55%; text-align:center;" id="id_afp" name="afp" type="number" value="1"></td>
                </tr>
                
                <tr>
                    <th title='Foreign clicked units are assumed as defender.&#013;&#013;Veteran, Terrain, and Fortify bonuses are included.&#013;&#013;Not included: Base, City improvements,&#013;BadCityDefender, Versus-Type.'>Defender</th>
                    <td align="center"><input autocomplete="off" style="background-color:#ffd2c2; width:55%; text-align:center;" id="id_dstr" name="dstr" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" style="background-color:#e4ffe4; width:55%; text-align:center;" id="id_dhp" name="dhp" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" style="width:55%; text-align:center;" id="id_dfp" name="dfp" type="number" value="1"></td>
                </tr>
            </tbody>
        </table>

        <p style="text-align:center;"><input class="button" type="button" value="calculate" onClick="warcalc_compute();"></p>

        <p id="att_win" style="text-align:center;">&nbsp;<br>&nbsp;<br></p>
        <p id="def_win" style="text-align:center;">&nbsp;<br>&nbsp;<br></p>
        <p id="exp_hp" style="text-align:center;">&nbsp;<br><br>&nbsp;<br>&nbsp;</p>
        
        <p id="wc_done_btn" style="text-align:center;"><input class="button" type="button" value="done" onClick="warcalc_done();"></p>
    </div>
</div>
    