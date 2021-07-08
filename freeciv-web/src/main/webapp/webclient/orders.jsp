<div id="game_unit_orders_default">  
  <div id="order_goand" class="order_button" title="Go to tile and do action (ctrl-alt-G)">
    <span style="cursor:pointer" onclick="key_unit_go_and(false);"><img src="/images/orders/go_and.png" name="goand_button" alt="" border="0" width="30" height="30"></span>
  </div>
  
  <div id="order_goto" class="order_button" title="Go to tile (G)">
    <span style="cursor:pointer" onclick="activate_goto();"><img src="/images/orders/goto_default.png" name="goto_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_upgrade" class="order_button not_mobile" title="Upgrade unit (U)">
      <span style="cursor:pointer" onclick="key_unit_upgrade();"><img src="/images/orders/upgrade.png" name="upgrade_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_convert" class="order_button not_mobile" title="Convert unit (shift-O)">
    <span style="cursor:pointer" onclick="key_unit_convert();"><img src="/images/orders/convert.png" name="convert_button" alt="" border="0" width="30" height="30"></span>
  </div>  

  <div id="order_airlift" class="order_button" title="Airlift (Shift-L)">
    <span style="cursor:pointer" onclick="key_unit_airlift();"><img src="/images/orders/airlift.png" name="airlift_button" alt="" border="0" width="30" height="30"></span>
  </div>  

  <div id="order_airlift_disabled" class="order_button" title="0 Airlifts left">
    <span style="cursor:pointer" onclick="key_unit_airlift();"><img src="/images/orders/airlift_disabled.png" name="airlift_button" alt="" border="0" width="30" height="30"></span>
  </div>  

  <div id="order_well" class="order_button not_mobile" title="Dig well (R)">
    <span style="cursor:pointer" onclick="key_unit_well();"><img src="/images/orders/well.png" name="well_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_fortify" class="order_button" title="Fortify unit (F)">
    <span style="cursor:pointer" onclick="key_unit_fortify();"><img src="/images/orders/fortify_default.png" name="fortify_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_vigil" class="order_button" title="Vigil unit (Ctrl-V)">
    <span style="cursor:pointer" onclick="key_unit_vigil();"><img src="/images/orders/vigil.png" name="fortify_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_build_city" class="order_button not_mobile" title="Build new city (B)">
    <span style="cursor:pointer" onclick="request_unit_build_city();"><img src="/images/orders/build_city_default.png" name="build_city_button" alt="" border="0" width="30" height="30"></span>
  </div>  

  <div id="order_road" class="order_button" title="Build road (R)">
    <span style="cursor:pointer" onclick="key_unit_road();"><img src="/images/orders/road_default.png" name="road_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_seabridge" class="order_button" title="Build Sea Bridge (R)">
    <span style="cursor:pointer" onclick="key_unit_road();"><img src="/images/orders/seabridge.png" name="seabridge_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_railroad" class="order_button" title="Build railroad (R)">
    <span style="cursor:pointer" onclick="key_unit_road();"><img src="/images/orders/railroad_default.png" name="railroad_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_maglev" class="order_button" title="Build maglev (R)">
    <span style="cursor:pointer" onclick="key_unit_road();"><img src="/images/orders/maglev.png" name="maglev_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_irrigate" class="order_button" title="Create irrigation (I)" >
    <span style="cursor:pointer" onclick="key_unit_irrigate();"><img src="/images/orders/irrigate_default.png" name="irrigate_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_build_farmland" class="order_button not_mobile" title="Build farmland (I)" >
    <span style="cursor:pointer" onclick="key_unit_irrigate();"><img src="/images/orders/irrigation.png" name="build_farmland_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_mine" class="order_button" title="Build mine (M)">
    <span style="cursor:pointer" onclick="key_unit_mine();"><img src="/images/orders/mine_default.png" name="mine_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_oil_well" class="order_button not_mobile" title="Make Oil Well (M)">
      <span style="cursor:pointer" onclick="key_unit_mine();"><img src="/images/orders/oil_well.png" name="oil_well_button" alt="" border="0" width="30" height="30"></span>
  </div>
  
  <div id="order_plant_forest" class="order_button not_mobile" title="Plant forest (M)" >
      <span style="cursor:pointer" onclick="key_unit_mine();"><img src="/images/orders/forest_add_default.png" name="plant_forest_button" alt="" border="0" width="30" height="30"></span>
  </div>
  
  <div id="order_make_swamp" class="order_button not_mobile" title="Make swamp (M)" >
      <span style="cursor:pointer" onclick="key_unit_mine();"><img src="/images/orders/swamp.png" name="make_swamp_button" alt="" border="0" width="30" height="30"></span>
  </div>
  
  <div id="order_pillage" class="order_button not_mobile" title="Pillage (Shift-P)">
    <span style="cursor:pointer" onclick="key_unit_pillage();"><img src="/images/orders/pillage.png" name="pillage_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_explore" class="order_button not_mobile" title="Auto explore map (X)">
    <span style="cursor:pointer" onclick="key_unit_auto_explore();"><img src="/images/orders/auto_explore_default.png" name="auto_explore_button" alt="" border="0" width="30" height="30"></span>
  </div>  
    
  <div id="order_auto_settlers" class="order_button not_mobile" title="Auto-build terrain improvements (A)">
    <span style="cursor:pointer" onclick="key_unit_auto_settle();"><img src="/images/orders/auto_settlers_default.png" name="auto_settlers_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_forest_remove" class="order_button not_mobile" title="Cut down forest (I)" >
    <span style="cursor:pointer" onclick="key_unit_irrigate();"><img src="/images/orders/forest_remove_default.png" name="forest_remove_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_quay" class="order_button not_mobile" title="Build Quay (Q)">
    <span style="cursor:pointer" onclick="key_unit_quay();"><img src="/images/orders/quay.png" name="quay_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_canal" class="order_button not_mobile" title="Build Canal">
    <span style="cursor:pointer" onclick="key_unit_canal();"><img src="/images/orders/canal.png" name="canal_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_fortress" class="order_button not_mobile" title="Build Fort (Shift-F)">
    <span style="cursor:pointer" onclick="key_unit_fortress();"><img src="/images/orders/fortress.png" name="fortress_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_buoy" class="order_button not_mobile" title="Lay Buoy (Shift-F)">
    <span style="cursor:pointer" onclick="key_unit_fortress();"><img src="/images/orders/buoy.png" name="buoy_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_navalbase" class="order_button not_mobile" title="Build Naval Base (Shift-N)">
    <span style="cursor:pointer" onclick="key_unit_naval_base();"><img src="/images/orders/navalbase.png" name="navbase_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_airbase" class="order_button not_mobile" title="Build Airbase (Shift-E)">
    <span style="cursor:pointer" onclick="key_unit_airbase();"><img src="/images/orders/airbase.png" name="airbase_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_radar" class="order_button not_mobile" title="Build Radar (Shift-E)">
    <span style="cursor:pointer" onclick="key_unit_airbase();"><img src="/images/orders/radar.png" name="radar_button" alt="" border="0" width="30" height="30"></span>
  </div>

   <div id="order_hideout" class="order_button not_mobile" title="Hideout (Shift-H)">
    <span style="cursor:pointer" onclick="key_unit_hideout();"><img src="/images/orders/hideout.png" name="hideout_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_transform" class="order_button not_mobile" title="Transform terrain (O)">
    <span style="cursor:pointer" onclick="key_unit_transform();"><img src="/images/orders/transform_default.png" name="transform_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_pollution" class="order_button not_mobile" title="Clean Pollution (P)">
    <span style="cursor:pointer" onclick="key_unit_pollution();"><img src="/images/orders/pollution.png" name="pollution_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_fallout" class="order_button not_mobile" title="Clean Fallout (N)">
    <span style="cursor:pointer" onclick="key_unit_fallout();"><img src="/images/orders/fallout.png" name="fallout_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_load" class="order_button not_mobile" title="Load (L)">
    <span style="cursor:pointer" onclick="key_unit_load();"><img src="/images/orders/load.png" name="load_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_unload" class="order_button not_mobile" title="Unload units (T)">
    <span style="cursor:pointer" onclick="key_unit_unload();"><img src="/images/orders/unload.png" name="unload_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_activate_cargo" class="order_button not_mobile" title="Activate cargo units">
    <span style="cursor:pointer" onclick="key_unit_show_cargo();"><img src="/images/orders/activate_cargo.png" name="show_cargo_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_paradrop" class="order_button" title="Paradrop (P)">
    <span style="cursor:pointer" onclick="key_unit_paradrop();"><img src="/images/orders/paradrop.png" name="paradrop_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_nuke" class="order_button" title="Detonate Nuke At (Shift-N)">
    <span style="cursor:pointer" onclick="key_unit_nuke();"><img src="/images/orders/nuke.png" name="nuke_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_change_homecity" class="order_button not_mobile" title="Change homecity of unit (H)">
    <span style="cursor:pointer" onclick="key_unit_homecity();"><img src="/images/orders/rehome_default.png" name="rehome_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_noorders" class="order_button not_mobile" title="No Orders/Sleep (J)">
    <span style="cursor:pointer" onclick="key_unit_noorders();"><img src="/images/orders/no_orders.png" name="noorders_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_cancel_orders" class="order_button not_mobile" title="Cancel Orders (Shift-J)">
    <span style="cursor:pointer" onclick="key_unit_idle();"><img src="/images/orders/cancel_orders.png" name="cancel_orders_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_wait" class="order_button" title="Wait (W)">
    <span style="cursor:pointer" onclick="key_unit_wait(false);"><img src="/images/orders/wait.png" name="wait_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_disband" class="order_button not_mobile" title="Disband unit">
    <span style="cursor:pointer" onclick="key_unit_disband();"><img src="/images/orders/disband_default.png" name="disband_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_sentry" class="order_button" title="Sentry (S)">
    <span style="cursor:pointer" onclick="key_unit_sentry();"><img src="/images/orders/sentry_default.png" name="sentry_button" alt="" border="0" width="30" height="30"></span>
  </div>
  
  <div id="order_more" class="order_button not_mobile" title="Show all orders">
    <span style="cursor:pointer" onclick="button_more_orders();"><img src="/images/orders/more_button.png" name="more_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_less" class="order_button not_mobile" title="Show common orders only">
    <span style="cursor:pointer" onclick="button_less_orders();"><img src="/images/orders/less_button.png" name="less_button" alt="" border="0" width="30" height="30"></span>
  </div>

  <div id="order_hide" class="order_button" title="Hide orders/status panel">
    <span style="cursor:pointer" onclick="button_hide_panels();"><img src="/images/orders/hide_button.png" name="hide_button" alt="" border="0" width="30" height="30"></span>
  </div>

</div>

<div id="game_unit_orders_settlers" style="display: none;">
</div>
