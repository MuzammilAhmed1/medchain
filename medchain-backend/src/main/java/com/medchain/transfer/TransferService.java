package com.medchain.transfer;

import com.medchain.auth.User;
import com.medchain.batch.BatchService;
import com.medchain.batch.BatchStatus;
import com.medchain.batch.MedicineBatch;
import com.medchain.blockchain.BlockchainClient;
import com.medchain.common.exception.BadRequestException;
import com.medchain.common.exception.ForbiddenActionException;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.org.Organization;
import com.medchain.org.OrganizationRepository;
import com.medchain.transfer.dto.InitiateTransferRequest;
import com.medchain.transfer.dto.TransferResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final TransferRepository transferRepository;
    private final OrganizationRepository organizationRepository;
    private final BatchService batchService;
    private final BlockchainClient blockchainClient;

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

        Organization toOrg = organizationRepository.findByName(request.toOrganizationName())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No organization found named " + request.toOrganizationName()));

        Transfer transfer = transferRepository.save(Transfer.builder()
                .batch(batch)
                .fromOrg(currentUser.getOrganization())
                .toOrg(toOrg)
                .status(TransferStatus.INITIATED)
                .initiatedAt(Instant.now())
                .build());

        batchService.markInTransit(batch);
        blockchainClient.recordTransferInitiated(batch);
        batchService.refreshRisk(batch);

        return TransferResponse.from(transfer);
    }

    @Transactional
    public TransferResponse receive(String transferId, User currentUser) {
        Transfer transfer = transferRepository.findById(java.util.UUID.fromString(transferId))
                .orElseThrow(() -> new ResourceNotFoundException("No transfer found with id " + transferId));

        if (transfer.getStatus() == TransferStatus.RECEIVED) {
            throw new BadRequestException("This transfer has already been received.");
        }
        if (!transfer.getToOrg().getId().equals(currentUser.getOrganization().getId())) {
            throw new ForbiddenActionException("Only the intended recipient can confirm receipt of this transfer.");
        }

        transfer.setStatus(TransferStatus.RECEIVED);
        transfer.setReceivedAt(Instant.now());
        transferRepository.save(transfer);

        MedicineBatch batch = transfer.getBatch();
        batchService.markReceived(batch, transfer.getToOrg());
        blockchainClient.recordTransferReceived(batch);
        batchService.refreshRisk(batch);

        return TransferResponse.from(transfer);
    }

    public List<TransferResponse> pendingFor(Organization org) {
        return transferRepository.findAllByToOrgAndStatusOrderByInitiatedAtDesc(org, TransferStatus.INITIATED)
                .stream().map(TransferResponse::from).toList();
    }

    public List<TransferResponse> history() {
        return transferRepository.findAllByStatusOrderByInitiatedAtDesc(TransferStatus.RECEIVED)
                .stream().map(TransferResponse::from).toList();
    }

    public List<TransferResponse> all() {
        return transferRepository.findAllByOrderByInitiatedAtDesc()
                .stream().map(TransferResponse::from).toList();
    }
}
