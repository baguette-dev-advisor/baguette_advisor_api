const logger = require('../../boot/logger');
const metrics = require('../services/metrics');

const NS_PER_SEC = 1e9;

const prefix_exec_time = 'perf.route.exec-time.';
const prefix_http_code = 'perf.route.http-code.';
let get_route_names = {

  // Public
  '/':                  'index',
  '/auth/signin':       'auth-signin',
  '/auth/refresh':      'auth-refresh',
  '/auth/signup':       'auth-signup',
  '/recover':           'recover',
  '/recover/checkmail': 'recover-checkmail',
  '/recover/:token':    'recover-_token',

  // Private
  '/user':                      'user',
  '/user/delete/:token':  'user-delete-_token',
  '/picture/:type':             'picture-_type',
  '/markets/:lat/:lon/:radius': 'markets-_lat-_lon-_radius',
  '/market':                    'market',
  '/market/:id/rating':         'market-_id-rating',
  '/market/:id/rating/:productid':         'market-_id-rating-_productid',

  // Administration
  '/markets/:color/:max':       'markets-_color-_max',
  '/market/:id/:action':        'market-_id-_action',
  '/market/:id':                'market-_id',
  '/picture/:type/:id':         'picture-_type-_id',
  '/import/market':             'import-market',

};

// Send metrics after response
module.exports = function (req, res, next) {

  // Mesure hrtime at start
  const start = process.hrtime();

  // Called at the end (after response to client)
  res.on('finish', function() {

    // Actual time stamp in micro second (ms * 1000)
    const ts = Date.now() *1000;

    // Execution time in ns (diff with start)
    const diff = process.hrtime(start);
    const executionTime = (diff[0] * NS_PER_SEC + diff[1]) / 1000;

    // Push points in Metrics
    let gts = get_route_names[req.route.path];
    if( typeof( gts ) !== 'undefined' ) {
      metrics.send( prefix_exec_time + req.method + '.' + gts, null, ts, null, null, executionTime, function(err) {});
      metrics.send( prefix_http_code + req.method + '.' + gts, null, ts, null, null, res.statusCode, function(err) {});
    }
    else {
      logger.error('Failed to find metrics name from url path: ' + req.method + '.' + req.route.path);
    }

  });

  return next();
};
