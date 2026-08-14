// Shared personal-information filter used by BOTH the REST message controller
// and the Socket.IO messsage path — one source of truth so the two transports
// can never drift apart (a socket bypass must not be able to leak phone
// numbers, emails, or web URLs that the REST endpoint would have stripped).
const personalInfoRegex =
  /(\d{10,}|\+[0-9]{1,4}[- .]?\d{6,}|\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6}|(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9._-]+\.[a-zA-Z]{2,6})/g;

const filterPersonalInfo = (text) =>
  String(text || '').replace(personalInfoRegex, '[filtered]');

module.exports = { personalInfoRegex, filterPersonalInfo };