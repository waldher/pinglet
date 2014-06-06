var fs = require('fs');

module.exports.index = function(req, res){
  fs.readFile(__dirname + '/../client/index.html', 'utf8', function(err, text){
    res.send(text);
  });
};
