const logger      = require('../../boot/logger');
const config      = require('../../config/config');
const marketSrv   = require('../services/market');
const userSrv     = require('../services/user');
const openstack_url_prefix  = require('../../config/config').openstack_url_prefix

const MAX_RADIUS = config.get_markets_max_radius;

/*
 *  Get market by id
 */
var getMarketById = function (req, res) {
  // Checking params (should be checked by router)
  if (!req.params.id) {
    return res.status(422).send({ error: 'bad_request' });
  }

  id = req.params.id.trim();
  const re = new RegExp(/^([-0-9a-z\.]{36})$/); // Should be id format
  testid = id.match(re);
  if (testid === null) { // Check regex
    return res.status(422).send({ error: 'bad_id_format'});
  }

  // Get marketpoint
  marketSrv.getMarketById( req.params.id, (err, market) => {
    if (err) {
      if (err === 'internal') {
        return res.status(500).send({ error: 'internal_error' });
      } else {
        return res.status(500).send({ error: 'unknown_error' });
      }
    }
    res.status(200).send( market );
  });
};

/*
 *  Get all markets in the area
 */
var getMarketPoints = function (req, res) {
  // Checking params (should be checked by router)
  if (!req.params.lat || !req.params.lon || !req.params.radius) {
    return res.status(422).send({ error: 'bad_request' });
  }

  // Check if lat lon are numbers
  const lat = parseFloat(req.params.lat);
  const lon = parseFloat(req.params.lon);
  const radius = parseFloat(req.params.radius);

  if( !lat || !lon || !radius ){
    return res.status(422).send({ error: 'bad_params' });
  }
  if (radius > MAX_RADIUS) { // Should not be too long
    return res.status(422).send({ error: 'too_long_radius', max: MAX_RADIUS });
  }

  // Get marketpoints near lat/lon
  marketSrv.getMarketPoints( lat, lon, radius, (err, markets) => {
    if (err) {
      if (err === 'internal') {
        return res.status(500).send({ error: 'internal_error' });
      } else {
        return res.status(500).send({ error: 'unknown_error' });
      }
    }
    res.status(200).send( markets );
  });
};


var importMarket = function (req, res) {
    market_creation_returns_id = 'true';
    createMarket(req, res);
};

/*
 *  Market creation
 */
/*
   id
   latitude required
   longitude required
   name     required
   picture  required
   hunter   id of user
*/
var createMarket = function (req, res) {
  //Checking if body is empty
  if (!req.body) {
    return res.status(422).send({ error: 'missformated_json' });
  }

  // Name checks
  if (!req.body.name) { // Required
    return res.status(422).send({ error: 'missing_name' });
  }
  if (typeof req.body.name !== 'string') { // Should be a string
    return res.status(422).send({ error: 'bad_name' });
  }
  const name = req.body.name.trim();
  if (name.length < 4) { // Should not be too short
    return res.status(422).send({ error: 'too_short_name', min: 4 });
  }
  if (name.length > 1024) { // Should not be too long
    return res.status(422).send({ error: 'too_long_name', max: 1024 });
  }
  // Location checks
  if ( !req.body.latitude ) { // Required
    return res.status(422).send({ error: 'missing_latitude' });
  }
  if ( !req.body.longitude ) { // Required
    return res.status(422).send({ error: 'missing_longitude' });
  }
  const lat = Number( req.body.latitude );
  const lon = Number( req.body.longitude );
  if ( typeof lat === 'NaN' ) {
    return res.status(422).send({ error: 'bad_latitude' });
  }
  if ( typeof lon === 'NaN' ) {
    return res.status(422).send({ error: 'bad_longitude' });
  }
  const loc = { lat: lat , lon: lon };

  // rating check
  if (req.body.rating)
  {
    // rating checks
    if (!req.body.rating) { // Required
      return res.status(422).send({ error: 'missing_rating' });
    }
    if (typeof req.body.rating !== 'number') { // Should be a number
      return res.status(422).send({ error: 'invalid_rating' });
    }
    rating = req.body.rating;
    if (rating != -1 && rating != 1) {
      return res.status(422).send({ error: 'invalid_rating'});
    }
  }
  if (req.body.comment)
  {
    if (typeof req.body.comment !== 'string') { // Should be a string
      return res.status(422).send({ error: 'bad_comment' });
    }
    var comment = req.body.comment.trim();
    if (comment.length < 4) { // Should not be too short
      return res.status(422).send({ error: 'too_short_comment', min: 1 });
    }
    if (comment.length > 1024) { // Should not be too long
      return res.status(422).send({ error: 'too_long_comment', max: 65536 });
    }
  }else{
    var comment = "";
  }
  // hunter user id
  const hunter = req.payload.id;

  // Check if username exists for this user
  userSrv.getUsername(hunter, (err, haveUsername) => {
    if(err) {
      return res.status(500).send({ error: 'internal_error' });
    }
    // Username exists
    else if(haveUsername) {
      // Picture checks
      if (!req.body.picture) { // Required
        return res.status(422).send({ error: 'missing_picture' });
      }
      if (typeof req.body.picture !== 'string') {
        return res.status(422).send({ error: 'bad_picture' });
      }
      // Rebuild url from picture_id
      const url = openstack_url_prefix + 'markets' + '/' + req.body.picture.trim();

      // Create market
      marketSrv.newMarket( loc, name, url, hunter, (err, id, product_id, mid) => {
        if (err) {
          if (err === 'internal') {
            return res.status(500).send({ error: 'internal_error' });
          } else {
            return res.status(500).send({ error: 'unknown_error' });
          }
        }
        if (req.body.rating)
        {
          marketSrv.addRating(id, hunter, rating, (err) => {
            if (err) {
              if (err === 'internal') {
                return res.status(500).send({ error: 'internal_error' });
              } else {
                return res.status(500).send({ error: 'unknown_error' });
              }
            }
            marketSrv.addRatingToProduct(id, hunter, rating, product_id, (err, meta) => {
              if (err) {
                if (err === 'internal') {
                  return res.status(500).send({ error: 'internal_error' });
                } else {
                  return res.status(500).send({ error: 'unknown_error' });
                }
              }
              return res.status(200).send({ success: 'market_with_rating_created', meta: meta });
            });
          });
        } else {
          if(mid != undefined) {
            return res.status(200).send({ success: 'market_created', id: mid });
          }
          else {
            return res.status(200).send({ success: 'market_created' });
          }
        }
      });
    }
    // No username
    else {
      return res.status(412).send({ success: 'no_username' });
    }
  });
};

/*
 *  Add rating
 */
var addRating = function (req, res) {
  //Checking if body is empty
  if (!req.body) {
    return res.status(422).send({ error: 'missformated_json' });
  }
  // market checks
  if (!req.params.id) { // Required
    return res.status(422).send({ error: 'missing_id' });
  }
  if (typeof req.params.id !== 'string') { // Should be a string
    return res.status(422).send({ error: 'bad_id' });
  }
  market = req.params.id.trim();
  const re = new RegExp(/^([-0-9a-z\.]{36})$/); // Should be id format
  test = market.match(re);
  if (test === null) { // Check regex
    return res.status(422).send({ error: 'bad_id_format'});
  }
  var comment="";
  if(req.body.comment) {
    // comment checks
    if (typeof req.body.comment !== 'string') { // Should be a string
      return res.status(422).send({ error: 'bad_comment' });
    }
    comment = req.body.comment.trim();
    if (comment.length < 4) { // Should not be too short
      return res.status(422).send({ error: 'too_short_comment', min: 1 });
    }
    if (comment.length > 1024) { // Should not be too long
      return res.status(422).send({ error: 'too_long_comment', max: 65536 });
    }
  }
  // rating checks
  if (!req.body.rating) { // Required
    return res.status(422).send({ error: 'missing_rating' });
  }
  if (typeof req.body.rating !== 'number') { // Should be a number
    return res.status(422).send({ error: 'invalid_rating' });
  }
  rating = req.body.rating;
  if (rating != -1 && rating != 1) {
    return res.status(422).send({ error: 'invalid_rating'});
  }

  // hunter user id
  const hunter = req.payload.id;

  marketSrv.addRating(market, hunter, rating, (err, meta) => {
    if (err) {
      if (err === 'internal') {
        return res.status(500).send({ error: 'internal_error' });
      } else  if(err == 'not_exists'){
          return res.status(404).send({ error: 'not_exists' });
      } else {
        return res.status(500).send({ error: 'unknown_error' });
      }
    }
    return res.status(200).send({ success: meta });
  });
};

/*
 *  Add rating by Product
 */
var addRatingToProduct = function (req, res) {
  //Checking if body is empty
  if (!req.body) {
    return res.status(422).send({ error: 'missformated_json' });
  }
  // market checks
  if (!req.params.id) { // Required
    return res.status(422).send({ error: 'missing_id' });
  }
  if (typeof req.params.id !== 'string') { // Should be a string
    return res.status(422).send({ error: 'bad_id' });
  }

  if (!req.params.productid) { // Required
    return res.status(422).send({ error: 'missing_id' });
  }
  if (typeof req.params.productid !== 'string') { // Should be a string
    return res.status(422).send({ error: 'bad_id' });
  }

  market = req.params.id.trim();
  const re = new RegExp(/^([-0-9a-z\.]{36})$/); // Should be id format
  test = market.match(re);
  if (test === null) { // Check regex
    return res.status(422).send({ error: 'bad_id_format' });
  }

  product = req.params.productid.trim();
  const re2 = new RegExp(/^([-0-9a-z\.]{36})$/); // Should be id format
  test2 = market.match(re2);
  if (test2 === null) { // Check regex
    return res.status(422).send({ error: 'bad_product_id_format' });
  }

  var comment = "";
  if (req.body.comment) {
    // comment checks
    if (typeof req.body.comment !== 'string') { // Should be a string
      return res.status(422).send({ error: 'bad_comment' });
    }
    comment = req.body.comment.trim();
    if (comment.length < 4) { // Should not be too short
      return res.status(422).send({ error: 'too_short_comment', min: 1 });
    }
    if (comment.length > 1024) { // Should not be too long
      return res.status(422).send({ error: 'too_long_comment', max: 65536 });
    }
  }
  // rating checks
  if (!req.body.rating) { // Required
    return res.status(422).send({ error: 'missing_rating' });
  }
  if (typeof req.body.rating !== 'number') { // Should be a number
    return res.status(422).send({ error: 'invalid_rating' });
  }
  rating = req.body.rating;
  if (rating != -1 && rating != 1) {
    return res.status(422).send({ error: 'invalid_rating' });
  }

  // hunter user id
  const hunter = req.payload.id;

  marketSrv.addRatingToProduct(market, hunter, rating, product, (err, meta) => {
    if (err) {
      if (err === 'internal') {
        return res.status(500).send({ error: 'internal_error' });
      } else if (err == 'not_exists') {
        return res.status(404).send({ error: 'not_exists' });
      } else {
        return res.status(500).send({ error: 'unknown_error' });
      }
    }
    return res.status(200).send(meta);
  });
};

/*
 *  Moderate marketpoint
 */
var moderateMarket = function (req, res) {
  // Checking params (should be checked by router)
  if (!req.params.action || !req.params.id) {
    return res.status(422).send({ error: 'missing_parameters' });
  }

  action = req.params.action.trim();
  if( action != 'whitelist' && action != 'blacklist' ){
    return res.status(422).send({ error: 'bad_action' });
  }
  id = req.params.id.trim();
  const re = new RegExp(/^([-0-9a-z\.]{36})$/); // Should be id format
  test = id.match(re);
  if (test === null) { // Check regex
    return res.status(422).send({ error: 'bad_id_format'});
  }

  // Get marketpoints near lat/lon
  marketSrv.moderate(id, action, (err) => {
    if (err) {
      if (err === 'internal') {
        return res.status(500).send({ error: 'internal_error' });
      } else if(err === 'not_exists') {
        return res.status(404).send({ error: 'not_exists' });
      } else {
        return res.status(500).send({ error: 'unknown_error' });
      }
    }
    logger.log("Marketpoint "+id+" has been "+action+"ed")
    res.status(200).send({ success: 'market_moderated' });
  });
};

var getColoredMarketPoints = function (req, res) {
  // Checking params (should be checked by router)
  if (!req.params.max) {
    return res.status(422).send({ error: 'bad_request' });
  }

  // Check if max is a number
  const max = parseFloat(req.params.max);
  if( !max ){
    return res.status(422).send({ error: 'bad_params' });
  }

  // Check color
  const correct_colors = {
    'blacklisted': 'blacklisted',
    'greylisted':  'unreviewed',
    'whitelisted': 'whitelisted'
  };
  if( !req.params.color || !correct_colors[req.params.color] ) {
    return res.status(422).send({ error: 'bad_params' });
  }
  const color = correct_colors[req.params.color];

  // Get colored marketpoints
  marketSrv.getColoredMarkets( color, max, (err, markets) => {
    if (err) {
      if (err === 'internal') {
        return res.status(500).send({ error: 'internal_error' });
      } else {
        return res.status(500).send({ error: 'unknown_error' });
      }
    }
    res.status(200).send(markets);
  });
};

module.exports = {
  addRatingToProduct: addRatingToProduct,
  moderateMarket:         moderateMarket,
  importMarket:           importMarket,
  createMarket:           createMarket,
  getMarketPoints:        getMarketPoints,
  getMarketById:          getMarketById,
  addRating:              addRating,
  getColoredMarketPoints: getColoredMarketPoints,
  moderateMarket:         moderateMarket
}
  
