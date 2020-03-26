const streamifier = require('streamifier');
const package     = require('../../package');
const logger      = require('../../boot/logger');
const userSrv        = require('../services/user');
const tokenSrv = require('../services/token');
const openstack_url_prefix  = require('../../config/config').openstack_url_prefix
const randtoken = require('rand-token');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');

/*
 *  GET /api/user
 */
var showUser = function(req, res) {
  userSrv.getUserInfos(req.payload.id, (err, user) => {
    if (err) {
      if (err === 'internal') {
        return res.status(500).send({ error: 'internal' });
      }
      if (err === 'not_found') {
        return res.status(404).send({ error: 'not_found' });
      }
    }
    // Return what defined values about user
    var userinfos = {};
    if( typeof user.username != 'undefined' && user.username != null ) { userinfos.username = user.username };
    if( typeof user.mail != 'undefined' && user.mail != null ) { userinfos.mail = user.mail };
    if( typeof user.avatar != 'undefined' && user.avatar != null ) { userinfos.avatar = user.avatar };
    return res.status(200).send(userinfos);
  });
}

var createUser = function (req, res) {
  var mail = undefined;
  var username = undefined;
  var password = undefined;
  var avatar = undefined;

  //Checking if body is empty
  if (!req.body) {
    return res.status(422).send({ error: 'missformated_json' });
  }

  // Mail checks
  if (!req.body.mail) { // Required
    return res.status(422).send({ error: 'missing_email' });
  }
  if (typeof req.body.mail !== 'string') { // Should be a string
    return res.status(422).send({ error: 'bad_email' });
  }
  mail = req.body.mail.trim();
  if (mail.length < 1) { // Should not be empty
    return res.status(422).send({ error: 'too_short_email', min: 1 });
  }
  if (mail.length > 1024) { // Should not too long
    return res.status(422).send({ error: 'too_long_email', max: 1024 });
  }
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!re.test(mail)) { // Check mail format
    return res.status(422).send({ error: 'bad_email' });
  }
  // Mail is ready
  // Username checks
  if (typeof req.body.username != 'undefined' && req.body.username) { // Username will be added
    if (typeof req.body.username !== 'string') { // Should be a string
      return res.status(422).send({ error: 'bad_username' });
    }
    username = req.body.username.trim();
    if (username.length < 1) { // Should not be empty
      return res.status(422).send({ error: 'too_short_username', min: 1 });
    }
    if (username.length > 1024) { // Should not too long
      return res.status(422).send({ error: 'too_long_username', max: 1024 });
    }
  }
  // Password check
  if (!req.body.password) { // Required
    return res.status(422).send({ error: 'missing_password' });
  }
  if (typeof req.body.password !== 'string') { // Should be a string
    return res.status(422).send({ error: 'bad_password' });
  }
  password = req.body.password.trim();
  if (password.length < 8) { // Should not be too short
    return res.status(422).send({ error: 'too_short_password', min: 8 });
  }
  if (password.length > 1024) { // Should not be too long
    return res.status(422).send({ error: 'too_long_password', max: 1024 });
  }
  userSrv.newUser(mail, username, password, (err) => {
    if (err) {
      if (err === 'internal') {
        return res.status(500).send({ error: 'internal_error' });
      } else if (err === 'duplicated') {
        return res.status(422).send({ error: 'duplicated_email' });
      } else if (err === 'notification_error') {
        return res.status(500).send({ error: 'notification_failed' });
      } else {
        return res.status(500).send({ error: 'unknown_error' });
      }
    }

    res.status(200).send({ success: 'user_created' });
  });
};
/**
 *  PATCH /user
 */
var patchUser = function(req, res){
  //Checking if body is empty
  if (!req.body) {
    return res.status(422).send({ error: 'missformated_json' });
  }
  var mail = undefined;
  var username = undefined;
  var password = undefined;
  var avatar = undefined;
  // Mail checks
  if (typeof req.body.mail != 'undefined' && req.body.mail) { // Mail will be updated
    if (typeof req.body.mail !== 'string') { // Should be a string
      return res.status(422).send({ error: 'bad_email' });
    }
    mail = req.body.mail.trim();
    if (mail.length < 1) { // Should not be empty
      return res.status(422).send({ error: 'too_short_email', min: 1 });
    }
    if (mail.length > 1024) { // Should not too long
      return res.status(422).send({ error: 'too_long_email', max: 1024 });
    }
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!re.test(mail)) { // Check mail format
      return res.status(422).send({ error: 'bad_email' });
    }
  }
  // Username checks
  if (typeof req.body.username != 'undefined' && req.body.username) { // Username will be updated
    if (typeof req.body.username !== 'string') { // Should be a string
      return res.status(422).send({ error: 'bad_username' });
    }
    username = req.body.username.trim();
    if (username.length < 1) { // Should not be empty
      return res.status(422).send({ error: 'too_short_username', min: 1 });
    }
    if (username.length > 1024) { // Should not too long
      return res.status(422).send({ error: 'too_long_username', max: 1024 });
    }
  }
  // Password checks
  if (typeof req.body.password != 'undefined' && req.body.password) { // Password will be updated
    if (typeof req.body.password !== 'string') { // Should be a string
      return res.status(422).send({ error: 'bad_password' });
    }
    password = req.body.password.trim();
    if (password.length < 8) { // Should not be empty
      return res.status(422).send({ error: 'too_short_password', min: 8 });
    }
    if (password.length > 1024) { // Should not too long
      return res.status(422).send({ error: 'too_long_password', max: 1024 });
    }
  }
  // Avatar checks
  if( req.body.avatar ) {
    if (typeof req.body.avatar !== 'string') {
      return res.status(422).send({ error: 'bad_avatar' });
    }
    // Rebuild url from picture_id
    avatar = openstack_url_prefix + 'markets' + '/' + req.body.avatar.trim();
  }

  // Update users infos
  userSrv.updateUser(req.payload.id, mail, username, password, avatar, (err) => {
    if (err) {
      if (err === 'internal') {
        return res.status(500).send({ error: 'internal_error' });
      } else if (err === 'duplicated') {
        return res.status(422).send({ error: 'username_or_email_not_available' });
      } else {
        return res.status(500).send({ error: 'unknown_error' });
      }
    }
    res.status(200).send({ success: 'user_updated' });
  });
}
/*
 *  POST /api/user
 */
/*
var postUser = function(req, res) {
  if( typeof( req.body.file !== 'undefined' ) && req.body.file ) {
    var writeStream = openstack.upload({
      container: users_container,
      remote: 'user_'+req.body.username
    });
    writeStream.on('error', function(err) {
      logger.error("User : upload failed : "+err);
      res.status(500).send("Internal error")
    });
    writeStream.on('success', function(storage_obj) {
      logger.log('User : profile picture uploaded');
      createUser( req, res, {
        url:          openstack_url_prefix + storage_obj.container + "/" + storage_obj.name,
        size:         storage_obj.size,
        contentType:  storage_obj.contentType,
        lastModified: storage_obj.lastModified,
      });
    })
    streamifier.createReadStream(req.body.file).pipe(writeStream);
  }
  else {
    logger.log('User : use default profile picture');
    createUser( req, res, {
      url:          "default",
      size:         0,
      contentType:  Date(),
      lastModified: Date(),
    });
  }
}

/*
 *  PUT /api/user/:id
 */
/*
var updateUser = function(req, res) {
  var functionAfterUpdate = function(err, user){
    if(err || !user)
    {
      logger.error("Didn't find user. Error : "+err);
      res.status(500).send("Failed to edit the user");
    }
    else
    {
      // Allow to change : password, username, language

      if( typeof(req.body.username) !== 'undefined' && req.body.username )
        user.username = req.body.username;
      if( typeof(req.body.language) !== 'undefined' && req.body.language )
        user.language = req.body.language;
      if( typeof(req.body.password) !== 'undefined' && req.body.password ) {
        var gen = bCrypt.genSaltSync(8);
        user.password = User.hashPassword(req.body.password, gen, config.pepper)
        user.salt = gen
      }
      user.save( function(err) {
        if(err) {
          logger.error('Edit user: '+err);
          res.status(500).send("Failed to edit user");
        }
        else {
          logger.log('user edited');
          res.status(200).send("user edited");
        }
      });
    }
  };

  // If we have an id in param : function is called by an admin
  if( typeof(req.params.id) !== 'undefined' && req.params.id ) {
    // Check if user is admin
    if( req._payload.category == 'admin' ) {
      logger.log("Admin user "+req._payload._id+" edits the user "+req.params.id);
      User.findOne( { '_id' : req.params.id } , '', functionAfterUpdate);
    }
    else {
      logger.log("User "+req._payload._id+" tried to delete the user "+req.params.id);
      res.status(403).send('Unauthorized');
    }
  }
  else {
    logger.log("User "+req._payload._id+" tried to delete himself");
    User.findOne( { '_id' : req._payload._id } , '', functionAfterUpdate);
  }
}
*/
/*
 *  DELETE /api/user/:id
 */
var deleteUser = function(req, res) {
  id = req.payload.id
  userSrv.deleteUser(id, (err) => {
    if (err) {
      if (err === 'internal') {
        return res.status(500).send({ error: 'internal_error' });
      } else if (err === 'not_found' ){
        return res.status(404).send({ error: 'user_not_found' });
      } else {
        return res.status(500).send({ error: 'unknown_error' });
      }
    }
    res.status(200).send({ success: 'user_deleted' });
  });
};

var autoDeleteUser = function(req, res) {
  if (!req.params.token)
  return res.status(401).send({ error: 'no_token'})

re = /^[a-z0-9]{300,500}$/;
if (!re.test(req.params.token)) { // Check token format from header
  return res.status(401).send({ error: 'malformated_token' });
}
let etoken = re.exec(req.params.token)[0];

  tokenSrv.decryptToken(etoken, (err, token) => {
    if(err){
      return res.status(401).send({ error: 'cannot_decrypt_token' });
    }
    jwt.verify(token, config.sec.token.secret, { algorithms: ['HS256'] }, function (err, payload) {
      if (err) {
        if(err.name == 'TokenExpiredError')
        {
          return res.status(401).send({ error: 'token_expired' });
        }
        logger.error('Error with token ',err)
        return res.status(401).send({ error: 'token_invalid' });
      }
      userSrv.deleteUser(payload.id, (err) => {
        if (err) {
          if (err === 'internal') {
            return res.status(500).send({ error: 'internal_error' });
          } else if (err === 'not_found' ){
            return res.status(404).send({ error: 'user_not_found' });
          } else {
            return res.status(500).send({ error: 'unknown_error' });
          }
        }
        res.status(200).send({ success: 'user_deleted' });
      });
    });
  });
};


module.exports = {
  showUser:             showUser,
  createUser:           createUser,
  patchUser:            patchUser,
  deleteUser:         deleteUser,
  autoDeleteUser: autoDeleteUser,
}
