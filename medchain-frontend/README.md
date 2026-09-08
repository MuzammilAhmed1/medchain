# MedChain frontend

React + Vite + Tailwind. Fully wired to the real `medchain-backend` API —
no mock data left in the app (`src/data/mockData.js` from earlier phases
has been removed).

## Run it

```
npm install
npm run dev
```

By default it talks to `http://localhost:8080/api`. Copy `.env.example` to
`.env.local` if your backend runs somewhere else.

**You need `medchain-backend` running** (and, for full functionality,
`medchain-ai-service` and a Hardhat node with `medchain-contracts`
deployed — see each project's own README). The app degrades gracefully if
those two are down: batches/transfers still work, they just show "not yet
analyzed" or an empty blockchain history instead of crashing.

Log in with any of the seeded demo accounts (password `password123`):

- `priya@abcpharma.com` — Manufacturer
- `grace@medline.com` — Distributor
- `elena@cornerhealth.com` — Pharmacy
- `admin@medchain.dev` — Admin

(Full list in the backend's `DemoDataSeeder.java`.)

## What changed since Phase 5

Phase 5 shipped this same UI running entirely on in-memory mock data, so it
could be demoed with zero setup. This phase replaces that with:

- `src/services/*.js` — one small API client module per domain
  (`authApi`, `batchApi`, `transferApi`, `verifyApi`, `dashboardApi`,
  `adminApi`), all going through `apiClient.js`, which attaches the JWT and
  normalizes backend errors into a plain `Error` with `.message` and
  `.details`.
- `src/hooks/useAsync.js` — the loading/error/data pattern every page now
  uses instead of reading a synchronous mock array.
- `AuthContext` now calls the real `/api/auth/login` and `/api/auth/register`
  endpoints, persists the JWT in `localStorage`, and re-validates it via
  `/api/auth/me` on page load (with an `initializing` flag so route guards
  don't flash a redirect before that check resolves).
- Every page (`Dashboard`, `BatchList`, `CreateBatch`, `BatchDetails`,
  `Verify`, `Transfers`, `Insights`, `Admin`) fetches from the API instead
  of importing mock data, with real loading and error states.
- Two things the mock UI didn't actually support, now real: a **recall**
  button on the batch details page (manufacturer-only, matches the
  backend/contract's own rule), and a **"Mark received"** button on
  pending transfers (the mock version only ever displayed the pending
  list — there was nothing to click).

## Folder structure additions

```
src/services/    API client, one file per backend domain
src/hooks/       useAsync - shared loading/error/data fetch pattern
```

Everything else is unchanged from Phase 5's structure (see
`MedChain-MVP-Plan.md` for the full design-system reference).
