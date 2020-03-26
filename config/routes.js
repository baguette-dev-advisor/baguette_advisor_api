const ENV = process.env.NODE_ENV || 'development'
const router      = require('express').Router()
const limiters = require('../config/limiter');
const cors = require('cors');
const metrics = require('../app/middlewares/metrics');

require('../boot/sec')
module.exports = router



/**
 * Public
 */
router.use(cors())

router.get('/',                   limiters.get(''),                           metrics,  require('../app/controllers/root').index)



router.post('/auth/signin',       limiters.get('auth'),                       metrics,  require('../app/controllers/login'))
router.post('/auth/refresh',      limiters.get('auth'),                       metrics,  require('../app/controllers/refresh'))
router.post('/auth/signup',       limiters.get('auth'),                       metrics,  require('../app/controllers/users').createUser)
router.get('/recover',            limiters.get('recover_check_mail'),         metrics,  require('../app/controllers/recover').sendMailPage)
router.post('/recover/checkmail', limiters.get('recover_check_mail'),         metrics,  require('../app/controllers/recover').checkMail)
router.get('/recover/:token',     limiters.get('recover_check_mail'),         metrics,  require('../app/controllers/recover').sendPasswordPage)
router.get('/markets/:lat/:lon/:radius',  limiters.get('market_get'),         metrics,  require('../app/controllers/market').getMarketPoints)
router.get ('/user/delete/:token',           limiters.get('auth'),               metrics,  require('../app/controllers/users').autoDeleteUser)



/**
 * Private
 */

// Do not delete, auth is a required step for privates routes
router.use(require('../app/middlewares/auth'))

// Users
router.get    ('/user',                   limiters.get(''),                   metrics,  require('../app/controllers/users').showUser)
router.patch  ('/user',                   limiters.get(''),                   metrics,  require('../app/controllers/users').patchUser)
router.delete ('/user',                   limiters.get(''),                   metrics,  require('../app/controllers/users').deleteUser)



// Pictures
router.post('/picture/:type',             limiters.get('picture_upload'),     metrics,  require('../app/controllers/picture').upload)
// MarketPoints
router.post('/market',                    limiters.get('market_creation'),    metrics,  require('../app/controllers/market').createMarket)
router.post('/market/:id/rating',         limiters.get('market_notation'),    metrics,  require('../app/controllers/market').addRating)
router.post('/market/:id/rating/:productid', limiters.get('market_notation'), metrics, require('../app/controllers/market').addRatingToProduct)



/**
 * Administration
 */

// Do not delete, check user.category == 'admin'
router.use(require('../app/middlewares/admincheck'))
router.get('/markets/:color/:max',        limiters.get('admin'),              metrics,  require('../app/controllers/market').getColoredMarketPoints)
router.patch('/market/:id/:action',       limiters.get('admin'),              metrics,  require('../app/controllers/market').moderateMarket)
router.get('/market/:id',                 limiters.get('admin'),              metrics,  require('../app/controllers/market').getMarketById)
router.post('/picture/:type/:id',         limiters.get('admin'),              metrics,  require('../app/controllers/picture').reupload)
router.post('/import/market',             limiters.get('admin'),              metrics,  require('../app/controllers/market').importMarket)



/**
 * Only for development
 */

if( ENV === 'development' ) {
}
