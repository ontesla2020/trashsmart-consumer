export const CATEGORY_EMOJI = {
  food_waste: '🍎', yard_waste: '🌿',
  rigid_plastic: '🥤', plastic_film: '🛍️',
  paper: '📄', paper_wax: '🥤', cardboard: '📦',
  glass: '🍾', metal: '🥫',
  e_waste: '🔌', batteries: '🔋', hazardous: '⚠️',
  textile: '👕', mixed: '🗑️', unknown: '❓'
};

export const BIN_LABEL = {
  organics: 'Organics', recycle: 'Recycle', landfill: 'Landfill',
  ewaste_dropoff: 'E-waste drop-off', hazardous_dropoff: 'Hazardous drop-off'
};

// pill style class + bin emoji
export const BIN_STYLE = {
  organics: { cls: 'org', emoji: '🥬' },
  recycle: { cls: 'rec', emoji: '♻️' },
  landfill: { cls: 'land', emoji: '🗑️' },
  ewaste_dropoff: { cls: 'amber', emoji: '⚡' },
  hazardous_dropoff: { cls: 'amber', emoji: '⚠️' }
};

export function ringPct(done, goal) {
  return Math.max(0, Math.min(1, goal ? done / goal : 0));
}
