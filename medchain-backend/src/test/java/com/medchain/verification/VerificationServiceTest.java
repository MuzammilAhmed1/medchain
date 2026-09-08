package com.medchain.verification;

import com.medchain.audit.AuditEventService;
import com.medchain.batch.BatchRepository;
import com.medchain.batch.BatchService;
import com.medchain.batch.BatchStatus;
import com.medchain.batch.MedicineBatch;
import com.medchain.batch.RiskLevel;
import com.medchain.batch.dto.BatchDetailResponse;
import com.medchain.batch.dto.TimelineStepResponse;
import com.medchain.blockchain.BlockchainClient;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.org.OrgType;
import com.medchain.org.Organization;
import com.medchain.verification.dto.VerificationResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VerificationServiceTest {

    @Mock
    private BatchRepository batchRepository;
    @Mock
    private BatchService batchService;
    @Mock
    private AuditEventService auditEventService;
    @Mock
    private BlockchainClient blockchainClient;

    @InjectMocks
    private VerificationService verificationService;

    private Organization manufacturer;
    private MedicineBatch batch;
    private BatchDetailResponse detailResponse;

    @BeforeEach
    void setUp() {
        manufacturer = Organization.builder().id(UUID.randomUUID()).name("Apex Pharma").type(OrgType.MANUFACTURER).build();

        batch = MedicineBatch.builder()
                .id("MC-2026-00001")
                .batchNumber("MC-2026-00001")
                .medicineName("Amoxicillin 500mg")
                .manufacturer(manufacturer)
                .currentOwner(manufacturer)
                .status(BatchStatus.CREATED)
                .manufacturingDate(LocalDate.now().minusDays(10))
                .expiryDate(LocalDate.now().plusYears(2))
                .quantity(1000)
                .createdAt(Instant.now())
                .build();

        detailResponse = new BatchDetailResponse(
                batch.getId(),
                batch.getBatchNumber(),
                batch.getMedicineName(),
                manufacturer.getName(),
                batch.getManufacturingDate(),
                batch.getExpiryDate(),
                batch.getQuantity(),
                manufacturer.getName(),
                batch.getStatus(),
                0,
                null,
                null,
                null,
                batch.getCreatedAt(),
                batch.getUpdatedAt(),
                List.of(),
                List.of(TimelineStepResponse.done("Batch created", "2026-01-01 10:00", "Created by Apex Pharma"))
        );
    }

    @Test
    void verifiesAuthenticBatchWithRawBatchId() {
        when(batchService.getBatchOrThrow("MC-2026-00001")).thenReturn(batch);
        when(batchService.getDetail("MC-2026-00001")).thenReturn(detailResponse);
        when(blockchainClient.recordVerified(any())).thenReturn(Optional.empty());

        VerificationResponse response = verificationService.verify("MC-2026-00001");

        assertThat(response.found()).isTrue();
        assertThat(response.authentic()).isTrue();
        assertThat(response.batch()).isNotNull();
        assertThat(response.batch().medicineName()).isEqualTo("Amoxicillin 500mg");
        verify(auditEventService).record(eq(batch), any(), any(), any(), any());
    }

    @Test
    void verifiesAuthenticBatchWithQrPrefixedPayload() {
        when(batchService.getBatchOrThrow("MC-2026-00001")).thenReturn(batch);
        when(batchService.getDetail("MC-2026-00001")).thenReturn(detailResponse);
        when(blockchainClient.recordVerified(any())).thenReturn(Optional.empty());

        VerificationResponse response = verificationService.verify("MEDCHAIN:BATCH:MC-2026-00001");

        assertThat(response.found()).isTrue();
        assertThat(response.authentic()).isTrue();
        assertThat(response.batch().id()).isEqualTo("MC-2026-00001");
    }

    @Test
    void marksRecalledBatchAsUnauthentic() {
        batch.setStatus(BatchStatus.RECALLED);
        BatchDetailResponse recalledDetail = new BatchDetailResponse(
                batch.getId(),
                batch.getBatchNumber(),
                batch.getMedicineName(),
                manufacturer.getName(),
                batch.getManufacturingDate(),
                batch.getExpiryDate(),
                batch.getQuantity(),
                manufacturer.getName(),
                BatchStatus.RECALLED,
                95,
                RiskLevel.HIGH,
                "Batch recalled by manufacturer",
                "Quarantine immediately",
                batch.getCreatedAt(),
                batch.getUpdatedAt(),
                List.of(),
                List.of()
        );

        when(batchService.getBatchOrThrow("MC-2026-00001")).thenReturn(batch);
        when(batchService.getDetail("MC-2026-00001")).thenReturn(recalledDetail);

        VerificationResponse response = verificationService.verify("MC-2026-00001");

        assertThat(response.found()).isTrue();
        assertThat(response.authentic()).isFalse();
        assertThat(response.batch().status()).isEqualTo(BatchStatus.RECALLED);
        verify(blockchainClient, never()).recordVerified(any());
    }

    @Test
    void returnsNotFoundForNonExistentBatch() {
        when(batchService.getBatchOrThrow("UNKNOWN-BATCH")).thenThrow(new ResourceNotFoundException("Not found"));

        VerificationResponse response = verificationService.verify("UNKNOWN-BATCH");

        assertThat(response.found()).isFalse();
        assertThat(response.authentic()).isFalse();
        assertThat(response.batch()).isNull();
    }
}
