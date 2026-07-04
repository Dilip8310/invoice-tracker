package com.example.invoice.controller;

import com.example.invoice.model.Invoice;
import com.example.invoice.service.InvoiceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private static final Logger logger = LoggerFactory.getLogger(InvoiceController.class);
    private final InvoiceService invoiceService;

    @Autowired
    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping
    public ResponseEntity<List<Invoice>> getAllInvoices(
            @RequestParam(required = false) String status,
            @RequestHeader("User-Id") Long userId) {
        logger.info("[INVOICE CONTROLLER] getAllInvoices: Fetching all invoices for user ID: {}, filter status: {}", userId, status);
        List<Invoice> invoices = invoiceService.getAllInvoices(userId, status);
        logger.info("[INVOICE CONTROLLER] getAllInvoices: Found {} invoices for user ID: {}", invoices.size(), userId);
        return ResponseEntity.ok(invoices);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getInvoiceById(
            @PathVariable Long id,
            @RequestHeader("User-Id") Long userId) {
        logger.info("[INVOICE CONTROLLER] getInvoiceById: Fetching invoice ID: {} for user ID: {}", id, userId);
        return invoiceService.getInvoiceById(id, userId)
                .map(invoice -> {
                    logger.info("[INVOICE CONTROLLER] getInvoiceById: Successfully found invoice ID: {} for user ID: {}", id, userId);
                    return ResponseEntity.ok(invoice);
                })
                .orElseGet(() -> {
                    logger.warn("[INVOICE CONTROLLER] getInvoiceById: Invoice ID: {} not found or unauthorized for user ID: {}", id, userId);
                    return ResponseEntity.notFound().build();
                });
    }

    @PostMapping
    public ResponseEntity<Invoice> createInvoice(
            @RequestBody Invoice invoice,
            @RequestHeader("User-Id") Long userId) {
        logger.info("[INVOICE CONTROLLER] createInvoice: Creating new invoice for user ID: {}, clientName: {}", userId, invoice.getClientName());
        try {
            Invoice created = invoiceService.createInvoice(invoice, userId);
            logger.info("[INVOICE CONTROLLER] createInvoice: Successfully created invoice ID: {} for user ID: {}", created.getId(), userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception e) {
            logger.error("[INVOICE CONTROLLER] createInvoice: Failed to create invoice for user ID: {}. Error: {}", userId, e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Invoice> updateInvoice(
            @PathVariable Long id,
            @RequestBody Invoice invoiceDetails,
            @RequestHeader("User-Id") Long userId) {
        logger.info("[INVOICE CONTROLLER] updateInvoice: Updating invoice ID: {} for user ID: {}, clientName: {}", id, userId, invoiceDetails.getClientName());
        try {
            Invoice updated = invoiceService.updateInvoice(id, invoiceDetails, userId);
            logger.info("[INVOICE CONTROLLER] updateInvoice: Successfully updated invoice ID: {} for user ID: {}", id, userId);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            logger.warn("[INVOICE CONTROLLER] updateInvoice: Unauthorized attempt or invalid request for invoice ID: {} by user ID: {}. Error: {}", id, userId, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            logger.error("[INVOICE CONTROLLER] updateInvoice: Failed to update invoice ID: {} for user ID: {}. Error: {}", id, userId, e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(
            @PathVariable Long id,
            @RequestHeader("User-Id") Long userId) {
        logger.info("[INVOICE CONTROLLER] deleteInvoice: Deleting invoice ID: {} for user ID: {}", id, userId);
        try {
            invoiceService.deleteInvoice(id, userId);
            logger.info("[INVOICE CONTROLLER] deleteInvoice: Successfully deleted invoice ID: {} for user ID: {}", id, userId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            logger.warn("[INVOICE CONTROLLER] deleteInvoice: Unauthorized or invalid delete request for invoice ID: {} by user ID: {}. Error: {}", id, userId, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            logger.error("[INVOICE CONTROLLER] deleteInvoice: Failed to delete invoice ID: {} for user ID: {}. Error: {}", id, userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Invoice> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @RequestHeader("User-Id") Long userId) {
        String status = body.get("status");
        logger.info("[INVOICE CONTROLLER] updateStatus: Updating status of invoice ID: {} to '{}' for user ID: {}", id, status, userId);
        if (status == null || status.trim().isEmpty()) {
            logger.warn("[INVOICE CONTROLLER] updateStatus: Missing status parameter for invoice ID: {}", id);
            return ResponseEntity.badRequest().build();
        }
        try {
            Invoice updated = invoiceService.updateStatus(id, status, userId);
            logger.info("[INVOICE CONTROLLER] updateStatus: Successfully updated status of invoice ID: {} to '{}'", id, status);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            logger.warn("[INVOICE CONTROLLER] updateStatus: Unauthorized or invalid status change for invoice ID: {} by user ID: {}. Error: {}", id, userId, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            logger.error("[INVOICE CONTROLLER] updateStatus: Failed to update status for invoice ID: {} for user ID: {}. Error: {}", id, userId, e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
}
