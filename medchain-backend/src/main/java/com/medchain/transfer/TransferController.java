package com.medchain.transfer;

import com.medchain.audit.AuditEvent;
import com.medchain.auth.User;
import com.medchain.transfer.dto.InitiateTransferRequest;
import com.medchain.transfer.dto.TransferResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final TransferService transferService;

    @GetMapping
    public ResponseEntity<List<TransferResponse>> all(@RequestParam(required = false) TransferStatus status) {
        return ResponseEntity.ok(transferService.all(status));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<TransferResponse>> pending(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(transferService.pendingFor(currentUser.getOrganization()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<TransferResponse>> history() {
        return ResponseEntity.ok(transferService.history());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransferResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(transferService.getById(id));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<AuditEvent>> getHistory(@PathVariable String id) {
        return ResponseEntity.ok(transferService.getShipmentHistory(id));
    }

    @PostMapping
    public ResponseEntity<TransferResponse> initiate(
            @Valid @RequestBody InitiateTransferRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(transferService.initiate(request, currentUser));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<TransferResponse> start(
            @PathVariable String id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(transferService.startShipment(id, currentUser));
    }

    @PostMapping("/{id}/receive")
    public ResponseEntity<TransferResponse> receive(
            @PathVariable String id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(transferService.receive(id, currentUser));
    }

    @DeleteMapping("/cleanup")
    public ResponseEntity<Void> cleanup() {
        transferService.cleanupDummyTransfers();
        return ResponseEntity.noContent().build();
    }
}

