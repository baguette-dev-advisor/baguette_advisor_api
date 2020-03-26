const logger      = require('../../boot/logger');
const config      = require('../../config/config');
const pictureStorage = require('../services/picture');
const crypto      = require('crypto');

const container_map = {
  markets: 'markets',
  users: 'users',
};

/*
 *  Upload picture
 *  Return id of the uploaded picture
 */
var uploadPicture = function (req, res) {
  // Checking params (should be checked by router)
  if (!req.params.type) {
    return res.status(422).send({ error: 'bad_request' });
  }
  if (!req.file) {
    return res.status(422).send({ error: 'missing_picture' });
  }
  const bin_pic = Buffer.from(req.file.buffer, 'binary');

  // Check if type is linked to a valid container
  const containerName = container_map[req.params.type];
  if( typeof containerName == 'undefined' ){
    return res.status(422).send({ error: 'bad_params' });
  }

  // generate a random number to use it as uuid in the picture url
  crypto.randomBytes(16, (err, buf) => {
    if(err) {
      return res.status(500).send({ error: 'internal_error' });
    }
    // upload picture
    pictureStorage.upload( bin_pic, containerName, buf.toString('hex'), (err, pictureId) => {
      if (err) {
        if (err === 'internal') {
          return res.status(500).send({ error: 'internal_error' });
        } else {
          return res.status(500).send({ error: 'unknown_error' });
        }
      }
      res.status(200).send( pictureId );
    });
  });
};

/*
 *  Reupload picture
 *  Return id of the reuploaded picture
 */
var reuploadPicture = function (req, res) {
  // Checking params (should be checked by router)
  if (!req.params.type) {
    return res.status(422).send({ error: 'bad_request' });
  }
  if (!req.params.id) {
    return res.status(422).send({ error: 'bad_request' });
  }
  if (!req.file) {
    return res.status(422).send({ error: 'missing_picture' });
  }
  const bin_pic = Buffer.from(req.file.buffer, 'binary');

  // Check if type is linked to a valid container
  const containerName = container_map[req.params.type];
  if( typeof containerName == 'undefined' ){
    return res.status(422).send({ error: 'bad_params' });
  }

  // Reupload the picture with the id
  pictureStorage.upload( bin_pic, containerName, req.params.id, (err, pictureId) => {
    if (err) {
      if (err === 'internal') {
        return res.status(500).send({ error: 'internal_error' });
      } else {
        return res.status(500).send({ error: 'unknown_error' });
      }
    }
    res.status(200).send( pictureId );
  });
};

module.exports = {
  upload: uploadPicture,
  reupload: reuploadPicture,
}
