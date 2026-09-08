# MedChain — full MVP

An AI + blockchain medicine supply-chain tracking MVP: manufacturers create
batches, hand them through distributors to pharmacies, every step is
recorded on-chain, and anyone can verify a batch by ID or QR code. Built in
four phases — see `MedChain-MVP-Plan.md` for the sitemap, design system,
and architecture this follows.

## What's in here

| Folder | What it is | Verified how |
|---|---|---|
| `medchain-frontend/` | React + Vite + Tailwind UI, wired to the real API | Builds clean; every phase confirmed with a real `npm run build` |
| `medchain-backend/` | Spring Boot API — auth, batches, transfers, verification, blockchain writes, AI integration, admin | Static checks only — **run `mvn compile` first**, see its README |
| `medchain-ai-service/` | FastAPI rule-based risk scoring | 9 real unit tests + live HTTP round-trip, all passing |
| `medchain-contracts/` | Solidity traceability contract (Hardhat) | Deployed to a live local chain, 17/17 lifecycle + access-control assertions passing |

Each folder has its own README with full detail — including two honest
verification notes worth reading before you dig in: `medchain-backend/README.md`
explains why that one couldn't be compiled where this was built, and
`medchain-contracts/COMPILE_NOTE.md` explains how the contract was verified
without Hardhat's own compiler (a sandbox networking artifact, not a
contract problem).

## Run order

Each piece is independent to build, but the demo flow needs all four
talking to each other:

```
1. medchain-contracts   npx hardhat node          # local chain, keep running
                         npx hardhat ignition deploy ignition/modules/MedicineTraceability.ts \
                           --network hardhatMainnet
                         # note the deployed contract address

2. medchain-ai-service   python3 -m venv venv && source venv/bin/activate
                         pip install -r requirements.txt
                         uvicorn app.main:app --port 8000

3. medchain-backend      # create the Postgres DB (see its README)
                         export MEDCHAIN_CONTRACT_ADDRESS=<address from step 1>
                         mvn spring-boot:run

4. medchain-frontend     npm install
                         npm run dev
```

Then open the frontend, log in as `priya@abcpharma.com` / `password123`
(full seeded account list in `medchain-backend/DemoDataSeeder.java`), and
walk the demo flow: create a batch → transfer to a distributor → log in as
that distributor → receive it → transfer to a pharmacy → verify by QR →
open the batch details page to see the blockchain history and AI risk
analysis together.

The frontend degrades gracefully if you skip steps 1–2: batches and
transfers still work, they just show "not yet analyzed" / an empty
blockchain history instead of fabricating a result.
