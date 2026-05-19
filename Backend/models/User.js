const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['seller', 'buyer', 'dealer', 'admin'], required: true },
  verified: { type: Boolean, default: false },
  avatar: { type: String, default: '' },

  // Personal info — editable from the Personal Info page.
  phone: { type: String, default: '' },
  location: { type: String, default: '' },           // street address / city
  emergencyContact: { type: String, default: '' },

  // Email-verification OTP (hashed). Cleared once the user verifies.
  otpHash: { type: String, default: null, select: false },
  otpExpiresAt: { type: Date, default: null, select: false },
  otpAttempts: { type: Number, default: 0, select: false },
  otpLastSentAt: { type: Date, default: null, select: false },

  // Forgot-password token (sha256-hashed). Cleared after a successful reset.
  resetPasswordTokenHash: { type: String, default: null, select: false },
  resetPasswordExpiresAt: { type: Date, default: null, select: false },
  resetPasswordLastSentAt: { type: Date, default: null, select: false },
}, { timestamps: true });

// Hash the password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password for login
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', UserSchema);
module.exports = User;