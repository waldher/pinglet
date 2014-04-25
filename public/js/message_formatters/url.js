var url_regexp = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi);
chat_system.on_new_message(function(chunked_message){
  var result_chunked_message = [];
  for(var i = 0; i < chunked_message.length; i++){
    if(chunked_message[i].message_formatter != undefined){
      result_chunked_message.push(chunked_message[i]);
      continue;
    }

    var url_matches = chunked_message[i].message.match(url_regexp);
    if(url_matches == undefined || url_matches.length == 0){
      result_chunked_message.push(chunked_message[i]);
      continue;
    }

    var remaining_message = chunked_message[i].message.slice(0);
    while(1){
      if(remaining_message.length == 0)
        break;

      if(url_matches.length == 0){
        result_chunked_message.push({
          "message_formatter": undefined,
          "message": remaining_message
        });
        break;
      }

      var next_url = url_matches.pop();
      var next_url_position = remaining_message.indexOf(next_url);
      if(next_url_position > 0){
        result_chunked_message.push({
          "message_formatter": undefined,
          "message": remaining_message.slice(0,next_url_position)
        });
      }
      result_chunked_message.push({
        "message_formatter": "url",
        "url": next_url,
        "message": "<a href=\"" + next_url + "\" target=\"_blank\">" + next_url + "</a>"
      });
      remaining_message = remaining_message.slice(next_url_position+next_url.length);
    }
  }
  return result_chunked_message;
});
