package com.medchain.blockchain;

import com.medchain.batch.MedicineBatch;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "blockchain_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlockchainEvent {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private MedicineBatch batch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlockchainEventType type;

    @Column(name = "tx_hash", nullable = false)
    private String txHash;

    @Column(name = "block_number", nullable = false)
    private long blockNumber;

    @Column(nullable = false)
    private Instant timestamp;
}
