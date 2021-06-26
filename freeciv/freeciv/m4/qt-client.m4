# Try to configure the Qt-client (gui-qt)

dnl FC_QT_CLIENT
dnl Test for Qt and needed libraries for gui-qt

AC_DEFUN([FC_QT_CLIENT],
[
if test "x$gui_qt" = "xyes" || test "x$client" = "xall" ||
   test "x$client" = "xauto" ; then

  if test "x$cxx_works" = "xyes" ; then

    FC_QT([$qt_ver])

    if test x$fc_qt_usable = xtrue ; then
      gui_qt_cppflags=$FC_QT_CPPFLAGS
      gui_qt_cxxflags=$FC_QT_CXXFLAGS
      gui_qt_libs=$FC_QT_LIBS
    else
      qt_fail_reason="Missing $qt_ver development files"
    fi

  else
     qt_fail_reason="C++ compiler does not work"
  fi

  if test "x$fc_qt_usable" = "xtrue" ; then
    gui_qt=yes
    if test "x$client" = "xauto" ; then
      client=yes
    fi
  elif test "x$gui_qt" = "xyes" ; then
    AC_MSG_ERROR([selected client 'qt' cannot be built: $qt_fail_reason])
  fi
fi
])
