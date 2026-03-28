package com.demo.erp_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Entry point for the Spring Boot application. */
@SpringBootApplication
public class ErpBackendApplication {

    /** Starts the embedded server and Spring application context. */
    public static void main(String[] args) {
        SpringApplication.run(ErpBackendApplication.class, args);
    }
}
