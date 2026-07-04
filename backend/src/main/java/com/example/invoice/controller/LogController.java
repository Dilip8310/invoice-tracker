package com.example.invoice.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

@RestController
public class LogController {

    @GetMapping(value = "/api/logs", produces = "text/plain")
    public String getLogs() {
        try {
            java.io.File logFile = new java.io.File("logs/app.log");
            if (!logFile.exists()) {
                return "Logs file is not created yet. Send some requests or perform operations to generate logs.";
            }
            List<String> lines = Files.readAllLines(Paths.get("logs/app.log"));
            // Get last 250 lines
            int limit = Math.min(lines.size(), 250);
            return lines.subList(lines.size() - limit, lines.size())
                    .stream()
                    .collect(Collectors.joining("\n"));
        } catch (IOException e) {
            return "Failed to read logs: " + e.getMessage();
        }
    }
}
