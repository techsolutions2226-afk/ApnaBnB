// Mirror of client/src/data/listings.js. The Listing schema has no `featured`
// field — when `featured: true` the seed script promotes status to "featured"
// instead. Sold listings keep status "sold" regardless of `featured`.

module.exports = [
  // Lahore
  { id: "list-1",  ownerId: "user-1", propertyId: "lhr-1", status: "active", featured: true,  views: 842,  inquiries: 18 },
  { id: "list-2",  ownerId: "user-1", propertyId: "lhr-2", status: "active", featured: true,  views: 620,  inquiries: 14 },
  { id: "list-3",  ownerId: "user-8", propertyId: "lhr-3", status: "active", featured: false, views: 385,  inquiries: 7 },
  { id: "list-4",  ownerId: "user-8", propertyId: "lhr-4", status: "active", featured: false, views: 210,  inquiries: 4 },
  { id: "list-5",  ownerId: "user-1", propertyId: "lhr-5", status: "sold",   featured: false, views: 950,  inquiries: 22 },
  { id: "list-6",  ownerId: "user-8", propertyId: "lhr-6", status: "active", featured: true,  views: 530,  inquiries: 11 },
  { id: "list-7",  ownerId: "user-1", propertyId: "lhr-7", status: "active", featured: true,  views: 1100, inquiries: 28 },

  // Islamabad
  { id: "list-8",  ownerId: "user-6", propertyId: "isb-1", status: "active", featured: false, views: 445,  inquiries: 9 },
  { id: "list-9",  ownerId: "user-6", propertyId: "isb-2", status: "active", featured: false, views: 320,  inquiries: 6 },
  { id: "list-10", ownerId: "user-6", propertyId: "isb-3", status: "active", featured: false, views: 280,  inquiries: 5 },
  { id: "list-11", ownerId: "user-5", propertyId: "isb-4", status: "active", featured: false, views: 190,  inquiries: 3 },
  { id: "list-12", ownerId: "user-5", propertyId: "isb-5", status: "active", featured: true,  views: 1280, inquiries: 24 },
  { id: "list-13", ownerId: "user-6", propertyId: "isb-6", status: "active", featured: false, views: 340,  inquiries: 8 },
  { id: "list-14", ownerId: "user-5", propertyId: "isb-7", status: "active", featured: true,  views: 780,  inquiries: 16 },

  // Karachi
  { id: "list-15", ownerId: "user-9", propertyId: "khi-1", status: "active", featured: true,  views: 920,  inquiries: 20 },
  { id: "list-16", ownerId: "user-9", propertyId: "khi-2", status: "active", featured: false, views: 260,  inquiries: 5 },
  { id: "list-17", ownerId: "user-3", propertyId: "khi-3", status: "active", featured: false, views: 175,  inquiries: 3 },
  { id: "list-18", ownerId: "user-3", propertyId: "khi-4", status: "active", featured: false, views: 420,  inquiries: 9 },
  { id: "list-19", ownerId: "user-9", propertyId: "khi-5", status: "sold",   featured: false, views: 680,  inquiries: 15 },
  { id: "list-20", ownerId: "user-3", propertyId: "khi-6", status: "active", featured: false, views: 310,  inquiries: 7 },
];
