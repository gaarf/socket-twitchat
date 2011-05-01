var express = require('express')
  , app = express.createServer();

module.exports = require('./config.js').configure(app, express);

if (!module.parent) {

  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port);

  var io = require('socket.io') // socket.io, I choose you
    , socket = io.listen(app);


  var roomManager = require('./lib/chatrooms.js')
    , room = roomManager.createRoom();

  socket.on('connection', function(client){

    var user = roomManager.getUser(client);
    user.joinRoom(room);

    client.send(JSON.stringify({ 'buffer': room.buffer }));
    
    client.on('message', function(){ 
      console.log('### message', arguments);
    });


    client.on('disconnect', function(){ 
      roomManager.removeUser(client);
    });

  });

  room.on('roster-update', function() {
    socket.broadcast(JSON.stringify({ 'roster': this.roster }));
  });

  room.on('conversation-update', function(msg) {
    socket.broadcast(JSON.stringify({
      'speech': msg
    }));
  });

}