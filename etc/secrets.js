module.exports.getSecret = function(key) {
  return SECRETS[key];
};

var s = process.env;
if(NODE_ENV != 'production') {
  s = JSON.parse(require('fs').readFileSync('./env.json'));
}

var SECRETS = 
      { twitter:  { consumer_key: s['TWITTER_CONSUMER_KEY']
                  , consumer_secret: s['TWITTER_CONSUMER_SECRET']
                  , access_token: s['TWITTER_ACCESS_TOKEN']
                  , access_token_secret: s['TWITTER_ACCESS_TOKEN_SECRET']
                  }
      }
      ;