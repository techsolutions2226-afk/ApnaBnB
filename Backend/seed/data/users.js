// Mirror of client/src/data/users.js, trimmed to the fields the User schema uses.
// `id` is a stable string key used by other seed files for cross-references; it is
// translated to a Mongo ObjectId by seed.js. Passwords are plain text here — the
// User pre-save hook in models/User.js hashes them with bcrypt during insert.

module.exports = [
  // Sellers
  {
    id: "user-1",
    firstName: "Ahmad",
    lastName: "Khan",
    email: "ahmad@example.com",
    password: "password123",
    role: "seller",
    verified: { email: true, phone: true, identity: true },
  },
  {
    id: "user-6",
    firstName: "Kashif",
    lastName: "Raza",
    email: "kashif@example.com",
    password: "password123",
    role: "seller",
    verified: { email: true, phone: true, identity: true },
  },
  {
    id: "user-9",
    firstName: "Zara",
    lastName: "Sheikh",
    email: "zara@example.com",
    password: "password123",
    role: "seller",
    verified: { email: true, phone: false, identity: true },
  },

  // Buyers
  {
    id: "user-2",
    firstName: "Fatima",
    lastName: "Ali",
    email: "fatima@example.com",
    password: "password123",
    role: "buyer",
    verified: { email: true, phone: true, identity: false },
  },
  {
    id: "user-4",
    firstName: "Sara",
    lastName: "Malik",
    email: "sara@example.com",
    password: "password123",
    role: "buyer",
    verified: { email: true, phone: true, identity: true },
  },
  {
    id: "user-7",
    firstName: "Hamza",
    lastName: "Tariq",
    email: "hamza@example.com",
    password: "password123",
    role: "buyer",
    verified: { email: true, phone: true, identity: false },
  },
  {
    id: "user-10",
    firstName: "Ayesha",
    lastName: "Nawaz",
    email: "ayesha@example.com",
    password: "password123",
    role: "buyer",
    verified: { email: true, phone: true, identity: true },
  },

  // Dealers
  {
    id: "user-3",
    firstName: "Omar",
    lastName: "Siddiqui",
    email: "omar@example.com",
    password: "password123",
    role: "dealer",
    verified: { email: true, phone: false, identity: true },
  },
  {
    id: "user-5",
    firstName: "Bilal",
    lastName: "Ahmed",
    email: "bilal@example.com",
    password: "password123",
    role: "dealer",
    verified: { email: true, phone: true, identity: true },
  },
  {
    id: "user-8",
    firstName: "Nadia",
    lastName: "Hussain",
    email: "nadia@example.com",
    password: "password123",
    role: "dealer",
    verified: { email: true, phone: true, identity: true },
  },

  // Admin
  {
    id: "user-admin",
    firstName: "Admin",
    lastName: "Platform",
    email: "admin@realestate.pk",
    password: "admin123",
    role: "admin",
    verified: { email: true, phone: true, identity: true },
  },
];
