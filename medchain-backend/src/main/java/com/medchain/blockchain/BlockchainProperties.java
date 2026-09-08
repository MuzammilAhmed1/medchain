package com.medchain.blockchain;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "medchain.blockchain")
public record BlockchainProperties(
        boolean enabled,
        String rpcUrl,
        String contractAddress,
        String relayerPrivateKey,
        Long chainId
) {
}
