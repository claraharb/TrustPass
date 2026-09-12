import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { ClientBreadcrumb } from '../../components/common/ClientBreadcrumb';
import { deleteClientAccount, updateClientAccount } from '../../services/api';

export function ClientAccount() {
  const { client, signOutClient } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(client?.name ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateClientAccount({ name, email, ...(password ? { password } : {}) });
      setPassword('');
      setMessage('Your account details were updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your TrustPass account? This permanently removes your subscriptions, API keys, and trust history.')) return;
    setIsDeleting(true);
    setError(null);

    try {
      await deleteClientAccount();
      signOutClient();
      navigate('/client/signup', { replace: true });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <div className="client-page">
      <div className="client-page-heading">
        <div>
          <ClientBreadcrumb current="Account settings" />
          <h1>Account settings</h1>
          <p>Manage the identity and credentials used to access your TrustPass workspace.</p>
        </div>
        <div className="client-header-actions" aria-hidden="true" />
      </div>

      {message && <p className="client-account-message" role="status">{message}</p>}
      {error && <p className="client-inline-error" role="alert">{error}</p>}

      <section className="client-account-grid">
        <form className="client-panel client-account-form" onSubmit={handleSubmit}>
          <div className="client-account-heading"><span className="client-card-icon"><KeyRound size={20} /></span><div><h2>Profile and access</h2><p>Changes apply to your next sign-in and workspace session.</p></div></div>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} required /></label>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="Leave blank to keep your password" autoComplete="new-password" /></label>
          <button type="submit" className="client-primary-button" disabled={isSaving}><Save size={15} /> {isSaving ? 'Saving...' : 'Save changes'}</button>
        </form>

        <section className="client-panel client-account-danger">
          <span className="client-account-danger-icon"><Trash2 size={18} /></span>
          <h2>Delete account</h2>
          <p>This permanently removes your account and all associated subscriptions, API keys, and trust history.</p>
          <button type="button" className="client-danger-button" onClick={() => void handleDelete()} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete my account'}</button>
        </section>
      </section>
    </div>
  );
}