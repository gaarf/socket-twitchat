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

  setTopic: function(topic, by) {
    this.log('setTopic: '+topic);
    this.topic = topic;
    this.initStream();
    this.emit('topic-update', v(by));
  },

  getTweets: function(count) {
    var output = this.tweets;
    count = count || (this.topic ? 0 : 1);
    if(output.length) {
      this.log('getTweets: '+(count||'all')+' of '+output.length);
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
    this.log('addUser: '+u.name);
    this.emit('roster-update', 'join', u);
    this.stream || this.initStream();
  },

  removeUser: function(user) {
    var whoDat, that = this;
    this.roster = _(this.roster).reject(function(member) {
      if(member.id == user.id) {
        that.log('removeUser: '+member.name);
        return (whoDat = member);
      }
    });
    if(whoDat) {
      this.emit('roster-update', 'gone', v(whoDat));
      setTimeout(function() {
        if(that.roster.length === 0) {
          that.log('is empty');
          that.killStream();
        }
      }, 1000);
    }
  },

  log: function(msg) {
    console.log('[room'+this.id+'] '+msg);
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
      var isHelp,
          responseMsg,
          responseCls,
          command = o.shift();

      if(command=='help') {
        isHelp = true;
        command = o.shift();
      }

      switch(command) {
        case 'nick':
          if(isHelp) {
            responseMsg = '<kbd>/nick [newname]</kbd><br/>';
            responseMsg += 'Change your name.';
          }
          else {
            this.setName(o.shift());
          }
        break;

        case 'topic':
          if(isHelp) {
            responseMsg = '<kbd>/topic [newtopic]</kbd><br/>';
            responseMsg += 'Change the room topic, clearing the twitter stream and starting anew.<br/>';
            responseMsg += 'Empty topic means we use the sample stream.';
          }
          else {
            this._room && this._room.setTopic(o.join(' '), this);
          }
        break;

        case 'stop':
          if(isHelp) {
            responseMsg = '<kbd>/stop</kbd><br/>';
            responseMsg += 'Stop the twitter stream.';
          }
          else {
            responseCls = 'notimplemented';
          }
        break;

        case 'help':
        default:
          responseMsg = 'Other commands you can try: <kbd>/nick, /topic, /stop</kbd>.<br/>';
          responseMsg += 'Get help on a specific command with <kbd>/help [command]</kbd>.';
        break;

      }

      if(responseCls=='notimplemented') {
        responseMsg = '<kbd>/'+command+'</kbd> command is not yet implemented :-(';
      }
      if(responseMsg) {
        this.emit('slash-response', responseMsg, responseCls||'help');
      }

    }
  },

  setName: function(name, ua) {
    if(!name && ua) {
      name = _("Chrome,Safari,Firefox,Microsoft,Mozilla".split(',')).detect(function(w) {
        if(ua.match(w)) { return w; }
      }) + '_' + this.id;
    }
    if(name) {
      this.name = cleanToken(name);
      this.emit('name-update', v(this));
    }
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
    text: text,
    user: v(user),
    time: (new Date()).getTime()
  });
};

/* ================================================================ utilities */

function cleanToken(str) {
  return str.replace(/\W/g,'');
}

function v(obj) { // hide pseudo-private properties to avoid circular refs
  var out = {};
  _.each(_(obj).keys(), function(k) {
    if(k.charAt(0)!="_"){
      out[k] = obj[k];
    }
  });
  return out;
};