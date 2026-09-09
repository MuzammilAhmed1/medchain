package com.medchain.assistant.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssistantRequest {

    @NotBlank(message = "Query is required")
    private String query;
}
