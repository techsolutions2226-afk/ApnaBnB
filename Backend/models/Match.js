const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  // The property being matched
  property: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property', 
    required: true 
  },
  // The requirement being matched
  requirement: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Requirement', 
    required: true 
  },
  // Who initiated the match
  initiator: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // Match score (0-100)
  score: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100 
  },
  // Match type
  type: { 
    type: String, 
    enum: ['seller-buyer', 'dealer-buyer', 'dealer-dealer'], 
    required: true 
  },
  // Status of the match
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'closed'], 
    default: 'pending' 
  },
  // Notes or comments
  notes: {
    type: String,
    default: ''
  },
  // Commission/payment info for dealer-dealer matches
  commission: {
    amount: Number,
    currency: { type: String, default: 'PKR' },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' }
  }
}, { timestamps: true });

// Index for faster queries
MatchSchema.index({ property: 1, requirement: 1 });
MatchSchema.index({ initiator: 1 });
MatchSchema.index({ type: 1, status: 1 });

const Match = mongoose.model('Match', MatchSchema);
module.exports = Match;