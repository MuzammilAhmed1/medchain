import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ethers } from "ethers";
import solc from "solc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractPath = path.join(__dirname, "..", "contracts", "MedicineTraceability.sol");

console.log("Compiling MedicineTraceability.sol...");
const source = readFileSync(contractPath, "utf8");
const input = {
  language: "Solidity",
  sources: { "MedicineTraceability.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  for (const err of output.errors) {
    if (err.severity === "error") {
      console.error(err.formattedMessage);
      process.exit(1);
    }
  }
}

const artifact = output.contracts["MedicineTraceability.sol"]["MedicineTraceability"];
const abi = artifact.abi;
const bytecode = "0x" + artifact.evm.bytecode.object;

const RPC_URL = process.env.AMOY_RPC_URL || "https://polygon-amoy-bor-rpc.publicnode.com";
const PRIVATE_KEY = process.env.AMOY_PRIVATE_KEY || "0x269506435a337c6190c1c7ab9f498f87abfcf31c11a25d88461c2bc75e13f11c";

console.log(`Connecting to RPC: ${RPC_URL}`);
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

console.log(`Deployer address: ${wallet.address}`);
const balance = await provider.getBalance(wallet.address);
console.log(`Current balance: ${ethers.formatEther(balance)} POL`);

if (balance === 0n) {
  console.error("Deployer has zero balance! Wait for faucet tokens.");
  process.exit(1);
}

console.log("Deploying contract to Polygon Amoy...");
const factory = new ethers.ContractFactory(abi, bytecode, wallet);
const contract = await factory.deploy();
console.log(`Transaction submitted! Hash: ${contract.deploymentTransaction()?.hash}`);
console.log("Waiting for confirmation on Polygon Amoy...");
await contract.waitForDeployment();

const deployedAddress = await contract.getAddress();
console.log("\n========================================================");
console.log(`SUCCESS! MedicineTraceability deployed at: ${deployedAddress}`);
console.log(`PolygonScan: https://amoy.polygonscan.com/address/${deployedAddress}`);
console.log("========================================================\n");

const info = {
  contractAddress: deployedAddress,
  network: "Polygon Amoy",
  chainId: 80002,
  rpcUrl: RPC_URL,
  relayerAddress: wallet.address,
  deployedAt: new Date().toISOString(),
  txHash: contract.deploymentTransaction()?.hash,
};
writeFileSync(path.join(__dirname, "..", "amoy-deployment.json"), JSON.stringify(info, null, 2));
console.log("Saved deployment info to amoy-deployment.json");
