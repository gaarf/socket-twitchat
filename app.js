var express = require('express')
  , app = express.createServer();

module.exports = require('./config.js').configure(app, express);

if (!module.parent) {

  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port);

  var _ = require('underscore')
    , io = require('socket.io') // socket.io, I choose you
    , socket = io.listen(app)
    , roomManager = require('./lib/chatrooms.js')
    , room = roomManager.createRoom()
    , TwitterStream = require('./lib/twitter.js').Stream
    , stackOfTweets = []
    , stream = null;

  function initStream() {
    if(stream) {
      stream.stop();
    }
    stream = new TwitterStream();
    stream.on('tweet', function(tweet) {
      stackOfTweets.push(tweet);
    });
    stream.start();
  }

  // no more than one tweet per second
  setInterval(function() {
    if(stackOfTweets.length) {
      console.log('sending tweet to clients');
      socket.broadcast(JSON.stringify({ 'tweet': stackOfTweets.pop() }));
      stackOfTweets = [];
    }
  }, 1000);

  socket.on('connection', function(client){

    if(_.size(socket.clients) == 1) {
      console.log('first client connected');
      initStream();
    }

    var user = roomManager.getUser(client);

    client.on('message', function(msg){ 
      console.log("MESSAGE", msg);

      var obj = JSON.parse(msg);

      user.processMessage(obj);

      if('hello' in obj) {
        user.joinRoom(room);
        client.send(JSON.stringify({ 'buffer': room.buffer }));
      }

    });

    client.on('disconnect', function(){ 
      roomManager.removeUser(client);
      if(_.size(socket.clients) == 1) {
        console.log('last client disconnected');
        stream.stop();
      }
    });

  });

  room.on('roster-update', function() {
    socket.broadcast(JSON.stringify({ 'roster': this.roster }));
  });

  room.on('conversation-update', function(msg) {
    socket.broadcast(JSON.stringify({ 'speech': msg }));
  });

  
}