package com.medchain.transfer;

import com.medchain.audit.AuditEvent;
import com.medchain.audit.AuditEventService;
import com.medchain.audit.AuditEventType;
import com.medchain.auth.Role;
import com.medchain.auth.User;
import com.medchain.batch.BatchRepository;
import com.medchain.batch.BatchService;
import com.medchain.batch.BatchStatus;
import com.medchain.batch.MedicineBatch;
import com.medchain.blockchain.BlockchainClient;
import com.medchain.common.exception.BadRequestException;
import com.medchain.common.exception.ForbiddenActionException;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.events.SseService;
import com.medchain.notification.Notification;
import com.medchain.notification.NotificationService;
import com.medchain.org.Organization;
import com.medchain.org.OrganizationRepository;
import com.medchain.reputation.TrustScoreService;
import com.medchain.tracking.TrackingLocationRepository;
import com.medchain.transfer.dto.InitiateTransferRequest;
import com.medchain.transfer.dto.TransferResponse;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransferService {

    private final TransferRepository transferRepository;
    private final OrganizationRepository organizationRepository;
    private final BatchRepository batchRepository;
    private final TrackingLocationRepository trackingLocationRepository;
    private final BatchService batchService;
    private final BlockchainClient blockchainClient;
    private final AuditEventService auditEventService;
    private final NotificationService notificationService;
    private final SseService sseService;
    private final TrustScoreService trustScoreService;

    @PostConstruct
    @Transactional
    public void backfillLegacyShipmentNumbers() {
        try {
            List<Transfer> missing = transferRepository.findAll().stream()
                    .filter(t -> t.getShipmentNumber() == null || t.getShipmentNumber().isBlank())
                    .toList();
            if (!missing.isEmpty()) {
                int year = LocalDate.now(ZoneOffset.UTC).getYear();
                long seq = 1;
                for (Transfer t : missing) {
                    String candidate = String.format("MC-SHIP-%d-%04d", year, seq++);
                    while (transferRepository.existsByShipmentNumber(candidate)) {
                        candidate = String.format("MC-SHIP-%d-%04d", year, seq++);
                    }
                    t.setShipmentNumber(candidate);
                    if ((t.getOriginAddress() == null || t.getOriginAddress().isBlank()) && t.getFromOrg() != null) {
                        String origin = (t.getFromOrg().getFormattedAddress() != null && !t.getFromOrg().getFormattedAddress().isBlank())
                                ? t.getFromOrg().getFormattedAddress() : t.getFromOrg().buildFullAddressString();
                        t.setOriginAddress(origin);
                        t.setOriginLatitude(t.getFromOrg().getLatitude());
                        t.setOriginLongitude(t.getFromOrg().getLongitude());
                    }
                    if ((t.getDestinationAddress() == null || t.getDestinationAddress().isBlank()) && t.getToOrg() != null) {
                        String dest = (t.getToOrg().getFormattedAddress() != null && !t.getToOrg().getFormattedAddress().isBlank())
                                ? t.getToOrg().getFormattedAddress() : t.getToOrg().buildFullAddressString();
                        t.setDestinationAddress(dest);
                        t.setDestinationLatitude(t.getToOrg().getLatitude());
                        t.setDestinationLongitude(t.getToOrg().getLongitude());
                    }
                    transferRepository.save(t);
                }
                log.info("Backfilled {} legacy transfers with shipment numbers and addresses", missing.size());
            }
        } catch (Exception e) {
            log.warn("Could not backfill legacy transfers: {}", e.getMessage());
        }
    }

    private synchronized String generateShipmentNumber() {
        int year = LocalDate.now(ZoneOffset.UTC).getYear();
        long count = transferRepository.count();
        long seq = count + 1;
        String candidate = String.format("MC-SHIP-%d-%04d", year, seq);
        while (transferRepository.existsByShipmentNumber(candidate)) {
            seq++;
            candidate = String.format("MC-SHIP-%d-%04d", year, seq);
        }
        return candidate;
    }

    @Transactional
    public TransferResponse initiate(InitiateTransferRequest request, User currentUser) {
        MedicineBatch batch = batchService.getBatchOrThrow(request.batchId());

        if (!batch.getCurrentOwner().getId().equals(currentUser.getOrganization().getId())) {
            throw new ForbiddenActionException("Only the current owner of this batch can initiate a transfer.");
        }
        if (batch.getStatus() == BatchStatus.RECALLED) {
            throw new BadRequestException("This batch has been recalled and cannot be transferred.");
        }
        if (batch.getStatus() == BatchStatus.IN_TRANSIT) {
            throw new BadRequestException("This batch already has a transfer in progress.");
        }

        Organization fromOrg = currentUser.getOrganization();
        com.medchain.org.OrgType senderType = switch (currentUser.getRole()) {
            case MANUFACTURER -> com.medchain.org.OrgType.MANUFACTURER;
            case DISTRIBUTOR -> com.medchain.org.OrgType.DISTRIBUTOR;
            case PHARMACY -> com.medchain.org.OrgType.PHARMACY;
            default -> fromOrg.getType();
        };

        if (fromOrg.getType() != senderType && currentUser.getRole() != Role.ADMIN) {
            fromOrg.setType(senderType);
            organizationRepository.save(fromOrg);
        }

        if (senderType == com.medchain.org.OrgType.PHARMACY) {
            throw new BadRequestException("Pharmacies dispense medicine directly to patients and cannot transfer batches onward.");
        }

        Organization toOrg = organizationRepository.findByName(request.toOrganizationName())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Target organization not found: " + request.toOrganizationName()));

        if (fromOrg.getId().equals(toOrg.getId())) {
            throw new BadRequestException("Cannot transfer a batch to your own organization.");
        }

        // Enforce strict supply chain role progression:
        // MANUFACTURER -> DISTRIBUTOR -> PHARMACY
        if (senderType == com.medchain.org.OrgType.MANUFACTURER && toOrg.getType() != com.medchain.org.OrgType.DISTRIBUTOR) {
            throw new BadRequestException("Manufacturers can only transfer medicine batches to Distributors.");
        }
        if (senderType == com.medchain.org.OrgType.DISTRIBUTOR && toOrg.getType() != com.medchain.org.OrgType.PHARMACY) {
            throw new BadRequestException("Distributors can only transfer medicine batches to Pharmacies.");
        }

        // Check if this batch already has an active transfer
        boolean hasActive = transferRepository.findAllByBatchOrderByInitiatedAtAsc(batch).stream()
                .anyMatch(t -> t.getStatus() == TransferStatus.INITIATED || t.getStatus() == TransferStatus.IN_TRANSIT);
        if (hasActive) {
            throw new BadRequestException("This batch already has an active transfer in progress.");
        }

        String shipmentNumber = generateShipmentNumber();

        String originAddress = (request.originAddress() != null && !request.originAddress().isBlank())
                ? request.originAddress().trim()
                : ((fromOrg.getFormattedAddress() != null && !fromOrg.getFormattedAddress().isBlank())
                        ? fromOrg.getFormattedAddress()
                        : fromOrg.buildFullAddressString());

        Double originLat = request.originLatitude() != null ? request.originLatitude() : fromOrg.getLatitude();
        Double originLng = request.originLongitude() != null ? request.originLongitude() : fromOrg.getLongitude();

        if (originLat == null || originLng == null) {
            double[] coords = resolveCityCoordinates(originAddress);
            if (coords != null) {
                originLat = coords[0];
                originLng = coords[1];
            }
        }

        String destAddress = (request.destinationAddress() != null && !request.destinationAddress().isBlank())
                ? request.destinationAddress().trim()
                : ((toOrg.getFormattedAddress() != null && !toOrg.getFormattedAddress().isBlank())
                        ? toOrg.getFormattedAddress()
                        : toOrg.buildFullAddressString());

        Double destLat = request.destinationLatitude() != null ? request.destinationLatitude() : toOrg.getLatitude();
        Double destLng = request.destinationLongitude() != null ? request.destinationLongitude() : toOrg.getLongitude();

        if (destLat == null || destLng == null) {
            double[] coords = resolveCityCoordinates(destAddress);
            if (coords != null) {
                destLat = coords[0];
                destLng = coords[1];
            }
        }

        Transfer transfer = Transfer.builder()
                .batch(batch)
                .fromOrg(fromOrg)
                .toOrg(toOrg)
                .status(TransferStatus.INITIATED)
                .initiatedAt(Instant.now())
                .shipmentNumber(shipmentNumber)
                .originAddress(originAddress)
                .destinationAddress(destAddress)
                .originLatitude(originLat)
                .originLongitude(originLng)
                .destinationLatitude(destLat)
                .destinationLongitude(destLng)
                .expectedDeliveryAt(request.expectedDeliveryAt())
                .trackingEnabled(request.trackingEnabled() != null ? request.trackingEnabled() : true)
                .trackingDeviceId((request.trackingDeviceId() != null && !request.trackingDeviceId().isBlank())
                        ? request.trackingDeviceId().trim()
                        : "DEV-" + shipmentNumber)
                .build();

        transfer = transferRepository.save(transfer);

        auditEventService.record(batch, AuditEventType.TRANSFER_INITIATED,
                currentUser.getName(), fromOrg.getName(),
                "Shipment " + shipmentNumber + " initiated from " + fromOrg.getName() + " to " + toOrg.getName());

        notificationService.notify(
                "Shipment Initiated",
                "Shipment " + shipmentNumber + " (" + batch.getMedicineName() + ") initiated by " + fromOrg.getName(),
                Notification.NotificationType.TRANSFER_EVENT,
                "SHIPMENT",
                transfer.getId().toString(),
                null,
                toOrg,
                null
        );

        TransferResponse response = TransferResponse.from(transfer);
        sseService.broadcast("TRANSFER_UPDATED", response);

        return response;
    }

    @Transactional
    public TransferResponse startShipment(String transferId, User currentUser) {
        Transfer transfer = findTransferOrThrow(transferId);

        if (!transfer.getFromOrg().getId().equals(currentUser.getOrganization().getId())) {
            throw new ForbiddenActionException("Only the origin organization (" + transfer.getFromOrg().getName() + ") can start the shipment.");
        }
        if (transfer.getStatus() == TransferStatus.IN_TRANSIT) {
            throw new BadRequestException("Shipment " + transfer.getShipmentNumber() + " is already in transit.");
        }
        if (transfer.getStatus() == TransferStatus.RECEIVED) {
            throw new BadRequestException("Shipment " + transfer.getShipmentNumber() + " has already been received.");
        }
        if (transfer.getStatus() != TransferStatus.INITIATED) {
            throw new BadRequestException("Only initiated shipments can be started.");
        }

        transfer.setStatus(TransferStatus.IN_TRANSIT);
        transfer.setStartedAt(Instant.now());
        transferRepository.save(transfer);

        MedicineBatch batch = transfer.getBatch();
        batchService.markInTransit(batch);

        auditEventService.record(batch, AuditEventType.TRANSFER_IN_TRANSIT,
                currentUser.getName(), currentUser.getOrganization().getName(),
                "Shipment " + transfer.getShipmentNumber() + " is now in transit from " + transfer.getFromOrg().getName() + " to " + transfer.getToOrg().getName());

        var onChainEvent = blockchainClient.recordTransferInitiated(batch);
        onChainEvent.ifPresent(ev -> auditEventService.record(
                batch, AuditEventType.BLOCKCHAIN_RECORDED, "Relayer", "Blockchain",
                "Recorded TRANSFER_IN_TRANSIT on-chain in block " + ev.getBlockNumber() + " (tx: " + ev.getTxHash() + ")"));

        notificationService.notify(
                "Shipment In Transit",
                "Shipment " + transfer.getShipmentNumber() + " (" + batch.getMedicineName() + ") is now in transit to you.",
                Notification.NotificationType.TRANSFER_EVENT,
                "SHIPMENT",
                transfer.getId().toString(),
                null,
                transfer.getToOrg(),
                null
        );

        TransferResponse response = TransferResponse.from(transfer);
        sseService.broadcast("TRANSFER_UPDATED", response);

        batchService.refreshRisk(batch);

        return response;
    }

    @Transactional
    public TransferResponse receive(String transferId, User currentUser) {
        Transfer transfer = findTransferOrThrow(transferId);

        if (transfer.getStatus() == TransferStatus.RECEIVED) {
            throw new BadRequestException("This shipment has already been received.");
        }
        if (transfer.getStatus() == TransferStatus.INITIATED) {
            throw new BadRequestException("Shipment must be started and in transit before it can be received.");
        }
        if (!transfer.getToOrg().getId().equals(currentUser.getOrganization().getId())) {
            throw new ForbiddenActionException("Only the intended recipient (" + transfer.getToOrg().getName() + ") can confirm receipt.");
        }

        transfer.setStatus(TransferStatus.RECEIVED);
        transfer.setReceivedAt(Instant.now());
        transferRepository.save(transfer);

        MedicineBatch batch = transfer.getBatch();
        batchService.markReceived(batch, transfer.getToOrg());

        auditEventService.record(batch, AuditEventType.TRANSFER_RECEIVED,
                currentUser.getName(), currentUser.getOrganization().getName(),
                "Shipment " + transfer.getShipmentNumber() + " confirmed and received by " + currentUser.getOrganization().getName());

        var onChainEvent = blockchainClient.recordTransferReceived(batch);
        onChainEvent.ifPresent(ev -> auditEventService.record(
                batch, AuditEventType.BLOCKCHAIN_RECORDED, "Relayer", "Blockchain",
                "Recorded TRANSFER_RECEIVED on-chain in block " + ev.getBlockNumber() + " (tx: " + ev.getTxHash() + ")"));

        notificationService.notify(
                "Shipment Received",
                "Shipment " + transfer.getShipmentNumber() + " has been successfully received by " + transfer.getToOrg().getName(),
                Notification.NotificationType.TRANSFER_EVENT,
                "SHIPMENT",
                transfer.getId().toString(),
                null,
                transfer.getFromOrg(),
                null
        );

        try {
            trustScoreService.calculateScore(transfer.getFromOrg().getId());
            trustScoreService.calculateScore(transfer.getToOrg().getId());
        } catch (Exception e) {
            log.warn("Failed to recalculate trust score after receive: {}", e.getMessage());
        }

        TransferResponse response = TransferResponse.from(transfer);
        sseService.broadcast("TRANSFER_UPDATED", response);

        batchService.refreshRisk(batch);

        return response;
    }

    public Transfer findTransferOrThrow(String id) {
        try {
            UUID uuid = UUID.fromString(id);
            return transferRepository.findById(uuid)
                    .or(() -> transferRepository.findByShipmentNumber(id))
                    .orElseThrow(() -> new ResourceNotFoundException("No shipment found with id: " + id));
        } catch (IllegalArgumentException e) {
            return transferRepository.findByShipmentNumber(id)
                    .orElseThrow(() -> new ResourceNotFoundException("No shipment found with shipment number: " + id));
        }
    }

    public TransferResponse getById(String id) {
        return TransferResponse.from(findTransferOrThrow(id));
    }

    public List<AuditEvent> getShipmentHistory(String id) {
        Transfer transfer = findTransferOrThrow(id);
        return auditEventService.getTimelineForBatch(transfer.getBatch());
    }

    public List<TransferResponse> pendingFor(Organization org) {
        return transferRepository.findAllByToOrgAndStatusInOrderByInitiatedAtDesc(
                org, List.of(TransferStatus.INITIATED, TransferStatus.IN_TRANSIT))
                .stream().map(TransferResponse::from).toList();
    }

    public List<TransferResponse> history() {
        return transferRepository.findAllByStatusOrderByInitiatedAtDesc(TransferStatus.RECEIVED)
                .stream().map(TransferResponse::from).toList();
    }

    public List<TransferResponse> all(TransferStatus status) {
        if (status != null) {
            return transferRepository.findAllByStatusOrderByInitiatedAtDesc(status)
                    .stream().map(TransferResponse::from).toList();
        }
        return transferRepository.findAllByOrderByInitiatedAtDesc()
                .stream().map(TransferResponse::from).toList();
    }

    public List<TransferResponse> all() {
        return all(null);
    }

    @Transactional
    public void cleanupDummyTransfers() {
        trackingLocationRepository.deleteAll();
        transferRepository.deleteAll();
        List<MedicineBatch> inTransitBatches = batchRepository.findAll().stream()
                .filter(b -> b.getStatus() == BatchStatus.IN_TRANSIT)
                .toList();
        for (MedicineBatch b : inTransitBatches) {
            b.setStatus(BatchStatus.CREATED);
            batchRepository.save(b);
        }
        log.info("Cleaned up all dummy transfers and reset {} batches", inTransitBatches.size());
    }

    private double[] resolveCityCoordinates(String text) {
        if (text == null || text.isBlank()) return null;
        String lower = text.toLowerCase();
        if (lower.contains("raichur")) return new double[]{16.2120, 77.3439};
        if (lower.contains("bangalore") || lower.contains("bengaluru")) return new double[]{12.8452, 77.6602};
        if (lower.contains("mysore") || lower.contains("mysuru")) return new double[]{12.2958, 76.6394};
        if (lower.contains("bellary") || lower.contains("ballari")) return new double[]{15.1394, 76.9214};
        if (lower.contains("chitradurga")) return new double[]{14.2287, 76.3980};
        if (lower.contains("tumkur") || lower.contains("tumakuru")) return new double[]{13.3409, 77.1010};
        if (lower.contains("hyderabad")) return new double[]{17.3850, 78.4867};
        if (lower.contains("mumbai")) return new double[]{19.0760, 72.8777};
        if (lower.contains("delhi")) return new double[]{28.6139, 77.2090};
        if (lower.contains("chennai")) return new double[]{13.0827, 80.2707};
        if (lower.contains("pune")) return new double[]{18.5204, 73.8567};
        return null;
    }
}
