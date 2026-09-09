package com.medchain.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAssistantResponse {
    private String answerMarkdown;
    private List<String> referencedBatchIds;
    private List<String> referencedOrgIds;
    private List<String> suggestedActions;
}
