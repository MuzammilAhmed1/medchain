package com.medchain.verification;

import com.medchain.batch.BatchService;
import com.medchain.batch.BatchStatus;
import com.medchain.batch.MedicineBatch;
import com.medchain.blockchain.BlockchainClient;
import com.medchain.verification.dto.VerificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private final BatchService batchService;
    private final BlockchainClient blockchainClient;
    private final com.medchain.audit.AuditEventService auditEventService;

    @Transactional
    public VerificationResponse verify(String rawIdentifier) {
        if (rawIdentifier == null || rawIdentifier.isBlank()) {
            return VerificationResponse.notFound();
        }

        String batchId = rawIdentifier.trim();
        if (batchId.toUpperCase().startsWith("MEDCHAIN:BATCH:")) {
            batchId = batchId.substring("MEDCHAIN:BATCH:".length()).trim();
        }

        MedicineBatch batch;
        try {
            batch = batchService.getBatchOrThrow(batchId);
        } catch (Exception notFound) {
            return VerificationResponse.notFound();
        }

        boolean authentic = batch.getStatus() != BatchStatus.RECALLED;

        if (authentic) {
            // The contract reverts verifyBatch on a recalled batch, so we
            // only attempt to record this on-chain when it would succeed.
            var onChainEvent = blockchainClient.recordVerified(batch);
            batchService.markVerified(batch);

            auditEventService.record(batch, com.medchain.audit.AuditEventType.QR_VERIFIED,
                    "Verifier", "Public Verification Portal",
                    "Batch verified authentic against supply-chain and blockchain records");

            onChainEvent.ifPresent(ev -> auditEventService.record(
                    batch, com.medchain.audit.AuditEventType.BLOCKCHAIN_RECORDED, "Relayer", "Blockchain",
                    "Recorded VERIFIED in block " + ev.getBlockNumber() + " (tx: " + ev.getTxHash() + ")"));

            batchService.refreshRisk(batch);
        } else {
            auditEventService.record(batch, com.medchain.audit.AuditEventType.QR_VERIFIED,
                    "Verifier", "Public Verification Portal",
                    "Verification warning: batch was flagged as RECALLED");
        }

        return new VerificationResponse(true, authentic, batchService.getDetail(batch.getId()));
    }
}
