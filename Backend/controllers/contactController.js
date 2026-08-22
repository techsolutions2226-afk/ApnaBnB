const prisma = require('../db/prisma');
const { sendContactMessageEmail } = require('../utils/mailer');

const SINGLETON_ID = 'singleton';

/* Defaults seeded on first read so the public page is never blank before an
   admin has touched it. Mirrors planController.ensureSeeded. */
const DEFAULTS = {
  id: SINGLETON_ID,
  heading: 'Get in touch',
  subheading:
    "Questions about a listing, a match, or your subscription? Our team is here to help — and we usually reply the same working day.",
  email: 'support@apnabnb.pk',
  phone: '+92 300 000 0000',
  whatsapp: '+92 300 000 0000',
  address: 'Gulberg III, Main Boulevard',
  city: 'Lahore, Pakistan',
  mapEmbedUrl: '',
  responseNote: 'We usually reply within one business day.',
  officeHours: [
    { day: 'Monday – Friday', time: '9:00 AM – 6:00 PM' },
    { day: 'Saturday', time: '10:00 AM – 4:00 PM' },
    { day: 'Sunday', time: 'Closed' },
  ],
  socials: [
    { label: 'Facebook', url: '' },
    { label: 'Instagram', url: '' },
    { label: 'LinkedIn', url: '' },
  ],
  faqs: [
    {
      question: 'How do I list a property?',
      answer:
        'Sign up as a seller or dealer, open your dashboard and choose “Create Listing”. Your property goes live immediately and our matchmaker starts comparing it against active buyer requirements straight away.',
    },
    {
      question: 'What is a match?',
      answer:
        'A match is an automatic pairing between a listing and a buyer requirement. We score every candidate on location, budget, property type and size, then email both sides when a new match is created.',
    },
    {
      question: 'Do I need a paid plan?',
      answer:
        'Browsing, listing and posting requirements are free. A subscription unlocks messaging and the Deal Room so you can negotiate directly with the other party.',
    },
    {
      question: 'How do I pay?',
      answer:
        'Plans are paid via EasyPaisa. Choose a plan, transfer to the QR shown at checkout and upload your payment screenshot — access is activated as soon as it is submitted.',
    },
  ],
  formEnabled: true,
};

/* Returns the single row, creating it with DEFAULTS the first time. */
const ensureSeeded = async () => {
  const existing = await prisma.contactPage.findUnique({
    where: { id: SINGLETON_ID },
  });
  if (existing) return existing;
  return prisma.contactPage.create({ data: DEFAULTS });
};

// GET /api/contact — public. Everything the Contact Us page renders.
const getContactPage = async (req, res, next) => {
  try {
    res.status(200).json(await ensureSeeded());
  } catch (error) {
    next(error);
  }
};

/* Only these columns may be written from the admin form — anything else in the
   body (id, timestamps) is ignored rather than trusted. */
const TEXT_FIELDS = [
  'heading',
  'subheading',
  'email',
  'phone',
  'whatsapp',
  'address',
  'city',
  'mapEmbedUrl',
  'responseNote',
];
const JSON_FIELDS = ['officeHours', 'socials', 'faqs'];

// PUT /api/contact — admin only.
const updateContactPage = async (req, res, next) => {
  try {
    await ensureSeeded();

    const data = {};
    for (const key of TEXT_FIELDS) {
      if (req.body[key] !== undefined) data[key] = String(req.body[key] ?? '').trim();
    }
    for (const key of JSON_FIELDS) {
      if (req.body[key] !== undefined) {
        data[key] = Array.isArray(req.body[key]) ? req.body[key] : [];
      }
    }
    if (req.body.formEnabled !== undefined) {
      data.formEnabled = Boolean(req.body.formEnabled);
    }

    const updated = await prisma.contactPage.update({
      where: { id: SINGLETON_ID },
      data,
    });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// POST /api/contact/message — public. Emails the enquiry to the address the
// admin configured above. Nothing is stored; the inbox is the record.
const sendContactMessage = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ message: 'Name, email and message are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (message.length > 5000 || name.length > 200 || subject.length > 200) {
      return res.status(400).json({ message: 'That message is too long.' });
    }

    const page = await ensureSeeded();
    const to = page.email;
    if (!to) {
      return res.status(503).json({
        message: 'Contact email is not configured yet. Please try again later.',
      });
    }

    // Awaited on purpose: the sender needs to know whether it actually went.
    await sendContactMessageEmail(to, { name, email, subject, message });
    res.status(200).json({ message: 'Thanks — your message is on its way.' });
  } catch (error) {
    console.error('Contact message failed:', error.message);
    res.status(502).json({
      message:
        'We could not send your message right now. Please email us directly instead.',
    });
  }
};

module.exports = {
  getContactPage,
  updateContactPage,
  sendContactMessage,
};
