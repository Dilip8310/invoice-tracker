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
import com.example.invoice.model.Activity;
import com.example.invoice.repository.ActivityRepository;

@Service
@Transactional
public class InvoiceService {

    private static final Logger logger = LoggerFactory.getLogger(InvoiceService.class);

    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final ActivityRepository activityRepository;
    private final Random random = new Random();

    @Autowired
    public InvoiceService(InvoiceRepository invoiceRepository, UserRepository userRepository, ActivityRepository activityRepository) {
        this.invoiceRepository = invoiceRepository;
        this.userRepository = userRepository;
        this.activityRepository = activityRepository;
    }

    public List<Invoice> getAllInvoices(Long userId, String status) {
        logger.info("[INVOICE SERVICE] getAllInvoices: Querying database for all invoices (requested by user ID: {}), status: {}", userId, status);
        List<Invoice> invoices = invoiceRepository.findAll();
        for (Invoice inv : invoices) {
            String oldStatus = inv.getStatus();
            checkAndResetOverdueStatus(inv);
            if (!oldStatus.equals(inv.getStatus())) {
                invoiceRepository.save(inv);
            }
        }
        if (status != null && !status.trim().isEmpty()) {
            String upperStatus = status.trim().toUpperCase();
            return invoices.stream()
                    .filter(inv -> upperStatus.equals(inv.getStatus()))
                    .toList();
        }
        return invoices;
    }

    public Optional<Invoice> getInvoiceById(Long id, Long userId) {
        logger.info("[INVOICE SERVICE] getInvoiceById: Querying database for invoice ID: {} (requested by user ID: {})", id, userId);
        Optional<Invoice> opt = invoiceRepository.findById(id);
        if (opt.isPresent()) {
            Invoice inv = opt.get();
            String oldStatus = inv.getStatus();
            checkAndResetOverdueStatus(inv);
            if (!oldStatus.equals(inv.getStatus())) {
                invoiceRepository.save(inv);
            }
        }
        return opt;
    }

    public Invoice createInvoice(Invoice invoice, Long userId) {
        logger.info("[INVOICE SERVICE] createInvoice: Processing invoice creation for user ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.error("[INVOICE SERVICE] createInvoice: User not found with ID: {}", userId);
                    return new IllegalArgumentException("User not found with id: " + userId);
                });
        
        invoice.setUser(user);
        invoice.setCreatedBy(user.getFullName());

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

        checkAndResetOverdueStatus(invoice);

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

        // Authorization check - REMOVED restriction, instead logging non-owner modifications
        if (invoice.getUser() != null && !invoice.getUser().getId().equals(userId)) {
            User modifyingUser = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
            String deltaJson = buildInvoiceDelta(invoice, invoiceDetails);
            String description = String.format("User '%s' modified Invoice '%s' created by '%s'", 
                    modifyingUser.getFullName(), invoice.getInvoiceNumber(), invoice.getCreatedBy());
            activityRepository.save(new Activity(description, deltaJson));
            logger.info("[INVOICE SERVICE] updateInvoice: Logged activity: {} with deltas: {}", description, deltaJson);
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

        checkAndResetOverdueStatus(invoice);

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
        
        // Authorization check - REMOVED restriction, instead logging        // Track deletion by another user
        if (invoice.getUser() != null && !invoice.getUser().getId().equals(userId)) {
            User modifyingUser = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
            String summary = String.format("Invoice %s for Client %s (Total: $%s, Description: %s)", 
                    invoice.getInvoiceNumber(), invoice.getClientName(), invoice.getTotal().toString(), invoice.getDescription());
            String deltaJson = String.format("[{\"field\":\"Deleted Invoice Summary\",\"before\":\"%s\",\"after\":\"None\"}]", 
                    escapeJson(summary));
            String description = String.format("User '%s' deleted Invoice '%s' created by '%s'", 
                    modifyingUser.getFullName(), invoice.getInvoiceNumber(), invoice.getCreatedBy());
            activityRepository.save(new Activity(description, deltaJson));
            logger.info("[INVOICE SERVICE] deleteInvoice: Logged activity: {}", description);
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
        
        // Authorization check - REMOVED restriction, instead logging        // Track status modification by another user
        if (invoice.getUser() != null && !invoice.getUser().getId().equals(userId)) {
            User modifyingUser = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
            String beforeStatus = invoice.getStatus();
            String afterStatus = status.toUpperCase();
            String deltaJson = String.format("[{\"field\":\"Status\",\"before\":\"%s\",\"after\":\"%s\"}]", 
                    beforeStatus, afterStatus);
            String description = String.format("User '%s' changed status of Invoice '%s' (created by '%s') to '%s'", 
                    modifyingUser.getFullName(), invoice.getInvoiceNumber(), invoice.getCreatedBy(), afterStatus);
            activityRepository.save(new Activity(description, deltaJson));
            logger.info("[INVOICE SERVICE] updateStatus: Logged activity: {} with delta: {}", description, deltaJson);
        }

        invoice.setStatus(status.toUpperCase());
        checkAndResetOverdueStatus(invoice);
        logger.info("[INVOICE SERVICE] updateStatus: Saving status updated invoice ID: {} to database", id);
        return invoiceRepository.save(invoice);
    }

    private void checkAndResetOverdueStatus(Invoice invoice) {
        if (invoice == null) return;
        LocalDate today = LocalDate.now();
        String currentStatus = invoice.getStatus();
        
        if ("PAID".equals(currentStatus) || "DRAFT".equals(currentStatus)) {
            return;
        }
        
        if (invoice.getPaymentDue() != null && invoice.getPaymentDue().isBefore(today)) {
            invoice.setStatus("OVERDUE");
        } else if ("OVERDUE".equals(currentStatus)) {
            invoice.setStatus("PENDING");
        }
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

    private String buildInvoiceDelta(Invoice existing, Invoice updated) {
        java.util.List<java.util.Map<String, String>> deltas = new java.util.ArrayList<>();

        compareField(deltas, "Client Name", existing.getClientName(), updated.getClientName());
        compareField(deltas, "Client Email", existing.getClientEmail(), updated.getClientEmail());
        compareField(deltas, "Client Street", existing.getClientStreet(), updated.getClientStreet());
        compareField(deltas, "Client City", existing.getClientCity(), updated.getClientCity());
        compareField(deltas, "Client Postcode", existing.getClientPostCode(), updated.getClientPostCode());
        compareField(deltas, "Client Country", existing.getClientCountry(), updated.getClientCountry());
        
        compareField(deltas, "Sender Street", existing.getSenderStreet(), updated.getSenderStreet());
        compareField(deltas, "Sender City", existing.getSenderCity(), updated.getSenderCity());
        compareField(deltas, "Sender Postcode", existing.getSenderPostCode(), updated.getSenderPostCode());
        compareField(deltas, "Sender Country", existing.getSenderCountry(), updated.getSenderCountry());

        compareField(deltas, "Description", existing.getDescription(), updated.getDescription());
        compareField(deltas, "Invoice Date", existing.getInvoiceDate() == null ? "" : existing.getInvoiceDate().toString(), updated.getInvoiceDate() == null ? "" : updated.getInvoiceDate().toString());
        compareField(deltas, "Payment Due", existing.getPaymentDue() == null ? "" : existing.getPaymentDue().toString(), updated.getPaymentDue() == null ? "" : updated.getPaymentDue().toString());
        compareField(deltas, "Payment Terms", existing.getPaymentTerms() == null ? "" : existing.getPaymentTerms().toString(), updated.getPaymentTerms() == null ? "" : updated.getPaymentTerms().toString());
        compareField(deltas, "Status", existing.getStatus(), updated.getStatus());
        java.math.BigDecimal beforeTotal = existing.getTotal() == null ? java.math.BigDecimal.ZERO : existing.getTotal();
        java.math.BigDecimal afterTotal = updated.getTotal() == null ? java.math.BigDecimal.ZERO : updated.getTotal();
        if (beforeTotal.compareTo(afterTotal) != 0) {
            java.util.Map<String, String> map = new java.util.HashMap<>();
            map.put("field", "Total Amount");
            map.put("before", String.format(java.util.Locale.US, "%.2f", beforeTotal));
            map.put("after", String.format(java.util.Locale.US, "%.2f", afterTotal));
            deltas.add(map);
        }

        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < deltas.size(); i++) {
            java.util.Map<String, String> delta = deltas.get(i);
            json.append(String.format("{\"field\":\"%s\",\"before\":\"%s\",\"after\":\"%s\"}", 
                escapeJson(delta.get("field")), 
                escapeJson(delta.get("before")), 
                escapeJson(delta.get("after"))));
            if (i < deltas.size() - 1) {
                json.append(",");
            }
        }
        json.append("]");
        return json.toString();
    }

    private void compareField(java.util.List<java.util.Map<String, String>> deltas, String fieldName, String before, String after) {
        String b = before == null ? "" : before.trim();
        String a = after == null ? "" : after.trim();
        if (!b.equals(a)) {
            java.util.Map<String, String> map = new java.util.HashMap<>();
            map.put("field", fieldName);
            map.put("before", b);
            map.put("after", a);
            deltas.add(map);
        }
    }

    private String escapeJson(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\t", "\\t");
    }
}
