const package = require('../../package')

module.exports = {

  /**
   * GET /
   */
  index: function(req, res) {
    res.send({
      version: package.version,
      name: package.name
    })
  }

}
