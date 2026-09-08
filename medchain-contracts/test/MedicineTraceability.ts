import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

const BATCH_ID = "MC-2026-00125";

// Status enum mirrors the Solidity contract:
// 0 CREATED, 1 IN_TRANSIT, 2 RECEIVED, 3 VERIFIED, 4 RECALLED
const Status = {
  CREATED: 0n,
  IN_TRANSIT: 1n,
  RECEIVED: 2n,
  VERIFIED: 3n,
  RECALLED: 4n,
};

async function deployFixture() {
  const [manufacturer, distributor, pharmacy, stranger] = await ethers.getSigners();
  const contract = await ethers.deployContract("MedicineTraceability");
  return { contract, manufacturer, distributor, pharmacy, stranger };
}

describe("MedicineTraceability", function () {
  describe("createBatch", function () {
    it("registers the batch with the caller as manufacturer and owner", async function () {
      const { contract, manufacturer } = await networkHelpers.loadFixture(deployFixture);

      await expect(contract.createBatch(BATCH_ID)).to.emit(contract, "BatchCreated");

      const [mfr, owner, status] = await contract.getBatch(BATCH_ID);
      expect(mfr).to.equal(manufacturer.address);
      expect(owner).to.equal(manufacturer.address);
      expect(status).to.equal(Status.CREATED);
    });

    it("reverts if the batch already exists", async function () {
      const { contract } = await networkHelpers.loadFixture(deployFixture);
      await contract.createBatch(BATCH_ID);

      await expect(contract.createBatch(BATCH_ID)).to.be.revertedWith(
        "MedChain: batch already exists"
      );
    });
  });

  describe("initiateTransfer", function () {
    it("only the current owner can initiate a transfer", async function () {
      const { contract, distributor, stranger } = await networkHelpers.loadFixture(deployFixture);
      await contract.createBatch(BATCH_ID);

      await expect(
        contract.connect(stranger).initiateTransfer(BATCH_ID, distributor.address)
      ).to.be.revertedWith("MedChain: caller is not the current owner");
    });

    it("moves status to IN_TRANSIT and emits TransferInitiated", async function () {
      const { contract, distributor } = await networkHelpers.loadFixture(deployFixture);
      await contract.createBatch(BATCH_ID);

      await expect(contract.initiateTransfer(BATCH_ID, distributor.address)).to.emit(
        contract,
        "TransferInitiated"
      );

      const [, , status] = await contract.getBatch(BATCH_ID);
      expect(status).to.equal(Status.IN_TRANSIT);
    });

    it("cannot be called on a recalled batch", async function () {
      const { contract, distributor } = await networkHelpers.loadFixture(deployFixture);
      await contract.createBatch(BATCH_ID);
      await contract.recallBatch(BATCH_ID);

      await expect(
        contract.initiateTransfer(BATCH_ID, distributor.address)
      ).to.be.revertedWith("MedChain: batch has been recalled");
    });
  });

  describe("receiveTransfer", function () {
    it("only the named recipient can receive", async function () {
      const { contract, distributor, stranger } = await networkHelpers.loadFixture(deployFixture);
      await contract.createBatch(BATCH_ID);
      await contract.initiateTransfer(BATCH_ID, distributor.address);

      await expect(contract.connect(stranger).receiveTransfer(BATCH_ID)).to.be.revertedWith(
        "MedChain: caller is not the named recipient"
      );
    });

    it("transfers ownership and moves status to RECEIVED", async function () {
      const { contract, distributor } = await networkHelpers.loadFixture(deployFixture);
      await contract.createBatch(BATCH_ID);
      await contract.initiateTransfer(BATCH_ID, distributor.address);

      await expect(contract.connect(distributor).receiveTransfer(BATCH_ID)).to.emit(
        contract,
        "TransferReceived"
      );

      const [, owner, status] = await contract.getBatch(BATCH_ID);
      expect(owner).to.equal(distributor.address);
      expect(status).to.equal(Status.RECEIVED);
    });
  });

  describe("verifyBatch", function () {
    it("is callable by anyone and moves RECEIVED -> VERIFIED", async function () {
      const { contract, distributor, stranger } = await networkHelpers.loadFixture(deployFixture);
      await contract.createBatch(BATCH_ID);
      await contract.initiateTransfer(BATCH_ID, distributor.address);
      await contract.connect(distributor).receiveTransfer(BATCH_ID);

      await expect(contract.connect(stranger).verifyBatch(BATCH_ID)).to.emit(contract, "Verified");

      const [, , status] = await contract.getBatch(BATCH_ID);
      expect(status).to.equal(Status.VERIFIED);
    });

    it("reverts on a recalled batch", async function () {
      const { contract, stranger } = await networkHelpers.loadFixture(deployFixture);
      await contract.createBatch(BATCH_ID);
      await contract.recallBatch(BATCH_ID);

      await expect(contract.connect(stranger).verifyBatch(BATCH_ID)).to.be.revertedWith(
        "MedChain: batch has been recalled"
      );
    });
  });

  describe("recallBatch", function () {
    it("only the original manufacturer can recall, even after ownership moved on", async function () {
      const { contract, manufacturer, distributor } = await networkHelpers.loadFixture(deployFixture);
      await contract.createBatch(BATCH_ID);
      await contract.initiateTransfer(BATCH_ID, distributor.address);
      await contract.connect(distributor).receiveTransfer(BATCH_ID);

      await expect(contract.connect(distributor).recallBatch(BATCH_ID)).to.be.revertedWith(
        "MedChain: caller is not the manufacturer"
      );

      await expect(contract.connect(manufacturer).recallBatch(BATCH_ID)).to.emit(
        contract,
        "Recalled"
      );

      const [, , status] = await contract.getBatch(BATCH_ID);
      expect(status).to.equal(Status.RECALLED);
    });
  });

  describe("nonexistent batches", function () {
    it("reverts any lifecycle call on a batch id that was never created", async function () {
      const { contract, distributor } = await networkHelpers.loadFixture(deployFixture);

      await expect(
        contract.initiateTransfer("NOT-A-REAL-BATCH", distributor.address)
      ).to.be.revertedWith("MedChain: batch does not exist");
    });
  });
});
