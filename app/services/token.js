const   config = require('../../config/config'),
        logger = require('../../boot/logger'),
        crypto = require('crypto'),
        jwt = require('jsonwebtoken'),
        db = require('../../boot/db'),
        uuidv4 = require('uuid/v4');

const self = {
    getJWT: function (payload, timeout, cb) {
        jwt.sign(payload, config.sec.token.secret, { algorithm: 'HS256', expiresIn: timeout }, function (err, token) {
            if (err) {
                logger.error("Error while generating token :", err);
                return cb('internal');
            }
            key = Buffer.from(config.sec.token.key, 'hex');
            cipher = crypto.createCipher('aes256', key);
            let etoken = cipher.update(token, 'utf8', 'hex');
            etoken += cipher.final('hex');
            return cb(null, etoken);
        });
    },
    getRefresh: function (payload, cb) {
        token = uuidv4();
        const query = 'DELETE FROM refresh WHERE user_id=$1';
        const values = [payload.id];
        db.query(query, values, (err) => {
            if(err)
            {
              logger.error(err);
              return cb('internal');
            }
            const query = 'INSERT INTO refresh (id, token, user_id, role) VALUES(uuid_generate_v4(), $1, $2, $3)';
            const values = [token, payload.id, payload.role];
            db.query(query, values, (err) => {
                if(err)
                {
                  logger.error(err);
                  return cb('internal');
                }
                return cb(null, token);
            });
        });

    },
    checkRefresh: function (token, cb) {
        const query = 'SELECT * FROM refresh where token=$1';
        const values = [token];
        db.query(query, values, (err, data) => {
            if(err)
            {
              logger.error(err);
              return cb('internal');
            }else if(data.rowCount == 0){
              return cb('not_found');
            }
            payload = {
              id: data.rows[0].user_id,
              role: data.rows[0].role
            }
            return cb(null, payload);
        });
    },
    decryptToken: function (etoken, cb) {
        key = Buffer.from(config.sec.token.key, 'hex');
        decipher = crypto.createDecipher('aes256', key);
        let token = decipher.update(etoken, 'hex', 'utf8');
        try {
          token += decipher.final('utf8');
        }catch (err){
          return cb(err, null)
        }
        return cb(null, token);
    }
};

module.exports = self;
