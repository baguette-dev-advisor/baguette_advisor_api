const app         = require('express')()
const bodyParser  = require('body-parser')
const multer      = require('multer')
const upload      = multer()
const config      = require('./config/config')
const logger      = require('./boot/logger')

// Uses
app.use((req, res, next) => {
    bodyParser.json({
        verify: addRawBody,
    })(req, res, (err) => {
        if (err) {
            res.sendStatus(400);
            return;
        }
        next();
    });
});

function addRawBody(req, res, buf, encoding) {
    req.rawBody = buf.toString();
}

app.use(upload.single('picture'));

// Load routes
app.use(require('./config/routes'))

app.listen(config.port, function() {
  logger.debug('HTTP Server listen on http://localhost:%d', config.port)
})
