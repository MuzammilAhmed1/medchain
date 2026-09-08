package com.medchain;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MedChainApplication {

    public static void main(String[] args) {
        SpringApplication.run(MedChainApplication.class, args);
    }
}
