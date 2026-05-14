/* ─── Sample conversations / messages data ───
   Used by messaging system.
   Covers all 3 connection types: seller↔buyer, dealer↔buyer, dealer↔dealer.
   All participant IDs map to real users in users.js.
   All propertyIds map to real properties (lhr-*, isb-*, khi-*).
   ─────────────────────────────────────────────── */

const conversations = [
  /* ── Conv 1: Buyer (Fatima) ↔ Seller (Ahmad) about lhr-1 ── */
  {
    id: "conv-1",
    participants: ["user-2", "user-1"],
    propertyId: "lhr-1",
    type: "seller-buyer",
    lastMessage: "You're welcome! Let me know if you need anything else.",
    lastMessageAt: "2026-03-10T14:30:00",
    unread: { "user-2": 0, "user-1": 0 },
    messages: [
      {
        id: "msg-1",
        senderId: "user-2",
        text: "Hi Ahmad! I'm interested in the 10 Marla house in Gulberg III. Is it still available?",
        timestamp: "2026-03-09T10:15:00",
      },
      {
        id: "msg-2",
        senderId: "user-1",
        text: "Hello Fatima! Yes, the property is still available. Would you like to schedule a visit?",
        timestamp: "2026-03-09T10:45:00",
      },
      {
        id: "msg-3",
        senderId: "user-2",
        text: "That would be great! Can we visit this weekend? Also, is the price negotiable?",
        timestamp: "2026-03-09T11:00:00",
      },
      {
        id: "msg-4",
        senderId: "user-1",
        text: "Saturday 2 PM works for me. The listed price is 4.2 crore — there's some room for discussion for serious buyers. I'll share the documents at the visit.",
        timestamp: "2026-03-09T11:20:00",
      },
      {
        id: "msg-5",
        senderId: "user-2",
        text: "Perfect, Saturday 2 PM it is. What's the parking situation?",
        timestamp: "2026-03-09T14:00:00",
      },
      {
        id: "msg-6",
        senderId: "user-1",
        text: "There's a double-car garage plus driveway space. The property also has a servant quarter and backup power generator. I'll prepare all the ownership docs for you.",
        timestamp: "2026-03-09T14:15:00",
      },
      {
        id: "msg-7",
        senderId: "user-2",
        text: "Sounds wonderful! Thank you so much.",
        timestamp: "2026-03-10T09:00:00",
      },
      {
        id: "msg-8",
        senderId: "user-1",
        text: "You're welcome! Let me know if you need anything else.",
        timestamp: "2026-03-10T14:30:00",
      },
    ],
  },

  /* ── Conv 2: Buyer (Sara) ↔ Dealer (Bilal) about isb-5 ── */
  {
    id: "conv-2",
    participants: ["user-4", "user-5"],
    propertyId: "isb-5",
    type: "dealer-buyer",
    lastMessage: "Looking forward to helping you find the right property!",
    lastMessageAt: "2026-03-08T16:00:00",
    unread: { "user-4": 1, "user-5": 0 },
    messages: [
      {
        id: "msg-9",
        senderId: "user-4",
        text: "Hi Bilal, I saw the luxury penthouse in F-6 you listed. Quick question — is the rooftop terrace included in the sale?",
        timestamp: "2026-03-07T18:00:00",
      },
      {
        id: "msg-10",
        senderId: "user-5",
        text: "Hi Sara! Yes, the rooftop terrace is an exclusive part of the penthouse. The view of Margalla Hills from there is incredible. Would you like to visit?",
        timestamp: "2026-03-07T18:30:00",
      },
      {
        id: "msg-11",
        senderId: "user-4",
        text: "Definitely! Also, what's the current asking price and are there any similar options you'd recommend?",
        timestamp: "2026-03-07T19:00:00",
      },
      {
        id: "msg-12",
        senderId: "user-5",
        text: "The asking price is 8.5 crore. I also have a few other premium options in F-6 and F-7 if you'd like to compare. I can arrange visits to all of them on the same day.",
        timestamp: "2026-03-07T19:20:00",
      },
      {
        id: "msg-13",
        senderId: "user-4",
        text: "That would be really helpful. Let me check my schedule and get back to you.",
        timestamp: "2026-03-08T10:00:00",
      },
      {
        id: "msg-14",
        senderId: "user-5",
        text: "Looking forward to helping you find the right property!",
        timestamp: "2026-03-08T16:00:00",
      },
    ],
  },

  /* ── Conv 3: Dealer (Omar) ↔ Dealer (Nadia) co-brokering khi-4 ── */
  {
    id: "conv-3",
    participants: ["user-3", "user-8"],
    propertyId: "khi-4",
    type: "dealer-dealer",
    lastMessage: "Great, I'll prepare the co-brokering agreement. Talk soon!",
    lastMessageAt: "2026-03-11T22:15:00",
    unread: { "user-3": 0, "user-8": 2 },
    messages: [
      {
        id: "msg-15",
        senderId: "user-8",
        text: "Hi Omar! I have a client from Lahore looking for a 2 bed flat in Karachi near Saddar. I saw your listing for khi-4 — is it still on the market?",
        timestamp: "2026-03-10T08:00:00",
      },
      {
        id: "msg-16",
        senderId: "user-3",
        text: "Hey Nadia! Yes, that flat is still available. It's a solid 2 bed in North Nazimabad. My client is asking 1.8 crore but there's room to negotiate. Standard 1% co-brokering commission?",
        timestamp: "2026-03-10T09:00:00",
      },
      {
        id: "msg-17",
        senderId: "user-8",
        text: "1% works. Can we schedule a visit for my client? They'll be in Karachi next Thursday.",
        timestamp: "2026-03-10T12:30:00",
      },
      {
        id: "msg-18",
        senderId: "user-3",
        text: "Thursday works. I'll coordinate with the owner and confirm a time slot. I'll also prepare the title documents for review.",
        timestamp: "2026-03-10T13:00:00",
      },
      {
        id: "msg-19",
        senderId: "user-8",
        text: "Perfect. Also, do you have any plots available in Scheme 33? My client might be interested in land too.",
        timestamp: "2026-03-11T15:00:00",
      },
      {
        id: "msg-20",
        senderId: "user-3",
        text: "I have two plots coming up in Scheme 33 next month — both 5 Marla, clear titles. I'll share details once the listings go live.",
        timestamp: "2026-03-11T15:30:00",
      },
      {
        id: "msg-21",
        senderId: "user-8",
        text: "Excellent! Let's finalize the flat visit first and then discuss the plots.",
        timestamp: "2026-03-11T20:00:00",
      },
      {
        id: "msg-22",
        senderId: "user-3",
        text: "Great, I'll prepare the co-brokering agreement. Talk soon!",
        timestamp: "2026-03-11T22:15:00",
      },
    ],
  },

  /* ── Conv 4: Buyer (Hamza) ↔ Seller (Zara) about khi-1 ── */
  {
    id: "conv-4",
    participants: ["user-7", "user-9"],
    propertyId: "khi-1",
    type: "seller-buyer",
    lastMessage: "I'll send the floor plan PDF shortly.",
    lastMessageAt: "2026-03-12T11:00:00",
    unread: { "user-7": 1, "user-9": 0 },
    messages: [
      {
        id: "msg-23",
        senderId: "user-7",
        text: "Hi Zara! I'm a first-time buyer and very interested in the Clifton apartment. Could you tell me about the documentation process?",
        timestamp: "2026-03-12T09:00:00",
      },
      {
        id: "msg-24",
        senderId: "user-9",
        text: "Hi Hamza! Congrats on your first purchase journey. The flat has a clear freehold title. I can share all the documents — NOC, title deed, and building approval — during the visit.",
        timestamp: "2026-03-12T09:30:00",
      },
      {
        id: "msg-25",
        senderId: "user-7",
        text: "That's reassuring. What's the total area and is there a floor plan available?",
        timestamp: "2026-03-12T10:00:00",
      },
      {
        id: "msg-26",
        senderId: "user-9",
        text: "I'll send the floor plan PDF shortly.",
        timestamp: "2026-03-12T11:00:00",
      },
    ],
  },

  /* ── Conv 5: Buyer (Ayesha) ↔ Dealer (Nadia) about lhr-3 ── */
  {
    id: "conv-5",
    participants: ["user-10", "user-8"],
    propertyId: "lhr-3",
    type: "dealer-buyer",
    lastMessage: "I have 3 more options in Johar Town I can show you.",
    lastMessageAt: "2026-03-13T14:00:00",
    unread: { "user-10": 1, "user-8": 0 },
    messages: [
      {
        id: "msg-27",
        senderId: "user-10",
        text: "Hi Nadia, I'm looking for investment properties in Lahore under 3 crore. Can you help?",
        timestamp: "2026-03-13T10:00:00",
      },
      {
        id: "msg-28",
        senderId: "user-8",
        text: "Absolutely Ayesha! I specialize in DHA and Johar Town. Based on your budget, I have some great 5-7 Marla options with good rental yield potential.",
        timestamp: "2026-03-13T10:30:00",
      },
      {
        id: "msg-29",
        senderId: "user-10",
        text: "Johar Town sounds interesting. What's the expected rental yield?",
        timestamp: "2026-03-13T11:00:00",
      },
      {
        id: "msg-30",
        senderId: "user-8",
        text: "I have 3 more options in Johar Town I can show you.",
        timestamp: "2026-03-13T14:00:00",
      },
    ],
  },
];

export const getConversationsByUserId = (userId) =>
  conversations.filter((c) => c.participants.includes(userId));

export const getConversationById = (id) =>
  conversations.find((c) => c.id === id) || null;

export const getUnreadCount = (userId) =>
  conversations
    .filter((c) => c.participants.includes(userId))
    .reduce((sum, c) => sum + (c.unread?.[userId] || 0), 0);

export default conversations;
