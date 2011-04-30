var express = require('express')
  , app = express.createServer();

module.exports = require('./config.js')(app, express);

if (!module.parent) {

  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port);

  var io = require('socket.io') // socket.io, I choose you
    , socket = io.listen(app);


  var room = {}


  socket.on('connection', function(client){

    client.on('message', function(){ 
      console.log('### message', arguments);
    });

    client.on('disconnect', function(){ 
      console.log('### disconnect');
    });

  });
}