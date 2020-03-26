const config = require('../config/config'),
    logger = require('./logger');

sec = {}
// Verifying Sec Parameters
/**
 * Mail Hash
 */
var re = /^[0-9A-Fa-f]*$/;
if (!re.test(config.sec.mail.iv)) { // Should be hex
    logger.error('Mail IV is not hex');
    process.exit(1);
}
re.lastIndex = 0;
if(config.sec.mail.iv.length != 32){ // Should be a 256bits IV
    logger.error('Mail IV Length is invalid, must be 32 chars');
    process.exit(1);
}
if (!re.test(config.sec.mail.key)) { // Should be hex
    logger.error('Mail key is not hex');
    process.exit(1);
}
if (config.sec.mail.key.length != 64) { // Should be a 512bits Key
    logger.error('Mail key Length is invalid, must be 64 chars');
    process.exit(1);
}
/**
 * Mail Encryption
 */
if (!re.test(config.sec.enc_mail.key)) { // Should be hex
    logger.error('Enc_mail key is not hex');
    process.exit(1);
}
if (config.sec.enc_mail.key.length != 64) { // Should be a 512bits Key
    logger.error('Enc_mail key Length is invalid, must be 64 chars');
    process.exit(1);
}
/**
 * Username Hash
 */
if (!re.test(config.sec.username.iv)) { // Should be hex
    logger.error('Username IV is not hex');
    process.exit(1);
}
if (config.sec.username.iv.length != 32) { // Should be a 256bits IV
    logger.error('Username IV Length is invalid, must be 32 chars');
    process.exit(1);
}
if (!re.test(config.sec.username.key)) { // Should be hex
    logger.error('Username key is not hex');
    process.exit(1);
}
if (config.sec.username.key.length != 64) { // Should be a 512bits Key
    logger.error('Username key Length is invalid, must be 64 chars');
    process.exit(1);
}
/**
 * Username Encryption
 */
if (!re.test(config.sec.enc_username.key)) { // Should be hex
    logger.error('Enc_username key is not hex');
    process.exit(1);
}
if (config.sec.enc_username.key.length != 64) { // Should be a 512bits Key
    logger.error('Enc_username key Length is invalid, must be 64 chars');
    process.exit(1);
}
/**
 * Token Encryption
 */
if (!re.test(config.sec.token.key)) { // Should be hex
    logger.error('Token key is not hex');
    process.exit(1);
}
if (config.sec.token.key.length != 64) { // Should be a 512bits Key
    logger.error('Token key Length is invalid, must be 64 chars');
    process.exit(1);
}
logger.log('Sec parameters [OK]');