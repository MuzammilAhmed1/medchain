package com.medchain.transfer;

import com.medchain.batch.MedicineBatch;
import com.medchain.org.Organization;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "transfers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transfer {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private MedicineBatch batch;

    @ManyToOne(optional = false)
    @JoinColumn(name = "from_org_id", nullable = false)
    private Organization fromOrg;

    @ManyToOne(optional = false)
    @JoinColumn(name = "to_org_id", nullable = false)
    private Organization toOrg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TransferStatus status = TransferStatus.INITIATED;

    @Column(name = "initiated_at", nullable = false)
    @Builder.Default
    private Instant initiatedAt = Instant.now();

    @Column(name = "received_at")
    private Instant receivedAt;
}
