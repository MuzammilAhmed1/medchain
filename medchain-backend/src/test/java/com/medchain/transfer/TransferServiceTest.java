package com.medchain.transfer;

import com.medchain.audit.AuditEventService;
import com.medchain.auth.Role;
import com.medchain.auth.User;
import com.medchain.batch.BatchRepository;
import com.medchain.batch.BatchService;
import com.medchain.batch.BatchStatus;
import com.medchain.batch.MedicineBatch;
import com.medchain.blockchain.BlockchainClient;
import com.medchain.common.exception.BadRequestException;
import com.medchain.common.exception.ForbiddenActionException;
import com.medchain.org.OrgType;
import com.medchain.org.Organization;
import com.medchain.org.OrganizationRepository;
import com.medchain.transfer.dto.InitiateTransferRequest;
import com.medchain.transfer.dto.TransferResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransferServiceTest {

    @Mock
    private TransferRepository transferRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private OrganizationRepository organizationRepository;
    @Mock
    private BatchService batchService;
    @Mock
    private BlockchainClient blockchainClient;
    @Mock
    private AuditEventService auditEventService;

    @InjectMocks
    private TransferService transferService;

    private Organization manufacturer;
    private Organization distributor;
    private Organization pharmacy;
    private User mfgUser;
    private User distUser;
    private User pharmUser;
    private MedicineBatch batch;

    @BeforeEach
    void setUp() {
        manufacturer = Organization.builder().id(UUID.randomUUID()).name("Apex Pharma").type(OrgType.MANUFACTURER).build();
        distributor = Organization.builder().id(UUID.randomUUID()).name("LogiMed Express").type(OrgType.DISTRIBUTOR).build();
        pharmacy = Organization.builder().id(UUID.randomUUID()).name("City Care Pharmacy").type(OrgType.PHARMACY).build();

        mfgUser = User.builder().id(UUID.randomUUID()).name("Alice Mfg").email("alice@apex.com").role(Role.MANUFACTURER).organization(manufacturer).build();
        distUser = User.builder().id(UUID.randomUUID()).name("Bob Dist").email("bob@logimed.com").role(Role.DISTRIBUTOR).organization(distributor).build();
        pharmUser = User.builder().id(UUID.randomUUID()).name("Charlie Pharm").email("charlie@citycare.com").role(Role.PHARMACY).organization(pharmacy).build();

        batch = MedicineBatch.builder()
                .id("MC-2026-00001")
                .batchNumber("MC-2026-00001")
                .medicineName("Paracetamol 500mg")
                .manufacturer(manufacturer)
                .currentOwner(manufacturer)
                .status(BatchStatus.CREATED)
                .manufacturingDate(LocalDate.now().minusDays(5))
                .expiryDate(LocalDate.now().plusYears(1))
                .quantity(500)
                .createdAt(Instant.now())
                .build();
    }

    @Test
    void manufacturerCanTransferToDistributor() {
        when(batchService.getBatchOrThrow("MC-2026-00001")).thenReturn(batch);
        when(organizationRepository.findByName("LogiMed Express")).thenReturn(Optional.of(distributor));
        when(transferRepository.save(any(Transfer.class))).thenAnswer(invocation -> {
            Transfer t = invocation.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });

        TransferResponse response = transferService.initiate(
                new InitiateTransferRequest("MC-2026-00001", "LogiMed Express"),
                mfgUser
        );

        assertThat(response.batchId()).isEqualTo("MC-2026-00001");
        assertThat(response.from()).isEqualTo("Apex Pharma");
        assertThat(response.to()).isEqualTo("LogiMed Express");
        verify(batchService).markInTransit(batch);
        verify(auditEventService).record(eq(batch), any(), any(), any(), any());
    }

    @Test
    void manufacturerCannotTransferDirectlyToPharmacy() {
        when(batchService.getBatchOrThrow("MC-2026-00001")).thenReturn(batch);
        when(organizationRepository.findByName("City Care Pharmacy")).thenReturn(Optional.of(pharmacy));

        assertThatThrownBy(() -> transferService.initiate(
                new InitiateTransferRequest("MC-2026-00001", "City Care Pharmacy"),
                mfgUser
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Manufacturers can only transfer medicine batches to Distributors");
    }

    @Test
    void nonCustodianCannotInitiateTransfer() {
        when(batchService.getBatchOrThrow("MC-2026-00001")).thenReturn(batch);

        assertThatThrownBy(() -> transferService.initiate(
                new InitiateTransferRequest("MC-2026-00001", "LogiMed Express"),
                distUser
        ))
                .isInstanceOf(ForbiddenActionException.class)
                .hasMessageContaining("Only the current owner of this batch can initiate a transfer");
    }

    @Test
    void pharmacyCannotInitiateTransfer() {
        batch.setCurrentOwner(pharmacy);
        batch.setStatus(BatchStatus.RECEIVED);

        when(batchService.getBatchOrThrow("MC-2026-00001")).thenReturn(batch);

        assertThatThrownBy(() -> transferService.initiate(
                new InitiateTransferRequest("MC-2026-00001", "Apex Pharma"),
                pharmUser
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Pharmacies dispense medicine directly to patients");
    }

    @Test
    void recipientCanReceiveTransfer() {
        UUID transferId = UUID.randomUUID();
        Transfer transfer = Transfer.builder()
                .id(transferId)
                .batch(batch)
                .fromOrg(manufacturer)
                .toOrg(distributor)
                .status(TransferStatus.INITIATED)
                .initiatedAt(Instant.now())
                .build();

        when(transferRepository.findById(transferId)).thenReturn(Optional.of(transfer));
        when(transferRepository.save(any(Transfer.class))).thenReturn(transfer);
        when(blockchainClient.recordTransferReceived(any())).thenReturn(Optional.empty());

        TransferResponse response = transferService.receive(transferId.toString(), distUser);

        assertThat(response.status()).isEqualTo(TransferStatus.RECEIVED);
        verify(batchService).markReceived(batch, distributor);
        verify(auditEventService).record(eq(batch), any(), any(), any(), any());
    }
}
