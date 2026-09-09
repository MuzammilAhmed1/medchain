package com.medchain.events;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class SseService {

    private static final Long EMITTER_TIMEOUT = 30 * 60 * 1000L; // 30 minutes
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter registerEmitter() {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT);

        emitter.onCompletion(() -> {
            emitters.remove(emitter);
            log.debug("SSE emitter completed. Active count: {}", emitters.size());
        });
        emitter.onTimeout(() -> {
            emitter.complete();
            emitters.remove(emitter);
            log.debug("SSE emitter timed out. Active count: {}", emitters.size());
        });
        emitter.onError(e -> {
            emitter.complete();
            emitters.remove(emitter);
            log.debug("SSE emitter error: {}. Active count: {}", e.getMessage(), emitters.size());
        });

        emitters.add(emitter);
        log.info("Registered new SSE client. Total active: {}", emitters.size());

        try {
            // Initial connection acknowledgment
            emitter.send(SseEmitter.event().name("CONNECTED").data("Connected to MedChain Real-Time Event Stream"));
        } catch (IOException e) {
            emitters.remove(emitter);
        }

        return emitter;
    }

    public void broadcast(String eventName, Object data) {
        log.debug("Broadcasting SSE event '{}' to {} clients", eventName, emitters.size());
        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }

        if (!deadEmitters.isEmpty()) {
            emitters.removeAll(deadEmitters);
            log.debug("Removed {} dead SSE emitters. Remaining: {}", deadEmitters.size(), emitters.size());
        }
    }

    @Scheduled(fixedRate = 30000)
    public void sendHeartbeat() {
        if (!emitters.isEmpty()) {
            broadcast("HEARTBEAT", "ping");
        }
    }
}
