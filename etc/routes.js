module.exports.setRoutes = function(app, BASE_VIEW_OPTIONS) {

  var _ = require('underscore');

  _.extend(BASE_VIEW_OPTIONS,
    { status: null
    , scripts: []
  });

  app.get('/', function(req, res){
    res.render(
      'index'
    , _.defaults(
        { scripts:
          [ 'libs/jqdnr.js'
          , 'client.js'
          , '/socket.io/socket.io.js'
          ]
        }
      , BASE_VIEW_OPTIONS
      )
    );
  });

  app.get('/help', function(req, res){
    res.render(
      'help'
    , _.defaults( 
        { jquery: false }
      , BASE_VIEW_OPTIONS
      )
    );
  });

  // Custom 404
  app.use(function(req, res) {
    res.render(
      '404'
    , _.defaults(
        { status: 404
        , jquery: false
        }
      , BASE_VIEW_OPTIONS
      )
    );
  });

  return app;
}

