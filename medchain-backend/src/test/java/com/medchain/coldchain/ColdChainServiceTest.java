package com.medchain.coldchain;

import com.medchain.ai.AiRiskClient;
import com.medchain.ai.dto.AiColdChainResponse;
import com.medchain.batch.BatchRepository;
import com.medchain.batch.MedicineBatch;
import com.medchain.coldchain.dto.ColdChainReadingResponse;
import com.medchain.coldchain.dto.CreateReadingRequest;
import com.medchain.events.SseService;
import com.medchain.notification.NotificationService;
import com.medchain.org.Organization;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ColdChainServiceTest {

    @Mock
    private ColdChainReadingRepository readingRepository;
    @Mock
    private ColdChainAlertRepository alertRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private AiRiskClient aiRiskClient;
    @Mock
    private SseService sseService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ColdChainService coldChainService;

    private MedicineBatch batch;

    @BeforeEach
    void setUp() {
        Organization org = Organization.builder()
                .id(UUID.randomUUID())
                .name("Apex Pharma")
                .build();

        batch = MedicineBatch.builder()
                .id("MC-2026-00001")
                .medicineName("Vaccine V1")
                .currentOwner(org)
                .manufacturer(org)
                .build();
    }

    @Test
    void recordNormalReadingDoesNotCreateAlert() {
        CreateReadingRequest req = new CreateReadingRequest();
        req.setBatchId("MC-2026-00001");
        req.setDeviceId("DEV-001");
        req.setTemperature(4.5);
        req.setRecordedAt(Instant.now());

        when(batchRepository.findById("MC-2026-00001")).thenReturn(Optional.of(batch));
        when(readingRepository.save(any(ColdChainReading.class))).thenAnswer(inv -> {
            ColdChainReading r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        ColdChainReadingResponse res = coldChainService.recordReading(req);

        assertThat(res.getBatchId()).isEqualTo("MC-2026-00001");
        assertThat(res.getTemperature()).isEqualTo(4.5);
        verify(readingRepository).save(any(ColdChainReading.class));
        verify(sseService).broadcast(eq("COLD_CHAIN_READING"), any());
        verify(alertRepository, never()).save(any());
    }

    @Test
    void recordExcursionReadingCreatesAlertAndBroadcasts() {
        CreateReadingRequest req = new CreateReadingRequest();
        req.setBatchId("MC-2026-00001");
        req.setDeviceId("DEV-001");
        req.setTemperature(11.5); // Exceeds 8.0°C
        req.setRecordedAt(Instant.now());

        when(batchRepository.findById("MC-2026-00001")).thenReturn(Optional.of(batch));
        when(readingRepository.save(any(ColdChainReading.class))).thenAnswer(inv -> {
            ColdChainReading r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });
        when(readingRepository.findTop100ByBatchIdOrderByRecordedAtDesc("MC-2026-00001"))
                .thenReturn(Collections.emptyList());

        AiColdChainResponse aiResponse = AiColdChainResponse.builder()
                .batchId("MC-2026-00001")
                .excursionDetected(true)
                .durationMinutes(25)
                .maxTemperature(11.5)
                .minTemperature(4.0)
                .degreeMinutesExcursion(87.5)
                .spoilageRisk("HIGH")
                .reason("Temperature breached 8.0C for 25 minutes")
                .build();

        when(aiRiskClient.analyzeColdChain(any())).thenReturn(Optional.of(aiResponse));
        when(alertRepository.save(any(ColdChainAlert.class))).thenAnswer(inv -> {
            ColdChainAlert a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        ColdChainReadingResponse res = coldChainService.recordReading(req);

        assertThat(res.getTemperature()).isEqualTo(11.5);
        verify(alertRepository).save(any(ColdChainAlert.class));
        verify(sseService).broadcast(eq("COLD_CHAIN_ALERT"), any());
        verify(notificationService).notify(any(), any(), any(), any(), any(), any(), any(), any());
    }
}
