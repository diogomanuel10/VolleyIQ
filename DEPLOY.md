# Deploying VolleyIQ

Split deploy: **Vercel** hosts the built Vite client, **Railway** (or Fly/Render)
hosts the Express API with SQLite on a persistent volume. Vercel rewrites
`/api/*` to the Railway URL so the client keeps calling same-origin.

---

## 1. Deploy the API to Railway

1. Create a new project on [railway.app](https://railway.app) → **Deploy from
   GitHub** → pick this repo, branch `claude/build-vol-platform-clone-yHkf5`
   (or whichever you merge to `main`).

2. **Build / start commands** — Railway auto-detects Node but set them
   explicitly in the service settings to be safe:
   - Build: `npm install && npm run build`
   - Start: `npm start`

3. **Persistent volume** (for SQLite). In the Railway service → **Volumes**
   → New Volume → mount at `/data`. Then set:
   ```
   DATABASE_URL=/data/volleyiq.db
   ```
   Without this, your DB is wiped on every redeploy.

4. **Environment variables** — minimum to boot:
   ```
   NODE_ENV=production
   PORT=3000                 # Railway injects this; Express already reads it
   DATABASE_URL=/data/volleyiq.db
   DEV_AUTH_BYPASS=true      # TEMPORARY — see step 4 below
   ```
   Optional (layer on once the app boots):
   ```
   ANTHROPIC_API_KEY=sk-ant-...          # unlocks real AI (else mock mode)
   FIRESTORE_MIRROR=true                 # enables the Second Screen mirror
   FIREBASE_SERVICE_ACCOUNT_JSON={...}   # stringified service account JSON
   ```

5. Deploy. Railway gives you a URL like
   `https://volleyiq-production-xxxx.up.railway.app`. Test it:
   ```
   curl https://<your-url>/api/health
   # → {"ok":true,"version":"0.1.0"}
   ```

---

## 2. Point Vercel at Railway

1. Open `vercel.json` in the repo. Replace the placeholder with your Railway
   URL (no trailing slash):
   ```json
   "destination": "https://volleyiq-production-xxxx.up.railway.app/api/:path*"
   ```
   Commit and push.

2. On [vercel.com](https://vercel.com) → **Import Project** → pick this repo.
   Vercel reads `vercel.json` and auto-configures:
   - Framework: Vite
   - Build: `vite build`
   - Output: `dist/client`

3. **Environment variables** (Vercel side, all prefixed `VITE_` so they reach
   the client bundle at build time):
   ```
   VITE_USE_DEV_AUTH=true                  # TEMPORARY — see step 4
   # When you switch to real Firebase:
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=volleyiq-xxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=volleyiq-xxx
   VITE_FIREBASE_APP_ID=1:...:web:...
   ```

4. Deploy. Vercel gives you `volleyiq.vercel.app`. Load it, check the
   dashboard renders, check the Network tab — `/api/teams` should return
   200 from the Railway URL via the rewrite.

---

## 3. Custom domain

1. Vercel → Project → **Settings → Domains** → Add `yourdomain.com`.
2. Vercel shows the DNS records to add at your registrar (usually a CNAME
   to `cname.vercel-dns.com` for subdomains, or A/ALIAS for apex).
3. Cert is auto-provisioned via Let's Encrypt — usually ready in under a
   minute.

---

## 4. Flip on real Firebase Auth

Until this step, anyone with the URL has full admin access. Do NOT leave
`DEV_AUTH_BYPASS=true` on a public production deploy.

On your Firebase project:

1. Enable **Email/Password** and **Google** sign-in providers.
2. In Project Settings → **Your apps**: add a web app if you don't have
   one, copy the config — these are the `VITE_FIREBASE_*` values above.
3. In Project Settings → **Service accounts** → Generate new private key.
   Download the JSON file.

Then:

- **Vercel env vars**: remove `VITE_USE_DEV_AUTH`, set the four
  `VITE_FIREBASE_*` vars from step 2. Redeploy.
- **Railway env vars**: remove `DEV_AUTH_BYPASS`, add
  `FIREBASE_SERVICE_ACCOUNT_JSON` with the *entire* JSON from step 3
  stringified (paste it into the Railway env editor — it accepts
  multi-line values). Redeploy.

Test: open the site in an incognito window. You should land on the login
screen, not the dashboard.

---

## 5. Optional — enable Firestore mirror

The Second Screen route (`/#/second-screen/:matchId`) subscribes to Firestore
live when the mirror is on, otherwise falls back to 2s polling. To enable:

1. In the Firebase console enable Firestore in Native mode (eu-west3 for
   low latency in PT).
2. On Railway: add `FIRESTORE_MIRROR=true`. Redeploy.
3. Add Firestore security rules so only authenticated members of a team can
   read the relevant match docs. A starting point:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /matches/{matchId}/actions/{doc} {
         allow read: if request.auth != null;
         allow write: if false;  // only the server (admin SDK) writes
       }
     }
   }
   ```

---

## 6. Optional — unlock real AI

Set `ANTHROPIC_API_KEY` on Railway. Without it, pattern detection and
training recommendations run from deterministic mocks (good for dev, fine
for a demo, not great for real matches).

---

## Checklist before going public

- [ ] `DEV_AUTH_BYPASS` removed from Railway env
- [ ] `VITE_USE_DEV_AUTH` removed from Vercel env
- [ ] Firebase Auth credentials set on both sides
- [ ] SQLite backed by a Railway volume (not the container filesystem)
- [ ] `ANTHROPIC_API_KEY` set if you want real AI output
- [ ] Custom domain DNS propagated, HTTPS green padlock
- [ ] Test login → dashboard → create match → live scout flow
