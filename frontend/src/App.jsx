import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import InvoiceDetail from './components/InvoiceDetail';
import InvoiceForm from './components/InvoiceForm';
import Login from './components/Login';
import ProfileModal from './components/ProfileModal';
import ReportsModal from './components/ReportsModal';

const API_BASE_URL = '/api/invoices';

function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  // Application State
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isFormActive, setIsFormActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  
  // Dashboard filter / search / sort states (managed centrally)
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Toast states
  const [toasts, setToasts] = useState([]);

  // Save/Remove user to localStorage on change
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      fetchInvoices();
    } else {
      localStorage.removeItem('currentUser');
      setInvoices([]);
      setSelectedInvoice(null);
    }
  }, [currentUser]);

  // Toast notifier helper
  const addToast = (message, type = 'success') => {
    const id = Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // 1. Fetch Invoices from Spring Boot (scoped by User-Id)
  const fetchInvoices = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE_URL, {
        headers: {
          'User-Id': currentUser.id.toString()
        }
      });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      } else {
        addToast('Failed to retrieve invoices from server', 'error');
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      addToast('Cannot connect to backend server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Create Invoice API call (scoped by User-Id)
  const handleCreateInvoice = async (invoicePayload) => {
    if (!currentUser) return;
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Id': currentUser.id.toString()
        },
        body: JSON.stringify(invoicePayload)
      });

      if (response.ok) {
        const createdInvoice = await response.json();
        setInvoices((prev) => [createdInvoice, ...prev]);
        addToast(`Invoice ${createdInvoice.invoiceNumber} created successfully!`);
        setIsFormActive(false);
      } else {
        addToast('Failed to create invoice', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error while creating invoice', 'error');
    }
  };

  // 3. Update Invoice API call (scoped by User-Id)
  const handleUpdateInvoice = async (invoicePayload) => {
    if (!currentUser) return;
    try {
      const response = await fetch(`${API_BASE_URL}/${invoicePayload.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'User-Id': currentUser.id.toString()
        },
        body: JSON.stringify(invoicePayload)
      });

      if (response.ok) {
        const updatedInvoice = await response.json();
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv))
        );
        if (selectedInvoice && selectedInvoice.id === updatedInvoice.id) {
          setSelectedInvoice(updatedInvoice);
        }
        addToast(`Invoice ${updatedInvoice.invoiceNumber} updated successfully!`);
        setIsFormActive(false);
        setIsEditing(false);
      } else {
        addToast('Failed to update invoice', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error while updating invoice', 'error');
    }
  };

  // 4. Delete Invoice API call (scoped by User-Id)
  const handleDeleteInvoice = async (id) => {
    if (!currentUser) return;
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'User-Id': currentUser.id.toString()
        }
      });

      if (response.status === 204 || response.ok) {
        const deletedNumber = selectedInvoice?.invoiceNumber || `#${id}`;
        setInvoices((prev) => prev.filter((inv) => inv.id !== id));
        setSelectedInvoice(null);
        addToast(`Invoice ${deletedNumber} deleted successfully!`);
      } else {
        addToast('Failed to delete invoice', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error while deleting invoice', 'error');
    }
  };

  // 5. Mark as Paid API call (scoped by User-Id)
  const handleMarkAsPaid = async (id) => {
    if (!currentUser) return;
    try {
      const response = await fetch(`${API_BASE_URL}/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'User-Id': currentUser.id.toString()
        },
        body: JSON.stringify({ status: 'PAID' })
      });

      if (response.ok) {
        const updatedInvoice = await response.json();
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv))
        );
        setSelectedInvoice(updatedInvoice);
        addToast(`Invoice ${updatedInvoice.invoiceNumber} marked as PAID!`);
      } else {
        addToast('Failed to update invoice status', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error while updating status', 'error');
    }
  };

  // Handler for form submit button
  const handleFormSubmit = (payload) => {
    if (isEditing) {
      handleUpdateInvoice(payload);
    } else {
      handleCreateInvoice(payload);
    }
  };

  // Render Login view if unauthenticated
  if (!currentUser) {
    return (
      <>
        <Login 
          onSuccess={(userData) => setCurrentUser(userData)} 
          onShowToast={addToast} 
        />
        {/* Toast Notification Container */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className="toast" style={t.type === 'error' ? { borderLeftColor: 'var(--color-red)' } : {}}>
              {t.type === 'error' ? (
                <svg width="20" height="20" fill="none" stroke="var(--color-red)" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="var(--color-green)" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Render Authenticated Dashboard
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container" onClick={() => setSelectedInvoice(null)}>
          <span className="logo-icon">I</span>
        </div>
        <div className="sidebar-bottom">
          <div className="theme-toggle-btn">
            {/* Sun Icon */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 2.243a1 1 0 01.086 1.33l-.086.095-1 1a1 1 0 01-1.503-1.314l.086-.096 1-1a1 1 0 011.417-.015zm-8 0a1 1 0 011.417.015l1 1a1 1 0 01-1.33 1.503l-.096-.086-1-1a1 1 0 011.01-1.432zM4 9a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm10 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM9 14a1 1 0 011-1h1a1 1 0 110 2H10a1 1 0 01-1-1zm-4.243.757a1 1 0 011.33.086l.095-.086 1-1a1 1 0 01-1.314-1.503l-.096.086-1 1a1 1 0 01.015 1.417zm8 0a1 1 0 01.015-1.417l-1-1a1 1 0 01-1.503 1.314l.086.096 1 1a1 1 0 011.417-.015zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </div>
          {/* Logout Button */}
          <div className="logout-btn-container" title="Logout">
            <button className="logout-icon-btn" onClick={() => {
              if (window.confirm("Are you sure you want to log out?")) {
                setCurrentUser(null);
              }
            }}>
              {/* Logout Icon */}
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013-3h3" />
              </svg>
            </button>
          </div>
          {/* User Profile avatar (clickable settings modal trigger) */}
          <div 
            className="user-avatar" 
            onClick={() => setIsProfileOpen(true)} 
            style={{ cursor: 'pointer' }} 
            title="View Profile Settings"
          >
            <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.email}`} alt="User Profile" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {selectedInvoice ? (
          <InvoiceDetail
            invoice={selectedInvoice}
            onBack={() => {
              setSelectedInvoice(null);
              fetchInvoices();
            }}
            onEdit={() => {
              setIsEditing(true);
              setIsFormActive(true);
            }}
            onDelete={() => handleDeleteInvoice(selectedInvoice.id)}
            onMarkAsPaid={() => handleMarkAsPaid(selectedInvoice.id)}
          />
        ) : (
          <Dashboard
            invoices={invoices}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
            onNewInvoiceClick={() => {
              setIsEditing(false);
              setIsFormActive(true);
            }}
            onGenerateReportClick={() => setIsReportsOpen(true)}
            filter={filter}
            setFilter={setFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Slide-out Invoice Drawer Form */}
      <InvoiceForm
        active={isFormActive}
        invoice={isEditing ? selectedInvoice : null}
        onClose={() => {
          setIsFormActive(false);
          setIsEditing(false);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* User Profile Settings Modal */}
      <ProfileModal
        active={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(userData) => setCurrentUser(userData)}
        onShowToast={addToast}
      />

      {/* Reports Modal Overlay */}
      <ReportsModal
        active={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        invoices={invoices}
      />

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast" style={t.type === 'error' ? { borderLeftColor: 'var(--color-red)' } : {}}>
            {t.type === 'error' ? (
              <svg width="20" height="20" fill="none" stroke="var(--color-red)" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="var(--color-green)" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
