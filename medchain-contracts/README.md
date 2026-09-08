# MedChain smart contracts

A single contract, `MedicineTraceability.sol`, recording Feature 6 from the
MVP brief: batch creation, transfer initiation/receipt, verification, and
recall — each as an event, with just enough on-chain state (current owner,
status, manufacturer) to enforce who is allowed to do what.

**See `COMPILE_NOTE.md` first** if `npx hardhat compile` fails for you with
a compiler-download error — that's a sandbox networking artifact from where
this was built, not a problem with the contract, and that note explains
exactly how the contract was verified without it.

## Run it

```
npm install
npx hardhat compile
npx hardhat test
```

## Deploy locally

```
npx hardhat node                                    # in one terminal
npx hardhat ignition deploy ignition/modules/MedicineTraceability.ts --network hardhatMainnet
```

## Contract API

| Function | Who can call it | Effect |
|---|---|---|
| `createBatch(batchId)` | anyone (becomes the manufacturer) | Registers a new batch, status `CREATED` |
| `initiateTransfer(batchId, to)` | current owner | Status → `IN_TRANSIT`, names `to` as pending recipient |
| `receiveTransfer(batchId)` | the named recipient | Status → `RECEIVED`, ownership moves to caller |
| `verifyBatch(batchId)` | anyone | Emits `Verified`; status `RECEIVED` → `VERIFIED` on first call |
| `recallBatch(batchId)` | the original manufacturer | Status → `RECALLED`, terminal — no further transfers or verification |
| `getBatch(batchId)` | anyone (view) | Returns `(manufacturer, currentOwner, status)` |

Every state-changing function emits a matching event
(`BatchCreated`, `TransferInitiated`, `TransferReceived`, `Verified`,
`Recalled`) carrying the batch ID, the relevant address, and
`block.timestamp` — this event log is what the Spring Boot `blockchain/`
module reads to populate the "Blockchain history" section of the batch
details page.

## Wiring it into the backend

The Spring Boot `blockchain/` module holds an ethers/web3j client pointed
at this contract's address and calls the matching function whenever a
batch/transfer/verification happens in the app, then stores the resulting
transaction hash and block number on the batch record.
