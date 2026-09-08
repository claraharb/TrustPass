import { useEffect, useState } from 'react';
import { Eye, Mail, RefreshCw, UserCheck, X } from 'lucide-react';
import {
  getAdminClientDetails,
  getAdminClients,
} from '../../services/api';
import type { Client, ClientDetails } from '../../types/client';
import '../../styles/admin-clients.css';

const formatDate = (date: string) => new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(date));

const formatDateTime = (date: string) => new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(date));

export function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = async (showRefreshState = false) => {
    if (showRefreshState) setIsRefreshing(true);
    try {
      const response = await getAdminClients();
      setClients(response.clients);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load clients');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialClients = async () => {
      try {
        const response = await getAdminClients();
        if (cancelled) return;
        setClients(response.clients);
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load clients');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadInitialClients();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleViewDetails = async (clientId: number) => {
    try {
      const response = await getAdminClientDetails(clientId);
      setSelectedClient(response.client);
      setError(null);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'Unable to load client details');
    }
  };

  if (isLoading) {
    return <div className="dashboard-content clients-page-state">Loading clients...</div>;
  }

  return (
    <div className="dashboard-content clients-page">
      <div className="clients-page-header">
        <div>
          <p className="clients-eyebrow">Management</p>
          <h1>Clients</h1>
          <p className="clients-subtitle">Manage client access and inspect account activity.</p>
        </div>
        <div className="clients-header-actions">
          <button type="button" className="clients-secondary-btn" onClick={() => void loadClients(true)} disabled={isRefreshing}>
            <RefreshCw size={14} className={isRefreshing ? 'clients-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="clients-alert" role="alert">{error}</div>}

      <section className="clients-card">
        <div className="clients-card-heading">
          <div>
            <h2>All clients</h2>
            <span>{clients.length} account{clients.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        {clients.length === 0 ? (
          <div className="clients-empty-state">
            <UserCheck size={22} />
            <h3>No clients yet</h3>
            <p>Clients create their own accounts from the client portal.</p>
          </div>
        ) : (
          <div className="clients-table-wrap">
            <table className="clients-table">
              <thead>
                <tr><th>Client</th><th>Status</th><th>Created</th><th className="clients-actions-heading">Actions</th></tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="client-identity">
                        <span className="client-avatar">{client.name.charAt(0).toUpperCase()}</span>
                        <span><strong>{client.name}</strong><small><Mail size={12} />{client.email}</small></span>
                      </div>
                    </td>
                    <td><span className={`client-status ${client.isActive ? 'active' : 'inactive'}`}><span />{client.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="client-date">{formatDate(client.createdAt)}</td>
                    <td>
                      <div className="client-row-actions">
                        <button type="button" title="View client details" aria-label={`View ${client.name} details`} onClick={() => void handleViewDetails(client.id)}><Eye size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedClient && (
        <div className="clients-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedClient(null); }}>
          <aside className="clients-drawer" aria-label="Client details">
            <div className="clients-drawer-header"><div><span className="clients-eyebrow">Client profile</span><h2>{selectedClient.name}</h2></div><button type="button" className="clients-close-btn" onClick={() => setSelectedClient(null)} aria-label="Close details"><X size={18} /></button></div>
            <div className="client-detail-contact"><span className="client-avatar large">{selectedClient.name.charAt(0).toUpperCase()}</span><div><strong>{selectedClient.email}</strong><span>Created {formatDate(selectedClient.createdAt)}</span></div></div>
            <div className="client-detail-status"><span>Status</span><span className={`client-status ${selectedClient.isActive ? 'active' : 'inactive'}`}><span />{selectedClient.isActive ? 'Active' : 'Inactive'}</span></div>
            <section className="client-detail-section"><h3>Subscriptions</h3>{selectedClient.subscriptions.length === 0 ? <p className="client-detail-muted">No subscriptions assigned.</p> : selectedClient.subscriptions.map((subscription) => <div className="client-subscription" key={subscription.id}><div><strong>{subscription.package.name}</strong><span>{subscription.requestsUsed.toLocaleString()} / {subscription.package.requestLimit.toLocaleString()} requests used</span></div><span className={`client-mini-status ${subscription.isActive ? 'active' : ''}`}>{subscription.isActive ? 'Active' : subscription.paymentStatus}</span></div>)}</section>
            <section className="client-detail-section"><h3>Recent API usage</h3>{selectedClient.apiUsage.length === 0 ? <p className="client-detail-muted">No API usage recorded.</p> : <div className="client-usage-list">{selectedClient.apiUsage.slice(0, 8).map((usage) => <div key={usage.id}><span><b>{usage.method}</b>{usage.endpoint}</span><small className={usage.statusCode < 400 ? 'success' : 'error'}>{usage.statusCode} · {formatDateTime(usage.createdAt)}</small></div>)}</div>}</section>
          </aside>
        </div>
      )}

    </div>
  );
}
