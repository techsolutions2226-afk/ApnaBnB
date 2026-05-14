/* ─── Shared experiences data ───
   Used by the Experiences page.
   When the backend is ready, replace this with API calls.
   ─────────────────────────────────────────────── */

/* ─── Category filters ─── */
export const categories = [
  { id: "all", label: "All", icon: "🌍" },
  { id: "food", label: "Food & drink", icon: "🍷" },
  { id: "art", label: "Art & culture", icon: "🎨" },
  { id: "nature", label: "Nature & outdoors", icon: "🌿" },
  { id: "sports", label: "Sports", icon: "⚽" },
  { id: "wellness", label: "Wellness", icon: "🧘" },
  { id: "music", label: "Music", icon: "🎵" },
  { id: "history", label: "History", icon: "🏛️" },
  { id: "nightlife", label: "Nightlife", icon: "🌙" },
  { id: "photography", label: "Photography", icon: "📸" },
];

/* ─── Experience cards ─── */
const experiences = [
  {
    id: "exp-1",
    title: "Lahore Food Walk: Street Food Tour",
    category: "food",
    image:
      "https://images.unsplash.com/photo-1567337710282-00832b415979?w=600&q=80",
    location: "Lahore, Pakistan",
    rating: 4.97,
    reviews: 312,
    price: 15,
    duration: "3 hours",
    host: {
      name: "Hassan",
      image: "https://i.pravatar.cc/150?u=hassan-exp",
    },
    isOnline: false,
    isBestseller: true,
    description:
      "Explore the vibrant street food scene of old Lahore. Taste authentic dishes from hidden gems known only to locals.",
    maxGroupSize: 10,
    languages: ["English", "Urdu"],
    includes: ["Food tastings", "Drinks", "Guide"],
  },
  {
    id: "exp-2",
    title: "Mughal Heritage Walking Tour",
    category: "history",
    image:
      "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80",
    location: "Lahore, Pakistan",
    rating: 4.93,
    reviews: 187,
    price: 20,
    duration: "4 hours",
    host: {
      name: "Fatima",
      image: "https://i.pravatar.cc/150?u=fatima-exp",
    },
    isOnline: false,
    isBestseller: true,
    description:
      "Walk through centuries of Mughal history visiting the Badshahi Mosque, Lahore Fort, and the walled city with a certified heritage guide.",
    maxGroupSize: 15,
    languages: ["English", "Urdu", "Punjabi"],
    includes: ["Entry tickets", "Guide", "Bottled water"],
  },
  {
    id: "exp-3",
    title: "Pottery & Ceramics Workshop",
    category: "art",
    image:
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80",
    location: "Islamabad, Pakistan",
    rating: 4.89,
    reviews: 96,
    price: 25,
    duration: "2.5 hours",
    host: {
      name: "Zara",
      image: "https://i.pravatar.cc/150?u=zara-exp",
    },
    isOnline: false,
    isBestseller: false,
    description:
      "Get your hands dirty in this fun pottery session. Learn traditional techniques and take home your own handmade piece.",
    maxGroupSize: 8,
    languages: ["English", "Urdu"],
    includes: [
      "All materials",
      "Firing & glazing",
      "Your creation to take home",
    ],
  },
  {
    id: "exp-4",
    title: "Sunset Hike at Margalla Hills",
    category: "nature",
    image:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80",
    location: "Islamabad, Pakistan",
    rating: 4.95,
    reviews: 234,
    price: 12,
    duration: "3 hours",
    host: {
      name: "Omar",
      image: "https://i.pravatar.cc/150?u=omar-exp",
    },
    isOnline: false,
    isBestseller: true,
    description:
      "Hike to the summit of Trail 3 in Margalla Hills for a breathtaking sunset panorama of Islamabad. Suitable for all fitness levels.",
    maxGroupSize: 12,
    languages: ["English", "Urdu"],
    includes: ["Guide", "Snacks", "Bottled water"],
  },
  {
    id: "exp-5",
    title: "Cricket Coaching with a Pro",
    category: "sports",
    image:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=80",
    location: "Karachi, Pakistan",
    rating: 4.91,
    reviews: 78,
    price: 30,
    duration: "2 hours",
    host: {
      name: "Bilal",
      image: "https://i.pravatar.cc/150?u=bilal-exp",
    },
    isOnline: false,
    isBestseller: false,
    description:
      "Learn batting and bowling techniques from a former first-class cricketer. Equipment provided. All skill levels welcome.",
    maxGroupSize: 6,
    languages: ["English", "Urdu"],
    includes: ["Equipment", "Coach", "Refreshments"],
  },
  {
    id: "exp-6",
    title: "Yoga & Meditation Retreat",
    category: "wellness",
    image:
      "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80",
    location: "Islamabad, Pakistan",
    rating: 4.98,
    reviews: 156,
    price: 18,
    duration: "2 hours",
    host: {
      name: "Ayesha",
      image: "https://i.pravatar.cc/150?u=ayesha-exp",
    },
    isOnline: true,
    isBestseller: true,
    description:
      "Find your inner peace with a guided yoga and meditation session in the serene surroundings of the Margalla foothills.",
    maxGroupSize: 20,
    languages: ["English", "Urdu", "Hindi"],
    includes: ["Yoga mat", "Herbal tea", "Guided meditation"],
  },
  {
    id: "exp-7",
    title: "Sufi Music Night",
    category: "music",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80",
    location: "Lahore, Pakistan",
    rating: 4.96,
    reviews: 203,
    price: 22,
    duration: "3 hours",
    host: {
      name: "Usman",
      image: "https://i.pravatar.cc/150?u=usman-exp",
    },
    isOnline: false,
    isBestseller: true,
    description:
      "Experience the soul-stirring sounds of Sufi qawwali music at a historic shrine. Includes dinner with traditional Pakistani cuisine.",
    maxGroupSize: 25,
    languages: ["English", "Urdu", "Punjabi"],
    includes: ["Live performance", "Dinner", "Guide"],
  },
  {
    id: "exp-8",
    title: "Karachi Street Art & Graffiti Tour",
    category: "art",
    image:
      "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=600&q=80",
    location: "Karachi, Pakistan",
    rating: 4.85,
    reviews: 64,
    price: 14,
    duration: "2 hours",
    host: {
      name: "Sana",
      image: "https://i.pravatar.cc/150?u=sana-exp",
    },
    isOnline: false,
    isBestseller: false,
    description:
      "Discover Karachi's vibrant street art scene. Visit murals, meet local artists, and learn about the stories behind the art.",
    maxGroupSize: 10,
    languages: ["English", "Urdu"],
    includes: ["Guide", "Snacks"],
  },
  {
    id: "exp-9",
    title: "Night Photography Walk",
    category: "photography",
    image:
      "https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?w=600&q=80",
    location: "Lahore, Pakistan",
    rating: 4.88,
    reviews: 45,
    price: 28,
    duration: "2.5 hours",
    host: {
      name: "Ali",
      image: "https://i.pravatar.cc/150?u=ali-exp",
    },
    isOnline: false,
    isBestseller: false,
    description:
      "Capture the beauty of Lahore at night. Learn long exposure, light trails, and night photography techniques with a professional photographer.",
    maxGroupSize: 8,
    languages: ["English", "Urdu"],
    includes: ["Photography tips", "Editing session", "Tea break"],
  },
  {
    id: "exp-10",
    title: "Rooftop BBQ Night Experience",
    category: "nightlife",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
    location: "Karachi, Pakistan",
    rating: 4.92,
    reviews: 128,
    price: 35,
    duration: "4 hours",
    host: {
      name: "Kashif",
      image: "https://i.pravatar.cc/150?u=kashif-exp",
    },
    isOnline: false,
    isBestseller: true,
    description:
      "Enjoy a spectacular rooftop BBQ with panoramic city views. Live music, grilled specialties, and great company under the stars.",
    maxGroupSize: 20,
    languages: ["English", "Urdu"],
    includes: ["BBQ dinner", "Drinks", "Live music"],
  },
  {
    id: "exp-11",
    title: "Traditional Cooking Class",
    category: "food",
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=80",
    location: "Islamabad, Pakistan",
    rating: 4.94,
    reviews: 176,
    price: 32,
    duration: "3.5 hours",
    host: {
      name: "Nadia",
      image: "https://i.pravatar.cc/150?u=nadia-exp",
    },
    isOnline: true,
    isBestseller: false,
    description:
      "Learn to cook authentic Pakistani dishes — biryani, seekh kebabs, and naan — from scratch in a warm home kitchen setting.",
    maxGroupSize: 8,
    languages: ["English", "Urdu"],
    includes: ["All ingredients", "Recipe cards", "Full meal"],
  },
  {
    id: "exp-12",
    title: "Desert Safari & Camel Ride",
    category: "nature",
    image:
      "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=600&q=80",
    location: "Thar, Pakistan",
    rating: 4.87,
    reviews: 92,
    price: 45,
    duration: "6 hours",
    host: {
      name: "Raheem",
      image: "https://i.pravatar.cc/150?u=raheem-exp",
    },
    isOnline: false,
    isBestseller: false,
    description:
      "Journey into the golden Thar desert for a camel ride, traditional Thari lunch, and an unforgettable sunset over the sand dunes.",
    maxGroupSize: 10,
    languages: ["English", "Urdu", "Sindhi"],
    includes: ["Transport", "Camel ride", "Lunch", "Guide"],
  },
  {
    id: "exp-13",
    title: "Calligraphy & Islamic Art Workshop",
    category: "art",
    image:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80",
    location: "Lahore, Pakistan",
    rating: 4.9,
    reviews: 58,
    price: 20,
    duration: "2 hours",
    host: {
      name: "Tariq",
      image: "https://i.pravatar.cc/150?u=tariq-exp",
    },
    isOnline: true,
    isBestseller: false,
    description:
      "Learn the art of Arabic calligraphy and Islamic geometric patterns. Take home your own framed artwork as a memento.",
    maxGroupSize: 10,
    languages: ["English", "Urdu", "Arabic"],
    includes: ["All materials", "Framed artwork", "Tea"],
  },
  {
    id: "exp-14",
    title: "Dubai City Lights Night Tour",
    category: "nightlife",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80",
    location: "Dubai, UAE",
    rating: 4.96,
    reviews: 445,
    price: 55,
    duration: "4 hours",
    host: {
      name: "Khalid",
      image: "https://i.pravatar.cc/150?u=khalid-exp",
    },
    isOnline: false,
    isBestseller: true,
    description:
      "See Dubai at its most dazzling. Visit the Burj Khalifa light show, cruise Dubai Marina, and explore the vibrant JBR Walk.",
    maxGroupSize: 15,
    languages: ["English", "Arabic"],
    includes: ["Transport", "Guide", "Dinner"],
  },
  {
    id: "exp-15",
    title: "Spice Market & Tea Tasting",
    category: "food",
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80",
    location: "Karachi, Pakistan",
    rating: 4.86,
    reviews: 73,
    price: 16,
    duration: "2 hours",
    host: {
      name: "Imran",
      image: "https://i.pravatar.cc/150?u=imran-exp",
    },
    isOnline: false,
    isBestseller: false,
    description:
      "Explore the aromatic spice bazaars of Karachi. Learn about exotic spices, sample artisanal teas, and take home a spice kit.",
    maxGroupSize: 8,
    languages: ["English", "Urdu"],
    includes: ["Spice samples", "Tea tasting", "Spice kit"],
  },
  {
    id: "exp-16",
    title: "Mountain Biking in Margalla",
    category: "sports",
    image:
      "https://images.unsplash.com/photo-1544191696-102dbdaeeaa0?w=600&q=80",
    location: "Islamabad, Pakistan",
    rating: 4.82,
    reviews: 41,
    price: 35,
    duration: "3 hours",
    host: {
      name: "Danish",
      image: "https://i.pravatar.cc/150?u=danish-exp",
    },
    isOnline: false,
    isBestseller: false,
    description:
      "Ride through scenic mountain trails with an experienced guide. Bikes and safety gear included. Moderate fitness required.",
    maxGroupSize: 6,
    languages: ["English", "Urdu"],
    includes: ["Mountain bike", "Helmet", "Guide", "Snacks"],
  },
];

export default experiences;

/* ─── Helper: get experience by ID ─── */
export const getExperienceById = (id) =>
  experiences.find((e) => e.id === id) || null;
