package com.medchain.transfer.dto;

import com.medchain.transfer.Transfer;
import com.medchain.transfer.TransferStatus;

import java.time.Instant;

public record TransferResponse(
        String id,
        String batchId,
        String medicineName,
        String from,
        String to,
        TransferStatus status,
        Instant initiatedAt,
        Instant receivedAt
) {
    public static TransferResponse from(Transfer t) {
        return new TransferResponse(
                t.getId().toString(),
                t.getBatch().getId(),
                t.getBatch().getMedicineName(),
                t.getFromOrg().getName(),
                t.getToOrg().getName(),
                t.getStatus(),
                t.getInitiatedAt(),
                t.getReceivedAt()
        );
    }
}
