const config = require('../config/config');
const { Client } = require('pg'),
        logger = require('../boot/logger');

const client = new Client(config.pg)
client.connect()
        .then(() => logger.log('connected to pg'))
        .catch(e => logger.error('error during connection to pg : ', e))

module.exports = client;
