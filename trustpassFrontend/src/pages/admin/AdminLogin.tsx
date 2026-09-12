import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { loginAdmin } from '../../services/api';
import trustpassLogo from '../../assets/brand/trustpass-logo.svg';

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await loginAdmin(email, password);
      navigate('/admin', { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <div className="admin-login-shell">
        <section className="admin-login-aside">
          <div>
            <img src={trustpassLogo} alt="TrustPass" className="admin-login-logo" />
            <p className="admin-login-kicker">Admin console</p>
          </div>
          <div className="admin-login-aside-copy">
            <span className="admin-login-eyebrow">Trust operations</span>
            <h1>Make every decision count.</h1>
            <p>One focused view for trust requests, network signals, and the moments that need attention.</p>
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
            <span>Welcome back</span>
          </div>
          <h2>Sign in to TrustPass</h2>
          <p className="admin-login-description">Access your operations dashboard.</p>
          <form onSubmit={handleSubmit} className="admin-login-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <span className="admin-login-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="admin-login-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>
          {error && <p className="admin-login-error" role="alert">{error}</p>}
          <button type="submit" disabled={isSubmitting}>
            <span>{isSubmitting ? 'Signing in...' : 'Continue to dashboard'}</span>
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
          </form>
          <p className="admin-login-security">Your session is encrypted and expires automatically.</p>
        </section>
      </div>
    </main>
  );
}
