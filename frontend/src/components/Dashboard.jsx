import React from 'react';

const Dashboard = ({
  invoices,
  onSelectInvoice,
  onNewInvoiceClick,
  onGenerateReportClick,
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  isLoading
}) => {

  // Statistics calculation (based on all raw invoices)
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
  const pendingInvoices = invoices.filter(inv => inv.status === 'PENDING');
  const overdueInvoices = invoices.filter(inv => inv.status === 'OVERDUE');
  const draftInvoices = invoices.filter(inv => inv.status === 'DRAFT');

  const totalAmount = invoices.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const paidAmount = paidInvoices.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const pendingAmount = pendingInvoices.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const overdueAmount = overdueInvoices.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const draftAmount = draftInvoices.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const outstandingAmount = pendingAmount + draftAmount;

  // Ratio calculations
  const paidRatio = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  const outstandingRatio = totalAmount > 0 ? (outstandingAmount / totalAmount) * 100 : 0;
  const overdueRatio = totalAmount > 0 ? (overdueAmount / totalAmount) * 100 : 0;

  // Formatting currency
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

  // Local filtering and sorting logic
  const filteredInvoices = invoices.filter(inv => {
    // 1. Filter by Status select
    if (filter !== 'all' && inv.status.toLowerCase() !== filter.toLowerCase()) {
      return false;
    }
    // 2. Search query check (invoice number or client name)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const codeMatch = inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(query);
      const nameMatch = inv.clientName && inv.clientName.toLowerCase().includes(query);
      const descMatch = inv.description && inv.description.toLowerCase().includes(query);
      return codeMatch || nameMatch || descMatch;
    }
    return true;
  });

  // Apply sorting
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.invoiceDate) - new Date(a.invoiceDate);
    }
    if (sortBy === 'oldest') {
      return new Date(a.invoiceDate) - new Date(b.invoiceDate);
    }
    if (sortBy === 'due-date') {
      return new Date(a.paymentDue) - new Date(b.paymentDue);
    }
    if (sortBy === 'amount-desc') {
      return b.total - a.total;
    }
    if (sortBy === 'amount-asc') {
      return a.total - b.total;
    }
    if (sortBy === 'client-name') {
      return a.clientName.localeCompare(b.clientName);
    }
    return 0;
  });

  return (
    <div className="dashboard-view">
      {/* Analytics Stats Grid */}
      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-title">Total Invoiced</span>
          <span className="stat-value">{formatCurrency(totalAmount)}</span>
          <span className="stat-sub">{totalInvoices} Invoices total</span>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: '100%', background: 'var(--color-purple)' }}></div>
          </div>
        </div>
        
        <div className="card stat-card">
          <span className="stat-title">Total Paid</span>
          <span className="stat-value" style={{ color: 'var(--color-green)' }}>{formatCurrency(paidAmount)}</span>
          <span className="stat-sub">{paidInvoices.length} paid invoices</span>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${paidRatio}%`, background: 'var(--color-green)' }}></div>
          </div>
        </div>

        <div className="card stat-card">
          <span className="stat-title">Total Outstanding</span>
          <span className="stat-value" style={{ color: 'var(--color-orange)' }}>{formatCurrency(outstandingAmount)}</span>
          <span className="stat-sub">{pendingInvoices.length + draftInvoices.length} outstanding</span>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${outstandingRatio}%`, background: 'var(--color-orange)' }}></div>
          </div>
        </div>

        <div className="card stat-card">
          <span className="stat-title">Total Overdue</span>
          <span className="stat-value" style={{ color: 'var(--color-red)' }}>{formatCurrency(overdueAmount)}</span>
          <span className="stat-sub">{overdueInvoices.length} overdue invoices</span>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${overdueRatio}%`, background: 'var(--color-red)' }}></div>
          </div>
        </div>

        <div className="card stat-card">
          <span className="stat-title">Receipt Status</span>
          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Paid:</span> <strong>{paidInvoices.length}</strong>
            </span>
            <span style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Pending:</span> <strong>{pendingInvoices.length}</strong>
            </span>
            <span style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Overdue:</span> <strong style={{ color: 'var(--color-red)' }}>{overdueInvoices.length}</strong>
            </span>
            <span style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Draft:</span> <strong>{draftInvoices.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Header Panel */}
      <div className="dashboard-header">
        <div className="title-section">
          <h1>Invoices</h1>
          <p>
            {totalInvoices === 0
              ? 'No invoices'
              : `There are ${sortedInvoices.length} matching invoices`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-white" onClick={onGenerateReportClick} style={{ display: 'inline-flex', alignItems: 'center' }}>
            📊 Generate Report
          </button>
          <button className="btn btn-primary" onClick={onNewInvoiceClick}>
            <span className="btn-icon">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M6.313 10.023v-3.71h3.71v-1.6h-3.71v-3.71h-1.6v3.71h-3.71v1.6h3.71v3.71h1.6z" fill="currentColor"/>
              </svg>
            </span>
            New Invoice
          </button>
        </div>
      </div>

      {/* Search, Filter, and Sort Controls */}
      <div className="controls-panel">
        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search by invoice # or client name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 14L10.5 10.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>

        <select
          className="filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Filter by status: All</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="draft">Draft</option>
        </select>

        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Sort: Newest First</option>
          <option value="oldest">Sort: Oldest First</option>
          <option value="due-date">Sort: Due Date</option>
          <option value="amount-desc">Sort: Amount (High to Low)</option>
          <option value="amount-asc">Sort: Amount (Low to High)</option>
          <option value="client-name">Sort: Client Name</option>
        </select>
      </div>

      {/* Invoice List */}
      {isLoading ? (
        <div className="spinner"></div>
      ) : sortedInvoices.length === 0 ? (
        <div className="card empty-state">
          {/* Detailed Glassmorphic Empty State SVG Illustration */}
          <svg className="empty-img" width="242" height="200" viewBox="0 0 242 200" fill="none">
            <circle cx="121" cy="90" r="70" fill="rgba(124, 93, 250, 0.05)" />
            <rect x="91" y="50" width="60" height="80" rx="6" fill="rgba(30, 33, 57, 0.8)" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="2"/>
            <line x1="101" y1="70" x2="141" y2="70" stroke="var(--color-purple)" strokeWidth="3" strokeLinecap="round"/>
            <line x1="101" y1="85" x2="131" y2="85" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="101" y1="100" x2="135" y2="100" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="121" cy="140" r="15" fill="rgba(51, 214, 159, 0.15)"/>
            <path d="M117 140L120 143L126 137" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h2>There is nothing here</h2>
          <p>
            Create an invoice by clicking the <strong>New Invoice</strong> button and start tracking your business!
          </p>
        </div>
      ) : (
        <div className="invoice-list">
          {sortedInvoices.map((inv) => (
            <div
              key={inv.id}
              className="card invoice-item"
              onClick={() => onSelectInvoice(inv)}
            >
              <div className="invoice-code">
                <span>#</span>
                {inv.invoiceNumber ? inv.invoiceNumber.replace('#', '') : ''}
              </div>
              <div className="invoice-due">
                Due {formatDate(inv.paymentDue)}
              </div>
              <div className="invoice-client">
                {inv.clientName}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                  By {inv.createdBy || 'System'}
                </div>
              </div>
              <div className="invoice-amount">
                {formatCurrency(inv.total)}
              </div>
              <div className={`status-badge status-${inv.status.toLowerCase()}`}>
                {inv.status.toLowerCase()}
              </div>
              <div className="arrow-icon">
                <svg width="7" height="10" viewBox="0 0 7 10" fill="none">
                  <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
