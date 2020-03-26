const jwt    = require('jsonwebtoken'),
      config = require('../../config/config'),
      logger = require('../../boot/logger'),
      tokenSrv = require('../services/token');

module.exports = function(req, res, next) {

  if (!req.headers.authorization)
    return res.status(401).send({ error: 'no_token'})

  let etoken = req.headers.authorization.trim();
  re = /^[a-z0-9]{300,500}$/;
  if (!re.test(req.headers.authorization)) { // Check mail format
    return res.status(401).send({ error: 'malformated_token' });
  }
  etoken = re.exec(req.headers.authorization)[0];
  tokenSrv.decryptToken(etoken, (err, token) => {
    if(err)
    {
      logger.error("token cannot be decrypted");
      return res.status(401).send({ error: 'bad_token' });
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
      req.payload = payload;
      next()
    });
  });
}
