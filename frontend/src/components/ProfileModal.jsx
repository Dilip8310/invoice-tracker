import React, { useState, useEffect } from 'react';

const UPDATE_PROFILE_URL = '/api/auth/update-profile';

const ProfileModal = ({ active, onClose, currentUser, onUpdateUser, onShowToast }) => {
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset state when opening modal
  useEffect(() => {
    if (active && currentUser) {
      setFullName(currentUser.fullName || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
      setErrors({});
    }
  }, [active, currentUser]);

  if (!active || !currentUser) return null;

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = 'Name is required';
    
    if (showPasswordFields) {
      if (!currentPassword.trim()) errs.currentPassword = 'Current password is required';
      
      if (!newPassword.trim()) {
        errs.newPassword = 'New password is required';
      } else if (newPassword.length < 6) {
        errs.newPassword = 'Password must be at least 6 characters';
      }

      if (newPassword !== confirmPassword) {
        errs.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    const payload = { fullName };
    
    if (showPasswordFields) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    try {
      const response = await fetch(UPDATE_PROFILE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': currentUser.id.toString()
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        onShowToast('Profile updated successfully!');
        onUpdateUser({
          id: data.id,
          fullName: data.fullName,
          email: data.email,
          role: data.role || currentUser.role,
          approved: data.approved !== undefined ? data.approved : currentUser.approved
        });
        onClose();
      } else {
        // Set API errors
        if (data.error && data.error.includes('Incorrect current password')) {
          setErrors({ currentPassword: 'Incorrect current password' });
          onShowToast('Incorrect current password', 'error');
        } else {
          setErrors(data);
          onShowToast('Failed to update profile settings', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      onShowToast('Could not connect to authentication server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => {
      if (e.target.classList.contains('modal-overlay')) onClose();
    }}>
      <div className="card modal-card" style={{ maxWidth: '480px', textAlign: 'left' }}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose} type="button">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="14" y2="14" />
            <line x1="14" y1="1" x2="1" y2="14" />
          </svg>
        </button>

        {/* Profile Details Header */}
        <div className="profile-header" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div className="profile-avatar-large">
            <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.email}`} alt="Avatar" />
          </div>
          <h3>Edit Profile</h3>
          <p>Manage your account settings below</p>
        </div>

        <div className="profile-separator"></div>

        {/* Profile Settings Form */}
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={errors.fullName ? { borderColor: 'var(--color-red)' } : {}}
              placeholder="Your Name"
            />
            {errors.fullName && <span className="input-err-msg">{errors.fullName}</span>}
          </div>

          <div className="form-group">
            <label>Email Address (Cannot be modified)</label>
            <input
              type="email"
              className="form-input"
              value={currentUser.email}
              disabled
              style={{ background: '#F4F5F7', color: 'var(--text-muted)', cursor: 'not-allowed', borderColor: 'rgba(0,0,0,0.06)' }}
            />
          </div>

          {/* Collapsible Password Sections */}
          {!showPasswordFields ? (
            <button 
              type="button" 
              className="btn btn-dark" 
              style={{ width: '100%', marginTop: '8px', border: '1px solid rgba(0,0,0,0.15)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              onClick={() => setShowPasswordFields(true)}
            >
              🔒 Change Password
            </button>
          ) : (
            <div style={{ marginTop: '16px', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Update Password</h4>
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: 'var(--color-purple)', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => {
                    setShowPasswordFields(false);
                    setErrors({});
                  }}
                >
                  Cancel Password Change
                </button>
              </div>

              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={errors.currentPassword ? { borderColor: 'var(--color-red)' } : {}}
                  placeholder="••••••••"
                />
                {errors.currentPassword && <span className="input-err-msg">{errors.currentPassword}</span>}
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={errors.newPassword ? { borderColor: 'var(--color-red)' } : {}}
                  placeholder="••••••••"
                />
                {errors.newPassword && <span className="input-err-msg">{errors.newPassword}</span>}
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={errors.confirmPassword ? { borderColor: 'var(--color-red)' } : {}}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && <span className="input-err-msg">{errors.confirmPassword}</span>}
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '32px' }}>
            <button type="button" className="btn btn-dark" onClick={onClose} disabled={isLoading}>
              Close
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <div className="btn-spinner"></div> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
