package com.medchain.blockchain;

import com.medchain.blockchain.dto.BatchCustodyTimelineDto;
import com.medchain.blockchain.dto.BlockchainExplorerEventDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/blockchain/explorer")
@RequiredArgsConstructor
public class BlockchainExplorerController {

    private final BlockchainExplorerService blockchainExplorerService;
    private final BlockchainProperties properties;
    private final Web3j web3j;
    private final Credentials relayerCredentials;

    @GetMapping("/events")
    public ResponseEntity<Page<BlockchainExplorerEventDto>> listExplorerEvents(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(blockchainExplorerService.getEvents(pageable));
    }

    @GetMapping("/batches/{batchId}/timeline")
    public ResponseEntity<BatchCustodyTimelineDto> getBatchTimeline(@PathVariable String batchId) {
        return ResponseEntity.ok(blockchainExplorerService.getBatchCustodyTimeline(batchId));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getBlockchainStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("enabled", properties.enabled());
        status.put("rpcUrl", properties.rpcUrl());
        status.put("contractAddress", properties.contractAddress());
        status.put("chainId", properties.chainId());
        try {
            status.put("relayerAddress", relayerCredentials.getAddress());
            BigInteger balance = web3j.ethGetBalance(relayerCredentials.getAddress(), DefaultBlockParameterName.LATEST).send().getBalance();
            status.put("relayerBalanceWei", balance.toString());
            status.put("relayerBalancePOL", new BigDecimal(balance).divide(new BigDecimal("1000000000000000000")).toPlainString());
            BigInteger blockNumber = web3j.ethBlockNumber().send().getBlockNumber();
            status.put("latestBlockNumber", blockNumber.toString());
            status.put("connected", true);
        } catch (Exception e) {
            status.put("connected", false);
            status.put("error", e.getMessage());
        }
        return ResponseEntity.ok(status);
    }
}
