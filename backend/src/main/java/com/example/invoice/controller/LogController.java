package com.example.invoice.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

@RestController
public class LogController {

    private static final Logger logger = LoggerFactory.getLogger(LogController.class);

    @GetMapping(value = "/api/logs", produces = "text/plain")
    public String getLogs() {
        logger.info("[LOG CONTROLLER] getLogs: Log export endpoint accessed.");
        try {
            java.io.File logFile = new java.io.File("logs/app.log");
            if (!logFile.exists()) {
                logger.warn("[LOG CONTROLLER] getLogs: Log file 'logs/app.log' does not exist.");
                return "Logs file is not created yet. Send some requests or perform operations to generate logs.";
            }
            List<String> lines = Files.readAllLines(Paths.get("logs/app.log"));
            // Get last 250 lines
            int limit = Math.min(lines.size(), 250);
            logger.info("[LOG CONTROLLER] getLogs: Successfully retrieved and exporting last {} lines of logs.", limit);
            return lines.subList(lines.size() - limit, lines.size())
                    .stream()
                    .collect(Collectors.joining("\n"));
        } catch (IOException e) {
            logger.error("[LOG CONTROLLER] getLogs: Error occurred while reading 'logs/app.log'", e);
            return "Failed to read logs: " + e.getMessage();
        }
    }
}
