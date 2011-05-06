module.exports.listenToStream = function(query) {
  // body...
}

var SECRETS = require('../etc/secrets.js').twitter,
    OAuth = require('oauth').OAuth,
    oa = new OAuth(null, null, SECRETS.consumer_key, SECRETS.consumer_secret, "1.0A", null, "HMAC-SHA1"),
    start, request, counter;

listenToStream();

function now() {
  return (new Date).getTime();
}

function logSinceStart() {
  var ms = now()-start;
  console.log("\n===",Math.round(counter/(ms/1000))+' tweets per second ('+counter+'/'+ms+'ms)');
}

function listenToStream() {
  counter = 0, start = now();

  var buffer = '', search = [];
  for (var i=2; i < process.argv.length; i++) {
    search.push(process.argv[i]);
  };

  var track = search.length && encodeURIComponent(search.join(',')),
      url = track ? "http://stream.twitter.com/1/statuses/filter.json?track="+track : "http://stream.twitter.com/1/statuses/sample.json",
      method = track ? 'post' : 'get';

  console.info("...", url);

  request = oa[method](url, SECRETS.access_token, SECRETS.access_token_secret);
  request.on('response', function (response) {
    // console.log("*** RESPONSE", response.statusCode);
    response.setEncoding('utf8');
    response.on('data', function (chunk) {
      chunk.split("\r\n").forEach(function(line, i) {
        if(buffer && i>0) {
          try {
            var o = JSON.parse(buffer),
                s = o.user && o.user.screen_name;
            if(s) {
              counter++;
              var n = o.user.name;
              console.log("\n@"+s+(n&&n.toLowerCase()!=s.toLowerCase()?" / "+n:""));
              console.log(o.text.replace(/\s/g, ' '));
            }
            buffer = '';
          } catch(e) { 
            console.error('ERROR:',e);
          }
        }
        buffer += line;
      });
    });
    response.on('end', function () {
      // console.log('*** END', response.statusCode, buffer);
      logSinceStart();
      if(response.statusCode==200) {
        listenToStream(); // reconnect
      }
      else {
        process.exit();
      }
    });
  });
  request.end();
}
