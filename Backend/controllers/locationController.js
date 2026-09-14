const { detectLocation } = require('../utils/ipGeolocation');

// GET /api/location/detect — approximate visitor location from the request IP.
// Public and identical for guests and signed-in users. Always 200: "not
// detected" is an ordinary answer (local/private IP, provider down), not an
// error the client has to handle. The IP itself is never in the body.
const getDetectedLocation = async (req, res, next) => {
  try {
    const geo = await detectLocation(req);
    if (!geo) {
      return res.status(200).json({ detected: false, source: 'ip' });
    }
    res.status(200).json({ detected: true, source: 'ip', approximate: true, ...geo });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDetectedLocation };
