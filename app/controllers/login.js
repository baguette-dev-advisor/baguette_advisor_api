const logger    = require('../../boot/logger'),
      userSrv  = require('../services/user'),
      tokenSrv = require('../services/token'),
      config = require('../../config/config');

module.exports = function(req, res, next) {

  if (req.body === undefined || ( req.body.mail === undefined && req.body.username === undefined ) || req.body.password === undefined) {
    logger.log("Login: An anonymous tried to log in");
    return res.status(401).send("Login and password required");
  }

  //Checking if body is empty
  if (!req.body) {
    return res.status(422).send({ error: 'missformated_json' });
  }

  id = {};
  // Mail checks
  if (typeof req.body.mail !== 'undefined' && req.body.mail) {
    if (typeof req.body.mail !== 'string') { // Should be a string
      return res.status(422).send({ error: 'bad_email' });
    }
    id.mail = req.body.mail.trim();
    if (id.mail.length < 1) { // Should not be empty
      return res.status(422).send({ error: 'too_short_email', min: 1 });
    }
    if (id.mail.length > 1024) { // Should not too long
      return res.status(422).send({ error: 'too_long_email', max: 1024 });
    }
    re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!re.test(id.mail)) { // Check mail format
      return res.status(422).send({ error: 'bad_email' });
    }
  }
  // Mail is ready
  // Username checks
  if (typeof req.body.username !== 'undefined' && req.body.username)
  {
    if (typeof req.body.username !== 'string') { // Should be a string
      return res.status(422).send({ error: 'bad_username' });
    }
    id.username = req.body.username.trim();
    if (id.username.length < 1) { // Should not be empty
      return res.status(422).send({ error: 'too_short_username', min: 1 });
    }
    if (id.username.length > 1024) { // Should not too long
      return res.status(422).send({ error: 'too_long_username', max: 1024 });
    }
  }
  // Username is ready

  // Password check
  if (!req.body.password) { // Required
    return res.status(422).send({ error: 'missing_password' });
  }
  if (typeof req.body.password !== 'string') { // Should be a string
    return res.status(422).send({ error: 'bad_password' });
  }
  const password = req.body.password.trim();
  if (password.length < 8) { // Should not be too short
    return res.status(422).send({ error: 'too_short_password', min: 8 });
  }
  if (password.length > 1024) { // Should not be too long
    return res.status(422).send({ error: 'too_long_password', max: 1024 });
  }

  // check user credentials
  userSrv.checkCredentials( id, password, function(err, payload) {
    if(err) {
      if(err === 'internal'){
        return res.status(500).send({ error: 'cannot_check_password'});
      }
      else if (err === 'not_found'){
        return res.status(403).send({ error: 'user_not_found' });
      }
      else if (err === 'wrong_password') {
        return res.status(403).send({ error: 'wrong_password' });
      }
      else if (err === 'no_id') {
        return res.status(403).send({ error: 'username_or_email_required' });
      }
      else {
        return res.status(500).send({ error: 'unknown_error' });
      }
    }
    tokenSrv.getJWT(payload, config.sec.token.login_timeout, (err, token) => {
      if(err)
      {
        if(err === 'internal'){
          return res.status(500).send({ error: 'internal'});
        }
        else{
          return res.status(500).send({ error: 'unknown_error' });
        }
      }
      tokenSrv.getRefresh(payload, (err, refresh) => {
        if(err)
        {
          if(err === 'internal'){
            return res.status(500).send({ error: 'internal'});
          }
          else{
            return res.status(500).send({ error: 'unknown_error' });
          }
        }
        return res.status(200).send({
          token: token,
          refresh: refresh
        });
      });
    });
  });

  // User infos we will store in the token

}
