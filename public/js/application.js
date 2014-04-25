var chat_system = {
  new_message_hooks: [],
  on_new_message: function(callback){
    if(typeof(callback) == "function"){
      chat_system.new_message_hooks.push(callback);
    }
  }
};

var message_idSequence = 0;
var message_template =  '<div id="message-SEQ" class="messageRow">';
    message_template += '<div class="messageStatus"></div>';
    message_template += '<div class="messageSender">SENDER</div>';
    message_template += '<div class="messageBody">BODY</div>';
    message_template += '</div>';
var add_message = function(message, name){
  var will_scroll_to_bottom = $("#chatWindow").scrollTop() > ($("#messageTarget").height() - $(window).height());

  var chunked_message = [
    {
      "message_formatter": undefined, // No plugin has yet claimed this section
      "message": message
    }
  ];

  // Callbacks
  for(var i = 0; i < chat_system.new_message_hooks.length; i++){
    chunked_message = chat_system.new_message_hooks[i](chunked_message);
  }

  message_result = "";
  for(var i = 0; i < chunked_message.length; i++){
    message_result += chunked_message[i].message;
  }

  if(message_result.trim().length == 0) {
    return;
  }

  var message_id = message_idSequence++;
  message_html = message_template.slice(0);
  message_html = message_html.replace("SEQ", ("" + message_id));
  message_html = message_html.replace("SENDER", (name || "Me"));
  message_html = message_html.replace("BODY", message_result);
  $('#messageTarget').append(message_html);
  if(name == undefined){
    $('#message-' + message_id + ' .messageStatus').addClass("messageStatusNotAcknowledged");
  } else {
    $('#message-' + message_id + ' .messageStatus').addClass("messageStatusReceived");
  }

  // Scroll to bottom
  if(will_scroll_to_bottom){
    $("#chatWindow").scrollTop($("#messageTarget").height());
  }

  return message_id;
};

var socket = io.connect("/chat");
socket.emit("chat_id", {"chat_id": window.location.pathname.slice(1)});

socket.on("assign", function(data){
  window.history.pushState(undefined, undefined, data.chat_id);
});

socket.on("receive", function(data){
  add_message(data.message, "Them");
});

socket.on("receive_system", function(data){
  add_message(data.message, "System");
});

socket.on("acknowledge", function(data){
  var messageStatus = $('#message-' + data.message_id + ' .messageStatus');
  messageStatus.removeClass("messageStatusNotAcknowledged");
  messageStatus.addClass("messageStatusAcknowledged");
});

$("#sendForm").submit(function(){
  if($("#sendInput").val().trim().length > 0){
    var message_id = add_message($("#sendInput").val());
    socket.emit("send", {"message_id": message_id,"message": $("#sendInput").val()});
    $("#sendInput").val('');
  }
  return false;
});
