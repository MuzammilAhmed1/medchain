package com.medchain.ai.dto;

import java.util.List;

public record RiskAnalysisResponse(
        String batchId,
        int riskScore,
        String riskLevel,
        String reason,
        String recommendation,
        List<TriggeredRuleDto> triggeredRules
) {
}
