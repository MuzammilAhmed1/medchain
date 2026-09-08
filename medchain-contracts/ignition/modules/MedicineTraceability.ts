import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Deploy with: npx hardhat ignition deploy ignition/modules/MedicineTraceability.ts --network <network>
export default buildModule("MedicineTraceabilityModule", (m) => {
  const traceability = m.contract("MedicineTraceability");
  return { traceability };
});
