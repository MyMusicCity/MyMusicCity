// Presentation mode endpoint for demo reliability
const express = require('express');
const router = express.Router();

// Curated music events for presentation/demo mode
const PRESENTATION_EVENTS = [
  {
    _id: 'pres_001',
    title: 'Live at The Bluebird Cafe',
    description: 'Intimate acoustic performances featuring Nashville\'s finest singer-songwriters in the legendary venue where careers are born.',
    date: new Date('2025-12-02T19:30:00.000Z'),
    location: '4104 Hillsboro Pike, Nashville, TN',
    venue: 'The Bluebird Cafe',
    url: 'https://www.bluebirdcafe.com',
    source: 'presentation',
    genre: 'Country',
    musicType: 'acoustic',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&auto=format',
    price: '$25'
  },
  {
    _id: 'pres_002',
    title: 'Jazz Night at The Continental',
    description: 'Smooth jazz performances in an intimate setting with craft cocktails and live music from local jazz ensembles.',
    date: new Date('2025-12-03T20:00:00.000Z'),
    location: '3621 West End Ave, Nashville, TN',
    venue: 'The Continental Mid-Town',
    url: 'https://www.continentalmidtown.com',
    source: 'presentation',
    genre: 'Jazz',
    musicType: 'live',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=240&fit=crop&auto=format',
    price: '$15'
  },
  {
    _id: 'pres_003',
    title: 'Honky-Tonk at Tootsies',
    description: 'Classic honky-tonk live music featuring up-and-coming country artists on Nashville\'s famous Broadway strip.',
    date: new Date('2025-12-04T21:00:00.000Z'),
    location: '422 Broadway, Nashville, TN',
    venue: 'Tootsies Orchid Lounge',
    url: 'https://www.tootsies.net',
    source: 'presentation',
    genre: 'Country',
    musicType: 'live',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&auto=format',
    price: 'Free'
  },
  {
    _id: 'pres_004',
    title: 'Indie Rock Showcase',
    description: 'Underground indie rock concert featuring both local Nashville bands and touring artists in an intimate venue.',
    date: new Date('2025-12-05T20:30:00.000Z'),
    location: '1402 Clinton St, Nashville, TN',
    venue: 'Marathon Music Works',
    url: 'https://marathonmusicworks.com',
    source: 'presentation',
    genre: 'Indie',
    musicType: 'concert',
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=240&fit=crop&auto=format',
    price: '$20'
  },
  {
    _id: 'pres_005',
    title: 'Hip-Hop Underground',
    description: 'Underground hip-hop showcase featuring Nashville\'s emerging rap artists and spoken word performers.',
    date: new Date('2025-12-06T22:00:00.000Z'),
    location: '2219 Elliston Pl, Nashville, TN',
    venue: 'The End',
    url: 'https://www.theendnashville.com',
    source: 'presentation',
    genre: 'Hip-Hop',
    musicType: 'concert',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=240&fit=crop&auto=format',
    price: '$18'
  },
  {
    _id: 'pres_006',
    title: 'Singer-Songwriter Circle',
    description: 'Acoustic performances by Nashville\'s talented singer-songwriters in an intimate listening room setting.',
    date: new Date('2025-12-07T19:00:00.000Z'),
    location: '818 3rd Ave S, Nashville, TN',
    venue: '3rd & Lindsley',
    url: 'https://www.3rdandlindsley.com',
    source: 'presentation',
    genre: 'Folk',
    musicType: 'acoustic',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&auto=format',
    price: '$22'
  },
  {
    _id: 'pres_007',
    title: 'Pop Concert at Bridgestone',
    description: 'Major pop artist performance at Nashville\'s premier venue with full production and special lighting.',
    date: new Date('2025-12-08T19:30:00.000Z'),
    location: '501 Broadway, Nashville, TN',
    venue: 'Bridgestone Arena',
    url: 'https://www.bridgestonearena.com',
    source: 'presentation',
    genre: 'Pop',
    musicType: 'concert',
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=240&fit=crop&auto=format',
    price: '$45'
  },
  {
    _id: 'pres_008',
    title: 'Blues at B.B. Kings',
    description: 'Authentic blues music featuring local and touring blues artists in a classic blues club atmosphere.',
    date: new Date('2025-12-09T20:00:00.000Z'),
    location: '152 2nd Ave N, Nashville, TN',
    venue: 'B.B. Kings Blues Club',
    url: 'https://www.bbkings.com',
    source: 'presentation',
    genre: 'Blues',
    musicType: 'live',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=240&fit=crop&auto=format',
    price: '$25'
  }
];

// GET /api/presentation/events - Returns curated events for demo
router.get('/events', (req, res) => {
  console.log('🎭 Presentation mode: serving curated events for demo');
  res.json(PRESENTATION_EVENTS);
});

// GET /api/presentation/status - Check if in presentation mode
router.get('/status', (req, res) => {
  res.json({ 
    mode: 'presentation',
    eventCount: PRESENTATION_EVENTS.length,
    message: 'Presentation mode active - serving curated music events for demo reliability'
  });
});

module.exports = router;