const Wishlist = require('../models/Wishlist');

// Make sure the caller has at least the default "Saved" wishlist. Returns
// the list of all the user's wishlists.
const ensureDefaultAndList = async (userId) => {
  let lists = await Wishlist.find({ user: userId }).sort({ createdAt: 1 });
  if (lists.length === 0) {
    const def = await Wishlist.create({
      user: userId,
      name: 'Saved',
      isDefault: true,
      propertyIds: [],
    });
    lists = [def];
  }
  return lists;
};

// GET /api/wishlists â€” all wishlists for the authenticated user
const getMyWishlists = async (req, res) => {
  try {
    const lists = await ensureDefaultAndList(req.user.id);
    res.status(200).json(lists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/wishlists â€” create a new (non-default) wishlist
const createWishlist = async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required.' });
  }
  try {
    const wishlist = await Wishlist.create({
      user: req.user.id,
      name: name.trim(),
      isDefault: false,
      propertyIds: [],
    });
    res.status(201).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/wishlists/:id â€” rename a wishlist (allowed even for default)
const updateWishlist = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required.' });
  }
  try {
    const wishlist = await Wishlist.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { name: name.trim() },
      { returnDocument: 'after' }
    );
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found.' });
    }
    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/wishlists/:id â€” delete a wishlist (default cannot be deleted)
const deleteWishlist = async (req, res) => {
  const { id } = req.params;
  try {
    const wishlist = await Wishlist.findOne({ _id: id, user: req.user.id });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found.' });
    }
    if (wishlist.isDefault) {
      return res
        .status(400)
        .json({ message: 'The default wishlist cannot be deleted.' });
    }
    await wishlist.deleteOne();
    res.status(200).json({ message: 'Wishlist deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/wishlists/:id/properties â€” add a property to a wishlist
const addProperty = async (req, res) => {
  const { id } = req.params;
  const { propertyId } = req.body;
  if (!propertyId) {
    return res.status(400).json({ message: 'propertyId is required.' });
  }
  try {
    const wishlist = await Wishlist.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { $addToSet: { propertyIds: propertyId } },
      { returnDocument: 'after' }
    );
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found.' });
    }
    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/wishlists/:id/properties/:propertyId â€” remove from one list
const removeProperty = async (req, res) => {
  const { id, propertyId } = req.params;
  try {
    const wishlist = await Wishlist.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { $pull: { propertyIds: propertyId } },
      { returnDocument: 'after' }
    );
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found.' });
    }
    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/wishlists/properties/:propertyId â€” remove from all the user's lists
const removeFromAll = async (req, res) => {
  const { propertyId } = req.params;
  try {
    await Wishlist.updateMany(
      { user: req.user.id },
      { $pull: { propertyIds: propertyId } }
    );
    const lists = await ensureDefaultAndList(req.user.id);
    res.status(200).json(lists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyWishlists,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  addProperty,
  removeProperty,
  removeFromAll,
};
