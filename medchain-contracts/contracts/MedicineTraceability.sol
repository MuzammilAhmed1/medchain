// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MedicineTraceability
/// @notice Records the chain-of-custody events for medicine batches from
/// Feature 6 of the MedChain MVP brief: creation, transfer, receipt,
/// verification, and recall. Deliberately minimal — one contract, one
/// struct, five events — the traceability comes from the immutable event
/// log, not from a complex on-chain ecosystem.
contract MedicineTraceability {
    enum Status {
        CREATED,
        IN_TRANSIT,
        RECEIVED,
        VERIFIED,
        RECALLED
    }

    struct Batch {
        address manufacturer;
        address currentOwner;
        Status status;
        bool exists;
    }

    mapping(string => Batch) private batches;
    mapping(string => address) private pendingRecipient;

    event BatchCreated(string indexed batchId, address indexed manufacturer, uint256 timestamp);
    event TransferInitiated(string indexed batchId, address indexed from, address indexed to, uint256 timestamp);
    event TransferReceived(string indexed batchId, address indexed receiver, uint256 timestamp);
    event Verified(string indexed batchId, address indexed verifier, uint256 timestamp);
    event Recalled(string indexed batchId, address indexed manufacturer, uint256 timestamp);

    modifier batchExists(string calldata batchId) {
        require(batches[batchId].exists, "MedChain: batch does not exist");
        _;
    }

    /// @notice Registers a new batch. Called by the manufacturer when a
    /// physical batch is produced and its QR code generated off-chain.
    function createBatch(string calldata batchId) external {
        require(!batches[batchId].exists, "MedChain: batch already exists");

        batches[batchId] = Batch({
            manufacturer: msg.sender,
            currentOwner: msg.sender,
            status: Status.CREATED,
            exists: true
        });

        emit BatchCreated(batchId, msg.sender, block.timestamp);
    }

    /// @notice Starts a transfer to `to`. Only the current owner may call
    /// this, and a recalled batch can never move again.
    function initiateTransfer(string calldata batchId, address to) external batchExists(batchId) {
        Batch storage batch = batches[batchId];
        require(msg.sender == batch.currentOwner, "MedChain: caller is not the current owner");
        require(batch.status != Status.RECALLED, "MedChain: batch has been recalled");
        require(to != address(0), "MedChain: recipient cannot be the zero address");

        batch.status = Status.IN_TRANSIT;
        pendingRecipient[batchId] = to;

        emit TransferInitiated(batchId, msg.sender, to, block.timestamp);
    }

    /// @notice Completes a transfer. Only the address named as recipient
    /// in `initiateTransfer` may confirm receipt.
    function receiveTransfer(string calldata batchId) external batchExists(batchId) {
        Batch storage batch = batches[batchId];
        require(batch.status == Status.IN_TRANSIT, "MedChain: batch is not in transit");
        require(msg.sender == pendingRecipient[batchId], "MedChain: caller is not the named recipient");

        batch.currentOwner = msg.sender;
        batch.status = Status.RECEIVED;
        delete pendingRecipient[batchId];

        emit TransferReceived(batchId, msg.sender, block.timestamp);
    }

    /// @notice Records that someone verified this batch. Open to any
    /// caller by design — verification is meant to be checkable by anyone
    /// holding the medicine, not just supply-chain participants. The first
    /// verification after receipt marks the batch VERIFIED; later calls
    /// still emit the event (proof-of-check) without changing state again.
    function verifyBatch(string calldata batchId) external batchExists(batchId) {
        Batch storage batch = batches[batchId];
        require(batch.status != Status.RECALLED, "MedChain: batch has been recalled");

        if (batch.status == Status.RECEIVED) {
            batch.status = Status.VERIFIED;
        }

        emit Verified(batchId, msg.sender, block.timestamp);
    }

    /// @notice Flags a batch as recalled. Only the manufacturer that
    /// created it may do this, and it is terminal — a recalled batch
    /// cannot be transferred or verified afterwards.
    function recallBatch(string calldata batchId) external batchExists(batchId) {
        Batch storage batch = batches[batchId];
        require(msg.sender == batch.manufacturer, "MedChain: caller is not the manufacturer");

        batch.status = Status.RECALLED;

        emit Recalled(batchId, msg.sender, block.timestamp);
    }

    /// @notice Reads a batch's current on-chain state.
    function getBatch(string calldata batchId)
        external
        view
        batchExists(batchId)
        returns (address manufacturer, address currentOwner, Status status)
    {
        Batch storage batch = batches[batchId];
        return (batch.manufacturer, batch.currentOwner, batch.status);
    }

    function batchExistsCheck(string calldata batchId) external view returns (bool) {
        return batches[batchId].exists;
    }
}
