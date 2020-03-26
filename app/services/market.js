const config = require('../../config/config'),
      logger = require('../../boot/logger'),
      db = require('../../boot/db'),
      metrics = require('../services/metrics'),
      uuidv4 = require('uuid/v4'),
      async = require('async'),
      userSrv = require('../services/user');

const self = {
  getMarketById: function(id, cb) {
    // Query
    const query = 'SELECT ST_AsText(mk.location) as location, mk.id, mk.name, mk.hunter, mk.picture, mk.status, mk.upvotes, mk.downvotes, ra.rating, ra.rater, ra.status as rastatus, us.mail, us.username, us.avatar, us.role, us.active FROM marketpoint AS mk LEFT JOIN rating AS ra ON ra.marketpoint = $1 LEFT JOIN users AS us ON us.id = mk.hunter WHERE mk.id = $1';
    const values = [id];
    // Requests db
    db.query(query, values, (err, data) => {
      if(err) {
        logger.error(err)
        return cb('internal')
      }
      if(data.rows.length == 0)
      {
        return cb(null, {})
      }
      // Regex to catch location in POINT(X Y)
      const re = new RegExp(/^POINT\((-?[0-9\.]+) (-?[0-9\.]+)\)$/);

      // Init markets
      market = {};
      loc_parts = data.rows[0].location.match( re );
      if ( loc_parts === null ) { return cb('internal') }
      market.latitude = parseFloat(loc_parts[1]);
      market.longitude = parseFloat(loc_parts[2]);
      market.id = data.rows[0].id;
      market.name = data.rows[0].name;
      market.status = data.rows[0].status;
      // return hunter info
      market.hunter = {}
      market.hunter.id = data.rows[0].hunter;
      if (typeof data.rows[0].avatar !== 'undefined' && data.rows[0].avatar) {
        market.hunter.avatar = data.rows[0].avatar;
      }
      market.hunter.role = data.rows[0].role;
      market.hunter.active = data.rows[0].active;
      if (typeof data.rows[0].picture !== 'undefined' && data.rows[0].picture) {
        market.picture = data.rows[0].picture;
      }
      market.ratings = [];
      for(i = 0; i < data.rows.length; i++){
        if (data.rows[i].rating !== null)
        {
          market.ratings.push({
            'rating': data.rows[i].rating,
            'status': data.rows[i].rastatus,
            'rater': data.rows[i].rater
          });
        }
      }
      userSrv.decryptMail(data.rows[0].mail, mail => {
        if (typeof data.rows[0].username !== 'undefined' && data.rows[0].username)
        {
          userSrv.decryptUsername(data.rows[0].username, username => {
            market.hunter.mail = mail;
            market.hunter.username = username;
            return cb(null, market);
          });
        }else{
          market.hunter.mail = mail;
          return cb(null, market);
        }
      });
    });
  },
  getMarketPoints: function(lat, lon, radius, cb) {
    const base_query = `SELECT ST_AsText(mk.location) AS location, mk.id,  mk.name, mk.hunter, mk.picture, mk.upvotes, mk.downvotes, mk.status, us.username, us.avatar, json_agg(json_build_object('name',pr.name,'upvotes',pr.upvotes,'downvotes',pr.downvotes,'id',pr.id)) AS products FROM marketpoint AS mk LEFT JOIN product AS pr ON pr.marketpoint=mk.id LEFT JOIN users AS us ON us.id = mk.hunter WHERE ST_DWithin(location, ST_GeogFromText( $1 ), $2) `

    const flower_query      = base_query+' AND mk.status <> \'blacklisted\'';
    const armageddon_query  = base_query+' AND mk.status = \'whitelisted\'';
    // Set the correct query
    var query = flower_query
    if(config.moderation.level == "armageddon"){
      var query = armageddon_query
    }
    query=query+'GROUP BY mk.id,us.id;'
    const values = ['POINT('+lat+' '+lon+')', radius];

    // Requests db
    db.query(query, values, (err, data) => {
      if(err) {
        logger.error(err)
        return cb('internal')
      }
      if(data.rows.length == 0)
      {
        return cb(null, {})
      }
      // Regex to catch location in POINT(X Y)
      const re = new RegExp(/^POINT\((-?[0-9\.]+) (-?[0-9\.]+)\)$/);

      // Init markets
      markets = [];
      async.forEachOf(data.rows, (item, i, callback) => {

        // location parsing
        const re = new RegExp(/^POINT\((-?[0-9\.]+) (-?[0-9\.]+)\)$/);
        loc_parts = item.location.match( re );
        if ( loc_parts === null ) { return cb('internal') }
        item.latitude = parseFloat(loc_parts[1]);
        item.longitude = parseFloat(loc_parts[2]);

        // rating
        item.raters = item.upvotes+item.downvotes;
        item.rating = (item.upvotes/(item.upvotes+item.downvotes))*100
        if((item.upvotes+item.downvotes) == 0 ) {
          item.rating = -1;
        }

        // save legacy fields
        user_id=item.hunter
        username = item.username
        avatar = item.avatar

        // delete legacy fields
        delete item.location
        delete item.username
        delete item.hunter
        delete item.avatar

        item.hunter={}
        item.hunter.id = user_id
        item.hunter.avatar=avatar
        if (item.products[0].id ==null) {
          item.products={}
        }
        products = item.products;
        delete item.products;
        item.products={};
        products.forEach(function(product) {
          
          product.raters = product.upvotes+product.downvotes;
          product.rating = (product.upvotes/(product.upvotes+product.downvotes))*100

          if((product.upvotes+product.downvotes) == 0 ) {
            product.rating = -1;
          }
          item.products[product.name]=product;
        });
        if (typeof username !== 'undefined' && username) {
          userSrv.decryptUsername(username, username => {
            item.hunter.username = username;
            callback();
          });
        }
        else {
          // Call the callback is require to prevent hang
          callback();
        }
      }, err => {
        if (err)  {
          logger.error(err)
          return cb('internal')
        }
        return cb(null, data.rows);
      });
    });
  },
  getColoredMarkets: function(color, max, cb) {
    // Query
    const query = 'SELECT ST_AsText(mk.location) as location, mk.id, mk.name, mk.hunter, mk.picture, mk.status, mk.upvotes, mk.downvotes, us.mail, us.username, us.avatar, us.role, us.active FROM marketpoint AS mk LEFT JOIN users AS us ON us.id = mk.hunter WHERE mk.status = $1 ORDER BY mk.update_ts DESC LIMIT $2;';
    const values = [ color, max ];
    // Requests db
    db.query(query, values, (err, data) => {
      if(err) {
        logger.error(err)
        return cb('internal')
      }
      if(data.rows.length == 0)
      {
        return cb(null, {})
      }
      // Regex to catch location in POINT(X Y)
      const re = new RegExp(/^POINT\((-?[0-9\.]+) (-?[0-9\.]+)\)$/);

      // Init markets
      markets = [];
      async.forEachOf(data.rows, (item, i, callback) => {
        markets[i] = {};
        loc_parts = item.location.match( re );
        if ( loc_parts === null ) { return cb('internal') }
        markets[i].latitude = parseFloat(loc_parts[1]);
        markets[i].longitude = parseFloat(loc_parts[2]);
        markets[i].id = item.id;
        markets[i].name = item.name;
        // return hunter info
        markets[i].hunter = {}
        markets[i].hunter.id = item.hunter;
        if (typeof item.avatar !== 'undefined' && item.avatar) {
          markets[i].hunter.avatar = item.avatar;
        }
        markets[i].raters = item.upvotes+item.downvotes;
        markets[i].rating = (item.upvotes/(item.upvotes+item.downvotes))*100
        if((item.upvotes+item.downvotes) == 0 ) {
          markets[i].rating = -1;
        }
        if (typeof item.picture !== 'undefined' && item.picture) {
          markets[i].picture = item.picture;
        }
        userSrv.decryptMail(item.mail, mail => {
          markets[i].hunter.mail = mail;
          if (typeof item.username !== 'undefined' && item.username) {
            userSrv.decryptUsername(item.username, username => {
              markets[i].hunter.username = username;
              callback();
            });
          }
          else{
            callback();
          }
        });
      }, err => {
        if (err)  {
          logger.error(err)
          return cb('internal')
        }
        return cb(null, markets);
      });
    });
  },
  addProducts: function(market_id, cb) {
    // Build query
    const id = uuidv4();

    const query = 'INSERT INTO product (id, name, marketpoint) VALUES($2, \'baguette\', $1),(uuid_generate_v4(), \'croissant\', $1),(uuid_generate_v4(), \'pain_choco\', $1),(uuid_generate_v4(), \'brioche\', $1),(uuid_generate_v4(), \'sandwich\', $1),(uuid_generate_v4(), \'pain_bio\', $1)';
    const values = [market_id, id];

    // Requests db
    db.query(query, values, (err, res) => {
      if (err) {
        logger.error('Error while creating products', err);
        return cb('internal')
      }
      return cb(null,id);
    });
  },
  newMarket: function(loc, name, picture, hunter, cb) {
    // Build query
    const id = uuidv4();
    const query = 'INSERT INTO marketpoint (id, location, name, picture, hunter, status) VALUES($1, $2, $3, $4, $5, $6)';
    const values = [id,'POINT('+loc.lat+' '+loc.lon+')', name, picture, hunter, 'unreviewed'];

    // Requests db
    db.query(query, values, (err, res) => {
      if (err) {
        logger.error('Error while creating marketpoint', err);
        return cb('internal')
      }
      self.addProducts(id, (err, product_id) => {
        if (err) {
          return cb(err)
        }
        userSrv.updateLastActivity(hunter, (err) => {
          if (err) {
            return cb(err)
          }
          metrics.send( 'business.market.creation', null, null, loc.lat, loc.lon, 1, function(err) {});
          return cb(null, id, product_id, id);
        });
      });
    });
  },
  addRating: function(market, hunter, rating, cb) {
      newRating=false
      async.waterfall([
        _insertRating,
        _getRating,
        _updateRating,
        _updateMarket,
        _getNewRatingMeta
      ], function (error, updated, rating_meta) {
          if (error) {
            logger.error("Error while addin rating : "+error)
            return cb(error, 'internal');
          }
          rating = (rating_meta.upvotes/(rating_meta.upvotes+rating_meta.downvotes))*100
          raters = rating_meta.upvotes+rating_meta.downvotes
          return cb(null, { "raters": raters, "rating": rating});
      });

      function _insertRating(callback){
        // Build query
        const query = 'INSERT INTO rating (id, rating, rater, marketpoint, status, product) VALUES(uuid_generate_v4(), $1, $2, $3, $4, \'00000000-0000-0000-0000-000000000000\');';
        const values = [rating, hunter, market, 'unreviewed'];
        // Requests db
        db.query(query, values, (err) => {
          if(err) {
            if (err.code == '23505') {
              return callback(null, true);
            }else if (err){
              return callback(err, false, {});
            }
          }else{
            return callback(null, false);
          }
        });
      }
      function _getRating(need_update, callback){
        if(need_update){
          const query = 'SELECT rating FROM rating WHERE rater=$1 and marketpoint=$2';
          const values = [hunter, market];
          db.query(query, values, (err, data) => {
            if(err){
              return callback(err, false, {});
            }
            if(data.rows[0].rating == rating){
              return callback(null, false);
            }
            if(data.rows[0].rating != rating){
              return callback(null, true);
            }
            return callback(null, false);
          });
        }else{
          newRating=true
          return callback(null, false);
        }

      }
      function _updateRating(need_update, callback){
        if(need_update){
          const query = 'UPDATE rating SET rating=$1 WHERE rater=$2 AND marketpoint=$3;';
          const values = [rating, hunter, market];
          db.query(query, values, (err) => {
            if(err){
              return callback(err, false, {});
            }else{
              return callback(null, true);
            }
          });
        }else{
          return callback(null, false);
        }
      }
      function _updateMarket(need_update, callback){
        if(need_update){
          if(rating == 1) {
            const query = 'UPDATE marketpoint SET upvotes=upvotes+1, downvotes=downvotes-1 WHERE id=$1';
            const values = [ market ];
            db.query(query, values, (err) => {
              if(err) {
                return callback(err, false, {});
              }
              return callback(null, true);
            });
          }else{
            const query = 'UPDATE marketpoint SET upvotes=upvotes-1, downvotes=downvotes+1 WHERE id=$1';
            const values = [ market ];
            db.query(query, values, (err) => {
              if(err) {
                return callback(err, false, {});
              }
              return callback(null, true);
            });
          }
        }else if(newRating){
          if(rating == 1) {
            const query = 'UPDATE marketpoint SET upvotes=upvotes+1 WHERE id=$1';
            const values = [ market ];
            db.query(query, values, (err) => {
              if(err) {
                return callback(err, false, {});
              }
              return callback(null, true);
            });
          }else{
            const query = 'UPDATE marketpoint SET downvotes=downvotes+1 WHERE id=$1';
            const values = [ market ];
            db.query(query, values, (err) => {
              if(err) {
                return callback(err, false, {});
              }
              return callback(null, true);
            });
          }
        }else{
          return callback(null, false);
        }
      }
      function _getNewRatingMeta(updated, callback){
        const query = 'SELECT upvotes, downvotes FROM marketpoint WHERE id=$1';
        const values = [ market ];
        db.query(query, values, (err, data) => {
          if(err) {
            return callback(err, false, {});
          }
          return callback(null, updated, data.rows[0]);
        });
      }
  },
  addRatingToProduct: function (market, hunter, rating, product, cb) {
    newRating = false
    async.waterfall([
      _updateUserLastActivity,
      _insertRating,
      _getRating,
      _updateRating,
      _updateMarket,
      _getNewRatingMeta,
    ], function (error, updated, rating_meta) {
      if (error) {
        logger.error("Error while adding rating : " + error)
        return cb(error, 'internal');
      }
      rating = (rating_meta.upvotes / (rating_meta.upvotes + rating_meta.downvotes)) * 100
      raters = rating_meta.upvotes + rating_meta.downvotes
      return cb(null, { "raters": raters, "rating": rating, "product_id": product });
    });
    function _updateUserLastActivity(callback){
      userSrv.updateLastActivity(hunter, (err) => {
        if(err){
          logger.error(err)
          return callback(err, false, {})
        }
        return callback(null)
      });
    }
    function _insertRating(callback) {
      // Build query
      const query = 'INSERT INTO rating (id, rating, rater, marketpoint, status, product) VALUES(uuid_generate_v4(), $1, $2, $3, $4, $5);';
      const values = [rating, hunter, market, 'unreviewed', product];
      // Requests db
      db.query(query, values, (err) => {
        if (err) {
          if (err.code == '23505') {
            return callback(null, true);
          } else if (err) {
            return callback(err, false, {});
          }
        } else {
          return callback(null, false);
        }
      });
    }
    function _getRating(need_update, callback) {
      if (need_update) {
        const query = 'SELECT rating FROM rating WHERE rater=$1 AND marketpoint=$2 AND product=$3';
        const values = [hunter, market, product];
        db.query(query, values, (err, data) => {
          if (err) {
            return callback(err, false, {});
          }
          if (data.rows[0].rating == rating) {
            return callback(null, false);
          }
          if (data.rows[0].rating != rating) {
            return callback(null, true);
          }
          return callback(null, false);
        });
      } else {
        newRating = true
        return callback(null, false);
      }

    }
    function _updateRating(need_update, callback) {
      if (need_update) {
        const query = 'UPDATE rating SET rating=$1 WHERE rater=$2 AND marketpoint=$3 AND product=$4;';
        const values = [rating, hunter, market, product];
        db.query(query, values, (err) => {
          if (err) {
            return callback(err, false, {});
          } else {
            return callback(null, true);
          }
        });
      } else {
        return callback(null, false);
      }
    }
    function _updateMarket(need_update, callback) {
      if (need_update) {
        if (rating == 1) {
          const query = 'UPDATE product SET upvotes=upvotes+1, downvotes=downvotes-1 WHERE id=$1';
          const values = [product];
          db.query(query, values, (err) => {
            if (err) {
              return callback(err, false, {});
            }
            return callback(null, true);
          });
        } else {
          const query = 'UPDATE product SET upvotes=upvotes-1, downvotes=downvotes+1 WHERE id=$1';
          const values = [product];
          db.query(query, values, (err) => {
            if (err) {
              return callback(err, false, {});
            }
            return callback(null, true);
          });
        }
      } else if (newRating) {
        if (rating == 1) {
          const query = 'UPDATE product SET upvotes=upvotes+1 WHERE id=$1';
          const values = [product];
          db.query(query, values, (err) => {
            if (err) {
              return callback(err, false, {});
            }
            return callback(null, true);
          });
        } else {
          const query = 'UPDATE marketpoint SET downvotes=downvotes+1 WHERE id=$1';
          const values = [product];
          db.query(query, values, (err) => {
            if (err) {
              return callback(err, false, {});
            }
            return callback(null, true);
          });
        }
      } else {
        return callback(null, false);
      }
    }
    function _getNewRatingMeta(updated, callback) {
      const query = 'SELECT upvotes, downvotes FROM product WHERE id=$1';
      const values = [product];
      db.query(query, values, (err, data) => {
        if (err) {
          return callback(err, false, {});
        }
        return callback(null, updated, data.rows[0]);
      });
    }
  },
  moderate: function (market, action, cb) {
    // Build query
    status = action+"ed"
    const query = 'UPDATE marketpoint SET status=$1 WHERE id=$2;';
    const values = [status, id];
    // Requests db
    db.query(query, values, (err, res) => {
      if(err) {
        logger.error('fail to moderate market', err)
        return cb('internal')
      } else if(res.rowCount == 0) {
        return cb('not_exists')
      }else{
        return cb(null);
      }
    });
  }


};

module.exports = self;
