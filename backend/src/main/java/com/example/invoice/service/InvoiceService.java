package com.example.invoice.service;

import com.example.invoice.model.Invoice;
import com.example.invoice.model.InvoiceItem;
import com.example.invoice.model.User;
import com.example.invoice.repository.InvoiceRepository;
import com.example.invoice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
@Transactional
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final Random random = new Random();

    @Autowired
    public InvoiceService(InvoiceRepository invoiceRepository, UserRepository userRepository) {
        this.invoiceRepository = invoiceRepository;
        this.userRepository = userRepository;
    }

    public List<Invoice> getAllInvoices(Long userId, String status) {
        if (status != null && !status.trim().isEmpty()) {
            return invoiceRepository.findByUserIdAndStatus(userId, status.toUpperCase());
        }
        return invoiceRepository.findByUserId(userId);
    }

    public Optional<Invoice> getInvoiceById(Long id, Long userId) {
        return invoiceRepository.findById(id)
                .filter(inv -> inv.getUser() != null && inv.getUser().getId().equals(userId));
    }

    public Invoice createInvoice(Invoice invoice, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        
        invoice.setUser(user);

        // Generate unique invoice number if not already present
        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().trim().isEmpty()) {
            invoice.setInvoiceNumber(generateUniqueInvoiceNumber());
        }

        // Set invoiceDate if null
        if (invoice.getInvoiceDate() == null) {
            invoice.setInvoiceDate(LocalDate.now());
        }

        // Compute payment due date if null
        if (invoice.getPaymentDue() == null) {
            if (invoice.getPaymentTerms() == null) {
                invoice.setPaymentTerms(30); // Default to 30 days
            }
            invoice.setPaymentDue(invoice.getInvoiceDate().plusDays(invoice.getPaymentTerms()));
        }

        // Default status
        if (invoice.getStatus() == null || invoice.getStatus().trim().isEmpty()) {
            invoice.setStatus("PENDING");
        } else {
            invoice.setStatus(invoice.getStatus().toUpperCase());
        }

        // Configure items and calculate totals
        if (invoice.getItems() != null) {
            for (InvoiceItem item : invoice.getItems()) {
                item.setInvoice(invoice);
                item.calculateTotal();
            }
        }
        invoice.calculateTotal();

        return invoiceRepository.save(invoice);
    }

    public Invoice updateInvoice(Long id, Invoice invoiceDetails, Long userId) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with id: " + id));

        // Authorization check
        if (invoice.getUser() == null || !invoice.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized access to this invoice");
        }

        invoice.setClientName(invoiceDetails.getClientName());
        invoice.setClientEmail(invoiceDetails.getClientEmail());
        invoice.setClientStreet(invoiceDetails.getClientStreet());
        invoice.setClientCity(invoiceDetails.getClientCity());
        invoice.setClientPostCode(invoiceDetails.getClientPostCode());
        invoice.setClientCountry(invoiceDetails.getClientCountry());
        
        invoice.setSenderStreet(invoiceDetails.getSenderStreet());
        invoice.setSenderCity(invoiceDetails.getSenderCity());
        invoice.setSenderPostCode(invoiceDetails.getSenderPostCode());
        invoice.setSenderCountry(invoiceDetails.getSenderCountry());

        invoice.setDescription(invoiceDetails.getDescription());
        invoice.setPaymentTerms(invoiceDetails.getPaymentTerms());
        
        if (invoiceDetails.getInvoiceDate() != null) {
            invoice.setInvoiceDate(invoiceDetails.getInvoiceDate());
        }
        
        // Update due date directly if provided, or recompute
        if (invoiceDetails.getPaymentDue() != null) {
            invoice.setPaymentDue(invoiceDetails.getPaymentDue());
        } else {
            invoice.setPaymentDue(invoice.getInvoiceDate().plusDays(invoice.getPaymentTerms()));
        }

        // Keep status if not explicitly updated via details
        if (invoiceDetails.getStatus() != null && !invoiceDetails.getStatus().trim().isEmpty()) {
            invoice.setStatus(invoiceDetails.getStatus().toUpperCase());
        }

        // Clear existing items and map new ones to avoid orphan records
        invoice.getItems().clear();
        if (invoiceDetails.getItems() != null) {
            for (InvoiceItem newItem : invoiceDetails.getItems()) {
                newItem.setInvoice(invoice);
                newItem.calculateTotal();
                invoice.getItems().add(newItem);
            }
        }
        invoice.calculateTotal();

        return invoiceRepository.save(invoice);
    }

    public void deleteInvoice(Long id, Long userId) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with id: " + id));
        
        // Authorization check
        if (invoice.getUser() == null || !invoice.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized access to this invoice");
        }
        
        invoiceRepository.delete(invoice);
    }

    public Invoice updateStatus(Long id, String status, Long userId) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with id: " + id));
        
        // Authorization check
        if (invoice.getUser() == null || !invoice.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized access to this invoice");
        }

        invoice.setStatus(status.toUpperCase());
        return invoiceRepository.save(invoice);
    }

    private String generateUniqueInvoiceNumber() {
        String alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String number;
        do {
            StringBuilder sb = new StringBuilder();
            sb.append(alphabet.charAt(random.nextInt(26)));
            sb.append(alphabet.charAt(random.nextInt(26)));
            for (int i = 0; i < 4; i++) {
                sb.append(random.nextInt(10));
            }
            number = "#" + sb.toString();
        } while (invoiceRepository.existsByInvoiceNumber(number));
        return number;
    }
}
