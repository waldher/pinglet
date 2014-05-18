var CHAT_ID_LENGTH = 9;
var CHAT_CLIENT_ID_LENGTH = 12;

var geoip = require('geoip-lite');
var uuid = require('node-uuid');
var possible_id_characters = "abcdefghjkmnpqrstuvwxyz23456789";

var generate_id = function(id_length){
  var text = "";
  for( var i=0; i < id_length; i++ )
    text += possible_id_characters.charAt(Math.floor(Math.random() * possible_id_characters.length));

  return text;
};

var levelup = require('levelup');
var messagesdb = levelup('./db/messagesdb');

var chats = {};

var new_message = function(chat_id, sender, payload, callback){
  messagesdb.get("chats-last-message-uuid-" + chat_id, function(err, last_message_uuid){
    var message_uuid = uuid.v4();
    var message = {"message_uuid": message_uuid,
                   "previous_message_uuid": last_message_uuid,
                   "time": new Date(),
                   "sender": sender,
                   "payload": payload};
    for(i in chats[chat_id].sockets){
      if(chats[chat_id].sender_socket_ids[sender] != chats[chat_id].sockets[i].id){
        chats[chat_id].sockets[i].emit("messages/receive", message);
      }
    }
    messagesdb.put("messages-" + message_uuid, JSON.stringify(message));
    messagesdb.put("chats-last-message-uuid-" + chat_id, message_uuid);

    if(callback){
      callback(message);
    }
  });
};

var connect_to_chat = function(socket, chat_id){
  //Announce the new chat client to their chat_id
  var new_connection_geo = geoip.lookup(socket.handshake.address.address);
  var new_connection_geo_text = "Unknown Location";
  if(new_connection_geo){
    new_connection_geo_text = new_connection_geo.country;
    if(new_connection_geo.city != undefined && new_connection_geo.city.length != 0)
      new_connection_geo_text += "-" + new_connection_geo.city;
  }

  new_message(chat_id, undefined, "Connection from " + socket.handshake.address.address + " (" + new_connection_geo_text + ")");

  socket.on("messages/create", function (data) {
    new_message(chat_id, data.sender, data.payload, function(message){
      socket.emit("messages/acknowledge", {"client_message_id": data.client_message_id,
                                           "message_uuid": message.message_uuid,
                                           "previous_message_uuid": message.previous_message_uuid,
                                           "time": message.time});
    });
  });

  socket.on("messages/get", function (message_uuid, callback) {
    messagesdb.get("messages-" + message_uuid, function(err, message){
      if(!err){
        socket.emit("messages/receive", JSON.parse(message));
      }
    });
  });
};

module.exports = function(io){
  io.on("connection", function(socket){
    socket.on("chats/connect", function(data){
      // Generate a chat id if necessary and send it to the client
      var chat_id = data.chat_id;
      if(chat_id.length != CHAT_ID_LENGTH) {
        chat_id = generate_id(CHAT_ID_LENGTH);
      }
      if(chats[chat_id]) {
        chats[chat_id].sockets.push(socket);
      } else {
        chats[chat_id] = {"sockets": [socket], "sender_socket_ids": {}};
      }
      var chat_client_id = data.chat_client_id;
      if(!chat_client_id || chat_client_id.length != CHAT_CLIENT_ID_LENGTH) {
        chat_client_id = generate_id(CHAT_CLIENT_ID_LENGTH);
      }
      chats[chat_id].sender_socket_ids[chat_client_id] = socket.id;
      socket.emit("chats/assign", {"chat_id": chat_id, "chat_client_id": chat_client_id});

      connect_to_chat(socket, chat_id);
    });
  });
};
