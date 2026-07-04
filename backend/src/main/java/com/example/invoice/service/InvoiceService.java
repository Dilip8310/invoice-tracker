package com.example.invoice.service;

import com.example.invoice.model.Invoice;
import com.example.invoice.model.InvoiceItem;
import com.example.invoice.model.User;
import com.example.invoice.repository.InvoiceRepository;
import com.example.invoice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
@Transactional
public class InvoiceService {

    private static final Logger logger = LoggerFactory.getLogger(InvoiceService.class);

    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final Random random = new Random();

    @Autowired
    public InvoiceService(InvoiceRepository invoiceRepository, UserRepository userRepository) {
        this.invoiceRepository = invoiceRepository;
        this.userRepository = userRepository;
    }

    public List<Invoice> getAllInvoices(Long userId, String status) {
        logger.info("[INVOICE SERVICE] getAllInvoices: Querying database for user ID: {}, status: {}", userId, status);
        if (status != null && !status.trim().isEmpty()) {
            return invoiceRepository.findByUserIdAndStatus(userId, status.toUpperCase());
        }
        return invoiceRepository.findByUserId(userId);
    }

    public Optional<Invoice> getInvoiceById(Long id, Long userId) {
        logger.info("[INVOICE SERVICE] getInvoiceById: Querying database for invoice ID: {}, user ID: {}", id, userId);
        return invoiceRepository.findById(id)
                .filter(inv -> inv.getUser() != null && inv.getUser().getId().equals(userId));
    }

    public Invoice createInvoice(Invoice invoice, Long userId) {
        logger.info("[INVOICE SERVICE] createInvoice: Processing invoice creation for user ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.error("[INVOICE SERVICE] createInvoice: User not found with ID: {}", userId);
                    return new IllegalArgumentException("User not found with id: " + userId);
                });
        
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

        logger.info("[INVOICE SERVICE] createInvoice: Saving invoice number: {} to database", invoice.getInvoiceNumber());
        return invoiceRepository.save(invoice);
    }

    public Invoice updateInvoice(Long id, Invoice invoiceDetails, Long userId) {
        logger.info("[INVOICE SERVICE] updateInvoice: Processing update for invoice ID: {}, user ID: {}", id, userId);
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> {
                    logger.error("[INVOICE SERVICE] updateInvoice: Invoice not found with ID: {}", id);
                    return new IllegalArgumentException("Invoice not found with id: " + id);
                });

        // Authorization check
        if (invoice.getUser() == null || !invoice.getUser().getId().equals(userId)) {
            logger.warn("[INVOICE SERVICE] updateInvoice: Unauthorized attempt to edit invoice ID: {} by user ID: {}", id, userId);
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

        logger.info("[INVOICE SERVICE] updateInvoice: Saving updated invoice ID: {} to database", id);
        return invoiceRepository.save(invoice);
    }

    public void deleteInvoice(Long id, Long userId) {
        logger.info("[INVOICE SERVICE] deleteInvoice: Processing delete for invoice ID: {}, user ID: {}", id, userId);
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> {
                    logger.error("[INVOICE SERVICE] deleteInvoice: Invoice not found with ID: {}", id);
                    return new IllegalArgumentException("Invoice not found with id: " + id);
                });
        
        // Authorization check
        if (invoice.getUser() == null || !invoice.getUser().getId().equals(userId)) {
            logger.warn("[INVOICE SERVICE] deleteInvoice: Unauthorized attempt to delete invoice ID: {} by user ID: {}", id, userId);
            throw new IllegalArgumentException("Unauthorized access to this invoice");
        }
        
        invoiceRepository.delete(invoice);
        logger.info("[INVOICE SERVICE] deleteInvoice: Successfully deleted invoice ID: {}", id);
    }

    public Invoice updateStatus(Long id, String status, Long userId) {
        logger.info("[INVOICE SERVICE] updateStatus: Processing status change for invoice ID: {} to '{}', user ID: {}", id, status, userId);
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> {
                    logger.error("[INVOICE SERVICE] updateStatus: Invoice not found with ID: {}", id);
                    return new IllegalArgumentException("Invoice not found with id: " + id);
                });
        
        // Authorization check
        if (invoice.getUser() == null || !invoice.getUser().getId().equals(userId)) {
            logger.warn("[INVOICE SERVICE] updateStatus: Unauthorized attempt to change status of invoice ID: {} by user ID: {}", id, userId);
            throw new IllegalArgumentException("Unauthorized access to this invoice");
        }

        invoice.setStatus(status.toUpperCase());
        logger.info("[INVOICE SERVICE] updateStatus: Saving status updated invoice ID: {} to database", id);
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
        logger.info("[INVOICE SERVICE] Generated unique invoice number: {}", number);
        return number;
    }
}
