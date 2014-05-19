var fs = require('fs');

module.exports.index = function(req, res){
  fs.readFile(__dirname + '/../public/index.html', 'utf8', function(err, text){
    res.send(text);
  });
};
