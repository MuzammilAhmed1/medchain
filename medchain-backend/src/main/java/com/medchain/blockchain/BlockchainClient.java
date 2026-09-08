package com.medchain.blockchain;

import com.medchain.batch.MedicineBatch;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.response.PollingTransactionReceiptProcessor;

import java.math.BigInteger;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Signs and sends transactions to the deployed MedicineTraceability
 * contract, then persists the resulting event as a BlockchainEvent row.
 *
 * <p><b>MVP simplification:</b> every transaction is signed by a single
 * backend-controlled relayer key rather than a per-organization key, so
 * on-chain {@code msg.sender} is always the relayer. This means the
 * contract's own per-address ownership checks are trivially satisfied by
 * the relayer in this integration (it is always both the caller and,
 * after {@code initiateTransfer}, the named recipient) rather than
 * providing real multi-party authorization — that guarantee still exists
 * in the contract itself (see medchain-contracts' test suite, which
 * exercises it with distinct keys), it just isn't exercised through this
 * backend yet. Real authorization here is enforced by Spring Security
 * roles; the chain's job in this configuration is an immutable,
 * timestamped audit log, not per-user cryptographic access control.
 * Upgrading to per-org keys would mean giving each Organization its own
 * managed key pair and using it here instead of the shared relayer.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BlockchainClient {

    private final Web3j web3j;
    private final Credentials relayerCredentials;
    private final BlockchainProperties properties;
    private final BlockchainEventRepository blockchainEventRepository;

    public Optional<BlockchainEvent> recordBatchCreated(MedicineBatch batch) {
        return record(batch, BlockchainEventType.BATCH_CREATED, "createBatch",
                List.<Type>of(new Utf8String(batch.getId())));
    }

    public Optional<BlockchainEvent> recordTransferInitiated(MedicineBatch batch) {
        return record(batch, BlockchainEventType.TRANSFER_INITIATED, "initiateTransfer",
                List.<Type>of(new Utf8String(batch.getId()), new Address(relayerCredentials.getAddress())));
    }

    public Optional<BlockchainEvent> recordTransferReceived(MedicineBatch batch) {
        return record(batch, BlockchainEventType.TRANSFER_RECEIVED, "receiveTransfer",
                List.<Type>of(new Utf8String(batch.getId())));
    }

    public Optional<BlockchainEvent> recordVerified(MedicineBatch batch) {
        return record(batch, BlockchainEventType.VERIFIED, "verifyBatch",
                List.<Type>of(new Utf8String(batch.getId())));
    }

    public Optional<BlockchainEvent> recordRecalled(MedicineBatch batch) {
        return record(batch, BlockchainEventType.RECALLED, "recallBatch",
                List.<Type>of(new Utf8String(batch.getId())));
    }

    private Optional<BlockchainEvent> record(
            MedicineBatch batch, BlockchainEventType type, String functionName, List<Type> inputs
    ) {
        if (!properties.enabled()) {
            log.warn("Blockchain recording disabled (medchain.blockchain.enabled=false); skipping {} for batch {}",
                    type, batch.getId());
            return Optional.empty();
        }
        if (properties.contractAddress() == null || properties.contractAddress().isBlank()) {
            log.warn("No contract address configured (medchain.blockchain.contract-address); skipping {} for batch {}",
                    type, batch.getId());
            return Optional.empty();
        }

        try {
            Function function = new Function(functionName, inputs, List.of());
            String encodedFunction = FunctionEncoder.encode(function);

            RawTransactionManager txManager =
                    new RawTransactionManager(web3j, relayerCredentials, properties.chainId());

            BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice();
            BigInteger gasLimit = BigInteger.valueOf(500_000);

            EthSendTransaction sendResponse = txManager.sendTransaction(
                    gasPrice, gasLimit, properties.contractAddress(), encodedFunction, BigInteger.ZERO);

            if (sendResponse.hasError()) {
                throw new IllegalStateException(
                        "Transaction rejected: " + sendResponse.getError().getMessage());
            }

            String txHash = sendResponse.getTransactionHash();
            TransactionReceipt receipt = new PollingTransactionReceiptProcessor(web3j, 1000, 40)
                    .waitForTransactionReceipt(txHash);

            BlockchainEvent event = blockchainEventRepository.save(BlockchainEvent.builder()
                    .batch(batch)
                    .type(type)
                    .txHash(txHash)
                    .blockNumber(receipt.getBlockNumber().longValue())
                    .timestamp(Instant.now())
                    .build());

            log.info("Recorded {} for batch {} at tx {}", type, batch.getId(), txHash);
            return Optional.of(event);

        } catch (Exception e) {
            // Deliberately non-fatal: the caller (batch/transfer service) proceeds
            // with the off-chain state change even if the chain write fails, so a
            // temporarily unreachable Hardhat node doesn't block the whole app.
            // The absence of a BlockchainEvent row is the honest reflection of
            // that - nothing is faked here.
            log.error("Failed to record {} on-chain for batch {}: {}", type, batch.getId(), e.getMessage(), e);
            return Optional.empty();
        }
    }
}
