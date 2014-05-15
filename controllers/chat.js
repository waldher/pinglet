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

var chats = {};
var messages = {};

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
        chats[chat_id] = {"sockets": [socket]};
      }
      var chat_client_id = data.chat_client_id;
      if(!chat_client_id || chat_client_id.length != CHAT_CLIENT_ID_LENGTH) {
        chat_client_id = generate_id(CHAT_CLIENT_ID_LENGTH);
      }
      socket.emit("chats/assign", {"chat_id": chat_id, "chat_client_id": chat_client_id});
      
      //Announce the new chat client to their chat_id
      var new_connection_geo = geoip.lookup(socket.handshake.address.address);
      var new_connection_geo_text = "Unknown Location";
      if(new_connection_geo){
        new_connection_geo_text = new_connection_geo.country;
        if(new_connection_geo.city != undefined && new_connection_geo.city.length != 0)
          new_connection_geo_text += "-" + new_connection_geo.city;
      }
      var connection_message_uuid = uuid.v4();
      for(i in chats[chat_id].sockets){
        var message = {"message_uuid": connection_message_uuid,
                       "previous_message_uuid": chats[chat_id].last_message_uuid,
                       "sender": undefined,
                       "payload": "Connection from " + socket.handshake.address.address + " (" + new_connection_geo_text + ")"}
        chats[chat_id].sockets[i].emit("messages/receive", message);
        messages[connection_message_uuid] = message;
      }
      chats[chat_id].last_message_uuid = connection_message_uuid;

      socket.on("messages/create", function (data) {
        var message_uuid = uuid.v4();
        socket.emit("messages/acknowledge", {"client_message_id": data.client_message_id, "message_uuid": message_uuid, "previous_message_uuid": chats[chat_id].last_message_uuid});
        var message = {"message_uuid": message_uuid,
                       "previous_message_uuid": chats[chat_id].last_message_uuid,
                       "sender": data.sender,
                       "payload": data.message};
        for(i in chats[chat_id].sockets){
          if(chats[chat_id].sockets[i].id != socket.id){
            chats[chat_id].sockets[i].emit("messages/receive", message);
          }
        }
        messages[message_uuid] = message;
        chats[chat_id].last_message_uuid = message_uuid;
      });

      socket.on("messages/get", function (message_uuid, callback) {
        socket.emit("messages/receive", messages[message_uuid]);
      });
    });
  });
};
