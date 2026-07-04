import React, { useState, useEffect } from 'react';

const ADMIN_API_URL = '/api/auth/admin/users';
const ACTIVITIES_API_URL = '/api/auth/admin/activities';

const AdminDashboard = ({ currentUser, onShowToast }) => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'activities'
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // User tab search/filter state
  const [userFilter, setUserFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  
  // Activities tab search state
  const [activitySearch, setActivitySearch] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchActivities();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(ADMIN_API_URL, {
        headers: {
          'User-Id': currentUser.id.toString()
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        onShowToast('Failed to load user registrations from server', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Cannot connect to server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(ACTIVITIES_API_URL, {
        headers: {
          'User-Id': currentUser.id.toString()
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        onShowToast('Failed to load activity logs from server', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Cannot connect to server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id, name) => {
    try {
      const response = await fetch(`${ADMIN_API_URL}/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'User-Id': currentUser.id.toString()
        }
      });
      if (response.ok) {
        onShowToast(`Approved registration for ${name}!`);
        setUsers(prev => prev.map(u => u.id === id ? { ...u, approved: true } : u));
      } else {
        onShowToast('Failed to approve user', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Network error during user approval', 'error');
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Are you sure you want to reject and delete the registration for ${name}? This action cannot be undone.`)) {
      return;
    }
    try {
      const response = await fetch(`${ADMIN_API_URL}/${id}/reject`, {
        method: 'DELETE',
        headers: {
          'User-Id': currentUser.id.toString()
        }
      });
      if (response.ok) {
        onShowToast(`Rejected and deleted registration for ${name}.`);
        setUsers(prev => prev.filter(u => u.id !== id));
      } else {
        onShowToast('Failed to reject user', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Network error during user rejection', 'error');
    }
  };

  // User tab stats calculations
  const totalUsers = users.length;
  const pendingUsers = users.filter(u => !u.approved).length;
  const approvedUsers = users.filter(u => u.approved).length;

  // Filter & Search users
  const filteredUsers = users.filter(u => {
    if (userFilter === 'pending' && u.approved) return false;
    if (userFilter === 'approved' && !u.approved) return false;

    if (userSearch.trim() !== '') {
      const query = userSearch.toLowerCase();
      const nameMatch = u.fullName && u.fullName.toLowerCase().includes(query);
      const emailMatch = u.email && u.email.toLowerCase().includes(query);
      return nameMatch || emailMatch;
    }
    return true;
  });

  // Search activities
  const filteredActivities = activities.filter(act => {
    if (activitySearch.trim() !== '') {
      return act.description.toLowerCase().includes(activitySearch.toLowerCase());
    }
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dashboard-view">
      {/* Top Header */}
      <div className="dashboard-header" style={{ marginBottom: '24px' }}>
        <div className="title-section">
          <h1>Super Admin Dashboard</h1>
          <p>Verify registration requests and monitor invoice activity audit logs</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'users' ? 'var(--color-purple)' : 'var(--text-light)',
            fontWeight: activeTab === 'users' ? '700' : '500',
            fontSize: '1.1rem',
            cursor: 'pointer',
            padding: '8px 12px',
            borderBottom: activeTab === 'users' ? '3px solid var(--color-purple)' : 'none',
            marginBottom: '-11px'
          }}
        >
          User Approvals
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('activities')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'activities' ? 'var(--color-purple)' : 'var(--text-light)',
            fontWeight: activeTab === 'activities' ? '700' : '500',
            fontSize: '1.1rem',
            cursor: 'pointer',
            padding: '8px 12px',
            borderBottom: activeTab === 'activities' ? '3px solid var(--color-purple)' : 'none',
            marginBottom: '-11px'
          }}
        >
          Invoice Activity Logs
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Admin Stats Grid */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="card stat-card">
              <span className="stat-title">Total Registered</span>
              <span className="stat-value">{totalUsers}</span>
              <span className="stat-sub">Accounts created</span>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: '100%', background: 'var(--color-purple)' }}></div>
              </div>
            </div>

            <div className="card stat-card">
              <span className="stat-title">Pending Approval</span>
              <span className="stat-value" style={{ color: 'var(--color-orange)' }}>{pendingUsers}</span>
              <span className="stat-sub">Awaiting confirmation</span>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${totalUsers > 0 ? (pendingUsers / totalUsers) * 100 : 0}%`, background: 'var(--color-orange)' }}></div>
              </div>
            </div>

            <div className="card stat-card">
              <span className="stat-title">Approved Users</span>
              <span className="stat-value" style={{ color: 'var(--color-green)' }}>{approvedUsers}</span>
              <span className="stat-sub">Access granted</span>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${totalUsers > 0 ? (approvedUsers / totalUsers) * 100 : 0}%`, background: 'var(--color-green)' }}></div>
              </div>
            </div>
          </div>

          {/* Filter / Search controls */}
          <div className="controls-panel">
            <div className="search-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
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
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="all">Filter by status: All</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          {/* User list */}
          {isLoading ? (
            <div className="spinner"></div>
          ) : filteredUsers.length === 0 ? (
            <div className="card empty-state">
              <h2>No matching users</h2>
              <p>Adjust your search criteria or wait for new user registrations to arrive.</p>
            </div>
          ) : (
            <div className="invoice-list">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="card invoice-item"
                  style={{
                    gridTemplateColumns: '1.2fr 1.5fr 1fr 1.5fr',
                    cursor: 'default',
                    borderLeftColor: user.approved ? 'var(--color-green)' : 'var(--color-orange)'
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {user.fullName}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                    {user.email}
                  </div>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    Registered {formatDate(user.createdAt)}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span className={`status-badge ${user.approved ? 'status-paid' : 'status-pending'}`}>
                      {user.approved ? 'Approved' : 'Pending'}
                    </span>
                    {!user.approved ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        onClick={() => handleApprove(user.id, user.fullName)}
                      >
                        Approve
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-red"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={() => handleReject(user.id, user.fullName)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Search controls for activities */}
          <div className="controls-panel">
            <div className="search-wrapper" style={{ width: '100%' }}>
              <input
                type="text"
                className="search-input"
                placeholder="Search audit logs by activity details or username..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
              />
              <span className="search-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 14L10.5 10.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </div>

          {/* Activity Timeline List */}
          {isLoading ? (
            <div className="spinner"></div>
          ) : filteredActivities.length === 0 ? (
            <div className="card empty-state">
              <h2>No activity logs found</h2>
              <p>When users modify or delete invoices created by other users, the activities will appear here.</p>
            </div>
          ) : (
            <div className="invoice-list">
              {filteredActivities.map(act => (
                <div
                  key={act.id}
                  className="card invoice-item"
                  style={{
                    gridTemplateColumns: '2fr 1.2fr 0.8fr',
                    cursor: 'default',
                    borderLeftColor: 'var(--color-purple)'
                  }}
                >
                  <div style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.95rem' }}>
                    {act.description}
                  </div>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    {formatDate(act.timestamp)} at {formatTime(act.timestamp)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {act.details ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => setSelectedActivity(act)}
                      >
                        View Modifications
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {selectedActivity && (
        <div 
          onClick={() => setSelectedActivity(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'default'
          }}
        >
          <div 
            className="card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '650px', 
              width: '90%', 
              padding: '32px',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              background: 'var(--bg-secondary)',
              border: 'var(--glass-border)',
              borderRadius: 'var(--border-radius-lg)',
              animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.4rem', fontWeight: 700 }}>Invoice Modifications</h2>
              <button 
                type="button"
                onClick={() => setSelectedActivity(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-light)', 
                  fontSize: '1.8rem', 
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>
            
            <p style={{ color: 'var(--text-light)', marginBottom: '20px', fontSize: '0.9rem', lineHeight: '1.4' }}>
              {selectedActivity.description}
            </p>

            <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '24px', border: 'var(--glass-border)', borderRadius: 'var(--border-radius-md)', padding: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 8px', color: 'var(--text-light)', fontWeight: 600 }}>Field</th>
                    <th style={{ padding: '10px 8px', color: 'var(--text-light)', fontWeight: 600 }}>Before Modification</th>
                    <th style={{ padding: '10px 8px', color: 'var(--text-light)', fontWeight: 600 }}>After Modification</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    try {
                      const changes = JSON.parse(selectedActivity.details || '[]');
                      if (changes.length === 0) {
                        return (
                          <tr>
                            <td colSpan="3" style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-light)' }}>
                              No field deltas recorded.
                            </td>
                          </tr>
                        );
                      }
                      return changes.map((ch, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>{ch.field}</td>
                          <td style={{ padding: '10px 8px', color: '#ff8a8a', wordBreak: 'break-all' }}>{ch.before || <em style={{ opacity: 0.5 }}>empty</em>}</td>
                          <td style={{ padding: '10px 8px', color: '#7cfc00', wordBreak: 'break-all' }}>{ch.after || <em style={{ opacity: 0.5 }}>empty</em>}</td>
                        </tr>
                      ));
                    } catch (e) {
                      return (
                        <tr>
                          <td colSpan="3" style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--color-red)' }}>
                            Error loading delta: Invalid format.
                          </td>
                        </tr>
                      );
                    }
                  })()}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelectedActivity(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
