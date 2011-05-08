var _ = require('underscore'),
    util = require('util'),
    events = require('events'), 
    twitter = require('./twitter.js');

/* ================================================================ roomManager */

var rooms = [];

_.extend(module.exports, {

  createRoom: function() {
    var r = new Room();
    rooms.push(r);
    return r;
  },

  // topics: function() {
  //   return _(rooms).pluck('topic');
  // },
  // 
  // getRoomByTopic: function(topic) {
  //   return _(rooms).detect(function(r) {
  //     return r.topic == topic;
  //   });
  // },

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

function Room(topic) {
  events.EventEmitter.call(this);
  return _(this).defaults({
    id: rooms.length,
    stream: null,
    topic: topic,
    tweets: [],
    buffer: [],
    roster: []
  });
};

util.inherits(Room, events.EventEmitter);

_.extend(Room.prototype, {

  initStream: function() {
    this.killStream();
    this.stream = new twitter.Stream(this.topic);
    this.emit('topic-update', this.topic);
    var that = this;
    this.stream.on('tweet', function(tweet) {
      that.tweets.push(tweet);
    });
    this.stream.start();
  },

  killStream: function() {
    this.stream && this.stream.stop();
    this.stream = null;
  },

  setTopic: function(topic) {
    this.topic = topic;
    this.initStream();
  },

  getTweets: function(count) {
    var output = this.tweets;
    if(output.length) {
      // console.log('getTweets '+output.length);
      this.tweets = [];
    }
    return output.slice(-count);
  },

  hasUser: function(user) {
    return _(this.roster).any(function(member) {
      return member.id == user.id;
    });
  },

  addUser: function(user) {
    var u = v(user);
    if(this.hasUser(u)) return;
    this.roster.push(u);
    console.log('addUser: '+u.name);
    this.emit('roster-update', 'join', u);
    this.stream || this.initStream();
  },

  removeUser: function(user) {
    var whoDat, that = this;
    this.roster = _(this.roster).reject(function(member) {
      if(member.id == user.id) {
        console.log('removeUser: '+member.name);
        return (whoDat = member);
      }
    });
    if(whoDat) {
      this.emit('roster-update', 'gone', v(whoDat));
      setTimeout(function(argument) {
        if(that.roster.length === 0) {
          console.log('room is empty, killing stream');
          that.killStream();
        }
      }, 1000);
    }
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
  events.EventEmitter.call(this);
  return _(this).defaults({
    name: null,
    ua: null,
    id: client.sessionId
  });
};

util.inherits(User, events.EventEmitter);

_.extend(User.prototype, {

  processMessage: function(obj) {
    var that = this;
    _(obj).each(function(o, k) {
      switch(k) {

        case 'hello':
          that.setName(o.name, o.ua);
        break;

        case 'compo':
          if(that._room) {
            that._room.update(that, o);
          }
        break;

        case 'slash':
          that.processSlash(o);
        break;

      }
    });
  },

  processSlash: function(o) {
    if(_.isArray(o)) {
      var n = 'slash-response';
      switch(o.shift()) {

        case 'help':
        default:
          this.emit(n, 'you need help?', 'help');
        break;

      }
    }
  },

  setName: function(name, ua) {
    if(!name && ua) {
      name = _("Chrome,Safari,Webkit,Firefox,Microsoft,Mozilla".split(',')).detect(function(w) {
        if(ua.match(w)) { return w; }
      }) + '_' + this.id;
    }
    this.name = name;
    this.emit('name-update', v(this));
  },

  joinRoom: function(room) {
    this.partRoom(room);
    if(room) {
      room.addUser(this);
      this._room = room;
    }
  },

  partRoom: function(room) {
    room = room || this._room;
    if(room) {
      room.removeUser(this);
    }
    this._room = null;
  }

});

/* ================================================================ Message */

function Message(user, text) {
  return _(this).defaults({
    user: v(user),
    text: text,
    time: (new Date()).getTime()
  });
};

/* ================================================================ utilities */

function v(obj) { // hide pseudo-private properties to avoid circular refs
  var out = {};
  _.each(_(obj).keys(), function(k) {
    if(k.charAt(0)!="_"){
      out[k] = obj[k];
    }
  });
  return out;
};