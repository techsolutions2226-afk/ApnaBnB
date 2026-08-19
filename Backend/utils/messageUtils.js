// Shared message shape for REST + socket layers so the payload is identical
// everywhere. Content is stored encrypted; this decrypts it for the wire and
// pulls in the parts the UI needs (sender, quoted reply, property card).

const { decryptMessage } = require('./messageCrypto');

const senderSelect = {
  select: { id: true, name: true, email: true, role: true, avatar: true },
};

const propertySummary = {
  select: {
    id: true,
    title: true,
    photos: true,
    price: true,
    purpose: true,
    category: true,
    propertyType: true,
    location: true,
    status: true,
    size: true,
    sizeUnit: true,
    bedrooms: true,
    bathrooms: true,
  },
};

// include used by every query that returns messages to the API/socket.
const messageInclude = {
  sender: senderSelect,
  parent: { include: { sender: senderSelect } },
  property: propertySummary,
};

// Decrypt + shape a stored message for the wire.
const serializeMessage = (msg) => {
  if (!msg) return null;
  const { content, parent, ...rest } = msg;
  const out = { ...rest, content: decryptMessage(content) };
  if (parent) out.parent = serializeMessage(parent);
  return out;
};

module.exports = { senderSelect, propertySummary, messageInclude, serializeMessage };