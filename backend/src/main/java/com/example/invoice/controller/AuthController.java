package com.example.invoice.controller;

import com.example.invoice.model.User;
import com.example.invoice.model.Activity;
import com.example.invoice.repository.ActivityRepository;
import com.example.invoice.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private final UserService userService;
    private final ActivityRepository activityRepository;

    @Autowired
    public AuthController(UserService userService, ActivityRepository activityRepository) {
        this.userService = userService;
        this.activityRepository = activityRepository;
    }

    @PostMapping("/register/request-otp")
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> payload) {
        String fullName = payload.get("fullName");
        String email = payload.get("email");
        String password = payload.get("password");

        logger.info("[AUTH CONTROLLER] requestOtp: Received request for email: {}, fullName: {}", email, fullName);

        // Validate basic inputs
        Map<String, String> errors = new HashMap<>();
        if (fullName == null || fullName.trim().isEmpty()) errors.put("fullName", "Name is required");
        if (email == null || email.trim().isEmpty()) errors.put("email", "Email is required");
        if (password == null || password.trim().isEmpty()) errors.put("password", "Password is required");

        if (!errors.isEmpty()) {
            logger.warn("[AUTH CONTROLLER] requestOtp: Validation failed: {}", errors);
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            String otp = userService.requestOtpRegistration(fullName, email, password);
            Map<String, String> response = new HashMap<>();
            response.put("message", "OTP sent successfully to email");
            response.put("email", email);
            response.put("otp", otp);
            logger.info("[AUTH CONTROLLER] requestOtp: OTP successfully generated for email: {}", email);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("[AUTH CONTROLLER] requestOtp: Invalid request for email: {}. Error: {}", email, e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("email", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            logger.error("[AUTH CONTROLLER] requestOtp: System error for email: {}", email, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/register/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp = payload.get("otp");

        logger.info("[AUTH CONTROLLER] verifyOtp: Received verification request for email: {}", email);

        Map<String, String> errors = new HashMap<>();
        if (email == null || email.trim().isEmpty()) errors.put("email", "Email is required");
        if (otp == null || otp.trim().isEmpty()) errors.put("otp", "OTP verification code is required");

        if (!errors.isEmpty()) {
            logger.warn("[AUTH CONTROLLER] verifyOtp: Validation failed: {}", errors);
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            User registered = userService.verifyOtpAndRegister(email, otp);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "User registered successfully");
            response.put("id", registered.getId());
            response.put("fullName", registered.getFullName());
            response.put("email", registered.getEmail());
            response.put("role", registered.getRole());
            response.put("approved", registered.isApproved());

            logger.info("[AUTH CONTROLLER] verifyOtp: Successfully verified email {} (ID: {})", email, registered.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            logger.warn("[AUTH CONTROLLER] verifyOtp: Verification failed for email: {}. Error: {}", email, e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("otp", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            logger.error("[AUTH CONTROLLER] verifyOtp: System error during verification for email: {}", email, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        logger.info("[AUTH CONTROLLER] loginUser: Received login request for email: {}", email);

        Map<String, String> errors = new HashMap<>();
        if (email == null || email.trim().isEmpty()) errors.put("email", "Email is required");
        if (password == null || password.trim().isEmpty()) errors.put("password", "Password is required");

        if (!errors.isEmpty()) {
            logger.warn("[AUTH CONTROLLER] loginUser: Validation failed: {}", errors);
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            User user = userService.loginUser(email, password);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login successful");
            response.put("id", user.getId());
            response.put("fullName", user.getFullName());
            response.put("email", user.getEmail());
            response.put("role", user.getRole());

            logger.info("[AUTH CONTROLLER] loginUser: Successfully logged in email: {} (ID: {})", email, user.getId());
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.warn("[AUTH CONTROLLER] loginUser: Authentication failed for email: {}. Error: {}", email, e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        } catch (Exception e) {
            logger.error("[AUTH CONTROLLER] loginUser: System error for email: {}", email, e);
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

        logger.info("[AUTH CONTROLLER] updateProfile: Received update request for user ID: {}, fullName: {}", userId, fullName);

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
            logger.warn("[AUTH CONTROLLER] updateProfile: Validation failed: {}", errors);
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            User updated = userService.updateUserProfile(userId, fullName, currentPassword, newPassword);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile updated successfully");
            response.put("id", updated.getId());
            response.put("fullName", updated.getFullName());
            response.put("email", updated.getEmail());
            response.put("role", updated.getRole());
            response.put("approved", updated.isApproved());
            
            logger.info("[AUTH CONTROLLER] updateProfile: Successfully updated profile for user ID: {}", userId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("[AUTH CONTROLLER] updateProfile: Profile update failed for user ID: {}. Error: {}", userId, e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            logger.error("[AUTH CONTROLLER] updateProfile: System error for user ID: {}", userId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/forgot-password/request-otp")
    public ResponseEntity<?> requestResetOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        logger.info("[AUTH CONTROLLER] requestResetOtp: Received request for email: {}", email);

        if (email == null || email.trim().isEmpty()) {
            logger.warn("[AUTH CONTROLLER] requestResetOtp: Validation failed: Email is required");
            Map<String, String> errors = new HashMap<>();
            errors.put("email", "Email is required");
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            String otp = userService.requestPasswordResetOtp(email);
            Map<String, String> response = new HashMap<>();
            response.put("message", "OTP sent successfully to email");
            response.put("email", email);
            response.put("otp", otp);
            logger.info("[AUTH CONTROLLER] requestResetOtp: OTP successfully generated for password reset for email: {}", email);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("[AUTH CONTROLLER] requestResetOtp: Request failed for email: {}. Error: {}", email, e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("email", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            logger.error("[AUTH CONTROLLER] requestResetOtp: System error for email: {}", email, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp = payload.get("otp");
        String newPassword = payload.get("newPassword");

        logger.info("[AUTH CONTROLLER] resetPassword: Received password reset attempt for email: {}", email);

        Map<String, String> errors = new HashMap<>();
        if (email == null || email.trim().isEmpty()) errors.put("email", "Email is required");
        if (otp == null || otp.trim().isEmpty()) errors.put("otp", "OTP verification code is required");
        if (newPassword == null || newPassword.trim().isEmpty()) errors.put("newPassword", "New password is required");

        if (!errors.isEmpty()) {
            logger.warn("[AUTH CONTROLLER] resetPassword: Validation failed: {}", errors);
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            userService.resetPasswordWithOtp(email, otp, newPassword);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password reset successful");
            logger.info("[AUTH CONTROLLER] resetPassword: Password reset successful for email: {}", email);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("[AUTH CONTROLLER] resetPassword: Reset failed for email: {}. Error: {}", email, e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("otp", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            logger.error("[AUTH CONTROLLER] resetPassword: System error for email: {}", email, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/admin/users")
    public ResponseEntity<?> getPendingUsers(@RequestHeader("User-Id") Long userId) {
        logger.info("[AUTH CONTROLLER] getPendingUsers: Admin ID: {} requesting list of users", userId);
        try {
            User admin = userService.getUserById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            if (!"ADMIN".equals(admin.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Super Admin can access this resource"));
            }
            
            List<User> users = userService.getAllUsersByRole("USER");
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            logger.error("[AUTH CONTROLLER] getPendingUsers error", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/admin/users/{id}/approve")
    public ResponseEntity<?> approveUser(
            @PathVariable Long id,
            @RequestHeader("User-Id") Long userId) {
        logger.info("[AUTH CONTROLLER] approveUser: Admin ID: {} approving user ID: {}", userId, id);
        try {
            User admin = userService.getUserById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            if (!"ADMIN".equals(admin.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Super Admin can access this resource"));
            }
            
            User approvedUser = userService.approveUser(id);
            return ResponseEntity.ok(approvedUser);
        } catch (Exception e) {
            logger.error("[AUTH CONTROLLER] approveUser error", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/admin/users/{id}/reject")
    public ResponseEntity<?> rejectUser(
            @PathVariable Long id,
            @RequestHeader("User-Id") Long userId) {
        logger.info("[AUTH CONTROLLER] rejectUser: Admin ID: {} rejecting/deleting user ID: {}", userId, id);
        try {
            User admin = userService.getUserById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            if (!"ADMIN".equals(admin.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Super Admin can access this resource"));
            }
            
            userService.deleteUser(id);
            return ResponseEntity.ok(Map.of("message", "User registration rejected and account deleted"));
        } catch (Exception e) {
            logger.error("[AUTH CONTROLLER] rejectUser error", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/admin/activities")
    public ResponseEntity<?> getAdminActivities(@RequestHeader("User-Id") Long userId) {
        logger.info("[AUTH CONTROLLER] getAdminActivities: Admin ID: {} requesting list of activities", userId);
        try {
            User admin = userService.getUserById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            if (!"ADMIN".equals(admin.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Super Admin can access this resource"));
            }
            
            List<Activity> activities = activityRepository.findAll();
            List<Activity> sorted = activities.stream()
                    .sorted((a, b) -> b.getId().compareTo(a.getId()))
                    .toList();
            return ResponseEntity.ok(sorted);
        } catch (Exception e) {
            logger.error("[AUTH CONTROLLER] getAdminActivities error", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
