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
    this.stream.on('status', function(status) {
      switch(status) {
        case 200:
          that.initStream(); // restart
        break;
        case 420:
        default:
          that.killStream({name:"Twitter w/ HTTP "+status});
        break;
      }
    });
    this.stream.start();
  },

  killStream: function(by) {
    if(this.stream) {
      this.stream.stop();
      if(by) {
        this.topic += ' (stopped)';
        this.emit('stream-stop', v(by));
      }
    }
    this.tweets = [];
    this.stream = null;
  },

  setTopic: function(topic, by) {
    this.log('setTopic: '+topic);
    this.topic = topic;
    this.initStream();
    this.emit('topic-update', v(by));
  },

  addTopic: function(add, by) {
    if(add && this.topic) {
      this.setTopic(this.topic + ', ' + add, by);
    }
  },

  topicCount: function() {
    return this.topic ? this.topic.split(',').length : 0;
  },

  getTweets: function(count) {
    var output = this.tweets;
    count = count || (this.topic ? 0 : 1);
    if(output.length) {
      // this.log('getTweets: '+(count||'all')+' of '+output.length);
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
    if(this.roster.length==1) {
      this.initStream();
    }
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
          var newname = o.shift();
          if(!newname || isHelp) {
            responseMsg = '<kbd>/nick [newname]</kbd><br/>';
            responseMsg += 'Change your name.';
          }
          else {
            this.setName(newname);
          }
        break;

        case 'topic':
          var sub = o.shift();
          if(!sub || isHelp) {
            responseMsg = '<kbd>/topic set|add [newtopic]</kbd><br/>';
            responseMsg += 'Change the room topic, clearing the twitter stream and starting anew.<br/>';
            responseMsg += '<kbd>/topic sample</kbd><br/>';
            responseMsg += 'Use the sample stream.';
          }
          else if(this._room) {
            var newtopic = _(o).map(cleanToken).join(' ');
            switch(sub) {
              case 'add':
                var c = this._room.topicCount();
                if(c){
                  if(c>=4) {
                    responseCls = 'oops';
                    responseMsg = 'Sorry, cannot add more topics.';
                  }
                  else {
                    this._room.addTopic(newtopic, this);
                  }
                  break;
                }
              case 'set':
                this._room.setTopic(newtopic, this);
              break;
              case 'sample':
                this._room.setTopic('', this);
              break;
              default:
                this.processSlash(['help','topic']);
              break;
            }
            
          }
        break;

        case 'stop':
          if(isHelp) {
            responseMsg = '<kbd>/stop</kbd><br/>';
            responseMsg += 'Stop the twitter stream.';
          }
          else {
            if(this._room && this._room.stream) {
              this._room.killStream(this);
            }
            else {
              responseCls = 'oops';
              responseMsg = 'Stream does not exist, or is already stopped.';
            }
          }
        break;

        case 'clear':
          if(isHelp) {
            responseMsg = '<kbd>/clear</kbd><br/>';
            responseMsg += 'Empty your conversation and stream areas.';
          }
        break;

        default:
          if(isHelp && command) {
            responseCls = 'oops';
            responseMsg = 'There is no <kbd>'+cleanToken(command)+'</kbd> command.';
          }
          else {
            responseMsg = 'This is a Twitter-enabled chatroom. ';
            if(this._room && this._room.topic) {
              responseMsg += 'The current topic is <em>'+this._room.topic+'</em>. ';
            }
            responseMsg += 'All participants see the same stream of live twitter activity matching the current topic.';
            responseMsg += '<br/><br/>';
            responseMsg += 'Commands you can try: <kbd>/topic, /stop, /nick, /clear</kbd>.<br/>';
            responseMsg += 'Get help on a specific command with <kbd>/help [command]</kbd>.';
          }
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