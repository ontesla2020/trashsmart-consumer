import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

console.log('--- upsert ---');
const up = await sb.from('profiles').upsert({
  id: '11111111-1111-5111-8111-111111111111',
  first_name: 'TestOm',
  phone: '5105550100',
  school: 'Test High School',
  city: 'livermore'
}, { onConflict: 'id' });
console.log(JSON.stringify(up, null, 2));

console.log('--- select ---');
const sel = await sb.from('profiles').select('id, first_name, school, city').eq('id', '11111111-1111-5111-8111-111111111111').maybeSingle();
console.log(JSON.stringify(sel, null, 2));

console.log('--- list a few rows (any profiles at all?) ---');
const all = await sb.from('profiles').select('id, first_name, school').limit(5);
console.log(JSON.stringify(all, null, 2));
