const logger                = require('../../boot/logger');
const openstack             = require('../../config/config').openstack
const openstack_url_prefix  = require('../../config/config').openstack_url_prefix
const piexif                =  require('piexifjs');
const stream = require('stream');

const self = {

  // upload picture
  upload: function( bin_picture, containerName, name, cb ){
    var writeStream = openstack.upload({
      container: containerName,
      remote: name
    });
    writeStream.on('error', function(err) {
      logger.error("Picture : upload failed : "+err);
      cb('internal');
    });
    writeStream.on('success', function(storage_obj) {
      const url = openstack_url_prefix + storage_obj.container + "/" + storage_obj.name
      cb(null, storage_obj.name);
    })
    //Removing Exifs
    e = "";
    var data = bin_picture.toString("binary");
    try {
      var newData = piexif.remove(data);
    }
    catch (e) {
      logger.error("Cannot remove exif: Not JPEG");
    }
    try {
      var clean_bin_picture = Buffer.from(newData, "binary");
    }
    catch (e) {
      logger.error("Cannot bufferized cleaned picture")
    }
    if ( e === '' )
    {
      var StreamBuffer = new stream.PassThrough();
      StreamBuffer.pipe(writeStream);
      StreamBuffer.end(clean_bin_picture);
    }else{
      var StreamBuffer = new stream.PassThrough();
      StreamBuffer.pipe(writeStream);
      StreamBuffer.end(bin_picture);
    }
  }

}

module.exports = self;
