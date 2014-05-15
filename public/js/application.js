var chat_system = {
  chat_id: window.location.pathname.slice(1),
  chat_client_id: localStorage.getItem("chat_client_id_" + window.location.pathname.slice(1)),
  new_message_hooks: [],
  on_new_message: function(callback){
    if(typeof(callback) == "function"){
      chat_system.new_message_hooks.push(callback);
    }
  }
};

var client_message_id_sequence = 0;
var message_template =  '<div id="message-SEQ" class="messageRow">';
    message_template += '<div class="messageStatus"></div>';
    message_template += '<div class="messageSender">SENDER</div>';
    message_template += '<div class="messageBody">BODY</div>';
    message_template += '</div>';
var add_message = function(message, before_message_uuid){
  var will_scroll_to_bottom = $("#chatWindow").scrollTop() > ($("#messageTarget").height() - $(window).height());

  var chunked_message = [
    {
      "message_formatter": undefined, // No plugin has yet claimed this section
      "message": message.payload
    }
  ];

  // Callbacks
  for(var i = 0; i < chat_system.new_message_hooks.length; i++){
    var hook_result = chat_system.new_message_hooks[i](chunked_message);
    if(hook_result != undefined) {
      chunked_message = hook_result;
    }
  }

  message_result = "";
  for(var i = 0; i < chunked_message.length; i++){
    message_result += chunked_message[i].message;
  }

  if(message_result.trim().length == 0) {
    return;
  }

  var client_message_id = message.message_uuid;
  if(client_message_id == undefined){
    client_message_id = client_message_id_sequence++;
  }
  message_html = message_template.slice(0);
  message_html = message_html.replace("SEQ", ("" + client_message_id));
  message_html = message_html.replace("SENDER", (message.sender || "System"));
  message_html = message_html.replace("BODY", message_result);
  var next_message_div = $("[x-previous-message-uuid='" + client_message_id + "']");
  if(next_message_div.length != 0) {
    next_message_div.before(message_html);
  } else {
    $('#messageTarget').append(message_html);
  }
  if(message.previous_message_uuid){
    $("#message-" + client_message_id).attr("x-previous-message-uuid", message.previous_message_uuid);
  }
  if(message.message_uuid == undefined){
    $('#message-' + client_message_id + ' .messageStatus').addClass("messageStatusNotAcknowledged");
  } else {
    $('#message-' + client_message_id + ' .messageStatus').addClass("messageStatusReceived");
  }

  // Scroll to bottom
  if(will_scroll_to_bottom){
    $("#chatWindow").scrollTop($("#messageTarget").height());
  }

  return client_message_id;
};

var socket = io.connect("/chat");
socket.emit("chats/connect", {"chat_id": window.location.pathname.slice(1), "chat_client_id": chat_system.chat_client_id});

socket.on("chats/assign", function(data){
  chat_system.chat_id = data.chat_id;
  window.history.pushState(undefined, undefined, data.chat_id);
  chat_system.chat_client_id = data.chat_client_id;
  localStorage.setItem("chat_client_id_" + chat_system.chat_id, chat_system.chat_client_id);
});

socket.on("messages/receive", function(data){
  add_message(data);
  if(data.previous_message_uuid && $("#message-" + data.previous_message_uuid).length == 0){
    socket.emit("messages/get", data.previous_message_uuid);
  }
});

socket.on("messages/acknowledge", function(data){
  var message = $("#message-" + data.client_message_id);
  message.attr("id", "message-" + data.message_uuid);
  message.attr("x-previous-message-uuid", data.previous_message_uuid);
  var messageStatus = $('#message-' + data.message_uuid + ' .messageStatus');
  messageStatus.removeClass("messageStatusNotAcknowledged");
  messageStatus.addClass("messageStatusAcknowledged");
});

var sendMessage = function(){
  if($("#sendInput").val().trim().length > 0){
    var message_content = $("#sendInput").val();
    message_content = message_content.replace(new RegExp('\r?\n','gm'), "<br />\n");
    var client_message_id = add_message({"sender": chat_system.chat_client_id,"payload": message_content});
    socket.emit("messages/create", {"client_message_id": client_message_id,"sender": chat_system.chat_client_id,"message": message_content});
    $("#sendInput").val('');
  }
  return false;
};

$("#sendForm").submit(sendMessage);
var send_input_shift_down = false;
$("#sendInput").keydown(function(eventData){
  if(eventData.keyCode == 16) {
    send_input_shift_down = true;
  }

  if(!send_input_shift_down && eventData.keyCode == 13) {
    sendMessage();
    return false;
  }
});
$("#sendInput").keyup(function(eventData){
  if(eventData.keyCode == 16) {
    send_input_shift_down = false;
  }
});
