# TrashSmart — Consumer app

The resident-facing PWA: photograph an item, get plain-language bin guidance with the
reasoning, and earn points toward rewards at local businesses. Separate from the
inspector app (`../trashsmart-pwa`) — its own codebase and its own port (8788).

## Run it

```bash
cd trashsmart-consumer
npm install
cp .env.example .env      # optional: add OPENAI_API_KEY for live scans
npm run dev               # API on :8788, client on :5174
```

Open http://localhost:5174 on your laptop, or the `Network:` URL Vite prints on your
phone (same Wi-Fi) to use the camera.

## What's here

- Home with Apple-style daily rings (Scan / Recycle / Divert), points, streak, stats.
- Scan → analyzing tracker → multi-step bin guidance with reasoning (e.g. berries to
  Organics + clamshell to Recycle) and 👍/👎/Fix feedback.
- Low-confidence path: a "we're not sure" screen to confirm the guess or retake.
- Rewards catalog + QR/code redemption at local partners; "rings closed" celebration.
- Real `POST /api/scan` (consumer mode) reusing the same vision + city-rules backend.
  Without an API key (or on error) it returns a canned berries-in-clamshell result so
  the whole flow works offline for the demo.

Points/streak/rewards are client-side seeded state for now (resets on reload) — wire to
a backend ledger when you're ready to persist.

## Ports

Consumer API 8788 / client 5174. The inspector app uses 8787 / 5173, so both can run
at the same time without clashing.
