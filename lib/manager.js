var _ = require('underscore'),
    Room = require('./room.js'),
    User = require('./user.js');

/* ================================================================ roomManager */

var rooms = [];

_.extend(module.exports, {

  createRoom: function() {
    var r = new Room(rooms.length);
    rooms.push(r);
    return r;
  },

  getUser: function(client) {
    return new User(client);
  },

  removeUser: function(client) {
    _.each(rooms, function(r) {
      r.removeUser({id:client.id});
    });
  }

});