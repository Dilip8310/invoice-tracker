package com.example.invoice.controller;

import com.example.invoice.model.User;
import com.example.invoice.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    @Autowired
    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register/request-otp")
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> payload) {
        String fullName = payload.get("fullName");
        String email = payload.get("email");
        String password = payload.get("password");

        // Validate basic inputs
        Map<String, String> errors = new HashMap<>();
        if (fullName == null || fullName.trim().isEmpty()) errors.put("fullName", "Name is required");
        if (email == null || email.trim().isEmpty()) errors.put("email", "Email is required");
        if (password == null || password.trim().isEmpty()) errors.put("password", "Password is required");

        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            String otp = userService.requestOtpRegistration(fullName, email, password);
            Map<String, String> response = new HashMap<>();
            response.put("message", "OTP sent successfully to email");
            response.put("email", email);
            response.put("otp", otp);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("email", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/register/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp = payload.get("otp");

        Map<String, String> errors = new HashMap<>();
        if (email == null || email.trim().isEmpty()) errors.put("email", "Email is required");
        if (otp == null || otp.trim().isEmpty()) errors.put("otp", "OTP verification code is required");

        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            User registered = userService.verifyOtpAndRegister(email, otp);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "User registered successfully");
            response.put("id", registered.getId());
            response.put("fullName", registered.getFullName());
            response.put("email", registered.getEmail());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("otp", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        Map<String, String> errors = new HashMap<>();
        if (email == null || email.trim().isEmpty()) errors.put("email", "Email is required");
        if (password == null || password.trim().isEmpty()) errors.put("password", "Password is required");

        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            User user = userService.loginUser(email, password);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login successful");
            response.put("id", user.getId());
            response.put("fullName", user.getFullName());
            response.put("email", user.getEmail());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/update-profile")
    public ResponseEntity<?> updateProfile(
            @RequestBody Map<String, String> payload,
            @RequestHeader("User-Id") Long userId) {
        String fullName = payload.get("fullName");
        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");

        Map<String, String> errors = new HashMap<>();
        if (fullName == null || fullName.trim().isEmpty()) {
            errors.put("fullName", "Name is required");
        }

        // Validate password updates only if currentPassword or newPassword is provided
        boolean isUpdatingPassword = (currentPassword != null && !currentPassword.trim().isEmpty()) ||
                                     (newPassword != null && !newPassword.trim().isEmpty());

        if (isUpdatingPassword) {
            if (currentPassword == null || currentPassword.trim().isEmpty()) {
                errors.put("currentPassword", "Current password is required");
            }
            if (newPassword == null || newPassword.trim().isEmpty()) {
                errors.put("newPassword", "New password is required");
            }
        }

        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            User updated = userService.updateUserProfile(userId, fullName, currentPassword, newPassword);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile updated successfully");
            response.put("id", updated.getId());
            response.put("fullName", updated.getFullName());
            response.put("email", updated.getEmail());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
