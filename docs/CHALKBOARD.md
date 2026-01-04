# Chalkboard (User Marks)

This document describes the current chalkboard implementation (client-side user marks), the storage format, and planned improvements.

## Overview
- Chalkboard mode lets a player place private marks on the map.
- Marks are stored locally per game (keyed by `Game_UID`) and are never sent to the server.
- Marks are only rendered while chalkboard mode is ON.

## Storage (client-side)
Stored inside `myGameVars.chalkboard` (persisted via `simpleStorage` under `Game_UID`).

Current shape (versioned):

```
chalkboard = {
  version: 1,
  activeLayerId: "layer-1",
  layerOrder: ["layer-1", "layer-2"],
  nextLayerId: 3,
  layers: {
    "layer-1": {
      name: "Layer 1",
      visible: true,
      tiles: {
        "1234": 1
      },
      shapes: []
    }
  },
  legacyMigrated: true
}
```

Notes:
- `tiles` keys are tile indices (as strings).
- For simple marks, `tiles` values are just the `USER_MARK_*` index number.
- More complex values (arrays/objects) are reserved for future mark types and are still supported (including legacy `{type:"mark",style:n}` entries).
- `shapes` is reserved for future non-tile marks (radius, path, etc.).
- `visible` and `layerOrder` are present for future multi-layer display and reordering.

### Migration
Legacy keys `cPlan<tileIndex>` are migrated on first entry to chalkboard mode:
- All old marks are moved into `layer-1`.
- Legacy keys are removed.
- This is safe and preserves existing user data.

## Rendering
- Marks are drawn in `LAYER_TILELABEL` inside `fill_sprite_array` only when `user_marking_mode` is true.
- Only the active layer is rendered today.

## UI and Hotkeys
Chalkboard mode:
- `Alt-X` toggles chalkboard mode.
- Panel visibility is controlled by Prefs -> "Chalkboard layers panel".

Layer controls:
- `Alt-[` / `Alt-]` cycle layers.
- `Alt-Shift-[` or `Alt-Shift-]` creates a new layer and activates it.
- `Alt-Backspace` clears the active layer.
- `Del` clears all chalkboard layers.
- `F2` starts rename on active layer (panel must be visible).
- Clicking the active layer row also enters rename mode.

Panel actions:
- New / Rename / Delete buttons are available in the panel.
- Inline rename uses Enter to save and Esc to cancel.

## Planned Improvements
- Multi-visible layers with per-layer toggles.
- Reordering layers (drag-and-drop or buttons).
- Additional mark types beyond tileset sprites.
- Non-tile shapes (radius overlays, paths, measurement tools).

## Implementation Notes
When extending the system:
- Keep all changes backward compatible with the current `chalkboard` structure.
- Consider `shapes` for multi-tile overlays.
- Avoid adding dependencies on server data unless needed; chalkboard is intentionally local-only.
