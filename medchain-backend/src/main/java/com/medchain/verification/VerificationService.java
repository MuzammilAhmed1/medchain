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

    @Transactional
    public VerificationResponse verify(String batchId) {
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
            blockchainClient.recordVerified(batch);
            batchService.markVerified(batch);
            batchService.refreshRisk(batch);
        }

        return new VerificationResponse(true, authentic, batchService.getDetail(batchId));
    }
}
