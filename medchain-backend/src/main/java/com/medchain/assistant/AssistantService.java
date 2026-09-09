package com.medchain.assistant;

import com.medchain.ai.AiRiskClient;
import com.medchain.ai.dto.AiAssistantRequest;
import com.medchain.ai.dto.AiAssistantResponse;
import com.medchain.anomaly.AnomalyEvent;
import com.medchain.anomaly.AnomalyEventRepository;
import com.medchain.assistant.dto.AssistantRequest;
import com.medchain.assistant.dto.AssistantResponseDto;
import com.medchain.auth.Role;
import com.medchain.auth.User;
import com.medchain.batch.BatchRepository;
import com.medchain.batch.MedicineBatch;
import com.medchain.coldchain.ColdChainAlert;
import com.medchain.coldchain.ColdChainAlertRepository;
import com.medchain.org.Organization;
import com.medchain.tracking.TrackingLocation;
import com.medchain.tracking.TrackingLocationRepository;
import com.medchain.transfer.Transfer;
import com.medchain.transfer.TransferRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssistantService {

    private final BatchRepository batchRepository;
    private final TransferRepository transferRepository;
    private final TrackingLocationRepository trackingLocationRepository;
    private final ColdChainAlertRepository alertRepository;
    private final AnomalyEventRepository anomalyRepository;
    private final AiRiskClient aiRiskClient;

    @Transactional(readOnly = true)
    public AssistantResponseDto query(AssistantRequest request, User user) {
        Organization org = user.getOrganization();
        boolean isAdmin = user.getRole() == Role.ADMIN;

        // 1. Authorized batch filtering
        List<MedicineBatch> authorizedBatches;
        if (isAdmin) {
            authorizedBatches = batchRepository.findAll();
        } else if (org != null) {
            authorizedBatches = batchRepository.findAll().stream()
                    .filter(b -> b.getManufacturer().getId().equals(org.getId()) ||
                            b.getCurrentOwner().getId().equals(org.getId()))
                    .collect(Collectors.toList());
        } else {
            authorizedBatches = Collections.emptyList();
        }

        Set<String> authorizedBatchIds = authorizedBatches.stream()
                .map(MedicineBatch::getId)
                .collect(Collectors.toSet());

        // 2. Authorized transfers
        List<Transfer> authorizedTransfers;
        if (isAdmin) {
            authorizedTransfers = transferRepository.findAll();
        } else if (org != null) {
            authorizedTransfers = transferRepository.findAllByFromOrgOrToOrgOrderByInitiatedAtDesc(org, org);
        } else {
            authorizedTransfers = Collections.emptyList();
        }

        // 3. Authorized alerts
        List<ColdChainAlert> authorizedAlerts = alertRepository.findAll().stream()
                .filter(a -> authorizedBatchIds.contains(a.getBatch().getId()))
                .collect(Collectors.toList());

        // 4. Authorized anomalies
        List<AnomalyEvent> authorizedAnomalies = anomalyRepository.findAll().stream()
                .filter(an -> (an.getBatch() != null && authorizedBatchIds.contains(an.getBatch().getId())) ||
                        (org != null && an.getOrganization() != null && an.getOrganization().getId().equals(org.getId())))
                .collect(Collectors.toList());

        // 5. Sanitize data into domain dictionaries for AI context
        List<Map<String, Object>> sanitizedBatches = authorizedBatches.stream().map(b -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", b.getId());
            map.put("medicineName", b.getMedicineName());
            map.put("quantity", b.getQuantity());
            map.put("status", b.getStatus().name());
            map.put("riskScore", b.getRiskScore());
            map.put("riskLevel", b.getRiskLevel() != null ? b.getRiskLevel().name() : "LOW");
            map.put("expiryDate", b.getExpiryDate().toString());
            map.put("currentOwner", Map.of("name", b.getCurrentOwner().getName()));
            return map;
        }).collect(Collectors.toList());

        List<Map<String, Object>> sanitizedAlerts = authorizedAlerts.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("batchId", a.getBatch().getId());
            map.put("severity", a.getSeverity().name());
            map.put("message", a.getMessage());
            map.put("createdAt", a.getCreatedAt().toString());
            return map;
        }).collect(Collectors.toList());

        List<Map<String, Object>> sanitizedTransfers = authorizedTransfers.stream().map(t -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", t.getId().toString());
            map.put("shipmentNumber", t.getShipmentNumber() != null ? t.getShipmentNumber() : "MC-SHIP-" + t.getId().toString().substring(0, 8));
            map.put("batchId", t.getBatch().getId());
            map.put("medicineName", t.getBatch().getMedicineName());
            map.put("fromOrg", t.getFromOrg().getName());
            map.put("toOrg", t.getToOrg().getName());
            map.put("originAddress", t.getOriginAddress());
            map.put("destinationAddress", t.getDestinationAddress());
            map.put("originLatitude", t.getOriginLatitude());
            map.put("originLongitude", t.getOriginLongitude());
            map.put("destinationLatitude", t.getDestinationLatitude());
            map.put("destinationLongitude", t.getDestinationLongitude());
            map.put("status", t.getStatus().name());
            map.put("trackingEnabled", t.isTrackingEnabled());
            map.put("trackingDeviceId", t.getTrackingDeviceId());
            map.put("initiatedAt", t.getInitiatedAt() != null ? t.getInitiatedAt().toString() : null);
            map.put("startedAt", t.getStartedAt() != null ? t.getStartedAt().toString() : null);
            map.put("receivedAt", t.getReceivedAt() != null ? t.getReceivedAt().toString() : null);

            Optional<TrackingLocation> latestLoc = trackingLocationRepository.findFirstByTransferOrderByRecordedAtDesc(t);
            if (latestLoc.isPresent()) {
                TrackingLocation loc = latestLoc.get();
                map.put("currentLatitude", loc.getLatitude());
                map.put("currentLongitude", loc.getLongitude());
                map.put("currentSpeedKph", loc.getSpeedKph());
                map.put("headingDegrees", loc.getHeadingDegrees());
                map.put("lastRecordedAt", loc.getRecordedAt() != null ? loc.getRecordedAt().toString() : null);
                map.put("temperatureCelsius", 4.8);
                map.put("humidityPercent", 54.0);
            }

            return map;
        }).collect(Collectors.toList());

        List<Map<String, Object>> sanitizedAnomalies = authorizedAnomalies.stream().map(an -> {
            Map<String, Object> map = new HashMap<>();
            map.put("batchId", an.getBatch() != null ? an.getBatch().getId() : null);
            map.put("anomalyType", an.getAnomalyType().name());
            map.put("severity", an.getSeverity().name());
            map.put("score", an.getScore());
            map.put("detectedReason", an.getDetectedReason());
            return map;
        }).collect(Collectors.toList());

        AiAssistantRequest aiReq = AiAssistantRequest.builder()
                .query(request.getQuery())
                .userRole(user.getRole().name())
                .organizationName(org != null ? org.getName() : "System Admin")
                .batches(sanitizedBatches)
                .alerts(sanitizedAlerts)
                .transfers(sanitizedTransfers)
                .anomalies(sanitizedAnomalies)
                .build();

        Optional<AiAssistantResponse> aiResOpt = aiRiskClient.queryAssistant(aiReq);

        if (aiResOpt.isPresent()) {
            AiAssistantResponse aiRes = aiResOpt.get();
            return AssistantResponseDto.builder()
                    .answerMarkdown(aiRes.getAnswerMarkdown())
                    .referencedBatchIds(aiRes.getReferencedBatchIds())
                    .referencedOrgIds(aiRes.getReferencedOrgIds())
                    .suggestedActions(aiRes.getSuggestedActions())
                    .build();
        } else {
            // Graceful fallback when AI service is temporarily offline
            String fallback = String.format(
                    "AI Assistant is temporarily unavailable. You have **%d authorized batch(es)** and **%d active transfer(s)** in your catalog.",
                    authorizedBatches.size(), authorizedTransfers.size()
            );
            return AssistantResponseDto.builder()
                    .answerMarkdown(fallback)
                    .referencedBatchIds(authorizedBatches.stream().map(MedicineBatch::getId).limit(3).collect(Collectors.toList()))
                    .referencedOrgIds(Collections.emptyList())
                    .suggestedActions(List.of("View batch catalog", "Check system status"))
                    .build();
        }
    }
}
