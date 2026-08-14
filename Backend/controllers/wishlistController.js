const prisma = require('../db/prisma');

// Make sure the caller has at least the default "Saved" wishlist. Returns
// the list of all the user's wishlists.
const ensureDefaultAndList = async (userId) => {
  let lists = await prisma.wishlist.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  if (lists.length === 0) {
    const def = await prisma.wishlist.create({
      data: { userId, name: 'Saved', isDefault: true, propertyIds: [] },
    });
    lists = [def];
  }
  return lists;
};

// GET /api/wishlists — all wishlists for the authenticated user
const getMyWishlists = async (req, res, next) => {
  try {
    const lists = await ensureDefaultAndList(req.user.id);
    res.status(200).json(lists);
  } catch (error) {
    next(error);
  }
};

// POST /api/wishlists — create a new (non-default) wishlist
const createWishlist = async (req, res, next) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required.' });
  }
  try {
    const wishlist = await prisma.wishlist.create({
      data: { userId: req.user.id, name: name.trim(), isDefault: false, propertyIds: [] },
    });
    res.status(201).json(wishlist);
  } catch (error) {
    next(error);
  }
};

// PUT /api/wishlists/:id — rename a wishlist (allowed even for default)
const updateWishlist = async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required.' });
  }
  try {
    const result = await prisma.wishlist.updateMany({
      where: { id, userId: req.user.id },
      data: { name: name.trim() },
    });
    if (result.count === 0) {
      return res.status(404).json({ message: 'Wishlist not found.' });
    }
    const wishlist = await prisma.wishlist.findUnique({ where: { id } });
    res.status(200).json(wishlist);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/wishlists/:id — delete a wishlist (default cannot be deleted)
const deleteWishlist = async (req, res, next) => {
  const { id } = req.params;
  try {
    const wishlist = await prisma.wishlist.findFirst({ where: { id, userId: req.user.id } });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found.' });
    }
    if (wishlist.isDefault) {
      return res.status(400).json({ message: 'The default wishlist cannot be deleted.' });
    }
    await prisma.wishlist.delete({ where: { id } });
    res.status(200).json({ message: 'Wishlist deleted.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/wishlists/:id/properties — add a property to a wishlist
const addProperty = async (req, res, next) => {
  const { id } = req.params;
  const { propertyId } = req.body;
  if (!propertyId) {
    return res.status(400).json({ message: 'propertyId is required.' });
  }
  try {
    const wishlist = await prisma.wishlist.findFirst({ where: { id, userId: req.user.id } });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found.' });
    }
    // $addToSet — only push if not already present.
    if (!wishlist.propertyIds.includes(propertyId)) {
      const updated = await prisma.wishlist.update({
        where: { id },
        data: { propertyIds: { push: propertyId } },
      });
      return res.status(200).json(updated);
    }
    res.status(200).json(wishlist);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/wishlists/:id/properties/:propertyId — remove from one list
const removeProperty = async (req, res, next) => {
  const { id, propertyId } = req.params;
  try {
    const wishlist = await prisma.wishlist.findFirst({ where: { id, userId: req.user.id } });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found.' });
    }
    const updated = await prisma.wishlist.update({
      where: { id },
      data: { propertyIds: { set: wishlist.propertyIds.filter((p) => p !== propertyId) } },
    });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/wishlists/properties/:propertyId — remove from all the user's lists
const removeFromAll = async (req, res, next) => {
  const { propertyId } = req.params;
  try {
    const lists = await prisma.wishlist.findMany({ where: { userId: req.user.id } });
    await Promise.all(
      lists
        .filter((l) => l.propertyIds.includes(propertyId))
        .map((l) =>
          prisma.wishlist.update({
            where: { id: l.id },
            data: { propertyIds: { set: l.propertyIds.filter((p) => p !== propertyId) } },
          }),
        ),
    );
    const updated = await ensureDefaultAndList(req.user.id);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
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
