module.exports.listenToStream = listenToStream;

var SECRETS = require('../etc/secrets.js').twitter,
    OAuth = require('oauth').OAuth,
    oa = new OAuth(null, null, SECRETS.consumer_key, SECRETS.consumer_secret, "1.0A", null, "HMAC-SHA1");

function listenToStream() {
  var track = arguments.length && encodeURIComponent(arguments.join(',')),
      url = track ? "http://stream.twitter.com/1/statuses/filter.json?track="+track : "http://stream.twitter.com/1/statuses/sample.json",
      method = track ? 'post' : 'get',
      request = oa[method](url, SECRETS.access_token, SECRETS.access_token_secret),
      buffer = '';

  request.on('response', function (response) {

    response.setEncoding('utf8');

    response.on('data', function (chunk) {
      chunk.split("\r\n").forEach(function(line, i) {
        if(buffer && i>0) {
          try {
            var o = JSON.parse(buffer),
                s = o.user && o.user.screen_name;
            if(s) {
              console.log(o);
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
      if(response.statusCode==200) {
        listenToStream(); // reconnect
      }
    });

  });

  request.end(); // counter-intuitively, this fires off the request.
}
