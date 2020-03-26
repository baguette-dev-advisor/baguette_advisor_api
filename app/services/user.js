const config = require('../../config/config'),
  logger = require('../../boot/logger'),
  db = require('../../boot/db'),
  metrics = require('../services/metrics'),
  bcrypt = require('bcrypt'),
  tokenSrv = require('../services/token'),
  mailSrv = require('../services/mail')
  uuidv4 = require('uuid/v4'),
  crypto = require('crypto');

const self = {
  updateLastActivity: function(userid, cb) {
    const query = 'UPDATE users SET last_activity_ts=now() WHERE users.id=$1';
    const values = [userid];
    console.log(values)
    db.query(query, values, (err, res) => {
      if (err){
        logger.error('fail to insert user', err)
        return cb('internal')
      }
      return cb(null);
    });
  },
  getKey: function (mail, cb) {
    crypto.pbkdf2(mail, config.sec.mail.salt, 10, 512, 'sha512', (err, uHash) => {
      if (err) {
        return cb(err);
      }
      hash = uHash.toString('hex')

      //Encrypting with AES256 // Static IV
      iv = Buffer.from(config.sec.mail.iv, 'hex');
      key = Buffer.from(config.sec.mail.key, 'hex');
      cipher = crypto.createCipheriv('aes256', key, iv);

      let uKey = cipher.update(hash, 'hex', 'hex');
      uKey += cipher.final('hex');
      return cb(null, uKey);
    });
  },
  getUKey: function (username, cb) {
    crypto.pbkdf2(username, config.sec.username.salt, 10, 512, 'sha512', (err, uHash) => {
      if (err) {
        return cb(err);
      }
      hash = uHash.toString('hex')

      //Encrypting with AES256 // Static IV
      iv = Buffer.from(config.sec.username.iv, 'hex');
      key = Buffer.from(config.sec.username.key, 'hex');
      cipher = crypto.createCipheriv('aes256', key, iv);

      let uKey = cipher.update(uHash, 'hex', 'hex');
      uKey += cipher.final('hex');
      return cb(null, uKey);
    });
  },
  getEncryptedMail: function(mail) {
    key = Buffer.from(config.sec.enc_mail.key, 'hex');
    iv = Buffer.from(crypto.randomBytes(16));
    cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let enc_mail = cipher.update(mail, 'utf8', 'hex');
    enc_mail += cipher.final('hex');
    enc_mail = iv.toString('hex')+':'+enc_mail
    return enc_mail;
  },
  getEncryptedUsername: function (username) {
    key = Buffer.from(config.sec.enc_username.key, 'hex');
    iv = Buffer.from(crypto.randomBytes(16));
    cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let enc_username = cipher.update(username, 'utf8', 'hex');
    enc_username += cipher.final('hex');
    enc_username = iv.toString('hex')+':'+enc_username
    return enc_username;
  },
  decryptMail: function (enc_mail, cb) {
    key = Buffer.from(config.sec.enc_mail.key, 'hex');
    mailtab=enc_mail.split(':')
    iv = Buffer.from(mailtab.shift(), 'hex');
    decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let mail = decipher.update(mailtab.shift(), 'hex', 'utf8');
    mail += decipher.final('utf8');
    return cb(mail);
  },
  decryptUsername: function (enc_username, cb) {
    usertab=enc_username.split(':')
    key = Buffer.from(config.sec.enc_username.key, 'hex');
    iv = Buffer.from(usertab.shift(), 'hex');
    decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let username = decipher.update(usertab.shift(), 'hex', 'utf8');
    username += decipher.final('utf8');
    return cb(username);
  },
  getPassword: function (password, cb) {
    bcrypt.hash(password, 10, function (err, hash) {
      if (err) {
        return cb(err);
      }
      return cb(null, hash);
    });
  },
  comparePassword: function(password, hash, cb) {
    bcrypt.compare(password, hash, function (err, res) {
      if (err) {
        return cb(err);
      }
      return cb(null, res);
    });
  },
  newUser: function(mail, username, password, cb) {
    if(typeof username !== 'undefined' || username) {
      self.getKey(mail, (err, key) => {
        if (err) {
          logger.error('Fail to compute user key', err);
          return cb('internal');
        }
        self.getPassword(password, (err, password) => {
          if (err) {
            logger.error('Fail to compute password hash', err);
            return cb('internal');
          }
          self.getUKey(username, (err, ukey) => {
            if (err) {
              logger.error('Fail to compute user key', err);
              return cb('internal');
            }
            destmail = mail
            mail = self.getEncryptedMail(mail);
            username = self.getEncryptedUsername(username);
            const id = uuidv4();
            const query = 'INSERT INTO users (id, mail, mkey, username, ukey, password, active, role) VALUES($1, $2, $3, $4, $5, $6, TRUE, $7)';
            const values = [id, mail, key, username, ukey, password, 'user'];
            console.log(values)
            db.query(query, values, (err, res) => {
              if (err){
                if (err.code === '23505'){
                  return cb('duplicated')
                }
                logger.error('fail to insert user', err)
                return cb('internal')
              }
              tokenSrv.getJWT({"id": id},"72h", (err, token) => {
                if(err) {
                  logger.error("Delete Token Error : "+error)
                  return cb('notification_error')
                }
                mailSrv.sendDeleteMail(destmail, token, (error, info) => {
                  if(error){
                    logger.error("Mail error : "+error)
                    return cb('notification_error')
                  }
                  if(info) {
                    metrics.send( 'business.user.creation', null, null, null, null, 1, function(err) {});
                    return cb(null);
                  }
                });
              });
            });
          });
        });
      });
    }else{
      self.getKey(mail, (err, key) => {
        if (err) {
          logger.error('Fail to compute user key', err);
          return cb('internal');
        }
        self.getPassword(password, (err, password) => {
          if (err) {
            logger.error('Fail to compute password hash', err);
            return cb('internal');
          }
          destmail = mail
          mail = self.getEncryptedMail(mail);
          const id = uuidv4();
          const query = 'INSERT INTO users (id, mail, mkey, password, active, role) VALUES($1, $2, $3, $4, TRUE, $5)';
          const values = [id, mail, key, password, 'user'];
          db.query(query, values, (err, res) => {
            if (err){
              if (err.code === '23505'){
                return cb('duplicated')
              }
              logger.error('fail to insert user', err)
              return cb('internal')
            }
            tokenSrv.getJWT({"id": id},"72h", (err, token) => {
              if(err) {
                logger.error("Delete Token Error : "+error)
                return cb('notification_error')
              }
              mailSrv.sendDeleteMail(destmail, token, (error, info) => {
                if(error){
                  logger.error("Mail error : "+error)
                  return cb('notification_error')
                }
                if(info) {
                  metrics.send( 'business.user.creation', null, null, null, null, 1, function(err) {});
                  return cb(null);
                }
              });
            });
          });
        });
      });
    }
  },
  updateUser: function (id, mail, username, password, url, cb) {
    // Avatar url exists
    if(typeof url !== 'undefined' || url)
    {
      if (typeof mail !== 'undefined' || mail){
        self.getKey(mail, (err, key) => {
          if (err) {
            logger.error('Fail to compute user key', err);
            return cb('internal');
          }
          mail = self.getEncryptedMail(mail);
          if (typeof username !== 'undefined' || username) {
            self.getUKey(username, (err, ukey) => {
              if (err) {
                logger.error('Fail to compute user key', err);
                return cb('internal');
              }
              username = self.getEncryptedUsername(username);
              if (typeof password !== 'undefined' || password) {
                self.getPassword(password, (err, password) => {
                  if (err) {
                    logger.error('Fail to password hash', err);
                    return cb('internal');
                  }
                  //REGISTER (avatar, mail, username, password)
                  const query = "UPDATE users SET mail = COALESCE($1, mail), mkey = COALESCE($2, mkey), username = COALESCE($3, username), ukey = COALESCE($4, ukey), password = COALESCE($5, password), avatar = COALESCE($6, avatar) WHERE id = $7;";
                  const values = [mail, key, username, ukey, password, url, id];
                  db.query(query, values, (err, res) => {
                    if (err) {
                      if (err.code === '23505') {
                        return cb('duplicated')
                      }
                      logger.error('fail to insert user', err)
                      return cb('internal')
                    }
                    return cb(null);
                  });
                });
              } else {
                //REGISTER (avatar, mail, username, !password)
                const query = "UPDATE users SET mail = COALESCE($1, mail), mkey = COALESCE($2, mkey), username = COALESCE($3, username), ukey = COALESCE($4, ukey), avatar = COALESCE($5, avatar) WHERE id = $6;";
                const values = [mail, key, username, ukey, url, id];
                db.query(query, values, (err, res) => {
                  if (err) {
                    if (err.code === '23505') {
                      return cb('duplicated')
                    }
                    logger.error('fail to update user', err)
                    return cb('internal')
                  }
                  return cb(null);
                });
              }
            });
          }else{
            if (typeof password !== 'undefined' || password) {
              self.getPassword(password, (err, password) => {
                if (err) {
                  logger.error('Fail to password hash', err);
                  return cb('internal');
                }
                //REGISTER (avatar, mail, !username, password)
                const query = "UPDATE users SET mail = COALESCE($1, mail), mkey = COALESCE($2, mkey), password = COALESCE($3, password), avatar = COALESCE($4, avatar) WHERE id = $5;";
                const values = [mail, key, password, url, id];
                db.query(query, values, (err, res) => {
                  if (err) {
                    if (err.code === '23505') {
                      return cb('duplicated')
                    }
                    logger.error('fail to update user', err)
                    return cb('internal')
                  }
                  return cb(null);
                });
              });
            } else {
              //REGISTER (avatar, mail, !username, !password)
              const query = "UPDATE users SET mail = COALESCE($1, mail), mkey = COALESCE($2, mkey), avatar = COALESCE($3, avatar) WHERE id = $4;";
              const values = [mail, key, url, id];
              db.query(query, values, (err, res) => {
                if (err) {
                  if (err.code === '23505') {
                    return cb('duplicated')
                  }
                  logger.error('fail to update user', err)
                  return cb('internal')
                }
                return cb(null);
              });
            }
          }
        });
      }else{
        mail = null;
        key = null;
        if (typeof username !== 'undefined' || username) {
          self.getUKey(username, (err, ukey) => {
            if (err) {
              logger.error('Fail to compute user key', err);
              return cb('internal');
            }
            username = self.getEncryptedUsername(username);
            if (typeof password !== 'undefined' || password) {
              self.getPassword(password, (err, password) => {
                if (err) {
                  logger.error('Fail to password hash', err);
                  return cb('internal');
                }
                //REGISTER (avatar, !mail, username, password)
                const query = "UPDATE users SET username = COALESCE($1, username), ukey = COALESCE($2, ukey), password = COALESCE($3, password), avatar = COALESCE($4, avatar) WHERE id = $5;";
                const values = [username, ukey, password, url, id];
                db.query(query, values, (err, res) => {
                  if (err) {
                    if (err.code === '23505') {
                      return cb('duplicated')
                    }
                    logger.error('fail to update user', err)
                    return cb('internal')
                  }
                  return cb(null);
                });
              });
            } else {
              //REGISTER (avatar, !mail, username, !password)
              const query = "UPDATE users SET username = COALESCE($1, username), ukey = COALESCE($2, ukey), avatar = $3 WHERE id = $4;";
              const values = [username, ukey, url, id];
              db.query(query, values, (err, res) => {
                if (err) {
                  if (err.code === '23505') {
                    return cb('duplicated')
                  }
                  logger.error('fail to update user', err)
                  return cb('internal')
                }
                return cb(null);
              });
            }
          });
        } else {
          if (typeof password !== 'undefined' || password) {
            self.getPassword(password, (err, password) => {
              if (err) {
                logger.error('Fail to password hash', err);
                return cb('internal');
              }
              //REGISTER (avatar, !mail, !username, password)
              const query = "UPDATE users SET password = COALESCE($1, password), avatar = COALESCE($2, avatar) WHERE id = $3;";
              const values = [password, url, id];
              db.query(query, values, (err, res) => {
                if (err) {
                  logger.error('fail to update user', err)
                  return cb('internal')
                }
                return cb(null);
              });
            });
          }
          else {
            // update only avatar
            const query = "UPDATE users SET avatar = COALESCE($1, avatar) WHERE id = $2;";
            const values = [url, id];
            db.query(query, values, (err, res) => {
              if (err) {
                logger.error('fail to update user', err)
                return cb('internal')
              }
              return cb(null);
            });
          }
        }
      }
    }
    // No avatar url
    else{
      if(typeof mail !== 'undefined' || mail) {
        self.getKey(mail, (err, key) => {
          if (err) {
            logger.error('Fail to compute user key', err);
            return cb('internal');
          }
          mail = self.getEncryptedMail(mail);
          if (typeof username !== 'undefined' || username) {
            self.getUKey(username, (err, ukey) => {
              if (err) {
                logger.error('Fail to compute user key', err);
                return cb('internal');
              }
              username = self.getEncryptedUsername(username);
              if (typeof password !== 'undefined' || password) {
                self.getPassword(password, (err, password) => {
                  if (err) {
                    logger.error('Fail to password hash', err);
                    return cb('internal');
                  }
                  //REGISTER (mail, username, password)
                  const query = "UPDATE users SET mail = COALESCE($1, mail), mkey = COALESCE($2, mkey), username = COALESCE($3, username), ukey = COALESCE($4, ukey), password = COALESCE($5, password) WHERE id = $6;";
                  const values = [mail, key, username, ukey, password, id];
                  db.query(query, values, (err, res) => {
                    if (err) {
                      if (err.code === '23505') {
                        return cb('duplicated')
                      }
                      logger.error('fail to insert user', err)
                      return cb('internal')
                    }
                    return cb(null);
                  });
                });
              } else {
                //REGISTER (mail, username, !password)
                const query = "UPDATE users SET mail = COALESCE($1, mail), mkey = COALESCE($2, mkey), username = COALESCE($3, username), ukey = COALESCE($4, ukey) WHERE id = $5;";
                const values = [mail, key, username, ukey, id];
                db.query(query, values, (err, res) => {
                  if (err) {
                    if (err.code === '23505') {
                      return cb('duplicated')
                    }
                    logger.error('fail to update user', err)
                    return cb('internal')
                  }
                  return cb(null);
                });
              }
            });
          } else {
            if (typeof password !== 'undefined' || password) {
              self.getPassword(password, (err, password) => {
                if (err) {
                  logger.error('Fail to password hash', err);
                  return cb('internal');
                }
                //REGISTER (mail, !username, password)
                const query = "UPDATE users SET mail = COALESCE($1, mail), mkey = COALESCE($2, mkey), password = COALESCE($3, password) WHERE id = $4;";
                const values = [mail, key, password, id];
                db.query(query, values, (err, res) => {
                  if (err) {
                    if (err.code === '23505') {
                      return cb('duplicated')
                    }
                    logger.error('fail to update user', err)
                    return cb('internal')
                  }
                  return cb(null);
                });
              });
            } else {
              //REGISTER (mail, !username, !password)
              const query = "UPDATE users SET mail = COALESCE($1, mail), mkey = COALESCE($2, mkey) WHERE id = $3;";
              const values = [mail, key, id];
              db.query(query, values, (err, res) => {
                if (err) {
                  if (err.code === '23505') {
                    return cb('duplicated')
                  }
                  logger.error('fail to update user', err)
                  return cb('internal')
                }
                return cb(null);
              });
            }
          }
        });
      }else{
        mail = null;
        key = null;
        if(typeof username !== 'undefined' || username) {
          self.getUKey(username, (err, ukey) => {
            if (err) {
              logger.error('Fail to compute user key', err);
              return cb('internal');
            }
            username = self.getEncryptedUsername(username);
            if (typeof password !== 'undefined' || password) {
              self.getPassword(password, (err, password) => {
                if (err) {
                  logger.error('Fail to password hash', err);
                  return cb('internal');
                }
                //REGISTER (!mail, username, password)
                const query = "UPDATE users SET username = COALESCE($1, username), ukey = COALESCE($2, ukey), password = COALESCE($3, password) WHERE id = $4;";
                const values = [username, ukey, password, id];
                db.query(query, values, (err, res) => {
                  if (err) {
                    if (err.code === '23505') {
                      return cb('duplicated')
                    }
                    logger.error('fail to update user', err)
                    return cb('internal')
                  }
                  return cb(null);
                });
              });
            } else {
              //REGISTER (!mail, username, !password)
              const query = "UPDATE users SET username = COALESCE($1, username), ukey = COALESCE($2, ukey) WHERE id = $3;";
              const values = [username, ukey, id];
              db.query(query, values, (err, res) => {
                if (err) {
                  if (err.code === '23505') {
                    return cb('duplicated')
                  }
                  logger.error('fail to update user', err)
                  return cb('internal')
                }
                return cb(null);
              });
            }
          });
        } else {
          if(typeof password !== 'undefined' || password) {
            self.getPassword(password, (err, password) => {
              if (err) {
                logger.error('Fail to password hash', err);
                return cb('internal');
              }
              //REGISTER (!mail, !username, password)
              const query = "UPDATE users SET password = COALESCE($1, password) WHERE id = $2;";
              const values = [password, id];
              db.query(query, values, (err, res) => {
                if (err) {
                  logger.error('fail to update user', err)
                  return cb('internal')
                }
                return cb(null);
              });
            });
          }
          else {
            // nothing to update
            return cb(null);
          }
        }
      }
    }
  },
  checkCredentials: function(id, password, cb) {
    if(typeof id.mail !== 'undefined' && id.mail)
    {
      self.getKey(id.mail, (err, key) => {
        if (err) {
          logger.error('Fail to compute user key', err);
          return cb('internal');
        }
        const query = 'SELECT id, password, role FROM users WHERE mkey = $1 AND active=TRUE;';
        const values = [key];
        db.query(query, values, (err, user) => {
          if (err) {
            logger.error('fail search for user', err)
            return cb('internal')
          }
          if (user.rows.length == 0) {
            return cb('not_found')
          }
          self.comparePassword(password, user.rows[0].password, (err, res) => {
            if (err) {
              logger.error('fail comparing password', err)
              return cb('internal')
            }
            if (res == false) {
              return cb('wrong_password')
            }
            payload = {
              id: user.rows[0].id,
              role: user.rows[0].role
            }
            return cb(null, payload);
          });
        });
      });
    }else if(typeof id.username !== 'undefined'){
      self.getUKey(id.username, (err, ukey) => {
        if (err) {
          logger.error('Fail to compute user key', err);
          return cb('internal');
        }
        const query = 'SELECT id, password, role FROM users WHERE ukey = $1;';
        const values = [ukey];
        db.query(query, values, (err, user) => {
          if (err) {
            logger.error('fail search for user', err)
            return cb('internal')
          }
          if (user.rows.length == 0) {
            return cb('not_found')
          }
          self.comparePassword(password, user.rows[0].password, (err, res) => {
            if (err) {
              logger.error('fail comparing password', err)
              return cb('internal')
            }
            if (res == false) {
              return cb('wrong_password')
            }
            payload = {
              id: user.rows[0].id,
              role: user.rows[0].role
            }
            return cb(null, payload);
          });
        });
      });
    }

  },
  getUserInfos: function(id, cb){
    const query = 'SELECT mail, username, avatar, role FROM users WHERE id = $1;';
    const values = [id];
    db.query(query, values, (err, data) => {
      if (err) {
        logger.error('fail search for user', err)
        return cb('internal')
      }
      if (data.rows.length == 0) {
        return cb('not_found')
      }
      user = {};
      self.decryptMail(data.rows[0].mail, mail => {
        if (typeof data.rows[0].username !== 'undefined' && data.rows[0].username)
        {
          self.decryptUsername(data.rows[0].username, username => {
            user.mail = mail;
            user.username = username;
            user.avatar = data.rows[0].avatar;
            return cb(null, user);
          });
        }else{
          user.mail = mail;
          if (typeof data.rows[0].avatar !== 'undefined' && data.rows[0].avatar) {
            user.avatar = data.rows[0].avatar;
          }
          return cb(null, user);
        }
      });
    });
  },
  checkUserMailExists: function(userMail, cb){
    self.getKey(userMail, (err, mkey) => {
      const query = 'SELECT id,username FROM users WHERE mkey = $1;';
      const values = [mkey];
      db.query(query, values, (err, data) => {
        if (err) {
          return cb('error')
        }
        else {
          if (data.rows.length == 0) {
            return cb('not_found')
          }
          else {
            if(data.rows[0].username != null && typeof username != undefined){
              self.decryptUsername(data.rows[0].username, username => {
                return cb(null, data.rows[0].id, username)
              });
            }else{
              username = "Dear User"
              return cb(null, data.rows[0].id, username)
            }
          }
        }
      });
    });
  },
  getUsername: function(userId, cb){
    const query = 'SELECT username FROM users WHERE id = $1;';
    const values = [userId];
    db.query(query, values, (err, data) => {
      if (err) {
        return cb('error')
      }
      else {
        return cb(null, data.rows[0].username)
      }
    });
  },
  deleteUser: function (id, cb) {
    const query = 'UPDATE users SET active=FALSE where id=$1;';
    const values = [id];
    db.query(query, values, (err, user) => {
      if (err) {
        logger.error('fail search for user', err)
        return cb('internal')
      }
      if ( user.rowCount == 0) {
        return cb('not_found')
      }
      return cb(null)
    });
  }
};

module.exports = self;
