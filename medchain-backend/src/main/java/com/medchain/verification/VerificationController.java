package com.medchain.verification;

import com.medchain.verification.dto.VerificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/verify")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    @GetMapping
    public ResponseEntity<VerificationResponse> verifyWithQuery(
            @RequestParam(name = "query", required = false) String query,
            @RequestParam(name = "batchId", required = false) String batchId
    ) {
        String identifier = (query != null && !query.isBlank()) ? query : batchId;
        return ResponseEntity.ok(verificationService.verify(identifier));
    }

    @GetMapping("/{batchId}")
    public ResponseEntity<VerificationResponse> verify(@PathVariable String batchId) {
        return ResponseEntity.ok(verificationService.verify(batchId));
    }
}
