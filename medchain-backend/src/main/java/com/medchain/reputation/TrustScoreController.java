package com.medchain.reputation;

import com.medchain.reputation.dto.OrganizationTrustScoreResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations")
@RequiredArgsConstructor
public class TrustScoreController {

    private final TrustScoreService trustScoreService;

    @GetMapping("/{id}/trust-score")
    public ResponseEntity<OrganizationTrustScoreResponse> getOrganizationTrustScore(@PathVariable UUID id) {
        return ResponseEntity.ok(trustScoreService.calculateScore(id));
    }

    @GetMapping("/trust-scores")
    public ResponseEntity<List<OrganizationTrustScoreResponse>> getAllTrustScores() {
        return ResponseEntity.ok(trustScoreService.getAllScores());
    }
}
