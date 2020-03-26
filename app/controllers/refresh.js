const config = require('../../config/config'),
      logger = require('../../boot/logger'),
      tokenSrv = require('../services/token');

module.exports = function(req, res, next) {

  if (!req.body.refresh)
    return res.status(401).send({ error: 'no_refresh'})
  let refresh = req.body.refresh.trim()
  re = /^[a-z0-9]{8}(\-[a-z0-9]{4}){3}\-[a-z0-9]{12}$/;
  if (!re.test(req.body.refresh)) { // Check mail format
    return res.status(401).send({ error: 'malformated_refresh' });
  }
  refresh = re.exec(req.body.refresh)[0];
  tokenSrv.checkRefresh(refresh, (err, payload) =>
  {
    if(err){
      if(err == 'internal'){
        return res.status(500).send({ error: 'internal'})
      }
      else if( err == 'not_found'){
        return res.status(401).send({ error: 'bad_refresh'})
      }else{
        return res.status(500).send({ error: 'unknown_error'})
      }
    }
    tokenSrv.getJWT(payload, config.sec.token.login_timeout, (err, token) => {
      if(err)
      {
        if(err == 'internal'){
          return res.status(500).send({ error: 'internal'});
        }
        else{
          return res.status(500).send({ error: 'unknown_error' });
        }
      }
      return res.status(200).send({
        token: token
      });
    });
  });
}
