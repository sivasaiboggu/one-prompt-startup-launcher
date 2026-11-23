/* Pre-generated launches, cached in the repo so the demo never starts blank.
   Hand-written copy. Every waitlist starts at 0 real signups.
   UMD like generator.js. */
(function (root) {
  'use strict';
  function launch(o) {
    o.source = 'cached'; o.model = null;
    o.createdAt = '2026-11-23T10:00:00.000Z';
    return o;
  }
  var CACHED = [
    launch({
      id: 'launch_mealwise', slug: 'mealwise',
      prompt: 'a meal-planning app for hostel students',
      name: 'Mealwise', nameOptions: ['Mealwise', 'Messmate', 'Hostelfood'],
      tagline: 'What to eat this week, sorted before Monday.',
      description: 'Mealwise plans a week of hostel-friendly meals from your mess timings, your budget, and what you actually like to eat. No more standing in front of the mess board wondering what is for dinner.',
      features: [
        { title: 'A week, planned in 2 minutes', text: 'Pick your mess days, your budget, and veg or non-veg. Mealwise fills the week.' },
        { title: 'Built for mess food', text: 'It knows mess timings, common dishes, and what runs out by 8 pm — and plans around them.' },
        { title: 'A shopping list that fits ₹500', text: 'Anything the mess does not cover becomes one short list for the shop outside the gate.' }
      ],
      pricing: [
        { name: 'Start', price: 'Free', note: 'One week plan at a time' },
        { name: 'Plus', price: '₹99/mo', note: 'Unlimited weeks + lists' },
        { name: 'Hostel', price: '₹499/mo', note: 'One plan for a whole floor' }
      ],
      faq: [
        { q: 'Does it work with my mess menu?', a: 'Yes — you paste your mess menu once, and Mealwise plans around it.' },
        { q: 'I eat veg only. Does that work?', a: 'Yes. Veg, non-veg, and Jain are all first-class options.' },
        { q: 'What does it cost?', a: 'The Start plan is free. Plus is ₹99 a month, and you can cancel any time.' }
      ],
      palette: { name: 'Lime', bg: '#FAFAF7', ink: '#16181A', accent: '#65A30D', accentSoft: '#ECFCCB', muted: '#57534E' },
      template: 'poster'
    }),
    launch({
      id: 'launch_shelfie', slug: 'shelfie',
      prompt: 'a pantry tracker that tells you what to cook with what you already have',
      name: 'Shelfie', nameOptions: ['Shelfie', 'Pantry', 'Useitup'],
      tagline: 'Open the cupboard. Dinner is already decided.',
      description: 'Shelfie keeps a list of what is in your kitchen and turns it into meals you can cook tonight — no extra shopping trip, no food going off at the back of the shelf.',
      features: [
        { title: 'What you have, listed once', text: 'Add items as you unpack them. Shelfie remembers expiry dates for you.' },
        { title: 'Recipes from your shelf', text: 'It suggests meals using only what you already own, sorted by what runs out first.' },
        { title: 'Less thrown away', text: 'A weekly nudge for the three things closest to expiry.' }
      ],
      pricing: [
        { name: 'Start', price: 'Free', note: 'One kitchen, 50 items' },
        { name: 'Plus', price: '₹149/mo', note: 'Unlimited items + recipes' },
        { name: 'Family', price: '₹299/mo', note: 'Shared lists for the house' }
      ],
      faq: [
        { q: 'Do I have to type everything in?', a: 'No — scan a barcode or pick from common items. Most kitchens take ten minutes to set up.' },
        { q: 'Does it know Indian groceries?', a: 'Yes. Dals, spices, and atta are in the list from day one.' },
        { q: 'What happens when something expires?', a: 'Shelfie flags it a day before, and suggests a recipe that uses it up.' }
      ],
      palette: { name: 'Amber', bg: '#FFFBEB', ink: '#1C1917', accent: '#B45309', accentSoft: '#FEF3C7', muted: '#57534E' },
      template: 'split'
    }),
    launch({
      id: 'launch_tutorloop', slug: 'tutorloop',
      prompt: 'a place where college students find a senior to clear one doubt in 15 minutes',
      name: 'Tutorloop', nameOptions: ['Tutorloop', 'Doubtline', 'Senior15'],
      tagline: 'One doubt. One senior. Fifteen minutes.',
      description: 'Tutorloop matches you with a senior from your own college who has already cleared the subject you are stuck on. Book a 15-minute slot, ask the one thing that is blocking you, and get on with your work.',
      features: [
        { title: 'Seniors from your college', text: 'Matched by subject and branch, so they know your syllabus and your professors.' },
        { title: '15 minutes, booked in a tap', text: 'Pick a slot, pay nothing up front, and meet on a call.' },
        { title: 'Rated after every call', text: 'Seniors who explain clearly get booked again. The rest do not.' }
      ],
      pricing: [
        { name: 'Ask', price: 'Free', note: 'One doubt a week' },
        { name: 'Plus', price: '₹199/mo', note: 'Unlimited doubts' },
        { name: 'Exam week', price: '₹99/week', note: 'Unlimited, only when you need it' }
      ],
      faq: [
        { q: 'Who are the seniors?', a: 'Third- and fourth-year students from your college, checked by Tutorloop before they can take calls.' },
        { q: 'What if my doubt takes longer than 15 minutes?', a: 'Book a second slot right after. Most doubts do not need one.' },
        { q: 'Can I become a senior and earn?', a: 'Yes — seniors are paid per call, once they pass a short check.' }
      ],
      palette: { name: 'Sky', bg: '#F0F9FF', ink: '#0F172A', accent: '#0369A1', accentSoft: '#E0F2FE', muted: '#475569' },
      template: 'stack'
    })
  ];
  // Attach deterministic logos at load (browser) / on demand (Node tests do it too).
  function withLogos() {
    var OPL = root.OPL || (typeof require === 'function' ? require('./generator.js') : null);
    CACHED.forEach(function (l) { l.logo = OPL.makeLogoSVG(l.name, l.palette); });
    return CACHED;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { CACHED: CACHED, withLogos: withLogos }; }
  else { root.OPL_CACHED = CACHED; root.OPL_CACHED_WITH_LOGOS = withLogos; }
})(typeof window !== 'undefined' ? window : globalThis);
