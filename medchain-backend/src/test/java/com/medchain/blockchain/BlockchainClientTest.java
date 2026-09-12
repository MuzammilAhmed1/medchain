package com.medchain.blockchain;

import com.medchain.batch.MedicineBatch;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.ECKeyPair;
import org.web3j.protocol.Web3j;

import java.math.BigInteger;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class BlockchainClientTest {

    @Mock
    private Web3j web3j;
    @Mock
    private BlockchainEventRepository blockchainEventRepository;

    private Credentials credentials;

    @BeforeEach
    void setUp() {
        ECKeyPair keyPair = ECKeyPair.create(BigInteger.ONE);
        credentials = Credentials.create(keyPair);
    }

    @Test
    void recordBatchCreated_whenDisabled_returnsEmpty() {
        BlockchainProperties props = new BlockchainProperties(false, "http://localhost:8545", "0x123", "0xabc", 31337L);
        BlockchainClient client = new BlockchainClient(web3j, credentials, props, blockchainEventRepository);

        MedicineBatch batch = MedicineBatch.builder().id("MC-2026-00001").build();
        Optional<BlockchainEvent> result = client.recordBatchCreated(batch);

        assertThat(result).isEmpty();
    }

    @Test
    void recordBatchCreated_whenContractAddressBlank_returnsEmpty() {
        BlockchainProperties props = new BlockchainProperties(true, "http://localhost:8545", "", "0xabc", 31337L);
        BlockchainClient client = new BlockchainClient(web3j, credentials, props, blockchainEventRepository);

        MedicineBatch batch = MedicineBatch.builder().id("MC-2026-00001").build();
        Optional<BlockchainEvent> result = client.recordBatchCreated(batch);

        assertThat(result).isEmpty();
    }

    @Test
    void recordTransferInitiated_whenDisabled_returnsEmpty() {
        BlockchainProperties props = new BlockchainProperties(false, "http://localhost:8545", "0x123", "0xabc", 31337L);
        BlockchainClient client = new BlockchainClient(web3j, credentials, props, blockchainEventRepository);

        MedicineBatch batch = MedicineBatch.builder().id("MC-2026-00001").build();
        Optional<BlockchainEvent> result = client.recordTransferInitiated(batch);

        assertThat(result).isEmpty();
    }

    @Test
    void recordTransferReceived_whenDisabled_returnsEmpty() {
        BlockchainProperties props = new BlockchainProperties(false, "http://localhost:8545", "0x123", "0xabc", 31337L);
        BlockchainClient client = new BlockchainClient(web3j, credentials, props, blockchainEventRepository);

        MedicineBatch batch = MedicineBatch.builder().id("MC-2026-00001").build();
        Optional<BlockchainEvent> result = client.recordTransferReceived(batch);

        assertThat(result).isEmpty();
    }
}
