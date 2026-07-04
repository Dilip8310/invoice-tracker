import React, { useState } from 'react';

const AUTH_URL = '/api/auth';

const Login = ({ onSuccess, onShowToast }) => {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
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
        onShowToast('Account verified and registered successfully!');
        onSuccess(data); // Logs user in directly
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

    if (isOtpMode) {
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
          {isOtpMode ? 'Enter OTP' : 'Invoice Tracker'}
        </h2>
        <p className="login-subtitle">
          {isOtpMode 
            ? `We sent a 6-digit verification code to ${email}`
            : 'Manage and track your business receipts beautifully'}
        </p>

        {/* Tab Toggle (Hidden in OTP mode) */}
        {!isOtpMode && (
          <div className="login-toggle">
            <button 
              type="button" 
              className={`login-tab-btn ${isLoginTab ? 'active' : ''}`}
              onClick={() => {
                setIsLoginTab(true);
                setErrors({});
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

          {isOtpMode ? (
            /* OTP Verification Screen */
            <>
              <div className="form-group">
                <label>6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength="6"
                  className="form-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Keep digits only
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
                <label>Password</label>
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
