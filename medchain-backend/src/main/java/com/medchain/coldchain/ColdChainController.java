package com.medchain.coldchain;

import com.medchain.coldchain.dto.ColdChainAlertResponse;
import com.medchain.coldchain.dto.ColdChainReadingResponse;
import com.medchain.coldchain.dto.CreateReadingRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cold-chain")
@RequiredArgsConstructor
public class ColdChainController {

    private final ColdChainService coldChainService;

    @PostMapping("/readings")
    public ResponseEntity<ColdChainReadingResponse> ingestReading(
            @Valid @RequestBody CreateReadingRequest request
    ) {
        ColdChainReadingResponse response = coldChainService.recordReading(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/batches/{batchId}")
    public ResponseEntity<List<ColdChainReadingResponse>> getBatchReadings(
            @PathVariable String batchId
    ) {
        return ResponseEntity.ok(coldChainService.getReadings(batchId));
    }

    @GetMapping("/batches/{batchId}/alerts")
    public ResponseEntity<List<ColdChainAlertResponse>> getBatchAlerts(
            @PathVariable String batchId
    ) {
        return ResponseEntity.ok(coldChainService.getAlerts(batchId));
    }

    @GetMapping("/alerts/active")
    public ResponseEntity<List<ColdChainAlertResponse>> getActiveAlerts() {
        return ResponseEntity.ok(coldChainService.getActiveAlerts());
    }
}
