package com.medchain.transfer;

import com.medchain.batch.MedicineBatch;
import com.medchain.org.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TransferRepository extends JpaRepository<Transfer, java.util.UUID> {
    List<Transfer> findAllByBatchOrderByInitiatedAtAsc(MedicineBatch batch);
    List<Transfer> findAllByToOrgAndStatusOrderByInitiatedAtDesc(Organization toOrg, TransferStatus status);
    List<Transfer> findAllByToOrgAndStatusInOrderByInitiatedAtDesc(Organization toOrg, List<TransferStatus> statuses);
    List<Transfer> findAllByFromOrgAndStatusOrderByInitiatedAtDesc(Organization fromOrg, TransferStatus status);
    List<Transfer> findAllByStatusOrderByInitiatedAtDesc(TransferStatus status);
    List<Transfer> findAllByOrderByInitiatedAtDesc();
    List<Transfer> findAllByFromOrgOrToOrgOrderByInitiatedAtDesc(Organization fromOrg, Organization toOrg);
    List<Transfer> findTop3ByOrderByInitiatedAtDesc();
    Optional<Transfer> findFirstByBatchAndStatusOrderByInitiatedAtDesc(MedicineBatch batch, TransferStatus status);
    Optional<Transfer> findByShipmentNumber(String shipmentNumber);
    boolean existsByShipmentNumber(String shipmentNumber);
}
