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
    url = "http://stream.twitter.com/1/statuses/filter.json?track=" + encodeURIComponent(query);
    method = 'post';
  }
  console.log('configuring stream:', method.toUpperCase(), url);
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
                that.emit('tweet', {
                  id: o.id_str,
                  text: o.text,
                  when: Date.parse(o.created_at),
                  by: _.select(o.user, function(v,k) { return _.include(['screen_name','profile_image_url','name'], k); })
                });
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
        console.log('stremEnd', response.statusCode);
      });

    });

    r.end(); // counter-intuitively, this fires off the request.
    this.request = r;
  }
});





