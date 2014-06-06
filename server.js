var express = require('express');
var app = express();
var server = require('http').createServer(app);

app.use(require('body-parser').json());

app.get('/', require('./controllers/index').index);
app.get('/:chat_id', require('./controllers/index').index);
require("./controllers/chat")(server);

app.use(express.static('client'));

var listenOn = 1337;
if(process.env.NODE_ENV == 'production'){
  listenOn = "tmp/socket";
}

var startServer = function(){
  server.listen(listenOn, "::", undefined, function(){
    console.log("Listening on " + listenOn);
    if(typeof(listenOn) == 'string'){
      fs.chmod(listenOn, 0777);
    }
  });
};

var closeServer = function(){
  if(typeof(listenOn) == 'string'){
    fs.unlink(listenOn);
  }
};

process.on('exit', closeServer);
process.on('SIGINT', function(){
  process.exit(0);
});

var fs = require('fs');

if(typeof(listenOn) == 'string'){
  fs.exists(listenOn, function(exists){
    if(exists){
      console.log("WARNING: " + listenOn + " already exists. It will be deleted now.");
      fs.unlink(listenOn, function(err){
        if(err){
          console.log("ERROR: Couldn't delete " + listenOn);
          process.exit(1);
          return;
        }
        startServer();
      });
    } else {
      startServer();
    }
  });
} else {
  startServer();
}
