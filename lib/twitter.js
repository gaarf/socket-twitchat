module.exports.Stream = TwitterStream;

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
    url = "http://stream.twitter.com/1/statuses/filter.json?track=" + encodeURIComponent(query.replace(/,\s/g,','));
    method = 'post';
  }
  var req = oa[method](url, SECRETS.access_token, SECRETS.access_token_secret);
  console.log('[twttr] configuring stream:', req.method, req.path);
  return req;
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
    if(this.request) {
      this.request.abort();
      console.error("[twttr] aborted stream:", this.request.method, this.request.path);
    }
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
            var o;
            try {
              o = JSON.parse(buffer);
            } catch(e) { 
              console.error("[twttr] BUFFER PARSE ERROR",e);
            }
            finally {
              buffer = '';
            }
            if(o && o.user && o.user.screen_name) {
              that.emit('tweet', o);
            }
          }
          buffer += line;
        });
      });

      response.on('end', function () {
        console.error('[twttr] STREAM END', response.statusCode);
        that.emit('status', response.statusCode);
      });

    });

    r.end(); // counter-intuitively, this fires off the request.
    this.request = r;
  }
});





