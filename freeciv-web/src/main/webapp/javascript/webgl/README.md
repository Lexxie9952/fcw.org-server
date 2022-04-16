WebGL renderer for Freeciv-web
==============================

This is the WebGL + Three.js renderer for Freeciv-web.

[Three.js](https://threejs.org/) is the 3D engine used in Freeciv-web.

Custom GLSL Fragment and Vertex shaders can be found in the shaders subdirectory. 

![Freeciv-web](https://raw.githubusercontent.com/freeciv/freeciv-web/develop/freeciv-web/src/main/webapp/javascript/webgl/freeciv-webgl.png "Freeciv-web WebGL screenshot")

The Blender 3D models can be found here: https://github.com/freeciv/freeciv-web/tree/develop/blender

TODO for 3D WebGL client
---------------------
- The 3D WebGL client currently needs webgl_vision_cheat_temporary.patch in order to get terrain heights correctly.
- Separate Java Webapp for gltf 3d models and textures for improved build performance.
- Update Three.js version to latest version.



Building and testing
--------------------
Build Freeciv-web as normal with Vagrant as described in the main README file.
You can then test it in your instance.

You may use the WebGL interface live at:
- [moving borders](https://fcw.movingborders.es)

Developer: Andreas Rosdal [@andreasrosdal](http://www.github.com/andreasrosdal)
