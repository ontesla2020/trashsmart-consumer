export function statusFor(scorePct) {
  return scorePct < 10 ? 'pass' : scorePct < 35 ? 'warning' : 'fail';
}

export function binFor(category, map) {
  return map[category] || 'landfill';
}

// Score one audited bin against an effective category->bin map.
// An item "conforms" if its category maps to the bin being audited.
export function scoreBin(rawItems, binAudited, map) {
  let total = 0;
  let contaminant = 0;

  const items = rawItems.map((it, i) => {
    const quantity = Number(it.quantity) > 0 ? Number(it.quantity) : 1;
    const conforms = binFor(it.category, map) === binAudited;
    total += quantity;
    if (!conforms) contaminant += quantity;
    return {
      item_id: String(i + 1),
      label: it.label || 'Unknown item',
      material: it.material || '',
      category: it.category || 'unknown',
      confidence: typeof it.confidence === 'number' ? it.confidence : 0.8,
      quantity,
      conforms
    };
  });

  const score_pct = total ? Math.round((contaminant / total) * 100) : 0;
  return {
    items,
    contamination: {
      total_items: total,
      contaminant_items: contaminant,
      score_pct,
      status: statusFor(score_pct)
    }
  };
}
