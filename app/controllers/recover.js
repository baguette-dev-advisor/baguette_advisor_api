const logger    = require('../../boot/logger'),
      userSrv   = require('../services/user'),
      mailSrv   = require('../services/mail'),
      tokenSrv  = require('../services/token'),
      config    = require('../../config/config'),
      path      = require('path');

/*
 *  Send mail page
 */
const sendMailPage = function(req, res, next) {
  return res.sendFile(path.join(__dirname+'/../html/index.html'))
}

/*
 *  Send password page
 */
const sendPasswordPage = function(req, res, next) {
  return res.sendFile(path.join(__dirname+'/../html/newpass.html'))
}

/*
 *  Check mail
 */
var checkMail = function (req, res) {

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
  const mail = req.body.mail.trim();
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

  // Check if the mail exists
  userSrv.checkUserMailExists( mail, (err, id, username) => {
    if(err) {
      // wrong mail or error, just return 200
      res.status(200).send({ success: 'mail_sent' });
    }
    else {
      // exists : get a token, send a mail then return 200
      tokenSrv.getJWT({ id: id }, config.sec.token.recover_timeout, (err, token) => {
        if(err)
        {
          if(err === 'internal'){
            return res.status(500).send({ error: 'internal'});
          }
          else{
            return res.status(500).send({ error: 'unknown_error' });
          }
        }
        else {
          // send the mail (with token in url)
          mailSrv.sendRecoveryMail( mail, token, username,(error, info) => {
            if(error){
              logger.error("Mail error : "+error)
              return res.status(500).send({ error: 'mail_error' });
            }
            if(info){
              return res.status(200).send({ success: 'mail_sent' });
            }
            return res.status(500).send({ error: 'mail_error' });
          });
        }
      });
    }
  });

};

module.exports = {
  'sendMailPage': sendMailPage,
  'sendPasswordPage': sendPasswordPage,
  'checkMail':    checkMail,
}
