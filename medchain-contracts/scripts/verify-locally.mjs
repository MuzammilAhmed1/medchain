// Deploys MedicineTraceability to the local Hardhat node using the
// bytecode/ABI produced by our direct solc compile (see COMPILE_NOTE.md),
// then exercises the full lifecycle with real ethers.js transactions
// against a real EVM. This substitutes for `hardhat test` in this sandbox,
// where Hardhat's own solc download is blocked by network policy.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ethers } from "ethers";
import solc from "solc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractPath = path.join(__dirname, "..", "contracts", "MedicineTraceability.sol");

const source = readFileSync(contractPath, "utf8");
const input = {
  language: "Solidity",
  sources: { "MedicineTraceability.sol": { content: source } },
  settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const artifact = output.contracts["MedicineTraceability.sol"]["MedicineTraceability"];
const abi = artifact.abi;
const bytecode = "0x" + artifact.evm.bytecode.object;

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const manufacturer = await provider.getSigner(0);
const distributor = await provider.getSigner(1);
const pharmacy = await provider.getSigner(2);
const stranger = await provider.getSigner(3);

let passed = 0;
let failed = 0;

function ok(label, condition) {
  if (condition) {
    console.log(`PASS  ${label}`);
    passed++;
  } else {
    console.log(`FAIL  ${label}`);
    failed++;
  }
}

async function expectRevert(label, promise) {
  try {
    await promise;
    ok(label, false);
  } catch (err) {
    ok(label, /revert|MedChain/i.test(err.message));
  }
}

console.log("Deploying MedicineTraceability...");
const factory = new ethers.ContractFactory(abi, bytecode, manufacturer);
const contract = await factory.deploy();
await contract.waitForDeployment();
console.log("Deployed at", await contract.getAddress(), "\n");

const batchId = "MC-2026-TEST-01";

// 1. Create batch
const createTx = await contract.connect(manufacturer).createBatch(batchId);
const createReceipt = await createTx.wait();
ok("createBatch emits BatchCreated", createReceipt.logs.length === 1);

let [mfr, owner, status] = await contract.getBatch(batchId);
ok("manufacturer is set correctly", mfr === (await manufacturer.getAddress()));
ok("owner is manufacturer right after creation", owner === (await manufacturer.getAddress()));
ok("status is CREATED (0)", status === 0n);

await expectRevert(
  "creating the same batch twice reverts",
  contract.connect(manufacturer).createBatch(batchId)
);

// 2. Only the owner can initiate a transfer
await expectRevert(
  "stranger cannot initiate transfer",
  contract.connect(stranger).initiateTransfer(batchId, await distributor.getAddress())
);

const initTx = await contract
  .connect(manufacturer)
  .initiateTransfer(batchId, await distributor.getAddress());
await initTx.wait();
[, , status] = await contract.getBatch(batchId);
ok("status is IN_TRANSIT (1) after initiateTransfer", status === 1n);

// 3. Only the named recipient can receive
await expectRevert(
  "stranger cannot receive transfer",
  contract.connect(stranger).receiveTransfer(batchId)
);

const receiveTx = await contract.connect(distributor).receiveTransfer(batchId);
await receiveTx.wait();
[, owner, status] = await contract.getBatch(batchId);
ok("owner is now distributor", owner === (await distributor.getAddress()));
ok("status is RECEIVED (2) after receiveTransfer", status === 2n);

// 4. Distributor forwards to pharmacy
await (await contract.connect(distributor).initiateTransfer(batchId, await pharmacy.getAddress())).wait();
await (await contract.connect(pharmacy).receiveTransfer(batchId)).wait();
[, owner, status] = await contract.getBatch(batchId);
ok("owner is now pharmacy", owner === (await pharmacy.getAddress()));

// 5. Anyone can verify; status becomes VERIFIED from RECEIVED
const verifyTx = await contract.connect(stranger).verifyBatch(batchId);
await verifyTx.wait();
[, , status] = await contract.getBatch(batchId);
ok("status is VERIFIED (3) after verifyBatch", status === 3n);

// 6. Only the original manufacturer can recall
await expectRevert(
  "pharmacy (current owner) cannot recall — only manufacturer can",
  contract.connect(pharmacy).recallBatch(batchId)
);

const recallTx = await contract.connect(manufacturer).recallBatch(batchId);
await recallTx.wait();
[, , status] = await contract.getBatch(batchId);
ok("status is RECALLED (4) after recallBatch", status === 4n);

// 7. A recalled batch can never move or be re-verified
await expectRevert(
  "cannot initiate transfer on a recalled batch",
  contract.connect(pharmacy).initiateTransfer(batchId, await stranger.getAddress())
);
await expectRevert(
  "cannot verify a recalled batch",
  contract.connect(stranger).verifyBatch(batchId)
);

// 8. Operating on a nonexistent batch reverts
await expectRevert(
  "operating on a nonexistent batch reverts",
  contract.connect(manufacturer).initiateTransfer("NOT-A-REAL-BATCH", await distributor.getAddress())
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
