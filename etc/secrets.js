module.exports.getSecret = function(key) {
  return SECRETS[key];
};

var SECRETS = 
      { twitter:  { consumer_key: TWITTER_CONSUMER_KEY
                  , consumer_secret: TWITTER_CONSUMER_SECRET
                  // , access_token: ''
                  // , access_token_secret: ''
                  }
      }
      ;