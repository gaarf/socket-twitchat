module.exports.getSecret = function(key) {
  return SECRETS[key];
};

var SECRETS = 
      { twitter:  { consumer_key: TWITTER_CONSUMER_KEY
                  , consumer_secret: TWITTER_CONSUMER_SECRET
                  , access_token: TWITTER_ACCESS_TOKEN
                  , access_token_secret: TWITTER_ACCESS_TOKEN_SECRET
                  }
      }
      ;