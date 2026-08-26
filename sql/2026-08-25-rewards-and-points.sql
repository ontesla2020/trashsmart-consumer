-- Rewards catalog + points-per-category, moved out of hardcoded app/server
-- code and into Supabase so they can be changed without a redeploy (and,
-- once the app is wrapped for the App Store, without waiting on app review).
--
-- Run this once in the Supabase SQL Editor (dashboard -> SQL Editor -> New
-- query -> paste -> Run). It's safe to re-run: every statement either
-- checks "if not exists" or upserts on a stable id, so running it twice
-- won't duplicate anything.

-- ---- Rewards catalog ----
create table if not exists rewards (
  id text primary key,
  vendor text not null,
  reward text not null,
  emoji text,
  cost integer not null,
  distance text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into rewards (id, vendor, reward, emoji, cost, distance) values
  ('coffee', 'Inklings Coffee & Tea', 'Free 12oz coffee', '☕', 1600, '0.4 mi'),
  ('deli', 'First St. Deli', '$3 off any sandwich', '🥪', 1200, '0.6 mi'),
  ('gelato', 'Gelato Mio', 'Free single scoop', '🍦', 2000, '0.9 mi'),
  ('tree', 'Donate to StopWaste', 'Plant a tree locally', '🌱', 50, '—')
on conflict (id) do nothing;

-- To add a new shop later: insert a new row with a new id, e.g.
--   insert into rewards (id, vendor, reward, emoji, cost, distance)
--   values ('boba', 'Boba Guys', 'Free classic milk tea', '🧋', 900, '0.3 mi');
-- To change a price: update rewards set cost = 1000 where id = 'coffee';
-- To retire a reward without losing its redemption history: update rewards
--   set active = false where id = 'coffee';

-- ---- Points per category ----
create table if not exists point_values (
  bin text primary key,
  name text not null,
  action text not null,
  why text not null,
  points integer not null
);

insert into point_values (bin, name, action, why, points) values
  ('organics', 'Organics', 'Compost it', 'Food and plant scraps are composted here.', 15),
  ('recycle', 'Recycle', 'Rinse & recycle', 'Empty and rinse, then place in the blue cart.', 20),
  ('landfill', 'Landfill', 'Trash it', 'This isn''t recyclable or compostable locally.', 5),
  ('ewaste_dropoff', 'E-waste drop-off', 'Take to drop-off', 'Electronics need a special drop-off — never the curb.', 30),
  ('hazardous_dropoff', 'Hazardous drop-off', 'Take to drop-off', 'Hazardous material needs a designated facility.', 30)
on conflict (bin) do nothing;

-- To change how many points a category earns:
--   update point_values set points = 25 where bin = 'recycle';

-- ---- Redemptions: remember the emoji shown at redemption time ----
-- (reward_name/vendor/cost were already snapshotted at redemption time so a
-- later catalog edit never rewrites someone's redemption history; emoji
-- just joins that same pattern.)
alter table redemptions add column if not exists emoji text;
