cd %~dp0\..

bin\glib-compile-schemas.exe share\glib-2.0\schemas
bin\gdk-pixbuf-query-loaders.exe > lib\gdk-pixbuf-2.0\2.10.0\loaders.cache
bin\gtk-update-icon-cache.exe share\icons\Adwaita
