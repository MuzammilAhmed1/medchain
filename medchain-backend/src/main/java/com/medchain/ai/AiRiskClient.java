package com.medchain.ai;

import com.medchain.ai.dto.RiskAnalysisRequest;
import com.medchain.ai.dto.RiskAnalysisResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

/**
 * Thin HTTP client for the medchain-ai-service FastAPI app. Failures are
 * caught and logged rather than propagated - a batch create/transfer
 * should still succeed even if the AI service happens to be down; the
 * batch simply keeps its previous (or null) risk fields until the next
 * successful call.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiRiskClient {

    private final RestTemplate aiServiceRestTemplate;

    @Value("${medchain.ai-service.base-url}")
    private String baseUrl;

    public Optional<RiskAnalysisResponse> analyze(RiskAnalysisRequest request) {
        try {
            RiskAnalysisResponse response = aiServiceRestTemplate.postForObject(
                    baseUrl + "/risk/analyze", request, RiskAnalysisResponse.class);
            return Optional.ofNullable(response);
        } catch (RestClientException e) {
            log.error("AI risk service call failed for batch {}: {}", request.batchId(), e.getMessage());
            return Optional.empty();
        }
    }
}
