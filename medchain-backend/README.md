# MedChain backend

Spring Boot 3 / Java 17. Implements auth, batch management, transfers,
verification, blockchain event recording, AI risk integration, dashboard
stats, and the admin console — see `MedChain-MVP-Plan.md` (Phase 3) for the
architecture this follows.

## A note on how confident to be in this code

**I could not compile or run this project.** Maven Central isn't reachable
from the sandbox this was built in (same networking restriction noted in
the contracts and AI service — only npm/PyPI/GitHub-adjacent domains are
allowlisted), so `mvn compile` has never actually been run against this
code. Contrast that with `medchain-ai-service` and `medchain-contracts` in
this project, both of which I *did* install, run, and test for real.

What I did do to raise confidence without a compiler:
- Checked brace balance and package/file-path consistency across all 66
  Java files programmatically.
- Cross-checked every entity getter/setter call site against the actual
  Lombok-annotated fields that generate them.
- Verified enum values (`BatchStatus`, `RiskLevel`) are referenced
  identically everywhere they're used, and that the risk-level strings
  returned by the AI service (`LOW`/`MEDIUM`/`HIGH`) match
  `RiskLevel.valueOf(...)` exactly.
- Cross-checked the JSON field names in `ai/dto/*` against the FastAPI
  service's actual pydantic aliases (`from`/`to`/`batchId`/etc.) rather
  than assuming they'd match.
- Wrote a real JUnit test (`TimelineBuilderTest`) for the one class with
  no Spring/JPA dependencies, since it's the piece I could reason about
  most rigorously by hand.

None of that substitutes for `mvn compile`. **Run that first thing** once
you have normal internet access, and treat any error it surfaces as a real
bug report, not a sandbox artifact — unlike the compiler-download error in
`medchain-contracts`, a Maven Central-based build failure here is on me,
not the network.

## Prerequisites

- Java 17+, Maven 3.9+
- PostgreSQL running locally, with a `medchain` database and user:
  ```sql
  CREATE DATABASE medchain;
  CREATE USER medchain WITH PASSWORD 'medchain';
  GRANT ALL PRIVILEGES ON DATABASE medchain TO medchain;
  ```
- The other two services running for full functionality (both optional —
  the app degrades gracefully without them, see below):
  - `medchain-ai-service` on `http://localhost:8000`
  - a Hardhat node with `medchain-contracts`'s `MedicineTraceability`
    deployed, address exported as `MEDCHAIN_CONTRACT_ADDRESS`

## Run it

```
mvn spring-boot:run
```

Starts on `:8080`. On first run against an empty database, `DemoDataSeeder`
creates six organizations (two manufacturers, two distributors, two
pharmacies) and one login per role — **password `password123`** for all of
them (see `DemoDataSeeder.java` for the exact email addresses). Set
`MEDCHAIN_SEED_DEMO_DATA=false` to skip this for a real deployment.

## Graceful degradation

Both external services are optional at runtime:
- **AI service down/unset** → batch/transfer/verify operations still
  succeed; the batch's cached risk fields just stay at their previous
  value (`null` if never successfully scored). Logged as a warning, not
  an error.
- **Blockchain disabled, unset, or unreachable** → same story: the
  off-chain state change (status, ownership) still happens; the batch
  simply ends up with fewer (or zero) rows in its blockchain history.
  Set `MEDCHAIN_BLOCKCHAIN_ENABLED=false` to turn this off deliberately.

Neither path fabricates a fake result — an unreachable AI service never
means a fake risk score gets shown, and an unreachable chain never means a
fake tx hash gets stored. Absence is shown as absence.

## The relayer-key simplification

`blockchain/BlockchainClient.java` signs every transaction with one
backend-controlled key (`medchain.blockchain.relayer-private-key`,
defaulting to Hardhat's well-known local account #0 — never use that key
anywhere with real funds). That means on-chain `msg.sender` is always the
relayer, not the individual organization that triggered the action off-chain.
The contract's own per-address ownership checks still exist and are still
real (see `medchain-contracts`' test suite, which exercises them with four
distinct keys) — they just aren't exercised through this backend yet,
because that would require giving each `Organization` its own managed
private key, which is real scope beyond an MVP. In this configuration, the
chain's role is an immutable, timestamped audit log; real authorization
(who's allowed to create/transfer/recall what) is enforced by Spring
Security roles, same as everywhere else in the app.

## API summary

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/register` | POST | public | Create an org + user, returns a JWT |
| `/api/auth/login` | POST | public | Returns a JWT |
| `/api/auth/me` | GET | any | Current user |
| `/api/dashboard` | GET | any | Stats, recent activity, risk alerts |
| `/api/batches` | GET | any | List all batches |
| `/api/batches` | POST | MANUFACTURER | Create a batch (records `BATCH_CREATED`, scores risk) |
| `/api/batches/{id}` | GET | any | Full batch detail incl. timeline + blockchain history |
| `/api/batches/{id}/recall` | POST | MANUFACTURER (creator only) | Recall a batch |
| `/api/transfers` | POST | any | Initiate a transfer (must be current owner) |
| `/api/transfers/{id}/receive` | POST | any | Confirm receipt (must be named recipient) |
| `/api/transfers/pending` | GET | any | Pending transfers addressed to your org |
| `/api/transfers/history` | GET | any | Completed transfers |
| `/api/verify/{batchId}` | GET | any | Verification result (authentic / recalled / not found) |
| `/api/admin/users` \| `/organizations` \| `/overview` | GET | ADMIN | Admin console data |

## Wiring the frontend to this instead of mock data

`medchain-frontend/src/data/mockData.js` and `src/context/AuthContext.jsx`
are the two files that change: point `services/*Api.js` (new, one per
domain) at `http://localhost:8080/api/...` with the JWT from `/api/auth/login`
attached as a `Bearer` header, and swap each page's `import { getBatches }
from "../../data/mockData"` for a call to that API client. The response
shapes were deliberately kept close to the mock data's shape to make this
swap mostly mechanical.
