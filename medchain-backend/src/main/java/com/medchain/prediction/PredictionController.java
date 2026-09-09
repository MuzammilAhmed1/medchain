package com.medchain.prediction;

import com.medchain.prediction.dto.DemandPredictionResponse;
import com.medchain.prediction.dto.ExpiryPredictionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/predictions")
@RequiredArgsConstructor
public class PredictionController {

    private final PredictionService predictionService;

    @GetMapping("/demand")
    public ResponseEntity<List<DemandPredictionResponse>> getDemandPredictions() {
        return ResponseEntity.ok(predictionService.forecastDemandForAllMedicines());
    }

    @GetMapping("/expiry/{batchId}")
    public ResponseEntity<ExpiryPredictionResponse> getBatchExpiryPrediction(@PathVariable String batchId) {
        return ResponseEntity.ok(predictionService.predictBatchExpiry(batchId));
    }

    @GetMapping("/expiry")
    public ResponseEntity<List<ExpiryPredictionResponse>> getHighExpiryRiskBatches() {
        return ResponseEntity.ok(predictionService.getHighExpiryRiskBatches());
    }
}
