import React, { useState } from 'react';

const AUTH_URL = '/api/auth';

const Login = ({ onSuccess, onShowToast }) => {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [isOtpMode, setIsOtpMode] = useState(false);
  
  // Forgot Password States
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP + New Password
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [infoMessage, setInfoMessage] = useState('');

  const validate = () => {
    const errs = {};

    if (isForgotPasswordMode) {
      if (forgotPasswordStep === 1) {
        if (!email.trim()) {
          errs.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
          errs.email = 'Email is invalid';
        }
      } else {
        if (!resetOtp.trim()) {
          errs.resetOtp = 'OTP code is required';
        } else if (resetOtp.trim().length !== 6) {
          errs.resetOtp = 'OTP code must be 6 digits';
        }
        if (!newPassword.trim()) {
          errs.newPassword = 'New password is required';
        } else if (newPassword.length < 6) {
          errs.newPassword = 'Password must be at least 6 characters';
        }
        if (newPassword !== confirmNewPassword) {
          errs.confirmNewPassword = 'Passwords do not match';
        }
      }
      setErrors(errs);
      return Object.keys(errs).length === 0;
    }

    if (isOtpMode) {
      if (!otp.trim()) {
        errs.otp = 'Verification OTP code is required';
      } else if (otp.trim().length !== 6) {
        errs.otp = 'OTP code must be 6 digits';
      }
      setErrors(errs);
      return Object.keys(errs).length === 0;
    }

    if (!isLoginTab && !fullName.trim()) errs.fullName = 'Name is required';
    
    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Email is invalid';
    }

    if (!password.trim()) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    if (!isLoginTab && password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRequestOtp = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_URL}/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`[DEVELOPER OTP DEBUG] Generated OTP Code for ${email}: ${data.otp}`);
        onShowToast('OTP code printed to browser console log!');
        setIsOtpMode(true);
        setErrors({});
      } else {
        setErrors({ email: data.email || 'Failed to request OTP registration' });
        onShowToast(data.email || 'Email already exists', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Could not connect to authentication server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_URL}/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.approved === false) {
          onShowToast('Registration submitted for approval! Once approved, you can log in.', 'success');
          setInfoMessage('Account sent for verification! Once approved by a Super Admin, you can log in.');
          setIsOtpMode(false);
          setIsLoginTab(true);
          setFullName('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setOtp('');
        } else {
          onShowToast('Account verified and registered successfully!');
          onSuccess(data); // Logs user in directly
        }
      } else {
        setErrors({ otp: data.otp || 'Verification failed' });
        onShowToast(data.otp || 'Incorrect verification OTP code', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Could not connect to authentication server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestResetOtp = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_URL}/forgot-password/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`[DEVELOPER OTP DEBUG] Generated Password Reset OTP Code for ${email}: ${data.otp}`);
        onShowToast('Reset OTP code printed to browser console log!');
        setForgotPasswordStep(2);
        setErrors({});
      } else {
        setErrors({ email: data.email || 'Failed to request reset OTP' });
        onShowToast(data.email || 'No account found with this email', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Could not connect to authentication server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_URL}/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: resetOtp, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        onShowToast('Password reset successful! You can now log in.');
        setIsForgotPasswordMode(false);
        setForgotPasswordStep(1);
        setIsLoginTab(true);
        setPassword('');
        setErrors({});
      } else {
        setErrors({ resetOtp: data.otp || 'Failed to reset password' });
        onShowToast(data.otp || 'Incorrect or expired reset OTP code', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Could not connect to authentication server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        onShowToast('Logged in successfully!');
        onSuccess(data);
      } else {
        setErrors({ global: data.error || 'Authentication failed' });
        onShowToast(data.error || 'Invalid credentials', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Could not connect to authentication server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (isForgotPasswordMode) {
      if (forgotPasswordStep === 1) {
        handleRequestResetOtp();
      } else {
        handleResetPassword();
      }
    } else if (isOtpMode) {
      handleVerifyOtp();
    } else if (isLoginTab) {
      handleLogin();
    } else {
      handleRequestOtp();
    }
  };

  return (
    <div className="login-wrapper">
      <div className="card login-card">
        <div className="logo-badge">I</div>
        
        {/* Title */}
        <h2 className="login-title">
          {isForgotPasswordMode 
            ? 'Reset Password'
            : (isOtpMode ? 'Enter OTP' : 'Invoice Tracker')}
        </h2>
        <p className="login-subtitle">
          {isForgotPasswordMode
            ? (forgotPasswordStep === 1 ? 'Enter your email to receive a password reset code' : `We sent a reset OTP code to ${email}`)
            : (isOtpMode ? `We sent a 6-digit verification code to ${email}` : 'Manage and track your business receipts beautifully')}
        </p>

        {/* Tab Toggle (Hidden in OTP and Forgot Password mode) */}
        {!isOtpMode && !isForgotPasswordMode && (
          <div className="login-toggle">
            <button 
              type="button" 
              className={`login-tab-btn ${isLoginTab ? 'active' : ''}`}
              onClick={() => {
                setIsLoginTab(true);
                setErrors({});
                setInfoMessage('');
              }}
            >
              Login
            </button>
            <button 
              type="button" 
              className={`login-tab-btn ${!isLoginTab ? 'active' : ''}`}
              onClick={() => {
                setIsLoginTab(false);
                setErrors({});
                setInfoMessage('');
              }}
            >
              Register
            </button>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {errors.global && (
            <div className="auth-error-alert">{errors.global}</div>
          )}

          {infoMessage && (
            <div className="auth-info-alert" style={{
              background: 'rgba(51, 214, 159, 0.08)',
              color: 'var(--color-green)',
              padding: '12px 16px',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '0.9rem',
              fontWeight: '500',
              lineHeight: '1.4',
              marginBottom: '20px',
              border: '1px solid rgba(51, 214, 159, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>{infoMessage}</span>
            </div>
          )}

          {isForgotPasswordMode ? (
            /* Forgot Password Screens */
            forgotPasswordStep === 1 ? (
              /* Step 1: Email Input */
              <>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={errors.email ? { borderColor: 'var(--color-red)' } : {}}
                    placeholder="you@example.com"
                    autoFocus
                  />
                  {errors.email && <span className="input-err-msg">{errors.email}</span>}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary login-submit-btn" 
                  disabled={isLoading}
                  style={{ width: '100%', marginTop: '24px' }}
                >
                  {isLoading ? <div className="btn-spinner"></div> : 'Send Reset OTP'}
                </button>

                <button 
                  type="button" 
                  className="btn btn-dark" 
                  style={{ width: '100%', marginTop: '12px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid rgba(0,0,0,0.1)' }}
                  onClick={() => {
                    setIsForgotPasswordMode(false);
                    setErrors({});
                  }}
                  disabled={isLoading}
                >
                  Back to Login
                </button>
              </>
            ) : (
              /* Step 2: OTP & New Password Input */
              <>
                <div className="form-group">
                  <label>6-Digit Reset Code</label>
                  <input
                    type="text"
                    maxLength="6"
                    className="form-input"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    style={errors.resetOtp ? { borderColor: 'var(--color-red)' } : {}}
                    placeholder="123456"
                    autoFocus
                  />
                  {errors.resetOtp && <span className="input-err-msg">{errors.resetOtp}</span>}
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
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    style={errors.confirmNewPassword ? { borderColor: 'var(--color-red)' } : {}}
                    placeholder="••••••••"
                  />
                  {errors.confirmNewPassword && <span className="input-err-msg">{errors.confirmNewPassword}</span>}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary login-submit-btn" 
                  disabled={isLoading}
                  style={{ width: '100%', marginTop: '24px' }}
                >
                  {isLoading ? <div className="btn-spinner"></div> : 'Reset Password'}
                </button>

                <button 
                  type="button" 
                  className="btn btn-dark" 
                  style={{ width: '100%', marginTop: '12px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid rgba(0,0,0,0.1)' }}
                  onClick={() => {
                    setForgotPasswordStep(1);
                    setResetOtp('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setErrors({});
                  }}
                  disabled={isLoading}
                >
                  Back
                </button>
              </>
            )
          ) : isOtpMode ? (
            /* Registration OTP Verification Screen */
            <>
              <div className="form-group">
                <label>6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength="6"
                  className="form-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                  style={errors.otp ? { borderColor: 'var(--color-red)' } : {}}
                  placeholder="123456"
                  autoFocus
                />
                {errors.otp && <span className="input-err-msg">{errors.otp}</span>}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary login-submit-btn" 
                disabled={isLoading}
                style={{ width: '100%', marginTop: '24px' }}
              >
                {isLoading ? <div className="btn-spinner"></div> : 'Verify & Register'}
              </button>

              <button 
                type="button" 
                className="btn btn-dark" 
                style={{ width: '100%', marginTop: '12px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid rgba(0,0,0,0.1)' }}
                onClick={() => {
                  setIsOtpMode(false);
                  setOtp('');
                  setErrors({});
                }}
                disabled={isLoading}
              >
                Back to Registration
              </button>
            </>
          ) : (
            /* Standard Login / Registration Form */
            <>
              {!isLoginTab && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={errors.fullName ? { borderColor: 'var(--color-red)' } : {}}
                    placeholder="John Doe"
                  />
                  {errors.fullName && <span className="input-err-msg">{errors.fullName}</span>}
                </div>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={errors.email ? { borderColor: 'var(--color-red)' } : {}}
                  placeholder="you@example.com"
                />
                {errors.email && <span className="input-err-msg">{errors.email}</span>}
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Password</label>
                  {isLoginTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordMode(true);
                        setForgotPasswordStep(1);
                        setErrors({});
                      }}
                      style={{ background: 'none', border: 'none', color: '#DC143C', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={errors.password ? { borderColor: 'var(--color-red)' } : {}}
                  placeholder="••••••••"
                />
                {errors.password && <span className="input-err-msg">{errors.password}</span>}
              </div>

              {!isLoginTab && (
                <div className="form-group">
                  <label>Confirm Password</label>
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
              )}

              <button 
                type="submit" 
                className="btn btn-primary login-submit-btn" 
                disabled={isLoading}
                style={{ width: '100%', marginTop: '16px' }}
              >
                {isLoading ? <div className="btn-spinner"></div> : (isLoginTab ? 'Login' : 'Request OTP')}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
