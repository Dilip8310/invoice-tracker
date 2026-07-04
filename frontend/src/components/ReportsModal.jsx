import React, { useState, useEffect } from 'react';

const ReportsModal = ({ active, onClose, invoices }) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Initialize dates: From (start of current month) to To (today)
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setFromDate(formatDate(firstDay));
    setToDate(formatDate(today));
  }, [active]);

  if (!active) return null;

  // Filter invoices in range
  const filtered = invoices.filter((inv) => {
    if (!inv.invoiceDate) return false;
    return inv.invoiceDate >= fromDate && inv.invoiceDate <= toDate;
  });

  // Calculate statistics
  const count = filtered.length;
  const totalAmount = filtered.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const paidAmount = filtered
    .filter((inv) => inv.status === 'PAID')
    .reduce((acc, curr) => acc + (curr.total || 0), 0);
  const outstandingAmount = filtered
    .filter((inv) => inv.status !== 'PAID')
    .reduce((acc, curr) => acc + (curr.total || 0), 0);

  // Formatting helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val);
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay active" onClick={(e) => {
      if (e.target.classList.contains('modal-overlay')) onClose();
    }}>
      <div className="card modal-card report-modal-card">
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose} type="button">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="14" y2="14" />
            <line x1="14" y1="1" x2="1" y2="14" />
          </svg>
        </button>

        {/* Modal Title */}
        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>📈 Invoice Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select date ranges to generate a summary report and save as PDF</p>
        </div>

        {/* Date Selector Inputs */}
        <div className="report-dates-row">
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>From Date</label>
            <input
              type="date"
              className="form-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>To Date</label>
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="profile-separator" style={{ margin: '24px 0' }}></div>

        {/* Wrap printable sections so media print styles isolate it */}
        <div className="printable-report-content">
          {/* Printable Report Header (Visible only in print mode or inside the modal) */}
          <div className="print-report-header">
            <h2>INVOICE SUMMARY REPORT</h2>
            <p className="print-report-period">
              Period: <strong>{formatDateLabel(fromDate)}</strong> to <strong>{formatDateLabel(toDate)}</strong>
            </p>
          </div>

          {/* live Statistics Grid */}
          <div className="report-stats-grid">
            <div className="report-stat-box">
              <span className="report-stat-title">Invoices Found</span>
              <span className="report-stat-value">{count}</span>
            </div>
            <div className="report-stat-box">
              <span className="report-stat-title">Total Invoiced</span>
              <span className="report-stat-value">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="report-stat-box">
              <span className="report-stat-title" style={{ color: 'var(--color-green)' }}>Total Paid</span>
              <span className="report-stat-value" style={{ color: 'var(--color-green)' }}>{formatCurrency(paidAmount)}</span>
            </div>
            <div className="report-stat-box">
              <span className="report-stat-title" style={{ color: 'var(--color-orange)' }}>Outstanding</span>
              <span className="report-stat-value" style={{ color: 'var(--color-orange)' }}>{formatCurrency(outstandingAmount)}</span>
            </div>
          </div>

          {/* live Breakdown Table */}
          <div className="report-table-wrapper">
            {filtered.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                No invoices found in the selected date range.
              </p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Client Name</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id}>
                      <td>{formatDateLabel(inv.invoiceDate)}</td>
                      <td><strong>{inv.invoiceNumber}</strong></td>
                      <td>{inv.clientName}</td>
                      <td>
                        <span className={`report-badge status-${inv.status.toLowerCase()}`}>
                          {inv.status.toLowerCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(inv.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Action Panel Buttons */}
        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button type="button" className="btn btn-dark" onClick={onClose}>
            Close
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handlePrint}
            disabled={filtered.length === 0}
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;
