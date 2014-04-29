var url_video_youtube_regexp = new RegExp(/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/gi);
chat_system.on_new_message(function(chunked_message){
  for(var i = 0; i < chunked_message.length; i++){
    if(chunked_message[i].message_formatter != "url"){
      continue;
    }
    
    var match = url_video_youtube_regexp.exec(chunked_message[i].url);

    if(match){
      chunked_message[i].message_formatter = "url_video";
      chunked_message[i].message = "<iframe width=\"560\" height=\"315\" src=\"//www.youtube.com/embed/" + match[7] + "\" frameborder=\"0\" allowfullscreen></iframe>";
    }
  }
  return chunked_message;
});
