// bwaaaaaa
var express = require('express')
  , app = express.createServer()
  , IS_PRODUCTION = process.env['NODE_ENV']=='production';

module.exports = require('./config.js').configure(app, express);

if (!module.parent) {

  app.listen(IS_PRODUCTION ? 80 : 3000);
  console.log("Express server listening on port %d", app.address().port);

  var _ = require('underscore')
    , io = require('socket.io').listen(app) // socket.io, I choose you
    , roomManager = require('./lib/manager.js')
    , room = roomManager.createRoom();


  /* ================================================================ managing clients */

  io.sockets.on('connection', function(client){

    var user = roomManager.getUser(client);

    client.on('message', function(msg){ 
      console.log(">>>", msg);
      user.processMessage(JSON.parse(msg));
    });

    client.on('disconnect', function(){ 
      roomManager.removeUser(client);
    });

    var sendHelp = _.once(function() { user.processSlash(['help']); }); // send help automagically the first time

    user.on('name-update', function(me) {
      user.joinRoom(room);
      client.json.send({ 'buffer': room.buffer, 'topic': {what:room.topic}, 'join':me });
      sendHelp();
    });

    user.on('slash-response', function(msg, cls) {
      client.json.send({ 'system': {msg:msg, addCls:cls} });
    });

  });



  /* ================================================================ chatroom activity */

  room.on('topic-update', function(who) {
    io.sockets.json.send({ 'topic': {what:this.topic, who:who} });
  });

  room.on('stream-stop', function(who) {
    io.sockets.json.send({ 'stop': {who:who}, 'topic': {what:this.topic+' (stopped)'} });
  });

  room.on('roster-update', function(what, who) {
    var out = { 'roster': this.roster };
    out[what] = who; // fun!
    io.sockets.json.send(out);
  });

  room.on('conversation-update', function(msg) {
    io.sockets.json.send({ 'speech': msg });
  });



  /* ================================================================ tweet activity */

  setInterval(function() {
    var tweets = room.getTweets();
    if(tweets.length) {
      io.sockets.json.send({ 'tweets': tweets });
    }
  }, 1000);

}