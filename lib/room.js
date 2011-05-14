var _ = require('underscore'),
    util = require('util'),
    events = require('events'), 
    twitter = require('./twitter.js'),
    IS_PRODUCTION = process.env['NODE_ENV']=='production';

module.exports = Room;
/* ================================================================ Room */

function Room(id, topic) {
  events.EventEmitter.call(this);
  return _(this).defaults({
    id: id,
    stream: null,
    topic: topic || '',
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
        this.emit('stream-stop', by.flat ? by.flat() : by);
      }
    }
    this.tweets = [];
    this.stream = null;
  },

  setTopic: function(topic, by) {
    this.topic = _(topic.split(",")).chain().map(function(p) {
        return p.replace(/^\s+|[^\w@#-\s]|\s+$/g,'').replace(/\s+/g,' ');
      }).compact().uniq().value().join(', ');
    this.log('setTopic: '+this.topic);
    this.initStream();
    this.emit('topic-update', by.flat());
  },

  addTopic: function(add, by) {
    if(add && this.topic) {
      this.setTopic(this.topic + ',' + add, by);
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
    var u = user.flat();
    if(this.hasUser(u)) return;
    this.roster.push(u);
    this.log('addUser: '+u.name);
    this.emit('roster-update', 'join', u);
    if(IS_PRODUCTION && this.roster.length==1) {
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
      this.emit('roster-update', 'gone', whoDat);
      setTimeout(function() {
        if(that.roster.length === 0) {
          that.log('is empty');
          that.killStream();
        }
      }, 1000);
    }
  },

  log: function(m) {
    console.log('[room'+this.id+'] '+m);
  },

  update: function(user, input, imgUrl) {
    if(this.hasUser(user)) {
      var msg = new Message(user, input, imgUrl);
      if(msg.text || msg.image) {
        this.buffer.push(msg);
        this.emit('conversation-update', msg);
        if(this.buffer.length>15) {
          this.buffer.shift();
        }
        return msg;
      }
    }
  }

});



/* ================================================================ Message */

function Message(user, input, imgUrl) {
  var out = _(this).defaults({
    text: input.replace(/\<.*\>/g, ""), // strip tags
    user: user.flat(),
    time: (new Date()).getTime()
  });
  if(imgUrl && imgUrl.match(/^(data\:image\/|(https?\:)?\/\/[^\<\>]+)/)) {
    out.text = out.text || imgUrl;
    out.image = imgUrl;
  }
  return out;
};
