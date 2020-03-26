const fetch = require('node-fetch');

/**
 * GTS is an object which represent a GeoTimeSeries
 */
class GTS {
  /**
   *
   * @param {string} n REQUIRED Class name of GTS
   * @param {Map<string>} l key/value Labels
   * @param {Array<Datapoint>} v Array of Datapoints
   */
  constructor(n, l, v) {
    this.name = n;
    this.labels = l || new Map();
    this.datapoints = v || [];
  }

  /**
   * Format all datapoints to Sensision format
   * @return {string} gts datapoints
   */
  toSensisionFormat() {
    if (!this.name)
        return new Error('[Warp10] toSensisionFormat(): A GTS must have a name');
    if (!this.datapoints.length === 0)
        return new Error("[Warp10] toSensisionFormat(): Can't show GTS without datapoints");

    let labels = labelsMapToString(this.labels)
    let datapoints = [];

    for (let dp of this.datapoints) {
        let geo = "/";
        let value = (typeof dp.value === 'string') ? `'${dp.value}'`: dp.value;
        if (dp.lat && dp.long) {
            geo = `${dp.lat}:${dp.long}/${dp.alt || ''}`;
        }
        datapoints.push(`${dp.timestamp}/${geo} ${encodeURIComponent(this.name)}${labels} ${value}`);
    }

    let allPoints = datapoints.join('\n');
    /*allPoints = allPoints.replace('=', '%3D') // escape
    .replace('%3D"', '=') // remove left double quote
    .replace('\"}', '') // remove right double quote
    .replace(',', '%2C') // escape
    .replace('}', '%7D') // escape
    .replace('\\\"', '\"') // unescape
    .replace("\n", "%0A") // unescape*/
    return allPoints;
  }
}

/**
 * A Warp10 datapoint
 */
class DataPoint {

    /**
     * Datapoint constructor
     * @param {Date} timestamp Timestamp (µs)
     * @param {any} value int/float/string
     * @param {number} lat Geo position latitude
     * @param {number} long Geo position longitude
     * @param {number} alt Geo position altitude
     */
    constructor(ts, val, lat, long, alt) {
        this.timestamp = ts || Date.now();
        this.value = val || null;
        this.lat = lat || null;
        this.long = long || null;
        this.alt = alt || null;
    }
}

/**
 * A warp10 client
 */
class Warp10Client {

    /**
     * Create a client
     * @param {string} ep Ingress URL (https://127.0.0.1/api/v0/update)
     * @param {string} tokenW Your write token
     */
    constructor(ep, tokenW) {
        this.endpoint = ep;
        this.writeToken = tokenW
    }

    /**
     * Send some GTS to Warp10 platform
     * @param {GTS|GTS[]} gtss A GTS or an array of GTS
     */
    send(gtss) {
        return new Promise((resolve, reject) => {
            if (!Array.isArray(gtss)) // Force array of GTS
                gtss = [gtss];

            let body = [];
            for( let gts of gtss) {
                if (!(gts instanceof GTS))
                    reject(new Error("[Warp10] send(): some argument are not GTS"));
                body.push(gts.toSensisionFormat());
            }

            fetch(this.endpoint, {
              method: 'POST',
              body: body.join('\n'),
              headers: {
                "X-Warp10-Token": this.writeToken
              }
            })
            .then(function(res) {
                if (res.status === 200)
                  resolve()
                else
                  reject(res.statusText)
            })
            .catch(reject);
        })
    }

    /**
     * Stack GTS in queue and try to send them
     * @param {GTS|GTS[]} gtss A GTS or an array of GTS
     */
    queue(gtss) {
      this.send(gtss)
      .then(() => {
        console.log("OK!")
      })
      .catch(console.error);
    }
}

module.exports = {
    GTS,
    Warp10Client,
    DataPoint
}

/**
 * format labels
 * @param {Map<string>} m
 */
function labelsMapToString(m) {
    let labels = []
    m.forEach((val, key, m) => {
        labels.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
    });

    return `{${labels.join(',')}}`
}

