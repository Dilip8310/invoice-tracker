package com.example.invoice.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "<html><body style='font-family: sans-serif; text-align: center; padding: 50px; background-color: #141625; color: white;'>" +
               "<h1 style='color: #FFFFFF;'>Invoice Tracker Backend API</h1>" +
               "<p style='color: #888EB0; font-size: 1.1rem;'>The Spring Boot application is running successfully on port 8082.</p>" +
               "<p style='color: #DFE3FA; font-size: 1.1rem; margin-top: 20px;'>To use the tracker, open the React frontend in your browser at:</p>" +
               "<a href='http://localhost:5180/' style='color: #FFFFFF; background-color: #7C5DFA; font-weight: bold; text-decoration: none; font-size: 1.2rem; padding: 12px 24px; border-radius: 24px; display: inline-block; margin-top: 15px; transition: background-color 0.3s;'>Open Frontend Client (http://localhost:5180/)</a>" +
               "</body></html>";
    }
}
