# MedChain — MVP Plan
### Phase 1: Sitemap · Phase 2: Design System · Phase 3: Architecture

---

## Phase 1 — Sitemap & Navigation Flow

### Public
- **Landing** — Navbar · Hero · Problem · How MedChain Works · Core Features · Technology/Trust · CTA · Footer
- **Auth** — Login · Register

### Application (behind auth, role-gated)
- **Dashboard** — overview stats, recent batches, recent transfers, AI risk summary
- **Batches** — list → create → details → history
- **Verify** — scan/enter ID → result → medicine info → chain-of-custody history
- **Supply Chain** — initiate transfer → pending → history → timeline
- **AI Insights** — risk score, suspicious-activity flags, supply insights
- **Profile** — user + organization info
- **Admin** *(Admin only)* — users · organizations · system overview

### Role access
| Role | Dashboard | Batches | Verify | Supply Chain | AI Insights | Admin |
|---|---|---|---|---|---|---|
| Manufacturer | ✓ | create + view | ✓ | initiate (→Distributor) | ✓ | – |
| Distributor | ✓ | view | ✓ | receive + initiate (→Pharmacy) | ✓ | – |
| Pharmacy | ✓ | view | ✓ | receive | ✓ | – |
| Admin | ✓ (system-wide) | view all | ✓ | view all | ✓ | ✓ |

Nobody sees a page they can't act on — a Pharmacy user never sees "Create Batch," a Manufacturer never sees "Receive." Verify is public-ish in spirit (works for anyone with a batch ID) but sits inside the app shell for the MVP since real verification also needs an authenticated actor in the flow.

---

## Phase 2 — Design System

**Direction:** MedChain should feel like a regulatory/compliance tool that happens to use blockchain — closer to a pharmacovigilance dashboard than a Web3 startup. Concretely: navy + clinical teal (trust, sterility) with a muted amber accent borrowed from amber pharmacy glass (the bottle color chosen specifically to protect medicine — a real, grounded reason to use it, not decoration). No purple/blue gradients, no glassmorphism, no glow, mostly flat panels separated by hairline borders rather than shadowed cards.

### Color system
| Token | Hex | Use |
|---|---|---|
| Primary — Clinical Navy | `#1B4B66` | primary actions, active nav, links, headers |
| Secondary — Chain Teal | `#2F6F63` | secondary buttons, blockchain-related accents/icons |
| Accent — Apothecary Amber | `#A66423` | rare emphasis: "Verify Medicine" CTA, key numbers |
| Background | `#F6F7F8` | app background |
| Surface | `#FFFFFF` | panels, cards, modals |
| Text | `#14181D` | primary text |
| Muted text | `#5B6470` | secondary text, captions |
| Border | `#DCE1E6` | dividers, input borders, panel edges |
| Success | `#1E8E5A` | VERIFIED / RECEIVED / LOW risk / authentic |
| Warning | `#D97706` | IN_TRANSIT / PENDING / MEDIUM risk |
| Error | `#C23B3B` | RECALLED / HIGH risk / failed verification |

### Typography
- **Family:** Public Sans (headings + body) — the USWDS/government-digital-services typeface; chosen deliberately for its regulatory, public-trust connotation rather than a default like Inter. One family, weight does the differentiating.
- **Data face:** IBM Plex Mono — used *only* for literal data values (batch IDs, tx hashes, timestamps in tables/timelines), never for labels or decoration.

| Style | Size/Line | Weight |
|---|---|---|
| H1 | 30px/38px | 700 |
| H2 | 22px/30px | 700 |
| H3 | 17px/26px | 600 |
| Body | 15px/24px | 400 |
| Small | 13px/20px | 400 |
| Label (table headers, form labels) | 13px/18px | 600, sentence case (not all-caps) |

### Spacing scale (4px base)
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`

### Radius, shadow, border
- Radius: **4px** inputs/buttons · **8px** panels/modals · **full pill** status badges only
- Shadow: reserved for things that actually float — modals, dropdowns, toasts (`0 8px 24px rgba(20,24,29,0.12)`). Everything else uses a 1px `#DCE1E6` border, no shadow — this is what keeps the UI from reading as the generic "SaaS card kit" (identical rounded cards + soft grey shadow everywhere).
- Focus ring: 2px Clinical Navy at 40% opacity, 2px offset — visible keyboard focus everywhere, no blur/glow.

### Components (states: default / hover / active / disabled / focus)
- **Buttons** — Primary (navy fill), Secondary (navy outline), Ghost (text only), Danger (red fill, recall actions only), Accent (amber fill, rare — verify CTA)
- **Cards/Panels** — white surface, 1px border, 8px radius, 24px padding, no shadow, no gradient wash
- **Inputs** — 40px height, 1px border, navy focus ring, red border + inline message on error
- **Tables** — light-gray header row, 1px row dividers, no zebra striping, ID/hash cells in mono
- **Badges** (status pills) — CREATED (neutral gray) · IN_TRANSIT (amber) · RECEIVED (teal) · VERIFIED (green) · RECALLED (red); same palette reused for risk LOW/MEDIUM/HIGH
- **Modals** — white, 8px radius, shadow, 40%-opacity solid backdrop (no blur)
- **Navigation** — top nav on public site; left sidebar in-app (240px desktop → icon rail on tablet → bottom bar/drawer on mobile); active item = navy text + 2px navy left border, not a filled pill
- **Tabs** — underline style, not segmented pills
- **Alerts/Toasts** — 4px colored left bar + white body, semantic color matches state
- **Timeline** — vertical 2px line; filled navy circle = done, filled amber circle = current, hollow gray = pending; no pulsing/animated markers
- **QR verification states** — Authentic (green banner, check icon), Not found (neutral, x icon), Recalled (red banner, warning icon — the one place a stronger red treatment is earned)

Avoided on purpose: uppercase tracked-out labels, numbered "01/02/03" eyebrows outside genuine sequences, em-dash labels, arrow-suffixed buttons, decorative gradients, blur/glass panels.

---

## Phase 3 — Architecture

```
medchain-frontend/          React + Vite + Tailwind
  src/app/                  routes by domain: auth, dashboard, batches,
                             verify, transfers, insights, profile, admin
  src/components/           Button, Card, Table, Badge, Modal, Nav,
                             Tabs, Alert, Timeline, QRCode, StatCard, Chart
  src/layouts/               AppShell (sidebar), PublicLayout (top nav)
  src/services/              authApi, batchApi, transferApi, verifyApi,
                             aiApi, blockchainApi
  src/context/               AuthContext, RoleContext

medchain-backend/           Spring Boot (Spring Security, Spring Data JPA)
  auth/                      users, roles, JWT
  batch/                     MedicineBatch CRUD + status transitions
  transfer/                  transfer workflow + history
  verification/              QR/ID lookup + chain-of-custody assembly
  blockchain/                writes events to the chain, stores tx hash/block
  ai/                        client for the risk-analysis service
  admin/                     users, organizations, system overview
  common/                    DTOs, exceptions, config

medchain-ai-service/        Python + FastAPI
  main.py                    endpoints
  risk_engine.py             rule-based scoring: transfer-delay thresholds,
                             ownership-hop anomalies, expiry proximity,
                             missing/late blockchain confirmations
  models.py                  pydantic schemas

medchain-contracts/         Hardhat (local dev network)
  contracts/MedicineTraceability.sol   events: BatchCreated,
                             TransferInitiated, TransferReceived, Verified
  scripts/deploy.js
```

**Data flow:** Frontend → Spring Boot REST API → PostgreSQL (system of record) + Blockchain service (writes event hash/block/timestamp) + AI service (risk score on demand).

### A note on what's realistic to build in this chat
This environment can produce the full source above as downloadable files, but it can't host a live Postgres database, a live Spring Boot server, a live Hardhat node, and a live FastAPI service simultaneously and wire them together for you to click through *inside this conversation*. Two honest paths forward, not mutually exclusive:

- **Path A — Interactive demo now:** a fully working, polished React app — real UI, real interactions, real state — with the backend/blockchain/AI calls simulated behind the same interfaces the real services would expose (same data shapes, same statuses, realistic timing). It runs live in chat right now and covers the entire demo flow from section 17 end-to-end. This is what you'd actually put in front of judges/recruiters.
- **Path B — Full source, run locally:** the complete codebase for all four services above, wired to real Postgres/Hardhat, delivered as files you run on your own machine.

Most teams building for a demo do A first and B afterward for the real build.
