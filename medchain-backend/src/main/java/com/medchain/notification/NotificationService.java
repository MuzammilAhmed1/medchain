package com.medchain.notification;

import com.medchain.auth.Role;
import com.medchain.auth.User;
import com.medchain.events.SseService;
import com.medchain.org.Organization;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SseService sseService;

    @Transactional
    public Notification notify(
            String title,
            String message,
            Notification.NotificationType type,
            String refType,
            String refId,
            User user,
            Organization org,
            Role role
    ) {
        Notification notification = Notification.builder()
                .title(title)
                .message(message)
                .notificationType(type)
                .referenceType(refType)
                .referenceId(refId)
                .user(user)
                .organization(org)
                .targetRole(role)
                .build();

        Notification saved = notificationRepository.save(notification);
        log.info("Created notification: [{}] {}", type, title);

        // Broadcast notification event in real-time via SSE
        sseService.broadcast("NOTIFICATION", NotificationResponse.from(saved));

        return saved;
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotificationsForUser(User user, Pageable pageable) {
        UUID orgId = (user.getOrganization() != null) ? user.getOrganization().getId() : null;
        return notificationRepository.findAuthorizedNotifications(user.getId(), orgId, user.getRole(), pageable)
                .map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        UUID orgId = (user.getOrganization() != null) ? user.getOrganization().getId() : null;
        return notificationRepository.countUnread(user.getId(), orgId, user.getRole());
    }

    @Transactional
    public void markAsRead(UUID id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllAsRead(User user) {
        UUID orgId = (user.getOrganization() != null) ? user.getOrganization().getId() : null;
        Page<Notification> page = notificationRepository.findAuthorizedNotifications(
                user.getId(), orgId, user.getRole(), Pageable.unpaged());
        page.getContent().forEach(n -> {
            if (!n.isRead()) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }
}
