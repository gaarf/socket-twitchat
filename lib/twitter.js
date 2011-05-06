module.exports.TwitterStream = TwitterStream;

var _ = require('underscore'),
    util = require('util'),
    events = require('events'),
    OAuth = require('oauth').OAuth,
    SECRETS = require('../etc/secrets.js').getSecret('twitter');

function getRequest(query) {
  var oa = new OAuth(null, null, SECRETS.consumer_key, SECRETS.consumer_secret, "1.0A", null, "HMAC-SHA1"),
      url = "http://stream.twitter.com/1/statuses/sample.json",
      method = 'get';
  if(query) {
    url = "http://stream.twitter.com/1/statuses/filter.json?track=" + encodeURIComponent(query);
    method = 'post';
  }
  return oa[method](url, SECRETS.access_token, SECRETS.access_token_secret);
}

/* ================================================================ TwitterStream */

function TwitterStream() {
  events.EventEmitter.call(this);
  var args = Array.prototype.slice.call(arguments);
  this.query = args.length ? args.join(',') : false;
  return this;
};

util.inherits(TwitterStream, events.EventEmitter);

_.extend(TwitterStream.prototype, {

  stop: function() {
    this.request && this.request.abort();
  },

  start: function() {
    this.stop();

    var r = getRequest(this.query),
        buffer = '',
        that = this;

    r.on('response', function (response) {

      response.setEncoding('utf8');

      response.on('data', function (chunk) {
        chunk.split("\r\n").forEach(function(line, i) {
          if(buffer && i>0) {
            try {
              var o = JSON.parse(buffer),
                  s = o.user && o.user.screen_name;
              if(s) {
                console.log("got a tweet from", s);
              }
              buffer = '';
            } catch(e) { 
              console.error(e);
            }
          }
          buffer += line;
        });
      });

      response.on('end', function () {
        console.debug("stream ended", response);
      });

    });

    r.end(); // counter-intuitively, this fires off the request.
    this.request = r;
  }
});





