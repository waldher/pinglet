var CHAT_ID_LENGTH = 9;
var CHAT_CLIENT_ID_LENGTH = 12;

var sockjs = require('sockjs');
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
var connection_chat_id = {};

var pack_message = function(channel, content){
  return JSON.stringify({"channel": channel, "content": content});
};

var new_message = function(chat_id, sender, payload, callback){
  messagesdb.get("chats-last-message-uuid-" + chat_id, function(err, last_message_uuid){
    var message_uuid = uuid.v4();
    var message = {"message_uuid": message_uuid,
                   "previous_message_uuid": last_message_uuid,
                   "time": new Date(),
                   "sender": sender,
                   "payload": payload};
    for(i in chats[chat_id].connections){
      if(chats[chat_id].sender_connection_ids[sender] != chats[chat_id].connections[i].id){
        chats[chat_id].connections[i].write(pack_message("messages/receive", message));
      }
    }
    messagesdb.put("messages-" + message_uuid, JSON.stringify(message));
    messagesdb.put("chats-last-message-uuid-" + chat_id, message_uuid);

    if(callback){
      callback(message);
    }
  });
};

var message_create = function(connection, data){
  new_message(connection_chat_id[connection.id], data.sender, data.payload, function(message){
    connection.write(pack_message("messages/acknowledge", {"client_message_id": data.client_message_id,
                                         "message_uuid": message.message_uuid,
                                         "previous_message_uuid": message.previous_message_uuid,
                                         "time": message.time}));
  });
}

var message_get = function(connection, message_uuid){
  messagesdb.get("messages-" + message_uuid, function(err, message){
    if(!err){
      connection.write(pack_message("messages/receive", JSON.parse(message)));
    }
  });
};

var connect_to_chat = function(connection, data){
  // Generate a chat id if necessary and send it to the client
  var chat_id = data.chat_id;
  if(chat_id.length != CHAT_ID_LENGTH) {
    chat_id = generate_id(CHAT_ID_LENGTH);
  }
  if(chats[chat_id]) {
    chats[chat_id].connections.push(connection);
  } else {
    chats[chat_id] = {"connections": [connection], "sender_connection_ids": {}};
  }
  var chat_client_id = data.chat_client_id;
  if(!chat_client_id || chat_client_id.length != CHAT_CLIENT_ID_LENGTH) {
    chat_client_id = generate_id(CHAT_CLIENT_ID_LENGTH);
  }
  chats[chat_id].sender_connection_ids[chat_client_id] = connection.id;
  connection_chat_id[connection.id] = chat_id;
  connection.write(pack_message("chats/assign", {"chat_id": chat_id, "chat_client_id": chat_client_id}));

  //Announce the new chat client to their chat_id
  var new_connection_geo = geoip.lookup(connection.remoteAddress);
  var new_connection_geo_text = "Unknown Location";
  if(new_connection_geo){
    new_connection_geo_text = new_connection_geo.country;
    if(new_connection_geo.city != undefined && new_connection_geo.city.length != 0)
      new_connection_geo_text += "-" + new_connection_geo.city;
  }

  new_message(chat_id, undefined, "Connection from " + connection.remoteAddress + " (" + new_connection_geo_text + ")");
};

var chat_server = sockjs.createServer();
chat_server.on("connection", function(connection){
  connection.on("data", function(raw_message){
    var message = JSON.parse(raw_message);
    if(message.channel == "chats/join"){
      connect_to_chat(connection, message.content);
    } else if(message.channel == "messages/create") {
      message_create(connection, message.content);
    } else if(message.channel == "messages/get") {
      message_get(connection, message.content);
    }
  });
  connection.on("close", function(message){
  });
});

module.exports = function(server){
  chat_server.installHandlers(server, {"prefix": "/chat"});
};
