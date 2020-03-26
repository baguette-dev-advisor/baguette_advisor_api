const config      = require('../config/config');
const RateLimit   = require('express-rate-limit');
const logger      = require('../boot/logger');


if( typeof config.default_limiter == 'undefined' ) {
  logger.error('Missing default_limiter config');
}

const default_limiter_window_ms = config.default_limiter.window_ms;
const default_limiter_delay_after = config.default_limiter.delay_after;
const default_limiter_delay_ms = config.default_limiter.delay_ms;
const default_limiter_max = config.default_limiter.max;

var get = function(name) {

  // if no name, set default
  if( ! name )
    name = 'DEFAULT'

  env_name = name.toUpperCase()+'_LIMITER'
  env_windowms    = env_name+'_WINDOWS_MS'
  env_delayafter  = env_name+'_DELAY_AFTER'
  env_delayms     = env_name+'_DELAY_MS'
  env_max         = env_name+'_MAX'

  // Uses name.element instead of name.element and returns the new limiter
  return new RateLimit({

    // window size
    windowMs:   process.env[env_windowms] ? process.env[env_windowms] : default_limiter_window_ms,

    // begin slowing down responses after x requests
    delayAfter: process.env[env_delayafter] ? process.env[env_delayafter] : default_limiter_delay_after,

    // slow down by x ms by request multiplied by (number of recent hits - delayAfter)
    delayMs: process.env[env_delayms] ? process.env[env_delayms] : default_limiter_delay_ms,

    // max blocks after x requests, after returns 429
    max: process.env[env_max] ? process.env[env_max] : default_limiter_max,
    
    keyGenerator: function(req /*, res*/) {
      const ip = req.headers['x-forwarded-for'] || req.ip;
      console.log(ip + ' - [' + new Date() + '] "' + req.method + ' ' + req.originalUrl + '"');
      return ip;
    }

  });
};

module.exports = {
  get: get,
}
