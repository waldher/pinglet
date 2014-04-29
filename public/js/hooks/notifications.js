if("Notification" in window){
  if (Notification.permission !== 'denied') {
     Notification.requestPermission();
  }
  chat_system.on_new_message(function(chunked_message){
    if(!document.hasFocus()){
      if (Notification.permission === "granted") {
        new Notification("New Message from " + chat_system.chat_id);
      }
    }
  });
}
