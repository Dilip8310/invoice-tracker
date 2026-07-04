package com.example.invoice.config;

import com.example.invoice.model.User;
import com.example.invoice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        String adminEmail = "admin@invoice.com";
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = new User();
            admin.setFullName("Super Admin");
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode("adminpassword123"));
            admin.setRole("ADMIN");
            admin.setApproved(true);
            userRepository.save(admin);
            System.out.println("[ADMIN INITIALIZER] Default Super Admin created with email: " + adminEmail);
        }
    }
}
