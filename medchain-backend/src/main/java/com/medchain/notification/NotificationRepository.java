package com.medchain.notification;

import com.medchain.auth.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @Query("SELECT n FROM Notification n WHERE (n.user.id = :userId) OR (n.organization.id = :orgId) OR (n.targetRole = :role) OR (n.user IS NULL AND n.organization IS NULL AND n.targetRole IS NULL) ORDER BY n.createdAt DESC")
    Page<Notification> findAuthorizedNotifications(
            @Param("userId") UUID userId,
            @Param("orgId") UUID orgId,
            @Param("role") Role role,
            Pageable pageable
    );

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.isRead = false AND ((n.user.id = :userId) OR (n.organization.id = :orgId) OR (n.targetRole = :role) OR (n.user IS NULL AND n.organization IS NULL AND n.targetRole IS NULL))")
    long countUnread(
            @Param("userId") UUID userId,
            @Param("orgId") UUID orgId,
            @Param("role") Role role
    );
}
