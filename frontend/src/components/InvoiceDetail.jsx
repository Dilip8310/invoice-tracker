import React from 'react';

const InvoiceDetail = ({ invoice, onBack, onEdit, onDelete, onMarkAsPaid }) => {
  if (!invoice) return null;

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handle printing
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-detail-view">
      {/* Back Link */}
      <div className="back-link" onClick={onBack}>
        <svg width="7" height="10" viewBox="0 0 7 10" fill="none">
          <path d="M6 9L2 5l4-4" stroke="var(--color-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Go back
      </div>

      {/* Control Action Bar */}
      <div className="card detail-header">
        <div className="detail-header-status">
          <p>Status</p>
          <div className={`status-badge status-${invoice.status.toLowerCase()}`}>
            {invoice.status.toLowerCase()}
          </div>
        </div>
        
        <div className="actions-wrapper">
          <button className="btn btn-dark" onClick={onEdit}>
            Edit
          </button>
          <button className="btn btn-red" onClick={onDelete}>
            Delete
          </button>
          {invoice.status !== 'PAID' && (
            <button className="btn btn-primary" onClick={onMarkAsPaid}>
              Mark as Paid
            </button>
          )}
          <button className="btn btn-dark" onClick={handlePrint} style={{ display: 'inline-flex', gap: '8px' }}>
            {/* Print Icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 5V2h8v3M2 8h12M12 8v6H4V8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="6" r="0.5" fill="currentColor"/>
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* Main Invoice Card Body */}
      <div className="card detail-body">
        {/* Top details row */}
        <div className="detail-top-row">
          <div className="detail-code-desc">
            <h2>
              <span>#</span>
              {invoice.invoiceNumber ? invoice.invoiceNumber.replace('#', '') : ''}
            </h2>
            <p>{invoice.description}</p>
          </div>
          <div className="sender-address">
            <p>{invoice.senderStreet}</p>
            <p>{invoice.senderCity}</p>
            <p>{invoice.senderPostCode}</p>
            <p>{invoice.senderCountry}</p>
          </div>
        </div>

        {/* Mid details columns */}
        <div className="detail-mid-row">
          <div className="detail-info-block">
            <div className="date-block">
              <label>Invoice Date</label>
              <p>{formatDate(invoice.invoiceDate)}</p>
            </div>
            <div className="date-block date-sub">
              <label>Payment Due</label>
              <p>{formatDate(invoice.paymentDue)}</p>
            </div>
          </div>

          <div className="detail-info-block">
            <label>Bill To</label>
            <p>{invoice.clientName}</p>
            <div className="detail-address">
              <p>{invoice.clientStreet}</p>
              <p>{invoice.clientCity}</p>
              <p>{invoice.clientPostCode}</p>
              <p>{invoice.clientCountry}</p>
            </div>
          </div>

          <div className="detail-info-block">
            <label>Sent to</label>
            <p style={{ wordBreak: 'break-all', fontSize: '1.05rem' }}>{invoice.clientEmail}</p>
          </div>
        </div>

        {/* Table of items */}
        <div className="detail-table-card">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th className="text-center">QTY.</th>
                <th className="text-right">Price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && invoice.items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td>{item.name}</td>
                  <td className="text-center" style={{ color: 'var(--text-muted)' }}>{item.quantity}</td>
                  <td className="text-right" style={{ color: 'var(--text-muted)' }}>{formatCurrency(item.price)}</td>
                  <td className="text-right">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table Footer - Grand Total */}
          <div className="detail-table-footer">
            <p>Amount Due</p>
            <span className="detail-grand-total">
              {formatCurrency(invoice.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
