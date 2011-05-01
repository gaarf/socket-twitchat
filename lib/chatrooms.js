var _ = require('underscore'),
    util = require('util'),
    events = require('events');

function v(obj) { // hide pseudo-private properties to avoid circular refs
  var out = {};
  _.each(_(obj).keys(), function(k) {
    if(k.charAt(0)!="_"){
      out[k] = obj[k];
    }
  });
  return out;
};

/* ================================================================ roomManager */

var rooms = [];

_.extend(module.exports, {

  createRoom: function(topic) {
      var r = new Room({topic:topic});
      rooms.push(r);
      return r;
  },
  
  topics: function() {
      return _(rooms).pluck('topic');
  },

  getUser: function(client) {
      return new User(client);
  },

  removeUser: function(client) {
    _.each(rooms, function(r) {
      r.removeUser({id:client.sessionId});
    });
  }

});

/* ================================================================ Room */

function Room(opts) {
  events.EventEmitter.call(this);
  return _(this).defaults({
    id: rooms.length,
    topic: opts.topic,
    buffer: [],
    roster: []
  });
};

util.inherits(Room, events.EventEmitter);

_.extend(Room.prototype, {

  hasUser: function(user) {
    return _(this.roster).any(function(member) {
      return member.id == user.id;
    });
  },

  addUser: function(user) {
    if(this.hasUser(user)) return;
    this.roster.push(v(user));
    this.emit('roster-update');
  },

  removeUser: function(user) {
    var didIt;
    this.roster = _(this.roster).reject(function(member) {
      if(member.id == user.id) {
        return (didIt = true);
      }
    });
    if(didIt) this.emit('roster-update');
  },

  update: function(user, text) {
    if(this.hasUser(user)) {
      var msg = new Message(user, text);
      this.buffer.push(msg);
      this.emit('conversation-update', msg);
      if(this.buffer.length>15) {
        this.buffer.shift();
      }
    }
  }

});

/* ================================================================ User */

function User(client) {
  return _(this).defaults({
    id: client.sessionId,
    ip: client.connection.remoteAddress
  });
};

_.extend(User.prototype, {

  say: function(text) {
    if(this._room) {
      this._room.update(this, text);
    }
  },
  
  joinRoom: function(room) {
    room.addUser(this);
    this._room = room;
  },

  partRoom: function(room) {
    room.removeUser(this);
    this._room = null;
  }

});

/* ================================================================ Message */

function Message(user, text) {
  return _(this).defaults({
    user: v(user),
    text: text,
    time: new Date()
  });
};

