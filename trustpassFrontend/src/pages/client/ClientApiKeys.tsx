import { useEffect, useState } from 'react';
import { Clipboard, KeyRound, Plus, RefreshCw, RotateCw, ShieldAlert, X } from 'lucide-react';
import { ClientBreadcrumb } from '../../components/common/ClientBreadcrumb';
import {
  createClientApiKey,
  getClientApiKeys,
  revokeClientApiKey,
  rotateClientApiKey,
  type ClientApiKey,
  type NewlyCreatedClientApiKey,
} from '../../services/api';

const formatDate = (date: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date));

export function ClientApiKeys() {
  const [apiKeys, setApiKeys] = useState<ClientApiKey[]>([]);
  const [newKey, setNewKey] = useState<NewlyCreatedClientApiKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApiKeys = async () => {
    try {
      setError(null);
      const response = await getClientApiKeys();
      setApiKeys(response.apiKeys);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialApiKeys = async () => {
      await loadApiKeys();
    };

    void loadInitialApiKeys();
  }, []);

  const handleCreate = async () => {
    setIsWorking(true);
    setError(null);
    try {
      const response = await createClientApiKey();
      setNewKey(response.apiKey);
      setApiKeys((currentKeys) => [response.apiKey, ...currentKeys]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create API key');
    } finally {
      setIsWorking(false);
    }
  };

  const handleRevoke = async (apiKey: ClientApiKey) => {
    if (!window.confirm(`Revoke ${apiKey.keyPrefix}? Existing requests using it will stop working.`)) return;
    setIsWorking(true);
    setError(null);
    try {
      const response = await revokeClientApiKey(apiKey.id);
      setApiKeys((currentKeys) => currentKeys.map((currentKey) => currentKey.id === apiKey.id ? response.apiKey : currentKey));
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Unable to revoke API key');
    } finally {
      setIsWorking(false);
    }
  };

  const handleRotate = async (apiKey: ClientApiKey) => {
    if (!window.confirm(`Rotate ${apiKey.keyPrefix}? The current key will be revoked.`)) return;
    setIsWorking(true);
    setError(null);
    try {
      const response = await rotateClientApiKey(apiKey.id);
      setNewKey(response.apiKey);
      setApiKeys((currentKeys) => currentKeys.map((currentKey) => currentKey.id === apiKey.id ? { ...currentKey, status: 'REVOKED' as const, revokedAt: new Date().toISOString() } : currentKey).concat(response.apiKey));
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : 'Unable to rotate API key');
    } finally {
      setIsWorking(false);
    }
  };

  const copyKey = async () => {
    if (newKey) await navigator.clipboard.writeText(newKey.key);
  };

  return (
    <div className="client-page">
      <div className="client-page-heading">
        <div>
          <ClientBreadcrumb current="API keys" />
          <h1>API keys</h1>
          <p>Issue and manage credentials for the applications that call your TrustPass protection layer.</p>
        </div>
        <div>
          <button type="button" className="client-secondary-button" onClick={() => void loadApiKeys()} disabled={isLoading || isWorking}><RefreshCw size={15} /> Refresh</button>
          <button type="button" className="client-primary-button" onClick={() => void handleCreate()} disabled={isWorking}><Plus size={16} /> Create key</button>
        </div>
      </div>

      {error && <p className="client-inline-error" role="alert">{error}</p>}

      {newKey && <section className="client-key-notice" aria-live="polite">
        <button type="button" className="client-key-dismiss" onClick={() => setNewKey(null)} aria-label="Dismiss new API key"><X size={15} /></button>
        <strong>Copy this secret now</strong>
        <p>For security, the full API key will not be shown again.</p>
        <div className="client-key-secret"><code>{newKey.key}</code><button type="button" onClick={() => void copyKey()}><Clipboard size={14} /> Copy</button></div>
      </section>}

      {isLoading ? <div className="client-panel client-loading">Loading API keys...</div> : apiKeys.length === 0 ? (
        <section className="client-panel client-key-empty"><span className="client-card-icon"><KeyRound size={20} /></span><h2>No API keys yet</h2><p>Create a key to connect your application to the TrustPass API.</p><button type="button" className="client-primary-button" onClick={() => void handleCreate()} disabled={isWorking}><Plus size={16} /> Create your first key</button></section>
      ) : (
        <section className="client-key-table"><table><thead><tr><th>Key</th><th>Status</th><th>Created</th><th>Usage</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{apiKeys.map((apiKey) => <tr key={apiKey.id}><td><code>{apiKey.keyPrefix}</code></td><td><span className={`client-key-status ${apiKey.status === 'REVOKED' ? 'revoked' : ''}`}>{apiKey.status === 'ACTIVE' ? 'Active' : 'Revoked'}</span></td><td>{formatDate(apiKey.createdAt)}</td><td>{apiKey.usageCount?.toLocaleString() ?? '0'} requests</td><td><div className="client-key-actions">{apiKey.status === 'ACTIVE' && <><button type="button" onClick={() => void handleRotate(apiKey)} disabled={isWorking}><RotateCw size={14} /> Rotate</button><button type="button" className="danger" onClick={() => void handleRevoke(apiKey)} disabled={isWorking}><ShieldAlert size={14} /> Revoke</button></>}</div></td></tr>)}</tbody></table></section>
      )}
    </div>
  );
}