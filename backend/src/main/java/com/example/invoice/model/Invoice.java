package com.example.invoice.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", unique = true, nullable = false)
    private String invoiceNumber;

    @Column(name = "client_name", nullable = false)
    private String clientName;

    @Column(name = "client_email", nullable = false)
    private String clientEmail;

    @Column(name = "client_street")
    private String clientStreet;

    @Column(name = "client_city")
    private String clientCity;

    @Column(name = "client_post_code")
    private String clientPostCode;

    @Column(name = "client_country")
    private String clientCountry;

    @Column(name = "sender_street")
    private String senderStreet;

    @Column(name = "sender_city")
    private String senderCity;

    @Column(name = "sender_post_code")
    private String senderPostCode;

    @Column(name = "sender_country")
    private String senderCountry;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(name = "payment_due", nullable = false)
    private LocalDate paymentDue;

    @Column(name = "payment_terms", nullable = false)
    private Integer paymentTerms; // Number of days (e.g., 1, 7, 14, 30)

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String status; // 'PAID', 'PENDING', 'DRAFT'

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<InvoiceItem> items = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    @Column(name = "created_by")
    private String createdBy;

    // Constructors
    public Invoice() {
        this.total = BigDecimal.ZERO;
    }

    // Helper methods to calculate totals
    public void calculateTotal() {
        BigDecimal sum = BigDecimal.ZERO;
        if (items != null) {
            for (InvoiceItem item : items) {
                item.calculateTotal();
                sum = sum.add(item.getTotal());
            }
        }
        this.total = sum;
    }

    public void addItem(InvoiceItem item) {
        items.add(item);
        item.setInvoice(this);
        calculateTotal();
    }

    public void removeItem(InvoiceItem item) {
        items.remove(item);
        item.setInvoice(null);
        calculateTotal();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public String getClientEmail() {
        return clientEmail;
    }

    public void setClientEmail(String clientEmail) {
        this.clientEmail = clientEmail;
    }

    public String getClientStreet() {
        return clientStreet;
    }

    public void setClientStreet(String clientStreet) {
        this.clientStreet = clientStreet;
    }

    public String getClientCity() {
        return clientCity;
    }

    public void setClientCity(String clientCity) {
        this.clientCity = clientCity;
    }

    public String getClientPostCode() {
        return clientPostCode;
    }

    public void setClientPostCode(String clientPostCode) {
        this.clientPostCode = clientPostCode;
    }

    public String getClientCountry() {
        return clientCountry;
    }

    public void setClientCountry(String clientCountry) {
        this.clientCountry = clientCountry;
    }

    public String getSenderStreet() {
        return senderStreet;
    }

    public void setSenderStreet(String senderStreet) {
        this.senderStreet = senderStreet;
    }

    public String getSenderCity() {
        return senderCity;
    }

    public void setSenderCity(String senderCity) {
        this.senderCity = senderCity;
    }

    public String getSenderPostCode() {
        return senderPostCode;
    }

    public void setSenderPostCode(String senderPostCode) {
        this.senderPostCode = senderPostCode;
    }

    public String getSenderCountry() {
        return senderCountry;
    }

    public void setSenderCountry(String senderCountry) {
        this.senderCountry = senderCountry;
    }

    public LocalDate getInvoiceDate() {
        return invoiceDate;
    }

    public void setInvoiceDate(LocalDate invoiceDate) {
        this.invoiceDate = invoiceDate;
    }

    public LocalDate getPaymentDue() {
        return paymentDue;
    }

    public void setPaymentDue(LocalDate paymentDue) {
        this.paymentDue = paymentDue;
    }

    public Integer getPaymentTerms() {
        return paymentTerms;
    }

    public void setPaymentTerms(Integer paymentTerms) {
        this.paymentTerms = paymentTerms;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public List<InvoiceItem> getItems() {
        return items;
    }

    public void setItems(List<InvoiceItem> items) {
        this.items = items;
        if (items != null) {
            for (InvoiceItem item : items) {
                item.setInvoice(this);
            }
        }
        calculateTotal();
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getCreatedBy() {
        return createdBy != null ? createdBy : "Unknown";
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}
