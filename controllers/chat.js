var geoip = require('geoip-lite');
var possible_chat_characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

var generate_chat_id = function(){
  var text = "";
  for( var i=0; i < 10; i++ )
    text += possible_chat_characters.charAt(Math.floor(Math.random() * possible_chat_characters.length));

  return text;
};

var chats = {};

module.exports = function(io){
  io.on("connection", function(socket){
    socket.on("chat_id", function(data){
      // Generate a chat id if necessary and send it to the client
      var chat_id = data.chat_id;
      if(chat_id.length != 10) {
        chat_id = generate_chat_id();
      }
      if(chats[chat_id]) {
        chats[chat_id].push(socket);
      } else {
        chats[chat_id] = [socket];
      }
      socket.emit("assign", {"chat_id": chat_id});
      
      //Announce the new chat client to their chat_id
      var new_connection_geo = geoip.lookup(socket.handshake.address.address);
      var new_connection_geo_text = "Unknown Location";
      if(new_connection_geo){
        new_connection_geo_text = new_connection_geo.country;
        if(new_connection_geo.city != undefined && new_connection_geo.city.length != 0)
          new_connection_geo_text += "-" + new_connection_geo.city;
      }
      for(i in chats[chat_id]){
        chats[chat_id][i].emit("receive_system", {"message": "Connection from " + socket.handshake.address.address + " (" + new_connection_geo_text + ")"});
      }

      socket.on("send", function (data) {
        socket.emit("acknowledge", {"message_id": data.message_id});
        for(i in chats[chat_id]){
          if(chats[chat_id][i].id != socket.id){
            chats[chat_id][i].emit("receive", {"message": data.message});
          }
        }
      });
    });
  });
};
