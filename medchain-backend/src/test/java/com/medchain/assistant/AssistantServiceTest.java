package com.medchain.assistant;

import com.medchain.ai.AiRiskClient;
import com.medchain.ai.dto.AiAssistantRequest;
import com.medchain.ai.dto.AiAssistantResponse;
import com.medchain.anomaly.AnomalyEventRepository;
import com.medchain.assistant.dto.AssistantRequest;
import com.medchain.assistant.dto.AssistantResponseDto;
import com.medchain.auth.Role;
import com.medchain.auth.User;
import com.medchain.batch.BatchRepository;
import com.medchain.batch.MedicineBatch;
import com.medchain.coldchain.ColdChainAlertRepository;
import com.medchain.org.Organization;
import com.medchain.transfer.TransferRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssistantServiceTest {

    @Mock
    private BatchRepository batchRepository;
    @Mock
    private TransferRepository transferRepository;
    @Mock
    private ColdChainAlertRepository alertRepository;
    @Mock
    private AnomalyEventRepository anomalyRepository;
    @Mock
    private AiRiskClient aiRiskClient;

    @InjectMocks
    private AssistantService assistantService;

    private Organization pharmaOrg;
    private Organization rivalOrg;
    private User pharmacyUser;
    private MedicineBatch authorizedBatch;
    private MedicineBatch rivalBatch;

    @BeforeEach
    void setUp() {
        pharmaOrg = Organization.builder().id(UUID.randomUUID()).name("City Pharmacy").build();
        rivalOrg = Organization.builder().id(UUID.randomUUID()).name("Rival Pharmacy").build();

        pharmacyUser = User.builder()
                .id(UUID.randomUUID())
                .name("Alice")
                .email("alice@pharmacy.com")
                .role(Role.PHARMACY)
                .organization(pharmaOrg)
                .build();

        authorizedBatch = MedicineBatch.builder()
                .id("MC-AUTH-001")
                .medicineName("Aspirin")
                .quantity(100)
                .manufacturer(pharmaOrg)
                .currentOwner(pharmaOrg)
                .manufacturingDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusMonths(6))
                .build();

        rivalBatch = MedicineBatch.builder()
                .id("MC-RIVAL-002")
                .medicineName("Confidential Drug")
                .quantity(9999)
                .manufacturer(rivalOrg)
                .currentOwner(rivalOrg)
                .manufacturingDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusMonths(12))
                .build();
    }

    @Test
    void queryEnforcesOrganizationDataIsolation() {
        AssistantRequest request = new AssistantRequest();
        request.setQuery("List all batches in the database");

        when(batchRepository.findAll()).thenReturn(List.of(authorizedBatch, rivalBatch));
        when(transferRepository.findAllByFromOrgOrToOrgOrderByInitiatedAtDesc(pharmaOrg, pharmaOrg))
                .thenReturn(Collections.emptyList());
        when(alertRepository.findAll()).thenReturn(Collections.emptyList());
        when(anomalyRepository.findAll()).thenReturn(Collections.emptyList());

        ArgumentCaptor<AiAssistantRequest> captor = ArgumentCaptor.forClass(AiAssistantRequest.class);
        when(aiRiskClient.queryAssistant(captor.capture())).thenReturn(Optional.of(
                AiAssistantResponse.builder()
                        .answerMarkdown("Found 1 authorized batch")
                        .referencedBatchIds(List.of("MC-AUTH-001"))
                        .referencedOrgIds(Collections.emptyList())
                        .suggestedActions(Collections.emptyList())
                        .build()
        ));

        AssistantResponseDto response = assistantService.query(request, pharmacyUser);

        assertThat(response.getAnswerMarkdown()).contains("Found 1 authorized batch");

        // Verify that rival batch was NOT passed in the AI request payload
        AiAssistantRequest capturedReq = captor.getValue();
        assertThat(capturedReq.getBatches()).hasSize(1);
        assertThat(capturedReq.getBatches().get(0).get("id")).isEqualTo("MC-AUTH-001");
    }
}
