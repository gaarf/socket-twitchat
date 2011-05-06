var source = process.env;
if(process.env['NODE_ENV'] != 'production') {
  source = JSON.parse(require('fs').readFileSync('etc/env.json'));
}

module.exports.getSecret = function(key) {
  return DATA[key];
};


var DATA = 
      { twitter:  { consumer_key:         source['TWITTER_CONSUMER_KEY']
                  , consumer_secret:      source['TWITTER_CONSUMER_SECRET']
                  , access_token:         source['TWITTER_ACCESS_TOKEN']
                  , access_token_secret:  source['TWITTER_ACCESS_TOKEN_SECRET']
                  }
      }
      ;