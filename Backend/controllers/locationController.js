const { detectLocation, describeRequestIp } = require('../utils/ipGeolocation');

// GET /api/location/detect — approximate visitor location from the request IP.
// Public and identical for guests and signed-in users. Always 200: "not
// detected" is an ordinary answer (local/private IP, provider down), not an
// error the client has to handle. The IP itself is never in the body.
//
// ?debug=1 adds `diagnostics`: whether the address the server sees is a real
// public one and whether the proxy is trusted — enough to tell "wrong IP" from
// "wrong ordering" without ever exposing the address itself.
const getDetectedLocation = async (req, res, next) => {
  try {
    const geo = await detectLocation(req);
    const body = geo
      ? { detected: true, source: 'ip', approximate: true, ...geo }
      : { detected: false, source: 'ip' };

    if (req.query.debug === '1') body.diagnostics = describeRequestIp(req);

    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
};

module.exports = { getDetectedLocation };
