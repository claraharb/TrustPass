import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, Mail, Pencil, Plus, RefreshCw, Trash2, UserCheck, UserX, X } from 'lucide-react';
import {
  createAdminClient,
  deleteAdminClient,
  getAdminClientDetails,
  getAdminClients,
  setAdminClientStatus,
  updateAdminClient,
} from '../../services/api';
import type { Client, ClientDetails } from '../../types/client';
import '../../styles/admin-clients.css';

type ClientForm = {
  name: string;
  email: string;
  password: string;
};

const emptyForm: ClientForm = { name: '', email: '', password: '' };

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
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyClientId, setBusyClientId] = useState<number | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null);

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

  const openCreateModal = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setForm({ name: client.name, email: client.email, password: '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isSubmitting) setIsModalOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingClient) {
        const input = {
          name: form.name,
          email: form.email,
          ...(form.password ? { password: form.password } : {}),
        };
        const response = await updateAdminClient(editingClient.id, input);
        setClients((current) => current.map((client) => (
          client.id === response.client.id ? response.client : client
        )));
        if (selectedClient?.id === response.client.id) {
          setSelectedClient((current) => current ? { ...current, ...response.client } : current);
        }
      } else {
        const response = await createAdminClient(form);
        setClients((current) => [response.client, ...current]);
      }
      setIsModalOpen(false);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Unable to save client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = async (clientId: number) => {
    try {
      const response = await getAdminClientDetails(clientId);
      setSelectedClient(response.client);
      setError(null);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'Unable to load client details');
    }
  };

  const handleStatusChange = async (client: Client) => {
    setBusyClientId(client.id);
    try {
      const response = await setAdminClientStatus(client.id, !client.isActive);
      setClients((current) => current.map((item) => (
        item.id === response.client.id ? response.client : item
      )));
      setSelectedClient((current) => current && current.id === response.client.id
        ? { ...current, ...response.client }
        : current);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to update client status');
    } finally {
      setBusyClientId(null);
    }
  };

  const handleDelete = async (client: Client) => {
    const confirmed = window.confirm(
      `Delete ${client.name}? This permanently removes the client and related subscriptions, API keys, trust history, and usage records.`,
    );

    if (!confirmed) return;

    setDeletingClientId(client.id);
    try {
      await deleteAdminClient(client.id);
      setClients((current) => current.filter((item) => item.id !== client.id));
      setSelectedClient((current) => current?.id === client.id ? null : current);
      setError(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete client');
    } finally {
      setDeletingClientId(null);
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
          <button type="button" className="clients-primary-btn" onClick={openCreateModal}>
            <Plus size={15} />
            Add client
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
            <p>Create the first client account to begin configuring access.</p>
            <button type="button" className="clients-primary-btn" onClick={openCreateModal}><Plus size={15} /> Add client</button>
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
                        <button type="button" title="Edit client" aria-label={`Edit ${client.name}`} onClick={() => openEditModal(client)}><Pencil size={15} /></button>
                        <button type="button" title={client.isActive ? 'Deactivate client' : 'Activate client'} aria-label={`${client.isActive ? 'Deactivate' : 'Activate'} ${client.name}`} disabled={busyClientId === client.id || deletingClientId === client.id} onClick={() => void handleStatusChange(client)}>{client.isActive ? <UserX size={15} /> : <UserCheck size={15} />}</button>
                        <button type="button" className="client-delete-action" title="Delete client" aria-label={`Delete ${client.name}`} disabled={busyClientId === client.id || deletingClientId === client.id} onClick={() => void handleDelete(client)}><Trash2 size={15} /></button>
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

      {isModalOpen && (
        <div className="clients-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="client-form-title">
            <div className="clients-modal-header"><div><span className="clients-eyebrow">Client access</span><h2 id="client-form-title">{editingClient ? 'Edit client' : 'Add client'}</h2></div><button type="button" className="clients-close-btn" onClick={closeModal} aria-label="Close form"><X size={18} /></button></div>
            <form onSubmit={handleSubmit} className="client-form">
              <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength={2} required /></label>
              <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
              <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} required={!editingClient} placeholder={editingClient ? 'Leave blank to keep current password' : ''} /></label>
              {formError && <p className="clients-form-error" role="alert">{formError}</p>}
              <div className="client-form-actions"><button type="button" className="clients-secondary-btn" onClick={closeModal} disabled={isSubmitting}>Cancel</button><button type="submit" className="clients-primary-btn" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editingClient ? 'Save changes' : 'Create client'}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
