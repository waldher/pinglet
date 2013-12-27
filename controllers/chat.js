var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

var generate_chat_id = function(){
  var text = "";
  for( var i=0; i < 10; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};

var chats = {};

module.exports = function(io){
  io.on("connection", function(socket){
    socket.on("chat_id", function(data){
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
