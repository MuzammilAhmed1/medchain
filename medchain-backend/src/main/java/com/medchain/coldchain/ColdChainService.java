package com.medchain.coldchain;

import com.medchain.ai.AiRiskClient;
import com.medchain.ai.dto.AiColdChainRequest;
import com.medchain.ai.dto.AiColdChainResponse;
import com.medchain.ai.dto.ColdChainSensorPointDto;
import com.medchain.batch.BatchRepository;
import com.medchain.batch.MedicineBatch;
import com.medchain.coldchain.dto.ColdChainAlertResponse;
import com.medchain.coldchain.dto.ColdChainReadingResponse;
import com.medchain.coldchain.dto.CreateReadingRequest;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.events.SseService;
import com.medchain.notification.Notification;
import com.medchain.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ColdChainService {

    private final ColdChainReadingRepository readingRepository;
    private final ColdChainAlertRepository alertRepository;
    private final BatchRepository batchRepository;
    private final AiRiskClient aiRiskClient;
    private final SseService sseService;
    private final NotificationService notificationService;

    private static final double DEFAULT_MIN_TEMP = 2.0;
    private static final double DEFAULT_MAX_TEMP = 8.0;

    @Transactional
    public ColdChainReadingResponse recordReading(CreateReadingRequest request) {
        MedicineBatch batch = batchRepository.findById(request.getBatchId())
                .orElseThrow(() -> new ResourceNotFoundException("MedicineBatch", "id", request.getBatchId()));

        ColdChainReading reading = ColdChainReading.builder()
                .batch(batch)
                .deviceId(request.getDeviceId())
                .temperature(request.getTemperature())
                .humidity(request.getHumidity())
                .location(request.getLocation())
                .recordedAt(request.getRecordedAt())
                .build();

        ColdChainReading savedReading = readingRepository.save(reading);
        ColdChainReadingResponse response = ColdChainReadingResponse.from(savedReading);

        log.info("Recorded telemetry for batch {}: temp={}°C, device={}",
                batch.getId(), request.getTemperature(), request.getDeviceId());

        // Broadcast reading to live charts in real-time
        sseService.broadcast("COLD_CHAIN_READING", response);

        // Check for temperature excursion
        if (request.getTemperature() < DEFAULT_MIN_TEMP || request.getTemperature() > DEFAULT_MAX_TEMP) {
            handleExcursion(batch, savedReading);
        }

        return response;
    }

    private void handleExcursion(MedicineBatch batch, ColdChainReading latestReading) {
        List<ColdChainReading> recent = readingRepository.findTop100ByBatchIdOrderByRecordedAtDesc(batch.getId());
        List<ColdChainSensorPointDto> dtos = recent.stream()
                .map(r -> ColdChainSensorPointDto.builder()
                        .timestamp(r.getRecordedAt())
                        .temperature(r.getTemperature())
                        .humidity(r.getHumidity())
                        .build())
                .collect(Collectors.toList());

        AiColdChainRequest aiReq = AiColdChainRequest.builder()
                .batchId(batch.getId())
                .minPermitted(DEFAULT_MIN_TEMP)
                .maxPermitted(DEFAULT_MAX_TEMP)
                .readings(dtos)
                .build();

        Optional<AiColdChainResponse> aiResOpt = aiRiskClient.analyzeColdChain(aiReq);

        ColdChainAlert.AlertSeverity severity = ColdChainAlert.AlertSeverity.HIGH;
        int durationMinutes = 5;
        double degreeMinutes = Math.abs(latestReading.getTemperature() - (latestReading.getTemperature() > DEFAULT_MAX_TEMP ? DEFAULT_MAX_TEMP : DEFAULT_MIN_TEMP)) * 5;
        String message = String.format("Temperature %.1f°C exceeded safe range (%.1f°C - %.1f°C)",
                latestReading.getTemperature(), DEFAULT_MIN_TEMP, DEFAULT_MAX_TEMP);

        if (aiResOpt.isPresent()) {
            AiColdChainResponse aiRes = aiResOpt.get();
            durationMinutes = aiRes.getDurationMinutes();
            degreeMinutes = aiRes.getDegreeMinutesExcursion();
            message = aiRes.getReason();
            try {
                severity = ColdChainAlert.AlertSeverity.valueOf(aiRes.getSpoilageRisk());
            } catch (Exception e) {
                severity = ColdChainAlert.AlertSeverity.HIGH;
            }
        }

        ColdChainAlert alert = ColdChainAlert.builder()
                .batch(batch)
                .severity(severity)
                .message(message)
                .recordedTemperature(latestReading.getTemperature())
                .minPermitted(DEFAULT_MIN_TEMP)
                .maxPermitted(DEFAULT_MAX_TEMP)
                .durationMinutes(durationMinutes)
                .degreeMinutesExcursion(degreeMinutes)
                .build();

        ColdChainAlert savedAlert = alertRepository.save(alert);
        ColdChainAlertResponse alertResponse = ColdChainAlertResponse.from(savedAlert);

        // Broadcast alert
        sseService.broadcast("COLD_CHAIN_ALERT", alertResponse);

        // Persistent notification to owner organization
        notificationService.notify(
                "Cold-Chain Excursion: " + batch.getId(),
                message,
                Notification.NotificationType.COLD_CHAIN_ALERT,
                "BATCH",
                batch.getId(),
                null,
                batch.getCurrentOwner(),
                null
        );

        log.warn("Cold-chain alert triggered for batch {}: {}", batch.getId(), message);
    }

    @Transactional(readOnly = true)
    public List<ColdChainReadingResponse> getReadings(String batchId) {
        return readingRepository.findByBatchIdOrderByRecordedAtAsc(batchId).stream()
                .map(ColdChainReadingResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ColdChainAlertResponse> getAlerts(String batchId) {
        return alertRepository.findByBatchIdOrderByCreatedAtDesc(batchId).stream()
                .map(ColdChainAlertResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ColdChainAlertResponse> getActiveAlerts() {
        return alertRepository.findByIsResolvedFalseOrderByCreatedAtDesc().stream()
                .map(ColdChainAlertResponse::from)
                .collect(Collectors.toList());
    }
}
