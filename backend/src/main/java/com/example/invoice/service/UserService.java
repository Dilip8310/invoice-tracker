package com.example.invoice.service;

import com.example.invoice.model.User;
import com.example.invoice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Random;
import java.time.LocalDateTime;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@Transactional
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JavaMailSender mailSender) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
    }

    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    public User registerNewUser(User user) {
        logger.info("[USER SERVICE] registerNewUser: Registering user email: {}", user.getEmail());
        if (emailExists(user.getEmail())) {
            logger.warn("[USER SERVICE] registerNewUser: Registration failed, email already exists: {}", user.getEmail());
            throw new IllegalArgumentException("An account already exists with that email address");
        }

        // Encrypt the password using BCrypt
        String encryptedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(encryptedPassword);

        User saved = userRepository.save(user);
        logger.info("[USER SERVICE] registerNewUser: Successfully registered user ID: {}", saved.getId());
        return saved;
    }

    public User loginUser(String email, String password) {
        logger.info("[USER SERVICE] loginUser: Login attempt for email: {}", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    logger.warn("[USER SERVICE] loginUser: Invalid email/password attempt for: {}", email);
                    return new IllegalArgumentException("Invalid email or password");
                });

        if (!passwordEncoder.matches(password, user.getPassword())) {
            logger.warn("[USER SERVICE] loginUser: Password mismatch for email: {}", email);
            throw new IllegalArgumentException("Invalid email or password");
        }

        logger.info("[USER SERVICE] loginUser: Successful authentication for email: {}", email);
        return user;
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public User updateUserProfile(Long userId, String fullName, String currentPassword, String newPassword) {
        logger.info("[USER SERVICE] updateUserProfile: Request to update profile for user ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.error("[USER SERVICE] updateUserProfile: User not found with ID: {}", userId);
                    return new IllegalArgumentException("User not found with id: " + userId);
                });

        if (fullName != null && !fullName.trim().isEmpty()) {
            logger.info("[USER SERVICE] updateUserProfile: Updating full name of user ID: {} to '{}'", userId, fullName);
            user.setFullName(fullName.trim());
        }

        if (currentPassword != null && !currentPassword.trim().isEmpty() &&
            newPassword != null && !newPassword.trim().isEmpty()) {
            
            logger.info("[USER SERVICE] updateUserProfile: Updating password of user ID: {}", userId);
            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                logger.warn("[USER SERVICE] updateUserProfile: Current password mismatch for user ID: {}", userId);
                throw new IllegalArgumentException("Incorrect current password");
            }
            user.setPassword(passwordEncoder.encode(newPassword));
        }

        User saved = userRepository.save(user);
        logger.info("[USER SERVICE] updateUserProfile: Successfully updated user ID: {}", saved.getId());
        return saved;
    }

    // In-memory cache for pending OTP registrations
    private final ConcurrentHashMap<String, PendingUser> pendingRegistrations = new ConcurrentHashMap<>();

    public static class PendingUser {
        private final String fullName;
        private final String email;
        private final String password;
        private final String otp;
        private final LocalDateTime expiryTime;

        public PendingUser(String fullName, String email, String password, String otp) {
            this.fullName = fullName;
            this.email = email;
            this.password = password;
            this.otp = otp;
            this.expiryTime = LocalDateTime.now().plusMinutes(5); // 5 minutes validity
        }

        public String getFullName() { return fullName; }
        public String getEmail() { return email; }
        public String getPassword() { return password; }
        public String getOtp() { return otp; }
        public boolean isExpired() { return LocalDateTime.now().isAfter(expiryTime); }
        public LocalDateTime getExpiryTime() { return expiryTime; }
    }

    public String requestOtpRegistration(String fullName, String email, String password) {
        if (emailExists(email)) {
            throw new IllegalArgumentException("An account already exists with that email address");
        }

        // Generate a 6-digit OTP
        Random random = new Random();
        String otp = String.format("%06d", random.nextInt(1000000));

        // Cache the registration details
        PendingUser pendingUser = new PendingUser(fullName, email, password, otp);
        pendingRegistrations.put(email, pendingUser);

        // Print the OTP in the server logs
        logger.info("[OTP SERVICE] REGISTRATION OTP CODE GENERATED SUCCESSFULLY! Email: {}, OTP Code: {}, Expires: {}", 
                    email, otp, pendingUser.getExpiryTime());

        // Attempt to send a real email using SMTP configuration
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (fromEmail != null && !fromEmail.trim().isEmpty()) {
                message.setFrom(fromEmail);
            }
            message.setTo(email);
            message.setSubject("Your OTP Verification Code");
            message.setText("Hello " + fullName + ",\n\n"
                    + "Your 6-digit OTP verification code is: " + otp + "\n\n"
                    + "This code is valid for 5 minutes. If you did not request this code, please ignore this email.\n\n"
                    + "Best regards,\n"
                    + "Invoice Tracker Team");
            mailSender.send(message);
            logger.info("[OTP SERVICE] Successfully sent email to {}", email);
        } catch (Exception e) {
            logger.error("[OTP SERVICE] Failed to send email via SMTP, falling back to console printout. Error: {}", e.getMessage(), e);
        }

        return otp;
    }

    public User verifyOtpAndRegister(String email, String otp) {
        logger.info("[USER SERVICE] verifyOtpAndRegister: Verifying OTP for email: {}", email);
        PendingUser pendingUser = pendingRegistrations.get(email);
        if (pendingUser == null) {
            logger.warn("[USER SERVICE] verifyOtpAndRegister: No pending request found for email: {}", email);
            throw new IllegalArgumentException("No pending registration request found for this email");
        }

        if (pendingUser.isExpired()) {
            logger.warn("[USER SERVICE] verifyOtpAndRegister: OTP expired for email: {}", email);
            pendingRegistrations.remove(email);
            throw new IllegalArgumentException("OTP code has expired. Please register again.");
        }

        if (!pendingUser.getOtp().equals(otp)) {
            logger.warn("[USER SERVICE] verifyOtpAndRegister: Incorrect OTP entered for email: {}", email);
            throw new IllegalArgumentException("Incorrect OTP verification code");
        }

        // Complete user creation with encryption
        User newUser = new User(pendingUser.getFullName(), pendingUser.getEmail(), pendingUser.getPassword());
        User registered = registerNewUser(newUser);

        // Clear verification cache
        pendingRegistrations.remove(email);
        logger.info("[USER SERVICE] verifyOtpAndRegister: Successfully verified and registered user: {}", email);
        return registered;
    }
}
