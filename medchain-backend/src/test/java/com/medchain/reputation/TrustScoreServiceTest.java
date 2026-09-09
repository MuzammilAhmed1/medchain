package com.medchain.reputation;

import com.medchain.batch.BatchRepository;
import com.medchain.coldchain.ColdChainAlertRepository;
import com.medchain.org.Organization;
import com.medchain.org.OrganizationRepository;
import com.medchain.reputation.dto.OrganizationTrustScoreResponse;
import com.medchain.transfer.Transfer;
import com.medchain.transfer.TransferRepository;
import com.medchain.transfer.TransferStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrustScoreServiceTest {

    @Mock
    private OrganizationRepository organizationRepository;
    @Mock
    private OrganizationTrustScoreRepository trustScoreRepository;
    @Mock
    private TransferRepository transferRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private ColdChainAlertRepository coldChainAlertRepository;

    @InjectMocks
    private TrustScoreService trustScoreService;

    private Organization org;

    @BeforeEach
    void setUp() {
        org = Organization.builder()
                .id(UUID.randomUUID())
                .name("MedLogistics")
                .build();
    }

    @Test
    void calculateScorePerfectHistoryGives100() {
        when(organizationRepository.findById(org.getId())).thenReturn(Optional.of(org));
        when(transferRepository.findAllByFromOrgOrToOrgOrderByInitiatedAtDesc(org, org))
                .thenReturn(Collections.emptyList());
        when(batchRepository.findAll()).thenReturn(Collections.emptyList());
        when(coldChainAlertRepository.findAll()).thenReturn(Collections.emptyList());
        when(trustScoreRepository.save(any(OrganizationTrustScore.class))).thenAnswer(inv -> inv.getArgument(0));

        OrganizationTrustScoreResponse response = trustScoreService.calculateScore(org.getId());

        assertThat(response.getScore()).isEqualTo(100);
        assertThat(response.getSuccessfulTransfers()).isEqualTo(0);
        assertThat(response.getDelayedTransfers()).isEqualTo(0);
    }

    @Test
    void calculateScoreDeductsForDelays() {
        Transfer delayedTransfer = Transfer.builder()
                .id(UUID.randomUUID())
                .fromOrg(org)
                .toOrg(org)
                .status(TransferStatus.RECEIVED)
                .initiatedAt(Instant.now().minus(5, ChronoUnit.DAYS))
                .receivedAt(Instant.now()) // > 72 hours
                .build();

        when(organizationRepository.findById(org.getId())).thenReturn(Optional.of(org));
        when(transferRepository.findAllByFromOrgOrToOrgOrderByInitiatedAtDesc(org, org))
                .thenReturn(List.of(delayedTransfer));
        when(batchRepository.findAll()).thenReturn(Collections.emptyList());
        when(coldChainAlertRepository.findAll()).thenReturn(Collections.emptyList());
        when(trustScoreRepository.save(any(OrganizationTrustScore.class))).thenAnswer(inv -> inv.getArgument(0));

        OrganizationTrustScoreResponse response = trustScoreService.calculateScore(org.getId());

        // 100 - (1 delay * 5) = 95
        assertThat(response.getScore()).isEqualTo(95);
        assertThat(response.getDelayedTransfers()).isEqualTo(1);
    }
}
