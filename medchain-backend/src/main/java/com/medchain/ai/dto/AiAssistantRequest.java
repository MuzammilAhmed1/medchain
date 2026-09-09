package com.medchain.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAssistantRequest {
    private String query;
    private String userRole;
    private String organizationName;
    private List<Map<String, Object>> batches;
    private List<Map<String, Object>> alerts;
    private List<Map<String, Object>> transfers;
    private List<Map<String, Object>> anomalies;
}
