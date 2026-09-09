package com.medchain.tracking;

import com.medchain.transfer.Transfer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrackingLocationRepository extends JpaRepository<TrackingLocation, UUID> {

    Optional<TrackingLocation> findFirstByTransferOrderByRecordedAtDesc(Transfer transfer);

    Page<TrackingLocation> findAllByTransferOrderByRecordedAtAsc(Transfer transfer, Pageable pageable);

    Page<TrackingLocation> findAllByTransferOrderByRecordedAtDesc(Transfer transfer, Pageable pageable);

    List<TrackingLocation> findAllByTransferOrderByRecordedAtAsc(Transfer transfer);

    long countByTransfer(Transfer transfer);

    boolean existsByTransferAndTrackingDeviceIdAndLatitudeAndLongitudeAndRecordedAt(
            Transfer transfer,
            String trackingDeviceId,
            Double latitude,
            Double longitude,
            Instant recordedAt
    );

    @Query("SELECT t FROM TrackingLocation t WHERE t.transfer = :transfer ORDER BY t.recordedAt DESC")
    List<TrackingLocation> findRecentByTransfer(@Param("transfer") Transfer transfer, Pageable pageable);
}
