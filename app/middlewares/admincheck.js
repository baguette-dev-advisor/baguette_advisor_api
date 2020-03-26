const config = require('../../config/config'),
      logger = require('../../boot/logger');

module.exports = function(req, res, next) {
  if ( req.payload.role != 'admin')
    return res.status(401).send({ error: 'not_admin'})
  next()
}
