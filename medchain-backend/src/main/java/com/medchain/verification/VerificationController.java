package com.medchain.verification;

import com.medchain.verification.dto.VerificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/verify")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    @GetMapping("/{batchId}")
    public ResponseEntity<VerificationResponse> verify(@PathVariable String batchId) {
        return ResponseEntity.ok(verificationService.verify(batchId));
    }
}
