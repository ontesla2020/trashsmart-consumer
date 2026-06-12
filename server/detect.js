import { CATEGORIES } from './ruleset.js';

const SYSTEM = `You are a waste-identification vision model for a consumer recycling app.
List every distinct waste item in the photo. If an item is packaging containing another
item (e.g. fruit in a carton), list BOTH separately.
For each item return:
- label: short human name (e.g. "blueberries")
- material: dominant material
- category: EXACTLY one of: ${CATEGORIES.join(', ')}
- quantity: integer count
- confidence: 0-1
Also return image_quality: one of "ok", "blurry", "too_dark", "cluttered".
Return ONLY valid JSON: {"items":[...],"image_quality":"ok"}.`;

// Returns one of:
//   { items, image_quality, source:'live' }   on success (items may be empty)
//   { error:'not_ready' }                      when no API key is configured (system not awake)
//   { error:'failed', detail }                 when the model call errors
export async function detectItems(dataUrl) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { error: 'not_ready' };

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.VISION_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: [
            { type: 'text', text: 'Identify the waste item(s) in this photo.' },
            { type: 'image_url', image_url: { url: dataUrl } }
          ] }
        ]
      })
    });
    if (!res.ok) {
      const t = await res.text();
      return { error: 'failed', status: res.status, detail: t.slice(0, 140) };
    }
    const json = await res.json();
    const parsed = JSON.parse(json.choices?.[0]?.message?.content || '{}');
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return { items, image_quality: parsed.image_quality || 'ok', source: 'live' };
  } catch (e) {
    return { error: 'failed', detail: e.message };
  }
}
