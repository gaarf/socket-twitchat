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
    , room = roomManager.createRoom();


  /* ================================================================ managing clients */

  socket.on('connection', function(client){

    var user = roomManager.getUser(client);

    client.on('message', function(msg){ 
      console.log(">>>", msg);
      user.processMessage(JSON.parse(msg));
    });

    client.on('disconnect', function(){ 
      roomManager.removeUser(client);
    });

    user.on('name-update', function(me) {
      user.joinRoom(room);
      client.send(JSON.stringify({ 'buffer': room.buffer, 'topic': {what:room.topic}, 'join':me }));
    });

    user.on('slash-response', function(msg, addCls) {
      client.send(JSON.stringify({ 'system': {msg:msg, addCls:addCls} }));
    });

  });



  /* ================================================================ chatroom activity */

  room.on('topic-update', function(who) {
    socket.broadcast(JSON.stringify({ 'topic': {what:this.topic, who:who} }));
  });

  room.on('stream-stop', function(who) {
    socket.broadcast(JSON.stringify({ 'stop': {who:who}, 'topic': {what:this.topic+' (stopped)'} }));
  });

  room.on('roster-update', function(what, who) {
    var out = { 'roster': this.roster };
    out[what] = who;
    socket.broadcast(JSON.stringify(out));
  });

  room.on('conversation-update', function(msg) {
    socket.broadcast(JSON.stringify({ 'speech': msg }));
  });



  /* ================================================================ tweet activity */

  setInterval(function() {
    socket.broadcast(JSON.stringify({ 'tweets': room.getTweets() }));
  }, 2222);

}