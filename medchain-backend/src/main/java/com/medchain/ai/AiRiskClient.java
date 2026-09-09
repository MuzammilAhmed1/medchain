package com.medchain.ai;

import com.medchain.ai.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

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

    public Optional<AiColdChainResponse> analyzeColdChain(AiColdChainRequest request) {
        try {
            AiColdChainResponse response = aiServiceRestTemplate.postForObject(
                    baseUrl + "/ai/cold-chain/analyze", request, AiColdChainResponse.class);
            return Optional.ofNullable(response);
        } catch (RestClientException e) {
            log.error("AI cold-chain analysis failed for batch {}: {}", request.getBatchId(), e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<AiFraudResponse> analyzeFraud(AiFraudRequest request) {
        try {
            AiFraudResponse response = aiServiceRestTemplate.postForObject(
                    baseUrl + "/ai/fraud/analyze", request, AiFraudResponse.class);
            return Optional.ofNullable(response);
        } catch (RestClientException e) {
            log.error("AI fraud analysis failed for batch {}: {}", request.getBatchId(), e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<AiDemandResponse> predictDemand(AiDemandRequest request) {
        try {
            AiDemandResponse response = aiServiceRestTemplate.postForObject(
                    baseUrl + "/ai/demand/predict", request, AiDemandResponse.class);
            return Optional.ofNullable(response);
        } catch (RestClientException e) {
            log.error("AI demand forecasting failed for medicine {}: {}", request.getMedicineName(), e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<AiExpiryResponse> predictExpiry(AiExpiryRequest request) {
        try {
            AiExpiryResponse response = aiServiceRestTemplate.postForObject(
                    baseUrl + "/ai/expiry/predict", request, AiExpiryResponse.class);
            return Optional.ofNullable(response);
        } catch (RestClientException e) {
            log.error("AI expiry prediction failed for batch {}: {}", request.getBatchId(), e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<AiAssistantResponse> queryAssistant(AiAssistantRequest request) {
        try {
            AiAssistantResponse response = aiServiceRestTemplate.postForObject(
                    baseUrl + "/ai/assistant/query", request, AiAssistantResponse.class);
            return Optional.ofNullable(response);
        } catch (RestClientException e) {
            log.error("AI assistant query failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
