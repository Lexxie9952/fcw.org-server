<div id="empire_static">

    <div id="empire_mode_options" style="margin-top:-3px;"><span id="empire_prompt"><b>Empire:</b>&nbsp;&nbsp;</span>
       <button id="button_national_units" type="button" class="button tab_emulator_button" onClick="change_empire_mode(0);"
        title="All units sorted by type" >&#x1F93A;National Units</button>

        <button id="button_unit_homecity" type="button" class="button tab_emulator_button" onClick="change_empire_mode(1);"
        title="All units by home city" >&#x1F3E0;Unit Upkeep</button>

        <button id="button_unit_deployment" type="button" class="button tab_emulator_button" onClick="change_empire_mode(2);"
        title="All units in cities" >&#x2B55;City Deployment</button>

        <button id="button_city_buildings" type="button" class="button tab_emulator_button" onClick="change_empire_mode(3);"
        title="All improvements in cities" >&#x1F3E2;National Buildings</button>

        <button id="button_empire_upkeep" type="button" class="button tab_emulator_button" onClick="change_empire_mode(4);"
        title="Building upkeep in all cities" >&#x1f4b0;Building Upkeep</button>

        <button id="button_empire_prod" type="button" class="button tab_emulator_button" onClick="change_empire_mode(5);"
        title="Production in all cities" >&#x1F528;National Production</button>
    </div>
    <hr color="#432" style="margin-top:-4px;">
    <h2 style="margin-top:0px; margin-bottom:0px;" id="empire_title"></h2>

    <div id="empire_mode_panel"></div>

    <div id="empire_scroll">
        <div id="empire">     <%-- was id="cities" --%>
            <div id="empire_list">
            </div>
        </div>
    </div>
</div>
