const METRICS_IS_ENABLED = process.env.METRICS_ENABLE || 'false'
const logger = require('../../boot/logger');
const warp = require('../../boot/warpmodule');
const config = require('../../config/config');

const client = new warp.Warp10Client('https://'+config.metrics.endpoint+'/api/v0/update', config.metrics.write_token);

module.exports = {

  send: function (gts_name, labels, ts, lat, lon, val, next) {

    // Build the GTS and add the point
    if( typeof labels === 'undefined' || !labels ) {
      labels = new Map();
    }
    if( typeof ts === 'undefined' || !ts ) {
      // Actual time stamp in micro second (ms * 1000)
      ts = Date.now() *1000;
    }
    // Set geo to 0 if undefined
    if( typeof lat === 'undefined' || !lat ) {
      lat = 0;
    }
    if( typeof lon === 'undefined' || !lon ) {
      lon = 0;
    }
    var gts = new warp.GTS(gts_name, labels);
    gts.datapoints.push(new warp.DataPoint( ts, val, lat, lon, 0 ));

    // Do not send bad points in dev mode
    if( METRICS_IS_ENABLED === 'false' ) {
      logger.debug('DEV MODE: Metric not sent: '+gts.toSensisionFormat());
      return next(null);
    }

    // Send the GTS to Warp10 platform
    client.send(gts)
    .then(() => {
        // If everything is fine
        next(null);
    })
    .catch( err => {
        logger.error('Failed to push on warp10 server: '+err);
        next(err);
    }); // if something is wrong
  }

};
