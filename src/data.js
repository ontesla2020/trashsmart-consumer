// Seeded gamification + rewards + challenges for the demo (client-side).

export const INITIAL_GAM = {
  points: 100, // welcome bonus for creating an account
  streak: 1,
  rings: {
    recycle: { done: 2, goal: 4, label: 'Recycle', color: '#2477C9' },
    organics: { done: 1, goal: 3, label: 'Organics', color: '#3FA64A' },
    landfill: { done: 1, goal: 2, label: 'Landfill', color: '#6B7178' }
  },
  divertedLb: 3,
  joined: ['school'],
  lastScan: 'Blueberries → Organics'
};

export const REWARDS = [
  { id: 'coffee', vendor: 'Inklings Coffee & Tea', reward: 'Free 12oz coffee', emoji: '☕', bg: 'amber', cost: 1600, distance: '0.4 mi' },
  { id: 'deli', vendor: 'First St. Deli', reward: '$3 off any sandwich', emoji: '🥪', bg: 'green', cost: 1200, distance: '0.6 mi' },
  { id: 'gelato', vendor: 'Gelato Mio', reward: 'Free single scoop', emoji: '🍦', bg: 'blue', cost: 2000, distance: '0.9 mi' },
  { id: 'tree', vendor: 'Donate to StopWaste', reward: 'Plant a tree locally', emoji: '🌱', bg: 'gray', cost: 50, distance: '—' }
];

// Roughly mirrors the server's per-item points (base + bin bonus).
export const POINTS_GUIDE = [
  { emoji: '🔌', label: 'E-waste & batteries', points: 30 },
  { emoji: '⚠️', label: 'Hazardous items', points: 30 },
  { emoji: '♻️', label: 'Recyclables', points: 20 },
  { emoji: '🥬', label: 'Compostables', points: 15 },
  { emoji: '🗑️', label: 'Landfill (still counts)', points: 5 }
];

export const CHALLENGES = [
  {
    id: 'school', type: 'school', emoji: '🎓', name: 'Your school', blurb: 'Rep your school against others nearby',
    members: 312,
    board: [
      { name: 'Amador Valley High', pts: 52800 },
      { name: 'Granada High', pts: 48200 },
      { name: 'Dublin High', pts: 44100 },
      { name: 'Foothill High', pts: 39800 }
    ]
  },
  {
    id: 'livermore', type: 'community', emoji: '🏡', name: 'Livermore Residents', blurb: 'City-wide sort-off',
    members: 1840,
    board: [
      { name: 'GreenGail', pts: 3120, move: 0 },
      { name: 'EcoRaj', pts: 2890, move: 1 },
      { name: 'Maya R.', pts: 2140, move: -1 },
      { name: 'BinBoss', pts: 1640, move: 2 },
      { name: 'You', pts: 1240, you: true, move: 1 },
      { name: 'SortSam', pts: 980, move: -2 }
    ]
  },
  { id: 'dublin', type: 'community', emoji: '🏡', name: 'Dublin Residents', blurb: 'City-wide sort-off', members: 1210,
    board: [{ name: 'SortStar', pts: 2600 }, { name: 'RecycleRic', pts: 2200 }, { name: 'CartChamp', pts: 1700 }] },
  { id: 'pleasanton', type: 'community', emoji: '🏡', name: 'Pleasanton Residents', blurb: 'City-wide sort-off', members: 1530,
    board: [{ name: 'CompostCarl', pts: 2950 }, { name: 'GreenGenie', pts: 2410 }, { name: 'BinBella', pts: 1980 }] },
  { id: 'oakland', type: 'community', emoji: '🏡', name: 'Oakland Residents', blurb: 'City-wide sort-off', members: 4120,
    board: [{ name: 'TownTina', pts: 5100 }, { name: 'OakEco', pts: 4300 }, { name: 'BayBinner', pts: 3600 }] }
];
