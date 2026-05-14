// Mirror of client/src/data/conversations.js. The Conversation model only carries
// participants + archived; everything else (propertyId, type, lastMessage, unread)
// is dropped. Embedded messages are extracted into separate Message documents by
// the seed script. `text` becomes Message.content.

module.exports = [
  {
    id: "conv-1",
    participants: ["user-2", "user-1"],
    messages: [
      { senderId: "user-2", text: "Hi Ahmad! I'm interested in the 10 Marla house in Gulberg III. Is it still available?" },
      { senderId: "user-1", text: "Hello Fatima! Yes, the property is still available. Would you like to schedule a visit?" },
      { senderId: "user-2", text: "That would be great! Can we visit this weekend? Also, is the price negotiable?" },
      { senderId: "user-1", text: "Saturday 2 PM works for me. The listed price is 4.2 crore — there's some room for discussion for serious buyers. I'll share the documents at the visit." },
      { senderId: "user-2", text: "Perfect, Saturday 2 PM it is. What's the parking situation?" },
      { senderId: "user-1", text: "There's a double-car garage plus driveway space. The property also has a servant quarter and backup power generator. I'll prepare all the ownership docs for you." },
      { senderId: "user-2", text: "Sounds wonderful! Thank you so much." },
      { senderId: "user-1", text: "You're welcome! Let me know if you need anything else." },
    ],
  },
  {
    id: "conv-2",
    participants: ["user-4", "user-5"],
    messages: [
      { senderId: "user-4", text: "Hi Bilal, I saw the luxury penthouse in F-6 you listed. Quick question — is the rooftop terrace included in the sale?" },
      { senderId: "user-5", text: "Hi Sara! Yes, the rooftop terrace is an exclusive part of the penthouse. The view of Margalla Hills from there is incredible. Would you like to visit?" },
      { senderId: "user-4", text: "Definitely! Also, what's the current asking price and are there any similar options you'd recommend?" },
      { senderId: "user-5", text: "The asking price is 8.5 crore. I also have a few other premium options in F-6 and F-7 if you'd like to compare. I can arrange visits to all of them on the same day." },
      { senderId: "user-4", text: "That would be really helpful. Let me check my schedule and get back to you." },
      { senderId: "user-5", text: "Looking forward to helping you find the right property!" },
    ],
  },
  {
    id: "conv-3",
    participants: ["user-3", "user-8"],
    messages: [
      { senderId: "user-8", text: "Hi Omar! I have a client from Lahore looking for a 2 bed flat in Karachi near Saddar. I saw your listing for khi-4 — is it still on the market?" },
      { senderId: "user-3", text: "Hey Nadia! Yes, that flat is still available. It's a solid 2 bed in North Nazimabad. My client is asking 1.8 crore but there's room to negotiate. Standard 1% co-brokering commission?" },
      { senderId: "user-8", text: "1% works. Can we schedule a visit for my client? They'll be in Karachi next Thursday." },
      { senderId: "user-3", text: "Thursday works. I'll coordinate with the owner and confirm a time slot. I'll also prepare the title documents for review." },
      { senderId: "user-8", text: "Perfect. Also, do you have any plots available in Scheme 33? My client might be interested in land too." },
      { senderId: "user-3", text: "I have two plots coming up in Scheme 33 next month — both 5 Marla, clear titles. I'll share details once the listings go live." },
      { senderId: "user-8", text: "Excellent! Let's finalize the flat visit first and then discuss the plots." },
      { senderId: "user-3", text: "Great, I'll prepare the co-brokering agreement. Talk soon!" },
    ],
  },
  {
    id: "conv-4",
    participants: ["user-7", "user-9"],
    messages: [
      { senderId: "user-7", text: "Hi Zara! I'm a first-time buyer and very interested in the Clifton apartment. Could you tell me about the documentation process?" },
      { senderId: "user-9", text: "Hi Hamza! Congrats on your first purchase journey. The flat has a clear freehold title. I can share all the documents — NOC, title deed, and building approval — during the visit." },
      { senderId: "user-7", text: "That's reassuring. What's the total area and is there a floor plan available?" },
      { senderId: "user-9", text: "I'll send the floor plan PDF shortly." },
    ],
  },
  {
    id: "conv-5",
    participants: ["user-10", "user-8"],
    messages: [
      { senderId: "user-10", text: "Hi Nadia, I'm looking for investment properties in Lahore under 3 crore. Can you help?" },
      { senderId: "user-8", text: "Absolutely Ayesha! I specialize in DHA and Johar Town. Based on your budget, I have some great 5-7 Marla options with good rental yield potential." },
      { senderId: "user-10", text: "Johar Town sounds interesting. What's the expected rental yield?" },
      { senderId: "user-8", text: "I have 3 more options in Johar Town I can show you." },
    ],
  },
];
