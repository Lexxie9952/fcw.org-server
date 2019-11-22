<div id="warcalc_static">
    <h2 style="text-align:center;">War Calculator</h2>
    <div id = "warcalc_scroll">
            <table style="margin:auto; width:380px" class="warcalc">
            <tbody>
                
                <tr>
                    <th></th>
                    <th>Strength</th>
                    <th>Hitpoints</th>
                    <th>Firepower</th>
                </tr>
                
                <tr>
                    <th>Attacker</th>
                    <td align="center"><input autocomplete="off" style="background-color:#c2e2ff; width:40%; text-align:center;" id="id_astr" name="astr" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" style="background-color:#e0ffe0; width:40%; text-align:center;" id="id_ahp" name="ahp" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" style="width:40%; text-align:center;" id="id_afp" name="afp" type="number" value="1"></td>
                </tr>
                
                <tr>
                    <th>Defender</th>
                    <td align="center"><input autocomplete="off" style="background-color:#c2e2ff; width:40%; text-align:center;" id="id_dstr" name="dstr" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" style="background-color:#e0ffe0; width:40%; text-align:center;" id="id_dhp" name="dhp" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" style="width:40%; text-align:center;" id="id_dfp" name="dfp" type="number" value="1"></td>
                </tr>
            </tbody>
        </table>
    
        <p style="text-align:center;"><input class="button" type="button" value="calculate" onClick="warcalc_compute();"></p>

        <p id="att_win" style="text-align:center;"></p>
        <p id="def_win" style="text-align:center;"></p>
        <p id="exp_hp" style="text-align:center;"></p>

        <p id="wc_done_btn" style="text-align:center;"><input class="button" type="button" value="done" onClick="warcalc_done();"></p>

    </div>
</div>
    
    