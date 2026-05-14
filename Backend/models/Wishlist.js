const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    propertyIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],
    // Marks the auto-created "Saved" list each user gets. Default lists
    // cannot be deleted; clients can still rename them.
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Wishlist = mongoose.model('Wishlist', WishlistSchema);
module.exports = Wishlist;
