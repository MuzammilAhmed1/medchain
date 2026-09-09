package com.medchain.assistant;

import com.medchain.assistant.dto.AssistantRequest;
import com.medchain.assistant.dto.AssistantResponseDto;
import com.medchain.auth.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;

    @PostMapping("/query")
    public ResponseEntity<AssistantResponseDto> queryAssistant(
            @Valid @RequestBody AssistantRequest request,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(assistantService.query(request, user));
    }
}
