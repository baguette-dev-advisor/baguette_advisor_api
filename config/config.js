const ENV = process.env.NODE_ENV || 'development',
      logger = require('../boot/logger');
// Get development config from gitignored file
if( ENV === 'development' ) {
  logger.log("Loading development configuration")
  module.exports = require('./secret.config');
}
// Production config
else {
  logger.log("Loading production configuration")
  module.exports = {
    port: process.env.PORT || 80,
    publicDN: process.env.PUBLIC_DOMAIN_NAME,
    mail_bot_addr: process.env.MAIL_BOT_ADDR,
    moderation: {
      level: process.env.MODERATION_LEVEL
    },
    pg: {
      user:     process.env.POSTGRESQL_ADDON_USER,
      password: process.env.POSTGRESQL_ADDON_PASSWORD,
      database: process.env.POSTGRESQL_ADDON_DB,
      host:     process.env.POSTGRESQL_ADDON_HOST,
      port:     process.env.POSTGRESQL_ADDON_PORT
    },
    openstack: require('pkgcloud').storage.createClient({
      provider: 'openstack',
      username: process.env.STORAGE_OPENSTACK_USER,
      password: process.env.STORAGE_OPENSTACK_PASSWORD,
      authUrl:  process.env.STORAGE_OPENSTACK_AUTH_URL,
      region:   process.env.STORAGE_OPENSTACK_REGION
    }),
    mailer: {
      public_key: process.env.MAILER_PUBLIC_KEY,
      private_key: process.env.MAILER_PRIVATE_KEY,
      mail_bot_addr: process.env.MAILER_MAIL_BOT_ADDR,
      mail_bot_name: process.env.MAILER_MAIL_BOT_NAME
    },
    sec: {
      mail: {
        salt: process.env.SEC_MAIL_SALT,
        iv:   process.env.SEC_MAIL_IV,
        key:  process.env.SEC_MAIL_KEY
      },
      username:
      {
        salt: process.env.SEC_USERNAME_SALT,
        key: process.env.SEC_USERNAME_KEY,
        iv: process.env.SEC_USERNAME_IV
      },
      enc_mail: {
        key: process.env.SEC_ENC_MAIL_KEY
      },
      enc_username: {
        key: process.env.SEC_ENC_USERNAME_KEY
      },
      token: {
        secret: process.env.SEC_TOKEN_SECRET,
        key:    process.env.SEC_TOKEN_KEY,
        login_timeout:    process.env.SEC_TOKEN_LOGIN_TIMEOUT,
        recover_timeout:    process.env.SEC_TOKEN_RECOVER_TIMEOUT,
        delete_timeout:  process.env.SEC_TOKEN_DELETE_TIMEOUT
      },
    },
    openstack_url_prefix: process.env.STORAGE_OPENSTACK_URL_PREFIX,
    get_markets_max_radius: process.env.GET_MARKETS_MAX_RADIUS,
    default_limiter: {
      window_ms: process.env.DEFAULT_LIMITER_WINDOWS_MS,
      delay_after: process.env.DEFAULT_LIMITER_DELAY_AFTER,
      delay_ms: process.env.DEFAULT_LIMITER_DELAY_MS,
      max: process.env.DEFAULT_LIMITER_MAX
    },
    metrics: {
      endpoint: process.env.METRICS_ENDPOINT,
      write_token: process.env.METRICS_WRITE_TOKEN
    }
  }
}
