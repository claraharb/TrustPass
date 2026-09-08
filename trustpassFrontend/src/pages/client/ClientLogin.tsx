import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { loginClient } from '../../services/api';
import trustpassLogo from '../../assets/brand/trustpass-logo.svg?raw';
import '../../styles/admin-layout.css';

export function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const clientLogo = trustpassLogo
    .replaceAll('rgb(2,178,157)', '#021E36')
    .replaceAll('rgb(3,178,157)', '#021E36')
    .replaceAll('fill:white', 'fill:#021E36')
    .replaceAll('stroke:black', 'stroke:#021E36');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await loginClient(email, password);
      navigate('/client', { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page client-login-page">
      <div className="admin-login-shell">
        <section className="admin-login-aside">
          <div>
            <div className="client-brand-lockup">
              <div
                className="admin-login-logo client-login-logo"
                role="img"
                aria-label="TrustPass"
                dangerouslySetInnerHTML={{ __html: clientLogo }}
              />
              <span className="client-brand-divider" aria-hidden="true" />
              <span className="client-brand-label">CLIENT</span>
            </div>
            <p className="admin-login-kicker">Client Portal</p>
          </div>
          <div className="admin-login-aside-copy">
            <span className="admin-login-eyebrow">Developer access</span>
            <h1>Build trust into every sensitive action.</h1>
            <p>Manage your protection plan, API credentials, and trust decisions from one secure workspace.</p>
          </div>
          <div className="admin-login-aside-footer">
            <span className="admin-login-status-dot" />
            <span>TrustPass platform</span>
            <span className="admin-login-footer-separator">/</span>
            <span>Secure access</span>
          </div>
        </section>
        <section className="admin-login-panel">
          <div className="admin-login-panel-heading">
            <div className="admin-login-icon"><ShieldCheck size={18} /></div>
            <span>Client access</span>
          </div>
          <h2>Welcome back</h2>
          <p className="admin-login-description">Sign in to continue to your workspace.</p>
          <form onSubmit={handleSubmit} className="admin-login-form">
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label>Password
              <span className="admin-login-password-field">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
                <button type="button" className="admin-login-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </span>
            </label>
            {error && <p className="admin-login-error" role="alert">{error}</p>}
            <button type="submit" disabled={isSubmitting}><span>{isSubmitting ? 'Signing in...' : 'Enter workspace'}</span>{!isSubmitting && <ArrowRight size={16} />}</button>
          </form>
          <p className="admin-login-security">New to TrustPass? <Link to="/client/signup">Create your client account</Link></p>
        </section>
      </div>
    </main>
  );
}
