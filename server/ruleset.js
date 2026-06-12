// Static vocabulary shared across detection, rules, and scoring.

export const CATEGORIES = [
  'food_waste', 'yard_waste',
  'rigid_plastic', 'plastic_film',
  'paper', 'paper_wax', 'cardboard',
  'glass', 'metal',
  'e_waste', 'batteries', 'hazardous',
  'textile', 'mixed', 'unknown'
];

export const CATEGORY_LABEL = {
  food_waste: 'Food waste', yard_waste: 'Yard waste',
  rigid_plastic: 'Rigid plastic', plastic_film: 'Plastic film / bags',
  paper: 'Paper', paper_wax: 'Wax-lined paper', cardboard: 'Cardboard',
  glass: 'Glass', metal: 'Metal',
  e_waste: 'E-waste', batteries: 'Batteries', hazardous: 'Hazardous',
  textile: 'Textile', mixed: 'Mixed', unknown: 'Unknown'
};

export const BINS = ['organics', 'recycle', 'landfill', 'ewaste_dropoff', 'hazardous_dropoff'];

export const BIN_LABEL = {
  organics: 'Organics', recycle: 'Recycle', landfill: 'Landfill',
  ewaste_dropoff: 'E-waste drop-off', hazardous_dropoff: 'Hazardous drop-off'
};

// Universal defaults — the bin a category goes to unless a city overrides it.
export const UNIVERSAL_DEFAULTS = {
  food_waste: 'organics', yard_waste: 'organics',
  rigid_plastic: 'recycle', paper: 'recycle', cardboard: 'recycle',
  glass: 'recycle', metal: 'recycle',
  plastic_film: 'landfill', paper_wax: 'landfill', textile: 'landfill',
  mixed: 'landfill', unknown: 'landfill',
  e_waste: 'ewaste_dropoff', batteries: 'ewaste_dropoff', hazardous: 'hazardous_dropoff'
};
