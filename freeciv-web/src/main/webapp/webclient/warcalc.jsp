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
                    <td align="center"><button id="wca125" class="tiny_button tt"  onClick="wc_A(1.25);">&#xD7;1.25</button></td>
                    <td align="center"><button id="wca133" class="tiny_button tt"  onClick="wc_A(1.33);" disabled>&#xD7;1.33</button></td>
                    <td align="center"><button id="wca150" class="tiny_button tt"  onClick="wc_A(1.50);">&#xD7;1.5&nbsp;</button></td>
                    <td align="center"><button id="wca167" class="tiny_button tt"  onClick="wc_A(1.67);" disabled>-</button></td>
                    <td align="center"><button id="wca175" class="tiny_button tt"  onClick="wc_A(1.75);">&#xD7;1.75</button></td>
                    <td align="center"><button id="wca200" class="tiny_button tt"  onClick="wc_A(2.00);">&nbsp;&nbsp;&#xD7;2&nbsp;&nbsp;</button></td>
                    <td align="center"><button id="wca210" class="tiny_button tt"  onClick="wc_A(2.1);">&#xD7;2.1&nbsp;</button></td>
                    <td align="center"><button id="wca220" class="tiny_button tt"  onClick="wc_A(2.2);">&#xD7;2.2&nbsp;</button></td>
                    <td align="center"><button id="wca230" class="tiny_button tt"  onClick="wc_A(2.3);">&#xD7;2.3&nbsp;</button></td>
                </tr>
                <tr>
                    <th class="wcttmsg" id="wcth2" title='Defender vs. Attacker bonus appliers' style="font-size:90%">Defend&nbsp;</th>
                    <td align="center"><button id="wc125" class="tiny_button tt"  onClick="wc_D(1.25);">&#xD7;1.25</button></td>
                    <td align="center"><button id="wc133" class="tiny_button tt"  onClick="wc_D(1.33);">&#xD7;1.33</button></td>
                    <td align="center"><button id="wc150" class="tiny_button tt"  onClick="wc_D(1.50);">&#xD7;1.5&nbsp;</button></td>
                    <td align="center"><button id="wc167" class="tiny_button tt"  onClick="wc_D(1.67);">&#xD7;1.67</button></td>
                    <td align="center"><button id="wc175" class="tiny_button tt"  onClick="wc_D(1.75);">&#xD7;1.75</button></td>
                    <td align="center"><button id="wc200" class="tiny_button tt"  onClick="wc_D(2.00);">&nbsp;&nbsp;&#xD7;2&nbsp;&nbsp;</button></td>
                    <td align="center"><button id="wc210" class="tiny_button tt"  onClick="wc_D(2.1);">&#xD7;2.1&nbsp;</button></td>
                    <td align="center"><button id="wc220" class="tiny_button tt"  onClick="wc_D(2.2);">&#xD7;2.2&nbsp;</button></td>
                    <td align="center"><button id="wc230" class="tiny_button tt"  onClick="wc_D(2.3);">&#xD7;2.3&nbsp;</button></td>
                    <td align="center"><button id="wc300" class="tiny_button tt"  onClick="wc_D(3.00);">&nbsp;&nbsp;&#xD7;3&nbsp;&nbsp;</button></td>
                    <td align="center"><button id="wc400" class="tiny_button tt"  onClick="wc_D(4.00);">&nbsp;&nbsp;&#xD7;4&nbsp;&nbsp;</button></td>
                    <td align="center"><button id="wc500" class="tiny_button tt"  onClick="wc_D(5.00);">&nbsp;&nbsp;&#xD7;5&nbsp;&nbsp;</button></td>
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
                    <th id="wcamsg" class="wcttmsg" title='Your own clicked unit is assumed as attacker.&#013;&#013;Only Veteran bonus is auto-calculated locally'>Attacker</th>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="color:#ffd2c2; width:55%; text-align:center;" id="id_astr" name="astr" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="color:#e4ffe4; width:55%; text-align:center;" id="id_ahp" name="ahp" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="width:55%; text-align:center;" id="id_afp" name="afp" type="number" value="1"></td>
                </tr>

                <tr>
                    <th id="wcdmsg" class="wcttmsg" title='Foreign clicked units are assumed as defender.&#013;&#013;Veteran, Terrain, and Fortify bonuses are included locally.&#013;&#013;Not included:&#013; Base, Unit-type bonus, City modifiers'>Defender</th>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="color:#ffd2c2; width:55%; text-align:center;" id="id_dstr" name="dstr" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="color:#e4ffe4; width:55%; text-align:center;" id="id_dhp" name="dhp" type="number" value=""></td>
                    <td align="center"><input autocomplete="off" class="warcalc_input" style="width:55%; text-align:center;" id="id_dfp" name="dfp" type="number" value="1"></td>
                </tr>
            </tbody>
        </table>

        <p style="text-align:center;">
            <button id="warcalc_calc_button" class="button ui-button ui-corner-all ui-widget tt" title="Locally calculates odds from on-screen data" onclick="warcalc_compute();" role="button">calc</button>
            <button id="warcalc_swap_button" class="button ui-button ui-corner-all ui-widget tt" title="Swaps selected Attacker and Defender units" onClick="warcalc_swap_roles();" role="button">swap</button>
            <button id="warcalc_ask_button" class="button ui-button ui-corner-all ui-widget tt" title="Remotely calculate bonuses and odds on server. Requires 2 selected units." onClick="warcalc_request_server();">ask</button>
<!--            <input id="warcalc_calc_button" class="button" type="button" value="calc" title="Locally calculates odds from on-screen data" onClick="warcalc_compute();">
                <input class="button" type="button" value="swap" title="Swaps selected Attacker and Defender units" onClick="warcalc_swap_roles();">
                <input class="button" type="button" value="ask" title="Remotely calculate bonuses and odds on server. Requires 2 selected units." onClick="warcalc_request_server();">-->
        </p>

        <p id="att_win" style="text-align:center;">&nbsp;<br>&nbsp;<br></p>
        <p id="def_win" style="text-align:center;">&nbsp;<br>&nbsp;<br></p>
        <p id="exp_hp" style="text-align:center;">&nbsp;<br><br>&nbsp;<br>&nbsp;</p>

        <p id="wc_done_btn" style="text-align:center;"><button class="button ui-button ui-corner-all ui-widget" onClick="warcalc_done();">done</button></p>
        <p style="text-align:center"><br><br>ABBREVIATIONS:<br><small style="color:#888"><b>avs</b> = attacks vs.<br><b>dvs</b> = defends vs.<br></small></p>
    </div>
</div>
