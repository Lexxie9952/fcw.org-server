/**********************************************************************
    Copyright (C) 2017  The Freeciv-web project

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

***********************************************************************/

var chatbox_active = true;
var unread_messages = 0;

var message_log = new EventAggregator(update_chatbox, 125,
                                      EventAggregator.DP_ALL, 1000, 0);
var pregame_messages = [];
var previous_scroll = 0;
var current_message_dialog_state = null;
var max_chat_message_length = 500;

var restore_chatbox_vals = { "h_container" : null,
                             "w_container" : null,
                             "h_game_chatbox_panel": null,
                             "w_game_chatbox_panel": null,
};

/**************************************************************************
   ...
**************************************************************************/
function init_chatbox()
{
  chatbox_active = true;

  if (is_small_screen()) { // Mobile behaviour:
      $("#game_chatbox_panel").dialog({
      id: "mobile_chat_dialog",
      bgiframe: true,
      modal: false,
      opacity: "1.0",
      width: $(window).width()-4,
      height: $(window).height(),
      resizable: true,
      dialogClass: 'mobile_chatbox_dialog no-close',
      closeOnEscape: false,
      position: {my: 'left top', at: 'left top', of: window, within: $("#game_page")},
      close: function(event, ui) { chatbox_active = false;}
    }).dialogExtend({
                      "minimizable" : true,
                      "maximizable" : true,
                      "closable" : false,
                      "minimize" : function(evt, dlg){ msg_minimize_mobile(evt,dlg); },
                //      "restore" : function(evt, dlg){ msg_restore_mobile(evt,dlg);   }, currently not implemented
                      "maximize" : function(evt, dlg){ msg_maximize_mobile(evt,dlg); },
                      "icons" : {
                        "minimize" : "ui-icon-circle-minus",
                        "restore" : " ui-icon-pause",   // unused icon so we can hide button without affecting other dialogs
                        "maximize" : "ui-icon-circle-plus",
                      }});
  }
  else {   // Normal non-mobile behavior:
      $("#game_chatbox_panel").dialog({
          bgiframe: true,
          modal: false,
          width: "27%",
          height: 200,
          top: 43,
          left: 2,
          resizable: true,
          dialogClass: 'chatbox_dialog no-close',
          closeOnEscape: false,
          position: {my: 'left bottom', at: 'left bottom', of: window, within: $("#game_page")},
          close: function(event, ui) { chatbox_active = false;}
        }).dialogExtend({
                        "minimizable" : true,
                        "maximizable" : true,
                        "closable" : false,
                        "minimize" : function(evt, dlg){msg_minimize(evt,dlg); },
                        "restore" : function(evt, dlg){ msg_restore(evt,dlg);  },
                        "maximize" : function(evt, dlg){ msg_maximize(evt,dlg);},
                        "icons" : {
                          "minimize" : "ui-icon-circle-minus",
                          "maximize" : "ui-icon-circle-plus",
                          "restore" : "ui-icon-bullet"
                        }});

        // User resize saves size for next restore. Immediate reload needed to reset contained elements to new size.
        $( "#game_chatbox_panel" ).parent().resize( function(e,ui) { chatbox_restore("save");chatbox_restore("load");});
    }

  $("#game_chatbox_panel").dialog('open');
  $(".chatbox_dialog").css("top", "52px");

  $("#game_chatbox_panel").parent().css("z-index","100"); // ensure it can always be opened/closed/never covered
  $("#game_chatbox_panel").parent().css("overflow", "hidden"); // make it immune to glitches making standard scrollbars (it already has a custom)
  // This is how you override unknown css ghosts who think they're !important:
  $( '#game_chatbox_panel' ).parent().each(function () {
    this.style.setProperty( 'border', 'solid 1px', 'important' );
    this.style.setProperty( 'border-color', '#4328', 'important' );
  });

  if (is_small_screen()) {
    $(".ui-icon-pause").parent().hide();       // no restore button in mobile: hide button
    current_message_dialog_state = "maximized";
    $(".ui-icon-circle-plus").parent().hide(); // launches as maximized: hide max.button on launch
    $("#game_text_input").show();
  } else {
    $(".chatbox_dialog").css({"left":"2px", "top":"43px", "position":"fixed"});
    if (simpleStorage.get("chatDlg") != null) chatbox_restore("load");
    else chatbox_restore("save"); // save initial settings for later restore after minimize/maximize
    // chat bubble icon in title bar
    $("#game_chatbox_panel").parent().children().not("#game_chatbox_panel").children().get(0).innerHTML
   //   = "<div style='font-size:80%; vertical-align:top;'><i class='fa fa-commenting-o' aria-hidden='true'></i></div>";
        = "<img src='/images/e/chat.png' height='14px'>";
   $("#game_text_input").blur();  // normal large screen, don't default focus into here on launch
  }

  $("#freeciv_custom_scrollbar_div").mCustomScrollbar({theme:"3d"});
  if (current_message_dialog_state == "minimized") $("#game_chatbox_panel").dialogExtend("minimize");
  // Set title bar to chat-bubble icon:
}

/**************************************************************************
 Remembers or saves the user resized chatbox size and positioning.
   "save" action - do when leaving "normal" state
   "load" action - do when restoring to "normal" state
**************************************************************************/
function chatbox_restore(action)
{
  if (action=="save") {
    restore_chatbox_vals.h_container                    = $("#game_chatbox_panel").parent().height();
    restore_chatbox_vals.w_container                    = $("#game_chatbox_panel").parent().width();
    restore_chatbox_vals.h_game_chatbox_panel           = $("#game_chatbox_panel").height();
    restore_chatbox_vals.w_game_chatbox_panel           = $("#game_chatbox_panel").width();
    simpleStorage.set('chatDlg', restore_chatbox_vals);
  }
  else {
    $("#game_chatbox_panel").parent().height(restore_chatbox_vals.h_container);
    $("#game_chatbox_panel").parent().width(restore_chatbox_vals.w_container);
    $("#game_chatbox_panel").height(restore_chatbox_vals.h_game_chatbox_panel);
    $("#game_chatbox_panel").width(restore_chatbox_vals.w_game_chatbox_panel);
    $("#freeciv_custom_scrollbar_div").height(restore_chatbox_vals.h_game_chatbox_panel-20);
    $("#freeciv_custom_scrollbar_div").width(restore_chatbox_vals.w_game_chatbox_panel);
    $("#mCSB_1").height("99%");
    $("#mCSB_1").width("auto");
  }
}
/**************************************************************************
 FUNCTIONS FOR MINIMIZING/RESTORING/MAXIMIZING CHAT BOX MESSAGE WINDOW
  These are called by init_chatbox above but were were extracted so they
  can be called separately, such as by clicking the new notification icon.
**************************************************************************/
function msg_minimize(evt,dlg) {
  $(".chatbox_dialog").css({"height":"25","width":110});
  current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state");
  $(".chatbox_dialog").css({"left":"2px", "top":"8px", "position":"fixed"});
  unread_messages = 0; // minimizing means one came from viewing messages
}
function msg_restore(evt,dlg) {
  current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state");
  unread_messages = 0;
  chatbox_restore("load"); // load last known size (user may have changed)
  $(".chatbox_dialog").css({"left":"2px", "top":"43px", "position":"fixed"});
  chatbox_scroll_to_bottom(false);
}
function msg_maximize(evt,dlg) {
  current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state");
  unread_messages = 0;
  $(".chatbox_dialog").css({"left":"2px", "top":"43px", "position":"fixed"});
  $(".chatbox_dialog").css({"height":($(window).height-44), "width":"99%"});
  $("#gamebox_chat_panel").css({"height": ($("#gamebox_chat_panel").parent().height()-2 ) });
  $("#gamebox_chat_panel").css({"width": ($("#gamebox_chat_panel").parent().width()-1 ) });
  $("#freeciv_custom_scrollbar_div").height($("#game_chatbox_panel").height()-60);
  $("#freeciv_custom_scrollbar_div").width($("#game_chatbox_panel").width()-1);
  chatbox_scroll_to_bottom(false);
}
function toggle_msgbox()
{
  if (!is_small_screen()) {
    if (current_message_dialog_state == "minimized")
      $(".chatbox_dialog .ui-icon-bullet").click();
    else
      $('.chatbox_dialog .ui-icon-circle-minus').click();
  }/*  mobile currently only uses manual maximize/minimize buttons to toggle
  else {
    if (current_message_dialog_state == "minimized")
     $(".message_chatbox.dialog .ui-icon-circle-plus").click();
    else
      $(".message_chatbox.dialog .ui-icon-circle-minus").click();
  }*/
}
function msg_minimize_mobile(evt, dlg) {
  current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state");
  $(".ui-icon-pause").parent().hide();   // no restore option: hide button
  $(".ui-icon-circle-plus").parent().show();   // no restore option: hide button
  $(".mobile_chatbox_dialog").css({"height":"24","width":"24"});
  unread_messages = 0; // minimizing means one cam from viewing
}
function msg_restore_mobile(evt, dlg) {
  /* shouldn't ever be called, but reserved for possible future
   * implementation of a "half screen" chat window:
  current_message_dialog_state = "normal";
  unread_messages = 0;
  $(".mobile_chatbox_dialog").css({"height":"30","width":"80"});
  chatbox_scroll_to_bottom(false);
  */
}
function msg_maximize_mobile(evt,dlg) {
  current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state");
  $(".ui-icon-pause").parent().hide();   // no restore option: hide button
  $(".ui-icon-circle-plus").parent().hide();   // no restore option: hide button
  $("#game_text_input").show();
  chatbox_scroll_to_bottom(false);
  unread_messages = 0;
}

/**************************************************************************
 Returns the kind of message (normal, private, ally).
 If an observer sends a private message, it will be treated as private.
 Same for a message to allies sent by an observer. That is, only public
 messages from observers will have the E_CHAT_OBSERVER type.
 There are quite a few message formats, selection is made depending on font
 color, that comes after the player in normal games or the timestamp or
 nothing in longturn games.

 Current examples:
 <b>player:</b><font color="#FFFFFF"><player> Normal message</font>
 <b>player:</b><font color="#A020F0">->{other} Private sent</font>
 <b>player:</b><font color="#A020F0">{player -> other} Private recv</font>
 <b>player:</b><font color="#551166">player to allies: allies msg</font>
 <b>observer:</b><font color="#FFFFFF"><(observer)> mesage</font>
 <b>observer:</b><font color="#A020F0">{(observer)} private from observer</font>
 <b>observer:</b><font color="#A020F0">*(observer)* private from observer</font>
 (T24 - 19:14:47) <font color="#FFFFFF"><player> player : lt msg with ts</player></font>
 <font color="#FFFFFF"><player> player : lt msg without ts</player></font>
 <font color="#A020F0">->{other} lt private sent msg</font>
 ...
**************************************************************************/
/* should no longer be necessary after 4March2021 and earlier commits, search for 4March2021 in other comments.

function reclassify_chat_message(text)
{
  // 29 characters just for the font tags
  if (text == null || text.length < 29) {
    return E_CHAT_MSG;
  }

  // Remove the player
  text = text.replace(/^<b>[^<]*:<\/b>/, "");

  // Remove the timestamp
  text = text.replace(/^\([^)]*\) /, "");

  // We should have the font tag now
  var color = text.substring(14, 20);
  if (color == "A020F0") {
    return E_CHAT_PRIVATE;
  } else if (color == "551166") {
    return E_CHAT_ALLIES;
  } else if (text.charAt(23) == '(') {
    return E_CHAT_OBSERVER;
  }
  return E_CHAT_MSG;
}
*/


/**************************************************************************
 This adds new text to the main message chatbox. This allows the client
 to produce messages independently of incoming packets (e.g., notifying
  of changes to prefs, etc.)
**************************************************************************/
function add_client_message(message, ev_class)
{
  var msg_event = ev_class ? ev_class : "e_client_msg";
  if (message.includes("%%") || message.includes("[`")) message = decode_user_hyperlinks(message);
  var fake_packet = {"message": "<span class='"+msg_event+"'>"+message+"</span>"};
  fake_packet.event = E_CHAT_MSG;
  add_chatbox_text(fake_packet);
}

/**************************************************************************
 This adds new text to the main message chatbox. See update_chatbox() which
 does the actual update to the screen.
**************************************************************************/
function add_chatbox_text(packet)
{
    var text = packet['message'];
    var server_words = ['waiting on','Lost connection','Not enough','has been removed','has connected','Anyone can now become game organizer']

    if (text == null) return;
    if (!check_text_with_banlist(text)) return;
    if (is_longturn()) {
        if (is_any_word_in_string(text,server_words)) return;
    }
    if (text.length >= max_chat_message_length) return;

    // Increment unread messages IFF chat minimized and AFTER filtering ignored/unshown server messages (above)
    if (current_message_dialog_state == "minimized") unread_messages ++;
    else unread_messages = 0;

    packet['message'] = text;
    message_log.update(packet);

    chatbox_scroll_to_bottom(true);
}

/**************************************************************************
 Returns the chatbox messages.
**************************************************************************/
function get_chatbox_text()
{
  var chatbox_msg_list = get_chatbox_msg_list();
  if (chatbox_msg_list != null) {
    return chatbox_msg_list.textContent;
  } else {
    return null;
  }
}

/**************************************************************************
 Returns the chatbox message list element.
**************************************************************************/
function get_chatbox_msg_list()
{
  return document.getElementById(civclient_state <= C_S_PREPARING ?
    'pregame_message_area' : 'game_message_area');
}

/**************************************************************************
 Packages the chatbox messages on a page into an array for
 sending to the message log and returns it.
**************************************************************************/
function get_chatbox_msg_array()
{
    var messages = [];
    $(get_chatbox_msg_list().innerHTML).each(function() {
        if (this.nodeName == "LI") {
          var event_number = window[this.className.toUpperCase()];
          messages.push({ event: event_number, message: this.innerHTML });
        }
    });
    return messages;
}

/**************************************************************************
 Clears the chatbox.
**************************************************************************/
function clear_chatbox()
{
  message_log.clear();
  chatbox_clip_messages(0);
}

/**************************************************************************
 Updates the chatbox text window.
**************************************************************************/
function update_chatbox(messages)
{
  var scrollDiv = get_chatbox_msg_list();

  if (scrollDiv != null) {
    for (var i = 0; i < messages.length; i++) {
        var item = document.createElement('li');
        item.className = fc_e_events[messages[i].event][E_I_NAME];

        // Align outgoing messages. &#x279E is arrow for outgoings
        if (messages[i].message.includes("&#x279E;")) {
          item.style.textAlign = "right";
          item.style.paddingLeft = "30px";
        }

        // Intercept server-side tile links
        if (messages[i].message.includes("<l tgt="))
          messages[i].message = parseServerLink(messages[i].message);

        item.innerHTML = messages[i].message;
        scrollDiv.appendChild(item);
    }

  } else {
      // It seems this might happen in pregame while handling a join request.
      // If so, enqueue the messages again, but we'll be emptying-requeueing
      // every second until the state changes.
      for (var i = 0; i < messages.length; i++) {
        message_log.update(messages[i]);
      }
  }
  if (scrollDiv.id == "pregame_message_area") {
    setTimeout(function() {
      var elem = document.getElementById('pregame_message_area');
      if (elem) elem.scrollTop = elem.scrollHeight;
    }, 420);
  } else {
    chatbox_scroll_to_bottom(true);
  }
}

/**************************************************************************
 Intercepts blank server side tile links and forms them properly.
 This fixes a bug where server sends us malformed link such as
  <l tgt=\"tile\" x=0 y=11 />.        which browser renders as:
  <l tgt="tile" x=0 y=11>.</l>        ... but should be:
  <l tgt="tile" x=0 y=11>(0,11)</l>
**************************************************************************/
function parseServerLink(message)
{
  if (message.includes(" />.</"))  { // empty tile link with no coordinates
    var x = message.match(/x=(.*?) y=/)[1];
    var y = message.match(/y=(.*?) \/>.</)[1];
    const fcol = "<font style='text-decoration: underline;' color='#1FDFFF'>"
    message = message.replace(/ \/>.<\//, ">"+fcol+"("+x+","+y+")</font></l></");
  }
  return message;
}

/**************************************************************************
 Used to keep the chatbox scroll position fresh.
**************************************************************************/
function chatbox_scroll_to_bottom(slow_scroll) {

  if (slow_scroll) {
    setTimeout(() => $('#freeciv_custom_scrollbar_div').mCustomScrollbar('scrollTo', 'bottom'), 200);
    // After half a second, ensure we really are at the bottom.
    setTimeout(() => $("#freeciv_custom_scrollbar_div").mCustomScrollbar("scrollTo", "bottom",{scrollInertia:0}), 900);
  }
  else
    setTimeout(() => $("#freeciv_custom_scrollbar_div").mCustomScrollbar("scrollTo", "bottom",{scrollInertia:0}), 200);
}

/**************************************************************************
 Clips the chatbox text to a maximum number of lines.
**************************************************************************/
function chatbox_clip_messages(lines)
{
  if (lines === undefined || lines < 0) {
    lines = 24;
  }

  // Flush the buffered messages
  message_log.fireNow();

  var msglist = get_chatbox_msg_list();
  var remove = msglist.children.length - lines;
  while (remove-- > 0) {
    msglist.removeChild(msglist.firstChild);
  }

  // To update scroll size
  update_chatbox([]);
}

/**************************************************************************
  Waits for the specified text to appear in the chat log, then
  executes the given JavaScript code.
**************************************************************************/
function wait_for_text(text, runnable)
{
  var chatbox_text = get_chatbox_text();
  if (chatbox_text != null && chatbox_text.indexOf(text) != -1) {
    if (DEBUG_PICK_NATION)
      console.log("wait_for_text("+text+") engaged.");
    runnable();
  } else {
    setTimeout(function () {
      wait_for_text(text, runnable);
    }, 100);
  }
}

/**************************************************************************
  Workaround a client issue - messages were sent to the pregame chatbox
  from the server and cleared when switching to in-game resulting in
  missing text for people /observing or /taking players from pregame.
  (This is different from people who already control a player in-game
  and are automatically attached to it in pregame because of server
  pecularities)
**************************************************************************/
function insert_pregame_messages(welcome_message)
{
    var bad_words = ["You are logged in as", "Load complete", "Welcome to the Freeciv version"];

    for (var i = 0; i < pregame_messages.length; i++) {
      var message_node = pregame_messages[i];
      if (is_any_word_in_string(message_node.message,bad_words)) continue;
      message_node.message = message_node.message.replace(/#000000/g, '#F0F0F0');
      message_log.update(message_node)
    }
    pregame_messages = undefined;
}
