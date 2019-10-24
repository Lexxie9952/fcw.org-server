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
var mobile_unread_messages = 0;
//var restored_chatbox_height = null;
//var restored_chatbox_width = null;
var message_log = new EventAggregator(update_chatbox, 125,
                                      EventAggregator.DP_ALL, 1000, 0);
var pregame_messages = [];
var previous_scroll = 0;
var current_message_dialog_state = null;
var max_chat_message_length = 500;


function init_chatbox()
{
  chatbox_active = true;

  $("#game_chatbox_panel").attr("title", "");
  
  if (is_small_screen()) {
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
                      // "draggable" : true,
                      "minimize" : function(evt, dlg){ msg_minimize_mobile(evt,dlg); },
                      "restore" : function(evt, dlg){ msg_restore_mobile(evt,dlg);   },
                      "maximize" : function(evt, dlg){ msg_maximize_mobile(evt,dlg); },
                      "icons" : {
                        "minimize" : "ui-icon-circle-minus",
                        "restore" : " ui-icon-pause",   // unused icon so we can hide it without affecting others
                        "maximize" : "ui-icon-circle-plus",
                      }});                      
  } 
  else {   // not small screen             
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
    }

  $("#game_chatbox_panel").dialog('open');
  $(".chatbox_dialog").css("top", "52px");

  if (is_small_screen()) {
    $(".ui-icon-pause").parent().hide();       // no restore option: hide button
    $(".ui-icon-circle-plus").parent().hide(); // hide maximize button on launch
    $("#game_text_input").show();
  } else $(".chatbox_dialog").css({"left":"2px", "top":"43px", "position":"fixed"});

  $("#freeciv_custom_scrollbar_div").mCustomScrollbar({theme:"3d"});
  if (current_message_dialog_state == "minimized") $("#game_chatbox_panel").dialogExtend("minimize");
}

/**************************************************************************
 FUNCTIONS FOR MINIMIZING/RESTORING/MAXIMIZING CHAT BOX MESSAGE WINDOW
  These are called by init_chatbox above but were were extracted so they
  can be called separately, such as by clicking the new notification icon.
**************************************************************************/
function msg_minimize_mobile(evt, dlg) {
  current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state");
  $(".ui-icon-pause").parent().hide();   // no restore option: hide button
  $(".ui-icon-circle-plus").parent().show();   // no restore option: hide button
  $(".mobile_chatbox_dialog").css({"height":"24","width":"24"});
  mobile_unread_messages = 0; // minimizing means one cam from viewing
}
function msg_restore_mobile(evt, dlg) {
  // shouldn't ever be called, but reserved for future implementation of 
  // "half screen" chat window
  current_message_dialog_state = "normal"; 
  mobile_unread_messages = 0;
  $(".mobile_chatbox_dialog").css({"height":"30","width":"80"});
  chatbox_scroll_to_bottom(false);
}
function msg_maximize_mobile(evt,dlg) {
  current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state");
  $(".ui-icon-pause").parent().hide();   // no restore option: hide button
  $(".ui-icon-circle-plus").parent().hide();   // no restore option: hide button
  $("#game_text_input").show();
  chatbox_scroll_to_bottom(false);
  mobile_unread_messages = 0;
  $("#ui-id-12").html(""); // clear unread message count
}
function msg_minimize(evt,dlg) {
  $(".chatbox_dialog").css({"height":"25","width":110});
  // if you maximize, minimize, then restore, then
  // you have to minimize, maximize, then restore
/*
  // maximize>restore>minimize, keeps state fresh
  if (current_message_dialog_state=="maximized") {
    $(".chatbox_dialog .ui-icon-bullet").click();
    current_message_dialog_state="minimized"
    $(".chatbox_dialog .ui-icon-circle-minus").click();
  }*/
  current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state");
  $(".chatbox_dialog").css({"left":"2px", "top":"8px", "position":"fixed"});
  mobile_unread_messages = 0; // minimizing means one cam from viewing
}
function msg_restore(evt,dlg) {
  current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state"); 
  mobile_unread_messages = 0;
  $(".chatbox_dialog").css({"left":"2px", "top":"43px", "position":"fixed"});
  $(".chatbox_dialog").css({"height":"200", "width":"27%"});
  chatbox_scroll_to_bottom(false);
  $("#ui-id-12").html(""); // clear unread message count  
}
function msg_maximize(evt,dlg) {
  current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state"); 
  mobile_unread_messages = 0;
  chatbox_scroll_to_bottom(false);
  $("#ui-id-12").html(""); // clear unread message count  
}
function toggle_msgbox()
{ // TO DO: shortcut tap to access this from mobile
  if (is_small_screen()) {
    if (current_message_dialog_state == "minimized")
     $(".message_chatbox.dialog .ui-icon-circle-plus").click();
      //msg_maximize_mobile(null,null);
    else 
      $(".message_chatbox.dialog .ui-icon-circle-minus").click();
      //msg_minimize_mobile(null,null);  
  } 
  else {  // currently only uses this on normal size screen:
    if (current_message_dialog_state == "minimized")
      $(".chatbox_dialog .ui-icon-bullet").click();
      // msg_restore(null,null);
    else 
      $('.chatbox_dialog .ui-icon-circle-minus').click();
    // msg_minimize(null,null);  
  }
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

/**************************************************************************
 This adds new text to the main message chatbox. This allows the client
 to produce messages independently of incoming packets (e.g., notifying
  of changes to prefs, etc.)
**************************************************************************/
function add_client_message(message)
{
  var fake_packet = {"message": "<font color='#AFA8A8'>"+message+"</font>"};
  fake_packet.event = E_CHAT_MSG;
  add_chatbox_text(fake_packet);
}

/**************************************************************************
 This adds new text to the main message chatbox. See update_chatbox() which
 does the actual update to the screen.
**************************************************************************/
function add_chatbox_text(packet)
{
    // Keep a count of unread messages in chat window
    // ----------------------------------------------
    // mobile
    if (is_small_screen()) {
      if (current_message_dialog_state != "maximized") {
        mobile_unread_messages ++;
      } else mobile_unread_messages = 0;
    } 
    // large screen:
    else if (current_message_dialog_state == "minimized") { 
      mobile_unread_messages ++;
      $(".ui-dialog-titlebar").find("#ui-id-12").html("<i class='fa fa-commenting-o' aria-hidden='true'></i><font color='#ff8080'> "+mobile_unread_messages+"</font>");
    } else {
      mobile_unread_messages = 0;
      $("#ui-id-12").html("<i class='fa fa-commenting-o' aria-hidden='true'></i><font color='#ff8080'>");
    } 
    // -----------------------------------------------

    var text = packet['message'];
    var server_words = ['waiting on','Lost connection','Not enough','has been removed','has connected']

    if (text == null) return;
    if (!check_text_with_banlist(text)) return;
    if (is_longturn()) {
        if (is_any_word_in_string(text,server_words)) return;
    }
    if (text.length >= max_chat_message_length) return;

    if (packet['event'] === E_CHAT_MSG) {
      if (is_any_word_in_string(text,["You are logged in as", "Load complete"])) return;
      packet['event'] = reclassify_chat_message(text);
    }

    if (civclient_state <= C_S_PREPARING) {
      text = text.replace(/#FFFFFF/g, '#000000');
    } else {
      text = text.replace(/#0000FF/g, '#5565FF')
                 .replace(/#006400/g, '#209A20')
                 .replace(/#551166/g, '#AA88FF');

      var real_time = true;
      var outgoing = false; 
  
      // Fix historic messages for outgoing formatting
      if (client.conn.playing != null && text.includes("{"+client.conn.playing.name+" -> ")) {
        outgoing = true;
        real_time = false;
        text = text.replace("{"+client.conn.playing.name+" -> ", "{<font color='#c888ff'>You</font><font color='#ffffff'>&#x279E;</font>");
      } else {
        // Fix real-time messages for outgoing formatting
        outgoing = text.substring(22,25) == "->{" ? true : false;
        if (outgoing) text = text.replace("->{", "{<font color='#c888ff'>You</font><font color='#ffffff'>&#x279E;</font>");
      }

      // Check for incoming private message:           
      var check_im = outgoing ? text.replace(/#A020F0/g, '#ffb789') : text.replace(/#A020F0/g, '#ff87b7');
      if (check_im != text) {         // if different, there was a private message
        if (packet['turn'] != null) {
          // Message may have come last turn after you logged out. Exclude earlier notification sounds:
          if ((!outgoing || real_time) && packet['turn'] >= game_info['turn'] - 1) play_sound("iphone1.ogg");
        }
        text=check_im; // now update the text var so the changed colour code goes in the message_log  
      }
    }

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
  chatbox_scroll_to_bottom(true);
}

/**************************************************************************
 Used to keep the chatbox scroll position fresh.
**************************************************************************/
function chatbox_scroll_to_bottom(slow_scroll) {

  if (slow_scroll)
    setTimeout(() => $('#freeciv_custom_scrollbar_div').mCustomScrollbar('scrollTo', 'bottom'), 200);
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
      message_node.message = message_node.message.replace(/#000000/g, '#FFFFFF');
      message_log.update(message_node)
    }
    pregame_messages = undefined;
}
