const crypto = require('crypto');
const signing_secret = process.env.SIGNING_SECRET;

module.exports = function verifySignature(req, res, buf) {
  // Concatenate the raw body, timestamp and version number together
  const sig_basestring = 'v0:' + req.headers['x-slack-request-timestamp'] + ':' + buf.toString();

  // Create Hmac
  const my_signature = 'v0=' + crypto.createHmac('sha256', signing_secret).update(sig_basestring).digest('hex');

  // Compare the signatures. Buffers must be used in the timingSafeEqual function.
  try {
    req.valid = crypto.timingSafeEqual(
      Buffer.from(my_signature, 'utf-8'),
      Buffer.from(req.headers['x-slack-signature'], 'utf-8')
    );
  } catch (error) {
    req.valid = false;
  }
  return req.valid;
};
